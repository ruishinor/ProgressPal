import { describe, expect, it } from 'vitest';

import { buildCourseMap } from '@/features/course/model';
import type { CourseLongFormProgress } from '@/features/progress';
import {
  buildDashboardModel,
  type DashboardModelInput,
} from '@/features/dashboard/model';
import type { AchievementsView, AchievementView } from '@/lib/db';
import type {
  CourseItem,
  CourseUnit,
  MediaProgressEvent,
  ProgressEntry,
  ResumePoint,
  StudySession,
  XpTransaction,
} from '@/lib/domain';
import { calculateXpSummary } from '@/lib/xp/engine';

const TS = '2026-06-01T00:00:00.000Z';

// --- domain fixture factories (plain, schema-shaped, no Dexie) -------------

function unit(
  overrides: Partial<CourseUnit> & Pick<CourseUnit, 'id'>,
): CourseUnit {
  return {
    courseId: 'cs50x-2026',
    createdAt: TS,
    order: 0,
    required: true,
    sourceYear: 2026,
    title: overrides.id,
    type: 'week',
    updatedAt: TS,
    ...overrides,
  };
}

function item(
  overrides: Partial<CourseItem> & Pick<CourseItem, 'id' | 'unitId'>,
): CourseItem {
  return {
    createdAt: TS,
    estimatedMinutes: 60,
    order: 0,
    required: true,
    title: overrides.id,
    type: 'lecture',
    updatedAt: TS,
    ...overrides,
  };
}

function progress(
  overrides: Partial<ProgressEntry> &
    Pick<ProgressEntry, 'id' | 'itemId' | 'status'>,
): ProgressEntry {
  return {
    confidence: 1,
    createdAt: TS,
    updatedAt: TS,
    ...overrides,
  };
}

function session(
  overrides: Partial<StudySession> & Pick<StudySession, 'id' | 'itemId'>,
): StudySession {
  return {
    blockers: [],
    createdAt: TS,
    durationMinutes: 30,
    endedAt: '2026-06-10T09:00:00.000Z',
    mode: 'coding',
    startedAt: '2026-06-10T08:00:00.000Z',
    unitId: 'week-0',
    updatedAt: TS,
    ...overrides,
  };
}

function mediaEvent(
  overrides: Partial<MediaProgressEvent> &
    Pick<MediaProgressEvent, 'id' | 'itemId'>,
): MediaProgressEvent {
  return {
    assetId: `${overrides.itemId}-asset`,
    completedSlice: false,
    createdAt: '2026-06-09T08:00:00.000Z',
    endSecond: 600,
    energyAfter: 3,
    energyBefore: 4,
    startSecond: 0,
    stoppedBecause: 'reached_limit',
    updatedAt: TS,
    watchedSeconds: 600,
    ...overrides,
  };
}

function xpTx(
  overrides: Partial<XpTransaction> & Pick<XpTransaction, 'id'>,
): XpTransaction {
  return {
    awardedAt: '2026-06-12T08:00:00.000Z',
    createdAt: TS,
    reason: 'Earned XP',
    sourceId: overrides.id,
    sourceType: 'study_session',
    updatedAt: TS,
    xp: 10,
    ...overrides,
  };
}

function resumePoint(
  overrides: Partial<ResumePoint> & Pick<ResumePoint, 'id' | 'itemId'>,
): ResumePoint {
  return {
    assetId: `${overrides.itemId}-asset`,
    createdAt: TS,
    lastSecond: 1200,
    updatedAt: TS,
    updatedFromEventId: 'media-event-1',
    ...overrides,
  };
}

function longForm(
  overrides: Partial<CourseLongFormProgress> &
    Pick<CourseLongFormProgress, 'itemId'>,
): CourseLongFormProgress {
  return {
    assetId: `${overrides.itemId}-asset`,
    completedSliceCount: 1,
    completionPercent: 12.5,
    completionSource: 'events',
    durationSeconds: 9600,
    eventCount: 1,
    hasProgress: true,
    isComplete: false,
    nextSliceId: `${overrides.itemId}-asset-slice-2`,
    nextSliceLabel: '20:00-40:00',
    resumeLabel: 'Resume at 20:00',
    resumeSecond: 1200,
    sliceCount: 8,
    sliceProgressLabel: '1 of 8 segments complete',
    summaryLine: '20 min logged · 1 of 8 segments complete · Resume at 20:00',
    watchedSeconds: 1200,
    watchedSummaryLabel: '20 min logged',
    ...overrides,
  };
}

