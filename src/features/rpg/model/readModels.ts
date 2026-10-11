import { getLevelProgressDisplay } from './presentation';
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
  getProgrammeItemLink,
  getProgrammeUnitLink,
  type Cs50Link,
} from '@/features/course/cs50Links';
import {
  buildLongFormProgressMap,
  buildLongFormProgressMapFromEventAggregates,
} from '@/lib/progress';
import { isItemComplete } from '@/lib/completion';
import {
  getCourseMapReadData,
  getDatabaseSnapshot,
  getModuleReadData,
  getResourceReadData,
  getRpgHeroReadData,
  getRpgHubReadData,
  getRpgHudReadData,
  type CourseMapReadData,
  type CourseStateReadData,
  type ModuleReadData,
  type RpgHeroReadData,
  type RpgHubReadData,
  type RpgHudReadData,
  type ResourceReadData,
  type DatabaseSnapshot,
  type ProgressPalDatabase,
} from '@/lib/db';
import type {
  AchievementDefinition,
  AchievementUnlock,
  CourseItem,
  CourseUnit,
  LevelCurve,
  ProgrammeScope,
  ProgressEntry,
} from '@/lib/domain';
import { formatLocalDate, getLocalWeekStart } from '@/lib/time';
import { calculateXpSummary } from '@/lib/xp/engine';
import { getDefaultProgrammeDefinition } from '@/programmes';
import {
  buildProgrammeQuestRewardLabel,
  type QuestRewardData,
} from './questRewards';

