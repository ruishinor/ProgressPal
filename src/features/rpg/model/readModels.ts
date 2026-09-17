import {
  buildCourseDetailView,
  type CourseDetailView,
} from '@/features/course/detailModel';
import { achievementCategoryLabels } from '@/features/achievements/model';
import {
  buildCourseMap,
  type CourseMapItem,
  type CourseMapUnit,
  type CourseMapView,
} from '@/features/course/model';
import {
  getCs50ItemLink,
  getCs50UnitLink,
  type Cs50Link,
} from '@/features/course/cs50Links';
import { buildLongFormProgressMap } from '@/features/progress/model';
import { achievementDefinitions } from '@/lib/achievements';
import { isItemComplete } from '@/lib/completion';
import {
  getDatabaseSnapshot,
  type DatabaseSnapshot,
  type ProgressPalDatabase,
} from '@/lib/db';
import type { CourseItem, CourseUnit, ProgressEntry } from '@/lib/domain';
import { formatLocalDate, getLocalWeekStart } from '@/lib/time';
import { calculateXpSummary } from '@/lib/xp/engine';
import { buildQuestRewardLabel } from './questRewards';

import type {
  RpgBadgeGallerySummary,
  RpgCourseMapSummary,
  RpgFocusSessionSummary,
  RpgHeroProfileSummary,
  RpgHubSummary,
  RpgHubWeeklyProgress,
  RpgModuleSummary,
  RpgOfficialLink,
  RpgQuestRecommendation,
  RpgQuestSummary,
  RpgStudyResourceSummary,
} from './types';

export const RPG_WEEK_FOUR_UNIT_ID = 'week-4';

export type RpgReadModelOptions = {
  db?: ProgressPalDatabase;
  now?: () => string;
};

type CourseMapContext = {
  courseMap: CourseMapView;
  itemById: ReadonlyMap<string, CourseItem>;
  progressByItemId: ReadonlyMap<string, ProgressEntry>;
  unitById: ReadonlyMap<string, CourseUnit>;
};

const rpgHubRecentActivityLimit = 5;

function toDateOnly(isoTimestamp: string) {
  return isoTimestamp.slice(0, 10);
}

function getWeekBounds(nowIso: string) {
  const now = new Date(nowIso);
  const validNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const weekStart = getLocalWeekStart(validNow.toISOString());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const nextWeekStart = new Date(weekStart);
  // Advance by local calendar days: a DST week can be 167 or 169 hours.
  nextWeekStart.setDate(weekStart.getDate() + 7);

  return {
    endDate: formatLocalDate(weekEnd),
    nextStartTime: nextWeekStart.getTime(),
    startDate: formatLocalDate(weekStart),
    startTime: weekStart.getTime(),
  };
}

function isIsoInRange(
  isoTimestamp: string,
  startTime: number,
  nextStartTime: number,
) {
  const time = Date.parse(isoTimestamp);

  return time >= startTime && time < nextStartTime;
}

function toRpgOfficialLink(link: Cs50Link | null): RpgOfficialLink | null {
  return link === null ? null : { label: link.label, url: link.url };
}

function buildCourseMapContext(snapshot: DatabaseSnapshot): CourseMapContext {
  const longFormByItemId = buildLongFormProgressMap(
    snapshot.contentAssets,
    snapshot.contentSlices,
    snapshot.mediaProgressEvents,
    snapshot.resumePoints,
    snapshot.progressEntries,
  );
  const courseMap = buildCourseMap(
    snapshot.courseUnits,
    snapshot.courseItems,
    snapshot.progressEntries,
    longFormByItemId,
  );

  return {
    courseMap,
    itemById: new Map(snapshot.courseItems.map((item) => [item.id, item])),
    progressByItemId: new Map(
      snapshot.progressEntries.map((entry) => [entry.itemId, entry]),
    ),
    unitById: new Map(snapshot.courseUnits.map((unit) => [unit.id, unit])),
  };
}

function buildQuestSummary(
  unit: CourseMapUnit,
  item: CourseMapItem,
  snapshot: DatabaseSnapshot,
): RpgQuestSummary {
  return {
    rewardLabel: buildQuestRewardLabel(snapshot, item.id),
    estimatedMinutes: item.estimatedMinutes,
    id: item.id,
    longFormProgress: item.longFormProgress,
    officialLink: toRpgOfficialLink(
      getCs50ItemLink(item.id) ?? getCs50UnitLink(unit.id),
    ),
    required: item.required,
    status: item.status,
    statusLabel: item.statusLabel,
    statusVariant: item.statusVariant,
    title: item.title,
    type: item.type,
    typeLabel: item.typeLabel,
    unitId: unit.id,
    unitTitle: unit.title,
  };
}

