import type {
  ExternalResourceLink,
  ProgrammeExternalResources,
} from '@/lib/domain';
import { getDefaultProgrammeDefinition } from '@/programmes';

export type Cs50Link = ExternalResourceLink;

/**
 * Programme-explicit lookups (Epic C / C7). The external resource links are
 * owned by the programme definition and reach runtime code through the active
 * programme scope; runtime callers pass `scope.content.externalResources`
 * and never derive links from the registry.
 */
export function getProgrammeUnitLink(
  externalResources: ProgrammeExternalResources,
  unitId: string,
): ExternalResourceLink | null {
  return externalResources.unitLinks[unitId] ?? null;
}

export function getProgrammeItemLink(
  externalResources: ProgrammeExternalResources,
  itemId: string,
): ExternalResourceLink | null {
  return externalResources.itemLinks[itemId] ?? null;
}

/**
 * CS50-default compatibility entrypoints (Epic C / C2). They keep their names
 * and behaviour for the C1 preservation oracles and existing tests, which
 * look links up without a scope. Runtime code never calls them; it uses the
 * programme-explicit lookups above.
 */
export function getCs50UnitLink(unitId: string): Cs50Link | null {
  return getProgrammeUnitLink(
    getDefaultProgrammeDefinition().content.externalResources,
    unitId,
  );
}

export function getCs50ItemLink(itemId: string): Cs50Link | null {
  return getProgrammeItemLink(
    getDefaultProgrammeDefinition().content.externalResources,
    itemId,
  );
}
