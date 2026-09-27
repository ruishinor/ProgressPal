import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  loadRpgCourseMapSummary,
  loadRpgHeroProfileSummary,
  loadRpgHubSummary,
  loadRpgModuleSummary,
  loadRpgStudyResourceSummary,
} from '@/features/rpg';
import { loadRpgHudSummary } from '@/features/rpg/model/readModels';
import { saveRpgStudyResourceProgress } from '@/features/rpg/model/progressActions';
import { sharedAchievementDefinitions } from '@/lib/achievements';
import {
  addStudySession,
  addXpTransaction,
  defaultLearnerProfileValues,
  ensureCourseCatalogFromSeed,
  initializeDatabase,
  listAchievementUnlocks,
  saveLearnerProfile,
} from '@/lib/db';
import type { CourseSeed } from '@/lib/domain';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import {
  getActiveProgrammeDefinition,
  listRegisteredDefinitionKeys,
  type ProgrammeDefinition,
} from '@/programmes';
import { validateProgrammeDefinition } from '@/programmes/definition';
import { bundledCourseSeed } from '@/seed';

import {
  createTestDatabase,
  type TestDatabaseContext,
} from '../db/testDatabase';

/**
 * Epic C / C5 P3: catalogue-derived reads are scoped to the active
 * definition's catalogue identity. A test-only second catalogue (distinct
 * catalogue, unit and item IDs) is materialized next to CS50 through the real
 * seed sync; its definition is injected here and never registered. Global
 * learner state (XP ledger, sessions, unlocks) stays global.
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

const altSeed: CourseSeed = {
  courseId: 'c5-alt-catalogue',
  title: 'C5 alternate catalogue',
  dataVersion: 1,
  sourceCheckedDate: '2026-09-28',
  units: [
    {
      id: 'c5-alt-unit-a',
      order: 0,
      title: 'Alt Unit A',
      type: 'week',
      sourceYear: 2026,
      required: true,
      items: [
        {
          id: 'c5-alt-unit-a-lecture',
          type: 'lecture',
          title: 'Alt lecture',
          required: true,
          estimatedMinutes: 60,
          order: 0,
        },
        {
          id: 'c5-alt-unit-a-problem-set',
          type: 'problem_set',
          title: 'Alt problem set',
          required: true,
          estimatedMinutes: 90,
          order: 1,
        },
      ],
    },
    {
      id: 'c5-alt-unit-b',
      order: 1,
      title: 'Alt Unit B',
      type: 'special',
      sourceYear: 2026,
      required: false,
      items: [
        {
          id: 'c5-alt-unit-b-reading',
          type: 'reading',
          title: 'Alt reading',
          required: false,
          estimatedMinutes: 30,
          order: 0,
        },
      ],
    },
  ],
};
const altUnitIds = altSeed.units.map((unit) => unit.id);

/** Test-only definition over the alternate catalogue; never registered. */
const altDefinition: ProgrammeDefinition = validateProgrammeDefinition({
  definitionKey: altSeed.courseId,
  catalogueId: altSeed.courseId,
  title: altSeed.title,
  catalogue: altSeed,
  policy: {
    ...cs50.policy,
    catalogueRules: { requiredUnitTypes: [] },
    xp: { ...cs50.policy.xp, itemMilestones: [] },
    achievements: sharedAchievementDefinitions,
  },
  content: {
    externalResources: {
      allowedUrlPrefixes: ['https://example.test/'],
      unitLinks: {},
      itemLinks: {},
    },
    studyGuides: { unitGuides: {}, itemGuides: {} },
    terminology: {
      ...cs50.content.terminology,
      unitMapOrdinals: { 'c5-alt-unit-a': 'A', 'c5-alt-unit-b': 'B' },
    },
  },
});

/** Unregistered key whose catalogue is not materialized. */
const unregisteredDefinition: ProgrammeDefinition = {
  ...cs50,
  definitionKey: 'c5-unregistered',
  catalogueId: 'c5-unregistered',
};

const databases: TestDatabaseContext[] = [];

