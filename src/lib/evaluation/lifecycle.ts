import {
  UnresolvedAttemptError,
  findUnresolvedAttempts,
  listLearnerEvidence,
  listUnresolvedAttempts,
  recordResultsForUnresolvedAttempts,
  submitAttemptAndRecordResult,
  type DatabaseClock,
  type ProgressPalDatabase,
} from '@/lib/db';
import type {
  EvaluationResultRecord,
  ExerciseAnswer,
  ExerciseAttemptRecord,
  LearnerEvidence,
  LessonExercise,
} from '@/lib/domain';

import { checkAnswerReadiness } from './answers';
import { evaluateExercise, exerciseNeedsRuntime } from './evaluators';
import type { PythonRuntime } from './runtime';

/**
 * The submission lifecycle (E-SCHEMA-1 §3 invariants 5, 7, 10, 11; prompt
 * §3 items 8–11, §4.4):
 *
 *   capability unavailable before submit → refused, no attempt
 *   learner submits → immutable exercise_attempt commits
 *   attempt committed → evaluator runs against that persisted attempt
 *   evaluation completes → immutable evaluation_result commits once
 *   result committed → feedback may be shown
 *
 * Nothing about correctness exists until the result is durable. Every
 * failure after the attempt commits keeps the attempt, unresolved, for
 * recovery. A runtime timeout or failure after submit is `evaluator_error`.
 */

export type SubmissionBinding = {
  readonly programmeId: string;
  readonly contentVersion: number;
  readonly exercise: LessonExercise;
  readonly contentHash: string;
  /** Authored metadata: a module-checkpoint gate item (K-3 applies). */
  readonly masteryGate: boolean;
};

export type SubmissionContext = SubmissionBinding & {
  readonly runtime: PythonRuntime;
  readonly db?: ProgressPalDatabase;
  readonly now?: DatabaseClock;
  /**
   * Interruption seams: the first runs right after the attempt commits (a
   * throw there behaves like a closed tab and propagates), the second right
   * before the result commits (a throw there behaves like a failed result
   * write and leaves the attempt pending).
   */
  readonly afterAttemptCommitted?: (
    attempt: ExerciseAttemptRecord,
  ) => void | Promise<void>;
  readonly beforeResultCommitted?: () => void | Promise<void>;
};

export type SubmissionInput = {
  readonly attemptId: string;
  readonly resultId: string;
  readonly answer: ExerciseAnswer;
};

export type SubmissionRefusal =
  | 'incomplete'
  | 'too_large'
  | 'malformed'
  | 'capability_unavailable'
  | 'retry_rule_missing'
  | 'unresolved_attempt';

export type SubmissionOutcome =
  | { readonly status: 'refused'; readonly reason: SubmissionRefusal }
  | { readonly status: 'not_persisted'; readonly error: unknown }
  | { readonly status: 'pending'; readonly attempt: ExerciseAttemptRecord }
  | {
      readonly status: 'evaluated';
      readonly attempt: ExerciseAttemptRecord;
      readonly result: EvaluationResultRecord;
    };

export type RetryPermission =
  | 'first_attempt'
  | 'allowed'
  | 'blocked_unresolved'
  | 'blocked_gate_retry_rule_missing';

export function subjectIdOf(exercise: LessonExercise): string {
  return exercise.id.toLowerCase();
}

/**
 * Whether a new attempt may be submitted. Formative retry is unlimited
 * (DC-14). A gate item's retry rule (K-3) is not authored and not
 * owner-approved, so no gate-item retry exists: no fallback is chosen.
 */
export function retryPermission(
  binding: Pick<SubmissionBinding, 'exercise' | 'masteryGate'>,
  evidence: readonly LearnerEvidence[],
): RetryPermission {
  const subjectId = subjectIdOf(binding.exercise);
  const subjectEvidence = evidence.filter((row) => row.subjectId === subjectId);
  const attempts = subjectEvidence.filter(
    (row) => row.kind === 'exercise_attempt',
  );

  if (attempts.length === 0) {
    return 'first_attempt';
  }

  if (findUnresolvedAttempts(subjectEvidence).length > 0) {
    return 'blocked_unresolved';
  }

  return binding.masteryGate ? 'blocked_gate_retry_rule_missing' : 'allowed';
}

