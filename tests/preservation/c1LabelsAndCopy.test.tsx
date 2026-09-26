import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildCategoryOptions } from '@/features/achievements/model';
import { achievementCategoryLabels } from '@/features/achievements/model';
import { buildCourseMap, courseItemTypeLabels } from '@/features/course/model';
import { getCs50ItemLink, getCs50UnitLink } from '@/features/course/cs50Links';
import { getItemGuide, getUnitGuide } from '@/features/course/guideContent';
import { loadRpgHubSummary } from '@/features/rpg';
import { getStudySessionModeOptions } from '@/features/sessions/model';
import {
  defaultLearnerProfileValues,
  getAchievementsView,
  getCourseMapReadData,
  initializeDatabase,
  saveLearnerProfile,
  upsertProgress,
} from '@/lib/db';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';

import committedLinksAndGuides from '../fixtures/preservation/c1-links-guides.json';
import { createIncrementingClock, createSeededDatabase } from './c1Support';

/**
 * Epic C / C1 evidence area 8 — links, guides, labels and CS50 copy.
 *
 * Family: SEMANTIC ORACLE. Authorities: src/features/course/cs50Links.ts and
 * src/features/course/guideContent.ts (content), the label tables in their
 * feature modules, and the rendered routes. Each label row records its owner
 * after C3/C4 (C0 contract section 4c): canonical vocabulary labels and rank
 * labels stay SHARED; RPG identity, map ordinals, CS50 copy and the
 * curriculum-unit noun are CS50-OWNED. Ownership never changes the family.
 *
 * Existing strong coverage is not duplicated: `tests/features/cs50Links.test.ts`
 * and `guideContent.test.ts` pin URL shape and keying; `tests/app/App.test.tsx`
 * pins "Start tracking CS50 locally", "RPG week", "Back to week", "Open
 * official CS50x resource", "Log Lecture" and "Problem Set Progress";
 * `tests/features/rpg/readModels.test.ts` pins the RPG identity tuple.
 */

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

function listRuntimeSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return listRuntimeSources(full);
    return /\.(ts|tsx)$/.test(entry.name) &&
      !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)
      ? [full]
      : [];
  });
}

/** Whitespace-normalized runtime source, used only for transient-state copy. */
const runtimeSourceText = listRuntimeSources(path.resolve('src'))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n')
  .replace(/\s+/g, ' ');

describe('C1 CS50 links and study guides (semantic)', () => {
  it('reproduces the committed total lookup table for every seed unit and item', () => {
    expect({
      items: seedItemIds.map((id) => ({
        guide: getItemGuide(id),
        id,
        link: getCs50ItemLink(id),
      })),
      units: seedUnitIds.map((id) => ({
        guide: getUnitGuide(id),
        id,
        link: getCs50UnitLink(id),
      })),
    }).toEqual(committedLinksAndGuides);
  });

  it('keeps the table total and within the CS50 content authority', () => {
    const table = committedLinksAndGuides as {
      items: Array<{
        guide: unknown;
        id: string;
        link: { url: string } | null;
      }>;
      units: Array<{
        guide: unknown;
        id: string;
        link: { url: string } | null;
      }>;
    };
    const rows = [...table.units, ...table.items];

    expect(table.units.map((row) => row.id)).toEqual(seedUnitIds);
    expect(table.items.map((row) => row.id)).toEqual(seedItemIds);
    for (const row of rows) {
      if (row.link !== null) {
        expect(row.link.url, row.id).toMatch(
          /^https:\/\/cs50\.harvard\.edu\/x\//,
        );
      }
    }
    expect(table.units.filter((row) => row.link !== null)).toHaveLength(14);
    expect(table.items.filter((row) => row.link !== null)).toHaveLength(15);
    expect(
      table.units.filter((row) => row.guide !== null).map((row) => row.id),
    ).toEqual(['week-0', 'week-1']);
    expect(
      table.items.filter((row) => row.guide !== null).map((row) => row.id),
    ).toEqual([
      'week-0-lecture',
      'week-0-problem-set',
      'week-1-lecture',
      'week-1-problem-set',
    ]);
  });
});

