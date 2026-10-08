import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FakeBackupStore } from '../../lib/cloudBackup/fakeBackupStore';
import { createFreshDevice, type Device } from '../../lib/cloudBackup/support';
import {
  enableCloud,
  makeAccount,
  renderCard,
  type RenderCardOptions,
} from './cloudSettingsKit';

/**
 * Epic G repair 01, finding 1: the Settings card is labelled for what it is
 * (an experimental remote backup) and says, in plain words and in every state
 * it can be shown in, how it works and who can read what it uploads. No other
 * surface is added and no claim of protection, freshness or encryption is made.
 */

const title = 'Remote backup — Alpha';

const manual =
  'Remote backup is experimental. It is a manual backup, not automatic synchronization: nothing is uploaded when you open Settings or sign in, only when you press Back up now.';
const stays =
  "Your working data stays on this device, in this browser's storage. A backup is a full copy that you choose to send.";
const readable =
  'The cloud provider and the service operator can read the backups you upload. Exporting a backup file to your device remains a separate way to keep and restore a copy.';

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
  device = await createFreshDevice('cloud-card-disclosure');
  store = new FakeBackupStore();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  await device.cleanup();
});

type StateName = 'off' | 'unavailable' | 'signed out' | 'signed in';

const states: StateName[] = ['off', 'unavailable', 'signed out', 'signed in'];

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

function show(state: StateName, titleAs: 'h2' | 'h3' = 'h3') {
  const made = makeAccount();

  if (state !== 'off') {
    enableCloud();
  }
  if (state === 'signed in') {
    made.signInDirectly();
  }
  if (state === 'unavailable') {
    made.account.getState.mockImplementation(() => {
      throw new Error('storage is blocked');
    });
  }

  renderCard({ dependencies: dependencies(made.account), titleAs });

  return made;
}

const card = () =>
  screen.getByRole('heading', { name: title }).closest('.card') as HTMLElement;

describe('the heading names the capability, in every state and both shells', () => {
  it.each(states)('%s: Remote backup — Alpha', (state) => {
    show(state);

    expect(
      screen.getByRole('heading', { level: 3, name: title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Cloud backup (optional)' }),
    ).not.toBeInTheDocument();
  });

  it.each(['h2', 'h3'] as const)(
    'the heading follows the shell (%s) and says the same thing',
    (titleAs) => {
      show('signed out', titleAs);

      expect(
        screen.getByRole('heading', {
          level: Number(titleAs.slice(1)),
          name: title,
        }),
      ).toBeInTheDocument();
    },
  );
});

describe('the disclosure is on screen in every state', () => {
  it.each(states)('%s: all three paragraphs, in reading order', (state) => {
    show(state);

    const paragraphs = [manual, stays, readable].map((text) =>
      within(card()).getByText(text),
    );

    for (const paragraph of paragraphs) {
      expect(paragraph).toBeVisible();
    }
    for (let index = 1; index < paragraphs.length; index += 1) {
      expect(
        paragraphs[index - 1]!.compareDocumentPosition(paragraphs[index]!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it.each(states)(
    '%s: it comes before the first control, so it is read before anything is turned on',
    (state) => {
      show(state);

      const intro = within(card()).getByText(manual);
      // The unavailable state has no control at all; every other state does.
      const control = card().querySelector(
        'button, input, select, textarea, a[href]',
      );

      expect(control !== null).toBe(state !== 'unavailable');
      if (control !== null) {
        expect(
          intro.compareDocumentPosition(control) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
    },
  );
});

describe('what the disclosure tells the learner', () => {
  const facts: Array<[string, RegExp]> = [
    ['it is experimental', /Remote backup is experimental\./],
    [
      'it is manual, not automatic synchronization',
      /a manual backup, not automatic synchronization/,
    ],
    [
      'opening Settings or signing in uploads nothing',
      /nothing is uploaded when you open Settings or sign in/,
    ],
    [
      'the working data stays on this device, in browser storage',
      /working data stays on this device, in this browser's storage/,
    ],
    [
      'the cloud provider and the service operator can read uploaded backups',
      /cloud provider and the service operator can read the backups you upload/,
    ],
    [
      'exporting a file is a separate way to keep a copy',
      /Exporting a backup file to your device remains a separate way/,
    ],
  ];

  it.each(facts)('%s', (_label, pattern) => {
    show('off');

    expect(card().textContent).toMatch(pattern);
  });

  it.each(states)(
    '%s: makes no claim of encryption, privacy, protection or safety, and no legal assertion',
    (state) => {
      show(state);

      expect(card().textContent).not.toMatch(
        /end-to-end|encrypt|private|privacy|secure|secret|\bsafe(ly)?\b|protect|confidential|only you|no one else|nobody else|cannot (be )?read|can't (be )?read|GDPR|legal|guarantee|compliant|retention|retained/i,
      );
    },
  );

  it.each(states)(
    '%s: adds no other surface (one heading, no link, no dialog, no disclosure widget)',
    (state) => {
      show(state);

      expect(within(card()).getAllByRole('heading')).toHaveLength(1);
      expect(within(card()).queryByRole('link')).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(card().querySelector('details')).toBeNull();
    },
  );
});

describe('showing it costs nothing', () => {
  it.each(states)('%s: no request of any kind is made', (state) => {
    const made = show(state);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(store.requests).toHaveLength(0);
    expect(made.account.signIn).not.toHaveBeenCalled();
    expect(made.account.signUp).not.toHaveBeenCalled();
    expect(made.account.requestPasswordReset).not.toHaveBeenCalled();
  });
});
