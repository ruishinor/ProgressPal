import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { DataEpochOutlet } from '@/app/router/DataEpochOutlet';
import { Button } from '@/components/ui/Button';
import { CoordinationRepairControl } from '@/components/ui/CoordinationRepairControl';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAppState } from '@/lib/appState';
import { isLocalCoordinationRevisionExhausted } from '@/lib/storage';

export function RpgRouteShell() {
  const location = useLocation();
  const { coordination, error, refresh, requiresOnboarding, status } =
    useAppState();

  // Single owner of the RPG body class: every /rpg render — including the
  // loading and error states below, which mount before RpgShell — keeps the
  // RPG canvas on <body>. Its light or dark palette follows the app theme
  // (preferredTheme via html[data-theme]); see rpg-tokens.css.
  useEffect(() => {
    document.body.classList.add('rpg-route-active');

    return () => {
      document.body.classList.remove('rpg-route-active');
    };
  }, []);

  if (status === 'loading') {
    return (
      <section className="rpg-shell" data-testid="rpg-route-shell-loading">
        <div className="rpg-shell__frame">
          <main className="rpg-shell__main">
            <LoadingState
              description="Opening local data stores and reading the learner profile."
              title="Preparing RPG"
            />
          </main>
        </div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="rpg-shell" data-testid="rpg-route-shell-error">
        <div className="rpg-shell__frame">
          <main className="rpg-shell__main">
            <ErrorState
              action={
                <Button
                  disabled={
                    coordination.writeOwnership !== 'owned' ||
                    coordination.blockReason === 'discovering' ||
                    coordination.blockReason === 'unavailable'
                  }
                  onClick={() => {
                    void refresh();
                  }}
                >
                  Retry local data load
                </Button>
              }
              description={error ?? 'Local data could not be loaded.'}
              title="RPG startup failed"
            />
            {isLocalCoordinationRevisionExhausted(coordination) ? (
              <CoordinationRepairControl
                onRepaired={() => {
                  void refresh();
                }}
              />
            ) : null}
          </main>
        </div>
      </section>
    );
  }

  if (requiresOnboarding) {
    return (
      <Navigate
        replace
        state={{
          returnTo: `${location.pathname}${location.search}${location.hash}`,
        }}
        to="/onboarding"
      />
    );
  }

  return <DataEpochOutlet />;
}
