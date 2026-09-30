import {
  buildBackupEnvelope,
  serializeBackupEnvelope,
  type BackupData,
} from '@/lib/backup';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  defaultLearnerProfileValues,
  ensureCourseCatalogFromSeed,
  getDatabaseSnapshot,
  initializeDatabase,
  saveLearnerProfile,
  type DatabaseSnapshot,
  type ProgressPalDatabase,
} from '@/lib/db';
import {
  closeSharedDatabase,
  deleteSharedDatabase,
  getSharedDatabase,
} from '@/lib/db/database';
import { bundledCourseSeed } from '@/seed';

import {
  altProgrammeId,
  altSeed,
  bothCataloguesMigrationContext,
} from './c7Fixture';

/**
 * Epic C / C7 shared device setup for the provider, Settings and recovery
 * tests. Every helper works on the shared singleton exactly as the real app
 * does, after the two-catalogue migration context is bound.
 */

const setupTime = '2026-09-30T08:00:00.000Z';

/**
 * Puts a database directly in the persisted state a completed C7 switch
 * produces: the alternate programme enrolled and active. Direct writes keep
 * this independent of the switching implementation under test.
 */
export async function forceAlternateActive(
  db: ProgressPalDatabase,
  options: { enrol?: boolean } = {},
) {
  const appMeta = await db.appMeta.get('app-meta');

  if (appMeta === undefined) {
    throw new Error('App metadata is missing.');
  }

  if (options.enrol ?? true) {
    await db.programmeEnrolments.put({
      programmeId: altProgrammeId,
      enrolledAt: setupTime,
    });
  }

  await db.appMeta.put({ ...appMeta, activeProgrammeId: altProgrammeId });
}

/**
 * A two-catalogue device on the shared singleton, bound to the two-programme
 * authorization context: CS50 active, both catalogues materialized,
 * onboarding complete. The shared database is closed afterwards so a
 * provider render performs its own composition bind.
 */
export async function seedTwoProgrammeDevice(
  options: {
    alternateActive?: boolean;
    materializeAlternate?: boolean;
    onboard?: boolean;
  } = {},
) {
  closeSharedDatabase();
  const db = getSharedDatabase(bothCataloguesMigrationContext);

  await initializeDatabase({ seed: bundledCourseSeed });

  if (options.materializeAlternate ?? true) {
    await ensureCourseCatalogFromSeed(altSeed);
  }

  if (options.onboard ?? true) {
    await saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        displayName: 'C7 Synthetic Learner',
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      { completeOnboarding: true },
    );
  }

  if (options.alternateActive === true) {
    await forceAlternateActive(db);
  }

  closeSharedDatabase();
}

/**
 * A B-active schema-v3 backup holding only the alternate catalogue and its
 * enrolment, exactly as a device that never materialized CS50 would export.
 * A restore that reseeds CS50 from a stale pre-restore scope would therefore
 * be visible as CS50 rows appearing after the restore.
 */
export async function buildAlternateOnlyBackupFile(fileName: string) {
  closeSharedDatabase();
  const db = getSharedDatabase(bothCataloguesMigrationContext);

  await initializeDatabase({ now: () => setupTime });
  await ensureCourseCatalogFromSeed(altSeed, { now: () => setupTime });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName: 'Restored Alt Learner',
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true, now: () => setupTime },
  );
  await forceAlternateActive(db);
  const snapshot: DatabaseSnapshot = await getDatabaseSnapshot({ db });
  // Leave a clean slate: the caller seeds the device the backup is restored to.
  await deleteSharedDatabase();

  const onlyAlternate: BackupData = {
    ...snapshot,
    programmeEnrolments: snapshot.programmeEnrolments.filter(
      (row) => row.programmeId === altProgrammeId,
    ),
  };
  const { contents } = serializeBackupEnvelope(
    buildBackupEnvelope(onlyAlternate, {
      appVersion: currentApplicationVersion,
      exportedAt: '2026-09-30T09:00:00.000Z',
      schemaVersion: currentDatabaseSchemaVersion,
    }),
  );

  return new File([contents], fileName, { type: 'application/json' });
}
