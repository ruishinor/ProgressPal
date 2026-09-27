import { getActiveProgrammeDefinition } from '@/programmes';

/**
 * The registered CS50 programme policy, passed explicitly to shared engines
 * and repositories exactly as the production composition boundary does
 * (Epic C / C3).
 */
export const cs50Policy = getActiveProgrammeDefinition().policy;

/** The CS50 catalogue identity passed to catalogue-scoped reads (Epic C / C5). */
export const cs50CatalogueId = getActiveProgrammeDefinition().catalogueId;

/** The composed, ordered CS50 achievement catalogue (16 definitions). */
export const cs50AchievementDefinitions = cs50Policy.achievements;
