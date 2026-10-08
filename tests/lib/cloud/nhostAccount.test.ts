import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CloudError,
  createNhostCloudAccount,
  readCloudPreferences,
  writeCloudPreferences,
  type CloudAccountPort,
} from '@/lib/cloud';
import { nhostAuthUrl, nhostGraphqlUrl } from '@/lib/cloud/nhost/endpoints';
import {
  pkceVerifierStorageKey,
  pkceVerifierTtlMs,
} from '@/lib/cloud/pkceVerifierStore';
import {
  cloudSessionStorageKey,
  persistentSessionStorageKey,
} from '@/lib/cloud/nhost/sessionBackends';

/**
 * Drives the REAL @nhost/nhost-js 4.9.0 client against a stubbed fetch, so the
 * URLs, request bodies and storage keys asserted here are what the SDK really
 * produces. No test in this file reaches a network.
 */

const email = 'learner@example.com';
const password = 'correct-horse-9';

interface Call {
  url: string;
  method: string;
  body: Record<string, unknown> | null;
  /** The address bar at the moment the request was made. */
  search: string;
}

const base64Url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

function fakeJwt(secondsToExpiry = 900) {
  const exp = Math.floor(Date.now() / 1000) + secondsToExpiry;
  return `${base64Url({ alg: 'none' })}.${base64Url({ sub: 'user-1', exp, iat: exp - 900 })}.sig`;
}

function fakeSession(secondsToExpiry = 900) {
  return {
    accessToken: fakeJwt(secondsToExpiry),
    accessTokenExpiresIn: secondsToExpiry,
    refreshTokenId: '11111111-1111-4111-8111-111111111111',
    refreshToken: '22222222-2222-4222-8222-222222222222',
    user: { id: 'user-1', email, displayName: 'x', roles: ['user'] },
  };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

let calls: Call[] = [];
let handler: (call: Call) => Response | Promise<Response>;

function installFetch() {
  calls = [];
  handler = () => json(500, { error: 'unconfigured' });
  const stub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const raw = init?.body;
    const call: Call = {
      url,
      method: init?.method ?? 'GET',
      body:
        typeof raw === 'string'
          ? (JSON.parse(raw) as Record<string, unknown>)
          : null,
      search: window.location.search,
    };
    calls.push(call);
    return handler(call);
  });
  vi.stubGlobal('fetch', stub);
  return stub;
}

function enable(overrides: Partial<{ trustedDevice: boolean }> = {}) {
  writeCloudPreferences({ enabled: true, trustedDevice: false, ...overrides });
}

function account(): CloudAccountPort {
  return createNhostCloudAccount({ getWindow: () => window });
}

