import { useEffect, useLayoutEffect, useState } from 'react';
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
} from '@/app/providers/programmeComposition';
import { AppStateProvider, useAppState } from '@/lib/appState';
import { rpgStyleOptions, saveRpgStyle, useRpgStyle } from '@/lib/appState/rpgStyle';
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
  const rpg = location.pathname.startsWith('/rpg/');
  const rpgStyle = useRpgStyle();

  useEffect(() => {
    document.body.classList.toggle('rpg-route-active', rpg);
    return () => document.body.classList.remove('rpg-route-active');
  }, [rpg]);

  useLayoutEffect(() => {
    if (rpg) document.body.dataset.rpgStyle = rpgStyle;
    else delete document.body.dataset.rpgStyle;
    return () => { delete document.body.dataset.rpgStyle; };
  }, [rpg, rpgStyle]);

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
            oppgaver, visningsvalg og lokal framdrift – men ikke andre deler
            av ProgressPal.
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
                  targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
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
      <a className="pilot-skip" href="#pilot-main">Hopp til innhold</a>
      <div className="pilot-shell">
        <header className="pilot-header">
          <div className="pilot-header__identity">
            <p className="pilot-eyebrow">ProgressPal · begrenset test</p>
            <p className="pilot-header__title">Pathways</p>
          </div>
          <div className="pilot-controls" aria-label="Visningsvalg">
            <fieldset className="pilot-control">
              <legend>Visning</legend>
              <div className="pilot-segment">
                <Link
                  aria-current={!rpg ? 'page' : undefined}
                  to={pathwaysPath + location.pathname.replace(/^\/(?:rpg\/)?pathways/, '')}
                >
                  Klassisk
                </Link>
                <Link
                  aria-current={rpg ? 'page' : undefined}
                  to={rpgPathwaysPath + location.pathname.replace(/^\/(?:rpg\/)?pathways/, '')}
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
                  <option key={theme.value} value={theme.value}>{theme.label}</option>
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
                    <option key={style.value} value={style.value}>{style.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {themeError && <p className="pilot-control-error" role="alert">Kunne ikke lagre tema. Prøv igjen.</p>}
        </header>
        <main id="pilot-main" className="pilot-content">
          <Routes key={dataEpoch}>
            <Route path="/pathways" element={<PilotPathways />} />
            <Route path="/pathways/git-github" element={<PilotPathways />} />
            <Route path="/pathways/git-github/:itemId" element={<PilotPathways />} />
            <Route path="/rpg/pathways" element={<PilotPathways />} />
            <Route path="/rpg/pathways/git-github" element={<PilotPathways />} />
            <Route path="/rpg/pathways/git-github/:itemId" element={<PilotPathways />} />
            <Route path="*" element={<Navigate replace to="/pathways" />} />
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
