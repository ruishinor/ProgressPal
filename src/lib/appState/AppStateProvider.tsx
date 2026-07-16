import {
  startTransition,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  getAppMeta,
  getProfile,
  initializeDatabase,
  isIndexedDbAvailable,
  saveLearnerProfile,
  type SaveLearnerProfileInput,
} from '@/lib/db';
import {
  AppStateContext,
  type AppStateStatus,
} from '@/lib/appState/AppStateContext';
import type { AppMeta, LearnerProfile, PreferredTheme } from '@/lib/domain';
import { hasCompletedOnboarding } from '@/lib/profile';
import { bundledCourseSeed } from '@/seed';
import {
  getLocalCoordinationStatus,
  inspectStoragePersistence,
  markLocalDataSynchronized,
  requestStoragePersistence,
  startLocalDataCoordination,
  type StoragePersistenceStatus,
} from '@/lib/storage';

type ResolvedAppState = {
  appMeta: AppMeta | null;
  error: string | null;
  profile: LearnerProfile | null;
  status: AppStateStatus;
};

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

export function AppStateProvider({ children }: PropsWithChildren) {
  const [appMeta, setAppMeta] = useState<AppMeta | null>(null);
  const [coordination, setCoordination] = useState(getLocalCoordinationStatus);
  const [error, setError] = useState<string | null>(null);
  const [persistenceStatus, setPersistenceStatus] =
    useState<StoragePersistenceStatus>('checking');
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [status, setStatus] = useState<AppStateStatus>('loading');

  async function resolveApplicationState(): Promise<ResolvedAppState> {
    if (!isIndexedDbAvailable()) {
      return {
        appMeta: null,
        error: 'IndexedDB is unavailable in this browser context.',
        profile: null,
        status: 'error',
      };
    }

    try {
      await initializeDatabase({ seed: bundledCourseSeed });

      const [nextAppMeta, nextProfile] = await Promise.all([
        getAppMeta(),
        getProfile(),
      ]);

      return {
        appMeta: nextAppMeta,
        error: null,
        profile: nextProfile,
        status: 'ready',
      };
    } catch (loadError) {
      console.error('App state initialization failed.', loadError);

      return {
        appMeta: null,
        error: 'Local data could not be loaded.',
        profile: null,
        status: 'error',
      };
    }
  }

  useEffect(() => {
    let isActive = true;
    const coordinationSession = startLocalDataCoordination((nextStatus) => {
      if (isActive) {
        setCoordination(nextStatus);
      }
    });

    void (async () => {
      await coordinationSession.ready;
      const nextState = await resolveApplicationState();

      if (!isActive) {
        return;
      }

      startTransition(() => {
        setAppMeta(nextState.appMeta);
        setError(nextState.error);
        setProfile(nextState.profile);
        setStatus(nextState.status);
      });
    })();

    return () => {
      isActive = false;
      coordinationSession.stop();
    };
  }, []);

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

  async function refresh() {
    startTransition(() => {
      setStatus('loading');
    });

    const nextState = await resolveApplicationState();

    if (nextState.status === 'ready') {
      markLocalDataSynchronized();
    }

    startTransition(() => {
      setAppMeta(nextState.appMeta);
      setError(nextState.error);
      setProfile(nextState.profile);
      setStatus(nextState.status);
    });
  }

  async function requestPersistentStorageForState() {
    setPersistenceStatus('checking');
    const nextStatus = await requestStoragePersistence();
    setPersistenceStatus(nextStatus);
    return nextStatus;
  }

  async function saveProfileToState(
    input: SaveLearnerProfileInput,
    options: { completeOnboarding?: boolean } = {},
  ) {
    const result = await saveLearnerProfile(input, options);

    startTransition(() => {
      setAppMeta(result.appMeta);
      setError(null);
      setProfile(result.learnerProfile);
      setStatus('ready');
    });

    return result;
  }

  return (
    <AppStateContext.Provider
      value={{
        appMeta,
        coordination,
        error,
        persistenceStatus,
        profile,
        refresh,
        requestPersistentStorage: requestPersistentStorageForState,
        requiresOnboarding: !hasCompletedOnboarding(appMeta, profile),
        saveProfile: saveProfileToState,
        status,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}
