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

/**
 * Campaign-map node ordinal (Epic C / C4). The active programme labels every
 * unit of its catalogue; the unit ID is never parsed. A stored unit outside
 * that catalogue (possible until reads are scoped in C5) shows the shared
 * unnumbered marker: "+" without required tasks, "◆" with them.
 */
export function getMapNodeOrdinal(
  unit: { id: string; requiredItemCount: number },
  unitMapOrdinals: Readonly<Record<string, string>>,
) {
  if (Object.hasOwn(unitMapOrdinals, unit.id)) {
    return unitMapOrdinals[unit.id]!;
  }

  return unit.requiredItemCount === 0 ? '+' : '◆';
}
