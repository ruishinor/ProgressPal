import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { CloudBackupCard } from '@/features/settings/components/CloudBackupCard';
import type { CloudSettingsDependencies } from '@/features/settings/cloudDependencies';
import {
  AppStateContext,
  type AppStateContextValue,
} from '@/lib/appState/AppStateContext';
import {
  readCloudPreferences,
  writeCloudPreferences,
  type CloudAccountPort,
  type CloudAccountState,
  type CloudSignOutResult,
} from '@/lib/cloud';
import { defaultLearnerProfileValues, singletonIds } from '@/lib/db';
import { LearnerProfileSchema } from '@/lib/domain';

import { cs50FixtureScope } from '../../programmes/c7Fixture';

/**
 * Shared test kit for the Settings cloud card: a stubbed application-state
 * boundary (so coordination and the local-mutation runner are deterministic),
 * an account whose state follows the device-local preferences like the real
 * one, and a render helper with a route to detect the post-restore navigation.
 */

export const learnerEmail = 'learner@example.com';

const timestamp = '2026-10-08T08:00:00.000Z';

export const writableCoordination = {
  blockReason: null,
  canWrite: true,
  peerActive: false,
  phase: 'ready',
  revision: 1,
  stale: false,
  writeOwnership: 'owned',
} as const;

export const peerActiveCoordination = {
  blockReason: 'peer-active',
  canWrite: false,
  peerActive: true,
  phase: 'ready',
  revision: 1,
  stale: false,
  writeOwnership: 'contended',
} as const;

export function stubState(
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
    programmeChoices: [],
    programmeScope: cs50FixtureScope,
    refresh: vi.fn(async () => undefined),
    requestPersistentStorage: vi.fn(async () => 'persistent' as const),
    requiresOnboarding: false,
    runLocalMutation: vi.fn(async (mutation: () => Promise<unknown>) =>
      mutation(),
    ),
    saveProfile: vi.fn(),
    status: 'ready',
    switchProgramme: vi.fn(async () => undefined),
    ...overrides,
  } as unknown as AppStateContextValue;
}

export function enableCloud(trustedDevice = false) {
  writeCloudPreferences({ enabled: true, trustedDevice });
}

/**
 * An account port whose state follows the preferences (disabled until cloud is
 * turned on) and a session the test can set. Every call is observable.
 */
export function makeAccount(
  options: {
    signInFails?: Error;
    signUp?: Awaited<ReturnType<CloudAccountPort['signUp']>> | Error;
    signOut?: CloudSignOutResult;
  } = {},
) {
  let session: { email: string } | null = null;
  const listeners = new Set<(state: CloudAccountState) => void>();
  const state = (): CloudAccountState =>
    !readCloudPreferences().enabled
      ? { status: 'disabled' }
      : session === null
        ? { status: 'signed-out' }
        : { status: 'signed-in', userId: 'user-1', email: session.email };
  const emit = () => listeners.forEach((listener) => listener(state()));

  const account = {
    getState: vi.fn(state),
    subscribe: vi.fn((listener: (next: CloudAccountState) => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    }),
    signIn: vi.fn(async ({ email }: { email: string; password: string }) => {
      if (options.signInFails) {
        throw options.signInFails;
      }

      session = { email };
      emit();
    }),
    signUp: vi.fn(async () => {
      const result = options.signUp ?? { kind: 'verification-required' };

      if (result instanceof Error) {
        throw result;
      }

      return result;
    }),
    signOut: vi.fn(async () => {
      session = null;
      emit();

      const result: CloudSignOutResult = options.signOut ?? {
        localSessionRemoved: true,
        serverInvalidation: 'confirmed',
      };

      return result;
    }),
    requestPasswordReset: vi.fn(async () => undefined),
    completeEmailLink: vi.fn(async () => ({ kind: 'invalid-link' }) as const),
    changePassword: vi.fn(async () => undefined),
    setTrustedDevice: vi.fn((value: boolean) => {
      writeCloudPreferences({
        ...readCloudPreferences(),
        trustedDevice: value,
      });
    }),
  } satisfies CloudAccountPort;

  return {
    account: account as CloudAccountPort & typeof account,
    /** Puts the account in the signed-in state without a sign-in request. */
    signInDirectly: (email = learnerEmail) => {
      session = { email };
    },
  };
}

export interface RenderCardOptions {
  state?: AppStateContextValue;
  dependencies: Partial<CloudSettingsDependencies>;
  localBusy?: boolean;
  exporting?: boolean;
  onExportLocal?: () => void | Promise<void>;
  titleAs?: 'h2' | 'h3';
}

/** The card inside a router that has a `/rpg` route to detect navigation. */
export function cardTree(options: RenderCardOptions) {
  const state = options.state ?? stubState();

  return (
    <MemoryRouter initialEntries={['/settings']}>
      <AppStateContext.Provider value={state}>
        <Routes>
          <Route
            element={
              <CloudBackupCard
                dependencies={options.dependencies}
                exporting={options.exporting ?? false}
                localBusy={options.localBusy ?? false}
                onExportLocal={options.onExportLocal ?? (() => undefined)}
                titleAs={options.titleAs ?? 'h3'}
              />
            }
            path="/settings"
          />
          <Route element={<p>RPG HOME REACHED</p>} path="/rpg" />
        </Routes>
      </AppStateContext.Provider>
    </MemoryRouter>
  );
}

export function renderCard(options: RenderCardOptions) {
  return render(cardTree(options));
}
