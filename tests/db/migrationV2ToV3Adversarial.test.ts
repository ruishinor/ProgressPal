import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { ensureCourseCatalogFromSeed, initializeDatabase } from '@/lib/db';
import { createProgressPalDatabase, deleteDatabaseByName } from '@/lib/db/database';

import {
  createTestDatabase,
  defaultTestMigrationContext,
  sampleCourseSeed,
  type TestDatabaseContext,
} from './testDatabase';

/**
 * Epic C / C6 — Dexie-level RED evidence: an aborted v2 → v3 upgrade leaves
 * the v2 database completely intact (MR-12), and catalogue sync rejects an
 * unauthorized catalogue, a lower data version, and a cross-catalogue ID
 * collision (P2) without writing anything.
 */

const legacyVersionTwoStoreDefinitions = {
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
  content_assets: '&id, itemId, [itemId+order], assetType, required',
  content_slices: '&id, assetId, itemId, [assetId+order], status, completedAt',
  media_progress_events:
    '&id, itemId, assetId, sliceId, sessionId, [assetId+createdAt]',
  resume_points: '&id, &assetId, itemId, nextSliceId',
} as const;

const legacyTimestamp = '2026-06-01T08:00:00.000Z';

async function createLegacyVersionTwoFixture(
  databaseName: string,
  options: { courseId?: string; orphanCourseItem?: boolean } = {},
) {
  const legacyDatabase = new Dexie(databaseName);

  legacyDatabase.version(2).stores(legacyVersionTwoStoreDefinitions);
  await legacyDatabase.open();
  await legacyDatabase.table('app_meta').add({
    id: 'app-meta',
    createdAt: legacyTimestamp,
    updatedAt: legacyTimestamp,
    appVersion: '1.3.0',
    schemaVersion: 2,
    seedVersion: 1,
  });
  await legacyDatabase.table('course_units').add({
    id: 'week-0',
    createdAt: legacyTimestamp,
    updatedAt: legacyTimestamp,
    courseId: options.courseId ?? 'cs50x-2026',
    title: 'Week 0',
    order: 0,
    type: 'week',
    sourceYear: 2026,
    required: true,
  });
  await legacyDatabase.table('course_items').add({
    id: 'week-0-lecture',
    createdAt: legacyTimestamp,
    updatedAt: legacyTimestamp,
    unitId: options.orphanCourseItem ? 'missing-unit' : 'week-0',
    type: 'lecture',
    title: 'Lecture',
    required: true,
    estimatedMinutes: 120,
    order: 0,
  });

  legacyDatabase.close();
}

async function getNativeDatabaseVersion(databaseName: string) {
  const databaseInfo = (await indexedDB.databases()).find(
    (candidate) => candidate.name === databaseName,
  );

  return databaseInfo?.version ?? null;
}

describe('v2 -> v3 upgrade adversarial evidence (leaves v2 intact)', () => {
  const openedDatabases: string[] = [];

  afterEach(async () => {
    await Promise.all(openedDatabases.splice(0).map(deleteDatabaseByName));
  });

  it('rejects an unauthorized catalogue during the Dexie upgrade, leaving v2 intact', async () => {
    const name = 'progresspal-test-upgrade-unauthorized';
    openedDatabases.push(name);
    await createLegacyVersionTwoFixture(name, {
      courseId: 'an-unauthorized-catalogue',
    });

    const upgradingDatabase = createProgressPalDatabase(
      defaultTestMigrationContext,
      name,
    );

    await expect(upgradingDatabase.open()).rejects.toThrow();
    upgradingDatabase.close();

    expect(await getNativeDatabaseVersion(name)).toBe(20);

    const rawCheck = new Dexie(name);
    rawCheck.version(2).stores(legacyVersionTwoStoreDefinitions);
    await rawCheck.open();
    const unit = await rawCheck.table('course_units').get('week-0');
    expect(unit).toMatchObject({ courseId: 'an-unauthorized-catalogue' });
    rawCheck.close();
  });

  it('rejects an orphaned catalogue-derived row during the Dexie upgrade, leaving v2 intact', async () => {
    const name = 'progresspal-test-upgrade-orphan';
    openedDatabases.push(name);
    await createLegacyVersionTwoFixture(name, { orphanCourseItem: true });

    const upgradingDatabase = createProgressPalDatabase(
      defaultTestMigrationContext,
      name,
    );

    await expect(upgradingDatabase.open()).rejects.toThrow();
    upgradingDatabase.close();

    expect(await getNativeDatabaseVersion(name)).toBe(20);
  });
});

describe('catalogue sync adversarial evidence', () => {
  let testDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
    await testDatabase?.cleanup();
    testDatabase = null;
  });

  it('rejects a lower catalogue data version, writing nothing', async () => {
    testDatabase = createTestDatabase('sync-lower-version');
    await initializeDatabase({
      db: testDatabase.db,
      seed: { ...sampleCourseSeed, dataVersion: sampleCourseSeed.dataVersion + 1 },
    });
    const before = await testDatabase.db.catalogueVersions.get(
      sampleCourseSeed.courseId,
    );

    await expect(
      ensureCourseCatalogFromSeed(sampleCourseSeed, { db: testDatabase.db }),
    ).rejects.toThrow(/lower than the synced version/i);

    const after = await testDatabase.db.catalogueVersions.get(
      sampleCourseSeed.courseId,
    );
    expect(after).toEqual(before);
  });

  it('rejects (P2) a unit ID already owned by a different catalogue, never rewriting it', async () => {
    testDatabase = createTestDatabase('sync-p2-unit-collision', {
      programmeId: 'cs50x',
      authorizedCatalogues: [
        { courseId: sampleCourseSeed.courseId, programmeId: 'cs50x' },
        { courseId: 'a-second-catalogue', programmeId: 'cs50x' },
      ],
    });
    await initializeDatabase({ db: testDatabase.db, seed: sampleCourseSeed });

    const collidingSeed = {
      ...sampleCourseSeed,
      courseId: 'a-second-catalogue',
      dataVersion: 1,
    };

    await expect(
      ensureCourseCatalogFromSeed(collidingSeed, { db: testDatabase.db }),
    ).rejects.toThrow(/already owned by catalogue/i);

    const unit = await testDatabase.db.courseUnits.get(
      sampleCourseSeed.units[0]!.id,
    );
    expect(unit).toMatchObject({ courseId: sampleCourseSeed.courseId });
  });
});
