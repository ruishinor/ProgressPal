import { afterEach, describe, expect, it } from 'vitest';

import {
  addStudySession,
  defaultLearnerProfileValues,
  enrolAndSwitchActiveProgramme,
  enrolInProgramme,
  ensureCourseCatalogFromSeed,
  getAppMeta,
  getDatabaseSnapshot,
  initializeDatabase,
  listProgrammeEnrolments,
  resetAllData,
  restoreDatabaseFromBackup,
  saveLearnerProfile,
  switchActiveProgramme,
  upsertProgressAndAwardXp,
} from '@/lib/db';
import type { ProgressPalDatabase } from '@/lib/db';
import type { DatabaseSnapshot } from '@/lib/db';
import { bundledCourseSeed } from '@/seed';

import {
  altProgrammeId,
  altSeed,
  bothCataloguesMigrationContext,
  cs50CourseId,
  cs50ProgrammeId,
} from '../programmes/c7Fixture';
import { forceAlternateActive } from '../programmes/c7Device';
import { cs50CatalogueId, cs50Policy } from '../programmes/cs50Policy';
import {
  createTestDatabase,
  defaultTestMigrationContext,
  type TestDatabaseContext,
} from './testDatabase';

/**
 * Epic C / C7 persistence contract: explicit enrolment, explicit switching,
 * atomic enrol-and-switch, failed-switch safety, the stronger existing-v3
 * active-programme invariant, global learner state staying global, and
 * reset/restore semantics once a non-default programme can be active.
 */

const t0 = '2026-09-30T08:00:00.000Z';
const t1 = '2026-09-30T09:00:00.000Z';
const t2 = '2026-09-30T10:00:00.000Z';

