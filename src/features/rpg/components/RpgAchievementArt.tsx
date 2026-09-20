import extraArt0 from '@/features/rpg/assets/badges/rpg-badge-first-slice.svg?inline';
import extraArt1 from '@/features/rpg/assets/badges/rpg-badge-scratch-initiate.webp?inline';
import extraArt2 from '@/features/rpg/assets/badges/rpg-badge-pointer-survivor.webp?inline';
import extraArt3 from '@/features/rpg/assets/badges/rpg-badge-python-shift.webp?inline';
import extraArt4 from '@/features/rpg/assets/badges/rpg-badge-browser-builder.webp?inline';
import extraArt5 from '@/features/rpg/assets/badges/rpg-badge-flask-route-maker.webp?inline';
import extraArt6 from '@/features/rpg/assets/badges/rpg-badge-course-complete.webp?inline';
import extraArt7 from '@/features/rpg/assets/badges/rpg-badge-pset-chain.svg?inline';
import extraArt8 from '@/features/rpg/assets/badges/rpg-badge-clean-stop.svg?inline';
import extraArt9 from '@/features/rpg/assets/badges/rpg-badge-three-deep-sessions.svg?inline';
import { useState } from 'react';
import firstStep from '@/features/rpg/assets/badges/rpg-badge-first-step.webp?inline';
import dataStructureBuilder from '@/features/rpg/assets/badges/rpg-badge-data-structure-builder.webp?inline';
import queryBuilder from '@/features/rpg/assets/badges/rpg-badge-query-builder.webp?inline';
import bugHunter from '@/features/rpg/assets/badges/rpg-badge-bug-hunter.webp?inline';
import finalProjectMvp from '@/features/rpg/assets/badges/rpg-badge-final-project-mvp.webp?inline';
import finalProjectShipped from '@/features/rpg/assets/badges/rpg-badge-final-project-shipped.webp?inline';

// Artwork is presentation only. Definitions and unlocks stay in the achievement engine.
const artwork: Readonly<Record<string, string>> = {
  'first-slice': extraArt0,
  'scratch-initiate': extraArt1,
  'pointer-survivor': extraArt2,
  'python-shift': extraArt3,
  'browser-builder': extraArt4,
  'flask-route-maker': extraArt5,
  'course-complete': extraArt6,
  'pset-chain': extraArt7,
  'clean-stop': extraArt8,
  'three-deep-sessions': extraArt9,

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
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const src = artwork[achievementId];
  return src && src !== failedSource ? (
    <img
      className="rpg-achievement-art"
      src={src}
      onError={() => setFailedSource(src)}
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
