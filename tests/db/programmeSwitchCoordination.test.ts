import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  enrolAndSwitchActiveProgramme,
  ensureCourseCatalogFromSeed,
  getAppMeta,
  getDatabaseSnapshot,
  initializeDatabase,
  switchActiveProgramme,
  type ProgressPalDatabase,
} from '@/lib/db';
import {
  beginLocalWrite,
  captureLocalDataRevision,
  getLocalCoordinationStatus,
  markLocalDataSynchronized,
  startLocalDataCoordination,
} from '@/lib/storage';
import { bundledCourseSeed } from '@/seed';

import {
  altProgrammeId,
  altSeed,
  bothCataloguesMigrationContext,
  cs50ProgrammeId,
} from '../programmes/c7Fixture';
import { createTestDatabase, type TestDatabaseContext } from './testDatabase';

/**
 * Epic C / C7 coordination evidence under the real local-data coordinator
 * (not the uncoordinated test lease). The coordinator marks a tab stale after
 * any committed write, its own included, and a stale tab may not begin
 * another write until it acknowledges the new revision. A programme switch
 * must therefore spend exactly one coordinated write scope, and a switch that
 * writes nothing must not manufacture a revision.
 */

const t0 = '2026-09-30T08:00:00.000Z';
const t1 = '2026-09-30T09:00:00.000Z';
const t2 = '2026-09-30T10:00:00.000Z';

const databases: TestDatabaseContext[] = [];
let session: ReturnType<typeof startLocalDataCoordination> | null = null;

