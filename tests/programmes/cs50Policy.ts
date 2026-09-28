import type { DatabaseMigrationContext } from '@/lib/db';
import type { ProgrammeScope } from '@/lib/domain';
import { getActiveProgrammeDefinition } from '@/programmes';

/**
 * The registered CS50 programme policy, passed explicitly to shared engines
 * and repositories exactly as the production composition boundary does
 * (Epic C / C3).
 */
export const cs50Policy = getActiveProgrammeDefinition().policy;

/** The CS50 catalogue identity passed to catalogue-scoped reads (Epic C / C5). */
export const cs50CatalogueId = getActiveProgrammeDefinition().catalogueId;

/**
 * The CS50 programme scope, as the app composition root resolves it at
 * bootstrap (Epic C / C5).
 */
export const cs50Scope: ProgrammeScope = {
  catalogue: getActiveProgrammeDefinition().catalogue,
  catalogueId: cs50CatalogueId,
  policy: cs50Policy,
};

/** The composed, ordered CS50 achievement catalogue (16 definitions). */
export const cs50AchievementDefinitions = cs50Policy.achievements;

/** The CS50 programme's stable persisted identity (Epic C / C6, OD-5). */
export const cs50ProgrammeId = getActiveProgrammeDefinition().programmeId;

/**
 * The CS50 database migration context, as the app composition root derives
 * it at bootstrap (Epic C / C6, binding control 2).
 */
export const cs50MigrationContext: DatabaseMigrationContext = {
  programmeId: cs50ProgrammeId,
  authorizedCatalogues: [
    { courseId: cs50CatalogueId, programmeId: cs50ProgrammeId },
  ],
};
