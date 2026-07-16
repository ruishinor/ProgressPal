import { Navigate, Outlet, useLocation } from 'react-router-dom';

import {
  getRouteDefinition,
  primaryNavigationItems,
} from '@/app/router/routeDefinitions';
import { AppShell as AppShellLayout } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAppState } from '@/lib/appState';
import { getOnboardingReturnPath } from '@/lib/routing/onboardingReturnPath';

export function AppShell() {
  const location = useLocation();
  const { coordination, error, profile, refresh, requiresOnboarding, status } =
    useAppState();
  const onboardingRoute = getRouteDefinition('onboarding');
  const onboardingPath = onboardingRoute.to ?? '/onboarding';

  if (status === 'loading') {
    return (
      <AppShellLayout
        navigationItems={[
          {
            end: true,
            id: 'loading',
            label: 'Preparing',
            to: onboardingPath,
          },
        ]}
        statusItems={[
          {
            label: 'Mode',
            tone: 'accent',
            value: 'Offline only',
          },
          {
            label: 'State',
            tone: 'neutral',
            value: 'Loading local data',
          },
        ]}
        summary="Preparing local profile data and the bundled CS50 catalog."
        title="ProgressPal CS50 Edition"
      >
        <section className="page-section">
          <LoadingState
            description="Opening local data stores and reading the learner profile."
            title="Preparing your workspace"
          />
        </section>
      </AppShellLayout>
    );
  }

  if (status === 'error') {
    return (
      <AppShellLayout
        navigationItems={[
          {
            end: true,
            id: 'error',
            label: 'Local data',
            to: onboardingPath,
          },
        ]}
        statusItems={[
          {
            label: 'Mode',
            tone: 'accent',
            value: 'Offline only',
          },
          {
            label: 'State',
            tone: 'danger',
            value: 'Load failed',
          },
        ]}
        summary="The app could not open its local storage."
        title="ProgressPal CS50 Edition"
      >
        <section className="page-section">
          <ErrorState
            description={error ?? 'Local data could not be loaded.'}
            title="Local startup failed"
          />
        </section>
      </AppShellLayout>
    );
  }

  if (requiresOnboarding && location.pathname !== onboardingPath) {
    const returnTo =
      location.pathname === '/'
        ? '/dashboard'
        : `${location.pathname}${location.search}${location.hash}`;

    return <Navigate replace state={{ returnTo }} to={onboardingPath} />;
  }

  if (!requiresOnboarding && location.pathname === onboardingPath) {
    return <Navigate replace to={getOnboardingReturnPath(location.state)} />;
  }

  const navigationItems = requiresOnboarding
    ? [
        {
          end: true,
          id: 'onboarding',
          label: 'Setup',
          to: onboardingPath,
        },
      ]
    : primaryNavigationItems;

  return (
    <AppShellLayout
      navigationItems={navigationItems}
      statusItems={[
        {
          label: 'Mode',
          tone: 'accent',
          value: 'Offline only',
        },
        {
          label: 'Learner',
          tone: requiresOnboarding ? 'warning' : 'success',
          value: requiresOnboarding
            ? 'Setup required'
            : (profile?.displayName ?? 'Unavailable'),
        },
        {
          label: 'Target',
          tone: 'neutral',
          value:
            profile === null
              ? 'Unavailable'
              : `${profile.targetMinutesPerWeek} min/week`,
        },
        {
          label: 'Local writes',
          tone: coordination.canWrite ? 'success' : 'warning',
          value: coordination.canWrite ? 'Available' : 'Read-only',
        },
      ]}
      summary={
        requiresOnboarding
          ? 'Create the local learner profile before opening the rest of the app. Nothing is synced or sent anywhere.'
          : 'Local-first CS50 tracking is active. Course progress, study sessions, XP, achievements, insights, backup, restore, reset, and offline support all run on this device.'
      }
      title="ProgressPal CS50 Edition"
    >
      {coordination.blockReason === 'peer-active' ? (
        <section className="page-section">
          <Card
            role="alert"
            title="Another ProgressPal tab is open"
            variant="danger"
          >
            <p className="card__description">
              Local changes, imports, and resets are blocked in every tab while
              more than one ProgressPal tab is active. Close the other tab, then
              continue here. This prevents stale screens from silently
              overwriting the same IndexedDB data.
            </p>
          </Card>
        </section>
      ) : null}
      {coordination.blockReason === 'stale' ? (
        <section className="page-section">
          <Card
            role="alert"
            title="This tab has stale local data"
            variant="danger"
          >
            <p className="card__description">
              Another tab changed ProgressPal data. Close any other tab and
              reload the local state before making changes here.
            </p>
            <div className="action-row">
              <Button
                disabled={coordination.peerActive}
                onClick={() => {
                  void refresh();
                }}
              >
                Reload local state
              </Button>
            </div>
          </Card>
        </section>
      ) : null}
      <Outlet />
    </AppShellLayout>
  );
}
