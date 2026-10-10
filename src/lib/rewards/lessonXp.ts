import type {
  ContentExerciseMeta,
  EvaluationResultRecord,
  ExerciseAttemptRecord,
  LearnerEvidence,
  LessonXpPolicy,
  ProgrammeContentIndex,
} from '@/lib/domain';
import { deriveProgrammeMastery } from '@/lib/mastery';
import type { PotentialXpAward } from '@/lib/xp/engine';

/**
 * Lesson XP for a programme that delivers authored lessons (owner decision
 * 2026-10-03; E-SCHEMA-1A). Pure: given a newly recorded terminal result and
 * every evidence row of its programme, it returns the awards the result
 * qualifies for under the programme's own policy. The repository writes each
 * at most once per programme and source, in the result's own transaction.
 *
 * - Only a `correct` result under the exercise's current content hash can
 *   award. Reading, opening, navigating, revealing a hint, a wrong answer,
 *   `not_evaluable`, `evaluator_error` and `recorded` award nothing, and
 *   nothing is ever taken away.
 * - A solved task earns its ordinary XP once, with or without hints. Its
 *   amount is its family's value, adjusted by the programme's effort rubric
 *   when it has one (introductory, standard or complex; never below 1).
 * - Larger bonuses are kept for independent performance: an unsupported
 *   first answer to a retrieval task, and a cleared module checkpoint.
 * - A lesson completes when every required practice task in it is solved; a
 *   module completes when every required lesson is done and its checkpoint
 *   is cleared.
 */

export type LessonAwardContext = {
  readonly attempt: ExerciseAttemptRecord;
  readonly result: EvaluationResultRecord;
  readonly evidence: readonly LearnerEvidence[];
};

export type LessonAwardPlannerInput = {
  readonly policy: LessonXpPolicy;
  readonly index: ProgrammeContentIndex;
  /** Whether executable Python evaluation is available now. */
  readonly runtimeAvailable: boolean;
};

function fill(template: string, values: Record<string, string>) {
  return template
    .replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match)
    .slice(0, 160);
}

function family(meta: ContentExerciseMeta): keyof LessonXpPolicy['solved'] {
  if (meta.optional) return 'optional';
  if (meta.role === 'checkpoint') return 'checkpoint';
  if (meta.role === 'retrieval') return 'retrieval';
  if (meta.role === 'lab' || meta.role === 'quest') return 'practical';
  return 'formative';
}

export type LessonEffortTier = 'introductory' | 'standard' | 'complex';

/**
 * A task's effort tier under the programme's rubric: a named task first,
 * then its authored response mode. Without a rubric every task is standard.
 */
export function lessonEffortTier(
  policy: LessonXpPolicy,
  meta: Pick<ContentExerciseMeta, 'subjectId' | 'responseMode'>,
): LessonEffortTier {
  const effort = policy.effort;

  if (effort === undefined) {
    return 'standard';
  }

  if (
    effort.complex.subjectIds.includes(meta.subjectId) ||
    effort.complex.responseModes.includes(meta.responseMode)
  ) {
    return 'complex';
  }

  return effort.introductory.responseModes.includes(meta.responseMode)
    ? 'introductory'
    : 'standard';
}

/** The XP a solved task earns: its family's value, adjusted by its tier. */
export function solvedTaskXp(
  policy: LessonXpPolicy,
  meta: ContentExerciseMeta,
): number {
  const base = policy.solved[family(meta)];
  const tier = lessonEffortTier(policy, meta);
  const adjust =
    tier === 'standard' || policy.effort === undefined
      ? 0
      : policy.effort[tier].adjust;

  return Math.max(1, base + adjust);
}

/** Subjects with a `correct` result under their current content hash. */
function solvedSubjects(
  index: ProgrammeContentIndex,
  evidence: readonly LearnerEvidence[],
): Set<string> {
  const hashBySubject = new Map(
    index.exercises.map((entry) => [entry.subjectId, entry.contentHash]),
  );

  return new Set(
    evidence
      .filter(
        (row): row is EvaluationResultRecord =>
          row.kind === 'evaluation_result' &&
          row.outcome === 'correct' &&
          hashBySubject.get(row.subjectId) === row.contentHash,
      )
      .map((row) => row.subjectId),
  );
}

