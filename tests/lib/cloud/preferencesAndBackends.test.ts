import { beforeEach, describe, expect, it } from 'vitest';

import {
  cloudPreferencesStorageKey,
  defaultCloudPreferences,
  readCloudPreferences,
  writeCloudPreferences,
} from '@/lib/cloud/preferences';
import {
  cloudSessionStorageKey,
  createSessionScopedBackend,
  createTrustedDeviceBackend,
  persistentSessionStorageKey,
  removeStoredCloudSessions,
} from '@/lib/cloud/nhost/sessionBackends';
import {
  pkceVerifierStorageKey,
  pkceVerifierTtlMs,
  clearPkceFlow,
  savePkceFlow,
  takePkceFlow,
} from '@/lib/cloud/pkceVerifierStore';
import {
  cloudCallbackPath,
  parseCloudCallback,
  scrubCloudCallbackUrl,
  stripCloudCallbackParams,
} from '@/lib/cloud/callbackUrl';

const verifier = 'v'.repeat(64);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('device-local cloud preferences', () => {
  it('default to cloud off and a session-scoped sign-in', () => {
    expect(readCloudPreferences()).toEqual({
      enabled: false,
      trustedDevice: false,
    });
    expect(defaultCloudPreferences).toEqual({
      enabled: false,
      trustedDevice: false,
    });
  });

  it('round-trip an explicit choice', () => {
    expect(writeCloudPreferences({ enabled: true, trustedDevice: true })).toBe(
      true,
    );
    expect(readCloudPreferences()).toEqual({
      enabled: true,
      trustedDevice: true,
    });
  });

  it.each([
    ['not json', '{oops'],
    ['an array', '[]'],
    ['a string', '"yes"'],
    ['truthy non-booleans', '{"enabled":"true","trustedDevice":1}'],
  ])('treat %s as the safe default', (_label, raw) => {
    localStorage.setItem(cloudPreferencesStorageKey, raw);

    expect(readCloudPreferences()).toEqual({
      enabled: false,
      trustedDevice: false,
    });
  });

  it('treat an unreadable store as the safe default and report a failed write', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => undefined,
    };

    expect(readCloudPreferences(broken)).toEqual({
      enabled: false,
      trustedDevice: false,
    });
    expect(
      writeCloudPreferences({ enabled: true, trustedDevice: true }, broken),
    ).toBe(false);
    expect(readCloudPreferences(null)).toEqual({
      enabled: false,
      trustedDevice: false,
    });
  });

  it('live under their own key, outside any learner-data store', () => {
    expect(cloudPreferencesStorageKey).toBe('progresspal:cloud:preferences');
    expect(cloudPreferencesStorageKey).not.toMatch(/backup|dexie|indexeddb/i);
  });
});

describe('session backends (SDK 4.9.0 get/set/remove semantics)', () => {
  const stored = {
    accessToken: 'a',
    refreshToken: 'r',
    decodedToken: {},
  } as never;

  it('session-scoped: get returns null when empty, set then get round-trips, remove clears', () => {
    const backend = createSessionScopedBackend();

    expect(backend.get()).toBeNull();
    backend.set(stored);
    expect(backend.get()).toEqual(stored);
    expect(sessionStorage.getItem(cloudSessionStorageKey)).not.toBeNull();
    backend.remove();
    expect(backend.get()).toBeNull();
    expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
  });

  it('session-scoped: never writes to localStorage', () => {
    createSessionScopedBackend().set(stored);

    expect(localStorage.length).toBe(0);
  });

  it('session-scoped: a corrupt record is dropped, not rethrown', () => {
    sessionStorage.setItem(cloudSessionStorageKey, '{broken');

    expect(createSessionScopedBackend().get()).toBeNull();
    expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
  });

  it('session-scoped: if tab storage is unavailable the session stays in memory for this tab only', () => {
    const backend = createSessionScopedBackend(() => null);

    backend.set(stored);
    expect(backend.get()).toEqual(stored);
    expect(localStorage.length).toBe(0);
    backend.remove();
    expect(backend.get()).toBeNull();
  });

  it('trusted device: the SDK persistent backend under its default key', () => {
    const backend = createTrustedDeviceBackend();

    backend.set(stored);
    expect(localStorage.getItem(persistentSessionStorageKey)).not.toBeNull();
    expect(persistentSessionStorageKey).toBe('nhostSession');
    expect(sessionStorage.length).toBe(0);
  });

  it('removeStoredCloudSessions clears both stores and nothing else', () => {
    sessionStorage.setItem(cloudSessionStorageKey, '1');
    localStorage.setItem(persistentSessionStorageKey, '1');
    localStorage.setItem(cloudPreferencesStorageKey, '{}');

    removeStoredCloudSessions();

    expect(sessionStorage.getItem(cloudSessionStorageKey)).toBeNull();
    expect(localStorage.getItem(persistentSessionStorageKey)).toBeNull();
    expect(localStorage.getItem(cloudPreferencesStorageKey)).toBe('{}');
  });
});

