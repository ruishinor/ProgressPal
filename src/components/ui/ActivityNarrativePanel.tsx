import type { ReactNode } from 'react';

import type { ActivityNarrativeNotification } from '@/lib/rewards';

type Props = {
  notifications: readonly ActivityNarrativeNotification[];
  onDismiss: () => void;
  renderArtwork?: (achievementId: string) => ReactNode;
};

/** Non-modal reading surface for the exact fiction of newly earned Activity badges.
 * It never takes focus or starts a timer. All entries share one scrollable panel.
 */
export function ActivityNarrativePanel({
  notifications,
  onDismiss,
  renderArtwork,
}: Props) {
  if (notifications.length === 0) return null;

  return (
    <aside
      aria-label="New activity achievements"
      className="activity-narrative-region"
      data-testid="activity-narrative-panel"
    >
      <div className="activity-narrative-panel">
        <div className="activity-narrative-panel__header">
          <h2>
            New activity{' '}
            {notifications.length === 1 ? 'achievement' : 'achievements'}
          </h2>
          <button
            className="button button--quiet button--sm"
            onClick={onDismiss}
            type="button"
          >
            Dismiss stories
          </button>
        </div>
        <p className="activity-narrative-panel__summary" role="status">
          {notifications.length} new{' '}
          {notifications.length === 1 ? 'story' : 'stories'}. Read now or find
          them later in Achievements.
        </p>
        <ul className="activity-narrative-panel__list">
          {notifications.map((item) => (
            <li
              className="activity-narrative-panel__item"
              key={item.achievementId}
            >
              <div className="activity-narrative-panel__badge">
                {renderArtwork ? (
                  <span
                    aria-hidden="true"
                    className="activity-narrative-panel__art"
                  >
                    {renderArtwork(item.achievementId)}
                  </span>
                ) : null}
                <h3>{item.title}</h3>
              </div>
              <p lang="en">{item.narrative}</p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
