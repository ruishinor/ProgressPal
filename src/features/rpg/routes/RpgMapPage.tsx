import { startTransition, useEffect, useState } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatMinutes } from '@/features/course/model';
import {
  RpgButton,
  RpgEmptyState,
  RpgPanel,
  RpgProgressBar,
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
  const parts = [
    `Open ${module.title}`,
    `status ${module.statusLabel}`,
    `${module.completionPercent}% complete`,
    `${module.completedRequiredItemCount} of ${module.requiredItemCount} required complete`,
    currentLabel,
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
        </div>
      </div>

      {summary.modules.length === 0 ? (
        <RpgEmptyState
          description="No local course units were found in the current seed."
          eyebrow="No modules"
          title="Campaign map is empty"
        />
      ) : (
        <>
          <RpgPanel
            className="rpg-map__overview"
            title="Course progress"
            titleAs="h2"
          >
            <RpgProgressBar
              helperText={`${summary.completedRequiredItemCount} of ${summary.requiredItemCount} required tasks complete`}
              label="Required CS50x progress"
              showValue={summary.requiredItemCount > 0}
              value={summary.completionPercent}
            />
            {summary.currentModule !== null ? (
              <p className="rpg-map__note">
                Current module: {summary.currentModule.title}
              </p>
            ) : (
              <p className="rpg-map__note">
                No current module can be selected from local progress.
              </p>
            )}
          </RpgPanel>

          <RpgPanel
            className="rpg-map__visual-panel"
            description="Each node is a normal link with visible status and progress text."
            title="Module route"
            titleAs="h2"
          >
            <ol className="rpg-map__node-list" aria-label="Campaign map nodes">
              {summary.modules.map((module) => {
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
                      className="rpg-map__node"
                      data-current={currentLabel !== null ? 'true' : undefined}
                      href={getRpgWeekPath(module.id)}
                    >
                      <span className="rpg-map__node-index" aria-hidden="true">
                        {module.typeLabel}
                      </span>
                      <span className="rpg-map__node-copy">
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
                          <RpgStatusPill tone="progress">
                            {currentLabel}
                          </RpgStatusPill>
                        ) : null}
                        <RpgStatusPill
                          tone={getStatusTone(module.statusVariant)}
                        >
                          {module.statusLabel}
                        </RpgStatusPill>
                        <span>{`${module.completionPercent}%`}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </RpgPanel>

          <RpgPanel
            className="rpg-map__fallback"
            description="Plain list fallback for scanning the same modules without relying on the visual route layout."
            title="Plain module list"
            titleAs="h2"
          >
            <ol className="rpg-map__plain-list">
              {summary.modules.map((module) => {
                const currentLabel = getCurrentLabel(
                  module,
                  summary.currentModule,
                );

                return (
                  <li key={module.id}>
                    <div>
                      <a
                        className="rpg-map__plain-link"
                        href={getRpgWeekPath(module.id)}
                      >
                        {module.title}
                      </a>
                      {currentLabel ? (
                        <span className="rpg-map__plain-current">
                          {currentLabel}
                        </span>
                      ) : null}
                    </div>
                    <p>
                      {`Status: ${module.statusLabel}. Availability: ${getAvailabilityLabel(
                        module,
                      )}. Progress: ${module.completedRequiredItemCount} of ${
                        module.requiredItemCount
                      } required complete (${module.completionPercent}%).`}
                    </p>
                  </li>
                );
              })}
            </ol>
          </RpgPanel>
        </>
      )}
    </section>
  );
}
