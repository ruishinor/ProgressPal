import {
  buildCourseDetailView,
  type CourseDetailView,
} from '@/features/course/detailModel';
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
import {
  getDatabaseSnapshot,
  type DatabaseSnapshot,
  type ProgressPalDatabase,
} from '@/lib/db';
import type { CourseItem, CourseUnit, ProgressEntry } from '@/lib/domain';
import { calculateXpSummary } from '@/lib/xp/engine';

import type {
  RpgCourseMapSummary,
  RpgHubSummary,
  RpgHubWeeklyProgress,
  RpgModuleSummary,
  RpgOfficialLink,
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

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getWeekBounds(nowIso: string) {
  const now = new Date(nowIso);
  const validNow = Number.isNaN(now.getTime()) ? new Date() : now;
  const weekStart = new Date(
    Date.UTC(
      validNow.getUTCFullYear(),
      validNow.getUTCMonth(),
      validNow.getUTCDate(),
    ),
  );
  const day = weekStart.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  weekStart.setUTCDate(weekStart.getUTCDate() + mondayOffset);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

  return {
    endDate: toIsoDate(weekEnd),
    endTime: `${toIsoDate(weekEnd)}T23:59:59.999Z`,
    startDate: toIsoDate(weekStart),
    startTime: `${toIsoDate(weekStart)}T00:00:00.000Z`,
  };
}

function isIsoInRange(
  isoTimestamp: string,
  startTime: string,
  endTime: string,
) {
  return isoTimestamp >= startTime && isoTimestamp <= endTime;
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
): RpgQuestSummary {
  return {
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

function buildModuleSummary(unit: CourseMapUnit): RpgModuleSummary {
  return {
    completedRequiredItemCount: unit.completedRequiredItemCount,
    completionPercent: unit.completionPercent,
    estimatedMinutes: unit.estimatedMinutes,
    id: unit.id,
    itemCount: unit.itemCount,
    officialLink: toRpgOfficialLink(getCs50UnitLink(unit.id)),
    quests: unit.items.map((item) => buildQuestSummary(unit, item)),
    requiredItemCount: unit.requiredItemCount,
    statusLabel: unit.statusLabel,
    statusVariant: unit.statusVariant,
    title: unit.title,
    typeLabel: unit.typeLabel,
  };
}

function selectContinueQuest(
  modules: readonly RpgModuleSummary[],
): RpgQuestSummary | null {
  const requiredQuests = modules.flatMap((module) =>
    module.quests.filter((quest) => quest.required),
  );

  const incomplete = requiredQuests.filter(
    (quest) => quest.statusVariant !== 'completed',
  );

  return (
    incomplete.find(
      (quest) =>
        quest.statusVariant === 'inProgress' ||
        quest.longFormProgress?.hasProgress === true,
    ) ??
    incomplete.find((quest) => quest.statusVariant !== 'blocked') ??
    null
  );
}

function selectCurrentModule(
  modules: readonly RpgModuleSummary[],
  continueQuest: RpgQuestSummary | null,
) {
  if (continueQuest !== null) {
    return modules.find((module) => module.id === continueQuest.unitId) ?? null;
  }

  return (
    modules.find(
      (module) =>
        module.requiredItemCount > 0 &&
        module.completedRequiredItemCount < module.requiredItemCount,
    ) ?? null
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

function buildWeeklyProgress(
  snapshot: DatabaseSnapshot,
  nowIso: string,
): RpgHubWeeklyProgress {
  const { endDate, endTime, startDate, startTime } = getWeekBounds(nowIso);
  const completedRequiredItemIds = new Set(
    snapshot.courseItems.filter((item) => item.required).map((item) => item.id),
  );
  const thisWeeksProgress = snapshot.progressEntries.filter((entry) =>
    isIsoInRange(entry.updatedAt, startTime, endTime),
  );
  const thisWeeksSessions = snapshot.studySessions.filter((session) =>
    isIsoInRange(session.startedAt, startTime, endTime),
  );
  const thisWeeksXp = snapshot.xpTransactions.filter((transaction) =>
    isIsoInRange(transaction.awardedAt, startTime, endTime),
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

export function buildRpgCourseMapSummary(
  snapshot: DatabaseSnapshot,
): RpgCourseMapSummary {
  const { courseMap } = buildCourseMapContext(snapshot);
  const modules = courseMap.units.map((unit) => buildModuleSummary(unit));
  const continueQuest = selectContinueQuest(modules);

  return {
    completedRequiredItemCount: courseMap.completedRequiredItemCount,
    completionPercent: courseMap.completionPercent,
    currentModule: selectCurrentModule(modules, continueQuest),
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

  return unit === undefined ? null : buildModuleSummary(unit);
}

export function buildRpgHubSummary(
  snapshot: DatabaseSnapshot,
  nowIso = new Date().toISOString(),
): RpgHubSummary {
  const courseMapSummary = buildRpgCourseMapSummary(snapshot);
  const continueQuest = selectContinueQuest(courseMapSummary.modules);
  const xpSummary = calculateXpSummary(
    snapshot.xpTransactions.reduce((total, transaction) => {
      return total + transaction.xp;
    }, 0),
  );
  const totalMinutes = snapshot.studySessions.reduce((total, session) => {
    return total + session.durationMinutes;
  }, 0);

  return {
    continueQuest,
    courseProgress: {
      completedRequiredItemCount: courseMapSummary.completedRequiredItemCount,
      completionPercent: courseMapSummary.completionPercent,
      requiredItemCount: courseMapSummary.requiredItemCount,
    },
    currentModule: selectCurrentModule(courseMapSummary.modules, continueQuest),
    identity: {
      classLabel: 'Generalist',
      guildLabel: 'Code Knights',
      pathLabel: 'CS Foundations',
      rankLabel: getRankLabel(courseMapSummary),
    },
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
): RpgStudyResourceSummary {
  return {
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

  return buildStudyResourceFromDetail(detail, item, progressEntry, unit.id);
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
