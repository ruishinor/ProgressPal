import {
  getActiveProgrammeDefinition,
  type ExternalResourceLink,
} from '@/programmes';

/**
 * Compatibility entrypoint (Epic C / C2). The CS50 link maps are owned by the
 * `cs50x-2026` programme definition; these lookups keep their names and
 * behaviour so existing consumers do not churn.
 */

export type Cs50Link = ExternalResourceLink;

function externalResources() {
  return getActiveProgrammeDefinition().content.externalResources;
}

export function getCs50UnitLink(unitId: string): Cs50Link | null {
  return externalResources().unitLinks[unitId] ?? null;
}

export function getCs50ItemLink(itemId: string): Cs50Link | null {
  return externalResources().itemLinks[itemId] ?? null;
}
