import { describe, expect, it } from 'vitest';

import type {
  ContentAsset,
  ContentSlice,
  MediaProgressEvent,
  ProgressEntry,
  ResumePoint,
} from '@/lib/domain';
import {
  createSlicePlan,
  deriveLongFormAssetId,
  deriveLongFormSliceId,
} from '@/lib/progress';
import {
  buildLongFormDetailView,
  buildLongFormProgressMap,
  buildLongFormProgressMapFromEventAggregates,
} from '@/features/progress';

const timestamp = '2026-06-12T09:00:00.000Z';
const assetId = deriveLongFormAssetId('week-0-lecture');

const asset: ContentAsset = {
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

const slices: ContentSlice[] = createSlicePlan(7200, 20).map((slice) => ({
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
}));

describe('progress feature model', () => {
  it('builds a long-form progress map with overlap-safe watched totals', () => {
    const events: MediaProgressEvent[] = [
      {
        assetId,
        completedSlice: true,
        createdAt: '2026-06-12T09:10:00.000Z',
        endSecond: 1200,
        energyAfter: 3,
        energyBefore: 4,
        id: 'event-1',
        itemId: 'week-0-lecture',
        notes: 'First slice done.',
        sessionId: undefined,
        sliceId: deriveLongFormSliceId(assetId, 0),
        startSecond: 0,
        stoppedBecause: 'completed_slice',
        updatedAt: '2026-06-12T09:10:00.000Z',
        watchedSeconds: 1200,
      },
      {
        assetId,
        completedSlice: false,
        createdAt: '2026-06-12T09:25:00.000Z',
        endSecond: 1800,
        energyAfter: 2,
        energyBefore: 3,
        id: 'event-2',
        itemId: 'week-0-lecture',
        notes: 'Partial overlap into slice two.',
        sessionId: undefined,
        sliceId: deriveLongFormSliceId(assetId, 1),
        startSecond: 600,
        stoppedBecause: 'interruption',
        updatedAt: '2026-06-12T09:25:00.000Z',
        watchedSeconds: 1200,
      },
    ];
    const resumePoints: ResumePoint[] = [
      {
        assetId,
        createdAt: '2026-06-12T09:10:00.000Z',
        id: `resume-${assetId}`,
        itemId: 'week-0-lecture',
        lastSecond: 1800,
        nextSliceId: deriveLongFormSliceId(assetId, 1),
        updatedAt: '2026-06-12T09:25:00.000Z',
        updatedFromEventId: 'event-2',
      },
    ];
    const progressEntries: ProgressEntry[] = [
      {
        completedAt: undefined,
        confidence: 0.4,
        createdAt: timestamp,
        evidenceText: undefined,
        evidenceType: undefined,
        id: 'progress-week-0-lecture',
        itemId: 'week-0-lecture',
        notes: 'In progress.',
        startedAt: timestamp,
        status: 'started',
        updatedAt: timestamp,
      },
    ];

    const progressMap = buildLongFormProgressMap(
      [asset],
      slices,
      events,
      resumePoints,
      progressEntries,
    );
    const lectureProgress = progressMap.get('week-0-lecture');

    expect(lectureProgress).toMatchObject({
      completedSliceCount: 1,
      completionPercent: 25,
      nextSliceLabel: '20:00-40:00',
      resumeLabel: 'Resume at 30:00',
      sliceCount: 6,
      summaryLine: '30 min logged · 1 of 6 segments complete · Resume at 30:00',
      watchedSeconds: 1800,
    });
  });

  it('still exposes planned slices before any progress exists', () => {
    const progressMap = buildLongFormProgressMap([asset], slices, [], [], []);

    expect(progressMap.get('week-0-lecture')).toMatchObject({
      completionPercent: 0,
      hasProgress: false,
      summaryLine: '6 segments planned',
    });
  });

  it('builds the same long-form view from a streaming event aggregate', () => {
    const events: MediaProgressEvent[] = [
      {
        assetId,
        completedSlice: true,
        createdAt: '2026-06-12T09:10:00.000Z',
        endSecond: 1200,
        energyAfter: 3,
        energyBefore: 4,
        id: 'event-1',
        itemId: 'week-0-lecture',
        notes: 'First slice done.',
        sessionId: undefined,
        sliceId: deriveLongFormSliceId(assetId, 0),
        startSecond: 0,
        stoppedBecause: 'completed_slice',
        updatedAt: '2026-06-12T09:10:00.000Z',
        watchedSeconds: 1200,
      },
      {
        assetId,
        completedSlice: false,
        createdAt: '2026-06-12T09:25:00.000Z',
        endSecond: 2400,
        energyAfter: 2,
        energyBefore: 3,
        id: 'event-2',
        itemId: 'week-0-lecture',
        notes: 'Second slice partially logged.',
        sessionId: undefined,
        sliceId: deriveLongFormSliceId(assetId, 1),
        startSecond: 1800,
        stoppedBecause: 'interruption',
        updatedAt: '2026-06-12T09:25:00.000Z',
        watchedSeconds: 600,
      },
    ];
    const resumePoints: ResumePoint[] = [];
    const progressEntries: ProgressEntry[] = [];
    const expected = buildLongFormProgressMap(
      [asset],
      slices,
      events,
      resumePoints,
      progressEntries,
    );
    const actual = buildLongFormProgressMapFromEventAggregates(
      [asset],
      slices,
      new Map([
        [
          assetId,
          {
            coverageRanges: [
              { startSecond: 0, endSecond: 1200 },
              { startSecond: 1800, endSecond: 2400 },
            ],
            eventCount: 2,
            lastEventEndSecond: 2400,
          },
        ],
      ]),
      resumePoints,
      progressEntries,
    );

    expect(actual).toEqual(expected);
  });

  it('builds slice-level detail for the content-detail route', () => {
    const events: MediaProgressEvent[] = [
      {
        assetId,
        completedSlice: true,
        createdAt: '2026-06-12T09:10:00.000Z',
        endSecond: 1200,
        energyAfter: 3,
        energyBefore: 4,
        id: 'event-1',
        itemId: 'week-0-lecture',
        notes: 'First slice done.',
        sessionId: undefined,
        sliceId: deriveLongFormSliceId(assetId, 0),
        startSecond: 0,
        stoppedBecause: 'completed_slice',
        updatedAt: '2026-06-12T09:10:00.000Z',
        watchedSeconds: 1200,
      },
      {
        assetId,
        completedSlice: false,
        createdAt: '2026-06-12T09:25:00.000Z',
        endSecond: 1800,
        energyAfter: 2,
        energyBefore: 3,
        id: 'event-2',
        itemId: 'week-0-lecture',
        notes: 'Partial overlap into slice two.',
        sessionId: undefined,
        sliceId: deriveLongFormSliceId(assetId, 1),
        startSecond: 1200,
        stoppedBecause: 'interruption',
        updatedAt: '2026-06-12T09:25:00.000Z',
        watchedSeconds: 600,
      },
    ];
    const resumePoint: ResumePoint = {
      assetId,
      createdAt: '2026-06-12T09:10:00.000Z',
      id: `resume-${assetId}`,
      itemId: 'week-0-lecture',
      lastSecond: 1800,
      nextSliceId: deriveLongFormSliceId(assetId, 1),
      updatedAt: '2026-06-12T09:25:00.000Z',
      updatedFromEventId: 'event-2',
    };
    const progressEntry: ProgressEntry = {
      completedAt: undefined,
      confidence: 0.4,
      createdAt: timestamp,
      evidenceText: undefined,
      evidenceType: undefined,
      id: 'progress-week-0-lecture',
      itemId: 'week-0-lecture',
      notes: 'In progress.',
      startedAt: timestamp,
      status: 'started',
      updatedAt: timestamp,
    };

    const detailView = buildLongFormDetailView(
      asset,
      slices,
      events,
      resumePoint,
      progressEntry,
    );

    expect(detailView).toMatchObject({
      eventCount: 2,
      lastLoggedRangeLabel: '20:00-30:00 (10 min)',
      lastStopReasonLabel: 'Stopped because of an interruption',
      progress: {
        resumeLabel: 'Resume at 30:00',
      },
    });
    expect(detailView.slices[0]).toMatchObject({
      completionPercent: 100,
      isNext: false,
      status: 'completed',
    });
    expect(detailView.slices[1]).toMatchObject({
      completionPercent: 50,
      isNext: true,
      status: 'inProgress',
    });
  });
});
