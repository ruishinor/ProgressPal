import type { DatabaseMigrationContext } from '@/lib/db';
import type { ProgrammeScope } from '@/lib/domain';
import { getProgrammeRegistry, type ProgrammeDefinition } from '@/programmes';

/**
 * The application composition root's programme boundary (Epic C / C7). It is
 * the only runtime code that reads the programme registry. Everything else
 * receives programme identity, catalogue, policy and content through the
 * runtime `ProgrammeScope` that app state derives from the persisted
 * `app_meta.activeProgrammeId`; there is no static "active definition".
 */

const scopesByDefinition = new WeakMap<ProgrammeDefinition, ProgrammeScope>();

function scopeOf(definition: ProgrammeDefinition): ProgrammeScope {
  let scope = scopesByDefinition.get(definition);

  if (scope === undefined) {
    scope = {
      catalogue: definition.catalogue,
      catalogueId: definition.catalogueId,
      content: definition.content,
      policy: definition.policy,
      programmeId: definition.programmeId,
      title: definition.title,
    };
    scopesByDefinition.set(definition, scope);
  }

  return scope;
}

/**
 * Resolves a persisted programme ID to its runtime scope through the
 * validated registry. An unregistered ID fails closed. The scope object is
 * stable per definition, so consumers keyed on it do not reload spuriously.
 */
export function resolveProgrammeScope(programmeId: string): ProgrammeScope {
  return scopeOf(getProgrammeRegistry().getByProgrammeId(programmeId));
}

/**
 * The neutral database migration/authorization context (Epic C / C6, C7):
 * the registry's default programme as the bootstrap/legacy-migration
 * programme, and every registered definition's catalogue/programme pair as
 * an authorized catalogue, in registry order (deterministic, so repeated
 * composition yields an equivalent context). Plain data; `src/lib` never
 * imports `@/programmes`.
 *
 * Authorizes each catalogue's own identity (`catalogue.courseId`), not the
 * definition's `catalogueId` field: `catalogueId` is the read-scoping key and,
 * for every validated definition, equals `catalogue.courseId` (§4b of the
 * definition contract). Using the catalogue's own identity authorizes exactly
 * what catalogue sync actually writes.
 */
export function resolveDatabaseMigrationContext(): DatabaseMigrationContext {
  const registry = getProgrammeRegistry();

  return {
    programmeId: registry.getDefault().programmeId,
    authorizedCatalogues: registry.definitions.map((definition) => ({
      courseId: definition.catalogue.courseId,
      programmeId: definition.programmeId,
    })),
  };
}
