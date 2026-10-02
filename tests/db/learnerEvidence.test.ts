import { afterEach, describe, expect, it } from 'vitest';

import * as db from '@/lib/db';
import {
  LearnerEvidenceConflictError,
  UnresolvedAttemptError,
  getDatabaseSnapshot,
  getLessonPosition,
  listLearnerEvidence,
  listUnresolvedAttempts,
  recordEvaluationResult,
  recordSupportEvent,
  resetAllData,
  saveLessonPosition,
  submitExerciseAttempt,
} from '@/lib/db';
import { answerBounds } from '@/lib/domain';
import {
  localCoordinationStorageKeys,
  startLocalDataCoordination,
} from '@/lib/storage';

import type { FakeLockManager } from '../lib/localDataCoordinationFakes';
import {
  attemptInput,
  createP2Device,
  evidenceTime,
  hashA,
  hashB,
  p2ProgrammeId,
} from './learnerEvidenceFixture';
import { sampleCourseSeed, type TestDatabaseContext } from './testDatabase';

/**
 * Epic E / E-SCHEMA-1 §3 and §4: the learner-evidence and lesson-position
 * repository. Invariant numbers refer to the schema record §3.1.
 */

const databases: TestDatabaseContext[] = [];
let stopCoordination: (() => void) | null = null;

