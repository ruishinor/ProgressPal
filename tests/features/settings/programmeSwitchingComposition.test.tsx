import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { router } from '@/app/router/router';
import {
  defaultLearnerProfileValues,
  ensureCourseCatalogFromSeed,
  getAppMeta,
  getDatabaseSnapshot,
  initializeDatabase,
  listCourseUnits,
  listProgrammeEnrolments,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';
import type { ProgrammeRegistry } from '@/programmes';
import { createProgrammeRegistry } from '@/programmes/registry';

import { defaultTestMigrationContext } from '../../db/testDatabase';
import {
  altCourseId,
  altDefinition,
  altProgrammeId,
  altSeed,
  bothCataloguesMigrationContext,
  cs50CourseId,
  cs50Definition,
  cs50ProgrammeId,
} from '../../programmes/c7Fixture';
import {
  buildAlternateOnlyBackupFile,
  seedTwoProgrammeDevice,
} from '../../programmes/c7Device';

/**
 * Epic C / C7 real-composition evidence. The production registry holds only
 * CS50, so two-programme behaviour is proven through the real app composition
 * root (provider, shells, routes, Settings) with a validated two-definition
 * registry injected at the single registry boundary the composition root
 * reads. Nothing here adds a second definition to the production registry.
 */

const injected = vi.hoisted(() => ({
  registry: null as unknown as ProgrammeRegistry | null,
}));

vi.mock('@/programmes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/programmes')>();

  return {
    ...actual,
    getProgrammeRegistry: () =>
      injected.registry ?? actual.getProgrammeRegistry(),
  };
});

const timeout = { timeout: 15_000 };

function injectTwoProgrammeRegistry() {
  injected.registry = createProgrammeRegistry({
    defaultProgrammeId: cs50ProgrammeId,
    definitions: [cs50Definition, altDefinition],
  });
}

async function expectRendered(value: string | RegExp) {
  await waitFor(() => {
    const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
    if (typeof value === 'string') {
      expect(text).toContain(value);
    } else {
      expect(text).toMatch(value);
    }
  }, timeout);
}

async function goTo(route: string) {
  await act(async () => {
    await router.navigate(route);
  });
}

async function persistedActiveProgrammeId() {
  return (await getAppMeta({ db: getSharedDatabase() }))?.activeProgrammeId;
}

function programmeCard() {
  return screen
    .getByRole('heading', { name: 'Programme' })
    .closest('.card') as HTMLElement;
}

beforeEach(() => {
  closeSharedDatabase();
});

afterEach(() => {
  // The suite-wide teardown unmounts the provider and then deletes the shared
  // database; closing it here would run first and race an in-flight refresh.
  injected.registry = null;
  vi.restoreAllMocks();
});

// Epic E (accepted-oracle change): the production registry now holds two
// real programmes, so Settings offers Programvareutvikling as a not-enrolled
// switch target. Rendering Settings still never switches or enrols.
describe('production registry: two real programmes, nothing switches on render', () => {
  async function seedProductionDevice() {
    getSharedDatabase(defaultTestMigrationContext);
    await initializeDatabase({ seed: bundledCourseSeed });
    await saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        displayName: 'C7 Synthetic Learner',
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      { completeOnboarding: true },
    );
    closeSharedDatabase();
  }

  it.each([
    ['/settings', 'Classic'],
    ['/rpg/settings', 'RPG'],
  ])(
    'shows the active programme on %s (%s) and offers the other real programme',
    async (route) => {
      // Production composition: the real registry, CS50 and Programvareutvikling.
      injected.registry = null;
      await seedProductionDevice();

      await renderAppAtRoute(route);
      await screen.findByRole('heading', { name: 'Programme' }, timeout);

      expect(programmeCard()).toHaveTextContent('Active programme: CS50x 2026');
      const target = screen.getByLabelText('Programme to switch to');
      expect(
        within(target)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Programvareutvikling 1 (not enrolled)']);
      expect(
        screen.getByRole('button', { name: 'Enrol and switch' }),
      ).toBeInTheDocument();
      expect(await listProgrammeEnrolments()).toEqual([
        expect.objectContaining({ programmeId: 'cs50x' }),
      ]);
    },
    30_000,
  );
});

