import { afterEach, describe, expect, it } from 'vitest';

import {
  BackupValidationError,
  assertBackupDataInvariants,
  buildBackupEnvelope,
  parseBackupFile,
  serializeBackupEnvelope,
} from '@/lib/backup';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  ensureCourseCatalogFromSeed,
  getDatabaseSnapshot,
  initializeDatabase,
  type DatabaseSnapshot,
} from '@/lib/db';
import { bundledCourseSeed } from '@/seed';

import {
  altProgrammeId,
  altSeed,
  bothCataloguesMigrationContext,
  cs50ProgrammeId,
} from '../programmes/c7Fixture';
import {
  createTestDatabase,
  defaultTestMigrationContext,
  type TestDatabaseContext,
} from '../db/testDatabase';

/**
 * Epic C / C7 authorized correction to backup validation: a schema-v3 backup's
 * active programme is valid when it is a member of the authorized-programme
 * set (not only when it equals the default/bootstrap programme), while every
 * other authorization check stays fail-closed.
 */

const t0 = '2026-09-30T08:00:00.000Z';
const databases: TestDatabaseContext[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

async function bActiveData(): Promise<DatabaseSnapshot> {
  const context = createTestDatabase(
    'c7-envelope-b-active',
    bothCataloguesMigrationContext,
  );
  databases.push(context);
  await initializeDatabase({
    db: context.db,
    seed: bundledCourseSeed,
    now: () => t0,
  });
  await ensureCourseCatalogFromSeed(altSeed, { db: context.db, now: () => t0 });
  const appMeta = await context.db.appMeta.get('app-meta');
  await context.db.programmeEnrolments.put({
    programmeId: altProgrammeId,
    enrolledAt: t0,
  });
  await context.db.appMeta.put({
    ...appMeta!,
    activeProgrammeId: altProgrammeId,
  });

  return getDatabaseSnapshot({ db: context.db });
}

const options = {
  expectedSchemaVersion: currentDatabaseSchemaVersion,
  migrationContext: bothCataloguesMigrationContext,
};

describe('backup active-programme authorization (C7)', () => {
  it('accepts an authorized, enrolled B-active schema-v3 backup', async () => {
    const data = await bActiveData();

    expect(data.appMeta?.activeProgrammeId).toBe(altProgrammeId);
    expect(() => assertBackupDataInvariants(data, options)).not.toThrow();
  });

  it('parses a serialized B-active backup file end to end', async () => {
    const data = await bActiveData();
    const { contents } = serializeBackupEnvelope(
      buildBackupEnvelope(data, {
        appVersion: currentApplicationVersion,
        exportedAt: '2026-09-30T09:00:00.000Z',
        schemaVersion: currentDatabaseSchemaVersion,
      }),
    );

    const parsed = parseBackupFile(contents, options);

    expect(parsed.data.appMeta?.activeProgrammeId).toBe(altProgrammeId);
    expect(
      parsed.data.programmeEnrolments.map((row) => row.programmeId).sort(),
    ).toEqual([cs50ProgrammeId, altProgrammeId].sort());
  });

  it('still accepts a default-active backup', async () => {
    const data = await bActiveData();
    const defaultActive: DatabaseSnapshot = {
      ...data,
      appMeta: { ...data.appMeta!, activeProgrammeId: cs50ProgrammeId },
    };

    expect(() =>
      assertBackupDataInvariants(defaultActive, options),
    ).not.toThrow();
  });

  it('still rejects an active programme that is not authorized', async () => {
    const data = await bActiveData();
    const forged: DatabaseSnapshot = {
      ...data,
      appMeta: { ...data.appMeta!, activeProgrammeId: 'ghost-programme' },
      programmeEnrolments: [
        ...data.programmeEnrolments,
        { programmeId: 'ghost-programme', enrolledAt: t0 },
      ],
    };

    expect(() => assertBackupDataInvariants(forged, options)).toThrow(
      BackupValidationError,
    );
    expect(() => assertBackupDataInvariants(forged, options)).toThrow(
      /unregistered (active )?programme/i,
    );
  });

  it('still rejects a B-active backup whose B enrolment is missing', async () => {
    const data = await bActiveData();
    const unenrolled: DatabaseSnapshot = {
      ...data,
      programmeEnrolments: data.programmeEnrolments.filter(
        (row) => row.programmeId !== altProgrammeId,
      ),
    };

    expect(() => assertBackupDataInvariants(unenrolled, options)).toThrow(
      /no enrolment for its active programme/i,
    );
  });

  it('still rejects an enrolment for an unauthorized programme', async () => {
    const data = await bActiveData();
    const forged: DatabaseSnapshot = {
      ...data,
      programmeEnrolments: [
        ...data.programmeEnrolments,
        { programmeId: 'ghost-programme', enrolledAt: t0 },
      ],
    };

    expect(() => assertBackupDataInvariants(forged, options)).toThrow(
      /enrolment for an unregistered programme/i,
    );
  });

  it('still rejects a catalogue version owned by a different programme than authorized', async () => {
    const data = await bActiveData();
    const forged: DatabaseSnapshot = {
      ...data,
      catalogueVersions: data.catalogueVersions.map((version) =>
        version.courseId === altSeed.courseId
          ? { ...version, programmeId: cs50ProgrammeId }
          : version,
      ),
    };

    expect(() => assertBackupDataInvariants(forged, options)).toThrow(
      /unauthorized catalogue/i,
    );
  });

  it('rejects a B-active backup where only CS50 is authorized', async () => {
    const data = await bActiveData();

    expect(() =>
      assertBackupDataInvariants(data, {
        expectedSchemaVersion: currentDatabaseSchemaVersion,
        migrationContext: defaultTestMigrationContext,
      }),
    ).toThrow(/unregistered|unauthorized/i);
  });
});
