import { getQuestActionLabel } from '@/features/rpg/model/presentation';
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

import { useMainContentFocus } from '@/components/layout/useMainContentFocus';
import { formatMinutes } from '@/lib/time';
import {
  RpgButton,
  RpgPanel,
  RpgHeroIdentity,
  RpgLevelProgress,
} from '@/features/rpg/components';
import {
  loadRpgHubSummary,
  loadRpgHudSummary,
  projectRpgHudSummary,
} from '@/features/rpg/model/readModels';
import type { RpgHubSummary, RpgHudSummary } from '@/features/rpg/model/types';
import { RpgPrimaryNav } from '@/features/rpg/shell/RpgPrimaryNav';
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
import { requireProgrammeScope } from '@/lib/domain';
import { isLocalCoordinationRevisionExhausted } from '@/lib/storage';

type RpgShellReadStatus = 'error' | 'loading' | 'ready';

export type RpgShellHudState = {
  error: string | null;
  status: RpgShellReadStatus;
  summary: RpgHudSummary | null;
};

export type RpgShellHubState = {
  error: string | null;
  status: RpgShellReadStatus;
  summary: RpgHubSummary | null;
};

export type RpgShellOutletContext = {
  hubState: RpgShellHubState;
  refreshHub: () => void;
  refreshHud: () => Promise<RpgHudSummary>;
};

const initialHudState: RpgShellHudState = {
  error: null,
  status: 'loading',
  summary: null,
};

const initialHubState: RpgShellHubState = {
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
        profileHref={rpgHeroPath}
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
                <span className="rpg-hero-hud__nowrap">
                  {formatMinutes(currentQuest.estimatedMinutes)}
                </span>
              </p>
            ) : null}
          </div>
          <Link className="rpg-hero-hud__quest-link" to={currentQuestHref}>
            {currentQuest === null
              ? 'Open Campaign'
              : getQuestActionLabel(currentQuest.status)}
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export function RpgShell() {
  const { coordination, profile, programmeScope, refresh } = useAppState();
  const [hudState, setHudState] = useState<RpgShellHudState>(initialHudState);
  const [hubState, setHubState] = useState<RpgShellHubState>(initialHubState);
  const [reloadToken, setReloadToken] = useState(0);
  const readVersion = useRef(0);
  const mounted = useRef(true);
  const location = useLocation();
  const mainRef = useMainContentFocus<HTMLElement>();
  const loadMode =
    location.pathname === rpgHeroPath
      ? 'none'
      : location.pathname === rpgRoutePath ||
          !location.pathname.startsWith('/rpg')
        ? 'hub'
        : 'hud';

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      readVersion.current += 1;
    };
  }, []);

  const refreshHud = useCallback(async () => {
    const version = ++readVersion.current;

    startTransition(() => {
      setHudState((currentState) => ({
        ...currentState,
        error: null,
        status: 'loading',
      }));
    });

    try {
      const summary = await loadRpgHudSummary(
        requireProgrammeScope(programmeScope),
      );

      if (mounted.current && version === readVersion.current) {
        startTransition(() => {
          setHudState({ error: null, status: 'ready', summary });
        });
      }

      return summary;
    } catch (loadError) {
      if (mounted.current && version === readVersion.current) {
        console.error('RPG shell HUD loading failed.', loadError);
        startTransition(() => {
          setHudState({
            error: 'The persistent RPG HUD could not read local progress.',
            status: 'error',
            summary: null,
          });
        });
      }

      throw loadError;
    }
  }, [programmeScope]);

  const refreshHub = useCallback(() => {
    setReloadToken((currentToken) => currentToken + 1);
  }, []);

  // Reset scroll to the top of the page on every internal RPG route change.
  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    if (loadMode === 'none') {
      readVersion.current += 1;
      return;
    }

    if (loadMode === 'hud') {
      void refreshHud().catch(() => undefined);
      return;
    }

    const version = ++readVersion.current;

    startTransition(() => {
      setHubState((currentState) => ({
        ...currentState,
        error: null,
        status: 'loading',
      }));
      setHudState((currentState) => ({
        ...currentState,
        error: null,
        status: 'loading',
      }));
    });

    void (async () =>
      loadRpgHubSummary(requireProgrammeScope(programmeScope)))()
      .then((summary) => {
        if (!mounted.current || version !== readVersion.current) {
          return;
        }

        startTransition(() => {
          setHubState({ error: null, status: 'ready', summary });
          setHudState({
            error: null,
            status: 'ready',
            summary: projectRpgHudSummary(summary),
          });
        });
      })
      .catch((loadError: unknown) => {
        if (!mounted.current || version !== readVersion.current) {
          return;
        }

        console.error('RPG hub loading failed.', loadError);
        startTransition(() => {
          setHubState({
            error: 'The RPG hub summary could not be loaded from local data.',
            status: 'error',
            summary: null,
          });
          setHudState({
            error: 'The persistent RPG HUD could not read local progress.',
            status: 'error',
            summary: null,
          });
        });
      });
  }, [loadMode, profile?.updatedAt, programmeScope, refreshHud, reloadToken]);

  return (
    <section className="rpg-shell" data-testid="rpg-shell">
      <a className="rpg-shell__skip-link" href="#rpg-main-content">
        Skip to RPG content
      </a>
      <div className="rpg-shell__frame">
        <nav
          aria-label="RPG utility navigation"
          className="rpg-shell__utility-bar"
        >
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
        </nav>
        <RpgPrimaryNav />
        {location.pathname !== rpgHeroPath ? (
          <RpgHeroHud
            showQuest={
              location.pathname !== rpgRoutePath &&
              location.pathname !== rpgFocusPath &&
              !location.pathname.startsWith('/rpg/resource/')
            }
            onRetry={() => {
              if (loadMode === 'hub') {
                refreshHub();
              } else {
                void refreshHud().catch(() => undefined);
              }
            }}
            state={hudState}
          />
        ) : null}
        <main
          className="rpg-shell__main"
          id="rpg-main-content"
          onFocus={(event) => {
            // Native focus scrolling can expose only a textarea's caret. Keep
            // the whole field above the fixed mobile navigation using scroll
            // padding.
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
          <Outlet
            context={
              {
                hubState,
                refreshHub,
                refreshHud,
              } satisfies RpgShellOutletContext
            }
          />
        </main>
      </div>
    </section>
  );
}
