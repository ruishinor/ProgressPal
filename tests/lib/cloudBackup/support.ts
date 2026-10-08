import { createHash } from 'node:crypto';

import type { BackupData } from '@/lib/backup';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  ensureCourseCatalogFromSeed,
  getDatabaseSnapshot,
  initializeDatabase,
  restoreDatabaseFromBackup,
  saveLearnerProfile,
  upsertProgress,
  type DatabaseMigrationContext,
} from '@/lib/db';

import {
  createClock,
  createTestDatabase,
  sampleCourseSeed,
  type TestDatabaseContext,
} from '../../db/testDatabase';

/** A fake-indexeddb "device": the real database layer, nothing mocked. */
export interface Device {
  context: TestDatabaseContext;
  migrationContext: DatabaseMigrationContext;
  readSnapshot: () => Promise<BackupData>;
  restoreLocal: (
    data: BackupData,
    options: { fileName: string },
  ) => Promise<unknown>;
  cleanup: () => Promise<void>;
}

export const appVersion = currentApplicationVersion;
export const schemaVersion = currentDatabaseSchemaVersion;

export async function createFreshDevice(label: string): Promise<Device> {
  const context = createTestDatabase(label);
  const { db } = context;

  await initializeDatabase({
    db,
    now: createClock('2026-10-08T09:00:00.000Z'),
  });
  await ensureCourseCatalogFromSeed(sampleCourseSeed, {
    db,
    now: createClock('2026-10-08T09:00:01.000Z'),
  });

  return {
    context,
    migrationContext: db.migrationContext,
    readSnapshot: () => getDatabaseSnapshot({ db }),
    restoreLocal: (data, options) =>
      restoreDatabaseFromBackup(data, { db, ...options }),
    cleanup: context.cleanup,
  };
}

/** A device that has finished onboarding and logged one piece of progress. */
export async function createLearnerDevice(label: string): Promise<Device> {
  const device = await createFreshDevice(label);
  const { db } = device.context;

  await saveLearnerProfile(
    {
      avatarConfig: { face: 'square', hair: 'parted', topColor: 'ocean' },
      displayName: 'Synthetic Learner',
      preferredTheme: 'dark',
      reducedMotion: true,
      targetMinutesPerWeek: 360,
      targetStudyDays: ['monday', 'tuesday', 'thursday'],
    },
    {
      completeOnboarding: true,
      db,
      now: createClock('2026-10-08T09:30:00.000Z'),
    },
  );
  await upsertProgress(
    {
      itemId: 'week-0-lecture',
      status: 'started',
      startedAt: '2026-10-08T09:40:00.000Z',
      completedAt: undefined,
      confidence: 0.4,
      notes: 'Synthetic note.',
      evidenceType: undefined,
      evidenceText: undefined,
    },
    { db, now: createClock('2026-10-08T09:40:00.000Z') },
  );

  return device;
}

export const sha256 = (text: string) =>
  createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
