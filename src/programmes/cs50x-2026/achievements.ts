import {
  composeAchievementCatalogue,
  defineAchievement,
  sharedAchievementDefinitions,
  type AchievementDefinitionInput,
} from '@/lib/achievements';

/**
 * The ten CS50-bound achievements (C0 contract §4e): they reference CS50 week
 * units and final-project items or carry CS50 problem-set policy. The six
 * platform-neutral achievements stay in `@/lib/achievements`.
 */
const cs50AchievementInputs: AchievementDefinitionInput[] = [
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
    id: 'pset-chain',
    title: 'Pset Chain',
    description: 'Submit or get accepted on at least three problem sets.',
    category: 'problem_sets',
    ruleType: 'item_type_status_count',
    ruleConfig: {
      itemType: 'problem_set',
      statuses: ['submitted', 'accepted'],
      minCount: 3,
    },
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
 * The CS50 display order over shared and CS50-owned achievements. The RPG
 * badge list and Classic view render in this order.
 */
const cs50AchievementOrder = [
  'first-step',
  'first-slice',
  'scratch-initiate',
  'pointer-survivor',
  'data-structure-builder',
  'python-shift',
  'query-builder',
  'browser-builder',
  'flask-route-maker',
  'course-complete',
  'pset-chain',
  'clean-stop',
  'three-deep-sessions',
  'bug-hunter',
  'final-project-mvp',
  'final-project-shipped',
  ...sharedAchievementDefinitions
    .filter((definition) => definition.ruleType === 'physical_activity')
    .map((definition) => definition.id),
];

/** The validated, ordered CS50 achievement catalogue (16 definitions). */
export const cs50AchievementCatalogue = composeAchievementCatalogue({
  programmeDefinitions: cs50AchievementInputs.map(defineAchievement),
  order: cs50AchievementOrder,
});
