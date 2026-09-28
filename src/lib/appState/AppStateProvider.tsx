import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  getAppMeta,
  getProfile,
  initializeDatabase,
  isIndexedDbAvailable,
  saveLearnerProfile,
  type DatabaseMigrationContext,
  type SaveLearnerProfileInput,
} from '@/lib/db';
import { getSharedDatabase } from '@/lib/db/database';
import {
  AppStateContext,
  type AppStateStatus,
} from '@/lib/appState/AppStateContext';
import type {
  AppMeta,
  LearnerProfile,
  PreferredTheme,
  ProgrammeScope,
} from '@/lib/domain';
import { hasCompletedOnboarding } from '@/lib/profile';
import {
  captureLocalDataRevision,
  getLocalCoordinationStatus,
  inspectStoragePersistence,
  LocalWriteBlockedError,
  markLocalDataSynchronized,
  requestStoragePersistence,
  startLocalDataCoordination,
  validateLocalDataRevision,
  type LocalCoordinationStatus,
  type StoragePersistenceStatus,
  type LocalDataRevisionToken,
} from '@/lib/storage';

type ResolvedAppState = {
  appMeta: AppMeta | null;
  error: string | null;
  profile: LearnerProfile | null;
  revisionToken: LocalDataRevisionToken | null;
  status: AppStateStatus;
};

type PendingSnapshotPublication = {
  resolve: (accepted: boolean) => void;
  state: ResolvedAppState & {
    revisionToken: LocalDataRevisionToken;
    status: 'ready';
  };
};

type RefreshOptions = {
  invalidateRoute?: boolean;
};

/**
 * The outcome of resolving the active programme once at bootstrap
 * (Epic C / C5). A failure is kept, never replaced by a default programme.
 */
type ProgrammeResolution =
  | { readonly scope: ProgrammeScope }
  | { readonly error: unknown };

export type AppStateProviderProps = PropsWithChildren<{
  /** Supplied by the app composition root; called once per provider. */
  resolveProgramme: () => ProgrammeScope;
  /**
   * Supplied by the app composition root; called once per provider,
   * synchronously before the programme scope resolution returns, so the
   * shared database's migration context (Epic C / C6, binding control 2) is
   * bound before any effect can open it.
   */
  resolveMigrationContext: () => DatabaseMigrationContext;
}>;

function resolveProgrammeOnce(
  resolveProgramme: () => ProgrammeScope,
  resolveMigrationContext: () => DatabaseMigrationContext,
): ProgrammeResolution {
  try {
    const scope = resolveProgramme();

    // Binds (or re-confirms) the shared database's migration context before
    // any effect can reach it. Idempotent: a StrictMode double-invocation of
    // this initializer rebinds the same context, which is allowed.
    getSharedDatabase(resolveMigrationContext());

    return { scope };
  } catch (error) {
    return { error };
  }
}

const stableReadAttemptLimit = 3;
const unstableReadError =
  'Local data changed repeatedly while ProgressPal was reading it. No unverified snapshot was opened. Retry after other local activity finishes.';

function getResolvedTheme(preferredTheme: PreferredTheme) {
  if (preferredTheme !== 'system') {
    return preferredTheme;
  }

  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }

  return 'light';
}

function applyDocumentPreferences(profile: LearnerProfile | null) {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  const rootElement = document.documentElement;

  if (profile === null) {
    delete rootElement.dataset.motion;
    delete rootElement.dataset.theme;
    rootElement.style.colorScheme = 'light';

    return () => undefined;
  }

  const syncTheme = () => {
    const resolvedTheme = getResolvedTheme(profile.preferredTheme);

    rootElement.dataset.theme = resolvedTheme;
    rootElement.style.colorScheme = resolvedTheme;
  };

  syncTheme();

  if (profile.reducedMotion) {
    rootElement.dataset.motion = 'reduced';
  } else {
    delete rootElement.dataset.motion;
  }

  if (profile.preferredTheme !== 'system' || typeof window === 'undefined') {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    syncTheme();
  };

  mediaQuery.addEventListener('change', handleChange);

  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}

function describeBlockedStartup(error: LocalWriteBlockedError) {
  if (error.reason === 'peer-active') {
    return 'This local database still needs a startup repair. Close the other ProgressPal tab, then retry. ProgressPal stopped before the blocked repair step.';
  }

  if (error.reason === 'stale') {
    return 'This tab became stale before startup repair finished. Close other ProgressPal tabs, then retry. ProgressPal stopped before the blocked repair step.';
  }

  if (error.reason === 'unavailable') {
    return 'Safe local-tab coordination is unavailable in this browser context. ProgressPal will keep local writes blocked.';
  }

  return 'Local tab coordination is still checking whether a startup repair is safe. Retry when the check finishes.';
}