function buildModuleSummary(
  unit: CourseMapUnit,
  snapshot: DatabaseSnapshot,
): RpgModuleSummary {
  return {
    completedRequiredItemCount: unit.completedRequiredItemCount,
    completionPercent: unit.completionPercent,
    estimatedMinutes: unit.estimatedMinutes,
    id: unit.id,
    itemCount: unit.itemCount,
    officialLink: toRpgOfficialLink(getCs50UnitLink(unit.id)),
    quests: unit.items.map((item) => buildQuestSummary(unit, item, snapshot)),
    requiredItemCount: unit.requiredItemCount,
    statusLabel: unit.statusLabel,
    statusVariant: unit.statusVariant,
    title: unit.title,
    typeLabel: unit.typeLabel,
  };
}

function selectQuestRecommendation(
  modules: readonly RpgModuleSummary[],
  snapshot: DatabaseSnapshot,
): RpgQuestRecommendation {
  const quests = modules.flatMap((module) => module.quests);
  const requiredQuests = quests.filter((quest) => quest.required);
  const hasEmptyRequiredUnit = snapshot.courseUnits.some(
    (unit) =>
      unit.required &&
      !requiredQuests.some((quest) => quest.unitId === unit.id),
  );

  // A missing catalog or broken item/unit relation cannot establish completion.
  if (
    requiredQuests.length === 0 ||
    quests.length !== snapshot.courseItems.length ||
    hasEmptyRequiredUnit
  ) {
    return { state: 'unavailable', quest: null };
  }

  const incomplete = requiredQuests.filter(
    (quest) => !isItemComplete(quest.status),
  );
  const optionalRemainingCount = quests.filter(
    (quest) =>
      !quest.required &&
      !isItemComplete(quest.status) &&
      quest.status !== 'skipped_optional',
  ).length;

  if (incomplete.length === 0) {
    return {
      state: 'required_complete',
      quest: null,
      remainingRequiredCount: 0,
      optionalRemainingCount,
    };
  }

  const actionable = incomplete.filter((quest) => quest.status !== 'blocked');
  const nextActionable =
    actionable.find(
      (quest) =>
        quest.statusVariant === 'inProgress' ||
        quest.longFormProgress?.hasProgress === true,
    ) ?? actionable[0];

  return {
    state: nextActionable === undefined ? 'needs_attention' : 'actionable',
    quest: nextActionable ?? incomplete[0],
    remainingRequiredCount: incomplete.length,
    optionalRemainingCount,
  };
}

function selectCurrentModule(
  modules: readonly RpgModuleSummary[],
  recommendation: RpgQuestRecommendation,
) {
  return (
    modules.find((module) => module.id === recommendation.quest?.unitId) ?? null
  );
}

function getRankLabel({
  completedRequiredItemCount,
  requiredItemCount,
}: RpgCourseMapSummary) {
  if (requiredItemCount <= 0 || completedRequiredItemCount <= 0) {
    return 'New Learner';
  }

  const progressPercent =
    (completedRequiredItemCount / requiredItemCount) * 100;

  if (progressPercent >= 100) {
    return 'Course Finisher';
  }

  if (progressPercent >= 70) {
    return 'Capstone Candidate';
  }

  if (progressPercent >= 50) {
    return 'Builder';
  }

  if (progressPercent >= 20) {
    return 'Apprentice';
  }

  return 'Initiate';
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, roundToSingleDecimal(value)));
}

function getLevelProgressPercent({
  currentLevelFloorXp,
  nextLevelXp,
  totalXp,
}: {
  currentLevelFloorXp: number;
  nextLevelXp: number;
  totalXp: number;
}) {
  const span = nextLevelXp - currentLevelFloorXp;

  if (span <= 0) {
    return 0;
  }

  return clampPercent(((totalXp - currentLevelFloorXp) / span) * 100);
}