describe('PKCE verifier store', () => {
  it('is single-use: the first take returns it, the second finds nothing', () => {
    savePkceFlow({ verifier, purpose: 'signup', createdAt: 1000 });

    expect(takePkceFlow(2000)).toEqual({
      state: 'ok',
      verifier,
      purpose: 'signup',
    });
    expect(takePkceFlow(2000)).toEqual({ state: 'missing' });
    expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
  });

  it('expires after its TTL, is removed anyway, and still says what was started', () => {
    savePkceFlow({ verifier, purpose: 'reset', createdAt: 1000 });

    expect(takePkceFlow(1000 + pkceVerifierTtlMs + 1)).toEqual({
      state: 'expired',
      purpose: 'reset',
    });
    expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
  });

  it('a record from the future (clock change) is treated as expired', () => {
    savePkceFlow({ verifier, purpose: 'signup', createdAt: 5000 });

    expect(takePkceFlow(1000).state).toBe('expired');
  });

  it.each([
    ['malformed json', '{x'],
    [
      'a short verifier',
      JSON.stringify({ verifier: 'short', purpose: 'signup', createdAt: 1 }),
    ],
    [
      'an unknown purpose',
      JSON.stringify({ verifier, purpose: 'other', createdAt: 1 }),
    ],
    ['a missing time', JSON.stringify({ verifier, purpose: 'signup' })],
  ])('treats %s as missing and removes it', (_label, raw) => {
    localStorage.setItem(pkceVerifierStorageKey, raw);

    expect(takePkceFlow(2)).toEqual({ state: 'missing' });
    expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
  });

  it('clear removes a pending record; an unavailable store degrades quietly', () => {
    savePkceFlow({ verifier, purpose: 'signup', createdAt: 1 });
    clearPkceFlow();
    expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();

    expect(
      savePkceFlow({ verifier, purpose: 'signup', createdAt: 1 }, null),
    ).toBe(false);
    expect(takePkceFlow(1, null)).toEqual({ state: 'missing' });
  });

  it('uses an explicitly named key, separate from the session and the preferences', () => {
    expect(pkceVerifierStorageKey).toBe('progresspal:cloud:pkce-verifier');
    expect(
      new Set([
        pkceVerifierStorageKey,
        cloudPreferencesStorageKey,
        cloudSessionStorageKey,
      ]).size,
    ).toBe(3);
  });
});

describe('email-link address handling', () => {
  const origin = 'https://progresspal.example';

  it('recognises a one-time code', () => {
    expect(
      parseCloudCallback(`${origin}${cloudCallbackPath}?code=abcdefgh12345678`),
    ).toEqual({
      kind: 'code',
      code: 'abcdefgh12345678',
    });
  });

  it.each([
    [
      `${origin}/cloud/callback?refreshToken=22222222-2222-4222-8222-222222222222`,
    ],
    [`${origin}/cloud/callback?refresh_token=x`],
    [`${origin}/cloud/callback#refreshToken=x`],
    [`${origin}/cloud/callback#access_token=x&type=signup`],
    [`${origin}/cloud/callback?code=abcdefgh12345678&refreshToken=x`],
  ])('refuses a token-bearing (non-PKCE) address: %s', (href) => {
    expect(parseCloudCallback(href)).toEqual({ kind: 'token-in-url' });
  });

  it.each([
    [`${origin}/cloud/callback`],
    [`${origin}/cloud/callback?code=`],
    [`${origin}/cloud/callback?code=short`],
    [`${origin}/cloud/callback?code=${'a'.repeat(513)}`],
    [`${origin}/cloud/callback?code=<script>alert(1)</script>`],
    ['not a url'],
  ])('is not a link: %s', (href) => {
    expect(parseCloudCallback(href)).toEqual({ kind: 'none' });
  });

  it('strips every callback parameter and keeps the rest of the address', () => {
    expect(
      stripCloudCallbackParams(
        `${origin}/cloud/callback?code=abc&type=signup&error=x&errorDescription=y&keep=1#top`,
      ),
    ).toBe('/cloud/callback?keep=1#top');
    expect(
      stripCloudCallbackParams(`${origin}/cloud/callback#refreshToken=x`),
    ).toBe('/cloud/callback');
  });

  it('rewrites the current history entry in place and preserves router state', () => {
    window.history.pushState(
      { key: 'abc' },
      '',
      '/cloud/callback?code=abcdefgh12345678',
    );
    const lengthBefore = window.history.length;

    scrubCloudCallbackUrl(window);

    expect(window.location.pathname + window.location.search).toBe(
      '/cloud/callback',
    );
    expect(window.history.state).toEqual({ key: 'abc' });
    expect(window.history.length).toBe(lengthBefore);
  });

  it('never throws if the address cannot be rewritten', () => {
    const hostile = {
      location: { href: `${origin}/cloud/callback?code=abcdefgh12345678` },
      history: {
        state: null,
        replaceState: () => {
          throw new Error('SecurityError');
        },
      },
    };

    expect(() => scrubCloudCallbackUrl(hostile)).not.toThrow();
  });
});
