import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';

import { BackupValidationError, parseBackupFile } from '@/lib/backup';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  getDatabaseSnapshot,
  initializeDatabase,
  restoreDatabaseFromBackup,
} from '@/lib/db';
import {
  createProgressPalDatabase,
  deleteDatabaseByName,
} from '@/lib/db/database';

import {
  createTestDatabase,
  defaultTestMigrationContext,
  type TestDatabaseContext,
} from '../db/testDatabase';

/**
 * Epic C6-R, E2: `restore(old) == upgrade(old)`. The rejected C6 candidate
 * never proved the two real migration paths produce equivalent persisted
 * state; sharing the pure `migrateV2ToV3()` module is not proof by
 * construction, since each caller feeds it a differently-loaded snapshot and
 * wraps its result in a different set of surrounding writes.
 *
 * Path A: a real Dexie v2 -> v3 in-place upgrade (`createProgressPalDatabase`
 * opening a raw legacy v2 fixture), followed by the same `initializeDatabase`
 * bootstrap call the app always makes right after opening.
 * Path B: the same representative legacy v2 state as a schema-2 backup,
 * forward-converted by `parseBackupFile`, then restored through the real
 * `restoreDatabaseFromBackup` path (which also calls `initializeDatabase`
 * internally).
 *
 * Both paths use the same fixed clock and legacy timestamps so the only
 * expected divergence is the one legitimate path-specific difference this
 * test names explicitly: `restoreDatabaseFromBackup` appends one `import`
 * audit record that an in-place upgrade never creates.
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

const legacyCreatedAt = '2026-06-01T08:00:00.000Z';
const legacyOnboardingCompletedAt = '2026-06-01T08:05:00.000Z';
const legacyUpdatedAt = '2026-06-05T09:00:00.000Z';
const normalizationTimestamp = '2026-09-28T12:00:00.000Z';
const normalizationClock = () => normalizationTimestamp;

const legacyAppMeta = {
  id: 'app-meta',
  createdAt: legacyCreatedAt,
  updatedAt: legacyUpdatedAt,
  appVersion: '1.3.0-test',
  schemaVersion: 2,
  seedVersion: 1,
  onboardingCompletedAt: legacyOnboardingCompletedAt,
};

const legacyCourseUnit = {
  id: 'week-0',
  createdAt: legacyCreatedAt,
  updatedAt: legacyCreatedAt,
  courseId: 'cs50x-2026',
  title: 'Week 0',
  order: 0,
  type: 'week',
  sourceYear: 2026,
  required: true,
};

const legacyCourseItem = {
  id: 'week-0-lecture',
  createdAt: legacyCreatedAt,
  updatedAt: legacyCreatedAt,
  unitId: 'week-0',
  type: 'lecture',
  title: 'Lecture',
  required: true,
  estimatedMinutes: 120,
  order: 0,
};

const legacyProgressEntry = {
  id: 'progress-week-0-lecture',
  createdAt: legacyCreatedAt,
  updatedAt: legacyUpdatedAt,
  itemId: 'week-0-lecture',
  status: 'started',
  startedAt: legacyCreatedAt,
  confidence: 3,
};

const legacyStudySession = {
  id: 'session-1',
  createdAt: legacyCreatedAt,
  updatedAt: legacyCreatedAt,
  unitId: 'week-0',
  itemId: 'week-0-lecture',
  startedAt: legacyCreatedAt,
  endedAt: '2026-06-01T08:30:00.000Z',
  durationMinutes: 30,
  mode: 'watching',
  blockers: [],
};

const legacyXpTransaction = {
  id: 'xp-study-session-1',
  createdAt: legacyCreatedAt,
  updatedAt: legacyCreatedAt,
  sourceType: 'study_session',
  sourceId: 'session-1',
  xp: 10,
  reason: 'Logged 25+ minute study session for: Lecture',
  awardedAt: '2026-06-01T08:30:00.000Z',
};

const legacyAchievementUnlock = {
  id: 'unlock-first-step',
  createdAt: legacyUpdatedAt,
  updatedAt: legacyUpdatedAt,
  achievementId: 'first-step',
  unlockedAt: legacyUpdatedAt,
  triggerSourceId: 'week-0-lecture',
};

async function createLegacyVersionTwoFixture(databaseName: string) {
  const legacyDatabase = new Dexie(databaseName);

  legacyDatabase.version(2).stores(legacyVersionTwoStoreDefinitions);
  await legacyDatabase.open();
  await legacyDatabase.table('app_meta').add(legacyAppMeta);
  await legacyDatabase.table('course_units').add(legacyCourseUnit);
  await legacyDatabase.table('course_items').add(legacyCourseItem);
  await legacyDatabase.table('progress_entries').add(legacyProgressEntry);
  await legacyDatabase.table('study_sessions').add(legacyStudySession);
  await legacyDatabase.table('xp_transactions').add(legacyXpTransaction);
  await legacyDatabase
    .table('achievement_unlocks')
    .add(legacyAchievementUnlock);

  legacyDatabase.close();
}

/** The same representative legacy state as a schema-2 backup envelope. */
const schemaTwoEnvelope = {
  format: 'progresspal-backup',
  formatVersion: 1,
  appVersion: legacyAppMeta.appVersion,
  schemaVersion: 2,
  exportedAt: '2026-06-05T09:30:00.000Z',
  data: {
    appMeta: legacyAppMeta,
    learnerProfile: null,
    courseUnits: [legacyCourseUnit],
    courseItems: [legacyCourseItem],
    progressEntries: [legacyProgressEntry],
    contentAssets: [],
    contentSlices: [],
    mediaProgressEvents: [],
    resumePoints: [],
    studySessions: [legacyStudySession],
    xpTransactions: [legacyXpTransaction],
    achievementDefinitions: [],
    achievementUnlocks: [legacyAchievementUnlock],
    backups: [],
  },
};

