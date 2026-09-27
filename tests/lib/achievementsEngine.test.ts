import { describe, expect, it } from 'vitest';

import {
  deriveAchievementUnlockId,
  evaluateAchievements,
  type AchievementEvaluationContext,
} from '@/lib/achievements';
import type {
  ContentSlice,
  CourseItem,
  CourseUnit,
  MediaProgressEvent,
  ProgressEntry,
  ProgressStatus,
  StudySession,
} from '@/lib/domain';

import { cs50Policy } from '../programmes/cs50Policy';

const timestamp = '2026-06-12T20:00:00.000Z';

function item(
  id: string,
  unitId: string,
  type: CourseItem['type'] = 'lecture',
  required = true,
): CourseItem {
  return {
    id,
    unitId,
    type,
    title: `Item ${id}`,
    required,
    estimatedMinutes: 30,
    order: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function unit(
  id: string,
  type: CourseUnit['type'] = 'week',
  required = true,
): CourseUnit {
  return {
    id,
    courseId: 'cs50x-2026',
    title: `Unit ${id}`,
    order: 0,
    type,
    sourceYear: 2026,
    required,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function progress(itemId: string, status: ProgressStatus): ProgressEntry {
  return {
    id: `progress-${itemId}`,
    itemId,
    status,
    confidence: 3,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function slice(id: string, status: ContentSlice['status']): ContentSlice {
  return {
    id,
    assetId: 'asset-1',
    itemId: 'item-1',
    order: 0,
    label: 'Slice',
    startSecond: 0,
    endSecond: 600,
    plannedMinutes: 10,
    status,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function mediaEvent(
  id: string,
  watchedSeconds: number,
  stoppedBecause: MediaProgressEvent['stoppedBecause'],
): MediaProgressEvent {
  return {
    id,
    itemId: 'item-1',
    assetId: 'asset-1',
    startSecond: 0,
    endSecond: watchedSeconds,
    watchedSeconds,
    completedSlice: false,
    stoppedBecause,
    energyBefore: 3,
    energyAfter: 3,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function session(
  id: string,
  durationMinutes: number,
  mode: StudySession['mode'],
): StudySession {
  return {
    id,
    unitId: 'week-0',
    itemId: 'item-1',
    startedAt: timestamp,
    endedAt: timestamp,
    durationMinutes,
    mode,
    blockers: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const emptyContext: AchievementEvaluationContext = {
  courseUnits: [],
  courseItems: [],
  progressEntries: [],
  contentSlices: [],
  mediaProgressEvents: [],
  studySessions: [],
};

function contextWith(
  overrides: Partial<AchievementEvaluationContext>,
): AchievementEvaluationContext {
  return { ...emptyContext, ...overrides };
}

function idsFrom(context: AchievementEvaluationContext): string[] {
  return evaluateAchievements(cs50Policy.achievements, context).map(
    (entry) => entry.achievementId,
  );
}

describe('deriveAchievementUnlockId', () => {
  it('prefixes kebab-case achievement ids deterministically', () => {
    expect(deriveAchievementUnlockId('first-step')).toBe('unlock-first-step');
    expect(deriveAchievementUnlockId('first-step')).toBe(
      deriveAchievementUnlockId('first-step'),
    );
  });
});

describe('evaluateAchievements - empty source data', () => {
  it('returns no satisfied achievements for an empty context', () => {
    expect(evaluateAchievements(cs50Policy.achievements, emptyContext)).toEqual(
      [],
    );
  });
});

describe('first_item_completed', () => {
  it('is not satisfied while no item is complete', () => {
    const context = contextWith({
      progressEntries: [progress('week-0-lecture', 'started')],
    });
    expect(idsFrom(context)).not.toContain('first-step');
  });

  it('unlocks once any item is complete, with a deterministic trigger', () => {
    const context = contextWith({
      progressEntries: [
        progress('week-0-problem-set', 'submitted'),
        progress('week-0-lecture', 'completed'),
      ],
    });
    const satisfied = evaluateAchievements(
      cs50Policy.achievements,
      context,
    ).find((entry) => entry.achievementId === 'first-step');
    expect(satisfied).toBeDefined();
    // Lexicographically smallest completed item id wins, independent of order.
    expect(satisfied?.triggerSourceId).toBe('week-0-lecture');
  });
});

describe('unit_required_completed', () => {
  it('requires every required item of the unit to be complete', () => {
    const notDone = contextWith({
      courseUnits: [unit('week-0')],
      courseItems: [
        item('week-0-lecture', 'week-0'),
        item('week-0-problem-set', 'week-0', 'problem_set'),
        item('week-0-shorts', 'week-0', 'shorts', false),
      ],
      progressEntries: [progress('week-0-lecture', 'completed')],
    });
    expect(idsFrom(notDone)).not.toContain('scratch-initiate');

    const done = contextWith({
      courseUnits: [unit('week-0')],
      courseItems: [
        item('week-0-lecture', 'week-0'),
        item('week-0-problem-set', 'week-0', 'problem_set'),
        item('week-0-shorts', 'week-0', 'shorts', false),
      ],
      progressEntries: [
        progress('week-0-lecture', 'completed'),
        progress('week-0-problem-set', 'accepted'),
      ],
    });
    const satisfied = evaluateAchievements(cs50Policy.achievements, done).find(
      (entry) => entry.achievementId === 'scratch-initiate',
    );
    expect(satisfied?.triggerSourceId).toBe('week-0');
  });
});

describe('course_required_completed', () => {
  it('unlocks only when every required unit is fully complete', () => {
    const courseUnits = [unit('week-4'), unit('week-5')];
    const courseItems = [
      item('week-4-lecture', 'week-4'),
      item('week-5-lecture', 'week-5'),
    ];

    const partial = contextWith({
      courseUnits,
      courseItems,
      progressEntries: [progress('week-4-lecture', 'completed')],
    });
    expect(idsFrom(partial)).not.toContain('course-complete');

    const full = contextWith({
      courseUnits,
      courseItems,
      progressEntries: [
        progress('week-4-lecture', 'completed'),
        progress('week-5-lecture', 'completed'),
      ],
    });
    const satisfied = evaluateAchievements(cs50Policy.achievements, full).find(
      (entry) => entry.achievementId === 'course-complete',
    );
    expect(satisfied?.triggerSourceId).toBe('cs50x-2026');
    // The two single-required-item weeks also satisfy their unit achievements.
    expect(idsFrom(full)).toEqual(
      expect.arrayContaining([
        'course-complete',
        'data-structure-builder',
        'pointer-survivor',
      ]),
    );
  });
});

describe('item_completed and items_all_completed', () => {
  it('unlocks final-project-mvp on the build task', () => {
    const context = contextWith({
      progressEntries: [progress('final-project-build', 'completed')],
    });
    const satisfied = evaluateAchievements(
      cs50Policy.achievements,
      context,
    ).find((entry) => entry.achievementId === 'final-project-mvp');
    expect(satisfied?.triggerSourceId).toBe('final-project-build');
  });

  it('requires both items for final-project-shipped with a stable composite trigger', () => {
    const onlyOne = contextWith({
      progressEntries: [progress('final-project-readme', 'completed')],
    });
    expect(idsFrom(onlyOne)).not.toContain('final-project-shipped');

    const both = contextWith({
      progressEntries: [
        progress('final-project-video-demo', 'completed'),
        progress('final-project-readme', 'completed'),
      ],
    });
    const satisfied = evaluateAchievements(cs50Policy.achievements, both).find(
      (entry) => entry.achievementId === 'final-project-shipped',
    );
    expect(satisfied?.triggerSourceId).toBe(
      'final-project-readme-final-project-video-demo',
    );
  });
});

describe('item_type_status_count (pset-chain, problem_set)', () => {
  it('unlocks pset-chain only at three submitted/accepted problem sets', () => {
    const courseItems = [
      item('week-0-problem-set', 'week-0', 'problem_set'),
      item('week-1-problem-set', 'week-1', 'problem_set'),
      item('week-2-problem-set', 'week-2', 'problem_set'),
    ];

    const two = contextWith({
      courseItems,
      progressEntries: [
        progress('week-0-problem-set', 'submitted'),
        progress('week-1-problem-set', 'accepted'),
      ],
    });
    expect(idsFrom(two)).not.toContain('pset-chain');

    const three = contextWith({
      courseItems,
      progressEntries: [
        progress('week-0-problem-set', 'submitted'),
        progress('week-1-problem-set', 'accepted'),
        progress('week-2-problem-set', 'submitted'),
      ],
    });
    const satisfied = evaluateAchievements(cs50Policy.achievements, three).find(
      (entry) => entry.achievementId === 'pset-chain',
    );
    expect(satisfied?.triggerSourceId).toBe(
      'week-0-problem-set-week-1-problem-set-week-2-problem-set',
    );
  });

  it('ignores non-problem-set items even with a matching status', () => {
    const context = contextWith({
      courseItems: [
        item('week-0-lecture', 'week-0', 'lecture'),
        item('week-1-lecture', 'week-1', 'lecture'),
        item('week-2-lecture', 'week-2', 'lecture'),
      ],
      progressEntries: [
        progress('week-0-lecture', 'submitted'),
        progress('week-1-lecture', 'submitted'),
        progress('week-2-lecture', 'submitted'),
      ],
    });
    expect(idsFrom(context)).not.toContain('pset-chain');
  });
});

describe('content_slice_completed_count', () => {
  it('unlocks first-slice on the first completed slice', () => {
    const none = contextWith({
      contentSlices: [slice('asset-1-slice-0', 'active')],
    });
    expect(idsFrom(none)).not.toContain('first-slice');

    const one = contextWith({
      contentSlices: [
        slice('asset-1-slice-1', 'completed'),
        slice('asset-1-slice-0', 'active'),
      ],
    });
    const satisfied = evaluateAchievements(cs50Policy.achievements, one).find(
      (entry) => entry.achievementId === 'first-slice',
    );
    expect(satisfied?.triggerSourceId).toBe('asset-1-slice-1');
  });
});

describe('media_clean_stop', () => {
  it('requires both the watched threshold and an allowed stop reason', () => {
    const tooShort = contextWith({
      mediaProgressEvents: [mediaEvent('media-event-1', 600, 'reached_limit')],
    });
    expect(idsFrom(tooShort)).not.toContain('clean-stop');

    const wrongReason = contextWith({
      mediaProgressEvents: [mediaEvent('media-event-1', 900, 'interruption')],
    });
    expect(idsFrom(wrongReason)).not.toContain('clean-stop');

    const clean = contextWith({
      mediaProgressEvents: [mediaEvent('media-event-1', 900, 'reached_limit')],
    });
    const satisfied = evaluateAchievements(cs50Policy.achievements, clean).find(
      (entry) => entry.achievementId === 'clean-stop',
    );
    expect(satisfied?.triggerSourceId).toBe('media-event-1');
  });
});

describe('study_session_duration_count', () => {
  it('unlocks three-deep-sessions at three 45+ minute sessions', () => {
    const two = contextWith({
      studySessions: [
        session('study-session-a', 45, 'coding'),
        session('study-session-b', 60, 'reading'),
      ],
    });
    expect(idsFrom(two)).not.toContain('three-deep-sessions');

    const three = contextWith({
      studySessions: [
        session('study-session-a', 45, 'coding'),
        session('study-session-b', 60, 'reading'),
        session('study-session-c', 50, 'watching'),
        session('study-session-short', 20, 'coding'),
      ],
    });
    const satisfied = evaluateAchievements(cs50Policy.achievements, three).find(
      (entry) => entry.achievementId === 'three-deep-sessions',
    );
    expect(satisfied?.triggerSourceId).toBe(
      'study-session-a-study-session-b-study-session-c',
    );
  });
});

describe('study_session_mode_count', () => {
  it('unlocks bug-hunter on the first debugging session', () => {
    const none = contextWith({
      studySessions: [session('study-session-a', 30, 'coding')],
    });
    expect(idsFrom(none)).not.toContain('bug-hunter');

    const debugging = contextWith({
      studySessions: [session('study-session-debug', 30, 'debugging')],
    });
    const satisfied = evaluateAchievements(
      cs50Policy.achievements,
      debugging,
    ).find((entry) => entry.achievementId === 'bug-hunter');
    expect(satisfied?.triggerSourceId).toBe('study-session-debug');
  });
});

describe('determinism and idempotency', () => {
  it('returns an identical satisfied set (and order) on re-evaluation', () => {
    const context = contextWith({
      courseUnits: [unit('week-0')],
      courseItems: [item('week-0-lecture', 'week-0')],
      progressEntries: [progress('week-0-lecture', 'completed')],
      studySessions: [session('study-session-debug', 30, 'debugging')],
    });

    const first = evaluateAchievements(cs50Policy.achievements, context);
    const second = evaluateAchievements(cs50Policy.achievements, context);

    expect(first).toEqual(second);
    // Sorted by achievement id. week-0 is the only required unit and it is fully
    // complete, so the course-wide achievement fires alongside the unit one.
    expect(first.map((entry) => entry.achievementId)).toEqual([
      'bug-hunter',
      'course-complete',
      'first-step',
      'scratch-initiate',
    ]);
  });
});