function achievementView(
  overrides: Partial<AchievementView> & Pick<AchievementView, 'id' | 'title'>,
): AchievementView {
  return {
    category: 'course_progress',
    description: 'desc',
    ruleConfig: {},
    ruleType: 'first_item_completed',
    triggerSourceId: null,
    unlocked: false,
    unlockedAt: null,
    xpReward: 0,
    ...overrides,
  };
}

function achievementsView(
  achievements: AchievementView[] = [],
): AchievementsView {
  return {
    achievements,
    totalCount: achievements.length,
    unlockedCount: achievements.filter((a) => a.unlocked).length,
  };
}

// --- shared seed-like catalog ---------------------------------------------

const catalogUnits: CourseUnit[] = [
  unit({ id: 'week-0', title: 'Week 0: Scratch', order: 0, type: 'week' }),
  unit({
    id: 'final-project',
    title: 'Final Project',
    order: 120,
    type: 'final_project',
  }),
];

const catalogItems: CourseItem[] = [
  item({
    id: 'week-0-lecture',
    unitId: 'week-0',
    title: 'Week 0 Lecture',
    type: 'lecture',
    order: 0,
  }),
  item({
    id: 'week-0-pset',
    unitId: 'week-0',
    title: 'Week 0 Problem Set',
    type: 'problem_set',
    order: 1,
  }),
  item({
    id: 'week-0-shorts',
    unitId: 'week-0',
    title: 'Week 0 Shorts',
    type: 'shorts',
    required: false,
    order: 2,
  }),
  item({
    id: 'final-project-build',
    unitId: 'final-project',
    title: 'Build the project',
    type: 'project_task',
    order: 0,
  }),
];

type InputOverrides = {
  achievements?: AchievementsView;
  longFormByItemId?: ReadonlyMap<string, CourseLongFormProgress>;
  mediaProgressEvents?: MediaProgressEvent[];
  progressEntries?: ProgressEntry[];
  resumePoints?: ResumePoint[];
  studySessions?: StudySession[];
  totalXp?: number;
  xpTransactions?: XpTransaction[];
};

function makeInput(overrides: InputOverrides = {}): DashboardModelInput {
  const progressEntries = overrides.progressEntries ?? [];
  const longFormByItemId = overrides.longFormByItemId ?? new Map();

  return {
    achievements: overrides.achievements ?? achievementsView(),
    courseMap: buildCourseMap(
      catalogUnits,
      catalogItems,
      progressEntries,
      longFormByItemId,
    ),
    longFormByItemId,
    mediaProgressEvents: overrides.mediaProgressEvents ?? [],
    progressEntries,
    resumePoints: overrides.resumePoints ?? [],
    studySessions: overrides.studySessions ?? [],
    xpSummary: calculateXpSummary(overrides.totalXp ?? 0),
    xpTransactions: overrides.xpTransactions ?? [],
  };
}

// --- tests -----------------------------------------------------------------

describe('buildDashboardModel - course progress', () => {
  it('derives required completion and an honest status label', () => {
    const model = buildDashboardModel(
      makeInput({
        progressEntries: [
          progress({ id: 'p1', itemId: 'week-0-lecture', status: 'completed' }),
        ],
      }),
    );

    expect(model.courseProgress.requiredItemCount).toBe(3);
    expect(model.courseProgress.completedRequiredItemCount).toBe(1);
    expect(model.courseProgress.completionPercent).toBeCloseTo(33.3, 1);
    expect(model.courseProgress.statusLabel).toBe('In progress');
  });

  it('caps completion at 100 and never overstates when all required items complete', () => {
    const model = buildDashboardModel(
      makeInput({
        progressEntries: [
          progress({ id: 'p1', itemId: 'week-0-lecture', status: 'completed' }),
          progress({ id: 'p2', itemId: 'week-0-pset', status: 'accepted' }),
          progress({
            id: 'p3',
            itemId: 'final-project-build',
            status: 'completed',
          }),
        ],
      }),
    );

    expect(model.courseProgress.completionPercent).toBe(100);
    expect(model.courseProgress.statusLabel).toBe(
      'All required items complete',
    );
  });
});

