import type { NhostClient } from '@nhost/nhost-js';
import { z } from 'zod';

import type { SocialGroupPort, SocialResult } from '../socialPort';
import {
  isSameSession,
  needsRefresh,
  renewPinnedSession,
} from './pinnedSession';
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
          ? await renewPinnedSession(getClient, client, original, signal)
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
