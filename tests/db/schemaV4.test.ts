import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import {
  currentDatabaseSchemaVersion,
  getDatabaseSnapshot,
  initializeDatabase,
} from '@/lib/db';
import { createProgressPalDatabase } from '@/lib/db/database';

import {
  createTestDatabase,
  defaultTestMigrationContext,
  sampleCourseSeed,
  type TestDatabaseContext,
} from './testDatabase';

/**
 * Epic E / E-SCHEMA-1 §2 and §6: the accepted schema-4 contract. Same
 * database name, Dexie `version(4)` (native 40), two new stores with exactly
 * the accepted indexes, and an additive upgrade whose only write is
 * `app_meta.schemaVersion = 4`.
 */

const t0 = '2026-10-03T08:00:00.000Z';

/**
 * Historical schema-3 store definitions, copied verbatim from the accepted
 * schema-3 `database.ts` so a real v3 database can be created as a fixture.
 */
const v1Stores = {
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
};
const v2Stores = {
  ...v1Stores,
  content_assets: '&id, itemId, [itemId+order], assetType, required',
  content_slices: '&id, assetId, itemId, [assetId+order], status, completedAt',
  media_progress_events:
    '&id, itemId, assetId, sliceId, sessionId, [assetId+createdAt]',
  resume_points: '&id, &assetId, itemId, nextSliceId',
};
const v3Stores = {
  ...v2Stores,
  app_meta: '&id, schemaVersion',
  catalogue_versions: '&courseId, programmeId',
  programme_enrolments: '&programmeId',
};

function openHistoricalV3(name: string) {
  const db = new Dexie(name);
  db.version(1).stores(v1Stores);
  db.version(2).stores(v2Stores);
  db.version(3).stores(v3Stores);
  return db;
}

async function nativeVersion(name: string) {
  return (
    (await indexedDB.databases()).find((info) => info.name === name)?.version ??
    null
  );
}

