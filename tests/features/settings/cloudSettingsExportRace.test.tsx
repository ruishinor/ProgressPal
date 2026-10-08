import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { getCloudAccount } from '@/lib/cloud';
import {
  defaultLearnerProfileValues,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { getDatabaseSnapshot as readSnapshotNow } from '@/lib/db/repositories';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';

import { defaultTestMigrationContext } from '../../db/testDatabase';
import {
  createSimulatedNhost,
  type SimulatedNhost,
} from '../../infra/simulatedNhostCore.mjs';

/**
 * Epic G repair 01, finding 4, through the whole application: the REAL local
 * export (Settings' own handler: read the device, start the download, record the
 * history entry) is held at its read of the device by a gate the test controls,
 * and the destructive restore of the real cloud card must stay unavailable until
 * that export has finished — or failed — in full. Only the provider is simulated.
 */

const gate = vi.hoisted(() => ({ hold: null as Promise<void> | null }));

// The real `getDatabaseSnapshot`, held while the test says so. Everything else
// in `@/lib/db` is the real module.
vi.mock('@/lib/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db')>();

  return {
    ...actual,
    getDatabaseSnapshot: async (
      ...args: Parameters<typeof actual.getDatabaseSnapshot>
    ) => {
      if (gate.hold !== null) {
        await gate.hold;
      }

      return actual.getDatabaseSnapshot(...args);
    },
  };
});

const email = 'learner@example.com';
const password = 'correct-horse-9';
const slow = { timeout: 20_000 };
const acknowledgement = "Replace this device's data with this backup";
const replace = 'Replace local data with this backup';

let sim: SimulatedNhost;
const downloads: string[] = [];

const network = vi.fn((input: string | URL | Request, init?: RequestInit) =>
  sim.fetch(input, init),
);

beforeAll(() => {
  vi.stubGlobal('fetch', network);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  sim = createSimulatedNhost();
  network.mockClear();
  gate.hold = null;
  downloads.length = 0;
  // jsdom starts no downloads and has no object URLs: record what Settings asks for.
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(() => 'blob:progresspal-test'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.download);
  });
});

afterEach(async () => {
  gate.hold = null;
  vi.restoreAllMocks();
  await getCloudAccount()
    .signOut()
    .catch(() => undefined);
  closeSharedDatabase();
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

async function onboardRealApp(displayName: string) {
  getSharedDatabase(defaultTestMigrationContext);
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName,
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
}

const displayName = async () =>
  (await readSnapshotNow({ db: getSharedDatabase() })).learnerProfile
    ?.displayName;

async function renameLearner(name: string) {
  const field = screen.getByLabelText('Display name');

  await userEvent.clear(field);
  await userEvent.type(field, name);
  await userEvent.click(
    screen.getByRole('button', { name: 'Save local settings' }),
  );
  await screen.findByText('Local profile saved', {}, slow);
  await waitFor(async () => expect(await displayName()).toBe(name), slow);
}

async function openSettings() {
  cleanup();
  closeSharedDatabase();
  await renderAppAtRoute('/settings');
  await screen.findByRole('heading', { name: 'Settings' }, slow);

  // The cloud card, found by its one control while cloud is off — not by a
  // title that another test pins.
  return screen
    .getByRole('button', { name: 'Turn on cloud backup' })
    .closest('.card') as HTMLElement;
}

/** Back up, change the device, list, download-and-check, acknowledge: ready. */
async function readyToReplace() {
  await onboardRealApp('Exported Ada');

  const card = await openSettings();

  await userEvent.click(
    within(card).getByRole('button', { name: 'Turn on cloud backup' }),
  );
  await userEvent.type(within(card).getByLabelText('Email'), email);
  await userEvent.type(within(card).getByLabelText(/^Password/), password);
  await userEvent.click(within(card).getByRole('button', { name: 'Sign in' }));
  await within(card).findByRole('button', { name: 'Back up now' }, slow);
  await userEvent.click(
    within(card).getByRole('button', { name: 'Back up now' }),
  );
  await within(card).findByText('Backed up', {}, slow);
  await renameLearner('Changed after backup');
  await userEvent.click(
    within(card).getByRole('button', { name: 'Refresh list' }),
  );
  await within(card).findByText('Restore a backup', {}, slow);

  const download = within(card).getByRole('button', {
    name: 'Download and check',
  });

  // While this tab is still discovering other tabs, restore is unavailable.
  await waitFor(() => expect(download).toBeEnabled(), slow);
  await userEvent.click(download);
  await within(card).findByText(/is ready to restore/, {}, slow);
  await userEvent.click(
    within(card).getByRole('checkbox', { name: acknowledgement }),
  );

  return card;
}

describe('the real export and the real restore, in Classic Settings', () => {
  it('the restore cannot run while the export is still reading the device, and runs when the learner confirms after it has finished', async () => {
    const card = await readyToReplace();
    const confirm = within(card).getByRole('button', { name: replace });
    const reading = deferred();

    expect(confirm).toBeEnabled();

    // The learner starts the export; its read of the device is held.
    gate.hold = reading.promise;
    await userEvent.click(
      within(card).getByRole('button', { name: 'Export local backup first' }),
    );
    await waitFor(() => expect(confirm).toBeDisabled());
    await userEvent.click(confirm);

    expect(await displayName()).toBe('Changed after backup');
    expect(downloads).toEqual([]);

    // The export reads the device, starts its download and records the entry.
    gate.hold = null;
    reading.resolve();
    expect(
      await screen.findByText('Backup download started', {}, slow),
    ).toBeVisible();
    await waitFor(() => expect(confirm).toBeEnabled(), slow);
    expect(downloads).toHaveLength(1);
    // Nothing was replaced by the end of the export: the learner decides.
    expect(await displayName()).toBe('Changed after backup');

    await userEvent.click(confirm);
    await screen.findByRole('heading', { name: 'Home' }, slow);
    await waitFor(
      async () => expect(await displayName()).toBe('Exported Ada'),
      slow,
    );
  }, 120_000);

  it('a failed export is reported by Settings, claims no copy, and then leaves the choice with the learner', async () => {
    const card = await readyToReplace();
    const confirm = within(card).getByRole('button', { name: replace });
    const reading = deferred();

    vi.mocked(URL.createObjectURL).mockImplementation(() => {
      throw new Error('blob store is full');
    });
    gate.hold = reading.promise;
    await userEvent.click(
      within(card).getByRole('button', { name: 'Export local backup first' }),
    );
    await waitFor(() => expect(confirm).toBeDisabled());

    gate.hold = null;
    reading.resolve();
    expect(await screen.findByText('Export failed', {}, slow)).toBeVisible();
    expect(
      screen.getByText('The local backup could not be created or downloaded.'),
    ).toBeVisible();
    expect(
      screen.queryByText('Backup download started'),
    ).not.toBeInTheDocument();
    expect(downloads).toEqual([]);
    expect(document.body.textContent).not.toMatch(/blob store/);
    await waitFor(() => expect(confirm).toBeEnabled(), slow);
    expect(await displayName()).toBe('Changed after backup');
  }, 120_000);
});