describe('Settings → Programme through the real composition', () => {
  it('shows the active programme and the alternative, and does not switch on selection alone', async () => {
    injectTwoProgrammeRegistry();
    await seedTwoProgrammeDevice();

    await renderAppAtRoute('/settings');
    await screen.findByRole('heading', { name: 'Programme' }, timeout);

    expect(programmeCard()).toHaveTextContent('Active programme: CS50x 2026');
    const select = screen.getByLabelText('Programme to switch to');
    await userEvent.selectOptions(select, altProgrammeId);
    await userEvent.tab();
    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(await persistedActiveProgrammeId()).toBe(cs50ProgrammeId);
    expect(programmeCard()).toHaveTextContent('Active programme: CS50x 2026');
  }, 30_000);

  it('enrols, switches, rebinds every route to B, and switches back to A', async () => {
    injectTwoProgrammeRegistry();
    await seedTwoProgrammeDevice();

    await renderAppAtRoute('/settings');
    await screen.findByRole('heading', { name: 'Programme' }, timeout);
    await userEvent.selectOptions(
      screen.getByLabelText('Programme to switch to'),
      altProgrammeId,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Enrol and switch' }),
    );

    await waitFor(async () => {
      expect(await persistedActiveProgrammeId()).toBe(altProgrammeId);
    }, timeout);
    await screen.findByRole('heading', { name: 'Programme' }, timeout);
    await expectRendered('Active programme: C5 alternate catalogue');

    // Classic routes read B's catalogue with B's wording.
    await goTo('/course');
    await screen.findByTestId('course-unit-c5-alt-unit-a', undefined, timeout);
    expect(screen.queryByTestId('course-unit-week-0')).toBeNull();
    await expectRendered('Alt course map');

    // RPG routes read B's catalogue, identity and XP policy.
    await goTo('/rpg/map');
    await screen.findByTestId('rpg-module-c5-alt-unit-a', undefined, timeout);
    expect(screen.queryByTestId('rpg-module-week-0')).toBeNull();
    await goTo('/rpg/hero');
    await expectRendered('Alt Guild');
    await goTo('/rpg/resource/c5-alt-unit-a-lecture');
    await expectRendered('Up to 25 XP remaining for this task');

    // The enrolled programme is now a normal switch back to A.
    await goTo('/settings');
    await screen.findByRole('heading', { name: 'Programme' }, timeout);
    expect(screen.getByLabelText('Programme to switch to')).toHaveDisplayValue(
      'CS50x 2026 (enrolled)',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Switch programme' }),
    );
    await waitFor(async () => {
      expect(await persistedActiveProgrammeId()).toBe(cs50ProgrammeId);
    }, timeout);

    await goTo('/course');
    await screen.findByTestId('course-unit-week-0', undefined, timeout);
    expect(screen.queryByTestId('course-unit-c5-alt-unit-a')).toBeNull();
    // No B content remains after rebinding to A.
    expect(document.body.textContent ?? '').not.toContain('Alt course map');
    await goTo('/rpg/resource/week-0-lecture');
    await expectRendered('Up to 40 XP remaining for this task');
    expect(document.body.textContent ?? '').not.toContain('Up to 25 XP');
  }, 90_000);

  it('offers the same switching from the RPG variant of Settings', async () => {
    injectTwoProgrammeRegistry();
    await seedTwoProgrammeDevice();

    await renderAppAtRoute('/rpg/settings');
    await screen.findByRole('heading', { name: 'Programme' }, timeout);
    await userEvent.click(
      screen.getByRole('button', { name: 'Enrol and switch' }),
    );

    await waitFor(async () => {
      expect(await persistedActiveProgrammeId()).toBe(altProgrammeId);
    }, timeout);
    await goTo('/rpg/map');
    await screen.findByTestId('rpg-module-c5-alt-unit-a', undefined, timeout);
  }, 60_000);

  it('exposes the pending state while the switch runs', async () => {
    injectTwoProgrammeRegistry();
    await seedTwoProgrammeDevice();

    await renderAppAtRoute('/settings');
    await screen.findByRole('heading', { name: 'Programme' }, timeout);

    fireEvent.click(screen.getByRole('button', { name: 'Enrol and switch' }));

    expect(
      screen.getByRole('button', { name: 'Enrol and switch' }),
    ).toHaveAttribute('aria-busy', 'true');

    // The persisted write lands before the provider's post-mutation refresh
    // has published. The switch has settled only once Settings has remounted
    // under B in its ready state: the pending state is over and the next valid
    // programme action (switching back to the now-enrolled A) is available.
    await waitFor(() => {
      expect(programmeCard()).toHaveTextContent(
        'Active programme: C5 alternate catalogue',
      );
    }, timeout);
    const switchBack = screen.getByRole('button', {
      name: 'Switch programme',
    });
    expect(switchBack).toBeEnabled();
    expect(switchBack).not.toHaveAttribute('aria-busy', 'true');
    expect(await persistedActiveProgrammeId()).toBe(altProgrammeId);
  }, 30_000);

  it('reports a failed switch and leaves the previous programme active', async () => {
    injectTwoProgrammeRegistry();
    await seedTwoProgrammeDevice();
    // The device already holds a newer edition of B than the registered seed.
    getSharedDatabase(bothCataloguesMigrationContext);
    await ensureCourseCatalogFromSeed({ ...altSeed, dataVersion: 2 });
    closeSharedDatabase();

    await renderAppAtRoute('/settings');
    await screen.findByRole('heading', { name: 'Programme' }, timeout);
    await userEvent.click(
      screen.getByRole('button', { name: 'Enrol and switch' }),
    );

    const alert = await screen.findByRole('alert', undefined, timeout);
    expect(alert).toHaveTextContent(/could not be switched/i);
    expect(await persistedActiveProgrammeId()).toBe(cs50ProgrammeId);
    expect(
      (
        await getDatabaseSnapshot({ db: getSharedDatabase() })
      ).programmeEnrolments.map((row) => row.programmeId),
    ).toEqual([cs50ProgrammeId]);
    expect(programmeCard()).toHaveTextContent('Active programme: CS50x 2026');
  }, 30_000);

  it.each([
    ['/dashboard', 'Course progress'],
    ['/rpg', 'Progress snapshot'],
    ['/rpg/hero', 'Required course progress'],
  ])(
    'adds no programme switcher to navigation or HUD surfaces (%s)',
    async (route, readyHeading) => {
      injectTwoProgrammeRegistry();
      await seedTwoProgrammeDevice();

      await renderAppAtRoute(route);
      // Links also render in the provider's loading shell, so they do not show
      // that the surface is built. This heading exists only once the provider
      // refresh and the page's own load have both settled.
      await screen.findByRole('heading', { name: readyHeading }, timeout);
      expect(screen.getAllByRole('link').length).toBeGreaterThan(0);

      expect(screen.queryByLabelText('Programme to switch to')).toBeNull();
      expect(
        screen.queryByRole('button', {
          name: /switch programme|enrol and switch/i,
        }),
      ).toBeNull();
      expect(screen.queryByRole('combobox', { name: /programme/i })).toBeNull();
    },
    30_000,
  );
});

