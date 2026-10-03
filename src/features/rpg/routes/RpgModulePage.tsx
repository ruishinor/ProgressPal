import { startTransition, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatMinutes } from '@/lib/time';
import {
  RpgButton,
  RpgPanel,
  RpgProgressBar,
  RpgQuestRow,
  RpgStatusPill,
  type RpgStatusTone,
} from '@/features/rpg/components';
import { loadRpgModuleSummary } from '@/features/rpg/model/readModels';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope } from '@/lib/domain';
import type {
  RpgModuleSummary,
  RpgQuestSummary,
} from '@/features/rpg/model/types';
import {
  getRpgFocusPath,
  getRpgResourcePath,
  rpgMapPath,
} from '@/lib/routing/rpgRoutePaths';

type RpgModulePageStatus = 'error' | 'loading' | 'ready';

type RpgModulePageState = {
  error: string | null;
  status: RpgModulePageStatus;
  summary: RpgModuleSummary | null;
};

const initialState: RpgModulePageState = {
  error: null,
  status: 'loading',
  summary: null,
};

function getStatusTone(statusVariant: RpgQuestSummary['statusVariant']) {
  const tones: Record<RpgQuestSummary['statusVariant'], RpgStatusTone> = {
    blocked: 'warning',
    completed: 'success',
    inProgress: 'progress',
    notStarted: 'neutral',
    optional: 'neutral',
  };

  return tones[statusVariant];
}

function getProgressTone(statusVariant: RpgModuleSummary['statusVariant']) {
  if (statusVariant === 'blocked') {
    return 'warning';
  }

  if (statusVariant === 'completed') {
    return 'success';
  }

  return 'progress';
}

function getResourceActionLabel(quest: RpgQuestSummary) {
  if (quest.statusVariant === 'completed') {
    return 'Review resource';
  }

  if (quest.statusVariant === 'inProgress') {
    return 'Resume resource';
  }

  return 'Open resource';
}

function RpgWeekLoadingState() {
  const { unitNoun } = requireProgrammeScope(useAppState().programmeScope)
    .content.terminology;

  return (
    <section className="page-section rpg-week">
      <div className="rpg-week__header rpg-page-header">
        <p className="rpg-week__eyebrow rpg-page-eyebrow">{`RPG ${unitNoun.lowercase}`}</p>
        <h1>{`RPG ${unitNoun.capitalized}`}</h1>
      </div>
      <LoadingState
        description={`Building the RPG ${unitNoun.lowercase} from local progress.`}
        title={`Loading RPG ${unitNoun.lowercase}`}
      />
    </section>
  );
}

