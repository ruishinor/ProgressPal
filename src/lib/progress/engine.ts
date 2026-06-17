import type {
  ContentAsset,
  ContentAssetType,
  ContentSlice,
  CourseItem,
  CourseItemType,
  MediaProgressEvent,
  ProgressEntry,
  ResumePoint,
  SliceMinute,
} from '@/lib/domain';
import { defaultSliceMinutes, sliceMinuteOptions } from '@/lib/domain';

const contentAssetTypeByCourseItemType: Partial<
  Record<CourseItemType, ContentAssetType>
> = {
  lecture: 'video',
  reading: 'reading',
  section: 'video',
  shorts: 'shorts_group',
};

import { completeStatuses as completeProgressStatuses } from '@/lib/completion';

export type CoveredRange = {
  endSecond: number;
  startSecond: number;
};

export type GeneratedSlicePlan = {
  endSecond: number;
  label: string;
  order: number;
  plannedMinutes: number;
  startSecond: number;
};

export type LongFormAssetDefinition = {
  assetId: string;
  assetType: ContentAssetType;
  defaultSliceMinutes: SliceMinute;
  durationSeconds: number;
  sourceLabel: string;
};

export type LongFormProgressView = {
  assetId: string;
  completionPercent: number;
  completionSource: 'events' | 'legacy_progress' | 'none';
  completedSliceCount: number;
  durationSeconds: number;
  eventCount: number;
  hasProgress: boolean;
  isComplete: boolean;
  itemId: string;
  nextSliceId: string | null;
  nextSliceLabel: string | null;
  resumeLabel: string | null;
  resumeSecond: number | null;
  sliceCount: number;
  sliceProgressLabel: string;
  summaryLine: string;
  watchedSeconds: number;
  watchedSummaryLabel: string;
};

