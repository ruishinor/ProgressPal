import {
  addStudySessionAndAwardXp,
  type AddStudySessionInput,
  type AddStudySessionWithXpResult,
} from '@/lib/db';

export type SaveRpgFocusSessionInput = AddStudySessionInput;

export async function saveRpgFocusSession(
  input: SaveRpgFocusSessionInput,
): Promise<AddStudySessionWithXpResult> {
  return addStudySessionAndAwardXp(input);
}
