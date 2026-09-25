import type {
  CourseItem,
  CourseUnit,
  ProgressEntry,
  XpTransaction,
} from '@/lib/domain';
import {
  evaluateCompletionPreviewXp,
  getXpAwardSourceKey,
} from '@/lib/xp/engine';

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

/** A read-only incentive from the existing engine and earned-reward ledger. */
export function buildQuestRewardLabel(
  snapshot: QuestRewardData,
  itemId: string,
  detailed = false,
) {
  const item = snapshot.courseItems.find(
    (candidate) => candidate.id === itemId,
  );
  const unit = snapshot.courseUnits.find(
    (candidate) => candidate.id === item?.unitId,
  );
  if (!item || !unit) return 'No task XP';

  const sharedFinalReward =
    item.id === 'final-project-readme' ||
    item.id === 'final-project-video-demo';
  const awards = evaluateCompletionPreviewXp({
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
    (award) => award.sourceType !== 'week_completed',
  );
  const taskXp = remaining
    .filter((award) => award.sourceType !== 'week_completed')
    .reduce((sum, award) => sum + award.xp, 0);
  const weekXp = remaining
    .filter((award) => award.sourceType === 'week_completed')
    .reduce((sum, award) => sum + award.xp, 0);
  const taskLabel =
    taskXp > 0
      ? detailed
        ? `Up to ${taskXp} XP remaining for this task${sharedFinalReward ? ' (shared with README + demo)' : ''}`
        : `Up to +${taskXp} XP`
      : taskAwards.length > 0
        ? 'Task XP earned'
        : 'No task XP';
  return detailed && weekXp > 0
    ? `${taskLabel} · +${weekXp} XP when ${unit.title} is complete`
    : taskLabel;
}
