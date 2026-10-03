import { afterEach, describe, expect, it } from 'vitest';

import {
  addXpTransaction,
  enrolInProgramme,
  getDatabaseSnapshot,
  getXpSummary,
  listXpTransactions,
  submitAttemptAndRecordResult,
  switchActiveProgramme,
  upsertProgressAndAwardXp,
} from '@/lib/db';

import { cs50CatalogueId, cs50Policy } from '../programmes/cs50Policy';
import {
  attemptInput,
  createP2Device,
  evidenceTime,
  p2ProgrammeId,
  p2TestSeed,
} from './learnerEvidenceFixture';
import { sampleCourseSeed, type TestDatabaseContext } from './testDatabase';

/**
 * E-SCHEMA-1A (owner accepted 2026-10-03): every XP transaction is owned by
 * one programme. Totals, levels and XP-to-next-level are derived per
 * programme; duplicate prevention is per programme; switching changes only
 * the visible context; nothing global masquerades as progression.
 */

const cs50 = 'cs50x';
const databases: TestDatabaseContext[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

async function device(label: string) {
  const context = await createP2Device(label, { materialize: true });
  databases.push(context);
  return context;
}

function award(
  programmeId: string,
  sourceType: string,
  sourceId: string,
  xp: number,
) {
  return {
    programmeId,
    sourceType,
    sourceId,
    xp,
    reason: `${sourceType} ${sourceId}`,
    awardedAt: evidenceTime,
  };
}

const correct = async () => ({ id: 'result-1', outcome: 'correct' as const });

describe('E-SCHEMA-1A: XP rows carry their owning programme', () => {
  it('stamps a CS50 award with the programme that owns the saved item', async () => {
    const { db } = await device('xp-owner-cs50');

    const result = await upsertProgressAndAwardXp(
      { itemId: 'week-0-lecture', status: 'completed', confidence: 3 },
      {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db,
        now: () => evidenceTime,
      },
    );

    expect(result.awardedTransactions.length).toBeGreaterThan(0);
    for (const transaction of result.awardedTransactions) {
      expect(transaction.programmeId).toBe(cs50);
    }
    expect(
      (await getDatabaseSnapshot({ db })).xpTransactions.map(
        (row) => row.programmeId,
      ),
    ).toEqual(result.awardedTransactions.map(() => cs50));
  });

  it('commits a Programvareutvikling award atomically with the evaluation result', async () => {
    const { db } = await device('xp-owner-p2');

    const lifecycle = await submitAttemptAndRecordResult(
      attemptInput(),
      correct,
      {
        db,
        now: () => evidenceTime,
        awardXp: () => [
          {
            sourceType: 'exercise_solved',
            sourceId: 's1-m01-p01-e05',
            xp: 10,
            reason: 'Løste en oppgave',
          },
        ],
      },
    );

    expect(lifecycle.result?.outcome).toBe('correct');
    expect(lifecycle.awardedTransactions).toEqual([
      expect.objectContaining({
        programmeId: p2ProgrammeId,
        sourceType: 'exercise_solved',
        sourceId: 's1-m01-p01-e05',
        xp: 10,
      }),
    ]);
    expect(
      await listXpTransactions({ db, programmeId: p2ProgrammeId }),
    ).toEqual(lifecycle.awardedTransactions);
    expect(await listXpTransactions({ db, programmeId: cs50 })).toEqual([]);
  });

  it('keeps the result when planning the award fails, and awards nothing', async () => {
    const { db } = await device('xp-planner-failure');

    const lifecycle = await submitAttemptAndRecordResult(
      attemptInput(),
      correct,
      {
        db,
        now: () => evidenceTime,
        awardXp: () => {
          throw new Error('planner defect');
        },
      },
    );

    expect(lifecycle.result?.outcome).toBe('correct');
    expect(
      (await getDatabaseSnapshot({ db })).learnerEvidence.map(
        (row) => row.kind,
      ),
    ).toEqual(['exercise_attempt', 'evaluation_result']);
    expect(
      await listXpTransactions({ db, programmeId: p2ProgrammeId }),
    ).toEqual([]);
  });
});

describe('E-SCHEMA-1A: progression is derived per programme', () => {
  it('derives independent totals, levels and XP-to-next-level', async () => {
    const { db } = await device('xp-per-programme');
    await addXpTransaction(award(cs50, 'lecture_completed', 'a', 900), { db });
    await addXpTransaction(award(p2ProgrammeId, 'exercise_solved', 'b', 100), {
      db,
    });

    const cs50Summary = await getXpSummary({ db, programmeId: cs50 });
    const p2Summary = await getXpSummary({ db, programmeId: p2ProgrammeId });

    expect(cs50Summary).toMatchObject({
      totalXp: 900,
      level: 4,
      xpToNextLevel: 700,
    });
    expect(p2Summary).toMatchObject({
      totalXp: 100,
      level: 2,
      xpToNextLevel: 300,
    });
  });

  it('refuses a progression read without programme context', async () => {
    const { db } = await device('xp-no-context');
    await addXpTransaction(award(cs50, 'lecture_completed', 'a', 900), { db });

    await expect(
      getXpSummary({ db } as Parameters<typeof getXpSummary>[0]),
    ).rejects.toThrow(/programme/i);
    await expect(
      listXpTransactions({ db } as Parameters<typeof listXpTransactions>[0]),
    ).rejects.toThrow(/programme/i);
  });

  it('switching A → B → A writes no XP and restores each unchanged level', async () => {
    const { db } = await device('xp-switching');
    await addXpTransaction(award(cs50, 'lecture_completed', 'a', 900), { db });
    await addXpTransaction(award(p2ProgrammeId, 'exercise_solved', 'b', 400), {
      db,
    });
    const before = (await getDatabaseSnapshot({ db })).xpTransactions;

    await switchActiveProgramme(p2ProgrammeId, { db, seed: p2TestSeed });
    expect((await getXpSummary({ db, programmeId: p2ProgrammeId })).level).toBe(
      3,
    );
    await switchActiveProgramme(cs50, { db, seed: sampleCourseSeed });
    expect((await getXpSummary({ db, programmeId: cs50 })).level).toBe(4);
    await switchActiveProgramme(p2ProgrammeId, { db, seed: p2TestSeed });
    expect((await getXpSummary({ db, programmeId: p2ProgrammeId })).level).toBe(
      3,
    );

    expect((await getDatabaseSnapshot({ db })).xpTransactions).toEqual(before);
  });
});

describe('E-SCHEMA-1A: duplicate prevention is scoped by programme', () => {
  it('lets the same source earn XP once in each programme', async () => {
    const { db } = await device('xp-same-source-two-programmes');
    await addXpTransaction(award(cs50, 'exercise_solved', 'shared-id', 10), {
      db,
    });

    const planner = () => [
      {
        sourceType: 'exercise_solved',
        sourceId: 'shared-id',
        xp: 10,
        reason: 'Løste en oppgave',
      },
    ];
    await submitAttemptAndRecordResult(attemptInput(), correct, {
      db,
      now: () => evidenceTime,
      awardXp: planner,
    });

    const rows = (await getDatabaseSnapshot({ db })).xpTransactions;
    expect(
      rows.map((row) => [row.programmeId, row.sourceType, row.sourceId]),
    ).toEqual(
      expect.arrayContaining([
        [cs50, 'exercise_solved', 'shared-id'],
        [p2ProgrammeId, 'exercise_solved', 'shared-id'],
      ]),
    );
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.id)).size).toBe(2);
  });

  it('blocks a second award for the same source inside one programme', async () => {
    const { db } = await device('xp-duplicate-within-programme');
    const planner = () => [
      {
        sourceType: 'exercise_solved',
        sourceId: 's1-m01-p01-e05',
        xp: 10,
        reason: 'Løste en oppgave',
      },
    ];

    await submitAttemptAndRecordResult(attemptInput(), correct, {
      db,
      now: () => evidenceTime,
      awardXp: planner,
    });
    const replay = await submitAttemptAndRecordResult(
      attemptInput({ id: 'attempt-2' }),
      async () => ({ id: 'result-2', outcome: 'correct' as const }),
      { db, now: () => evidenceTime, awardXp: planner },
    );

    expect(replay.awardedTransactions).toEqual([]);
    expect(
      await listXpTransactions({ db, programmeId: p2ProgrammeId }),
    ).toHaveLength(1);
  });

  it('does not award again when an identical submit is replayed', async () => {
    const { db } = await device('xp-replay');
    const planner = () => [
      {
        sourceType: 'exercise_solved',
        sourceId: 's1-m01-p01-e05',
        xp: 10,
        reason: 'Løste en oppgave',
      },
    ];

    await submitAttemptAndRecordResult(attemptInput(), correct, {
      db,
      now: () => evidenceTime,
      awardXp: planner,
    });
    await submitAttemptAndRecordResult(attemptInput(), correct, {
      db,
      now: () => evidenceTime,
      awardXp: planner,
    });

    expect(
      await listXpTransactions({ db, programmeId: p2ProgrammeId }),
    ).toHaveLength(1);
  });
});

