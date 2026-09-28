import { afterEach, describe, expect, it } from 'vitest';

import { parseBackupFile, summarizeBackup } from '@/lib/backup';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  getDatabaseSnapshot,
  restoreDatabaseFromBackup,
} from '@/lib/db';
import historicalBackup from '../fixtures/backups/v1.2.0-envelope1-schema2.json';
import currentBackup from '../fixtures/backups/v1.3.0-envelope1-schema2.json';
import {
  createTestDatabase,
  defaultTestMigrationContext,
  sampleCourseSeed,
  type TestDatabaseContext,
} from './testDatabase';

const fixtures = [
  {
    appVersion: '0.1.0',
    fileName: 'v1.2.0-envelope1-schema2.json',
    fixture: historicalBackup,
    profileName: 'Historical Ada',
    sessionId: 'historical-session-1',
  },
  {
    appVersion: '1.3.0',
    fileName: 'v1.3.0-envelope1-schema2.json',
    fixture: currentBackup,
    profileName: 'Current Ada',
    sessionId: 'current-session-1',
  },
] as const;

describe('backup compatibility matrix', () => {
  let testDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
    await testDatabase?.cleanup();
    testDatabase = null;
  });

  for (const fixtureCase of fixtures) {
    it(`parses and restores ${fixtureCase.fileName}`, async () => {
      const parsed = parseBackupFile(JSON.stringify(fixtureCase.fixture), {
        expectedSchemaVersion: currentDatabaseSchemaVersion,
        migrationContext: defaultTestMigrationContext,
      });
      const summary = summarizeBackup(parsed);

      expect(summary).toMatchObject({
        appVersion: fixtureCase.appVersion,
        format: 'progresspal-backup',
        formatVersion: 1,
        profileName: fixtureCase.profileName,
        schemaVersion: currentDatabaseSchemaVersion,
      });

      testDatabase = createTestDatabase(`compat-${fixtureCase.appVersion}`);
      const restored = await restoreDatabaseFromBackup(parsed.data, {
        db: testDatabase.db,
        fileName: fixtureCase.fileName,
        seed: sampleCourseSeed,
      });
      const reread = await getDatabaseSnapshot({ db: testDatabase.db });

      for (const snapshot of [restored, reread]) {
        expect(snapshot.appMeta).toMatchObject({
          appVersion: currentApplicationVersion,
          schemaVersion: currentDatabaseSchemaVersion,
        });
        expect(snapshot.learnerProfile?.displayName).toBe(
          fixtureCase.profileName,
        );
        expect(
          snapshot.studySessions.filter(
            (session) => session.id === fixtureCase.sessionId,
          ),
        ).toHaveLength(1);
        expect(snapshot.xpTransactions).toHaveLength(1);
        expect(snapshot.progressEntries).toHaveLength(1);
        expect(snapshot.backups).toHaveLength(1);
        expect(snapshot.backups[0]).toMatchObject({
          fileName: fixtureCase.fileName,
          type: 'import',
        });
      }
    });
  }
});
