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

import { getCloudAccount, readCloudPreferences } from '@/lib/cloud';
import {
  defaultLearnerProfileValues,
  getDatabaseSnapshot,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';

import { defaultTestMigrationContext } from '../../db/testDatabase';
import {
  createSimulatedNhost,
  type SimulatedNhost,
} from '../../infra/simulatedNhostCore.mjs';
import { enableCloud } from './cloudSettingsKit';

/**
 * The cloud card inside the real application: the real router, app state,
 * database, account adapter, SDK and backup service, in both Settings shells.
 * Only the provider is simulated. This proves the wiring that the card-level
 * tests inject around: the shared singletons, the live database, the app's
 * local-mutation runner and the post-restore navigation.
 */

const email = 'learner@example.com';
const password = 'correct-horse-9';
const slow = { timeout: 20_000 };

let sim: SimulatedNhost;

// The shared account (and the SDK client inside it) is created once per file
// and keeps the `fetch` it saw then. So `fetch` is stubbed once, with a stable
// function that hands each call to the simulator of the current test.
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
});

afterEach(async () => {
  // The shared account outlives a test; end its session and leave the device.
  await getCloudAccount()
    .signOut()
    .catch(() => undefined);
  closeSharedDatabase();
});

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

/**
 * A legitimate local change: through the Settings profile form, i.e. through
 * the app's own mutation path. (Writing to IndexedDB underneath the mounted
 * app is what another tab does, and the app rightly treats that as stale.)
 */
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

const displayName = async () =>
  (await getDatabaseSnapshot({ db: getSharedDatabase() })).learnerProfile
    ?.displayName;

async function openSettings(route: '/settings' | '/rpg/settings') {
  // Each opening is a fresh mount: leave any earlier tree, as a reload would.
  cleanup();
  closeSharedDatabase();
  await renderAppAtRoute(route);
  await screen.findByRole('heading', { name: 'Settings' }, slow);

  return screen
    .getByRole('heading', { name: 'Remote backup — Alpha' })
    .closest('.card') as HTMLElement;
}

/**
 * While this tab is still discovering other tabs the card says restore is
 * unavailable, and the button is disabled. A person waits for it to enable.
 */
async function downloadAndCheck(card: HTMLElement) {
  const button = within(card).getByRole('button', {
    name: 'Download and check',
  });

  await waitFor(() => expect(button).toBeEnabled(), slow);
  await userEvent.click(button);
}

async function signInThroughTheForm(card: HTMLElement) {
  await userEvent.type(within(card).getByLabelText('Email'), email);
  await userEvent.type(within(card).getByLabelText(/^Password/), password);
  await userEvent.click(within(card).getByRole('button', { name: 'Sign in' }));
  await within(card).findByRole('button', { name: 'Back up now' }, slow);
}

