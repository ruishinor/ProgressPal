import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CloudError, type CloudErrorCode } from '@/lib/cloud';

import { FakeBackupStore } from '../../lib/cloudBackup/fakeBackupStore';
import { createFreshDevice, type Device } from '../../lib/cloudBackup/support';
import {
  enableCloud,
  learnerEmail,
  makeAccount,
  renderCard,
  type RenderCardOptions,
} from './cloudSettingsKit';

/**
 * Epic G repair 01, finding 3 (Settings half): the signed-out area offers an
 * explicit "Forgot password?" action that asks the existing account port for a
 * reset link and answers with ONE generic result, whether or not an account
 * exists. Nothing is requested by opening the view; only the button sends.
 * The completion half (the new password, after the emailed link) is in
 * cloudPasswordRecoveryCallback.test.tsx.
 */

let device: Device;
let store: FakeBackupStore;
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  fetchSpy = vi.fn(async () => {
    throw new Error('the card must never reach the network in this file');
  });
  vi.stubGlobal('fetch', fetchSpy);
  device = await createFreshDevice('cloud-card-recovery');
  store = new FakeBackupStore();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await device.cleanup();
});

function dependencies(
  account: ReturnType<typeof makeAccount>['account'],
): RenderCardOptions['dependencies'] {
  return {
    account,
    store,
    readSnapshot: device.readSnapshot,
    migrationContext: device.migrationContext,
    restoreLocal: device.restoreLocal,
  };
}

/** The card, found without relying on its title (the title is another test's subject). */
function renderSignedOut(options: Parameters<typeof makeAccount>[0] = {}) {
  enableCloud();
  const made = makeAccount(options);
  const view = renderCard({ dependencies: dependencies(made.account) });
  const card = view.container.querySelector('.card') as HTMLElement;

  return { ...made, card, within: within(card) };
}

async function openResetView(
  rendered: ReturnType<typeof renderSignedOut>,
  typedAddress = '',
) {
  if (typedAddress !== '') {
    await userEvent.type(rendered.within.getByLabelText('Email'), typedAddress);
  }
  await userEvent.click(
    rendered.within.getByRole('button', { name: 'Forgot password?' }),
  );
}

const sentTitle = 'Check your email';
const sentLines = [
  'If an account exists for that address, a password reset link is on its way.',
  'Open the link in this browser. If you ask for more than one link, only the last one you asked for works.',
];

