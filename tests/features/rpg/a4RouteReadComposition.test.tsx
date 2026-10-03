import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RpgFocusPage } from '@/features/rpg/routes/RpgFocusPage';
import { RpgHeroPage } from '@/features/rpg/routes/RpgHeroPage';
import { RpgHomePage } from '@/features/rpg/routes/RpgHomePage';
import { RpgResourcePage } from '@/features/rpg/routes/RpgResourcePage';
import { RpgShell } from '@/features/rpg/shell/RpgShell';
import * as database from '@/lib/db';
import { bundledCourseSeed } from '@/seed';
import type { ProgrammeScope } from '@/lib/domain';
import { cs50Scope } from '../../programmes/cs50Policy';

const readCalls = vi.hoisted(() => ({
  hero: vi.fn(),
  hub: vi.fn(),
  hud: vi.fn(),
}));

const appState = vi.hoisted(() => ({
  coordination: {
    blockReason: null as null | 'peer-active' | 'stale' | 'unavailable',
    canWrite: true,
  },
  profile: {
    updatedAt: '2026-09-21T01:00:00.000Z',
  },
  programmeScope: null as ProgrammeScope | null,
  refresh: vi.fn(async () => undefined),
  runLocalMutation: vi.fn(async (mutation: () => Promise<unknown>) =>
    mutation(),
  ),
}));

vi.mock('@/lib/appState', () => ({
  useAppState: () => appState,
}));
appState.programmeScope = cs50Scope;

vi.mock('@/features/rpg/model/readModels', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/rpg/model/readModels')>();

  return {
    ...actual,
    loadRpgHeroProfileSummary: readCalls.hero,
    loadRpgHubSummary: readCalls.hub,
    loadRpgHudSummary: readCalls.hud,
  };
});

const emptyHubSummary = {
  recommendation: {
    state: 'unavailable' as const,
    quest: null,
  },
  courseProgress: {
    completedRequiredItemCount: 0,
    completionPercent: 0,
    requiredItemCount: 0,
  },
  currentModule: null,
  identity: {
    classLabel: 'Generalist' as const,
    guildLabel: 'Code Knights' as const,
    pathLabel: 'CS Foundations' as const,
    rankLabel: 'Initiate',
  },
  learnerAvatarConfig: null,
  learnerName: 'Learner',
  recentActivity: [],
  studySummary: {
    sessionCount: 0,
    totalMinutes: 0,
  },
  weeklyProgress: {
    completedRequiredItemCount: 0,
    savedProgressCount: 0,
    sessionCount: 0,
    totalMinutes: 0,
    weekEndDate: '2026-09-28',
    weekStartDate: '2026-09-21',
    xpEarned: 0,
  },
  weekFour: null,
  xpSummary: {
    currentLevelXp: 0,
    currentLevelTargetXp: 100,
    levelProgressLabel: '0 / 100 XP',
    level: 1,
    levelProgressPercent: 0,
    totalXp: 0,
    xpToNextLevel: 100,
  },
};

const emptyHudSummary = {
  recommendation: emptyHubSummary.recommendation,
  identity: emptyHubSummary.identity,
  learnerAvatarConfig: emptyHubSummary.learnerAvatarConfig,
  learnerName: emptyHubSummary.learnerName,
  xpSummary: emptyHubSummary.xpSummary,
};

const emptyHeroSummary = {
  badges: {
    earnedBadgeCount: 0,
    totalBadgeCount: 0,
  },
  courseProgress: {
    completedRequiredItemCount: 0,
    completionPercent: 0,
    requiredItemCount: 0,
  },
  hasLocalActivity: false,
  identity: emptyHubSummary.identity,
  learnerAvatarConfig: null,
  learnerName: 'Learner',
  recentActivity: [],
  studySummary: {
    sessionCount: 0,
    totalMinutes: 0,
  },
  xpSummary: emptyHubSummary.xpSummary,
};

function emitCompositionEvidence(
  surface: string,
  details: Record<string, number>,
) {
  console.info(
    'A4_GREEN_COMPOSITION_EVIDENCE',
    JSON.stringify({ surface, ...details }),
  );
}

function renderShellRoute(route: '/rpg' | '/rpg/hero' | '/rpg/map') {
  const router = createMemoryRouter(
    [
      {
        path: '/rpg',
        element: <RpgShell />,
        children: [
          { index: true, element: <RpgHomePage /> },
          { path: 'hero', element: <RpgHeroPage /> },
          { path: 'map', element: <h1>Campaign Map</h1> },
        ],
      },
    ],
    { initialEntries: [route] },
  );

  return render(<RouterProvider router={router} />);
}

function renderSaveRoute(route: string) {
  const refreshHud = vi.fn(async () => emptyHudSummary);
  const router = createMemoryRouter(
    [
      {
        element: <Outlet context={{ refreshHud }} />,
        children: [
          {
            path: '/rpg/resource/:itemId',
            element: <RpgResourcePage />,
          },
          {
            path: '/rpg/focus',
            element: <RpgFocusPage />,
          },
        ],
      },
    ],
    { initialEntries: [route] },
  );

  return {
    ...render(<RouterProvider router={router} />),
    refreshHud,
    router,
  };
}

