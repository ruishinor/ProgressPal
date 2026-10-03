import type {
  ContentExerciseMeta,
  ContentSkill,
  EvaluationOutcome,
  EvaluationResultRecord,
  ExerciseAttemptRecord,
  LearnerEvidence,
  ProgrammeContentIndex,
} from '@/lib/domain';

/**
 * The mastery engine (Epic E §3 items 12–14; DC-28 to DC-32; `08`). Pure:
 * everything here is derived from persisted evidence and the content
 * version's rules on every read, and nothing it returns is ever stored.
 *
 * - Only `correct` and `incorrect` results on deterministic or structured
 *   items under the current content hash count. `not_evaluable`,
 *   `evaluator_error`, `recorded`, unresolved attempts, self-reported paste,
 *   reflections, stale bindings and unknown subjects never count, and are
 *   never a "first counted attempt".
 * - Success with any hint or reopened teaching is supported: it reaches
 *   Practised and is never Demonstrated or retained evidence.
 * - Checkpoints follow the owner-approved K-4 rule (2026-10-03) the content
 *   carries: a module checkpoint clears, at level D and never S, only when
 *   every gating checkpoint task has a qualifying (counting, correct,
 *   unsupported) result on each of its gate items. No averaging: one failed
 *   critical criterion keeps the checkpoint not yet cleared. Pending,
 *   unresolved, not_evaluable, evaluator_error and supported successes never
 *   qualify. Without a rule in the content nothing is judged.
 * - Retries follow the owner-approved K-3 rule: a retry is a new attempt on
 *   the same task; success after an earlier failure or support on that task
 *   can clear its criterion but reaches at most Practised from that task.
 *   Demonstrated needs an independent first success on a checkpoint task, or
 *   later independent retrieval; Retained needs that plus later retrieval
 *   after separation. A stored checkpoint result is never trusted.
 * - Retained evidence follows curriculum separation, never elapsed time:
 *   an unsupported first answer to a retrieval item in an authored
 *   opportunity unit, or after a later module's checkpoint was attempted.
 * - Opening or reading content is progress, not competence: it can make a
 *   skill Recognised (introduced), never Practised.
 */

export type MasteryInput = {
  readonly index: ProgrammeContentIndex;
  readonly evidence: readonly LearnerEvidence[];
  /** Source mission IDs the learner has opened (lesson-level progress). */
  readonly openedMissionIds: ReadonlySet<string>;
  /** Whether executable Python evaluation is available. */
  readonly runtimeAvailable: boolean;
};

export type AttemptClassification =
  | 'counting'
  | 'unresolved'
  | 'non_counting_outcome'
  | 'non_counting_trust'
  | 'stale_binding'
  | 'unknown_subject'
  | 'newer_content';

export type AttemptAssessment = {
  readonly attemptId: string;
  readonly subjectId: string;
  readonly exerciseId: string | null;
  readonly classification: AttemptClassification;
  readonly counting: boolean;
  readonly outcome: EvaluationOutcome | null;
  readonly correct: boolean;
  readonly supported: boolean;
  readonly recordedAt: string;
};

export type SkillState =
  | 'unseen'
  | 'recognised'
  | 'practised'
  | 'demonstrated'
  | 'retained'
  | 'integrated';

export type SkillMastery = {
  readonly skillId: string;
  readonly state: SkillState;
  /** Whether Demonstrated can be judged under this content version's rule. */
  readonly demonstration: 'judged' | 'cannot_determine_checkpoint_rule_missing';
  readonly firstCountedAttemptId: string | null;
  readonly unsupportedCorrectCount: number;
  readonly supportedCorrectCount: number;
  readonly retainedEvidence: boolean;
  readonly retentionOpportunity: 'available' | 'none_authored';
  /** A soft recommendation by curriculum distance; it never gates. */
  readonly retrievalDue: boolean;
};

export type CheckpointCriterion = {
  readonly key: 'c' | 'd' | 'r' | 'x';
  /** NY (not yet) or D (demonstrated); S is never derived automatically. */
  readonly level: 'NY' | 'D';
  /** Gate items of the criterion and whether each has qualifying evidence. */
  readonly items: ReadonlyArray<{
    readonly subjectId: string;
    readonly qualifying: boolean;
  }>;
};

export type CheckpointJudgement = {
  readonly moduleId: string;
  readonly status: 'cleared' | 'not_yet' | 'rule_missing';
  readonly ruleId: string | null;
  readonly criteria: readonly CheckpointCriterion[];
  /** Gate attempts whose terminal results qualify (correct or incorrect). */
  readonly basisAttemptIds: readonly string[];
  readonly storedResults: ReadonlyArray<{
    readonly id: string;
    readonly disposition: 'cannot_determine';
  }>;
};