async function readApplicationStateAtRevision() {
  const revisionToken = captureLocalDataRevision();
  // A read must not create an absent database: a new writer can be stale even
  // before the first database exists. Prove absence without opening/upgrading it.
  if (
    !getSharedDatabase().isOpen() &&
    typeof indexedDB.databases === 'function' &&
    !(await indexedDB.databases()).some(
      (database) => database.name === getSharedDatabase().name,
    )
  ) {
    return { appMeta: null, profile: null, revisionToken };
  }
  const [appMeta, profile] = await Promise.all([getAppMeta(), getProfile()]);

  return { appMeta, profile, revisionToken };
}

function getCoordinationEventKey(status: LocalCoordinationStatus) {
  return [
    status.revision,
    status.phase,
    status.blockReason ?? 'writable',
    status.peerActive ? 'peer' : 'alone',
    status.stale ? 'stale' : 'current',
    status.writeOwnership,
  ].join(':');
}

function canAttemptAutomaticRefresh(status: LocalCoordinationStatus) {
  return (
    status.phase === 'ready' &&
    status.writeOwnership === 'owned' &&
    status.blockReason !== 'discovering' &&
    status.blockReason !== 'unavailable' &&
    status.blockReason !== 'write-active'
  );
}

function shouldAutomaticallyRefresh(
  previous: LocalCoordinationStatus,
  next: LocalCoordinationStatus,
  acceptedRevision: number | null,
) {
  if (!canAttemptAutomaticRefresh(next)) {
    return false;
  }

  const snapshotRevisionChanged =
    acceptedRevision !== null && next.revision !== acceptedRevision;
  const ownershipBecameUsable =
    previous.writeOwnership !== 'owned' && next.writeOwnership === 'owned';
  const coordinationBecameReady =
    previous.phase !== 'ready' && next.phase === 'ready';

  return (
    next.stale ||
    snapshotRevisionChanged ||
    ownershipBecameUsable ||
    coordinationBecameReady
  );
}

async function resolveStableApplicationState(
  acknowledgeRevision: (token: LocalDataRevisionToken) => boolean,
  validateRevision: (token: LocalDataRevisionToken) => boolean,
  programme: ProgrammeResolution,
): Promise<ResolvedAppState> {
  if (!isIndexedDbAvailable()) {
    return {
      appMeta: null,
      error: 'IndexedDB is unavailable in this browser context.',
      profile: null,
      revisionToken: null,
      status: 'error',
    };
  }

  try {
    if ('error' in programme) {
      throw programme.error;
    }

    for (let attempt = 0; attempt < stableReadAttemptLimit; attempt += 1) {
      if (getLocalCoordinationStatus().stale) {
        const staleRead = await readApplicationStateAtRevision();

        if (!acknowledgeRevision(staleRead.revisionToken)) {
          continue;
        }
      }

      await initializeDatabase({ seed: programme.scope.catalogue });
      const finalRead = await readApplicationStateAtRevision();

      if (!validateRevision(finalRead.revisionToken)) {
        continue;
      }

      return {
        appMeta: finalRead.appMeta,
        error: null,
        profile: finalRead.profile,
        revisionToken: finalRead.revisionToken,
        status: 'ready',
      };
    }

    return {
      appMeta: null,
      error: unstableReadError,
      profile: null,
      revisionToken: null,
      status: 'error',
    };
  } catch (loadError) {
    if (loadError instanceof LocalWriteBlockedError) {
      return {
        appMeta: null,
        error: describeBlockedStartup(loadError),
        profile: null,
        revisionToken: null,
        status: 'error',
      };
    }

    console.error('App state initialization failed.', loadError);

    return {
      appMeta: null,
      error: 'Local data could not be loaded.',
      profile: null,
      revisionToken: null,
      status: 'error',
    };
  }
}

