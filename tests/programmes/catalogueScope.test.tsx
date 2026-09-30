import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadRpgCourseMapSummary,
  loadRpgHeroProfileSummary,
  loadRpgHubSummary,
  loadRpgModuleSummary,
  loadRpgStudyResourceSummary,
} from '@/features/rpg';
import { saveRpgStudyResourceProgress } from '@/features/rpg/model/progressActions';
import { loadRpgHudSummary } from '@/features/rpg/model/readModels';
import { AppStateProvider, useAppState } from '@/lib/appState';
import {
  addStudySession,
  addXpTransaction,
  defaultLearnerProfileValues,
  ensureCourseCatalogFromSeed,
  getCatalogueCourseState,
  getDatabaseSnapshot,
  initializeDatabase,
  listAchievementUnlocks,
  listCourseUnits,
  logMediaProgressAndAwardXp,
  saveLearnerProfile,
  upsertProgress,
  upsertProgressAndAwardXp,
} from '@/lib/db';
import type { ProgrammeScope } from '@/lib/domain';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import {
  getActiveProgrammeDefinition,
  listRegisteredDefinitionKeys,
  type ProgrammeDefinition,
} from '@/programmes';
import { bundledCourseSeed } from '@/seed';

import {
  closeSharedDatabase,
  deleteSharedDatabase,
  getSharedDatabase,
} from '@/lib/db/database';
import {
  createTestDatabase,
  type TestDatabaseContext,
} from '../db/testDatabase';
import {
  altDefinition,
  altMigrationContext,
  altSeed,
  altUnitIds,
  bothCataloguesMigrationContext,
  scopeOf,
} from './c7Fixture';

/**
 * Epic C / C5 P3 and repair evidence: catalogue-derived reads and saves are
 * scoped to the programme scope resolved once at bootstrap.
 *
 * A test-only second catalogue (distinct catalogue, unit and item IDs) is
 * materialized next to CS50 through the real seed sync. Its definition passes
 * real definition validation and is never registered. Reader tests pass a
 * scope explicitly; route tests inject a definition at the app composition
 * root (the single place that resolves the active programme), so the real
 * bootstrap, shells and pages run. Global learner state (XP ledger, sessions,
 * unlocks) stays global.
 */

const injected = vi.hoisted(() => ({
  definition: null as ProgrammeDefinition | null,
}));

vi.mock('@/programmes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/programmes')>();

  return {
    ...actual,
    getActiveProgrammeDefinition: () =>
      injected.definition ?? actual.getActiveProgrammeDefinition(),
  };
});

const cs50 = getActiveProgrammeDefinition();
const cs50UnitIds = bundledCourseSeed.units.map((unit) => unit.id);
const cs50RequiredItemIds = bundledCourseSeed.units
  .flatMap((unit) => unit.items)
  .filter((item) => item.required)
  .map((item) => item.id);

/**
 * An injected composition whose catalogue identity has no materialized unit.
 * It bypasses definition validation on purpose; it is not a registry key
 * rejection (the registry's own rejection is tested in registry.test.ts).
 */
const unmaterializedDefinition: ProgrammeDefinition = {
  ...cs50,
  catalogueId: 'c5-unmaterialized',
};

const cs50Scope = scopeOf(cs50);
const altScope = scopeOf(altDefinition);

const databases: TestDatabaseContext[] = [];

async function createBothCatalogues(label: string) {
  const context = createTestDatabase(label, bothCataloguesMigrationContext);
  databases.push(context);
  await initializeDatabase({ db: context.db, seed: bundledCourseSeed });
  await ensureCourseCatalogFromSeed(altSeed, { db: context.db });

  return context;
}

async function onboardShared(options: { alt: boolean }) {
  await initializeDatabase({ seed: bundledCourseSeed });
  if (options.alt) {
    await ensureCourseCatalogFromSeed(altSeed);
  }
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName: 'C5 Synthetic Learner',
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
}

async function expectRendered(value: string) {
  await waitFor(
    () => {
      expect((document.body.textContent ?? '').replace(/\s+/g, ' ')).toContain(
        value,
      );
    },
    { timeout: 15_000 },
  );
}

function cardText(title: string) {
  const heading = screen.getByRole('heading', { name: title });
  return (heading.closest('.card')?.textContent ?? '').replace(/\s+/g, ' ');
}

