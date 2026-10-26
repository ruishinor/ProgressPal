import { afterEach, describe, expect, it } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import {
  buildBackupEnvelope,
  parseBackupFile,
  serializeBackupEnvelope,
  summarizeBackup,
} from '@/lib/backup';
import {
  currentApplicationVersion,
  enrolAndSwitchActiveProgramme,
  enrolInProgramme,
  getAppMeta,
  getDatabaseSnapshot,
  initializeDatabase,
  listAuthorizedProgrammeIds,
  listProgrammeEnrolments,
  recordEvaluationResult,
  resetAllData,
  restoreDatabaseFromBackup,
  saveLessonPosition,
  submitExerciseAttempt,
  switchActiveProgramme,
  upsertProgressAndAwardXp,
  type DatabaseSnapshot,
} from '@/lib/db';
import { getProgrammeRegistry } from '@/programmes';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

import { createTestDatabase, type TestDatabaseContext } from './testDatabase';
import { p2Index as manifest } from '../programmes/p2Content';

/**
 * Epic E §6 RED list, proven with the real production definition and the
 * real composition-root migration context (no synthetic second programme).
 */

const t0 = '2026-10-03T08:00:00.000Z';
const t1 = '2026-10-03T09:00:00.000Z';
const t2 = '2026-10-03T10:00:00.000Z';
const p2 = programvareutviklingDefinition;
const cs50 = getProgrammeRegistry().getDefault();
const firstSubject = manifest.exercises[0]!;

