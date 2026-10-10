import type {
  AchievementDefinition,
  AchievementUnlock,
  LevelCurve,
} from '@/lib/domain';
import { calculateXpSummary, type XpSummary } from '@/lib/xp/engine';

/**
 * The reward part of a committed award mutation's result
 * (`upsertProgressAndAwardXp`, `logMediaProgressAndAwardXp`,
 * `addStudySessionAndAwardXp`). `awardedTransactions` and
 * `unlockedAchievements` hold only the rows that mutation created;
 * `xpSummary` is the lifetime summary read inside the same transaction.
 */
export type RewardMutationResult = {
  readonly awardedTransactions: ReadonlyArray<{ readonly xp: number }>;
  readonly unlockedAchievements: ReadonlyArray<
    Pick<AchievementUnlock, 'achievementId'>
  >;
  readonly xpSummary: Pick<XpSummary, 'level' | 'totalXp'>;
};

/** A reward newly created by one committed mutation. */
export type RewardEvent =
  | { readonly kind: 'level-up'; readonly level: number }
  | {
      readonly kind: 'achievement';
      readonly achievementId: string;
      readonly title: string;
    };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Whether a committed mutation result carries award-mutation reward data. */
export function isRewardMutationResult(
  value: unknown,
): value is RewardMutationResult {
  if (!isObject(value) || !isObject(value.xpSummary)) {
    return false;
  }

  return (
    Array.isArray(value.awardedTransactions) &&
    Array.isArray(value.unlockedAchievements) &&
    typeof value.xpSummary.level === 'number' &&
    typeof value.xpSummary.totalXp === 'number'
  );
}

/**
 * Derives the rewards one committed award mutation newly created: a level-up
 * when the XP it awarded crossed a level boundary, then each achievement it
 * unlocked, in the order the mutation reports them. The previous level comes
 * from the same transaction's total minus the XP awarded in it, so persisted
 * state alone never yields an event. A multi-level jump is one event for the
 * level reached. Both levels are read on the programme's own curve, the one
 * the mutation's summary was computed with.
 */
export function deriveRewardEvents(
  result: RewardMutationResult,
  achievementDefinitions: ReadonlyArray<
    Pick<AchievementDefinition, 'id' | 'title'>
  >,
  levelCurve?: LevelCurve,
): RewardEvent[] {
  const events: RewardEvent[] = [];
  const awardedXp = result.awardedTransactions.reduce(
    (total, transaction) => total + transaction.xp,
    0,
  );
  const previousLevel = calculateXpSummary(
    result.xpSummary.totalXp - awardedXp,
    levelCurve,
  ).level;

  if (awardedXp > 0 && result.xpSummary.level > previousLevel) {
    events.push({ kind: 'level-up', level: result.xpSummary.level });
  }

  for (const unlock of result.unlockedAchievements) {
    const definition = achievementDefinitions.find(
      (candidate) => candidate.id === unlock.achievementId,
    );

    events.push({
      kind: 'achievement',
      achievementId: unlock.achievementId,
      // Unlocks come only from the active programme's definitions; the id is
      // a last-resort label so a genuine unlock is never dropped.
      title: definition?.title ?? unlock.achievementId,
    });
  }

  return events;
}
