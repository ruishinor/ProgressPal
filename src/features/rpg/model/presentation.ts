import type { ProgressStatus } from '@/lib/domain';
import type { XpSummary } from '@/lib/xp/engine';

export function getQuestActionLabel(status: ProgressStatus | 'not_started') {
  if (status === 'not_started') return 'Start quest';
  if (status === 'blocked') return 'Review blocked quest';
  if (
    status === 'completed' ||
    status === 'accepted' ||
    status === 'skipped_optional'
  ) {
    return 'Review quest';
  }
  return 'Continue quest';
}

export function getLevelProgressDisplay(xp: XpSummary) {
  const currentLevelXp = xp.totalXp - xp.currentLevelFloorXp;
  const currentLevelTargetXp = xp.nextLevelXp - xp.currentLevelFloorXp;
  return {
    currentLevelXp,
    currentLevelTargetXp,
    levelProgressLabel: `${currentLevelXp} / ${currentLevelTargetXp} XP to Level ${xp.level + 1}`,
  };
}
