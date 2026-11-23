import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import {
  resolveDatabaseMigrationContext,
  resolveProgrammeScope,
} from './programmeComposition';
import { AppStateProvider, useAppState } from '@/lib/appState';
import {
  rpgStyleOptions,
  saveRpgStyle,
  useRpgStyle,
} from '@/lib/appState/rpgStyle';
import { defaultLearnerProfileValues } from '@/lib/db';
import { RewardNotificationProvider } from '@/lib/rewards';
import {
  gitPathwayProgrammeId,
  pathwaysPath,
  rpgPathwaysPath,
} from '@/lib/routing/pathwaysPaths';
import { PathwaysPage } from '@/features/pathways';
import './pilot.css';

const themes = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Lys' },
  { value: 'dark', label: 'Mørk' },
] as const;

function PilotPathways() {
  return (
    <PathwaysPage
      hideHomeLink
      scope={resolveProgrammeScope(gitPathwayProgrammeId)}
    />
  );
}

function PilotBody() {
  const location = useLocation();
  const {
    coordination,
    dataEpoch,
    error,
    profile,
    refresh,
    requiresOnboarding,
    saveProfile,
    status,
  } = useAppState();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeError, setThemeError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const gearRef = useRef<HTMLButtonElement>(null);
  const rpg = location.pathname.startsWith('/rpg/');
  const rpgStyle = useRpgStyle();

  useEffect(() => {
    document.body.classList.toggle('rpg-route-active', rpg);
    return () => document.body.classList.remove('rpg-route-active');
  }, [rpg]);

  useLayoutEffect(() => {
    if (rpg) document.body.dataset.rpgStyle = rpgStyle;
    else delete document.body.dataset.rpgStyle;
    return () => {
      delete document.body.dataset.rpgStyle;
    };
  }, [rpg, rpgStyle]);

  // The settings panel is optional chrome, never a permanent lesson header.
  // Closing on navigation, Escape and outside clicks prevents it from
  // obstructing the learning flow, especially on small screens.
  useEffect(() => {
    // Browser history navigation must close an open panel without triggering
    // a synchronous setState during the effect's initial execution.
    const closeOnHistory = () => setSettingsOpen(false);
    window.addEventListener('popstate', closeOnHistory);
    return () => window.removeEventListener('popstate', closeOnHistory);
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !settingsRef.current?.contains(event.target)
      ) {
        setSettingsOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
        gearRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [settingsOpen]);

  async function changeTheme(value: string) {
    if (!profile || !themes.some((theme) => theme.value === value)) return;
    setThemeError(false);
    setSavingTheme(true);
    try {
      await saveProfile({
        displayName: profile.displayName,
        avatarConfig: profile.avatarConfig,
        preferredTheme: value as 'system' | 'light' | 'dark',
        reducedMotion: profile.reducedMotion,
        targetMinutesPerWeek: profile.targetMinutesPerWeek,
        targetStudyDays: [...profile.targetStudyDays],
      });
    } catch {
      setThemeError(true);
    } finally {
      setSavingTheme(false);
    }
  }

  if (status !== 'ready') {
    return (
      <main className="pilot-shell" lang="nb" id="pilot-main">
        <h1>Pathways – ProgressPal test</h1>
        {status === 'loading' ? (
          <p role="status">Forbereder lokalt læringsmiljø…</p>
        ) : (
          <>
            <p role="alert">{error ?? 'Kunne ikke åpne læringsdata.'}</p>
            <button type="button" onClick={() => void refresh()}>
              Prøv igjen
            </button>
          </>
        )}
      </main>
    );
  }

  if (requiresOnboarding) {
    return (
      <main className="pilot-shell" lang="nb" id="pilot-main">
        <section className="pilot-intro">
          <p className="pilot-eyebrow">ProgressPal · testtilgang</p>
          <h1>Velkommen til Pathways</h1>
          <p>
            Dette er en avgrenset test av Git og GitHub. Du får leksjoner,
            oppgaver, visningsvalg og lokal framdrift – men ikke andre deler av
            ProgressPal.
          </p>
          <p>
            Framdriften lagres i denne nettleseren. Bruk samme nettleser ved
            neste besøk; sletting av nettsteddata kan slette framdriften.
          </p>
          <button
            type="button"
            disabled={starting || !coordination.canWrite}
            onClick={() => {
              setStarting(true);
              setStartError(false);
              void saveProfile(
                {
                  ...defaultLearnerProfileValues,
                  targetStudyDays: [
                    ...defaultLearnerProfileValues.targetStudyDays,
                  ],
                },
                {
                  completeOnboarding: true,
                  startingProgrammeId: gitPathwayProgrammeId,
                },
              ).catch(() => {
                setStartError(true);
                setStarting(false);
              });
            }}
          >
            {starting ? 'Starter…' : 'Start Pathways'}
          </button>
          {startError && <p role="alert">Klarte ikke å starte. Prøv igjen.</p>}
        </section>
      </main>
    );
  }

  return (
    <>
      <a className="pilot-skip" href="#pilot-main">
        Hopp til innhold
      </a>
      <div className="pilot-shell">
        <header className="pilot-header">
          <div className="pilot-header__identity">
            <p className="pilot-eyebrow">ProgressPal · begrenset test</p>
            <p className="pilot-header__title">Pathways</p>
          </div>
          <div className="pilot-settings" ref={settingsRef}>
            <button
              ref={gearRef}
              type="button"
              className="pilot-settings__trigger"
              aria-label="Visningsinnstillinger"
              title="Visningsinnstillinger"
              aria-expanded={settingsOpen}
              aria-controls="pilot-settings-panel"
              onClick={() => setSettingsOpen((open) => !open)}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="22"
                height="22"
              >
                <path d="M12 2.7a2 2 0 0 0-2 1.5l-.3 1.1-1.1.6-1.1-.3a2 2 0 0 0-2.1.9l-1.1 1.9a2 2 0 0 0 .2 2.3l.8.8v1.2l-.8.8a2 2 0 0 0-.2 2.3l1.1 1.9a2 2 0 0 0 2.1.9l1.1-.3 1.1.6.3 1.1a2 2 0 0 0 2 1.5h2a2 2 0 0 0 2-1.5l.3-1.1 1.1-.6 1.1.3a2 2 0 0 0 2.1-.9l1.1-1.9a2 2 0 0 0-.2-2.3l-.8-.8v-1.2l.8-.8a2 2 0 0 0 .2-2.3l-1.1-1.9a2 2 0 0 0-2.1-.9l-1.1.3-1.1-.6-.3-1.1a2 2 0 0 0-2-1.5z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            {settingsOpen && (
              <section
                id="pilot-settings-panel"
                className="pilot-settings__panel"
                aria-label="Visningsinnstillinger"
              >
                <div className="pilot-settings__heading">
                  <h2>Visningsinnstillinger</h2>
                  <button
                    className="pilot-settings__close"
                    type="button"
                    aria-label="Lukk visningsinnstillinger"
                    onClick={() => {
                      setSettingsOpen(false);
                      gearRef.current?.focus();
                    }}
                  >
                    Lukk
                  </button>
                </div>
                <div className="pilot-controls">
                  <fieldset className="pilot-control">
                    <legend>Visning</legend>
                    <div className="pilot-segment">
                      <Link
                        aria-current={!rpg ? 'page' : undefined}
                        onClick={() => setSettingsOpen(false)}
                        to={
                          pathwaysPath +
                          location.pathname.replace(/^\/(?:rpg\/)?pathways/, '')
                        }
                      >
                        Klassisk
                      </Link>
                      <Link
                        aria-current={rpg ? 'page' : undefined}
                        onClick={() => setSettingsOpen(false)}
                        to={
                          rpgPathwaysPath +
                          location.pathname.replace(/^\/(?:rpg\/)?pathways/, '')
                        }
                      >
                        RPG
                      </Link>
                    </div>
                  </fieldset>
                  <div className="pilot-control">
                    <label htmlFor="pilot-theme">Fargetema</label>
                    <select
                      id="pilot-theme"
                      value={profile?.preferredTheme ?? 'system'}
                      disabled={savingTheme || !coordination.canWrite}
                      onChange={(event) => void changeTheme(event.target.value)}
                    >
                      {themes.map((theme) => (
                        <option key={theme.value} value={theme.value}>
                          {theme.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {rpg && (
                    <div className="pilot-control">
                      <label htmlFor="pilot-rpg-style">RPG-stil</label>
                      <select
                        id="pilot-rpg-style"
                        value={rpgStyle}
                        onChange={(event) => saveRpgStyle(event.target.value)}
                      >
                        {rpgStyleOptions.map((style) => (
                          <option key={style.value} value={style.value}>
                            {style.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {themeError && (
                  <p className="pilot-control-error" role="alert">
                    Kunne ikke lagre tema. Prøv igjen.
                  </p>
                )}
              </section>
            )}
          </div>
        </header>
        <main id="pilot-main" className="pilot-content">
          <Routes key={dataEpoch}>
            <Route path="/pathways" element={<PilotPathways />} />
            <Route path="/pathways/git-github" element={<PilotPathways />} />
            <Route
              path="/pathways/git-github/:itemId"
              element={<PilotPathways />}
            />
            <Route path="/rpg/pathways" element={<PilotPathways />} />
            <Route
              path="/rpg/pathways/git-github"
              element={<PilotPathways />}
            />
            <Route
              path="/rpg/pathways/git-github/:itemId"
              element={<PilotPathways />}
            />
            <Route
              path="*"
              element={<Navigate replace to={rpgPathwaysPath} />}
            />
          </Routes>
        </main>
        <footer className="pilot-footer">
          Kun Pathways · Framdrift lagres lokalt på denne enheten
        </footer>
      </div>
    </>
  );
}

export function PathwaysPilotApp() {
  return (
    <RewardNotificationProvider>
      <AppStateProvider
        resolveProgramme={resolveProgrammeScope}
        resolveMigrationContext={resolveDatabaseMigrationContext}
      >
        <BrowserRouter>
          <PilotBody />
        </BrowserRouter>
      </AppStateProvider>
    </RewardNotificationProvider>
  );
}
