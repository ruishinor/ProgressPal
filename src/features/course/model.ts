import type { CourseLongFormProgress } from '@/features/progress';
import type {
  CourseItem,
  CourseItemType,
  CourseUnit,
  ProgressEntry,
  ProgressStatus,
} from '@/lib/domain';

export type CourseStatusVariant =
  | 'notStarted'
  | 'inProgress'
  | 'completed'
  | 'blocked'
  | 'optional';

export type CourseMapItem = {
  estimatedMinutes: number;
  id: string;
  longFormProgress: CourseLongFormProgress | null;
  required: boolean;
  status: ProgressStatus | 'not_started';
  statusLabel: string;
  statusVariant: CourseStatusVariant;
  title: string;
  type: CourseItemType;
  typeLabel: string;
};

export type CourseMapUnit = {
  blockedItemCount: number;
  completedOptionalItemCount: number;
  completedRequiredItemCount: number;
  completionPercent: number;
  estimatedMinutes: number;
  id: string;
  itemCount: number;
  items: CourseMapItem[];
  optionalItemCount: number;
  required: boolean;
  requiredItemCount: number;
  startedItemCount: number;
  statusLabel: string;
  statusVariant: CourseStatusVariant;
  title: string;
  typeLabel: string;
};

export type CourseMapView = {
  blockedItemCount: number;
  completedRequiredItemCount: number;
  completedUnitCount: number;
  completionPercent: number;
  estimatedMinutes: number;
  itemCount: number;
  nextUnitTitle: string | null;
  optionalItemCount: number;
  requiredItemCount: number;
  startedItemCount: number;
  unitCount: number;
  units: CourseMapUnit[];
};

import { completeStatuses } from '@/lib/completion';
const inProgressStatuses = new Set<ProgressStatus>(['started']);
const blockedStatuses = new Set<ProgressStatus>(['blocked']);

export const courseItemTypeLabels: Record<CourseItemType, string> = {
  lab: 'Lab',
  lecture: 'Lecture',
  notes: 'Notes',
  practice: 'Practice',
  problem_set: 'Problem set',
  project_task: 'Project task',
  reading: 'Reading',
  reflection: 'Reflection',
  section: 'Section',
  shorts: 'Shorts',
};

const courseUnitTypeLabels = {
  final_project: 'Final project',
  special: 'Special',
  week: 'Week',
} as const;

function sortUnits(units: readonly CourseUnit[]) {
  return [...units].sort(
    (left, right) =>
      left.order - right.order ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id),
  );
}

function sortItems(items: readonly CourseItem[]) {
  return [...items].sort(
    (left, right) =>
      left.order - right.order ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id),
  );
}

export function getItemStatusVariant(
  required: boolean,
  status: ProgressStatus | 'not_started',
): CourseStatusVariant {
  if (status === 'blocked') {
    return 'blocked';
  }

  if (status === 'started') {
    return 'inProgress';
  }

  if (
    status === 'completed' ||
    status === 'submitted' ||
    status === 'accepted'
  ) {
    return 'completed';
  }

  if (status === 'skipped_optional' || !required) {
    return 'optional';
  }

  return 'notStarted';
}

export function getItemStatusLabel(
  required: boolean,
  status: ProgressStatus | 'not_started',
) {
  switch (status) {
    case 'accepted':
      return 'Accepted';
    case 'blocked':
      return 'Blocked';
    case 'completed':
      return 'Completed';
    case 'skipped_optional':
      return 'Skipped optional';
    case 'started':
      return 'Started';
    case 'submitted':
      return 'Submitted';
    case 'not_started':
    default:
      return required ? 'Not started' : 'Optional';
  }
}