async function createBothCatalogues(label: string) {
  const context = createTestDatabase(label);
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

afterEach(async () => {
  injected.definition = null;
  vi.restoreAllMocks();
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

describe('C5 P3: catalogue-derived reads are scoped to the active catalogue', () => {
  it('keeps the production registry to the CS50 definition only', () => {
    expect(listRegisteredDefinitionKeys()).toEqual(['cs50x-2026']);
  });

  it('shows only CS50 units and items on the CS50 map, HUD, hub and hero', async () => {
    const context = await createBothCatalogues('c5-p3-cs50');
    const options = { db: context.db, now: () => '2026-09-28T12:00:00.000Z' };

    const map = await loadRpgCourseMapSummary(options);
    expect(map.modules.map((module) => module.id)).toEqual(cs50UnitIds);
    expect(map.unitCount).toBe(14);
    expect(map.requiredItemCount).toBe(cs50RequiredItemIds.length);

    const hud = await loadRpgHudSummary(options);
    const hub = await loadRpgHubSummary(options);
    const hero = await loadRpgHeroProfileSummary(options);
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

    expect(await loadRpgModuleSummary('c5-alt-unit-a', options)).toBeNull();
    expect(
      await loadRpgStudyResourceSummary('c5-alt-unit-a-lecture', options),
    ).toBeNull();
    expect(await loadRpgModuleSummary('week-0', options)).not.toBeNull();
  });

  it('shows only the alternate catalogue when its definition is active', async () => {
    const context = await createBothCatalogues('c5-p3-alt');
    const options = { db: context.db, now: () => '2026-09-28T12:00:00.000Z' };
    injected.definition = altDefinition;

    const map = await loadRpgCourseMapSummary(options);
    expect(map.modules.map((module) => module.id)).toEqual(altUnitIds);
    expect(map.requiredItemCount).toBe(2);
    expect(
      (await loadRpgHubSummary(options)).courseProgress.requiredItemCount,
    ).toBe(2);
    expect(await loadRpgModuleSummary('week-0', options)).toBeNull();
    expect(
      await loadRpgStudyResourceSummary('week-0-lecture', options),
    ).toBeNull();
    expect(await loadRpgModuleSummary('c5-alt-unit-a', options)).not.toBeNull();
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

    for (const definition of [null, altDefinition]) {
      injected.definition = definition;
      expect((await loadRpgHudSummary(options)).xpSummary.totalXp).toBe(80);
      const hero = await loadRpgHeroProfileSummary(options);
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
        await saveRpgStudyResourceProgress({
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

describe('C5 wrong or unmaterialized scope fails closed through the actual route', () => {
  it.each([
    [
      'an unregistered, unmaterialized definition key',
      () => unregisteredDefinition,
    ],
    [
      'a valid test definition whose catalogue is not materialized',
      () => altDefinition,
    ],
  ])(
    'renders error states, never a CS50 or empty map, for %s',
    async (_label, definition) => {
      await onboardShared({ alt: false });
      injected.definition = definition();
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await renderAppAtRoute('/rpg/map');
      await expectRendered('Campaign map could not be read');
      expect(screen.queryByTestId('rpg-module-week-0')).toBeNull();
      expect(screen.queryByText('Campaign map is empty')).toBeNull();
    },
    30_000,
  );

  it.each([
    ['/rpg', 'RPG hub could not be read'],
    ['/rpg/hero', 'Hero Profile could not be read'],
    ['/rpg/week/week-0', 'RPG week not found'],
  ])(
    'renders the existing error state on %s for an unmaterialized catalogue',
    async (route, message) => {
      await onboardShared({ alt: false });
      injected.definition = altDefinition;
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await renderAppAtRoute(route);
      await expectRendered(message);
    },
    30_000,
  );

  it('does not open a CS50 resource under an unmaterialized catalogue', async () => {
    await onboardShared({ alt: false });
    injected.definition = altDefinition;
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

  it('renders only the alternate catalogue on the actual map route when it is active and materialized', async () => {
    await onboardShared({ alt: true });
    injected.definition = altDefinition;

    await renderAppAtRoute('/rpg/map');
    await screen.findByTestId('rpg-module-c5-alt-unit-a', undefined, {
      timeout: 15_000,
    });
    expect(screen.queryByTestId('rpg-module-week-0')).toBeNull();
  }, 30_000);
});
