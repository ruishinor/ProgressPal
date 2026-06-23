import { startTransition, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { RpgProgressBar } from '@/features/rpg/components';
import { loadRpgHubSummary } from '@/features/rpg/model/readModels';
import type { RpgHubSummary } from '@/features/rpg/model/types';
import { RpgBottomNav } from '@/features/rpg/shell/RpgBottomNav';
import { getRpgResourcePath, rpgMapPath } from '@/lib/routing/rpgRoutePaths';

type RpgShellHudStatus = 'error' | 'loading' | 'ready';

type RpgShellHudState = {
  error: string | null;
  status: RpgShellHudStatus;
  summary: RpgHubSummary | null;
};

const initialHudState: RpgShellHudState = {
  error: null,
  status: 'loading',
  summary: null,
};

function getHeroInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'L';
}

function getRpgRouteContext(pathname: string) {
  if (pathname === '/rpg') {
    return 'Hub';
  }

  if (pathname.startsWith('/rpg/map')) {
    return 'Campaign Map';
  }

  if (pathname.startsWith('/rpg/week/')) {
    return 'Week Detail';
  }

  if (pathname.startsWith('/rpg/resource/')) {
    return 'Study Resource';
  }

  if (pathname.startsWith('/rpg/focus')) {
    return 'Focus';
  }

  if (pathname.startsWith('/rpg/hero')) {
    return 'Hero Profile';
  }

  if (pathname.startsWith('/rpg/badges')) {
    return 'Badge Gallery';
  }

  if (pathname.startsWith('/rpg/log')) {
    return 'Journey Log';
  }

  if (pathname.startsWith('/rpg/settings')) {
    return 'Settings';
  }

  return 'RPG';
}

function RpgHeroHud({
  onRetry,
  routeContext,
  state,
}: {
  onRetry: () => void;
  routeContext: string;
  state: RpgShellHudState;
}) {
  if (state.status === 'loading' || state.summary === null) {
    if (state.status === 'error') {
      return (
        <section
          aria-label="Persistent hero HUD"
          className="rpg-hero-hud rpg-hero-hud--compact"
        >
          <div aria-hidden="true" className="rpg-hero-hud__avatar">
            !
          </div>
          <div className="rpg-hero-hud__identity">
            <p className="rpg-hero-hud__eyebrow">Hero HUD</p>
            <p className="rpg-hero-hud__name">Hero state unavailable</p>
            <p className="rpg-hero-hud__meta">
              {state.error ??
                'Local RPG summary could not be loaded from this browser.'}
            </p>
          </div>
          <div className="rpg-hero-hud__route">
            <span>Route</span>
            <strong>{routeContext}</strong>
          </div>
          <button
            className="rpg-hero-hud__quest-link"
            onClick={onRetry}
            type="button"
          >
            Retry
          </button>
        </section>
      );
    }

    return (
      <section
        aria-label="Persistent hero HUD"
        className="rpg-hero-hud rpg-hero-hud--compact"
      >
        <div aria-hidden="true" className="rpg-hero-hud__avatar">
          L
        </div>
        <div className="rpg-hero-hud__identity">
          <p className="rpg-hero-hud__eyebrow">Hero HUD</p>
          <p className="rpg-hero-hud__name">Loading local hero state</p>
          <p className="rpg-hero-hud__meta">
            Reading the existing local RPG summary.
          </p>
        </div>
        <div className="rpg-hero-hud__route">
          <span>Route</span>
          <strong>{routeContext}</strong>
        </div>
      </section>
    );
  }

  const { summary } = state;
  const currentQuest = summary.continueQuest;
  const currentQuestHref =
    currentQuest === null ? rpgMapPath : getRpgResourcePath(currentQuest.id);
  const currentQuestLabel =
    currentQuest === null
      ? 'No required quest pending'
      : `Next: ${currentQuest.title}`;

  return (
    <section aria-label="Persistent hero HUD" className="rpg-hero-hud">
      <div aria-hidden="true" className="rpg-hero-hud__avatar">
        {getHeroInitials(summary.learnerName)}
      </div>

      <div className="rpg-hero-hud__identity">
        <p className="rpg-hero-hud__eyebrow">Hero HUD</p>
        <p className="rpg-hero-hud__name">{summary.learnerName}</p>
        <p className="rpg-hero-hud__meta">
          {`Rank ${summary.identity.rankLabel} - ${summary.identity.pathLabel} path / ${summary.identity.classLabel} class - ${summary.identity.guildLabel} guild`}
        </p>
      </div>

      <div className="rpg-hero-hud__level" aria-label="Hero level">
        <span>Level</span>
        <strong>{summary.xpSummary.level}</strong>
      </div>

      <RpgProgressBar
        className="rpg-hero-hud__xp"
        helperText={`${summary.xpSummary.totalXp} XP total - ${summary.xpSummary.xpToNextLevel} XP to next level`}
        label={`XP progress to level ${summary.xpSummary.level + 1}`}
        value={summary.xpSummary.levelProgressPercent}
      />

      <div className="rpg-hero-hud__quest">
        <span>Current quest</span>
        <strong>{currentQuestLabel}</strong>
        <span>{`Route: ${routeContext}`}</span>
        <Link className="rpg-hero-hud__quest-link" to={currentQuestHref}>
          {currentQuest === null ? 'Open map' : 'Continue quest'}
        </Link>
      </div>
    </section>
  );
}

export function RpgShell() {
  const location = useLocation();
  const [hudState, setHudState] = useState<RpgShellHudState>(initialHudState);
  const [reloadToken, setReloadToken] = useState(0);
  const routeContext = getRpgRouteContext(location.pathname);

  useEffect(() => {
    let isActive = true;

    async function loadHudSummary() {
      startTransition(() => {
        setHudState((currentState) => ({
          ...currentState,
          error: null,
          status: 'loading',
        }));
      });

      try {
        const summary = await loadRpgHubSummary();

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setHudState({
            error: null,
            status: 'ready',
            summary,
          });
        });
      } catch (loadError) {
        console.error('RPG shell HUD loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setHudState({
            error: 'The persistent RPG HUD could not read local progress.',
            status: 'error',
            summary: null,
          });
        });
      }
    }

    void loadHudSummary();

    return () => {
      isActive = false;
    };
  }, [reloadToken]);

  return (
    <section className="rpg-shell" data-testid="rpg-shell">
      <a className="rpg-shell__skip-link" href="#rpg-main-content">
        Skip to RPG content
      </a>
      <div className="rpg-shell__frame">
        <RpgHeroHud
          onRetry={() => {
            startTransition(() => {
              setHudState(initialHudState);
            });
            setReloadToken((currentToken) => currentToken + 1);
          }}
          routeContext={routeContext}
          state={hudState}
        />
        <main className="rpg-shell__main" id="rpg-main-content">
          <Outlet />
        </main>
        <RpgBottomNav />
      </div>
    </section>
  );
}
