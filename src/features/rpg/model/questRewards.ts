import type { DatabaseSnapshot } from '@/lib/db';
import type { ProgressEntry } from '@/lib/domain';
import { evaluateProgressXp } from '@/lib/xp/engine';

/** A read-only incentive from the existing engine and earned-reward ledger. */
export function buildQuestRewardLabel(
  snapshot: DatabaseSnapshot,
  itemId: string,
) {
  const item = snapshot.courseItems.find(
    (candidate) => candidate.id === itemId,
  );
  const unit = snapshot.courseUnits.find(
    (candidate) => candidate.id === item?.unitId,
  );
  if (!item || !unit) return 'No task XP';

  const completion: ProgressEntry = {
    id: `preview-${item.id}`,
    itemId: item.id,
    status: item.type === 'problem_set' ? 'accepted' : 'completed',
    confidence: 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
  const sharedFinalReward =
    item.id === 'final-project-readme' ||
    item.id === 'final-project-video-demo';
  const finalProjectProgress = sharedFinalReward
    ? ['final-project-readme', 'final-project-video-demo'].map((id) => ({
        ...completion,
        itemId: id,
      }))
    : snapshot.progressEntries;
  const awards = evaluateProgressXp({
    item,
    unit,
    progressEntry: completion,
    allUnitItems: snapshot.courseItems.filter(
      (candidate) => candidate.unitId === unit.id,
    ),
    allUnitProgress: snapshot.progressEntries,
    finalProjectProgress,
  });
  const remaining = awards.filter(
    (award) =>
      !snapshot.xpTransactions.some(
        (earned) =>
          earned.sourceType === award.sourceType &&
          earned.sourceId === award.sourceId,
      ),
  );
  const taskAwards = awards.filter(
    (award) => award.sourceType !== 'week_completed',
  );
  const taskXp = remaining
    .filter((award) => award.sourceType !== 'week_completed')
    .reduce((sum, award) => sum + award.xp, 0);
  const weekXp = remaining
    .filter((award) => award.sourceType === 'week_completed')
    .reduce((sum, award) => sum + award.xp, 0);
  const condition = sharedFinalReward
    ? 'when README + demo are complete (shared reward)'
    : item.type === 'problem_set'
      ? 'through acceptance'
      : 'on completion';
  const taskLabel =
    taskXp > 0
      ? `+${taskXp} XP ${condition}`
      : taskAwards.length > 0
        ? 'Task XP earned'
        : 'No task XP';
  return weekXp > 0
    ? `${taskLabel} · +${weekXp} XP week completion bonus`
    : taskLabel;
}
