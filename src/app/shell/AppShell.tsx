import { Navigate, Outlet, useLocation } from 'react-router-dom';

import {
  getRouteDefinition,
  primaryNavigationItems,
} from '@/app/router/routeDefinitions';
import { AppShell as AppShellLayout } from '@/components/layout/AppShell';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAppState } from '@/lib/appState';

export function AppShell() {
  const location = useLocation();
  const { error, profile, requiresOnboarding, status } = useAppState();
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
    return <Navigate replace to={onboardingPath} />;
  }

  if (!requiresOnboarding && location.pathname === onboardingPath) {
    return <Navigate replace to="/dashboard" />;
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
      ]}
      summary={
        requiresOnboarding
          ? 'Create the local learner profile before opening the rest of the app. Nothing is synced or sent anywhere.'
          : 'Local-first CS50 tracking is active. Course progress, study sessions, XP, achievements, insights, backup, restore, reset, and offline support all run on this device.'
      }
      title="ProgressPal CS50 Edition"
    >
      <Outlet />
    </AppShellLayout>
  );
}
