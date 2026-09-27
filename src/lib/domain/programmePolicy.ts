import { z } from 'zod';

import {
  courseItemTypeValues,
  courseUnitTypeValues,
  progressStatusValues,
} from '@/lib/domain/constants';
import type {
  AchievementDefinition,
  CourseItemType,
  CourseSeed,
  ProgressStatus,
} from '@/lib/domain/types';
// Importing @/lib/validation also applies its jitless Zod configuration before
// the schemas below are created (app CSP: no dynamic code).
import { getDuplicateValues } from '@/lib/validation';

/**
 * Programme policy contracts (Epic C / C3). These are neutral shapes only: the
 * values belong to a programme definition (`src/programmes/**`), and shared
 * engines receive them as parameters. Nothing here is persisted.
 */

export const CatalogueRulesSchema = z
  .object({
    /** Unit types a programme's catalogue must contain at least once. */
    requiredUnitTypes: z.array(z.enum(courseUnitTypeValues)),
  })
  .strict();

export type CatalogueRules = z.infer<typeof CatalogueRulesSchema>;

/** Returns one issue per catalogue rule the seed violates. */
export function findCatalogueRuleIssues(
  seed: CourseSeed,
  rules: CatalogueRules,
): string[] {
  return rules.requiredUnitTypes
    .filter((unitType) => !seed.units.some((unit) => unit.type === unitType))
    .map((unitType) => `catalogue must contain a ${unitType} unit`);
}

/*
 * XP award vocabulary. These formats are shared persisted vocabulary (C0
 * contract §4a): a changed `sourceType` or `sourceId` would re-award XP,
 * because dedupe is by `sourceType` + `sourceId`.
 */

export function completionAwardSourceType(itemType: string): string {
  return `${itemType}_completed`;
}

export function statusMilestoneSourceType(
  itemType: string,
  milestone: string,
): string {
  return `${itemType}_${milestone}`;
}

export function unitCompletionSourceType(unitType: string): string {
  return `${unitType}_completed`;
}

const xpAmountSchema = z.number().int().positive();
const vocabularyKeySchema = z
  .string()
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'must be snake_case');
const entityIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, 'must be an entity id');
const reasonSchema = z.string().trim().min(1);

export const XpPolicySchema = z
  .object({
    /**
     * Completion XP by item type. Award identity: `sourceType`
     * `<itemType>_completed`, `sourceId` `<itemId>-completed`, reason
     * `Completed <itemType>: <item title>`.
     */
    completionAwards: z.array(
      z
        .object({
          itemType: z.enum(courseItemTypeValues),
          xp: xpAmountSchema,
        })
        .strict(),
    ),
    /**
     * Awards when an item of a type reaches one of the listed statuses.
     * Award identity: `sourceType` `<itemType>_<milestone>`, `sourceId`
     * `<itemId>-<milestone>`, reason `<reasonLabel>: <item title>`.
     */
    statusMilestones: z.array(
      z
        .object({
          itemType: z.enum(courseItemTypeValues),
          milestone: vocabularyKeySchema,
          statuses: z.array(z.enum(progressStatusValues)).min(1),
          xp: xpAmountSchema,
          reasonLabel: reasonSchema,
        })
        .strict(),
    ),
    /**
     * Bonus when every required item of a required unit of this type is
     * complete. Award identity: `sourceType` `<unitType>_completed`,
     * `sourceId` the unit ID, reason
     * `Completed all required items for <unit title>`.
     */
    unitCompletionBonuses: z.array(
      z
        .object({
          unitType: z.enum(courseUnitTypeValues),
          xp: xpAmountSchema,
        })
        .strict(),
    ),
    /**
     * Fixed-identity milestones, awarded when a listed item is saved complete
     * and every other listed item is already complete.
     */
    itemMilestones: z.array(
      z
        .object({
          sourceType: vocabularyKeySchema,
          sourceId: entityIdSchema,
          itemIds: z.array(entityIdSchema).min(1),
          xp: xpAmountSchema,
          reason: reasonSchema,
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((policy, ctx) => {
    const sourceTypes = [
      ...policy.completionAwards.map((award) =>
        completionAwardSourceType(award.itemType),
      ),
      ...policy.statusMilestones.map((milestone) =>
        statusMilestoneSourceType(milestone.itemType, milestone.milestone),
      ),
      ...policy.unitCompletionBonuses.map((bonus) =>
        unitCompletionSourceType(bonus.unitType),
      ),
      ...policy.itemMilestones.map((milestone) => milestone.sourceType),
    ];
    const report = (values: readonly string[], label: string) => {
      for (const value of getDuplicateValues(values)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate ${label} "${value}" is not allowed.`,
        });
      }
    };

    report(sourceTypes, 'XP sourceType');
    report(
      policy.itemMilestones.map((milestone) => milestone.sourceId),
      'item milestone sourceId',
    );
    for (const milestone of policy.itemMilestones) {
      report(milestone.itemIds, `item in milestone "${milestone.sourceId}"`);
    }
  });

export type XpPolicy = z.infer<typeof XpPolicySchema>;

/**
 * Which item types use the submission workflow (`submitted`, `accepted`). The
 * status sequence offers it for `sequenceItemTypes`; the correction path
 * offers it only for `correctionItemTypes`, which must be a subset.
 */
export const SubmissionWorkflowSchema = z
  .object({
    sequenceItemTypes: z.array(z.enum(courseItemTypeValues)),
    correctionItemTypes: z.array(z.enum(courseItemTypeValues)),
  })
  .strict()
  .superRefine((workflow, ctx) => {
    for (const [key, values] of [
      ['sequenceItemTypes', workflow.sequenceItemTypes],
      ['correctionItemTypes', workflow.correctionItemTypes],
    ] as const) {
      if (getDuplicateValues(values).length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: 'Duplicate item types are not allowed.',
        });
      }
    }
    for (const itemType of workflow.correctionItemTypes) {
      if (!workflow.sequenceItemTypes.includes(itemType)) {
        ctx.addIssue({
          code: 'custom',
          path: ['correctionItemTypes'],
          message: `Correction item type "${itemType}" has no submission workflow.`,
        });
      }
    }
  });

export type SubmissionWorkflow = z.infer<typeof SubmissionWorkflowSchema>;

/** The status an item type ends its workflow at; used by completion previews. */
export function getWorkflowTerminalStatus(
  workflow: SubmissionWorkflow,
  itemType: CourseItemType,
): ProgressStatus {
  return workflow.sequenceItemTypes.includes(itemType)
    ? 'accepted'
    : 'completed';
}

export type ProgrammePolicy = {
  readonly catalogueRules: CatalogueRules;
  readonly xp: XpPolicy;
  readonly workflow: SubmissionWorkflow;
  /**
   * The composed, ordered achievement catalogue: the programme's own
   * definitions and the shared ones, in display order.
   */
  readonly achievements: readonly AchievementDefinition[];
};
