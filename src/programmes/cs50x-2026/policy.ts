import type { CatalogueRules, XpPolicy } from '@/lib/domain';

/**
 * CS50x core policy (Epic C / C3; C0 contract §4b). Shared engines receive
 * these values as parameters; they hold no CS50 policy of their own.
 */

/** The CS50 catalogue must contain a final project unit. */
export const cs50CatalogueRules: CatalogueRules = {
  requiredUnitTypes: ['final_project'],
};

/**
 * CS50 XP policy. Amounts, qualifying types and statuses, the week bonus and
 * the final-project milestones with their fixed award identity.
 */
export const cs50XpPolicy: XpPolicy = {
  completionAwards: [
    { itemType: 'lecture', xp: 40 },
    { itemType: 'section', xp: 20 },
    { itemType: 'shorts', xp: 15 },
    { itemType: 'practice', xp: 30 },
    { itemType: 'notes', xp: 15 },
    { itemType: 'reflection', xp: 15 },
  ],
  statusMilestones: [
    {
      itemType: 'problem_set',
      milestone: 'started',
      statuses: ['started', 'blocked', 'completed', 'submitted', 'accepted'],
      xp: 20,
      reasonLabel: 'Started problem set',
    },
    {
      itemType: 'problem_set',
      milestone: 'submitted',
      statuses: ['submitted', 'accepted'],
      xp: 75,
      reasonLabel: 'Submitted problem set',
    },
    {
      itemType: 'problem_set',
      milestone: 'accepted',
      statuses: ['accepted'],
      xp: 125,
      reasonLabel: 'Accepted problem set',
    },
  ],
  unitCompletionBonuses: [{ unitType: 'week', xp: 150 }],
  itemMilestones: [
    {
      sourceType: 'final_project_build_completed',
      sourceId: 'final-project-build-completed',
      itemIds: ['final-project-build'],
      xp: 250,
      reason: 'Completed final project build',
    },
    {
      sourceType: 'final_project_readme_demo_completed',
      sourceId: 'final-project-readme-demo-combined',
      itemIds: ['final-project-readme', 'final-project-video-demo'],
      xp: 200,
      reason: 'Completed both final project README and video demo',
    },
  ],
};