beforeEach(() => {
  // This file syncs a test-only second catalogue onto the shared database
  // (`onboardShared({ alt: true })`); rebind over the suite-wide default so
  // that sync is authorized. Neither catalogue enters the production
  // registry.
  closeSharedDatabase();
  getSharedDatabase(bothCataloguesMigrationContext);
});

afterEach(async () => {
  injected.definition = null;
  vi.restoreAllMocks();
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

describe('C5 P3: scoped readers isolate catalogues in both directions', () => {
  it('keeps the production registry to the CS50 definition only', () => {
    expect(listRegisteredDefinitionKeys()).toEqual(['cs50x-2026']);
  });

  it('shows only CS50 units and items on the CS50 map, HUD, hub and hero', async () => {
    const context = await createBothCatalogues('c5-p3-cs50');
    const options = { db: context.db, now: () => '2026-09-28T12:00:00.000Z' };

    const map = await loadRpgCourseMapSummary(cs50Scope, options);
    expect(map.modules.map((module) => module.id)).toEqual(cs50UnitIds);
    expect(map.unitCount).toBe(14);
    expect(map.requiredItemCount).toBe(cs50RequiredItemIds.length);

    const hud = await loadRpgHudSummary(cs50Scope, options);
    const hub = await loadRpgHubSummary(cs50Scope, options);
    const hero = await loadRpgHeroProfileSummary(cs50Scope, options);
    for (const summary of [hub, hero]) {
      expect(summary.courseProgress.requiredItemCount).toBe(
        cs50RequiredItemIds.length,
      );
    }
    expect(hud.recommendation.quest?.unitId ?? 'none').not.toMatch(/^c5-alt/);
  });

  it('does not resolve alternate-catalogue modules or resources under CS50', async () => {
    const context = await createBothCatalogues('c5-p3-cs50-ids');
    const options = { db: context.db };

    expect(
      await loadRpgModuleSummary(cs50Scope, 'c5-alt-unit-a', options),
    ).toBeNull();
    expect(
      await loadRpgStudyResourceSummary(
        cs50Scope,
        'c5-alt-unit-a-lecture',
        options,
      ),
    ).toBeNull();
    expect(
      await loadRpgModuleSummary(cs50Scope, 'week-0', options),
    ).not.toBeNull();
  });

  it('shows only the alternate catalogue under its scope', async () => {
    const context = await createBothCatalogues('c5-p3-alt');
    const options = { db: context.db, now: () => '2026-09-28T12:00:00.000Z' };

    const map = await loadRpgCourseMapSummary(altScope, options);
    expect(map.modules.map((module) => module.id)).toEqual(altUnitIds);
    expect(map.requiredItemCount).toBe(2);
    expect(
      (await loadRpgHubSummary(altScope, options)).courseProgress
        .requiredItemCount,
    ).toBe(2);
    expect(await loadRpgModuleSummary(altScope, 'week-0', options)).toBeNull();
    expect(
      await loadRpgStudyResourceSummary(altScope, 'week-0-lecture', options),
    ).toBeNull();
    expect(
      await loadRpgModuleSummary(altScope, 'c5-alt-unit-a', options),
    ).not.toBeNull();

    const classic = await getCatalogueCourseState({
      catalogueId: altScope.catalogueId,
      db: context.db,
    });
    expect(classic.courseUnits.map((unit) => unit.id)).toEqual(altUnitIds);
    expect(new Set(classic.courseItems.map((item) => item.unitId))).toEqual(
      new Set(altUnitIds),
    );
  });

  it('fails closed for a valid scope whose catalogue is not materialized', async () => {
    const context = createTestDatabase('c5-p3-unmaterialized');
    databases.push(context);
    await initializeDatabase({ db: context.db, seed: bundledCourseSeed });

    await expect(
      loadRpgCourseMapSummary(altScope, { db: context.db }),
    ).rejects.toThrow(/no materialized course units/);
    await expect(
      getCatalogueCourseState({
        catalogueId: altScope.catalogueId,
        db: context.db,
      }),
    ).rejects.toThrow(/no materialized course units/);
  });

  it('keeps the XP ledger and study sessions global across catalogues', async () => {
    const context = await createBothCatalogues('c5-p3-global');
    const options = { db: context.db, now: () => '2026-09-28T12:00:00.000Z' };
    const awardedAt = '2026-09-28T10:00:00.000Z';

    await addXpTransaction(
      {
        sourceType: 'lecture_completed',
        sourceId: 'week-0-lecture-completed',
        xp: 40,
        reason: 'C5 CS50 fixture',
        awardedAt,
      },
      { db: context.db },
    );
    await addXpTransaction(
      {
        sourceType: 'lecture_completed',
        sourceId: 'c5-alt-unit-a-lecture-completed',
        xp: 40,
        reason: 'C5 alternate fixture',
        awardedAt,
      },
      { db: context.db },
    );
    for (const [unitId, itemId] of [
      ['week-0', 'week-0-lecture'],
      ['c5-alt-unit-a', 'c5-alt-unit-a-lecture'],
    ] as const) {
      await addStudySession(
        {
          unitId,
          itemId,
          startedAt: awardedAt,
          endedAt: '2026-09-28T10:30:00.000Z',
          durationMinutes: 30,
          mode: 'watching',
        },
        { db: context.db },
      );
    }

    for (const scope of [cs50Scope, altScope]) {
      expect((await loadRpgHudSummary(scope, options)).xpSummary.totalXp).toBe(
        80,
      );
      const hero = await loadRpgHeroProfileSummary(scope, options);
      expect(hero.xpSummary.totalXp).toBe(80);
      expect(hero.studySummary.sessionCount).toBe(2);
    }
  });

  it(
    'evaluates course completion against the active catalogue only',
    { timeout: 120_000 },
    async () => {
      await onboardShared({ alt: true });

      for (const itemId of cs50RequiredItemIds) {
        await saveRpgStudyResourceProgress(cs50Scope, {
          confidence: 3,
          itemId,
          status: 'completed',
        });
      }

      const courseComplete = (await listAchievementUnlocks()).find(
        (unlock) => unlock.achievementId === 'course-complete',
      );
      expect(courseComplete?.triggerSourceId).toBe('cs50x-2026');
    },
  );
});

function ScopeProbe() {
  const { error, programmeScope, status } = useAppState();

  return (
    <p data-testid="scope-probe">
      {`${status}|${error ?? ''}|${programmeScope?.catalogueId ?? 'none'}`}
    </p>
  );
}

describe('C5 repair: the scope is resolved once at the bootstrap composition', () => {
  it('resolves once, exposes the scope and seeds only its catalogue', async () => {
    const resolve = vi.fn(() => altScope);
    // Undo the suite-wide default-context pre-bind so this provider's own
    // fresh composition can bind the alt catalogue's context instead.
    closeSharedDatabase();

    render(
      <AppStateProvider
        resolveProgramme={resolve}
        resolveMigrationContext={() => altMigrationContext}
      >
        <ScopeProbe />
      </AppStateProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByTestId('scope-probe').textContent).toBe(
          'ready||c5-alt-catalogue',
        );
      },
      { timeout: 15_000 },
    );
    expect(resolve).toHaveBeenCalledTimes(1);
    expect((await listCourseUnits()).map((unit) => unit.id)).toEqual(
      altUnitIds,
    );
  }, 30_000);

  it('keeps a failed resolution as the existing bootstrap error, with no default programme', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const resolve = vi.fn((): ProgrammeScope => {
      throw new Error('Simulated programme resolution failure');
    });

    const rendered = render(
      <AppStateProvider
        resolveProgramme={resolve}
        resolveMigrationContext={() => altMigrationContext}
      >
        <ScopeProbe />
      </AppStateProvider>,
    );

    try {
      await waitFor(
        () => {
          expect(screen.getByTestId('scope-probe').textContent).toBe(
            'error|Local data could not be loaded.|none',
          );
        },
        { timeout: 15_000 },
      );
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(await listCourseUnits()).toEqual([]);
      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith(
        'App state initialization failed.',
        expect.objectContaining({
          message: 'Simulated programme resolution failure',
        }),
      );
    } finally {
      // Keep the expected error contained until the provider's coordination
      // session is stopped. The file-level afterEach restores the spy only
      // after this explicit unmount, so no late refresh can escape to stderr.
      rendered.unmount();
    }
  }, 30_000);

  it('materializes and reads the composed catalogue, not a hard-wired CS50 seed', async () => {
    injected.definition = altDefinition;
    // Epic C6-R, D1: `activeProgrammeId` is a stable persisted identity, so a
    // device bootstrapped under one composed programme can no longer be
    // silently reopened under a different one — reusing `onboardShared`'s
    // cs50x-bootstrapped storage here would now correctly fail closed. This
    // test's point is that the composition (not a hard-wired CS50 seed)
    // drives what materializes, so it bootstraps and onboards directly under
    // the alt-composed definition on fresh storage instead.
    await deleteSharedDatabase();
    getSharedDatabase(altMigrationContext);
    await initializeDatabase({ seed: altSeed });
    await saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        displayName: 'C5 Synthetic Learner',
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      { completeOnboarding: true },
    );
    closeSharedDatabase();

    await renderAppAtRoute('/rpg/map');
    await screen.findByTestId('rpg-module-c5-alt-unit-a', undefined, {
      timeout: 15_000,
    });
    expect(screen.queryByTestId('rpg-module-week-0')).toBeNull();
    // The bootstrap seeded the resolved definition's catalogue.
    expect(
      (await listCourseUnits(altSeed.courseId)).map((unit) => unit.id),
    ).toEqual(altUnitIds);
  }, 30_000);

  it('drives the Classic course map from the composed scope', async () => {
    injected.definition = altDefinition;
    // Epic C6-R, D1: see the equivalent note above — bootstrap and onboard
    // directly under the alt-composed definition on fresh storage instead of
    // reusing `onboardShared`'s cs50x-bootstrapped storage. Reading the
    // active catalogue only (not both) amid coexisting catalogues is already
    // covered by "C5 repair: Classic surfaces read the active catalogue
    // only" below; this test's own point is the definition switch itself.
    await deleteSharedDatabase();
    getSharedDatabase(altMigrationContext);
    await initializeDatabase({ seed: altSeed });
    await saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        displayName: 'C5 Synthetic Learner',
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      { completeOnboarding: true },
    );
    closeSharedDatabase();

    await renderAppAtRoute('/course');
    await screen.findByTestId('course-unit-c5-alt-unit-a', undefined, {
      timeout: 15_000,
    });
    expect(screen.queryByTestId('course-unit-week-0')).toBeNull();
  }, 30_000);
});

