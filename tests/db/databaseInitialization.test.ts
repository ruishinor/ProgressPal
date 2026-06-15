import { afterEach, describe, expect, it } from 'vitest';

import {
  currentDatabaseSchemaVersion,
  getAppMeta,
  getProfile,
  initializeDatabase,
  singletonIds,
} from '@/lib/db';
import { bundledCourseSeed } from '@/seed';

import {
  createClock,
  createTestDatabase,
  type TestDatabaseContext,
} from './testDatabase';

describe('database initialization', () => {
  let testDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
    await testDatabase?.cleanup();
    testDatabase = null;
  });

  it('creates app metadata and a default learner profile in a fresh database', async () => {
    testDatabase = createTestDatabase('initialize-fresh');

    const initialization = await initializeDatabase({
      db: testDatabase.db,
      appVersion: '0.1.0-test',
      now: createClock('2026-06-11T10:00:00.000Z'),
    });

    const appMeta = await getAppMeta({ db: testDatabase.db });
    const learnerProfile = await getProfile({ db: testDatabase.db });

    expect(initialization.createdAppMeta).toBe(true);
    expect(initialization.createdLearnerProfile).toBe(true);
    expect(initialization.seedSync).toBeNull();
    expect(appMeta).toEqual({
      id: singletonIds.appMeta,
      createdAt: '2026-06-11T10:00:00.000Z',
      updatedAt: '2026-06-11T10:00:00.000Z',
      appVersion: '0.1.0-test',
      schemaVersion: currentDatabaseSchemaVersion,
      seedVersion: 0,
    });
    expect(learnerProfile).toEqual({
      id: singletonIds.learnerProfile,
      createdAt: '2026-06-11T10:00:00.000Z',
      updatedAt: '2026-06-11T10:00:00.000Z',
      displayName: 'Learner',
      avatarConfig: {
        face: 'round',
        hair: 'short',
        topColor: 'forest',
      },
      targetStudyDays: ['monday', 'wednesday', 'friday'],
      targetMinutesPerWeek: 300,
      preferredTheme: 'system',
      reducedMotion: false,
    });
  });

  it('repairs an interrupted initialization without duplicating singleton records', async () => {
    testDatabase = createTestDatabase('initialize-repair');

    await testDatabase.db.open();
    await testDatabase.db.appMeta.add({
      id: singletonIds.appMeta,
      createdAt: '2026-06-11T09:00:00.000Z',
      updatedAt: '2026-06-11T09:00:00.000Z',
      appVersion: '0.0.1-test',
      schemaVersion: 1,
      seedVersion: 0,
    });

    const repairedInitialization = await initializeDatabase({
      db: testDatabase.db,
      appVersion: '0.2.0-test',
      now: createClock('2026-06-11T09:30:00.000Z', '2026-06-11T09:45:00.000Z'),
    });
    const repeatedInitialization = await initializeDatabase({
      db: testDatabase.db,
      appVersion: '0.2.0-test',
      now: createClock('2026-06-11T10:00:00.000Z'),
    });
    const [appMetaCount, learnerProfileCount, appMeta, learnerProfile] =
      await Promise.all([
        testDatabase.db.appMeta.count(),
        testDatabase.db.learnerProfile.count(),
        getAppMeta({ db: testDatabase.db }),
        getProfile({ db: testDatabase.db }),
      ]);

    expect(repairedInitialization.createdAppMeta).toBe(false);
    expect(repairedInitialization.createdLearnerProfile).toBe(true);
    expect(repeatedInitialization.createdAppMeta).toBe(false);
    expect(repeatedInitialization.createdLearnerProfile).toBe(false);
    expect(appMetaCount).toBe(1);
    expect(learnerProfileCount).toBe(1);
    expect(appMeta).toEqual({
      id: singletonIds.appMeta,
      createdAt: '2026-06-11T09:00:00.000Z',
      updatedAt: '2026-06-11T09:30:00.000Z',
      appVersion: '0.2.0-test',
      schemaVersion: currentDatabaseSchemaVersion,
      seedVersion: 0,
    });
    expect(learnerProfile?.createdAt).toBe('2026-06-11T09:30:00.000Z');
  });

  it('loads the bundled course seed during initialization when provided', async () => {
    testDatabase = createTestDatabase('initialize-with-seed');

    const initialization = await initializeDatabase({
      db: testDatabase.db,
      appVersion: '0.3.0-test',
      now: createClock('2026-06-11T12:00:00.000Z'),
      seed: bundledCourseSeed,
    });

    const [appMetaCount, learnerProfileCount, unitCount, itemCount, appMeta] =
      await Promise.all([
        testDatabase.db.appMeta.count(),
        testDatabase.db.learnerProfile.count(),
        testDatabase.db.courseUnits.count(),
        testDatabase.db.courseItems.count(),
        getAppMeta({ db: testDatabase.db }),
      ]);

    expect(initialization.createdAppMeta).toBe(true);
    expect(initialization.createdLearnerProfile).toBe(true);
    expect(initialization.seedSync).toEqual({
      unitCount: 14,
      unitsAdded: 14,
      unitsUpdated: 0,
      itemCount: 68,
      itemsAdded: 68,
      itemsUpdated: 0,
      seedVersion: bundledCourseSeed.dataVersion,
    });
    expect(appMetaCount).toBe(1);
    expect(learnerProfileCount).toBe(1);
    expect(unitCount).toBe(14);
    expect(itemCount).toBe(68);
    expect(appMeta?.seedVersion).toBe(bundledCourseSeed.dataVersion);
  });
});
