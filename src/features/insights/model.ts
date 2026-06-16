import { formatMinutes, type CourseMapView } from '@/features/course/model';
import { getModeLabel } from '@/features/sessions/model';
import type { AchievementsView } from '@/lib/db';
import type {
  AchievementCategory,
  MediaProgressEvent,
  StudySession,
  StudySessionMode,
  XpTransaction,
} from '@/lib/domain';

/**
 * Module 15 insights model. Like the dashboard model this file is intentionally
 * pure: it takes already-fetched local records and returns a fully formatted,
 * label-ready view. It performs no Dexie access, no IO, no route logic, and no
 * mutation.
 *
 * Insights is the over-time counterpart to the dashboard: it describes how
 * locally recorded effort has accumulated, derived only from immutable ledgers
 * (`study_sessions`, `media_progress_events`, `xp_transactions`,
 * `achievement_unlocks`) plus the current course snapshot. It never forecasts,
 * coaches, infers recommendations, or presents extrapolation as fact.
 *
 * Time buckets use the learner's device-local day/week (Monday week start). A
 * session or media event is attributed whole to the local day/week of its
 * `startedAt` / `createdAt` instant and is never split across a boundary. Buckets
 * are device-local; the model does not claim universal timezone correctness
 * because the stored timestamps are absolute UTC instants.
 */

export const DEFAULT_ACTIVE_DAYS_WINDOW = 30;

/**
 * Exact `xp_transactions.sourceType` values the XP engine emits for
 * completion-style milestones. These mirror the literals in
 * `src/lib/xp/engine.ts`; `tests/features/insightsModel.test.ts` drives the
 * engine and fails loudly if the engine emits a completion source type this
 * model does not classify. Divergence is a stop condition — do not widen these
 * silently or change the XP engine to match.
 */
export const ITEM_COMPLETION_SOURCE_TYPES: ReadonlySet<string> = new Set([
  'lecture_completed',
  'section_completed',
  'shorts_completed',
  'practice_completed',
  'notes_completed',
  'reflection_completed',
  'problem_set_submitted',
  'problem_set_accepted',
  'final_project_build_completed',
  'final_project_readme_demo_completed',
]);

export const UNIT_COMPLETION_SOURCE_TYPES: ReadonlySet<string> = new Set([
  'week_completed',
]);

export type InsightsWeek = {
  studyMinutes: number;
  watchedMinutesLogged: number;
  weekKey: string;
  weekLabel: string;
  xpCumulative: number;
  xpEarned: number;
};

export type InsightsWeeklyActivity = {
  isEmpty: boolean;
  maxStudyMinutes: number;
  maxWatchedMinutesLogged: number;
  maxWeeklyXp: number;
  totalStudyMinutes: number;
  totalStudyMinutesLabel: string;
  totalWatchedMinutesLogged: number;
  totalWatchedMinutesLoggedLabel: string;
  totalXp: number;
  weeks: InsightsWeek[];
};

export type InsightsModeRow = {
  mode: StudySessionMode;
  modeLabel: string;
  percentOfMinutes: number;
  sessionCount: number;
  totalMinutes: number;
  totalMinutesLabel: string;
};

export type InsightsModeBreakdown = {
  isEmpty: boolean;
  rows: InsightsModeRow[];
  totalMinutes: number;
  totalSessions: number;
};

export type InsightsActiveDays = {
  activeDaysInWindow: number;
  consecutiveActiveDays: number;
  isEmpty: boolean;
  lastActiveDate: string | null;
  windowDays: number;
};

export type InsightsCompletionAwardWeek = {
  itemAwardCount: number;
  unitAwardCount: number;
  weekKey: string;
  weekLabel: string;
};

export type InsightsCompletionAwards = {
  isEmpty: boolean;
  totalItemAwards: number;
  totalUnitAwards: number;
  weeks: InsightsCompletionAwardWeek[];
};

export type InsightsAchievementTimelineEntry = {
  category: AchievementCategory;
  id: string;
  title: string;
  unlockedAt: string;
  unlockedDate: string;
};

