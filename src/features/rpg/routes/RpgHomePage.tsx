import { startTransition, useEffect, useState } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatMinutes } from '@/features/course/model';
import {
  RpgButton,
  RpgEmptyState,
  RpgPanel,
  RpgProgressBar,
  RpgQuestRow,
  RpgRankBadge,
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
          <RpgButton href={continueHref}>Continue current quest</RpgButton>
          <RpgButton href={rpgMapPath} variant="secondary">
            Open RPG map
          </RpgButton>
        </div>
      </div>

      {newUser ? (
        <RpgEmptyState
          description="Start with the recommended quest below. The hub will fill in recent activity, weekly progress, XP, and rank as you save local progress."
          eyebrow="New local profile"
          title="No saved RPG activity yet"
        />
      ) : null}

      <div className="rpg-hub__grid">
        <RpgPanel
          className="rpg-hub__identity"
          title={`${summary.learnerName}'s status`}
          titleAs="h2"
          variant="raised"
        >
          <div className="rpg-hub__identity-row">
            <RpgRankBadge rank={summary.identity.rankLabel} />
            <RpgStatusPill tone="neutral">
              {`Guild: ${summary.identity.guildLabel}`}
            </RpgStatusPill>
          </div>
          <dl className="rpg-hub__details">
            <div>
              <dt>Path</dt>
              <dd>{summary.identity.pathLabel}</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>{summary.identity.classLabel}</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>{summary.xpSummary.level}</dd>
            </div>
            <div>
              <dt>XP</dt>
              <dd>{summary.xpSummary.totalXp}</dd>
            </div>
          </dl>
          <p className="rpg-hub__note">
            Rank reflects local ProgressPal progress only.
          </p>
        </RpgPanel>

        <RpgPanel title="Required course progress" titleAs="h2">
          <RpgProgressBar
            helperText={`${summary.courseProgress.completedRequiredItemCount} of ${summary.courseProgress.requiredItemCount} required tasks complete`}
            label="Required progress"
            showValue={summary.courseProgress.requiredItemCount > 0}
            value={summary.courseProgress.completionPercent}
          />
          <dl className="rpg-hub__details rpg-hub__details--compact">
            <div>
              <dt>XP to next level</dt>
              <dd>{summary.xpSummary.xpToNextLevel}</dd>
            </div>
            <div>
              <dt>Total study time</dt>
              <dd>{formatMinutes(summary.studySummary.totalMinutes)}</dd>
            </div>
          </dl>
        </RpgPanel>

        <RpgPanel
          className="rpg-hub__quest-panel"
          title="Current module"
          titleAs="h2"
        >
          {summary.currentModule === null ? (
            <p className="rpg-hub__note">
              No current module can be selected from the local course map.
            </p>
          ) : (
            <>
              <dl className="rpg-hub__details rpg-hub__details--compact">
                <div>
                  <dt>Week</dt>
                  <dd>{summary.currentModule.title}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{summary.currentModule.statusLabel}</dd>
                </div>
              </dl>
              <RpgProgressBar
                helperText={`${summary.currentModule.completedRequiredItemCount} of ${summary.currentModule.requiredItemCount} required quests complete`}
                label={`${summary.currentModule.title} progress`}
                showValue={summary.currentModule.requiredItemCount > 0}
                value={summary.currentModule.completionPercent}
              />
            </>
          )}

          <div>
            <h3 className="rpg-hub__subheading">Recommended item</h3>
            {currentQuest === null ? (
              <p className="rpg-hub__note">
                No required quest is pending in local progress.
              </p>
            ) : (
              <ol className="rpg-hub__quest-list">
                <RpgQuestRow
                  action={
                    <RpgButton
                      href={getRpgResourcePath(currentQuest.id)}
                      size="sm"
                      variant="quiet"
                    >
                      Open resource
                    </RpgButton>
                  }
                  meta={`${currentQuest.unitTitle} - ${currentQuest.typeLabel} - ${formatMinutes(
                    currentQuest.estimatedMinutes,
                  )}`}
                  requiredLabel={
                    currentQuest.required ? 'Required' : 'Optional'
                  }
                  status={
                    <RpgStatusPill
                      tone={getStatusTone(currentQuest.statusVariant)}
                    >
                      {currentQuest.statusLabel}
                    </RpgStatusPill>
                  }
                  title={currentQuest.title}
                />
              </ol>
            )}
          </div>
        </RpgPanel>

        <RpgPanel title="This week's local progress" titleAs="h2">
          <p className="rpg-hub__note">
            {summary.weeklyProgress.weekStartDate} to{' '}
            {summary.weeklyProgress.weekEndDate}
          </p>
          <dl className="rpg-hub__details">
            <div>
              <dt>Saved progress</dt>
              <dd>{summary.weeklyProgress.savedProgressCount}</dd>
            </div>
            <div>
              <dt>Completed required</dt>
              <dd>{summary.weeklyProgress.completedRequiredItemCount}</dd>
            </div>
            <div>
              <dt>Sessions</dt>
              <dd>{summary.weeklyProgress.sessionCount}</dd>
            </div>
            <div>
              <dt>Study time</dt>
              <dd>{formatMinutes(summary.weeklyProgress.totalMinutes)}</dd>
            </div>
            <div>
              <dt>XP earned</dt>
              <dd>{summary.weeklyProgress.xpEarned}</dd>
            </div>
          </dl>
        </RpgPanel>

        <RpgPanel title="Recent saved activity" titleAs="h2">
          {summary.recentActivity.length === 0 ? (
            <p className="rpg-hub__note">
              No recent saved activity yet. Saved progress, study sessions, and
              XP events will appear here after you record them locally.
            </p>
          ) : (
            <ol className="rpg-hub__activity-list">
              {summary.recentActivity.map((activity) => (
                <li key={activity.id}>
                  <span>{activity.date}</span>
                  <span>{activity.label}</span>
                </li>
              ))}
            </ol>
          )}
        </RpgPanel>
      </div>
    </section>
  );
}