async function expectCloudError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(CloudError);
  expect((error as CloudError).code).toBe(code);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  installFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cloud disabled (the default)', () => {
  it('reports disabled, makes no request and never builds a provider client', async () => {
    const port = account();

    expect(port.getState()).toEqual({ status: 'disabled' });
    await expectCloudError(port.signIn({ email, password }), 'disabled');
    await expectCloudError(port.signUp({ email, password }), 'disabled');
    await expectCloudError(port.requestPasswordReset(email), 'disabled');
    await expectCloudError(port.changePassword(password), 'disabled');
    expect(calls).toHaveLength(0);
  });

  it('signs out locally without a request and says the server side is unconfirmed', async () => {
    sessionStorage.setItem(cloudSessionStorageKey, '{"leftover":true}');
    localStorage.setItem(persistentSessionStorageKey, '{"leftover":true}');

    const result = await account().signOut();

    expect(result).toEqual({
      localSessionRemoved: true,
      serverInvalidation: 'unconfirmed',
    });
    expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
    expect(localStorage.getItem(persistentSessionStorageKey)).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('an email link arriving while disabled is scrubbed, its verifier dropped, and nothing is sent', async () => {
    localStorage.setItem(pkceVerifierStorageKey, '{}');
    window.history.replaceState(
      null,
      '',
      '/cloud/callback?code=abcdefgh12345678',
    );

    await expectCloudError(
      account().completeEmailLink(window.location.href),
      'disabled',
    );

    expect(window.location.search).toBe('');
    expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('building the port and reading state while enabled still performs no request', () => {
    enable();

    expect(account().getState()).toEqual({ status: 'signed-out' });
    expect(calls).toHaveLength(0);
  });
});

describe('input validation happens before any request', () => {
  it.each([
    ['not-an-email', password],
    [email, 'short'],
    [email, 'x'.repeat(51)],
  ])('rejects %s / %s', async (candidateEmail, candidatePassword) => {
    enable();

    await expectCloudError(
      account().signIn({ email: candidateEmail, password: candidatePassword }),
      'invalid-input',
    );
    expect(calls).toHaveLength(0);
  });
});

describe('sign-in and the session store (T3)', () => {
  it('defaults to a session-scoped store and never touches localStorage', async () => {
    enable();
    handler = () => json(200, { session: fakeSession() });
    const port = account();

    await port.signIn({ email, password });

    expect(calls[0]?.url).toBe(`${nhostAuthUrl}/signin/email-password`);
    expect(sessionStorage.getItem(cloudSessionStorageKey)).not.toBeNull();
    expect(localStorage.getItem(persistentSessionStorageKey)).toBeNull();
    expect(port.getState()).toEqual({
      status: 'signed-in',
      userId: 'user-1',
      email,
    });
  });

  it('the exposed state never carries a token', async () => {
    enable();
    handler = () => json(200, { session: fakeSession() });
    const port = account();

    await port.signIn({ email, password });
    const exposed = JSON.stringify(port.getState());

    expect(exposed).not.toContain('eyJ');
    expect(exposed).not.toContain('22222222');
  });

  it('the session dies with the tab: a fresh port over cleared sessionStorage is signed out', async () => {
    enable();
    handler = () => json(200, { session: fakeSession() });
    await account().signIn({ email, password });

    sessionStorage.clear();

    expect(account().getState()).toEqual({ status: 'signed-out' });
  });

  it('a second tab does not inherit the session (sessionStorage is per tab) and no sync is created', async () => {
    enable();
    handler = () => json(200, { session: fakeSession() });
    await account().signIn({ email, password });
    const copyOfOtherTab = sessionStorage.getItem(cloudSessionStorageKey);

    sessionStorage.clear(); // a different tab starts with its own empty store

    expect(copyOfOtherTab).not.toBeNull();
    expect(account().getState().status).toBe('signed-out');
    expect(calls).toHaveLength(1); // no refresh, broadcast or sync request happened
  });

  it('trusted device: only after an explicit choice, and then in the SDK persistent store', async () => {
    enable();
    const port = account();

    port.setTrustedDevice(true);
    expect(readCloudPreferences().trustedDevice).toBe(true);

    handler = () => json(200, { session: fakeSession() });
    await port.signIn({ email, password });

    expect(localStorage.getItem(persistentSessionStorageKey)).not.toBeNull();
    expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
  });

  it('the preference is known before a session is read: a reload with trusted device on finds the session', async () => {
    enable({ trustedDevice: true });
    handler = () => json(200, { session: fakeSession() });
    await account().signIn({ email, password });

    expect(account().getState()).toMatchObject({
      status: 'signed-in',
      userId: 'user-1',
    });
  });

  it('switching the preference while signed in is refused and nothing is migrated', async () => {
    enable();
    handler = () => json(200, { session: fakeSession() });
    const port = account();
    await port.signIn({ email, password });

    expect(() => port.setTrustedDevice(true)).toThrow(CloudError);
    expect(readCloudPreferences().trustedDevice).toBe(false);
    expect(localStorage.getItem(persistentSessionStorageKey)).toBeNull();
    expect(port.getState().status).toBe('signed-in');
  });

  it('switching while signed out clears any leftover session from both stores', () => {
    enable();
    // A leftover record in the store the current mode does NOT use.
    localStorage.setItem(persistentSessionStorageKey, '{"stale":1}');
    const port = account();

    port.setTrustedDevice(true);

    expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
    expect(localStorage.getItem(persistentSessionStorageKey)).toBeNull();
  });

  it('refuses a multi-factor challenge instead of leaving a half-signed-in state', async () => {
    enable();
    handler = () =>
      json(200, { session: null, mfa: { ticket: 'mfaTotp:abc' } });

    await expectCloudError(
      account().signIn({ email, password }),
      'unsupported',
    );
    expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
  });

  it.each([
    [401, { error: 'invalid-email-password' }, 'invalid-credentials'],
    [401, { error: 'unverified-user' }, 'unverified-email'],
    [429, { error: 'too-many-requests' }, 'rate-limited'],
    [503, { error: 'x' }, 'unavailable'],
  ])('maps provider answer %i %j to %s', async (status, body, code) => {
    enable();
    handler = () => json(status, body);

    await expectCloudError(account().signIn({ email, password }), code);
  });

  it('maps an unreachable network to a retryable "unavailable"', async () => {
    enable();
    handler = () => {
      throw new TypeError('Failed to fetch');
    };

    const error = await account()
      .signIn({ email, password })
      .then(
        () => null,
        (caught: unknown) => caught,
      );

    expect((error as CloudError).code).toBe('unavailable');
    expect((error as CloudError).retryable).toBe(true);
  });
});

describe('sign-up, verification and PKCE (T3, T6)', () => {
  it('sends a PKCE challenge and the exact callback address, stores the verifier under its own key', async () => {
    enable();
    handler = () => json(200, { session: null });

    const result = await account().signUp({ email, password });

    expect(result).toEqual({ kind: 'verification-required' });
    expect(calls[0]?.url).toBe(`${nhostAuthUrl}/signup/email-password`);
    expect(calls[0]?.body?.codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(calls[0]?.body?.options).toEqual({
      redirectTo: `${window.location.origin}/cloud/callback`,
    });

    const stored = JSON.parse(
      localStorage.getItem(pkceVerifierStorageKey) ?? '{}',
    ) as {
      verifier: string;
      purpose: string;
    };
    expect(stored.purpose).toBe('signup');
    expect(stored.verifier.length).toBeGreaterThanOrEqual(43);
    // The verifier is never sent with the request that carries the challenge.
    expect(JSON.stringify(calls[0]?.body)).not.toContain(stored.verifier);
  });

  it('a failure to create the PKCE pair is a mapped error: nothing is sent and no verifier is left', async () => {
    enable();
    const digest = vi
      .spyOn(crypto.subtle, 'digest')
      .mockRejectedValue(new Error('WebCrypto unavailable'));

    await expectCloudError(account().signUp({ email, password }), 'unknown');
    await expectCloudError(account().requestPasswordReset(email), 'unknown');

    digest.mockRestore();
    expect(calls).toHaveLength(0);
    expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
  });

  describe('a verifier that cannot be stored (CR-3)', () => {
    function failVerifierWrites() {
      const original = Storage.prototype.setItem;

      return vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(function (
          this: Storage,
          key: string,
          value: string,
        ) {
          if (key === pkceVerifierStorageKey) {
            throw new DOMException('quota', 'QuotaExceededError');
          }

          original.call(this, key, value);
        });
    }

    it('sign-up sends nothing, leaves no verifier (not even a stale one) and says so honestly', async () => {
      enable();
      localStorage.setItem(
        pkceVerifierStorageKey,
        JSON.stringify({ stale: true }),
      );
      const failing = failVerifierWrites();

      await expectCloudError(account().signUp({ email, password }), 'unknown');

      failing.mockRestore();
      expect(calls).toHaveLength(0);
      expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
    });

    it('password reset sends nothing and leaves no verifier', async () => {
      enable();
      localStorage.setItem(
        pkceVerifierStorageKey,
        JSON.stringify({ stale: true }),
      );
      const failing = failVerifierWrites();

      await expectCloudError(account().requestPasswordReset(email), 'unknown');

      failing.mockRestore();
      expect(calls).toHaveLength(0);
      expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
    });

    it('does not fall back to a flow without a verifier', async () => {
      enable();
      const failing = failVerifierWrites();

      await account()
        .signUp({ email, password })
        .catch(() => undefined);

      failing.mockRestore();
      expect(calls.filter((call) => call.url.includes('/signup/'))).toEqual([]);
    });
  });

  it('removes the verifier when the sign-up fails', async () => {
    enable();
    handler = () => json(409, { error: 'email-already-in-use' });

    await expectCloudError(
      account().signUp({ email, password }),
      'email-in-use',
    );
    expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
  });

  it('removes the verifier when no email link will follow', async () => {
    enable();
    handler = () => json(200, { session: fakeSession() });

    expect(await account().signUp({ email, password })).toEqual({
      kind: 'signed-in',
    });
    expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
  });

  async function startFlow(kind: 'signup' | 'reset') {
    enable();
    const port = account();
    handler = () => json(200, kind === 'signup' ? { session: null } : {});
    if (kind === 'signup') await port.signUp({ email, password });
    else await port.requestPasswordReset(email);
    return port;
  }

  it('verification: scrubs the code BEFORE any request, exchanges it once, consumes the verifier', async () => {
    const port = await startFlow('signup');
    const verifier = (
      JSON.parse(localStorage.getItem(pkceVerifierStorageKey) ?? '{}') as {
        verifier: string;
      }
    ).verifier;
    calls = [];
    handler = () => json(200, { session: fakeSession() });
    window.history.replaceState(
      { routerKey: 1 },
      '',
      '/cloud/callback?code=abcdefgh12345678&type=signup&keep=1',
    );

    const outcome = await port.completeEmailLink(window.location.href);

    expect(outcome).toEqual({ kind: 'verified-signed-in' });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${nhostAuthUrl}/token/exchange`);
    expect(calls[0]?.body).toEqual({
      code: 'abcdefgh12345678',
      codeVerifier: verifier,
    });
    // The address bar was already clean when the exchange request left:
    expect(calls[0]?.search).toBe('?keep=1');
    expect(window.location.search).toBe('?keep=1');
    expect(window.history.state).toEqual({ routerKey: 1 }); // history entry rewritten, router state kept
    expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
    expect(port.getState().status).toBe('signed-in');
  });

  it('password reset: the same exchange, but the outcome tells the caller to ask for the new password', async () => {
    const port = await startFlow('reset');
    expect(calls[0]?.url).toBe(`${nhostAuthUrl}/user/password/reset`);
    expect(calls[0]?.body?.codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    handler = () => json(200, { session: fakeSession() });
    window.history.replaceState(
      null,
      '',
      '/cloud/callback?code=abcdefgh12345678',
    );

    expect(await port.completeEmailLink(window.location.href)).toEqual({
      kind: 'password-reset-session',
    });
  });

  it('a missing verifier degrades to an honest sign-in path, still scrubs, and sends nothing', async () => {
    enable();
    const port = account();
    window.history.replaceState(
      null,
      '',
      '/cloud/callback?code=abcdefgh12345678',
    );

    expect(await port.completeEmailLink(window.location.href)).toEqual({
      kind: 'sign-in-required',
      purpose: 'unknown',
    });
    expect(window.location.search).toBe('');
    expect(calls).toHaveLength(0);
    expect(port.getState().status).toBe('signed-out');
  });

  it('an expired verifier is consumed, reports what was started, and sends nothing', async () => {
    let clock = Date.now();
    enable();
    const port = createNhostCloudAccount({
      getWindow: () => window,
      now: () => clock,
    });
    handler = () => json(200, { session: null });
    await port.signUp({ email, password });
    calls = [];
    clock += pkceVerifierTtlMs + 1;
    window.history.replaceState(
      null,
      '',
      '/cloud/callback?code=abcdefgh12345678',
    );

    expect(await port.completeEmailLink(window.location.href)).toEqual({
      kind: 'sign-in-required',
      purpose: 'signup',
    });
    expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('a rejected code is reported as an expired link and the verifier does not linger', async () => {
    const port = await startFlow('signup');
    calls = [];
    handler = () => json(400, { error: 'invalid-request' });
    window.history.replaceState(
      null,
      '',
      '/cloud/callback?code=abcdefgh12345678',
    );

    await expectCloudError(
      port.completeEmailLink(window.location.href),
      'link-expired',
    );
    expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
    expect(window.location.search).toBe('');
    expect(port.getState().status).toBe('signed-out');
  });

  it('never honours a non-PKCE link that carries a refresh token: scrubbed, no request, no session', async () => {
    const port = await startFlow('signup');
    calls = [];
    window.history.replaceState(
      null,
      '',
      '/cloud/callback?refreshToken=22222222-2222-4222-8222-222222222222&type=signup',
    );

    expect(await port.completeEmailLink(window.location.href)).toEqual({
      kind: 'invalid-link',
    });
    expect(window.location.search).toBe('');
    expect(calls).toHaveLength(0);
    expect(port.getState().status).toBe('signed-out');
    expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
  });

  describe('every callback-shaped address is scrubbed (CR-2)', () => {
    it.each([
      [
        'an error-only callback',
        '/cloud/callback?error=invalid-ticket&errorDescription=Ticket%20expired&keep=1',
        '?keep=1',
      ],
      [
        'an error in the fragment',
        '/cloud/callback?keep=1#error=x&b=2',
        '?keep=1',
      ],
      ['an empty code', '/cloud/callback?code=&type=signup&keep=1', '?keep=1'],
      ['a duplicated code', '/cloud/callback?code=a&code=b&keep=1', '?keep=1'],
      [
        'a code in the fragment only',
        '/cloud/callback?keep=1#code=abcdefgh',
        '?keep=1',
      ],
      ['a lone type', '/cloud/callback?type=signup', ''],
    ])(
      '%s: no request, verifier dropped, nothing callback-shaped left in the address',
      async (_label, address, expectedSearch) => {
        const port = await startFlow('signup');
        calls = [];
        window.history.replaceState({ routerKey: 7 }, '', address);

        expect(await port.completeEmailLink(window.location.href)).toEqual({
          kind: 'invalid-link',
        });

        expect(calls).toHaveLength(0);
        expect(window.location.search).toBe(expectedSearch);
        expect(window.location.hash.includes('error')).toBe(false);
        expect(window.location.hash.includes('code')).toBe(false);
        expect(window.history.state).toEqual({ routerKey: 7 });
        expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
        expect(port.getState().status).toBe('signed-out');
      },
    );

    it('scrubs the address even for an invocation that is not a link at all', async () => {
      enable();
      window.history.replaceState(null, '', '/cloud/callback?error=x&keep=1');

      expect(
        await account().completeEmailLink('https://progresspal.example/other'),
      ).toEqual({ kind: 'invalid-link' });
      expect(window.location.search).toBe('?keep=1');
      expect(calls).toHaveLength(0);
    });

    it('exchanges an opaque code exactly as the provider issued it, URL-encoded characters included', async () => {
      const port = await startFlow('signup');
      calls = [];
      handler = () => json(200, { session: fakeSession() });
      window.history.replaceState(
        null,
        '',
        '/cloud/callback?code=a%2Fb%2Bc%3D%3D~%C3%A9x&keep=1',
      );

      expect(await port.completeEmailLink(window.location.href)).toEqual({
        kind: 'verified-signed-in',
      });
      expect(calls[0]?.body?.code).toBe('a/b+c==~\u00e9x');
      expect(calls[0]?.search).toBe('?keep=1');
    });

    it('keeps unrelated query and fragment parameters', async () => {
      const port = await startFlow('signup');
      calls = [];
      window.history.replaceState(
        null,
        '',
        '/cloud/callback?a=1%202&error=x&b=%C3%A5#view=list&error_description=y',
      );

      await port.completeEmailLink(window.location.href);

      expect(window.location.search).toBe('?a=1%202&b=%C3%A5');
      expect(window.location.hash).toBe('#view=list');
    });

    it('fails closed when the address bar cannot be rewritten: the code is not exchanged and the verifier is dropped', async () => {
      const port = await startFlow('signup');
      calls = [];
      handler = () => json(200, { session: fakeSession() });
      window.history.replaceState(
        null,
        '',
        '/cloud/callback?code=abcdefgh12345678',
      );
      const stuck = createNhostCloudAccount({
        getWindow: () => ({
          location: window.location,
          history: {
            state: null,
            replaceState: () => {
              throw new Error('SecurityError');
            },
          },
        }),
      });

      expect(await stuck.completeEmailLink(window.location.href)).toEqual({
        kind: 'invalid-link',
      });
      expect(calls).toHaveLength(0);
      expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
      expect(port.getState().status).toBe('signed-out');
    });

    it('fails closed when a rewrite is silently ignored', async () => {
      await startFlow('signup');
      calls = [];
      handler = () => json(200, { session: fakeSession() });
      window.history.replaceState(
        null,
        '',
        '/cloud/callback?code=abcdefgh12345678',
      );
      const ignoring = createNhostCloudAccount({
        getWindow: () => ({
          location: window.location,
          history: { state: null, replaceState: () => undefined },
        }),
      });

      expect(await ignoring.completeEmailLink(window.location.href)).toEqual({
        kind: 'invalid-link',
      });
      expect(calls).toHaveLength(0);
      expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
    });
  });

  it('an address without a code is simply not a link', async () => {
    enable();
    expect(
      await account().completeEmailLink(
        'https://progresspal.example/cloud/callback',
      ),
    ).toEqual({ kind: 'invalid-link' });
    expect(calls).toHaveLength(0);
  });
});

describe('sign-out and password change', () => {
  async function signedIn() {
    enable();
    handler = () => json(200, { session: fakeSession() });
    const port = account();
    await port.signIn({ email, password });
    calls = [];
    return port;
  }

  it('sign-out invalidates the refresh token on the server and removes the local session', async () => {
    const port = await signedIn();
    handler = () => json(200, 'OK');

    const result = await port.signOut();

    expect(result).toEqual({
      localSessionRemoved: true,
      serverInvalidation: 'confirmed',
    });
    expect(calls[0]?.url).toBe(`${nhostAuthUrl}/signout`);
    expect(calls[0]?.body).toEqual({
      refreshToken: '22222222-2222-4222-8222-222222222222',
    });
    expect(port.getState().status).toBe('signed-out');
    expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
  });

  it('sign-out still removes the local session when the server cannot be reached, and says so', async () => {
    const port = await signedIn();
    handler = () => {
      throw new TypeError('Failed to fetch');
    };

    const result = await port.signOut();

    expect(result).toEqual({
      localSessionRemoved: true,
      serverInvalidation: 'unconfirmed',
    });
    expect(port.getState().status).toBe('signed-out');
    expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
  });

  describe('sign-out when the access token is near expiry (CR-1)', () => {
    const rotated = '33333333-3333-4333-8333-333333333333';

    async function signedInNearExpiry() {
      enable();
      handler = () => json(200, { session: fakeSession(20) });
      const port = account();
      await port.signIn({ email, password });
      calls = [];
      return port;
    }

    function silenceSdkWarnings() {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('refresh succeeds: the CURRENT rotated refresh token is the one invalidated, and only then is it confirmed', async () => {
      const port = await signedInNearExpiry();
      handler = (call) =>
        call.url.endsWith('/token')
          ? json(200, { ...fakeSession(900), refreshToken: rotated })
          : json(200, 'OK');

      expect(await port.signOut()).toEqual({
        localSessionRemoved: true,
        serverInvalidation: 'confirmed',
      });
      expect(calls.map((call) => call.url.split('/').pop())).toEqual([
        'token',
        'signout',
      ]);
      expect(calls[1]?.body).toEqual({ refreshToken: rotated });
      expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
    });

    it('refresh fails and the sign-out request then succeeds: the local session is removed and the server side is NOT claimed confirmed', async () => {
      silenceSdkWarnings();
      const port = await signedInNearExpiry();
      handler = (call) =>
        call.url.endsWith('/token')
          ? json(503, { error: 'unavailable' })
          : json(200, 'OK');

      expect(await port.signOut()).toEqual({
        localSessionRemoved: true,
        serverInvalidation: 'unconfirmed',
      });
      expect(port.getState().status).toBe('signed-out');
      expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
    });

    it('refresh fails and so does everything else: still signed out locally', async () => {
      silenceSdkWarnings();
      const port = await signedInNearExpiry();
      handler = () => {
        throw new TypeError('Failed to fetch');
      };

      expect(await port.signOut()).toEqual({
        localSessionRemoved: true,
        serverInvalidation: 'unconfirmed',
      });
      expect(port.getState().status).toBe('signed-out');
      expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
    });

    it('near expiry and the provider rejects the refresh (401): removed locally, never claimed confirmed', async () => {
      silenceSdkWarnings();
      const port = await signedInNearExpiry();
      handler = (call) =>
        call.url.endsWith('/token')
          ? json(401, { error: 'invalid-refresh-token' })
          : json(200, 'OK');

      expect(await port.signOut()).toEqual({
        localSessionRemoved: true,
        serverInvalidation: 'unconfirmed',
      });
      expect(port.getState().status).toBe('signed-out');
      expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
    });

    it('already expired and the provider rejects the refresh (401): the SDK drops the session itself, no sign-out request follows', async () => {
      silenceSdkWarnings();
      enable();
      handler = () => json(200, { session: fakeSession(-30) });
      const port = account();
      await port.signIn({ email, password });
      calls = [];
      handler = () => json(401, { error: 'invalid-refresh-token' });

      expect(await port.signOut()).toEqual({
        localSessionRemoved: true,
        serverInvalidation: 'unconfirmed',
      });
      expect(calls.some((call) => call.url.endsWith('/signout'))).toBe(false);
      expect(port.getState().status).toBe('signed-out');
      expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
    });

    it('refresh succeeds but the sign-out request fails: removed locally, unconfirmed', async () => {
      const port = await signedInNearExpiry();
      handler = (call) =>
        call.url.endsWith('/token')
          ? json(200, { ...fakeSession(900), refreshToken: rotated })
          : json(503, { error: 'unavailable' });

      expect(await port.signOut()).toEqual({
        localSessionRemoved: true,
        serverInvalidation: 'unconfirmed',
      });
      expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
    });

    it('an expired access token whose refresh fails is also removed locally and reported unconfirmed', async () => {
      silenceSdkWarnings();
      enable();
      handler = () => json(200, { session: fakeSession(-30) });
      const port = account();
      await port.signIn({ email, password });
      calls = [];
      handler = (call) =>
        call.url.endsWith('/token')
          ? json(503, { error: 'unavailable' })
          : json(200, 'OK');

      expect(await port.signOut()).toEqual({
        localSessionRemoved: true,
        serverInvalidation: 'unconfirmed',
      });
      expect(port.getState().status).toBe('signed-out');
      expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
    });
  });

  it('with cloud enabled but no session, sign-out sends nothing, clears leftovers and does not claim a server invalidation', async () => {
    enable();
    sessionStorage.setItem(cloudSessionStorageKey, '{"leftover":true}');
    localStorage.setItem(persistentSessionStorageKey, '{"leftover":true}');

    expect(await account().signOut()).toEqual({
      localSessionRemoved: true,
      serverInvalidation: 'unconfirmed',
    });
    expect(calls).toHaveLength(0);
    expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
    expect(localStorage.getItem(persistentSessionStorageKey)).toBeNull();
  });

  it("password change deliberately clears this device's local session, so the port is signed out and sign-in is required again", async () => {
    const port = await signedIn();
    const seen: string[] = [];
    port.subscribe((state) => seen.push(state.status));
    handler = () => json(200, 'OK');

    await port.changePassword('another-secret-9');

    expect(calls[0]?.url).toBe(`${nhostAuthUrl}/user/password`);
    expect(calls[0]?.body).toEqual({ newPassword: 'another-secret-9' });
    expect(port.getState().status).toBe('signed-out');
    expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
    expect(seen.at(-1)).toBe('signed-out');
  });

  it('a failed password change keeps the session and reports why', async () => {
    const port = await signedIn();
    handler = () => json(503, { error: 'x' });

    await expectCloudError(
      port.changePassword('another-secret-9'),
      'unavailable',
    );
    expect(port.getState().status).toBe('signed-in');
  });

  it('password change without a session is refused locally', async () => {
    enable();
    await expectCloudError(
      account().changePassword('another-secret-9'),
      'session-ended',
    );
    expect(calls).toHaveLength(0);
  });
});

describe('network boundary of the adapter', () => {
  it('every request goes to the configured Auth service and nowhere else', async () => {
    enable();
    handler = () => json(200, { session: fakeSession() });
    const port = account();

    await port.signIn({ email, password });
    await port.signOut();
    handler = () => json(200, { session: null });
    await port.signUp({ email, password });

    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call.url.startsWith(`${nhostAuthUrl}/`)).toBe(true);
      expect(call.url.startsWith(nhostGraphqlUrl)).toBe(false);
    }
  });

  it('never writes to the learner database or its backup authority', async () => {
    enable();
    handler = () => json(200, { session: fakeSession() });
    const before = (await indexedDB.databases()).map((d) => d.name).sort();

    await account().signIn({ email, password });

    expect((await indexedDB.databases()).map((d) => d.name).sort()).toEqual(
      before,
    );
  });
});
