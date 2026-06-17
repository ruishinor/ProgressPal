import { describe, expect, it } from 'vitest';

import { buildCourseMap, formatMinutes } from '@/features/course/model';
import type { CourseLongFormProgress } from '@/features/progress';
import type { CourseItem, CourseUnit, ProgressEntry } from '@/lib/domain';

const timestamp = '2026-06-11T10:00:00.000Z';

const courseUnits: CourseUnit[] = [
  {
    courseId: 'cs50x-2026',
    createdAt: timestamp,
    id: 'week-0',
    order: 0,
    required: true,
    sourceYear: 2026,
    title: 'Week 0',
    type: 'week',
    updatedAt: timestamp,
  },
  {
    courseId: 'cs50x-2026',
    createdAt: timestamp,
    id: 'final-project',
    order: 10,
    required: true,
    sourceYear: 2026,
    title: 'Final Project',
    type: 'final_project',
    updatedAt: timestamp,
  },
];

const courseItems: CourseItem[] = [
  {
    createdAt: timestamp,
    estimatedMinutes: 120,
    id: 'week-0-lecture',
    order: 0,
    required: true,
    title: 'Lecture',
    type: 'lecture',
    unitId: 'week-0',
    updatedAt: timestamp,
  },
  {
    createdAt: timestamp,
    estimatedMinutes: 45,
    id: 'week-0-shorts',
    order: 1,
    required: false,
    title: 'Shorts',
    type: 'shorts',
    unitId: 'week-0',
    updatedAt: timestamp,
  },
  {
    createdAt: timestamp,
    estimatedMinutes: 180,
    id: 'final-project-plan',
    order: 0,
    required: true,
    title: 'Plan milestone',
    type: 'project_task',
    unitId: 'final-project',
    updatedAt: timestamp,
  },
];

describe('course model', () => {
  it('builds ordered unit and item rollups with honest default statuses', () => {
    const courseMap = buildCourseMap(
      [...courseUnits].reverse(),
      [...courseItems].reverse(),
      [],
    );

    expect(courseMap.unitCount).toBe(2);
    expect(courseMap.itemCount).toBe(3);
    expect(courseMap.requiredItemCount).toBe(2);
    expect(courseMap.optionalItemCount).toBe(1);
    expect(courseMap.completionPercent).toBe(0);
    expect(courseMap.nextUnitTitle).toBe('Week 0');
    expect(courseMap.units.map((unit) => unit.title)).toEqual([
      'Week 0',
      'Final Project',
    ]);
    expect(courseMap.units[0]?.items.map((item) => item.title)).toEqual([
      'Lecture',
      'Shorts',
    ]);
    expect(courseMap.units[0]?.items[0]).toMatchObject({
      status: 'not_started',
      statusLabel: 'Not started',
      statusVariant: 'notStarted',
    });
    expect(courseMap.units[0]?.items[1]).toMatchObject({
      status: 'not_started',
      statusLabel: 'Optional',
      statusVariant: 'optional',
    });
  });

  it('rolls up completed, blocked, and skipped optional states without inflating completion', () => {
    const progressEntries: ProgressEntry[] = [
      {
        completedAt: '2026-06-11T12:00:00.000Z',
        confidence: 1,
        createdAt: '2026-06-11T12:00:00.000Z',
        evidenceText: 'Finished locally.',
        evidenceType: 'self_report',
        id: 'progress-week-0-lecture',
        itemId: 'week-0-lecture',
        notes: 'Done.',
        startedAt: '2026-06-11T10:30:00.000Z',
        status: 'completed',
        updatedAt: '2026-06-11T12:00:00.000Z',
      },
      {
        completedAt: undefined,
        confidence: 0.4,
        createdAt: '2026-06-11T12:05:00.000Z',
        evidenceText: undefined,
        evidenceType: undefined,
        id: 'progress-final-project-plan',
        itemId: 'final-project-plan',
        notes: 'Need to narrow the idea.',
        startedAt: '2026-06-11T12:00:00.000Z',
        status: 'blocked',
        updatedAt: '2026-06-11T12:05:00.000Z',
      },
      {
        completedAt: undefined,
        confidence: 0,
        createdAt: '2026-06-11T12:10:00.000Z',
        evidenceText: undefined,
        evidenceType: undefined,
        id: 'progress-week-0-shorts',
        itemId: 'week-0-shorts',
        notes: 'Skipped for now.',
        startedAt: undefined,
        status: 'skipped_optional',
        updatedAt: '2026-06-11T12:10:00.000Z',
      },
    ];

    const courseMap = buildCourseMap(courseUnits, courseItems, progressEntries);

    expect(courseMap.completedRequiredItemCount).toBe(1);
    expect(courseMap.blockedItemCount).toBe(1);
    expect(courseMap.completedUnitCount).toBe(1);
    expect(courseMap.completionPercent).toBe(50);
    expect(courseMap.nextUnitTitle).toBe('Final Project');
    expect(courseMap.units[0]).toMatchObject({
      completedOptionalItemCount: 1,
      completedRequiredItemCount: 1,
      completionPercent: 100,
      statusLabel: 'Completed',
      statusVariant: 'completed',
    });
    expect(courseMap.units[1]).toMatchObject({
      blockedItemCount: 1,
      statusLabel: 'Blocked',
      statusVariant: 'blocked',
    });
    expect(courseMap.units[0]?.items[1]).toMatchObject({
      statusLabel: 'Skipped optional',
      statusVariant: 'optional',
    });
  });

  it('formats planned minutes for the course-map summaries', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(95)).toBe('1h 35m');
  });

  it('uses long-form projections as a read-only fallback when item status is missing', () => {
    const longFormProgress = new Map<string, CourseLongFormProgress>([
      [
        'week-0-lecture',
        {
          assetId: 'week-0-lecture-asset',
          completionPercent: 16.7,
          completedSliceCount: 1,
          completionSource: 'events',
          durationSeconds: 7200,
          eventCount: 1,
          hasProgress: true,
          isComplete: false,
          itemId: 'week-0-lecture',
          nextSliceId: 'week-0-lecture-asset-slice-2',
          nextSliceLabel: '20:00-40:00',
          resumeLabel: 'Resume at 20:00',
          resumeSecond: 1200,
          sliceCount: 6,
          sliceProgressLabel: '1 of 6 segments complete',
          summaryLine:
            '20 min logged · 1 of 6 segments complete · Resume at 20:00',
          watchedSeconds: 1200,
          watchedSummaryLabel: '20 min logged',
        },
      ],
    ]);

    const courseMap = buildCourseMap(
      courseUnits,
      courseItems,
      [],
      longFormProgress,
    );

    expect(courseMap.units[0]?.items[0]).toMatchObject({
      longFormProgress: {
        summaryLine:
          '20 min logged · 1 of 6 segments complete · Resume at 20:00',
      },
      status: 'started',
      statusLabel: 'Started',
      statusVariant: 'inProgress',
    });
  });
});