function buildWeeklyProgress(
  snapshot: DatabaseSnapshot,
  nowIso: string,
): RpgHubWeeklyProgress {
  const { endDate, nextStartTime, startDate, startTime } =
    getWeekBounds(nowIso);
  const completedRequiredItemIds = new Set(
    snapshot.courseItems.filter((item) => item.required).map((item) => item.id),
  );
  const thisWeeksProgress = snapshot.progressEntries.filter((entry) =>
    isIsoInRange(entry.updatedAt, startTime, nextStartTime),
  );
  const thisWeeksSessions = snapshot.studySessions.filter((session) =>
    isIsoInRange(session.startedAt, startTime, nextStartTime),
  );
  const thisWeeksXp = snapshot.xpTransactions.filter((transaction) =>
    isIsoInRange(transaction.awardedAt, startTime, nextStartTime),
  );

  return {
    completedRequiredItemCount: thisWeeksProgress.filter(
      (entry) =>
        completedRequiredItemIds.has(entry.itemId) &&
        entry.status === 'completed',
    ).length,
    savedProgressCount: thisWeeksProgress.length,
    sessionCount: thisWeeksSessions.length,
    totalMinutes: thisWeeksSessions.reduce(
      (total, session) => total + session.durationMinutes,
      0,
    ),
    weekEndDate: endDate,
    weekStartDate: startDate,
    xpEarned: thisWeeksXp.reduce(
      (total, transaction) => total + transaction.xp,
      0,
    ),
  };
}

function buildRecentActivity(snapshot: DatabaseSnapshot) {
  const itemTitleById = new Map(
    snapshot.courseItems.map((item) => [item.id, item.title]),
  );
  const entries = [
    ...snapshot.progressEntries.map((entry) => ({
      date: toDateOnly(entry.updatedAt),
      id: `progress:${entry.id}`,
      label: `Saved progress - ${itemTitleById.get(entry.itemId) ?? entry.itemId} (${entry.status})`,
      timestamp: entry.updatedAt,
    })),
    ...snapshot.studySessions.map((session) => ({
      date: toDateOnly(session.startedAt),
      id: `study_session:${session.id}`,
      label: `Saved study session - ${itemTitleById.get(session.itemId) ?? session.itemId}`,
      timestamp: session.startedAt,
    })),
    ...snapshot.xpTransactions.map((transaction) => ({
      date: toDateOnly(transaction.awardedAt),
      id: `xp:${transaction.id}`,
      label: `Earned ${transaction.xp} XP - ${transaction.reason}`,
      timestamp: transaction.awardedAt,
    })),
  ];

  entries.sort(
    (left, right) =>
      right.timestamp.localeCompare(left.timestamp) ||
      left.id.localeCompare(right.id),
  );

  return entries.slice(0, rpgHubRecentActivityLimit);
}

export function buildRpgBadgeGallerySummary(
  snapshot: DatabaseSnapshot,
): RpgBadgeGallerySummary {
  const unlockByAchievementId = new Map(
    snapshot.achievementUnlocks.map((unlock) => [unlock.achievementId, unlock]),
  );
  const badges = achievementDefinitions.map((definition, index) => {
    const unlock = unlockByAchievementId.get(definition.id) ?? null;
    const earned = unlock !== null;

    return {
      category: definition.category,
      categoryLabel: achievementCategoryLabels[definition.category],
      description: definition.description,
      earned,
      earnedAt: unlock?.unlockedAt ?? null,
      id: definition.id,
      order: index,
      requirementText: definition.description,
      status: earned ? ('earned' as const) : ('locked' as const),
      statusLabel: earned ? ('Earned' as const) : ('Locked' as const),
      title: definition.title,
      triggerSourceId: unlock?.triggerSourceId ?? null,
    };
  });
  const earnedBadgeCount = badges.filter((badge) => badge.earned).length;

  return {
    badges,
    earnedBadgeCount,
    lockedBadgeCount: badges.length - earnedBadgeCount,
    totalBadgeCount: badges.length,
  };
}

