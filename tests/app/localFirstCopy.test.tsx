import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import { writeCloudPreferences } from '@/lib/cloud';
import * as database from '@/lib/db';
import {
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

/**
 * Epic G repair 01, finding 2: the learner-visible surfaces that used to say the
 * app is local-only ("Offline only", "no account", "stored only", "never shared",
 * "nothing ... stored remotely") are true both for a learner who never touches
 * the optional remote backup and for one who has turned it on. The statements
 * are state-neutral: working data on this device, no account needed, nothing
 * synchronized, backups manual. Each surface is read where the learner sees it,
 * with the cloud preference off and on.
 */

const p2 = programvareutviklingDefinition;

const mode = 'Local-first';

const onboardingDescription =
  'Choose a programme and set up a local learner profile. Your data is stored on this device.';
const onboardingBadge = 'Stored on this device';
const onboardingCard =
  'Your data is stored in this browser. No account is needed, nothing is synced, and there is no analytics. You can export, import, or reset it later.';
const onboardingSummary =
  'Create the local learner profile before opening the rest of the app. Nothing is uploaded automatically.';
const cs50Summary =
  'Local-first CS50 tracking is active. Course progress, study sessions, XP, achievements, insights, and offline support all run on this device. Backups are manual.';
const cs50Dashboard =
  'Your CS50 progress on this device. Nothing is synced; backups are manual.';
const nbSummary =
  'Programvareutvikling kjører lokalt. Økter, svar, framdrift, XP, prestasjoner og innsikt lagres på denne enheten. Du lager sikkerhetskopier selv.';
const nbDashboard =
  'Framdriften din i Programvareutvikling på denne enheten. Ingenting synkroniseres; du lager sikkerhetskopier selv.';
const nbRecorded = 'Svaret er lagret på denne enheten. Det gir ingen poeng.';
const profilePrivacy =
  'ProgressPal stores your progress in this browser. It does not sync to a server, send analytics, or back up data automatically. The optional remote backup in Settings sends a copy only when you press Back up now, and needs an account. Exported backup files are your responsibility.';
const profileLocal =
  'Your learning identity, theme, motion, and study schedule are stored on this device. They leave it only in a backup that you make.';
const profileFormCard =
  'Everything here is stored on this device. You can revise it later in settings.';
const profileFormAvatar =
  'Choose one of the bundled ProgressPal characters. Profile preferences are stored on this device.';
const rpgLede =
  'Edit your local profile and manage on-device data: export a backup, import one, or reset everything. Your working data is stored in this browser on this device.';
const rpgBoundary =
  'ProgressPal keeps your working data in this browser on this device. No account is needed, nothing is synced, and there is no analytics. The optional remote backup (Alpha) is manual: no learner data is uploaded unless you press Back up now. Browser storage can be cleared by you, your browser, or your device, so export a backup before clearing data or switching devices.';

/** Wording that stopped being true once an optional remote backup exists. */
const retiredClaims: ReadonlyArray<[string, RegExp]> = [
  ['"Offline only"', /Offline only/i],
  ['"Everything stays …"', /Everything (here )?stays/i],
  ['"Stored only …"', /Stored only/i],
  ['"only in/on this browser/device"', /only (in|on) this (browser|device)/i],
  ['"stay local to this device"', /stays? local to this device/i],
  ['"never shared"', /never shared/i],
  ['"Nothing is synced or sent anywhere"', /Nothing is synced or sent/i],
  ['"Nothing is synced or stored remotely"', /synced or stored remotely/i],
  ['"No account, no cloud sync"', /no account, no cloud sync/i],
  ['"There is no account"', /there is no account/i],
  ['"does not create an account"', /does not create an account/i],
  [
    '"backup, restore, reset … all run on this device"',
    /backup, restore, reset/i,
  ],
  [
    'Bokmål "lagres/lagret bare på denne enheten"',
    /lagre[ts]+ bare på denne enheten/i,
  ],
  ['Bokmål "lagres eksternt"', /lagres eksternt/i],
];

/** "No account is needed" is true in both states; "no account" alone is not. */
const noAccountClaim = /no account(?! is needed)/i;

const text = () => (document.body.textContent ?? '').replace(/\s+/g, ' ');

function expectNoRetiredClaim(where: string) {
  const everything = text();

  for (const [label, pattern] of retiredClaims) {
    expect(everything, `${where}: ${label}`).not.toMatch(pattern);
  }
  expect(everything, `${where}: "no account"`).not.toMatch(noAccountClaim);
}

async function expectRendered(value: string) {
  await waitFor(() => expect(text()).toContain(value), { timeout: 15_000 });
}

/** The value shown next to the shell's "Mode" label. */
function modeValue(): string | null {
  const label = screen.getByText('Mode', { selector: 'dt' });

  return (
    label.closest('.shell-status__item')?.querySelector('dd')?.textContent ??
    null
  );
}

async function onboard() {
  closeSharedDatabase();
  getSharedDatabase(resolveDatabaseMigrationContext());
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName: 'Copy Learner',
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
}

async function onboardInBokmal() {
  await onboard();
  await enrolAndSwitchActiveProgramme(p2.programmeId, { seed: p2.catalogue });
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  fetchSpy = vi.fn(async () => {
    throw new Error('no network in this file');
  });
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe.each([
  ['the remote backup was never touched (cloud off)', false],
  ['the remote backup is turned on (signed out)', true],
] as const)('when %s', (_label, cloudOn) => {
  beforeEach(() => {
    if (cloudOn) {
      writeCloudPreferences({ enabled: true, trustedDevice: false });
    }
  });

  afterEach(() => {
    // Opening a page, in either state, sends nothing.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('first run: the header, the badge and the card say what is true, and so does the shell', async () => {
    closeSharedDatabase();
    getSharedDatabase(resolveDatabaseMigrationContext());
    await initializeDatabase({ seed: bundledCourseSeed });
    await renderAppAtRoute('/');
    await screen.findByRole(
      'heading',
      { name: 'Start with ProgressPal' },
      { timeout: 15_000 },
    );

    expect(screen.getByText(onboardingDescription)).toBeInTheDocument();
    expect(screen.getByText(onboardingBadge)).toBeInTheDocument();
    expect(screen.getByText(onboardingCard)).toBeInTheDocument();
    // The onboarding-dependent shell branch.
    expect(screen.getByText(onboardingSummary)).toBeInTheDocument();
    expect(modeValue()).toBe(mode);
    expectNoRetiredClaim('first run');
    // Onboarding offers no remote-backup restore entry (deferred, G-later).
    expect(screen.queryByText(/remote backup/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cloud/i)).not.toBeInTheDocument();
  }, 30_000);

  it('loading branch: the shell is already honest while local data is read', async () => {
    await onboard();
    await renderAppAtRoute('/dashboard');

    // The first render is the real AppShell loading state.
    expect(modeValue()).toBe(mode);
    expect(
      screen.getByText(
        'Preparing local profile data and the bundled CS50 catalog.',
      ),
    ).toBeInTheDocument();
    expectNoRetiredClaim('loading');
  }, 30_000);

  it('error branch: a failed local read still shows an honest mode', async () => {
    await onboard();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(database, 'getProfile').mockRejectedValue(
      new Error('Synthetic read failure'),
    );
    await renderAppAtRoute('/settings');
    await screen.findByRole(
      'heading',
      { name: 'Local startup failed' },
      { timeout: 15_000 },
    );

    expect(modeValue()).toBe(mode);
    expect(
      screen.getByText(
        'ProgressPal could not finish checking or repairing its local storage.',
      ),
    ).toBeInTheDocument();
    expectNoRetiredClaim('error');
  }, 30_000);

  it('Classic dashboard (normal branch): the CS50 summary and description say working data is here and backups are manual', async () => {
    await onboard();
    await renderAppAtRoute('/dashboard');
    await expectRendered(cs50Summary);
    await expectRendered(cs50Dashboard);

    expect(modeValue()).toBe(mode);
    expectNoRetiredClaim('dashboard');
  }, 30_000);

  it('Profile page: the privacy boundary names the one optional exception, and nothing is "never shared"', async () => {
    await onboard();
    await renderAppAtRoute('/profile');
    await expectRendered(profilePrivacy);
    await expectRendered(profileLocal);

    expectNoRetiredClaim('profile');
  }, 30_000);

  it('Classic Settings: the header is unchanged and true, the profile form no longer says "stays"', async () => {
    await onboard();
    await renderAppAtRoute('/settings');
    await expectRendered(profileFormCard);
    await expectRendered(profileFormAvatar);

    expect(
      screen.getByText(
        'Edit your local profile and manage your on-device data: export a backup, restore one, or reset everything.',
      ),
    ).toBeInTheDocument();
    expectNoRetiredClaim('classic settings');
  }, 30_000);

  it('RPG Settings: the lede and the boundary card are invariant across the two states', async () => {
    await onboard();
    await renderAppAtRoute('/rpg/settings');
    await expectRendered(rpgBoundary);

    expect(screen.getByText(rpgLede)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Local-first and course boundary' }),
    ).toBeInTheDocument();
    expect(text()).toMatch(/not CS50, Harvard, edX, or OpenCourseWare status/i);
    expectNoRetiredClaim('rpg settings');
  }, 30_000);

  it('Bokmål programme: the shell and dashboard copy are true and stay in Bokmål', async () => {
    await onboardInBokmal();
    await renderAppAtRoute('/dashboard');
    await expectRendered(nbSummary);
    await expectRendered(nbDashboard);

    expect(modeValue()).toBe(mode);
    expectNoRetiredClaim('bokmål dashboard');
  }, 45_000);
});

describe('programme-owned copy, read from the definitions', () => {
  it('Bokmål: the saved-answer line no longer claims "only on this device"', () => {
    const copy = p2.content.lessons?.copy?.text;

    expect(copy?.recordedBody).toBe(nbRecorded);
  });
});

describe('the Settings page is where the remote backup is described, not the other pages', () => {
  it('the RPG card refers to the remote backup (Alpha) without describing it as sync or as an account requirement', async () => {
    await onboard();
    await renderAppAtRoute('/rpg/settings');
    await expectRendered(rpgBoundary);

    const card = screen
      .getByRole('heading', { name: 'Local-first and course boundary' })
      .closest('.card') as HTMLElement;

    expect(within(card).getByText(rpgBoundary)).toBeInTheDocument();
    expect(card.textContent).not.toMatch(/\bsynchroni[sz]/i);
  }, 30_000);
});
