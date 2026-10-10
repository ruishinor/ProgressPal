import { lessonSteps } from '@/features/lessons/model';
import type {
  ContentExerciseMeta,
  EvaluationResultRecord,
  ExerciseAttemptRecord,
  LearnerEvidence,
  LessonXpPolicy,
  LevelCurve,
  ProgrammeContentIndex,
  SupportEventRecord,
} from '@/lib/domain';
import { planLessonXpAwards, solvedTaskXp } from '@/lib/rewards';
import { calculateXpSummary } from '@/lib/xp/engine';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';

/**
 * A bounded, deterministic simulation of Programme #2 XP and levels (owner
 * work order 2026-10-10, checkpoint B). It walks the real M01/M02 content
 * in the learner's order (modules, then missions, then each mission's own
 * step order) and feeds synthetic evidence for one learner pattern to the
 * real award planner, which reads the real mastery engine for checkpoints.
 * Each award identity is written once, as the repository does. Nothing is
 * persisted; it answers "how many solved tasks to each level, and where".
 */

export type LearnerPattern = 'independent' | 'normal' | 'hint-heavy';

export type SimulatedTask = {
  readonly n: number;
  readonly exerciseId: string;
  readonly missionId: string;
  readonly moduleId: string;
  readonly role: string;
  readonly responseMode: string;
  readonly optional: boolean;
  readonly firstTryWrong: boolean;
  readonly hint: boolean;
  readonly awards: ReadonlyArray<{ sourceType: string; xp: number }>;
  readonly xp: number;
  readonly totalXp: number;
  readonly level: number;
  readonly xpToNextLevel: number;
  readonly levelUp: boolean;
};

export type MissionEnd = {
  readonly missionId: string;
  readonly title: string;
  readonly solved: number;
  readonly totalXp: number;
  readonly level: number;
  readonly xpToNextLevel: number;
};

export type SimulationResult = {
  readonly pattern: LearnerPattern;
  readonly tasks: readonly SimulatedTask[];
  readonly missionEnds: readonly MissionEnd[];
  /** The solved-task count at which each level was first reached. */
  readonly levelReachedAt: ReadonlyMap<number, number>;
  readonly totalXp: number;
  readonly finalLevel: number;
  readonly xpBySource: Readonly<Record<string, number>>;
};

type OrderedTask = {
  readonly meta: ContentExerciseMeta;
  readonly missionId: string;
};

/** Every evaluable exercise in the learner's order, with optional ones. */
export async function learnerOrder(
  index: ProgrammeContentIndex,
): Promise<OrderedTask[]> {
  const provider = programvareutviklingDefinition.content.lessons!;
  const metaById = new Map(
    index.exercises.map((entry) => [entry.exerciseId, entry]),
  );
  const ordered: OrderedTask[] = [];
  const modules = [...index.modules].sort((a, b) => a.order - b.order);

  for (const module of modules) {
    const missions = [...module.missions].sort((a, b) => a.order - b.order);

    for (const mission of missions) {
      const loaded = await provider.loadLesson(mission.itemId);

      if (loaded.status !== 'ready') {
        throw new Error(`lesson ${mission.itemId} did not load`);
      }

      for (const step of lessonSteps(loaded.value)) {
        if (step.block.t !== 'exercise') {
          continue;
        }

        const meta = metaById.get((step.block as { id: string }).id)!;

        if (meta.evaluable) {
          ordered.push({ meta, missionId: mission.missionId });
        }
      }
    }
  }

  return ordered;
}

const at = (minute: number) =>
  new Date(Date.UTC(2026, 9, 10, 8, 0, 0) + minute * 60_000).toISOString();

/**
 * The deterministic behaviour of a pattern on the k-th evaluable task:
 * - independent: right first time, never a hint;
 * - normal: wrong first on every third task (then right), a hint on every
 *   fourth task that has one, never a hint on a module-checkpoint gate item;
 * - hint-heavy: a hint wherever one exists, wrong first on every third task.
 */
function behaviour(
  pattern: LearnerPattern,
  k: number,
  meta: ContentExerciseMeta,
) {
  const hasHint = meta.hintCount > 0;

  switch (pattern) {
    case 'independent':
      return { firstTryWrong: false, hint: false };
    case 'normal':
      return {
        firstTryWrong: k % 3 === 2,
        hint: hasHint && !meta.masteryGate && k % 4 === 3,
      };
    case 'hint-heavy':
      return { firstTryWrong: k % 3 === 2, hint: hasHint };
  }
}

