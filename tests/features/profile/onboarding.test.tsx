import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { OnboardingPage } from '@/features/profile';
import {
  AppStateContext,
  type AppStateContextValue,
} from '@/lib/appState/AppStateContext';
import { defaultLearnerProfileValues } from '@/lib/db';
import { cs50Scope } from '../../programmes/cs50Policy';

const timestamp = '2026-07-12T10:00:00.000Z';
const profile = {
  ...defaultLearnerProfileValues,
  id: 'learner-profile',
  createdAt: timestamp,
  updatedAt: timestamp,
};
const completedState = {
  appMeta: {
    id: 'app-meta',
    appVersion: '1.3.0',
    createdAt: timestamp,
    onboardingCompletedAt: timestamp,
    schemaVersion: 3,
    activeProgrammeId: 'cs50x',
    updatedAt: timestamp,
  },
  learnerProfile: profile,
};

function LocationProbe() {
  const location = useLocation();

  return <p>{`${location.pathname}${location.search}${location.hash}`}</p>;
}

function renderOnboarding(
  saveProfile: AppStateContextValue['saveProfile'],
  returnTo: string,
) {
  const value: AppStateContextValue = {
    appMeta: null,
    coordination: {
      blockReason: null,
      canWrite: true,
      peerActive: false,
      phase: 'ready',
      revision: 0,
      stale: false,
      writeOwnership: 'owned',
    },
    dataEpoch: 0,
    error: null,
    persistenceStatus: 'best-effort',
    profile,
    enrolAndSwitchProgramme: async () => {
      throw new Error('This harness must not switch programmes.');
    },
    programmeChoices: [
      {
        active: true,
        enrolled: true,
        programmeId: cs50Scope.programmeId,
        title: cs50Scope.title,
      },
    ],
    programmeScope: cs50Scope,
    switchProgramme: async () => {
      throw new Error('This harness must not switch programmes.');
    },
    refresh: async () => undefined,
    requestPersistentStorage: async () => 'best-effort',
    runLocalMutation: async (mutation) => mutation(),
    requiresOnboarding: true,
    saveProfile,
    status: 'ready',
  };

  return render(
    <AppStateContext.Provider value={value}>
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/onboarding',
            state: { returnTo },
          },
        ]}
      >
        <Routes>
          <Route element={<OnboardingPage />} path="/onboarding" />
          <Route element={<LocationProbe />} path="*" />
        </Routes>
      </MemoryRouter>
    </AppStateContext.Provider>,
  );
}

describe('OnboardingPage', () => {
  it('announces a quick-start write failure and allows a successful retry', async () => {
    const user = userEvent.setup();
    const saveProfile = vi
      .fn<AppStateContextValue['saveProfile']>()
      .mockRejectedValueOnce(new Error('IndexedDB write failed.'))
      .mockResolvedValue(completedState);

    renderOnboarding(saveProfile, '/rpg/focus?itemId=week-4-lecture#timer');

    await user.click(screen.getByRole('radio', { name: /CS50x/ }));
    const useDefault = screen.getByRole('button', {
      name: 'Use default learner',
    });

    await user.click(useDefault);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The default learner could not be saved locally. Try again.',
    );
    expect(useDefault).toBeEnabled();

    await user.click(useDefault);

    expect(
      await screen.findByText('/rpg/focus?itemId=week-4-lecture#timer'),
    ).toBeInTheDocument();
    expect(saveProfile).toHaveBeenCalledTimes(2);
  });

  it('falls back to RPG for an unsafe return destination', async () => {
    const user = userEvent.setup();
    const saveProfile = vi
      .fn<AppStateContextValue['saveProfile']>()
      .mockResolvedValue(completedState);

    renderOnboarding(saveProfile, 'https://example.com/capture');

    await user.click(screen.getByRole('radio', { name: /CS50x/ }));
    await user.click(
      screen.getByRole('button', { name: 'Use default learner' }),
    );

    expect(await screen.findByText('/rpg')).toBeInTheDocument();
  });
});
