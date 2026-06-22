import {
  upsertProgressAndAwardXp,
  type UpsertProgressInput,
  type UpsertProgressWithXpResult,
} from '@/lib/db';

export type SaveRpgStudyResourceProgressInput = UpsertProgressInput;

export async function saveRpgStudyResourceProgress(
  input: SaveRpgStudyResourceProgressInput,
): Promise<UpsertProgressWithXpResult> {
  return upsertProgressAndAwardXp(input);
}