export async function submitAnswer(
  context: SubmissionContext,
  input: SubmissionInput,
): Promise<SubmissionOutcome> {
  const { exercise } = context;
  const subjectId = subjectIdOf(exercise);
  const evidence = await listLearnerEvidence({
    db: context.db,
    subjectIds: [subjectId],
  });
  const permission = retryPermission(context, evidence);

  if (permission === 'blocked_unresolved') {
    return { status: 'refused', reason: 'unresolved_attempt' };
  }

  if (permission === 'blocked_gate_retry_rule_missing') {
    return { status: 'refused', reason: 'retry_rule_missing' };
  }

  if (
    exerciseNeedsRuntime(exercise) &&
    context.runtime.status() !== 'available'
  ) {
    return { status: 'refused', reason: 'capability_unavailable' };
  }

  const readiness = checkAnswerReadiness(exercise, input.answer);

  if (!readiness.ready) {
    return { status: 'refused', reason: readiness.reason };
  }

  let committed: ExerciseAttemptRecord | null = null;
  let crash: { error: unknown } | null = null;

  try {
    const lifecycle = await submitAttemptAndRecordResult(
      {
        id: input.attemptId,
        programmeId: context.programmeId,
        contentVersion: context.contentVersion,
        subjectId,
        contentHash: context.contentHash,
        responseMode: exercise.response_mode,
        answer: input.answer,
      },
      async (attempt) => {
        committed = attempt;

        try {
          await context.afterAttemptCommitted?.(attempt);
        } catch (error) {
          crash = { error };
          throw error;
        }

        const verdict = await evaluateExercise(exercise, attempt.answer, {
          runtime: context.runtime,
        });
        await context.beforeResultCommitted?.();

        return {
          id: input.resultId,
          outcome: verdict.outcome,
          ...(verdict.matchedFeedbackKey === undefined
            ? {}
            : { matchedFeedbackKey: verdict.matchedFeedbackKey }),
        };
      },
      { db: context.db, now: context.now },
    );

    return lifecycle.result === null
      ? { status: 'pending', attempt: lifecycle.attempt }
      : {
          status: 'evaluated',
          attempt: lifecycle.attempt,
          result: lifecycle.result,
        };
  } catch (error) {
    if (crash !== null) {
      throw (crash as { error: unknown }).error;
    }

    if (committed !== null) {
      return { status: 'pending', attempt: committed };
    }

    if (error instanceof UnresolvedAttemptError) {
      return { status: 'refused', reason: 'unresolved_attempt' };
    }

    return { status: 'not_persisted', error };
  }
}

export type RecoveryOutcome = {
  readonly attemptId: string;
  readonly status: 'recovered' | 'pending';
  readonly result: EvaluationResultRecord | null;
};

/**
 * Finishes interrupted evaluations on load (invariant 10). Each unresolved
 * attempt of the given exercises is evaluated under its own binding: if the
 * current content no longer carries its bound content hash, or the exercise
 * no longer exists, the result is `evaluator_error`; if the capability it
 * needs is unavailable now, it stays pending and nothing is invented. No
 * attempt is ever created here.
 */
export async function recoverUnresolvedAttempts(options: {
  readonly programmeId: string;
  readonly exercises: readonly Pick<
    SubmissionBinding,
    'exercise' | 'contentHash'
  >[];
  readonly runtime: PythonRuntime;
  readonly db?: ProgressPalDatabase;
  readonly now?: DatabaseClock;
}): Promise<RecoveryOutcome[]> {
  const bySubject = new Map(
    options.exercises.map((entry) => [subjectIdOf(entry.exercise), entry]),
  );
  const unresolved = await listUnresolvedAttempts({
    db: options.db,
    programmeId: options.programmeId,
    subjectIds: [...bySubject.keys()],
  });

  if (unresolved.length === 0) {
    return [];
  }

  const statuses = await recordResultsForUnresolvedAttempts(
    unresolved.map((attempt) => attempt.id),
    async (attempt) => {
      const entry = bySubject.get(attempt.subjectId);
      const resultId = `result-${attempt.id}`;

      if (entry === undefined || entry.contentHash !== attempt.contentHash) {
        return { id: resultId, outcome: 'evaluator_error' };
      }

      if (
        exerciseNeedsRuntime(entry.exercise) &&
        options.runtime.status() !== 'available'
      ) {
        return null;
      }

      const verdict = await evaluateExercise(entry.exercise, attempt.answer, {
        runtime: options.runtime,
      });

      return {
        id: resultId,
        outcome: verdict.outcome,
        ...(verdict.matchedFeedbackKey === undefined
          ? {}
          : { matchedFeedbackKey: verdict.matchedFeedbackKey }),
      };
    },
    { db: options.db, now: options.now },
  );

  return statuses.map((status) => ({
    attemptId: status.attemptId,
    status: status.result === null ? 'pending' : 'recovered',
    result: status.result,
  }));
}

/** Client-generated, immutable evidence identity (lowercase entity ID). */
export function createEvidenceId(prefix: string): string {
  const token =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replaceAll('-', '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;

  return `${prefix}-${token.slice(0, 24)}`.toLowerCase();
}
