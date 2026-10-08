import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CloudCallbackPage } from '@/features/settings';
import { CloudBackupCard } from '@/features/settings/components/CloudBackupCard';
import {
  AppStateContext,
  type AppStateContextValue,
} from '@/lib/appState/AppStateContext';
import {
  cloudPasswordMaxLength,
  cloudPasswordMinLength,
  createNhostCloudAccount,
  writeCloudPreferences,
  type CloudAccountPort,
} from '@/lib/cloud';
import { nhostAuthUrl } from '@/lib/cloud/nhost/endpoints';
import {
  pkceVerifierStorageKey,
  pkceVerifierTtlMs,
} from '@/lib/cloud/pkceVerifierStore';

import { stubState } from './cloudSettingsKit';

/**
 * Epic G repair 01, finding 3 (completion half): after an emailed reset link
 * the learner chooses a new password on the existing /cloud/callback page. This
 * runs the real account adapter and the real SDK against a stubbed fetch. What
 * is proven: the form appears only after a successful RESET exchange; the link
 * alone is never reported as a change; success is reported only when the
 * provider acknowledged it, and then this device is signed out; every refusal
 * or doubt is worded as exactly what is known; links that cannot be honoured
 * fail closed with the recovery guidance; and no password, code or token is
 * rendered, logged, kept in history or put in the address.
 */

const email = 'learner@example.com';
const password = 'correct-horse-9';
const newPassword = 'a-new-passphrase-9';
const code = 'abcdefgh12345678';
const resetAgain =
  'To reset a password, choose Forgot password? in Settings and open the new link in this browser.';

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
  address: string;
}

type Responder = (call: Call) => Response | Promise<Response>;

let calls: Call[] = [];
let handler: Responder;
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

function account(now?: () => number): CloudAccountPort {
  return createNhostCloudAccount({ getWindow: () => window, now });
}

/** A provider whose exchange returns a session and whose password change answers `change`. */
function provider(options: { exchange?: Responder; change?: Responder } = {}) {
  handler = (call) => {
    if (call.url.endsWith('/token/exchange')) {
      return (
        options.exchange ?? (() => json(200, { session: fakeSession() }))
      )(call);
    }
    if (call.url.endsWith('/user/password')) {
      return (options.change ?? (() => json(200, 'OK')))(call);
    }

    return json(500, { error: 'unexpected request' });
  };
}

/** The learner asked for a reset link in this browser (verifier + purpose kept). */
async function startReset(now?: () => number) {
  enable();
  const port = account(now);

  handler = () => json(200, {});
  await port.requestPasswordReset(email);
  expect(calls[0]?.url).toBe(`${nhostAuthUrl}/user/password/reset`);
  expect(
    (calls[0]?.body?.options as { redirectTo?: string } | undefined)
      ?.redirectTo,
  ).toBe(`${window.location.origin}/cloud/callback`);
  calls = [];
  provider();

  return port;
}