afterEach(async () => {
  session?.stop();
  session = null;
  vi.restoreAllMocks();
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

async function coordinatedDevice(options: { materializeAlternate: boolean }) {
  const context = createTestDatabase(
    'c7-coordination',
    bothCataloguesMigrationContext,
  );
  databases.push(context);
  await initializeDatabase({
    db: context.db,
    now: () => t0,
    seed: bundledCourseSeed,
  });

  if (options.materializeAlternate) {
    await ensureCourseCatalogFromSeed(altSeed, {
      db: context.db,
      now: () => t0,
    });
  }

  session = startLocalDataCoordination(() => undefined);
  await session.ready;
  acknowledge();
  expect(getLocalCoordinationStatus().canWrite).toBe(true);

  return context;
}

function acknowledge() {
  expect(markLocalDataSynchronized(captureLocalDataRevision())).toBe(true);
}

type HookableTable = {
  hook: (
    event: 'creating' | 'updating',
    subscriber?: () => void,
  ) => { unsubscribe: (subscriber: () => void) => void } | void;
};

function recordWriteOrder(db: ProgressPalDatabase) {
  const events: string[] = [];
  const stops: Array<() => void> = [];
  const watch = (
    table: HookableTable,
    event: 'creating' | 'updating',
    label: string,
  ) => {
    const subscriber = () => {
      events.push(label);
    };

    table.hook(event, subscriber);
    stops.push(() => {
      (
        table.hook(event) as { unsubscribe: (fn: () => void) => void }
      ).unsubscribe(subscriber);
    });
  };

  watch(db.courseUnits as unknown as HookableTable, 'creating', 'catalogue');
  watch(
    db.programmeEnrolments as unknown as HookableTable,
    'creating',
    'enrolment',
  );
  watch(db.appMeta as unknown as HookableTable, 'updating', 'active-programme');

  return { events, stop: () => stops.forEach((stop) => stop()) };
}

describe('first switch to a programme that is not materialized yet', () => {
  it('prepares the catalogue, then commits enrolment and active programme in one coordinated write', async () => {
    const consoleError = vi.spyOn(console, 'error');
    const { db } = await coordinatedDevice({ materializeAlternate: false });
    expect(
      (await getDatabaseSnapshot({ db })).courseUnits.some(
        (unit) => unit.courseId === altSeed.courseId,
      ),
    ).toBe(false);
    const revisionBefore = getLocalCoordinationStatus().revision;
    const writes = recordWriteOrder(db);

    try {
      await enrolAndSwitchActiveProgramme(altProgrammeId, {
        db,
        now: () => t1,
        seed: altSeed,
      });
    } finally {
      writes.stop();
    }

    // The catalogue exists before the active programme changes.
    expect(writes.events[0]).toBe('catalogue');
    expect(writes.events.slice(-2).sort()).toEqual(
      ['active-programme', 'enrolment'].sort(),
    );
    const after = await getDatabaseSnapshot({ db });
    expect(after.appMeta?.activeProgrammeId).toBe(altProgrammeId);
    expect(
      after.programmeEnrolments.map((row) => row.programmeId).sort(),
    ).toEqual([cs50ProgrammeId, altProgrammeId].sort());
    expect(
      after.courseUnits.filter((unit) => unit.courseId === altSeed.courseId),
    ).toHaveLength(altSeed.units.length);
    // Exactly one coordinated write scope: one revision, no self-blocking.
    expect(getLocalCoordinationStatus().revision).toBe(revisionBefore + 1);

    // After acknowledging its own write the tab can switch back to A.
    acknowledge();
    await switchActiveProgramme(cs50ProgrammeId, {
      db,
      now: () => t2,
      seed: bundledCourseSeed,
    });
    expect((await getAppMeta({ db }))?.activeProgrammeId).toBe(cs50ProgrammeId);
    expect(getLocalCoordinationStatus().revision).toBe(revisionBefore + 2);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('does not bump the revision for a same-programme switch', async () => {
    const { db } = await coordinatedDevice({ materializeAlternate: true });
    const revisionBefore = getLocalCoordinationStatus().revision;

    await switchActiveProgramme(cs50ProgrammeId, {
      db,
      now: () => '2099-01-01T00:00:00.000Z',
      seed: bundledCourseSeed,
    });

    expect(getLocalCoordinationStatus().revision).toBe(revisionBefore);
  });
});

describe('a switch that loses a race must not manufacture a revision', () => {
  it('rechecks the active programme inside its transaction without writing a revision when it is already the target', async () => {
    const { db } = await coordinatedDevice({ materializeAlternate: true });
    let releaseGate: () => void = () => undefined;
    const gateReleased = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });

    // Hold the stores the target-catalogue preparation needs, so a second
    // switch passes its pre-check (sees A) and then waits.
    const gate = db.transaction(
      'rw',
      [
        db.courseUnits,
        db.courseItems,
        db.catalogueVersions,
        db.contentAssets,
        db.contentSlices,
        db.mediaProgressEvents,
        db.resumePoints,
      ],
      async () => {
        await db.courseUnits.count();
        await Dexie.waitFor(gateReleased);
      },
    );
    const late = enrolAndSwitchActiveProgramme(altProgrammeId, {
      db,
      now: () => t2,
      seed: altSeed,
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Meanwhile an earlier switch in this same tab commits through the
    // coordinator and the tab acknowledges its own revision.
    const lease = beginLocalWrite();
    await db.transaction('rw', db.appMeta, db.programmeEnrolments, async () => {
      const appMeta = await db.appMeta.get('app-meta');
      await db.programmeEnrolments.put({
        programmeId: altProgrammeId,
        enrolledAt: t1,
      });
      await db.appMeta.put({
        ...appMeta!,
        activeProgrammeId: altProgrammeId,
        updatedAt: t1,
      });
    });
    lease.complete();
    acknowledge();
    const revisionBefore = getLocalCoordinationStatus().revision;
    // Only the stores the gate does not hold: a full snapshot would wait on it.
    const read = async () => ({
      appMeta: await db.appMeta.get('app-meta'),
      enrolments: await db.programmeEnrolments.toArray(),
    });
    const before = await read();

    releaseGate();
    await gate;
    await late;

    expect(await read()).toEqual(before);
    expect(getLocalCoordinationStatus().revision).toBe(revisionBefore);
  });
});
