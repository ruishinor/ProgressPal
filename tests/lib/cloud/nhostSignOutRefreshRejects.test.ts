import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The SDK normally swallows refresh errors, but the adapter must not depend on
 * that: if the near-expiry refresh itself REJECTS, sign-out has to remove the
 * local session anyway and must not claim a server-side invalidation. The real
 * client is used for everything except `refreshSession`, which is made to
 * reject.
 */
vi.mock('@nhost/nhost-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nhost/nhost-js')>();

  return {
    ...actual,
    createClient: (...args: Parameters<typeof actual.createClient>) => {
      const client = actual.createClient(...args);

      client.refreshSession = () =>
        Promise.reject(new Error('refresh rejected'));

      return client;
    },
  };
});

import {
  createNhostCloudAccount,
  writeCloudPreferences,
  type CloudAccountPort,
} from '@/lib/cloud';
import {
  cloudSessionStorageKey,
  persistentSessionStorageKey,
} from '@/lib/cloud/nhost/sessionBackends';

const email = 'learner@example.com';
const password = 'correct-horse-9';

const base64Url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

function nearExpirySession() {
  const exp = Math.floor(Date.now() / 1000) + 20;

  return {
    accessToken: `${base64Url({ alg: 'none' })}.${base64Url({ sub: 'user-1', exp, iat: exp - 900 })}.sig`,
    accessTokenExpiresIn: 20,
    refreshTokenId: '11111111-1111-4111-8111-111111111111',
    refreshToken: '22222222-2222-4222-8222-222222222222',
    user: { id: 'user-1', email, roles: ['user'] },
  };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

let urls: string[];

function signOutAnswers(status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      urls.push(url);

      return url.endsWith('/signout') ? json(status, 'OK') : json(500, {});
    }),
  );
}

async function signedIn(): Promise<CloudAccountPort> {
  writeCloudPreferences({ enabled: true, trustedDevice: false });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => json(200, { session: nearExpirySession() })),
  );
  const port = createNhostCloudAccount({ getWindow: () => window });
  await port.signIn({ email, password });
  urls = [];

  return port;
}

describe('sign-out when the near-expiry refresh itself rejects (CR-1)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    urls = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('still removes the local session and does not claim a server invalidation, even when a sign-out request would succeed', async () => {
    const port = await signedIn();
    expect(sessionStorage.getItem(cloudSessionStorageKey)).not.toBeNull();
    signOutAnswers(200);

    const result = await port.signOut();

    expect(result).toEqual({
      localSessionRemoved: true,
      serverInvalidation: 'unconfirmed',
    });
    expect(port.getState().status).toBe('signed-out');
    expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
    expect(localStorage.getItem(persistentSessionStorageKey)).toBeNull();
  });

  it('removes the local session when nothing can be reached either', async () => {
    const port = await signedIn();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    expect(await port.signOut()).toEqual({
      localSessionRemoved: true,
      serverInvalidation: 'unconfirmed',
    });
    expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
  });
});