describe('buildDashboardModel - continue next', () => {
  it('recommends the first not-started required item for a fresh learner', () => {
    const model = buildDashboardModel(makeInput());

    expect(model.continueNext).toEqual({
      itemId: 'week-0-lecture',
      itemTitle: 'Week 0 Lecture',
      kind: 'recommended',
      reason: 'not_started',
      statusLabel: 'Not started',
      unitTitle: 'Week 0: Scratch',
    });
  });

  it('prefers an in-progress required item over an earlier not-started one', () => {
    const model = buildDashboardModel(
      makeInput({
        progressEntries: [
          progress({ id: 'p1', itemId: 'week-0-pset', status: 'started' }),
        ],
      }),
    );

    expect(model.continueNext).toMatchObject({
      itemId: 'week-0-pset',
      kind: 'recommended',
      reason: 'in_progress',
    });
  });

  it('treats existing long-form progress as in-progress', () => {
    const model = buildDashboardModel(
      makeInput({
        longFormByItemId: new Map([
          ['week-0-lecture', longForm({ itemId: 'week-0-lecture' })],
        ]),
      }),
    );

    expect(model.continueNext).toMatchObject({
      itemId: 'week-0-lecture',
      kind: 'recommended',
      reason: 'in_progress',
    });
  });

  it('reports course_complete when every required item is complete', () => {
    const model = buildDashboardModel(
      makeInput({
        progressEntries: [
          progress({ id: 'p1', itemId: 'week-0-lecture', status: 'completed' }),
          progress({ id: 'p2', itemId: 'week-0-pset', status: 'submitted' }),
          progress({
            id: 'p3',
            itemId: 'final-project-build',
            status: 'completed',
          }),
        ],
      }),
    );

    expect(model.continueNext).toEqual({ kind: 'course_complete' });
  });

  it('reports blocked_only when the only remaining required items are blocked', () => {
    const model = buildDashboardModel(
      makeInput({
        progressEntries: [
          progress({ id: 'p1', itemId: 'week-0-lecture', status: 'completed' }),
          progress({ id: 'p2', itemId: 'week-0-pset', status: 'blocked' }),
          progress({
            id: 'p3',
            itemId: 'final-project-build',
            status: 'completed',
          }),
        ],
      }),
    );

    expect(model.continueNext).toEqual({ kind: 'blocked_only' });
  });
});

describe('buildDashboardModel - xp summary', () => {
  it('maps the derived XP summary and computes in-level progress', () => {
    const model = buildDashboardModel(makeInput({ totalXp: 250 }));

    expect(model.xpSummary).toEqual({
      currentLevelFloorXp: 100,
      isEmpty: false,
      level: 2,
      levelProgressPercent: 50,
      nextLevelXp: 400,
      totalXp: 250,
      xpToNextLevel: 150,
    });
  });

  it('marks a zero-XP learner empty at level 1 with no progress', () => {
    const model = buildDashboardModel(makeInput({ totalXp: 0 }));

    expect(model.xpSummary.isEmpty).toBe(true);
    expect(model.xpSummary.level).toBe(1);
    expect(model.xpSummary.levelProgressPercent).toBe(0);
  });

  it('clamps in-level progress and never exceeds 100', () => {
    const base = makeInput();
    const model = buildDashboardModel({
      ...base,
      xpSummary: {
        currentLevelFloorXp: 100,
        level: 2,
        nextLevelXp: 400,
        totalXp: 1000,
        xpToNextLevel: -600,
      },
    });

    expect(model.xpSummary.levelProgressPercent).toBe(100);
  });
});

describe('buildDashboardModel - achievements summary', () => {
  it('reports unlocked/total counts and the most recent unlock', () => {
    const model = buildDashboardModel(
      makeInput({
        achievements: achievementsView([
          achievementView({
            id: 'first-step',
            title: 'First Step',
            unlocked: true,
            unlockedAt: '2026-06-10T10:00:00.000Z',
          }),
          achievementView({ id: 'course-complete', title: 'Course Complete' }),
          achievementView({
            id: 'clean-stop',
            title: 'Clean Stop',
            unlocked: true,
            unlockedAt: '2026-06-12T10:00:00.000Z',
          }),
        ]),
      }),
    );

    expect(model.achievements).toEqual({
      isEmpty: false,
      latestUnlockDate: '2026-06-12',
      latestUnlockTitle: 'Clean Stop',
      totalCount: 3,
      unlockedCount: 2,
    });
  });

  it('is empty when nothing is unlocked', () => {
    const model = buildDashboardModel(
      makeInput({
        achievements: achievementsView([
          achievementView({ id: 'first-step', title: 'First Step' }),
        ]),
      }),
    );

    expect(model.achievements.isEmpty).toBe(true);
    expect(model.achievements.latestUnlockTitle).toBeNull();
  });
});