function getUnitStatus(
  unit: CourseUnit,
  requiredItemCount: number,
  completedRequiredItemCount: number,
  startedItemCount: number,
  blockedItemCount: number,
  completedOptionalItemCount: number,
) {
  if (blockedItemCount > 0) {
    return {
      label: 'Blocked',
      variant: 'blocked' as const,
    };
  }

  if (
    requiredItemCount > 0 &&
    completedRequiredItemCount === requiredItemCount
  ) {
    return {
      label: 'Completed',
      variant: 'completed' as const,
    };
  }

  if (
    startedItemCount > 0 ||
    completedRequiredItemCount > 0 ||
    completedOptionalItemCount > 0
  ) {
    return {
      label: 'In progress',
      variant: 'inProgress' as const,
    };
  }

  if (!unit.required) {
    return {
      label: 'Optional',
      variant: 'optional' as const,
    };
  }

  return {
    label: 'Not started',
    variant: 'notStarted' as const,
  };
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function inferStatusFromLongFormProgress(
  longFormProgress: CourseLongFormProgress | null,
): ProgressStatus | 'not_started' {
  if (longFormProgress === null || !longFormProgress.hasProgress) {
    return 'not_started';
  }

  return longFormProgress.isComplete ? 'completed' : 'started';
}

export function formatMinutes(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function buildCourseMap(
  units: readonly CourseUnit[],
  items: readonly CourseItem[],
  progressEntries: readonly ProgressEntry[],
  longFormProgressByItemId: ReadonlyMap<
    string,
    CourseLongFormProgress
  > = new Map(),
): CourseMapView {
  const progressByItemId = new Map(
    progressEntries.map((progressEntry) => [
      progressEntry.itemId,
      progressEntry,
    ]),
  );
  const itemsByUnitId = new Map<string, CourseItem[]>();

  for (const item of sortItems(items)) {
    const groupedItems = itemsByUnitId.get(item.unitId) ?? [];

    groupedItems.push(item);
    itemsByUnitId.set(item.unitId, groupedItems);
  }

  const unitViews = sortUnits(units).map((unit) => {
    const unitItems = itemsByUnitId.get(unit.id) ?? [];
    const itemViews = unitItems.map((item) => {
      const progressEntry = progressByItemId.get(item.id);
      const longFormProgress = longFormProgressByItemId.get(item.id) ?? null;
      const status =
        progressEntry?.status ??
        inferStatusFromLongFormProgress(longFormProgress);

      return {
        estimatedMinutes: item.estimatedMinutes,
        id: item.id,
        longFormProgress,
        required: item.required,
        status,
        statusLabel: getItemStatusLabel(item.required, status),
        statusVariant: getItemStatusVariant(item.required, status),
        title: item.title,
        type: item.type,
        typeLabel: courseItemTypeLabels[item.type],
      };
    });

    const requiredItemCount = itemViews.filter((item) => item.required).length;
    const optionalItemCount = itemViews.length - requiredItemCount;
    const completedRequiredItemCount = itemViews.filter(
      (item) => item.required && completeStatuses.has(item.status),
    ).length;
    const completedOptionalItemCount = itemViews.filter(
      (item) =>
        !item.required &&
        (completeStatuses.has(item.status) ||
          item.status === 'skipped_optional'),
    ).length;
    const startedItemCount = itemViews.filter((item) =>
      inProgressStatuses.has(item.status),
    ).length;
    const blockedItemCount = itemViews.filter((item) =>
      blockedStatuses.has(item.status),
    ).length;
    const estimatedMinutes = itemViews.reduce(
      (total, item) => total + item.estimatedMinutes,
      0,
    );
    const completionPercent =
      requiredItemCount === 0
        ? 100
        : roundPercent((completedRequiredItemCount / requiredItemCount) * 100);
    const unitStatus = getUnitStatus(
      unit,
      requiredItemCount,
      completedRequiredItemCount,
      startedItemCount,
      blockedItemCount,
      completedOptionalItemCount,
    );

    return {
      blockedItemCount,
      completedOptionalItemCount,
      completedRequiredItemCount,
      completionPercent,
      estimatedMinutes,
      id: unit.id,
      itemCount: itemViews.length,
      items: itemViews,
      optionalItemCount,
      required: unit.required,
      requiredItemCount,
      startedItemCount,
      statusLabel: unitStatus.label,
      statusVariant: unitStatus.variant,
      title: unit.title,
      typeLabel: courseUnitTypeLabels[unit.type],
    };
  });

  const requiredItemCount = unitViews.reduce(
    (total, unit) => total + unit.requiredItemCount,
    0,
  );
  const completedRequiredItemCount = unitViews.reduce(
    (total, unit) => total + unit.completedRequiredItemCount,
    0,
  );
  const startedItemCount = unitViews.reduce(
    (total, unit) => total + unit.startedItemCount,
    0,
  );
  const blockedItemCount = unitViews.reduce(
    (total, unit) => total + unit.blockedItemCount,
    0,
  );
  const completionPercent =
    requiredItemCount === 0
      ? 100
      : roundPercent((completedRequiredItemCount / requiredItemCount) * 100);
  const nextUnitTitle =
    unitViews.find(
      (unit) =>
        unit.required &&
        unit.completedRequiredItemCount < unit.requiredItemCount,
    )?.title ?? null;

  return {
    blockedItemCount,
    completedRequiredItemCount,
    completedUnitCount: unitViews.filter(
      (unit) => unit.requiredItemCount > 0 && unit.completionPercent === 100,
    ).length,
    completionPercent,
    estimatedMinutes: unitViews.reduce(
      (total, unit) => total + unit.estimatedMinutes,
      0,
    ),
    itemCount: unitViews.reduce((total, unit) => total + unit.itemCount, 0),
    nextUnitTitle,
    optionalItemCount: unitViews.reduce(
      (total, unit) => total + unit.optionalItemCount,
      0,
    ),
    requiredItemCount,
    startedItemCount,
    unitCount: unitViews.length,
    units: unitViews,
  };
}
