import extraArt0 from '@/features/rpg/assets/badges/rpg-badge-first-slice.svg?inline';
import extraArt7 from '@/features/rpg/assets/badges/rpg-badge-pset-chain.svg?inline';
import extraArt8 from '@/features/rpg/assets/badges/rpg-badge-clean-stop.svg?inline';
import extraArt9 from '@/features/rpg/assets/badges/rpg-badge-three-deep-sessions.svg?inline';
import { useState } from 'react';

// Raster badge art is same-origin and pre-cached by the service worker.
// Inlining the transparent exports would exceed the JavaScript budgets.
const programmeBadge = (name: string) => `/assets/badges/${name}.webp`;

// Artwork is presentation only. Definitions and unlocks stay in the achievement engine.
const artwork: Readonly<Record<string, string>> = {
  'activity-hello-overworld': programmeBadge('activity-hello-overworld'),
  'activity-push-to-main': programmeBadge('activity-push-to-main'),
  'activity-leg-day-compiler': programmeBadge('activity-leg-day-compiler'),
  'activity-cache-me-outside': programmeBadge('activity-cache-me-outside'),
  'activity-runtime-ranger': programmeBadge('activity-runtime-ranger'),
  'activity-cycle-of-power': programmeBadge('activity-cycle-of-power'),
  'activity-full-stack-adventurer': programmeBadge(
    'activity-full-stack-adventurer',
  ),
  'activity-merge-quest': programmeBadge('activity-merge-quest'),
  'activity-build-passed': programmeBadge('activity-build-passed'),
  'activity-fork-your-path': programmeBadge('activity-fork-your-path'),
  'activity-warm-reboot': programmeBadge('activity-warm-reboot'),
  'activity-long-term-support': programmeBadge('activity-long-term-support'),
  'first-slice': extraArt0,
  'scratch-initiate': programmeBadge('rpg-badge-scratch-initiate'),
  'pointer-survivor': programmeBadge('rpg-badge-pointer-survivor'),
  'python-shift': programmeBadge('rpg-badge-python-shift'),
  'browser-builder': programmeBadge('rpg-badge-browser-builder'),
  'flask-route-maker': programmeBadge('rpg-badge-flask-route-maker'),
  'course-complete': programmeBadge('rpg-badge-course-complete'),
  'pset-chain': extraArt7,
  'clean-stop': extraArt8,
  'three-deep-sessions': extraArt9,

  'first-step': programmeBadge('rpg-badge-first-step'),
  'data-structure-builder': programmeBadge('rpg-badge-data-structure-builder'),
  'query-builder': programmeBadge('rpg-badge-query-builder'),
  'bug-hunter': programmeBadge('rpg-badge-bug-hunter'),
  'final-project-mvp': programmeBadge('rpg-badge-final-project-mvp'),
  'final-project-shipped': programmeBadge('rpg-badge-final-project-shipped'),
  'p2-change-calculator': programmeBadge('p2-change-calculator'),
  'p2-code-reader': programmeBadge('p2-code-reader'),
  'p2-coffee-change': programmeBadge('p2-coffee-change'),
  'p2-error-reader': programmeBadge('p2-error-reader'),
  'p2-foundation-checkpoint': programmeBadge('p2-foundation-checkpoint'),
  'p2-recall-foundations': programmeBadge('p2-recall-foundations'),
  'p2-values-checkpoint': programmeBadge('p2-values-checkpoint'),
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
