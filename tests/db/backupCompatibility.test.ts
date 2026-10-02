import { afterEach, describe, expect, it } from 'vitest';

import {
  BackupValidationError,
  parseBackupFile,
  summarizeBackup,
} from '@/lib/backup';
import {
  currentDatabaseSchemaVersion,
  getDatabaseSnapshot,
  initializeDatabase,
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

/**
 * Epic E forward baseline (accepted E-SCHEMA-1, section 7): the schema-4
 * application refuses schema-2 exports clearly, before any write. The retained
 * historical 2 -> 3 conversion code stays covered with an explicit
 * `expectedSchemaVersion: 3`, unchanged; it is never re-pointed to 4.
 */
describe('backup compatibility matrix', () => {
  let testDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
    await testDatabase?.cleanup();
    testDatabase = null;
  });

  for (const fixtureCase of fixtures) {
    it(`refuses ${fixtureCase.fileName} in the schema-4 application before any write`, async () => {
      testDatabase = createTestDatabase(`compat-${fixtureCase.appVersion}`);
      await initializeDatabase({ db: testDatabase.db, seed: sampleCourseSeed });
      const before = await getDatabaseSnapshot({ db: testDatabase.db });

      expect(() =>
        parseBackupFile(JSON.stringify(fixtureCase.fixture), {
          expectedSchemaVersion: currentDatabaseSchemaVersion,
          migrationContext: defaultTestMigrationContext,
        }),
      ).toThrow(
        new BackupValidationError(
          `This backup was created with a different data version. Expected data version ${currentDatabaseSchemaVersion}.`,
        ),
      );
      expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(
        before,
      );
    });

    it(`still parses ${fixtureCase.fileName} through the retained historical 2 -> 3 conversion`, () => {
      const parsed = parseBackupFile(JSON.stringify(fixtureCase.fixture), {
        expectedSchemaVersion: 3,
        migrationContext: defaultTestMigrationContext,
      });

      expect(summarizeBackup(parsed)).toMatchObject({
        appVersion: fixtureCase.appVersion,
        format: 'progresspal-backup',
        formatVersion: 1,
        profileName: fixtureCase.profileName,
        schemaVersion: 3,
      });
      expect(
        parsed.data.studySessions.filter(
          (session) => session.id === fixtureCase.sessionId,
        ),
      ).toHaveLength(1);
      expect(parsed.data.xpTransactions).toHaveLength(1);
      expect(parsed.data.progressEntries).toHaveLength(1);
    });
  }
});