describe('the Forgot password? action', () => {
  it('is offered only while signed out, as a button that sends nothing by itself', async () => {
    const made = renderSignedOut();

    await openResetView(made);

    expect(made.account.requestPasswordReset).not.toHaveBeenCalled();
    expect(made.account.signIn).not.toHaveBeenCalled();
    expect(made.account.signUp).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(store.requests).toHaveLength(0);
  });

  it('is not offered while cloud is off', () => {
    const made = makeAccount();
    const view = renderCard({ dependencies: dependencies(made.account) });

    expect(
      within(view.container).queryByRole('button', {
        name: 'Forgot password?',
      }),
    ).not.toBeInTheDocument();
  });

  it('is not offered while signed in (there is no password change in Settings)', () => {
    enableCloud();
    const made = makeAccount();

    made.signInDirectly();
    const view = renderCard({ dependencies: dependencies(made.account) });

    expect(
      within(view.container).queryByRole('button', {
        name: /forgot|reset password|change password/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('sits in the action row between Create account and Turn off, and cannot submit the sign-in form', async () => {
    const made = renderSignedOut();
    const names = made.within
      .getAllByRole('button')
      .map((button) => button.textContent);

    expect(names).toEqual([
      'Sign in',
      'Create account',
      'Forgot password?',
      'Turn off cloud backup',
    ]);
    expect(
      made.within.getByRole('button', { name: 'Forgot password?' }),
    ).toHaveAttribute('type', 'button');
  });
});

describe('the reset view', () => {
  it('explains the request, keeps the address typed so far, and puts focus on the email field', async () => {
    const made = renderSignedOut();

    await openResetView(made, learnerEmail);

    expect(made.within.getByText('Reset your password')).toBeVisible();
    expect(
      made.within.getByText(
        "Enter your account's email address. If an account exists for it, the cloud service sends a link for choosing a new password. Open the link in this browser.",
      ),
    ).toBeVisible();

    const email = made.within.getByLabelText('Email');

    expect(email).toHaveValue(learnerEmail);
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveFocus();
    expect(
      made.within.getByRole('button', { name: 'Send reset link' }),
    ).toBeEnabled();
    expect(
      made.within.getByRole('button', { name: 'Back to sign in' }),
    ).toBeEnabled();
  });

  it('has no password field, and the password typed for sign-in is not kept', async () => {
    const made = renderSignedOut();

    await userEvent.type(made.within.getByLabelText('Email'), learnerEmail);
    await userEvent.type(
      made.within.getByLabelText(/^Password/),
      'correct-horse-9',
    );
    await userEvent.click(
      made.within.getByRole('button', { name: 'Forgot password?' }),
    );

    expect(made.within.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(made.card.innerHTML).not.toContain('correct-horse-9');

    await userEvent.click(
      made.within.getByRole('button', { name: 'Back to sign in' }),
    );

    expect(made.within.getByLabelText(/^Password/)).toHaveValue('');
  });

  it('Back to sign in returns to the sign-in form with the address kept and focus on it', async () => {
    const made = renderSignedOut();

    await openResetView(made, learnerEmail);
    await userEvent.click(
      made.within.getByRole('button', { name: 'Back to sign in' }),
    );

    expect(made.within.getByLabelText('Email')).toHaveValue(learnerEmail);
    expect(made.within.getByLabelText('Email')).toHaveFocus();
    expect(made.within.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(made.account.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('keyboard: Email, Send reset link, Back to sign in, in that order', async () => {
    const made = renderSignedOut();

    await openResetView(made);
    made.within.getByLabelText('Email').focus();
    await userEvent.tab();
    expect(
      made.within.getByRole('button', { name: 'Send reset link' }),
    ).toHaveFocus();
    await userEvent.tab();
    expect(
      made.within.getByRole('button', { name: 'Back to sign in' }),
    ).toHaveFocus();
  });
});

describe('asking for the link', () => {
  async function ask(
    made: ReturnType<typeof renderSignedOut>,
    address = ` ${learnerEmail} `,
  ) {
    await openResetView(made);
    await userEvent.clear(made.within.getByLabelText('Email'));
    await userEvent.type(made.within.getByLabelText('Email'), address);
    await userEvent.click(
      made.within.getByRole('button', { name: 'Send reset link' }),
    );
  }

  it('sends the trimmed address once, answers generically, and does not echo the address', async () => {
    const made = renderSignedOut();

    await ask(made);

    const notice = await screen.findByText(sentTitle);
    const region = notice.closest('[role]') as HTMLElement;

    expect(made.account.requestPasswordReset).toHaveBeenCalledTimes(1);
    expect(made.account.requestPasswordReset).toHaveBeenCalledWith(
      learnerEmail,
    );
    expect(region).toHaveAttribute('role', 'status');
    for (const line of sentLines) {
      expect(within(region).getByText(line)).toBeVisible();
    }
    expect(made.card.textContent).not.toContain(learnerEmail);
    expect(made.account.signIn).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Enter in the email field sends the reset request, never a sign-in', async () => {
    const made = renderSignedOut();

    await openResetView(made);
    await userEvent.type(made.within.getByLabelText('Email'), learnerEmail);
    await userEvent.keyboard('{Enter}');

    expect(await screen.findByText(sentTitle)).toBeVisible();
    expect(made.account.requestPasswordReset).toHaveBeenCalledTimes(1);
    expect(made.account.signIn).not.toHaveBeenCalled();
    expect(made.account.signUp).not.toHaveBeenCalled();
  });

  it('after the answer, the only control is Back to sign in, and it has focus', async () => {
    const made = renderSignedOut();

    await ask(made);
    await screen.findByText(sentTitle);

    expect(
      made.within.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Back to sign in']);
    expect(
      made.within.getByRole('button', { name: 'Back to sign in' }),
    ).toHaveFocus();
  });

  it.each([
    'invalid-input',
    'not-permitted',
    'unverified-email',
    'invalid-credentials',
    'email-in-use',
  ] satisfies CloudErrorCode[])(
    'a provider refusal that depends on the account (%s) looks exactly like success',
    async (code) => {
      const made = renderSignedOut();

      made.account.requestPasswordReset.mockRejectedValueOnce(
        new CloudError(code, `provider says ${code}`),
      );
      await ask(made);

      const notice = await screen.findByText(sentTitle);
      const region = notice.closest('[role]') as HTMLElement;

      expect(region).toHaveAttribute('role', 'status');
      for (const line of sentLines) {
        expect(within(region).getByText(line)).toBeVisible();
      }
      expect(made.card.textContent).not.toContain(`provider says ${code}`);
      expect(
        made.within.queryByText('Reset link not requested'),
      ).not.toBeInTheDocument();
    },
  );

  it.each([
    ['rate-limited', 'Too many attempts. Wait a while and try again.'],
    [
      'unavailable',
      'The cloud service could not be reached. Local data is unaffected.',
    ],
    ['unknown', 'Something went wrong. Local data is unaffected.'],
    ['disabled', 'Cloud backup is not enabled on this device.'],
  ] satisfies Array<[CloudErrorCode, string]>)(
    'a failure that does not depend on the account (%s) is reported as a failure and never as sent',
    async (code, message) => {
      const made = renderSignedOut();

      made.account.requestPasswordReset.mockRejectedValueOnce(
        new CloudError(code, message),
      );
      await ask(made);

      const notice = await screen.findByText('Reset link not requested');
      const region = notice.closest('[role]') as HTMLElement;

      expect(region).toHaveAttribute('role', 'alert');
      expect(within(region).getByText(message)).toBeVisible();
      expect(made.card.textContent).not.toMatch(/on its way/);
      expect(made.within.getByLabelText('Email')).toHaveValue(learnerEmail);
      expect(
        made.within.getByRole('button', { name: 'Send reset link' }),
      ).toBeEnabled();
    },
  );

  it('an unexpected error is reported without its own text', async () => {
    const made = renderSignedOut();

    made.account.requestPasswordReset.mockRejectedValueOnce(
      new Error('SDK internals: bearer abc.def.ghi'),
    );
    await ask(made);

    expect(await screen.findByText('Reset link not requested')).toBeVisible();
    expect(
      screen.getByText('Something went wrong. Local data is unaffected.'),
    ).toBeVisible();
    expect(document.body.textContent).not.toMatch(/SDK internals|abc\.def/);
  });

  it.each([
    ['nothing', ''],
    ['no @', 'learner.example.com'],
    ['no dot after the @', 'learner@example'],
    ['a space inside', 'lea rner@example.com'],
    ['two @', 'a@b@example.com'],
    ['longer than 254 characters', `${'a'.repeat(250)}@example.com`],
  ])('%s is refused here, with no request', async (_label, address) => {
    const made = renderSignedOut();

    await openResetView(made);
    if (address !== '') {
      await userEvent.type(made.within.getByLabelText('Email'), address);
    }
    await userEvent.click(
      made.within.getByRole('button', { name: 'Send reset link' }),
    );

    const notice = await screen.findByText('Reset link not requested');

    expect(notice.closest('[role]')).toHaveAttribute('role', 'alert');
    expect(screen.getByText('Enter a valid email address.')).toBeVisible();
    expect(made.account.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('while the request runs the controls wait, and a second press cannot send twice', async () => {
    const made = renderSignedOut();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    made.account.requestPasswordReset.mockImplementationOnce(async () => {
      await gate;

      return undefined;
    });
    await openResetView(made, learnerEmail);

    const send = made.within.getByRole('button', { name: 'Send reset link' });

    await userEvent.click(send);
    await userEvent.click(send);
    expect(made.account.requestPasswordReset).toHaveBeenCalledTimes(1);
    expect(made.within.getByLabelText('Email')).toBeDisabled();
    expect(
      made.within.getByRole('button', { name: 'Back to sign in' }),
    ).toBeDisabled();
    release();
    expect(await screen.findByText(sentTitle)).toBeVisible();
    expect(made.account.requestPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('leaves the sign-in form unchanged: nothing about a reset persists after going back', async () => {
    const made = renderSignedOut();

    await ask(made, learnerEmail);
    await screen.findByText(sentTitle);
    await userEvent.click(
      made.within.getByRole('button', { name: 'Back to sign in' }),
    );

    expect(screen.queryByText(sentTitle)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(made.within.getByLabelText('Email')).toHaveValue(learnerEmail),
    );
  });
});