describe('E-SCHEMA-1A: malformed ownership fails closed', () => {
  it('rejects a current XP row that carries no programme', async () => {
    const { db } = await device('xp-missing-owner');
    await db.table('xp_transactions').add({
      id: 'xp-ownerless',
      createdAt: evidenceTime,
      updatedAt: evidenceTime,
      sourceType: 'lecture_completed',
      sourceId: 'week-0-lecture-completed',
      xp: 40,
      reason: 'Completed lecture: Lecture',
      awardedAt: evidenceTime,
    });

    await expect(getXpSummary({ db, programmeId: cs50 })).rejects.toThrow();
    await expect(getDatabaseSnapshot({ db })).rejects.toThrow();
  });

  it('rejects an award for a programme the device is not enrolled in', async () => {
    const context = await createP2Device('xp-unenrolled', { enrol: false });
    databases.push(context);

    await expect(
      addXpTransaction(award(p2ProgrammeId, 'exercise_solved', 'x', 10), {
        db: context.db,
      }),
    ).rejects.toThrow(/enrol/i);
    await enrolInProgramme(p2ProgrammeId, { db: context.db });
    await expect(
      addXpTransaction(award('unknown-programme', 'exercise_solved', 'x', 10), {
        db: context.db,
      }),
    ).rejects.toThrow(/unknown-programme/);
  });
});
