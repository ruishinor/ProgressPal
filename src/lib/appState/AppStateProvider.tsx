import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  enrolAndSwitchActiveProgramme,
  getAppMeta,
  getProfile,
  initializeDatabase,
  isIndexedDbAvailable,
  listAuthorizedProgrammeIds,
  listProgrammeEnrolments,
  saveLearnerProfile,
  switchActiveProgramme,
  type DatabaseMigrationContext,
  type SaveLearnerProfileInput,
} from '@/lib/db';
import { getSharedDatabase } from '@/lib/db/database';
import {
  AppStateContext,
  type AppStateStatus,
  type ProgrammeChoice,
} from '@/lib/appState/AppStateContext';
import type {
  AppMeta,
  LearnerProfile,
  PreferredTheme,
  ProgrammeScope,
} from '@/lib/domain';
import { hasCompletedOnboarding } from '@/lib/profile';
import {
  deriveRewardEvents,
  isRewardMutationResult,
  useRewardAnnouncer,
} from '@/lib/rewards';
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
  enrolledProgrammeIds: readonly string[];
  error: string | null;
  profile: LearnerProfile | null;
  /** The scope resolved from the persisted active programme; null on error. */
  programmeScope: ProgrammeScope | null;
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
 * The outcome of composing the programme boundary once per provider (Epic C /
 * C5, C7): the bound authorization context's default/bootstrap scope (used
 * for the loading shell before the persisted active programme is known) and
 * every registered programme's identity. A failure is kept, never replaced by
 * a default programme.
 */
type ProgrammeBootstrap =
  | {
      readonly defaultScope: ProgrammeScope;
      readonly registered: ReadonlyArray<{
        readonly programmeId: string;
        readonly title: string;
      }>;
    }
  | { readonly error: unknown };

export type AppStateProviderProps = PropsWithChildren<{
  /**
   * Supplied by the app composition root: resolves a persisted programme ID to
   * its runtime scope (identity, catalogue, policy and content). It fails
   * closed for an unregistered ID and must return a scope for exactly the ID
   * requested. Called with the persisted `app_meta.activeProgrammeId` on every
   * stable resolution (Epic C / C7); never with a guessed programme.
   */
  resolveProgramme: (programmeId: string) => ProgrammeScope;
  /**
   * Supplied by the app composition root; called once per provider,
   * synchronously before the programme composition returns, so the shared
   * database's migration context (Epic C / C6, binding control 2) is bound
   * before any effect can open it. It authorizes every registered programme.
   */
  resolveMigrationContext: () => DatabaseMigrationContext;
}>;

function requireScopeFor(scope: ProgrammeScope, programmeId: string) {
  if (scope.programmeId !== programmeId) {
    throw new Error(
      `Resolved programme scope "${scope.programmeId}" does not match the requested programme "${programmeId}".`,
    );
  }

  return scope;
}

