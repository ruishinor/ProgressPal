import { createContext } from 'react';

import type { useLearningSync } from './useLearningSync';

export const LearningSyncContext = createContext<ReturnType<
  typeof useLearningSync
> | null>(null);
