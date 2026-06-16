import { describe, expect, it } from 'vitest';
import {
  buildInsightsModel,
  type InsightsModelInput,
  ITEM_COMPLETION_SOURCE_TYPES,
  UNIT_COMPLETION_SOURCE_TYPES,
} from '@/features/insights/model';
import type { AchievementsView, AchievementView } from '@/lib/db';
import type {
  CourseItem,
  CourseUnit,
  MediaProgressEvent,
  ProgressEntry,
  StudySession,
  XpTransaction,
} from '@/lib/domain';
import type { CourseMapView } from '@/features/course/model';
import { evaluateProgressXp } from '@/lib/xp/engine';

const TS = '2026-06-01T00:00:00.000';

function makeStudySession(
  overrides: Partial<StudySession> & Pick<StudySession, 'id'>,
): StudySession {
  return {
    itemId: 'item-1',
    unitId: 'unit-1',
    blockers: [],
    createdAt: TS,
    durationMinutes: 30,
    endedAt: TS,
    mode: 'coding',
    startedAt: TS,
    updatedAt: TS,
    ...overrides,
  };
}

function makeMediaEvent(
  overrides: Partial<MediaProgressEvent> & Pick<MediaProgressEvent, 'id'>,
): MediaProgressEvent {
  return {
    itemId: 'item-1',
    assetId: 'asset-1',
    completedSlice: false,
    createdAt: TS,
    endSecond: 60,
    energyAfter: 3,
    energyBefore: 4,
    startSecond: 0,
    stoppedBecause: 'reached_limit',
    updatedAt: TS,
    watchedSeconds: 60,
    ...overrides,
  };
}

function makeXpTx(
  overrides: Partial<XpTransaction> & Pick<XpTransaction, 'id'>,
): XpTransaction {
  return {
    awardedAt: TS,
    createdAt: TS,
    reason: 'Earned XP',
    sourceId: overrides.id,
    sourceType: 'study_session',
    updatedAt: TS,
    xp: 10,
    ...overrides,
  };
}

