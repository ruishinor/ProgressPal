import {
  formatMinutes,
  getItemStatusLabel,
  type CourseMapItem,
  type CourseMapView,
} from '@/features/course/model';
import type { CourseLongFormProgress } from '@/features/progress';
import { getModeLabel } from '@/features/sessions/model';
import type { AchievementsView } from '@/lib/db';
import type {
  MediaProgressEvent,
  ProgressEntry,
  ResumePoint,
  StudySession,
  XpTransaction,
} from '@/lib/domain';
import type { XpSummary } from '@/lib/xp/engine';

/**
 * Module 14 dashboard model. This file is intentionally pure: it takes
 * already-fetched, already-derived local data and returns a fully formatted,
 * label-ready view. It performs no Dexie access, no IO, no route logic, and no
 * mutation. Every number is derived from existing source-of-truth records and
 * existing read models — the dashboard stores nothing of its own.
 *
 * "Recent activity" is built only from records that already exist because a user
 * explicitly saved something (progress, media, study sessions, XP awards,
 * achievement unlocks). This model never synthesizes activity and never treats
 * app open, reload, navigation, or a passive read as activity.
 */

export const DEFAULT_RECENT_ACTIVITY_LIMIT = 6;

export type DashboardCourseProgress = {
  blockedItemCount: number;
  completedRequiredItemCount: number;
  completedUnitCount: number;
  completionPercent: number;
  requiredItemCount: number;
  statusLabel: string;
  unitCount: number;
};

export type DashboardContinueNextReason = 'in_progress' | 'not_started';

export type DashboardContinueNext =
  | {
      itemId: string;
      itemTitle: string;
      kind: 'recommended';
      reason: DashboardContinueNextReason;
      statusLabel: string;
      unitTitle: string;
    }
  | { kind: 'course_complete' }
  | { kind: 'blocked_only' }
  | { kind: 'none' };

export type DashboardXpSummary = {
  currentLevelFloorXp: number;
  isEmpty: boolean;
  level: number;
  levelProgressPercent: number;
  nextLevelXp: number;
  totalXp: number;
  xpToNextLevel: number;
};

export type DashboardAchievementsSummary = {
  isEmpty: boolean;
  latestUnlockDate: string | null;
  latestUnlockTitle: string | null;
  totalCount: number;
  unlockedCount: number;
};

export type DashboardActivityKind =
  | 'study_session'
  | 'progress'
  | 'media'
  | 'xp'
  | 'achievement';

export type DashboardActivityItem = {
  date: string;
  id: string;
  itemId: string | null;
  kind: DashboardActivityKind;
  label: string;
  timestamp: string;
};

export type DashboardRecentActivity = {
  isEmpty: boolean;
  items: DashboardActivityItem[];
};

export type DashboardBlockedItem = {
  itemId: string;
  itemTitle: string;
  unitTitle: string;
};

export type DashboardBlockedItems = {
  isEmpty: boolean;
  items: DashboardBlockedItem[];
};

export type DashboardResume =
  | {
      itemId: string;
      itemTitle: string;
      kind: 'resume';
      resumeLabel: string;
      sliceProgressLabel: string;
      unitTitle: string;
    }
  | { kind: 'empty' };

export type DashboardStudySummary = {
  isEmpty: boolean;
  lastSessionDate: string | null;
  sessionCount: number;
  totalMinutes: number;
  totalMinutesLabel: string;
};

export type DashboardModel = {
  achievements: DashboardAchievementsSummary;
  blockedItems: DashboardBlockedItems;
  continueNext: DashboardContinueNext;
  courseProgress: DashboardCourseProgress;
  recentActivity: DashboardRecentActivity;
  resume: DashboardResume;
  studySummary: DashboardStudySummary;
  xpSummary: DashboardXpSummary;
};

export type DashboardModelInput = {
  achievements: AchievementsView;
  courseMap: CourseMapView;
  longFormByItemId: ReadonlyMap<string, CourseLongFormProgress>;
  mediaProgressEvents: readonly MediaProgressEvent[];
  progressEntries: readonly ProgressEntry[];
  resumePoints: readonly ResumePoint[];
  studySessions: readonly StudySession[];
  xpSummary: XpSummary;
  xpTransactions: readonly XpTransaction[];
};

export type BuildDashboardModelOptions = {
  recentActivityLimit?: number;
};

type ItemMeta = {
  required: boolean;
  title: string;
  unitTitle: string;
};

function toDateOnly(isoTimestamp: string) {
  return isoTimestamp.slice(0, 10);
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, roundToSingleDecimal(value)));
}

