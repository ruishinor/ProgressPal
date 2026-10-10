import type {
  EvaluationResultRecord,
  LearnerEvidence,
  LessonBlock,
  LessonBundle,
  LessonExercise,
  LessonUiCopy,
  LessonUiTextKey,
} from '@/lib/domain';

/**
 * Whether an evidence row is about the exercise as it is now. Every row is
 * bound to the content hash the learner answered; once the authored
 * exercise changes, rows under the earlier hash are history, not the state
 * of the task on screen. XP and mastery read evidence the same way.
 */
export function isCurrentEvidence(
  row: LearnerEvidence,
  contentHash: string | undefined,
): boolean {
  return row.contentHash === contentHash;
}

/** Fills a copy template's {name} placeholders. */
export function formatCopy(
  copy: LessonUiCopy,
  key: LessonUiTextKey,
  values: Readonly<Record<string, string | number>> = {},
): string {
  return copy.text[key].replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
}

/** Applies the programme's learner-wording rules to prose (never to code). */
export function createWording(copy: LessonUiCopy): (text: string) => string {
  const rules = (copy.learnerWording ?? []).map((rule) => ({
    expression: new RegExp(rule.pattern, rule.flags),
    replacement: rule.replacement,
  }));

  return (text) =>
    rules.reduce(
      (current, rule) => current.replace(rule.expression, rule.replacement),
      text,
    );
}

export type LessonStep = {
  /** Zero-based index of the block in the whole mission (lesson position). */
  readonly stepIndex: number;
  readonly unitId: string;
  readonly unitIndex: number;
  readonly block: LessonBlock;
  /**
   * The exercise number the learner sees: per unit, as the authored learner
   * render numbers them, or across the mission when the mission has an
   * authored interleaved sequence (one flow, one numbering).
   */
  readonly exerciseNumber: number | null;
  /** Index of the phase the step belongs to, or 0 for an unphased mission. */
  readonly phaseIndex: number;
  readonly firstInUnit: boolean;
};

/**
 * Flattens a mission into its steps, in the authored learner order: the
 * mission's interleaved sequence when it has one (owner decision
 * 2026-10-03), otherwise unit by unit. Phases follow the authoring
 * workspace's learner-render rule: a phase starts where its first part
 * starts (a unit's beginning, or right before exercise `exercisesFrom` of a
 * unit), and every later block belongs to the most recently started phase.
 */
export function lessonSteps(bundle: LessonBundle): LessonStep[] {
  const phases = bundle.mission.phases ?? [];
  const phaseStart = new Map<string, number>();

  phases.forEach((phase, phaseIndex) => {
    const [first] = phase.parts;

    if (first !== undefined) {
      const from = first.exercisesFrom ?? 0;
      phaseStart.set(`${first.unitId}|${from > 1 ? from : 0}`, phaseIndex);
    }
  });

  const sequenced = bundle.mission.sequence !== undefined;
  const segments =
    bundle.mission.sequence ??
    bundle.units.map((unit) => ({
      unitId: unit.unit_id,
      from: 0,
      to: unit.flow.length - 1,
    }));
  const exercisesByUnit = new Map<string, number>();
  const steps: LessonStep[] = [];
  let missionExercises = 0;
  let currentPhase = 0;

  for (const segment of segments) {
    const unitIndex = bundle.units.findIndex(
      (unit) => unit.unit_id === segment.unitId,
    );
    const unit = bundle.units[unitIndex]!;

    for (
      let flowIndex = segment.from;
      flowIndex <= segment.to;
      flowIndex += 1
    ) {
      const block = unit.flow[flowIndex]!;
      const exercises = exercisesByUnit.get(unit.unit_id) ?? 0;
      const start =
        flowIndex === 0
          ? phaseStart.get(`${unit.unit_id}|0`)
          : exercises + 1 > 1
            ? phaseStart.get(`${unit.unit_id}|${exercises + 1}`)
            : undefined;

      if (start !== undefined) {
        currentPhase = start;
      }

      if (block.t === 'exercise') {
        exercisesByUnit.set(unit.unit_id, exercises + 1);
        missionExercises += 1;
      }

      steps.push({
        stepIndex: steps.length,
        unitId: unit.unit_id,
        unitIndex,
        block,
        exerciseNumber:
          block.t === 'exercise'
            ? sequenced
              ? missionExercises
              : exercises + 1
            : null,
        phaseIndex: currentPhase,
        firstInUnit: flowIndex === 0,
      });
    }
  }

  return steps;
}

