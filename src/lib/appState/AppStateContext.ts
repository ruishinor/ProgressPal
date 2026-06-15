import { createContext } from 'react';

import type { SaveLearnerProfileInput } from '@/lib/db';
import type { AppMeta, LearnerProfile } from '@/lib/domain';

export type AppStateStatus = 'error' | 'loading' | 'ready';

export type AppStateContextValue = {
  appMeta: AppMeta | null;
  error: string | null;
  profile: LearnerProfile | null;
  refresh: () => Promise<void>;
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
