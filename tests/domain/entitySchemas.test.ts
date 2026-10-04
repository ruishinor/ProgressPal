import { describe, expect, it } from 'vitest';

import {
  ContentAssetSchema,
  ContentSliceSchema,
  LearnerProfileSchema,
  MediaProgressEventSchema,
  StudySessionSchema,
  type ContentAsset,
  type ContentSlice,
  type LearnerProfile,
  type MediaProgressEvent,
  type StudySession,
} from '@/lib/domain';

const createdAt = '2026-06-11T08:00:00Z';
const updatedAt = '2026-06-11T09:00:00Z';

const validLearnerProfile: LearnerProfile = {
  id: 'learner-1',
  displayName: 'Alex',
  avatarConfig: {
    avatarId: 'auburn-braid',
    face: 'round',
    hair: 'curly',
    topColor: 'forest',
  },
  targetStudyDays: ['monday', 'wednesday', 'friday'],
  targetMinutesPerWeek: 360,
  preferredTheme: 'system',
  reducedMotion: false,
  createdAt,
  updatedAt,
};

const validVideoAsset: ContentAsset = {
  id: 'week-0-lecture-video',
  itemId: 'week-0-lecture',
  assetType: 'video',
  title: 'Week 0 Lecture',
  sourceLabel: 'CS50',
  sourceUrl: 'https://example.com/lecture',
  estimatedMinutes: 120,
  durationSeconds: 7200,
  defaultSliceMinutes: 20,
  order: 0,
  required: true,
  createdAt,
  updatedAt,
};

const validSlice: ContentSlice = {
  id: 'week-0-lecture-slice-1',
  assetId: 'week-0-lecture-video',
  itemId: 'week-0-lecture',
  order: 0,
  label: '0:00-20:00',
  startSecond: 0,
  endSecond: 1200,
  plannedMinutes: 20,
  status: 'active',
  createdAt,
  updatedAt,
};

const validEvent: MediaProgressEvent = {
  id: 'event-1',
  itemId: 'week-0-lecture',
  assetId: 'week-0-lecture-video',
  sliceId: 'week-0-lecture-slice-1',
  sessionId: 'session-1',
  startSecond: 0,
  endSecond: 1200,
  watchedSeconds: 1200,
  completedSlice: true,
  stoppedBecause: 'completed_slice',
  energyBefore: 4,
  energyAfter: 3,
  notes: 'Stopped at the intended limit.',
  createdAt,
  updatedAt,
};

const validStudySession: StudySession = {
  id: 'session-1',
  unitId: 'week-0',
  itemId: 'week-0-lecture',
  startedAt: createdAt,
  endedAt: updatedAt,
  durationMinutes: 60,
  mode: 'watching',
  blockers: [],
  createdAt,
  updatedAt,
};

describe('entity schemas', () => {
  it('accept valid persisted entity shapes for the pre-database domain layer', () => {
    expect(LearnerProfileSchema.parse(validLearnerProfile)).toEqual(
      validLearnerProfile,
    );
    expect(ContentAssetSchema.parse(validVideoAsset)).toEqual(validVideoAsset);
    expect(ContentSliceSchema.parse(validSlice)).toEqual(validSlice);
    expect(MediaProgressEventSchema.parse(validEvent)).toEqual(validEvent);
    expect(StudySessionSchema.parse(validStudySession)).toEqual(
      validStudySession,
    );
  });

  it('accepts legacy avatar configs without avatarId and rejects unknown avatar identities', () => {
    const legacy = LearnerProfileSchema.safeParse({
      ...validLearnerProfile,
      avatarConfig: { face: 'round', hair: 'curly', topColor: 'forest' },
    });
    const invalid = LearnerProfileSchema.safeParse({
      ...validLearnerProfile,
      avatarConfig: { ...validLearnerProfile.avatarConfig, avatarId: 'ghost' },
    });

    expect(legacy.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it('rejects malformed long-form assets and unsafe source URLs', () => {
    const invalidVideoResult = ContentAssetSchema.safeParse({
      ...validVideoAsset,
      durationSeconds: undefined,
      sourceUrl: 'javascript:alert(1)',
    });

    expect(invalidVideoResult.success).toBe(false);

    if (!invalidVideoResult.success) {
      const messages = invalidVideoResult.error.issues.map(
        (issue) => issue.message,
      );

      expect(messages).toEqual(
        expect.arrayContaining([
          'Expected an absolute http(s) URL.',
          'Video assets must include a durationSeconds value.',
        ]),
      );
    }
  });

  it('rejects invalid slice and event invariants', () => {
    const invalidSliceResult = ContentSliceSchema.safeParse({
      ...validSlice,
      status: 'skipped',
      skipReason: undefined,
    });
    const invalidEventResult = MediaProgressEventSchema.safeParse({
      ...validEvent,
      watchedSeconds: 1400,
      sliceId: undefined,
    });

    expect(invalidSliceResult.success).toBe(false);
    expect(invalidEventResult.success).toBe(false);

    if (!invalidSliceResult.success) {
      expect(
        invalidSliceResult.error.issues.some(
          (issue) =>
            issue.message === 'Skipped slices must include a skipReason.',
        ),
      ).toBe(true);
    }

    if (!invalidEventResult.success) {
      expect(
        invalidEventResult.error.issues.some(
          (issue) =>
            issue.message ===
            'watchedSeconds cannot exceed the logged range between startSecond and endSecond.',
        ),
      ).toBe(true);
      expect(
        invalidEventResult.error.issues.some(
          (issue) =>
            issue.message === 'completedSlice events must reference a sliceId.',
        ),
      ).toBe(true);
    }
  });

  it('rejects duplicate study days and sessions that end before they start', () => {
    const invalidProfileResult = LearnerProfileSchema.safeParse({
      ...validLearnerProfile,
      avatarConfig: {
        face: 'triangle',
      },
      targetStudyDays: ['monday', 'monday'],
    });
    const invalidSessionResult = StudySessionSchema.safeParse({
      ...validStudySession,
      startedAt: updatedAt,
      endedAt: createdAt,
    });

    expect(invalidProfileResult.success).toBe(false);
    expect(invalidSessionResult.success).toBe(false);

    if (!invalidProfileResult.success) {
      expect(
        invalidProfileResult.error.issues.some(
          (issue) =>
            issue.message === 'Duplicate study day "monday" is not allowed.',
        ),
      ).toBe(true);
      expect(
        invalidProfileResult.error.issues.some((issue) =>
          issue.path.includes('face'),
        ),
      ).toBe(true);
    }

    if (!invalidSessionResult.success) {
      expect(
        invalidSessionResult.error.issues.some(
          (issue) =>
            issue.message ===
            'endedAt must be the same as or later than startedAt.',
        ),
      ).toBe(true);
    }
  });
});
