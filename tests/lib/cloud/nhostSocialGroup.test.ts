import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { writeCloudPreferences } from '@/lib/cloud';
import { nhostGraphqlUrl } from '@/lib/cloud/nhost/endpoints';
import { cloudSessionStorageKey } from '@/lib/cloud/nhost/sessionBackends';

import {
  createCloud,
  enableCloud,
  installFetchStub,
  jsonResponse,
  signInThroughStub,
} from './cloudTestKit';

const membership = 'ab4d2826-20ad-4ee9-80ef-6bf725e82999';

const board = {
  status: 'ok',
  weekStart: '2026-11-09',
  group: {
    name: 'Lag A',
    membership,
    canInvite: true,
    hasInvite: false,
    members: [{ nickname: 'Ada', self: true, days: 1 }],
  },
  invite: null,
};

const answer = (result: unknown) =>
  jsonResponse(200, { data: { social_week: [{ result }] } });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => vi.unstubAllGlobals());

it('only sends an explicit, bounded social command under the expected authenticated session', async () => {
  const stub = installFetchStub();
  const cloud = createCloud();
  const signal = new AbortController().signal;
  const command = {
    operation: 'share',
    days: ['2026-11-09'],
    membership,
  } as const;
  const share = { ...command, days: [...command.days] };
  await cloud.social.execute(share, 'user-1', signal);
  enableCloud();
  expect(await cloud.social.execute(share, 'user-1', signal)).toEqual({
    status: 'unauthenticated',
  });
  await signInThroughStub(cloud, stub, 5);
  expect(await cloud.social.execute(share, 'different-user', signal)).toEqual({
    status: 'unauthenticated',
  });
  expect(stub.calls).toEqual([]);

  stub.respond(() => answer(board));
  expect(await cloud.social.execute(share, 'user-1', signal)).toEqual(board);
  expect(stub.calls).toHaveLength(1);
  expect(stub.calls[0]?.url).toBe(nhostGraphqlUrl);
  expect(stub.calls[0]?.headers.get('authorization')).toMatch(/^Bearer /);
  expect(stub.calls[0]?.body).toMatchObject({
    variables: {
      operation: 'share',
      input: { days: ['2026-11-09'], membership },
    },
  });
  expect(Object.keys(stub.calls[0]?.body?.variables ?? {})).toEqual([
    'operation',
    'input',
  ]);
});

it('discards a late private board after cloud disable or a trusted identity change', async () => {
  const stub = installFetchStub();
  const cloud = createCloud();
  enableCloud();
  await signInThroughStub(cloud, stub);
  const signal = new AbortController().signal;

  stub.respond(() => {
    sessionStorage.removeItem(cloudSessionStorageKey);
    return answer(board);
  });
  expect(
    await cloud.social.execute({ operation: 'read' }, 'user-1', signal),
  ).toEqual({ status: 'unauthenticated' });

  await signInThroughStub(cloud, stub);
  stub.respond(() => {
    writeCloudPreferences({ enabled: false, trustedDevice: false });
    return answer(board);
  });
  expect(
    await cloud.social.execute({ operation: 'read' }, 'user-1', signal),
  ).not.toHaveProperty('group');
});

it('rejects an invite on a read, malformed scores, and expired authorization', async () => {
  const stub = installFetchStub();
  const cloud = createCloud();
  enableCloud();
  await signInThroughStub(cloud, stub);
  const read = () =>
    cloud.social.execute(
      { operation: 'read' },
      'user-1',
      new AbortController().signal,
    );

  stub.respond(() => answer({ ...board, invite: 'a'.repeat(64) }));
  expect(await read()).toEqual({ status: 'unavailable' });
  stub.respond(() =>
    answer({
      ...board,
      group: {
        ...board.group,
        members: [{ nickname: 'Ada', self: true, days: 8 }],
      },
    }),
  );
  expect(await read()).toEqual({ status: 'unavailable' });
  stub.respond(() =>
    jsonResponse(200, { errors: [{ extensions: { code: 'invalid-jwt' } }] }),
  );
  expect(await read()).toEqual({ status: 'unauthenticated' });
});