function bootstrapProgrammes(
  resolveProgramme: (programmeId: string) => ProgrammeScope,
  resolveMigrationContext: () => DatabaseMigrationContext,
): ProgrammeBootstrap {
  try {
    const context = resolveMigrationContext();
    const defaultScope = requireScopeFor(
      resolveProgramme(context.programmeId),
      context.programmeId,
    );

    // Binds (or re-confirms) the shared database's migration context before
    // any effect can reach it, after the default programme resolved (as in
    // C5/C6: a failed resolution never binds). Idempotent: a StrictMode
    // double-invocation of this initializer rebinds the same context.
    getSharedDatabase(context);

    return {
      defaultScope,
      registered: listAuthorizedProgrammeIds(context).map((programmeId) => ({
        programmeId,
        title: requireScopeFor(
          programmeId === defaultScope.programmeId
            ? defaultScope
            : resolveProgramme(programmeId),
          programmeId,
        ).title,
      })),
    };
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
    return {
      appMeta: null,
      enrolledProgrammeIds: [] as readonly string[],
      profile: null,
      revisionToken,
    };
  }
  const [appMeta, profile, enrolments] = await Promise.all([
    getAppMeta(),
    getProfile(),
    listProgrammeEnrolments(),
  ]);

  return {
    appMeta,
    enrolledProgrammeIds: enrolments.map((enrolment) => enrolment.programmeId),
    profile,
    revisionToken,
  };
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

function errorState(error: string): ResolvedAppState {
  return {
    appMeta: null,
    enrolledProgrammeIds: [],
    error,
    profile: null,
    programmeScope: null,
    revisionToken: null,
    status: 'error',
  };
}

async function resolveStableApplicationState(
  acknowledgeRevision: (token: LocalDataRevisionToken) => boolean,
  validateRevision: (token: LocalDataRevisionToken) => boolean,
  programme: ProgrammeBootstrap,
  resolveProgramme: (programmeId: string) => ProgrammeScope,
): Promise<ResolvedAppState> {
  if (!isIndexedDbAvailable()) {
    return errorState('IndexedDB is unavailable in this browser context.');
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

      // One logical write scope per attempt (as before C7): validate the base
      // state (an existing database's active programme must be authorized and
      // enrolled, or this throws), take the persisted active programme,
      // resolve it through the composition boundary (unknown fails closed),
      // and materialize that programme's catalogue.
      let resolvedScope: ProgrammeScope | null = null;

      await initializeDatabase({
        seedForActiveProgramme: (activeProgrammeId) => {
          resolvedScope = requireScopeFor(
            resolveProgramme(activeProgrammeId),
            activeProgrammeId,
          );

          return resolvedScope.catalogue;
        },
      });

      if (resolvedScope === null) {
        throw new Error('The active programme scope was not resolved.');
      }

      const scope: ProgrammeScope = resolvedScope;
      const finalRead = await readApplicationStateAtRevision();

      // Another tab switched programmes between the reads above: resolve again.
      if (finalRead.appMeta?.activeProgrammeId !== scope.programmeId) {
        continue;
      }

      if (!validateRevision(finalRead.revisionToken)) {
        continue;
      }

      // 5. Publish the scope as part of the stable snapshot.
      return {
        appMeta: finalRead.appMeta,
        enrolledProgrammeIds: finalRead.enrolledProgrammeIds,
        error: null,
        profile: finalRead.profile,
        programmeScope: scope,
        revisionToken: finalRead.revisionToken,
        status: 'ready',
      };
    }

    return errorState(unstableReadError);
  } catch (loadError) {
    if (loadError instanceof LocalWriteBlockedError) {
      return errorState(describeBlockedStartup(loadError));
    }

    console.error('App state initialization failed.', loadError);

    return errorState('Local data could not be loaded.');
  }
}

