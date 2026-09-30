import type {
  CourseItem,
  CourseUnit,
  ProgrammeScope,
  ProgressEntry,
  XpTransaction,
} from '@/lib/domain';
import {
  evaluateCompletionPreviewXp,
  getLinkedMilestoneItemIds,
  getXpAwardSourceKey,
  isUnitCompletionAward,
} from '@/lib/xp/engine';
import { getDefaultProgrammeDefinition } from '@/programmes';

type QuestRewardLedger =
  | {
      earnedRewardSourceKeys?: never;
      xpTransactions: readonly XpTransaction[];
    }
  | {
      earnedRewardSourceKeys: ReadonlySet<string>;
      xpTransactions?: never;
    };

export type QuestRewardData = {
  courseItems: readonly CourseItem[];
  courseUnits: readonly CourseUnit[];
  progressEntries: readonly ProgressEntry[];
} & QuestRewardLedger;

/**
 * A read-only incentive from the existing engine and earned-reward ledger.
 * The XP policy and reward wording are the active programme's (Epic C / C3,
 * C7): runtime callers pass the active scope.
 */
export function buildProgrammeQuestRewardLabel(
  programme: Pick<ProgrammeScope, 'content' | 'policy'>,
  snapshot: QuestRewardData,
  itemId: string,
  detailed = false,
) {
  const { policy: programmePolicy, content } = programme;
  const { xp: policy, workflow } = programmePolicy;
  const item = snapshot.courseItems.find(
    (candidate) => candidate.id === itemId,
  );
  const unit = snapshot.courseUnits.find(
    (candidate) => candidate.id === item?.unitId,
  );
  if (!item || !unit) return 'No task XP';

  const sharedFinalReward =
    getLinkedMilestoneItemIds(policy, item.id).length > 0;
  const awards = evaluateCompletionPreviewXp({
    policy,
    workflow,
    allCourseItems: snapshot.courseItems,
    allProgress: snapshot.progressEntries,
    item,
    unit,
  });
  const remaining = awards.filter((award) => {
    const earned =
      snapshot.earnedRewardSourceKeys !== undefined
        ? snapshot.earnedRewardSourceKeys.has(
            getXpAwardSourceKey(award.sourceType, award.sourceId),
          )
        : snapshot.xpTransactions.some(
            (transaction) =>
              transaction.sourceType === award.sourceType &&
              transaction.sourceId === award.sourceId,
          );

    return !earned;
  });
  const taskAwards = awards.filter(
    (award) => !isUnitCompletionAward(policy, award),
  );
  const taskXp = remaining
    .filter((award) => !isUnitCompletionAward(policy, award))
    .reduce((sum, award) => sum + award.xp, 0);
  const weekXp = remaining
    .filter((award) => isUnitCompletionAward(policy, award))
    .reduce((sum, award) => sum + award.xp, 0);
  const taskLabel =
    taskXp > 0
      ? detailed
        ? `Up to ${taskXp} XP remaining for this task${sharedFinalReward ? ` (${content.terminology.copy.sharedMilestoneRewardNote})` : ''}`
        : `Up to +${taskXp} XP`
      : taskAwards.length > 0
        ? 'Task XP earned'
        : 'No task XP';
  return detailed && weekXp > 0
    ? `${taskLabel} · +${weekXp} XP when ${unit.title} is complete`
    : taskLabel;
}

/**
 * CS50-default compatibility entrypoint (Epic C / C3). Keeps its signature for
 * the C1 preservation oracles and existing tests, which call it without a
 * scope. Runtime code never calls it; it uses
 * {@link buildProgrammeQuestRewardLabel} with the active scope.
 */
export function buildQuestRewardLabel(
  snapshot: QuestRewardData,
  itemId: string,
  detailed = false,
) {
  return buildProgrammeQuestRewardLabel(
    getDefaultProgrammeDefinition(),
    snapshot,
    itemId,
    detailed,
  );
}
