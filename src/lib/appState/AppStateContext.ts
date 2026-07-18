import { createContext } from 'react';

import type { SaveLearnerProfileInput } from '@/lib/db';
import type { AppMeta, LearnerProfile } from '@/lib/domain';
import type {
  LocalCoordinationStatus,
  StoragePersistenceStatus,
} from '@/lib/storage';

export type AppStateStatus = 'error' | 'loading' | 'ready';

export type AppStateContextValue = {
  appMeta: AppMeta | null;
  coordination: LocalCoordinationStatus;
  dataEpoch: number;
  error: string | null;
  persistenceStatus: StoragePersistenceStatus;
  profile: LearnerProfile | null;
  refresh: () => Promise<void>;
  requestPersistentStorage: () => Promise<StoragePersistenceStatus>;
  runLocalMutation: <Result>(
    mutation: () => Promise<Result>,
    options?: { invalidateRoute?: boolean },
  ) => Promise<Result>;
  requiresOnboarding: boolean;
  saveProfile: (
    input: SaveLearnerProfileInput,
    options?: { completeOnboarding?: boolean },
  ) => Promise<{
    appMeta: AppMeta;
    learnerProfile: LearnerProfile;
  }>;
  status: AppStateStatus;
};

export const AppStateContext = createContext<AppStateContextValue | null>(null);
