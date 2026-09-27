import { describe, expect, it } from 'vitest';

import { loadRpgBadgeGallerySummary } from '@/features/rpg';
import {
  achievementDefinitions,
  deriveAchievementUnlockId,
} from '@/lib/achievements';
import {
  addStudySessionAndAwardXp,
  getAchievementsView,
  listAchievementUnlocks,
  listContentSlices,
  listMediaProgressEvents,
  logMediaProgressAndAwardXp,
  upsertProgressAndAwardXp,
  type AddStudySessionInput,
  type LogMediaProgressInput,
} from '@/lib/db';
import type { ProgressStatus, StudySessionMode } from '@/lib/domain';

import type { TestDatabaseContext } from '../db/testDatabase';
import { createIncrementingClock, createSeededDatabase } from './c1Support';
import { cs50Policy } from '../programmes/cs50Policy';

/**
 * Epic C / C1 evidence area 6 — achievements.
 *
 * Definition table and unlock behaviour: SEMANTIC ORACLE. Authority:
 * src/lib/achievements/definitions.ts (the code-only definition authority) and
 * the real evaluation/persistence path (`upsertProgressAndAwardXp`,
 * `logMediaProgressAndAwardXp`, `addStudySessionAndAwardXp`, each of which
 * evaluates and persists unlocks) over the real CS50 catalogue.
 *
 * Rule encoding (`ruleType`/`ruleConfig`) and the definitions' internal
 * timestamps: CHARACTERIZATION only. C3 may re-encode rules (for example
 * generalising `problem_set_status_count`) while every semantic assertion
 * in this file stays identical.
 *
 * Ownership after C3 (C0 contract section 4c): 6 shared, 10 CS50-owned.
 */

type Owner = 'shared' | 'cs50';
type DefinitionRow = readonly [
  id: string,
  title: string,
  description: string,
  category: string,
  xpReward: number,
  owner: Owner,
];

/** Ordered semantic definition table; array index is the display order. */
const expectedDefinitions: readonly DefinitionRow[] = [
  [
    'first-step',
    'First Step',
    'Complete your first task of any kind.',
    'course_progress',
    0,
    'shared',
  ],
  [
    'first-slice',
    'First Slice',
    'Complete your first long-form content slice.',
    'course_progress',
    0,
    'shared',
  ],
  [
    'scratch-initiate',
    'Scratch Initiate',
    'Complete every required item of Week 0 (Scratch).',
    'course_progress',
    0,
    'cs50',
  ],
  [
    'pointer-survivor',
    'Pointer Survivor',
    'Complete every required item of Week 4 (Memory).',
    'course_progress',
    0,
    'cs50',
  ],
  [
    'data-structure-builder',
    'Data Structure Builder',
    'Complete every required item of Week 5 (Data Structures).',
    'course_progress',
    0,
    'cs50',
  ],
  [
    'python-shift',
    'Python Shift',
    'Complete every required item of Week 6 (Python).',
    'course_progress',
    0,
    'cs50',
  ],
  [
    'query-builder',
    'Query Builder',
    'Complete every required item of Week 7 (SQL).',
    'problem_sets',
    0,
    'cs50',
  ],
  [
    'browser-builder',
    'Browser Builder',
    'Complete every required item of Week 8 (HTML, CSS, JavaScript).',
    'course_progress',
    0,
    'cs50',
  ],
  [
    'flask-route-maker',
    'Flask Route Maker',
    'Complete every required item of Week 9 (Flask).',
    'course_progress',
    0,
    'cs50',
  ],
  [
    'course-complete',
    'Course Complete',
    'Complete every required item of every required unit in the course.',
    'course_progress',
    0,
    'shared',
  ],
  [
    'pset-chain',
    'Pset Chain',
    'Submit or get accepted on at least three problem sets.',
    'problem_sets',
    0,
    'cs50',
  ],
  [
    'clean-stop',
    'Clean Stop',
    'Log a focused long-form session of 15+ watched minutes that ends at a planned limit.',
    'consistency',
    0,
    'shared',
  ],
  [
    'three-deep-sessions',
    'Three Deep Sessions',
    'Log three study sessions of at least 45 minutes each.',
    'consistency',
    0,
    'shared',
  ],
  [
    'bug-hunter',
    'Bug Hunter',
    'Log at least one study session in debugging mode.',
    'debugging',
    0,
    'shared',
  ],
  [
    'final-project-mvp',
    'Final Project MVP',
    'Complete the "Build the project" final-project task.',
    'final_project',
    0,
    'cs50',
  ],
  [
    'final-project-shipped',
    'Final Project Shipped',
    'Complete both the final-project README and the video demo.',
    'final_project',
    0,
    'cs50',
  ],
];