export type ModuleBlocker =
  | 'checkpoint_rule_missing'
  | 'checkpoint_not_cleared'
  | 'executable_evaluation_unavailable';

export type ModuleReadiness = {
  readonly moduleId: string;
  readonly cleared: boolean;
  readonly blockers: readonly ModuleBlocker[];
  /** Required gate evidence; runtime items stay in the denominator. */
  readonly requiredGateEvidence: {
    readonly total: number;
    readonly counted: number;
    readonly runtimeUnavailable: readonly string[];
  };
};

export type RetrievalSetPresentation = {
  readonly unitId: string;
  readonly missionId: string;
  readonly lessonClosed: true;
  readonly items: ReadonlyArray<{
    readonly exerciseId: string;
    readonly subjectId: string;
    readonly alreadyCorrect: boolean;
  }>;
};

export type ProgrammeMastery = {
  readonly skills: Readonly<Record<string, SkillMastery>>;
  readonly checkpoints: Readonly<Record<string, CheckpointJudgement>>;
  readonly modules: Readonly<Record<string, ModuleReadiness>>;
  readonly retrieval: Readonly<Record<string, RetrievalSetPresentation>>;
  readonly attempts: ReadonlyMap<string, AttemptAssessment>;
  /** Evidence from newer content than the app carries is not interpreted. */
  readonly cannotDetermine: boolean;
};

const trustedEvidence = new Set([
  'deterministic-evaluator',
  'structured-reasoning',
]);

const byRecordedOrder = (
  left: { recordedAt: string; attemptId: string },
  right: { recordedAt: string; attemptId: string },
) =>
  left.recordedAt.localeCompare(right.recordedAt) ||
  left.attemptId.localeCompare(right.attemptId);

function classifyAttempts(
  index: ProgrammeContentIndex,
  evidence: readonly LearnerEvidence[],
): Map<string, AttemptAssessment> {
  const metaBySubject = new Map(
    index.exercises.map((entry) => [entry.subjectId, entry]),
  );
  const resultByAttempt = new Map(
    evidence
      .filter(
        (row): row is EvaluationResultRecord =>
          row.kind === 'evaluation_result',
      )
      .map((row) => [row.attemptId, row]),
  );
  const assessments = new Map<string, AttemptAssessment>();

  for (const row of evidence) {
    if (row.kind !== 'exercise_attempt') {
      continue;
    }

    const attempt = row as ExerciseAttemptRecord;
    const meta = metaBySubject.get(attempt.subjectId);
    const result = resultByAttempt.get(attempt.id);
    const outcome = result?.outcome ?? null;
    const supported = attempt.hintsUsedMax > 0 || attempt.teachingReopened;
    let classification: AttemptClassification;

    if (attempt.contentVersion > index.contentVersion) {
      classification = 'newer_content';
    } else if (meta === undefined) {
      classification = 'unknown_subject';
    } else if (meta.contentHash !== attempt.contentHash) {
      classification = 'stale_binding';
    } else if (result === undefined) {
      classification = 'unresolved';
    } else if (outcome !== 'correct' && outcome !== 'incorrect') {
      classification = 'non_counting_outcome';
    } else if (
      !trustedEvidence.has(meta.evidenceTrust) ||
      meta.evidenceLayer === 'C'
    ) {
      classification = 'non_counting_trust';
    } else {
      classification = 'counting';
    }

    assessments.set(attempt.id, {
      attemptId: attempt.id,
      subjectId: attempt.subjectId,
      exerciseId: meta?.exerciseId ?? null,
      classification,
      counting: classification === 'counting',
      outcome,
      correct: classification === 'counting' && outcome === 'correct',
      supported,
      recordedAt: attempt.recordedAt,
    });
  }

  return assessments;
}

function moduleOrder(index: ProgrammeContentIndex) {
  return new Map(
    index.modules.map((module) => [module.moduleId, module.order]),
  );
}

/**
 * Whether a later answer counts as retained evidence for a skill: unsupported
 * and correct, on a trusted retrieval item answered for the first time, after
 * qualifying earlier evidence, and separated by curriculum distance.
 */
