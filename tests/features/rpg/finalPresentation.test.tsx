import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RpgAchievementArt } from '@/features/rpg/components/RpgAchievementArt';
import { InsightsSurface } from '@/features/insights/components/InsightsSurface';
import { InlineInfo } from '@/components/ui/InlineInfo';
import {
  cs50AchievementDefinitions as achievementDefinitions,
  cs50Scope,
} from '../../programmes/cs50Policy';
import { initializeDatabase } from '@/lib/db';
import { bundledCourseSeed } from '@/seed';

// InsightsSurface reads the bootstrap programme scope from app state (C5).
vi.mock('@/lib/appState', () => ({
  useAppState: () => ({ programmeScope: cs50Scope }),
}));

describe('final RPG disclosures and artwork', () => {
  it('provides distinct decorative artwork for every known achievement and an error fallback', () => {
    const { container } = render(
      <>
        {achievementDefinitions.map((achievement) => (
          <RpgAchievementArt
            key={achievement.id}
            achievementId={achievement.id}
          />
        ))}
      </>,
    );
    const images = Array.from(container.querySelectorAll('img'));
    expect(images).toHaveLength(achievementDefinitions.length);
    expect(new Set(images.map((image) => image.src)).size).toBe(
      achievementDefinitions.length,
    );
    images.forEach((image) => expect(image).toHaveAttribute('alt', ''));
    fireEvent.error(images[0]);
    expect(
      container.querySelectorAll('.rpg-achievement-art--simple'),
    ).toHaveLength(1);
  });

  it('toggles inline information with Enter and Space', async () => {
    const user = userEvent.setup();
    render(<InlineInfo label="About Blocked">Blocked explanation</InlineInfo>);
    const button = screen.getByRole('button', { name: 'About Blocked' });
    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Blocked explanation')).toBeVisible();
    await user.keyboard(' ');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Blocked explanation')).not.toBeVisible();
  });

  it('opens only Course progress by default and mounts other content on demand', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    render(
      <MemoryRouter>
        <InsightsSurface variant="rpg" />
      </MemoryRouter>,
    );
    const heading = await screen.findByRole('heading', {
      name: 'Course progress',
    });
    expect(heading.closest('details')).toHaveAttribute('open');
    for (const title of [
      'Effort over time',
      'XP over time',
      'Study mode breakdown',
      'Active days',
      'Recorded completion awards',
      'Achievement timeline',
    ]) {
      const details = screen
        .getByRole('heading', { name: title })
        .closest('details')!;
      expect(details).not.toHaveAttribute('open');
      expect(
        within(details).queryByRole('table', { hidden: true }),
      ).not.toBeInTheDocument();
      details.open = true;
      fireEvent(details, new Event('toggle'));
      expect(details).toHaveAttribute('open');
    }
  });
});