describe('restore(old) and upgrade(old) (Epic C6-R, E2; Epic E forward baseline)', () => {
  const openedRawDatabaseNames: string[] = [];
  let restoreTargetDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
    await Promise.all(
      openedRawDatabaseNames.splice(0).map(deleteDatabaseByName),
    );
    await restoreTargetDatabase?.cleanup();
    restoreTargetDatabase = null;
  });

  // Epic E (accepted E-SCHEMA-1, section 7 and the oracle table): the
  // retained historical 2 -> 3 conversion is still exercised with an explicit
  // `expectedSchemaVersion: 3`, but the schema-4 application refuses that
  // converted state before any write, so path B no longer completes. Path A
  // keeps every learner-data store of the legacy state across the in-place
  // upgrade, now through v3 to v4, and the two new stores start empty.
  it('upgrades the legacy state in place without loss, and the schema-4 restore path refuses the converted schema-3 state before any write', async () => {
    // Path A: a real in-place Dexie upgrade, then the same bootstrap call the
    // app always makes right after opening.
    const upgradedDatabaseName = 'progresspal-test-equivalence-upgrade';
    openedRawDatabaseNames.push(upgradedDatabaseName);
    await createLegacyVersionTwoFixture(upgradedDatabaseName);

    const upgradedDatabase = createProgressPalDatabase(
      defaultTestMigrationContext,
      upgradedDatabaseName,
    );
    await upgradedDatabase.open();
    await initializeDatabase({
      db: upgradedDatabase,
      now: normalizationClock,
    });
    const upgraded = await getDatabaseSnapshot({ db: upgradedDatabase });
    upgradedDatabase.close();

    // Path B: the same legacy state as a schema-2 backup, forward-converted by
    // the retained historical code ...
    const parsed = parseBackupFile(JSON.stringify(schemaTwoEnvelope), {
      expectedSchemaVersion: 3,
      migrationContext: defaultTestMigrationContext,
    });

    // ... carries the same learner data the in-place upgrade kept.
    for (const table of [
      'progressEntries',
      'studySessions',
      'xpTransactions',
      'achievementUnlocks',
      'contentSlices',
      'mediaProgressEvents',
      'resumePoints',
    ] as const) {
      expect(parsed.data[table], table).toEqual(upgraded[table]);
    }

    // Not vacuous: the legacy fixture populates these learner-data stores.
    for (const table of [
      'progressEntries',
      'studySessions',
      'xpTransactions',
      'achievementUnlocks',
    ] as const) {
      expect(upgraded[table].length, table).toBeGreaterThan(0);
    }

    // ... and is refused by the schema-4 restore path, leaving the target
    // database exactly as it was.
    restoreTargetDatabase = createTestDatabase('equivalence-restore');
    await initializeDatabase({
      db: restoreTargetDatabase.db,
      now: normalizationClock,
    });
    const beforeRestore = await getDatabaseSnapshot({
      db: restoreTargetDatabase.db,
    });
    await expect(
      restoreDatabaseFromBackup(parsed.data, {
        db: restoreTargetDatabase.db,
        fileName: 'equivalence-fixture.json',
        now: normalizationClock,
      }),
    ).rejects.toBeInstanceOf(BackupValidationError);
    expect(await getDatabaseSnapshot({ db: restoreTargetDatabase.db })).toEqual(
      beforeRestore,
    );

    // appVersion normalized to current despite the legacy, stale fixture
    // value; the schema is the current one; the new stores start empty.
    expect(upgraded.appMeta?.appVersion).toBe(currentApplicationVersion);
    expect(upgraded.appMeta?.schemaVersion).toBe(currentDatabaseSchemaVersion);
    expect(upgraded.appMeta?.activeProgrammeId).toBe(
      defaultTestMigrationContext.programmeId,
    );
    expect(upgraded.learnerEvidence).toEqual([]);
    expect(upgraded.lessonPositions).toEqual([]);

    // An in-place upgrade never touches `backups`.
    expect(upgraded.backups).toEqual([]);
  });
});
