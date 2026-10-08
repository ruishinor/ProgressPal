import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  stripCloudCallbackParams,
  takeCloudCallback,
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
  const callback = `${origin}${cloudCallbackPath}`;

  it('recognises a one-time code', () => {
    expect(parseCloudCallback(`${callback}?code=abcdefgh12345678`)).toEqual({
      kind: 'code',
      code: 'abcdefgh12345678',
    });
  });

  it('treats the code as opaque: no provider alphabet, only emptiness and a length bound', () => {
    // URL-encoded characters decode to the code the provider issued.
    expect(
      parseCloudCallback(`${callback}?code=a%2Fb%2Bc%3D%3D~%C3%A9x`),
    ).toEqual({ kind: 'code', code: 'a/b+c==~éx' });
    expect(parseCloudCallback(`${callback}?code=short`)).toEqual({
      kind: 'code',
      code: 'short',
    });
    expect(parseCloudCallback(`${callback}?code=${'a'.repeat(2048)}`)).toEqual({
      kind: 'code',
      code: 'a'.repeat(2048),
    });
  });

  it.each([
    [`${callback}?refreshToken=22222222-2222-4222-8222-222222222222`],
    [`${callback}?refresh_token=x`],
    [`${callback}?accessToken=x`],
    [`${callback}?access_token=x`],
    [`${callback}?ticket=x&type=emailVerify`],
    [`${callback}#refreshToken=x`],
    [`${callback}#access_token=x&type=signup`],
    [`${callback}?code=abcdefgh12345678&refreshToken=x`],
    [`${callback}?error=x&refreshToken=x`],
  ])('refuses a token-bearing (non-PKCE) address: %s', (href) => {
    expect(parseCloudCallback(href)).toEqual({ kind: 'token-in-url' });
  });

  it.each([
    [`${callback}?error=access_denied`],
    [`${callback}?error=invalid-ticket&errorDescription=Ticket%20expired`],
    [`${callback}?error_description=x`],
    [`${callback}?error_code=otp_expired`],
    [`${callback}#error=access_denied&error_description=x`],
    [`${callback}?code=abcdefgh12345678&error=x`],
  ])('an error callback is recognised and never usable: %s', (href) => {
    expect(parseCloudCallback(href)).toEqual({ kind: 'provider-error' });
  });

  it.each([
    [`${callback}?code=`],
    [`${callback}?code=${'a'.repeat(2049)}`],
    [`${callback}?code=a&code=b`],
    [`${callback}#code=abcdefgh12345678`],
    [`${callback}?code=abcdefgh12345678#code=abcdefgh12345678`],
    [`${callback}?type=signup`],
    [`${callback}?CODE=`],
  ])('callback-shaped but unusable is its own outcome: %s', (href) => {
    expect(parseCloudCallback(href)).toEqual({ kind: 'malformed' });
  });

  it.each([[callback], [`${callback}?keep=1#top`], ['not a url']])(
    'is not callback-shaped at all: %s',
    (href) => {
      expect(parseCloudCallback(href)).toEqual({ kind: 'none' });
    },
  );

  it('strips every callback parameter and keeps the rest of the address', () => {
    expect(
      stripCloudCallbackParams(
        `${callback}?code=abc&type=signup&error=x&errorDescription=y&keep=1#top`,
      ),
    ).toBe('/cloud/callback?keep=1#top');
    expect(stripCloudCallbackParams(`${callback}#refreshToken=x`)).toBe(
      '/cloud/callback',
    );
  });

  it('strips every documented alias from the query and from the fragment', () => {
    const names = [
      'code',
      'type',
      'refreshToken',
      'refresh_token',
      'accessToken',
      'access_token',
      'ticket',
      'error',
      'errorDescription',
      'error_description',
      'error_code',
      'errorCode',
      'error_uri',
      'errorUri',
    ];
    const query = names.map((name) => `${name}=v`).join('&');

    expect(stripCloudCallbackParams(`${callback}?${query}`)).toBe(
      '/cloud/callback',
    );
    expect(stripCloudCallbackParams(`${callback}#${query}`)).toBe(
      '/cloud/callback',
    );
    expect(stripCloudCallbackParams(`${callback}?CODE=v&Error=v`)).toBe(
      '/cloud/callback',
    );
  });

  it('keeps unrelated parameters byte for byte, in the query and in the fragment', () => {
    expect(
      stripCloudCallbackParams(
        `${callback}?a=1%202&code=x&b=%C3%A5+c&flag#anchor`,
      ),
    ).toBe('/cloud/callback?a=1%202&b=%C3%A5+c&flag#anchor');
    expect(
      stripCloudCallbackParams(`${callback}?q=1#section=2&error=x&view=list`),
    ).toBe('/cloud/callback?q=1#section=2&view=list');
    // A fragment that is not a parameter list is left alone.
    expect(stripCloudCallbackParams(`${callback}?code=x#plain-anchor`)).toBe(
      '/cloud/callback#plain-anchor',
    );
  });

  it('rewrites the current history entry in place and preserves router state', () => {
    window.history.pushState(
      { key: 'abc' },
      '',
      '/cloud/callback?code=abcdefgh12345678',
    );
    const lengthBefore = window.history.length;

    expect(takeCloudCallback(window).scrubbed).toBe(true);

    expect(window.location.pathname + window.location.search).toBe(
      '/cloud/callback',
    );
    expect(window.history.state).toEqual({ key: 'abc' });
    expect(window.history.length).toBe(lengthBefore);
  });

  it('does not touch history when the address has nothing to scrub', () => {
    window.history.pushState({ key: 'abc' }, '', '/cloud/callback?keep=1');
    const replace = vi.spyOn(window.history, 'replaceState');

    expect(takeCloudCallback(window).scrubbed).toBe(true);

    expect(replace).not.toHaveBeenCalled();
    replace.mockRestore();
  });

  it('never throws if the address cannot be rewritten, and says it was not scrubbed', () => {
    const hostile = {
      location: { href: `${origin}/cloud/callback?code=abcdefgh12345678` },
      history: {
        state: null,
        replaceState: () => {
          throw new Error('SecurityError');
        },
      },
    };

    expect(takeCloudCallback(hostile).scrubbed).toBe(false);
  });

  it('reports a rewrite that did not take effect as not scrubbed', () => {
    const stuck = {
      location: { href: `${origin}/cloud/callback?code=abcdefgh12345678` },
      history: { state: null, replaceState: () => undefined },
    };

    expect(takeCloudCallback(stuck).scrubbed).toBe(false);
  });
});