function makeAchievementView(
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

function makeAchievementsView(
  achievements: AchievementView[] = [],
): AchievementsView {
  return {
    achievements,
    totalCount: achievements.length,
    unlockedCount: achievements.filter((a) => a.unlocked).length,
  };
}

function makeCourseMap(overrides: Partial<CourseMapView> = {}): CourseMapView {
  return {
    completedRequiredItemCount: 0,
    completionPercent: 0,
    requiredItemCount: 0,
    units: [],
    ...overrides,
  } as unknown as CourseMapView;
}

function makeInput(
  overrides: Partial<InsightsModelInput> = {},
): InsightsModelInput {
  return {
    achievements: overrides.achievements ?? makeAchievementsView(),
    courseMap: overrides.courseMap ?? makeCourseMap(),
    mediaProgressEvents: overrides.mediaProgressEvents ?? [],
    studySessions: overrides.studySessions ?? [],
    xpTransactions: overrides.xpTransactions ?? [],
  };
}

describe('buildInsightsModel - fresh learner / empty states', () => {
  it('is truthful across every section with no local data', () => {
    const model = buildInsightsModel(makeInput());

    // 1. Weekly activity
    expect(model.weeklyActivity.isEmpty).toBe(true);
    expect(model.weeklyActivity.weeks).toEqual([]);
    expect(model.weeklyActivity.totalStudyMinutes).toBe(0);
    expect(model.weeklyActivity.totalWatchedMinutesLogged).toBe(0);
    expect(model.weeklyActivity.totalXp).toBe(0);
    expect(model.weeklyActivity.maxStudyMinutes).toBe(0);
    expect(model.weeklyActivity.maxWatchedMinutesLogged).toBe(0);
    expect(model.weeklyActivity.maxWeeklyXp).toBe(0);

    // 2. Mode breakdown
    expect(model.modeBreakdown.isEmpty).toBe(true);
    expect(model.modeBreakdown.rows).toEqual([]);
    expect(model.modeBreakdown.totalMinutes).toBe(0);
    expect(model.modeBreakdown.totalSessions).toBe(0);

    // 3. Active days
    expect(model.activeDays.isEmpty).toBe(true);
    expect(model.activeDays.activeDaysInWindow).toBe(0);
    expect(model.activeDays.consecutiveActiveDays).toBe(0);
    expect(model.activeDays.lastActiveDate).toBeNull();

    // 4. Completion awards
    expect(model.completionAwards.isEmpty).toBe(true);
    expect(model.completionAwards.weeks).toEqual([]);
    expect(model.completionAwards.totalItemAwards).toBe(0);
    expect(model.completionAwards.totalUnitAwards).toBe(0);

    // 5. Achievement timeline
    expect(model.achievementTimeline.isEmpty).toBe(true);
    expect(model.achievementTimeline.entries).toEqual([]);
    expect(model.achievementTimeline.totalCount).toBe(0);
    expect(model.achievementTimeline.unlockedCount).toBe(0);

    // 6. Course progress snapshot
    expect(model.courseProgress.completedRequiredItemCount).toBe(0);
    expect(model.courseProgress.completionPercent).toBe(0);
    expect(model.courseProgress.requiredItemCount).toBe(0);
  });
});

describe('buildInsightsModel - weekly activity aggregation', () => {
  it('correctly buckets and sums values per Monday-based week', () => {
    const input = makeInput({
      studySessions: [
        // Week of June 8, 2026 (June 8 is Monday, June 12 is Friday)
        makeStudySession({
          id: 's1',
          startedAt: '2026-06-08T10:00:00',
          durationMinutes: 45,
        }),
        makeStudySession({
          id: 's2',
          startedAt: '2026-06-08T23:50:00',
          durationMinutes: 15,
        }),
        makeStudySession({
          id: 's3',
          startedAt: '2026-06-12T14:00:00',
          durationMinutes: 30,
        }),
        // Week of June 15, 2026 (June 15 is Monday)
        makeStudySession({
          id: 's4',
          startedAt: '2026-06-15T09:00:00',
          durationMinutes: 60,
        }),
        // Ignored zero duration session
        makeStudySession({
          id: 's5',
          startedAt: '2026-06-20T10:00:00',
          durationMinutes: 0,
        }),
      ],
      mediaProgressEvents: [
        // Week of June 8, 2026
        makeMediaEvent({
          id: 'm1',
          createdAt: '2026-06-08T11:00:00',
          watchedSeconds: 600,
        }),
        makeMediaEvent({
          id: 'm2',
          createdAt: '2026-06-10T12:00:00',
          watchedSeconds: 1200,
        }),
        // Week of June 15, 2026
        makeMediaEvent({
          id: 'm3',
          createdAt: '2026-06-16T10:00:00',
          watchedSeconds: 900,
        }),
      ],
      xpTransactions: [
        // Week of June 8, 2026
        makeXpTx({ id: 'x1', awardedAt: '2026-06-09T08:00:00', xp: 10 }),
        makeXpTx({ id: 'x2', awardedAt: '2026-06-11T12:00:00', xp: 20 }),
        // Week of June 15, 2026
        makeXpTx({ id: 'x3', awardedAt: '2026-06-15T15:00:00', xp: 50 }),
      ],
    });

    const model = buildInsightsModel(input);

    expect(model.weeklyActivity.isEmpty).toBe(false);
    expect(model.weeklyActivity.weeks.length).toBe(2);

    const week1 = model.weeklyActivity.weeks[0]!;
    expect(week1.weekKey).toBe('2026-06-08');
    expect(week1.weekLabel).toBe('Week of 2026-06-08');
    expect(week1.studyMinutes).toBe(90); // 45 + 15 + 30
    expect(week1.watchedMinutesLogged).toBe(30); // (600 + 1200) / 60
    expect(week1.xpEarned).toBe(30); // 10 + 20
    expect(week1.xpCumulative).toBe(30);

    const week2 = model.weeklyActivity.weeks[1]!;
    expect(week2.weekKey).toBe('2026-06-15');
    expect(week2.weekLabel).toBe('Week of 2026-06-15');
    expect(week2.studyMinutes).toBe(60); // 60 (zero-duration ignored)
    expect(week2.watchedMinutesLogged).toBe(15); // 900 / 60
    expect(week2.xpEarned).toBe(50);
    expect(week2.xpCumulative).toBe(80); // 30 + 50

    expect(model.weeklyActivity.totalStudyMinutes).toBe(150);
    expect(model.weeklyActivity.totalStudyMinutesLabel).toBe('2h 30m');
    expect(model.weeklyActivity.totalWatchedMinutesLogged).toBe(45);
    expect(model.weeklyActivity.totalWatchedMinutesLoggedLabel).toBe('45 min');
    expect(model.weeklyActivity.totalXp).toBe(80);

    expect(model.weeklyActivity.maxStudyMinutes).toBe(90);
    expect(model.weeklyActivity.maxWatchedMinutesLogged).toBe(30);
    expect(model.weeklyActivity.maxWeeklyXp).toBe(50);
  });

  it('asserts watched minutes logged sums watchedSeconds and does not deduplicate overlaps', () => {
    const input = makeInput({
      mediaProgressEvents: [
        makeMediaEvent({
          id: 'm1',
          createdAt: '2026-06-08T10:00:00',
          watchedSeconds: 600,
        }),
        makeMediaEvent({
          id: 'm2',
          createdAt: '2026-06-08T10:05:00',
          watchedSeconds: 600,
        }), // overlapping
      ],
    });

    const model = buildInsightsModel(input);

    expect(model.weeklyActivity.weeks[0]?.watchedMinutesLogged).toBe(20);
    expect(model.weeklyActivity.totalWatchedMinutesLogged).toBe(20);
  });

  it('floors watched minutes logged and never overstates partial minutes', () => {
    const input = makeInput({
      mediaProgressEvents: [
        // 90 logged seconds in the week of 2026-06-08 floors to 1 honest minute.
        // The earlier Math.round behavior overstated this as 2 minutes, so this
        // assertion fails under Math.round and passes under Math.floor.
        makeMediaEvent({
          id: 'm1',
          createdAt: '2026-06-08T10:00:00',
          startSecond: 0,
          endSecond: 120,
          watchedSeconds: 90,
        }),
        // 89 logged seconds in the week of 2026-06-15 also floors to 1 minute.
        makeMediaEvent({
          id: 'm2',
          createdAt: '2026-06-15T10:00:00',
          startSecond: 0,
          endSecond: 120,
          watchedSeconds: 89,
        }),
      ],
    });

    const model = buildInsightsModel(input);
    const byWeek = new Map(
      model.weeklyActivity.weeks.map((week) => [week.weekKey, week]),
    );

    expect(byWeek.get('2026-06-08')?.watchedMinutesLogged).toBe(1);
    expect(byWeek.get('2026-06-15')?.watchedMinutesLogged).toBe(1);
  });
});

describe('buildInsightsModel - attribution whole to start/creation timestamp', () => {
  it('attributes sessions/events whole without splitting across day or week boundaries', () => {
    const input = makeInput({
      studySessions: [
        // Starts on Sunday June 14, 2026 at 23:30 local and runs 90 mins into Monday June 15
        makeStudySession({
          id: 's1',
          startedAt: '2026-06-14T23:30:00',
          endedAt: '2026-06-15T01:00:00',
          durationMinutes: 90,
        }),
      ],
    });

    const model = buildInsightsModel(input);

    // June 14 is Sunday of week 2026-06-08. Monday June 15 is next week.
    expect(model.weeklyActivity.weeks.length).toBe(1);
    expect(model.weeklyActivity.weeks[0]?.weekKey).toBe('2026-06-08');
    expect(model.weeklyActivity.weeks[0]?.studyMinutes).toBe(90);

    // Active days should list Sunday June 14, not Monday June 15
    expect(model.activeDays.lastActiveDate).toBe('2026-06-14');
  });
});

describe('buildInsightsModel - study mode breakdown', () => {
  it('groups, sums, sorts, and ignores zero-duration sessions', () => {
    const input = makeInput({
      studySessions: [
        makeStudySession({ id: 's1', mode: 'coding', durationMinutes: 60 }),
        makeStudySession({ id: 's2', mode: 'coding', durationMinutes: 30 }),
        makeStudySession({ id: 's3', mode: 'reading', durationMinutes: 15 }),
        makeStudySession({ id: 's4', mode: 'watching', durationMinutes: 45 }),
        makeStudySession({ id: 's5', mode: 'reflection', durationMinutes: 0 }), // ignored
      ],
    });

    const model = buildInsightsModel(input);

    expect(model.modeBreakdown.isEmpty).toBe(false);
    expect(model.modeBreakdown.totalMinutes).toBe(150);
    expect(model.modeBreakdown.totalSessions).toBe(4);

    expect(model.modeBreakdown.rows.length).toBe(3);

    // Sorted descending by totalMinutes: coding (90), watching (45), reading (15)
    expect(model.modeBreakdown.rows[0]).toMatchObject({
      mode: 'coding',
      modeLabel: 'Coding',
      totalMinutes: 90,
      totalMinutesLabel: '1h 30m',
      sessionCount: 2,
      percentOfMinutes: 60,
    });
    expect(model.modeBreakdown.rows[1]).toMatchObject({
      mode: 'watching',
      modeLabel: 'Watching',
      totalMinutes: 45,
      totalMinutesLabel: '45 min',
      sessionCount: 1,
      percentOfMinutes: 30,
    });
    expect(model.modeBreakdown.rows[2]).toMatchObject({
      mode: 'reading',
      modeLabel: 'Reading',
      totalMinutes: 15,
      totalMinutesLabel: '15 min',
      sessionCount: 1,
      percentOfMinutes: 10,
    });
  });

  it('breaks ties alphabetically by modeLabel in mode breakdown', () => {
    const input = makeInput({
      studySessions: [
        makeStudySession({ id: 's1', mode: 'debugging', durationMinutes: 30 }), // Label: "Debugging"
        makeStudySession({ id: 's2', mode: 'coding', durationMinutes: 30 }), // Label: "Coding"
      ],
    });

    const model = buildInsightsModel(input);

    // "Coding" starts with C, "Debugging" starts with D. Coding should be first.
    expect(model.modeBreakdown.rows[0]?.mode).toBe('coding');
    expect(model.modeBreakdown.rows[1]?.mode).toBe('debugging');
  });
});

describe('buildInsightsModel - active days and consecutive active days', () => {
  it('correctly calculates active days within window and consecutive active days ending at the most recent active day', () => {
    const sessions = [
      makeStudySession({
        id: 's1',
        startedAt: '2026-06-01T12:00:00',
        durationMinutes: 10,
      }),
      makeStudySession({
        id: 's2',
        startedAt: '2026-06-02T12:00:00',
        durationMinutes: 10,
      }),
      makeStudySession({
        id: 's3',
        startedAt: '2026-06-03T12:00:00',
        durationMinutes: 10,
      }),
      // Gap on June 4
      makeStudySession({
        id: 's4',
        startedAt: '2026-06-05T12:00:00',
        durationMinutes: 10,
      }),
      makeStudySession({
        id: 's5',
        startedAt: '2026-06-06T12:00:00',
        durationMinutes: 10,
      }),
      makeStudySession({
        id: 's6',
        startedAt: '2026-06-07T12:00:00',
        durationMinutes: 10,
      }),
      makeStudySession({
        id: 's7',
        startedAt: '2026-06-08T12:00:00',
        durationMinutes: 10,
      }),
    ];

    // Case 1: activeDaysWindow = 30, now is June 10
    const model1 = buildInsightsModel(makeInput({ studySessions: sessions }), {
      activeDaysWindow: 30,
      now: '2026-06-10T12:00:00',
    });

    expect(model1.activeDays.isEmpty).toBe(false);
    expect(model1.activeDays.activeDaysInWindow).toBe(7); // June 1, 2, 3, 5, 6, 7, 8
    expect(model1.activeDays.consecutiveActiveDays).toBe(4); // June 8, 7, 6, 5 (run ends at last active day)
    expect(model1.activeDays.lastActiveDate).toBe('2026-06-08');

    // Case 2: activeDaysWindow = 5, now is June 10 (window starts June 6 inclusive: June 6, 7, 8, 9, 10)
    const model2 = buildInsightsModel(makeInput({ studySessions: sessions }), {
      activeDaysWindow: 5,
      now: '2026-06-10T12:00:00',
    });

    expect(model2.activeDays.activeDaysInWindow).toBe(3); // June 6, 7, 8
    expect(model2.activeDays.consecutiveActiveDays).toBe(4); // Run length is still 4
  });

  it('collapses multiple sessions on same day to 1 active day, and ignores zero-duration sessions', () => {
    const sessions = [
      makeStudySession({
        id: 's1',
        startedAt: '2026-06-01T08:00:00',
        durationMinutes: 10,
      }),
      makeStudySession({
        id: 's2',
        startedAt: '2026-06-01T15:00:00',
        durationMinutes: 20,
      }),
      makeStudySession({
        id: 's3',
        startedAt: '2026-06-02T12:00:00',
        durationMinutes: 0,
      }), // ignored
    ];

    const model = buildInsightsModel(makeInput({ studySessions: sessions }), {
      now: '2026-06-05T12:00:00',
    });

    expect(model.activeDays.activeDaysInWindow).toBe(1);
    expect(model.activeDays.consecutiveActiveDays).toBe(1);
    expect(model.activeDays.lastActiveDate).toBe('2026-06-01');
  });
});

// --- XP-engine fixtures for the completion source-type divergence guard -----

function makeCourseItem(
  overrides: Partial<CourseItem> & Pick<CourseItem, 'id' | 'unitId' | 'type'>,
): CourseItem {
  return {
    createdAt: TS,
    estimatedMinutes: 30,
    order: 0,
    required: true,
    title: overrides.id,
    updatedAt: TS,
    ...overrides,
  };
}

function makeCourseUnit(
  overrides: Partial<CourseUnit> & Pick<CourseUnit, 'id' | 'type'>,
): CourseUnit {
  return {
    courseId: 'cs50x-2026',
    createdAt: TS,
    order: 0,
    required: true,
    sourceYear: 2026,
    title: overrides.id,
    updatedAt: TS,
    ...overrides,
  };
}

function makeProgressEntry(
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

/**
 * Drives the real XP engine across representative inputs and collects every
 * `sourceType` it emits, so the Insights classification can be checked against
 * actual engine behavior rather than a hand-copied list.
 */
function collectEngineSourceTypes(): Set<string> {
  const emitted = new Set<string>();
  const record = (awards: ReturnType<typeof evaluateProgressXp>) => {
    for (const award of awards) {
      emitted.add(award.sourceType);
    }
  };

  const completableItemTypes = [
    'lecture',
    'section',
    'shorts',
    'practice',
    'notes',
    'reflection',
  ] as const;

  for (const type of completableItemTypes) {
    const item = makeCourseItem({ id: `item-${type}`, unitId: 'unit-x', type });
    const unit = makeCourseUnit({
      id: 'unit-x',
      type: 'special',
      required: false,
    });
    const progressEntry = makeProgressEntry({
      id: `p-${type}`,
      itemId: item.id,
      status: 'completed',
    });

    record(
      evaluateProgressXp({
        progressEntry,
        item,
        unit,
        allUnitItems: [item],
        allUnitProgress: [progressEntry],
      }),
    );
  }

  for (const status of ['started', 'submitted', 'accepted'] as const) {
    const item = makeCourseItem({
      id: 'item-pset',
      unitId: 'unit-x',
      type: 'problem_set',
    });
    const unit = makeCourseUnit({
      id: 'unit-x',
      type: 'special',
      required: false,
    });
    const progressEntry = makeProgressEntry({
      id: `p-pset-${status}`,
      itemId: item.id,
      status,
    });

    record(
      evaluateProgressXp({
        progressEntry,
        item,
        unit,
        allUnitItems: [item],
        allUnitProgress: [progressEntry],
      }),
    );
  }

  // Required week unit with all required items complete -> week_completed.
  {
    const item = makeCourseItem({
      id: 'week-0-lecture',
      unitId: 'week-0',
      type: 'lecture',
    });
    const unit = makeCourseUnit({ id: 'week-0', type: 'week', required: true });
    const progressEntry = makeProgressEntry({
      id: 'p-week',
      itemId: item.id,
      status: 'completed',
    });

    record(
      evaluateProgressXp({
        progressEntry,
        item,
        unit,
        allUnitItems: [item],
        allUnitProgress: [progressEntry],
      }),
    );
  }

  // Final project build completion.
  {
    const item = makeCourseItem({
      id: 'final-project-build',
      unitId: 'final-project',
      type: 'project_task',
    });
    const unit = makeCourseUnit({
      id: 'final-project',
      type: 'final_project',
      required: true,
    });
    const progressEntry = makeProgressEntry({
      id: 'p-fpb',
      itemId: item.id,
      status: 'completed',
    });

    record(
      evaluateProgressXp({
        progressEntry,
        item,
        unit,
        allUnitItems: [item],
        allUnitProgress: [progressEntry],
      }),
    );
  }

  // Final project README + video demo both complete.
  {
    const item = makeCourseItem({
      id: 'final-project-readme',
      unitId: 'final-project',
      type: 'project_task',
    });
    const unit = makeCourseUnit({
      id: 'final-project',
      type: 'final_project',
      required: true,
    });
    const progressEntry = makeProgressEntry({
      id: 'p-readme',
      itemId: item.id,
      status: 'completed',
    });
    const demoProgress = makeProgressEntry({
      id: 'p-demo',
      itemId: 'final-project-video-demo',
      status: 'completed',
    });

    record(
      evaluateProgressXp({
        progressEntry,
        item,
        unit,
        allUnitItems: [item],
        allUnitProgress: [progressEntry],
        finalProjectProgress: [progressEntry, demoProgress],
      }),
    );
  }

  return emitted;
}

describe('buildInsightsModel - recorded completion awards', () => {
  it('counts item vs unit awards separately using exact XP sourceTypes and ignores others', () => {
    const input = makeInput({
      xpTransactions: [
        makeXpTx({
          id: 'x1',
          awardedAt: '2026-06-08T12:00:00',
          sourceType: 'lecture_completed',
          xp: 40,
        }),
        makeXpTx({
          id: 'x2',
          awardedAt: '2026-06-09T12:00:00',
          sourceType: 'problem_set_started',
          xp: 20,
        }), // ignored
        makeXpTx({
          id: 'x3',
          awardedAt: '2026-06-09T14:00:00',
          sourceType: 'problem_set_submitted',
          xp: 75,
        }),
        makeXpTx({
          id: 'x4',
          awardedAt: '2026-06-10T12:00:00',
          sourceType: 'week_completed',
          xp: 150,
        }),
        makeXpTx({
          id: 'x5',
          awardedAt: '2026-06-15T12:00:00',
          sourceType: 'problem_set_accepted',
          xp: 125,
        }),
      ],
    });

    const model = buildInsightsModel(input);

    expect(model.completionAwards.isEmpty).toBe(false);
    expect(model.completionAwards.totalItemAwards).toBe(3); // lecture_completed, problem_set_submitted, problem_set_accepted
    expect(model.completionAwards.totalUnitAwards).toBe(1); // week_completed

    expect(model.completionAwards.weeks.length).toBe(2);

    const week1 = model.completionAwards.weeks[0]!;
    expect(week1.weekKey).toBe('2026-06-08');
    expect(week1.itemAwardCount).toBe(2);
    expect(week1.unitAwardCount).toBe(1);

    const week2 = model.completionAwards.weeks[1]!;
    expect(week2.weekKey).toBe('2026-06-15');
    expect(week2.itemAwardCount).toBe(1);
    expect(week2.unitAwardCount).toBe(0);
  });

  it('keeps the completion source-type classification aligned with the XP engine', () => {
    // Structural sanity: item and unit classifications are disjoint.
    for (const sourceType of ITEM_COMPLETION_SOURCE_TYPES) {
      expect(UNIT_COMPLETION_SOURCE_TYPES.has(sourceType)).toBe(false);
    }

    const emitted = collectEngineSourceTypes();

    // Forward guard: every source type the engine actually emits must be
    // classified by the Insights model as an item-completion award, a
    // unit-completion award, or an explicitly excluded non-completion
    // milestone. If the engine adds a new completion award type, this fails
    // loudly. Per the Module 15 plan that divergence is a STOP-and-report
    // condition — do not silently widen the model or edit the XP engine to pass.
    const EXCLUDED_NON_COMPLETION_SOURCE_TYPES = new Set([
      'problem_set_started',
    ]);
    const classified = new Set<string>([
      ...ITEM_COMPLETION_SOURCE_TYPES,
      ...UNIT_COMPLETION_SOURCE_TYPES,
      ...EXCLUDED_NON_COMPLETION_SOURCE_TYPES,
    ]);

    for (const sourceType of emitted) {
      // Object shape gives a readable failure naming the unclassified type.
      expect({ sourceType, classified: classified.has(sourceType) }).toEqual({
        sourceType,
        classified: true,
      });
    }

    // Backward guard: every completion source type the model claims must still
    // be emitted by the current engine, so stale classifications cannot linger.
    for (const sourceType of [
      ...ITEM_COMPLETION_SOURCE_TYPES,
      ...UNIT_COMPLETION_SOURCE_TYPES,
    ]) {
      expect({ sourceType, emitted: emitted.has(sourceType) }).toEqual({
        sourceType,
        emitted: true,
      });
    }
  });
});

describe('buildInsightsModel - achievement timeline', () => {
  it('excludes locked achievements and sorts unlocks by unlockedAt descending, then id alphabetically', () => {
    const input = makeInput({
      achievements: makeAchievementsView([
        makeAchievementView({
          id: 'a1',
          title: 'Achievement 1',
          unlocked: true,
          unlockedAt: '2026-06-10T12:00:00',
        }),
        makeAchievementView({
          id: 'a2',
          title: 'Achievement 2',
          unlocked: false,
          unlockedAt: null,
        }),
        makeAchievementView({
          id: 'a3',
          title: 'Achievement 3',
          unlocked: true,
          unlockedAt: '2026-06-12T12:00:00',
        }),
        makeAchievementView({
          id: 'a4',
          title: 'Achievement 4',
          unlocked: true,
          unlockedAt: '2026-06-12T12:00:00',
        }), // same timestamp
      ]),
    });

    const model = buildInsightsModel(input);

    expect(model.achievementTimeline.isEmpty).toBe(false);
    expect(model.achievementTimeline.totalCount).toBe(4);
    expect(model.achievementTimeline.unlockedCount).toBe(3);

    expect(model.achievementTimeline.entries.length).toBe(3);

    // Sort order: 2026-06-12 first. Since a3 and a4 have the same timestamp, a3 comes before a4 alphabetically.
    expect(model.achievementTimeline.entries[0]).toMatchObject({
      id: 'a3',
      title: 'Achievement 3',
      unlockedAt: '2026-06-12T12:00:00',
      unlockedDate: '2026-06-12',
    });
    expect(model.achievementTimeline.entries[1]).toMatchObject({
      id: 'a4',
      title: 'Achievement 4',
      unlockedAt: '2026-06-12T12:00:00',
      unlockedDate: '2026-06-12',
    });
    expect(model.achievementTimeline.entries[2]).toMatchObject({
      id: 'a1',
      title: 'Achievement 1',
      unlockedAt: '2026-06-10T12:00:00',
      unlockedDate: '2026-06-10',
    });
  });
});

describe('buildInsightsModel - course progress snapshot', () => {
  it('correctly maps and clamps course progress snapshot', () => {
    const input = makeInput({
      courseMap: makeCourseMap({
        completedRequiredItemCount: 15,
        requiredItemCount: 20,
        completionPercent: 75.33,
      }),
    });

    const model = buildInsightsModel(input);

    expect(model.courseProgress).toEqual({
      completedRequiredItemCount: 15,
      requiredItemCount: 20,
      completionPercent: 75.3, // rounded to single decimal
    });
  });
});
