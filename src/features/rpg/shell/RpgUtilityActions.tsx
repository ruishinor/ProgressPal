import { Link, useLocation } from 'react-router-dom';

import { SettingsIcon } from '@/components/ui/SettingsIcon';
import { FeedbackWidget } from '@/features/feedback';
import { rpgSettingsPath } from '@/lib/routing/rpgRoutePaths';

/** One pair of utility controls, positioned by the surface that owns them. */
export function RpgUtilityActions({
  compact = false,
  inHud = false,
}: {
  compact?: boolean;
  inHud?: boolean;
}) {
  const location = useLocation();

  return (
    <div
      className={
        inHud
          ? 'rpg-shell__actions rpg-shell__actions--hud'
          : 'rpg-shell__actions'
      }
    >
      <FeedbackWidget compact iconOnly />
      <Link
        aria-current={
          location.pathname === rpgSettingsPath ? 'page' : undefined
        }
        aria-label="Open Settings"
        className="rpg-shell__settings-link"
        to={rpgSettingsPath}
      >
        <SettingsIcon className="rpg-shell__settings-icon" />
        <span
          className={compact || inHud ? 'sr-only' : 'rpg-shell__settings-text'}
        >
          Settings
        </span>
      </Link>
    </div>
  );
}