describe('C1 shared vocabulary labels (semantic, shared)', () => {
  it('pins the item-type labels', () => {
    expect(courseItemTypeLabels).toEqual({
      lab: 'Lab',
      lecture: 'Lecture',
      notes: 'Notes',
      practice: 'Practice',
      problem_set: 'Problem set',
      project_task: 'Project task',
      reading: 'Reading',
      reflection: 'Reflection',
      section: 'Section',
      shorts: 'Shorts',
    });
  });

  it('pins the unit-type labels as rendered by the course map', async () => {
    const context = await createSeededDatabase('labels-unit-types');
    try {
      const data = await getCourseMapReadData({ db: context.db });
      const map = buildCourseMap(data.courseUnits, data.courseItems, []);
      const labelsByType = Object.fromEntries(
        map.units.map((unit) => [
          data.courseUnits.find((candidate) => candidate.id === unit.id)!.type,
          unit.typeLabel,
        ]),
      );
      expect(labelsByType).toEqual({
        final_project: 'Final project',
        special: 'Special',
        week: 'Week',
      });
    } finally {
      await context.cleanup();
    }
  });

  it('pins the achievement category labels and the Classic filter order', async () => {
    expect(achievementCategoryLabels).toEqual({
      consistency: 'Consistency',
      course_progress: 'Course progress',
      debugging: 'Debugging',
      final_project: 'Final project',
      problem_sets: 'Problem sets',
      recovery: 'Recovery',
      reflection: 'Reflection',
    });
    const context = await createSeededDatabase('labels-categories');
    try {
      expect(
        buildCategoryOptions(await getAchievementsView({ db: context.db })),
      ).toEqual([
        { label: 'All categories', value: 'all' },
        { label: 'Course progress', value: 'course_progress' },
        { label: 'Problem sets', value: 'problem_sets' },
        { label: 'Consistency', value: 'consistency' },
        { label: 'Debugging', value: 'debugging' },
        { label: 'Final project', value: 'final_project' },
      ]);
    } finally {
      await context.cleanup();
    }
  });

  it('pins the session-mode labels and order', () => {
    // Authority: `modeLabels` declaration order in src/features/sessions/model.ts.
    expect(getStudySessionModeOptions()).toEqual([
      { label: 'Coding', value: 'coding' },
      { label: 'Debugging', value: 'debugging' },
      { label: 'Final project', value: 'final_project' },
      { label: 'Note review', value: 'note_review' },
      { label: 'Reading', value: 'reading' },
      { label: 'Reflection', value: 'reflection' },
      { label: 'Watching', value: 'watching' },
    ]);
  });

  it(
    'pins the rank labels at their completion thresholds (shared) with the CS50 identity tuple',
    { timeout: 60_000 },
    async () => {
      const required = bundledCourseSeed.units
        .flatMap((unit) => unit.items)
        .filter((item) => item.required)
        .map((item) => item.id);
      expect(required).toHaveLength(26);

      // Completed required items -> expected rank (20% / 50% / 70% / 100% of 26).
      const expected: Array<[number, string]> = [
        [0, 'New Learner'],
        [1, 'Initiate'],
        [5, 'Initiate'],
        [6, 'Apprentice'],
        [12, 'Apprentice'],
        [13, 'Builder'],
        [18, 'Builder'],
        [19, 'Capstone Candidate'],
        [25, 'Capstone Candidate'],
        [26, 'Course Finisher'],
      ];

      for (const [completed, rank] of expected) {
        const context = await createSeededDatabase(`rank-${completed}`);
        const now = createIncrementingClock();
        try {
          for (const itemId of required.slice(0, completed)) {
            await upsertProgress(
              { confidence: 2, itemId, status: 'completed' },
              { db: context.db, now },
            );
          }
          const hub = await loadRpgHubSummary({
            db: context.db,
            now: () => '2026-09-19T12:00:00.000Z',
          });
          expect(hub.identity.rankLabel, `${completed} completed`).toBe(rank);
          // CS50-owned identity tuple (already pinned in readModels.test.ts).
          expect([
            hub.identity.guildLabel,
            hub.identity.classLabel,
            hub.identity.pathLabel,
          ]).toEqual(['Code Knights', 'Generalist', 'CS Foundations']);
        } finally {
          await context.cleanup();
        }
      }
    },
  );
});