export type InsightsAchievementTimeline = {
  entries: InsightsAchievementTimelineEntry[];
  isEmpty: boolean;
  totalCount: number;
  unlockedCount: number;
};

export type InsightsCourseProgressSnapshot = {
  completedRequiredItemCount: number;
  completionPercent: number;
  requiredItemCount: number;
};

export type InsightsModel = {
  achievementTimeline: InsightsAchievementTimeline;
  activeDays: InsightsActiveDays;
  completionAwards: InsightsCompletionAwards;
  courseProgress: InsightsCourseProgressSnapshot;
  modeBreakdown: InsightsModeBreakdown;
  weeklyActivity: InsightsWeeklyActivity;
};

export type InsightsModelInput = {
  achievements: AchievementsView;
  courseMap: CourseMapView;
  mediaProgressEvents: readonly MediaProgressEvent[];
  studySessions: readonly StudySession[];
  xpTransactions: readonly XpTransaction[];
};

export type BuildInsightsModelOptions = {
  activeDaysWindow?: number;
  now?: string;
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Local-device calendar day (YYYY-MM-DD) of an absolute instant. */
function localDayKey(isoTimestamp: string) {
  return formatLocalDate(new Date(isoTimestamp));
}

/** Local-device Monday-week-start day (YYYY-MM-DD) of an absolute instant. */
function localWeekStartKey(isoTimestamp: string) {
  const date = new Date(isoTimestamp);
  const dayOfWeek = date.getDay(); // 0 = Sunday … 6 = Saturday
  const mondayOffset = (dayOfWeek + 6) % 7;
  const monday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - mondayOffset,
  );

  return formatLocalDate(monday);
}

/** Stable integer day index for a YYYY-MM-DD key, for adjacency comparisons. */
function dayIndexFromKey(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number);

  return Math.floor(Date.UTC(year!, month! - 1, day!) / 86_400_000);
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, roundToSingleDecimal(value)));
}

type WeekAccumulator = {
  studyMinutes: number;
  watchedSeconds: number;
  weekKey: string;
  xpEarned: number;
};

function buildWeeklyActivity(
  input: InsightsModelInput,
): InsightsWeeklyActivity {
  const byWeek = new Map<string, WeekAccumulator>();

  const ensureWeek = (weekKey: string) => {
    let week = byWeek.get(weekKey);

    if (week === undefined) {
      week = { studyMinutes: 0, watchedSeconds: 0, weekKey, xpEarned: 0 };
      byWeek.set(weekKey, week);
    }

    return week;
  };

  for (const studySession of input.studySessions) {
    if (studySession.durationMinutes <= 0) {
      continue;
    }

    ensureWeek(localWeekStartKey(studySession.startedAt)).studyMinutes +=
      studySession.durationMinutes;
  }

  // "Watched minutes logged" sums each event's logged watchedSeconds. It is a
  // measure of logging effort over time and may include overlapping ranges; it
  // is deliberately NOT unique watched coverage (which is a current snapshot).
  for (const event of input.mediaProgressEvents) {
    ensureWeek(localWeekStartKey(event.createdAt)).watchedSeconds +=
      event.watchedSeconds;
  }

  for (const transaction of input.xpTransactions) {
    ensureWeek(localWeekStartKey(transaction.awardedAt)).xpEarned +=
      transaction.xp;
  }

  const orderedWeeks = [...byWeek.values()].sort((left, right) =>
    left.weekKey.localeCompare(right.weekKey),
  );

  let xpCumulative = 0;
  const weeks: InsightsWeek[] = orderedWeeks.map((week) => {
    const watchedMinutesLogged = Math.floor(week.watchedSeconds / 60);

    xpCumulative += week.xpEarned;

    return {
      studyMinutes: week.studyMinutes,
      watchedMinutesLogged,
      weekKey: week.weekKey,
      weekLabel: `Week of ${week.weekKey}`,
      xpCumulative,
      xpEarned: week.xpEarned,
    };
  });

  const totalStudyMinutes = weeks.reduce(
    (total, week) => total + week.studyMinutes,
    0,
  );
  const totalWatchedMinutesLogged = weeks.reduce(
    (total, week) => total + week.watchedMinutesLogged,
    0,
  );

  return {
    isEmpty: weeks.length === 0,
    maxStudyMinutes: weeks.reduce(
      (max, week) => Math.max(max, week.studyMinutes),
      0,
    ),
    maxWatchedMinutesLogged: weeks.reduce(
      (max, week) => Math.max(max, week.watchedMinutesLogged),
      0,
    ),
    maxWeeklyXp: weeks.reduce((max, week) => Math.max(max, week.xpEarned), 0),
    totalStudyMinutes,
    totalStudyMinutesLabel: formatMinutes(totalStudyMinutes),
    totalWatchedMinutesLogged,
    totalWatchedMinutesLoggedLabel: formatMinutes(totalWatchedMinutesLogged),
    totalXp: xpCumulative,
    weeks,
  };
}

