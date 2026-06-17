import { describe, expect, it } from 'vitest';

import type {
  ContentAsset,
  ContentSlice,
  MediaProgressEvent,
  ResumePoint,
} from '@/lib/domain';
import {
  buildLongFormProgressView,
  calculateCoveredSeconds,
  createSlicePlan,
  deriveLongFormAssetId,
  deriveLongFormSliceId,
  mergeCoveredRanges,
} from '@/lib/progress';

const timestamp = '2026-06-12T08:00:00.000Z';
const assetId = deriveLongFormAssetId('week-0-lecture');

const lectureAsset: ContentAsset = {
  assetType: 'video',
  createdAt: timestamp,
  defaultSliceMinutes: 20,
  durationSeconds: 7200,
  estimatedMinutes: 120,
  id: assetId,
  itemId: 'week-0-lecture',
  order: 0,
  required: true,
  sourceLabel: 'Local bundled catalog',
  title: 'Lecture',
  updatedAt: timestamp,
};

const lectureSlices: ContentSlice[] = createSlicePlan(7200, 20).map(
  (slice) => ({
    assetId,
    completedAt: undefined,
    createdAt: timestamp,
    endSecond: slice.endSecond,
    id: deriveLongFormSliceId(assetId, slice.order),
    itemId: 'week-0-lecture',
    label: slice.label,
    order: slice.order,
    plannedMinutes: slice.plannedMinutes,
    skipReason: undefined,
    startSecond: slice.startSecond,
    status: 'not_started',
    updatedAt: timestamp,
  }),
);

describe('progress engine', () => {
  it('creates deterministic slices for a full-length lecture and a short tail', () => {
    expect(createSlicePlan(7200, 20)).toHaveLength(6);

    const unevenSlices = createSlicePlan(7500, 20);

    expect(unevenSlices).toHaveLength(7);
    expect(unevenSlices[0]).toMatchObject({
      endSecond: 1200,
      label: '0:00-20:00',
      order: 0,
      plannedMinutes: 20,
    });
    expect(unevenSlices[6]).toMatchObject({
      endSecond: 7500,
      label: '2:00:00-2:05:00',
      order: 6,
      plannedMinutes: 5,
    });
  });

  it('rejects non-positive durations', () => {
    expect(() => createSlicePlan(0, 20)).toThrow(/positive durationSeconds/i);
    expect(() => createSlicePlan(-1, 20)).toThrow(/positive durationSeconds/i);
  });

  it('merges overlapping covered ranges instead of double-counting them', () => {
    const coveredRanges = mergeCoveredRanges([
      { endSecond: 1200, startSecond: 0 },
      { endSecond: 1800, startSecond: 600 },
      { endSecond: 2400, startSecond: 1800 },
    ]);

    expect(coveredRanges).toEqual([{ endSecond: 2400, startSecond: 0 }]);
    expect(calculateCoveredSeconds(coveredRanges)).toBe(2400);
  });

  it('builds a partial long-form projection with watched time, slices, and resume data', () => {
    const firstEvent: MediaProgressEvent = {
      assetId,
      completedSlice: true,
      createdAt: timestamp,
      endSecond: 1200,
      energyAfter: 3,
      energyBefore: 4,
      id: 'media-event-1',
      itemId: 'week-0-lecture',
      notes: 'Stopped at the planned limit.',
      sessionId: undefined,
      sliceId: deriveLongFormSliceId(assetId, 0),
      startSecond: 0,
      stoppedBecause: 'reached_limit',
      updatedAt: timestamp,
      watchedSeconds: 1200,
    };
    const resumePoint: ResumePoint = {
      assetId,
      createdAt: timestamp,
      id: `resume-${assetId}`,
      itemId: 'week-0-lecture',
      lastSecond: 1200,
      nextSliceId: deriveLongFormSliceId(assetId, 1),
      updatedAt: timestamp,
      updatedFromEventId: 'media-event-1',
    };

    const longFormProgress = buildLongFormProgressView(
      lectureAsset,
      lectureSlices,
      [firstEvent],
      resumePoint,
      null,
    );

    expect(longFormProgress).toMatchObject({
      completionPercent: 16.7,
      completedSliceCount: 1,
      completionSource: 'events',
      hasProgress: true,
      isComplete: false,
      nextSliceLabel: '20:00-40:00',
      resumeLabel: 'Resume at 20:00',
      sliceCount: 6,
      summaryLine: '20 min logged · 1 of 6 segments complete · Resume at 20:00',
      watchedSeconds: 1200,
    });
  });

  it('preserves legacy completed progress when no slice events exist yet', () => {
    const longFormProgress = buildLongFormProgressView(
      lectureAsset,
      lectureSlices,
      [],
      null,
      {
        completedAt: timestamp,
        confidence: 1,
        createdAt: timestamp,
        evidenceText: 'Completed before the engine existed.',
        evidenceType: 'self_report',
        id: 'progress-week-0-lecture',
        itemId: 'week-0-lecture',
        notes: 'Legacy complete state.',
        startedAt: timestamp,
        status: 'completed',
        updatedAt: timestamp,
      },
    );

    expect(longFormProgress).toMatchObject({
      completionPercent: 100,
      completedSliceCount: 6,
      completionSource: 'legacy_progress',
      hasProgress: true,
      isComplete: true,
      summaryLine: 'Completed before slice logging · 6 of 6 segments complete',
      watchedSeconds: 7200,
    });
  });
});
