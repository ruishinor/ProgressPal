import { afterEach, describe, expect, it } from 'vitest';

import {
  createEvidenceAchievementPlanner,
  defineAchievement,
} from '@/lib/achievements';
import type {
  EvidenceAchievementPlanner,
  EvidenceAwardPlanner,
} from '@/lib/db';
import type { LessonExercise, ProgrammeContentIndex } from '@/lib/domain';
import {
  recoverUnresolvedAttempts,
  submitAnswer,
  unavailablePythonRuntime,
} from '@/lib/evaluation';

import { createP2Device, p2ProgrammeId } from '../../db/learnerEvidenceFixture';
import type { TestDatabaseContext } from '../../db/testDatabase';
import { p2Index as manifest, p2Modules } from '../../programmes/p2Content';

/**
 * The public lesson-evaluation contract with evidence-backed achievements:
 * `unlockedAchievements` is optional. It is absent when no reward planner
 * took part, an empty list when only XP did (the reward-notice shape the
 * shell has always received), and the unlocked rows when an achievement
 * planner took part. Existing callers are never forced to supply or read it.
 */

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
const choice = exercises.find(
  (entry) => entry.type === 'mcq' && !metaById.get(entry.id)!.masteryGate,
)!;
const choiceSubject = choice.id.toLowerCase();

function binding() {
  return {
    programmeId: p2ProgrammeId,
    contentVersion: manifest.contentVersion,
    exercise: choice,
    contentHash: metaById.get(choice.id)!.contentHash,
    masteryGate: metaById.get(choice.id)!.masteryGate,
  };
}

const correctAnswer = {
  selected: (choice as unknown as { evaluator: { correct: string[] } })
    .evaluator.correct,
};

// A test-local definition bound to the one real exercise these tests solve.
const definition = defineAchievement({
  id: 'p2-test-lifecycle-choice',
  title: 'Test',
  description: 'Løs oppgaven.',
  category: 'course_progress',
  ruleType: 'evidence_subjects_solved',
  ruleConfig: {
    contentVersion: manifest.contentVersion,
    triggerSourceId: 's1-m01-o05',
    subjectIds: [choiceSubject],
  },
});
const planner: EvidenceAchievementPlanner = createEvidenceAchievementPlanner({
  definitions: [definition],
  index,
  runtimeAvailable: true,
});
const awardXp: EvidenceAwardPlanner = () => [
  {
    sourceType: 'exercise_solved',
    sourceId: choiceSubject,
    xp: 5,
    reason: 'Løste en oppgave',
  },
];
const defect = () => {
  throw new Error('planner defect');
};

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
  planners: {
    awardXp?: EvidenceAwardPlanner;
    awardAchievements?: EvidenceAchievementPlanner;
  },
  attemptId = 'attempt-1',
) {
  return submitAnswer(
    {
      ...binding(),
      runtime: unavailablePythonRuntime,
      db: context.db,
      ...planners,
    },
    {
      attemptId,
      resultId: `result-${attemptId}`,
      answer: correctAnswer,
    },
  );
}

function recover(
  context: TestDatabaseContext,
  planners: {
    awardXp?: EvidenceAwardPlanner;
    awardAchievements?: EvidenceAchievementPlanner;
  },
) {
  return recoverUnresolvedAttempts({
    programmeId: p2ProgrammeId,
    exercises: [binding()],
    runtime: unavailablePythonRuntime,
    db: context.db,
    ...planners,
  });
}

describe('submitAnswer reports achievements only when a planner took part', () => {
  it('returns the unlock with the reward shape when an achievement planner took part', async () => {
    const context = await device('lifecycle-ach-unlock');
    const outcome = await submit(context, {
      awardXp,
      awardAchievements: planner,
    });

    expect(outcome.status).toBe('evaluated');
    if (outcome.status !== 'evaluated') {
      return;
    }
    expect(outcome.result.outcome).toBe('correct');
    expect(outcome.awardedTransactions).toHaveLength(1);
    expect(outcome.xpSummary).toBeDefined();
    expect(
      outcome.unlockedAchievements?.map((row) => row.achievementId),
    ).toEqual([definition.id]);
    expect(await context.db.achievementUnlocks.toArray()).toHaveLength(1);
  });

  it('keeps the XP-only shape: an empty list beside xpSummary', async () => {
    const context = await device('lifecycle-ach-xp-only');
    const outcome = await submit(context, { awardXp });

    expect(outcome.status).toBe('evaluated');
    if (outcome.status !== 'evaluated') {
      return;
    }
    expect(outcome.xpSummary).toBeDefined();
    expect(outcome.unlockedAchievements).toEqual([]);
    expect(await context.db.achievementUnlocks.toArray()).toEqual([]);
  });

  it('adds neither field for a caller with no reward planner', async () => {
    const context = await device('lifecycle-ach-none');
    const outcome = await submit(context, {});

    expect(outcome.status).toBe('evaluated');
    expect(outcome).not.toHaveProperty('xpSummary');
    expect(outcome).not.toHaveProperty('unlockedAchievements');
  });
});

describe('recoverUnresolvedAttempts reports achievements only when a planner took part', () => {
  it('keeps the attempt pending on planner failure, then recovers it with the unlock exactly once', async () => {
    const context = await device('lifecycle-ach-recovery');
    const pending = await submit(context, {
      awardXp,
      awardAchievements: defect,
    });

    expect(pending.status).toBe('pending');
    expect(await context.db.achievementUnlocks.toArray()).toEqual([]);

    const [recovered] = await recover(context, {
      awardXp,
      awardAchievements: planner,
    });

    expect(recovered).toMatchObject({
      attemptId: 'attempt-1',
      status: 'recovered',
    });
    expect(
      recovered!.unlockedAchievements?.map((row) => row.achievementId),
    ).toEqual([definition.id]);
    expect(
      await recover(context, { awardXp, awardAchievements: planner }),
    ).toEqual([]);
    expect(await context.db.achievementUnlocks.toArray()).toHaveLength(1);
  });

  it('keeps the recovery outcome shape unchanged for callers with no achievement planner', async () => {
    const context = await device('lifecycle-ach-recovery-compat');
    await submit(context, {
      awardXp: defect,
    });

    const [recovered] = await recover(context, { awardXp });

    expect(recovered!.status).toBe('recovered');
    expect(Object.keys(recovered!).sort()).toEqual([
      'attemptId',
      'result',
      'status',
    ]);
  });
});