function buildItemIndex(courseMap: CourseMapView): Map<string, ItemMeta> {
  const index = new Map<string, ItemMeta>();

  for (const unit of courseMap.units) {
    for (const item of unit.items) {
      index.set(item.id, {
        required: item.required,
        title: item.title,
        unitTitle: unit.title,
      });
    }
  }

  return index;
}

function buildCourseProgress(
  courseMap: CourseMapView,
): DashboardCourseProgress {
  const allRequiredComplete =
    courseMap.requiredItemCount > 0 &&
    courseMap.completedRequiredItemCount === courseMap.requiredItemCount;
  const statusLabel =
    courseMap.blockedItemCount > 0
      ? 'Blocked items present'
      : allRequiredComplete
        ? 'All required items complete'
        : courseMap.completedRequiredItemCount > 0 ||
            courseMap.startedItemCount > 0
          ? 'In progress'
          : 'Not started';

  return {
    blockedItemCount: courseMap.blockedItemCount,
    completedRequiredItemCount: courseMap.completedRequiredItemCount,
    completedUnitCount: courseMap.completedUnitCount,
    completionPercent: clampPercent(courseMap.completionPercent),
    requiredItemCount: courseMap.requiredItemCount,
    statusLabel,
    unitCount: courseMap.unitCount,
  };
}

function selectContinueNext(courseMap: CourseMapView): DashboardContinueNext {
  const requiredItems: Array<{ item: CourseMapItem; unitTitle: string }> = [];

  for (const unit of courseMap.units) {
    for (const item of unit.items) {
      if (item.required) {
        requiredItems.push({ item, unitTitle: unit.title });
      }
    }
  }

  if (requiredItems.length === 0) {
    return { kind: 'none' };
  }

  const incomplete = requiredItems.filter(
    ({ item }) => item.statusVariant !== 'completed',
  );

  if (incomplete.length === 0) {
    return { kind: 'course_complete' };
  }

  const candidates = incomplete.filter(
    ({ item }) => item.statusVariant !== 'blocked',
  );

  if (candidates.length === 0) {
    return { kind: 'blocked_only' };
  }

  const inProgress = candidates.find(
    ({ item }) =>
      item.statusVariant === 'inProgress' ||
      item.longFormProgress?.hasProgress === true,
  );
  const chosen = inProgress ?? candidates[0]!;

  return {
    itemId: chosen.item.id,
    itemTitle: chosen.item.title,
    kind: 'recommended',
    reason: inProgress ? 'in_progress' : 'not_started',
    statusLabel: chosen.item.statusLabel,
    unitTitle: chosen.unitTitle,
  };
}

function buildXpSummary(xpSummary: XpSummary): DashboardXpSummary {
  const span = xpSummary.nextLevelXp - xpSummary.currentLevelFloorXp;
  const rawPercent =
    span > 0
      ? ((xpSummary.totalXp - xpSummary.currentLevelFloorXp) / span) * 100
      : 0;

  return {
    currentLevelFloorXp: xpSummary.currentLevelFloorXp,
    isEmpty: xpSummary.totalXp === 0,
    level: xpSummary.level,
    levelProgressPercent: clampPercent(rawPercent),
    nextLevelXp: xpSummary.nextLevelXp,
    totalXp: xpSummary.totalXp,
    xpToNextLevel: xpSummary.xpToNextLevel,
  };
}

function buildAchievementsSummary(
  view: AchievementsView,
): DashboardAchievementsSummary {
  const unlocked = view.achievements.filter(
    (achievement) => achievement.unlocked && achievement.unlockedAt !== null,
  );
  const latest =
    [...unlocked].sort(
      (left, right) =>
        right.unlockedAt!.localeCompare(left.unlockedAt!) ||
        left.id.localeCompare(right.id),
    )[0] ?? null;

  return {
    isEmpty: view.unlockedCount === 0,
    latestUnlockDate: latest ? toDateOnly(latest.unlockedAt!) : null,
    latestUnlockTitle: latest?.title ?? null,
    totalCount: view.totalCount,
    unlockedCount: view.unlockedCount,
  };
}

