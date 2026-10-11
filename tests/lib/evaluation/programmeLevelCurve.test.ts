import { afterEach, describe, expect, it } from 'vitest';

import {
  addXpTransaction,
  getXpSummary,
  listXpTransactions,
  recordSupportEvent,
} from '@/lib/db';
import type { LessonExercise, ProgrammeContentIndex } from '@/lib/domain';
import { submitAnswer, unavailablePythonRuntime } from '@/lib/evaluation';
import {
  createLessonAwardPlanner,
  deriveRewardEvents,
  isRewardMutationResult,
} from '@/lib/rewards';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';

import {
  createP2Device,
  evidenceTime,
  p2ProgrammeId,
} from '../../db/learnerEvidenceFixture';
import type { TestDatabaseContext } from '../../db/testDatabase';
import { p2Index as manifest, p2Modules } from '../../programmes/p2Content';

/**
 * Programme #2 XP and levels through the real submission lifecycle, on a
 * fresh synthetic learner (owner work order 2026-10-10, checkpoint B): the
 * result transaction's summary uses the programme's own curve, thresholds
 * are exact, a repeat or a hint never adds a second award, an answer bound
 * to another content version awards nothing, the rubric reaches the result,
 * and CS50x XP and levels stay apart. No backfill or replay is involved.
 */

const p2 = programvareutviklingDefinition;
const curve = p2.policy.levelCurve!;
const index = manifest as unknown as ProgrammeContentIndex;
const exercises = [p2Modules['S1-M01']!, p2Modules['S1-M02']!]
  .flatMap(
    (module) =>
      (module as unknown as { units: Array<{ flow: Array<{ t: string }> }> })
        .units,
  )
  .flatMap((unit) => unit.flow)
  .filter((block) => block.t === 'exercise') as unknown as LessonExercise[];
const metaById = new Map(
  manifest.exercises.map((entry) => [entry.exerciseId, entry]),
);
const awardXp = createLessonAwardPlanner({
  policy: p2.policy.lessonXp!,
  index,
  runtimeAvailable: false,
});

// S1-M01-P01-E03: a formative choice task (introductory: 8 - 2 = 6 XP).
const choice = exercises.find((entry) => entry.id === 'S1-M01-P01-E03')!;
// Task 6: ordering the ten steps (complex by name: 8 + 5 = 13 XP).
const task6 = exercises.find((entry) => entry.id === 'S1-M01-P05-E06')!;

