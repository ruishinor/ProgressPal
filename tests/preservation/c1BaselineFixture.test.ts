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
  restoreDatabaseFromBackup,
} from '@/lib/db';
import { cs50AchievementDefinitions as achievementDefinitions } from '../programmes/cs50Policy';
import { bundledCourseSeed } from '@/seed';

import committedFixture from '../fixtures/backups/c1-baseline-envelope1-schema2.json';
import {
  createTestDatabase,
  defaultTestMigrationContext,
} from '../db/testDatabase';
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
const parse = () =>
  parseBackupFile(fixtureText, {
    expectedSchemaVersion: currentDatabaseSchemaVersion,
    migrationContext: defaultTestMigrationContext,
  });

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

  it('parses the committed schema-2 file, forward-converted to the current schema', () => {
    const parsed = parse();
    expect(parsed.data.appMeta?.activeProgrammeId).toBe('cs50x');
    expect(summarizeBackup(parsed)).toMatchObject({
      appVersion: currentApplicationVersion,
      format: 'progresspal-backup',
      formatVersion: 1,
      profileName: 'C1 Synthetic Learner',
      schemaVersion: currentDatabaseSchemaVersion,
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

  it('restores through the real restore path and round-trips without semantic loss', async () => {
    const parsed = parse();
    const context = createTestDatabase('c1-fixture-restore');
    try {
      const restored = await restoreDatabaseFromBackup(parsed.data, {
        db: context.db,
        fileName: 'c1-baseline-envelope1-schema2.json',
        now: createIncrementingClock('2026-09-20T09:00:00.000Z'),
        seed: bundledCourseSeed,
      });

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
        expect(restored[table], table).toEqual(parsed.data[table]);
      }
      expect(restored.appMeta).toMatchObject({
        onboardingCompletedAt: parsed.data.appMeta?.onboardingCompletedAt,
        schemaVersion: currentDatabaseSchemaVersion,
        activeProgrammeId: parsed.data.appMeta?.activeProgrammeId,
      });
      // Epic C6-R: the C1 preservation oracle transition (owner-authorized -
      // see C6_R_CLOSURE_RECORD.md) requires proving the complete
      // materially-relevant persisted state, not hand-picked counts/IDs. The
      // frozen fixture's legacy `app_meta` carries `seedVersion: 20260617`
      // and `updatedAt: '2026-09-19T12:05:00.000Z'`; `migrateV2ToV3` derives
      // `catalogue_versions.dataVersion` and `.syncedAt` from exactly those
      // two legacy fields, and it is unchanged here because the bundled
      // `cs50x-2026` seed's own `dataVersion` (20260617) matches, so the
      // reconciliation the restore's own `initializeDatabase` call performs
      // is a no-op rather than a real version bump.
      expect(restored.appMeta).not.toHaveProperty('seedVersion');
      expect(restored.catalogueVersions).toEqual([
        {
          courseId: bundledCourseSeed.courseId,
          programmeId: 'cs50x',
          dataVersion: 20260617,
          syncedAt: '2026-09-19T12:05:00.000Z',
        },
      ]);
      // `programme_enrolments.enrolledAt` follows the accepted rule
      // (`onboardingCompletedAt ?? createdAt`); the fixture's legacy
      // `app_meta` has both, so this also proves the `onboardingCompletedAt`
      // branch, not just the `createdAt` fallback.
      expect(restored.programmeEnrolments).toEqual([
        {
          programmeId: 'cs50x',
          enrolledAt: parsed.data.appMeta?.onboardingCompletedAt,
        },
      ]);
      // Restore appends exactly one `import` audit record.
      expect(restored.backups.slice(0, 1)).toEqual(parsed.data.backups);
      expect(restored.backups.slice(1)).toMatchObject([
        { fileName: 'c1-baseline-envelope1-schema2.json', type: 'import' },
      ]);

      // Export again through the real path and parse: learner data is intact.
      const reExported = parseBackupFile(
        serializeBackupEnvelope(
          buildBackupEnvelope(await getDatabaseSnapshot({ db: context.db }), {
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
    } finally {
      await context.cleanup();
    }
  });
});
