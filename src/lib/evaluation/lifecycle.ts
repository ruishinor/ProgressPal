import {
  UnresolvedAttemptError,
  findUnresolvedAttempts,
  listLearnerEvidence,
  listUnresolvedAttempts,
  recordResultsForUnresolvedAttempts,
  submitAttemptAndRecordResult,
  type DatabaseClock,
  type EvidenceAchievementPlanner,
  type EvidenceAwardPlanner,
  type ProgressPalDatabase,
} from '@/lib/db';
import type {
  AchievementUnlock,
  EvaluationResultRecord,
  ExerciseAnswer,
  ExerciseAttemptRecord,
  LearnerEvidence,
  LessonExercise,
  LevelCurve,
  XpTransaction,
} from '@/lib/domain';
import type { XpSummary } from '@/lib/xp/engine';

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
 * recovery; that includes a failed XP award planning, which rolls the result
 * back with its XP (a result and its qualifying XP commit together). A
 * runtime timeout or failure after submit is `evaluator_error`.
 */

export type SubmissionBinding = {
  readonly programmeId: string;
  readonly contentVersion: number;
  readonly exercise: LessonExercise;
  readonly contentHash: string;
  /** Authored metadata: a module-checkpoint gate item (K-3 applies). */
  readonly masteryGate: boolean;
  /**
   * Whether the content carries the owner-approved gate retry rule (K-3,
   * 2026-10-03). Without it a gate item has no retry (fail closed).
   */
  readonly gateRetryRule?: boolean;
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
  /** The programme's lesson XP rules, run in the result's transaction. */
  readonly awardXp?: EvidenceAwardPlanner;
  /** Evidence-backed achievements, committed with the terminal result. */
  readonly awardAchievements?: EvidenceAchievementPlanner;
  /** The programme's level curve for the reward summary. */
  readonly levelCurve?: LevelCurve;
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
      /** XP the result earned in its programme (empty without awards). */
      readonly awardedTransactions: readonly XpTransaction[];
      /**
       * Present only when a reward planner participated: the reward-mutation
       * shape the shell announces level-ups and achievements from. Callers
       * with no planner never see either field.
       */
      readonly xpSummary?: XpSummary;
      /** Achievements the result unlocked; empty when only XP was planned. */
      readonly unlockedAchievements?: readonly AchievementUnlock[];
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
 * (DC-14). A gate item may be retried only under the owner-approved K-3 rule
 * the content carries (2026-10-03): a retry is a new attempt on the same
 * task, and success after a failure there reaches at most Practised from
 * that task (the mastery engine applies that). Without the rule no gate-item
 * retry exists and no fallback is chosen.
 */
export function retryPermission(
  binding: Pick<
    SubmissionBinding,
    'exercise' | 'masteryGate' | 'gateRetryRule'
  >,
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

  return binding.masteryGate && binding.gateRetryRule !== true
    ? 'blocked_gate_retry_rule_missing'
    : 'allowed';
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
      {
        db: context.db,
        now: context.now,
        awardXp: context.awardXp,
        awardAchievements: context.awardAchievements,
        levelCurve: context.levelCurve,
      },
    );

    return lifecycle.result === null
      ? { status: 'pending', attempt: lifecycle.attempt }
      : {
          status: 'evaluated',
          attempt: lifecycle.attempt,
          result: lifecycle.result,
          awardedTransactions: lifecycle.awardedTransactions,
          ...(lifecycle.xpSummary === null
            ? {}
            : {
                xpSummary: lifecycle.xpSummary,
                unlockedAchievements: lifecycle.unlockedAchievements ?? [],
              }),
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
  /** Present only when an achievement planner participated. */
  readonly unlockedAchievements?: readonly AchievementUnlock[];
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
  /** The programme's lesson XP rules, run in each result's transaction. */
  readonly awardXp?: EvidenceAwardPlanner;
  /** Evidence-backed achievements, committed with each recovered result. */
  readonly awardAchievements?: EvidenceAchievementPlanner;
  /** The programme's level curve for each recovered result's summary. */
  readonly levelCurve?: LevelCurve;
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
    {
      db: options.db,
      now: options.now,
      awardXp: options.awardXp,
      awardAchievements: options.awardAchievements,
      levelCurve: options.levelCurve,
    },
  );

  return statuses.map((status) => ({
    attemptId: status.attemptId,
    status: status.result === null ? 'pending' : 'recovered',
    result: status.result,
    ...(status.unlockedAchievements === undefined
      ? {}
      : { unlockedAchievements: status.unlockedAchievements }),
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
