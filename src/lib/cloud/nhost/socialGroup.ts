import type { NhostClient } from '@nhost/nhost-js';
import { createAPIClient } from '@nhost/nhost-js/auth';
import type { StoredSession } from '@nhost/nhost-js/session';
import { z } from 'zod';

import type { SocialGroupPort, SocialResult } from '../socialPort';
import { classifyCloudRequest, outcomeOfError } from './requestFailure';

const socialDocument = `mutation SocialWeek($operation: String!, $input: jsonb!) {
  social_week(args: {operation: $operation, input: $input}) { result }
}`;

const group = z.object({
  name: z.string().min(1).max(80),
  membership: z.uuid(),
  canInvite: z.boolean(),
  hasInvite: z.boolean(),
  members: z
    .array(
      z.object({
        nickname: z.string().min(1).max(48),
        days: z.number().int().min(0).max(7),
        self: z.boolean(),
      }),
    )
    .min(1)
    .max(8)
    .refine((members) => members.filter((member) => member.self).length === 1),
});

const reply = z.object({
  data: z.object({
    social_week: z.tuple([
      z.object({
        result: z.union([
          z.object({
            status: z.literal('ok'),
            weekStart: z.iso.date(),
            group: group.nullable(),
            invite: z
              .string()
              .regex(/^[0-9a-f]{64}$/)
              .nullable(),
          }),
          z.object({
            status: z.enum([
              'unauthenticated',
              'already-member',
              'invalid-input',
              'invalid-code',
              'group-full',
              'no-group',
              'membership-changed',
              'not-admin',
              'invalid-days',
            ]),
          }),
        ]),
      }),
    ]),
  }),
});

function isSameSession(current: StoredSession | null, expected: StoredSession) {
  return (
    current?.user?.id === expected.user?.id &&
    current?.accessToken === expected.accessToken &&
    current.refreshToken === expected.refreshToken
  );
}

function needsRefresh(session: StoredSession) {
  return (session.decodedToken?.exp ?? 0) - Date.now() <= 60_000;
}

async function renewSocialSession(
  getClient: () => NhostClient,
  client: NhostClient,
  original: StoredSession,
  signal: AbortSignal,
) {
  const renew = async () => {
    if (signal.aborted || getClient() !== client) return null;
    const current = client.getUserSession();
    if (current?.user?.id !== original.user?.id || !current?.accessToken)
      return null;
    if (!needsRefresh(current)) return current;
    if (!current.refreshToken || !isSameSession(current, original)) return null;

    // The SDK's session response middleware writes /token replies
    // unconditionally. Use its unconfigured Auth client for this exchange.
    const { body } = await createAPIClient(client.auth.baseURL).refreshToken(
      { refreshToken: current.refreshToken },
      { signal },
    );
    if (
      signal.aborted ||
      getClient() !== client ||
      !isSameSession(client.getUserSession(), current) ||
      body?.user?.id !== current.user?.id ||
      !body?.accessToken ||
      !body?.refreshToken
    )
      return null;

    client.sessionStorage.set(body);
    return client.getUserSession();
  };

  // Serialize with the SDK refresh used by the other cloud actions.
  return (
    navigator.locks?.request('nhostSessionLock', { signal }, renew) ?? renew()
  );
}

export function createNhostSocialGroup(
  getClient: () => NhostClient,
): SocialGroupPort {
  return {
    async execute(
      { operation, ...input },
      expectedUserId,
      signal,
    ): Promise<SocialResult> {
      try {
        const client = getClient();
        const original = client.getUserSession();
        if (signal.aborted) return { status: 'unavailable' };
        if (!original?.accessToken || original.user?.id !== expectedUserId) {
          return { status: 'unauthenticated' };
        }

        const session = needsRefresh(original)
          ? await renewSocialSession(getClient, client, original, signal)
          : original;
        if (signal.aborted) return { status: 'unavailable' };
        if (
          session?.user?.id !== expectedUserId ||
          getClient() !== client ||
          !isSameSession(client.getUserSession(), session)
        ) {
          return { status: 'unauthenticated' };
        }

        // Pin the renewed or still-current bearer to this request.
        const response = await client.graphql.request(
          { query: socialDocument, variables: { operation, input } },
          {
            signal,
            headers: { Authorization: `Bearer ${session.accessToken}` },
          },
        );
        if (signal.aborted) return { status: 'unavailable' };
        const currentClient = getClient();
        const current = currentClient.getUserSession();
        if (current?.user?.id !== expectedUserId)
          return { status: 'unauthenticated' };
        if (currentClient !== client || !isSameSession(current, session))
          return { status: 'unavailable' };

        const failure = classifyCloudRequest({
          httpStatus: response.status,
          body: response.body,
        });
        if (failure !== null) {
          return {
            status:
              failure.kind === 'unauthenticated' ||
              failure.kind === 'rate-limited'
                ? failure.kind
                : 'unavailable',
          };
        }
        const parsed = reply.safeParse(response.body);
        if (!parsed.success) return { status: 'unavailable' };

        const result = parsed.data.data.social_week[0].result;
        if (
          result.status === 'ok' &&
          result.invite !== null &&
          (operation !== 'invite' || result.group?.canInvite !== true)
        ) {
          return { status: 'unavailable' };
        }
        return result;
      } catch (error) {
        const failure = classifyCloudRequest(outcomeOfError(error));
        return {
          status:
            failure?.kind === 'unauthenticated' ||
            failure?.kind === 'rate-limited'
              ? failure.kind
              : 'unavailable',
        };
      }
    },
  };
}