function buildRecentActivity(
  input: DashboardModelInput,
  index: Map<string, ItemMeta>,
  limit: number,
): DashboardRecentActivity {
  const titleOf = (itemId: string) => index.get(itemId)?.title ?? itemId;
  const entries: DashboardActivityItem[] = [];

  for (const session of input.studySessions) {
    entries.push({
      date: toDateOnly(session.startedAt),
      id: `study_session:${session.id}`,
      itemId: session.itemId,
      kind: 'study_session',
      label: `${getModeLabel(session.mode)} session — ${titleOf(session.itemId)} (${formatMinutes(session.durationMinutes)})`,
      timestamp: session.startedAt,
    });
  }

  for (const entry of input.progressEntries) {
    const required = index.get(entry.itemId)?.required ?? false;

    entries.push({
      date: toDateOnly(entry.updatedAt),
      id: `progress:${entry.id}`,
      itemId: entry.itemId,
      kind: 'progress',
      label: `Saved progress — ${titleOf(entry.itemId)} (${getItemStatusLabel(required, entry.status)})`,
      timestamp: entry.updatedAt,
    });
  }

  for (const event of input.mediaProgressEvents) {
    entries.push({
      date: toDateOnly(event.createdAt),
      id: `media:${event.id}`,
      itemId: event.itemId,
      kind: 'media',
      label: `Logged watch time — ${titleOf(event.itemId)}`,
      timestamp: event.createdAt,
    });
  }

  for (const transaction of input.xpTransactions) {
    entries.push({
      date: toDateOnly(transaction.awardedAt),
      id: `xp:${transaction.id}`,
      itemId: null,
      kind: 'xp',
      label: `Earned ${transaction.xp} XP — ${transaction.reason}`,
      timestamp: transaction.awardedAt,
    });
  }

  for (const achievement of input.achievements.achievements) {
    if (achievement.unlocked && achievement.unlockedAt !== null) {
      entries.push({
        date: toDateOnly(achievement.unlockedAt),
        id: `achievement:${achievement.id}`,
        itemId: null,
        kind: 'achievement',
        label: `Unlocked achievement — ${achievement.title}`,
        timestamp: achievement.unlockedAt,
      });
    }
  }

  entries.sort(
    (left, right) =>
      right.timestamp.localeCompare(left.timestamp) ||
      left.id.localeCompare(right.id),
  );

  const items = entries.slice(0, Math.max(0, limit));

  return {
    isEmpty: items.length === 0,
    items,
  };
}

function buildBlockedItems(courseMap: CourseMapView): DashboardBlockedItems {
  const items: DashboardBlockedItem[] = [];

  for (const unit of courseMap.units) {
    for (const item of unit.items) {
      if (item.statusVariant === 'blocked') {
        items.push({
          itemId: item.id,
          itemTitle: item.title,
          unitTitle: unit.title,
        });
      }
    }
  }

  return {
    isEmpty: items.length === 0,
    items,
  };
}

function buildResume(
  input: DashboardModelInput,
  index: Map<string, ItemMeta>,
): DashboardResume {
  const sortedResumePoints = [...input.resumePoints].sort(
    (left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) ||
      left.id.localeCompare(right.id),
  );

  for (const resumePoint of sortedResumePoints) {
    const view = input.longFormByItemId.get(resumePoint.itemId);

    if (
      view !== undefined &&
      view.hasProgress &&
      !view.isComplete &&
      view.resumeLabel !== null
    ) {
      return {
        itemId: resumePoint.itemId,
        itemTitle: index.get(resumePoint.itemId)?.title ?? resumePoint.itemId,
        kind: 'resume',
        resumeLabel: view.resumeLabel,
        sliceProgressLabel: view.sliceProgressLabel,
        unitTitle: index.get(resumePoint.itemId)?.unitTitle ?? 'Unknown unit',
      };
    }
  }

  return { kind: 'empty' };
}

function buildStudySummary(
  sessions: readonly StudySession[],
): DashboardStudySummary {
  const totalMinutes = sessions.reduce(
    (total, session) => total + session.durationMinutes,
    0,
  );
  const lastStartedAt = sessions.reduce<string | null>(
    (latest, session) =>
      latest === null || session.startedAt.localeCompare(latest) > 0
        ? session.startedAt
        : latest,
    null,
  );

  return {
    isEmpty: sessions.length === 0,
    lastSessionDate: lastStartedAt === null ? null : toDateOnly(lastStartedAt),
    sessionCount: sessions.length,
    totalMinutes,
    totalMinutesLabel: formatMinutes(totalMinutes),
  };
}

export function buildDashboardModel(
  input: DashboardModelInput,
  options: BuildDashboardModelOptions = {},
): DashboardModel {
  const limit = options.recentActivityLimit ?? DEFAULT_RECENT_ACTIVITY_LIMIT;
  const index = buildItemIndex(input.courseMap);

  return {
    achievements: buildAchievementsSummary(input.achievements),
    blockedItems: buildBlockedItems(input.courseMap),
    continueNext: selectContinueNext(input.courseMap),
    courseProgress: buildCourseProgress(input.courseMap),
    recentActivity: buildRecentActivity(input, index, limit),
    resume: buildResume(input, index),
    studySummary: buildStudySummary(input.studySessions),
    xpSummary: buildXpSummary(input.xpSummary),
  };
}
