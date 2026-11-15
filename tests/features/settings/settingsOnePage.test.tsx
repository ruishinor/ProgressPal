import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SettingsSurface } from '@/features/settings';
import {
  AppStateContext,
  type AppStateContextValue,
} from '@/lib/appState/AppStateContext';
import { defaultLearnerProfileValues, singletonIds } from '@/lib/db';
import { LearnerProfileSchema } from '@/lib/domain';

import { cs50FixtureScope, cs50ProgrammeId } from '../../programmes/c7Fixture';

const timestamp = '2026-11-15T08:00:00.000Z';

function stubState(): AppStateContextValue {
  return {
    appMeta: null,
    coordination: {
      blockReason: null,
      canWrite: true,
      peerActive: false,
      phase: 'ready',
      revision: 1,
      stale: false,
      writeOwnership: 'owned',
    },
    dataEpoch: 0,
    enrolAndSwitchProgramme: vi.fn(async () => undefined),
    error: null,
    persistenceStatus: 'persistent',
    profile: LearnerProfileSchema.parse({
      ...defaultLearnerProfileValues,
      createdAt: timestamp,
      id: singletonIds.learnerProfile,
      updatedAt: timestamp,
    }),
    programmeChoices: [
      {
        active: true,
        enrolled: true,
        programmeId: cs50ProgrammeId,
        title: cs50FixtureScope.title,
      },
    ],
    programmeScope: cs50FixtureScope,
    refresh: vi.fn(async () => undefined),
    requestPersistentStorage: vi.fn(async () => 'persistent' as const),
    requiresOnboarding: false,
    runLocalMutation: vi.fn(),
    saveProfile: vi.fn(),
    status: 'ready',
    switchProgramme: vi.fn(async () => undefined),
  } as AppStateContextValue;
}

describe.each(['classic', 'rpg'] as const)('%s Settings page', (variant) => {
  it('keeps every section on one page behind same-page jump links', () => {
    render(
      <MemoryRouter>
        <AppStateContext.Provider value={stubState()}>
          <SettingsSurface variant={variant} />
        </AppStateContext.Provider>
      </MemoryRouter>,
    );

    const jump = screen.getByRole('navigation', { name: 'Settings sections' });
    const links = within(jump).getAllByRole('link');

    expect(links.map((link) => link.textContent)).toEqual([
      'General',
      'Profile & preferences',
      'Data & backups',
      'Send feedback',
    ]);
    for (const link of links) {
      const id = link.getAttribute('href')?.replace(/^#/, '') ?? '';
      expect(document.getElementById(id), id).not.toBeNull();
      // A jump link only moves within the page; it never marks a page.
      expect(link).not.toHaveAttribute('aria-current');
    }

    // Each section is a named region, and nothing in it is hidden.
    const general = screen.getByRole('region', { name: 'General' });
    expect(
      within(general).getByRole('heading', { name: 'Interface' }),
    ).toBeVisible();
    expect(
      within(general).getByRole('heading', { name: 'Programme' }),
    ).toBeVisible();
    for (const [name, button] of [
      ['Profile & preferences', 'Save local settings'],
      ['Data & backups', 'Export local backup'],
    ] as const) {
      expect(
        within(screen.getByRole('region', { name })).getByRole('button', {
          name: button,
        }),
      ).toBeVisible();
    }
    expect(
      within(screen.getByRole('region', { name: 'General' })).getByRole(
        'link',
        { name: 'Send feedback' },
      ),
    ).toHaveAttribute('href', expect.stringMatching(/^mailto:/));
  });
});
