import type { PropsWithChildren } from 'react';

import { AppStateProvider } from '@/lib/appState';

import {
  resolveDatabaseMigrationContext,
  resolveProgrammeScope,
} from './programmeComposition';

/**
 * The composition root hands app state two stable resolvers (Epic C / C7): one
 * that authorizes every registered programme for the database, and one that
 * resolves a persisted programme ID to its runtime scope. App state derives
 * the active scope from persisted state on every stable resolution. An
 * unresolvable programme becomes the existing bootstrap error state.
 */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppStateProvider
      resolveProgramme={resolveProgrammeScope}
      resolveMigrationContext={resolveDatabaseMigrationContext}
    >
      {children}
    </AppStateProvider>
  );
}
