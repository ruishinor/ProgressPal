import { Navigate, useLocation } from 'react-router-dom';

import { DataEpochOutlet } from '@/app/router/DataEpochOutlet';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAppState } from '@/lib/appState';

export function RpgRouteShell() {
  const location = useLocation();
  const { coordination, error, refresh, requiresOnboarding, status } =
    useAppState();

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