export function buildRpgHeroProfileSummary(
  snapshot: DatabaseSnapshot,
  nowIso = new Date().toISOString(),
): RpgHeroProfileSummary {
  const hubSummary = buildRpgHubSummary(snapshot, nowIso);
  const badgeGallery = buildRpgBadgeGallerySummary(snapshot);

  return {
    badges: {
      earnedBadgeCount: badgeGallery.earnedBadgeCount,
      totalBadgeCount: badgeGallery.totalBadgeCount,
    },
    courseProgress: hubSummary.courseProgress,
    hasLocalActivity:
      hubSummary.courseProgress.completedRequiredItemCount > 0 ||
      hubSummary.recentActivity.length > 0 ||
      hubSummary.studySummary.sessionCount > 0 ||
      hubSummary.xpSummary.totalXp > 0 ||
      badgeGallery.earnedBadgeCount > 0,
    identity: hubSummary.identity,
    learnerAvatarConfig: hubSummary.learnerAvatarConfig,
    learnerName: hubSummary.learnerName,
    recentActivity: hubSummary.recentActivity,
    studySummary: hubSummary.studySummary,
    xpSummary: hubSummary.xpSummary,
  };
}

export function buildRpgCourseMapSummary(
  snapshot: DatabaseSnapshot,
): RpgCourseMapSummary {
  const { courseMap } = buildCourseMapContext(snapshot);
  const modules = courseMap.units.map((unit) =>
    buildModuleSummary(unit, snapshot),
  );
  const recommendation = selectQuestRecommendation(modules, snapshot);

  return {
    completedRequiredItemCount: courseMap.completedRequiredItemCount,
    completionPercent: courseMap.completionPercent,
    currentModule: selectCurrentModule(modules, recommendation),
    modules,
    requiredItemCount: courseMap.requiredItemCount,
    unitCount: courseMap.unitCount,
    weekFour:
      modules.find((module) => module.id === RPG_WEEK_FOUR_UNIT_ID) ?? null,
  };
}

export function buildRpgModuleSummary(
  snapshot: DatabaseSnapshot,
  unitId: string,
): RpgModuleSummary | null {
  const { courseMap } = buildCourseMapContext(snapshot);
  const unit = courseMap.units.find((candidate) => candidate.id === unitId);

  return unit === undefined ? null : buildModuleSummary(unit, snapshot);
}

export function buildRpgHubSummary(
  snapshot: DatabaseSnapshot,
  nowIso = new Date().toISOString(),
): RpgHubSummary {
  const courseMapSummary = buildRpgCourseMapSummary(snapshot);
  const recommendation = selectQuestRecommendation(
    courseMapSummary.modules,
    snapshot,
  );
  const xpSummary = calculateXpSummary(
    snapshot.xpTransactions.reduce((total, transaction) => {
      return total + transaction.xp;
    }, 0),
  );
  const totalMinutes = snapshot.studySessions.reduce((total, session) => {
    return total + session.durationMinutes;
  }, 0);

  return {
    recommendation,
    courseProgress: {
      completedRequiredItemCount: courseMapSummary.completedRequiredItemCount,
      completionPercent: courseMapSummary.completionPercent,
      requiredItemCount: courseMapSummary.requiredItemCount,
    },
    currentModule: selectCurrentModule(
      courseMapSummary.modules,
      recommendation,
    ),
    identity: {
      classLabel: 'Generalist',
      guildLabel: 'Code Knights',
      pathLabel: 'CS Foundations',
      rankLabel: getRankLabel(courseMapSummary),
    },
    learnerAvatarConfig: snapshot.learnerProfile?.avatarConfig ?? null,
    learnerName: snapshot.learnerProfile?.displayName ?? 'Learner',
    recentActivity: buildRecentActivity(snapshot),
    studySummary: {
      sessionCount: snapshot.studySessions.length,
      totalMinutes,
    },
    weeklyProgress: buildWeeklyProgress(snapshot, nowIso),
    weekFour: courseMapSummary.weekFour,
    xpSummary: {
      level: xpSummary.level,
      levelProgressPercent: getLevelProgressPercent(xpSummary),
      totalXp: xpSummary.totalXp,
      xpToNextLevel: xpSummary.xpToNextLevel,
    },
  };
}

function getLongFormProgressForItem(
  snapshot: DatabaseSnapshot,
  itemId: string,
) {
  return (
    buildLongFormProgressMap(
      snapshot.contentAssets,
      snapshot.contentSlices,
      snapshot.mediaProgressEvents,
      snapshot.resumePoints,
      snapshot.progressEntries,
    ).get(itemId) ?? null
  );
}

