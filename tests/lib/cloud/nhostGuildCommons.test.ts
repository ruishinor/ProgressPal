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
const noteId = 'aa4d2826-20ad-4ee9-80ef-6bf725e82999';
const commons = {
  status: 'ok',
  group: {
    ethos: 'Lær sammen',
    about: 'Et lite læringsfellesskap',
    isAdmin: true,
    members: [
      { nickname: 'Ada', membership, self: true },
    ],
    notes: [{
      id: noteId,
      kind: 'help',
      body: 'Kan noen forklare git merge?',
      author: 'Ada',
      createdAt: '2026-11-13T01:00:00Z',
      own: true,
      canRemove: true,
    }],
  },
};

const answer = (result: unknown) =>
  jsonResponse(200, { data: { guild_commons_v1: [{ result }] } });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => vi.unstubAllGlobals());

it('keeps Commons silent until explicitly called and uses the expected authenticated session', async () => {
  const stub = installFetchStub();
  const cloud = createCloud();
  const signal = new AbortController().signal;
  expect(stub.calls).toEqual([]);
  expect(await cloud.commons.execute({
    operation: 'read', membership,
  }, 'user-1', signal)).toEqual({ status: 'unavailable' });
  expect(stub.calls).toEqual([]);
  enableCloud();
  expect(await cloud.commons.execute({
    operation: 'read', membership,
  }, 'user-1', signal)).toEqual({ status: 'unauthenticated' });
  await signInThroughStub(cloud, stub);
  expect(await cloud.commons.execute({
    operation: 'read', membership,
  }, 'other-user', signal)).toEqual({ status: 'unauthenticated' });
  expect(stub.calls).toEqual([]);

  stub.respond(() => answer(commons));
  expect(await cloud.commons.execute({
    operation: 'read', membership,
  }, 'user-1', signal)).toEqual(commons);
  expect(stub.calls).toHaveLength(1);
  expect(stub.calls[0]?.url).toBe(nhostGraphqlUrl);
  expect(stub.calls[0]?.headers.get('authorization')).toMatch(/^Bearer /);
  expect(stub.calls[0]?.body).toMatchObject({
    variables: { operation: 'read', input: { membership } },
  });
});

it('rejects malformed member messages, oversized note lists and unexpected GraphQL responses', async () => {
  const stub = installFetchStub();
  const cloud = createCloud();
  enableCloud();
  await signInThroughStub(cloud, stub);
  const read = () => cloud.commons.execute({
    operation: 'read', membership,
  }, 'user-1', new AbortController().signal);

  stub.respond(() => answer({
    ...commons,
    group: { ...commons.group, notes: Array(4).fill(commons.group.notes[0]) },
  }));
  expect(await read()).toEqual({ status: 'unavailable' });

  stub.respond(() => answer({
    ...commons,
    group: { ...commons.group, notes: [{ ...commons.group.notes[0], body: 'x'.repeat(281) }] },
  }));
  expect(await read()).toEqual({ status: 'unavailable' });

  stub.respond(() => jsonResponse(200, { errors: [{
    extensions: { code: 'invalid-jwt' },
  }] }));
  expect(await read()).toEqual({ status: 'unauthenticated' });
});

it('passes only a bounded member-authored command and preserves provider denials', async () => {
  const stub = installFetchStub();
  const cloud = createCloud();
  enableCloud();
  await signInThroughStub(cloud, stub);
  const command = {
    operation: 'post',
    membership,
    kind: 'help',
    body: 'Jeg trenger hjelp med git merge.',
  } as const;
  stub.respond(() => answer({ status: 'full' }));
  expect(await cloud.commons.execute(command, 'user-1', new AbortController().signal))
    .toEqual({ status: 'full' });
  expect(stub.calls).toHaveLength(1);
  expect(stub.calls[0]?.body).toMatchObject({
    variables: {
      operation: 'post',
      input: { membership, kind: 'help', body: command.body },
    },
  });
});

it('discards a private response after logout or a cloud preference change', async () => {
  const stub = installFetchStub();
  const cloud = createCloud();
  enableCloud();
  await signInThroughStub(cloud, stub);
  const read = () => cloud.commons.execute({
    operation: 'read', membership,
  }, 'user-1', new AbortController().signal);

  stub.respond(() => {
    sessionStorage.removeItem(cloudSessionStorageKey);
    return answer(commons);
  });
  expect(await read()).toEqual({ status: 'unauthenticated' });

  await signInThroughStub(cloud, stub);
  stub.respond(() => {
    writeCloudPreferences({ enabled: false, trustedDevice: false });
    return answer(commons);
  });
  expect(await read()).not.toHaveProperty('group');
});