export function simulate(options: {
  readonly index: ProgrammeContentIndex;
  readonly order: readonly OrderedTask[];
  readonly policy: LessonXpPolicy;
  readonly curve?: LevelCurve;
  readonly pattern: LearnerPattern;
  readonly includeOptional?: boolean;
}): SimulationResult {
  const { index, policy, curve, pattern } = options;
  const programmeId = programvareutviklingDefinition.programmeId;
  const evidence: LearnerEvidence[] = [];
  const awarded = new Set<string>();
  const tasks: SimulatedTask[] = [];
  const missionEnds: MissionEnd[] = [];
  const levelReachedAt = new Map<number, number>([[1, 0]]);
  const xpBySource: Record<string, number> = {};
  const missions = new Map(
    index.modules.flatMap((module) =>
      module.missions.map((mission) => [mission.missionId, mission]),
    ),
  );
  let clock = 0;
  let totalXp = 0;
  let solved = 0;
  let level = 1;
  let attemptCounter = 0;

  const order = options.order.filter(
    (task) => options.includeOptional === true || !task.meta.optional,
  );

  order.forEach((task, k) => {
    const { meta } = task;
    const { firstTryWrong, hint } = behaviour(pattern, k, meta);
    const binding = {
      programmeId,
      contentVersion: index.contentVersion,
      subjectId: meta.subjectId,
      contentHash: meta.contentHash,
    };

    if (hint) {
      evidence.push({
        ...binding,
        id: `hint-${meta.subjectId}`,
        kind: 'support_event',
        recordedAt: at((clock += 1)),
        supportKind: 'hint_reveal',
        hintNumber: 1,
      } as SupportEventRecord);
    }

    const answer = (outcome: 'correct' | 'incorrect') => {
      attemptCounter += 1;
      const attemptNumber =
        evidence.filter(
          (row) =>
            row.kind === 'exercise_attempt' && row.subjectId === meta.subjectId,
        ).length + 1;
      const attempt = {
        ...binding,
        id: `attempt-${attemptCounter}`,
        kind: 'exercise_attempt',
        recordedAt: at((clock += 1)),
        attemptNumber,
        responseMode: meta.responseMode,
        answer: { text: 'synthetic' },
        hintsUsedMax: hint ? 1 : 0,
        teachingReopened: false,
      } as ExerciseAttemptRecord;
      const result = {
        ...binding,
        id: `result-${attemptCounter}`,
        kind: 'evaluation_result',
        recordedAt: at((clock += 1)),
        attemptId: attempt.id,
        outcome,
      } as EvaluationResultRecord;

      evidence.push(attempt, result);
      return { attempt, result };
    };

    if (firstTryWrong) {
      answer('incorrect');
    }

    const { attempt, result } = answer('correct');
    const potential = planLessonXpAwards(
      { policy, index, runtimeAvailable: true },
      { attempt, result, evidence },
    );
    const fresh = potential.filter((award) => {
      const key = `${award.sourceType}|${award.sourceId}`;

      if (awarded.has(key)) {
        return false;
      }

      awarded.add(key);
      return true;
    });
    const xp = fresh.reduce((sum, award) => sum + award.xp, 0);

    for (const award of fresh) {
      xpBySource[award.sourceType] =
        (xpBySource[award.sourceType] ?? 0) + award.xp;
    }

    solved += 1;
    totalXp += xp;
    const summary = calculateXpSummary(totalXp, curve);
    const levelUp = summary.level > level;

    for (let reached = level + 1; reached <= summary.level; reached += 1) {
      levelReachedAt.set(reached, solved);
    }
    level = summary.level;
    tasks.push({
      n: solved,
      exerciseId: meta.exerciseId,
      missionId: task.missionId,
      moduleId: meta.moduleId,
      role: meta.role,
      responseMode: meta.responseMode,
      optional: meta.optional,
      firstTryWrong,
      hint,
      awards: fresh.map((award) => ({
        sourceType: award.sourceType,
        xp: award.xp,
      })),
      xp,
      totalXp,
      level,
      xpToNextLevel: summary.xpToNextLevel,
      levelUp,
    });

    if (order[k + 1]?.missionId !== task.missionId) {
      missionEnds.push({
        missionId: task.missionId,
        title: missions.get(task.missionId)?.title ?? task.missionId,
        solved,
        totalXp,
        level,
        xpToNextLevel: summary.xpToNextLevel,
      });
    }
  });

  return {
    pattern,
    tasks,
    missionEnds,
    levelReachedAt,
    totalXp,
    finalLevel: level,
    xpBySource,
  };
}

/** Solved tasks needed for each level, from the reached-at map. */
export function tasksPerLevel(result: SimulationResult): number[] {
  const reached = [...result.levelReachedAt.entries()].sort(
    ([a], [b]) => a - b,
  );

  return reached.slice(1).map(([, n], index) => n - reached[index]![1]);
}

/** The solved-task XP distribution of a policy over the given tasks. */
export function solvedXpDistribution(
  policy: LessonXpPolicy,
  order: readonly OrderedTask[],
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const { meta } of order) {
    const key = `${solvedTaskXp(policy, meta)} XP`;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}
