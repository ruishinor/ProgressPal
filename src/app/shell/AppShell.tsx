import { Navigate, useLocation } from 'react-router-dom';

import { DataEpochOutlet } from '@/app/router/DataEpochOutlet';
import {
  getRouteDefinition,
  primaryNavigationItems,
} from '@/app/router/routeDefinitions';
import { AppShell as AppShellLayout } from '@/components/layout/AppShell';
import { useMainContentFocus } from '@/components/layout/useMainContentFocus';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CoordinationRepairControl } from '@/components/ui/CoordinationRepairControl';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope } from '@/lib/domain';
import { getOnboardingReturnPath } from '@/lib/routing/onboardingReturnPath';
import { rpgRoutePath } from '@/lib/routing/rpgRoutePaths';
import { isLocalCoordinationRevisionExhausted } from '@/lib/storage';

import { useShellBrand } from './shellBrand';

// True with the optional remote backup off and on: the working data and the
// source of truth are on this device either way. ("Offline only" stopped being
// true once a learner could choose a manual remote backup.)
const localFirstMode = 'Local-first';

export function AppShell() {
  const location = useLocation();
  const {
    coordination,
    error,
    profile,
    programmeScope,
    refresh,
    requiresOnboarding,
    status,
  } = useAppState();
  const mainRef = useMainContentFocus<HTMLElement>();
  const brand = useShellBrand();
  const onboardingRoute = getRouteDefinition('onboarding');
  const onboardingPath = onboardingRoute.to ?? '/onboarding';

  if (status === 'loading') {
    return (
      <AppShellLayout
        mainRef={mainRef}
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
            value: localFirstMode,
          },
          {
            label: 'State',
            tone: 'neutral',
            value: 'Loading local data',
          },
        ]}
        summary={
          // Before the persisted programme is known this is the default
          // programme's wording; a failed composition has no programme at all.
          programmeScope?.content.terminology.copy.startupLoadingSummary ??
          'Preparing local profile data.'
        }
        brand={brand}
        title={brand}
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
        mainRef={mainRef}
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
            value: localFirstMode,
          },
          {
            label: 'State',
            tone: 'danger',
            value: 'Load failed',
          },
        ]}
        summary="ProgressPal could not finish checking or repairing its local storage."
        brand={brand}
        title={brand}
      >
        <section className="page-section">
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
            title="Local startup failed"
          />
          {isLocalCoordinationRevisionExhausted(coordination) ? (
            <CoordinationRepairControl
              onRepaired={() => {
                void refresh();
              }}
            />
          ) : null}
        </section>
      </AppShellLayout>
    );
  }

  if (requiresOnboarding && location.pathname !== onboardingPath) {
    const returnTo =
      location.pathname === '/'
        ? '/rpg'
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
      mainRef={mainRef}
      navigationItems={navigationItems}
      statusItems={[
        {
          label: 'Mode',
          tone: 'accent',
          value: localFirstMode,
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
      utilityNavigationItems={
        requiresOnboarding
          ? undefined
          : [
              {
                end: true,
                id: 'return-to-rpg',
                label: 'Open RPG interface',
                to: rpgRoutePath,
              },
            ]
      }
      summary={
        requiresOnboarding
          ? 'Create the local learner profile before opening the rest of the app. Nothing is uploaded automatically.'
          : requireProgrammeScope(programmeScope).content.terminology.copy
              .shellActiveSummary
      }
      brand={brand}
      title={brand}
    >
      {coordination.blockReason === 'peer-active' ? (
        <section className="page-section">
          <Card
            role="alert"
            title="This ProgressPal tab is read-only"
            variant="danger"
          >
            <p className="card__description">
              Another participating ProgressPal tab owns local writing. You can
              still review your saved data and navigate here. Close the writer
              tab; this tab will reread IndexedDB before it enables changes.
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
              ProgressPal detected a newer local revision. Reload it before
              making changes. If another tab still owns writing, this tab will
              remain available for reading after the reload.
            </p>
            <div className="action-row">
              <Button
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
      {coordination.blockReason === 'unavailable' ? (
        <section className="page-section">
          <Card
            role="alert"
            title="Local tab safety is unavailable"
            variant="danger"
          >
            <p className="card__description">
              This browser context cannot provide the required Web Locks
              ownership guard. ProgressPal keeps local writes blocked because
              advisory tab notifications alone cannot prevent concurrent
              IndexedDB writes.
            </p>
          </Card>
          {isLocalCoordinationRevisionExhausted(coordination) ? (
            <CoordinationRepairControl
              onRepaired={() => {
                void refresh();
              }}
            />
          ) : null}
        </section>
      ) : null}
      <DataEpochOutlet />
    </AppShellLayout>
  );
}
