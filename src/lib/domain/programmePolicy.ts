import { z } from 'zod';

import { courseUnitTypeValues } from '@/lib/domain/constants';
import type { CourseSeed } from '@/lib/domain/types';

/**
 * Programme policy contracts (Epic C / C3). These are neutral shapes only: the
 * values belong to a programme definition (`src/programmes/**`), and shared
 * engines receive them as parameters. Nothing here is persisted.
 */

export const CatalogueRulesSchema = z
  .object({
    /** Unit types a programme's catalogue must contain at least once. */
    requiredUnitTypes: z.array(z.enum(courseUnitTypeValues)),
  })
  .strict();

export type CatalogueRules = z.infer<typeof CatalogueRulesSchema>;

/** Returns one issue per catalogue rule the seed violates. */
export function findCatalogueRuleIssues(
  seed: CourseSeed,
  rules: CatalogueRules,
): string[] {
  return rules.requiredUnitTypes
    .filter((unitType) => !seed.units.some((unit) => unit.type === unitType))
    .map((unitType) => `catalogue must contain a ${unitType} unit`);
}

export type ProgrammePolicy = {
  readonly catalogueRules: CatalogueRules;
};
