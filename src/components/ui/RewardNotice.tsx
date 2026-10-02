import type { ReactNode } from 'react';

import { classNames } from '@/components/ui/utils';
import type { RewardNotification } from '@/lib/rewards';

export type RewardNoticeRegionProps = {
  leaving: boolean;
  notification: RewardNotification | null;
  /** Optional achievement artwork; decorative, so it is hidden from AT. */
  renderArtwork?: (achievementId: string) => ReactNode;
};

/**
 * Viewport-fixed region for transient reward notices. The polite live region
 * stays mounted so each notice is announced when it is inserted; it never
 * takes focus and never intercepts pointer input.
 */
export function RewardNoticeRegion({
  leaving,
  notification,
  renderArtwork,
}: RewardNoticeRegionProps) {
  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="reward-notice-region"
      data-testid="reward-notice-region"
    >
      {notification === null ? null : (
        <div
          className={classNames(
            'reward-notice',
            `reward-notice--${notification.kind}`,
            leaving && 'reward-notice--leaving',
          )}
          data-reward-kind={notification.kind}
          key={notification.id}
          role="status"
        >
          {notification.kind === 'achievement' && renderArtwork ? (
            <span aria-hidden="true" className="reward-notice__art">
              {renderArtwork(notification.achievementId)}
            </span>
          ) : null}
          <span className="reward-notice__text">
            <span className="reward-notice__label">
              {notification.kind === 'level-up'
                ? 'Level up!'
                : 'Achievement earned'}
            </span>{' '}
            <span className="reward-notice__title">
              {notification.kind === 'level-up'
                ? `Level ${notification.level}`
                : notification.title}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