/** CHARACTERIZATION: current rule encoding, recorded for C3 reviewability. */
const characterizedRuleEncoding: Record<string, [string, unknown]> = {
  'browser-builder': ['unit_required_completed', { unitId: 'week-8' }],
  'bug-hunter': [
    'study_session_mode_count',
    { minCount: 1, mode: 'debugging' },
  ],
  'clean-stop': [
    'media_clean_stop',
    { minWatchedSeconds: 900, stopReasons: ['reached_limit'] },
  ],
  'course-complete': ['course_required_completed', {}],
  'data-structure-builder': ['unit_required_completed', { unitId: 'week-5' }],
  'final-project-mvp': ['item_completed', { itemId: 'final-project-build' }],
  'final-project-shipped': [
    'items_all_completed',
    { itemIds: ['final-project-readme', 'final-project-video-demo'] },
  ],
  'first-slice': ['content_slice_completed_count', { minCount: 1 }],
  'first-step': ['first_item_completed', {}],
  'flask-route-maker': ['unit_required_completed', { unitId: 'week-9' }],
  'pointer-survivor': ['unit_required_completed', { unitId: 'week-4' }],
  'pset-chain': [
    'problem_set_status_count',
    { minCount: 3, statuses: ['submitted', 'accepted'] },
  ],
  'python-shift': ['unit_required_completed', { unitId: 'week-6' }],
  'query-builder': ['unit_required_completed', { unitId: 'week-7' }],
  'scratch-initiate': ['unit_required_completed', { unitId: 'week-0' }],
  'three-deep-sessions': [
    'study_session_duration_count',
    { minCount: 3, minMinutes: 45 },
  ],
};

describe('C1 achievement definitions (semantic)', () => {
  it('pins the ordered id, title, description, category and xpReward of all 16', () => {
    expect(
      achievementDefinitions.map((definition) => [
        definition.id,
        definition.title,
        definition.description,
        definition.category,
        definition.xpReward,
      ]),
    ).toEqual(expectedDefinitions.map((row) => row.slice(0, 5)));
  });

  it('records the frozen shared vs CS50-owned split (6 / 10)', () => {
    expect(
      expectedDefinitions
        .filter((row) => row[5] === 'shared')
        .map((row) => row[0]),
    ).toEqual([
      'first-step',
      'first-slice',
      'course-complete',
      'clean-stop',
      'three-deep-sessions',
      'bug-hunter',
    ]);
    expect(expectedDefinitions.filter((row) => row[5] === 'cs50')).toHaveLength(
      10,
    );
  });

  it('shows the same order and count through the RPG badge gallery and Classic view', async () => {
    const context = await createSeededDatabase('achievement-views');
    try {
      const gallery = await loadRpgBadgeGallerySummary({ db: context.db });
      expect(
        gallery.badges.map((badge) => [badge.order, badge.id, badge.title]),
      ).toEqual(
        expectedDefinitions.map((row, index) => [index, row[0], row[1]]),
      );
      expect(gallery.totalBadgeCount).toBe(16);
      expect(gallery.earnedBadgeCount).toBe(0);
      expect(gallery.lockedBadgeCount).toBe(16);

      const classic = await getAchievementsView({ db: context.db });
      expect(classic.achievements.map((achievement) => achievement.id)).toEqual(
        expectedDefinitions.map((row) => row[0]),
      );
      expect(classic.totalCount).toBe(16);
      expect(classic.unlockedCount).toBe(0);
    } finally {
      await context.cleanup();
    }
  });
});

describe('C1 achievement rule encoding (characterization, not semantic)', () => {
  it('records the current ruleType/ruleConfig encoding', () => {
    expect(
      Object.fromEntries(
        achievementDefinitions.map((definition) => [
          definition.id,
          [definition.ruleType, definition.ruleConfig],
        ]),
      ),
    ).toEqual(characterizedRuleEncoding);
    expect(
      new Set(achievementDefinitions.map((definition) => definition.createdAt)),
    ).toEqual(new Set(['2026-01-01T00:00:00.000Z']));
  });
});

type Action =
  | { kind: 'progress'; itemId: string; status: ProgressStatus }
  | { kind: 'media'; input: LogMediaProgressInput }
  | {
      kind: 'session';
      id: string;
      minutes: number;
      mode: StudySessionMode;
    };

type Unlock = { achievementId: string; triggerSourceId: string };

