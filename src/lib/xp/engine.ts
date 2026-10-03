import {
  completionAwardSourceId,
  completionAwardSourceType,
  getWorkflowTerminalStatus,
  getXpAwardSourceKey,
  statusMilestoneSourceId,
  statusMilestoneSourceType,
  unitCompletionSourceType,
  type CourseItem,
  type CourseUnit,
  type ProgressEntry,
  type SubmissionWorkflow,
  type XpPolicy,
} from '@/lib/domain';
import { isItemComplete } from '@/lib/completion';
import { mergeCoveredRanges } from '@/lib/progress';

export type XpSummary = {
  totalXp: number;
  level: number;
  xpToNextLevel: number;
  currentLevelFloorXp: number;
  nextLevelXp: number;
};

/**
 * Calculates level and progress thresholds based on total XP.
 * level = floor(sqrt(totalXp / 100)) + 1
 */
export function calculateXpSummary(totalXp: number): XpSummary {
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const nextLevelXp = 100 * level * level;
  const currentLevelFloorXp = 100 * (level - 1) * (level - 1);
  const xpToNextLevel = nextLevelXp - totalXp;

  return {
    totalXp,
    level,
    xpToNextLevel,
    currentLevelFloorXp,
    nextLevelXp,
  };
}

/**
 * Deterministic stable hash function to avoid collisions
 * and produce a clean, valid entityId hex string.
 */
function simpleHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}`;
}

/**
 * Derives a collision-resistant deterministic transaction ID.
 * Falls back to hashing if the key doesn't match the entityIdSchema regex.
 *
 * E-SCHEMA-1A: identity includes the owning programme through its namespace.
 * The historical ledger owner (the programme that owned the pre-schema-4
 * global ledger) keeps the unchanged, unnamespaced formula, so its IDs stay
 * exactly as before; every other programme passes its programme ID as the
 * namespace. Programme IDs are not XP source types, so the namespaces cannot
 * meet, and the unique `&id` index fails closed if they ever did.
 */
export function deriveXpTransactionId(
  sourceType: string,
  sourceId: string,
  namespace?: string,
): string {
  const canonicalKey =
    namespace === undefined
      ? `xp-${sourceType}-${sourceId}`
      : `xp-${namespace}-${sourceType}-${sourceId}`;
  const entityIdPattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

  if (entityIdPattern.test(canonicalKey)) {
    return canonicalKey;
  }
  return `xp-hashed-${simpleHash(canonicalKey)}`;
}

/**
 * Calculates which 10-minute blocks of unique watched ranges are fully covered.
 * A 10-minute block is fully covered if it has 600 seconds of unique watched time.
 */
export function getCrossedBlocks(
  ranges: Array<{ startSecond: number; endSecond: number }>,
  durationSeconds: number,
): number[] {
  const merged = mergeCoveredRanges(ranges);
  const crossed: number[] = [];
  const numBlocks = Math.floor(durationSeconds / 600);

  for (let i = 0; i < numBlocks; i++) {
    const blockStart = i * 600;
    const blockEnd = (i + 1) * 600;
    let overlapSeconds = 0;

    for (const range of merged) {
      const overlapStart = Math.max(blockStart, range.startSecond);
      const overlapEnd = Math.min(blockEnd, range.endSecond);
      if (overlapEnd > overlapStart) {
        overlapSeconds += overlapEnd - overlapStart;
      }
    }

    if (overlapSeconds >= 600) {
      crossed.push(i);
    }
  }

  return crossed;
}

export type PotentialXpAward = {
  sourceType: string;
  sourceId: string;
  xp: number;
  reason: string;
};

/**
 * Item IDs that share a multi-item milestone with `itemId`, including
 * `itemId` itself; empty when the item is in no multi-item milestone.
 */
export function getLinkedMilestoneItemIds(
  policy: XpPolicy,
  itemId: string,
): string[] {
  const linked = new Set<string>();

  for (const milestone of policy.itemMilestones) {
    if (milestone.itemIds.length > 1 && milestone.itemIds.includes(itemId)) {
      for (const id of milestone.itemIds) linked.add(id);
    }
  }

  return [...linked];
}

/** Whether an award is a unit-completion bonus rather than a task award. */
export function isUnitCompletionAward(
  policy: XpPolicy,
  award: Pick<PotentialXpAward, 'sourceType'>,
): boolean {
  return policy.unitCompletionBonuses.some(
    (bonus) => unitCompletionSourceType(bonus.unitType) === award.sourceType,
  );
}

/**
 * Evaluates progress entry updates to derive potential XP awards. Pure
 * function with no database side effects. Every amount, type, status and
 * milestone comes from the programme's XP policy; award identity follows the
 * shared vocabulary formats in `@/lib/domain`.
 *
 * `milestoneProgress` must contain the saved progress of the other items in
 * the saved item's multi-item milestones (see
 * {@link getLinkedMilestoneItemIds}).
 */
export function evaluateProgressXp(params: {
  policy: XpPolicy;
  progressEntry: ProgressEntry;
  item: CourseItem;
  unit: CourseUnit;
  allUnitItems: CourseItem[];
  allUnitProgress: ProgressEntry[];
  milestoneProgress?: ProgressEntry[];
}): PotentialXpAward[] {
  const {
    policy,
    progressEntry,
    item,
    unit,
    allUnitItems,
    allUnitProgress,
    milestoneProgress = [],
  } = params;
  const awards: PotentialXpAward[] = [];
  const status = progressEntry.status;

  // 1. Completion awards by item type
  if (isItemComplete(status)) {
    const completion = policy.completionAwards.find(
      (award) => award.itemType === item.type,
    );

    if (completion !== undefined) {
      awards.push({
        sourceType: completionAwardSourceType(item.type),
        sourceId: completionAwardSourceId(item.id),
        xp: completion.xp,
        reason: `Completed ${item.type}: ${item.title}`,
      });
    }
  }

  // 2. Status milestones by item type
  for (const milestone of policy.statusMilestones) {
    if (
      milestone.itemType === item.type &&
      milestone.statuses.includes(status)
    ) {
      awards.push({
        sourceType: statusMilestoneSourceType(
          milestone.itemType,
          milestone.milestone,
        ),
        sourceId: statusMilestoneSourceId(item.id, milestone.milestone),
        xp: milestone.xp,
        reason: `${milestone.reasonLabel}: ${item.title}`,
      });
    }
  }

  // 3. Required unit completion bonus
  const unitBonus = policy.unitCompletionBonuses.find(
    (bonus) => bonus.unitType === unit.type,
  );
  if (unitBonus !== undefined && unit.required) {
    const requiredItems = allUnitItems.filter((i) => i.required);
    if (requiredItems.length > 0) {
      const allRequiredCompleted = requiredItems.every((ui) => {
        const p =
          ui.id === item.id
            ? progressEntry
            : allUnitProgress.find((up) => up.itemId === ui.id);
        return p && isItemComplete(p.status);
      });

      if (allRequiredCompleted) {
        awards.push({
          sourceType: unitCompletionSourceType(unit.type),
          sourceId: unit.id,
          xp: unitBonus.xp,
          reason: `Completed all required items for ${unit.title}`,
        });
      }
    }
  }

  // 4. Item milestones
  if (isItemComplete(status)) {
    for (const milestone of policy.itemMilestones) {
      if (!milestone.itemIds.includes(item.id)) continue;

      const othersComplete = milestone.itemIds.every((otherId) => {
        if (otherId === item.id) return true;
        const otherProgress = milestoneProgress.find(
          (p) => p.itemId === otherId,
        );
        return (
          otherProgress !== undefined && isItemComplete(otherProgress.status)
        );
      });

      if (othersComplete) {
        awards.push({
          sourceType: milestone.sourceType,
          sourceId: milestone.sourceId,
          xp: milestone.xp,
          reason: milestone.reason,
        });
      }
    }
  }

  return awards;
}

// The dedupe key format is shared vocabulary owned by `@/lib/domain`; it stays
// exported here for the existing engine consumers.
export { getXpAwardSourceKey };

/**
 * Previews the awards for completing an item: the item is evaluated at its
 * workflow's terminal status (from the programme's submission workflow).
 */
export function evaluateCompletionPreviewXp(params: {
  policy: XpPolicy;
  workflow: SubmissionWorkflow;
  allCourseItems: readonly CourseItem[];
  allProgress: readonly ProgressEntry[];
  item: CourseItem;
  unit: CourseUnit;
}): PotentialXpAward[] {
  const { policy, workflow, allCourseItems, allProgress, item, unit } = params;
  const completion: ProgressEntry = {
    id: `preview-${item.id}`,
    itemId: item.id,
    status: getWorkflowTerminalStatus(workflow, item.type),
    confidence: 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
  // A shared milestone is previewed as if every linked item were complete.
  const linkedItemIds = getLinkedMilestoneItemIds(policy, item.id);
  const milestoneProgress =
    linkedItemIds.length > 0
      ? linkedItemIds.map((id) => ({
          ...completion,
          itemId: id,
        }))
      : [...allProgress];

  return evaluateProgressXp({
    policy,
    item,
    unit,
    progressEntry: completion,
    allUnitItems: allCourseItems.filter(
      (candidate) => candidate.unitId === unit.id,
    ),
    allUnitProgress: [...allProgress],
    milestoneProgress,
  });
}
