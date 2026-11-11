import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildCategoryOptions } from '@/features/achievements/model';
import { getCs50ItemLink, getCs50UnitLink } from '@/features/course/cs50Links';
import { getItemGuide, getUnitGuide } from '@/features/course/guideContent';
import { loadRpgHubSummary } from '@/features/rpg';
import { getStudySessionModeOptions } from '@/features/sessions/model';
import {
  defaultLearnerProfileValues,
  getAchievementsView,
  initializeDatabase,
  saveLearnerProfile,
  upsertProgress,
} from '@/lib/db';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';

import committedLinksAndGuides from '../fixtures/preservation/c1-links-guides.json';
import { createIncrementingClock, createSeededDatabase } from './c1Support';
import { cs50Policy, cs50Scope } from '../programmes/cs50Policy';

const seedUnitIds = bundledCourseSeed.units.map((unit) => unit.id);
const seedItemIds = bundledCourseSeed.units.flatMap((unit) =>
  unit.items.map((item) => item.id),
);

async function onboardSharedDatabase() {
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName: 'C1 Synthetic Learner',
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
}

describe('C1 CS50 links and study guides (semantic)', () => {
  it('reproduces the committed total lookup table for every seed unit and item', () => {
    expect({
      items: seedItemIds.map((id) => ({
        hasGuide: getItemGuide(id) !== null,
        id,
        url: getCs50ItemLink(id)?.url ?? null,
      })),
      units: seedUnitIds.map((id) => ({
        hasGuide: getUnitGuide(id) !== null,
        id,
        url: getCs50UnitLink(id)?.url ?? null,
      })),
    }).toEqual(committedLinksAndGuides);
  });

  it('keeps the table total and within the CS50 content authority', () => {
    const table = committedLinksAndGuides;
    const rows = [...table.units, ...table.items];

    expect(table.units.map((row) => row.id)).toEqual(seedUnitIds);
    expect(table.items.map((row) => row.id)).toEqual(seedItemIds);
    for (const row of rows) {
      if (row.url !== null) {
        expect(row.url, row.id).toMatch(/^https:\/\/cs50\.harvard\.edu\/x\//);
      }
    }
    expect(table.units.filter((row) => row.url !== null)).toHaveLength(14);
    expect(table.items.filter((row) => row.url !== null)).toHaveLength(15);
    expect(
      table.units.filter((row) => row.hasGuide).map((row) => row.id),
    ).toEqual(['week-0', 'week-1']);
    expect(
      table.items.filter((row) => row.hasGuide).map((row) => row.id),
    ).toEqual([
      'week-0-lecture',
      'week-0-problem-set',
      'week-1-lecture',
      'week-1-problem-set',
    ]);
  });
});

describe('C1 shared vocabulary labels (semantic, shared)', () => {
  it('keeps the Classic achievement category filter order', async () => {
    const context = await createSeededDatabase('labels-categories');
    try {
      expect(
        buildCategoryOptions(
          await getAchievementsView({ policy: cs50Policy, db: context.db }),
        ).map(({ value }) => value),
      ).toEqual([
        'all',
        'course_progress',
        'problem_sets',
        'consistency',
        'debugging',
        'final_project',
        'recovery',
      ]);
    } finally {
      await context.cleanup();
    }
  });

  it('keeps the session-mode order', () => {
    // Authority: `modeLabels` declaration order in src/features/sessions/model.ts.
    expect(getStudySessionModeOptions().map(({ value }) => value)).toEqual([
      'coding',
      'debugging',
      'final_project',
      'note_review',
      'reading',
      'reflection',
      'watching',
    ]);
  });

  it(
    'assigns distinct ranks at the shared completion thresholds',
    { timeout: 60_000 },
    async () => {
      const required = bundledCourseSeed.units
        .flatMap((unit) => unit.items)
        .filter((item) => item.required)
        .map((item) => item.id);
      expect(required).toHaveLength(26);

      const thresholds = [[0], [1, 5], [6, 12], [13, 18], [19, 25], [26]];
      const ranks = new Map<number, string>();
      for (const completed of thresholds.flat()) {
        const context = await createSeededDatabase(`rank-${completed}`);
        const now = createIncrementingClock();
        try {
          for (const itemId of required.slice(0, completed)) {
            await upsertProgress(
              { confidence: 2, itemId, status: 'completed' },
              { db: context.db, now },
            );
          }
          const hub = await loadRpgHubSummary(cs50Scope, {
            db: context.db,
            now: () => '2026-09-19T12:00:00.000Z',
          });
          ranks.set(completed, hub.identity.rankLabel);
          const { guildLabel, classLabel, pathLabel } =
            cs50Scope.content.terminology.rpgIdentity;
          expect(hub.identity).toMatchObject({
            guildLabel,
            classLabel,
            pathLabel,
          });
        } finally {
          await context.cleanup();
        }
      }
      for (const threshold of thresholds) {
        expect(new Set(threshold.map((count) => ranks.get(count))).size).toBe(
          1,
        );
      }
      expect(new Set(ranks.values()).size).toBe(thresholds.length);
    },
  );
});

describe('C1 CS50-owned map ordinals (semantic, CS50-owned)', () => {
  it(
    'renders the frozen node ordinal for every unit on the RPG campaign map',
    { timeout: 30_000 },
    async () => {
      await onboardSharedDatabase();
      await renderAppAtRoute('/rpg/map');
      await screen.findByTestId('rpg-module-final-project', undefined, {
        timeout: 15_000,
      });

      const ordinals = Object.fromEntries(
        seedUnitIds.map((unitId) => [
          unitId,
          screen
            .getByTestId(`rpg-module-${unitId}`)
            .querySelector('.rpg-map__node-index')?.textContent ?? null,
        ]),
      );
      expect(ordinals).toEqual({
        'additional-practice': '+',
        'artificial-intelligence': '+',
        'final-project': '◆',
        'week-0': '0',
        'week-1': '1',
        'week-10': '10',
        'week-2': '2',
        'week-3': '3',
        'week-4': '4',
        'week-5': '5',
        'week-6': '6',
        'week-7': '7',
        'week-8': '8',
        'week-9': '9',
      });
    },
  );
});

it.each([
  ['week-1-section', /\b1h\s+30m\b/],
  ['week-10-seminars', /\b2h\b/],
])('shows the planned asset duration for %s', async (itemId, duration) => {
  await onboardSharedDatabase();
  await renderAppAtRoute('/course/' + itemId);
  const term = await screen.findByText('Content type', { selector: 'dt' });
  expect(term.nextElementSibling).toHaveTextContent(duration);
});
