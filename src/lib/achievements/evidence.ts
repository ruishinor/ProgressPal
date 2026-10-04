import type {
  AchievementDefinition,
  EvaluationResultRecord,
  ExerciseAttemptRecord,
  LearnerEvidence,
  ProgrammeContentIndex,
} from '@/lib/domain';
import { deriveProgrammeMastery } from '@/lib/mastery';

import type { SatisfiedAchievement } from './engine';

export type EvidenceAchievementContext = {
  readonly attempt: ExerciseAttemptRecord;
  readonly result: EvaluationResultRecord;
  readonly evidence: readonly LearnerEvidence[];
};

export type EvidenceAchievementPlannerInput = {
  readonly definitions: readonly AchievementDefinition[];
  readonly index: ProgrammeContentIndex;
  readonly runtimeAvailable: boolean;
};

const evidenceRuleTypes = new Set([
  'evidence_subjects_solved',
  'checkpoint_cleared',
]);

export function hasEvidenceAchievementRules(
  definitions: readonly AchievementDefinition[],
): boolean {
  return definitions.some((definition) =>
    evidenceRuleTypes.has(definition.ruleType),
  );
}

function configString(
  definition: AchievementDefinition,
  key: string,
): string | null {
  const value = definition.ruleConfig[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function configStringArray(
  definition: AchievementDefinition,
  key: string,
): readonly string[] | null {
  const value = definition.ruleConfig[key];
  return Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === 'string' && entry.length > 0)
    ? value
    : null;
}

function configContentVersion(
  definition: AchievementDefinition,
): number | null {
  const value = definition.ruleConfig.contentVersion;
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null;
}

export function planEvidenceAchievementUnlocks(
  input: EvidenceAchievementPlannerInput,
  context: EvidenceAchievementContext,
): SatisfiedAchievement[] {
  const { definitions, index, runtimeAvailable } = input;
  const { attempt, result, evidence } = context;

  if (
    index.programmeId !== attempt.programmeId ||
    result.outcome !== 'correct'
  ) {
    return [];
  }

  const mastery = deriveProgrammeMastery({
    index,
    evidence,
    openedMissionIds: new Set(),
    runtimeAvailable,
  });
  const current = mastery.attempts.get(attempt.id);

  if (current?.counting !== true || current.correct !== true) {
    return [];
  }

  if (mastery.cannotDetermine) {
    return [];
  }

  const solvedSubjects = new Set(
    [...mastery.attempts.values()]
      .filter((entry) => entry.counting && entry.correct)
      .map((entry) => entry.subjectId),
  );
  const knownSubjects = new Set(
    index.exercises.map((entry) => entry.subjectId),
  );
  const knownModules = new Set(index.modules.map((entry) => entry.moduleId));
  const satisfied: SatisfiedAchievement[] = [];

  for (const definition of definitions) {
    if (!evidenceRuleTypes.has(definition.ruleType)) {
      continue;
    }

    const contentVersion = configContentVersion(definition);
    const triggerSourceId = configString(definition, 'triggerSourceId');

    if (
      contentVersion === null ||
      contentVersion !== index.contentVersion ||
      triggerSourceId === null
    ) {
      continue;
    }

    if (definition.ruleType === 'evidence_subjects_solved') {
      const subjectIds = configStringArray(definition, 'subjectIds');

      if (
        subjectIds === null ||
        subjectIds.some((subjectId) => !knownSubjects.has(subjectId)) ||
        !subjectIds.every((subjectId) => solvedSubjects.has(subjectId))
      ) {
        continue;
      }

      satisfied.push({
        achievementId: definition.id,
        triggerSourceId,
      });
      continue;
    }

    const moduleId = configString(definition, 'moduleId');

    if (
      moduleId === null ||
      !knownModules.has(moduleId) ||
      mastery.checkpoints[moduleId]?.status !== 'cleared'
    ) {
      continue;
    }

    satisfied.push({
      achievementId: definition.id,
      triggerSourceId,
    });
  }

  return satisfied.sort((left, right) =>
    left.achievementId.localeCompare(right.achievementId),
  );
}

export function createEvidenceAchievementPlanner(
  input: EvidenceAchievementPlannerInput,
) {
  return (context: EvidenceAchievementContext) =>
    planEvidenceAchievementUnlocks(input, context);
}