const databases: TestDatabaseContext[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

async function device(label: string) {
  const context = await createP2Device(label);
  databases.push(context);
  return context;
}

function submit(
  context: TestDatabaseContext,
  exercise: LessonExercise,
  answer: unknown,
  attemptId: string,
  contentHash = metaById.get(exercise.id)!.contentHash,
) {
  return submitAnswer(
    {
      programmeId: p2ProgrammeId,
      contentVersion: manifest.contentVersion,
      exercise,
      contentHash,
      masteryGate: false,
      runtime: unavailablePythonRuntime,
      db: context.db,
      awardXp,
      levelCurve: curve,
    },
    {
      attemptId,
      resultId: `result-${attemptId}`,
      answer: answer as never,
    },
  );
}

const rightChoice = {
  selected: (choice as unknown as { evaluator: { correct: string[] } })
    .evaluator.correct,
};
const rightOrder = {
  order: task6.type === 'sort' ? task6.items.map((_, i) => i) : [],
};

async function seedP2Xp(context: TestDatabaseContext, xp: number) {
  await addXpTransaction(
    {
      programmeId: p2ProgrammeId,
      sourceType: 'synthetic_seed',
      sourceId: 'p2-seed',
      xp,
      reason: 'Synthetic test seed',
      awardedAt: evidenceTime,
    },
    { db: context.db },
  );
}

describe('Programme #2 levels in the result transaction', () => {
  it('reads the summary on the programme curve and levels up exactly at the threshold', async () => {
    const context = await device('p2-curve-threshold');
    await seedP2Xp(context, curve.firstLevelXp - 6);

    const outcome = await submit(context, choice, rightChoice, 'attempt-1');

    expect(outcome.status).toBe('evaluated');
    if (outcome.status !== 'evaluated' || !isRewardMutationResult(outcome)) {
      throw new Error('expected an evaluated reward result');
    }
    expect(outcome.awardedTransactions.map((row) => row.xp)).toEqual([6]);
    expect(outcome.xpSummary).toMatchObject({
      totalXp: curve.firstLevelXp,
      level: 2,
      currentLevelFloorXp: curve.firstLevelXp,
    });
    expect(deriveRewardEvents(outcome, [], curve)).toEqual([
      { kind: 'level-up', level: 2 },
    ]);
    // On the shared curve the same total is still level 1: no event.
    expect(
      deriveRewardEvents(
        { ...outcome, xpSummary: { ...outcome.xpSummary, level: 1 } },
        [],
      ),
    ).toEqual([]);
  });

  it('awards a solved task once: a repeat adds nothing and announces nothing', async () => {
    const context = await device('p2-curve-repeat');
    await seedP2Xp(context, curve.firstLevelXp - 6);

    await submit(context, choice, rightChoice, 'attempt-1');
    const repeat = await submit(context, choice, rightChoice, 'attempt-2');

    if (repeat.status !== 'evaluated' || !isRewardMutationResult(repeat)) {
      throw new Error('expected an evaluated reward result');
    }
    expect(repeat.awardedTransactions).toEqual([]);
    expect(repeat.xpSummary.totalXp).toBe(curve.firstLevelXp);
    expect(deriveRewardEvents(repeat, [], curve)).toEqual([]);
  });

  it('keeps the solved award after a hint', async () => {
    const context = await device('p2-curve-hint');
    const meta = metaById.get(choice.id)!;

    await recordSupportEvent(
      {
        id: 'hint-1',
        programmeId: p2ProgrammeId,
        contentVersion: manifest.contentVersion,
        subjectId: meta.subjectId,
        contentHash: meta.contentHash,
        supportKind: 'hint_reveal',
        hintNumber: 1,
      },
      { db: context.db },
    );
    const outcome = await submit(context, choice, rightChoice, 'attempt-1');

    if (outcome.status !== 'evaluated') {
      throw new Error('expected an evaluated result');
    }
    expect(outcome.awardedTransactions.map((row) => row.xp)).toEqual([6]);
  });

  it('awards nothing for an answer bound to another content version', async () => {
    const context = await device('p2-curve-stale');
    const outcome = await submit(
      context,
      choice,
      rightChoice,
      'attempt-1',
      '0'.repeat(64),
    );

    if (outcome.status !== 'evaluated') {
      throw new Error('expected an evaluated result');
    }
    expect(outcome.awardedTransactions).toEqual([]);
    expect(
      await listXpTransactions({ programmeId: p2ProgrammeId, db: context.db }),
    ).toEqual([]);
  });

  it('gives Task 6 the complex value of the rubric', async () => {
    const context = await device('p2-curve-task6');
    const outcome = await submit(context, task6, rightOrder, 'attempt-1');

    if (outcome.status !== 'evaluated') {
      throw new Error('expected an evaluated result');
    }
    expect(outcome.result.outcome).toBe('correct');
    expect(
      outcome.awardedTransactions.find(
        (row) => row.sourceType === 'exercise_solved',
      )?.xp,
    ).toBe(13);
  });
});

describe('programme isolation', () => {
  it('never moves XP between programmes, and CS50x keeps the shared curve', async () => {
    const context = await device('p2-curve-isolation');

    await addXpTransaction(
      {
        programmeId: 'cs50x',
        sourceType: 'synthetic_seed',
        sourceId: 'cs50-seed',
        xp: 150,
        reason: 'Synthetic test seed',
        awardedAt: evidenceTime,
      },
      { db: context.db },
    );
    await seedP2Xp(context, 150);

    const cs50 = await getXpSummary({ programmeId: 'cs50x', db: context.db });
    const programmeTwo = await getXpSummary({
      programmeId: p2ProgrammeId,
      levelCurve: curve,
      db: context.db,
    });

    // Shared curve: 100 for level 2, 400 for level 3.
    expect(cs50).toEqual({
      totalXp: 150,
      level: 2,
      xpToNextLevel: 250,
      currentLevelFloorXp: 100,
      nextLevelXp: 400,
    });
    // Programme #2 curve: 55, 130, 225 for levels 2, 3 and 4.
    expect(programmeTwo).toEqual({
      totalXp: 150,
      level: 3,
      xpToNextLevel: 75,
      currentLevelFloorXp: 130,
      nextLevelXp: 225,
    });
  });
});
