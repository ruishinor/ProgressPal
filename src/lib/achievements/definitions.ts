import {
  AchievementDefinitionSchema,
  type AchievementDefinition,
} from '@/lib/domain';
import { SchemaValidationError, parseWithSchema } from '@/lib/validation';
import { activityAchievementData } from '@/lib/activity/achievementData';

/**
 * Deterministic rule types evaluated by the pure achievement engine. Each maps
 * to a branch in {@link evaluateAchievements}; the matching `ruleConfig` shape is
 * documented inline and validated at evaluation time.
 */
export const achievementRuleTypes = [
  'physical_activity', // dedicated Activity evaluator; never educational evidence
  'first_item_completed', // any progress entry is complete; ruleConfig: {}
  'unit_required_completed', // ruleConfig: { unitId } — all required items of a unit complete
  'course_required_completed', // ruleConfig: {} — all required items of all required units complete
  'item_completed', // ruleConfig: { itemId }
  'items_all_completed', // ruleConfig: { itemIds: string[] }
  'item_type_status_count', // ruleConfig: { itemType: string; statuses: string[]; minCount: number }
  'content_slice_completed_count', // ruleConfig: { minCount: number }
  'media_clean_stop', // ruleConfig: { minWatchedSeconds: number; stopReasons: string[] }
  'study_session_duration_count', // ruleConfig: { minMinutes: number; minCount: number }
  'study_session_mode_count', // ruleConfig: { mode: string; minCount: number }
  'evidence_subjects_solved', // evidence-only; ruleConfig: { contentVersion, subjectIds, triggerSourceId }
  'checkpoint_cleared', // evidence-only; ruleConfig: { contentVersion, moduleId, triggerSourceId }
] as const;

export type AchievementRuleType = (typeof achievementRuleTypes)[number];

/**
 * Achievement definitions are a code-only source of truth (Module 13). They are
 * validated against the domain schema when defined, so a malformed constant
 * fails fast. The `achievement_definitions` Dexie store is left as deferred
 * persistence and is never read from or written to by this module.
 *
 * Every definition carries `xpReward: 0`: Module 13 introduces no achievement XP
 * and writes no `achievement_unlock` XP transactions.
 */
const definitionTimestamp = '2026-01-01T00:00:00.000Z';

export type AchievementDefinitionInput = {
  id: string;
  title: string;
  description: string;
  category: AchievementDefinition['category'];
  ruleType: AchievementRuleType;
  ruleConfig: Record<string, unknown>;
};

/** Validates one definition; an invalid definition throws. */
export function defineAchievement(
  definition: AchievementDefinitionInput,
): AchievementDefinition {
  const label = `Achievement definition "${definition.id}"`;

  if (
    !(achievementRuleTypes as readonly string[]).includes(definition.ruleType)
  ) {
    throw new SchemaValidationError(label, [
      `Unsupported rule type "${definition.ruleType}".`,
    ]);
  }

  return parseWithSchema(
    AchievementDefinitionSchema,
    {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      category: definition.category,
      xpReward: 0,
      ruleType: definition.ruleType,
      ruleConfig: definition.ruleConfig,
      createdAt: definitionTimestamp,
      updatedAt: definitionTimestamp,
    },
    label,
  );
}

/**
 * The platform-neutral achievements (C0 contract §4d). They reference no
 * curriculum unit, item or topic and stay shared; programme definitions own
 * every other achievement and the display order.
 */
export const activityAchievementDefinitions = activityAchievementData.map(
  (row) =>
    defineAchievement({
      id: row.id,
      title: row.name,
      description: row.description,
      category: row.category,
      ruleType: 'physical_activity',
      ruleConfig: { kind: row.rule, ...row.config },
    }),
);

