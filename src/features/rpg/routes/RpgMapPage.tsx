import { startTransition, useEffect, useState } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatMinutes } from '@/features/course/model';
import {
  RpgButton,
  RpgEmptyState,
  RpgPanel,
  RpgStatusPill,
  type RpgStatusTone,
} from '@/features/rpg/components';
import { loadRpgCourseMapSummary } from '@/features/rpg/model/readModels';
import type {
  RpgCourseMapSummary,
  RpgModuleSummary,
} from '@/features/rpg/model/types';
import { getRpgWeekPath } from '@/lib/routing/rpgRoutePaths';

type RpgMapPageStatus = 'error' | 'loading' | 'ready';

type RpgMapPageState = {
  error: string | null;
  status: RpgMapPageStatus;
  summary: RpgCourseMapSummary | null;
};

const initialState: RpgMapPageState = {
  error: null,
  status: 'loading',
  summary: null,
};

function getStatusTone(statusVariant: RpgModuleSummary['statusVariant']) {
  const tones: Record<RpgModuleSummary['statusVariant'], RpgStatusTone> = {
    blocked: 'danger',
    completed: 'success',
    inProgress: 'progress',
    notStarted: 'neutral',
    optional: 'neutral',
  };

  return tones[statusVariant];
}

function getAvailabilityLabel(module: RpgModuleSummary) {
  return module.statusVariant === 'blocked' ? 'Needs attention' : 'Available';
}

function getCurrentLabel(
  module: RpgModuleSummary,
  currentModule: RpgModuleSummary | null,
) {
  return currentModule?.id === module.id ? 'Current module' : null;
}

function getMapNodeAriaLabel(
  module: RpgModuleSummary,
  currentModule: RpgModuleSummary | null,
) {
  const currentLabel = getCurrentLabel(module, currentModule);
  const progressLabel =
    module.requiredItemCount === 0
      ? 'optional unit with no required tasks'
      : `${module.completionPercent}% complete, ${module.completedRequiredItemCount} of ${module.requiredItemCount} required complete`;
  const parts = [
    `Open ${module.title}`,
    `status ${module.statusLabel}`,
    progressLabel,
    currentLabel,
    currentLabel === null ? null : 'continue here',
  ].filter(Boolean);

  return parts.join(', ');
}

function RpgMapLoadingState() {
  return (
    <section className="page-section rpg-map">
      <div className="rpg-map__header">
        <p className="rpg-map__eyebrow">RPG</p>
        <h1>Campaign Map</h1>
      </div>
      <LoadingState
        description="Building the campaign map from local course progress."
        title="Loading campaign map"
      />
    </section>
  );
}

export function RpgMapPage() {
  const [state, setState] = useState<RpgMapPageState>(initialState);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadSummary() {
      startTransition(() => {
        setState((currentState) => ({
          ...currentState,
          error: null,
          status: 'loading',
        }));
      });

      try {
        const summary = await loadRpgCourseMapSummary();

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: null,
            status: 'ready',
            summary,
          });
        });
      } catch (loadError) {
        console.error('RPG map loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: 'The RPG campaign map could not be loaded from local data.',
            status: 'error',
            summary: null,
          });
        });
      }
    }

    void loadSummary();

    return () => {
      isActive = false;
    };
  }, [reloadToken]);

  if (state.status === 'loading' || state.summary === null) {
    if (state.status === 'error') {
      return (
        <section className="page-section rpg-map">
          <div className="rpg-map__header">
            <p className="rpg-map__eyebrow">RPG</p>
            <h1>Campaign Map</h1>
          </div>
          <ErrorState
            action={
              <RpgButton
                onClick={() => {
                  startTransition(() => {
                    setState(initialState);
                  });
                  setReloadToken((currentToken) => currentToken + 1);
                }}
                variant="secondary"
              >
                Try again
              </RpgButton>
            }
            description={state.error ?? 'Unknown RPG campaign map error.'}
            title="Campaign map could not be read"
          />
        </section>
      );
    }

    return <RpgMapLoadingState />;
  }

  const { summary } = state;

  return (
    <section className="page-section rpg-map">
      <div className="rpg-map__header">
        <div>
          <p className="rpg-map__eyebrow">RPG</p>
          <h1>Campaign Map</h1>
          <p className="rpg-map__lede">
            CS50x course weeks from the local seed, linked to RPG week pages.
          </p>
        </div>
        <div className="rpg-map__summary" aria-label="Campaign map summary">
          <span>{`${summary.unitCount} modules`}</span>
          <span>{`${summary.completedRequiredItemCount} of ${summary.requiredItemCount} required complete`}</span>
          {summary.currentModule !== null ? (
            <span className="rpg-map__current-route">
              Next route: {summary.currentModule.title}
            </span>
          ) : null}
        </div>
      </div>

      {summary.modules.length === 0 ? (
        <RpgEmptyState
          description="No local course units were found in the current seed."
          eyebrow="No modules"
          title="Campaign map is empty"
        />
      ) : (
        <div className="rpg-map__content">
          <RpgPanel
            className="rpg-map__visual-panel"
            title="Module route"
            titleAs="h2"
          >
            <ol className="rpg-map__node-list" aria-label="Campaign map nodes">
              {summary.modules.map((module, index) => {
                const currentLabel = getCurrentLabel(
                  module,
                  summary.currentModule,
                );
                const availabilityLabel = getAvailabilityLabel(module);

                return (
                  <li
                    className="rpg-map__node-item"
                    data-testid={`rpg-module-${module.id}`}
                    key={module.id}
                  >
                    <a
                      aria-label={getMapNodeAriaLabel(
                        module,
                        summary.currentModule,
                      )}
                      aria-current={currentLabel !== null ? 'step' : undefined}
                      className="rpg-map__node"
                      data-current={currentLabel !== null ? 'true' : undefined}
                      href={getRpgWeekPath(module.id)}
                    >
                      <span className="rpg-map__node-index" aria-hidden="true">
                        {index + 1}
                      </span>
                      <span className="rpg-map__node-copy">
                        <span className="rpg-map__node-type">
                          {module.typeLabel}
                        </span>
                        <span className="rpg-map__node-title">
                          {module.title}
                        </span>
                        <span className="rpg-map__node-meta">
                          {`${availabilityLabel} - ${module.itemCount} quests - ${formatMinutes(
                            module.estimatedMinutes,
                          )}`}
                        </span>
                      </span>
                      <span className="rpg-map__node-status">
                        {currentLabel ? (
                          <>
                            <RpgStatusPill tone="progress">
                              {currentLabel}
                            </RpgStatusPill>
                          </>
                        ) : null}
                        <RpgStatusPill
                          tone={getStatusTone(module.statusVariant)}
                        >
                          {module.statusLabel}
                        </RpgStatusPill>
                        {module.requiredItemCount > 0 ? (
                          <span className="rpg-map__node-progress">
                            {`${module.completionPercent}%`}
                          </span>
                        ) : null}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </RpgPanel>
        </div>
      )}
    </section>
  );
}
