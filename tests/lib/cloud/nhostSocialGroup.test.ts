import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { writeCloudPreferences } from '@/lib/cloud';
import { nhostAuthUrl, nhostGraphqlUrl } from '@/lib/cloud/nhost/endpoints';
import { cloudSessionStorageKey } from '@/lib/cloud/nhost/sessionBackends';

import {
  createCloud,
  enableCloud,
  fakeSession,
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
  await signInThroughStub(cloud, stub);
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

it.each([-60, 5])(
  'refreshes a usable session with %i seconds of access remaining before the social action',
  async (seconds) => {
    const stub = installFetchStub();
    const cloud = createCloud();
    enableCloud();
    const original = await signInThroughStub(cloud, stub, seconds);
    const renewed = { ...fakeSession(), refreshToken: 'renewed-refresh-token' };
    stub.respond((call) => {
      if (call.url === nhostAuthUrl + '/token') {
        expect(call.body).toEqual({ refreshToken: original.refreshToken });
        return jsonResponse(200, renewed);
      }
      expect(call.url).toBe(nhostGraphqlUrl);
      return call.headers.get('authorization') ===
        'Bearer ' + renewed.accessToken
        ? answer(board)
        : jsonResponse(200, {
            errors: [{ extensions: { code: 'invalid-jwt' } }],
          });
    });

    expect(
      await cloud.social.execute(
        { operation: 'read' },
        'user-1',
        new AbortController().signal,
      ),
    ).toEqual(board);
    expect(stub.calls.map((call) => call.url)).toEqual([
      nhostAuthUrl + '/token',
      nhostGraphqlUrl,
    ]);
    expect(
      JSON.parse(sessionStorage.getItem(cloudSessionStorageKey) ?? '{}'),
    ).toMatchObject({
      accessToken: renewed.accessToken,
      refreshToken: renewed.refreshToken,
    });
  },
);

it('does not overwrite a replacement account or send its social request after renewal starts', async () => {
  const stub = installFetchStub();
  const cloud = createCloud();
  enableCloud();
  await signInThroughStub(cloud, stub, -60);
  const replacement = {
    ...fakeSession(),
    user: { ...fakeSession().user, id: 'user-2' },
  };
  stub.respond((call) => {
    expect(call.url).toBe(nhostAuthUrl + '/token');
    sessionStorage.setItem(cloudSessionStorageKey, JSON.stringify(replacement));
    return jsonResponse(200, {
      ...fakeSession(),
      refreshToken: 'renewed-refresh-token',
    });
  });

  expect(
    await cloud.social.execute(
      { operation: 'read' },
      'user-1',
      new AbortController().signal,
    ),
  ).toEqual({ status: 'unauthenticated' });
  expect(stub.calls.map((call) => call.url)).toEqual([nhostAuthUrl + '/token']);
  expect(
    JSON.parse(sessionStorage.getItem(cloudSessionStorageKey) ?? '{}'),
  ).toEqual(replacement);
});

it('does not send a social request when the provider refuses renewal', async () => {
  const stub = installFetchStub();
  const cloud = createCloud();
  enableCloud();
  await signInThroughStub(cloud, stub, -60);
  stub.respond(() => jsonResponse(401, { error: 'invalid-refresh-token' }));

  expect(
    await cloud.social.execute(
      { operation: 'read' },
      'user-1',
      new AbortController().signal,
    ),
  ).toEqual({ status: 'unauthenticated' });
  expect(stub.calls.map((call) => call.url)).toEqual([nhostAuthUrl + '/token']);
});
