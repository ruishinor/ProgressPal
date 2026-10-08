import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The SDK captures `navigator.locks` once, when it is first loaded. The lock
 * manager is therefore installed BEFORE any import (vi.hoisted), so the SDK's
 * session refresh and ProgressPal's own write coordination contend on one
 * manager, exactly as two features share one browser. (The test harness gives
 * every test a fresh manager afterwards; this file uses its own.)
 */
const locks = await vi.hoisted(async () => {
  const { FakeLockManager } = await import('../localDataCoordinationFakes');
  const manager = new FakeLockManager();

  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: manager,
  });

  return manager;
});

import { createNhostCloudAccount, writeCloudPreferences } from '@/lib/cloud';

const writerLock = 'progresspal:local-data:writer';
const presenceLock = 'progresspal:local-data:presence';
const sdkLock = 'nhostSessionLock';

const base64Url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

function session(secondsToExpiry: number, refreshToken: string) {
  const exp = Math.floor(Date.now() / 1000) + secondsToExpiry;

  return {
    accessToken: `${base64Url({ alg: 'none' })}.${base64Url({ sub: 'user-1', exp, iat: exp - 900 })}.sig`,
    accessTokenExpiresIn: secondsToExpiry,
    refreshTokenId: '11111111-1111-4111-8111-111111111111',
    refreshToken,
    user: { id: 'user-1', email: 'learner@example.com', roles: ['user'] },
  };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const oldRefresh = '22222222-2222-4222-8222-222222222222';
const newRefresh = '33333333-3333-4333-8333-333333333333';

describe('Web Lock coexistence with ProgressPal local coordination', () => {
  let requests: Array<{ url: string; body: Record<string, unknown> | null }>;

  beforeEach(() => {
    requests = [];
    localStorage.clear();
    sessionStorage.clear();
    writeCloudPreferences({ enabled: true, trustedDevice: false });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input instanceof Request ? input.url : input);
        const raw = init?.body;

        requests.push({
          url,
          body:
            typeof raw === 'string'
              ? (JSON.parse(raw) as Record<string, unknown>)
              : null,
        });

        if (url.endsWith('/signin/email-password')) {
          // Inside the SDK's 60 s refresh margin: the next call must refresh.
          return json(200, { session: session(30, oldRefresh) });
        }

        if (url.endsWith('/token')) {
          return json(200, session(900, newRefresh));
        }

        return json(200, 'OK');
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses a lock name that cannot collide with any ProgressPal lock', () => {
    expect(sdkLock.startsWith('progresspal:')).toBe(false);
    expect([writerLock, presenceLock]).not.toContain(sdkLock);
  });

  it('refreshes under its own lock while a local write lease and presence are held, and signs out with the CURRENT refresh token', async () => {
    const releaseWriter = await locks.hold(writerLock, 'exclusive');
    const releasePresence = await locks.hold(presenceLock, 'shared');
    const port = createNhostCloudAccount({ getWindow: () => window });

    await port.signIn({
      email: 'learner@example.com',
      password: 'correct-horse-9',
    });

    const outcome = await Promise.race([
      port.signOut(),
      new Promise<'timed-out'>((resolve) =>
        setTimeout(() => resolve('timed-out'), 3000),
      ),
    ]);

    await releasePresence();
    await releaseWriter();

    // Completed while ProgressPal's exclusive writer lease was held.
    expect(outcome).toEqual({
      localSessionRemoved: true,
      serverInvalidation: 'confirmed',
    });

    // The near-expiry token was refreshed first, then the CURRENT (rotated)
    // refresh token was the one invalidated. Signing out with the old one
    // would have left the new token alive on the server.
    const calls = requests.filter(
      (request) =>
        request.url.endsWith('/token') || request.url.endsWith('/signout'),
    );
    expect(calls.map((call) => call.url.split('/').pop())).toEqual([
      'token',
      'signout',
    ]);
    expect(calls[0]?.body).toEqual({ refreshToken: oldRefresh });
    expect(calls[1]?.body).toEqual({ refreshToken: newRefresh });

    // The SDK used its own lock, exclusively for the refresh itself, and never
    // asked for ProgressPal's locks.
    const granted = locks.grantHistory;
    expect(granted).toContainEqual({ mode: 'exclusive', name: sdkLock });
    expect(
      granted.filter(
        (grant) =>
          grant.name.startsWith('progresspal:') &&
          grant.name !== writerLock &&
          grant.name !== presenceLock,
      ),
    ).toEqual([]);
    expect(granted.filter((grant) => grant.name === writerLock)).toHaveLength(
      1,
    ); // only the test's own hold
  });

  it('a second port in the same page refreshes without blocking on the first', async () => {
    const first = createNhostCloudAccount({ getWindow: () => window });
    const second = createNhostCloudAccount({ getWindow: () => window });

    await first.signIn({
      email: 'learner@example.com',
      password: 'correct-horse-9',
    });

    const states = await Promise.race([
      Promise.all([first.signOut(), second.signOut()]),
      new Promise<'timed-out'>((resolve) =>
        setTimeout(() => resolve('timed-out'), 3000),
      ),
    ]);

    expect(states).not.toBe('timed-out');
    expect(first.getState().status).toBe('signed-out');
    expect(second.getState().status).toBe('signed-out');
  });
});