export function planLessonXpAwards(
  input: LessonAwardPlannerInput,
  context: LessonAwardContext,
): PotentialXpAward[] {
  const { policy, index } = input;
  const { attempt, result, evidence } = context;
  const meta = index.exercises.find(
    (entry) => entry.subjectId === attempt.subjectId,
  );

  if (
    result.outcome !== 'correct' ||
    meta === undefined ||
    meta.contentHash !== attempt.contentHash ||
    !meta.evaluable
  ) {
    return [];
  }

  const missions = index.modules.flatMap((module) =>
    module.missions.map((mission) => ({ ...mission, module })),
  );
  const mission = missions.find((entry) => entry.missionId === meta.missionId);
  const module = index.modules.find(
    (entry) => entry.moduleId === meta.moduleId,
  );

  if (mission === undefined || module === undefined) {
    return [];
  }

  const awards: PotentialXpAward[] = [];
  const values = { lesson: mission.title, module: module.title };

  awards.push({
    sourceType: 'exercise_solved',
    sourceId: meta.subjectId,
    xp: solvedTaskXp(policy, meta),
    reason: fill(policy.reasons.solved, values),
  });

  if (meta.rewardEventId !== null) {
    awards.push({
      sourceType: 'authored_milestone',
      sourceId: meta.subjectId,
      xp: policy.authoredMilestone,
      reason: fill(policy.reasons.authoredMilestone, values),
    });
  }

  if (meta.role === 'retrieval' && !meta.optional) {
    const attempts = evidence.filter(
      (row): row is ExerciseAttemptRecord =>
        row.kind === 'exercise_attempt' &&
        row.subjectId === meta.subjectId &&
        row.contentHash === meta.contentHash,
    );
    const firstNumber = Math.min(...attempts.map((row) => row.attemptNumber));
    const independent =
      attempt.attemptNumber === firstNumber &&
      attempt.hintsUsedMax === 0 &&
      !attempt.teachingReopened;

    if (independent) {
      awards.push({
        sourceType: 'independent_recall',
        sourceId: meta.subjectId,
        xp: policy.independentRecall,
        reason: fill(policy.reasons.independentRecall, values),
      });
    }
  }

  const solved = solvedSubjects(index, evidence);
  const missionDone = (missionId: string) =>
    index.exercises
      .filter(
        (entry) => entry.missionId === missionId && entry.requiredPractice,
      )
      .every((entry) => solved.has(entry.subjectId));

  if (
    mission.surface !== 'checkpoint' &&
    !mission.optional &&
    missionDone(mission.missionId)
  ) {
    awards.push({
      sourceType: 'lesson_completed',
      sourceId: mission.itemId,
      xp: policy.lessonCompleted,
      reason: fill(policy.reasons.lessonCompleted, values),
    });
  }

  const mastery = deriveProgrammeMastery({
    index,
    evidence,
    openedMissionIds: new Set(),
    runtimeAvailable: input.runtimeAvailable,
  });

  if (mastery.checkpoints[module.moduleId]?.status === 'cleared') {
    awards.push({
      sourceType: 'checkpoint_cleared',
      sourceId: module.catalogueUnitId,
      xp: policy.checkpointCleared,
      reason: fill(policy.reasons.checkpointCleared, values),
    });

    const lessonsDone = module.missions
      .filter((entry) => !entry.optional && entry.surface !== 'checkpoint')
      .every((entry) => missionDone(entry.missionId));

    if (lessonsDone) {
      awards.push({
        sourceType: 'module_completed',
        sourceId: module.catalogueUnitId,
        xp: policy.moduleCompleted,
        reason: fill(policy.reasons.moduleCompleted, values),
      });
    }
  }

  return awards;
}

/** The planner the repository runs for one programme's results. */
export function createLessonAwardPlanner(input: LessonAwardPlannerInput) {
  return (context: LessonAwardContext) => planLessonXpAwards(input, context);
}