describe('A4 route/read composition GREEN', () => {
  beforeEach(async () => {
    readCalls.hub.mockReset();
    readCalls.hero.mockReset();
    readCalls.hud.mockReset();
    readCalls.hub.mockResolvedValue(emptyHubSummary);
    readCalls.hero.mockResolvedValue(emptyHeroSummary);
    readCalls.hud.mockResolvedValue(emptyHudSummary);

    appState.coordination.blockReason = null;
    appState.coordination.canWrite = true;
    appState.refresh.mockClear();
    appState.runLocalMutation.mockClear();

    await database.initializeDatabase({ seed: bundledCourseSeed });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('uses one A4 Hub read for direct /rpg', async () => {
    renderShellRoute('/rpg');

    await screen.findByRole('heading', { name: 'Home' });
    await waitFor(() => expect(readCalls.hub).toHaveBeenCalledTimes(1));

    emitCompositionEvidence('direct-hub', {
      hubReads: readCalls.hub.mock.calls.length,
      heroReads: readCalls.hero.mock.calls.length,
      hudReads: readCalls.hud.mock.calls.length,
    });

    expect(
      readCalls.hub,
      'future A4 direct Hub composition must perform one A4 Hub read total',
    ).toHaveBeenCalledTimes(1);
    expect(readCalls.hero).not.toHaveBeenCalled();
    expect(readCalls.hud).not.toHaveBeenCalled();
  });

  it('uses one narrow HUD read for a non-Hub/non-Hero RPG child route', async () => {
    renderShellRoute('/rpg/map');

    await screen.findByRole('heading', { name: 'Campaign Map' });
    await waitFor(() => expect(readCalls.hud).toHaveBeenCalledTimes(1));

    emitCompositionEvidence('direct-child-hud', {
      hubReads: readCalls.hub.mock.calls.length,
      heroReads: readCalls.hero.mock.calls.length,
      hudReads: readCalls.hud.mock.calls.length,
    });

    expect(readCalls.hud).toHaveBeenCalledTimes(1);
    expect(readCalls.hub).not.toHaveBeenCalled();
    expect(readCalls.hero).not.toHaveBeenCalled();
  });

  it('uses one Hero read and no hidden shell read for direct /rpg/hero', async () => {
    renderShellRoute('/rpg/hero');

    await screen.findByRole('heading', { name: 'Hero Profile' });
    await waitFor(() => expect(readCalls.hero).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(readCalls.hub).toHaveBeenCalledTimes(0));

    emitCompositionEvidence('direct-hero', {
      hubReads: readCalls.hub.mock.calls.length,
      heroReads: readCalls.hero.mock.calls.length,
      hudReads: readCalls.hud.mock.calls.length,
    });

    expect(
      readCalls.hub,
      'future A4 direct Hero composition must not start a hidden shell Hub read',
    ).not.toHaveBeenCalled();
    expect(readCalls.hero).toHaveBeenCalledTimes(1);
    expect(readCalls.hud).not.toHaveBeenCalled();
  });

  it('uses one shared A4 refresh for Resource post-save', async () => {
    const { refreshHud } = renderSaveRoute('/rpg/resource/week-0-lecture');

    await screen.findByRole('heading', { name: 'Lecture 0: Scratch' });

    refreshHud.mockClear();
    readCalls.hub.mockClear();

    fireEvent.change(screen.getByLabelText('Add study note'), {
      target: { value: 'A4 GREEN resource note.' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Mark locally complete' }),
    );

    await screen.findByRole('heading', { name: 'Progress saved' });
    await waitFor(() => expect(readCalls.hub).toHaveBeenCalledTimes(0));
    await waitFor(() => expect(refreshHud).toHaveBeenCalledTimes(1));

    const totalA4RefreshRequests =
      readCalls.hub.mock.calls.length + refreshHud.mock.calls.length;

    emitCompositionEvidence('resource-post-save', {
      directHubReads: readCalls.hub.mock.calls.length,
      hudRefreshRequests: refreshHud.mock.calls.length,
      totalA4RefreshRequests,
    });

    expect(
      totalA4RefreshRequests,
      'future A4 Resource save must request one shared A4 refresh result',
    ).toBe(1);
  });

  it('uses one shared A4 refresh for Focus post-save', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(3_000_000);
    const { refreshHud } = renderSaveRoute('/rpg/focus?itemId=week-4-lecture');

    await screen.findByRole('button', { name: 'Start live session' });

    refreshHud.mockClear();
    readCalls.hub.mockClear();

    fireEvent.change(screen.getAllByLabelText('Mode')[0], {
      target: { value: 'debugging' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start live session' }));

    nowSpy.mockReturnValue(3_000_000 + 25 * 60_000);
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    fireEvent.change(screen.getAllByLabelText('Notes')[0], {
      target: { value: 'A4 GREEN focus note.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save study session' }));

    await screen.findByRole('button', { name: 'Start live session' });
    await waitFor(() => expect(readCalls.hub).toHaveBeenCalledTimes(0));
    await waitFor(() => expect(refreshHud).toHaveBeenCalledTimes(1));

    const totalA4RefreshRequests =
      readCalls.hub.mock.calls.length + refreshHud.mock.calls.length;

    emitCompositionEvidence('focus-post-save', {
      directHubReads: readCalls.hub.mock.calls.length,
      hudRefreshRequests: refreshHud.mock.calls.length,
      totalA4RefreshRequests,
    });

    expect(
      totalA4RefreshRequests,
      'future A4 Focus save must request one shared A4 refresh result',
    ).toBe(1);
  }, 15_000);
});