describe('C5 repair: Classic surfaces read the active catalogue only', () => {
  it('renders only CS50 unit cards on the Classic course map', async () => {
    await onboardShared({ alt: true });
    closeSharedDatabase();

    await renderAppAtRoute('/course');
    await screen.findByTestId('course-unit-week-0', undefined, {
      timeout: 15_000,
    });
    expect(screen.queryByTestId('course-unit-c5-alt-unit-a')).toBeNull();
    expect(screen.queryByTestId('course-unit-c5-alt-unit-b')).toBeNull();
  }, 30_000);

  it('keeps Dashboard course context active-catalogue only and learner totals global', async () => {
    await onboardShared({ alt: true });
    await upsertProgress(
      { confidence: 2, itemId: 'week-0-lecture', status: 'started' },
      { now: () => '2026-09-28T08:00:00.000Z' },
    );
    await upsertProgress(
      { confidence: 2, itemId: 'c5-alt-unit-a-lecture', status: 'started' },
      { now: () => '2026-09-28T09:00:00.000Z' },
    );
    for (const sourceId of [
      'week-0-lecture-completed',
      'c5-alt-unit-a-lecture-completed',
    ]) {
      await addXpTransaction({
        sourceType: 'lecture_completed',
        sourceId,
        xp: 40,
        reason: 'C5 dashboard fixture',
        awardedAt: '2026-09-28T09:30:00.000Z',
      });
    }
    for (const [unitId, itemId] of [
      ['week-0', 'week-0-lecture'],
      ['c5-alt-unit-a', 'c5-alt-unit-a-lecture'],
    ] as const) {
      await addStudySession({
        unitId,
        itemId,
        startedAt: '2026-09-28T07:00:00.000Z',
        endedAt: '2026-09-28T07:30:00.000Z',
        durationMinutes: 30,
        mode: 'watching',
      });
    }

    closeSharedDatabase();
    await renderAppAtRoute('/dashboard');
    await screen.findByRole(
      'heading',
      { name: "What's next?" },
      { timeout: 15_000 },
    );

    expect(cardText('Course progress')).toContain('0 of 14');
    expect(cardText("What's next?")).toContain('Lecture 0: Scratch');
    expect(cardText("What's next?")).not.toMatch(/Alt |c5-alt/);
    expect(cardText('Recent activity')).not.toMatch(
      /Saved progress — (Alt |c5-alt)/,
    );
    // OD-1 / OD-4: XP and sessions remain global.
    expect(cardText('XP')).toContain('80 XP total');
    expect(
      within(
        screen
          .getByRole('heading', { name: 'Study sessions' })
          .closest('.card') as HTMLElement,
      ).getByText('2'),
    ).toBeInTheDocument();
  }, 30_000);

  it('does not open a foreign-catalogue item as a Classic detail or save target', async () => {
    await onboardShared({ alt: true });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const before = await getDatabaseSnapshot();
    closeSharedDatabase();

    await renderAppAtRoute('/course/c5-alt-unit-a-lecture');
    await expectRendered('Course content could not be opened');
    await expectRendered(
      'The requested course task was not found in the local catalog.',
    );
    expect(screen.queryByRole('button', { name: 'Save progress' })).toBeNull();

    const after = await getDatabaseSnapshot();
    expect(after.progressEntries).toEqual(before.progressEntries);
    expect(after.xpTransactions).toEqual(before.xpTransactions);
    expect(after.achievementUnlocks).toEqual(before.achievementUnlocks);
  }, 30_000);

  it('rejects a cross-catalogue progress or media save before any write', async () => {
    const context = await createBothCatalogues('c5-write-boundary');
    const options = { ...cs50Scope, db: context.db };
    const before = await getDatabaseSnapshot({ db: context.db });

    await expect(
      upsertProgressAndAwardXp(
        {
          confidence: 3,
          itemId: 'c5-alt-unit-a-lecture',
          status: 'completed',
        },
        options,
      ),
    ).rejects.toThrow(/is not in catalogue "cs50x-2026"/);
    await expect(
      logMediaProgressAndAwardXp(
        {
          assetId: 'c5-alt-unit-a-lecture-asset',
          endSecond: 60,
          energyAfter: 3,
          energyBefore: 3,
          startSecond: 0,
          stoppedBecause: 'time_box_finished',
        },
        options,
      ),
    ).rejects.toThrow(/is not in catalogue "cs50x-2026"/);

    expect(await getDatabaseSnapshot({ db: context.db })).toEqual(before);

    const saved = await upsertProgressAndAwardXp(
      { confidence: 3, itemId: 'week-0-lecture', status: 'completed' },
      options,
    );
    expect(saved.awardedTransactions.map((tx) => tx.id)).toContain(
      'xp-lecture_completed-week-0-lecture-completed',
    );
  });
});

