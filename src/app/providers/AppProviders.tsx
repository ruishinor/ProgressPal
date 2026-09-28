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
 *
 * Authorizes the catalogue's own identity (`catalogue.courseId`), not the
 * definition's `catalogueId` field: `catalogueId` is C5's read-scoping key
 * and, for every registered (validated) definition, is always equal to
 * `catalogue.courseId` (§4b of the definition contract). Using the
 * catalogue's own identity here authorizes exactly what catalogue sync
 * actually writes.
 */
function resolveDatabaseMigrationContext(): DatabaseMigrationContext {
  const { catalogue, programmeId } = getActiveProgrammeDefinition();

  return {
    programmeId,
    authorizedCatalogues: [{ courseId: catalogue.courseId, programmeId }],
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
