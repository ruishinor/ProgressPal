import firstStep from '@/features/rpg/assets/badges/rpg-badge-first-step.webp?inline';
import dataStructureBuilder from '@/features/rpg/assets/badges/rpg-badge-data-structure-builder.webp?inline';
import queryBuilder from '@/features/rpg/assets/badges/rpg-badge-query-builder.webp?inline';
import bugHunter from '@/features/rpg/assets/badges/rpg-badge-bug-hunter.webp?inline';
import finalProjectMvp from '@/features/rpg/assets/badges/rpg-badge-final-project-mvp.webp?inline';
import finalProjectShipped from '@/features/rpg/assets/badges/rpg-badge-final-project-shipped.webp?inline';

// Artwork is presentation only. Definitions and unlocks stay in the achievement engine.
const artwork: Readonly<Record<string, string>> = {
  'first-step': firstStep,
  'data-structure-builder': dataStructureBuilder,
  'query-builder': queryBuilder,
  'bug-hunter': bugHunter,
  'final-project-mvp': finalProjectMvp,
  'final-project-shipped': finalProjectShipped,
};

export function RpgAchievementArt({
  achievementId,
}: {
  achievementId: string;
}) {
  const src = artwork[achievementId];
  return src ? (
    <img
      className="rpg-achievement-art"
      src={src}
      alt=""
      width="80"
      height="80"
    />
  ) : (
    <span
      className="rpg-achievement-art rpg-achievement-art--simple"
      aria-hidden="true"
    >
      ◇
    </span>
  );
}
