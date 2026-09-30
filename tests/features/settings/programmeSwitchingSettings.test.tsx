import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SettingsSurface } from '@/features/settings';
import {
  AppStateContext,
  type AppStateContextValue,
} from '@/lib/appState/AppStateContext';
import { defaultLearnerProfileValues, singletonIds } from '@/lib/db';
import { LearnerProfileSchema } from '@/lib/domain';

import {
  altFixtureScope,
  altProgrammeId,
  cs50FixtureScope,
  cs50ProgrammeId,
} from '../../programmes/c7Fixture';

/**
 * Epic C / C7 Settings → Programme, exercised through the real shared
 * `SettingsSurface` with the application-state boundary stubbed, so every
 * coordination, pending and failure state is deterministic.
 */

const timestamp = '2026-09-30T08:00:00.000Z';
const writableCoordination = {
  blockReason: null,
  canWrite: true,
  peerActive: false,
  phase: 'ready',
  revision: 1,
  stale: false,
  writeOwnership: 'owned',
} as const;

const onlyProgramme = [
  {
    active: true,
    enrolled: true,
    programmeId: cs50ProgrammeId,
    title: cs50FixtureScope.title,
  },
];
const twoProgrammes = (altEnrolled: boolean) => [
  ...onlyProgramme,
  {
    active: false,
    enrolled: altEnrolled,
    programmeId: altProgrammeId,
    title: altFixtureScope.title,
  },
];

function stubState(
  overrides: Partial<AppStateContextValue> = {},
): AppStateContextValue {
  return {
    appMeta: null,
    coordination: writableCoordination,
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
    programmeChoices: onlyProgramme,
    programmeScope: cs50FixtureScope,
    refresh: vi.fn(async () => undefined),
    requestPersistentStorage: vi.fn(async () => 'persistent' as const),
    requiresOnboarding: false,
    runLocalMutation: vi.fn(),
    saveProfile: vi.fn(),
    status: 'ready',
    switchProgramme: vi.fn(async () => undefined),
    ...overrides,
  } as AppStateContextValue;
}

function renderSettings(
  state: AppStateContextValue,
  variant: 'classic' | 'rpg' = 'classic',
) {
  return render(
    <MemoryRouter>
      <AppStateContext.Provider value={state}>
        <SettingsSurface variant={variant} />
      </AppStateContext.Provider>
    </MemoryRouter>,
  );
}

function programmeCard() {
  const heading = screen.getByRole('heading', { name: 'Programme' });

  return heading.closest('.card') as HTMLElement;
}

describe('Settings → Programme', () => {
  it('shows the active programme and no switch action when there is no alternative', () => {
    renderSettings(stubState());

    expect(programmeCard()).toHaveTextContent(
      `Active programme: ${cs50FixtureScope.title}`,
    );
    expect(screen.queryByLabelText('Programme to switch to')).toBeNull();
    expect(
      screen.queryByRole('button', {
        name: /switch programme|enrol and switch/i,
      }),
    ).toBeNull();
  });

  it('offers the registered alternatives with their enrolment state and requires an explicit action', async () => {
    const state = stubState({ programmeChoices: twoProgrammes(false) });
    renderSettings(state);

    const select = screen.getByLabelText('Programme to switch to');
    expect(programmeCard()).toHaveTextContent(
      `Active programme: ${cs50FixtureScope.title}`,
    );
    expect(select).toHaveDisplayValue(
      `${altFixtureScope.title} (not enrolled)`,
    );
    // Only alternatives are listed; the active programme is not a choice.
    expect(screen.getAllByRole('option')).toHaveLength(1);

    await userEvent.selectOptions(select, altProgrammeId);
    await userEvent.tab();

    expect(state.switchProgramme).not.toHaveBeenCalled();
    expect(state.enrolAndSwitchProgramme).not.toHaveBeenCalled();
  });

  it('enrols and switches explicitly for a programme that is not enrolled yet', async () => {
    const state = stubState({ programmeChoices: twoProgrammes(false) });
    renderSettings(state);

    await userEvent.click(
      screen.getByRole('button', { name: 'Enrol and switch' }),
    );

    expect(state.enrolAndSwitchProgramme).toHaveBeenCalledExactlyOnceWith(
      altProgrammeId,
    );
    expect(state.switchProgramme).not.toHaveBeenCalled();
  });

  it('switches through the normal action for an enrolled programme', async () => {
    const state = stubState({ programmeChoices: twoProgrammes(true) });
    renderSettings(state);

    expect(screen.getByLabelText('Programme to switch to')).toHaveDisplayValue(
      `${altFixtureScope.title} (enrolled)`,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Switch programme' }),
    );

    expect(state.switchProgramme).toHaveBeenCalledExactlyOnceWith(
      altProgrammeId,
    );
    expect(state.enrolAndSwitchProgramme).not.toHaveBeenCalled();
  });

  it('exposes a pending state while the switch runs and releases it afterwards', async () => {
    let release: () => void = () => undefined;
    const state = stubState({
      enrolAndSwitchProgramme: vi.fn(
        () => new Promise<void>((resolve) => (release = resolve)),
      ),
      programmeChoices: twoProgrammes(false),
    });
    renderSettings(state);

    fireEvent.click(screen.getByRole('button', { name: 'Enrol and switch' }));

    const busy = screen.getByRole('button', { name: 'Enrol and switch' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toBeDisabled();
    expect(screen.getByLabelText('Programme to switch to')).toBeDisabled();

    release();

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Enrol and switch' }),
      ).not.toHaveAttribute('aria-busy'),
    );
  });

  it('shows clear failure feedback and keeps the control usable', async () => {
    const state = stubState({
      enrolAndSwitchProgramme: vi.fn(async () => {
        throw new Error('synthetic failure');
      }),
      programmeChoices: twoProgrammes(false),
    });
    renderSettings(state);

    await userEvent.click(
      screen.getByRole('button', { name: 'Enrol and switch' }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/could not be switched/i);
    expect(alert).toHaveTextContent(/active programme is unchanged/i);
    expect(
      screen.getByRole('button', { name: 'Enrol and switch' }),
    ).toBeEnabled();
  });

  it.each([
    ['the tab cannot write', { ...writableCoordination, canWrite: false }],
    ['another tab is active', { ...writableCoordination, peerActive: true }],
  ])('disables the switch when %s', async (_label, coordination) => {
    const state = stubState({
      coordination,
      programmeChoices: twoProgrammes(false),
    });
    renderSettings(state);

    expect(
      screen.getByRole('button', { name: 'Enrol and switch' }),
    ).toBeDisabled();
    expect(screen.getByLabelText('Programme to switch to')).toBeDisabled();
  });

  it('renders the same control in the RPG variant of the shared surface', async () => {
    const state = stubState({ programmeChoices: twoProgrammes(true) });
    renderSettings(state, 'rpg');

    expect(
      screen.getByRole('heading', { level: 2, name: 'Programme' }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Switch programme' }),
    );
    expect(state.switchProgramme).toHaveBeenCalledExactlyOnceWith(
      altProgrammeId,
    );
  });
});
