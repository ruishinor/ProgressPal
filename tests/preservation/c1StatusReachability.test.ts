import { describe, expect, it } from 'vitest';

import { getCourseProgressStatusOptions } from '@/features/course/detailModel';
import { loadRpgStudyResourceSummary } from '@/features/rpg';
import { logMediaProgress } from '@/lib/db';
import type { CourseItemType, ProgressStatus } from '@/lib/domain';
import { bundledCourseSeed } from '@/seed';

import { createIncrementingClock, createSeededDatabase } from './c1Support';

/**
 * Epic C / C1 evidence area 2 — statuses offered to the learner.
 *
 * Family: SEMANTIC ORACLE (the offered statuses and their labels). The
 * configuration shape that C3 will introduce for the submission workflow is
 * NOT frozen here. Authority: the real option producer
 * `getCourseProgressStatusOptions` (src/features/course/detailModel.ts), which
 * both shells use:
 *
 * - Classic content detail calls it without `correction` (status sequence);
 * - RPG resource calls it with `correction: false` and, behind its "Correct
 *   status" toggle, with `correction: true`; RPG "Mark locally complete" saves
 *   `completed` through the same `validateCourseDetailProgressForm`, so it can
 *   only succeed when `completed` is offered.
 *
 * Owner after C3: the submission-workflow item types (and the correction-path
 * asymmetry) become CS50 progress/completion configuration; the status model
 * and labels stay shared (C0 contract sections 4b and 4d).
 *
 * Reachability is derived by closing over the real producer from
 * `not_started`; it is never read from the ProgressStatus enum.
 */

type State = ProgressStatus | 'not_started';
type Combination = { itemType: CourseItemType; required: boolean };

const sequenceRequired = {
  blocked: ['blocked', 'started', 'completed'],
  not_started: ['started', 'blocked', 'completed'],
  started: ['started', 'blocked', 'completed'],
} as const;
const sequenceOptional = {
  blocked: ['blocked', 'started', 'completed', 'skipped_optional'],
  not_started: ['started', 'blocked', 'completed', 'skipped_optional'],
  skipped_optional: ['skipped_optional', 'started', 'completed'],
  started: ['started', 'blocked', 'completed', 'skipped_optional'],
} as const;

/** Expected sequence options per reachable state (semantic table). */
const expectedSequence: Record<
  string,
  Partial<Record<State, readonly string[]>>
> = {
  'lecture|required': { ...sequenceRequired, completed: ['completed'] },
  'lecture|optional': { ...sequenceOptional, completed: ['completed'] },
  'shorts|optional': { ...sequenceOptional, completed: ['completed'] },
  'section|optional': { ...sequenceOptional, completed: ['completed'] },
  'reading|optional': { ...sequenceOptional, completed: ['completed'] },
  'practice|optional': { ...sequenceOptional, completed: ['completed'] },
  'project_task|required': { ...sequenceRequired, completed: ['completed'] },
  'problem_set|required': {
    ...sequenceRequired,
    accepted: ['accepted'],
    completed: ['completed', 'submitted', 'accepted'],
    submitted: ['submitted', 'accepted'],
  },
  // `lab` is not in the CS50 seed; kept to pin the X-2 asymmetry.
  'lab|required': {
    ...sequenceRequired,
    accepted: ['accepted'],
    completed: ['completed', 'submitted', 'accepted'],
    submitted: ['submitted', 'accepted'],
  },
  'lab|optional': {
    ...sequenceOptional,
    accepted: ['accepted'],
    completed: ['completed', 'submitted', 'accepted'],
    submitted: ['submitted', 'accepted'],
  },
};

/** Expected RPG correction options (independent of the saved state). */
const expectedCorrection: Record<string, string[]> = {
  'lecture|required': ['started', 'blocked', 'completed'],
  'lecture|optional': ['started', 'blocked', 'completed', 'skipped_optional'],
  'shorts|optional': ['started', 'blocked', 'completed', 'skipped_optional'],
  'section|optional': ['started', 'blocked', 'completed', 'skipped_optional'],
  'reading|optional': ['started', 'blocked', 'completed', 'skipped_optional'],
  'practice|optional': ['started', 'blocked', 'completed', 'skipped_optional'],
  'project_task|required': ['started', 'blocked', 'completed'],
  'problem_set|required': [
    'started',
    'blocked',
    'completed',
    'submitted',
    'accepted',
  ],
  // X-2: `lab` keeps submitted/accepted in the sequence but not in correction.
  'lab|required': ['started', 'blocked', 'completed'],
  'lab|optional': ['started', 'blocked', 'completed', 'skipped_optional'],
};

