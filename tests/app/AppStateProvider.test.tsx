import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppStateProvider, useAppState } from '@/lib/appState';
import type { AppStateContextValue } from '@/lib/appState/AppStateContext';
import * as database from '@/lib/db';
import type { LearnerProfile } from '@/lib/domain';
import * as storage from '@/lib/storage';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';
import { FakeLockManager } from '../lib/localDataCoordinationFakes';
import { cs50Scope } from '../programmes/cs50Policy';

const defaultLearnerProfileValues = database.defaultLearnerProfileValues;

afterEach(() => {
  vi.restoreAllMocks();
});

type ProbeObservation = {
  displayName: string | null;
  status: AppStateContextValue['status'];
};

function dispatchPeerMessage(
  kind: storage.LocalCoordinationMessage['kind'],
  revision: number,
) {
  const message: storage.LocalCoordinationMessage = {
    id: `provider-peer-${kind}-${revision}-${Date.now()}`,
    kind,
    revision,
    sentAt: Date.now(),
    tabId: 'provider-test-peer',
  };

  window.dispatchEvent(
    new StorageEvent('storage', {
      key: storage.localCoordinationStorageKeys.message,
      newValue: JSON.stringify(message),
    }),
  );
}

async function seedOnboardedProfile(displayName: string) {
  await database.initializeDatabase({ seed: bundledCourseSeed });
  const result = await database.saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName,
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );

  return result.learnerProfile;
}

function profileWithDisplayName(
  profile: LearnerProfile,
  displayName: string,
): LearnerProfile {
  return {
    ...profile,
    displayName,
    updatedAt: new Date(Date.parse(profile.updatedAt) + 1_000).toISOString(),
  };
}

function ProviderProbe({
  observations,
  onValue,
}: {
  observations: ProbeObservation[];
  onValue: (value: AppStateContextValue) => void;
}) {
  const value = useAppState();

  useEffect(() => {
    onValue(value);
    observations.push({
      displayName: value.profile?.displayName ?? null,
      status: value.status,
    });
  }, [observations, onValue, value]);

  return (
    <output data-testid="provider-state">
      {value.status}:{value.profile?.displayName ?? 'none'}
    </output>
  );
}