async function startSignUp() {
  enable();
  const port = account();

  handler = () => json(200, { session: null });
  await port.signUp({ email, password });
  calls = [];
  provider();

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

const settingsLink = () => screen.findByRole('link', { name: 'Open Settings' });
// Shorter than the test timeout, so a form that never appears fails as "not
// found" rather than as a timeout.
const formHeading = () =>
  screen.findByRole(
    'heading',
    { level: 2, name: 'Choose a new password' },
    { timeout: 2000 },
  );
const newField = () => screen.getByLabelText('New password');
const confirmField = () => screen.getByLabelText('Confirm new password');
const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Change password' }));
const passwordCalls = () =>
  calls.filter((call) => call.url.endsWith('/user/password'));

async function fill(first: string, second = first) {
  if (first !== '') await userEvent.type(newField(), first);
  if (second !== '') await userEvent.type(confirmField(), second);
}

/** A reset link has been opened and the form is showing. */
async function openForm(options: { strict?: boolean } = {}) {
  const port = await startReset();

  land(`/cloud/callback?code=${code}&keep=1`);
  const view = renderPage(port, options);

  await formHeading();

  return { port, view };
}

function expectNothingSecretWasKept(secrets: string[]) {
  const everything = `${document.documentElement.outerHTML} ${window.location.href}`;

  for (const secret of secrets) {
    expect(everything).not.toContain(secret);
  }
  for (const { method, spy } of consoleSpies) {
    expect(spy, `console.${method}`).not.toHaveBeenCalled();
  }
}

describe('a reset link asks for a new password — and only a reset link does', () => {
  it('after a successful reset exchange: the form, with no claim that anything changed', async () => {
    const lengthBefore = window.history.length;
    const { port } = await openForm();

    expect(
      screen.getByText(
        'This link signed you in on this device. Your password has not changed yet.',
      ),
    ).toBeVisible();
    expect(newField()).toHaveAttribute('type', 'password');
    expect(newField()).toHaveAttribute('autocomplete', 'new-password');
    expect(confirmField()).toHaveAttribute('type', 'password');
    expect(confirmField()).toHaveAttribute('autocomplete', 'new-password');
    expect(
      screen.getByText(
        `${cloudPasswordMinLength} to ${cloudPasswordMaxLength} characters.`,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Change password' }),
    ).toBeEnabled();
    expect(await settingsLink()).toHaveAttribute('href', '/rpg/settings');
    // The link alone is not a password change: nothing says so, nothing was sent.
    expect(screen.queryByText(/Password changed/i)).not.toBeInTheDocument();
    expect(passwordCalls()).toHaveLength(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${nhostAuthUrl}/token/exchange`);
    // The session the link created is real, and the address is already clean.
    expect(port.getState().status).toBe('signed-in');
    expect(calls[0]?.address).toBe('/cloud/callback?keep=1');
    expect(window.location.search).toBe('?keep=1');
    expect(window.history.length).toBe(lengthBefore);
    expectNothingSecretWasKept([code]);
  });

  it('puts keyboard focus on the first field, and offers four stops in a sensible order', async () => {
    await openForm();

    expect(newField()).toHaveFocus();
    await userEvent.tab();
    expect(confirmField()).toHaveFocus();
    await userEvent.tab();
    expect(
      screen.getByRole('button', { name: 'Change password' }),
    ).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('link', { name: 'Open Settings' })).toHaveFocus();
  });

  it('is not a live region while the learner types, and has one main landmark and one page heading', async () => {
    await openForm();

    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the form once and exchanges once even when React runs the effect twice (StrictMode)', async () => {
    const port = await startReset();
    const complete = vi.spyOn(port, 'completeEmailLink');

    land(`/cloud/callback?code=${code}`);
    renderPage(port, { strict: true });
    await formHeading();

    expect(complete).toHaveBeenCalledTimes(1);
    expect(
      calls.filter((call) => call.url.endsWith('/token/exchange')),
    ).toHaveLength(1);
    expect(screen.getAllByLabelText('New password')).toHaveLength(1);
  });

  it('a verification (sign-up) link never shows the form', async () => {
    const port = await startSignUp();

    land(`/cloud/callback?code=${code}&type=signup`);
    renderPage(port);
    await settingsLink();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Email verified' }),
    ).toBeVisible();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Change password' }),
    ).not.toBeInTheDocument();
  });

  it('leaving without choosing a password changes nothing and claims nothing', async () => {
    const { port } = await openForm();

    expect(await settingsLink()).toBeVisible();
    expect(passwordCalls()).toHaveLength(0);
    // Signed in by the link, exactly as the form said; the password is untouched.
    expect(port.getState().status).toBe('signed-in');
  });
});

describe('choosing the new password', () => {
  it.each([
    ['nothing in either field', '', '', 'Enter the new password twice.'],
    ['only the first field', newPassword, '', 'Enter the new password twice.'],
    [
      'a password that is too short',
      'x'.repeat(cloudPasswordMinLength - 1),
      'x'.repeat(cloudPasswordMinLength - 1),
      `Passwords are ${cloudPasswordMinLength} to ${cloudPasswordMaxLength} characters.`,
    ],
    [
      'a password that is too long',
      'x'.repeat(cloudPasswordMaxLength + 1),
      'x'.repeat(cloudPasswordMaxLength + 1),
      `Passwords are ${cloudPasswordMinLength} to ${cloudPasswordMaxLength} characters.`,
    ],
    [
      'two passwords that differ',
      newPassword,
      `${newPassword}x`,
      'The two passwords do not match.',
    ],
  ])(
    '%s is refused here, with no request',
    async (_label, first, second, line) => {
      await openForm();
      calls = [];

      await fill(first, second);
      await submit();

      const notice = await screen.findByText('Password not changed');

      expect(notice.closest('[role]')).toHaveAttribute('role', 'alert');
      expect(screen.getByText(line)).toBeVisible();
      expect(calls).toHaveLength(0);
      expect(newField()).toBeEnabled();
    },
  );

  it('Enter in the confirmation field submits the form', async () => {
    await openForm();

    await userEvent.type(newField(), newPassword);
    await userEvent.type(confirmField(), `${newPassword}{Enter}`);

    expect(await screen.findByText('Password changed')).toBeVisible();
    expect(passwordCalls()).toHaveLength(1);
  });

  it('the exact new password is sent once, to the password endpoint, and nowhere else', async () => {
    await openForm();
    calls = [];

    await fill(newPassword);
    await submit();
    await screen.findByText('Password changed');

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`${nhostAuthUrl}/user/password`);
    expect(calls[0]?.body).toEqual({ newPassword });
  });

  it('while the change runs the controls wait, and a second press cannot send twice', async () => {
    await openForm();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    provider({
      change: async () => {
        await gate;

        return json(200, 'OK');
      },
    });
    calls = [];
    await fill(newPassword);

    const button = screen.getByRole('button', { name: 'Change password' });

    await userEvent.click(button);
    await userEvent.click(button);
    expect(newField()).toBeDisabled();
    expect(confirmField()).toBeDisabled();
    expect(passwordCalls()).toHaveLength(1);
    release();
    expect(await screen.findByText('Password changed')).toBeVisible();
    expect(passwordCalls()).toHaveLength(1);
  });
});

describe('success is claimed only when the provider acknowledged it', () => {
  it('says the password changed and that this device was signed out; the session is gone', async () => {
    const { port } = await openForm();
    const states: string[] = [];

    port.subscribe((state) => states.push(state.status));
    await fill(newPassword);
    await submit();

    const heading = await screen.findByRole('heading', {
      level: 2,
      name: 'Password changed',
    });

    expect(heading.closest('[role]')).toHaveAttribute('role', 'status');
    expect(
      screen.getByText(
        'You were signed out on this device. Sign in with your new password.',
      ),
    ).toBeVisible();
    expect(port.getState().status).toBe('signed-out');
    expect(states.at(-1)).toBe('signed-out');
    expect(sessionStorage.length).toBe(0);
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Settings' })).toHaveAttribute(
      'href',
      '/rpg/settings',
    );
    // Deliberate focus: the result is announced from the top of the page.
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('does not assert what the provider did with any other session', async () => {
    await openForm();
    await fill(newPassword);
    await submit();
    await screen.findByText('Password changed');

    expect(document.body.textContent).not.toMatch(
      /all (other )?(devices|sessions)|every (device|session)|other (devices|sessions)|everywhere|revoked|invalidated/i,
    );
  });

  it('never keeps the password: not in the page, the address, the history, the fields or the console', async () => {
    await openForm();
    await fill(newPassword);
    await submit();
    await screen.findByText('Password changed');

    expectNothingSecretWasKept([newPassword, code]);
    expect(window.history.state).toEqual({ routerKey: 5 });
  });
});

describe('every refusal or doubt is worded as exactly what is known', () => {
  it.each([
    [
      'the provider refused the password',
      () => json(400, { error: 'password-in-hibp-database', status: 400 }),
      'The new password was not accepted. Use 9 to 50 characters, or choose a different password.',
    ],
    [
      'the provider is limiting requests',
      () => json(429, { error: 'too-many-requests', status: 429 }),
      'Too many attempts. Wait a while and try again.',
    ],
    [
      'the provider says it is not permitted',
      () => json(403, { error: 'forbidden', status: 403 }),
      'This action is not permitted for this account.',
    ],
  ])(
    '%s: not changed, the form stays, the session is kept, and another try works',
    async (_label, refuse, line) => {
      const { port } = await openForm();

      provider({ change: refuse });
      await fill(newPassword);
      await submit();

      const notice = await screen.findByText('Password not changed');

      expect(notice.closest('[role]')).toHaveAttribute('role', 'alert');
      expect(screen.getByText(line)).toBeVisible();
      expect(screen.queryByText('Password changed')).not.toBeInTheDocument();
      expect(newField()).toHaveValue('');
      expect(confirmField()).toHaveValue('');
      expect(port.getState().status).toBe('signed-in');

      provider();
      await fill('another-passphrase-9');
      await submit();

      expect(await screen.findByText('Password changed')).toBeVisible();
      expect(port.getState().status).toBe('signed-out');
    },
  );

  it.each([
    ['an unreachable service', () => json(503, { error: 'x' })],
    [
      'a lost connection',
      () => {
        throw new TypeError('Failed to fetch');
      },
    ],
  ])(
    '%s: not known whether it changed, and neither success nor failure is claimed',
    async (_label, fail) => {
      const { port } = await openForm();

      provider({ change: fail });
      await fill(newPassword);
      await submit();

      const notice = await screen.findByText('Password change not confirmed');

      expect(notice.closest('[role]')).toHaveAttribute('role', 'alert');
      expect(
        screen.getByText(
          'The cloud service did not give a clear answer, so it is not known whether the password was changed.',
        ),
      ).toBeVisible();
      expect(
        screen.getByText(
          'Try again. When signing in, try the new password first, then the old one.',
        ),
      ).toBeVisible();
      expect(screen.queryByText('Password changed')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Password not changed'),
      ).not.toBeInTheDocument();
      expect(port.getState().status).toBe('signed-in');
      expect(newField()).toBeEnabled();
      expectNothingSecretWasKept([newPassword, 'Failed to fetch']);
    },
  );

  it('the sign-in from the link has ended: closed, not changed, with the way to try again', async () => {
    await openForm();

    provider({
      change: () => json(401, { error: 'invalid-refresh-token', status: 401 }),
    });
    await fill(newPassword);
    await submit();

    const heading = await screen.findByRole('heading', {
      level: 2,
      name: 'Password not changed',
    });

    expect(heading.closest('[role]')).toHaveAttribute('role', 'alert');
    expect(
      screen.getByText(
        'The sign-in from this link has ended, so the password was not changed. To try again, choose Forgot password? in Settings.',
      ),
    ).toBeVisible();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Change password' }),
    ).not.toBeInTheDocument();
    expect(await settingsLink()).toBeVisible();
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('cloud turned off in another tab meanwhile: nothing is sent, and the learner is told how to continue', async () => {
    await openForm();
    writeCloudPreferences({ enabled: false, trustedDevice: false });
    calls = [];

    await fill(newPassword);
    await submit();

    expect(
      await screen.findByRole('heading', { name: 'Cloud backup is off' }),
    ).toBeVisible();
    expect(calls).toHaveLength(0);
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it('an unexpected error never shows its own text', async () => {
    const port = await startReset();
    const throwing: CloudAccountPort = {
      ...port,
      changePassword: async () => {
        throw new Error('SDK internals: Bearer abc.def.ghi');
      },
    };

    land(`/cloud/callback?code=${code}`);
    renderPage(throwing);
    await formHeading();
    await fill(newPassword);
    await submit();

    expect(
      await screen.findByText('Password change not confirmed'),
    ).toBeVisible();
    expect(document.body.textContent).not.toMatch(/SDK internals|abc\.def/);
  });
});

describe('links that cannot be honoured fail closed, with the recovery guidance', () => {
  async function expectClosed(heading: string) {
    await settingsLink();

    expect(screen.getByRole('heading', { name: heading })).toBeVisible();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Change password' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Password changed/i)).not.toBeInTheDocument();
    expect(passwordCalls()).toHaveLength(0);
  }

  it('no record of the request in this browser (opened elsewhere)', async () => {
    enable();
    const port = account();

    land(`/cloud/callback?code=${code}`);
    renderPage(port);
    await expectClosed('Sign in to continue');

    expect(
      screen.getByText(/This browser has no record of starting this request\./),
    ).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(resetAgain);
    expect(calls).toHaveLength(0);
    expectNothingSecretWasKept([code]);
  });

  it('the request started here has expired', async () => {
    let clock = Date.now();
    const port = await startReset(() => clock);

    clock += pkceVerifierTtlMs + 1;
    land(`/cloud/callback?code=${code}`);
    renderPage(port);
    await expectClosed('Sign in to continue');

    expect(
      screen.getByText(
        `The password reset request started in this browser has expired. ${resetAgain}`,
      ),
    ).toBeVisible();
    expect(calls).toHaveLength(0);
    expect(localStorage.getItem(pkceVerifierStorageKey)).toBeNull();
  });

  it('the provider rejects the code (used, expired or not matching this browser)', async () => {
    const port = await startReset();

    provider({ exchange: () => json(400, { error: 'invalid-request' }) });
    land(`/cloud/callback?code=${code}`);
    renderPage(port);
    await expectClosed('This link has expired');

    expect(screen.getByRole('alert')).toHaveTextContent(
      `This link has expired or was already used. Sign in with your email and password. ${resetAgain}`,
    );
    expect(port.getState().status).toBe('signed-out');
    expectNothingSecretWasKept([code]);
  });

  it.each([
    ['a provider error in the address', '/cloud/callback?error=access_denied'],
    ['a token link', '/cloud/callback?refreshToken=abc&type=recovery'],
    [
      'a duplicated code',
      '/cloud/callback?code=aaaaaaaa11111111&code=bbbbbbbb22222222',
    ],
    ['an empty code', '/cloud/callback?code='],
    ['nothing in the address', '/cloud/callback'],
  ])(
    '%s: nothing is exchanged and no form appears',
    async (_label, address) => {
      const port = await startReset();

      land(address);
      renderPage(port);
      await expectClosed('This link cannot be used');

      expect(calls).toHaveLength(0);
      expect(port.getState().status).toBe('signed-out');
    },
  );

  it('cloud off: the address is cleaned, nothing is sent, and no form appears', async () => {
    land(`/cloud/callback?code=${code}&keep=1`);
    renderPage(account());
    await expectClosed('Cloud backup is off');

    expect(calls).toHaveLength(0);
    expect(window.location.search).toBe('?keep=1');
    expectNothingSecretWasKept([code]);
  });
});

describe('the address typed for a reset is judged exactly as the account judges it', () => {
  const tooLong = `${'a'.repeat(250)}@example.com`;
  const addresses: Array<[string, string]> = [
    ['an ordinary address', 'learner@example.com'],
    ['a plus tag', 'learner+tag@example.com'],
    ['no @', 'learner.example.com'],
    ['no dot after the @', 'learner@example'],
    ['two @', 'a@b@example.com'],
    ['longer than 254 characters', tooLong],
  ];

  function renderRealCard(port: CloudAccountPort) {
    const state: AppStateContextValue = stubState();

    return render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppStateContext.Provider value={state}>
          <CloudBackupCard
            dependencies={{ account: port }}
            exporting={false}
            localBusy={false}
            onExportLocal={() => undefined}
            titleAs="h3"
          />
        </AppStateContext.Provider>
      </MemoryRouter>,
    );
  }

  it.each(addresses)(
    '%s: the card says a link is on its way exactly when the account really asked the provider',
    async (_label, address) => {
      enable();
      handler = () => json(200, {});
      const port = account();

      // What the account itself does with this address.
      const refused = await port
        .requestPasswordReset(address)
        .then(() => false)
        .catch((error: { code?: string }) => error.code === 'invalid-input');
      const asked = calls.length;

      calls = [];
      renderRealCard(port);
      await userEvent.click(
        screen.getByRole('button', { name: 'Forgot password?' }),
      );
      // Pasted, not typed: one of the addresses is longer than 250 characters.
      await userEvent.click(screen.getByLabelText('Email'));
      await userEvent.paste(address);
      await userEvent.click(
        screen.getByRole('button', { name: 'Send reset link' }),
      );

      if (refused) {
        expect(asked).toBe(0);
        expect(
          await screen.findByText('Reset link not requested'),
        ).toBeVisible();
        expect(screen.queryByText(/on its way/)).not.toBeInTheDocument();
        expect(calls).toHaveLength(0);
      } else {
        expect(asked).toBe(1);
        expect(
          await screen.findByText(
            'If an account exists for that address, a password reset link is on its way.',
          ),
        ).toBeVisible();
        expect(calls).toHaveLength(1);
        expect(screen.queryByText('Reset link not requested')).toBeNull();
      }
    },
  );
});
