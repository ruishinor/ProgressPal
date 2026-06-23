import { Navigate, Outlet } from 'react-router-dom';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAppState } from '@/lib/appState';

export function RpgRouteShell() {
  const { error, requiresOnboarding, status } = useAppState();

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
              description={error ?? 'Local data could not be loaded.'}
              title="RPG startup failed"
            />
          </main>
        </div>
      </section>
    );
  }

  if (requiresOnboarding) {
    return <Navigate replace to="/onboarding" />;
  }

  return <Outlet />;
}
