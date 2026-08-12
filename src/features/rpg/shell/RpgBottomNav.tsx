import { useEffect, useId, useRef, useState } from 'react';
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

type RpgNavItem = {
  activePaths: readonly string[];
  accessibleLabel?: string;
  label: string;
  to: string;
};

const primaryNavItems = [
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
] as const satisfies readonly RpgNavItem[];

const secondaryNavItems: readonly RpgNavItem[] = [
  { activePaths: [rpgBadgesPath], label: 'Awards', to: rpgBadgesPath },
  { activePaths: [rpgLogPath], label: 'Insights', to: rpgLogPath },
  { activePaths: [rpgSettingsPath], label: 'Settings', to: rpgSettingsPath },
  {
    accessibleLabel: 'Open Classic dashboard',
    activePaths: [],
    label: 'Classic dashboard',
    to: '/dashboard',
  },
] as const;

function isNavItemActive(pathname: string, item: RpgNavItem) {
  return item.activePaths.some((path) =>
    path === rpgRoutePath
      ? pathname === path
      : pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function RpgBottomNav() {
  const location = useLocation();
  const moreButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstMoreLinkRef = useRef<HTMLAnchorElement | null>(null);
  const [openedAtPath, setOpenedAtPath] = useState<string | null>(null);
  const morePanelId = useId();
  const isMoreOpen = openedAtPath === location.pathname;
  const isSecondaryRouteActive = secondaryNavItems.some((item) =>
    isNavItemActive(location.pathname, item),
  );

  useEffect(() => {
    if (!isMoreOpen) {
      return;
    }

    firstMoreLinkRef.current?.focus();

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      setOpenedAtPath(null);
      moreButtonRef.current?.focus();
    }

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMoreOpen]);

  return (
    <nav aria-label="RPG bottom navigation" className="rpg-bottom-nav">
      <div className="rpg-bottom-nav__list">
        {primaryNavItems.map((item) => {
          const isActive = isNavItemActive(location.pathname, item);

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
        {secondaryNavItems.map((item) => {
          const isActive = isNavItemActive(location.pathname, item);

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.accessibleLabel}
              className={classNames(
                'rpg-bottom-nav__link',
                'rpg-bottom-nav__link--desktop-secondary',
                isActive && 'rpg-bottom-nav__link--active',
              )}
              key={item.to}
              to={item.to}
            >
              {item.label === 'Classic dashboard' ? 'Classic' : item.label}
            </Link>
          );
        })}
        <button
          aria-controls={morePanelId}
          aria-current={isSecondaryRouteActive ? 'page' : undefined}
          aria-expanded={isMoreOpen}
          className={classNames(
            'rpg-bottom-nav__link',
            'rpg-bottom-nav__more-button',
            isSecondaryRouteActive && 'rpg-bottom-nav__link--active',
          )}
          onClick={() => {
            setOpenedAtPath(isMoreOpen ? null : location.pathname);
          }}
          ref={moreButtonRef}
          type="button"
        >
          More
        </button>
      </div>
      {isMoreOpen ? (
        <div
          aria-label="More RPG destinations"
          className="rpg-bottom-nav__more-panel"
          id={morePanelId}
          role="region"
        >
          <p className="rpg-bottom-nav__more-title">More destinations</p>
          <div className="rpg-bottom-nav__more-links">
            {secondaryNavItems.map((item, index) => {
              const isActive = isNavItemActive(location.pathname, item);

              return (
                <Link
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.accessibleLabel}
                  className={classNames(
                    'rpg-bottom-nav__link',
                    isActive && 'rpg-bottom-nav__link--active',
                  )}
                  key={item.to}
                  onClick={() => setOpenedAtPath(null)}
                  ref={index === 0 ? firstMoreLinkRef : undefined}
                  to={item.to}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <button
            className="rpg-bottom-nav__more-close"
            onClick={() => {
              setOpenedAtPath(null);
              moreButtonRef.current?.focus();
            }}
            type="button"
          >
            Close more destinations
          </button>
        </div>
      ) : null}
    </nav>
  );
}