const databases: TestDatabaseContext[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

/** A two-catalogue device: CS50 active and materialized, B materialized. */
async function createBothProgrammesDevice(label: string) {
  const context = createTestDatabase(label, bothCataloguesMigrationContext);
  databases.push(context);
  await initializeDatabase({
    db: context.db,
    seed: bundledCourseSeed,
    now: () => t0,
  });
  await ensureCourseCatalogFromSeed(altSeed, { db: context.db, now: () => t0 });

  return context;
}

async function activeProgrammeId(db: ProgressPalDatabase) {
  return (await getAppMeta({ db }))?.activeProgrammeId;
}

async function enrolledProgrammeIds(db: ProgressPalDatabase) {
  return (await listProgrammeEnrolments({ db }))
    .map((enrolment) => enrolment.programmeId)
    .sort();
}

function failNextWrite(
  table:
    | ProgressPalDatabase['appMeta']
    | ProgressPalDatabase['programmeEnrolments'],
  event: 'creating' | 'updating',
) {
  const hook = () => {
    throw new Error(`Forced ${event} failure`);
  };

  // Dexie hook typing is event-specific; the throw aborts the transaction.
  (table.hook as (name: string, fn: () => void) => void)(event, hook);

  return () =>
    (
      table.hook as unknown as (name: string) => {
        unsubscribe: (fn: () => void) => void;
      }
    )(event).unsubscribe(hook);
}

describe('existing-v3 active-programme invariant (C7 replaces the single-programme equality)', () => {
  it('accepts an authorized, enrolled, non-default active programme', async () => {
    const context = await createBothProgrammesDevice('c7-active-b-valid');
    await forceAlternateActive(context.db);

    await expect(
      initializeDatabase({ db: context.db, seed: altSeed, now: () => t2 }),
    ).resolves.toMatchObject({
      appMeta: { activeProgrammeId: altProgrammeId },
      createdAppMeta: false,
    });
    expect(await activeProgrammeId(context.db)).toBe(altProgrammeId);
  });

  it('still fails closed on an active programme the database does not authorize', async () => {
    const context = await createBothProgrammesDevice('c7-active-unknown');
    const appMeta = await context.db.appMeta.get('app-meta');
    await context.db.appMeta.put({
      ...appMeta!,
      activeProgrammeId: 'unauthorized-programme',
    });

    await expect(
      initializeDatabase({ db: context.db, now: () => t2 }),
    ).rejects.toThrow(/does not match the registered programme/i);
  });

  it('still fails closed on an authorized active programme with no enrolment, on a no-op bootstrap path', async () => {
    const context = await createBothProgrammesDevice('c7-active-unenrolled');
    await forceAlternateActive(context.db, { enrol: false });

    await expect(
      initializeDatabase({ db: context.db, now: () => t2 }),
    ).rejects.toThrow(/no enrolment exists for active programme/i);
    expect(await enrolledProgrammeIds(context.db)).toEqual([cs50ProgrammeId]);
  });
});

describe('explicit enrolment', () => {
  it('persists an enrolment for an authorized programme and is idempotent', async () => {
    const context = await createBothProgrammesDevice('c7-enrol');

    const first = await enrolInProgramme(altProgrammeId, {
      db: context.db,
      now: () => t1,
    });
    const second = await enrolInProgramme(altProgrammeId, {
      db: context.db,
      now: () => t2,
    });

    expect(first).toEqual({ programmeId: altProgrammeId, enrolledAt: t1 });
    expect(second).toEqual(first);
    expect(await enrolledProgrammeIds(context.db)).toEqual(
      [cs50ProgrammeId, altProgrammeId].sort(),
    );
    // Enrolment never changes which programme is active.
    expect(await activeProgrammeId(context.db)).toBe(cs50ProgrammeId);
  });

  it('rejects an unregistered enrolment target without writing', async () => {
    const context = await createBothProgrammesDevice('c7-enrol-ghost');
    const before = await getDatabaseSnapshot({ db: context.db });

    await expect(
      enrolInProgramme('ghost-programme', { db: context.db, now: () => t1 }),
    ).rejects.toThrow(/not an authorized programme/i);
    expect(await getDatabaseSnapshot({ db: context.db })).toEqual(before);
  });
});

describe('explicit switching', () => {
  it('rejects an unregistered switch target before changing anything', async () => {
    const context = await createBothProgrammesDevice('c7-switch-ghost');
    const before = await getDatabaseSnapshot({ db: context.db });

    await expect(
      switchActiveProgramme('ghost-programme', {
        db: context.db,
        now: () => t1,
        seed: altSeed,
      }),
    ).rejects.toThrow(/not an authorized programme/i);
    expect(await getDatabaseSnapshot({ db: context.db })).toEqual(before);
  });

  it('rejects a normal switch to a programme that is not enrolled and does not enrol implicitly', async () => {
    const context = await createBothProgrammesDevice('c7-switch-unenrolled');
    const before = await getDatabaseSnapshot({ db: context.db });

    await expect(
      switchActiveProgramme(altProgrammeId, {
        db: context.db,
        now: () => t1,
        seed: altSeed,
      }),
    ).rejects.toThrow(/not enrolled/i);
    expect(await getDatabaseSnapshot({ db: context.db })).toEqual(before);
  });

  it('rejects a seed that does not belong to the target programme', async () => {
    const context = await createBothProgrammesDevice('c7-switch-wrong-seed');
    await enrolInProgramme(altProgrammeId, { db: context.db, now: () => t1 });
    const before = await getDatabaseSnapshot({ db: context.db });

    await expect(
      switchActiveProgramme(altProgrammeId, {
        db: context.db,
        now: () => t2,
        seed: bundledCourseSeed,
      }),
    ).rejects.toThrow(/does not belong to programme/i);
    expect(await getDatabaseSnapshot({ db: context.db })).toEqual(before);
  });

  it('switches A → B → A through enrolment and persists the active programme each time', async () => {
    const context = await createBothProgrammesDevice('c7-switch-roundtrip');
    await enrolInProgramme(altProgrammeId, { db: context.db, now: () => t1 });

    const toB = await switchActiveProgramme(altProgrammeId, {
      db: context.db,
      now: () => t1,
      seed: altSeed,
    });
    expect(toB.activeProgrammeId).toBe(altProgrammeId);
    expect(await activeProgrammeId(context.db)).toBe(altProgrammeId);

    const backToA = await switchActiveProgramme(cs50ProgrammeId, {
      db: context.db,
      now: () => t2,
      seed: bundledCourseSeed,
    });
    expect(backToA.activeProgrammeId).toBe(cs50ProgrammeId);
    expect(await activeProgrammeId(context.db)).toBe(cs50ProgrammeId);
    expect(await enrolledProgrammeIds(context.db)).toEqual(
      [cs50ProgrammeId, altProgrammeId].sort(),
    );
  });

  it('treats a switch to the already active programme as a semantic no-op', async () => {
    const context = await createBothProgrammesDevice('c7-switch-noop');
    const before = await getDatabaseSnapshot({ db: context.db });

    const result = await switchActiveProgramme(cs50ProgrammeId, {
      db: context.db,
      // A clock that would visibly change `updatedAt` if anything were written.
      now: () => '2099-01-01T00:00:00.000Z',
      seed: bundledCourseSeed,
    });

    expect(result).toEqual(before.appMeta);
    expect(await getDatabaseSnapshot({ db: context.db })).toEqual(before);
  });

  it('enrols and switches in one explicit action', async () => {
    const context = await createBothProgrammesDevice('c7-enrol-and-switch');

    const result = await enrolAndSwitchActiveProgramme(altProgrammeId, {
      db: context.db,
      now: () => t1,
      seed: altSeed,
    });

    expect(result.activeProgrammeId).toBe(altProgrammeId);
    expect(await activeProgrammeId(context.db)).toBe(altProgrammeId);
    expect(await enrolledProgrammeIds(context.db)).toEqual(
      [cs50ProgrammeId, altProgrammeId].sort(),
    );
  });

  it('commits enrolment and the active-programme change in one transaction', async () => {
    const context = await createBothProgrammesDevice('c7-atomic-appmeta');
    const before = await getDatabaseSnapshot({ db: context.db });
    const restore = failNextWrite(context.db.appMeta, 'updating');

    try {
      await expect(
        enrolAndSwitchActiveProgramme(altProgrammeId, {
          db: context.db,
          now: () => t1,
          seed: altSeed,
        }),
      ).rejects.toThrow(/Forced updating failure/);
    } finally {
      restore();
    }

    // The enrolment must have rolled back with the failed active update.
    expect(await enrolledProgrammeIds(context.db)).toEqual([cs50ProgrammeId]);
    expect(await activeProgrammeId(context.db)).toBe(cs50ProgrammeId);
    expect(await getDatabaseSnapshot({ db: context.db })).toEqual(before);
  });

  it('never leaves the active programme changed when the enrolment write fails', async () => {
    const context = await createBothProgrammesDevice('c7-atomic-enrolment');
    const restore = failNextWrite(context.db.programmeEnrolments, 'creating');

    try {
      await expect(
        enrolAndSwitchActiveProgramme(altProgrammeId, {
          db: context.db,
          now: () => t1,
          seed: altSeed,
        }),
      ).rejects.toThrow(/Forced creating failure/);
    } finally {
      restore();
    }

    expect(await activeProgrammeId(context.db)).toBe(cs50ProgrammeId);
    expect(await enrolledProgrammeIds(context.db)).toEqual([cs50ProgrammeId]);
  });

  it('keeps the previous active programme when the target catalogue cannot be prepared', async () => {
    const context = await createBothProgrammesDevice('c7-switch-prep-fails');
    // The device already synced a newer edition of B; the older seed offered
    // for the switch is rejected by the monotonic catalogue sync.
    await ensureCourseCatalogFromSeed(
      { ...altSeed, dataVersion: 2 },
      { db: context.db, now: () => t0 },
    );
    await enrolInProgramme(altProgrammeId, { db: context.db, now: () => t1 });
    const before = await getDatabaseSnapshot({ db: context.db });

    await expect(
      switchActiveProgramme(altProgrammeId, {
        db: context.db,
        now: () => t2,
        seed: altSeed,
      }),
    ).rejects.toThrow(/lower than the synced version/i);
    expect(await activeProgrammeId(context.db)).toBe(cs50ProgrammeId);

    await expect(
      enrolAndSwitchActiveProgramme(altProgrammeId, {
        db: context.db,
        now: () => t2,
        seed: altSeed,
      }),
    ).rejects.toThrow(/lower than the synced version/i);
    expect(await getDatabaseSnapshot({ db: context.db })).toEqual(before);
  });

  it('materializes a not-yet-synced target catalogue before committing the switch', async () => {
    const context = createTestDatabase(
      'c7-switch-prepares-target',
      bothCataloguesMigrationContext,
    );
    databases.push(context);
    await initializeDatabase({
      db: context.db,
      seed: bundledCourseSeed,
      now: () => t0,
    });
    expect(
      (await getDatabaseSnapshot({ db: context.db })).courseUnits.some(
        (unit) => unit.courseId === altSeed.courseId,
      ),
    ).toBe(false);

    await enrolAndSwitchActiveProgramme(altProgrammeId, {
      db: context.db,
      now: () => t1,
      seed: altSeed,
    });

    const after = await getDatabaseSnapshot({ db: context.db });
    expect(
      after.courseUnits.filter((unit) => unit.courseId === altSeed.courseId),
    ).toHaveLength(altSeed.units.length);
    expect(
      after.catalogueVersions.map((version) => version.courseId).sort(),
    ).toEqual([cs50CourseId, altSeed.courseId].sort());
  });
});

describe('global learner state stays global across a switch', () => {
  it('does not create, change or delete XP, unlocks, sessions, progress or profile', async () => {
    const context = await createBothProgrammesDevice('c7-global-isolation');
    await saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        displayName: 'C7 Synthetic Learner',
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      { completeOnboarding: true, db: context.db, now: () => t0 },
    );
    await upsertProgressAndAwardXp(
      { confidence: 3, itemId: 'week-0-lecture', status: 'completed' },
      {
        catalogueId: cs50CatalogueId,
        db: context.db,
        now: () => t0,
        policy: cs50Policy,
      },
    );
    await addStudySession(
      {
        durationMinutes: 30,
        endedAt: '2026-09-30T07:30:00.000Z',
        itemId: 'week-0-lecture',
        mode: 'watching',
        startedAt: '2026-09-30T07:00:00.000Z',
        unitId: 'week-0',
      },
      { db: context.db, now: () => t0 },
    );
    const before = await getDatabaseSnapshot({ db: context.db });
    expect(before.xpTransactions.length).toBeGreaterThan(0);
    expect(before.achievementUnlocks.length).toBeGreaterThan(0);
    expect(before.studySessions).toHaveLength(1);

    await enrolAndSwitchActiveProgramme(altProgrammeId, {
      db: context.db,
      now: () => t1,
      seed: altSeed,
    });
    const afterSwitch = await getDatabaseSnapshot({ db: context.db });
    await switchActiveProgramme(cs50ProgrammeId, {
      db: context.db,
      now: () => t2,
      seed: bundledCourseSeed,
    });
    const afterBack = await getDatabaseSnapshot({ db: context.db });

    for (const after of [afterSwitch, afterBack]) {
      expect(after.xpTransactions).toEqual(before.xpTransactions);
      expect(after.achievementUnlocks).toEqual(before.achievementUnlocks);
      expect(after.studySessions).toEqual(before.studySessions);
      expect(after.progressEntries).toEqual(before.progressEntries);
      expect(after.learnerProfile).toEqual(before.learnerProfile);
      expect(after.mediaProgressEvents).toEqual(before.mediaProgressEvents);
      expect(after.catalogueVersions).toEqual(before.catalogueVersions);
      expect(after.courseUnits).toEqual(before.courseUnits);
      expect(after.courseItems).toEqual(before.courseItems);
      expect(after.backups).toEqual(before.backups);
    }
    expect(afterSwitch.appMeta).toEqual({
      ...before.appMeta,
      activeProgrammeId: altProgrammeId,
      updatedAt: t1,
    });
    expect(afterBack.appMeta).toEqual({
      ...before.appMeta,
      activeProgrammeId: cs50ProgrammeId,
      updatedAt: t2,
    });
  });
});

