import { z } from 'zod';

import {
  courseItemTypeValues,
  courseUnitTypeValues,
  progressStatusValues,
} from '@/lib/domain/constants';
import type { ProgrammeContent } from '@/lib/domain/programmeContent';
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

/** `sourceId` of an item completion award: `<itemId>-completed`. */
export function completionAwardSourceId(itemId: string): string {
  return `${itemId}-completed`;
}

/** `sourceId` of an item status-milestone award: `<itemId>-<milestone>`. */
export function statusMilestoneSourceId(
  itemId: string,
  milestone: string,
): string {
  return `${itemId}-${milestone}`;
}

/**
 * The XP award dedupe identity: the ledger dedupes on `(sourceType,
 * sourceId)`, so this is the one key format shared by the XP engine, the
 * earned-reward read models, backup validation and the registry's
 * cross-definition collision check.
 */
export function getXpAwardSourceKey(
  sourceType: string,
  sourceId: string,
): string {
  return JSON.stringify([sourceType, sourceId]);
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
 * The complete set of XP award identities (see {@link getXpAwardSourceKey})
 * that the XP engine can generate for a catalogue under a policy: item
 * completion awards, status milestones, required-unit completion bonuses and
 * fixed item milestones. Pure and derived from the same vocabulary functions
 * the engine uses, so the registry's cross-definition collision check and the
 * production award path cannot drift apart.
 *
 * A unit bonus is reachable only for a required unit of a bonus type that
 * has at least one required item, exactly the engine's condition.
 */
export function listPotentialXpRewardSourceKeys(
  catalogue: CourseSeed,
  xp: XpPolicy,
): string[] {
  const keys = new Set<string>();

  for (const unit of catalogue.units) {
    if (
      unit.required &&
      unit.items.some((item) => item.required) &&
      xp.unitCompletionBonuses.some((bonus) => bonus.unitType === unit.type)
    ) {
      keys.add(
        getXpAwardSourceKey(unitCompletionSourceType(unit.type), unit.id),
      );
    }

    for (const item of unit.items) {
      if (xp.completionAwards.some((award) => award.itemType === item.type)) {
        keys.add(
          getXpAwardSourceKey(
            completionAwardSourceType(item.type),
            completionAwardSourceId(item.id),
          ),
        );
      }

      for (const milestone of xp.statusMilestones) {
        if (milestone.itemType === item.type) {
          keys.add(
            getXpAwardSourceKey(
              statusMilestoneSourceType(item.type, milestone.milestone),
              statusMilestoneSourceId(item.id, milestone.milestone),
            ),
          );
        }
      }
    }
  }

  for (const milestone of xp.itemMilestones) {
    keys.add(getXpAwardSourceKey(milestone.sourceType, milestone.sourceId));
  }

  return [...keys];
}

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

/**
 * The status a completion preview evaluates an item type at. Only item types
 * whose submission workflow is offered on both the sequence and the correction
 * path (`correctionItemTypes`) preview at `accepted`; every other type,
 * including sequence-only types, previews at `completed`. For CS50 this is the
 * frozen C1 rule: `problem_set` → `accepted`, `lab` and all others →
 * `completed`.
 */
export function getWorkflowTerminalStatus(
  workflow: SubmissionWorkflow,
  itemType: CourseItemType,
): ProgressStatus {
  return workflow.correctionItemTypes.includes(itemType)
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

/**
 * The active programme's runtime scope (Epic C / C5, extended in C7): its
 * persisted ownership identity, catalogue, the catalogue identity that
 * catalogue-derived reads are scoped by, its policy and its programme-owned
 * content. The app state derives it from the persisted
 * `app_meta.activeProgrammeId` on every stable resolution and features take it
 * from app state; they pass it explicitly to shared read and write paths. It
 * is never persisted and never read from the registry by runtime code.
 */
export type ProgrammeScope = {
  readonly programmeId: string;
  readonly title: string;
  readonly catalogue: CourseSeed;
  readonly catalogueId: string;
  readonly policy: ProgrammePolicy;
  readonly content: ProgrammeContent;
};

/** Fails closed when the bootstrap has not resolved a programme scope. */
export function requireProgrammeScope(
  scope: ProgrammeScope | null | undefined,
): ProgrammeScope {
  if (!scope) {
    throw new Error('The active programme scope is not resolved.');
  }

  return scope;
}
