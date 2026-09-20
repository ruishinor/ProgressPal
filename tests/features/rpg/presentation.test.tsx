import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RpgLevelProgress } from '@/features/rpg/components/RpgLevelProgress';
import {
  getLevelProgressDisplay,
  getQuestActionLabel,
} from '@/features/rpg/model/presentation';
import { calculateXpSummary } from '@/lib/xp/engine';

describe('RPG progression presentation', () => {
  it.each([
    ['not_started', 'Start quest'],
    ['started', 'Continue quest'],
    ['blocked', 'Review blocked quest'],
  ] as const)('labels %s truthfully', (status, label) => {
    expect(getQuestActionLabel(status)).toBe(label);
  });

  it.each([
    [0, '0 / 100 XP to Level 2'],
    [100, '0 / 300 XP to Level 3'],
    [210, '110 / 300 XP to Level 3'],
    [400, '0 / 500 XP to Level 4'],
  ])('shows current-level progress at %i lifetime XP', (totalXp, label) => {
    const xp = calculateXpSummary(totalXp);
    const display = getLevelProgressDisplay(xp);
    render(
      <RpgLevelProgress
        xp={{
          ...xp,
          ...display,
          levelProgressPercent:
            (display.currentLevelXp / display.currentLevelTargetXp) * 100,
        }}
      />,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.queryByText(/XP total/)).not.toBeInTheDocument();
  });
});
