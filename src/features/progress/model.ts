import type {
  ContentAsset,
  ContentSlice,
  MediaProgressEvent,
  ProgressEntry,
  ResumePoint,
} from '@/lib/domain';
import {
  buildLongFormProgressView,
  calculateSliceCoverage,
  formatMediaTimestamp,
  formatLoggedMinutes,
  mergeCoveredRanges,
  type LongFormProgressView,
} from '@/lib/progress';
import { sortEvents, sortSlices } from '@/lib/progress/map';

export {
  buildLongFormProgressMap,
  buildLongFormProgressMapFromEventAggregates,
} from '@/lib/progress';

export type CourseLongFormProgress = LongFormProgressView;

export type LongFormSliceDetail = {
  completionPercent: number;
  endSecond: number;
  id: string;
  isNext: boolean;
  label: string;
  plannedMinutes: number;
  startSecond: number;
  status: 'completed' | 'inProgress' | 'notStarted' | 'skipped';
  statusLabel: string;
};

export type LongFormDetailView = {
  eventCount: number;
  lastLoggedRangeLabel: string | null;
  lastStopReasonLabel: string | null;
  progress: LongFormProgressView | null;
  slices: LongFormSliceDetail[];
};

const mediaStopReasonLabels = {
  completed_slice: 'Completed a full slice',
  confusion: 'Stopped because of confusion',
  fatigue: 'Stopped because of fatigue',
  interruption: 'Stopped because of an interruption',
  other: 'Stopped for another reason',
  reached_limit: 'Reached a clean limit',
  time_box_finished: 'Finished a time box',
} as const;

export function getMediaStopReasonLabel(
  stopReason: MediaProgressEvent['stoppedBecause'],
) {
  return mediaStopReasonLabels[stopReason];
}

function getSliceDetailStatus(
  slice: ContentSlice,
  coverageRatio: number,
): LongFormSliceDetail['status'] {
  if (slice.status === 'skipped') {
    return 'skipped';
  }

  if (coverageRatio >= 1) {
    return 'completed';
  }

  if (coverageRatio > 0) {
    return 'inProgress';
  }

  return 'notStarted';
}

function getSliceDetailStatusLabel(status: LongFormSliceDetail['status']) {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'inProgress':
      return 'In progress';
    case 'skipped':
      return 'Skipped';
    case 'notStarted':
    default:
      return 'Not started';
  }
}

export function buildLongFormDetailView(
  asset: ContentAsset,
  slices: readonly ContentSlice[],
  events: readonly MediaProgressEvent[],
  resumePoint: ResumePoint | null,
  progressEntry: ProgressEntry | null,
): LongFormDetailView {
  const sortedSlices = sortSlices(slices);
  const sortedEvents = sortEvents(events);
  const progress = buildLongFormProgressView(
    asset,
    sortedSlices,
    sortedEvents,
    resumePoint,
    progressEntry,
  );
  const coverageRanges = mergeCoveredRanges(
    sortedEvents.map((event) => ({
      endSecond: event.endSecond,
      startSecond: event.startSecond,
    })),
  );
  const sliceDetails = sortedSlices.map((slice) => {
    const coverageRatio = calculateSliceCoverage(slice, coverageRanges);
    const status = getSliceDetailStatus(slice, coverageRatio);

    return {
      completionPercent: Math.round(coverageRatio * 100),
      endSecond: slice.endSecond,
      id: slice.id,
      isNext: progress?.nextSliceId === slice.id,
      label: `${slice.label} (${slice.plannedMinutes} min)`,
      plannedMinutes: slice.plannedMinutes,
      startSecond: slice.startSecond,
      status,
      statusLabel: getSliceDetailStatusLabel(status),
    };
  });
  const lastEvent = sortedEvents.at(-1) ?? null;

  return {
    eventCount: sortedEvents.length,
    lastLoggedRangeLabel:
      lastEvent === null
        ? null
        : `${formatMediaTimestamp(lastEvent.startSecond)}-${formatMediaTimestamp(lastEvent.endSecond)} (${formatLoggedMinutes(lastEvent.watchedSeconds)})`,
    lastStopReasonLabel:
      lastEvent === null
        ? null
        : getMediaStopReasonLabel(lastEvent.stoppedBecause),
    progress,
    slices: sliceDetails,
  };
}