const databases: TestDatabaseContext[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

async function freshDevice(label: string) {
  const context = createTestDatabase(label, resolveDatabaseMigrationContext());
  databases.push(context);
  await initializeDatabase({
    db: context.db,
    seed: bundledCourseSeed,
    now: () => t0,
  });
  return context;
}

async function p2ActiveDevice(label: string) {
  const context = await freshDevice(label);
  await enrolAndSwitchActiveProgramme(p2.programmeId, {
    db: context.db,
    seed: p2.catalogue,
    now: () => t1,
  });
  return context;
}

function withoutAppMeta(snapshot: DatabaseSnapshot) {
  const rest: Partial<DatabaseSnapshot> = { ...snapshot };
  delete rest.appMeta;
  return rest;
}

describe('registration is not enrolment', () => {
  it('authorizes both production catalogues with CS50 as the bootstrap programme', () => {
    const context = resolveDatabaseMigrationContext();

    expect(context.programmeId).toBe('cs50x');
    expect(context.authorizedCatalogues).toEqual([
      { courseId: cs50.catalogue.courseId, programmeId: 'cs50x' },
      {
        courseId: 'programvareutvikling-2026',
        programmeId: 'programvareutvikling',
      },
    ]);
    expect(listAuthorizedProgrammeIds(context)).toEqual([
      'cs50x',
      'programvareutvikling',
    ]);
  });

  it('initializes a fresh device on CS50, enrolled only in CS50, with no Programvareutvikling rows', async () => {
    const context = await freshDevice('p2-fresh');
    const snapshot = await getDatabaseSnapshot({ db: context.db });

    expect(snapshot.appMeta?.activeProgrammeId).toBe('cs50x');
    expect(snapshot.programmeEnrolments.map((row) => row.programmeId)).toEqual([
      'cs50x',
    ]);
    expect(
      snapshot.courseUnits.filter(
        (unit) => unit.courseId === 'programvareutvikling-2026',
      ),
    ).toEqual([]);
    expect(snapshot.learnerEvidence).toEqual([]);
    expect(snapshot.lessonPositions).toEqual([]);
  });

  it('enrols explicitly without changing the active programme', async () => {
    const context = await freshDevice('p2-enrol');

    await enrolInProgramme(p2.programmeId, { db: context.db, now: () => t1 });

    expect((await getAppMeta({ db: context.db }))?.activeProgrammeId).toBe(
      'cs50x',
    );
    expect(
      (await listProgrammeEnrolments({ db: context.db })).map(
        (row) => row.programmeId,
      ),
    ).toEqual(['cs50x', 'programvareutvikling']);
  });
});

describe('enrol-and-switch and switching with the real definition', () => {
  it('materializes exactly 2 modules and 25 lessons and makes Programvareutvikling active', async () => {
    const context = await p2ActiveDevice('p2-enrol-switch');
    const snapshot = await getDatabaseSnapshot({ db: context.db });

    expect(snapshot.appMeta?.activeProgrammeId).toBe('programvareutvikling');
    const p2Units = snapshot.courseUnits.filter(
      (unit) => unit.courseId === 'programvareutvikling-2026',
    );
    expect(p2Units.map((unit) => [unit.id, unit.type])).toEqual([
      ['s1-m01', 'module'],
      ['s1-m02', 'module'],
    ]);
    const p2Items = snapshot.courseItems.filter((item) =>
      p2Units.some((unit) => unit.id === item.unitId),
    );
    expect(p2Items).toHaveLength(25);
    expect(new Set(p2Items.map((item) => item.type))).toEqual(
      new Set(['lesson']),
    );
  });

  it('treats switching to the already active programme as a no-op', async () => {
    const context = await p2ActiveDevice('p2-same-active');
    const before = await getDatabaseSnapshot({ db: context.db });

    await switchActiveProgramme(p2.programmeId, {
      db: context.db,
      seed: p2.catalogue,
      now: () => t2,
    });

    expect(await getDatabaseSnapshot({ db: context.db })).toEqual(before);
  });

  it('keeps the old active programme when target preparation fails', async () => {
    const context = await freshDevice('p2-failed-preparation');
    await enrolInProgramme(p2.programmeId, { db: context.db, now: () => t1 });

    await expect(
      switchActiveProgramme(p2.programmeId, {
        db: context.db,
        seed: { ...p2.catalogue, courseId: 'not-authorized-catalogue' },
        now: () => t2,
      }),
    ).rejects.toThrow();
    expect((await getAppMeta({ db: context.db }))?.activeProgrammeId).toBe(
      'cs50x',
    );
  });

  it('A → B → A keeps CS50 progress, Programvareutvikling evidence and positions separate and unaliased', async () => {
    const context = await freshDevice('p2-a-b-a');
    const lectureId = cs50.catalogue.units[0]!.items[0]!.id;

    await upsertProgressAndAwardXp(
      { itemId: lectureId, status: 'completed', confidence: 4 },
      {
        db: context.db,
        now: () => t0,
        policy: cs50.policy,
        catalogueId: cs50.catalogueId,
      },
    );
    await enrolAndSwitchActiveProgramme(p2.programmeId, {
      db: context.db,
      seed: p2.catalogue,
      now: () => t1,
    });
    await submitExerciseAttempt(
      {
        id: 'attempt-a-b-a',
        programmeId: p2.programmeId,
        contentVersion: manifest.contentVersion,
        subjectId: firstSubject.subjectId,
        contentHash: firstSubject.contentHash,
        responseMode: firstSubject.responseMode as 'evidence',
        answer: { text: 'Python 3.14.4' },
      },
      { db: context.db, now: () => t1 },
    );
    await recordEvaluationResult(
      { id: 'result-a-b-a', attemptId: 'attempt-a-b-a', outcome: 'correct' },
      { db: context.db, now: () => t1 },
    );
    await saveLessonPosition(
      {
        itemId: 's1-m01-o01',
        programmeId: p2.programmeId,
        contentVersion: manifest.contentVersion,
        unitId: 's1-m01-p01',
        stepIndex: 5,
      },
      { db: context.db, now: () => t1 },
    );
    const onB = await getDatabaseSnapshot({ db: context.db });

    await switchActiveProgramme(cs50.programmeId, {
      db: context.db,
      seed: cs50.catalogue,
      now: () => t2,
    });
    const backOnA = await getDatabaseSnapshot({ db: context.db });

    expect(backOnA.appMeta?.activeProgrammeId).toBe('cs50x');
    expect(backOnA.progressEntries).toEqual(onB.progressEntries);
    expect(backOnA.learnerEvidence).toEqual(onB.learnerEvidence);
    expect(backOnA.lessonPositions).toEqual(onB.lessonPositions);
    expect(
      backOnA.progressEntries.find((entry) => entry.itemId === lectureId)
        ?.status,
    ).toBe('completed');

    await switchActiveProgramme(p2.programmeId, {
      db: context.db,
      seed: p2.catalogue,
      now: () => t2,
    });
    expect(
      (await getDatabaseSnapshot({ db: context.db })).learnerEvidence,
    ).toEqual(onB.learnerEvidence);
  });

  it('manufactures no XP, achievement, session, profile, evidence or position write on a switch', async () => {
    const context = await p2ActiveDevice('p2-no-manufactured-writes');
    const before = await getDatabaseSnapshot({ db: context.db });

    await switchActiveProgramme(cs50.programmeId, {
      db: context.db,
      seed: cs50.catalogue,
      now: () => t2,
    });
    const after = await getDatabaseSnapshot({ db: context.db });

    expect(withoutAppMeta(after)).toEqual(withoutAppMeta(before));
  });
});

describe('reset and restore with Programvareutvikling active', () => {
  it('reset from Programvareutvikling returns to CS50 and empties both new stores', async () => {
    const context = await p2ActiveDevice('p2-reset');
    await saveLessonPosition(
      {
        itemId: 's1-m01-o02',
        programmeId: p2.programmeId,
        contentVersion: manifest.contentVersion,
        unitId: 's1-m01-l02',
        stepIndex: 1,
      },
      { db: context.db },
    );

    await resetAllData({ db: context.db, seed: bundledCourseSeed });
    const after = await getDatabaseSnapshot({ db: context.db });

    expect(after.appMeta?.activeProgrammeId).toBe('cs50x');
    expect(after.programmeEnrolments.map((row) => row.programmeId)).toEqual([
      'cs50x',
    ]);
    expect(after.learnerEvidence).toEqual([]);
    expect(after.lessonPositions).toEqual([]);
  });

  it('previews and restores a Programvareutvikling-active backup to the correct scope', async () => {
    const source = await p2ActiveDevice('p2-backup-source');
    await saveLessonPosition(
      {
        itemId: 's1-m02-o01',
        programmeId: p2.programmeId,
        contentVersion: manifest.contentVersion,
        unitId: 's1-m02-l01',
        stepIndex: 2,
      },
      { db: source.db },
    );
    const snapshot = await getDatabaseSnapshot({ db: source.db });
    const text = serializeBackupEnvelope(
      buildBackupEnvelope(snapshot, {
        appVersion: currentApplicationVersion,
        schemaVersion: 5,
        exportedAt: t2,
      }),
    ).contents;
    const parsed = parseBackupFile(text, {
      expectedSchemaVersion: 5,
      migrationContext: resolveDatabaseMigrationContext(),
    });

    expect(summarizeBackup(parsed).counts.lessonPositions).toBe(1);

    const target = await freshDevice('p2-backup-target');
    const restored = await restoreDatabaseFromBackup(parsed.data, {
      db: target.db,
      fileName: 'p2-active.json',
    });

    expect(restored.appMeta?.activeProgrammeId).toBe('programvareutvikling');
    expect(restored.lessonPositions).toEqual(snapshot.lessonPositions);
    expect(
      restored.programmeEnrolments.map((row) => row.programmeId).sort(),
    ).toEqual(['cs50x', 'programvareutvikling']);
  });

  it('fails closed on an unknown active programme with the real registry', async () => {
    const context = await freshDevice('p2-unknown-active');
    const appMeta = await context.db.appMeta.get('app-meta');
    await context.db.appMeta.put({ ...appMeta!, activeProgrammeId: 'ukjent' });

    await expect(
      initializeDatabase({ db: context.db, seed: bundledCourseSeed }),
    ).rejects.toThrow(/does not match the registered programmes/);
  });
});