function buildModeBreakdown(
  sessions: readonly StudySession[],
): InsightsModeBreakdown {
  type ModeAccumulator = { sessionCount: number; totalMinutes: number };
  const byMode = new Map<StudySessionMode, ModeAccumulator>();
  let totalMinutes = 0;
  let totalSessions = 0;

  for (const studySession of sessions) {
    if (studySession.durationMinutes <= 0) {
      continue;
    }

    let accumulator = byMode.get(studySession.mode);

    if (accumulator === undefined) {
      accumulator = { sessionCount: 0, totalMinutes: 0 };
      byMode.set(studySession.mode, accumulator);
    }

    accumulator.sessionCount += 1;
    accumulator.totalMinutes += studySession.durationMinutes;
    totalMinutes += studySession.durationMinutes;
    totalSessions += 1;
  }

  const rows: InsightsModeRow[] = [...byMode.entries()]
    .map(([mode, accumulator]) => ({
      mode,
      modeLabel: getModeLabel(mode),
      percentOfMinutes:
        totalMinutes > 0
          ? clampPercent((accumulator.totalMinutes / totalMinutes) * 100)
          : 0,
      sessionCount: accumulator.sessionCount,
      totalMinutes: accumulator.totalMinutes,
      totalMinutesLabel: formatMinutes(accumulator.totalMinutes),
    }))
    .sort(
      (left, right) =>
        right.totalMinutes - left.totalMinutes ||
        left.modeLabel.localeCompare(right.modeLabel),
    );

  return {
    isEmpty: rows.length === 0,
    rows,
    totalMinutes,
    totalSessions,
  };
}

function buildActiveDays(
  sessions: readonly StudySession[],
  nowIso: string,
  windowDays: number,
): InsightsActiveDays {
  const activeDayKeys = new Set<string>();

  for (const studySession of sessions) {
    if (studySession.durationMinutes > 0) {
      activeDayKeys.add(localDayKey(studySession.startedAt));
    }
  }

  if (activeDayKeys.size === 0) {
    return {
      activeDaysInWindow: 0,
      consecutiveActiveDays: 0,
      isEmpty: true,
      lastActiveDate: null,
      windowDays,
    };
  }

  const sortedKeys = [...activeDayKeys].sort((left, right) =>
    left.localeCompare(right),
  );

  const now = new Date(nowIso);
  const todayKey = formatLocalDate(now);
  const windowStartKey = formatLocalDate(
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (windowDays - 1),
    ),
  );
  const activeDaysInWindow = sortedKeys.filter(
    (key) => key >= windowStartKey && key <= todayKey,
  ).length;

  // Consecutive active days = the run of adjacent local days ending at the most
  // recent active day. This is a factual run length, not a streak that breaks
  // against "today"; no motivational framing is implied.
  const lastActiveDate = sortedKeys[sortedKeys.length - 1]!;
  let consecutiveActiveDays = 1;

  for (let index = sortedKeys.length - 1; index > 0; index -= 1) {
    const current = dayIndexFromKey(sortedKeys[index]!);
    const previous = dayIndexFromKey(sortedKeys[index - 1]!);

    if (current - previous === 1) {
      consecutiveActiveDays += 1;
    } else {
      break;
    }
  }

  return {
    activeDaysInWindow,
    consecutiveActiveDays,
    isEmpty: false,
    lastActiveDate,
    windowDays,
  };
}