export function AppStateProvider({
  children,
  resolveProgramme,
  resolveMigrationContext,
}: AppStateProviderProps) {
  const [programme] = useState(() =>
    resolveProgrammeOnce(resolveProgramme, resolveMigrationContext),
  );
  const initialCoordination = getLocalCoordinationStatus();
  const acceptedRevisionRef = useRef<number | null>(null);
  const acknowledgementInProgressRef = useRef(false);
  const autoRefreshEventKeyRef = useRef<string | null>(null);
  const coordinationRef = useRef(initialCoordination);
  const localMutationInProgressRef = useRef(0);
  const loadingCommitResolversRef = useRef<Array<() => void>>([]);
  const pendingSnapshotPublicationRef =
    useRef<PendingSnapshotPublication | null>(null);
  const pendingRouteInvalidationRef = useRef(false);
  const providerActiveRef = useRef(false);
  const refreshLoopRef = useRef<Promise<void> | null>(null);
  const refreshRequestVersionRef = useRef(0);
  const resolvedOnceRef = useRef(false);
  const [appMeta, setAppMeta] = useState<AppMeta | null>(null);
  const [coordination, setCoordination] =
    useState<LocalCoordinationStatus>(initialCoordination);
  const [dataEpoch, setDataEpoch] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingCommitVersion, setLoadingCommitVersion] = useState(0);
  const [persistenceStatus, setPersistenceStatus] =
    useState<StoragePersistenceStatus>('checking');
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [snapshotPublicationVersion, setSnapshotPublicationVersion] =
    useState(0);
  const [status, setStatus] = useState<AppStateStatus>('loading');

  const acknowledgeRevision = useCallback((token: LocalDataRevisionToken) => {
    acknowledgementInProgressRef.current = true;

    try {
      return markLocalDataSynchronized(token);
    } finally {
      acknowledgementInProgressRef.current = false;
    }
  }, []);

  const publishErrorState = useCallback((nextState: ResolvedAppState) => {
    if (!providerActiveRef.current) {
      return;
    }

    resolvedOnceRef.current = true;
    setAppMeta(nextState.appMeta);
    setError(nextState.error);
    setProfile(nextState.profile);
    setStatus(nextState.status);
  }, []);

  const enterCommittedLoadingState = useCallback(() => {
    if (!providerActiveRef.current) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      loadingCommitResolversRef.current.push(resolve);
      setStatus('loading');
      setLoadingCommitVersion((currentVersion) => currentVersion + 1);
    });
  }, []);

  const stageVerifiedSnapshot = useCallback(
    (nextState: ResolvedAppState, invalidateRoute: boolean) => {
      const revisionToken = nextState.revisionToken;

      if (
        !providerActiveRef.current ||
        nextState.status !== 'ready' ||
        revisionToken === null
      ) {
        return Promise.resolve(false);
      }

      return new Promise<boolean>((resolve) => {
        pendingSnapshotPublicationRef.current?.resolve(false);
        pendingSnapshotPublicationRef.current = {
          resolve,
          state: {
            ...nextState,
            revisionToken,
            status: 'ready',
          },
        };
        setAppMeta(nextState.appMeta);
        setError(null);
        setProfile(nextState.profile);

        if (invalidateRoute) {
          setDataEpoch((currentEpoch) => currentEpoch + 1);
        }

        setSnapshotPublicationVersion((currentVersion) => currentVersion + 1);
      });
    },
    [],
  );

  useLayoutEffect(() => {
    const resolvers = loadingCommitResolversRef.current.splice(0);

    for (const resolve of resolvers) {
      resolve();
    }
  }, [loadingCommitVersion]);

  useLayoutEffect(() => {
    const pendingPublication = pendingSnapshotPublicationRef.current;

    if (pendingPublication === null) {
      return;
    }

    pendingSnapshotPublicationRef.current = null;
    const accepted = acknowledgeRevision(
      pendingPublication.state.revisionToken,
    );

    if (accepted) {
      acceptedRevisionRef.current =
        pendingPublication.state.revisionToken.revision;
      resolvedOnceRef.current = true;
      setStatus('ready');
    }

    pendingPublication.resolve(accepted);
  }, [acknowledgeRevision, snapshotPublicationVersion]);

  const requestRefresh = useCallback(
    (options: RefreshOptions = {}) => {
      refreshRequestVersionRef.current += 1;

      if (options.invalidateRoute ?? true) {
        pendingRouteInvalidationRef.current = true;
      }

      if (refreshLoopRef.current !== null) {
        return refreshLoopRef.current;
      }

      const refreshLoop = (async () => {
        let handledRequestVersion: number;

        try {
          do {
            handledRequestVersion = refreshRequestVersionRef.current;
            const invalidateRoute = pendingRouteInvalidationRef.current;
            pendingRouteInvalidationRef.current = false;

            if (invalidateRoute) {
              await enterCommittedLoadingState();
            }

            let requestSettled = false;

            for (
              let publicationAttempt = 0;
              publicationAttempt < stableReadAttemptLimit;
              publicationAttempt += 1
            ) {
              const nextState = await resolveStableApplicationState(
                acknowledgeRevision,
                validateLocalDataRevision,
                programme,
              );

              if (!providerActiveRef.current) {
                return;
              }

              if (handledRequestVersion !== refreshRequestVersionRef.current) {
                break;
              }

              if (nextState.status === 'error') {
                publishErrorState(nextState);
                requestSettled = true;
                break;
              }

              if (await stageVerifiedSnapshot(nextState, invalidateRoute)) {
                requestSettled = true;
                break;
              }
            }

            if (
              !requestSettled &&
              handledRequestVersion === refreshRequestVersionRef.current &&
              providerActiveRef.current
            ) {
              publishErrorState({
                appMeta: null,
                error: unstableReadError,
                profile: null,
                revisionToken: null,
                status: 'error',
              });
            }
          } while (
            handledRequestVersion < refreshRequestVersionRef.current &&
            providerActiveRef.current
          );
        } finally {
          refreshLoopRef.current = null;
        }
      })();

      refreshLoopRef.current = refreshLoop;
      return refreshLoop;
    },
    [
      acknowledgeRevision,
      enterCommittedLoadingState,
      programme,
      publishErrorState,
      stageVerifiedSnapshot,
    ],
  );

  useEffect(() => {
    let sessionActive = true;
    const loadingCommitResolvers = loadingCommitResolversRef.current;
    providerActiveRef.current = true;
    const coordinationSession = startLocalDataCoordination((nextStatus) => {
      const previousStatus = coordinationRef.current;
      coordinationRef.current = nextStatus;

      if (!providerActiveRef.current) {
        return;
      }

      setCoordination(nextStatus);

      if (
        !resolvedOnceRef.current ||
        acknowledgementInProgressRef.current ||
        localMutationInProgressRef.current > 0 ||
        !shouldAutomaticallyRefresh(
          previousStatus,
          nextStatus,
          acceptedRevisionRef.current,
        )
      ) {
        return;
      }

      const eventKey = getCoordinationEventKey(nextStatus);

      if (autoRefreshEventKeyRef.current === eventKey) {
        return;
      }

      autoRefreshEventKeyRef.current = eventKey;
      void requestRefresh({ invalidateRoute: true });
    });

    void (async () => {
      try {
        await coordinationSession.ready;

        if (sessionActive && providerActiveRef.current) {
          await requestRefresh();
        }
      } catch {
        if (!sessionActive) {
          return;
        }
        publishErrorState({
          appMeta: null,
          error:
            'Safe local-tab coordination could not start. ProgressPal will keep local writes blocked.',
          profile: null,
          revisionToken: null,
          status: 'error',
        });
      }
    })();

    return () => {
      sessionActive = false;
      providerActiveRef.current = false;
      const loadingResolvers = loadingCommitResolvers.splice(0);
      for (const resolve of loadingResolvers) {
        resolve();
      }
      pendingSnapshotPublicationRef.current?.resolve(false);
      pendingSnapshotPublicationRef.current = null;
      coordinationSession.stop();
    };
  }, [publishErrorState, requestRefresh]);

  useEffect(() => {
    let isActive = true;

    void inspectStoragePersistence().then((nextStatus) => {
      if (isActive) {
        setPersistenceStatus(nextStatus);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => applyDocumentPreferences(profile), [profile]);

  async function requestPersistentStorageForState() {
    setPersistenceStatus('checking');
    const nextStatus = await requestStoragePersistence();
    setPersistenceStatus(nextStatus);
    return nextStatus;
  }

  const runLocalMutation = useCallback(
    async <Result,>(
      mutation: () => Promise<Result>,
      options: RefreshOptions = {},
    ) => {
      localMutationInProgressRef.current += 1;

      try {
        const result = await mutation();
        await requestRefresh({
          invalidateRoute: options.invalidateRoute ?? true,
        });
        return result;
      } finally {
        localMutationInProgressRef.current -= 1;
      }
    },
    [requestRefresh],
  );

  async function saveProfileToState(
    input: SaveLearnerProfileInput,
    options: { completeOnboarding?: boolean } = {},
  ) {
    return runLocalMutation(() => saveLearnerProfile(input, options), {
      invalidateRoute: false,
    });
  }

  const exposedCoordination =
    status === 'ready'
      ? coordination
      : {
          ...coordination,
          canWrite: false,
        };

  return (
    <AppStateContext.Provider
      value={{
        appMeta,
        coordination: exposedCoordination,
        dataEpoch,
        error,
        persistenceStatus,
        profile,
        programmeScope: 'scope' in programme ? programme.scope : null,
        refresh: requestRefresh,
        requestPersistentStorage: requestPersistentStorageForState,
        runLocalMutation,
        requiresOnboarding: !hasCompletedOnboarding(appMeta, profile),
        saveProfile: saveProfileToState,
        status,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}