/** Item-context titles and asset labels as rendered on Classic content detail. */
const renderedDetailLabels: Array<[itemId: string, strings: string[]]> = [
  ['week-0-lecture', ['About this lecture']],
  ['week-0-problem-set', ['About this problem set']],
  ['week-1-shorts', ['About this content']],
  ['week-1-section', ['About this content', 'Video - 1h 30m planned']],
  ['week-10-seminars', ['About this content', 'Reading - 2h planned']],
  ['practice-debug', ['About this content']],
  ['final-project-build', ['About this content']],
];

describe('C1 shared content-detail labels (semantic, shared)', () => {
  for (const [itemId, strings] of renderedDetailLabels) {
    it(`renders the frozen item-context and asset labels for ${itemId}`, async () => {
      await onboardSharedDatabase();
      await renderAppAtRoute(`/course/${itemId}`);
      await waitFor(
        () => {
          const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
          for (const value of strings) {
            expect(text, itemId).toContain(value);
          }
        },
        { timeout: 15_000 },
      );
    }, 30_000);
  }
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

/** CS50 copy not already pinned by existing rendered-text tests (CS50-owned). */
const renderedCs50Copy: Array<[route: string, strings: string[]]> = [
  [
    '/dashboard',
    [
      'ProgressPal CS50 Edition',
      'Local-first CS50 tracking is active. Course progress, study sessions, XP, achievements, insights, backup, restore, reset, and offline support all run on this device.',
      'Your CS50 progress on this device. Nothing is synced or stored remotely.',
    ],
  ],
  [
    '/course',
    [
      'CS50 course map',
      'The CS50x 2026 course list is built in and ready to track.',
      'Week progress',
    ],
  ],
  [
    '/insights',
    [
      "Your CS50 study activity over time. Saved sessions, watched video, and earned XP appear here. Days and weeks use this device's local time.",
    ],
  ],
  [
    '/profile',
    ['Your local CS50 profile is the starting point for ProgressPal.'],
  ],
  ['/rpg/map', ['Pick up where you left off, or open any week.']],
  ['/rpg/hero', ['Local ProgressPal progress, not official CS50 completion.']],
  [
    '/rpg/settings',
    [
      'RPG ranks, badges, and profile summaries are local ProgressPal interpretations, not CS50, Harvard, edX, or OpenCourseWare status.',
    ],
  ],
];

/**
 * CS50 copy shown only in transient loading/error states or before onboarding.
 * Protected by exact presence in runtime source (moves within src stay
 * green; any text change fails). C4 must add rendered evidence for any of
 * these strings it moves.
 */
const transientCs50Copy = [
  'Preparing local profile data and the bundled CS50 catalog.',
  'Track CS50 work, sessions, XP, achievements, notes, and progress on this device.',
  'This page shows your CS50 progress on this device.',
  'This page uses the built-in CS50 course list and your saved progress.',
  'This page shows your CS50 study activity.',
  'All required tasks are marked complete locally. This does not confirm official CS50 completion.',
  'Review official CS50x resource',
];

describe('C1 CS50 copy and curriculum-unit noun (semantic, CS50-owned)', () => {
  for (const [route, strings] of renderedCs50Copy) {
    it(`renders the frozen CS50 copy on ${route}`, async () => {
      await onboardSharedDatabase();
      await renderAppAtRoute(route);
      await waitFor(
        () => {
          const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
          for (const value of strings) {
            expect(text, route).toContain(value);
          }
        },
        { timeout: 15_000 },
      );
    }, 30_000);
  }

  it('keeps the transient-state CS50 copy verbatim in runtime source', () => {
    for (const value of transientCs50Copy) {
      expect(runtimeSourceText, value).toContain(value);
    }
  });
});
