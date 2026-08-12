import { startTransition, useEffect, useState } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatMinutes } from '@/features/course/model';
import {
  RpgButton,
  RpgPanel,
  RpgProgressBar,
  RpgStatusPill,
  type RpgStatusTone,
} from '@/features/rpg/components';
import { loadRpgHubSummary } from '@/features/rpg/model/readModels';
import type {
  RpgHubSummary,
  RpgQuestSummary,
} from '@/features/rpg/model/types';
import {
  getRpgResourcePath,
  getRpgWeekPath,
  rpgMapPath,
} from '@/lib/routing/rpgRoutePaths';

type RpgHomePageStatus = 'error' | 'loading' | 'ready';

type RpgHomePageState = {
  error: string | null;
  status: RpgHomePageStatus;
  summary: RpgHubSummary | null;
};

const initialState: RpgHomePageState = {
  error: null,
  status: 'loading',
  summary: null,
};

function getStatusTone(statusVariant: RpgQuestSummary['statusVariant']) {
  const tones: Record<RpgQuestSummary['statusVariant'], RpgStatusTone> = {
    blocked: 'danger',
    completed: 'success',
    inProgress: 'progress',
    notStarted: 'neutral',
    optional: 'neutral',
  };

  return tones[statusVariant];
}

function getContinueHref(summary: RpgHubSummary) {
  if (summary.continueQuest !== null) {
    return getRpgResourcePath(summary.continueQuest.id);
  }

  if (summary.currentModule !== null) {
    return getRpgWeekPath(summary.currentModule.id);
  }

  return rpgMapPath;
}

function hasLocalActivity(summary: RpgHubSummary) {
  return (
    summary.courseProgress.completedRequiredItemCount > 0 ||
    summary.recentActivity.length > 0 ||
    summary.studySummary.sessionCount > 0 ||
    summary.xpSummary.totalXp > 0
  );
}