describe('reset and restore never reseed a stale programme', () => {
  it('reset while B is active returns to the explicit default programme', async () => {
    injectTwoProgrammeRegistry();
    await seedTwoProgrammeDevice({ alternateActive: true });

    await renderAppAtRoute('/settings');
    await screen.findByRole('heading', { name: 'Programme' }, timeout);
    expect(programmeCard()).toHaveTextContent(
      'Active programme: C5 alternate catalogue',
    );

    await userEvent.type(screen.getByLabelText('Confirmation phrase'), 'RESET');
    await userEvent.click(
      screen.getByRole('button', { name: 'Reset all local data' }),
    );

    await waitFor(async () => {
      const snapshot = await getDatabaseSnapshot({ db: getSharedDatabase() });
      expect(snapshot.appMeta?.activeProgrammeId).toBe(cs50ProgrammeId);
      expect(
        snapshot.programmeEnrolments.map((row) => row.programmeId),
      ).toEqual([cs50ProgrammeId]);
      // B's catalogue is gone; only the default programme's is materialized.
      expect([
        ...new Set(snapshot.courseUnits.map((unit) => unit.courseId)),
      ]).toEqual([cs50CourseId]);
      expect(snapshot.catalogueVersions.map((row) => row.courseId)).toEqual([
        cs50CourseId,
      ]);
    }, timeout);
    expect(await listCourseUnits(altCourseId)).toEqual([]);
  }, 60_000);

  it('Settings restore of a B-active backup rebinds to B without reseeding CS50', async () => {
    injectTwoProgrammeRegistry();
    const backup = await buildAlternateOnlyBackupFile('c7-alt-active.json');
    await seedTwoProgrammeDevice();

    await renderAppAtRoute('/settings');
    await screen.findByRole('heading', { name: 'Programme' }, timeout);
    await userEvent.upload(screen.getByLabelText('Backup file'), backup);
    await userEvent.click(
      await screen.findByRole(
        'button',
        { name: /replace local data with this backup/i },
        timeout,
      ),
    );
    await screen.findByRole('heading', { name: 'Home' }, timeout);

    await waitFor(async () => {
      const snapshot = await getDatabaseSnapshot({ db: getSharedDatabase() });
      expect(snapshot.appMeta?.activeProgrammeId).toBe(altProgrammeId);
      expect(snapshot.learnerProfile?.displayName).toBe('Restored Alt Learner');
      expect([
        ...new Set(snapshot.courseUnits.map((unit) => unit.courseId)),
      ]).toEqual([altCourseId]);
      expect(snapshot.catalogueVersions.map((row) => row.courseId)).toEqual([
        altCourseId,
      ]);
    }, timeout);

    await goTo('/rpg/map');
    await screen.findByTestId('rpg-module-c5-alt-unit-a', undefined, timeout);
    expect(screen.queryByTestId('rpg-module-week-0')).toBeNull();
  }, 90_000);

  it('onboarding recovery restore of a B-active backup rebinds to B without reseeding CS50', async () => {
    injectTwoProgrammeRegistry();
    const backup = await buildAlternateOnlyBackupFile('c7-alt-active.json');
    await seedTwoProgrammeDevice({ onboard: false });

    await renderAppAtRoute('/onboarding');
    await screen.findByText(/already have a backup/i, {}, timeout);
    await userEvent.upload(screen.getByLabelText('Backup file'), backup);
    await userEvent.click(
      await screen.findByRole(
        'button',
        { name: /restore this backup/i },
        timeout,
      ),
    );

    // The restored backup completed onboarding, so the shell forwards to the
    // hub once the refresh lands. Wait for that before navigating, otherwise
    // the forward can overwrite this test's own navigation.
    await screen.findByRole('heading', { name: 'Home' }, timeout);

    await waitFor(async () => {
      const snapshot = await getDatabaseSnapshot({ db: getSharedDatabase() });
      expect(snapshot.appMeta?.activeProgrammeId).toBe(altProgrammeId);
      expect([
        ...new Set(snapshot.courseUnits.map((unit) => unit.courseId)),
      ]).toEqual([altCourseId]);
      expect(snapshot.catalogueVersions.map((row) => row.courseId)).toEqual([
        altCourseId,
      ]);
    }, timeout);

    await goTo('/rpg/map');
    await screen.findByTestId('rpg-module-c5-alt-unit-a', undefined, timeout);
    expect(screen.queryByTestId('rpg-module-week-0')).toBeNull();
  }, 90_000);
});
