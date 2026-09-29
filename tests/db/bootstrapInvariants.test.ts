import { afterEach, describe, expect, it } from 'vitest';

import {
  addStudySessionAndAwardXp,
  getAppMeta,
  initializeDatabase,
  logMediaProgressAndAwardXp,
  upsertProgressAndAwardXp,
} from '@/lib/db';

import { cs50CatalogueId, cs50Policy } from '../programmes/cs50Policy';
import {
  createClock,
  createTestDatabase,
  sampleCourseSeed,
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

/**
 * Owner-review C6-R RED checkpoint (D1b): the D1 fix guarded the enrolment
 * read with `canCheckEnrolmentHere` (skip when the ambient transaction
 * omits `programme_enrolments`) so `ensureBaseInitialization` would not
 * throw "Table not included in parent transaction" when nested. That guard
 * means the invariant is skipped, not enforced, whenever a real compound
 * write function's own transaction omits `programme_enrolments` - which
 * `upsertProgressAndAwardXp`, `logMediaProgressAndAwardXp`, and
 * `addStudySessionAndAwardXp` all currently do (each opens a transaction
 * over its feature stores plus `app_meta`/`learner_profile`, then calls a
 * lower-level repository function that invokes `ensureBaseInitialization`
 * nested inside it). A current valid v3 database whose active-programme
 * enrolment is removed should still fail closed when any of these compound
 * paths runs, exactly like D1-B already proves for a direct
 * `initializeDatabase` call.
 */
describe('database bootstrap invariants (Epic C6-R, D1b)', () => {
  let testDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
    await testDatabase?.cleanup();
    testDatabase = null;
  });

  it('D1b-A: upsertProgressAndAwardXp fails closed on a missing active-programme enrolment', async () => {
    testDatabase = createTestDatabase('d1b-progress');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T10:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    await testDatabase.db.programmeEnrolments.delete(
      testDatabase.db.migrationContext.programmeId,
    );

    await expect(
      upsertProgressAndAwardXp(
        { itemId: 'week-0-lecture', status: 'started', confidence: 3 },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-11T10:05:00.000Z'),
        },
      ),
    ).rejects.toThrow(/no enrolment exists for active programme/i);

    const persisted = await testDatabase.db.progressEntries
      .where('itemId')
      .equals('week-0-lecture')
      .first();

    expect(persisted).toBeUndefined();
    // No XP was awarded for the rejected attempt.
    expect(await testDatabase.db.xpTransactions.count()).toBe(0);
    // The missing enrolment is not silently repaired by the failed attempt.
    expect(
      await testDatabase.db.programmeEnrolments.get(
        testDatabase.db.migrationContext.programmeId,
      ),
    ).toBeUndefined();
  });

  it('D1b-B: logMediaProgressAndAwardXp fails closed on a missing active-programme enrolment', async () => {
    testDatabase = createTestDatabase('d1b-media');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T10:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    await testDatabase.db.programmeEnrolments.delete(
      testDatabase.db.migrationContext.programmeId,
    );

    await expect(
      logMediaProgressAndAwardXp(
        {
          assetId: 'week-0-lecture-asset',
          startSecond: 0,
          endSecond: 600,
          energyBefore: 4,
          energyAfter: 4,
          stoppedBecause: 'interruption',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-11T10:05:00.000Z'),
        },
      ),
    ).rejects.toThrow(/no enrolment exists for active programme/i);

    const persisted = await testDatabase.db.mediaProgressEvents
      .where('assetId')
      .equals('week-0-lecture-asset')
      .first();

    expect(persisted).toBeUndefined();
    // No XP was awarded for the rejected attempt.
    expect(await testDatabase.db.xpTransactions.count()).toBe(0);
    // The missing enrolment is not silently repaired by the failed attempt.
    expect(
      await testDatabase.db.programmeEnrolments.get(
        testDatabase.db.migrationContext.programmeId,
      ),
    ).toBeUndefined();
  });

  it('D1b-C: addStudySessionAndAwardXp fails closed on a missing active-programme enrolment', async () => {
    testDatabase = createTestDatabase('d1b-session');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T10:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    await testDatabase.db.programmeEnrolments.delete(
      testDatabase.db.migrationContext.programmeId,
    );

    await expect(
      addStudySessionAndAwardXp(
        {
          id: 'session-d1b',
          unitId: 'week-0',
          itemId: 'week-0-lecture',
          startedAt: '2026-06-11T10:10:00.000Z',
          endedAt: '2026-06-11T10:40:00.000Z',
          durationMinutes: 30,
          mode: 'watching',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-11T10:40:00.000Z'),
        },
      ),
    ).rejects.toThrow(/no enrolment exists for active programme/i);

    const persisted = await testDatabase.db.studySessions.get('session-d1b');

    expect(persisted).toBeUndefined();
    // No XP was awarded for the rejected attempt.
    expect(await testDatabase.db.xpTransactions.count()).toBe(0);
    // The missing enrolment is not silently repaired by the failed attempt.
    expect(
      await testDatabase.db.programmeEnrolments.get(
        testDatabase.db.migrationContext.programmeId,
      ),
    ).toBeUndefined();
  });

  it('D1b (valid-state regression): all three compound paths still succeed with a valid enrolment', async () => {
    testDatabase = createTestDatabase('d1b-valid-state');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T10:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    const progressResult = await upsertProgressAndAwardXp(
      { itemId: 'week-0-lecture', status: 'started', confidence: 3 },
      {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: testDatabase.db,
        now: createClock('2026-06-11T10:05:00.000Z'),
      },
    );
    expect(progressResult.progressEntry.itemId).toBe('week-0-lecture');

    const mediaResult = await logMediaProgressAndAwardXp(
      {
        assetId: 'week-0-lecture-asset',
        startSecond: 0,
        endSecond: 600,
        energyBefore: 4,
        energyAfter: 4,
        stoppedBecause: 'interruption',
      },
      {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: testDatabase.db,
        now: createClock('2026-06-11T10:10:00.000Z'),
      },
    );
    expect(mediaResult.event.assetId).toBe('week-0-lecture-asset');

    const sessionResult = await addStudySessionAndAwardXp(
      {
        id: 'session-valid-state',
        unitId: 'week-0',
        itemId: 'week-0-lecture',
        startedAt: '2026-06-11T10:10:00.000Z',
        endedAt: '2026-06-11T10:40:00.000Z',
        durationMinutes: 30,
        mode: 'watching',
      },
      {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: testDatabase.db,
        now: createClock('2026-06-11T10:40:00.000Z'),
      },
    );
    expect(sessionResult.studySession?.id).toBe('session-valid-state');
    expect(sessionResult.awardedTransactions).toHaveLength(1);
  });
});

