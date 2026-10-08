import { render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CloudCallbackPage } from '@/features/settings';
import {
  createNhostCloudAccount,
  writeCloudPreferences,
  type CloudAccountPort,
} from '@/lib/cloud';
import { nhostAuthUrl } from '@/lib/cloud/nhost/endpoints';
import { pkceVerifierStorageKey } from '@/lib/cloud/pkceVerifierStore';

/**
 * The email-link landing route, through the real account adapter and the real
 * SDK against a stubbed fetch. What is proven: what the learner sees for each
 * way a link can end, that nothing the link carried is rendered or logged or
 * kept in history, that the address was clean before the exchange left, that
 * the one-time code is exchanged once even under React's development
 * double-run, and that every result ends at Settings.
 */

const email = 'learner@example.com';
const password = 'correct-horse-9';
const code = 'abcdefgh12345678';

const base64Url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

function fakeSession() {
  const exp = Math.floor(Date.now() / 1000) + 900;

  return {
    accessToken: `${base64Url({ alg: 'none' })}.${base64Url({ sub: 'u1', exp, iat: exp - 900 })}.sig`,
    accessTokenExpiresIn: 900,
    refreshTokenId: '11111111-1111-4111-8111-111111111111',
    refreshToken: '22222222-2222-4222-8222-222222222222',
    user: { id: 'u1', email, displayName: 'x', roles: ['user'] },
  };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

interface Call {
  url: string;
  body: Record<string, unknown> | null;
  /** The address bar at the moment the request was made. */
  address: string;
}

let calls: Call[] = [];
let handler: (call: Call) => Response | Promise<Response>;
const consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(
  (method) => ({ method, spy: vi.spyOn(console, method) }),
);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState({ routerKey: 5 }, '', '/');
  calls = [];
  handler = () => json(500, { error: 'unconfigured' });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const call: Call = {
        url: String(input instanceof Request ? input.url : input),
        body:
          typeof init?.body === 'string'
            ? (JSON.parse(init.body) as Record<string, unknown>)
            : null,
        address: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      };
      calls.push(call);
      return handler(call);
    }),
  );
  consoleSpies.forEach(({ spy }) => spy.mockClear());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function enable() {
  writeCloudPreferences({ enabled: true, trustedDevice: false });
}

function account(): CloudAccountPort {
  return createNhostCloudAccount({ getWindow: () => window });
}

/** Starts the sign-up that an emailed verification link would complete. */
async function startSignUp() {
  enable();
  const port = account();
  handler = () => json(200, { session: null });
  await port.signUp({ email, password });
  calls = [];
  handler = () => json(200, { session: fakeSession() });

  return port;
}

function land(address: string) {
  window.history.replaceState({ routerKey: 5 }, '', address);
}

function renderPage(
  port: CloudAccountPort,
  options: { strict?: boolean } = {},
) {
  const tree = (
    <MemoryRouter initialEntries={['/cloud/callback']}>
      <CloudCallbackPage account={port} />
    </MemoryRouter>
  );

  return render(options.strict ? <StrictMode>{tree}</StrictMode> : tree);
}

/** The Settings link exists only once a result is shown (not while working). */
async function result() {
  await screen.findByRole('link', { name: 'Open Settings' });
}

function expectNothingOfTheLinkWasKept(secrets: string[]) {
  const everything = `${document.documentElement.outerHTML} ${window.location.href}`;

  for (const secret of secrets) {
    expect(everything).not.toContain(secret);
  }
  for (const { method, spy } of consoleSpies) {
    expect(spy, `console.${method}`).not.toHaveBeenCalled();
  }
}