describe('buildDashboardModel - recent activity', () => {
  it('merges only explicit-save records, newest first, with stable identity', () => {
    const model = buildDashboardModel(
      makeInput({
        studySessions: [
          session({
            id: 's1',
            itemId: 'week-0-lecture',
            mode: 'coding',
            durationMinutes: 30,
            startedAt: '2026-06-10T08:00:00.000Z',
          }),
        ],
        progressEntries: [
          progress({
            id: 'p1',
            itemId: 'week-0-pset',
            status: 'submitted',
            updatedAt: '2026-06-11T08:00:00.000Z',
          }),
        ],
        mediaProgressEvents: [
          mediaEvent({
            id: 'm1',
            itemId: 'week-0-lecture',
            createdAt: '2026-06-09T08:00:00.000Z',
          }),
        ],
        xpTransactions: [
          xpTx({
            id: 'x1',
            xp: 75,
            reason: 'Submitted problem set: Week 0 Problem Set',
            awardedAt: '2026-06-12T08:00:00.000Z',
          }),
        ],
        achievements: achievementsView([
          achievementView({
            id: 'first-step',
            title: 'First Step',
            unlocked: true,
            unlockedAt: '2026-06-13T08:00:00.000Z',
          }),
        ]),
      }),
    );

    expect(model.recentActivity.isEmpty).toBe(false);
    expect(model.recentActivity.items.map((entry) => entry.id)).toEqual([
      'achievement:first-step',
      'xp:x1',
      'progress:p1',
      'study_session:s1',
      'media:m1',
    ]);

    const byId = new Map(
      model.recentActivity.items.map((entry) => [entry.id, entry]),
    );
    expect(byId.get('study_session:s1')?.label).toBe(
      'Coding session — Week 0 Lecture (30 min)',
    );
    expect(byId.get('progress:p1')?.label).toBe(
      'Saved progress — Week 0 Problem Set (Submitted)',
    );
    expect(byId.get('xp:x1')?.label).toBe(
      'Earned 75 XP — Submitted problem set: Week 0 Problem Set',
    );
    expect(byId.get('media:m1')?.label).toBe(
      'Logged watch time — Week 0 Lecture',
    );
    expect(byId.get('achievement:first-step')?.label).toBe(
      'Unlocked achievement — First Step',
    );
  });

  it('honors the recent-activity limit', () => {
    const model = buildDashboardModel(
      makeInput({
        xpTransactions: [
          xpTx({ id: 'x1', awardedAt: '2026-06-10T08:00:00.000Z' }),
          xpTx({ id: 'x2', awardedAt: '2026-06-11T08:00:00.000Z' }),
          xpTx({ id: 'x3', awardedAt: '2026-06-12T08:00:00.000Z' }),
        ],
      }),
      { recentActivityLimit: 2 },
    );

    expect(model.recentActivity.items.map((entry) => entry.id)).toEqual([
      'xp:x3',
      'xp:x2',
    ]);
  });

  it('breaks timestamp ties deterministically by id', () => {
    const model = buildDashboardModel(
      makeInput({
        xpTransactions: [
          xpTx({ id: 'x2', awardedAt: '2026-06-10T08:00:00.000Z' }),
          xpTx({ id: 'x1', awardedAt: '2026-06-10T08:00:00.000Z' }),
        ],
      }),
    );

    expect(model.recentActivity.items.map((entry) => entry.id)).toEqual([
      'xp:x1',
      'xp:x2',
    ]);
  });

  it('is empty for a fresh learner with no saved records', () => {
    const model = buildDashboardModel(makeInput());

    expect(model.recentActivity.isEmpty).toBe(true);
    expect(model.recentActivity.items).toEqual([]);
  });
});