export const sharedAchievementDefinitions: readonly AchievementDefinition[] = [
  ...[
    {
      id: 'first-step',
      title: 'First Step',
      description: 'Complete your first task of any kind.',
      category: 'course_progress',
      ruleType: 'first_item_completed',
      ruleConfig: {},
    },
    {
      id: 'first-slice',
      title: 'First Slice',
      description: 'Complete your first long-form content slice.',
      category: 'course_progress',
      ruleType: 'content_slice_completed_count',
      ruleConfig: { minCount: 1 },
    },
    {
      id: 'course-complete',
      title: 'Course Complete',
      description:
        'Complete every required item of every required unit in the course.',
      category: 'course_progress',
      ruleType: 'course_required_completed',
      ruleConfig: {},
    },
    {
      id: 'clean-stop',
      title: 'Clean Stop',
      description:
        'Log a focused long-form session of 15+ watched minutes that ends at a planned limit.',
      category: 'consistency',
      ruleType: 'media_clean_stop',
      ruleConfig: { minWatchedSeconds: 900, stopReasons: ['reached_limit'] },
    },
    {
      id: 'three-deep-sessions',
      title: 'Three Deep Sessions',
      description: 'Log three study sessions of at least 45 minutes each.',
      category: 'consistency',
      ruleType: 'study_session_duration_count',
      ruleConfig: { minMinutes: 45, minCount: 3 },
    },
    {
      id: 'bug-hunter',
      title: 'Bug Hunter',
      description: 'Log at least one study session in debugging mode.',
      category: 'debugging',
      ruleType: 'study_session_mode_count',
      ruleConfig: { mode: 'debugging', minCount: 1 },
    },
  ].map((definition) =>
    defineAchievement(definition as AchievementDefinitionInput),
  ),
  ...activityAchievementDefinitions,
];

function findDuplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

/**
 * Checks a composed, ordered achievement catalogue: unique IDs, and every
 * shared definition present exactly as shared (a programme may neither omit
 * nor redefine one). Returns one issue per violation.
 */
export function findAchievementCatalogueIssues(
  catalogue: readonly AchievementDefinition[],
): string[] {
  const issues = findDuplicates(
    catalogue.map((definition) => definition.id),
  ).map((id) => `achievement "${id}" appears more than once`);

  for (const shared of sharedAchievementDefinitions) {
    const entry = catalogue.find((definition) => definition.id === shared.id);
    if (entry === undefined) {
      issues.push(`shared achievement "${shared.id}" is missing`);
    } else if (entry !== shared) {
      issues.push(`shared achievement "${shared.id}" is redefined`);
    }
  }

  return issues;
}

/**
 * Composes a programme's ordered achievement catalogue from its own
 * definitions and the shared ones (C0 contract §5). The order must list every
 * programme-owned and shared ID exactly once; programme IDs must not collide
 * with shared IDs. Fails closed.
 */
export function composeAchievementCatalogue(params: {
  programmeDefinitions: readonly AchievementDefinition[];
  order: readonly string[];
}): readonly AchievementDefinition[] {
  const { programmeDefinitions, order } = params;
  const sharedIds = new Set(
    sharedAchievementDefinitions.map((definition) => definition.id),
  );
  const available = new Map<string, AchievementDefinition>(
    sharedAchievementDefinitions.map((definition) => [
      definition.id,
      definition,
    ]),
  );
  const issues: string[] = [];

  for (const id of findDuplicates(
    programmeDefinitions.map((definition) => definition.id),
  )) {
    issues.push(`programme achievement "${id}" is defined more than once`);
  }
  for (const definition of programmeDefinitions) {
    if (sharedIds.has(definition.id)) {
      issues.push(
        `programme achievement "${definition.id}" collides with a shared achievement`,
      );
    } else {
      available.set(definition.id, definition);
    }
  }
  for (const id of findDuplicates(order)) {
    issues.push(`achievement order lists "${id}" more than once`);
  }
  for (const id of order) {
    if (!available.has(id)) {
      issues.push(`achievement order lists unknown achievement "${id}"`);
    }
  }
  for (const id of available.keys()) {
    if (!order.includes(id)) {
      issues.push(`achievement order omits "${id}"`);
    }
  }

  if (issues.length > 0) {
    throw new SchemaValidationError('Achievement catalogue', issues);
  }

  return order.map((id) => available.get(id)!);
}
