import { afterEach, describe, expect, it, vi } from 'vitest';

import { listLearnerEvidence, listUnresolvedAttempts } from '@/lib/db';
import type { LessonExercise } from '@/lib/domain';
import {
  recoverUnresolvedAttempts,
  retryPermission,
  submitAnswer,
  unavailablePythonRuntime,
  type PythonRuntime,
} from '@/lib/evaluation';

import { createP2Device, p2ProgrammeId } from '../../db/learnerEvidenceFixture';
import type { TestDatabaseContext } from '../../db/testDatabase';
import {
  localCoordinationStorageKeys,
  startLocalDataCoordination,
} from '@/lib/storage';
import type { FakeLockManager } from '../localDataCoordinationFakes';
import { p2Index as manifest, p2Modules } from '../../programmes/p2Content';

/**
 * Epic E / E-SCHEMA-1 §3 invariants 4, 5, 7, 10, 11 and §10 "Submission
 * lifecycle" tests 1–9 at the orchestration boundary: the immutable attempt
 * commits before any evaluation, the terminal result commits after it,
 * nothing about correctness exists before the result is durable, and every
 * failure path keeps the submitted answer.
 */

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

function binding(exerciseId: string) {
  const exercise = exercises.find((entry) => entry.id === exerciseId)!;
  const meta = metaById.get(exerciseId)!;

  return {
    programmeId: p2ProgrammeId,
    contentVersion: manifest.contentVersion,
    exercise,
    contentHash: meta.contentHash,
    masteryGate: meta.masteryGate,
  };
}

// A formative single-choice item, a formative program item and a gate item.
const choiceId = exercises.find(
  (entry) => entry.type === 'mcq' && !metaById.get(entry.id)!.masteryGate,
)!.id;
const programId = exercises.find(
  (entry) => entry.type === 'program' && !metaById.get(entry.id)!.masteryGate,
)!.id;
const gateId = manifest.exercises.find(
  (entry) =>
    entry.masteryGate && !entry.needsRuntime && entry.responseMode === 'mcq',
)!.exerciseId;

function correctChoice(exerciseId: string) {
  const exercise = exercises.find(
    (entry) => entry.id === exerciseId,
  )! as unknown as {
    evaluator: { correct: string[] };
  };
  return { selected: exercise.evaluator.correct };
}

const databases: TestDatabaseContext[] = [];
let stopCoordination: (() => void) | null = null;

