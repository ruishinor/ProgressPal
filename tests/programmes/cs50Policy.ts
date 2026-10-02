import type { DatabaseMigrationContext } from '@/lib/db';
import type { ProgrammeScope } from '@/lib/domain';
import { getDefaultProgrammeDefinition } from '@/programmes';

/**
 * The registered CS50 programme policy, passed explicitly to shared engines
 * and repositories exactly as the production composition boundary does
 * (Epic C / C3).
 */
const cs50 = getDefaultProgrammeDefinition();
export const cs50Policy = cs50.policy;

/** The CS50 catalogue identity passed to catalogue-scoped reads (Epic C / C5). */
export const cs50CatalogueId = cs50.catalogueId;

/**
 * The CS50 programme scope, as the app composition root resolves it for
 * the persisted CS50 programme (Epic C / C5, C7).
 */
export const cs50Scope: ProgrammeScope = {
  catalogue: cs50.catalogue,
  catalogueId: cs50CatalogueId,
  content: cs50.content,
  policy: cs50Policy,
  programmeId: cs50.programmeId,
  title: cs50.title,
};

/** The composed, ordered CS50 achievement catalogue (16 definitions). */
export const cs50AchievementDefinitions = cs50Policy.achievements;

/** The CS50 programme's stable persisted identity (Epic C / C6, OD-5). */
export const cs50ProgrammeId = cs50.programmeId;

/**
 * The database migration context of a CS50-only composition (Epic C / C6,
 * binding control 2). Since Epic E the production root authorizes every
 * registered programme; see `defaultTestMigrationContext`.
 */
export const cs50MigrationContext: DatabaseMigrationContext = {
  programmeId: cs50ProgrammeId,
  authorizedCatalogues: [
    { courseId: cs50CatalogueId, programmeId: cs50ProgrammeId },
  ],
};
