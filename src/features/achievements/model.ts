import type { AchievementsView, AchievementView } from '@/lib/db';
import type { AchievementCategory } from '@/lib/domain';
import { activityAchievementData } from '@/lib/activity/achievementData';

export type AchievementStatusFilter = 'all' | 'unlocked' | 'locked';
export type AchievementCategoryFilter = 'all' | AchievementCategory;

export const achievementCategoryLabels: Record<AchievementCategory, string> = {
  course_progress: 'Course progress',
  problem_sets: 'Problem sets',
  debugging: 'Debugging',
  consistency: 'Consistency',
  recovery: 'Recovery',
  final_project: 'Final project',
  reflection: 'Reflection',
};

// Display order for the category filter. Only categories that have at least one
// code-defined achievement appear in the filter (see buildCategoryOptions).
const categoryDisplayOrder: AchievementCategory[] = [
  'course_progress',
  'problem_sets',
  'consistency',
  'debugging',
  'final_project',
  'recovery',
  'reflection',
];

export type AchievementFilterOption = {
  label: string;
  value: string;
};

export function buildCategoryOptions(
  view: AchievementsView,
): AchievementFilterOption[] {
  const present = new Set(
    view.achievements.map((achievement) => achievement.category),
  );

  return [
    { value: 'all', label: 'All categories' },
    ...categoryDisplayOrder
      .filter((category) => present.has(category))
      .map((category) => ({
        value: category,
        label: achievementCategoryLabels[category],
      })),
  ];
}

export function filterAchievements(
  view: AchievementsView,
  statusFilter: AchievementStatusFilter,
  categoryFilter: AchievementCategoryFilter,
): AchievementView[] {
  return view.achievements
    .filter((achievement) => {
      if (statusFilter === 'unlocked') {
        return achievement.unlocked;
      }

      if (statusFilter === 'locked') {
        return !achievement.unlocked;
      }

      return true;
    })
    .filter((achievement) =>
      categoryFilter === 'all' ? true : achievement.category === categoryFilter,
    )
    .sort((left, right) => {
      const a = activityAchievementData.findIndex((row) => row.id === left.id);
      const b = activityAchievementData.findIndex((row) => row.id === right.id);
      if (a >= 0 || b >= 0) return a < 0 ? -1 : b < 0 ? 1 : a - b;
      return (
        left.category.localeCompare(right.category) ||
        left.title.localeCompare(right.title)
      );
    });
}

/**
 * Formats an achievement unlock timestamp as a stable calendar date. We slice
 * the ISO string rather than localizing so the output is deterministic across
 * test environments and locales.
 */
export function formatUnlockDate(unlockedAt: string): string {
  return unlockedAt.slice(0, 10);
}
