import type { CatalogueRules } from '@/lib/domain';

/**
 * CS50x core policy (Epic C / C3; C0 contract §4b). Shared engines receive
 * these values as parameters; they hold no CS50 policy of their own.
 */

/** The CS50 catalogue must contain a final project unit. */
export const cs50CatalogueRules: CatalogueRules = {
  requiredUnitTypes: ['final_project'],
};