describe('reset and restore once a non-default programme can be active', () => {
  it('reset from a B-active database ends in the explicit default programme without B state', async () => {
    const context = await createBothProgrammesDevice('c7-reset-from-b');
    await forceAlternateActive(context.db);

    await resetAllData({ db: context.db, now: () => t2 });

    const after = await getDatabaseSnapshot({ db: context.db });
    expect(after.appMeta?.activeProgrammeId).toBe(cs50ProgrammeId);
    expect(after.programmeEnrolments.map((row) => row.programmeId)).toEqual([
      cs50ProgrammeId,
    ]);
    expect(after.courseUnits).toEqual([]);
    expect(after.catalogueVersions).toEqual([]);
  });

  async function bActiveSnapshot(label: string): Promise<DatabaseSnapshot> {
    const source = await createBothProgrammesDevice(label);
    await forceAlternateActive(source.db);

    return getDatabaseSnapshot({ db: source.db });
  }

  it('restores an authorized, enrolled B-active schema-v3 snapshot and keeps B active', async () => {
    const snapshot = await bActiveSnapshot('c7-restore-source');
    const target = createTestDatabase(
      'c7-restore-target',
      bothCataloguesMigrationContext,
    );
    databases.push(target);

    const restored = await restoreDatabaseFromBackup(snapshot, {
      db: target.db,
      fileName: 'c7-b-active.json',
      now: () => t2,
    });

    expect(restored.appMeta?.activeProgrammeId).toBe(altProgrammeId);
    expect(
      restored.programmeEnrolments.map((row) => row.programmeId).sort(),
    ).toEqual([cs50ProgrammeId, altProgrammeId].sort());
    expect(await activeProgrammeId(target.db)).toBe(altProgrammeId);
  });

  it('does not reseed a catalogue the restored snapshot does not contain', async () => {
    const source = await createBothProgrammesDevice('c7-restore-noseed-source');
    await forceAlternateActive(source.db);
    const full = await getDatabaseSnapshot({ db: source.db });
    // A snapshot holding only B's catalogue and enrolment.
    const onlyB: DatabaseSnapshot = {
      ...full,
      catalogueVersions: full.catalogueVersions.filter(
        (version) => version.courseId === altSeed.courseId,
      ),
      contentAssets: [],
      contentSlices: [],
      courseItems: full.courseItems.filter((item) =>
        altSeed.units.some((unit) => unit.id === item.unitId),
      ),
      courseUnits: full.courseUnits.filter(
        (unit) => unit.courseId === altSeed.courseId,
      ),
      programmeEnrolments: full.programmeEnrolments.filter(
        (row) => row.programmeId === altProgrammeId,
      ),
    };
    const target = createTestDatabase(
      'c7-restore-noseed-target',
      bothCataloguesMigrationContext,
    );
    databases.push(target);

    const restored = await restoreDatabaseFromBackup(onlyB, {
      db: target.db,
      now: () => t2,
    });

    expect(restored.appMeta?.activeProgrammeId).toBe(altProgrammeId);
    expect(
      restored.courseUnits.every((unit) => unit.courseId === altSeed.courseId),
    ).toBe(true);
    expect(
      restored.catalogueVersions.map((version) => version.courseId),
    ).toEqual([altSeed.courseId]);
  });

  it('still rejects an unauthorized active programme in a snapshot', async () => {
    const snapshot = await bActiveSnapshot('c7-restore-unauthorized-source');
    const forged: DatabaseSnapshot = {
      ...snapshot,
      appMeta: { ...snapshot.appMeta!, activeProgrammeId: 'ghost-programme' },
      programmeEnrolments: [
        ...snapshot.programmeEnrolments,
        { programmeId: 'ghost-programme', enrolledAt: t1 },
      ],
    };
    const target = createTestDatabase(
      'c7-restore-unauthorized-target',
      bothCataloguesMigrationContext,
    );
    databases.push(target);

    await expect(
      restoreDatabaseFromBackup(forged, { db: target.db }),
    ).rejects.toThrow(/unregistered (active )?programme/i);
  });

  it('still rejects a B-active snapshot that has no B enrolment', async () => {
    const snapshot = await bActiveSnapshot('c7-restore-unenrolled-source');
    const unenrolled: DatabaseSnapshot = {
      ...snapshot,
      programmeEnrolments: snapshot.programmeEnrolments.filter(
        (row) => row.programmeId !== altProgrammeId,
      ),
    };
    const target = createTestDatabase(
      'c7-restore-unenrolled-target',
      bothCataloguesMigrationContext,
    );
    databases.push(target);

    await expect(
      restoreDatabaseFromBackup(unenrolled, { db: target.db }),
    ).rejects.toThrow(/no enrolment for its active programme/i);
  });

  it('rejects a B-active snapshot on a device that only authorizes CS50', async () => {
    const snapshot = await bActiveSnapshot('c7-restore-cs50only-source');
    const target = createTestDatabase(
      'c7-restore-cs50only-target',
      defaultTestMigrationContext,
    );
    databases.push(target);

    await expect(
      restoreDatabaseFromBackup(snapshot, { db: target.db }),
    ).rejects.toThrow(/unregistered/i);
  });
});