import type {
  RpgBadgeGallerySummary,
  RpgCourseMapSummary,
  RpgHeroProfileSummary,
  RpgHeroRecentBadge,
  RpgHubSummary,
  RpgHudSummary,
  RpgHubIdentity,
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

/**
 * The parts of the active programme scope the RPG read models render:
 * reward policy, links and terminology (Epic C / C7). Internal builders take
 * it explicitly. The exported snapshot builders, which only tests and
 * preservation oracles call, default to the explicit CS50 default definition;
 * the runtime `load*` paths always pass the scope from app state.
 */
type ProgrammeContentScope = Pick<
  ProgrammeScope,
  'content' | 'policy' | 'programmeId'
>;

type CourseMapContext = {
  courseMap: CourseMapView;
  itemById: ReadonlyMap<string, CourseItem>;
  progressByItemId: ReadonlyMap<string, ProgressEntry>;
  unitById: ReadonlyMap<string, CourseUnit>;
};

const rpgHubRecentActivityLimit = 5;
const rpgHeroRecentBadgeLimit = 3;

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

function buildCourseMapContext(
  snapshot: DatabaseSnapshot,
  programme: ProgrammeContentScope,
): CourseMapContext {
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
    programme.policy.catalogueRules,
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

function buildCourseMapContextFromReadData(
  data: CourseStateReadData,
  programme: ProgrammeContentScope,
): CourseMapContext {
  const longFormByItemId = buildLongFormProgressMapFromEventAggregates(
    data.contentAssets,
    data.contentSlices,
    data.mediaProgressByAssetId,
    data.resumePoints,
    data.progressEntries,
  );
  const courseMap = buildCourseMap(
    data.courseUnits,
    data.courseItems,
    data.progressEntries,
    longFormByItemId,
    programme.policy.catalogueRules,
  );

  return {
    courseMap,
    itemById: new Map(data.courseItems.map((item) => [item.id, item])),
    progressByItemId: new Map(
      data.progressEntries.map((entry) => [entry.itemId, entry]),
    ),
    unitById: new Map(data.courseUnits.map((unit) => [unit.id, unit])),
  };
}

function buildQuestSummary(
  unit: CourseMapUnit,
  item: CourseMapItem,
  snapshot: QuestRewardData,
  programme: ProgrammeContentScope,
): RpgQuestSummary {
  const { externalResources } = programme.content;

  return {
    rewardLabel: buildProgrammeQuestRewardLabel(programme, snapshot, item.id),
    estimatedMinutes: item.estimatedMinutes,
    id: item.id,
    longFormProgress: item.longFormProgress,
    officialLink: toRpgOfficialLink(
      getProgrammeItemLink(externalResources, item.id) ??
        getProgrammeUnitLink(externalResources, unit.id),
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

/**
 * The required task to continue with: one already under way, else the first
 * not blocked, else (all blocked) the first left, which needs attention.
 * Completed and optional tasks are never chosen. The hub's recommendation and
 * each module's `nextQuestId` both use it.
 */
function pickNextQuest(quests: readonly RpgQuestSummary[]) {
  const incomplete = quests.filter(
    (quest) => quest.required && !isItemComplete(quest.status),
  );
  const actionable = incomplete.filter((quest) => quest.status !== 'blocked');
  const next =
    actionable.find(
      (quest) =>
        quest.statusVariant === 'inProgress' ||
        quest.longFormProgress?.hasProgress === true,
    ) ?? actionable[0];

  return {
    incomplete,
    quest: next ?? incomplete[0],
    actionable: next !== undefined,
  };
}

function buildModuleSummary(
  unit: CourseMapUnit,
  snapshot: QuestRewardData,
  programme: ProgrammeContentScope,
): RpgModuleSummary {
  const quests = unit.items.map((item) =>
    buildQuestSummary(unit, item, snapshot, programme),
  );

  return {
    completedRequiredItemCount: unit.completedRequiredItemCount,
    completionPercent: unit.completionPercent,
    estimatedMinutes: unit.estimatedMinutes,
    id: unit.id,
    itemCount: unit.itemCount,
    officialLink: toRpgOfficialLink(
      getProgrammeUnitLink(programme.content.externalResources, unit.id),
    ),
    nextQuestId: pickNextQuest(quests).quest?.id ?? null,
    quests,
    requiredItemCount: unit.requiredItemCount,
    statusLabel: unit.statusLabel,
    statusVariant: unit.statusVariant,
    title: unit.title,
    typeLabel: unit.typeLabel,
  };
}

function selectQuestRecommendation(
  modules: readonly RpgModuleSummary[],
  snapshot: Pick<QuestRewardData, 'courseItems' | 'courseUnits'>,
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

  const { incomplete, quest: next, actionable } = pickNextQuest(requiredQuests);
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

  return {
    state: actionable ? 'actionable' : 'needs_attention',
    quest: next!,
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
}: {
  completedRequiredItemCount: number;
  requiredItemCount: number;
}) {
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

/** The programme's identity tuple with the shared rank label (Epic C / C4). */
function buildIdentity(
  rankLabel: string,
  programme: ProgrammeContentScope,
): RpgHubIdentity {
  const { classLabel, guildLabel, pathLabel } =
    programme.content.terminology.rpgIdentity;

  return { classLabel, guildLabel, pathLabel, rankLabel };
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
  programmeId: string,
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
  const thisWeeksXp = snapshot.xpTransactions.filter(
    (transaction) =>
      transaction.programmeId === programmeId &&
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

function buildRecentActivity(snapshot: DatabaseSnapshot, programmeId: string) {
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
    ...snapshot.xpTransactions
      .filter((transaction) => transaction.programmeId === programmeId)
      .map((transaction) => ({
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

function buildRecentActivityFromReadData(
  data: Pick<
    RpgHubReadData | RpgHeroReadData,
    | 'courseItems'
    | 'progressEntries'
    | 'recentStudySessions'
    | 'recentXpTransactions'
  >,
) {
  const itemTitleById = new Map(
    data.courseItems.map((item) => [item.id, item.title]),
  );
  const entries = [
    ...data.progressEntries.map((entry) => ({
      date: toDateOnly(entry.updatedAt),
      id: `progress:${entry.id}`,
      label: `Saved progress - ${itemTitleById.get(entry.itemId) ?? entry.itemId} (${entry.status})`,
      timestamp: entry.updatedAt,
    })),
    ...data.recentStudySessions.map((session) => ({
      date: toDateOnly(session.startedAt),
      id: `study_session:${session.id}`,
      label: `Saved study session - ${itemTitleById.get(session.itemId) ?? session.itemId}`,
      timestamp: session.startedAt,
    })),
    ...data.recentXpTransactions.map((transaction) => ({
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

function buildXpPresentation(totalXp: number, levelCurve?: LevelCurve) {
  const xpSummary = calculateXpSummary(totalXp, levelCurve);

  return {
    ...getLevelProgressDisplay(xpSummary),
    level: xpSummary.level,
    levelProgressPercent: getLevelProgressPercent(xpSummary),
    totalXp: xpSummary.totalXp,
    xpToNextLevel: xpSummary.xpToNextLevel,
  };
}

function buildWeeklyProgressFromReadData(
  data: RpgHubReadData,
  nowIso: string,
): RpgHubWeeklyProgress {
  const { endDate, nextStartTime, startDate, startTime } =
    getWeekBounds(nowIso);
  const completedRequiredItemIds = new Set(
    data.courseItems.filter((item) => item.required).map((item) => item.id),
  );
  const thisWeeksProgress = data.progressEntries.filter((entry) =>
    isIsoInRange(entry.updatedAt, startTime, nextStartTime),
  );

  return {
    completedRequiredItemCount: thisWeeksProgress.filter(
      (entry) =>
        completedRequiredItemIds.has(entry.itemId) &&
        entry.status === 'completed',
    ).length,
    savedProgressCount: thisWeeksProgress.length,
    sessionCount: data.weeklySessionCount,
    totalMinutes: data.weeklyTotalMinutes,
    weekEndDate: endDate,
    weekStartDate: startDate,
    xpEarned: data.weeklyXpEarned,
  };
}

export function buildRpgBadgeGallerySummary(
  snapshot: DatabaseSnapshot,
  programme: ProgrammeContentScope = getDefaultProgrammeDefinition(),
): RpgBadgeGallerySummary {
  const unlockByAchievementId = new Map(
    snapshot.achievementUnlocks.map((unlock) => [unlock.achievementId, unlock]),
  );
  const achievementDefinitions = programme.policy.achievements;
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

/**
 * The learner's most recently earned badges in this programme's catalogue,
 * newest first by their stored unlock time (set by the clock when the unlock
 * committed and kept by backup and restore). Badges unlocked at the same
 * moment, as one mutation can unlock several, keep the catalogue's display
 * order. Only badges with an unlock row appear, at most three.
 */
export function selectRecentBadges(
  unlocks: readonly Pick<AchievementUnlock, 'achievementId' | 'unlockedAt'>[],
  definitions: readonly Pick<AchievementDefinition, 'id' | 'title'>[],
): RpgHeroRecentBadge[] {
  const catalogueOrder = new Map(
    definitions.map((definition, index) => [definition.id, index]),
  );
  const titles = new Map(
    definitions.map((definition) => [definition.id, definition.title]),
  );

  return unlocks
    .filter((unlock) => catalogueOrder.has(unlock.achievementId))
    .sort(
      (left, right) =>
        right.unlockedAt.localeCompare(left.unlockedAt) ||
        catalogueOrder.get(left.achievementId)! -
          catalogueOrder.get(right.achievementId)!,
    )
    .slice(0, rpgHeroRecentBadgeLimit)
    .map((unlock) => ({
      id: unlock.achievementId,
      title: titles.get(unlock.achievementId)!,
      unlockedAt: unlock.unlockedAt,
    }));
}

export function buildRpgHeroProfileSummary(
  snapshot: DatabaseSnapshot,
  nowIso = new Date().toISOString(),
  programme: ProgrammeContentScope = getDefaultProgrammeDefinition(),
): RpgHeroProfileSummary {
  const hubSummary = buildRpgHubSummary(snapshot, nowIso, programme);
  const badgeGallery = buildRpgBadgeGallerySummary(snapshot, programme);

  return {
    badges: {
      earnedBadgeCount: badgeGallery.earnedBadgeCount,
      totalBadgeCount: badgeGallery.totalBadgeCount,
    },
    recentBadges: selectRecentBadges(
      snapshot.achievementUnlocks,
      programme.policy.achievements,
    ),
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
  programme: ProgrammeContentScope = getDefaultProgrammeDefinition(),
): RpgCourseMapSummary {
  const { courseMap } = buildCourseMapContext(snapshot, programme);
  const modules = courseMap.units.map((unit) =>
    buildModuleSummary(unit, snapshot, programme),
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

function buildRpgCourseMapSummaryFromReadData(
  data: CourseMapReadData,
  programme: ProgrammeContentScope,
): RpgCourseMapSummary {
  const { courseMap } = buildCourseMapContextFromReadData(data, programme);
  const modules = courseMap.units.map((unit) =>
    buildModuleSummary(unit, data, programme),
  );
  const recommendation = selectQuestRecommendation(modules, data);

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
  programme: ProgrammeContentScope = getDefaultProgrammeDefinition(),
): RpgModuleSummary | null {
  const { courseMap } = buildCourseMapContext(snapshot, programme);
  const unit = courseMap.units.find((candidate) => candidate.id === unitId);

  return unit === undefined
    ? null
    : buildModuleSummary(unit, snapshot, programme);
}

function buildRpgModuleSummaryFromReadData(
  data: ModuleReadData,
  programme: ProgrammeContentScope,
): RpgModuleSummary {
  const longFormByItemId = buildLongFormProgressMapFromEventAggregates(
    data.contentAssets,
    data.contentSlices,
    data.mediaProgressByAssetId,
    data.resumePoints,
    data.progressEntries,
  );
  const courseMap = buildCourseMap(
    [data.courseUnit],
    data.courseItems,
    data.progressEntries,
    longFormByItemId,
    programme.policy.catalogueRules,
  );
  const unit = courseMap.units[0];

  if (unit === undefined) {
    throw new Error('Module read data did not contain its requested unit.');
  }

  return buildModuleSummary(
    unit,
    {
      courseItems: data.courseItems,
      courseUnits: [data.courseUnit],
      earnedRewardSourceKeys: data.earnedRewardSourceKeys,
      progressEntries: data.progressEntries,
    },
    programme,
  );
}

export function buildRpgHubSummary(
  snapshot: DatabaseSnapshot,
  nowIso = new Date().toISOString(),
  programme: ProgrammeContentScope = getDefaultProgrammeDefinition(),
): RpgHubSummary {
  const courseMapSummary = buildRpgCourseMapSummary(snapshot, programme);
  const recommendation = selectQuestRecommendation(
    courseMapSummary.modules,
    snapshot,
  );
  // E-SCHEMA-1A: progression is the programme's own ledger and curve.
  const xpSummary = calculateXpSummary(
    snapshot.xpTransactions
      .filter(
        (transaction) => transaction.programmeId === programme.programmeId,
      )
      .reduce((total, transaction) => {
        return total + transaction.xp;
      }, 0),
    programme.policy.levelCurve,
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
    identity: buildIdentity(getRankLabel(courseMapSummary), programme),
    learnerAvatarConfig: snapshot.learnerProfile?.avatarConfig ?? null,
    learnerName: snapshot.learnerProfile?.displayName ?? 'Learner',
    recentActivity: buildRecentActivity(snapshot, programme.programmeId),
    studySummary: {
      sessionCount: snapshot.studySessions.length,
      totalMinutes,
    },
    weeklyProgress: buildWeeklyProgress(
      snapshot,
      nowIso,
      programme.programmeId,
    ),
    weekFour: courseMapSummary.weekFour,
    xpSummary: {
      ...getLevelProgressDisplay(xpSummary),
      level: xpSummary.level,
      levelProgressPercent: getLevelProgressPercent(xpSummary),
      totalXp: xpSummary.totalXp,
      xpToNextLevel: xpSummary.xpToNextLevel,
    },
  };
}

function buildRpgHudSummaryFromReadData(
  data: RpgHudReadData,
  programme: ProgrammeContentScope,
): RpgHudSummary {
  const courseMapSummary = buildRpgCourseMapSummaryFromReadData(
    data,
    programme,
  );
  const recommendation = selectQuestRecommendation(
    courseMapSummary.modules,
    data,
  );

  return {
    recommendation,
    identity: buildIdentity(getRankLabel(courseMapSummary), programme),
    learnerAvatarConfig: data.learnerProfile?.avatarConfig ?? null,
    learnerName: data.learnerProfile?.displayName ?? 'Learner',
    xpSummary: buildXpPresentation(data.totalXp, programme.policy.levelCurve),
  };
}

function buildRpgHubSummaryFromReadData(
  data: RpgHubReadData,
  nowIso: string,
  programme: ProgrammeContentScope,
): RpgHubSummary {
  const courseMapSummary = buildRpgCourseMapSummaryFromReadData(
    data,
    programme,
  );
  const recommendation = selectQuestRecommendation(
    courseMapSummary.modules,
    data,
  );

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
    identity: buildIdentity(getRankLabel(courseMapSummary), programme),
    learnerAvatarConfig: data.learnerProfile?.avatarConfig ?? null,
    learnerName: data.learnerProfile?.displayName ?? 'Learner',
    recentActivity: buildRecentActivityFromReadData(data),
    studySummary: {
      sessionCount: data.sessionCount,
      totalMinutes: data.totalMinutes,
    },
    weeklyProgress: buildWeeklyProgressFromReadData(data, nowIso),
    weekFour: courseMapSummary.weekFour,
    xpSummary: buildXpPresentation(data.totalXp, programme.policy.levelCurve),
  };
}

function buildRpgHeroProfileSummaryFromReadData(
  data: RpgHeroReadData,
  programme: ProgrammeContentScope,
): RpgHeroProfileSummary {
  const { courseMap } = buildCourseMapContextFromReadData(data, programme);
  const courseProgress = {
    completedRequiredItemCount: courseMap.completedRequiredItemCount,
    completionPercent: courseMap.completionPercent,
    requiredItemCount: courseMap.requiredItemCount,
  };
  const recentActivity = buildRecentActivityFromReadData(data);
  const earnedAchievementIds = new Set(
    data.achievementUnlocks.map((unlock) => unlock.achievementId),
  );
  const achievementDefinitions = programme.policy.achievements;
  const earnedBadgeCount = achievementDefinitions.filter((definition) =>
    earnedAchievementIds.has(definition.id),
  ).length;
  const xpSummary = buildXpPresentation(
    data.totalXp,
    programme.policy.levelCurve,
  );

  return {
    badges: {
      earnedBadgeCount,
      totalBadgeCount: achievementDefinitions.length,
    },
    recentBadges: selectRecentBadges(
      data.achievementUnlocks,
      achievementDefinitions,
    ),
    courseProgress,
    hasLocalActivity:
      courseProgress.completedRequiredItemCount > 0 ||
      recentActivity.length > 0 ||
      data.sessionCount > 0 ||
      xpSummary.totalXp > 0 ||
      earnedBadgeCount > 0,
    identity: buildIdentity(getRankLabel(courseProgress), programme),
    learnerAvatarConfig: data.learnerProfile?.avatarConfig ?? null,
    learnerName: data.learnerProfile?.displayName ?? 'Learner',
    recentActivity,
    studySummary: {
      sessionCount: data.sessionCount,
      totalMinutes: data.totalMinutes,
    },
    xpSummary,
  };
}

export function projectRpgHudSummary(summary: RpgHubSummary): RpgHudSummary {
  return {
    recommendation: summary.recommendation,
    identity: summary.identity,
    learnerAvatarConfig: summary.learnerAvatarConfig,
    learnerName: summary.learnerName,
    xpSummary: summary.xpSummary,
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
  programme: ProgrammeContentScope,
): RpgStudyResourceSummary {
  const { externalResources } = programme.content;

  return {
    rewardLabel,
    estimatedMinutesLabel: detail.estimatedMinutesLabel,
    itemId: detail.itemId,
    itemType: item.type,
    longFormProgress: detail.longFormProgress,
    officialLink: toRpgOfficialLink(
      getProgrammeItemLink(externalResources, detail.itemId) ??
        getProgrammeUnitLink(externalResources, unitId),
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
  programme: ProgrammeContentScope = getDefaultProgrammeDefinition(),
): RpgStudyResourceSummary | null {
  const context = buildCourseMapContext(snapshot, programme);
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
    buildProgrammeQuestRewardLabel(programme, snapshot, item.id, true),
    programme,
  );
}

function buildRpgStudyResourceSummaryFromReadData(
  data: ResourceReadData,
  programme: ProgrammeContentScope,
): RpgStudyResourceSummary {
  const longFormByItemId = buildLongFormProgressMapFromEventAggregates(
    data.contentAssets,
    data.contentSlices,
    data.mediaProgressByAssetId,
    data.resumePoints,
    data.progressEntries,
  );
  const progressEntry =
    data.progressEntries.find((entry) => entry.itemId === data.courseItem.id) ??
    null;
  const detail = buildCourseDetailView(
    data.courseUnit,
    data.courseItem,
    progressEntry,
    longFormByItemId.get(data.courseItem.id) ?? null,
  );

  return buildStudyResourceFromDetail(
    detail,
    data.courseItem,
    progressEntry,
    data.courseUnit.id,
    buildProgrammeQuestRewardLabel(
      programme,
      {
        courseItems: data.courseItems,
        courseUnits: [data.courseUnit],
        earnedRewardSourceKeys: data.earnedRewardSourceKeys,
        progressEntries: data.progressEntries,
      },
      data.courseItem.id,
      true,
    ),
    programme,
  );
}

/**
 * Scoped read paths receive the active programme scope that app state derived
 * from persisted state (Epic C / C5, C7): its policy (C3), its content (C4)
 * and the catalogue identity that bounds every catalogue-derived read.
 */
function withScope(scope: ProgrammeScope, options: RpgReadModelOptions) {
  return { ...options, catalogueId: scope.catalogueId, policy: scope.policy };
}

async function readSnapshot(options: RpgReadModelOptions = {}) {
  return getDatabaseSnapshot(options);
}

export async function loadRpgHudSummary(
  scope: ProgrammeScope,
  options: RpgReadModelOptions = {},
): Promise<RpgHudSummary> {
  return buildRpgHudSummaryFromReadData(
    await getRpgHudReadData(withScope(scope, options)),
    scope,
  );
}

export async function loadRpgHubSummary(
  scope: ProgrammeScope,
  options: RpgReadModelOptions = {},
): Promise<RpgHubSummary> {
  const nowIso = options.now?.() ?? new Date().toISOString();
  const { nextStartTime, startTime } = getWeekBounds(nowIso);

  return buildRpgHubSummaryFromReadData(
    await getRpgHubReadData(
      { nextStartTime, startTime },
      withScope(scope, options),
    ),
    nowIso,
    scope,
  );
}

export async function loadRpgCourseMapSummary(
  scope: ProgrammeScope,
  options: RpgReadModelOptions = {},
): Promise<RpgCourseMapSummary> {
  return buildRpgCourseMapSummaryFromReadData(
    await getCourseMapReadData(withScope(scope, options)),
    scope,
  );
}

export async function loadRpgModuleSummary(
  scope: ProgrammeScope,
  unitId: string,
  options: RpgReadModelOptions = {},
): Promise<RpgModuleSummary | null> {
  const data = await getModuleReadData(unitId, withScope(scope, options));

  return data === null ? null : buildRpgModuleSummaryFromReadData(data, scope);
}

export async function loadRpgStudyResourceSummary(
  scope: ProgrammeScope,
  itemId: string,
  options: RpgReadModelOptions = {},
): Promise<RpgStudyResourceSummary | null> {
  const data = await getResourceReadData(itemId, withScope(scope, options));

  return data === null
    ? null
    : buildRpgStudyResourceSummaryFromReadData(data, scope);
}

export async function loadRpgBadgeGallerySummary(
  options: RpgReadModelOptions = {},
): Promise<RpgBadgeGallerySummary> {
  return buildRpgBadgeGallerySummary(await readSnapshot(options));
}

export async function loadRpgHeroProfileSummary(
  scope: ProgrammeScope,
  options: RpgReadModelOptions = {},
): Promise<RpgHeroProfileSummary> {
  return buildRpgHeroProfileSummaryFromReadData(
    await getRpgHeroReadData(withScope(scope, options)),
    scope,
  );
}
