import type { ActivityData, ActivityEntry } from '@/lib/domain/activity';
import type { SatisfiedAchievement } from '@/lib/achievements/engine';
import { activityAchievementData } from './achievementData';

/** Validated ledger only. First qualifying date/ID prefix is the witness;
 * award time belongs to the committing save, never this historical scan. */
export function evaluateActivityAchievements(
  data: ActivityData,
  today: string,
): SatisfiedAchievement[] {
  const entries = data.activityEntries
    .filter((entry) => entry.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const customIds = new Set(data.activityDefinitions.map((row) => row.id));
  const snapshots = new Map(
    data.activityDays.map((day) => [day.id, day.goals]),
  );
  const totals = new Map<string, number>();
  const dates = new Map<string, Set<string>>();
  const customDates = new Map<string, Set<string>>();
  const activeDates = new Set<string>();
  const types = new Set<string>();
  const completedDates = new Set<string>();
  const satisfied = new Map<string, SatisfiedAchievement>();
  let daily = new Map<string, number>();
  let lastDate = '';
  let longestInactiveGap = 0;
  let paired = false;
  const key = (id: string, unit: string) => `${id}:${unit}`;
  const totalMeets = (
    id: string,
    branch: { unit: string; minAmount: number; minDates?: number },
  ) =>
    (totals.get(key(id, branch.unit)) ?? 0) >= branch.minAmount &&
    (dates.get(key(id, branch.unit))?.size ?? 0) >= (branch.minDates ?? 1);

  for (const entry of entries) {
    if (entry.date !== lastDate) {
      if (lastDate)
        longestInactiveGap = Math.max(
          longestInactiveGap,
          (Date.parse(`${entry.date}T00:00:00Z`) -
            Date.parse(`${lastDate}T00:00:00Z`)) /
            86400000 -
            1,
        );
      lastDate = entry.date;
      daily = new Map();
    }
    activeDates.add(entry.date);
    types.add(entry.activityId);
    const measurement = key(entry.activityId, entry.unit);
    totals.set(measurement, (totals.get(measurement) ?? 0) + entry.amount);
    const measurementDates = dates.get(measurement) ?? new Set<string>();
    measurementDates.add(entry.date);
    dates.set(measurement, measurementDates);
    daily.set(measurement, (daily.get(measurement) ?? 0) + entry.amount);
    if (customIds.has(entry.activityId)) {
      const history = customDates.get(entry.activityId) ?? new Set<string>();
      history.add(entry.date);
      customDates.set(entry.activityId, history);
    }
    const goals = (snapshots.get(entry.date) ?? []).filter(
      (goal) => goal.enabled,
    );
    if (
      goals.length > 0 &&
      goals.every(
        (goal) =>
          (daily.get(key(goal.activityId, goal.unit)) ?? 0) >= goal.target,
      )
    )
      completedDates.add(entry.date);

    for (const definition of activityAchievementData) {
      if (satisfied.has(definition.id)) continue;
      let qualifies = false;
      switch (definition.rule) {
        case 'first_entry':
          qualifies = true;
          break;
        case 'activity_total_and_days':
          qualifies = totalMeets(
            definition.config.activityId,
            definition.config,
          );
          break;
        case 'activity_alternative_totals':
        case 'activity_alternative_totals_and_days':
          qualifies = definition.config.alternatives.some((branch) =>
            totalMeets(definition.config.activityId, branch),
          );
          break;
        case 'distinct_activity_ids':
          qualifies = types.size >= definition.config.minDistinctActivities;
          break;
        case 'same_day_cross_unit_pair': {
          // One native-unit branch from a different stable activity identity.
          for (const [repsKey, amount] of daily) {
            if (
              !repsKey.endsWith(':reps') ||
              amount < definition.config.repsMin
            )
              continue;
            const id = repsKey.slice(0, -5);
            paired ||= [...daily].some(([otherKey, value]) =>
              definition.config.otherActivityAlternatives.some(
                (branch) =>
                  otherKey.endsWith(`:${branch.unit}`) &&
                  otherKey !== key(id, branch.unit) &&
                  value >= branch.minAmount,
              ),
            );
          }
          qualifies = paired;
          break;
        }
        case 'snapshot_goal_days':
          qualifies = completedDates.size >= definition.config.minDates;
          break;
        case 'custom_activity_dates':
          qualifies = [...customDates.values()].some(
            (history) => history.size >= definition.config.minDates,
          );
          break;
        case 'return_gap_or_active_days':
          qualifies =
            longestInactiveGap >=
              definition.config.minFullInactiveDatesBetween ||
            activeDates.size >= definition.config.alternativeActiveDates;
          break;
        case 'active_dates':
          qualifies = activeDates.size >= definition.config.minDates;
          break;
      }
      if (qualifies)
        satisfied.set(definition.id, {
          achievementId: definition.id,
          triggerSourceId: entry.id,
        });
    }
  }
  return activityAchievementData.flatMap((definition) => {
    const result = satisfied.get(definition.id);
    return result ? [result] : [];
  });
}

/** Entry shape is preserved for existing callers; no educational XP summary. */
export type ActivitySaveResult = ActivityEntry & {
  rewardKind: 'activity';
  unlockedAchievements: readonly { achievementId: string }[];
};