const expectedReachable: Record<string, State[]> = {
  'lecture|required': ['not_started', 'started', 'blocked', 'completed'],
  'lecture|optional': [
    'not_started',
    'started',
    'blocked',
    'completed',
    'skipped_optional',
  ],
  'shorts|optional': [
    'not_started',
    'started',
    'blocked',
    'completed',
    'skipped_optional',
  ],
  'section|optional': [
    'not_started',
    'started',
    'blocked',
    'completed',
    'skipped_optional',
  ],
  'reading|optional': [
    'not_started',
    'started',
    'blocked',
    'completed',
    'skipped_optional',
  ],
  'practice|optional': [
    'not_started',
    'started',
    'blocked',
    'completed',
    'skipped_optional',
  ],
  'project_task|required': ['not_started', 'started', 'blocked', 'completed'],
  'problem_set|required': [
    'not_started',
    'started',
    'blocked',
    'completed',
    'submitted',
    'accepted',
  ],
  'lab|required': [
    'not_started',
    'started',
    'blocked',
    'completed',
    'submitted',
    'accepted',
  ],
  'lab|optional': [
    'not_started',
    'started',
    'blocked',
    'completed',
    'submitted',
    'accepted',
    'skipped_optional',
  ],
};

const expectedLabels: Record<string, string> = {
  accepted: 'Accepted',
  blocked: 'Blocked',
  completed: 'Completed',
  skipped_optional: 'Skipped optional',
  started: 'Started',
  submitted: 'Submitted',
};

function key({ itemType, required }: Combination) {
  return `${itemType}|${required ? 'required' : 'optional'}`;
}

function offered(
  combination: Combination,
  currentStatus: State,
  correction = false,
) {
  return getCourseProgressStatusOptions({
    correction,
    currentStatus,
    itemType: combination.itemType,
    longFormProgress: null,
    required: combination.required,
  });
}

/** Closure over the real producer; `rpg` adds the correction transitions. */
function reachable(combination: Combination, rpg: boolean): State[] {
  const seen = new Set<State>(['not_started']);
  const queue: State[] = ['not_started'];

  while (queue.length > 0) {
    const state = queue.shift()!;
    const next = [
      ...offered(combination, state),
      ...(rpg ? offered(combination, state, true) : []),
    ].map((option) => option.value);

    for (const status of next) {
      if (!seen.has(status)) {
        seen.add(status);
        queue.push(status);
      }
    }
  }

  return [...seen];
}

const seedCombinations: Combination[] = [
  ...new Map(
    bundledCourseSeed.units
      .flatMap((unit) => unit.items)
      .map((item) => [
        `${item.type}|${item.required}`,
        { itemType: item.type, required: item.required },
      ]),
  ).values(),
];
const labCombinations: Combination[] = [
  { itemType: 'lab', required: true },
  { itemType: 'lab', required: false },
];

describe('C1 statuses offered per item type (semantic)', () => {
  it('covers exactly the item-type x required combinations of the CS50 seed', () => {
    expect(seedCombinations.map(key).sort()).toEqual(
      [
        'lecture|optional',
        'lecture|required',
        'practice|optional',
        'problem_set|required',
        'project_task|required',
        'reading|optional',
        'section|optional',
        'shorts|optional',
      ].sort(),
    );
  });

  for (const combination of [...seedCombinations, ...labCombinations]) {
    const name = key(combination);

    it(`offers the frozen sequence statuses for ${name}`, () => {
      for (const [state, statuses] of Object.entries(expectedSequence[name]!)) {
        const options = offered(combination, state as State);
        expect(
          options.map((option) => option.value),
          `${name} ${state}`,
        ).toEqual(statuses);
        expect(
          options.map((option) => option.label),
          `${name} ${state} labels`,
        ).toEqual(statuses.map((status) => expectedLabels[status]));
      }
    });

    it(`offers the frozen RPG correction statuses for ${name}`, () => {
      for (const state of expectedReachable[name]!) {
        expect(
          offered(combination, state, true).map((option) => option.value),
          `${name} correction from ${state}`,
        ).toEqual(expectedCorrection[name]);
      }
    });

    it(`reaches the frozen status set for ${name} in both shells`, () => {
      expect(reachable(combination, false).sort()).toEqual(
        [...expectedReachable[name]!].sort(),
      );
      expect(reachable(combination, true).sort()).toEqual(
        [...expectedReachable[name]!].sort(),
      );
    });
  }

  it('withholds completion for a long-form item with partial media history (real RPG resource summary)', async () => {
    const context = await createSeededDatabase('reachability-long-form');
    try {
      await logMediaProgress(
        {
          assetId: 'week-0-lecture-asset',
          endSecond: 300,
          energyAfter: 3,
          energyBefore: 3,
          startSecond: 0,
          stoppedBecause: 'interruption',
        },
        { db: context.db, now: createIncrementingClock() },
      );
      const summary = await loadRpgStudyResourceSummary('week-0-lecture', {
        db: context.db,
      });

      expect(summary).not.toBeNull();
      expect(summary!.progressStatus).toBe('started');
      expect(summary!.longFormProgress?.isComplete).toBe(false);

      const context_ = {
        currentStatus: summary!.progressStatus,
        itemType: summary!.itemType,
        longFormProgress: summary!.longFormProgress,
        required: summary!.required,
      };
      expect(
        getCourseProgressStatusOptions(context_).map((option) => option.value),
      ).toEqual(['started', 'blocked']);
      expect(
        getCourseProgressStatusOptions({ ...context_, correction: true }).map(
          (option) => option.value,
        ),
      ).toEqual(['started', 'blocked']);
    } finally {
      await context.cleanup();
    }
  });
});
