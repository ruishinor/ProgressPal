import { createContext } from 'react';

/** Explicit presentation opt-in; absent for every Mikroøkt consumer. */
export const UtviklerblikkContext = createContext<{
  onActivities: () => void;
} | null>(null);
