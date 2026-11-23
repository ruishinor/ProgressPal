import { useState } from 'react';
import {
  BrowserRouter,
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
import { defaultLearnerProfileValues } from '@/lib/db';
import { RewardNotificationProvider } from '@/lib/rewards';
import { gitPathwayProgrammeId } from '@/lib/routing/pathwaysPaths';
import { PathwaysPage } from '@/features/pathways';

function PilotPathways() {
  const { pathname } = useLocation();
  return (
    <PathwaysPage
      key={pathname}
      hideHomeLink
      scope={resolveProgrammeScope(gitPathwayProgrammeId)}
    />
  );
}

function PilotBody() {
  const {
    coordination,
    dataEpoch,
    error,
    refresh,
    requiresOnboarding,
    saveProfile,
    status,
  } = useAppState();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);

  if (status !== 'ready') {
    return (
      <main className="shell-root shell-main" lang="nb">
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
      <main className="shell-root shell-main" lang="nb">
        <section className="page-section">
          <h1>Velkommen til Pathways</h1>
          <p>
            Dette er en avgrenset test av læringsløpet Git og GitHub.
            Du får tilgang til leksjoner, oppgaver og lokal framdrift –
            ikke de øvrige delene av ProgressPal.
          </p>
          <p>
            Framdriften lagres bare i denne nettleseren. Bruk samme
            nettleser neste gang, og ikke slett nettsteddata mens du tester.
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
          {startError && (
            <p role="alert">
              Klarte ikke å opprette lokal læringsprofil. Prøv igjen.
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="shell-root shell-main" lang="nb">
      <div className="shell-brand-block">
        <p className="shell-brand">ProgressPal – begrenset test</p>
      </div>
      <Routes key={dataEpoch}>
        <Route path="/pathways" element={<PilotPathways />} />
        <Route path="/pathways/git-github" element={<PilotPathways />} />
        <Route path="/pathways/git-github/:itemId" element={<PilotPathways />} />
        <Route path="*" element={<Navigate replace to="/pathways" />} />
      </Routes>
    </main>
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
