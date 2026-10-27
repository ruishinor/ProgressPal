import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  nb: false,
  data: null as { level: number } | null,
  error: false,
}));
vi.mock('@/features/rpg/activity/useActivity', () => ({
  useActivityLanguage: () => state.nb,
  useActivityRead: () => state,
}));
import { ActivityIndicator } from '@/features/rpg/activity/ActivityIndicator';

describe('Activity character statistic', () => {
  it.each([
    [false, { level: 2 }, false, 'Activity Level 2'],
    [true, { level: 2 }, false, 'Aktivitetsnivå 2'],
    [false, null, false, 'Activity Level …'],
    [true, null, true, 'Aktivitetsnivå utilgjengelig'],
  ])(
    'keeps the named link and read state with a decorative icon: %s %j %s',
    (nb, data, error, name) => {
      Object.assign(state, { nb, data, error });
      render(
        <MemoryRouter>
          <ActivityIndicator />
        </MemoryRouter>,
      );
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('href', '/rpg/movement');
      expect(link.querySelector('.activity-icon')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(link.querySelector('.activity-icon')).toHaveAttribute(
        'data-activity-icon',
        'general',
      );
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    },
  );
});
