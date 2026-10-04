import { afterEach, describe, expect, it } from 'vitest';

import { createEvidenceAchievementPlanner } from '@/lib/achievements';
import {
  AchievementAwardPlanningError,
  getDatabaseSnapshot,
  listUnresolvedAttempts,
  listXpTransactions,
  recordResultsForUnresolvedAttempts,
  submitAttemptAndRecordResult,
  type EvidenceAchievementPlanner,
  type EvidenceAwardPlanner,
  type ExerciseAttemptInput,
} from '@/lib/db';
import type { ProgrammeContentIndex } from '@/lib/domain';
import { programvareutviklingAchievementDefinitions } from '@/programmes/programvareutvikling/achievements';

import { p2Index } from '../programmes/p2Content';
import { createP2Device, p2ProgrammeId } from './learnerEvidenceFixture';
import type { TestDatabaseContext } from './testDatabase';

/**
 * Evidence-backed Programvareutvikling achievements commit in the same
 * transaction as the terminal result, exactly like its XP: a result, its XP
 * and its unlocks exist together or not at all. These tests drive the real
 * result path with the production definitions, the real content index and
 * the real planner; only the evaluation verdict is stubbed as `correct`.
 */

const index = p2Index as unknown as ProgrammeContentIndex;
const codeReader = programvareutviklingAchievementDefinitions.find(
  (definition) => definition.id === 'p2-code-reader',
)!;
const codeReaderSubjects = codeReader.ruleConfig.subjectIds as string[];
const unrelatedSubject = 's1-m01-p06-e13';
const databases: TestDatabaseContext[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

async function device(label: string) {
  const context = await createP2Device(label, { materialize: true });
  databases.push(context);
  return context;
}

function clock() {
  let tick = 0;

  return () => new Date(Date.UTC(2026, 9, 4, 10, 0, (tick += 1))).toISOString();
}

const planner: EvidenceAchievementPlanner = createEvidenceAchievementPlanner({
  definitions: programvareutviklingAchievementDefinitions,
  index,
  runtimeAvailable: true,
});

const awardXp: EvidenceAwardPlanner = ({ attempt }) => [
  {
    sourceType: 'exercise_solved',
    sourceId: attempt.subjectId,
    xp: 5,
    reason: 'Løste en oppgave',
  },
];

const defect: EvidenceAchievementPlanner = () => {
  throw new Error('achievement planner defect');
};

const answers = {
  mcq: { selected: ['a'] },
  predict: { text: 'svar' },
  reflect: { text: 'svar' },
} as const;

function input(subjectId: string, id = `attempt-${subjectId}`) {
  const meta = index.exercises.find((entry) => entry.subjectId === subjectId)!;

  return {
    id,
    programmeId: p2ProgrammeId,
    contentVersion: index.contentVersion,
    subjectId,
    contentHash: meta.contentHash,
    responseMode: meta.responseMode,
    answer: answers[meta.responseMode as keyof typeof answers],
  } as ExerciseAttemptInput;
}

const correct = async (attempt: { id: string }) => ({
  id: `result-${attempt.id}`,
  outcome: 'correct' as const,
});

type Device = Awaited<ReturnType<typeof device>>;

async function solve(
  context: Device,
  now: () => string,
  subjectIds: readonly string[],
  planners: {
    awardXp?: EvidenceAwardPlanner;
    awardAchievements?: EvidenceAchievementPlanner;
  } = { awardXp, awardAchievements: planner },
) {
  const outcomes = [];

  for (const subjectId of subjectIds) {
    outcomes.push(
      await submitAttemptAndRecordResult(input(subjectId), correct, {
        db: context.db,
        now,
        ...planners,
      }),
    );
  }

  return outcomes;
}

const unlocks = (context: Device) => context.db.achievementUnlocks.toArray();

describe('a qualifying terminal result unlocks its evidence achievement with the result', () => {
  it('persists the result, keeps the normal XP and unlocks exactly once', async () => {
    const context = await device('ach-qualifying');
    const now = clock();
    const earlier = await solve(context, now, codeReaderSubjects.slice(0, -1));

    // Eleven of twelve solved: planner participated, nothing unlocked yet.
    for (const outcome of earlier) {
      expect(outcome.unlockedAchievements).toEqual([]);
    }
    expect(await unlocks(context)).toEqual([]);

    const [last] = await solve(context, now, codeReaderSubjects.slice(-1));

    expect(last!.result?.outcome).toBe('correct');
    expect(last!.unlockedAchievements?.map((row) => row.achievementId)).toEqual(
      ['p2-code-reader'],
    );
    expect(last!.xpSummary).not.toBeNull();
    expect(await unlocks(context)).toEqual([
      expect.objectContaining({
        achievementId: 'p2-code-reader',
        triggerSourceId: 's1-m01-o05',
      }),
    ]);

    // Normal XP behaviour is untouched: one 5 XP award per solved subject.
    const xp = await listXpTransactions({
      db: context.db,
      programmeId: p2ProgrammeId,
    });
    expect(xp).toHaveLength(codeReaderSubjects.length);
    expect(new Set(xp.map((row) => row.sourceId)).size).toBe(xp.length);
    expect(xp.every((row) => row.xp === 5)).toBe(true);
    expect(
      (await getDatabaseSnapshot({ db: context.db })).learnerEvidence.filter(
        (row) => row.kind === 'evaluation_result',
      ),
    ).toHaveLength(codeReaderSubjects.length);
  });
});

describe('an ordinary result keeps its normal behaviour and the optional contract', () => {
  it('records result and XP with no unlock, and reports the achievement field only when a planner participated', async () => {
    const context = await device('ach-ordinary');
    const now = clock();
    const [both] = await solve(context, now, [codeReaderSubjects[0]!]);
    const [xpOnly] = await solve(context, now, [codeReaderSubjects[1]!], {
      awardXp,
    });
    const [neither] = await solve(context, now, [codeReaderSubjects[2]!], {});

    expect(both!.result?.outcome).toBe('correct');
    expect(both!.awardedTransactions).toHaveLength(1);
    expect(both!.unlockedAchievements).toEqual([]);

    // Callers that pass no achievement planner never see the field.
    expect(xpOnly!.awardedTransactions).toHaveLength(1);
    expect(xpOnly).not.toHaveProperty('unlockedAchievements');
    expect(neither!.result?.outcome).toBe('correct');
    expect(neither!.awardedTransactions).toEqual([]);
    expect(neither!.xpSummary).toBeNull();
    expect(neither).not.toHaveProperty('unlockedAchievements');

    expect(await unlocks(context)).toEqual([]);
  });
});

describe('achievement planning is atomic with the terminal result', () => {
  it('records no result, XP or unlock when planning fails, and leaves the attempt recoverable', async () => {
    const context = await device('ach-planner-failure');
    const now = clock();

    await expect(
      submitAttemptAndRecordResult(input(codeReaderSubjects[0]!), correct, {
        db: context.db,
        now,
        awardXp,
        awardAchievements: defect,
      }),
    ).rejects.toBeInstanceOf(AchievementAwardPlanningError);

    // The XP planner ran first and succeeded: it must be rolled back too.
    expect(
      (await getDatabaseSnapshot({ db: context.db })).learnerEvidence.map(
        (row) => row.kind,
      ),
    ).toEqual(['exercise_attempt']);
    expect(
      await listXpTransactions({ db: context.db, programmeId: p2ProgrammeId }),
    ).toEqual([]);
    expect(await unlocks(context)).toEqual([]);
    expect(
      (
        await listUnresolvedAttempts({
          db: context.db,
          programmeId: p2ProgrammeId,
        })
      ).map((attempt) => attempt.id),
    ).toEqual([`attempt-${codeReaderSubjects[0]}`]);
  });
});

describe('recovery finishes an unresolved attempt with its unlock, exactly once', () => {
  async function pendingFinalAttempt(label: string) {
    const context = await device(label);
    const now = clock();
    const last = codeReaderSubjects.at(-1)!;

    await solve(context, now, codeReaderSubjects.slice(0, -1));
    await submitAttemptAndRecordResult(input(last), correct, {
      db: context.db,
      now,
      awardXp,
      awardAchievements: defect,
    }).catch(() => undefined);

    return { context, now, attemptId: `attempt-${last}` };
  }

  it('unlocks when the recovered terminal result completes the evidence', async () => {
    const { context, now, attemptId } =
      await pendingFinalAttempt('ach-recovery');

    // Still failing: stays pending, nothing partial.
    expect(
      await recordResultsForUnresolvedAttempts([attemptId], correct, {
        db: context.db,
        now,
        awardXp,
        awardAchievements: defect,
      }),
    ).toEqual([{ attemptId, result: null, awardedTransactions: [] }]);
    expect(await unlocks(context)).toEqual([]);

    const [recovered] = await recordResultsForUnresolvedAttempts(
      [attemptId],
      correct,
      { db: context.db, now, awardXp, awardAchievements: planner },
    );

    expect(recovered!.result?.outcome).toBe('correct');
    expect(recovered!.awardedTransactions).toHaveLength(1);
    expect(
      recovered!.unlockedAchievements?.map((row) => row.achievementId),
    ).toEqual(['p2-code-reader']);
    expect(await unlocks(context)).toHaveLength(1);
  });

  it('does not unlock or award again when recovery is repeated', async () => {
    const { context, now, attemptId } = await pendingFinalAttempt(
      'ach-recovery-repeat',
    );
    const recover = () =>
      recordResultsForUnresolvedAttempts([attemptId], correct, {
        db: context.db,
        now,
        awardXp,
        awardAchievements: planner,
      });

    await recover();
    const [unlockedAt] = (await unlocks(context)).map((row) => row.unlockedAt);
    const [again] = await recover();

    expect(again!.result?.outcome).toBe('correct');
    expect(again!.awardedTransactions).toEqual([]);
    expect(again!.unlockedAchievements).toEqual([]);
    expect(await unlocks(context)).toEqual([
      expect.objectContaining({
        achievementId: 'p2-code-reader',
        unlockedAt,
      }),
    ]);
    expect(
      await listXpTransactions({ db: context.db, programmeId: p2ProgrammeId }),
    ).toHaveLength(codeReaderSubjects.length);
  });

  it('keeps one failing attempt pending without corrupting an unrelated recovery', async () => {
    const context = await device('ach-recovery-partial');
    const now = clock();
    const final = codeReaderSubjects.at(-1)!;

    await solve(context, now, codeReaderSubjects.slice(0, -1));

    // Two attempts are left unresolved: an unrelated one and the one that
    // completes the evidence for the achievement.
    for (const subjectId of [unrelatedSubject, final]) {
      await submitAttemptAndRecordResult(input(subjectId), correct, {
        db: context.db,
        now,
        awardXp,
        awardAchievements: defect,
      }).catch(() => undefined);
    }

    const statuses = await recordResultsForUnresolvedAttempts(
      [`attempt-${unrelatedSubject}`, `attempt-${final}`],
      correct,
      {
        db: context.db,
        now,
        awardXp,
        awardAchievements: (context_) => {
          if (context_.attempt.subjectId === unrelatedSubject) {
            throw new Error('achievement planner defect');
          }

          return planner(context_);
        },
      },
    );

    expect(statuses.map((status) => status.result?.outcome ?? null)).toEqual([
      null,
      'correct',
    ]);
    expect(
      (
        await listUnresolvedAttempts({
          db: context.db,
          programmeId: p2ProgrammeId,
        })
      ).map((attempt) => attempt.id),
    ).toEqual([`attempt-${unrelatedSubject}`]);
    expect((await unlocks(context)).map((row) => row.achievementId)).toEqual([
      'p2-code-reader',
    ]);
    expect(
      (
        await listXpTransactions({
          db: context.db,
          programmeId: p2ProgrammeId,
        })
      ).map((row) => row.sourceId),
    ).not.toContain(unrelatedSubject);
  });
});

describe('an already unlocked achievement is an idempotent no-op', () => {
  it('neither duplicates nor re-stamps the unlock when the evidence qualifies again', async () => {
    const context = await device('ach-idempotent');
    const now = clock();

    await solve(context, now, codeReaderSubjects);
    const [first] = await unlocks(context);

    // A further correct attempt on a counted subject re-satisfies the rule.
    const replay = await submitAttemptAndRecordResult(
      input(codeReaderSubjects[0]!, 'attempt-again'),
      correct,
      { db: context.db, now, awardXp, awardAchievements: planner },
    );

    expect(replay.result?.outcome).toBe('correct');
    expect(replay.awardedTransactions).toEqual([]);
    expect(replay.unlockedAchievements).toEqual([]);
    expect(await unlocks(context)).toEqual([first]);
  });

  it('returns the stored result for an identical replay without a new unlock', async () => {
    const context = await device('ach-replay');
    const now = clock();

    await solve(context, now, codeReaderSubjects);
    const replay = await submitAttemptAndRecordResult(
      input(codeReaderSubjects.at(-1)!),
      correct,
      { db: context.db, now, awardXp, awardAchievements: planner },
    );

    expect(replay.result?.outcome).toBe('correct');
    expect(replay.unlockedAchievements).toEqual([]);
    expect(await unlocks(context)).toHaveLength(1);
  });
});
