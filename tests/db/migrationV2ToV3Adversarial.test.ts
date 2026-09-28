import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseBackupFile } from '@/lib/backup';
import { ensureCourseCatalogFromSeed, initializeDatabase } from '@/lib/db';
import {
  createProgressPalDatabase,
  deleteDatabaseByName,
} from '@/lib/db/database';

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

/**
 * Epic C6-R, RD3: a schema-valid legacy v2 snapshot with two real,
 * independently authorized units, and a study session whose `unitId` names
 * one unit while its `itemId` actually belongs to the other. Both the unit
 * and the item genuinely exist (unlike `orphanCourseItem` above), so this
 * proves the cross-field check specifically, not the already-covered
 * "missing row" case.
 */
async function createLegacyVersionTwoFixtureWithCrossUnitSession(
  databaseName: string,
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
  await legacyDatabase.table('course_units').bulkAdd([
    {
      id: 'unit-a',
      createdAt: legacyTimestamp,
      updatedAt: legacyTimestamp,
      courseId: 'cs50x-2026',
      title: 'Unit A',
      order: 0,
      type: 'week',
      sourceYear: 2026,
      required: true,
    },
    {
      id: 'unit-b',
      createdAt: legacyTimestamp,
      updatedAt: legacyTimestamp,
      courseId: 'cs50x-2026',
      title: 'Unit B',
      order: 1,
      type: 'week',
      sourceYear: 2026,
      required: true,
    },
  ]);
  await legacyDatabase.table('course_items').add({
    id: 'item-in-unit-b',
    createdAt: legacyTimestamp,
    updatedAt: legacyTimestamp,
    unitId: 'unit-b',
    type: 'lecture',
    title: 'Lecture',
    required: true,
    estimatedMinutes: 120,
    order: 0,
  });
  await legacyDatabase.table('study_sessions').add({
    id: 'session-cross-unit',
    createdAt: legacyTimestamp,
    updatedAt: legacyTimestamp,
    // Both unit-a and item-in-unit-b exist; the item's real unit is unit-b,
    // not the unit-a this session claims.
    unitId: 'unit-a',
    itemId: 'item-in-unit-b',
    startedAt: legacyTimestamp,
    endedAt: legacyTimestamp,
    durationMinutes: 20,
    mode: 'watching',
    blockers: [],
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

describe('RD3: study-session unit/item cross-check (Epic C6-R)', () => {
  const openedDatabases: string[] = [];

  afterEach(async () => {
    await Promise.all(openedDatabases.splice(0).map(deleteDatabaseByName));
  });

  /**
   * Owner-authorized continuation (RD3): `assertFullRelationalValidity`
   * checked only that `session.unitId` and `session.itemId` each resolve to
   * *some* existing row, never that the item's own `unitId` equals
   * `session.unitId`. This constructs a schema-valid legacy v2 database
   * where both referenced rows genuinely exist (so it is not the
   * already-covered "orphaned row" case), proving the real Dexie upgrade
   * rejects the cross-field contradiction and leaves v2 completely intact.
   */
  it('rejects a study session naming the wrong unit for its item during the Dexie upgrade, leaving v2 intact', async () => {
    const name = 'progresspal-test-upgrade-rd3-cross-unit-session';
    openedDatabases.push(name);
    await createLegacyVersionTwoFixtureWithCrossUnitSession(name);

    const upgradingDatabase = createProgressPalDatabase(
      defaultTestMigrationContext,
      name,
    );

    await expect(upgradingDatabase.open()).rejects.toThrow(
      /does not use the item's unit/i,
    );
    upgradingDatabase.close();

    expect(await getNativeDatabaseVersion(name)).toBe(20);

    const rawCheck = new Dexie(name);
    rawCheck.version(2).stores(legacyVersionTwoStoreDefinitions);
    await rawCheck.open();
    expect(rawCheck.tables.map((table) => table.name)).not.toContain(
      'catalogue_versions',
    );
    const session = await rawCheck
      .table('study_sessions')
      .get('session-cross-unit');
    expect(session).toMatchObject({
      unitId: 'unit-a',
      itemId: 'item-in-unit-b',
    });
    rawCheck.close();
  });

  /**
   * RD3-C, path-consistency evidence: the identical malformed legacy state
   * as a schema-2 backup, through the real forward-conversion/validation
   * path. `assertBackupDataInvariants` already checked
   * `item.unitId === session.unitId` before this repair (that stricter
   * check is what the owner-review finding contrasted against the weaker
   * native-upgrade check), so this proves the two real migration paths now
   * agree on this malformed input, not only that the backup path alone
   * rejects it.
   */
  it('the equivalent schema-2 backup is also rejected by the real forward-conversion path', () => {
    const crossUnitSchemaTwoEnvelope = {
      format: 'progresspal-backup',
      formatVersion: 1,
      appVersion: '1.3.0',
      schemaVersion: 2,
      exportedAt: legacyTimestamp,
      data: {
        appMeta: {
          id: 'app-meta',
          createdAt: legacyTimestamp,
          updatedAt: legacyTimestamp,
          appVersion: '1.3.0',
          schemaVersion: 2,
          seedVersion: 1,
        },
        learnerProfile: null,
        courseUnits: [
          {
            id: 'unit-a',
            createdAt: legacyTimestamp,
            updatedAt: legacyTimestamp,
            courseId: 'cs50x-2026',
            title: 'Unit A',
            order: 0,
            type: 'week',
            sourceYear: 2026,
            required: true,
          },
          {
            id: 'unit-b',
            createdAt: legacyTimestamp,
            updatedAt: legacyTimestamp,
            courseId: 'cs50x-2026',
            title: 'Unit B',
            order: 1,
            type: 'week',
            sourceYear: 2026,
            required: true,
          },
        ],
        courseItems: [
          {
            id: 'item-in-unit-b',
            createdAt: legacyTimestamp,
            updatedAt: legacyTimestamp,
            unitId: 'unit-b',
            type: 'lecture',
            title: 'Lecture',
            required: true,
            estimatedMinutes: 120,
            order: 0,
          },
        ],
        progressEntries: [],
        contentAssets: [],
        contentSlices: [],
        mediaProgressEvents: [],
        resumePoints: [],
        studySessions: [
          {
            id: 'session-cross-unit',
            createdAt: legacyTimestamp,
            updatedAt: legacyTimestamp,
            unitId: 'unit-a',
            itemId: 'item-in-unit-b',
            startedAt: legacyTimestamp,
            endedAt: legacyTimestamp,
            durationMinutes: 20,
            mode: 'watching',
            blockers: [],
          },
        ],
        xpTransactions: [],
        achievementDefinitions: [],
        achievementUnlocks: [],
        backups: [],
      },
    };

    // The repaired shared migrateV2ToV3 (used by both real migration paths)
    // now catches this before assertBackupDataInvariants ever runs, so the
    // backup path surfaces MigrationAbortedError here rather than its usual
    // BackupValidationError wrapper - still rejected, just one layer higher
    // than before the repair. What this test proves is unchanged: the two
    // real migration paths agree on this malformed input.
    expect(() =>
      parseBackupFile(JSON.stringify(crossUnitSchemaTwoEnvelope), {
        expectedSchemaVersion: 3,
        migrationContext: defaultTestMigrationContext,
      }),
    ).toThrow(/does not use the item's unit/i);
  });
});

describe('mid-write upgrade failure (Epic C6-R, E1)', () => {
  const openedDatabases: string[] = [];

  afterEach(async () => {
    await Promise.all(openedDatabases.splice(0).map(deleteDatabaseByName));
  });

  /**
   * The rejected C6 candidate only proved a pre-write validation abort (the
   * two tests above: `migrateV2ToV3` itself throws before any write is
   * attempted). That is not evidence that a failure *after* migration writes
   * begin still rolls back completely. This injects a failure into the last
   * of the three concurrent migration writes
   * (`app_meta.put`, `catalogue_versions.bulkAdd`, `programme_enrolments.bulkAdd`
   * in `migrateVersionTwoToVersionThree`), after the other two have already
   * been issued against the same version-change transaction, and proves the
   * whole upgrade (including the schema change itself) still rolls back.
   */
  it('rejects the upgrade when a write fails after migration writes have begun, leaving v2 intact', async () => {
    const name = 'progresspal-test-upgrade-mid-write-failure';
    openedDatabases.push(name);
    await createLegacyVersionTwoFixture(name);

    const upgradingDatabase = createProgressPalDatabase(
      defaultTestMigrationContext,
      name,
    );

    // Test-only injection, strengthened mechanically (owner-authorized
    // continuation): rather than inferring from source-code ordering that
    // `app_meta` / `catalogue_versions` writes were attempted first, this
    // records every native `put`/`add` call's store name as it happens
    // (`app_meta.put` uses `put`; `catalogue_versions.bulkAdd` and
    // `programme_enrolments.bulkAdd` use `add`) and only throws for
    // `programme_enrolments` once at least one of the other two migration
    // writes has actually been observed first. Dexie's mutate core calls the
    // native `IDBObjectStore` method dynamically (`store[type](...)`), so
    // this patches the native primitives every write path goes through
    // rather than a Dexie-level wrapper a spy could miss.
    const observedWritesBeforeFailure: string[] = [];
    const originalPut = IDBObjectStore.prototype.put;
    const putSpy = vi
      .spyOn(IDBObjectStore.prototype, 'put')
      .mockImplementation(function (
        this: IDBObjectStore,
        ...args: Parameters<IDBObjectStore['put']>
      ) {
        if (this.name === 'app_meta') {
          observedWritesBeforeFailure.push(this.name);
        }

        return originalPut.apply(this, args);
      });
    const originalAdd = IDBObjectStore.prototype.add;
    const addSpy = vi
      .spyOn(IDBObjectStore.prototype, 'add')
      .mockImplementation(function (
        this: IDBObjectStore,
        ...args: Parameters<IDBObjectStore['add']>
      ) {
        if (this.name === 'programme_enrolments') {
          // Mechanical proof, not inference: fail only once an earlier
          // migration write attempt was actually observed.
          expect(observedWritesBeforeFailure.length).toBeGreaterThan(0);
          expect(observedWritesBeforeFailure.length).toBeGreaterThan(0);
          putSpy.mockRestore();
          addSpy.mockRestore();
          throw new Error('Injected mid-write upgrade failure (test-only).');
        }

        if (this.name === 'catalogue_versions') {
          observedWritesBeforeFailure.push(this.name);
        }

        return originalAdd.apply(this, args);
      });

    await expect(upgradingDatabase.open()).rejects.toThrow(
      /injected mid-write upgrade failure/i,
    );
    upgradingDatabase.close();

    // The assertions inside the spy only run if `programme_enrolments` is
    // ever reached; confirm at least one earlier migration write - app_meta
    // and/or catalogue_versions - was actually observed, so a future
    // refactor that reordered the writes (and thus skipped triggering the
    // injection) could not silently turn this into a vacuous pass.
    expect(observedWritesBeforeFailure.length).toBeGreaterThan(0);
    for (const observed of observedWritesBeforeFailure) {
      expect(['app_meta', 'catalogue_versions']).toContain(observed);
    }

    // The whole version-change transaction aborted: the native database
    // never advanced past v2 (native version 20 = Dexie version 2 * 10), and
    // the v3-only object stores this upgrade would have created do not exist.
    expect(await getNativeDatabaseVersion(name)).toBe(20);

    const rawCheck = new Dexie(name);
    rawCheck.version(2).stores(legacyVersionTwoStoreDefinitions);
    await rawCheck.open();
    expect(rawCheck.tables.map((table) => table.name)).not.toContain(
      'catalogue_versions',
    );
    expect(rawCheck.tables.map((table) => table.name)).not.toContain(
      'programme_enrolments',
    );
    const appMeta = await rawCheck.table('app_meta').get('app-meta');
    const unit = await rawCheck.table('course_units').get('week-0');
    expect(appMeta).toMatchObject({ schemaVersion: 2, seedVersion: 1 });
    expect(unit).toMatchObject({ courseId: 'cs50x-2026' });
    rawCheck.close();
  });
});

describe('multi-tab old-shell upgrade (MR-13/14: existing Dexie defaults, no new copy)', () => {
  const openedDatabases: string[] = [];

  afterEach(async () => {
    await Promise.all(openedDatabases.splice(0).map(deleteDatabaseByName));
  });

  it('closes an old tab holding a live v2 connection so the v3 upgrade elsewhere can proceed', async () => {
    const name = 'progresspal-test-upgrade-multitab';
    openedDatabases.push(name);
    await createLegacyVersionTwoFixture(name);

    // Simulates an old tab that never reloaded: a live v2 connection with no
    // custom versionchange/blocked handling, exactly like production, which
    // registers none (Epic C / C6 MR-13: existing Dexie defaults suffice).
    const oldTabConnection = new Dexie(name);
    oldTabConnection.version(2).stores(legacyVersionTwoStoreDefinitions);
    await oldTabConnection.open();
    expect(oldTabConnection.isOpen()).toBe(true);

    const upgradingDatabase = createProgressPalDatabase(
      defaultTestMigrationContext,
      name,
    );

    await upgradingDatabase.open();

    // Dexie's own default versionchange handler closed the old tab's
    // connection so this upgrade was never blocked.
    expect(oldTabConnection.isOpen()).toBe(false);
    expect(upgradingDatabase.isOpen()).toBe(true);
    const appMeta = await upgradingDatabase.appMeta.get('app-meta');
    expect(appMeta).toMatchObject({
      activeProgrammeId: 'cs50x',
      schemaVersion: 3,
    });

    upgradingDatabase.close();
  }, 15_000);
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
      seed: {
        ...sampleCourseSeed,
        dataVersion: sampleCourseSeed.dataVersion + 1,
      },
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
