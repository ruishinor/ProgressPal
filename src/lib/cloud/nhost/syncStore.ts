import type { NhostClient } from '@nhost/nhost-js';
import { z } from 'zod';

import {
  maxSyncPayloadBytes,
  SyncFailure,
  type CloudSyncStore,
} from '../syncPort';
import {
  isSameSession,
  needsRefresh,
  renewPinnedSession,
} from './pinnedSession';
import { classifyCloudRequest, outcomeOfError } from './requestFailure';

const document = `mutation SyncLearning($operation: String!, $input: jsonb!) {
  sync_learning_v1(args: { operation: $operation, input: $input }) { result }
}`;

const hash = z.string().regex(/^[0-9a-f]{64}$/);
const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const headReply = z.strictObject({
  status: z.literal('ok'),
  revision,
  hash: hash.nullable(),
});
const downloadReply = headReply.extend({
  payload: z.string().max(maxSyncPayloadBytes),
});
const refusal = z.strictObject({
  status: z.enum([
    'unauthenticated',
    'conflict',
    'too-large',
    'invalid-input',
    'integrity-mismatch',
    'incompatible',
  ]),
});
const reply = z.strictObject({
  data: z.strictObject({
    sync_learning_v1: z.tuple([z.strictObject({ result: z.unknown() })]),
  }),
});

function failureFor(response: Parameters<typeof classifyCloudRequest>[0]) {
  const failure = classifyCloudRequest(response);
  if (failure?.kind === 'unauthenticated' || response.httpStatus === 403) {
    return new SyncFailure('authentication');
  }
  if (failure?.kind === 'rate-limited') return new SyncFailure('rate-limited');
  if (failure?.kind === 'provider-unavailable')
    return new SyncFailure('unavailable');
  if (response.httpStatus === 413) return new SyncFailure('too-large');
  return failure === null ? null : new SyncFailure('incompatible');
}

export function createNhostSyncStore(
  getClient: () => NhostClient,
): CloudSyncStore {
  async function execute(
    userId: string,
    operation: 'head' | 'read' | 'write',
    input: Record<string, unknown>,
    signal: AbortSignal,
  ) {
    signal.throwIfAborted();
    // A deadline covers auth renewal and the GraphQL round trip. The caller
    // keeps the pending hash if a write's outcome could be ambiguous.
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(20_000)]);
    let body: unknown;
    try {
      const client = getClient();
      const original = client.getUserSession();
      if (!original?.accessToken || original.user?.id !== userId) {
        throw new SyncFailure('authentication');
      }
      const session = needsRefresh(original)
        ? await renewPinnedSession(getClient, client, original, deadline)
        : original;
      deadline.throwIfAborted();
      if (
        !session?.accessToken ||
        session.user?.id !== userId ||
        getClient() !== client ||
        !isSameSession(client.getUserSession(), session)
      ) {
        throw new SyncFailure('authentication');
      }
      const response = await client.graphql.request(
        { query: document, variables: { operation, input } },
        {
          signal: deadline,
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );
      deadline.throwIfAborted();
      if (
        getClient() !== client ||
        client.getUserSession()?.user?.id !== userId
      ) {
        throw new SyncFailure('authentication');
      }
      const failure = failureFor({
        httpStatus: response.status,
        body: response.body,
      });
      if (failure !== null) throw failure;
      body = response.body;
    } catch (error) {
      signal.throwIfAborted();
      if (error instanceof SyncFailure) throw error;
      throw (
        failureFor(outcomeOfError(error)) ?? new SyncFailure('incompatible')
      );
    }

    const parsed = reply.safeParse(body);
    if (!parsed.success) throw new SyncFailure('incompatible');
    const result = parsed.data.data.sync_learning_v1[0].result;
    const rejected = refusal.safeParse(result);
    if (rejected.success) {
      switch (rejected.data.status) {
        case 'unauthenticated':
          throw new SyncFailure('authentication');
        case 'conflict':
          throw new SyncFailure('stale');
        case 'too-large':
          throw new SyncFailure('too-large');
        default:
          throw new SyncFailure('incompatible');
      }
    }
    return result;
  }

  return {
    async head(userId, signal) {
      const result = headReply.safeParse(
        await execute(userId, 'head', {}, signal),
      );
      if (
        !result.success ||
        (result.data.revision === 0) !== (result.data.hash === null)
      ) {
        throw new SyncFailure('incompatible');
      }
      return { revision: result.data.revision, hash: result.data.hash };
    },
    async download(userId, head, signal) {
      const result = downloadReply.safeParse(
        await execute(
          userId,
          'read',
          { expectedRevision: head.revision },
          signal,
        ),
      );
      if (
        !result.success ||
        head.hash === null ||
        result.data.revision !== head.revision ||
        result.data.hash !== head.hash
      ) {
        throw new SyncFailure('incompatible');
      }
      return result.data.payload;
    },
    async upload(userId, expectedRevision, payload, signal) {
      const result = headReply.safeParse(
        await execute(
          userId,
          'write',
          {
            expectedRevision,
            payload: payload.text,
            hash: payload.hash,
          },
          signal,
        ),
      );
      if (
        !result.success ||
        result.data.revision !== expectedRevision + 1 ||
        result.data.hash !== payload.hash
      ) {
        // A reply that does not confirm the exact candidate can still follow a
        // committed write. Retry the head, never the mutation directly.
        throw new SyncFailure('unavailable');
      }
    },
  };
}
