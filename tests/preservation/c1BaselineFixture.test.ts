import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';

import {
  buildBackupEnvelope,
  parseBackupFile,
  serializeBackupEnvelope,
  summarizeBackup,
} from '@/lib/backup';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  getDatabaseSnapshot,
  initializeDatabase,
} from '@/lib/db';
import {
  createProgressPalDatabase,
  deleteDatabaseByName,
} from '@/lib/db/database';
import { cs50AchievementDefinitions as achievementDefinitions } from '../programmes/cs50Policy';
import { bundledCourseSeed } from '@/seed';

import committedFixture from '../fixtures/backups/c1-baseline-envelope1-schema2.json';
import { defaultTestMigrationContext } from '../db/testDatabase';
import { buildC1BaselineEnvelope } from './c1BaselineFixtureBuilder';
import { createIncrementingClock } from './c1Support';

/**
 * Epic C / C1 evidence area 7 — baseline schema-2 migration fixture.
 *
 * Family: MIGRATION. The committed file is the schema-2 state C6 must migrate.
 * Provenance: produced by `buildC1BaselineEnvelope` through the real
 * repositories and the real export path at the product baseline; the first
 * test rebuilds it and requires deep equality, so the fixture cannot drift
 * from what the baseline system produces. Synthetic data only.
 */

const fixtureText = JSON.stringify(committedFixture);
// Epic E (accepted E-SCHEMA-1, section 7): the schema-4 application refuses a
// schema-2 export, so the frozen fixture is read through the retained
// historical 2 -> 3 conversion with an explicit `expectedSchemaVersion: 3`.
// The state it describes reaches schema 4 the way a live device does: by the
// in-place upgrade (last test below).
const parse = () =>
  parseBackupFile(fixtureText, {
    expectedSchemaVersion: 3,
    migrationContext: defaultTestMigrationContext,
  });

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

const legacyStoreByDataKey = {
  courseUnits: 'course_units',
  courseItems: 'course_items',
  progressEntries: 'progress_entries',
  contentAssets: 'content_assets',
  contentSlices: 'content_slices',
  mediaProgressEvents: 'media_progress_events',
  resumePoints: 'resume_points',
  studySessions: 'study_sessions',
  xpTransactions: 'xp_transactions',
  achievementDefinitions: 'achievement_definitions',
  achievementUnlocks: 'achievement_unlocks',
  backups: 'backups',
} as const;

/** The frozen schema-2 state as a live v2 IndexedDB database, row for row. */
async function createLiveVersionTwoDevice(databaseName: string) {
  const legacy = new Dexie(databaseName);
  legacy.version(2).stores(legacyVersionTwoStoreDefinitions);
  await legacy.open();
  const { data } = committedFixture;

  await legacy.table('app_meta').add(data.appMeta);
  if (data.learnerProfile !== null) {
    await legacy.table('learner_profile').add(data.learnerProfile);
  }
  for (const [key, store] of Object.entries(legacyStoreByDataKey)) {
    await legacy
      .table(store)
      .bulkAdd(data[key as keyof typeof legacyStoreByDataKey] as unknown[]);
  }

  legacy.close();
}