describe('takeCloudCallback: one read of the browser address decides what is parsed and what is scrubbed', () => {
  const origin = 'https://progresspal.example';
  const callback = `${origin}${cloudCallbackPath}`;

  function windowReading(
    hrefs: string[],
    replaced: string[],
    options: { replaceThrows?: boolean; ignoreReplace?: boolean } = {},
  ) {
    let reads = 0;

    return {
      reads: () => reads,
      win: {
        location: {
          get href() {
            const href = hrefs[Math.min(reads, hrefs.length - 1)] ?? '';
            reads += 1;
            return href;
          },
        },
        history: {
          state: { routerKey: 1 },
          replaceState: (_state: unknown, _title: string, url?: unknown) => {
            if (options.replaceThrows) throw new Error('SecurityError');
            if (!options.ignoreReplace) replaced.push(String(url));
          },
        },
      },
    };
  }

  it('parses the very address it removes the parameters from, even if the location changes afterwards', () => {
    const replaced: string[] = [];
    const reading = windowReading(
      [`${callback}?code=firstreadcode1&keep=1`, `${callback}?keep=1`],
      replaced,
    );

    const result = takeCloudCallback(reading.win);

    expect(result).toEqual({
      callback: { kind: 'code', code: 'firstreadcode1' },
      scrubbed: true,
    });
    // What was rewritten is the stripped form of the address that was parsed.
    expect(replaced).toEqual(['/cloud/callback?keep=1']);
    // The decisive read and the read-back; nothing else consults the location.
    expect(reading.reads()).toBe(2);
  });

  it.each([
    [`${callback}?code=abcdefgh12345678`, 'code'],
    [`${callback}?error=access_denied`, 'provider-error'],
    [`${callback}?refreshToken=x`, 'token-in-url'],
    [`${callback}?code=a&code=b`, 'malformed'],
    [`${callback}?keep=1`, 'none'],
  ])('%s: reports %s and leaves nothing callback-shaped', (href, kind) => {
    window.history.replaceState({ key: 'abc' }, '', href.replace(origin, ''));

    const result = takeCloudCallback(window);

    expect(result.callback.kind).toBe(kind);
    expect(result.scrubbed).toBe(true);
    expect(window.location.search).not.toMatch(/code|error|refreshToken/);
    expect(window.history.state).toEqual({ key: 'abc' });
  });

  it('still reports what it found when the rewrite cannot happen, but not as scrubbed', () => {
    const throwing = windowReading([`${callback}?code=abcdefgh12345678`], [], {
      replaceThrows: true,
    });
    const ignoring = windowReading([`${callback}?code=abcdefgh12345678`], [], {
      ignoreReplace: true,
    });

    expect(takeCloudCallback(throwing.win)).toEqual({
      callback: { kind: 'code', code: 'abcdefgh12345678' },
      scrubbed: false,
    });
    expect(takeCloudCallback(ignoring.win)).toEqual({
      callback: { kind: 'code', code: 'abcdefgh12345678' },
      scrubbed: false,
    });
  });

  it('never rewrites history when there is nothing to scrub', () => {
    const replaced: string[] = [];
    const reading = windowReading([`${callback}?keep=1`], replaced);

    expect(takeCloudCallback(reading.win)).toEqual({
      callback: { kind: 'none' },
      scrubbed: true,
    });
    expect(replaced).toEqual([]);
  });

  it('an address that cannot be read is nothing found and not scrubbed', () => {
    const unreadable = {
      location: {
        get href(): string {
          throw new Error('SecurityError');
        },
      },
      history: { state: null, replaceState: () => undefined },
    };

    expect(takeCloudCallback(unreadable)).toEqual({
      callback: { kind: 'none' },
      scrubbed: false,
    });
  });
});
