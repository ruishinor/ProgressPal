import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadRpgHubSummary: vi.fn(),
  loadRpgHudSummary: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@/features/rpg/model/readModels', () => ({
  loadRpgHubSummary: mocks.loadRpgHubSummary,
  loadRpgHudSummary: mocks.loadRpgHudSummary,
  projectRpgHudSummary: (summary: unknown) => summary,
}));

vi.mock('@/lib/appState', () => ({
  useAppState: () => ({
    coordination: { blockReason: null },
    programmeScope: cs50Scope,
    refresh: mocks.refresh,
  }),
}));
vi.mock('@/features/rpg/activity/ActivityIndicator', () => ({
  ActivityIndicator: () => <a href="/rpg/movement">Activity Level 1</a>,
}));

import { RpgShell } from '@/features/rpg/shell/RpgShell';
import { cs50Scope } from '../../programmes/cs50Policy';
import type { RpgHudSummary } from '@/features/rpg/model/types';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RpgShell HUD lifecycle', () => {
  it('discloses one copy of mobile facts, restores desktop facts on resize, and cleans up without another progress read', async () => {
    let change!: () => void;
    const media = {
      matches: true,
      addEventListener: vi.fn((_event, listener) => {
        change = listener;
      }),
      removeEventListener: vi.fn(),
    };
    vi.spyOn(window, 'matchMedia').mockReturnValue(
      media as unknown as MediaQueryList,
    );
    const summary: RpgHudSummary = {
      learnerName: 'Alex',
      learnerAvatarConfig: null,
      identity: {
        rankLabel: 'New Learner',
        guildLabel: 'Code Knights',
        classLabel: 'Generalist',
        pathLabel: 'CS Foundations',
      },
      recommendation: {
        state: 'required_complete',
        quest: null,
        remainingRequiredCount: 0,
        optionalRemainingCount: 2,
      },
      xpSummary: {
        currentLevelXp: 0,
        currentLevelTargetXp: 100,
        levelProgressLabel: '0 / 100 XP to Level 2',
        level: 1,
        levelProgressPercent: 0,
        totalXp: 0,
        xpToNextLevel: 100,
      },
    };
    mocks.loadRpgHudSummary.mockReset().mockResolvedValue(summary);
    const view = render(
      <MemoryRouter initialEntries={['/rpg/map']}>
        <RpgShell />
      </MemoryRouter>,
    );
    const hud = await screen.findByRole('region', {
      name: 'Persistent hero HUD',
    });
    await within(hud).findByText('Alex');
    const disclosure = within(hud).getByLabelText('Character details');
    expect(
      within(hud).getByRole('link', { name: 'Activity Level 1' }),
    ).toBeVisible();
    expect(
      within(hud).getByRole('link', { name: 'Open Settings' }),
    ).toBeVisible();
    expect(
      within(hud).getByRole('link', { name: 'Open Campaign' }),
    ).toBeVisible();
    expect(within(hud).getAllByText('New Learner')).toHaveLength(1);
    expect(within(hud).getByText('New Learner')).not.toBeVisible();
    fireEvent.click(disclosure);
    for (const text of [
      'New Learner',
      'Code Knights',
      'Generalist',
      'CS Foundations',
      cs50Scope.title,
      '2 optional tasks remain on the map.',
    ])
      expect(within(hud).getByText(text)).toBeVisible();
    expect(disclosure.closest('details')).toHaveAttribute('open');
    act(() => {
      media.matches = false;
      change();
    });
    expect(
      within(hud).queryByLabelText('Character details'),
    ).not.toBeInTheDocument();
    expect(within(hud).getAllByText('New Learner')).toHaveLength(1);
    expect(within(hud).getByText('New Learner')).toBeVisible();
    expect(mocks.loadRpgHudSummary).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', change);
  });

  it('ignores a HUD read failure after the shell unmounts', async () => {
    let rejectLoad!: (reason: Error) => void;
    mocks.loadRpgHubSummary.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectLoad = reject;
      }),
    );
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const view = render(
      <MemoryRouter>
        <RpgShell />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mocks.loadRpgHubSummary).toHaveBeenCalledOnce();
    });

    view.unmount();
    await act(async () => {
      rejectLoad(new Error('database closed during teardown'));
      await Promise.resolve();
    });

    expect(consoleError).not.toHaveBeenCalled();
  });
});