describe.each([
  ['Classic', '/settings', 3],
  ['RPG', '/rpg/settings', 2],
] as const)('%s Settings', (_shell, route, headingLevel) => {
  it("shows the cloud card between the file import and the reset, with the shell's heading level", async () => {
    await onboardRealApp('Ada');

    const card = await openSettings(route);
    const headings = screen
      .getAllByRole('heading')
      .map((heading) => heading.textContent);

    expect(
      within(card).getByRole('heading', {
        level: headingLevel,
        name: 'Remote backup — Alpha',
      }),
    ).toBeInTheDocument();
    expect(headings.indexOf('Remote backup — Alpha')).toBeGreaterThan(
      headings.indexOf('Import a backup'),
    );
    expect(headings.indexOf('Remote backup — Alpha')).toBeLessThan(
      headings.indexOf('Reset local data'),
    );
    expect(
      within(card).getByRole('button', { name: 'Turn on cloud backup' }),
    ).toBeEnabled();
  }, 45_000);

  it('cloud off (the default): Settings, its controls and navigating around send nothing anywhere', async () => {
    await onboardRealApp('Ada');

    const card = await openSettings(route);

    expect(card).toBeInTheDocument();
    // Navigate to the other interface and come back, as a learner would.
    await userEvent.click(
      screen.getAllByRole('link', {
        name: /Open (Classic|RPG) interface/,
      })[0]!,
    );
    await screen.findByRole('heading', { level: 1 }, slow);

    const again = await openSettings(route);

    expect(again).toBeInTheDocument();
    expect(network).not.toHaveBeenCalled();
    expect(localStorage.getItem('progresspal:cloud:preferences')).toBeNull();
  }, 60_000);

  it('turned on and signed in: opening Settings again sends nothing until a button is pressed', async () => {
    await onboardRealApp('Ada');

    let card = await openSettings(route);

    await userEvent.click(
      within(card).getByRole('button', { name: 'Turn on cloud backup' }),
    );
    await signInThroughTheForm(card);
    expect(network).toHaveBeenCalledTimes(1); // the sign-in, nothing else
    network.mockClear();
    sim.requests.length = 0;

    card = await openSettings(route);

    expect(
      within(card).getByRole('button', { name: 'Back up now' }),
    ).toBeVisible();
    expect(network).not.toHaveBeenCalled();
    expect(sim.requests).toHaveLength(0);
    expect(readCloudPreferences().enabled).toBe(true);
  }, 60_000);

  it("backs up, lists, and restores through the whole app, and lands on the dashboard with the backup's data", async () => {
    await onboardRealApp('Exported Ada');

    const card = await openSettings(route);

    await userEvent.click(
      within(card).getByRole('button', { name: 'Turn on cloud backup' }),
    );
    await signInThroughTheForm(card);
    await userEvent.click(
      within(card).getByRole('button', { name: 'Back up now' }),
    );
    expect(await within(card).findByText('Backed up', {}, slow)).toBeVisible();
    expect(sim.rowsOf(email)).toHaveLength(1);
    expect(sim.rowsOf(email)[0]?.payload).toContain('Exported Ada');

    // The learner's data changes after the backup; restoring brings it back.
    await renameLearner('Changed after backup');
    expect(await displayName()).toBe('Changed after backup');

    await userEvent.click(
      within(card).getByRole('button', { name: 'Refresh list' }),
    );
    await within(card).findByText('Restore a backup', {}, slow);
    await downloadAndCheck(card);
    await within(card).findByText(/is ready to restore/, {}, slow);
    await userEvent.click(
      within(card).getByRole('checkbox', {
        name: "Replace this device's data with this backup",
      }),
    );
    await userEvent.click(
      within(card).getByRole('button', {
        name: 'Replace local data with this backup',
      }),
    );

    await screen.findByRole('heading', { name: 'Home' }, slow);
    await waitFor(
      async () => expect(await displayName()).toBe('Exported Ada'),
      slow,
    );
  }, 90_000);

  it('a backup damaged at rest is refused by its checksum and this device keeps its data', async () => {
    await onboardRealApp('Exported Ada');

    const card = await openSettings(route);

    await userEvent.click(
      within(card).getByRole('button', { name: 'Turn on cloud backup' }),
    );
    await signInThroughTheForm(card);
    await userEvent.click(
      within(card).getByRole('button', { name: 'Back up now' }),
    );
    await within(card).findByText('Backed up', {}, slow);
    await renameLearner('Kept on this device');
    sim.corrupt(email, 0, '{"damaged":true}');

    await userEvent.click(
      within(card).getByRole('button', { name: 'Refresh list' }),
    );
    await within(card).findByText('Restore a backup', {}, slow);
    await downloadAndCheck(card);

    expect(
      await within(card).findByText(
        'The downloaded backup did not match the checksum the server computed. It was not used.',
        {},
        slow,
      ),
    ).toBeVisible();
    expect(
      within(card).queryByRole('button', {
        name: 'Replace local data with this backup',
      }),
    ).not.toBeInTheDocument();
    expect(await displayName()).toBe('Kept on this device');
  }, 90_000);

  it('signing out ends the session; nothing further is sent', async () => {
    await onboardRealApp('Ada');

    const card = await openSettings(route);

    await userEvent.click(
      within(card).getByRole('button', { name: 'Turn on cloud backup' }),
    );
    await signInThroughTheForm(card);
    network.mockClear();
    await userEvent.click(
      within(card).getByRole('button', { name: 'Sign out' }),
    );

    expect(
      await within(card).findByText(/^Signed out/, {}, slow),
    ).toBeVisible();
    expect(within(card).getByLabelText('Email')).toHaveFocus();
    expect(sessionStorage.length).toBe(0);
    // Only the sign-out request may have been made.
    expect(
      network.mock.calls.every(([url]) => String(url).endsWith('/signout')),
    ).toBe(true);
  }, 60_000);
});

describe('Settings is local-first before it is anything else', () => {
  it('a cloud preference left on, with no session, still sends nothing on opening Settings', async () => {
    await onboardRealApp('Ada');
    enableCloud();

    const card = await openSettings('/rpg/settings');

    expect(within(card).getByLabelText('Email')).toBeVisible();
    expect(network).not.toHaveBeenCalled();
  }, 45_000);
});
