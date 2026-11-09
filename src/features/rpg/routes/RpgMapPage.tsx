import uiCopy from '@/ui-copy/interface.json';
import { startTransition, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatEstimatedMinutes } from '@/lib/time';
import {
  RpgButton,
  RpgEmptyState,
  RpgPanel,
  RpgProgressBar,
  RpgStatusPill,
  type RpgStatusTone,
} from '@/features/rpg/components';
import { getMapNodeOrdinal } from '@/features/rpg/model/presentation';
import { loadRpgCourseMapSummary } from '@/features/rpg/model/readModels';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope } from '@/lib/domain';
import type {
  RpgCourseMapSummary,
  RpgModuleSummary,
} from '@/features/rpg/model/types';
import {
  getRpgResourcePath,
  getRpgWeekPath,
} from '@/lib/routing/rpgRoutePaths';

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
        <p className="rpg-map__eyebrow rpg-page-eyebrow">
          {uiCopy.surfaces.rpgMap.rPG}
        </p>
        <h1>{uiCopy.surfaces.rpgMap.campaign}</h1>
      </div>
      <LoadingState
        description={
          uiCopy.surfaces.rpgMap.buildingTheCampaignMapFromLocalCourseProgress
        }
        title={uiCopy.surfaces.rpgMap.loadingCampaignMap}
      />
    </section>
  );
}

export function RpgMapPage() {
  const { programmeScope } = useAppState();
  const { campaignOpensAtTask, unitMapOrdinals, unitNoun } =
    requireProgrammeScope(useAppState().programmeScope).content.terminology;
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
        const summary = await loadRpgCourseMapSummary(
          requireProgrammeScope(programmeScope),
        );

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
  }, [programmeScope, reloadToken]);

  if (state.status === 'loading' || state.summary === null) {
    if (state.status === 'error') {
      return (
        <section className="page-section rpg-map">
          <div className="rpg-map__header rpg-page-header">
            <p className="rpg-map__eyebrow rpg-page-eyebrow">
              {uiCopy.surfaces.rpgMap.rPG}
            </p>
            <h1>{uiCopy.surfaces.rpgMap.campaign}</h1>
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
                {uiCopy.surfaces.rpgMap.tryAgain}
              </RpgButton>
            }
            description={
              state.error ?? uiCopy.surfaces.rpgMap.unknownRPGCampaignMapError
            }
            title={uiCopy.surfaces.rpgMap.campaignMapCouldNotBeRead}
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
            {uiCopy.surfaces.rpgMap.yourLearningCampaign}
          </p>
          <h1>{uiCopy.surfaces.rpgMap.campaign}</h1>
          <p className="rpg-map__lede rpg-page-lede">
            {`Pick up where you left off, or open any ${unitNoun.lowercase}.`}
          </p>
        </div>
        <div
          className="rpg-map__summary"
          aria-label={uiCopy.surfaces.rpgMap.campaignMapSummary}
        >
          <strong className="rpg-map__completion">
            {`${summary.completionPercent}% complete`}
          </strong>
          <RpgProgressBar
            className="rpg-map__course-progress"
            label={uiCopy.surfaces.rpgMap.requiredCourseProgress}
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
          description={uiCopy.surfaces.rpgMap.theCourseCouldNotBeFoundReloadThe}
          eyebrow="No modules"
          title={uiCopy.surfaces.rpgMap.campaignMapIsEmpty}
        />
      ) : (
        <div className="rpg-map__content">
          <RpgPanel
            className="rpg-map__visual-panel"
            padding="compact"
            title={uiCopy.surfaces.rpgMap.courseRoute}
            titleAs="h2"
          >
            <ol
              className="rpg-map__node-list"
              aria-label={uiCopy.surfaces.rpgMap.campaignMapNodes}
            >
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
                            {getMapNodeOrdinal(module, unitMapOrdinals)}
                          </span>
                          <span className="rpg-map__node-copy">
                            <span className="rpg-map__node-type">
                              {module.typeLabel}
                            </span>
                            <span className="rpg-map__node-title">
                              {module.title}
                            </span>
                            <span className="rpg-map__node-meta">
                              {`${availabilityLabel} - ${module.itemCount} quests - ${formatEstimatedMinutes(
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
                        <Link
                          aria-label={getMapNodeAriaLabel(module)}
                          className="rpg-map__node"
                          data-status={module.statusVariant}
                          to={getRpgWeekPath(
                            module.id,
                            campaignOpensAtTask ? module.nextQuestId : null,
                          )}
                        >
                          <span
                            className="rpg-map__node-index"
                            aria-hidden="true"
                          >
                            {getMapNodeOrdinal(module, unitMapOrdinals)}
                          </span>
                          <span className="rpg-map__node-copy">
                            <span className="rpg-map__node-type">
                              {module.typeLabel}
                            </span>
                            <span className="rpg-map__node-title">
                              {module.title}
                            </span>
                            <span className="rpg-map__node-meta">
                              {`${availabilityLabel} - ${module.itemCount} quests - ${formatEstimatedMinutes(
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
                        </Link>
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
                                  {/* Each quest opens its own lesson route. */}
                                  <Link to={getRpgResourcePath(quest.id)}>
                                    <strong>{quest.title}</strong>
                                  </Link>
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
                            href={
                              !campaignOpensAtTask ||
                              module.nextQuestId === null
                                ? getRpgWeekPath(module.id)
                                : getRpgResourcePath(module.nextQuestId)
                            }
                            size="sm"
                          >
                            {uiCopy.surfaces.rpgMap.continueLearning}
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