afterEach(async () => {
  stopCoordination?.();
  stopCoordination = null;
  localStorage.removeItem(localCoordinationStorageKeys.message);
  localStorage.removeItem(localCoordinationStorageKeys.revision);
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

async function device(label: string) {
  const context = await createP2Device(label);
  databases.push(context);
  return context;
}

function runtimeReturning(
  result: Awaited<ReturnType<PythonRuntime['run']>>,
): PythonRuntime {
  return { status: () => 'available', run: vi.fn(async () => result) };
}

describe('test 1 and 5: the attempt commits before any evaluation, then exactly one result', () => {
  it('persists the exercise_attempt before the evaluator runs and links one terminal result', async () => {
    const context = await device('lifecycle-order');
    const order: string[] = [];
    const runtime: PythonRuntime = {
      status: () => 'available',
      run: vi.fn(async () => {
        const rows = await listLearnerEvidence({ db: context.db });
        order.push(`evaluating with ${rows.map((row) => row.kind).join(',')}`);
        return {
          kind: 'completed' as const,
          exitCode: 0,
          stdout: 'x\n',
          stderr: '',
        };
      }),
    };

    const outcome = await submitAnswer(
      { ...binding(programId), runtime, db: context.db },
      {
        attemptId: 'attempt-1',
        resultId: 'result-1',
        answer: { source: 'print("x")' },
      },
    );

    expect(order[0]).toBe('evaluating with exercise_attempt');
    expect(outcome.status).toBe('evaluated');
    const rows = await listLearnerEvidence({ db: context.db });
    expect(rows.map((row) => row.kind)).toEqual([
      'exercise_attempt',
      'evaluation_result',
    ]);
    expect(rows[1]).toMatchObject({ attemptId: 'attempt-1' });
  });
});

describe('tests 2, 3 and invariant 10: an interrupted evaluation is recovered, never replaced', () => {
  it('keeps the attempt, refuses a new submit meanwhile, and recovers it on reload without a new attempt', async () => {
    const context = await device('lifecycle-interrupted');
    const crash = new Error('tab closed');

    await expect(
      submitAnswer(
        {
          ...binding(choiceId),
          runtime: unavailablePythonRuntime,
          db: context.db,
          afterAttemptCommitted: () => {
            throw crash;
          },
        },
        {
          attemptId: 'attempt-1',
          resultId: 'result-1',
          answer: { selected: ['b'] },
        },
      ),
    ).rejects.toBe(crash);

    const pending = await listUnresolvedAttempts({ db: context.db });
    expect(pending.map((row) => [row.id, row.attemptNumber])).toEqual([
      ['attempt-1', 1],
    ]);

    await expect(
      submitAnswer(
        {
          ...binding(choiceId),
          runtime: unavailablePythonRuntime,
          db: context.db,
        },
        {
          attemptId: 'attempt-2',
          resultId: 'result-2',
          answer: correctChoice(choiceId),
        },
      ),
    ).resolves.toMatchObject({
      status: 'refused',
      reason: 'unresolved_attempt',
    });

    const recovered = await recoverUnresolvedAttempts({
      programmeId: p2ProgrammeId,
      exercises: [binding(choiceId)],
      runtime: unavailablePythonRuntime,
      db: context.db,
    });

    expect(recovered).toEqual([
      expect.objectContaining({ attemptId: 'attempt-1', status: 'recovered' }),
    ]);
    const rows = await listLearnerEvidence({ db: context.db });
    expect(rows.filter((row) => row.kind === 'exercise_attempt')).toHaveLength(
      1,
    );
    expect(rows.filter((row) => row.kind === 'evaluation_result')).toEqual([
      expect.objectContaining({ attemptId: 'attempt-1' }),
    ]);

    const next = await submitAnswer(
      {
        ...binding(choiceId),
        runtime: unavailablePythonRuntime,
        db: context.db,
      },
      {
        attemptId: 'attempt-2',
        resultId: 'result-2',
        answer: correctChoice(choiceId),
      },
    );
    expect(next).toMatchObject({
      status: 'evaluated',
      attempt: { attemptNumber: 2 },
    });
  });

  it('records evaluator_error when the content no longer carries the attempt binding', async () => {
    const context = await device('lifecycle-recover-stale');
    await submitAnswer(
      {
        ...binding(choiceId),
        runtime: unavailablePythonRuntime,
        db: context.db,
        afterAttemptCommitted: () => {
          throw new Error('tab closed');
        },
      },
      {
        attemptId: 'attempt-1',
        resultId: 'result-1',
        answer: { selected: ['a'] },
      },
    ).catch(() => undefined);

    await recoverUnresolvedAttempts({
      programmeId: p2ProgrammeId,
      exercises: [{ ...binding(choiceId), contentHash: 'f'.repeat(64) }],
      runtime: unavailablePythonRuntime,
      db: context.db,
    });

    expect(
      (await listLearnerEvidence({ db: context.db })).find(
        (row) => row.kind === 'evaluation_result',
      ),
    ).toMatchObject({ outcome: 'evaluator_error' });
  });

  it('leaves the attempt pending, inventing no result, when the needed runtime is unavailable during recovery', async () => {
    const context = await device('lifecycle-recover-unavailable');
    const hanging: PythonRuntime = {
      status: () => 'available',
      run: () => new Promise(() => undefined),
    };
    void submitAnswer(
      { ...binding(programId), runtime: hanging, db: context.db },
      {
        attemptId: 'attempt-1',
        resultId: 'result-1',
        answer: { source: 'print(1)' },
      },
    );
    await vi.waitFor(async () => {
      expect(await listUnresolvedAttempts({ db: context.db })).toHaveLength(1);
    });

    const recovered = await recoverUnresolvedAttempts({
      programmeId: p2ProgrammeId,
      exercises: [binding(programId)],
      runtime: unavailablePythonRuntime,
      db: context.db,
    });

    expect(recovered).toEqual([
      expect.objectContaining({ attemptId: 'attempt-1', status: 'pending' }),
    ]);
    expect(await listUnresolvedAttempts({ db: context.db })).toHaveLength(1);
  });
});

describe('test 4: nothing about correctness exists before the result is durable', () => {
  it('reports pending with no verdict when the result commit fails', async () => {
    const context = await device('lifecycle-result-blocked');

    const outcome = await submitAnswer(
      {
        ...binding(choiceId),
        runtime: unavailablePythonRuntime,
        db: context.db,
        beforeResultCommitted: () => {
          throw new Error('storage became unavailable');
        },
      },
      {
        attemptId: 'attempt-1',
        resultId: 'result-1',
        answer: correctChoice(choiceId),
      },
    );

    expect(outcome.status).toBe('pending');
    expect(outcome).not.toHaveProperty('result');
    expect(outcome).not.toHaveProperty('verdict');
    expect(await listUnresolvedAttempts({ db: context.db })).toHaveLength(1);
  });
});

describe('tests 7 and 8: runtime timeout and failure after submit are evaluator_error, never incorrect', () => {
  it.each([
    ['timeout', { kind: 'timeout' as const }],
    ['worker failure', { kind: 'failed' as const, reason: 'worker crashed' }],
  ])(
    'records evaluator_error for a %s on the persisted attempt',
    async (_label, result) => {
      const context = await device(
        `lifecycle-${String(_label).replace(' ', '-')}`,
      );
      const outcome = await submitAnswer(
        {
          ...binding(programId),
          runtime: runtimeReturning(result),
          db: context.db,
        },
        {
          attemptId: 'attempt-1',
          resultId: 'result-1',
          answer: { source: 'while True: pass' },
        },
      );

      expect(outcome).toMatchObject({
        status: 'evaluated',
        result: { attemptId: 'attempt-1', outcome: 'evaluator_error' },
      });
    },
  );

  it('records evaluator_error when the runtime itself throws', async () => {
    const context = await device('lifecycle-runtime-throws');
    const runtime: PythonRuntime = {
      status: () => 'available',
      run: async () => {
        throw new Error('initialization failed');
      },
    };

    await expect(
      submitAnswer(
        { ...binding(programId), runtime, db: context.db },
        {
          attemptId: 'attempt-1',
          resultId: 'result-1',
          answer: { source: 'print(1)' },
        },
      ),
    ).resolves.toMatchObject({
      status: 'evaluated',
      result: { outcome: 'evaluator_error' },
    });
  });
});

describe('test 9 and input-surface refusals create no attempt', () => {
  it('refuses a runtime-dependent submit while the runtime is unavailable', async () => {
    const context = await device('lifecycle-capability');
    const outcome = await submitAnswer(
      {
        ...binding(programId),
        runtime: unavailablePythonRuntime,
        db: context.db,
      },
      {
        attemptId: 'attempt-1',
        resultId: 'result-1',
        answer: { source: 'print(1)' },
      },
    );

    expect(outcome).toEqual({
      status: 'refused',
      reason: 'capability_unavailable',
    });
    expect(await listLearnerEvidence({ db: context.db })).toEqual([]);
  });

  it.each([
    ['incomplete', { selected: [] }],
    ['too_large', { source: 'x'.repeat(10_001) }],
  ])('refuses %s input', async (reason, answer) => {
    const context = await device(`lifecycle-refuse-${reason}`);
    const exerciseId = reason === 'too_large' ? programId : choiceId;
    const runtime = runtimeReturning({
      kind: 'completed',
      exitCode: 0,
      stdout: '',
      stderr: '',
    });

    await expect(
      submitAnswer(
        { ...binding(exerciseId), runtime, db: context.db },
        { attemptId: 'attempt-1', resultId: 'result-1', answer },
      ),
    ).resolves.toEqual({ status: 'refused', reason });
    expect(await listLearnerEvidence({ db: context.db })).toEqual([]);
  });

  it('does not evaluate when the attempt commit is blocked by a peer tab', async () => {
    const context = await device('lifecycle-blocked-commit');
    context.db.close();
    const locks = navigator.locks as unknown as FakeLockManager;
    await locks.hold(localCoordinationStorageKeys.presenceLock, 'shared');
    await locks.hold(localCoordinationStorageKeys.writerLock, 'exclusive');
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;
    const runtime = runtimeReturning({
      kind: 'completed',
      exitCode: 0,
      stdout: '1\n',
      stderr: '',
    });

    const outcome = await submitAnswer(
      { ...binding(programId), runtime, db: context.db },
      {
        attemptId: 'attempt-1',
        resultId: 'result-1',
        answer: { source: 'print(1)' },
      },
    );

    expect(outcome.status).toBe('not_persisted');
    expect(runtime.run).not.toHaveBeenCalled();
  });
});

describe('K-3: no gate-item retry exists without an authored or owner-approved rule', () => {
  it('allows formative retries as new attempts', async () => {
    const context = await device('lifecycle-formative-retry');
    const ctx = {
      ...binding(choiceId),
      runtime: unavailablePythonRuntime,
      db: context.db,
    };

    await submitAnswer(ctx, {
      attemptId: 'attempt-1',
      resultId: 'result-1',
      answer: { selected: ['z'] },
    }).catch(() => undefined);
    const wrong = exercises.find(
      (entry) => entry.id === choiceId,
    ) as unknown as {
      options: Array<{ id: string; correct: boolean }>;
    };
    await submitAnswer(ctx, {
      attemptId: 'attempt-2',
      resultId: 'result-2',
      answer: {
        selected: [wrong.options.find((option) => !option.correct)!.id],
      },
    });
    const evidence = await listLearnerEvidence({ db: context.db });

    expect(retryPermission(binding(choiceId), evidence)).toBe('allowed');
    await expect(
      submitAnswer(ctx, {
        attemptId: 'attempt-3',
        resultId: 'result-3',
        answer: correctChoice(choiceId),
      }),
    ).resolves.toMatchObject({
      status: 'evaluated',
      attempt: { attemptNumber: 2 },
    });
  });

  it('refuses a second attempt on a gate item and creates no attempt', async () => {
    const context = await device('lifecycle-gate-retry');
    const ctx = {
      ...binding(gateId),
      runtime: unavailablePythonRuntime,
      db: context.db,
    };
    const gate = exercises.find((entry) => entry.id === gateId) as unknown as {
      options: Array<{ id: string; correct: boolean }>;
    };

    expect(retryPermission(binding(gateId), [])).toBe('first_attempt');
    await submitAnswer(ctx, {
      attemptId: 'attempt-1',
      resultId: 'result-1',
      answer: {
        selected: [gate.options.find((option) => !option.correct)!.id],
      },
    });
    const evidence = await listLearnerEvidence({ db: context.db });

    expect(retryPermission(binding(gateId), evidence)).toBe(
      'blocked_gate_retry_rule_missing',
    );
    await expect(
      submitAnswer(ctx, {
        attemptId: 'attempt-2',
        resultId: 'result-2',
        answer: correctChoice(gateId),
      }),
    ).resolves.toEqual({ status: 'refused', reason: 'retry_rule_missing' });
    expect(
      (await listLearnerEvidence({ db: context.db })).filter(
        (row) => row.kind === 'exercise_attempt',
      ),
    ).toHaveLength(1);
  });
});