/** The content's own one-sentence reminder before a position (DC-06). */
export function reminderBefore(
  steps: readonly LessonStep[],
  stepIndex: number,
): string | null {
  for (
    let index = Math.min(stepIndex, steps.length) - 1;
    index >= 0;
    index -= 1
  ) {
    const block = steps[index]!.block;

    if (block.t === 'recap' && block.can.length > 0) {
      return block.can.join('; ');
    }
  }

  return null;
}

function hashSeed(text: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function seededRandom(seed: number) {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A deterministic delivery shuffle (DC-10): the authored order, which puts
 * the correct option first, never reaches the learner. Stable for one
 * presentation (seeded by subject and attempt), new for a retry.
 */
export function shuffledOrder(length: number, seed: string): number[] {
  const identity = Array.from({ length }, (_, index) => index);

  if (length < 2) {
    return identity;
  }

  for (let round = 0; round < 20; round += 1) {
    const random = seededRandom(hashSeed(`${seed}|${round}`));
    const order = [...identity];

    for (let index = order.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(random() * (index + 1));
      [order[index], order[swap]] = [order[swap]!, order[index]!];
    }

    if (order.some((value, index) => value !== index)) {
      return order;
    }
  }

  return [...identity.slice(1), 0];
}

export type ResultPresentation = {
  readonly tone: 'success' | 'neutral' | 'notice';
  readonly title: string;
  /** Authored feedback first, then the general authored text. */
  readonly messages: readonly string[];
};

function matchedFeedback(
  exercise: LessonExercise,
  key: string | undefined,
): string | null {
  if (key === undefined) {
    return null;
  }

  const [kind, first, second] = key.split(':');
  const index = Number(first);

  switch (exercise.type) {
    case 'mcq':
      return (
        exercise.options.find((option) => option.id === first)?.feedback ?? null
      );
    case 'predict':
      return kind === 'trap' ? (exercise.traps[index]?.feedback ?? null) : null;
    case 'cmd':
      return kind === 'near'
        ? (exercise.evaluator.near_misses[index]?.[1] ?? null)
        : null;
    case 'evidence':
      return kind === 'diagnostic'
        ? (exercise.evaluator.diagnostics[index]?.feedback ?? null)
        : null;
    case 'program':
      return kind === 'signature'
        ? (exercise.evaluator.failure_signatures[index]?.feedback ?? null)
        : null;
    case 'diagnose':
      return (
        exercise.cause_options.find((option) => option.id === first)
          ?.feedback ?? null
      );
    case 'sort':
      return kind === 'item' ? exercise.items_feedback[index] || null : null;
    case 'assemble':
      return (
        exercise.slots[index]?.options.find((option) => option.id === second)
          ?.feedback ?? null
      );
    case 'testtable':
      return kind === 'coverage'
        ? (exercise.coverage[index]?.message ?? null)
        : null;
    default:
      return null;
  }
}

/** Feedback for a durable terminal result (never before it exists). */
export function presentResult(
  exercise: LessonExercise,
  result: EvaluationResultRecord,
  copy: LessonUiCopy,
  selectedOptionIds: readonly string[] = [],
): ResultPresentation {
  switch (result.outcome) {
    case 'correct': {
      const optionFeedback =
        exercise.type === 'mcq'
          ? exercise.options
              .filter((option) => selectedOptionIds.includes(option.id))
              .map((option) => option.feedback)
              .filter((text) => text !== '')
          : [];

      return {
        tone: 'success',
        title: copy.text.correct,
        messages:
          optionFeedback.length > 0
            ? optionFeedback
            : [exercise.feedback.correct].filter((text) => text !== ''),
      };
    }
    case 'incorrect': {
      const matched = matchedFeedback(exercise, result.matchedFeedbackKey);

      return {
        tone: 'neutral',
        title: copy.text.incorrect,
        messages: [matched, exercise.feedback.incorrect].filter(
          (text): text is string => text !== null && text !== '',
        ),
      };
    }
    case 'not_evaluable':
      return {
        tone: 'notice',
        title: copy.text.notEvaluable,
        messages: [copy.text.notEvaluableBody],
      };
    case 'evaluator_error':
      return {
        tone: 'notice',
        title: copy.text.evaluatorError,
        messages: [copy.text.evaluatorErrorBody],
      };
    case 'recorded':
      return {
        tone: 'neutral',
        title: copy.text.recorded,
        messages: [copy.text.recordedBody],
      };
  }
}