describe('AppStateProvider freshness', () => {
  it('bounds continuous revision rejection and exposes only an error surface', async () => {
    const storedProfile = await seedOnboardedProfile('Never accepted');
    const rejectedSnapshot = profileWithDisplayName(
      storedProfile,
      'Continuously rejected',
    );
    const markSynchronized = vi
      .spyOn(storage, 'markLocalDataSynchronized')
      .mockReturnValue(false);
    vi.spyOn(database, 'getProfile').mockResolvedValue(rejectedSnapshot);

    await renderAppAtRoute('/settings');

    expect(
      await screen.findByRole('heading', { name: 'Local startup failed' }),
    ).toBeInTheDocument();
    expect(markSynchronized).toHaveBeenCalledTimes(3);
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Export local backup' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Continuously rejected')).not.toBeInTheDocument();
  });

  it('never publishes a final snapshot whose revision acknowledgement failed', async () => {
    const storedProfile = await seedOnboardedProfile('Stored learner');
    const rejectedSnapshot = profileWithDisplayName(
      storedProfile,
      'Rejected snapshot',
    );
    const acceptedSnapshot = profileWithDisplayName(
      rejectedSnapshot,
      'Accepted snapshot',
    );
    const originalMarkSynchronized = storage.markLocalDataSynchronized;
    const markSynchronized = vi
      .spyOn(storage, 'markLocalDataSynchronized')
      .mockImplementationOnce(() => false)
      .mockImplementation((token) => originalMarkSynchronized(token));
    vi.spyOn(database, 'getProfile')
      .mockResolvedValueOnce(rejectedSnapshot)
      .mockResolvedValueOnce(acceptedSnapshot);
    const observations: ProbeObservation[] = [];
    let latestValue: AppStateContextValue | null = null;

    render(
      <AppStateProvider resolveProgramme={() => cs50Scope}>
        <ProviderProbe
          observations={observations}
          onValue={(value) => {
            latestValue = value;
          }}
        />
      </AppStateProvider>,
    );

    expect(
      await screen.findByText('ready:Accepted snapshot'),
    ).toBeInTheDocument();
    expect(markSynchronized).toHaveBeenCalledTimes(2);
    expect(
      (latestValue as AppStateContextValue | null)?.profile?.displayName,
    ).toBe('Accepted snapshot');
    expect(observations).not.toContainEqual({
      displayName: 'Rejected snapshot',
      status: 'ready',
    });
  });

  it('retries a rejected stale preflight read and publishes only the final stable snapshot', async () => {
    const storedProfile = await seedOnboardedProfile('Stored learner');
    const observations: ProbeObservation[] = [];
    let latestValue: AppStateContextValue | null = null;

    render(
      <AppStateProvider resolveProgramme={() => cs50Scope}>
        <ProviderProbe
          observations={observations}
          onValue={(value) => {
            latestValue = value;
          }}
        />
      </AppStateProvider>,
    );
    expect(await screen.findByText('ready:Stored learner')).toBeInTheDocument();

    const rejectedPreflight = profileWithDisplayName(
      storedProfile,
      'Rejected preflight',
    );
    const acceptedPreflight = profileWithDisplayName(
      rejectedPreflight,
      'Accepted preflight',
    );
    const finalSnapshot = profileWithDisplayName(
      acceptedPreflight,
      'Final stable snapshot',
    );
    const originalMarkSynchronized = storage.markLocalDataSynchronized;
    const markSynchronized = vi
      .spyOn(storage, 'markLocalDataSynchronized')
      .mockImplementationOnce(() => false)
      .mockImplementation((token) => originalMarkSynchronized(token));
    vi.spyOn(database, 'getProfile')
      .mockResolvedValueOnce(rejectedPreflight)
      .mockResolvedValueOnce(acceptedPreflight)
      .mockResolvedValueOnce(finalSnapshot);
    const nextRevision = storage.getLocalCoordinationStatus().revision + 1;

    act(() => {
      dispatchPeerMessage('write', nextRevision);
    });

    expect(storage.getLocalCoordinationStatus().revision).toBe(nextRevision);
    expect(
      await screen.findByText('ready:Final stable snapshot'),
    ).toBeInTheDocument();
    expect(markSynchronized).toHaveBeenCalledTimes(3);
    expect(
      (latestValue as AppStateContextValue | null)?.profile?.displayName,
    ).toBe('Final stable snapshot');
    expect(observations).not.toContainEqual({
      displayName: 'Rejected preflight',
      status: 'ready',
    });
    expect(observations).not.toContainEqual({
      displayName: 'Accepted preflight',
      status: 'ready',
    });
  });

  it('coalesces overlapping refresh requests and resolves them after a trailing stable read', async () => {
    const storedProfile = await seedOnboardedProfile('Before refresh');
    const observations: ProbeObservation[] = [];
    let latestValue: AppStateContextValue | null = null;

    render(
      <AppStateProvider resolveProgramme={() => cs50Scope}>
        <ProviderProbe
          observations={observations}
          onValue={(value) => {
            latestValue = value;
          }}
        />
      </AppStateProvider>,
    );
    expect(await screen.findByText('ready:Before refresh')).toBeInTheDocument();

    let reportReadStarted: () => void = () => undefined;
    let releaseRead: () => void = () => undefined;
    const readStarted = new Promise<void>((resolve) => {
      reportReadStarted = resolve;
    });
    const readGate = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    vi.spyOn(database, 'getProfile').mockImplementationOnce(async () => {
      reportReadStarted();
      await readGate;
      return storedProfile;
    });
    let firstRefresh: Promise<void> = Promise.resolve();

    act(() => {
      firstRefresh = latestValue!.refresh();
    });
    await readStarted;

    let secondSettled = false;
    let secondRefresh: Promise<void> = Promise.resolve();
    act(() => {
      secondRefresh = latestValue!.refresh().then(() => {
        secondSettled = true;
      });
    });
    await Promise.resolve();
    expect(secondSettled).toBe(false);

    await database.saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        displayName: 'After refresh',
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      { completeOnboarding: true },
    );

    act(() => {
      releaseRead();
    });
    await Promise.all([firstRefresh, secondRefresh]);

    expect(secondSettled).toBe(true);
    await waitFor(() => {
      expect(latestValue?.profile?.displayName).toBe('After refresh');
    });
    expect(observations.at(-1)).toEqual({
      displayName: 'After refresh',
      status: 'ready',
    });
  });

  it('remounts a mutation-capable route and discards its stale draft after a same-owner commit', async () => {
    const user = userEvent.setup();
    await seedOnboardedProfile('Saved learner');
    await renderAppAtRoute('/settings');
    const draftInput = await screen.findByLabelText('Display name');

    await user.clear(draftInput);
    await user.type(draftInput, 'Unsaved stale draft');
    expect(draftInput).toHaveValue('Unsaved stale draft');

    await database.saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        displayName: 'Authoritative commit',
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      { completeOnboarding: true },
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Display name')).toHaveValue(
        'Authoritative commit',
      );
    });
    const refreshedInput = screen.getByLabelText('Display name');
    expect(refreshedInput).not.toBe(draftInput);
    expect(draftInput).not.toBeInTheDocument();
  });

  it('unmounts old-epoch mutation controls before acknowledging a handoff read', async () => {
    await seedOnboardedProfile('Handoff learner');
    await renderAppAtRoute('/settings');
    const oldInput = await screen.findByLabelText('Display name');
    const oldExportButton = screen.getByRole('button', {
      name: 'Export local backup',
    });
    const acknowledgementObservations: Array<{
      loadingVisible: boolean;
      oldExportEnabled: boolean;
      oldInputConnected: boolean;
    }> = [];
    const originalMarkSynchronized = storage.markLocalDataSynchronized;
    const markSynchronized = vi
      .spyOn(storage, 'markLocalDataSynchronized')
      .mockImplementation((token) => {
        acknowledgementObservations.push({
          loadingVisible:
            document.body.textContent?.includes('Preparing your workspace') ??
            false,
          oldExportEnabled:
            oldExportButton.isConnected &&
            !(oldExportButton as HTMLButtonElement).disabled,
          oldInputConnected: oldInput.isConnected,
        });

        return originalMarkSynchronized(token);
      });
    const nextRevision = storage.getLocalCoordinationStatus().revision + 1;

    act(() => {
      dispatchPeerMessage('write', nextRevision);
      dispatchPeerMessage('closing', nextRevision);
    });

    await waitFor(() => {
      expect(markSynchronized).toHaveBeenCalledTimes(2);
      expect(screen.getByLabelText('Display name')).toHaveValue(
        'Handoff learner',
      );
    });
    expect(acknowledgementObservations).toHaveLength(2);
    expect(acknowledgementObservations).toEqual([
      {
        loadingVisible: true,
        oldExportEnabled: false,
        oldInputConnected: false,
      },
      {
        loadingVisible: true,
        oldExportEnabled: false,
        oldInputConnected: false,
      },
    ]);
  });

  it('rereads and advances the data epoch before fake-lock ownership transfer enables writes', async () => {
    const storedProfile = await seedOnboardedProfile('Contended snapshot');
    const transferredProfile = profileWithDisplayName(
      storedProfile,
      'Transferred snapshot',
    );
    const lockManager = navigator.locks as unknown as FakeLockManager;
    let reportPeerLockAcquired: () => void = () => undefined;
    let releasePeerLock: () => void = () => undefined;
    const peerLockAcquired = new Promise<void>((resolve) => {
      reportPeerLockAcquired = resolve;
    });
    const peerLockGate = new Promise<void>((resolve) => {
      releasePeerLock = resolve;
    });
    const peerLockRequest = lockManager.request(
      storage.localCoordinationStorageKeys.writerLock,
      { mode: 'exclusive' },
      async () => {
        reportPeerLockAcquired();
        await peerLockGate;
      },
    );
    await peerLockAcquired;
    vi.spyOn(database, 'getProfile')
      .mockResolvedValueOnce(storedProfile)
      .mockResolvedValue(transferredProfile);
    const observations: Array<{
      canWrite: boolean;
      dataEpoch: number;
      displayName: string | null;
      status: AppStateContextValue['status'];
      writeOwnership: storage.LocalCoordinationStatus['writeOwnership'];
    }> = [];
    let latestValue: AppStateContextValue | null = null;

    render(
      <AppStateProvider resolveProgramme={() => cs50Scope}>
        <ProviderProbe
          observations={[]}
          onValue={(value) => {
            latestValue = value;
            observations.push({
              canWrite: value.coordination.canWrite,
              dataEpoch: value.dataEpoch,
              displayName: value.profile?.displayName ?? null,
              status: value.status,
              writeOwnership: value.coordination.writeOwnership,
            });
          }}
        />
      </AppStateProvider>,
    );

    expect(
      await screen.findByText('ready:Contended snapshot'),
    ).toBeInTheDocument();
    if (latestValue === null) {
      throw new Error('The provider did not publish its initial value.');
    }
    const initialValue: AppStateContextValue = latestValue;
    const initialEpoch = initialValue.dataEpoch;
    expect(initialValue.coordination).toMatchObject({
      canWrite: false,
      writeOwnership: 'contended',
    });
    const transferObservationStart = observations.length;

    act(() => {
      releasePeerLock();
    });
    await peerLockRequest;

    await waitFor(() => {
      expect(latestValue).toMatchObject({
        coordination: {
          canWrite: true,
          writeOwnership: 'owned',
        },
        dataEpoch: expect.any(Number),
        profile: { displayName: 'Transferred snapshot' },
        status: 'ready',
      });
      expect((latestValue as AppStateContextValue).dataEpoch).toBeGreaterThan(
        initialEpoch,
      );
    });
    const transferObservations = observations.slice(transferObservationStart);
    expect(transferObservations).toContainEqual(
      expect.objectContaining({
        canWrite: false,
        dataEpoch: expect.any(Number),
        displayName: 'Transferred snapshot',
        status: 'loading',
      }),
    );
    const firstWritableObservation = transferObservations.find(
      ({ canWrite }) => canWrite,
    );
    expect(firstWritableObservation).toMatchObject({
      dataEpoch: expect.any(Number),
      displayName: 'Transferred snapshot',
      writeOwnership: 'owned',
    });
    expect(firstWritableObservation?.dataEpoch).toBeGreaterThan(initialEpoch);
  });
});