export function RpgHomePage() {
  const [state, setState] = useState<RpgHomePageState>(initialState);
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
        const summary = await loadRpgHubSummary();

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
        console.error('RPG hub loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: 'The RPG hub summary could not be loaded from local data.',
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
        <section className="page-section rpg-hub">
          <div className="rpg-hub__header">
            <p className="rpg-hub__eyebrow">RPG</p>
            <h1>RPG Hub</h1>
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
            description={state.error ?? 'Unknown RPG hub error.'}
            title="RPG hub could not be read"
          />
        </section>
      );
    }

    return (
      <section className="page-section rpg-hub">
        <div className="rpg-hub__header">
          <p className="rpg-hub__eyebrow">RPG</p>
          <h1>RPG Hub</h1>
        </div>
        <LoadingState
          description="Building the RPG hub from local progress."
          title="Loading RPG hub"
        />
      </section>
    );
  }

  const { summary } = state;
  const continueHref = getContinueHref(summary);
  const currentQuest = summary.continueQuest;
  const newUser = !hasLocalActivity(summary);

  return (
    <section className="page-section rpg-hub">
      <div className="rpg-hub__header">
        <div>
          <p className="rpg-hub__eyebrow">RPG</p>
          <h1>RPG Hub</h1>
          <p className="rpg-hub__lede">
            Local quest hub for {summary.learnerName}.
          </p>
        </div>
        <div className="rpg-hub__actions">
          <RpgButton href={rpgMapPath} variant="secondary">
            Open Campaign Map
          </RpgButton>
        </div>
      </div>

      <div className="rpg-hub__grid">
        <RpgPanel
          className="rpg-hub__quest-panel"
          title={newUser ? 'Start with this quest' : 'Current quest'}
          titleAs="h2"
          variant="raised"
        >
          {currentQuest === null ? (
            <div className="rpg-hub__quest-primary">
              <div>
                <p className="rpg-hub__quest-kicker">
                  No required quest pending
                </p>
                <p className="rpg-hub__note">
                  Review the current module or Campaign Map to choose the next
                  local study task.
                </p>
              </div>
              <RpgButton href={continueHref}>
                {summary.currentModule === null
                  ? 'Open Campaign Map'
                  : 'Open current module'}
              </RpgButton>
            </div>
          ) : (
            <div className="rpg-hub__quest-primary">
              <div className="rpg-hub__quest-copy">
                <p className="rpg-hub__quest-kicker">
                  {newUser ? 'Recommended first quest' : 'Next required quest'}
                </p>
                <h3>{currentQuest.title}</h3>
                <p className="rpg-hub__quest-meta">
                  {`${currentQuest.unitTitle} - ${currentQuest.typeLabel} - ${formatMinutes(
                    currentQuest.estimatedMinutes,
                  )}`}
                </p>
                <div className="rpg-hub__quest-statuses">
                  <RpgStatusPill
                    tone={getStatusTone(currentQuest.statusVariant)}
                  >
                    {currentQuest.statusLabel}
                  </RpgStatusPill>
                  <RpgStatusPill tone="neutral">
                    {currentQuest.required ? 'Required' : 'Optional'}
                  </RpgStatusPill>
                </div>
              </div>
              <RpgButton href={getRpgResourcePath(currentQuest.id)}>
                Continue quest
              </RpgButton>
            </div>
          )}

          {summary.currentModule === null ? null : (
            <div className="rpg-hub__module-context">
              <dl className="rpg-hub__details rpg-hub__details--compact">
                <div>
                  <dt>Current module</dt>
                  <dd>{summary.currentModule.title}</dd>
                </div>
                <div>
                  <dt>Module status</dt>
                  <dd>{summary.currentModule.statusLabel}</dd>
                </div>
              </dl>
              <RpgProgressBar
                helperText={`${summary.currentModule.completedRequiredItemCount} of ${summary.currentModule.requiredItemCount} required quests complete`}
                label={`${summary.currentModule.title} progress`}
                showValue={summary.currentModule.requiredItemCount > 0}
                value={summary.currentModule.completionPercent}
              />
            </div>
          )}
        </RpgPanel>

        <RpgPanel
          className="rpg-hub__progress-summary"
          title="Progress snapshot"
          titleAs="h2"
        >
          <RpgProgressBar
            helperText={`${summary.courseProgress.completedRequiredItemCount} of ${summary.courseProgress.requiredItemCount} required tasks complete`}
            label="Required course progress"
            showValue={summary.courseProgress.requiredItemCount > 0}
            value={summary.courseProgress.completionPercent}
          />
          <p className="rpg-hub__note">
            {`This week: ${summary.weeklyProgress.weekStartDate} to ${summary.weeklyProgress.weekEndDate}`}
          </p>
          <dl className="rpg-hub__details rpg-hub__details--summary">
            <div>
              <dt>Required complete</dt>
              <dd>{`${summary.courseProgress.completedRequiredItemCount} / ${summary.courseProgress.requiredItemCount}`}</dd>
            </div>
            <div>
              <dt>Saved updates</dt>
              <dd>{summary.weeklyProgress.savedProgressCount}</dd>
            </div>
            <div>
              <dt>Study time</dt>
              <dd>{formatMinutes(summary.weeklyProgress.totalMinutes)}</dd>
            </div>
            <div>
              <dt>Sessions</dt>
              <dd>{summary.weeklyProgress.sessionCount}</dd>
            </div>
            <div>
              <dt>XP</dt>
              <dd>{summary.weeklyProgress.xpEarned}</dd>
            </div>
          </dl>
        </RpgPanel>

        {summary.recentActivity.length === 0 ? null : (
          <details className="rpg-hub__activity-disclosure">
            <summary>Recent saved activity</summary>
            <ol className="rpg-hub__activity-list">
              {summary.recentActivity.map((activity) => (
                <li key={activity.id}>
                  <span>{activity.date}</span>
                  <span>{activity.label}</span>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </section>
  );
}
