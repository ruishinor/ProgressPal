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
  RpgModuleSummary,
  RpgOfficialLink,
  RpgQuestSummary,
  RpgStudyResourceSummary,
} from './types';

export const RPG_WEEK_FOUR_UNIT_ID = 'week-4';

export type RpgReadModelOptions = {
  db?: ProgressPalDatabase;
};

type CourseMapContext = {
  courseMap: CourseMapView;
  itemById: ReadonlyMap<string, CourseItem>;
  progressByItemId: ReadonlyMap<string, ProgressEntry>;
  unitById: ReadonlyMap<string, CourseUnit>;
};

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

export function buildRpgCourseMapSummary(
  snapshot: DatabaseSnapshot,
): RpgCourseMapSummary {
  const { courseMap } = buildCourseMapContext(snapshot);
  const modules = courseMap.units.map((unit) => buildModuleSummary(unit));

  return {
    completedRequiredItemCount: courseMap.completedRequiredItemCount,
    completionPercent: courseMap.completionPercent,
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

export function buildRpgHubSummary(snapshot: DatabaseSnapshot): RpgHubSummary {
  const courseMapSummary = buildRpgCourseMapSummary(snapshot);
  const xpSummary = calculateXpSummary(
    snapshot.xpTransactions.reduce((total, transaction) => {
      return total + transaction.xp;
    }, 0),
  );
  const totalMinutes = snapshot.studySessions.reduce((total, session) => {
    return total + session.durationMinutes;
  }, 0);

  return {
    continueQuest: selectContinueQuest(courseMapSummary.modules),
    courseProgress: {
      completedRequiredItemCount: courseMapSummary.completedRequiredItemCount,
      completionPercent: courseMapSummary.completionPercent,
      requiredItemCount: courseMapSummary.requiredItemCount,
    },
    learnerName: snapshot.learnerProfile?.displayName ?? 'Learner',
    studySummary: {
      sessionCount: snapshot.studySessions.length,
      totalMinutes,
    },
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
  unitId: string,
): RpgStudyResourceSummary {
  return {
    estimatedMinutesLabel: detail.estimatedMinutesLabel,
    itemId: detail.itemId,
    longFormProgress: detail.longFormProgress,
    officialLink: toRpgOfficialLink(
      getCs50ItemLink(detail.itemId) ?? getCs50UnitLink(unitId),
    ),
    progressStatus: detail.progressStatus,
    required: detail.required,
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

  const detail = buildCourseDetailView(
    unit,
    item,
    context.progressByItemId.get(item.id) ?? null,
    getLongFormProgressForItem(snapshot, item.id),
  );

  return buildStudyResourceFromDetail(detail, unit.id);
}

async function readSnapshot(options: RpgReadModelOptions = {}) {
  return getDatabaseSnapshot(options);
}

export async function loadRpgHubSummary(
  options: RpgReadModelOptions = {},
): Promise<RpgHubSummary> {
  return buildRpgHubSummary(await readSnapshot(options));
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
