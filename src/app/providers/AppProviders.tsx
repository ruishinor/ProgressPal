import type { PropsWithChildren } from 'react';

import { AppStateProvider } from '@/lib/appState';

export function AppProviders({ children }: PropsWithChildren) {
  return <AppStateProvider>{children}</AppStateProvider>;
}