async function apply(
  context: TestDatabaseContext,
  actions: readonly Action[],
  now: () => string,
) {
  for (const action of actions) {
    if (action.kind === 'progress') {
      await upsertProgressAndAwardXp(
        {
          confidence: 3,
          itemId: action.itemId,
          status: action.status,
          ...(action.status === 'submitted' || action.status === 'accepted'
            ? { evidenceText: 'Synthetic C1 submission note.' }
            : {}),
        },
        { policy: cs50Policy, db: context.db, now },
      );
    } else if (action.kind === 'media') {
      await logMediaProgressAndAwardXp(action.input, {
        policy: cs50Policy,
        db: context.db,
        now,
      });
    } else {
      const startedAt = now();
      const session: AddStudySessionInput = {
        durationMinutes: action.minutes,
        endedAt: new Date(
          Date.parse(startedAt) + action.minutes * 60_000,
        ).toISOString(),
        id: action.id,
        itemId: 'week-0-lecture',
        mode: action.mode,
        startedAt,
        unitId: 'week-0',
      };
      await addStudySessionAndAwardXp(session, { db: context.db, now });
    }
  }
}

async function unlocksAfter(label: string, actions: readonly Action[]) {
  const context = await createSeededDatabase(`unlock-${label}`);
  const now = createIncrementingClock('2026-09-19T14:00:00.000Z', 60_000);
  try {
    await apply(context, actions, now);
    const unlocks = await listAchievementUnlocks({ db: context.db });

    for (const unlock of unlocks) {
      expect(unlock.id).toBe(deriveAchievementUnlockId(unlock.achievementId));
      expect(unlock.id).toBe(`unlock-${unlock.achievementId}`);
    }

    // Re-evaluation through another real mutation path unlocks nothing new.
    const reEvaluation = await upsertProgressAndAwardXp(
      { confidence: 1, itemId: 'week-2-shorts', status: 'started' },
      { policy: cs50Policy, db: context.db, now },
    );
    expect(reEvaluation.unlockedAchievements).toEqual([]);
    expect(await listAchievementUnlocks({ db: context.db })).toEqual(unlocks);

    const events = await listMediaProgressEvents(undefined, { db: context.db });
    const slices = await listContentSlices(undefined, { db: context.db });

    return {
      completedSliceIds: slices
        .filter((slice) => slice.status === 'completed')
        .map((slice) => slice.id),
      eventIds: events.map((event) => event.id),
      unlocks: unlocks
        .map(
          (unlock): Unlock => ({
            achievementId: unlock.achievementId,
            triggerSourceId: unlock.triggerSourceId,
          }),
        )
        .sort((left, right) =>
          left.achievementId.localeCompare(right.achievementId),
        ),
    };
  } finally {
    await context.cleanup();
  }
}

function completeUnit(unitItemIds: readonly string[]): Action[] {
  return unitItemIds.map((itemId) => ({
    itemId,
    kind: 'progress',
    status: 'completed',
  }));
}

function media(
  startSecond: number,
  endSecond: number,
  stoppedBecause: LogMediaProgressInput['stoppedBecause'],
): Action {
  return {
    input: {
      assetId: 'week-0-lecture-asset',
      endSecond,
      energyAfter: 3,
      energyBefore: 3,
      startSecond,
      stoppedBecause,
    },
    kind: 'media',
  };
}

const requiredCs50Items = [
  'week-0-lecture',
  'week-0-problem-set',
  'week-1-lecture',
  'week-1-problem-set',
  'week-2-lecture',
  'week-2-problem-set',
  'week-3-lecture',
  'week-3-problem-set',
  'week-4-lecture',
  'week-4-problem-set',
  'week-5-lecture',
  'week-5-problem-set',
  'week-6-lecture',
  'week-6-problem-set',
  'week-7-lecture',
  'week-7-problem-set',
  'week-8-lecture',
  'week-8-problem-set',
  'week-9-lecture',
  'week-9-problem-set',
  'week-10-lecture',
  'final-project-build',
  'final-project-video-demo',
  'final-project-readme',
  'final-project-submit50',
  'final-project-gradebook-check',
];

const weekAchievements: ReadonlyArray<[string, string]> = [
  ['scratch-initiate', 'week-0'],
  ['pointer-survivor', 'week-4'],
  ['data-structure-builder', 'week-5'],
  ['python-shift', 'week-6'],
  ['query-builder', 'week-7'],
  ['browser-builder', 'week-8'],
  ['flask-route-maker', 'week-9'],
];