function hasRetainedEvidence(
  skill: ContentSkill,
  index: ProgrammeContentIndex,
  assessments: readonly AttemptAssessment[],
  metaByExercise: ReadonlyMap<string, ContentExerciseMeta>,
): boolean {
  const order = moduleOrder(index);
  const introducedOrder = order.get(skill.introducedInModule) ?? 0;
  const opportunityUnits = new Set(skill.retention.opportunityUnits);
  const ordered = [...assessments].sort(byRecordedOrder);
  const skillAttempts = ordered.filter((entry) => {
    const meta =
      entry.exerciseId === null
        ? undefined
        : metaByExercise.get(entry.exerciseId);
    return meta?.skillIds.includes(skill.skillId) ?? false;
  });

  return skillAttempts.some((candidate, position) => {
    const meta = metaByExercise.get(candidate.exerciseId ?? '');

    if (
      meta === undefined ||
      !candidate.counting ||
      !candidate.correct ||
      candidate.supported
    ) {
      return false;
    }

    const isRetrievalItem =
      meta.role === 'retrieval' || meta.checkpointTask === 'r';
    const firstOnItem = !ordered
      .slice(0, ordered.indexOf(candidate))
      .some((earlier) => earlier.exerciseId === candidate.exerciseId);
    const earlierQualifying = skillAttempts
      .slice(0, position)
      .filter(
        (earlier) =>
          earlier.counting &&
          earlier.correct &&
          !earlier.supported &&
          earlier.exerciseId !== candidate.exerciseId,
      );

    if (!isRetrievalItem || !firstOnItem || earlierQualifying.length === 0) {
      return false;
    }

    if (opportunityUnits.has(meta.unitId)) {
      return true;
    }

    // Separation by a later module checkpoint attempted after the
    // qualifying evidence and before this answer.
    const firstQualifying = earlierQualifying[0]!;
    return ordered.some((between) => {
      const betweenMeta = metaByExercise.get(between.exerciseId ?? '');

      return (
        betweenMeta !== undefined &&
        betweenMeta.role === 'checkpoint' &&
        (order.get(betweenMeta.moduleId) ?? 0) > introducedOrder &&
        byRecordedOrder(between, firstQualifying) > 0 &&
        byRecordedOrder(between, candidate) < 0
      );
    });
  });
}