export function AppStateProvider({
  children,
  resolveProgramme: suppliedResolveProgramme,
  resolveMigrationContext,
}: AppStateProviderProps) {
  // The composition root supplies one stable resolver for the provider's
  // lifetime; capturing it keeps the refresh loop's identity stable.
  const [resolveProgramme] = useState(() => suppliedResolveProgramme);
  const [programme] = useState(() =>
    bootstrapProgrammes(resolveProgramme, resolveMigrationContext),
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
  const [enrolledProgrammeIds, setEnrolledProgrammeIds] = useState<
    readonly string[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingCommitVersion, setLoadingCommitVersion] = useState(0);
  const [persistenceStatus, setPersistenceStatus] =
    useState<StoragePersistenceStatus>('checking');
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  // Until the first stable resolution completes, the scope is the bound
  // context's default/bootstrap programme (only the loading shell renders
  // then). Each stable snapshot replaces it with the persisted active one.
  const [programmeScope, setProgrammeScope] = useState<ProgrammeScope | null>(
    'error' in programme ? null : programme.defaultScope,
  );
  const publishedProgrammeIdRef = useRef<string | null>(
    'error' in programme ? null : programme.defaultScope.programmeId,
  );
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
        setEnrolledProgrammeIds((current) =>
          current.length === nextState.enrolledProgrammeIds.length &&
          current.every(
            (programmeId, index) =>
              programmeId === nextState.enrolledProgrammeIds[index],
          )
            ? current
            : nextState.enrolledProgrammeIds,
        );

        // The scope publishes atomically with the rest of the snapshot. A
        // changed active programme always invalidates the route subtree, so
        // no mounted page keeps one programme's data under another's scope.
        const nextProgrammeScope = nextState.programmeScope;
        const programmeChanged =
          nextProgrammeScope !== null &&
          nextProgrammeScope.programmeId !== publishedProgrammeIdRef.current;

        if (nextProgrammeScope !== null) {
          publishedProgrammeIdRef.current = nextProgrammeScope.programmeId;
          setProgrammeScope((current) =>
            current !== null &&
            current.programmeId === nextProgrammeScope.programmeId &&
            current.catalogue === nextProgrammeScope.catalogue &&
            current.policy === nextProgrammeScope.policy &&
            current.content === nextProgrammeScope.content
              ? current
              : nextProgrammeScope,
          );
        }

        if (invalidateRoute || programmeChanged) {
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
                resolveProgramme,
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
              publishErrorState(errorState(unstableReadError));
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
      resolveProgramme,
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
        publishErrorState(
          errorState(
            'Safe local-tab coordination could not start. ProgressPal will keep local writes blocked.',
          ),
        );
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

  const announceRewards = useRewardAnnouncer();

  const runLocalMutation = useCallback(
    async <Result,>(
      mutation: () => Promise<Result>,
      options: RefreshOptions = {},
    ) => {
      // The definitions the caller's mutation evaluated: the scope published
      // with the render that handed the caller this function.
      const achievementDefinitions = programmeScope?.policy.achievements ?? [];
      localMutationInProgressRef.current += 1;

      try {
        const result = await mutation();

        // A committed award mutation reports exactly the rewards it created;
        // announcing here, once per call, is the only path into the reward
        // notification queue (never a read, refresh or route change).
        if (
          announceRewards !== null &&
          providerActiveRef.current &&
          isRewardMutationResult(result)
        ) {
          announceRewards(deriveRewardEvents(result, achievementDefinitions));
        }

        await requestRefresh({
          invalidateRoute: options.invalidateRoute ?? true,
        });
        return result;
      } finally {
        localMutationInProgressRef.current -= 1;
      }
    },
    [announceRewards, programmeScope, requestRefresh],
  );

  async function switchProgrammeInState(
    programmeId: string,
    mode: 'enrol-and-switch' | 'switch',
  ) {
    // Resolving the target first fails closed for an unregistered programme
    // before anything is written.
    const target = requireScopeFor(resolveProgramme(programmeId), programmeId);
    const switchProgramme =
      mode === 'switch' ? switchActiveProgramme : enrolAndSwitchActiveProgramme;

    await runLocalMutation(
      () => switchProgramme(programmeId, { seed: target.catalogue }),
      { invalidateRoute: true },
    );
  }

  async function saveProfileToState(
    input: SaveLearnerProfileInput,
    options: { completeOnboarding?: boolean } = {},
  ) {
    return runLocalMutation(() => saveLearnerProfile(input, options), {
      invalidateRoute: false,
    });
  }

  const programmeChoices: readonly ProgrammeChoice[] =
    'error' in programme
      ? []
      : programme.registered.map((registered) => ({
          active: programmeScope?.programmeId === registered.programmeId,
          enrolled: enrolledProgrammeIds.includes(registered.programmeId),
          programmeId: registered.programmeId,
          title: registered.title,
        }));

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
        enrolAndSwitchProgramme: (programmeId) =>
          switchProgrammeInState(programmeId, 'enrol-and-switch'),
        error,
        persistenceStatus,
        profile,
        programmeChoices,
        programmeScope,
        refresh: requestRefresh,
        requestPersistentStorage: requestPersistentStorageForState,
        runLocalMutation,
        requiresOnboarding: !hasCompletedOnboarding(appMeta, profile),
        saveProfile: saveProfileToState,
        status,
        switchProgramme: (programmeId) =>
          switchProgrammeInState(programmeId, 'switch'),
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}