describe('C1 achievement unlock behaviour over the real catalogue (semantic)', () => {
  it('first-step: first completed task; a started task is not enough', async () => {
    expect(
      (
        await unlocksAfter('first-step-yes', [
          { itemId: 'week-0-lecture', kind: 'progress', status: 'completed' },
        ])
      ).unlocks,
    ).toEqual([
      { achievementId: 'first-step', triggerSourceId: 'week-0-lecture' },
    ]);
    expect(
      (
        await unlocksAfter('first-step-no', [
          { itemId: 'week-0-lecture', kind: 'progress', status: 'started' },
        ])
      ).unlocks,
    ).toEqual([]);
  });

  it('first-slice: first fully covered slice; one second short is not enough', async () => {
    const yes = await unlocksAfter('first-slice-yes', [
      media(0, 1200, 'completed_slice'),
    ]);
    expect(yes.completedSliceIds).toEqual(['week-0-lecture-asset-slice-1']);
    expect(yes.unlocks).toEqual([
      {
        achievementId: 'first-slice',
        triggerSourceId: 'week-0-lecture-asset-slice-1',
      },
    ]);
    const no = await unlocksAfter('first-slice-no', [
      media(0, 1199, 'completed_slice'),
    ]);
    expect(no.completedSliceIds).toEqual([]);
    expect(no.unlocks).toEqual([]);
  });

  it('clean-stop: 900 watched seconds ending at a planned limit; 899 is not enough', async () => {
    const yes = await unlocksAfter('clean-stop-yes', [
      media(0, 900, 'reached_limit'),
    ]);
    expect(yes.eventIds).toHaveLength(1);
    expect(yes.unlocks).toEqual([
      { achievementId: 'clean-stop', triggerSourceId: yes.eventIds[0] },
    ]);
    expect(
      (await unlocksAfter('clean-stop-no', [media(0, 899, 'reached_limit')]))
        .unlocks,
    ).toEqual([]);
    expect(
      (await unlocksAfter('clean-stop-reason', [media(0, 900, 'interruption')]))
        .unlocks,
    ).toEqual([]);
  });

  it('three-deep-sessions: three sessions of 45 minutes; a 44-minute third is not enough', async () => {
    expect(
      (
        await unlocksAfter('deep-yes', [
          { id: 'c1-session-a', kind: 'session', minutes: 45, mode: 'coding' },
          { id: 'c1-session-b', kind: 'session', minutes: 45, mode: 'coding' },
          { id: 'c1-session-c', kind: 'session', minutes: 45, mode: 'coding' },
        ])
      ).unlocks,
    ).toEqual([
      {
        achievementId: 'three-deep-sessions',
        triggerSourceId: 'c1-session-a-c1-session-b-c1-session-c',
      },
    ]);
    expect(
      (
        await unlocksAfter('deep-no', [
          { id: 'c1-session-a', kind: 'session', minutes: 45, mode: 'coding' },
          { id: 'c1-session-b', kind: 'session', minutes: 45, mode: 'coding' },
          { id: 'c1-session-c', kind: 'session', minutes: 44, mode: 'coding' },
        ])
      ).unlocks,
    ).toEqual([]);
  });

  it('bug-hunter: one debugging session; a coding session is not enough', async () => {
    expect(
      (
        await unlocksAfter('bug-yes', [
          {
            id: 'c1-session-debug',
            kind: 'session',
            minutes: 20,
            mode: 'debugging',
          },
        ])
      ).unlocks,
    ).toEqual([
      { achievementId: 'bug-hunter', triggerSourceId: 'c1-session-debug' },
    ]);
    expect(
      (
        await unlocksAfter('bug-no', [
          {
            id: 'c1-session-code',
            kind: 'session',
            minutes: 20,
            mode: 'coding',
          },
        ])
      ).unlocks,
    ).toEqual([]);
  });

  for (const [achievementId, unitId] of weekAchievements) {
    it(`${achievementId}: every required item of ${unitId}; one missing is not enough`, async () => {
      const required = requiredCs50Items.filter((itemId) =>
        itemId.startsWith(`${unitId}-`),
      );
      expect(required).toEqual([`${unitId}-lecture`, `${unitId}-problem-set`]);

      expect(
        (await unlocksAfter(`${achievementId}-yes`, completeUnit(required)))
          .unlocks,
      ).toEqual(
        [
          { achievementId, triggerSourceId: unitId },
          { achievementId: 'first-step', triggerSourceId: `${unitId}-lecture` },
        ].sort((left, right) =>
          left.achievementId.localeCompare(right.achievementId),
        ),
      );
      expect(
        (
          await unlocksAfter(
            `${achievementId}-no`,
            completeUnit(required.slice(0, 1)),
          )
        ).unlocks,
      ).toEqual([
        { achievementId: 'first-step', triggerSourceId: `${unitId}-lecture` },
      ]);
    });
  }

  it('pset-chain: three submitted/accepted problem sets; two is not enough', async () => {
    const psets = [
      'week-0-problem-set',
      'week-1-problem-set',
      'week-2-problem-set',
    ];
    expect(
      (
        await unlocksAfter('pset-yes', [
          { itemId: psets[0]!, kind: 'progress', status: 'submitted' },
          { itemId: psets[1]!, kind: 'progress', status: 'accepted' },
          { itemId: psets[2]!, kind: 'progress', status: 'submitted' },
        ])
      ).unlocks,
    ).toEqual([
      { achievementId: 'first-step', triggerSourceId: 'week-0-problem-set' },
      {
        achievementId: 'pset-chain',
        triggerSourceId:
          'week-0-problem-set-week-1-problem-set-week-2-problem-set',
      },
    ]);
    expect(
      (
        await unlocksAfter('pset-no', [
          { itemId: psets[0]!, kind: 'progress', status: 'submitted' },
          { itemId: psets[1]!, kind: 'progress', status: 'accepted' },
          { itemId: psets[2]!, kind: 'progress', status: 'completed' },
        ])
      ).unlocks,
    ).toEqual([
      { achievementId: 'first-step', triggerSourceId: 'week-0-problem-set' },
    ]);
  });

  it('final-project-mvp: the build task completed; started is not enough', async () => {
    expect(
      (
        await unlocksAfter('mvp-yes', [
          {
            itemId: 'final-project-build',
            kind: 'progress',
            status: 'completed',
          },
        ])
      ).unlocks,
    ).toEqual([
      {
        achievementId: 'final-project-mvp',
        triggerSourceId: 'final-project-build',
      },
      { achievementId: 'first-step', triggerSourceId: 'final-project-build' },
    ]);
    expect(
      (
        await unlocksAfter('mvp-no', [
          {
            itemId: 'final-project-build',
            kind: 'progress',
            status: 'started',
          },
        ])
      ).unlocks,
    ).toEqual([]);
  });

  it('final-project-shipped: README and demo; README alone is not enough', async () => {
    expect(
      (
        await unlocksAfter('shipped-yes', [
          {
            itemId: 'final-project-readme',
            kind: 'progress',
            status: 'completed',
          },
          {
            itemId: 'final-project-video-demo',
            kind: 'progress',
            status: 'completed',
          },
        ])
      ).unlocks,
    ).toEqual([
      {
        achievementId: 'final-project-shipped',
        triggerSourceId: 'final-project-readme-final-project-video-demo',
      },
      { achievementId: 'first-step', triggerSourceId: 'final-project-readme' },
    ]);
    expect(
      (
        await unlocksAfter('shipped-no', [
          {
            itemId: 'final-project-readme',
            kind: 'progress',
            status: 'completed',
          },
        ])
      ).unlocks,
    ).toEqual([
      { achievementId: 'first-step', triggerSourceId: 'final-project-readme' },
    ]);
  });

  it('course-complete: all 26 required items; one missing required item is not enough', async () => {
    const earnedAlongside: Unlock[] = [
      ...weekAchievements.map(([achievementId, unitId]) => ({
        achievementId,
        triggerSourceId: unitId,
      })),
      {
        achievementId: 'final-project-mvp',
        triggerSourceId: 'final-project-build',
      },
      {
        achievementId: 'final-project-shipped',
        triggerSourceId: 'final-project-readme-final-project-video-demo',
      },
      // Unlocks persist the trigger of the moment they were first satisfied:
      // `week-0-lecture` is the first item completed in this sequence, even
      // though `final-project-build` sorts first in the final state.
      { achievementId: 'first-step', triggerSourceId: 'week-0-lecture' },
    ];
    const sortUnlocks = (unlocks: Unlock[]) =>
      unlocks.sort((left, right) =>
        left.achievementId.localeCompare(right.achievementId),
      );

    expect(
      (await unlocksAfter('course-yes', completeUnit(requiredCs50Items)))
        .unlocks,
    ).toEqual(
      sortUnlocks([
        ...earnedAlongside,
        { achievementId: 'course-complete', triggerSourceId: 'cs50x-2026' },
      ]),
    );
    expect(
      (
        await unlocksAfter(
          'course-no',
          completeUnit(
            requiredCs50Items.filter(
              (itemId) => itemId !== 'final-project-gradebook-check',
            ),
          ),
        )
      ).unlocks,
    ).toEqual(sortUnlocks([...earnedAlongside]));
  });
});