function buildCompletionAwards(
  transactions: readonly XpTransaction[],
): InsightsCompletionAwards {
  const byWeek = new Map<
    string,
    { itemAwardCount: number; unitAwardCount: number }
  >();
  let totalItemAwards = 0;
  let totalUnitAwards = 0;

  for (const transaction of transactions) {
    const isItemAward = ITEM_COMPLETION_SOURCE_TYPES.has(
      transaction.sourceType,
    );
    const isUnitAward = UNIT_COMPLETION_SOURCE_TYPES.has(
      transaction.sourceType,
    );

    if (!isItemAward && !isUnitAward) {
      continue;
    }

    const weekKey = localWeekStartKey(transaction.awardedAt);
    let week = byWeek.get(weekKey);

    if (week === undefined) {
      week = { itemAwardCount: 0, unitAwardCount: 0 };
      byWeek.set(weekKey, week);
    }

    if (isItemAward) {
      week.itemAwardCount += 1;
      totalItemAwards += 1;
    } else {
      week.unitAwardCount += 1;
      totalUnitAwards += 1;
    }
  }

  const weeks: InsightsCompletionAwardWeek[] = [...byWeek.entries()]
    .map(([weekKey, counts]) => ({
      itemAwardCount: counts.itemAwardCount,
      unitAwardCount: counts.unitAwardCount,
      weekKey,
      weekLabel: `Week of ${weekKey}`,
    }))
    .sort((left, right) => left.weekKey.localeCompare(right.weekKey));

  return {
    isEmpty: weeks.length === 0,
    totalItemAwards,
    totalUnitAwards,
    weeks,
  };
}

function buildAchievementTimeline(
  view: AchievementsView,
): InsightsAchievementTimeline {
  const entries: InsightsAchievementTimelineEntry[] = view.achievements
    .filter(
      (achievement) => achievement.unlocked && achievement.unlockedAt !== null,
    )
    .map((achievement) => ({
      category: achievement.category,
      id: achievement.id,
      title: achievement.title,
      unlockedAt: achievement.unlockedAt!,
      unlockedDate: localDayKey(achievement.unlockedAt!),
    }))
    .sort(
      (left, right) =>
        right.unlockedAt.localeCompare(left.unlockedAt) ||
        left.id.localeCompare(right.id),
    );

  return {
    entries,
    isEmpty: entries.length === 0,
    totalCount: view.totalCount,
    unlockedCount: view.unlockedCount,
  };
}

function buildCourseProgress(
  courseMap: CourseMapView,
): InsightsCourseProgressSnapshot {
  return {
    completedRequiredItemCount: courseMap.completedRequiredItemCount,
    completionPercent: clampPercent(courseMap.completionPercent),
    requiredItemCount: courseMap.requiredItemCount,
  };
}

export function buildInsightsModel(
  input: InsightsModelInput,
  options: BuildInsightsModelOptions = {},
): InsightsModel {
  const nowIso = options.now ?? new Date().toISOString();
  const windowDays = options.activeDaysWindow ?? DEFAULT_ACTIVE_DAYS_WINDOW;

  return {
    achievementTimeline: buildAchievementTimeline(input.achievements),
    activeDays: buildActiveDays(input.studySessions, nowIso, windowDays),
    completionAwards: buildCompletionAwards(input.xpTransactions),
    courseProgress: buildCourseProgress(input.courseMap),
    modeBreakdown: buildModeBreakdown(input.studySessions),
    weeklyActivity: buildWeeklyActivity(input),
  };
}
