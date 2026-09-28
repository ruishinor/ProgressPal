import type { PropsWithChildren } from 'react';

import { AppStateProvider } from '@/lib/appState';
import type { DatabaseMigrationContext } from '@/lib/db';
import type { ProgrammeScope } from '@/lib/domain';
import { getActiveProgrammeDefinition } from '@/programmes';

/**
 * The composition root resolves the active programme once at bootstrap
 * (Epic C / C5) and hands its neutral runtime scope to app state. An
 * unresolvable programme becomes the existing bootstrap error state.
 */
function resolveActiveProgramme(): ProgrammeScope {
  const { catalogue, catalogueId, policy } = getActiveProgrammeDefinition();

  return { catalogue, catalogueId, policy };
}

/**
 * The neutral database migration/authorization context (Epic C / C6): the
 * active definition's stable programme identity and its one authorized
 * catalogue. Plain data derived from the registry at the composition root;
 * `src/lib` never imports `@/programmes`.
 */
function resolveDatabaseMigrationContext(): DatabaseMigrationContext {
  const { catalogueId, programmeId } = getActiveProgrammeDefinition();

  return {
    programmeId,
    authorizedCatalogues: [{ courseId: catalogueId, programmeId }],
  };
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppStateProvider
      resolveProgramme={resolveActiveProgramme}
      resolveMigrationContext={resolveDatabaseMigrationContext}
    >
      {children}
    </AppStateProvider>
  );
}