function buildStudyResourceFromDetail(
  detail: CourseDetailView,
  item: CourseItem,
  progressEntry: ProgressEntry | null,
  unitId: string,
  rewardLabel: string,
): RpgStudyResourceSummary {
  return {
    rewardLabel,
    estimatedMinutesLabel: detail.estimatedMinutesLabel,
    itemId: detail.itemId,
    itemType: item.type,
    longFormProgress: detail.longFormProgress,
    officialLink: toRpgOfficialLink(
      getCs50ItemLink(detail.itemId) ?? getCs50UnitLink(unitId),
    ),
    progressStatus: detail.progressStatus,
    required: detail.required,
    savedProgress:
      progressEntry === null
        ? null
        : {
            completedAt: progressEntry.completedAt ?? null,
            confidence: progressEntry.confidence,
            evidenceText: progressEntry.evidenceText ?? null,
            notes: progressEntry.notes ?? null,
            startedAt: progressEntry.startedAt ?? null,
            status: progressEntry.status,
            updatedAt: progressEntry.updatedAt,
          },
    statusLabel: detail.statusLabel,
    statusVariant: detail.statusVariant,
    title: detail.title,
    typeLabel: detail.typeLabel,
    unitId,
    unitTitle: detail.unitTitle,
  };
}

export function buildRpgStudyResourceSummary(
  snapshot: DatabaseSnapshot,
  itemId: string,
): RpgStudyResourceSummary | null {
  const context = buildCourseMapContext(snapshot);
  const item = context.itemById.get(itemId);

  if (item === undefined) {
    return null;
  }

  const unit = context.unitById.get(item.unitId);

  if (unit === undefined) {
    return null;
  }

  const progressEntry = context.progressByItemId.get(item.id) ?? null;
  const detail = buildCourseDetailView(
    unit,
    item,
    progressEntry,
    getLongFormProgressForItem(snapshot, item.id),
  );

  return buildStudyResourceFromDetail(
    detail,
    item,
    progressEntry,
    unit.id,
    buildQuestRewardLabel(snapshot, item.id),
  );
}

export function buildRpgFocusSessionSummary(
  snapshot: DatabaseSnapshot,
  itemId: string | null,
): RpgFocusSessionSummary {
  return {
    items: snapshot.courseItems.map((item) => ({
      estimatedMinutes: item.estimatedMinutes,
      id: item.id,
      order: item.order,
      required: item.required,
      title: item.title,
      type: item.type,
      unitId: item.unitId,
    })),
    requestedItemId: itemId,
    selectedResource:
      itemId === null ? null : buildRpgStudyResourceSummary(snapshot, itemId),
    units: snapshot.courseUnits.map((unit) => ({
      courseId: unit.courseId,
      id: unit.id,
      order: unit.order,
      required: unit.required,
      sourceYear: unit.sourceYear,
      title: unit.title,
      type: unit.type,
    })),
  };
}

async function readSnapshot(options: RpgReadModelOptions = {}) {
  return getDatabaseSnapshot(options);
}

export async function loadRpgHubSummary(
  options: RpgReadModelOptions = {},
): Promise<RpgHubSummary> {
  return buildRpgHubSummary(
    await readSnapshot(options),
    options.now?.() ?? new Date().toISOString(),
  );
}

export async function loadRpgCourseMapSummary(
  options: RpgReadModelOptions = {},
): Promise<RpgCourseMapSummary> {
  return buildRpgCourseMapSummary(await readSnapshot(options));
}

export async function loadRpgModuleSummary(
  unitId: string,
  options: RpgReadModelOptions = {},
): Promise<RpgModuleSummary | null> {
  return buildRpgModuleSummary(await readSnapshot(options), unitId);
}

export async function loadRpgStudyResourceSummary(
  itemId: string,
  options: RpgReadModelOptions = {},
): Promise<RpgStudyResourceSummary | null> {
  return buildRpgStudyResourceSummary(await readSnapshot(options), itemId);
}

export async function loadRpgFocusSessionSummary(
  itemId: string | null,
  options: RpgReadModelOptions = {},
): Promise<RpgFocusSessionSummary> {
  return buildRpgFocusSessionSummary(await readSnapshot(options), itemId);
}

export async function loadRpgBadgeGallerySummary(
  options: RpgReadModelOptions = {},
): Promise<RpgBadgeGallerySummary> {
  return buildRpgBadgeGallerySummary(await readSnapshot(options));
}

export async function loadRpgHeroProfileSummary(
  options: RpgReadModelOptions = {},
): Promise<RpgHeroProfileSummary> {
  return buildRpgHeroProfileSummary(
    await readSnapshot(options),
    options.now?.() ?? new Date().toISOString(),
  );
}