describe('C5 unmaterialized catalogue scope fails closed through the actual route', () => {
  it.each([
    ['/rpg/map', 'Campaign map could not be read'],
    ['/rpg', 'RPG hub could not be read'],
    ['/rpg/hero', 'Hero Profile could not be read'],
    ['/rpg/week/week-0', 'RPG week not found'],
    ['/course', 'Course data could not be read'],
    ['/dashboard', 'Local data could not be read'],
    ['/course/week-0-lecture', 'Course content could not be opened'],
  ])(
    'renders the existing error state on %s',
    async (route, message) => {
      await onboardShared({ alt: false });
      injected.definition = unmaterializedDefinition;
      // The database is already migrated; closing (not deleting) the shared
      // instance lets the render's fresh composition root rebind the
      // migration context to the unmaterialized catalogue without
      // conflicting with the bind `onboardShared` already made.
      closeSharedDatabase();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await renderAppAtRoute(route);
      await expectRendered(message);
      expect(screen.queryByTestId('rpg-module-week-0')).toBeNull();
      expect(screen.queryByTestId('course-unit-week-0')).toBeNull();
      expect(screen.queryByText('Campaign map is empty')).toBeNull();
    },
    30_000,
  );

  it('does not open a CS50 resource under an unmaterialized scope', async () => {
    await onboardShared({ alt: false });
    injected.definition = unmaterializedDefinition;
    closeSharedDatabase();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await renderAppAtRoute('/rpg/resource/week-0-lecture');
    await waitFor(
      () => {
        expect(
          screen.queryByRole('heading', { name: 'Save progress' }),
        ).toBeNull();
        expect(document.body.textContent ?? '').toMatch(
          /could not be (read|loaded)|not found/i,
        );
      },
      { timeout: 15_000 },
    );
  }, 30_000);
});
