import {
  upsertProgressAndAwardXp,
  type UpsertProgressInput,
  type UpsertProgressWithXpResult,
} from '@/lib/db';
import { getActiveProgrammeDefinition } from '@/programmes';

export type SaveRpgStudyResourceProgressInput = UpsertProgressInput;

export async function saveRpgStudyResourceProgress(
  input: SaveRpgStudyResourceProgressInput,
): Promise<UpsertProgressWithXpResult> {
  const { catalogueId, policy } = getActiveProgrammeDefinition();

  return upsertProgressAndAwardXp(input, { catalogueId, policy });
}
