import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildBackupEnvelope,
  parseBackupFile,
  serializeBackupEnvelope,
} from '@/lib/backup';

import {
  addStudySession,
  addStudySessionAndAwardXp,
  addXpTransaction,
  ensureCourseCatalogFromSeed,
  getAchievementsView,
  getAppMeta,
  getCourseItem,
  getCourseUnit,
  getDatabaseSnapshot,
  getProgress,
  getResumePoint,
  getXpSummary,
  initializeDatabase,
  listAchievementUnlocks,
  listContentAssets,
  listContentSlices,
  listCourseItems,
  listCourseUnits,
  listMediaProgressEvents,
  listProgressEntries,
  listStudySessions,
  listXpTransactions,
  logMediaProgress,
  logMediaProgressAndAwardXp,
  recordBackupEvent,
  resetAllData,
  restoreDatabaseFromBackup,
  saveLearnerProfile,
  updateProfile,
  upsertProgress,
  upsertProgressAndAwardXp,
  type DatabaseSnapshot,
} from '@/lib/db';

import {
  createClock,
  createTestDatabase,
  sampleCourseSeed,
  type TestDatabaseContext,
} from './testDatabase';
import { cs50CatalogueId, cs50Policy } from '../programmes/cs50Policy';

describe('database repositories', () => {
  let testDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
    await testDatabase?.cleanup();
    testDatabase = null;
  });

  it('imports the course catalog idempotently without duplicating units or items', async () => {
    testDatabase = createTestDatabase('seed-sync');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T10:00:00.000Z'),
    });

    const firstSync = await ensureCourseCatalogFromSeed(sampleCourseSeed, {
      db: testDatabase.db,
      now: createClock('2026-06-11T10:05:00.000Z', '2026-06-11T10:06:00.000Z'),
    });
    const secondSync = await ensureCourseCatalogFromSeed(sampleCourseSeed, {
      db: testDatabase.db,
      now: createClock('2026-06-11T10:10:00.000Z'),
    });
    const [courseUnits, courseItems] = await Promise.all([
      listCourseUnits(sampleCourseSeed.courseId, { db: testDatabase.db }),
      listCourseItems(undefined, { db: testDatabase.db }),
    ]);

    expect(firstSync).toEqual({
      unitCount: 2,
      unitsAdded: 2,
      unitsUpdated: 0,
      itemCount: 3,
      itemsAdded: 3,
      itemsUpdated: 0,
      seedVersion: 1,
    });
    expect(secondSync).toEqual({
      unitCount: 2,
      unitsAdded: 0,
      unitsUpdated: 0,
      itemCount: 3,
      itemsAdded: 0,
      itemsUpdated: 0,
      seedVersion: 1,
    });
    expect(courseUnits.map((unit) => unit.id)).toEqual([
      'week-0',
      'final-project',
    ]);
    expect(courseItems.map((item) => item.id)).toEqual([
      'week-0-lecture',
      'final-project-plan',
      'week-0-shorts',
    ]);
  });

  it('does not rewrite derived content slices when a repeated seed sync finds no plan change', async () => {
    testDatabase = createTestDatabase('slice-sync-idempotent');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T10:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    const before = await listContentSlices(undefined, { db: testDatabase.db });
    expect(before.length).toBeGreaterThan(0);
    expect(
      before.every((slice) => slice.updatedAt === '2026-06-11T10:00:00.000Z'),
    ).toBe(true);

    // A second seed sync with the identical catalog (what app bootstrap does on
    // every mount) must leave derived slices byte-for-byte unchanged.
    await ensureCourseCatalogFromSeed(sampleCourseSeed, {
      db: testDatabase.db,
      now: createClock('2026-06-11T12:00:00.000Z'),
    });

    const after = await listContentSlices(undefined, { db: testDatabase.db });

    expect(after).toEqual(before);
    expect(
      after.every((slice) => slice.updatedAt === '2026-06-11T10:00:00.000Z'),
    ).toBe(true);
  });

  it('rewrites derived slices for an unwatched asset when the seed plan actually changes', async () => {
    testDatabase = createTestDatabase('slice-sync-replan');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T10:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    const lectureBefore = await listContentSlices('week-0-lecture-asset', {
      db: testDatabase.db,
    });
    const shortsBefore = await listContentSlices('week-0-shorts-asset', {
      db: testDatabase.db,
    });
    expect(lectureBefore.length).toBeGreaterThan(0);
    expect(shortsBefore.length).toBeGreaterThan(0);

    const replannedSeed = {
      ...sampleCourseSeed,
      dataVersion: 2,
      units: sampleCourseSeed.units.map((unit) =>
        unit.id === 'week-0'
          ? {
              ...unit,
              items: unit.items.map((item) =>
                item.id === 'week-0-lecture'
                  ? { ...item, estimatedMinutes: 30 }
                  : item,
              ),
            }
          : unit,
      ),
    };

    await ensureCourseCatalogFromSeed(replannedSeed, {
      db: testDatabase.db,
      now: createClock('2026-06-11T12:00:00.000Z'),
    });

    const lectureAfter = await listContentSlices('week-0-lecture-asset', {
      db: testDatabase.db,
    });
    const shortsAfter = await listContentSlices('week-0-shorts-asset', {
      db: testDatabase.db,
    });

    // The changed asset is deliberately rewritten: the new derived plan reflects
    // the shorter 30-minute duration and carries the new write timestamp.
    expect(
      lectureAfter.every(
        (slice) => slice.updatedAt === '2026-06-11T12:00:00.000Z',
      ),
    ).toBe(true);
    expect(Math.max(...lectureAfter.map((slice) => slice.endSecond))).toBe(
      30 * 60,
    );

    // The untouched asset keeps its original rows (idempotent skip).
    expect(shortsAfter).toEqual(shortsBefore);
    expect(
      shortsAfter.every(
        (slice) => slice.updatedAt === '2026-06-11T10:00:00.000Z',
      ),
    ).toBe(true);
  });

  it('re-syncs revised seed fields without touching learner progress data', async () => {
    testDatabase = createTestDatabase('seed-resync-updates');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T10:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    const persistedProgress = await upsertProgress(
      {
        itemId: 'week-0-lecture',
        status: 'started',
        startedAt: '2026-06-11T10:10:00.000Z',
        completedAt: undefined,
        confidence: 0.4,
        notes: 'Working through the lecture.',
        evidenceType: undefined,
        evidenceText: undefined,
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-11T10:10:00.000Z'),
      },
    );

    const updatedSeed = {
      ...sampleCourseSeed,
      dataVersion: 2,
      units: sampleCourseSeed.units.map((unit) => {
        if (unit.id !== 'week-0') {
          return unit;
        }

        return {
          ...unit,
          title: 'Week 0 - Scratch',
          items: unit.items.map((item) =>
            item.id === 'week-0-lecture'
              ? {
                  ...item,
                  title: 'Lecture recording',
                  estimatedMinutes: 150,
                }
              : item,
          ),
        };
      }),
    };

    const resync = await ensureCourseCatalogFromSeed(updatedSeed, {
      db: testDatabase.db,
      now: createClock('2026-06-11T10:20:00.000Z'),
    });
    const [courseUnits, courseItems, progress, appMeta] = await Promise.all([
      listCourseUnits(sampleCourseSeed.courseId, { db: testDatabase.db }),
      listCourseItems('week-0', { db: testDatabase.db }),
      getProgress('week-0-lecture', { db: testDatabase.db }),
      getDatabaseSnapshot({ db: testDatabase.db }),
    ]);

    expect(resync).toEqual({
      unitCount: 2,
      unitsAdded: 0,
      unitsUpdated: 1,
      itemCount: 3,
      itemsAdded: 0,
      itemsUpdated: 1,
      seedVersion: 2,
    });
    expect(courseUnits.find((unit) => unit.id === 'week-0')?.title).toBe(
      'Week 0 - Scratch',
    );
    expect(
      courseItems.find((item) => item.id === 'week-0-lecture')?.title,
    ).toBe('Lecture recording');
    expect(
      courseItems.find((item) => item.id === 'week-0-lecture')
        ?.estimatedMinutes,
    ).toBe(150);
    expect(progress).toEqual(persistedProgress);
    expect(appMeta.appMeta?.seedVersion).toBe(2);
  });

  it('loads one unit or item by id for the content-detail route', async () => {
    testDatabase = createTestDatabase('course-detail-lookups');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-12T08:30:00.000Z'),
      seed: sampleCourseSeed,
    });

    const [unit, item, missingItem] = await Promise.all([
      getCourseUnit('week-0', { db: testDatabase.db }),
      getCourseItem('week-0-lecture', { db: testDatabase.db }),
      getCourseItem('missing-item', { db: testDatabase.db }),
    ]);

    expect(unit?.title).toBe('Week 0');
    expect(item).toMatchObject({
      id: 'week-0-lecture',
      title: 'Lecture',
      type: 'lecture',
    });
    expect(missingItem).toBeNull();
  });

  it('updates the learner profile and rejects invalid profile patches', async () => {
    testDatabase = createTestDatabase('profile-update');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T11:00:00.000Z'),
    });

    const updatedProfile = await updateProfile(
      {
        displayName: 'Alex',
        targetStudyDays: ['monday', 'thursday'],
        targetMinutesPerWeek: 420,
        reducedMotion: true,
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-11T11:05:00.000Z'),
      },
    );

    await expect(
      updateProfile(
        {
          targetStudyDays: ['monday', 'monday'],
        },
        {
          db: testDatabase.db,
          now: createClock('2026-06-11T11:10:00.000Z'),
        },
      ),
    ).rejects.toThrow(/Duplicate study day "monday" is not allowed/);

    expect(updatedProfile.displayName).toBe('Alex');
    expect(updatedProfile.targetStudyDays).toEqual(['monday', 'thursday']);
    expect(updatedProfile.reducedMotion).toBe(true);
  });

  it('saves a complete learner profile and marks onboarding finished', async () => {
    testDatabase = createTestDatabase('profile-onboarding');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T11:30:00.000Z'),
    });

    const result = await saveLearnerProfile(
      {
        avatarConfig: {
          face: 'square',
          hair: 'parted',
          topColor: 'ocean',
        },
        displayName: 'Alex',
        preferredTheme: 'dark',
        reducedMotion: true,
        targetMinutesPerWeek: 360,
        targetStudyDays: ['monday', 'tuesday', 'thursday'],
      },
      {
        completeOnboarding: true,
        db: testDatabase.db,
        now: createClock('2026-06-11T11:35:00.000Z'),
      },
    );
    const appMeta = await getAppMeta({ db: testDatabase.db });

    expect(result.learnerProfile.avatarConfig).toEqual({
      face: 'square',
      hair: 'parted',
      topColor: 'ocean',
    });
    expect(result.appMeta.onboardingCompletedAt).toBe(
      '2026-06-11T11:35:00.000Z',
    );
    expect(appMeta?.onboardingCompletedAt).toBe('2026-06-11T11:35:00.000Z');

    await expect(
      saveLearnerProfile(
        {
          avatarConfig: {
            face: 'triangle',
          } as never,
          displayName: 'Alex',
          preferredTheme: 'system',
          reducedMotion: false,
          targetMinutesPerWeek: 300,
          targetStudyDays: ['monday'],
        },
        {
          db: testDatabase.db,
          now: createClock('2026-06-11T11:40:00.000Z'),
        },
      ),
    ).rejects.toThrow(/avatarConfig/i);
  });

  it('upserts one progress record per item and rejects invalid mutations', async () => {
    testDatabase = createTestDatabase('progress-upsert');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T12:00:00.000Z'),
    });

    const initialProgress = await upsertProgress(
      {
        itemId: 'week-0-lecture',
        status: 'started',
        startedAt: '2026-06-11T12:05:00.000Z',
        completedAt: undefined,
        confidence: 0.35,
        notes: 'Paused at the first pointer segment.',
        evidenceType: undefined,
        evidenceText: undefined,
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-11T12:05:00.000Z'),
      },
    );
    const updatedProgress = await upsertProgress(
      {
        itemId: 'week-0-lecture',
        status: 'completed',
        startedAt: '2026-06-11T12:05:00.000Z',
        completedAt: '2026-06-11T13:10:00.000Z',
        confidence: 0.9,
        notes: 'Completed after a second pass.',
        evidenceType: 'self_report',
        evidenceText: 'Marked complete after local verification.',
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-11T13:10:00.000Z'),
      },
    );

    await expect(
      upsertProgress(
        {
          id: 'other-progress-id',
          itemId: 'week-0-lecture',
          status: 'completed',
          startedAt: undefined,
          completedAt: '2026-06-11T13:15:00.000Z',
          confidence: 1,
          notes: undefined,
          evidenceType: undefined,
          evidenceText: undefined,
        },
        {
          db: testDatabase.db,
          now: createClock('2026-06-11T13:15:00.000Z'),
        },
      ),
    ).rejects.toThrow(/input id does not match the existing record/i);

    await expect(
      upsertProgress(
        {
          itemId: 'week-0-lecture',
          status: 'completed',
          startedAt: undefined,
          completedAt: '2026-06-11T13:20:00.000Z',
          confidence: -1,
          notes: undefined,
          evidenceType: undefined,
          evidenceText: undefined,
        },
        {
          db: testDatabase.db,
          now: createClock('2026-06-11T13:20:00.000Z'),
        },
      ),
    ).rejects.toThrow(/confidence/i);

    const persistedProgress = await getProgress('week-0-lecture', {
      db: testDatabase.db,
    });

    expect(updatedProgress.id).toBe(initialProgress.id);
    expect(persistedProgress).toEqual(updatedProgress);
  });

  it('lists progress entries in stable item order for course-map rollups', async () => {
    testDatabase = createTestDatabase('progress-list');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T13:30:00.000Z'),
      seed: sampleCourseSeed,
    });

    await upsertProgress(
      {
        itemId: 'week-0-shorts',
        status: 'started',
        startedAt: '2026-06-11T13:35:00.000Z',
        completedAt: undefined,
        confidence: 0.3,
        notes: 'Partial.',
        evidenceType: undefined,
        evidenceText: undefined,
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-11T13:35:00.000Z'),
      },
    );
    await upsertProgress(
      {
        itemId: 'final-project-plan',
        status: 'blocked',
        startedAt: '2026-06-11T13:40:00.000Z',
        completedAt: undefined,
        confidence: 0.2,
        notes: 'Need a narrower scope.',
        evidenceType: undefined,
        evidenceText: undefined,
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-11T13:40:00.000Z'),
      },
    );

    const progressEntries = await listProgressEntries({ db: testDatabase.db });

    expect(progressEntries.map((entry) => entry.itemId)).toEqual([
      'final-project-plan',
      'week-0-shorts',
    ]);
    expect(progressEntries.map((entry) => entry.status)).toEqual([
      'blocked',
      'started',
    ]);
  });

  it('derives long-form assets and default slices from eligible seeded items', async () => {
    testDatabase = createTestDatabase('long-form-catalog');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-12T08:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    const [contentAssets, lectureSlices] = await Promise.all([
      listContentAssets(undefined, { db: testDatabase.db }),
      listContentSlices('week-0-lecture-asset', { db: testDatabase.db }),
    ]);

    expect(contentAssets.map((asset) => asset.id)).toEqual([
      'week-0-lecture-asset',
      'week-0-shorts-asset',
    ]);
    expect(contentAssets[0]).toMatchObject({
      assetType: 'video',
      defaultSliceMinutes: 20,
      durationSeconds: 7200,
      itemId: 'week-0-lecture',
      sourceLabel: 'Local bundled catalog',
      title: 'Lecture',
    });
    expect(lectureSlices).toHaveLength(6);
    expect(lectureSlices[0]).toMatchObject({
      endSecond: 1200,
      label: '0:00-20:00',
      status: 'not_started',
    });
  });

  it('logs immutable media progress, updates resume, and rejects duplicate ranges', async () => {
    testDatabase = createTestDatabase('media-progress');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-12T09:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    const firstEvent = await logMediaProgress(
      {
        assetId: 'week-0-lecture-asset',
        endSecond: 1200,
        energyAfter: 3,
        energyBefore: 4,
        notes: 'Stopped cleanly at the first limit.',
        startSecond: 0,
        stoppedBecause: 'reached_limit',
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-12T09:10:00.000Z'),
      },
    );
    const secondEvent = await logMediaProgress(
      {
        assetId: 'week-0-lecture-asset',
        endSecond: 1920,
        energyAfter: 2,
        energyBefore: 3,
        notes: 'Interrupted partway through the second slice.',
        startSecond: 1200,
        stoppedBecause: 'interruption',
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-12T09:25:00.000Z'),
      },
    );

    await expect(
      logMediaProgress(
        {
          assetId: 'week-0-lecture-asset',
          endSecond: 1200,
          energyAfter: 3,
          energyBefore: 4,
          notes: 'Duplicate exact range.',
          startSecond: 0,
          stoppedBecause: 'other',
        },
        {
          db: testDatabase.db,
          now: createClock('2026-06-12T09:30:00.000Z'),
        },
      ),
    ).rejects.toThrow(/duplicate exact time ranges/i);

    const [events, resumePoint, lectureSlices, progress] = await Promise.all([
      listMediaProgressEvents('week-0-lecture-asset', { db: testDatabase.db }),
      getResumePoint('week-0-lecture-asset', { db: testDatabase.db }),
      listContentSlices('week-0-lecture-asset', { db: testDatabase.db }),
      getProgress('week-0-lecture', { db: testDatabase.db }),
    ]);

    expect(firstEvent.event.completedSlice).toBe(true);
    expect(firstEvent.resumePoint).toMatchObject({
      lastSecond: 1200,
      nextSliceId: 'week-0-lecture-asset-slice-2',
    });
    expect(firstEvent.longFormProgress).toMatchObject({
      completionPercent: 16.7,
      summaryLine: '20 min logged · 1 of 6 segments complete · Resume at 20:00',
    });
    expect(secondEvent.resumePoint.lastSecond).toBe(1920);
    expect(events).toHaveLength(2);
    expect(resumePoint).toMatchObject({
      lastSecond: 1920,
      nextSliceId: 'week-0-lecture-asset-slice-2',
    });
    expect(lectureSlices[0]?.status).toBe('completed');
    expect(lectureSlices[1]?.status).toBe('active');
    expect(progress).toMatchObject({
      itemId: 'week-0-lecture',
      startedAt: '2026-06-12T09:10:00.000Z',
      status: 'started',
    });
  });

  it('rejects new media events with missing or mismatched study sessions', async () => {
    testDatabase = createTestDatabase('media-progress-session-reference');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-12T09:00:00.000Z'),
      seed: sampleCourseSeed,
    });
    await addStudySession(
      {
        id: 'final-project-session',
        unitId: 'final-project',
        itemId: 'final-project-plan',
        startedAt: '2026-06-12T09:00:00.000Z',
        endedAt: '2026-06-12T09:30:00.000Z',
        durationMinutes: 30,
        mode: 'final_project',
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-12T09:30:00.000Z'),
      },
    );
    const input = {
      assetId: 'week-0-lecture-asset',
      endSecond: 300,
      energyAfter: 3,
      energyBefore: 3,
      startSecond: 0,
      stoppedBecause: 'reached_limit' as const,
    };

    await expect(
      logMediaProgress(
        { ...input, sessionId: 'missing-session' },
        { db: testDatabase.db },
      ),
    ).rejects.toThrow(/was not found/i);
    await expect(
      logMediaProgress(
        { ...input, sessionId: 'final-project-session' },
        { db: testDatabase.db },
      ),
    ).rejects.toThrow(/does not belong/i);

    expect(
      await listMediaProgressEvents('week-0-lecture-asset', {
        db: testDatabase.db,
      }),
    ).toEqual([]);
  });

  it('marks the parent item complete when every generated slice is completed', async () => {
    testDatabase = createTestDatabase('media-progress-complete');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-12T10:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    for (const [index, slice] of (
      await listContentSlices('week-0-lecture-asset', { db: testDatabase.db })
    ).entries()) {
      await logMediaProgress(
        {
          assetId: 'week-0-lecture-asset',
          endSecond: slice.endSecond,
          energyAfter: 3,
          energyBefore: 4,
          notes: `Completed generated slice ${index + 1}.`,
          startSecond: slice.startSecond,
          stoppedBecause: 'completed_slice',
        },
        {
          db: testDatabase.db,
          now: createClock(
            `2026-06-12T10:${String(index).padStart(2, '0')}:00.000Z`,
          ),
        },
      );
    }

    const [progress, resumePoint, lectureSlices] = await Promise.all([
      getProgress('week-0-lecture', { db: testDatabase.db }),
      getResumePoint('week-0-lecture-asset', { db: testDatabase.db }),
      listContentSlices('week-0-lecture-asset', { db: testDatabase.db }),
    ]);

    expect(progress).toMatchObject({
      completedAt: '2026-06-12T10:05:00.000Z',
      status: 'completed',
    });
    expect(resumePoint).toMatchObject({
      lastSecond: 7200,
      nextSliceId: undefined,
    });
    expect(lectureSlices.every((slice) => slice.status === 'completed')).toBe(
      true,
    );
  });

  it('returns a JSON-safe snapshot of persisted repository writes', async () => {
    testDatabase = createTestDatabase('snapshot');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T14:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    await addStudySession(
      {
        unitId: 'week-0',
        itemId: 'week-0-lecture',
        startedAt: '2026-06-11T14:10:00.000Z',
        endedAt: '2026-06-11T14:35:00.000Z',
        durationMinutes: 25,
        mode: 'watching',
        notes: 'Stopped at the first time box.',
        blockers: ['context switch'],
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-11T14:35:00.000Z'),
      },
    );
    await addXpTransaction(
      {
        sourceType: 'study_session',
        sourceId: 'study-session-source',
        xp: 25,
        reason: 'Completed one focused lecture slice.',
        awardedAt: '2026-06-11T14:35:00.000Z',
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-11T14:35:30.000Z'),
      },
    );

    const snapshot = await getDatabaseSnapshot({ db: testDatabase.db });

    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
    expect(snapshot.courseUnits).toHaveLength(2);
    expect(snapshot.courseItems).toHaveLength(3);
    expect(snapshot.studySessions).toHaveLength(1);
    expect(snapshot.xpTransactions).toHaveLength(1);
    expect(snapshot.appMeta?.seedVersion).toBe(1);
  });

  it('lists study sessions deterministically and leaves non-session stores untouched', async () => {
    testDatabase = createTestDatabase('study-sessions-list');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-12T14:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    const beforeSnapshot = await getDatabaseSnapshot({ db: testDatabase.db });

    await addStudySession(
      {
        id: 'study-session-a',
        unitId: 'week-0',
        itemId: 'week-0-lecture',
        startedAt: '2026-06-12T14:10:00.000Z',
        endedAt: '2026-06-12T14:35:00.000Z',
        durationMinutes: 25,
        mode: 'watching',
        notes: 'Reviewed the first lecture segment.',
        blockers: [],
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-12T14:35:00.000Z'),
      },
    );
    await addStudySession(
      {
        id: 'study-session-b',
        unitId: 'week-0',
        itemId: 'week-0-lecture',
        startedAt: '2026-06-12T14:10:00.000Z',
        endedAt: '2026-06-12T14:50:00.000Z',
        durationMinutes: 40,
        mode: 'reading',
        notes: undefined,
        blockers: ['Context switch'],
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-12T14:50:00.000Z'),
      },
    );
    await addStudySession(
      {
        id: 'study-session-c',
        unitId: 'final-project',
        itemId: 'final-project-plan',
        startedAt: '2026-06-12T15:00:00.000Z',
        endedAt: '2026-06-12T15:30:00.000Z',
        durationMinutes: 30,
        mode: 'final_project',
        notes: 'Outlined the next checkpoint.',
        blockers: ['Scope drift'],
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-12T15:30:00.000Z'),
      },
    );

    const [studySessions, afterSnapshot] = await Promise.all([
      listStudySessions({ db: testDatabase.db }),
      getDatabaseSnapshot({ db: testDatabase.db }),
    ]);

    expect(studySessions.map((session) => session.id)).toEqual([
      'study-session-a',
      'study-session-b',
      'study-session-c',
    ]);
    expect(afterSnapshot.progressEntries).toEqual(
      beforeSnapshot.progressEntries,
    );
    expect(afterSnapshot.mediaProgressEvents).toEqual(
      beforeSnapshot.mediaProgressEvents,
    );
    expect(afterSnapshot.contentSlices).toEqual(beforeSnapshot.contentSlices);
    expect(afterSnapshot.resumePoints).toEqual(beforeSnapshot.resumePoints);
    expect(afterSnapshot.xpTransactions).toEqual(beforeSnapshot.xpTransactions);
    expect(afterSnapshot.achievementUnlocks).toEqual(
      beforeSnapshot.achievementUnlocks,
    );
    expect(afterSnapshot.backups).toEqual(beforeSnapshot.backups);
  });

  it('rejects schema-invalid study sessions and preserves saved rows across seed re-sync', async () => {
    testDatabase = createTestDatabase('study-sessions-resync');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-12T16:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    await expect(
      addStudySession(
        {
          unitId: 'week-0',
          itemId: 'week-0-lecture',
          startedAt: '2026-06-12T16:20:00.000Z',
          endedAt: '2026-06-12T16:10:00.000Z',
          durationMinutes: 10,
          mode: 'watching',
          notes: undefined,
          blockers: [],
        },
        {
          db: testDatabase.db,
          now: createClock('2026-06-12T16:20:00.000Z'),
        },
      ),
    ).rejects.toThrow(/endedAt must be the same as or later than startedAt/i);

    await addStudySession(
      {
        id: 'study-session-persisted',
        unitId: 'week-0',
        itemId: 'week-0-lecture',
        startedAt: '2026-06-12T16:00:00.000Z',
        endedAt: '2026-06-12T16:25:00.000Z',
        durationMinutes: 25,
        mode: 'watching',
        notes: 'Should survive a seed re-sync.',
        blockers: ['Context switch'],
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-12T16:25:00.000Z'),
      },
    );

    const updatedSeed = {
      ...sampleCourseSeed,
      dataVersion: 2,
      units: sampleCourseSeed.units.map((unit) =>
        unit.id === 'week-0'
          ? {
              ...unit,
              title: 'Week 0 - Scratch',
            }
          : unit,
      ),
    };

    await ensureCourseCatalogFromSeed(updatedSeed, {
      db: testDatabase.db,
      now: createClock('2026-06-12T16:30:00.000Z'),
    });

    const studySessions = await listStudySessions({ db: testDatabase.db });

    expect(studySessions).toHaveLength(1);
    expect(studySessions[0]).toMatchObject({
      id: 'study-session-persisted',
      itemId: 'week-0-lecture',
      unitId: 'week-0',
    });
  });

  describe('XP engine repository integration', () => {
    it('keeps XP reads passive on an empty current-schema database', async () => {
      testDatabase = createTestDatabase('xp-passive-read');
      await testDatabase.db.open();

      await expect(
        getXpSummary({ db: testDatabase.db }),
      ).resolves.toMatchObject({
        level: 1,
        totalXp: 0,
      });
      await expect(
        listXpTransactions({ db: testDatabase.db }),
      ).resolves.toEqual([]);
      expect(await testDatabase.db.appMeta.count()).toBe(0);
      expect(await testDatabase.db.learnerProfile.count()).toBe(0);
    });

    it('starts with 0 XP and level 1 on a fresh database', async () => {
      testDatabase = createTestDatabase('xp-fresh');
      await initializeDatabase({
        db: testDatabase.db,
        now: createClock('2026-06-12T16:00:00.000Z'),
        seed: sampleCourseSeed,
      });

      const summary = await getXpSummary({ db: testDatabase.db });
      expect(summary).toEqual({
        totalXp: 0,
        level: 1,
        xpToNextLevel: 100,
        currentLevelFloorXp: 0,
        nextLevelXp: 100,
      });

      const txs = await listXpTransactions({ db: testDatabase.db });
      expect(txs).toEqual([]);
    });

    it('returns a real XP summary when progress references missing catalog data', async () => {
      testDatabase = createTestDatabase('xp-missing-catalog');
      await initializeDatabase({
        db: testDatabase.db,
        now: createClock('2026-06-12T16:00:00.000Z'),
      });

      const missingItemResult = await upsertProgressAndAwardXp(
        {
          confidence: 2,
          itemId: 'missing-item',
          status: 'started',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
        },
      );
      expect(missingItemResult.xpSummary).toMatchObject({
        level: 1,
        totalXp: 0,
      });

      await testDatabase.db.courseItems.add({
        id: 'item-with-missing-unit',
        createdAt: '2026-06-12T16:01:00.000Z',
        estimatedMinutes: 20,
        order: 0,
        required: true,
        title: 'Orphaned item',
        type: 'lecture',
        unitId: 'missing-unit',
        updatedAt: '2026-06-12T16:01:00.000Z',
      });
      const missingUnitResult = await upsertProgressAndAwardXp(
        {
          confidence: 2,
          itemId: 'item-with-missing-unit',
          status: 'started',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
        },
      );
      expect(missingUnitResult.xpSummary).toMatchObject({
        level: 1,
        totalXp: 0,
      });
    });

    it('awards study session XP only for duration >= 25 minutes and prevents duplicate awards', async () => {
      testDatabase = createTestDatabase('xp-sessions');
      await initializeDatabase({
        db: testDatabase.db,
        now: createClock('2026-06-12T16:00:00.000Z'),
        seed: sampleCourseSeed,
      });

      // 1. Log a short session (<25 min) -> no XP
      const res1 = await addStudySessionAndAwardXp(
        {
          id: 'session-short',
          unitId: 'week-0',
          itemId: 'week-0-lecture',
          startedAt: '2026-06-12T16:00:00.000Z',
          endedAt: '2026-06-12T16:15:00.000Z',
          durationMinutes: 15,
          mode: 'watching',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:15:00.000Z'),
        },
      );

      expect(res1.awardedTransactions).toHaveLength(0);
      expect(res1.xpSummary.totalXp).toBe(0);

      // 2. Log a qualifying session (>=25 min) -> +10 XP
      const res2 = await addStudySessionAndAwardXp(
        {
          id: 'session-qualifying',
          unitId: 'week-0',
          itemId: 'week-0-lecture',
          startedAt: '2026-06-12T16:20:00.000Z',
          endedAt: '2026-06-12T16:50:00.000Z',
          durationMinutes: 30,
          mode: 'watching',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:50:00.000Z'),
        },
      );

      expect(res2.awardedTransactions).toHaveLength(1);
      expect(res2.awardedTransactions[0]).toMatchObject({
        sourceType: 'study_session',
        sourceId: 'session-qualifying',
        xp: 10,
      });
      expect(res2.xpSummary.totalXp).toBe(10);
      expect(res2.xpSummary.level).toBe(1);

      // 3. Try to save the same session ID again (idempotency check) -> skips safely
      const res3 = await addStudySessionAndAwardXp(
        {
          id: 'session-qualifying',
          unitId: 'week-0',
          itemId: 'week-0-lecture',
          startedAt: '2026-06-12T16:20:00.000Z',
          endedAt: '2026-06-12T16:50:00.000Z',
          durationMinutes: 30,
          mode: 'watching',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:50:00.000Z'),
        },
      );
      expect(res3.awardedTransactions).toHaveLength(0);
      expect(res3.xpSummary.totalXp).toBe(10);
    });

    it('awards milestone XP for problem sets and prevents exploit loops', async () => {
      testDatabase = createTestDatabase('xp-progress');
      await initializeDatabase({
        db: testDatabase.db,
        now: createClock('2026-06-12T16:00:00.000Z'),
        seed: sampleCourseSeed,
      });

      await testDatabase.db.courseItems.add({
        id: 'week-0-pset',
        unitId: 'week-0',
        type: 'problem_set',
        title: 'Problem Set 0',
        required: true,
        estimatedMinutes: 180,
        order: 2,
        createdAt: '2026-06-12T16:00:00.000Z',
        updatedAt: '2026-06-12T16:00:00.000Z',
      });

      // 1. Started -> +20 XP
      const res1 = await upsertProgressAndAwardXp(
        {
          itemId: 'week-0-pset',
          status: 'started',
          confidence: 3,
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:10:00.000Z'),
        },
      );

      expect(res1.awardedTransactions).toHaveLength(1);
      expect(res1.awardedTransactions[0].sourceType).toBe(
        'problem_set_started',
      );
      expect(res1.xpSummary.totalXp).toBe(20);

      // 2. Start again -> 0 XP (no duplication)
      const res2 = await upsertProgressAndAwardXp(
        {
          itemId: 'week-0-pset',
          status: 'started',
          confidence: 4,
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:15:00.000Z'),
        },
      );
      expect(res2.awardedTransactions).toHaveLength(0);
      expect(res2.xpSummary.totalXp).toBe(20);

      // 3. Submitted -> +75 XP
      const res3 = await upsertProgressAndAwardXp(
        {
          itemId: 'week-0-pset',
          status: 'submitted',
          confidence: 4,
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:20:00.000Z'),
        },
      );
      expect(res3.awardedTransactions).toHaveLength(1);
      expect(res3.awardedTransactions[0].sourceType).toBe(
        'problem_set_submitted',
      );
      expect(res3.xpSummary.totalXp).toBe(95);

      // 4. Accepted -> +125 XP
      const res4 = await upsertProgressAndAwardXp(
        {
          itemId: 'week-0-pset',
          status: 'accepted',
          confidence: 5,
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:30:00.000Z'),
        },
      );
      expect(res4.awardedTransactions).toHaveLength(1);
      expect(res4.awardedTransactions[0].sourceType).toBe(
        'problem_set_accepted',
      );
      expect(res4.xpSummary.totalXp).toBe(220);
      expect(res4.xpSummary.level).toBe(2); // Level 2 floor is 100 XP, ceiling is 400 XP

      // 5. Downgrade status -> No XP revocation, level/XP remains the same
      const res5 = await upsertProgressAndAwardXp(
        {
          itemId: 'week-0-pset',
          status: 'started',
          confidence: 2,
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:40:00.000Z'),
        },
      );
      expect(res5.awardedTransactions).toHaveLength(0);
      expect(res5.xpSummary.totalXp).toBe(220);
    });

    it('awards media XP correctly, handles slice completion, clean stop, and block crossing', async () => {
      testDatabase = createTestDatabase('xp-media');
      await initializeDatabase({
        db: testDatabase.db,
        now: createClock('2026-06-12T16:00:00.000Z'),
        seed: sampleCourseSeed,
      });

      await testDatabase.db.contentAssets.update('week-0-lecture-asset', {
        durationSeconds: 1800,
      });
      await testDatabase.db.contentSlices
        .where('assetId')
        .equals('week-0-lecture-asset')
        .delete();

      // The lecture asset duration is 1800 seconds (30 minutes)
      // Slices: 0-1200, 1200-1800 (or default 20 minutes = 1200s, slice 2 = 600s)

      // 1. Log media progress covering the first 10 minutes -> 1 block crossed (+4 XP)
      const res1 = await logMediaProgressAndAwardXp(
        {
          assetId: 'week-0-lecture-asset',
          startSecond: 0,
          endSecond: 600,
          energyBefore: 4,
          energyAfter: 4,
          stoppedBecause: 'interruption',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:10:00.000Z'),
        },
      );

      expect(res1.awardedTransactions).toHaveLength(1);
      expect(res1.awardedTransactions[0].sourceType).toBe(
        'media_unique_10_minutes',
      );
      expect(res1.xpSummary.totalXp).toBe(4);

      // 2. Log second part covering first slice (0-1200) with a clean stop (15+ min watched)
      // Watched from 600 to 1200 -> 10 minutes watched, completing slice 1 (+10 XP) and block 2 (+4 XP)
      // Watched seconds in this event: 600. So event is NOT 15+ minutes.
      const res2 = await logMediaProgressAndAwardXp(
        {
          assetId: 'week-0-lecture-asset',
          startSecond: 600,
          endSecond: 1200,
          energyBefore: 4,
          energyAfter: 3,
          stoppedBecause: 'completed_slice',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:25:00.000Z'),
        },
      );

      // Expect slice complete (+10) and block 2 crossed (+4) -> 2 transactions
      expect(res2.awardedTransactions).toHaveLength(2);
      expect(res2.awardedTransactions.map((t) => t.sourceType)).toContain(
        'content_slice_completed',
      );
      expect(res2.awardedTransactions.map((t) => t.sourceType)).toContain(
        'media_unique_10_minutes',
      );
      expect(res2.xpSummary.totalXp).toBe(18); // 4 + 14 = 18

      // 3. Log a long focus session with clean stop (900+ seconds) -> +5 XP, +4 block 3, +10 slice 2, +40 lecture complete
      // Watched from 1200 to 2100? No, asset duration is 1800. Let's watch 0 to 1800. That's 30 mins (1800s).
      // Since 0-1200 is already watched, the new watched range is 1200-1800 (10 mins, completing slice 2 and block 3).
      // Let's do a 900+ second event from 900 to 1800.
      // Watched range: 900 to 1800 (15 minutes = 900 seconds)
      const res3 = await logMediaProgressAndAwardXp(
        {
          assetId: 'week-0-lecture-asset',
          startSecond: 900,
          endSecond: 1800,
          energyBefore: 4,
          energyAfter: 4,
          stoppedBecause: 'reached_limit', // clean stop stopReason
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:40:00.000Z'),
        },
      );

      // Awarded:
      // - clean stop (event watchedSeconds is 900, stopReason reached_limit) -> +5 XP
      // - block 3 crossed (coverageAfter: 0-1800, crossed blocks: 0, 1, 2. crossedBefore: 0, 1) -> +4 XP
      // - slice 2 completed (1200-1800 completes) -> +10 XP
      // - lecture completed (item completed because all slices are done) -> +40 XP
      // - week completed (since Week 0 only has week-0-lecture as required and it is complete) -> +150 XP
      expect(res3.awardedTransactions.map((t) => t.sourceType)).toContain(
        'media_clean_stop',
      );
      expect(res3.awardedTransactions.map((t) => t.sourceType)).toContain(
        'media_unique_10_minutes',
      );
      expect(res3.awardedTransactions.map((t) => t.sourceType)).toContain(
        'content_slice_completed',
      );
      expect(res3.awardedTransactions.map((t) => t.sourceType)).toContain(
        'lecture_completed',
      );
      expect(res3.awardedTransactions.map((t) => t.sourceType)).toContain(
        'week_completed',
      );
    });
  });

  describe('Achievement engine repository integration', () => {
    it('persists a satisfied unlock once and never duplicates it on re-save', async () => {
      testDatabase = createTestDatabase('achievements-once');
      await initializeDatabase({
        db: testDatabase.db,
        now: createClock('2026-06-12T16:00:00.000Z'),
        seed: sampleCourseSeed,
      });

      // Completing the only required item of week-0 satisfies first-step and
      // scratch-initiate (week-0 required items all complete).
      const first = await upsertProgressAndAwardXp(
        {
          itemId: 'week-0-lecture',
          status: 'completed',
          confidence: 5,
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:10:00.000Z'),
        },
      );

      expect(
        first.unlockedAchievements.map((u) => u.achievementId).sort(),
      ).toEqual(['first-step', 'scratch-initiate']);
      expect(first.unlockedAchievements[0]).toMatchObject({
        id: expect.stringMatching(/^unlock-/),
        unlockedAt: '2026-06-12T16:10:00.000Z',
      });

      // Re-saving the identical state must not create new unlocks.
      const second = await upsertProgressAndAwardXp(
        {
          itemId: 'week-0-lecture',
          status: 'completed',
          confidence: 5,
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:20:00.000Z'),
        },
      );

      expect(second.unlockedAchievements).toHaveLength(0);

      const unlocks = await listAchievementUnlocks({ db: testDatabase.db });
      expect(unlocks.map((u) => u.achievementId).sort()).toEqual([
        'first-step',
        'scratch-initiate',
      ]);
    });

    it('writes zero xp_transactions when an achievement unlocks, and leaves source stores unmutated', async () => {
      testDatabase = createTestDatabase('achievements-zero-xp');
      await initializeDatabase({
        db: testDatabase.db,
        now: createClock('2026-06-12T16:00:00.000Z'),
        seed: sampleCourseSeed,
      });

      const beforeSnapshot = await getDatabaseSnapshot({ db: testDatabase.db });

      // A 20-minute debugging session earns no source XP (needs >= 25 min) but
      // satisfies bug-hunter. The unlock must add nothing to xp_transactions.
      const result = await addStudySessionAndAwardXp(
        {
          id: 'study-session-debug',
          unitId: 'week-0',
          itemId: 'week-0-lecture',
          startedAt: '2026-06-12T16:10:00.000Z',
          endedAt: '2026-06-12T16:30:00.000Z',
          durationMinutes: 20,
          mode: 'debugging',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:30:00.000Z'),
        },
      );

      expect(result.awardedTransactions).toHaveLength(0);
      expect(result.unlockedAchievements.map((u) => u.achievementId)).toEqual([
        'bug-hunter',
      ]);

      const afterSnapshot = await getDatabaseSnapshot({ db: testDatabase.db });

      // Achievement evaluation wrote no XP transactions at all.
      expect(afterSnapshot.xpTransactions).toEqual([]);
      // And it mutated no source-of-truth stores beyond the study session itself.
      expect(afterSnapshot.progressEntries).toEqual(
        beforeSnapshot.progressEntries,
      );
      expect(afterSnapshot.contentSlices).toEqual(beforeSnapshot.contentSlices);
      expect(afterSnapshot.mediaProgressEvents).toEqual(
        beforeSnapshot.mediaProgressEvents,
      );
      expect(afterSnapshot.courseItems).toEqual(beforeSnapshot.courseItems);
      expect(afterSnapshot.courseUnits).toEqual(beforeSnapshot.courseUnits);
      expect(afterSnapshot.achievementUnlocks).toHaveLength(1);
    });

    it('never creates unlocks from reads, then unlocks accumulated history on the next explicit save', async () => {
      testDatabase = createTestDatabase('achievements-history');
      await initializeDatabase({
        db: testDatabase.db,
        now: createClock('2026-06-12T16:00:00.000Z'),
        seed: sampleCourseSeed,
      });

      // Persist a completed item via the plain (non-XP, non-evaluating) writer.
      await upsertProgress(
        {
          itemId: 'week-0-lecture',
          status: 'completed',
          confidence: 5,
        },
        { db: testDatabase.db, now: createClock('2026-06-12T16:05:00.000Z') },
      );

      // Reads must not create any unlocks even though the criteria are met.
      const viewBefore = await getAchievementsView({
        policy: cs50Policy,
        db: testDatabase.db,
      });
      const unlocksBefore = await listAchievementUnlocks({
        db: testDatabase.db,
      });
      expect(viewBefore.unlockedCount).toBe(0);
      expect(unlocksBefore).toEqual([]);
      expect(viewBefore.totalCount).toBeGreaterThan(0);

      // An unrelated explicit save evaluates over ALL accumulated data, so the
      // previously-completed lecture now unlocks on this save (history-based).
      const save = await addStudySessionAndAwardXp(
        {
          id: 'study-session-coding',
          unitId: 'week-0',
          itemId: 'week-0-lecture',
          startedAt: '2026-06-12T16:10:00.000Z',
          endedAt: '2026-06-12T16:30:00.000Z',
          durationMinutes: 20,
          mode: 'coding',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-12T16:30:00.000Z'),
        },
      );

      expect(
        save.unlockedAchievements.map((u) => u.achievementId).sort(),
      ).toEqual(['first-step', 'scratch-initiate']);

      const viewAfter = await getAchievementsView({
        policy: cs50Policy,
        db: testDatabase.db,
      });
      expect(viewAfter.unlockedCount).toBe(2);
      expect(
        viewAfter.achievements.find((a) => a.id === 'first-step')?.unlocked,
      ).toBe(true);
      // Every code-only definition has xpReward 0 in Module 13.
      expect(viewAfter.achievements.every((a) => a.xpReward === 0)).toBe(true);

      // A second read still does not create or change anything.
      const viewRepeat = await getAchievementsView({
        policy: cs50Policy,
        db: testDatabase.db,
      });
      expect(viewRepeat.unlockedCount).toBe(2);
    });
  });
});

