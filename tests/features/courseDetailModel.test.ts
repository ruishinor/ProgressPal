import { describe, expect, it } from 'vitest';

import {
  createCourseDetailProgressFormValues,
  getCourseProgressStatusOptions,
  validateCourseDetailProgressForm,
} from '@/features/course/detailModel';
import type { CourseLongFormProgress } from '@/features/progress';
import type { CourseItem, ProgressEntry } from '@/lib/domain';

const timestamp = '2026-06-12T10:00:00.000Z';

const lectureItem: CourseItem = {
  createdAt: timestamp,
  estimatedMinutes: 120,
  id: 'week-0-lecture',
  order: 0,
  required: true,
  title: 'Lecture',
  type: 'lecture',
  unitId: 'week-0',
  updatedAt: timestamp,
};

const problemSetItem: CourseItem = {
  createdAt: timestamp,
  estimatedMinutes: 240,
  id: 'week-0-problem-set',
  order: 1,
  required: true,
  title: 'Problem Set 0',
  type: 'problem_set',
  unitId: 'week-0',
  updatedAt: timestamp,
};

const partialLongFormProgress: CourseLongFormProgress = {
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
  sliceProgressLabel: '1 of 6 slices complete',
  summaryLine: '20 min logged | 1 of 6 slices complete | Resume at 20:00',
  watchedSeconds: 1200,
  watchedSummaryLabel: '20 min logged',
};

describe('course detail model', () => {
  it('offers sequential problem-set status options', () => {
    expect(
      getCourseProgressStatusOptions({
        currentStatus: 'completed',
        itemType: problemSetItem.type,
        longFormProgress: null,
        required: true,
      }).map((option) => option.value),
    ).toEqual(['completed', 'submitted', 'accepted']);
  });

  it('blocks deceptive completion options for partial long-form progress', () => {
    expect(
      getCourseProgressStatusOptions({
        currentStatus: 'started',
        itemType: lectureItem.type,
        longFormProgress: partialLongFormProgress,
        required: true,
      }).map((option) => option.value),
    ).toEqual(['started', 'blocked']);
  });

  it('requires evidence when accepted work is saved', () => {
    const validation = validateCourseDetailProgressForm(
      {
        confidence: '4',
        evidenceText: '',
        notes: 'Submitted and verified.',
        status: 'accepted',
      },
      {
        currentStatus: 'submitted',
        itemType: problemSetItem.type,
        longFormProgress: null,
        required: true,
        selectedStatus: 'accepted',
      },
    );

    expect(validation.errors.evidenceText).toMatch(
      /needs a short evidence note/i,
    );
  });

  it('normalizes a new form to a safe default status when no record exists', () => {
    expect(
      createCourseDetailProgressFormValues(null, 'not_started'),
    ).toMatchObject({
      confidence: '0',
      evidenceText: '',
      notes: '',
      status: 'started',
    });
  });

  it('keeps saved notes and confidence when editing an existing record', () => {
    const progressEntry: ProgressEntry = {
      completedAt: undefined,
      confidence: 3,
      createdAt: timestamp,
      evidenceText: 'Saved locally.',
      evidenceType: 'self_report',
      id: 'progress-week-0-lecture',
      itemId: 'week-0-lecture',
      notes: 'Paused after the first slice.',
      startedAt: timestamp,
      status: 'started',
      updatedAt: timestamp,
    };

    expect(
      createCourseDetailProgressFormValues(progressEntry, progressEntry.status),
    ).toMatchObject({
      confidence: '3',
      evidenceText: 'Saved locally.',
      notes: 'Paused after the first slice.',
      status: 'started',
    });
  });
});