describe('a good verification link', () => {
  it('scrubs the address before the exchange leaves, exchanges once, and shows nothing the link carried', async () => {
    const port = await startSignUp();
    const lengthBefore = window.history.length;
    land(`/cloud/callback?code=${code}&type=signup&keep=1`);

    renderPage(port);
    await result();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Email verified' }),
    ).toBeInTheDocument();
    expect(screen.getByText('You are signed in on this device.')).toBeVisible();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${nhostAuthUrl}/token/exchange`);
    expect(calls[0]?.body?.code).toBe(code);
    // The address was already clean when the request left:
    expect(calls[0]?.address).toBe('/cloud/callback?keep=1');
    expect(window.location.search).toBe('?keep=1');
    // History: the entry was rewritten in place, never added; state kept.
    expect(window.history.length).toBe(lengthBefore);
    expect(window.history.state).toEqual({ routerKey: 5 });
    expect(port.getState().status).toBe('signed-in');
    expectNothingOfTheLinkWasKept([code]);
  });

  it('exchanges the one-time code once even when React runs the effect twice (development StrictMode)', async () => {
    const port = await startSignUp();
    land(`/cloud/callback?code=${code}`);

    renderPage(port, { strict: true });
    await result();

    expect(
      calls.filter((call) => call.url.endsWith('/token/exchange')),
    ).toHaveLength(1);
    expect(
      screen.getByRole('heading', { name: 'Email verified' }),
    ).toBeVisible();
  });

  it('is a polite status, has one main landmark and one page heading', async () => {
    const port = await startSignUp();
    land(`/cloud/callback?code=${code}`);

    renderPage(port);
    await result();

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      within(screen.getByRole('status')).getByRole('heading', {
        name: 'Email verified',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('going back to the callback entry finds a clean address, makes no request, and says so', async () => {
    const port = await startSignUp();
    land(`/cloud/callback?code=${code}`);

    const first = renderPage(port);
    await result();
    first.unmount();
    calls = [];

    renderPage(port);
    await result();

    expect(calls).toHaveLength(0);
    expect(
      screen.getByRole('heading', { name: 'This link cannot be used' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Nothing was changed. You are signed in on this device.',
      ),
    ).toBeVisible();
  });
});

describe('every other way a link can end', () => {
  it.each([
    [
      'a provider error',
      '/cloud/callback?error=access_denied&error_description=The%20link%20expired&keep=1',
      ['access_denied', 'The link expired'],
    ],
    [
      'an error in the fragment',
      '/cloud/callback?keep=1#error=server_error',
      ['server_error'],
    ],
    [
      'a duplicated code',
      '/cloud/callback?code=aaaaaaaa11111111&code=bbbbbbbb22222222&keep=1',
      ['aaaaaaaa11111111', 'bbbbbbbb22222222'],
    ],
    ['an empty code', '/cloud/callback?code=&keep=1', []],
    [
      'a code in the fragment',
      '/cloud/callback?keep=1#code=abcdefgh12345678',
      [code],
    ],
    [
      'a non-PKCE token link',
      '/cloud/callback?refreshToken=22222222-2222-4222-8222-222222222222&type=signup',
      ['22222222-2222-4222-8222-222222222222'],
    ],
    ['an address with nothing in it', '/cloud/callback', []],
  ])(
    '%s: nothing is exchanged, nothing is shown, the address is clean, Settings is offered',
    async (label, address, secrets) => {
      const port = await startSignUp();
      land(address);

      renderPage(port);
      await result();

      expect(
        screen.getByRole('heading', { name: 'This link cannot be used' }),
      ).toBeVisible();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(calls).toHaveLength(0);
      expect(window.location.search).not.toMatch(
        /code|error|refreshToken|type=/,
      );
      expect(window.location.hash).not.toMatch(/code|error/);
      expect(port.getState().status).toBe('signed-out');
      // A callback-shaped link that cannot be honoured retires the verifier.
      // A bare visit (nothing in the address) must not: it could be a stray
      // visit or a Back press while the genuine email link is still to come.
      if (label === 'an address with nothing in it') {
        expect(localStorage.getItem(pkceVerifierStorageKey)).not.toBeNull();
      } else {
        expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
      }
      expect(
        screen.getByRole('link', { name: 'Open Settings' }),
      ).toHaveAttribute('href', '/rpg/settings');
      expectNothingOfTheLinkWasKept(secrets);
    },
  );

  it('cloud turned off: the address is cleaned, nothing is sent, and the learner is told how to continue', async () => {
    land(`/cloud/callback?code=${code}&keep=1`);

    renderPage(account());
    await result();

    expect(
      screen.getByRole('heading', { name: 'Cloud backup is off' }),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Turn it on in Settings, then sign in with your email and password.',
      ),
    ).toBeVisible();
    expect(calls).toHaveLength(0);
    expect(window.location.search).toBe('?keep=1');
    expectNothingOfTheLinkWasKept([code]);
  });

  it('no verifier in this browser: a calm sign-in instruction, no request, address clean', async () => {
    enable();
    land(`/cloud/callback?code=${code}`);

    renderPage(account());
    await result();

    expect(
      screen.getByRole('heading', { name: 'Sign in to continue' }),
    ).toBeVisible();
    expect(
      screen.getByText(/no record of starting this request/),
    ).toBeVisible();
    expect(calls).toHaveLength(0);
    expect(window.location.search).toBe('');
    expectNothingOfTheLinkWasKept([code]);
  });

  it('a rejected code is an expired link, not a fault; the code is not shown', async () => {
    const port = await startSignUp();
    handler = () => json(400, { error: 'invalid-request' });
    land(`/cloud/callback?code=${code}`);

    renderPage(port);
    await result();

    expect(
      screen.getByRole('heading', { name: 'This link has expired' }),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This link has expired or was already used. Sign in with your email and password.',
    );
    expect(port.getState().status).toBe('signed-out');
    expectNothingOfTheLinkWasKept([code]);
  });

  it('the cloud service being unreachable is reported plainly and still ends at Settings', async () => {
    const port = await startSignUp();
    handler = () => {
      throw new TypeError('Failed to fetch');
    };
    land(`/cloud/callback?code=${code}`);

    renderPage(port);
    await result();

    expect(
      screen.getByRole('heading', { name: 'Sign-in could not be completed' }),
    ).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The cloud service could not be reached. Local data is unaffected.',
    );
    expect(screen.getByRole('link', { name: 'Open Settings' })).toBeVisible();
    expectNothingOfTheLinkWasKept([code, 'Failed to fetch']);
  });

  it('an unexpected error never shows its own text', async () => {
    const throwing: CloudAccountPort = {
      ...account(),
      completeEmailLink: async () => {
        throw new Error('SDK internals: Bearer abc.def.ghi');
      },
    };

    renderPage(throwing);
    await result();

    expect(
      screen.getByText(
        'Something went wrong. Local data is unaffected. Sign in with your email and password.',
      ),
    ).toBeVisible();
    expectNothingOfTheLinkWasKept(['SDK internals', 'abc.def.ghi']);
  });

  it('a password-reset link reports that reset is not available here, without a password form', async () => {
    enable();
    const port = account();
    handler = () => json(200, {});
    await port.requestPasswordReset(email);
    calls = [];
    handler = () => json(200, { session: fakeSession() });
    land(`/cloud/callback?code=${code}`);

    renderPage(port);
    await result();

    expect(
      screen.getByRole('heading', { name: 'Link accepted' }),
    ).toBeVisible();
    expect(
      screen.getByText(/Password reset is not available in this version/),
    ).toBeVisible();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });
});

describe('the page is a bare landing, not part of the app', () => {
  it('renders no navigation, no cloud controls and no account actions', async () => {
    const port = await startSignUp();
    land('/cloud/callback');

    renderPage(port);
    await result();

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /sign in|sign out|back up|delete|create account/i,
      }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('is keyboard reachable: the only interactive element is the Settings link', async () => {
    const port = await startSignUp();
    land('/cloud/callback');

    renderPage(port);
    await result();

    const link = screen.getByRole('link', { name: 'Open Settings' });

    link.focus();
    expect(link).toHaveFocus();
  });
});
