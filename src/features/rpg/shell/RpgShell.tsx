import { getQuestActionLabel } from '@/features/rpg/model/presentation';
import { startTransition, useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { useMainContentFocus } from '@/components/layout/useMainContentFocus';
import { formatMinutes } from '@/features/course/model';
import {
  RpgButton,
  RpgPanel,
  RpgHeroIdentity,
  RpgLevelProgress,
} from '@/features/rpg/components';
import { loadRpgHubSummary } from '@/features/rpg/model/readModels';
import type { RpgHubSummary } from '@/features/rpg/model/types';
import { RpgBottomNav } from '@/features/rpg/shell/RpgBottomNav';
import { CoordinationRepairControl } from '@/components/ui/CoordinationRepairControl';
import {
  getRpgResourcePath,
  rpgHeroPath,
  rpgMapPath,
  rpgRoutePath,
  rpgFocusPath,
  rpgSettingsPath,
} from '@/lib/routing/rpgRoutePaths';
import { useAppState } from '@/lib/appState';
import { isLocalCoordinationRevisionExhausted } from '@/lib/storage';

type RpgShellHudStatus = 'error' | 'loading' | 'ready';

type RpgShellHudState = {
  error: string | null;
  status: RpgShellHudStatus;
  summary: RpgHubSummary | null;
};

export type RpgShellOutletContext = {
  refreshHud: () => void;
};

const initialHudState: RpgShellHudState = {
  error: null,
  status: 'loading',
  summary: null,
};

function RpgHeroHud({
  onRetry,
  state,
  showQuest,
}: {
  onRetry: () => void;
  state: RpgShellHudState;
  showQuest: boolean;
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
          <p className="rpg-hero-hud__name" role="status">
            Loading your Hero
          </p>
        </div>
      </section>
    );
  }

  const { summary } = state;
  const { recommendation } = summary;
  const currentQuest = recommendation.quest;
  const currentQuestHref =
    currentQuest === null ? rpgMapPath : getRpgResourcePath(currentQuest.id);
  const currentQuestLabel =
    currentQuest?.title ??
    (recommendation.state === 'required_complete'
      ? 'Required tasks complete in ProgressPal'
      : 'Course data unavailable');

  return (
    <section
      aria-label="Persistent hero HUD"
      className={`rpg-hero-hud${showQuest ? '' : ' rpg-hero-hud--overview'}`}
    >
      <RpgHeroIdentity
        avatarConfig={summary.learnerAvatarConfig}
        identity={summary.identity}
        name={summary.learnerName}
      />
      <RpgLevelProgress xp={summary.xpSummary} />

      {showQuest ? (
        <div className="rpg-hero-hud__quest">
          <div className="rpg-hero-hud__quest-copy">
            <p className="rpg-hero-hud__quest-label">
              {recommendation.state === 'needs_attention'
                ? 'Blocked work needs attention'
                : 'Current quest'}
            </p>
            <strong>{currentQuestLabel}</strong>
            {currentQuest ? (
              <p className="rpg-quest-reward">{currentQuest.rewardLabel}</p>
            ) : null}
            {recommendation.state === 'required_complete' &&
            recommendation.optionalRemainingCount > 0 ? (
              <p className="rpg-hero-hud__quest-context">{`${recommendation.optionalRemainingCount} optional tasks remain on the map.`}</p>
            ) : null}
            {currentQuest ? (
              <p className="rpg-hero-hud__quest-context">
                {currentQuest.unitTitle} /{' '}
                {formatMinutes(currentQuest.estimatedMinutes)}
              </p>
            ) : null}
          </div>
          <Link className="rpg-hero-hud__quest-link" to={currentQuestHref}>
            {currentQuest === null
              ? 'Open map'
              : getQuestActionLabel(currentQuest.status)}
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export function RpgShell() {
  const { coordination, profile, refresh } = useAppState();
  const [hudState, setHudState] = useState<RpgShellHudState>(initialHudState);
  const [reloadToken, setReloadToken] = useState(0);
  const location = useLocation();
  const mainRef = useMainContentFocus<HTMLElement>();
  const refreshHud = useCallback(() => {
    setReloadToken((currentToken) => currentToken + 1);
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
        if (!isActive) {
          return;
        }

        console.error('RPG shell HUD loading failed.', loadError);

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
  }, [profile?.updatedAt, reloadToken]);

  return (
    <section className="rpg-shell" data-testid="rpg-shell">
      <a className="rpg-shell__skip-link" href="#rpg-main-content">
        Skip to RPG content
      </a>
      <div className="rpg-shell__frame">
        <div className="rpg-shell__utility-bar">
          <Link
            aria-current={
              location.pathname === rpgSettingsPath ? 'page' : undefined
            }
            aria-label="Open Settings"
            className="rpg-shell__settings-link"
            to={rpgSettingsPath}
          >
            <svg
              aria-hidden="true"
              className="rpg-shell__settings-icon"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path d="M9.8 3.8h4.4l.6 2.1 1.6.9 2.1-.6 2.2 3.8-1.5 1.5v1.9l1.5 1.5-2.2 3.8-2.1-.6-1.6.9-.6 2.1H9.8L9.2 19l-1.6-.9-2.1.6-2.2-3.8 1.5-1.5v-1.9L3.3 10l2.2-3.8 2.1.6 1.6-.9.6-2.1Z" />
              <circle cx="12" cy="12.4" r="2.8" />
            </svg>
            <span className="rpg-shell__settings-text">Settings</span>
          </Link>
        </div>
        {location.pathname !== rpgHeroPath ? (
          <RpgHeroHud
            showQuest={
              location.pathname !== rpgRoutePath &&
              location.pathname !== rpgFocusPath &&
              !location.pathname.startsWith('/rpg/resource/')
            }
            onRetry={() => {
              startTransition(() => {
                setHudState(initialHudState);
              });
              setReloadToken((currentToken) => currentToken + 1);
            }}
            state={hudState}
          />
        ) : null}
        <main
          className="rpg-shell__main"
          id="rpg-main-content"
          onFocus={(event) => {
            // Native focus scrolling can expose only a textarea's caret. Keep
            // the whole field above the fixed navigation using scroll padding.
            if (event.target instanceof HTMLTextAreaElement) {
              event.target.scrollIntoView({
                behavior: 'instant',
                block: 'nearest',
                inline: 'nearest',
              });
            }
          }}
          ref={mainRef}
          tabIndex={-1}
        >
          {coordination.blockReason === 'peer-active' ? (
            <RpgPanel
              description="Another ProgressPal tab is open for editing."
              role="alert"
              title="This ProgressPal tab is read-only"
            >
              <p>
                You can still review saved progress and navigate here. Close the
                other tab; this tab will reload saved data before enabling
                changes.
              </p>
            </RpgPanel>
          ) : null}
          {coordination.blockReason === 'stale' ? (
            <RpgPanel
              description="Saved data changed in another tab."
              role="alert"
              title="Reload changed local data"
            >
              <p>
                Reload before making changes. This tab will remain read-only if
                another tab is still open for editing.
              </p>
              <RpgButton
                onClick={() => {
                  void refresh();
                }}
                variant="secondary"
              >
                Reload local state
              </RpgButton>
            </RpgPanel>
          ) : null}
          {coordination.blockReason === 'unavailable' ? (
            <RpgPanel
              description="ProgressPal cannot safely coordinate edits in this browser right now."
              role="alert"
              title="Local writing is unavailable"
            >
              <p>
                You can still review saved progress. Editing stays paused until
                ProgressPal can protect your data from conflicting changes.
              </p>
            </RpgPanel>
          ) : null}
          {coordination.blockReason === 'unavailable' &&
          isLocalCoordinationRevisionExhausted(coordination) ? (
            <CoordinationRepairControl
              onRepaired={() => {
                void refresh();
              }}
            />
          ) : null}
          <Outlet context={{ refreshHud } satisfies RpgShellOutletContext} />
        </main>
        <RpgBottomNav />
      </div>
    </section>
  );
}