const databases: TestDatabaseContext[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

/** Builds a real schema-3 database with CS50 learner rows, then closes it. */
async function createSchemaThreeDevice(label: string) {
  const context = createTestDatabase(label);
  databases.push(context);

  const legacy = openHistoricalV3(context.name);
  await legacy.open();
  await legacy.table('app_meta').put({
    id: 'app-meta',
    createdAt: t0,
    updatedAt: t0,
    appVersion: '1.4.0',
    schemaVersion: 3,
    activeProgrammeId: 'cs50x',
  });
  await legacy.table('learner_profile').put({
    id: 'learner-profile',
    createdAt: t0,
    updatedAt: t0,
    displayName: 'Ada',
    avatarConfig: { face: 'round', hair: 'short', topColor: 'forest' },
    targetStudyDays: ['monday'],
    targetMinutesPerWeek: 120,
    preferredTheme: 'system',
    reducedMotion: false,
  });
  await legacy.table('programme_enrolments').put({
    programmeId: 'cs50x',
    enrolledAt: t0,
  });
  await legacy.table('catalogue_versions').put({
    courseId: 'cs50x-2026',
    programmeId: 'cs50x',
    dataVersion: 1,
    syncedAt: t0,
  });
  await legacy.table('course_units').put({
    id: 'week-0',
    createdAt: t0,
    updatedAt: t0,
    courseId: 'cs50x-2026',
    title: 'Week 0',
    order: 0,
    type: 'week',
    sourceYear: 2026,
    required: true,
  });
  await legacy.table('course_items').put({
    id: 'week-0-lecture',
    createdAt: t0,
    updatedAt: t0,
    unitId: 'week-0',
    type: 'lecture',
    title: 'Lecture',
    required: true,
    estimatedMinutes: 120,
    order: 0,
  });
  await legacy.table('progress_entries').put({
    id: 'progress-week-0-lecture',
    createdAt: t0,
    updatedAt: t0,
    itemId: 'week-0-lecture',
    status: 'completed',
    completedAt: t0,
    confidence: 3,
  });
  await legacy.table('xp_transactions').put({
    id: 'xp-1',
    createdAt: t0,
    updatedAt: t0,
    sourceType: 'lecture_completed',
    sourceId: 'week-0-lecture-completed',
    xp: 40,
    reason: 'Completed lecture: Lecture',
    awardedAt: t0,
  });
  legacy.close();

  return context;
}

async function rawTables(db: Dexie) {
  const result: Record<string, unknown[]> = {};

  for (const table of db.tables) {
    result[table.name] = await table.toArray();
  }

  return result;
}

describe('E-SCHEMA-1 §2: the accepted schema-4 store contract', () => {
  it('is schema 4 with exactly four declared Dexie versions', () => {
    const db = createProgressPalDatabase(defaultTestMigrationContext);

    expect(currentDatabaseSchemaVersion).toBe(4);
    expect(db.verno).toBe(4);
    expect(db.name).toBe('progresspal-cs50-edition');
  });

  it('adds learner_evidence and lesson_positions with exactly the accepted indexes', () => {
    const db = createProgressPalDatabase(defaultTestMigrationContext);
    const evidence = db.tables.find(
      (table) => table.name === 'learner_evidence',
    );
    const positions = db.tables.find(
      (table) => table.name === 'lesson_positions',
    );

    expect(evidence).toBeDefined();
    expect(positions).toBeDefined();
    expect(evidence!.schema.primKey.name).toBe('id');
    expect(evidence!.schema.primKey.unique).toBe(true);
    expect(
      evidence!.schema.indexes.map((index) => [index.name, index.unique]),
    ).toEqual([
      ['subjectId', false],
      ['[subjectId+attemptNumber]', true],
      ['attemptId', true],
    ]);
    expect(positions!.schema.primKey.name).toBe('id');
    expect(positions!.schema.primKey.unique).toBe(true);
    expect(
      positions!.schema.indexes.map((index) => [index.name, index.unique]),
    ).toEqual([['itemId', true]]);
  });

  it('adds exactly the programme-ownership index to xp_transactions (E-SCHEMA-1A)', () => {
    const db = createProgressPalDatabase(defaultTestMigrationContext);
    const xp = db.tables.find((table) => table.name === 'xp_transactions');

    expect(
      xp!.schema.indexes.map((index) => [index.name, index.unique]),
    ).toEqual([
      ['sourceType', false],
      ['sourceId', false],
      ['awardedAt', false],
      ['programmeId', false],
    ]);
  });

  it('keeps every schema-3 store name', () => {
    const db = createProgressPalDatabase(defaultTestMigrationContext);
    const names = db.tables.map((table) => table.name).sort();

    expect(names).toEqual(
      [...Object.keys(v3Stores), 'learner_evidence', 'lesson_positions'].sort(),
    );
  });
});

describe('E-SCHEMA-1 §2: storage-level uniqueness, proven on the real Dexie', () => {
  it('rejects a duplicate attempt number for one subject', async () => {
    const context = createTestDatabase('v4-compound-unique');
    databases.push(context);
    await context.db.open();
    const table = context.db.table('learner_evidence');

    await table.add({ id: 'a1', subjectId: 's', attemptNumber: 1 });
    await expect(
      table.add({ id: 'a2', subjectId: 's', attemptNumber: 1 }),
    ).rejects.toMatchObject({ name: 'ConstraintError' });
    await expect(
      table.add({ id: 'a3', subjectId: 'other', attemptNumber: 1 }),
    ).resolves.toBe('a3');
  });

  it('enforces at most one row per attemptId while rows without attemptId coexist', async () => {
    const context = createTestDatabase('v4-sparse-unique');
    databases.push(context);
    await context.db.open();
    const table = context.db.table('learner_evidence');

    for (let index = 0; index < 5; index += 1) {
      await table.add({ id: `support-${index}`, subjectId: 's' });
    }
    await table.add({ id: 'r1', subjectId: 's', attemptId: 'a1' });
    await expect(
      table.add({ id: 'r2', subjectId: 's', attemptId: 'a1' }),
    ).rejects.toMatchObject({ name: 'ConstraintError' });
    expect(await table.count()).toBe(6);
  });

  it('enforces one lesson position per item', async () => {
    const context = createTestDatabase('v4-position-unique');
    databases.push(context);
    await context.db.open();
    const table = context.db.table('lesson_positions');

    await table.add({ id: 'p1', itemId: 'lesson-a' });
    await expect(
      table.add({ id: 'p2', itemId: 'lesson-a' }),
    ).rejects.toMatchObject({ name: 'ConstraintError' });
  });
});

describe('E-SCHEMA-1 §6 and E-SCHEMA-1A: the live schema 3 → 4 upgrade', () => {
  it('leaves every schema-3 row byte-identical except app_meta.schemaVersion and XP ownership', async () => {
    const context = await createSchemaThreeDevice('v3-to-v4-additive');
    const before = await (async () => {
      const legacy = openHistoricalV3(context.name);
      await legacy.open();
      const rows = await rawTables(legacy);
      legacy.close();
      return rows;
    })();

    await context.db.open();
    const after = await rawTables(context.db);

    expect(await nativeVersion(context.name)).toBe(40);
    expect(after.learner_evidence).toEqual([]);
    expect(after.lesson_positions).toEqual([]);

    for (const [name, rows] of Object.entries(before)) {
      if (name === 'app_meta') {
        expect(after.app_meta).toEqual([
          { ...(rows[0] as object), schemaVersion: 4 },
        ]);
      } else if (name === 'xp_transactions') {
        // E-SCHEMA-1A: historical XP belongs to the accepted CS50 identity;
        // every other field, including the stored ID, is unchanged.
        expect(rows.length).toBeGreaterThan(0);
        expect(after.xp_transactions).toEqual(
          rows.map((row) => ({ ...(row as object), programmeId: 'cs50x' })),
        );
      } else {
        expect(after[name], name).toEqual(rows);
      }
    }
  });

  it('initializes an upgraded CS50 device without writing XP, achievements or enrolments', async () => {
    const context = await createSchemaThreeDevice('v3-to-v4-initialize');

    await initializeDatabase({
      db: context.db,
      appVersion: '1.4.0',
      now: () => '2026-10-03T09:00:00.000Z',
    });
    const snapshot = await getDatabaseSnapshot({ db: context.db });

    expect(snapshot.appMeta).toMatchObject({
      schemaVersion: 4,
      activeProgrammeId: 'cs50x',
    });
    expect(snapshot.xpTransactions).toEqual([
      expect.objectContaining({ id: 'xp-1', programmeId: 'cs50x', xp: 40 }),
    ]);
    expect(snapshot.achievementUnlocks).toEqual([]);
    expect(snapshot.programmeEnrolments).toEqual([
      { programmeId: 'cs50x', enrolledAt: t0 },
    ]);
    expect(snapshot.learnerEvidence).toEqual([]);
    expect(snapshot.lessonPositions).toEqual([]);
  });

  it('aborts atomically and leaves schema 3 intact when the upgrade write fails', async () => {
    const context = await createSchemaThreeDevice('v3-to-v4-abort');
    const failing = createProgressPalDatabase(
      defaultTestMigrationContext,
      context.name,
    );
    failing.table('app_meta').hook('updating', () => {
      throw new Error('Forced schema-4 upgrade failure');
    });

    await expect(failing.open()).rejects.toThrow();
    failing.close();

    expect(await nativeVersion(context.name)).toBe(30);
    const legacy = openHistoricalV3(context.name);
    await legacy.open();
    expect((await legacy.table('app_meta').get('app-meta')).schemaVersion).toBe(
      3,
    );
    expect(legacy.tables.map((table) => table.name)).not.toContain(
      'learner_evidence',
    );
    legacy.close();
  });

  it('aborts and leaves schema 3 intact when a schema-3 XP row already names another programme', async () => {
    const context = await createSchemaThreeDevice('v3-to-v4-foreign-xp');
    const legacy = openHistoricalV3(context.name);
    await legacy.open();
    await legacy.table('xp_transactions').put({
      id: 'xp-foreign',
      createdAt: t0,
      updatedAt: t0,
      sourceType: 'lecture_completed',
      sourceId: 'week-0-lecture-completed-2',
      xp: 40,
      reason: 'Completed lecture: Lecture',
      awardedAt: t0,
      programmeId: 'programvareutvikling',
    });
    legacy.close();

    await expect(context.db.open()).rejects.toThrow();
    context.db.close();
    expect(await nativeVersion(context.name)).toBe(30);
  });

  it('upgrades a fresh CS50 seed initialization straight to schema 4', async () => {
    const context = createTestDatabase('v4-fresh');
    databases.push(context);

    const result = await initializeDatabase({
      db: context.db,
      seed: sampleCourseSeed,
      now: () => t0,
    });

    expect(result.appMeta.schemaVersion).toBe(4);
    expect(result.appMeta.activeProgrammeId).toBe('cs50x');
    expect(await nativeVersion(context.name)).toBe(40);
  });
});
