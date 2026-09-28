import { afterEach, describe, expect, it } from 'vitest';

import { getAppMeta, initializeDatabase } from '@/lib/db';

import {
  createClock,
  createTestDatabase,
  type TestDatabaseContext,
} from './testDatabase';

/**
 * Owner-review C6-R RED checkpoint (D1): `ensureBaseInitialization` must
 * validate an existing database's `activeProgrammeId`/enrolment consistency
 * before any no-op early return, not only inside the write branch. A rejected
 * C6 candidate (`7af18c2`) computed `needsAppMetaWrite`/`needsProfileWrite`
 * and returned early when both were false, before ever checking that the
 * stored `activeProgrammeId` matches the database's bound migration context
 * or that the required programme enrolment row exists.
 */
describe('database bootstrap invariants (Epic C6-R, D1)', () => {
  let testDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
    await testDatabase?.cleanup();
    testDatabase = null;
  });

  it('D1-A: fails closed on a current database with a mismatched activeProgrammeId', async () => {
    testDatabase = createTestDatabase('bootstrap-mismatch');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T10:00:00.000Z'),
    });

    const storedAppMeta = await testDatabase.db.appMeta.get('app-meta');

    if (storedAppMeta === undefined) {
      throw new Error('App metadata is missing after initial bootstrap.');
    }

    await testDatabase.db.appMeta.put({
      ...storedAppMeta,
      activeProgrammeId: 'other-programme',
    });

    await expect(
      initializeDatabase({
        db: testDatabase.db,
        now: createClock('2026-06-11T10:05:00.000Z'),
      }),
    ).rejects.toThrow(/does not match the registered programme/i);
  });

  it('D1-B: fails closed on a current database missing its active-programme enrolment', async () => {
    testDatabase = createTestDatabase('bootstrap-missing-enrolment');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T10:00:00.000Z'),
    });

    await testDatabase.db.programmeEnrolments.delete(
      testDatabase.db.migrationContext.programmeId,
    );

    await expect(
      initializeDatabase({
        db: testDatabase.db,
        now: createClock('2026-06-11T10:05:00.000Z'),
      }),
    ).rejects.toThrow(/no enrolment exists for active programme/i);
  });

  it('D1-C: a valid current database remains a no-op idempotent bootstrap', async () => {
    testDatabase = createTestDatabase('bootstrap-idempotent');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T10:00:00.000Z'),
    });

    const firstAppMeta = await getAppMeta({ db: testDatabase.db });

    await initializeDatabase({
      db: testDatabase.db,
      // A clock that would prove a write happened by producing a different
      // `updatedAt` if `ensureBaseInitialization` wrote anything.
      now: createClock('2026-06-11T11:00:00.000Z'),
    });

    const secondAppMeta = await getAppMeta({ db: testDatabase.db });

    expect(secondAppMeta).toEqual(firstAppMeta);
  });
});
