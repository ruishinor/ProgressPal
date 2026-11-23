import type { DatabaseMigrationContext } from '@/lib/db';
import type { ProgrammeScope } from '@/lib/domain';
import { gitGithubDefinition } from '@/programmes/git-github';

// This entry deliberately does not depend on the production programme registry.
// The pilot build must not import CS50 or Programvareutvikling catalogues.
const definition = gitGithubDefinition;

const scope: ProgrammeScope = {
  programmeId: definition.programmeId,
  catalogueId: definition.catalogueId,
  title: definition.title,
  catalogue: definition.catalogue,
  policy: definition.policy,
  content: definition.content,
};

export function resolveProgrammeScope(programmeId: string): ProgrammeScope {
  if (programmeId !== definition.programmeId) {
    throw new Error('Programme unavailable in the Pathways pilot.');
  }
  return scope;
}

export function resolveDatabaseMigrationContext(): DatabaseMigrationContext {
  return {
    programmeId: definition.programmeId,
    authorizedCatalogues: [
      {
        courseId: definition.catalogue.courseId,
        programmeId: definition.programmeId,
      },
    ],
  };
}
