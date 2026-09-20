import { AchievementsSurface } from '@/features/achievements';
import { RpgAchievementArt } from '@/features/rpg/components/RpgAchievementArt';

// /rpg/badges ("Awards" in the bottom nav) wraps the classic achievements
// surface in the RPG shell. Achievements are the product concept; the RPG badge
// is only the visual artifact. The definitions, earned/locked truth, requirement
// copy, and read-only data path are the classic ones — only the surrounding RPG
// header, artwork and shell styling differ. Artwork never creates a reward.
export function RpgBadgesPage() {
  return (
    <AchievementsSurface
      variant="rpg"
      renderArtwork={(achievementId) => (
        <RpgAchievementArt achievementId={achievementId} />
      )}
    />
  );
}
