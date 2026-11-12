import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
  createCloud,
  enableCloud,
  fakeSession,
  installFetchStub,
  jsonResponse,
  signInThroughStub,
} from '../lib/cloud/cloudTestKit';

const reply = (result: unknown) => ({
  data: { sync_learning_v1: [{ result }] },
});
const emptyHead = { status: 'ok', revision: 0, hash: null };
const signal = () => new AbortController().signal;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  enableCloud();
});

afterEach(() => vi.unstubAllGlobals());

it('pins the refreshed bearer, rejects a different identity and sends only a head request', async () => {
  const fetch = installFetchStub();
  const cloud = createCloud();
  const { sync } = cloud;
  await signInThroughStub(cloud, fetch, 15);
  const renewed = fakeSession(1_800);
  fetch.respond(({ url }) =>
    url.endsWith('/token')
      ? jsonResponse(200, renewed)
      : jsonResponse(200, reply(emptyHead)),
  );

  await expect(sync.head('other-account', signal())).rejects.toMatchObject({
    code: 'authentication',
  });
  expect(fetch.calls).toHaveLength(0);
  await expect(sync.head('user-1', signal())).resolves.toEqual({
    revision: 0,
    hash: null,
  });
  expect(fetch.calls).toHaveLength(2);
  expect(fetch.calls[0]?.url).toMatch(/\/token$/);
  expect(fetch.calls[1]?.headers.get('authorization')).toBe(
    `Bearer ${renewed.accessToken}`,
  );
  expect(fetch.calls[1]?.body?.variables).toEqual({
    operation: 'head',
    input: {},
  });
});

it('rejects partial GraphQL success, corrupt revision responses, and rate limits', async () => {
  const fetch = installFetchStub();
  const cloud = createCloud();
  await signInThroughStub(cloud, fetch);
  const hash = 'a'.repeat(64);
  fetch.respond(() =>
    jsonResponse(200, {
      ...reply({ status: 'ok', revision: 1, hash }),
      errors: [{ message: 'simulated partial error' }],
    }),
  );
  await expect(
    cloud.sync.upload('user-1', 0, { text: 'snapshot', hash }, signal()),
  ).rejects.toMatchObject({
    code: 'incompatible',
  });
  fetch.respond(() =>
    jsonResponse(
      200,
      reply({ status: 'ok', revision: 2, hash, payload: 'snapshot' }),
    ),
  );
  await expect(
    cloud.sync.download('user-1', { revision: 1, hash }, signal()),
  ).rejects.toMatchObject({
    code: 'incompatible',
  });
  fetch.respond(() =>
    jsonResponse(429, { errors: [{ message: 'too many requests' }] }),
  );
  await expect(cloud.sync.head('user-1', signal())).rejects.toMatchObject({
    code: 'rate-limited',
  });
});

it('discards a delayed response when the signed-in account has been cleared', async () => {
  const fetch = installFetchStub();
  const cloud = createCloud();
  await signInThroughStub(cloud, fetch);
  let enter!: () => void;
  let replyLater!: (response: Response) => void;
  const entered = new Promise<void>((resolve) => {
    enter = resolve;
  });
  const delayed = new Promise<Response>((resolve) => {
    replyLater = resolve;
  });
  fetch.respond(({ url }) => {
    if (url.endsWith('/signout')) return jsonResponse(200, {});
    enter();
    return delayed;
  });

  const result = expect(
    cloud.sync.head('user-1', signal()),
  ).rejects.toMatchObject({
    code: 'authentication',
  });
  await entered;
  await cloud.account.signOut();
  replyLater(jsonResponse(200, reply(emptyHead)));
  await result;
});
