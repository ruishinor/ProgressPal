import { StudySessionsSurface } from '@/features/sessions';

// /rpg/focus wraps the classic study-session/focus surface in the RPG shell.
// The flow, controls, timer behavior, and engine writes are the classic ones;
// only the surrounding RPG header and shell styling differ. See the Phase 2C
// wrapper contract: "color it and leave it".
export function RpgFocusPage() {
  return <StudySessionsSurface variant="rpg" />;
}
