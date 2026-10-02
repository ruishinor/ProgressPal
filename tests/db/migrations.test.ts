import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import {
  currentDatabaseSchemaVersion,
  getDatabaseSnapshot,
  initializeDatabase,
} from '@/lib/db';

import {
  createClock,
  createTestDatabase,
  type TestDatabaseContext,
} from './testDatabase';

const legacyVersionOneStoreDefinitions = {
  app_meta: '&id, schemaVersion, seedVersion',
  learner_profile: '&id, updatedAt, preferredTheme',
  course_units: '&id, courseId, [courseId+order], type, required',
  course_items: '&id, unitId, [unitId+order], type, required',
  progress_entries: '&id, &itemId, status, completedAt',
  study_sessions: '&id, unitId, itemId, mode, startedAt, endedAt',
  xp_transactions: '&id, sourceType, sourceId, awardedAt',
  achievement_definitions: '&id, category, ruleType',
  achievement_unlocks: '&id, &achievementId, unlockedAt, triggerSourceId',
  backups: '&id, type, createdAt',
} as const;

async function createLegacyVersionOneFixture(databaseName: string) {
  const legacyDatabase = new Dexie(databaseName);

  legacyDatabase.version(1).stores(legacyVersionOneStoreDefinitions);
  await legacyDatabase.open();
  await legacyDatabase.table('app_meta').add({
    id: 'app-meta',
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    appVersion: '0.0.1-test',
    schemaVersion: 1,
    seedVersion: 0,
  });
  await legacyDatabase.table('learner_profile').add({
    id: 'learner-profile',
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    displayName: 'Legacy Learner',
    avatarConfig: {
      face: 'round',
    },
    targetStudyDays: ['monday', 'wednesday'],
    targetMinutesPerWeek: 240,
    preferredTheme: 'system',
    reducedMotion: false,
  });
  await legacyDatabase.table('course_units').add({
    id: 'week-0',
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    courseId: 'cs50x-2026',
    title: 'Week 0',
    order: 0,
    type: 'week',
    sourceYear: 2026,
    required: true,
  });
  await legacyDatabase.table('course_items').add({
    id: 'week-0-lecture',
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    unitId: 'week-0',
    type: 'lecture',
    title: 'Lecture',
    required: true,
    estimatedMinutes: 120,
    order: 0,
  });
  await legacyDatabase.table('progress_entries').add({
    id: 'progress-week-0-lecture',
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    itemId: 'week-0-lecture',
    status: 'started',
    startedAt: '2026-06-01T08:05:00.000Z',
    completedAt: undefined,
    confidence: 0.25,
    notes: undefined,
    evidenceType: undefined,
    evidenceText: undefined,
  });
  await legacyDatabase.table('study_sessions').add({
    id: 'session-1',
    createdAt: '2026-06-01T08:00:00.000Z',
    updatedAt: '2026-06-01T08:00:00.000Z',
    unitId: 'week-0',
    itemId: 'week-0-lecture',
    startedAt: '2026-06-01T08:10:00.000Z',
    endedAt: '2026-06-01T08:30:00.000Z',
    durationMinutes: 20,
    mode: 'watching',
    notes: 'Legacy session without blockers.',
  });

  legacyDatabase.close();
}

describe('database migrations', () => {
  let testDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
    await testDatabase?.cleanup();
    testDatabase = null;
  });

  it('migrates version-one data to the current schema without losing records', async () => {
    testDatabase = createTestDatabase('migration');

    await createLegacyVersionOneFixture(testDatabase.name);

    const initialization = await initializeDatabase({
      db: testDatabase.db,
      appVersion: '0.3.0-test',
      now: createClock('2026-06-11T15:00:00.000Z'),
    });
    const migratedRawStudySession =
      await testDatabase.db.studySessions.get('session-1');
    const snapshot = await getDatabaseSnapshot({ db: testDatabase.db });

    expect(initialization.createdAppMeta).toBe(false);
    expect(initialization.createdLearnerProfile).toBe(false);
    expect(snapshot.appMeta).toEqual({
      id: 'app-meta',
      createdAt: '2026-06-01T08:00:00.000Z',
      updatedAt: '2026-06-11T15:00:00.000Z',
      appVersion: '0.3.0-test',
      schemaVersion: currentDatabaseSchemaVersion,
      activeProgrammeId: 'cs50x',
    });
    expect(snapshot.courseUnits).toHaveLength(1);
    expect(snapshot.courseItems).toHaveLength(1);
    expect(snapshot.progressEntries).toHaveLength(1);
    expect(snapshot.studySessions).toEqual([
      {
        id: 'session-1',
        createdAt: '2026-06-01T08:00:00.000Z',
        updatedAt: '2026-06-01T08:00:00.000Z',
        unitId: 'week-0',
        itemId: 'week-0-lecture',
        startedAt: '2026-06-01T08:10:00.000Z',
        endedAt: '2026-06-01T08:30:00.000Z',
        durationMinutes: 20,
        mode: 'watching',
        notes: 'Legacy session without blockers.',
        blockers: [],
      },
    ]);
    expect(migratedRawStudySession).toMatchObject({
      blockers: [],
    });
    expect(testDatabase.db.tables.map((table) => table.name)).toEqual(
      expect.arrayContaining([
        'content_assets',
        'content_slices',
        'media_progress_events',
        'resume_points',
        // Epic E (accepted E-SCHEMA-1): the two schema-4 stores.
        'learner_evidence',
        'lesson_positions',
      ]),
    );
  });
});
