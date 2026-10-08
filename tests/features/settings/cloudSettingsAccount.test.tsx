import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CloudError,
  cloudPasswordMaxLength,
  cloudPasswordMinLength,
  readCloudPreferences,
  type CloudAccountPort,
} from '@/lib/cloud';

import { FakeBackupStore } from '../../lib/cloudBackup/fakeBackupStore';
import { createFreshDevice, type Device } from '../../lib/cloudBackup/support';
import {
  enableCloud,
  learnerEmail,
  makeAccount,
  renderCard,
  stubState,
  type RenderCardOptions,
} from './cloudSettingsKit';

/**
 * The account half of the Settings cloud card: off by default and silent,
 * explicit sign-in and sign-out, a trusted-device choice that is the learner's,
 * keyboard operation, and no capability beyond what the accepted account model
 * already has (no account deletion, no password reset, no sync).
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
  device = await createFreshDevice('cloud-card-account');
  store = new FakeBackupStore();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await device.cleanup();
});

function dependencies(
  account: CloudAccountPort,
): RenderCardOptions['dependencies'] {
  return {
    account,
    store,
    readSnapshot: device.readSnapshot,
    migrationContext: device.migrationContext,
    restoreLocal: device.restoreLocal,
  };
}

const card = () =>
  screen
    .getByRole('heading', { name: 'Cloud backup (optional)' })
    .closest('.card') as HTMLElement;

async function signInThroughTheForm(address = ` ${learnerEmail} `) {
  await userEvent.type(screen.getByLabelText('Email'), address);
  await userEvent.type(screen.getByLabelText(/^Password/), 'correct-horse-9');
}

describe('cloud off (the default)', () => {
  it('is one factual sentence and one button, and does nothing else', () => {
    const { account } = makeAccount();

    renderCard({ dependencies: dependencies(account) });

    expect(
      screen.getByRole('heading', {
        level: 3,
        name: 'Cloud backup (optional)',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Off on this device. While it is off, nothing is sent to any cloud service.',
      ),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Turn on cloud backup' }),
    ).toBeEnabled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Password/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /sign in|back up now|create account/i,
      }),
    ).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(store.requests).toHaveLength(0);
    expect(account.signIn).not.toHaveBeenCalled();
    expect(readCloudPreferences().enabled).toBe(false);
  });

  it('turning it on only changes this device and reveals the sign-in form, focused', async () => {
    const { account } = makeAccount();

    renderCard({ dependencies: dependencies(account) });
    await userEvent.click(
      screen.getByRole('button', { name: 'Turn on cloud backup' }),
    );

    expect(readCloudPreferences().enabled).toBe(true);
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(store.requests).toHaveLength(0);
    expect(account.signIn).not.toHaveBeenCalled();
    expect(account.signUp).not.toHaveBeenCalled();
  });

  it('turning it off again returns to the silent state and puts focus on the control that returned', async () => {
    const { account } = makeAccount();

    renderCard({ dependencies: dependencies(account) });
    await userEvent.click(
      screen.getByRole('button', { name: 'Turn on cloud backup' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Turn off cloud backup' }),
    );

    expect(readCloudPreferences().enabled).toBe(false);
    expect(
      screen.getByRole('button', { name: 'Turn on cloud backup' }),
    ).toHaveFocus();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('says so, and changes nothing, when the browser will not save the setting', async () => {
    const { account } = makeAccount();

    renderCard({ dependencies: dependencies(account) });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Turn on cloud backup' }),
    );

    // A failure to save is announced assertively, like every failure here.
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This browser did not save the setting.',
    );
    expect(
      screen.getByRole('button', { name: 'Turn on cloud backup' }),
    ).toBeInTheDocument();
    expect(readCloudPreferences().enabled).toBe(false);
  });

  it('a cloud fault never takes the page down: it is reported inside the card', () => {
    const { account } = makeAccount();

    account.getState.mockImplementation(() => {
      throw new Error('storage is blocked');
    });
    renderCard({ dependencies: dependencies(account) });

    expect(within(card()).getByRole('alert')).toHaveTextContent(
      'Cloud backup is unavailable in this browser.',
    );
  });
});

describe('signed out', () => {
  beforeEach(() => enableCloud());

  it('offers sign-in, account creation and turning off, with a password hint', () => {
    renderCard({ dependencies: dependencies(makeAccount().account) });

    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute(
      'type',
      'password',
    );
    expect(
      screen.getByText(
        `${cloudPasswordMinLength} to ${cloudPasswordMaxLength} characters.`,
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Create account' }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Turn off cloud backup' }),
    ).toBeEnabled();
    expect(screen.getByText(/Backups are manual\./)).toBeVisible();
  });

  it('asks for both fields before it contacts anything', async () => {
    const { account } = makeAccount();

    renderCard({ dependencies: dependencies(account) });
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter an email address and a password.',
    );
    expect(account.signIn).not.toHaveBeenCalled();
  });

  it.each([
    ['too short', 'x'.repeat(cloudPasswordMinLength - 1)],
    ['too long', 'x'.repeat(cloudPasswordMaxLength + 1)],
  ])(
    'a password that is %s is refused for a new account without a request',
    async (_label, password) => {
      const { account } = makeAccount();

      renderCard({ dependencies: dependencies(account) });
      await userEvent.type(screen.getByLabelText('Email'), learnerEmail);
      await userEvent.type(screen.getByLabelText(/^Password/), password);
      await userEvent.click(
        screen.getByRole('button', { name: 'Create account' }),
      );

      expect(screen.getByRole('alert')).toHaveTextContent(
        `Passwords are ${cloudPasswordMinLength} to ${cloudPasswordMaxLength} characters.`,
      );
      expect(account.signUp).not.toHaveBeenCalled();
    },
  );

  it('signs in on Enter, with the trimmed address, and lands on the first control of the signed-in state', async () => {
    const { account } = makeAccount();

    renderCard({ dependencies: dependencies(account) });
    await signInThroughTheForm();
    await userEvent.keyboard('{Enter}');

    expect(account.signIn).toHaveBeenCalledTimes(1);
    expect(account.signIn).toHaveBeenCalledWith({
      email: learnerEmail,
      password: 'correct-horse-9',
    });
    expect(
      await screen.findByText(learnerEmail, { selector: 'strong' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Back up now' })).toHaveFocus();
    // Signing in contacts the account boundary only; nothing is backed up.
    expect(store.requests).toHaveLength(0);
  });

  it("a refused sign-in says why in the account's own words, clears the password and keeps the address", async () => {
    const { account } = makeAccount({
      signInFails: new CloudError(
        'invalid-credentials',
        'The email or password was not accepted.',
      ),
    });

    renderCard({ dependencies: dependencies(account) });
    await signInThroughTheForm(learnerEmail);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The email or password was not accepted.',
    );
    expect(screen.getByLabelText('Email')).toHaveValue(learnerEmail);
    expect(screen.getByLabelText(/^Password/)).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Back up now' })).toBeNull();
  });

  it('an unexpected error is reported without its own text', async () => {
    const { account } = makeAccount({
      signInFails: new Error('SDK internals: refresh abc.def.ghi'),
    });

    renderCard({ dependencies: dependencies(account) });
    await signInThroughTheForm(learnerEmail);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Local data is unaffected.',
    );
    expect(document.body.textContent).not.toMatch(/SDK internals|abc\.def/);
  });

  it('creating an account tells the learner to verify by email, then sign in; it does not sign in', async () => {
    const { account } = makeAccount();

    renderCard({ dependencies: dependencies(account) });
    await signInThroughTheForm(learnerEmail);
    await userEvent.click(
      screen.getByRole('button', { name: 'Create account' }),
    );

    expect(
      await screen.findByText(
        'Open the link in the message to verify the address, then sign in here.',
      ),
    ).toBeVisible();
    expect(account.signUp).toHaveBeenCalledWith({
      email: learnerEmail,
      password: 'correct-horse-9',
    });
    expect(account.signIn).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Password/)).toHaveValue('');
  });

  it('account creation that the provider refuses says so without revealing whether the address exists', async () => {
    const { account } = makeAccount({
      signUp: new CloudError(
        'email-in-use',
        'This email address cannot be used to create an account.',
      ),
    });

    renderCard({ dependencies: dependencies(account) });
    await signInThroughTheForm(learnerEmail);
    await userEvent.click(
      screen.getByRole('button', { name: 'Create account' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This email address cannot be used to create an account.',
    );
  });

  describe('stay signed in on this device (trusted device)', () => {
    it('is off by default, and choosing it is applied before signing in', async () => {
      const { account } = makeAccount();

      renderCard({ dependencies: dependencies(account) });

      const stay = screen.getByRole('checkbox', {
        name: /Stay signed in on this device/,
      });

      expect(stay).not.toBeChecked();
      expect(
        screen.getByText(
          'Keeps the sign-in after this tab closes. Off by default.',
        ),
      ).toBeVisible();

      await userEvent.click(stay);
      await signInThroughTheForm(learnerEmail);
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(account.setTrustedDevice).toHaveBeenCalledWith(true);
      expect(account.setTrustedDevice.mock.invocationCallOrder[0]).toBeLessThan(
        account.signIn.mock.invocationCallOrder[0] ?? Infinity,
      );
      expect(readCloudPreferences().trustedDevice).toBe(true);
      expect(
        await screen.findByText(/This device stays signed in\./),
      ).toBeVisible();
    });

    it('an unchanged choice is not written again', async () => {
      enableCloud(true);
      const { account } = makeAccount();

      renderCard({ dependencies: dependencies(account) });

      expect(
        screen.getByRole('checkbox', { name: /Stay signed in on this device/ }),
      ).toBeChecked();

      await signInThroughTheForm(learnerEmail);
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(account.setTrustedDevice).not.toHaveBeenCalled();
    });

    it('the signed-in state does not claim it unless the device really was set to stay signed in', async () => {
      const { account } = makeAccount();

      renderCard({ dependencies: dependencies(account) });
      await signInThroughTheForm(learnerEmail);
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
      await screen.findByRole('button', { name: 'Back up now' });

      expect(card()).not.toHaveTextContent('This device stays signed in');
    });
  });

  it('keyboard: one coherent tab order through the form', async () => {
    renderCard({ dependencies: dependencies(makeAccount().account) });

    const inOrder = [
      () => screen.getByLabelText('Email'),
      () => screen.getByLabelText(/^Password/),
      () =>
        screen.getByRole('checkbox', { name: /Stay signed in on this device/ }),
      () => screen.getByRole('button', { name: 'Sign in' }),
      () => screen.getByRole('button', { name: 'Create account' }),
      () => screen.getByRole('button', { name: 'Turn off cloud backup' }),
    ];

    for (const control of inOrder) {
      await userEvent.tab();
      expect(control()).toHaveFocus();
    }
  });

  it('keyboard: the checkbox toggles with Space and Shift+Tab walks the same order back', async () => {
    renderCard({ dependencies: dependencies(makeAccount().account) });

    const stay = screen.getByRole('checkbox', {
      name: /Stay signed in on this device/,
    });

    stay.focus();
    await userEvent.keyboard(' ');
    expect(stay).toBeChecked();
    await userEvent.tab({ shift: true });
    expect(screen.getByLabelText(/^Password/)).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });
});

describe('signed in', () => {
  function signedIn(options: Parameters<typeof makeAccount>[0] = {}) {
    enableCloud();
    const made = makeAccount(options);

    made.signInDirectly();

    return made;
  }

  it('opening Settings and navigating make no cloud request of any kind', () => {
    const { account } = signedIn();

    const first = renderCard({ dependencies: dependencies(account) });

    expect(
      screen.getByText(learnerEmail, { selector: 'strong' }),
    ).toBeVisible();
    first.unmount();
    renderCard({ dependencies: dependencies(account) });

    expect(store.requests).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(account.signIn).not.toHaveBeenCalled();
    expect(account.signOut).not.toHaveBeenCalled();
  });

  it('says plainly what Back up now sends, that a full set replaces the one stored earliest, and that nothing is automatic', () => {
    renderCard({ dependencies: dependencies(signedIn().account) });

    expect(
      screen.getByText(
        'Back up now sends a full copy of your ProgressPal data to the cloud service. The cloud keeps up to 5 backups; when all 5 are in use, the one stored earliest is replaced. Nothing is sent automatically.',
      ),
    ).toBeVisible();
  });

  it.each([
    ['confirmed', ['Signed out']],
    [
      'unconfirmed',
      [
        'Signed out on this device',
        'The cloud service did not confirm that it ended the session.',
      ],
    ],
  ] as const)(
    'sign-out (%s) removes the session, says exactly what is known, and returns focus to the sign-in form',
    async (serverInvalidation, texts) => {
      const { account } = signedIn({
        signOut: { localSessionRemoved: true, serverInvalidation },
      });

      renderCard({ dependencies: dependencies(account) });
      await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

      expect(account.signOut).toHaveBeenCalledTimes(1);
      for (const text of texts) {
        expect(await screen.findByText(text)).toBeVisible();
      }
      expect(screen.getByLabelText('Email')).toHaveFocus();
      expect(screen.queryByRole('button', { name: 'Back up now' })).toBeNull();
      expect(store.requests).toHaveLength(0);
    },
  );

  it('keyboard: Back up now, Show backups and Sign out are reachable in that order and operable without a pointer', async () => {
    const { account } = signedIn();

    renderCard({ dependencies: dependencies(account) });

    expect(screen.getByRole('button', { name: 'Back up now' })).toBeEnabled();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Back up now' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Show backups' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Sign out' })).toHaveFocus();

    // Space activates a focused button just as Enter does.
    await userEvent.keyboard(' ');
    expect(account.signOut).toHaveBeenCalledTimes(1);
  });
});

describe('what is deliberately not offered', () => {
  const forbidden =
    /delete|remove (my )?account|close account|erase|password reset|forgot|reset password|change password|sync|automatic(ally)? back/i;

  it.each(['off', 'signed out', 'signed in'])(
    'while %s there is no account deletion, password reset or change, sync or automatic-backup control or claim',
    (state) => {
      if (state !== 'off') {
        enableCloud();
      }
      const made = makeAccount();

      if (state === 'signed in') {
        made.signInDirectly();
      }

      renderCard({ dependencies: dependencies(made.account) });

      const names = screen
        .getAllByRole('button')
        .map((button) => button.textContent ?? '');

      expect(names.filter((name) => forbidden.test(name))).toEqual([]);
      expect(
        // "Nothing is sent automatically" is the one allowed mention.
        (card().textContent ?? '').replace(
          'Nothing is sent automatically.',
          '',
        ),
      ).not.toMatch(forbidden);
    },
  );

  it('renders no navigation, HUD, dashboard or onboarding entry for the cloud', () => {
    renderCard({ dependencies: dependencies(makeAccount().account) });

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('both Settings shells share one capability', () => {
  it.each(['h2', 'h3'] as const)(
    'the card heading follows the shell (%s) and nothing else differs',
    (titleAs) => {
      renderCard({
        dependencies: dependencies(makeAccount().account),
        titleAs,
      });

      expect(
        screen.getByRole('heading', {
          level: Number(titleAs.slice(1)),
          name: 'Cloud backup (optional)',
        }),
      ).toBeInTheDocument();
    },
  );

  it('reads the application state only for coordination and the local-mutation runner', () => {
    const state = stubState();

    renderCard({ dependencies: dependencies(makeAccount().account), state });

    expect(state.runLocalMutation).not.toHaveBeenCalled();
    expect(state.refresh).not.toHaveBeenCalled();
  });
});
