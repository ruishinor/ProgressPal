import type { ItemGuide, ProgrammeStudyGuides, UnitGuide } from '@/lib/domain';
import { getDefaultProgrammeDefinition } from '@/programmes';

export type { ItemGuide, UnitGuide };

/**
 * Programme-explicit lookups (Epic C / C7). Study guides are owned by the
 * programme definition and reach runtime code through the active programme
 * scope; runtime callers pass `scope.content.studyGuides`. Missing guides
 * resolve to `null`.
 */
export function getProgrammeUnitGuide(
  studyGuides: ProgrammeStudyGuides,
  unitId: string,
): UnitGuide | null {
  return studyGuides.unitGuides[unitId] ?? null;
}

export function getProgrammeItemGuide(
  studyGuides: ProgrammeStudyGuides,
  itemId: string,
): ItemGuide | null {
  return studyGuides.itemGuides[itemId] ?? null;
}

/**
 * CS50-default compatibility entrypoints (Epic C / C2). They keep their names
 * and behaviour for the C1 preservation oracles and existing tests, which
 * look guides up without a scope. Runtime code never calls them; it uses the
 * programme-explicit lookups above.
 */
export function getUnitGuide(unitId: string): UnitGuide | null {
  return getProgrammeUnitGuide(
    getDefaultProgrammeDefinition().content.studyGuides,
    unitId,
  );
}

export function getItemGuide(itemId: string): ItemGuide | null {
  return getProgrammeItemGuide(
    getDefaultProgrammeDefinition().content.studyGuides,
    itemId,
  );
}