/**
 * Owner-review C6-R RED checkpoint (D1c): `addStudySessionAndAwardXp`'s
 * existing-session branch (`input.id` already present in `studySessions`)
 * assigns `studySession = existing` and skips `addStudySession(...)`
 * entirely - the only place in this function that calls
 * `ensureBaseInitialization`. When the existing session is below the
 * 25-minute XP threshold, the XP-award branch is also skipped, so
 * `addXpTransaction` (which also calls `ensureBaseInitialization`) is never
 * reached either. A repeat call with the same session ID therefore never
 * invokes `ensureBaseInitialization` anywhere, bypassing the D1/D1b
 * enrolment invariant completely, even on a database whose active-programme
 * enrolment was removed after the session was first created.
 */
describe('database bootstrap invariants (Epic C6-R, D1c)', () => {
  let testDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
    await testDatabase?.cleanup();
    testDatabase = null;
  });

  it('D1c-A: repeating an existing short (non-XP-qualifying) session fails closed on a missing active-programme enrolment', async () => {
    testDatabase = createTestDatabase('d1c-existing-short-session');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T10:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    // A legitimate short session, created while the enrolment is still
    // valid - well under the 25-minute XP threshold, so a repeat call
    // cannot accidentally be rescued by the XP-award branch calling
    // addXpTransaction (which itself calls ensureBaseInitialization).
    const firstCall = await addStudySessionAndAwardXp(
      {
        id: 'session-d1c-short',
        unitId: 'week-0',
        itemId: 'week-0-lecture',
        startedAt: '2026-06-11T10:05:00.000Z',
        endedAt: '2026-06-11T10:15:00.000Z',
        durationMinutes: 10,
        mode: 'watching',
      },
      {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: testDatabase.db,
        now: createClock('2026-06-11T10:15:00.000Z'),
      },
    );
    expect(firstCall.studySession?.id).toBe('session-d1c-short');
    expect(firstCall.awardedTransactions).toHaveLength(0);

    const persistedAfterFirstCall =
      await testDatabase.db.studySessions.get('session-d1c-short');
    expect(persistedAfterFirstCall).toBeDefined();

    await testDatabase.db.programmeEnrolments.delete(
      testDatabase.db.migrationContext.programmeId,
    );

    await expect(
      addStudySessionAndAwardXp(
        {
          id: 'session-d1c-short',
          unitId: 'week-0',
          itemId: 'week-0-lecture',
          startedAt: '2026-06-11T10:05:00.000Z',
          endedAt: '2026-06-11T10:15:00.000Z',
          durationMinutes: 10,
          mode: 'watching',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
          now: createClock('2026-06-11T10:20:00.000Z'),
        },
      ),
    ).rejects.toThrow(/no enrolment exists for active programme/i);

    const persistedAfterRepeatCall =
      await testDatabase.db.studySessions.get('session-d1c-short');
    expect(persistedAfterRepeatCall).toEqual(persistedAfterFirstCall);

    const xpTransactions = await testDatabase.db.xpTransactions
      .where('sourceId')
      .equals('session-d1c-short')
      .toArray();
    expect(xpTransactions).toHaveLength(0);

    // The missing enrolment is not silently repaired by the failed attempt.
    const enrolment = await testDatabase.db.programmeEnrolments.get(
      testDatabase.db.migrationContext.programmeId,
    );
    expect(enrolment).toBeUndefined();
  });

  it('D1c-B: repeating an existing qualifying session with a valid enrolment stays idempotent', async () => {
    testDatabase = createTestDatabase('d1c-existing-qualifying-session');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-11T10:00:00.000Z'),
      seed: sampleCourseSeed,
    });

    const input = {
      id: 'session-d1c-qualifying',
      unitId: 'week-0',
      itemId: 'week-0-lecture',
      startedAt: '2026-06-11T10:05:00.000Z',
      endedAt: '2026-06-11T10:35:00.000Z',
      durationMinutes: 30,
      mode: 'watching' as const,
    };
    const options = {
      catalogueId: cs50CatalogueId,
      policy: cs50Policy,
      db: testDatabase.db,
    };

    const firstCall = await addStudySessionAndAwardXp(input, {
      ...options,
      now: createClock('2026-06-11T10:35:00.000Z'),
    });
    expect(firstCall.awardedTransactions).toHaveLength(1);

    const repeatCall = await addStudySessionAndAwardXp(input, {
      ...options,
      now: createClock('2026-06-11T10:36:00.000Z'),
    });
    expect(repeatCall.awardedTransactions).toHaveLength(0);

    const sessions = await testDatabase.db.studySessions
      .where('id')
      .equals('session-d1c-qualifying')
      .toArray();
    expect(sessions).toHaveLength(1);

    const xpTransactions = await testDatabase.db.xpTransactions
      .where('sourceId')
      .equals('session-d1c-qualifying')
      .toArray();
    expect(xpTransactions).toHaveLength(1);
  });
});