describe('backup, restore, and reset', () => {
  let testDatabase: TestDatabaseContext | null = null;
  let sourceDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
    await testDatabase?.cleanup();
    await sourceDatabase?.cleanup();
    testDatabase = null;
    sourceDatabase = null;
  });

  function dataStores(snapshot: DatabaseSnapshot) {
    const { backups: _backups, ...rest } = snapshot;
    void _backups;
    return rest;
  }

  async function seedRealActivity(context: TestDatabaseContext) {
    await initializeDatabase({
      db: context.db,
      now: createClock('2026-06-12T09:00:00.000Z'),
      seed: sampleCourseSeed,
    });
    await context.db.achievementDefinitions.put({
      id: 'first-step',
      category: 'course_progress',
      createdAt: '2026-06-12T09:01:00.000Z',
      description: 'Complete your first task of any kind.',
      ruleConfig: {},
      ruleType: 'first_item_completed',
      title: 'First Step',
      updatedAt: '2026-06-12T09:01:00.000Z',
      xpReward: 0,
    });

    await saveLearnerProfile(
      {
        displayName: 'Grace',
        avatarConfig: { face: 'oval', hair: 'curly', topColor: 'ocean' },
        targetStudyDays: ['monday', 'thursday'],
        targetMinutesPerWeek: 240,
        preferredTheme: 'dark',
        reducedMotion: false,
      },
      {
        db: context.db,
        completeOnboarding: true,
        now: createClock('2026-06-12T09:05:00.000Z'),
      },
    );

    await addStudySessionAndAwardXp(
      {
        id: 'session-qualifying',
        unitId: 'week-0',
        itemId: 'week-0-lecture',
        startedAt: '2026-06-12T10:00:00.000Z',
        endedAt: '2026-06-12T10:30:00.000Z',
        durationMinutes: 30,
        mode: 'coding',
        notes: '<script>alert(1)</script>',
      },
      {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: context.db,
        now: createClock('2026-06-12T10:30:00.000Z'),
      },
    );

    await logMediaProgress(
      {
        assetId: 'week-0-lecture-asset',
        endSecond: 600,
        energyAfter: 3,
        energyBefore: 4,
        notes: 'Representative backup media event.',
        sessionId: 'session-qualifying',
        startSecond: 0,
        stoppedBecause: 'interruption',
      },
      { db: context.db, now: createClock('2026-06-12T10:35:00.000Z') },
    );

    // Completing a required item unlocks the first-item achievement.
    await upsertProgressAndAwardXp(
      {
        itemId: 'final-project-plan',
        status: 'completed',
        confidence: 5,
      },
      {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: context.db,
        now: createClock('2026-06-12T11:00:00.000Z'),
      },
    );
  }

  it('records a single export event without mutating other stores', async () => {
    testDatabase = createTestDatabase('backup-export');
    await seedRealActivity(testDatabase);

    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const record = await recordBackupEvent(
      { type: 'export', fileName: 'progresspal-backup-2026-06-16.json' },
      { db: testDatabase.db, now: createClock('2026-06-16T11:00:00.000Z') },
    );
    const after = await getDatabaseSnapshot({ db: testDatabase.db });

    expect(record.type).toBe('export');
    expect(record.fileName).toBe('progresspal-backup-2026-06-16.json');
    expect(after.backups).toHaveLength(before.backups.length + 1);
    expect(dataStores(after)).toEqual(dataStores(before));
  });

  it('captures every persisted store in one read transaction', async () => {
    testDatabase = createTestDatabase('backup-transactional-snapshot');
    await seedRealActivity(testDatabase);
    await recordBackupEvent(
      { type: 'export', fileName: 'representative-export.json' },
      { db: testDatabase.db, now: createClock('2026-06-16T11:00:00.000Z') },
    );

    const observedTransactions = new Set<unknown>();
    const observeRead = <T>(value: T) => {
      observedTransactions.add(Dexie.currentTransaction);
      return value;
    };

    for (const table of testDatabase.db.tables) {
      table.hook('reading', observeRead);
    }

    const snapshot = await getDatabaseSnapshot({ db: testDatabase.db });

    for (const table of testDatabase.db.tables) {
      table.hook('reading').unsubscribe(observeRead);
    }

    expect(observedTransactions).not.toContain(null);
    expect(observedTransactions).toHaveLength(1);
    expect(Object.keys(snapshot)).toHaveLength(testDatabase.db.tables.length);
    expect(snapshot.appMeta).not.toBeNull();
    expect(snapshot.learnerProfile).not.toBeNull();

    for (const [key, rows] of Object.entries(snapshot)) {
      if (Array.isArray(rows)) {
        expect(
          rows,
          `${key} must have representative backup data`,
        ).not.toHaveLength(0);
      }
    }
  });

  it('restores a backup with replace-all semantics and faithful equality', async () => {
    sourceDatabase = createTestDatabase('backup-source');
    await seedRealActivity(sourceDatabase);
    await recordBackupEvent(
      { type: 'export', fileName: 'source-history.json' },
      { db: sourceDatabase.db, now: createClock('2026-06-16T11:00:00.000Z') },
    );
    const exported = await getDatabaseSnapshot({ db: sourceDatabase.db });
    const firstEnvelope = buildBackupEnvelope(exported, {
      appVersion: '1.3.0',
      exportedAt: '2026-06-16T11:00:00.000Z',
      schemaVersion: 2,
    });
    const serialized = serializeBackupEnvelope(firstEnvelope);
    const parsed = parseBackupFile(serialized.contents, {
      expectedSchemaVersion: 2,
    });

    // The synthetic current-format backup represents every persisted store.
    expect(exported.appMeta).not.toBeNull();
    expect(exported.learnerProfile).not.toBeNull();
    for (const [key, rows] of Object.entries(exported)) {
      if (Array.isArray(rows)) {
        expect(
          rows,
          `${key} must have representative backup data`,
        ).not.toHaveLength(0);
      }
    }

    testDatabase = createTestDatabase('backup-target');
    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-15T08:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    const restored = await restoreDatabaseFromBackup(parsed.data, {
      db: testDatabase.db,
      seed: sampleCourseSeed,
      fileName: 'progresspal-backup-2026-06-12.json',
      now: createClock('2026-06-16T12:00:00.000Z'),
    });

    // The 13 non-`backups` stores restore to faithful equality.
    expect(dataStores(restored)).toEqual(dataStores(exported));

    // `backups` equals the backup's records plus exactly one import record.
    const exportedBackupIds = new Set(
      exported.backups.map((entry) => entry.id),
    );
    const appendedRecords = restored.backups.filter(
      (entry) => !exportedBackupIds.has(entry.id),
    );
    expect(appendedRecords).toHaveLength(1);
    expect(appendedRecords[0]).toMatchObject({
      type: 'import',
      fileName: 'progresspal-backup-2026-06-12.json',
    });

    // Replace-all never duplicates XP, achievements, or sessions.
    expect(restored.xpTransactions).toHaveLength(
      exported.xpTransactions.length,
    );
    expect(restored.achievementUnlocks).toHaveLength(
      exported.achievementUnlocks.length,
    );
    expect(restored.studySessions).toHaveLength(exported.studySessions.length);

    // A reload reads the same restored state from disk.
    const reread = await getDatabaseSnapshot({ db: testDatabase.db });
    expect(dataStores(reread)).toEqual(dataStores(exported));

    const secondEnvelope = buildBackupEnvelope(reread, {
      appVersion: '1.3.0',
      exportedAt: '2026-06-16T12:05:00.000Z',
      schemaVersion: 2,
    });
    const reparsed = parseBackupFile(
      serializeBackupEnvelope(secondEnvelope).contents,
      { expectedSchemaVersion: 2 },
    );
    expect(dataStores(reparsed.data)).toEqual(dataStores(exported));
  });

  it('re-bootstraps nullable singleton rows during restore', async () => {
    sourceDatabase = createTestDatabase('backup-null-singleton-source');
    await seedRealActivity(sourceDatabase);
    const exported = await getDatabaseSnapshot({ db: sourceDatabase.db });

    testDatabase = createTestDatabase('backup-null-singleton-target');
    const restored = await restoreDatabaseFromBackup(
      { ...exported, appMeta: null, learnerProfile: null },
      {
        db: testDatabase.db,
        seed: sampleCourseSeed,
        fileName: 'progresspal-backup-null-singletons.json',
        now: createClock('2026-06-16T12:30:00.000Z'),
      },
    );

    expect(restored.appMeta?.id).toBe('app-meta');
    expect(restored.learnerProfile?.id).toBe('learner-profile');
    expect(restored.courseUnits).toEqual(exported.courseUnits);
    expect(restored.courseItems).toEqual(exported.courseItems);
  });

  it('resets all data and re-bootstraps fresh defaults', async () => {
    testDatabase = createTestDatabase('backup-reset');
    await seedRealActivity(testDatabase);
    await recordBackupEvent(
      { type: 'export', fileName: 'progresspal-backup-2026-06-16.json' },
      { db: testDatabase.db, now: createClock('2026-06-16T11:00:00.000Z') },
    );

    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    expect(before.studySessions.length).toBeGreaterThan(0);
    expect(before.backups.length).toBeGreaterThan(0);

    await resetAllData({
      db: testDatabase.db,
      seed: sampleCourseSeed,
      now: createClock('2026-06-16T13:00:00.000Z'),
    });

    const after = await getDatabaseSnapshot({ db: testDatabase.db });

    expect(after.studySessions).toEqual([]);
    expect(after.xpTransactions).toEqual([]);
    expect(after.achievementUnlocks).toEqual([]);
    expect(after.progressEntries).toEqual([]);
    expect(after.backups).toEqual([]);

    // Fresh default profile, not onboarded; seeded catalog re-bootstrapped.
    expect(after.learnerProfile?.displayName).toBe('Learner');
    expect(after.appMeta?.onboardingCompletedAt).toBeUndefined();
    expect(after.courseUnits.length).toBeGreaterThan(0);
    expect(after.courseItems.length).toBeGreaterThan(0);
  });

  it('rolls back reset exactly when seed initialization fails after clear', async () => {
    testDatabase = createTestDatabase('backup-reset-seed-failure');
    await seedRealActivity(testDatabase);
    const before = await getDatabaseSnapshot({ db: testDatabase.db });

    await expect(
      resetAllData({
        db: testDatabase.db,
        seed: { ...sampleCourseSeed, dataVersion: 0 } as never,
        now: createClock('2026-06-16T13:30:00.000Z'),
      }),
    ).rejects.toThrow();

    const after = await getDatabaseSnapshot({ db: testDatabase.db });
    expect(after).toEqual(before);
  });

  it('rolls back restore exactly when base initialization fails after writes', async () => {
    sourceDatabase = createTestDatabase('backup-init-failure-source');
    await seedRealActivity(sourceDatabase);
    const exported = await getDatabaseSnapshot({ db: sourceDatabase.db });

    testDatabase = createTestDatabase('backup-init-failure-target');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
      now: createClock('2026-06-15T08:00:00.000Z'),
    });
    const before = await getDatabaseSnapshot({ db: testDatabase.db });

    await expect(
      restoreDatabaseFromBackup(
        { ...exported, appMeta: null },
        {
          appVersion: '',
          db: testDatabase.db,
          seed: sampleCourseSeed,
          fileName: 'progresspal-backup-init-failure.json',
          now: createClock('2026-06-16T14:00:00.000Z'),
        },
      ),
    ).rejects.toThrow();

    const after = await getDatabaseSnapshot({ db: testDatabase.db });
    expect(after).toEqual(before);
  });

  it('rolls back restore exactly when import audit validation fails', async () => {
    sourceDatabase = createTestDatabase('backup-audit-failure-source');
    await seedRealActivity(sourceDatabase);
    const exported = await getDatabaseSnapshot({ db: sourceDatabase.db });

    testDatabase = createTestDatabase('backup-audit-failure-target');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
      now: createClock('2026-06-15T08:00:00.000Z'),
    });
    const before = await getDatabaseSnapshot({ db: testDatabase.db });

    await expect(
      restoreDatabaseFromBackup(exported, {
        db: testDatabase.db,
        seed: sampleCourseSeed,
        fileName: '',
        now: createClock('2026-06-16T14:30:00.000Z'),
      }),
    ).rejects.toThrow();

    const after = await getDatabaseSnapshot({ db: testDatabase.db });
    expect(after).toEqual(before);
  });

  it('rolls back restore when seed reconciliation breaks a restored relationship', async () => {
    sourceDatabase = createTestDatabase('backup-seed-relation-source');
    await seedRealActivity(sourceDatabase);
    const exported = await getDatabaseSnapshot({ db: sourceDatabase.db });

    testDatabase = createTestDatabase('backup-seed-relation-target');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
      now: createClock('2026-06-15T08:00:00.000Z'),
    });
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const movedItem = sampleCourseSeed.units[0]!.items[0]!;
    const movedSeed = {
      ...sampleCourseSeed,
      dataVersion: 2,
      units: sampleCourseSeed.units.map((unit) =>
        unit.id === 'week-0'
          ? {
              ...unit,
              items: unit.items.filter((item) => item.id !== movedItem.id),
            }
          : {
              ...unit,
              items: [...unit.items, { ...movedItem, order: 1 }],
            },
      ),
    };

    await expect(
      restoreDatabaseFromBackup(exported, {
        db: testDatabase.db,
        seed: movedSeed,
        fileName: 'progresspal-backup-moved-item.json',
        now: createClock('2026-06-16T14:45:00.000Z'),
      }),
    ).rejects.toThrow();

    const after = await getDatabaseSnapshot({ db: testDatabase.db });
    expect(after).toEqual(before);
  });

  it('writes nothing when a restore payload is invalid', async () => {
    testDatabase = createTestDatabase('backup-invalid');
    await seedRealActivity(testDatabase);

    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const invalid = {
      ...before,
      studySessions: [{ ...before.studySessions[0]!, mode: 'not-a-mode' }],
    } as unknown as DatabaseSnapshot;

    await expect(
      restoreDatabaseFromBackup(invalid, {
        db: testDatabase.db,
        seed: sampleCourseSeed,
      }),
    ).rejects.toThrow();

    const after = await getDatabaseSnapshot({ db: testDatabase.db });
    expect(after).toEqual(before);
  });

  it('writes nothing when a direct restore violates a relationship invariant', async () => {
    testDatabase = createTestDatabase('backup-invalid-relationship');
    await seedRealActivity(testDatabase);

    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const invalid: DatabaseSnapshot = {
      ...before,
      studySessions: [
        { ...before.studySessions[0]!, itemId: 'missing-course-item' },
      ],
    };

    await expect(
      restoreDatabaseFromBackup(invalid, {
        db: testDatabase.db,
        seed: sampleCourseSeed,
      }),
    ).rejects.toThrow();

    const after = await getDatabaseSnapshot({ db: testDatabase.db });
    expect(after).toEqual(before);
  });
});
