import { buildQuestRewardLabel } from '@/features/rpg/model/questRewards';
import type { CourseItem, CourseUnit, XpTransaction } from '@/lib/domain';

import { c1Timestamp } from './c1Support';
import { buildC1PreviewRows, type C1Award } from './c1XpTable';

/**
 * Epic C / C1 preview evidence builder (test-only). For every CS50 item it
 * records the real completion preview (`evaluateCompletionPreviewXp`) and the
 * learner-visible RPG reward labels (`buildQuestRewardLabel`, compact and
 * detailed) from a fresh state and after the previewed awards are earned.
 * The committed fixture `tests/fixtures/preservation/c1-preview-rewards.json`
 * was produced by this builder at the product baseline.
 */

export type C1PreviewLabelRow = {
  awards: C1Award[];
  earnedLabel: string;
  earnedLabelDetailed: string;
  freshLabel: string;
  freshLabelDetailed: string;
  itemId: string;
};

function earnedTransactions(awards: readonly C1Award[]): XpTransaction[] {
  return awards.map((award) => ({
    awardedAt: c1Timestamp,
    createdAt: c1Timestamp,
    id: award.transactionId,
    programmeId: 'cs50x',
    reason: award.reason,
    sourceId: award.sourceId,
    sourceType: award.sourceType,
    updatedAt: c1Timestamp,
    xp: award.xp,
  }));
}

export function buildC1PreviewLabelRows(catalogue: {
  items: readonly CourseItem[];
  units: readonly CourseUnit[];
}): C1PreviewLabelRow[] {
  const base = {
    courseItems: catalogue.items,
    courseUnits: catalogue.units,
    progressEntries: [],
  };

  return buildC1PreviewRows(catalogue).map((row) => {
    const fresh = { ...base, xpTransactions: [] };
    const earned = { ...base, xpTransactions: earnedTransactions(row.awards) };

    return {
      awards: row.awards,
      earnedLabel: buildQuestRewardLabel(earned, row.itemId),
      earnedLabelDetailed: buildQuestRewardLabel(earned, row.itemId, true),
      freshLabel: buildQuestRewardLabel(fresh, row.itemId),
      freshLabelDetailed: buildQuestRewardLabel(fresh, row.itemId, true),
      itemId: row.itemId,
    };
  });
}
