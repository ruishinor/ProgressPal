import { startTransition, useEffect, useState } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatMinutes } from '@/lib/time';
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
    blocked: 'warning',
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

function getMapNodeAriaLabel(module: RpgModuleSummary) {
  const progressLabel =
    module.requiredItemCount === 0
      ? 'optional unit with no required tasks'
      : `${module.completionPercent}% complete, ${module.completedRequiredItemCount} of ${module.requiredItemCount} required complete`;
  const parts = [
    `Open ${module.title}`,
    `status ${module.statusLabel}`,
    progressLabel,
  ].filter(Boolean);

  return parts.join(', ');
}

function getQuestMarker(
  statusVariant: RpgModuleSummary['quests'][number]['statusVariant'],
) {
  if (statusVariant === 'completed') {
    return '✓';
  }

  if (statusVariant === 'inProgress') {
    return '•';
  }

  if (statusVariant === 'blocked') {
    return '!';
  }

  if (statusVariant === 'optional') {
    return '+';
  }

  return '○';
}

function RpgMapLoadingState() {
  return (
    <section className="page-section rpg-map">
      <div className="rpg-map__header rpg-page-header">
        <p className="rpg-map__eyebrow rpg-page-eyebrow">RPG</p>
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
          <div className="rpg-map__header rpg-page-header">
            <p className="rpg-map__eyebrow rpg-page-eyebrow">RPG</p>
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
      <div className="rpg-map__header rpg-page-header">
        <div>
          <p className="rpg-map__eyebrow rpg-page-eyebrow">
            Your learning campaign
          </p>
          <h1>Campaign Map</h1>
          <p className="rpg-map__lede rpg-page-lede">
            Pick up where you left off, or open any week.
          </p>
        </div>
        <div className="rpg-map__summary" aria-label="Campaign map summary">
          <strong className="rpg-map__completion">
            {`${summary.completionPercent}% complete`}
          </strong>
          <RpgProgressBar
            className="rpg-map__course-progress"
            label="Required course progress"
            showValue={false}
            value={summary.completionPercent}
          />
          <span>{`${summary.unitCount} modules`}</span>
          <span>
            {`${summary.completedRequiredItemCount} of ${summary.requiredItemCount} required tasks complete`}
          </span>
          {summary.currentModule !== null ? (
            <span className="rpg-map__current-route">
              Continue: {summary.currentModule.title}
            </span>
          ) : null}
        </div>
      </div>

      {summary.modules.length === 0 ? (
        <RpgEmptyState
          description="The course could not be found. Reload the app to try again."
          eyebrow="No modules"
          title="Campaign map is empty"
        />
      ) : (
        <div className="rpg-map__content">
          <RpgPanel
            className="rpg-map__visual-panel"
            padding="compact"
            title="Course route"
            titleAs="h2"
          >
            <ol className="rpg-map__node-list" aria-label="Campaign map nodes">
              {summary.modules.map((module) => {
                const currentLabel = getCurrentLabel(
                  module,
                  summary.currentModule,
                );
                const availabilityLabel = getAvailabilityLabel(module);
                const isCurrent = currentLabel !== null;

                return (
                  <li
                    className="rpg-map__node-item"
                    data-testid={`rpg-module-${module.id}`}
                    data-status={module.statusVariant}
                    key={module.id}
                  >
                    <article
                      className="rpg-map__module-card"
                      data-current={isCurrent ? 'true' : undefined}
                      data-status={module.statusVariant}
                    >
                      {isCurrent ? (
                        <div
                          className="rpg-map__node rpg-map__node--current-summary"
                          data-current="true"
                          data-status={module.statusVariant}
                        >
                          <span
                            className="rpg-map__node-index"
                            aria-hidden="true"
                          >
                            {module.id.startsWith('week-')
                              ? module.id.slice(5)
                              : module.requiredItemCount === 0
                                ? '+'
                                : '◆'}
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
                            <RpgStatusPill tone="progress">
                              {currentLabel}
                            </RpgStatusPill>
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
                          {module.requiredItemCount > 0 ? (
                            <span
                              className="rpg-map__node-track"
                              aria-hidden="true"
                            >
                              <span
                                style={{
                                  width: `${module.completionPercent}%`,
                                }}
                              />
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <a
                          aria-label={getMapNodeAriaLabel(module)}
                          className="rpg-map__node"
                          data-status={module.statusVariant}
                          href={getRpgWeekPath(module.id)}
                        >
                          <span
                            className="rpg-map__node-index"
                            aria-hidden="true"
                          >
                            {module.id.startsWith('week-')
                              ? module.id.slice(5)
                              : module.requiredItemCount === 0
                                ? '+'
                                : '◆'}
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
                          {module.requiredItemCount > 0 ? (
                            <span
                              className="rpg-map__node-track"
                              aria-hidden="true"
                            >
                              <span
                                style={{
                                  width: `${module.completionPercent}%`,
                                }}
                              />
                            </span>
                          ) : null}
                        </a>
                      )}

                      {isCurrent ? (
                        <div className="rpg-map__current-detail">
                          <div className="rpg-map__current-heading">
                            <div>
                              <h3>Tasks in {module.title}</h3>
                            </div>
                            <span>
                              {`${module.completedRequiredItemCount} of ${module.requiredItemCount} required complete`}
                            </span>
                          </div>

                          <ol
                            aria-label={`${module.title} quest status`}
                            className="rpg-map__quest-preview"
                          >
                            {module.quests.map((quest) => (
                              <li
                                className="rpg-map__quest-preview-item"
                                data-status={quest.statusVariant}
                                key={quest.id}
                              >
                                <span
                                  aria-hidden="true"
                                  className="rpg-map__quest-marker"
                                >
                                  {getQuestMarker(quest.statusVariant)}
                                </span>
                                <span className="rpg-map__quest-copy">
                                  <strong>{quest.title}</strong>
                                  <span>{quest.typeLabel}</span>
                                </span>
                                <span className="rpg-map__quest-status">
                                  {quest.statusLabel}
                                </span>
                              </li>
                            ))}
                          </ol>

                          <RpgButton
                            aria-current="step"
                            className="rpg-map__continue"
                            href={getRpgWeekPath(module.id)}
                            size="sm"
                          >
                            Continue learning
                          </RpgButton>
                        </div>
                      ) : null}
                    </article>
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