describe('C1 baseline schema-2 fixture (migration)', () => {
  // Epic C / C6: the live repositories now always produce schema-3 output
  // (activeProgrammeId, catalogueVersions, programmeEnrolments; one extra
  // bootstrap write shifts every later incrementing-clock timestamp), so
  // `buildC1BaselineEnvelope()` can no longer reproduce this frozen schema-2
  // file byte-for-byte — that would require the retired schema-2 write path.
  // The builder's provenance was established and locked before C6; the
  // fixture itself stays byte-for-byte unchanged and is exercised by every
  // other test below (parse, forward-conversion, restore, invariants).
  it('still builds successfully through the real repositories (schema-3 now, not compared to the frozen file)', async () => {
    const rebuilt = await buildC1BaselineEnvelope();

    expect(rebuilt.data.courseUnits).toHaveLength(
      committedFixture.data.courseUnits.length,
    );
    expect(rebuilt.data.courseItems).toHaveLength(
      committedFixture.data.courseItems.length,
    );
    expect(rebuilt.data.xpTransactions.map((tx) => tx.id).sort()).toEqual(
      committedFixture.data.xpTransactions.map((tx) => tx.id).sort(),
    );
  }, 120_000);

  it('parses the committed schema-2 file through the retained 2 -> 3 conversion, and the schema-4 application refuses it', () => {
    expect(() =>
      parseBackupFile(fixtureText, {
        expectedSchemaVersion: currentDatabaseSchemaVersion,
        migrationContext: defaultTestMigrationContext,
      }),
    ).toThrow(/different data version/);

    const parsed = parse();
    expect(parsed.data.appMeta?.activeProgrammeId).toBe('cs50x');
    // Pre-E oracle evolution: the summary reports the backup's own recorded
    // application version. The frozen fixture bytes carry `1.3.0`; this used to
    // be asserted as `currentApplicationVersion`, which only held while the
    // running version equalled the fixture's. Pinning the literal also pins
    // that the frozen bytes were not edited.
    expect(summarizeBackup(parsed)).toMatchObject({
      appVersion: '1.3.0',
      format: 'progresspal-backup',
      formatVersion: 1,
      profileName: 'C1 Synthetic Learner',
      schemaVersion: 3,
    });
  });

  it('contains the state required by the C0 migration contract', () => {
    const { data } = parse();

    expect(data.courseUnits).toHaveLength(14);
    expect(data.courseItems).toHaveLength(68);
    expect(data.appMeta?.activeProgrammeId).toBe('cs50x');
    expect(
      data.catalogueVersions.find(
        (version) => version.courseId === bundledCourseSeed.courseId,
      )?.dataVersion,
    ).toBe(bundledCourseSeed.dataVersion);
    expect(new Set(data.courseUnits.map((unit) => unit.courseId))).toEqual(
      new Set(['cs50x-2026']),
    );
    expect(new Set(data.progressEntries.map((entry) => entry.status))).toEqual(
      new Set([
        'started',
        'blocked',
        'completed',
        'submitted',
        'accepted',
        'skipped_optional',
      ]),
    );
    expect(data.mediaProgressEvents.length).toBeGreaterThanOrEqual(4);
    expect(data.resumePoints.length).toBeGreaterThanOrEqual(2);
    expect(new Set(data.contentSlices.map((slice) => slice.status))).toEqual(
      new Set(['not_started', 'active', 'completed']),
    );
    // No production write path creates a `skipped` slice (C6 gap, recorded).
    expect(data.contentSlices.some((slice) => slice.status === 'skipped')).toBe(
      false,
    );
    expect(
      data.studySessions.find(
        (session) => session.id === 'c1-session-corrected',
      ),
    ).toMatchObject({ itemId: 'week-4-lecture', unitId: 'week-4' });
    expect(
      [...new Set(data.xpTransactions.map((tx) => tx.sourceType))].sort(),
    ).toEqual([
      'content_slice_completed',
      'final_project_build_completed',
      'final_project_readme_demo_completed',
      'lecture_completed',
      'media_clean_stop',
      'media_unique_10_minutes',
      'practice_completed',
      'problem_set_accepted',
      'problem_set_started',
      'problem_set_submitted',
      'section_completed',
      'shorts_completed',
      'study_session',
      'week_completed',
    ]);
    expect(
      data.achievementUnlocks.map((unlock) => unlock.achievementId).sort(),
    ).toEqual(achievementDefinitions.map((definition) => definition.id).sort());
    expect(data.achievementDefinitions).toEqual([]);
    expect(data.backups).toHaveLength(1);
    expect(data.backups[0]).toMatchObject({
      fileName: 'c1-synthetic-earlier-export.json',
      type: 'export',
    });
  });

  it('contains only synthetic learner data', () => {
    const { data } = parse();
    const freeText = [
      data.learnerProfile?.displayName,
      ...data.progressEntries.flatMap((entry) => [
        entry.notes,
        entry.evidenceText,
      ]),
      ...data.studySessions.map((session) => session.notes),
      ...data.mediaProgressEvents.map((event) => event.notes),
      ...data.backups.map((backup) => backup.fileName),
    ].filter((value): value is string => value !== undefined && value !== '');

    expect(freeText.length).toBeGreaterThan(0);
    for (const value of freeText) {
      expect(value, value).toMatch(/synthetic/i);
    }
    expect(
      data.studySessions.every((session) =>
        session.id.startsWith('c1-session-'),
      ),
    ).toBe(true);
  });

  // Epic E: the restore path refuses the schema-2 export (section 7), so the
  // C1/C6-R "no semantic loss" oracle is carried by the path a live device
  // takes to schema 4: the in-place v2 -> v3 -> v4 upgrade of this exact state.
  it('upgrades the baseline state in place to schema 4 and round-trips without semantic loss', async () => {
    const parsed = parse();
    const databaseName = 'progresspal-test-c1-live-upgrade';
    await createLiveVersionTwoDevice(databaseName);
    const upgradedDatabase = createProgressPalDatabase(
      defaultTestMigrationContext,
      databaseName,
    );

    try {
      await upgradedDatabase.open();
      await initializeDatabase({
        db: upgradedDatabase,
        now: createIncrementingClock('2026-09-20T09:00:00.000Z'),
        seed: bundledCourseSeed,
      });
      const upgraded = await getDatabaseSnapshot({ db: upgradedDatabase });

      const learnerTables = [
        'learnerProfile',
        'courseUnits',
        'courseItems',
        'progressEntries',
        'contentAssets',
        'contentSlices',
        'mediaProgressEvents',
        'resumePoints',
        'studySessions',
        'xpTransactions',
        'achievementDefinitions',
        'achievementUnlocks',
      ] as const;
      for (const table of learnerTables) {
        expect(upgraded[table], table).toEqual(parsed.data[table]);
      }
      // The complete canonical `app_meta`: the converted state with the
      // schema now 4 and the application version normalized to the running
      // executable by the bootstrap write (its `updatedAt` is that write's
      // time, the first tick of the injected clock).
      expect(parsed.data.appMeta?.appVersion).toBe('1.3.0');
      expect(upgraded.appMeta).toEqual({
        id: 'app-meta',
        createdAt: '2026-09-19T12:00:00.000Z',
        updatedAt: '2026-09-20T09:00:00.000Z',
        appVersion: currentApplicationVersion,
        onboardingCompletedAt: '2026-09-19T12:05:00.000Z',
        schemaVersion: currentDatabaseSchemaVersion,
        activeProgrammeId: 'cs50x',
      });
      expect(upgraded.appMeta).not.toHaveProperty('seedVersion');
      expect(upgraded.catalogueVersions).toEqual([
        {
          courseId: bundledCourseSeed.courseId,
          programmeId: 'cs50x',
          dataVersion: 20260617,
          syncedAt: '2026-09-19T12:05:00.000Z',
        },
      ]);
      expect(upgraded.programmeEnrolments).toEqual([
        {
          programmeId: 'cs50x',
          enrolledAt: parsed.data.appMeta?.onboardingCompletedAt,
        },
      ]);
      // An in-place upgrade adds no audit record; the new stores start empty.
      expect(upgraded.backups).toEqual(parsed.data.backups);
      expect(upgraded.learnerEvidence).toEqual([]);
      expect(upgraded.lessonPositions).toEqual([]);

      // Export through the real path at schema 4 and parse: nothing is lost.
      const reExported = parseBackupFile(
        serializeBackupEnvelope(
          buildBackupEnvelope(upgraded, {
            appVersion: currentApplicationVersion,
            exportedAt: '2026-09-20T10:00:00.000Z',
            schemaVersion: currentDatabaseSchemaVersion,
          }),
        ).contents,
        { expectedSchemaVersion: currentDatabaseSchemaVersion },
      );
      for (const table of learnerTables) {
        expect(reExported.data[table], `re-export ${table}`).toEqual(
          parsed.data[table],
        );
      }
      expect(reExported.data.appMeta).toEqual(upgraded.appMeta);
      expect(reExported.data.catalogueVersions).toEqual(
        upgraded.catalogueVersions,
      );
      expect(reExported.data.programmeEnrolments).toEqual(
        upgraded.programmeEnrolments,
      );
    } finally {
      upgradedDatabase.close();
      await deleteDatabaseByName(databaseName);
    }
  });
});