export function RpgModulePage() {
  const { programmeScope } = useAppState();
  const { unitNoun } = requireProgrammeScope(useAppState().programmeScope)
    .content.terminology;
  const { unitId } = useParams();
  const [state, setState] = useState<RpgModulePageState>(initialState);
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

      if (unitId === undefined || unitId.trim().length === 0) {
        startTransition(() => {
          setState({
            error: `RPG ${unitNoun.lowercase} route is missing a unit id.`,
            status: 'error',
            summary: null,
          });
        });
        return;
      }

      try {
        const summary = await loadRpgModuleSummary(
          requireProgrammeScope(programmeScope),
          unitId,
        );

        if (!isActive) {
          return;
        }

        if (summary === null) {
          startTransition(() => {
            setState({
              error: `No RPG ${unitNoun.lowercase} was found for "${unitId}".`,
              status: 'error',
              summary: null,
            });
          });
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
        console.error('RPG week loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: `The RPG ${unitNoun.lowercase} could not be loaded from local data.`,
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
  }, [programmeScope, reloadToken, unitId, unitNoun.lowercase]);

  if (state.status === 'loading' || state.summary === null) {
    if (state.status === 'error') {
      return (
        <section className="page-section rpg-week">
          <div className="rpg-week__header rpg-page-header">
            <div>
              <p className="rpg-week__eyebrow rpg-page-eyebrow">{`RPG ${unitNoun.lowercase}`}</p>
              <h1>{`RPG ${unitNoun.capitalized}`}</h1>
            </div>
            <RpgButton href={rpgMapPath} variant="secondary">
              Back to Campaign Map
            </RpgButton>
          </div>
          <ErrorState
            action={
              unitId !== undefined && unitId.trim().length > 0 ? (
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
              ) : null
            }
            description={
              state.error ?? `Unknown RPG ${unitNoun.lowercase} error.`
            }
            title={`RPG ${unitNoun.lowercase} not found`}
          />
        </section>
      );
    }

    return <RpgWeekLoadingState />;
  }

  const { summary } = state;

  return (
    <section className="page-section rpg-week">
      <div className="rpg-week__header rpg-page-header">
        <div>
          <p className="rpg-week__eyebrow rpg-page-eyebrow">{`RPG ${unitNoun.lowercase}`}</p>
          <h1>{summary.title}</h1>
          <p className="rpg-week__lede rpg-page-lede">
            {`${summary.typeLabel} - ${formatMinutes(
              summary.estimatedMinutes,
            )} estimated study time.`}
          </p>
        </div>
        <div className="rpg-week__actions">
          <RpgButton href={rpgMapPath} variant="secondary">
            Back to Campaign Map
          </RpgButton>
          {summary.officialLink !== null ? (
            <RpgButton
              href={summary.officialLink.url}
              rel="noopener noreferrer"
              target="_blank"
              variant="quiet"
            >
              {summary.officialLink.label}
            </RpgButton>
          ) : null}
        </div>
      </div>

      <div className="rpg-week__grid">
        <RpgPanel
          className="rpg-week__progress-panel"
          title="Module progress"
          titleAs="h2"
          variant="raised"
        >
          <div className="rpg-week__status-row">
            <RpgStatusPill tone={getStatusTone(summary.statusVariant)}>
              {summary.statusLabel}
            </RpgStatusPill>
            <span>{`${summary.completedRequiredItemCount} of ${summary.requiredItemCount} required complete`}</span>
          </div>
          <RpgProgressBar
            helperText="Required tasks only"
            label={`${summary.title} progress`}
            showValue={summary.requiredItemCount > 0}
            tone={getProgressTone(summary.statusVariant)}
            value={summary.completionPercent}
          />
        </RpgPanel>

        <RpgPanel
          className="rpg-week__task-panel"
          description="Choose a task to study, then save your progress when you are ready."
          title="Tasks and resources"
          titleAs="h2"
        >
          <ol className="rpg-week__task-list">
            {summary.quests.map((quest) => (
              <RpgQuestRow
                action={
                  <div className="rpg-week__task-actions">
                    <RpgButton
                      aria-label={`${getResourceActionLabel(quest)}: ${quest.title}`}
                      href={getRpgResourcePath(quest.id)}
                      size="sm"
                      variant="primary"
                    >
                      {getResourceActionLabel(quest)}
                    </RpgButton>
                    <RpgButton
                      aria-label={`Start focus session: ${quest.title}`}
                      href={getRpgFocusPath(quest.id)}
                      size="sm"
                      variant="secondary"
                    >
                      Start focus session
                    </RpgButton>
                  </div>
                }
                data-testid={`rpg-resource-${quest.id}`}
                key={quest.id}
                meta={`${quest.typeLabel} - ${formatMinutes(
                  quest.estimatedMinutes,
                )}`}
                requiredLabel={quest.required ? 'Required' : 'Optional'}
                rewardLabel={quest.rewardLabel}
                status={
                  <RpgStatusPill tone={getStatusTone(quest.statusVariant)}>
                    {quest.statusLabel}
                  </RpgStatusPill>
                }
                summary={
                  quest.longFormProgress !== null &&
                  quest.longFormProgress.hasProgress
                    ? quest.longFormProgress.summaryLine
                    : undefined
                }
                title={quest.title}
              />
            ))}
          </ol>
        </RpgPanel>
      </div>
    </section>
  );
}
