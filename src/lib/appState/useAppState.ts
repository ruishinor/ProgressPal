import { useContext } from 'react';

import { AppStateContext } from '@/lib/appState/AppStateContext';

export function useAppState() {
  const context = useContext(AppStateContext);

  if (context === null) {
    throw new Error('useAppState must be used within AppStateProvider.');
  }

  return context;
}