function toSliceMinute(value: number): value is SliceMinute {
  return sliceMinuteOptions.includes(value as SliceMinute);
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

export function isLongFormCourseItemType(
  itemType: CourseItemType,
): itemType is 'lecture' | 'reading' | 'section' | 'shorts' {
  return contentAssetTypeByCourseItemType[itemType] !== undefined;
}

export function deriveLongFormAssetId(itemId: string) {
  return `${itemId}-asset`;
}

export function deriveLongFormSliceId(assetId: string, order: number) {
  return `${assetId}-slice-${order + 1}`;
}

export function deriveResumePointId(assetId: string) {
  return `resume-${assetId}`;
}

export function formatMediaTimestamp(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatLoggedMinutes(totalSeconds: number) {
  const minutes = totalSeconds / 60;

  if (Number.isInteger(minutes)) {
    return `${minutes} min`;
  }

  return `${roundToSingleDecimal(minutes)} min`;
}

export function getLongFormAssetDefinition(
  item: CourseItem,
): LongFormAssetDefinition | null {
  const assetType = contentAssetTypeByCourseItemType[item.type];

  if (assetType === undefined || item.estimatedMinutes < 1) {
    return null;
  }

  return {
    assetId: deriveLongFormAssetId(item.id),
    assetType,
    defaultSliceMinutes: defaultSliceMinutes,
    durationSeconds: item.estimatedMinutes * 60,
    sourceLabel: 'Local bundled catalog',
  };
}

export function createSlicePlan(
  durationSeconds: number,
  sliceMinutes: number,
): GeneratedSlicePlan[] {
  if (!isPositiveInteger(durationSeconds)) {
    throw new Error(
      'Slice generation requires a positive durationSeconds integer.',
    );
  }

  if (!toSliceMinute(sliceMinutes)) {
    throw new Error(
      `Slice generation requires one of the supported minute options: ${sliceMinuteOptions.join(', ')}.`,
    );
  }

  const sliceLengthSeconds = sliceMinutes * 60;
  const slicePlan: GeneratedSlicePlan[] = [];
  let startSecond = 0;
  let order = 0;

  while (startSecond < durationSeconds) {
    const endSecond = Math.min(
      startSecond + sliceLengthSeconds,
      durationSeconds,
    );

    slicePlan.push({
      endSecond,
      label: `${formatMediaTimestamp(startSecond)}-${formatMediaTimestamp(endSecond)}`,
      order,
      plannedMinutes: Math.max(1, Math.round((endSecond - startSecond) / 60)),
      startSecond,
    });

    startSecond = endSecond;
    order += 1;
  }

  return slicePlan;
}

export function mergeCoveredRanges(
  ranges: readonly CoveredRange[],
): CoveredRange[] {
  const normalizedRanges = ranges
    .filter((range) => range.endSecond > range.startSecond)
    .map((range) => ({
      endSecond: Math.floor(range.endSecond),
      startSecond: Math.floor(range.startSecond),
    }))
    .sort(
      (left, right) =>
        left.startSecond - right.startSecond ||
        left.endSecond - right.endSecond,
    );

  if (normalizedRanges.length === 0) {
    return [];
  }

  const mergedRanges: CoveredRange[] = [normalizedRanges[0]!];

  for (const range of normalizedRanges.slice(1)) {
    const currentRange = mergedRanges[mergedRanges.length - 1]!;

    if (range.startSecond <= currentRange.endSecond) {
      currentRange.endSecond = Math.max(
        currentRange.endSecond,
        range.endSecond,
      );
      continue;
    }

    mergedRanges.push({ ...range });
  }

  return mergedRanges;
}

export function calculateCoveredSeconds(ranges: readonly CoveredRange[]) {
  return mergeCoveredRanges(ranges).reduce(
    (total, range) => total + (range.endSecond - range.startSecond),
    0,
  );
}

export function calculateSliceCoverage(
  slice: Pick<ContentSlice, 'endSecond' | 'startSecond'>,
  ranges: readonly CoveredRange[],
) {
  const coveredSeconds = mergeCoveredRanges(ranges).reduce((total, range) => {
    const overlapStart = Math.max(slice.startSecond, range.startSecond);
    const overlapEnd = Math.min(slice.endSecond, range.endSecond);

    if (overlapEnd <= overlapStart) {
      return total;
    }

    return total + (overlapEnd - overlapStart);
  }, 0);
  const sliceDuration = slice.endSecond - slice.startSecond;

  return Math.min(coveredSeconds / sliceDuration, 1);
}

function buildSummaryLine(view: Omit<LongFormProgressView, 'summaryLine'>) {
  if (view.completionSource === 'legacy_progress') {
    return `Completed before slice logging · ${view.sliceProgressLabel}`;
  }

  if (!view.hasProgress) {
    return `${view.sliceCount} segments planned`;
  }

  const parts = [view.watchedSummaryLabel, view.sliceProgressLabel];

  if (view.resumeLabel !== null && !view.isComplete) {
    parts.push(view.resumeLabel);
  }

  return parts.join(' · ');
}

export function buildLongFormProgressView(
  asset: ContentAsset,
  slices: readonly ContentSlice[],
  events: readonly MediaProgressEvent[],
  resumePoint: ResumePoint | null,
  progressEntry: ProgressEntry | null,
): LongFormProgressView | null {
  if (asset.durationSeconds === undefined) {
    return null;
  }

  const coverageRanges = mergeCoveredRanges(
    events.map((event) => ({
      endSecond: event.endSecond,
      startSecond: event.startSecond,
    })),
  );
  const legacyComplete =
    events.length === 0 &&
    progressEntry !== null &&
    completeProgressStatuses.has(progressEntry.status);
  const watchedSeconds = legacyComplete
    ? asset.durationSeconds
    : calculateCoveredSeconds(coverageRanges);
  const sliceCount = slices.length;
  const completedSliceCount = legacyComplete
    ? sliceCount
    : slices.filter(
        (slice) => calculateSliceCoverage(slice, coverageRanges) >= 1,
      ).length;
  const isComplete =
    legacyComplete ||
    (sliceCount > 0
      ? completedSliceCount === sliceCount
      : watchedSeconds >= asset.durationSeconds);
  const nextSlice =
    slices.find((slice) => calculateSliceCoverage(slice, coverageRanges) < 1) ??
    null;
  const fallbackResumeSecond =
    events.length > 0 ? events[events.length - 1]!.endSecond : null;
  const resumeSecond = isComplete
    ? asset.durationSeconds
    : (resumePoint?.lastSecond ?? fallbackResumeSecond);
  const completionPercent =
    asset.durationSeconds === 0
      ? 0
      : roundToSingleDecimal((watchedSeconds / asset.durationSeconds) * 100);
  const viewWithoutSummary: Omit<LongFormProgressView, 'summaryLine'> = {
    assetId: asset.id,
    completionPercent,
    completionSource: legacyComplete
      ? 'legacy_progress'
      : watchedSeconds > 0
        ? 'events'
        : 'none',
    completedSliceCount,
    durationSeconds: asset.durationSeconds,
    eventCount: events.length,
    hasProgress: legacyComplete || watchedSeconds > 0,
    isComplete,
    itemId: asset.itemId,
    nextSliceId: nextSlice?.id ?? null,
    nextSliceLabel: nextSlice?.label ?? null,
    resumeLabel:
      resumeSecond === null || isComplete
        ? null
        : `Resume at ${formatMediaTimestamp(resumeSecond)}`,
    resumeSecond,
    sliceCount,
    sliceProgressLabel: `${completedSliceCount} of ${sliceCount} segments complete`,
    watchedSeconds,
    watchedSummaryLabel: `${formatLoggedMinutes(watchedSeconds)} logged`,
  };

  return {
    ...viewWithoutSummary,
    summaryLine: buildSummaryLine(viewWithoutSummary),
  };
}
