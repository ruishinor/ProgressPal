import {
  getActiveProgrammeDefinition,
  type ItemGuide,
  type UnitGuide,
} from '@/programmes';

/**
 * Compatibility entrypoint (Epic C / C2). The CS50 study guides are owned by
 * the `cs50x-2026` programme definition; these lookups keep their names and
 * behaviour so existing consumers do not churn. Missing guides resolve to
 * `null`.
 */

export type { ItemGuide, UnitGuide };

function studyGuides() {
  return getActiveProgrammeDefinition().content.studyGuides;
}

export function getUnitGuide(unitId: string): UnitGuide | null {
  return studyGuides().unitGuides[unitId] ?? null;
}

export function getItemGuide(itemId: string): ItemGuide | null {
  return studyGuides().itemGuides[itemId] ?? null;
}
