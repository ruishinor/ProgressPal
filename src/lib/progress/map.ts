import type {
  ContentAsset,
  ContentSlice,
  MediaProgressEvent,
  ProgressEntry,
  ResumePoint,
} from '@/lib/domain';
import {
  buildLongFormProgressView,
  buildLongFormProgressViewFromEventAggregate,
  type LongFormEventAggregate,
  type LongFormProgressView,
} from './engine';

function sortAssets(assets: readonly ContentAsset[]) {
  return [...assets].sort(
    (left, right) =>
      left.itemId.localeCompare(right.itemId) ||
      left.order - right.order ||
      left.id.localeCompare(right.id),
  );
}

export function sortEvents(events: readonly MediaProgressEvent[]) {
  return [...events].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
  );
}

export function sortSlices(slices: readonly ContentSlice[]) {
  return [...slices].sort(
    (left, right) =>
      left.order - right.order || left.id.localeCompare(right.id),
  );
}

export function buildLongFormProgressMap(
  assets: readonly ContentAsset[],
  slices: readonly ContentSlice[],
  events: readonly MediaProgressEvent[],
  resumePoints: readonly ResumePoint[],
  progressEntries: readonly ProgressEntry[],
) {
  const slicesByAssetId = new Map<string, ContentSlice[]>();
  const eventsByAssetId = new Map<string, MediaProgressEvent[]>();
  const resumePointsByAssetId = new Map<string, ResumePoint>();
  const progressEntriesByItemId = new Map<string, ProgressEntry>();

  for (const slice of sortSlices(slices)) {
    const groupedSlices = slicesByAssetId.get(slice.assetId) ?? [];

    groupedSlices.push(slice);
    slicesByAssetId.set(slice.assetId, groupedSlices);
  }

  for (const event of sortEvents(events)) {
    const groupedEvents = eventsByAssetId.get(event.assetId) ?? [];

    groupedEvents.push(event);
    eventsByAssetId.set(event.assetId, groupedEvents);
  }

  for (const resumePoint of resumePoints) {
    resumePointsByAssetId.set(resumePoint.assetId, resumePoint);
  }

  for (const progressEntry of progressEntries) {
    progressEntriesByItemId.set(progressEntry.itemId, progressEntry);
  }

  const progressMap = new Map<string, LongFormProgressView>();

  for (const asset of sortAssets(assets)) {
    const longFormProgress = buildLongFormProgressView(
      asset,
      slicesByAssetId.get(asset.id) ?? [],
      eventsByAssetId.get(asset.id) ?? [],
      resumePointsByAssetId.get(asset.id) ?? null,
      progressEntriesByItemId.get(asset.itemId) ?? null,
    );

    if (longFormProgress !== null && !progressMap.has(asset.itemId)) {
      progressMap.set(asset.itemId, longFormProgress);
    }
  }

  return progressMap;
}

export function buildLongFormProgressMapFromEventAggregates(
  assets: readonly ContentAsset[],
  slices: readonly ContentSlice[],
  eventAggregatesByAssetId: ReadonlyMap<string, LongFormEventAggregate>,
  resumePoints: readonly ResumePoint[],
  progressEntries: readonly ProgressEntry[],
) {
  const slicesByAssetId = new Map<string, ContentSlice[]>();
  const resumePointsByAssetId = new Map<string, ResumePoint>();
  const progressEntriesByItemId = new Map<string, ProgressEntry>();

  for (const slice of sortSlices(slices)) {
    const groupedSlices = slicesByAssetId.get(slice.assetId) ?? [];

    groupedSlices.push(slice);
    slicesByAssetId.set(slice.assetId, groupedSlices);
  }

  for (const resumePoint of resumePoints) {
    resumePointsByAssetId.set(resumePoint.assetId, resumePoint);
  }

  for (const progressEntry of progressEntries) {
    progressEntriesByItemId.set(progressEntry.itemId, progressEntry);
  }

  const progressMap = new Map<string, LongFormProgressView>();

  for (const asset of sortAssets(assets)) {
    const longFormProgress = buildLongFormProgressViewFromEventAggregate(
      asset,
      slicesByAssetId.get(asset.id) ?? [],
      eventAggregatesByAssetId.get(asset.id) ?? {
        coverageRanges: [],
        eventCount: 0,
        lastEventEndSecond: null,
      },
      resumePointsByAssetId.get(asset.id) ?? null,
      progressEntriesByItemId.get(asset.itemId) ?? null,
    );

    if (longFormProgress !== null && !progressMap.has(asset.itemId)) {
      progressMap.set(asset.itemId, longFormProgress);
    }
  }

  return progressMap;
}