export function deriveProgrammeMastery(input: MasteryInput): ProgrammeMastery {
  const { index, evidence } = input;
  const attemptMap = classifyAttempts(index, evidence);
  const assessments = [...attemptMap.values()];
  const metaByExercise = new Map(
    index.exercises.map((entry) => [entry.exerciseId, entry]),
  );
  const contentUnitIds = new Set(index.units.map((unit) => unit.unitId));
  const cannotDetermine = assessments.some(
    (entry) => entry.classification === 'newer_content',
  );

  const rule = index.checkpointRules[0] ?? null;
  const ruleAvailable = rule !== null;
  const ordered = [...assessments].sort(byRecordedOrder);
  /** K-4: a counting, correct, unsupported result on the subject, any attempt. */
  const qualifies = (subjectId: string) =>
    assessments.some(
      (entry) =>
        entry.subjectId === subjectId && entry.correct && !entry.supported,
    );
  /** K-3: the first counted attempt on the subject is correct and unsupported. */
  const independentFirstSuccess = (subjectId: string) => {
    const first = ordered.find(
      (entry) => entry.subjectId === subjectId && entry.counting,
    );
    return first !== undefined && first.correct && !first.supported;
  };

  const skills: Record<string, SkillMastery> = {};

  for (const skill of index.skills) {
    const carrying = assessments
      .filter((entry) =>
        entry.exerciseId === null
          ? false
          : (metaByExercise
              .get(entry.exerciseId)
              ?.skillIds.includes(skill.skillId) ?? false),
      )
      .sort(byRecordedOrder);
    const counted = carrying.filter((entry) => entry.counting);
    const correct = counted.filter((entry) => entry.correct);
    const introducedBy = index.units
      .filter((unit) => unit.teaches.includes(skill.skillId))
      .map((unit) => unit.missionId);
    const exposed =
      carrying.some((entry) => entry.classification !== 'unresolved') ||
      introducedBy.some((missionId) => input.openedMissionIds.has(missionId));
    const retained =
      !cannotDetermine &&
      hasRetainedEvidence(skill, index, assessments, metaByExercise);
    // K-3: only an independent first success on a task can demonstrate from
    // that task; later independent retrieval demonstrates too.
    const demonstratedByCheckpoint =
      ruleAvailable &&
      !cannotDetermine &&
      index.exercises.some(
        (entry) =>
          entry.masteryGate &&
          entry.role === 'checkpoint' &&
          entry.skillIds.includes(skill.skillId) &&
          independentFirstSuccess(entry.subjectId),
      );
    const demonstrated =
      ruleAvailable && (demonstratedByCheckpoint || retained);
    const opportunity = skill.retention.opportunityUnits.some((unitId) =>
      contentUnitIds.has(unitId),
    )
      ? 'available'
      : 'none_authored';
    const state: SkillState =
      cannotDetermine && counted.length > 0
        ? 'recognised'
        : demonstrated && retained
          ? 'retained'
          : demonstrated
            ? 'demonstrated'
            : correct.length > 0
              ? 'practised'
              : exposed
                ? 'recognised'
                : 'unseen';

    skills[skill.skillId] = {
      skillId: skill.skillId,
      state,
      demonstration: ruleAvailable
        ? 'judged'
        : 'cannot_determine_checkpoint_rule_missing',
      firstCountedAttemptId: counted[0]?.attemptId ?? null,
      unsupportedCorrectCount: correct.filter((entry) => !entry.supported)
        .length,
      supportedCorrectCount: correct.filter((entry) => entry.supported).length,
      retainedEvidence: retained,
      retentionOpportunity: opportunity,
      retrievalDue:
        skill.retention.target &&
        opportunity === 'available' &&
        !retained &&
        correct.some((entry) => !entry.supported),
    };
  }

  const checkpoints: Record<string, CheckpointJudgement> = {};
  const modules: Record<string, ModuleReadiness> = {};

  for (const module of index.modules) {
    const gates = index.exercises.filter(
      (entry) => entry.moduleId === module.moduleId && entry.masteryGate,
    );
    const gateSubjects = new Set(gates.map((entry) => entry.subjectId));
    const basis = assessments
      .filter((entry) => entry.counting && gateSubjects.has(entry.subjectId))
      .sort(byRecordedOrder);
    const checkpointSubject = module.checkpoint.missionId?.toLowerCase();
    const storedResults = evidence
      .filter(
        (row) =>
          row.kind === 'checkpoint_result' &&
          row.subjectId === checkpointSubject,
      )
      .map((row) => ({ id: row.id, disposition: 'cannot_determine' as const }));
    const runtimeGates = gates.filter((entry) => entry.needsRuntime);
    const criteria: CheckpointCriterion[] = module.checkpoint.tasks
      .filter((task) => task.gating)
      .map((task) => {
        const items = gates
          .filter((entry) => entry.checkpointTask === task.key)
          .map((entry) => ({
            subjectId: entry.subjectId,
            qualifying: !cannotDetermine && qualifies(entry.subjectId),
          }));

        return {
          key: task.key,
          level:
            items.length > 0 && items.every((item) => item.qualifying)
              ? ('D' as const)
              : ('NY' as const),
          items,
        };
      });
    const cleared =
      ruleAvailable &&
      criteria.length > 0 &&
      criteria.every((criterion) => criterion.level === 'D');
    // A runtime gate item that has not qualified cannot qualify while
    // executable evaluation is unavailable.
    const runtimeBlocks =
      !input.runtimeAvailable &&
      runtimeGates.some((entry) => !qualifies(entry.subjectId));

    checkpoints[module.moduleId] = {
      moduleId: module.moduleId,
      status: !ruleAvailable ? 'rule_missing' : cleared ? 'cleared' : 'not_yet',
      ruleId: rule?.ruleId ?? null,
      criteria,
      basisAttemptIds: basis.map((entry) => entry.attemptId),
      storedResults,
    };
    modules[module.moduleId] = {
      moduleId: module.moduleId,
      cleared,
      blockers: cleared
        ? []
        : [
            ruleAvailable
              ? 'checkpoint_not_cleared'
              : 'checkpoint_rule_missing',
            ...(runtimeBlocks
              ? (['executable_evaluation_unavailable'] as const)
              : []),
          ],
      requiredGateEvidence: {
        total: gates.length,
        counted: new Set(basis.map((entry) => entry.subjectId)).size,
        runtimeUnavailable: input.runtimeAvailable
          ? []
          : runtimeGates.map((entry) => entry.subjectId),
      },
    };
  }

  const retrieval: Record<string, RetrievalSetPresentation> = {};

  for (const unit of index.units.filter((entry) => entry.kind === 'R')) {
    retrieval[unit.unitId] = {
      unitId: unit.unitId,
      missionId: unit.missionId,
      lessonClosed: true,
      items: index.exercises
        .filter((entry) => entry.unitId === unit.unitId)
        .sort((left, right) => left.order - right.order)
        .map((entry) => ({
          exerciseId: entry.exerciseId,
          subjectId: entry.subjectId,
          alreadyCorrect: assessments.some(
            (assessment) =>
              assessment.subjectId === entry.subjectId && assessment.correct,
          ),
        })),
    };
  }

  return {
    skills,
    checkpoints,
    modules,
    retrieval,
    attempts: attemptMap,
    cannotDetermine,
  };
}