afterEach(async () => {
  stopCoordination?.();
  stopCoordination = null;
  localStorage.removeItem(localCoordinationStorageKeys.message);
  localStorage.removeItem(localCoordinationStorageKeys.revision);
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

async function device(label: string, options?: { enrol?: boolean }) {
  // Lesson positions must name materialized lesson items of their programme
  // (the backup invariant of E-SCHEMA-1 §7 makes that a write-side rule).
  const context = await createP2Device(label, {
    ...options,
    materialize: options?.enrol !== false,
  });
  databases.push(context);
  return context;
}

describe('invariant 1: append-only — the repository exposes no update or delete for evidence', () => {
  it('exports insert and read paths only', () => {
    const names = Object.keys(db);

    expect(names).toEqual(
      expect.arrayContaining([
        'submitExerciseAttempt',
        'recordEvaluationResult',
        'recordSupportEvent',
        'listLearnerEvidence',
        'listUnresolvedAttempts',
        'saveLessonPosition',
        'getLessonPosition',
      ]),
    );
    expect(
      names.filter((name) =>
        /^(?:update|delete|remove|clear|replace|edit|overwrite|put)[A-Z].*(?:Evidence|Attempt|Result|Support|Checkpoint)/.test(
          name,
        ),
      ),
    ).toEqual([]);
  });
});

describe('exercise attempts (invariants 2, 4, 10)', () => {
  it('persists the first submitted answer as attempt 1 with no outcome', async () => {
    const context = await device('evidence-first-attempt');

    const { record, created } = await submitExerciseAttempt(attemptInput(), {
      db: context.db,
      now: () => evidenceTime,
    });

    expect(created).toBe(true);
    expect(record).toEqual({
      id: 'attempt-1',
      kind: 'exercise_attempt',
      programmeId: p2ProgrammeId,
      contentVersion: 1,
      subjectId: 's1-m01-p01-e05',
      contentHash: hashA,
      recordedAt: evidenceTime,
      attemptNumber: 1,
      responseMode: 'mcq',
      answer: { selected: ['a'] },
      hintsUsedMax: 0,
      teachingReopened: false,
    });
    expect(record).not.toHaveProperty('outcome');
    expect(await listLearnerEvidence({ db: context.db })).toEqual([record]);
  });

  it('refuses a new submit for a subject while an attempt is unresolved, and numbers the next attempt after the result', async () => {
    const context = await device('evidence-unresolved');
    await submitExerciseAttempt(attemptInput(), { db: context.db });

    await expect(
      submitExerciseAttempt(
        attemptInput({ id: 'attempt-2', answer: { selected: ['b'] } }),
        { db: context.db },
      ),
    ).rejects.toBeInstanceOf(UnresolvedAttemptError);
    expect(await listLearnerEvidence({ db: context.db })).toHaveLength(1);

    await recordEvaluationResult(
      { id: 'result-1', attemptId: 'attempt-1', outcome: 'incorrect' },
      { db: context.db },
    );
    const second = await submitExerciseAttempt(
      attemptInput({ id: 'attempt-2', answer: { selected: ['b'] } }),
      { db: context.db },
    );

    expect(second.record.attemptNumber).toBe(2);
  });

  it('treats a replayed submit with the same id and payload as a no-op returning the stored row', async () => {
    const context = await device('evidence-idempotent-attempt');
    const first = await submitExerciseAttempt(attemptInput(), {
      db: context.db,
      now: () => evidenceTime,
    });
    const replay = await submitExerciseAttempt(attemptInput(), {
      db: context.db,
      now: () => '2026-10-03T11:00:00.000Z',
    });

    expect(replay.created).toBe(false);
    expect(replay.record).toEqual(first.record);
    expect(await listLearnerEvidence({ db: context.db })).toHaveLength(1);
  });

  it('fails closed when the same id carries a different submission payload', async () => {
    const context = await device('evidence-conflicting-attempt');
    await submitExerciseAttempt(attemptInput(), { db: context.db });

    await expect(
      submitExerciseAttempt(attemptInput({ answer: { selected: ['c'] } }), {
        db: context.db,
      }),
    ).rejects.toBeInstanceOf(LearnerEvidenceConflictError);
    expect((await listLearnerEvidence({ db: context.db }))[0]).toMatchObject({
      answer: { selected: ['a'] },
    });
  });

  it('numbers attempts per subject across content versions without restarting', async () => {
    const context = await device('evidence-numbering-versions');

    for (const [index, version] of [1, 1, 2].entries()) {
      const id = `attempt-v${index}`;
      await submitExerciseAttempt(
        attemptInput({
          id,
          contentVersion: version,
          contentHash: version === 1 ? hashA : hashB,
        }),
        { db: context.db },
      );
      await recordEvaluationResult(
        { id: `result-v${index}`, attemptId: id, outcome: 'incorrect' },
        { db: context.db },
      );
    }

    const attempts = (await listLearnerEvidence({ db: context.db })).filter(
      (row) => row.kind === 'exercise_attempt',
    );

    expect(
      attempts.map((row) => [row.contentVersion, row.attemptNumber]),
    ).toEqual([
      [1, 1],
      [1, 2],
      [2, 3],
    ]);
  });

  it('rejects an over-bound answer and writes nothing', async () => {
    const context = await device('evidence-over-bound');

    await expect(
      submitExerciseAttempt(
        attemptInput({
          responseMode: 'program',
          subjectId: 's1-m01-p06-e04',
          answer: { source: 'x'.repeat(answerBounds.programSourceChars + 1) },
        }),
        { db: context.db },
      ),
    ).rejects.toThrow();
    expect(await listLearnerEvidence({ db: context.db })).toEqual([]);
  });

  it('rejects an answer whose shape does not match its response mode', async () => {
    const context = await device('evidence-wrong-shape');

    await expect(
      submitExerciseAttempt(
        attemptInput({ responseMode: 'predict', answer: { selected: ['a'] } }),
        { db: context.db },
      ),
    ).rejects.toThrow();
    expect(await listLearnerEvidence({ db: context.db })).toEqual([]);
  });

  it('rejects evidence for an authorized programme that is not enrolled', async () => {
    const context = await device('evidence-unenrolled', { enrol: false });

    await expect(
      submitExerciseAttempt(attemptInput(), { db: context.db }),
    ).rejects.toThrow(/not enrolled/);
  });

  it('rejects evidence naming an unregistered programme', async () => {
    const context = await device('evidence-unknown-programme');

    await expect(
      submitExerciseAttempt(
        attemptInput({ programmeId: 'unknown-programme' }),
        {
          db: context.db,
        },
      ),
    ).rejects.toThrow(/not an authorized programme/);
  });

  it('rejects a malformed content hash', async () => {
    const context = await device('evidence-bad-hash');

    await expect(
      submitExerciseAttempt(attemptInput({ contentHash: 'not-a-hash' }), {
        db: context.db,
      }),
    ).rejects.toThrow();
  });
});

describe('evaluation results (invariants 4, 11)', () => {
  it('links exactly one terminal result to its attempt and copies the attempt binding', async () => {
    const context = await device('evidence-result-link');
    await submitExerciseAttempt(attemptInput(), { db: context.db });

    const { record, created } = await recordEvaluationResult(
      {
        id: 'result-1',
        attemptId: 'attempt-1',
        outcome: 'incorrect',
        matchedFeedbackKey: 'option:b',
      },
      { db: context.db, now: () => '2026-10-03T10:00:05.000Z' },
    );

    expect(created).toBe(true);
    expect(record).toEqual({
      id: 'result-1',
      kind: 'evaluation_result',
      programmeId: p2ProgrammeId,
      contentVersion: 1,
      subjectId: 's1-m01-p01-e05',
      contentHash: hashA,
      recordedAt: '2026-10-03T10:00:05.000Z',
      attemptId: 'attempt-1',
      outcome: 'incorrect',
      matchedFeedbackKey: 'option:b',
    });
    expect(await listUnresolvedAttempts({ db: context.db })).toEqual([]);
  });

  it('treats an identical replay for the same attempt as a no-op even under a new id', async () => {
    const context = await device('evidence-result-replay');
    await submitExerciseAttempt(attemptInput(), { db: context.db });
    const first = await recordEvaluationResult(
      { id: 'result-1', attemptId: 'attempt-1', outcome: 'correct' },
      { db: context.db },
    );
    const replay = await recordEvaluationResult(
      { id: 'result-recovered', attemptId: 'attempt-1', outcome: 'correct' },
      { db: context.db },
    );

    expect(replay.created).toBe(false);
    expect(replay.record).toEqual(first.record);
    expect(
      (await listLearnerEvidence({ db: context.db })).filter(
        (row) => row.kind === 'evaluation_result',
      ),
    ).toHaveLength(1);
  });

  it('fails closed on a conflicting second result and keeps the stored result', async () => {
    const context = await device('evidence-result-conflict');
    await submitExerciseAttempt(attemptInput(), { db: context.db });
    await recordEvaluationResult(
      { id: 'result-1', attemptId: 'attempt-1', outcome: 'incorrect' },
      { db: context.db },
    );

    await expect(
      recordEvaluationResult(
        { id: 'result-2', attemptId: 'attempt-1', outcome: 'correct' },
        { db: context.db },
      ),
    ).rejects.toBeInstanceOf(LearnerEvidenceConflictError);
    await expect(
      recordEvaluationResult(
        { id: 'result-1', attemptId: 'attempt-1', outcome: 'evaluator_error' },
        { db: context.db },
      ),
    ).rejects.toBeInstanceOf(LearnerEvidenceConflictError);

    const results = (await listLearnerEvidence({ db: context.db })).filter(
      (row) => row.kind === 'evaluation_result',
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ outcome: 'incorrect' });
  });

  it('rejects a result whose attemptId names no attempt or a non-attempt row', async () => {
    const context = await device('evidence-result-dangling');
    await recordSupportEvent(
      {
        id: 'support-1',
        programmeId: p2ProgrammeId,
        contentVersion: 1,
        subjectId: 's1-m01-p01-e05',
        contentHash: hashA,
        supportKind: 'hint_reveal',
        hintNumber: 1,
      },
      { db: context.db },
    );

    await expect(
      recordEvaluationResult(
        { id: 'result-x', attemptId: 'missing-attempt', outcome: 'correct' },
        { db: context.db },
      ),
    ).rejects.toThrow();
    await expect(
      recordEvaluationResult(
        { id: 'result-y', attemptId: 'support-1', outcome: 'correct' },
        { db: context.db },
      ),
    ).rejects.toThrow();
  });

  it('accepts only the five enumerated outcomes', async () => {
    const context = await device('evidence-outcome-enum');
    await submitExerciseAttempt(attemptInput(), { db: context.db });

    await expect(
      recordEvaluationResult(
        {
          id: 'result-1',
          attemptId: 'attempt-1',
          outcome: 'timeout' as never,
        },
        { db: context.db },
      ),
    ).rejects.toThrow();
  });
});

describe('support events (invariant 6 data side) and supported-attempt accounting', () => {
  it('requires hintNumber exactly for hint_reveal', async () => {
    const context = await device('evidence-support-shape');
    const base = {
      programmeId: p2ProgrammeId,
      contentVersion: 1,
      subjectId: 's1-m01-p01-e05',
      contentHash: hashA,
    };

    await expect(
      recordSupportEvent(
        { ...base, id: 'support-1', supportKind: 'hint_reveal' },
        { db: context.db },
      ),
    ).rejects.toThrow();
    await expect(
      recordSupportEvent(
        {
          ...base,
          id: 'support-2',
          supportKind: 'teaching_reopened',
          hintNumber: 1,
        },
        { db: context.db },
      ),
    ).rejects.toThrow();
  });

  it('marks later attempts with the cumulative highest hint revealed at the bound content hash', async () => {
    const context = await device('evidence-hints-cumulative');
    const base = {
      programmeId: p2ProgrammeId,
      contentVersion: 1,
      subjectId: 's1-m01-p01-e05',
      supportKind: 'hint_reveal' as const,
    };
    await recordSupportEvent(
      { ...base, id: 'hint-1', contentHash: hashA, hintNumber: 1 },
      { db: context.db },
    );
    await recordSupportEvent(
      { ...base, id: 'hint-2', contentHash: hashA, hintNumber: 2 },
      { db: context.db },
    );
    await recordSupportEvent(
      { ...base, id: 'hint-other-hash', contentHash: hashB, hintNumber: 3 },
      { db: context.db },
    );

    const first = await submitExerciseAttempt(attemptInput(), {
      db: context.db,
    });
    await recordEvaluationResult(
      { id: 'result-1', attemptId: 'attempt-1', outcome: 'incorrect' },
      { db: context.db },
    );
    const second = await submitExerciseAttempt(
      attemptInput({ id: 'attempt-2', answer: { selected: ['b'] } }),
      { db: context.db },
    );

    expect(first.record.hintsUsedMax).toBe(2);
    expect(second.record.hintsUsedMax).toBe(2);
  });

  it('marks an attempt after recorded teaching reopening as supported', async () => {
    const context = await device('evidence-teaching-reopened');
    await recordSupportEvent(
      {
        id: 'reopen-1',
        programmeId: p2ProgrammeId,
        contentVersion: 1,
        subjectId: 's1-m01-p01-e05',
        contentHash: hashA,
        supportKind: 'teaching_reopened',
      },
      { db: context.db },
    );

    const { record } = await submitExerciseAttempt(attemptInput(), {
      db: context.db,
    });

    expect(record.teachingReopened).toBe(true);
  });

  it('records a support event idempotently by id', async () => {
    const context = await device('evidence-support-idempotent');
    const input = {
      id: 'hint-1',
      programmeId: p2ProgrammeId,
      contentVersion: 1,
      subjectId: 's1-m01-p01-e05',
      contentHash: hashA,
      supportKind: 'hint_reveal' as const,
      hintNumber: 1,
    };

    const first = await recordSupportEvent(input, { db: context.db });
    const replay = await recordSupportEvent(input, { db: context.db });

    expect(first.created).toBe(true);
    expect(replay.created).toBe(false);
    await expect(
      recordSupportEvent({ ...input, hintNumber: 2 }, { db: context.db }),
    ).rejects.toBeInstanceOf(LearnerEvidenceConflictError);
  });
});

describe('§9: a read-only tab commits no evidence or position', () => {
  it('blocks an attempt, a hint and a position while a peer tab owns writing', async () => {
    const context = await device('evidence-peer-blocked');
    const before = await getDatabaseSnapshot({ db: context.db });
    context.db.close();
    const locks = navigator.locks as unknown as FakeLockManager;
    await locks.hold(localCoordinationStorageKeys.presenceLock, 'shared');
    await locks.hold(localCoordinationStorageKeys.writerLock, 'exclusive');
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    await expect(
      submitExerciseAttempt(attemptInput(), { db: context.db }),
    ).rejects.toMatchObject({ name: 'LocalWriteBlockedError' });
    await expect(
      recordSupportEvent(
        {
          id: 'hint-1',
          programmeId: p2ProgrammeId,
          contentVersion: 1,
          subjectId: 's1-m01-p01-e05',
          contentHash: hashA,
          supportKind: 'hint_reveal',
          hintNumber: 1,
        },
        { db: context.db },
      ),
    ).rejects.toMatchObject({ name: 'LocalWriteBlockedError' });
    await expect(
      saveLessonPosition(
        {
          itemId: 's1-m01-o01',
          programmeId: p2ProgrammeId,
          contentVersion: 1,
          unitId: 's1-m01-l01',
          stepIndex: 3,
        },
        { db: context.db },
      ),
    ).rejects.toMatchObject({ name: 'LocalWriteBlockedError' });
    expect(await getDatabaseSnapshot({ db: context.db })).toEqual(before);
  });
});

describe('E-SCHEMA-1 §4: lesson positions', () => {
  it('upserts one mutable bookmark per lesson item', async () => {
    const context = await device('position-upsert');
    const first = await saveLessonPosition(
      {
        itemId: 's1-m02-o05',
        programmeId: p2ProgrammeId,
        contentVersion: 1,
        unitId: 's1-m02-p05',
        stepIndex: 4,
        phaseId: 's1-m02-o05-f2',
      },
      { db: context.db, now: () => evidenceTime },
    );
    const second = await saveLessonPosition(
      {
        itemId: 's1-m02-o05',
        programmeId: p2ProgrammeId,
        contentVersion: 1,
        unitId: 's1-m02-p05',
        stepIndex: 9,
        phaseId: 's1-m02-o05-f3',
      },
      { db: context.db, now: () => '2026-10-03T12:00:00.000Z' },
    );

    expect(second).toEqual({
      ...first,
      stepIndex: 9,
      phaseId: 's1-m02-o05-f3',
      updatedAt: '2026-10-03T12:00:00.000Z',
    });
    expect(await getLessonPosition('s1-m02-o05', { db: context.db })).toEqual(
      second,
    );
    expect(
      (await getDatabaseSnapshot({ db: context.db })).lessonPositions,
    ).toHaveLength(1);
  });

  it('returns null for a lesson with no bookmark and rejects an invalid step index', async () => {
    const context = await device('position-invalid');

    expect(
      await getLessonPosition('s1-m01-o01', { db: context.db }),
    ).toBeNull();
    await expect(
      saveLessonPosition(
        {
          itemId: 's1-m01-o01',
          programmeId: p2ProgrammeId,
          contentVersion: 1,
          unitId: 's1-m01-l01',
          stepIndex: -1,
        },
        { db: context.db },
      ),
    ).rejects.toThrow();
  });
});

describe('E-SCHEMA-1 §7: reset and snapshot cover both stores', () => {
  it('includes both stores in the snapshot and empties them on reset', async () => {
    const context = await device('evidence-reset');
    await submitExerciseAttempt(attemptInput(), { db: context.db });
    await saveLessonPosition(
      {
        itemId: 's1-m01-o01',
        programmeId: p2ProgrammeId,
        contentVersion: 1,
        unitId: 's1-m01-l01',
        stepIndex: 2,
      },
      { db: context.db },
    );

    const before = await getDatabaseSnapshot({ db: context.db });
    expect(before.learnerEvidence).toHaveLength(1);
    expect(before.lessonPositions).toHaveLength(1);

    await resetAllData({ db: context.db, seed: sampleCourseSeed });
    const after = await getDatabaseSnapshot({ db: context.db });

    expect(after.learnerEvidence).toEqual([]);
    expect(after.lessonPositions).toEqual([]);
    expect(after.appMeta?.activeProgrammeId).toBe('cs50x');
  });
});
