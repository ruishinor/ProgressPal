import { subDays } from 'date-fns';

import type {
  ActivityDay,
  ActivityEntry,
  ActivityGoal,
  ActivityUnit,
} from '@/lib/domain/activity';
import { formatLocalDate } from '@/lib/time';

export const activityDate = formatLocalDate;
export function previousActivityDate(date: string, days = 1) {
  return activityDate(subDays(new Date(`${date}T12:00:00`), days));
}
export function activityParticipation(
  dates: readonly string[],
  today = activityDate(new Date()),
) {
  const unique = new Set(dates.filter((date) => date <= today));
  let currentStreak = 0;
  let cursor = unique.has(today) ? today : previousActivityDate(today);
  while (unique.has(cursor)) {
    currentStreak++;
    cursor = previousActivityDate(cursor);
  }
  let bestStreak = 0;
  let run = 0;
  let last = '';
  for (const date of [...unique].sort()) {
    run = previousActivityDate(date) === last ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    last = date;
  }
  return {
    activeDays: unique.size,
    level: 1 + Math.floor(unique.size / 7),
    daysToNextLevel: 7 - (unique.size % 7),
    currentStreak,
    bestStreak,
  };
}
export function goalProgress(
  goal: ActivityGoal,
  entries: readonly ActivityEntry[],
) {
  const amount = entries
    .filter(
      (entry) =>
        entry.activityId === goal.activityId && entry.unit === goal.unit,
    )
    .reduce((sum, entry) => sum + entry.amount, 0);
  return { amount, complete: amount >= goal.target };
}
export function activityTotals(
  entries: readonly ActivityEntry[],
  today: string,
) {
  const totals = new Map<
    string,
    { activityId: string; unit: ActivityUnit; recent: number; lifetime: number }
  >();
  for (const entry of entries) {
    if (entry.date > today) continue;
    const key = `${entry.activityId}:${entry.unit}`;
    const row = totals.get(key) ?? {
      activityId: entry.activityId,
      unit: entry.unit,
      recent: 0,
      lifetime: 0,
    };
    row.lifetime += entry.amount;
    if (entry.date >= previousActivityDate(today, 27))
      row.recent += entry.amount;
    totals.set(key, row);
  }
  return [...totals.values()];
}
export function recentActivityDays(
  entries: readonly ActivityEntry[],
  days: readonly ActivityDay[],
  today: string,
  currentGoals: readonly ActivityGoal[] = [],
) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = previousActivityDate(today, index);
    const daily = entries.filter((entry) => entry.date === date);
    const snapshot = days.find((day) => day.id === date);
    const goals = (
      snapshot?.goals ?? (date === today ? currentGoals : [])
    ).filter((goal) => goal.enabled);
    // Empty past snapshots may come from backfilled entries with unknown goals.
    const goalStatusKnown =
      date === today || (snapshot !== undefined && snapshot.goals.length > 0);
    return {
      date,
      active: daily.length > 0,
      goalStatusKnown,
      configured: goals.length,
      complete: goals.filter((goal) => goalProgress(goal, daily).complete)
        .length,
    };
  });
}
export function toActivityAmount(display: string, unit: ActivityUnit) {
  if (display.trim() === '') throw new Error('Enter an amount.');
  const value = Number(display);
  const base = value * (unit === 'seconds' ? 60 : unit === 'metres' ? 1000 : 1);
  const amount = Math.round(base);
  if (
    !Number.isFinite(base) ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    Math.abs(base - amount) > 0.000001
  )
    throw new Error('Enter a positive amount with a valid precision.');
  return amount;
}
export function displayActivityAmount(amount: number, unit: ActivityUnit) {
  return amount / (unit === 'seconds' ? 60 : unit === 'metres' ? 1000 : 1);
}
