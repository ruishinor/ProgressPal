import { Link, useLocation } from 'react-router-dom';

import { classNames } from '@/components/ui/utils';
import {
  rpgBadgesPath,
  rpgFocusPath,
  rpgHeroPath,
  rpgLogPath,
  rpgMapPath,
  rpgRoutePath,
  rpgSettingsPath,
  rpgWeekPathPattern,
} from '@/lib/routing/rpgRoutePaths';

const rpgBottomNavItems = [
  { activePaths: [rpgRoutePath], label: 'Hub', to: rpgRoutePath },
  {
    activePaths: [
      rpgMapPath,
      rpgWeekPathPattern.replace('/:unitId', ''),
      '/rpg/resource',
    ],
    label: 'Map',
    to: rpgMapPath,
  },
  { activePaths: [rpgFocusPath], label: 'Focus', to: rpgFocusPath },
  { activePaths: [rpgHeroPath], label: 'Hero', to: rpgHeroPath },
  { activePaths: [rpgBadgesPath], label: 'Awards', to: rpgBadgesPath },
  { activePaths: [rpgLogPath], label: 'Insights', to: rpgLogPath },
  { activePaths: [rpgSettingsPath], label: 'Settings', to: rpgSettingsPath },
] as const;

export function RpgBottomNav() {
  const location = useLocation();

  return (
    <nav aria-label="RPG bottom navigation" className="rpg-bottom-nav">
      <div className="rpg-bottom-nav__list">
        {rpgBottomNavItems.map((item) => {
          const isActive = item.activePaths.some((path) =>
            path === rpgRoutePath
              ? location.pathname === path
              : location.pathname === path ||
                location.pathname.startsWith(`${path}/`),
          );

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={classNames(
                'rpg-bottom-nav__link',
                isActive && 'rpg-bottom-nav__link--active',
              )}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
