import { AchievementsSurface } from '@/features/achievements';

// /rpg/badges ("Awards" in the bottom nav) wraps the classic achievements
// surface in the RPG shell. Achievements are the product concept; the RPG badge
// is only the visual artifact. The definitions, earned/locked truth, requirement
// copy, and read-only data path are the classic ones — only the surrounding RPG
// header and shell styling differ. See the Phase 2D wrapper contract: "color it
// and leave it".
export function RpgBadgesPage() {
  return <AchievementsSurface variant="rpg" />;
}
