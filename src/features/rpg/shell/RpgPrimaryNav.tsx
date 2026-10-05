import { Link, useLocation } from 'react-router-dom';

import {
  rpgBadgesPath,
  rpgFocusPath,
  rpgLogPath,
  rpgMapPath,
  rpgRoutePath,
  rpgWeekPathPattern,
} from '@/lib/routing/rpgRoutePaths';

type RpgNavIconName = 'awards' | 'focus' | 'hub' | 'insights' | 'map';

type RpgNavItem = {
  activePaths: readonly string[];
  icon: RpgNavIconName;
  label: string;
  to: string;
};

/**
 * Persistent primary destinations, in display order. Hero/Profile is reached
 * from the learner identity in the HUD, not from here. A lesson
 * (`/rpg/resource/:itemId`) is a focused route of its own: it belongs to no
 * destination, so no item is marked current there.
 */
const navItems = [
  {
    activePaths: [rpgRoutePath],
    icon: 'hub',
    label: 'Home',
    to: rpgRoutePath,
  },
  {
    activePaths: [rpgMapPath, rpgWeekPathPattern.replace('/:unitId', '')],
    icon: 'map',
    label: 'Campaign',
    to: rpgMapPath,
  },
  {
    activePaths: [rpgFocusPath],
    icon: 'focus',
    label: 'Focus',
    to: rpgFocusPath,
  },
  {
    activePaths: [rpgBadgesPath],
    icon: 'awards',
    label: 'Awards',
    to: rpgBadgesPath,
  },
  {
    activePaths: [rpgLogPath],
    icon: 'insights',
    label: 'Insights',
    to: rpgLogPath,
  },
] as const satisfies readonly RpgNavItem[];

function isNavItemActive(pathname: string, item: RpgNavItem) {
  return item.activePaths.some((path) =>
    path === rpgRoutePath
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

function RpgNavIcon({ name }: { name: RpgNavIconName }) {
  const commonProps = {
    'aria-hidden': true,
    className: 'rpg-primary-nav__icon',
    fill: 'none',
    viewBox: '0 0 24 24',
  } as const;

  if (name === 'map') {
    return (
      <svg {...commonProps}>
        <path d="M3.5 5.5 8.8 3v15.5L3.5 21V5.5Z" />
        <path d="m8.8 3 6.4 2.5V21l-6.4-2.5V3Z" />
        <path d="m15.2 5.5 5.3-2.5v15.5L15.2 21V5.5Z" />
      </svg>
    );
  }

  if (name === 'focus') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4.2" />
        <circle
          className="rpg-primary-nav__icon-fill"
          cx="12"
          cy="12"
          r="1.6"
        />
      </svg>
    );
  }

  if (name === 'hub') {
    return (
      <svg {...commonProps}>
        <path d="m5 15.8 5.3-6.1 2.3 2.7 2.1-4.2L19 15.8" />
        <path d="M7.5 18h9" />
      </svg>
    );
  }

  if (name === 'awards') {
    return (
      <svg {...commonProps}>
        <path d="M7 4.5h10v4.2c0 3-2.1 5.3-5 5.3s-5-2.3-5-5.3V4.5Z" />
        <path d="M7 6H4.5v1.4c0 2.2 1.4 3.8 3.5 4.2M17 6h2.5v1.4c0 2.2-1.4 3.8-3.5 4.2M12 14v3.2M8.5 20h7M10 17.2h4" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M5 19V12M10 19V8M15 19V5M20 19V10" />
      <path d="M3.5 19.5h18" />
    </svg>
  );
}

export function RpgPrimaryNav() {
  const location = useLocation();

  return (
    <nav aria-label="RPG primary navigation" className="rpg-primary-nav">
      <div className="rpg-primary-nav__list">
        {navItems.map((item) => (
          <Link
            aria-current={
              isNavItemActive(location.pathname, item) ? 'page' : undefined
            }
            className="rpg-primary-nav__link"
            key={item.to}
            to={item.to}
          >
            <span className="rpg-primary-nav__icon-frame">
              <RpgNavIcon name={item.icon} />
            </span>
            <span className="rpg-primary-nav__label">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