describe('buildDashboardModel - blocked items', () => {
  it('lists items the learner marked blocked', () => {
    const model = buildDashboardModel(
      makeInput({
        progressEntries: [
          progress({ id: 'p1', itemId: 'week-0-pset', status: 'blocked' }),
        ],
      }),
    );

    expect(model.blockedItems.isEmpty).toBe(false);
    expect(model.blockedItems.items).toEqual([
      {
        itemId: 'week-0-pset',
        itemTitle: 'Week 0 Problem Set',
        unitTitle: 'Week 0: Scratch',
      },
    ]);
  });

  it('is empty when nothing is blocked', () => {
    expect(buildDashboardModel(makeInput()).blockedItems.isEmpty).toBe(true);
  });
});

describe('buildDashboardModel - resume long-form', () => {
  it('chooses the most recently updated incomplete long-form item', () => {
    const model = buildDashboardModel(
      makeInput({
        resumePoints: [
          resumePoint({
            id: 'resume-week-1',
            itemId: 'week-1-lecture',
            updatedAt: '2026-06-12T08:00:00.000Z',
          }),
          resumePoint({
            id: 'resume-week-0',
            itemId: 'week-0-lecture',
            updatedAt: '2026-06-10T08:00:00.000Z',
          }),
        ],
        longFormByItemId: new Map([
          [
            'week-1-lecture',
            longForm({
              itemId: 'week-1-lecture',
              isComplete: true,
              resumeLabel: null,
            }),
          ],
          ['week-0-lecture', longForm({ itemId: 'week-0-lecture' })],
        ]),
      }),
    );

    expect(model.resume).toEqual({
      itemId: 'week-0-lecture',
      itemTitle: 'Week 0 Lecture',
      kind: 'resume',
      resumeLabel: 'Resume at 20:00',
      sliceProgressLabel: '1 of 8 segments complete',
      unitTitle: 'Week 0: Scratch',
    });
  });

  it('is empty when no incomplete resumable long-form item exists', () => {
    const model = buildDashboardModel(
      makeInput({
        resumePoints: [
          resumePoint({ id: 'resume-week-0', itemId: 'week-0-lecture' }),
        ],
        longFormByItemId: new Map([
          [
            'week-0-lecture',
            longForm({
              itemId: 'week-0-lecture',
              isComplete: true,
              resumeLabel: null,
            }),
          ],
        ]),
      }),
    );

    expect(model.resume).toEqual({ kind: 'empty' });
  });
});

describe('buildDashboardModel - study session summary', () => {
  it('aggregates count, total minutes, and last session date', () => {
    const model = buildDashboardModel(
      makeInput({
        studySessions: [
          session({
            id: 's1',
            itemId: 'week-0-lecture',
            durationMinutes: 30,
            startedAt: '2026-06-10T08:00:00.000Z',
          }),
          session({
            id: 's2',
            itemId: 'week-0-pset',
            durationMinutes: 45,
            startedAt: '2026-06-12T08:00:00.000Z',
          }),
        ],
      }),
    );

    expect(model.studySummary).toEqual({
      isEmpty: false,
      lastSessionDate: '2026-06-12',
      sessionCount: 2,
      totalMinutes: 75,
      totalMinutesLabel: '1h 15m',
    });
  });

  it('is empty with no saved sessions', () => {
    expect(buildDashboardModel(makeInput()).studySummary).toEqual({
      isEmpty: true,
      lastSessionDate: null,
      sessionCount: 0,
      totalMinutes: 0,
      totalMinutesLabel: '0 min',
    });
  });
});

describe('buildDashboardModel - fresh learner empty states', () => {
  it('is truthful across every card with no local data', () => {
    const model = buildDashboardModel(makeInput());

    expect(model.courseProgress.completionPercent).toBe(0);
    expect(model.courseProgress.statusLabel).toBe('Not started');
    expect(model.continueNext).toMatchObject({
      kind: 'recommended',
      reason: 'not_started',
    });
    expect(model.xpSummary.isEmpty).toBe(true);
    expect(model.achievements.isEmpty).toBe(true);
    expect(model.recentActivity.isEmpty).toBe(true);
    expect(model.blockedItems.isEmpty).toBe(true);
    expect(model.resume).toEqual({ kind: 'empty' });
    expect(model.studySummary.isEmpty).toBe(true);
  });
});
