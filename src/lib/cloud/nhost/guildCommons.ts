import type { NhostClient } from '@nhost/nhost-js';
import { z } from 'zod';

import type { GuildCommonsPort, GuildCommonsResult } from '../guildCommonsPort';
import {
  isSameSession,
  needsRefresh,
  renewPinnedSession,
} from './pinnedSession';
import { classifyCloudRequest, outcomeOfError } from './requestFailure';

const commonsDocument = 'mutation GuildCommons($operation: String!, $input: jsonb!) { guild_commons_v1(args: {operation: $operation, input: $input}) { result } }';

const note = z.object({
  id: z.uuid(),
  kind: z.enum(['help', 'offer', 'notice', 'win']),
  body: z.string().min(1).max(280),
  author: z.string().min(1).max(24),
  createdAt: z.iso.datetime(),
  own: z.boolean(),
  canRemove: z.boolean(),
}).strict();

const member = z.object({
  nickname: z.string().min(1).max(24),
  membership: z.uuid(),
  self: z.boolean(),
}).strict();

const group = z.object({
  ethos: z.string().max(120),
  about: z.string().max(600),
  isAdmin: z.boolean(),
  members: z.array(member).min(1).max(8)
    .refine((members) => members.filter((entry) => entry.self).length === 1),
  notes: z.array(note).max(3),
}).strict();

const responseSchema = z.object({
  data: z.object({
    guild_commons_v1: z.tuple([z.object({
      result: z.discriminatedUnion('status', [
        z.object({ status: z.literal('ok'), group }),
        z.object({ status: z.enum([
          'unauthenticated', 'membership-changed', 'no-group',
          'not-admin', 'not-owner', 'not-found',
          'invalid-input', 'already-posted', 'full', 'rate-limited',
        ]) }),
      ]),
    })]),
  }),
});

export function createNhostGuildCommons(
  getClient: () => NhostClient,
): GuildCommonsPort {
  return {
    async execute(
      { operation, ...input },
      expectedUserId,
      signal,
    ): Promise<GuildCommonsResult> {
      try {
        const client = getClient();
        const original = client.getUserSession();
        if (signal.aborted) return { status: 'unavailable' };
        if (!original?.accessToken || original.user?.id !== expectedUserId)
          return { status: 'unauthenticated' };

        const session = needsRefresh(original)
          ? await renewPinnedSession(getClient, client, original, signal)
          : original;
        if (signal.aborted) return { status: 'unavailable' };
        if (
          session?.user?.id !== expectedUserId ||
          getClient() !== client ||
          !isSameSession(client.getUserSession(), session)
        ) return { status: 'unauthenticated' };

        const response = await client.graphql.request(
          { query: commonsDocument, variables: { operation, input } },
          { signal, headers: { Authorization: 'Bearer ' + session.accessToken } },
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
          return { status:
            failure.kind === 'unauthenticated' || failure.kind === 'rate-limited'
              ? failure.kind
              : 'unavailable' };
        }
        const parsed = responseSchema.safeParse(response.body);
        if (!parsed.success) return { status: 'unavailable' };
        return parsed.data.data.guild_commons_v1[0].result;
      } catch (error) {
        const failure = classifyCloudRequest(outcomeOfError(error));
        return {
          status: failure?.kind === 'unauthenticated' ||
            failure?.kind === 'rate-limited'
            ? failure.kind
            : 'unavailable',
        };
      }
    },
  };
}
