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

const card = () => screen.getByRole('heading').closest('.card') as HTMLElement;

describe('heading accessibility in every state and both shells', () => {
  it.each(states)('%s: exposes a named card heading', (state) => {
    show(state);

    expect(
      screen.getByRole('heading', { level: 3, name: /\S/ }),
    ).toBeInTheDocument();
  });

  it.each(['h2', 'h3'] as const)(
    'the heading follows the shell (%s)',
    (titleAs) => {
      show('signed out', titleAs);

      expect(
        screen.getByRole('heading', {
          level: Number(titleAs.slice(1)),
          name: /\S/,
        }),
      ).toBeInTheDocument();
    },
  );
});

const paragraphs = () =>
  Array.from(card().querySelectorAll('.card__body > p.card__description'));

describe('the disclosure is on screen in every state', () => {
  it.each(states)(
    '%s: all disclosure paragraphs are visible and in reading order',
    (state) => {
      show(state);

      const disclosure = paragraphs();
      expect(disclosure.length).toBeGreaterThan(0);
      for (const paragraph of disclosure) {
        expect(paragraph).toBeVisible();
      }
      for (let index = 1; index < disclosure.length; index += 1) {
        expect(
          disclosure[index - 1]!.compareDocumentPosition(disclosure[index]!) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
    },
  );

  it.each(states)(
    '%s: it comes before the first control, so it is read before anything is turned on',
    (state) => {
      show(state);

      const disclosure = paragraphs();
      expect(disclosure.length).toBeGreaterThan(0);
      // The unavailable state has no control at all; every other state does.
      const control = card().querySelector(
        'button, input, select, textarea, a[href]',
      );

      expect(control !== null).toBe(state !== 'unavailable');
      if (control !== null) {
        for (const paragraph of disclosure) {
          expect(
            paragraph.compareDocumentPosition(control) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          ).toBeTruthy();
        }
      }
    },
  );
});

describe('disclosure structure', () => {
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
