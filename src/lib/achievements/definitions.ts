import {
  AchievementDefinitionSchema,
  type AchievementDefinition,
} from '@/lib/domain';
import { parseWithSchema } from '@/lib/validation';

/**
 * Deterministic rule types evaluated by the pure achievement engine. Each maps
 * to a branch in {@link evaluateAchievements}; the matching `ruleConfig` shape is
 * documented inline and validated at evaluation time.
 */
export type AchievementRuleType =
  | 'first_item_completed' // any progress entry is complete; ruleConfig: {}
  | 'unit_required_completed' // ruleConfig: { unitId } — all required items of a unit complete
  | 'course_required_completed' // ruleConfig: {} — all required items of all required units complete
  | 'item_completed' // ruleConfig: { itemId }
  | 'items_all_completed' // ruleConfig: { itemIds: string[] }
  | 'problem_set_status_count' // ruleConfig: { statuses: string[]; minCount: number }
  | 'content_slice_completed_count' // ruleConfig: { minCount: number }
  | 'media_clean_stop' // ruleConfig: { minWatchedSeconds: number; stopReasons: string[] }
  | 'study_session_duration_count' // ruleConfig: { minMinutes: number; minCount: number }
  | 'study_session_mode_count'; // ruleConfig: { mode: string; minCount: number }

/**
 * Achievement definitions are a code-only source of truth (Module 13). They are
 * validated against the domain schema at module load so a malformed constant
 * fails fast. The `achievement_definitions` Dexie store is left as deferred
 * persistence and is never read from or written to by this module.
 *
 * Every definition carries `xpReward: 0`: Module 13 introduces no achievement XP
 * and writes no `achievement_unlock` XP transactions.
 */
const definitionTimestamp = '2026-01-01T00:00:00.000Z';

type RawAchievementDefinition = {
  id: string;
  title: string;
  description: string;
  category: AchievementDefinition['category'];
  ruleType: AchievementRuleType;
  ruleConfig: Record<string, unknown>;
};

const rawAchievementDefinitions: RawAchievementDefinition[] = [
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
    id: 'scratch-initiate',
    title: 'Scratch Initiate',
    description: 'Complete every required item of Week 0 (Scratch).',
    category: 'course_progress',
    ruleType: 'unit_required_completed',
    ruleConfig: { unitId: 'week-0' },
  },
  {
    id: 'pointer-survivor',
    title: 'Pointer Survivor',
    description: 'Complete every required item of Week 4 (Memory).',
    category: 'course_progress',
    ruleType: 'unit_required_completed',
    ruleConfig: { unitId: 'week-4' },
  },
  {
    id: 'data-structure-builder',
    title: 'Data Structure Builder',
    description: 'Complete every required item of Week 5 (Data Structures).',
    category: 'course_progress',
    ruleType: 'unit_required_completed',
    ruleConfig: { unitId: 'week-5' },
  },
  {
    id: 'python-shift',
    title: 'Python Shift',
    description: 'Complete every required item of Week 6 (Python).',
    category: 'course_progress',
    ruleType: 'unit_required_completed',
    ruleConfig: { unitId: 'week-6' },
  },
  {
    id: 'query-builder',
    title: 'Query Builder',
    description: 'Complete every required item of Week 7 (SQL).',
    category: 'problem_sets',
    ruleType: 'unit_required_completed',
    ruleConfig: { unitId: 'week-7' },
  },
  {
    id: 'browser-builder',
    title: 'Browser Builder',
    description:
      'Complete every required item of Week 8 (HTML, CSS, JavaScript).',
    category: 'course_progress',
    ruleType: 'unit_required_completed',
    ruleConfig: { unitId: 'week-8' },
  },
  {
    id: 'flask-route-maker',
    title: 'Flask Route Maker',
    description: 'Complete every required item of Week 9 (Flask).',
    category: 'course_progress',
    ruleType: 'unit_required_completed',
    ruleConfig: { unitId: 'week-9' },
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
    id: 'pset-chain',
    title: 'Pset Chain',
    description: 'Submit or get accepted on at least three problem sets.',
    category: 'problem_sets',
    ruleType: 'problem_set_status_count',
    ruleConfig: { statuses: ['submitted', 'accepted'], minCount: 3 },
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
  {
    id: 'final-project-mvp',
    title: 'Final Project MVP',
    description: 'Complete the "Build the project" final-project task.',
    category: 'final_project',
    ruleType: 'item_completed',
    ruleConfig: { itemId: 'final-project-build' },
  },
  {
    id: 'final-project-shipped',
    title: 'Final Project Shipped',
    description: 'Complete both the final-project README and the video demo.',
    category: 'final_project',
    ruleType: 'items_all_completed',
    ruleConfig: {
      itemIds: ['final-project-readme', 'final-project-video-demo'],
    },
  },
];

/**
 * Validated, immutable achievement definitions. Parsing happens once at module
 * load; any schema violation throws and prevents the module from initializing.
 */
export const achievementDefinitions: readonly AchievementDefinition[] =
  rawAchievementDefinitions.map((definition) =>
    parseWithSchema(
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
      `Achievement definition "${definition.id}"`,
    ),
  );

export const achievementDefinitionsById: ReadonlyMap<
  string,
  AchievementDefinition
> = new Map(
  achievementDefinitions.map((definition) => [definition.id, definition]),
);
