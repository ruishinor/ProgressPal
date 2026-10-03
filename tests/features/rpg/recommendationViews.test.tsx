import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildRpgHubSummary } from '@/features/rpg/model/readModels';
import { RpgHomePage } from '@/features/rpg/routes/RpgHomePage';
import { RpgShell } from '@/features/rpg/shell/RpgShell';
import { getDatabaseSnapshot, initializeDatabase } from '@/lib/db';
import { bundledCourseSeed } from '@/seed';
import { cs50Scope } from '../../programmes/cs50Policy';

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/features/rpg/model/readModels', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/rpg/model/readModels')>()),
  loadRpgHubSummary: mocks.load,
  loadRpgHudSummary: mocks.load,
}));
vi.mock('@/lib/appState', () => ({
  useAppState: () => ({
    coordination: { blockReason: null },
    programmeScope: cs50Scope,
    refresh: vi.fn(),
  }),
}));

async function fixture(
  state: 'blocked' | 'last-blocked' | 'complete' | 'empty',
) {
  await initializeDatabase({ seed: bundledCourseSeed });
  const snapshot = await getDatabaseSnapshot();
  const required = snapshot.courseItems.filter((item) => item.required);
  snapshot.progressEntries = required.map((item, index) => ({
    id: `fixture-${item.id}`,
    itemId: item.id,
    status:
      state === 'blocked' ||
      (state === 'last-blocked' && index === required.length - 1)
        ? 'blocked'
        : 'completed',
    confidence: 3,
    createdAt: '2026-09-16T08:00:00Z',
    updatedAt: '2026-09-16T08:00:00Z',
  }));
  if (state === 'empty') {
    snapshot.courseItems = [];
    snapshot.courseUnits = [];
    snapshot.progressEntries = [];
  }
  return buildRpgHubSummary(snapshot, '2026-09-16T08:00:00Z');
}

function renderRoute(route: string) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<RpgShell />}>
          <Route path="/rpg" element={<RpgHomePage />} />
          <Route path="/rpg/map" element={<h1>Campaign Map</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.load.mockReset();
});

describe('recommendation presentation', () => {
  it.each(['blocked', 'last-blocked'] as const)(
    'keeps %s work actionable for inspection on Hub',
    async (state) => {
      const summary = await fixture(state);
      mocks.load.mockResolvedValue(summary);
      renderRoute('/rpg');
      const link = await screen.findByRole('link', {
        name: 'Review blocked quest',
      });
      expect(link).toHaveAttribute(
        'href',
        `/rpg/resource/${summary.recommendation.quest!.id}`,
      );
      expect(
        screen.getByRole('heading', { name: 'Blocked work needs attention' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Required tasks complete in ProgressPal'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText('Blocked tasks remain available.', { exact: false }),
      ).toBeInTheDocument();
    },
  );

  it('keeps blocked work inspectable from the shared HUD', async () => {
    const summary = await fixture('last-blocked');
    mocks.load.mockResolvedValue(summary);
    renderRoute('/rpg/map');
    const link = await screen.findByRole('link', {
      name: 'Review blocked quest',
    });
    expect(link).toHaveAttribute(
      'href',
      `/rpg/resource/${summary.recommendation.quest!.id}`,
    );
    expect(
      screen.getByText('Blocked work needs attention'),
    ).toBeInTheDocument();
  });

  it('explains local completion and preserves an optional-work route', async () => {
    const summary = await fixture('complete');
    mocks.load.mockResolvedValue(summary);
    renderRoute('/rpg');
    expect(
      await screen.findByRole('heading', {
        name: 'Required tasks complete in ProgressPal',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not confirm official CS50 completion/),
    ).toBeInTheDocument();
    expect(screen.getByText(/optional tasks remain/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open Campaign Map' }),
    ).toHaveAttribute('href', '/rpg/map');
  });

  it.each(['/rpg', '/rpg/map'])(
    'never presents missing course data as completion at %s',
    async (route) => {
      mocks.load.mockResolvedValue(await fixture('empty'));
      renderRoute(route);
      expect(
        await screen.findByText('Course data unavailable'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Required tasks complete in ProgressPal'),
      ).not.toBeInTheDocument();
      if (route === '/rpg') {
        expect(
          screen.queryByRole('progressbar', {
            name: 'Required course progress',
          }),
        ).not.toBeInTheDocument();
      }
    },
  );

  it('offers read recovery for an actual load failure', async () => {
    const errors = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mocks.load.mockRejectedValue(new Error('Injected summary read failure'));
    renderRoute('/rpg');
    expect(
      await screen.findByRole('heading', { name: 'Home could not be read' }),
    ).toBeInTheDocument();
    const hud = screen.getByRole('region', { name: 'Persistent hero HUD' });
    expect(
      within(hud).getByRole('button', { name: 'Retry' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Required tasks complete in ProgressPal'),
    ).not.toBeInTheDocument();
    expect(errors).toHaveBeenCalledTimes(1);
    errors.mockRestore();
  });
});
