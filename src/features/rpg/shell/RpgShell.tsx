import { startTransition, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
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

function RpgHeroHud({
  onRetry,
  state,
}: {
  onRetry: () => void;
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
      {summary.learnerAvatarConfig === null ? (
        <div aria-hidden="true" className="rpg-hero-hud__avatar">
          {getHeroInitials(summary.learnerName)}
        </div>
      ) : (
        <ProfileAvatar
          avatarConfig={summary.learnerAvatarConfig}
          className="rpg-hero-hud__avatar rpg-hero-hud__avatar--profile"
          label={`${summary.learnerName} hero avatar`}
          size="sm"
        />
      )}

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
        <Link className="rpg-hero-hud__quest-link" to={currentQuestHref}>
          {currentQuest === null ? 'Open map' : 'Continue quest'}
        </Link>
      </div>
    </section>
  );
}

export function RpgShell() {
  const [hudState, setHudState] = useState<RpgShellHudState>(initialHudState);
  const [reloadToken, setReloadToken] = useState(0);
  const location = useLocation();

  // RPG-only shell hygiene: keep the dark RPG canvas applied to <body> for the
  // whole time an /rpg route is mounted so internal route transitions never
  // flash the light app background.
  useEffect(() => {
    document.body.classList.add('rpg-route-active');

    return () => {
      document.body.classList.remove('rpg-route-active');
    };
  }, []);

  // Reset scroll to the top of the page on every internal RPG route change.
  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [location.pathname]);

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
