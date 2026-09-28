import {
  upsertProgressAndAwardXp,
  type UpsertProgressInput,
  type UpsertProgressWithXpResult,
} from '@/lib/db';
import type { ProgrammeScope } from '@/lib/domain';

export type SaveRpgStudyResourceProgressInput = UpsertProgressInput;

export async function saveRpgStudyResourceProgress(
  scope: ProgrammeScope,
  input: SaveRpgStudyResourceProgressInput,
): Promise<UpsertProgressWithXpResult> {
  return upsertProgressAndAwardXp(input, {
    catalogueId: scope.catalogueId,
    policy: scope.policy,
  });
}
