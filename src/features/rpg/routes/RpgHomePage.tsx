import { getQuestActionLabel } from '@/features/rpg/model/presentation';
import { useOutletContext } from 'react-router-dom';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatMinutes } from '@/lib/time';
import {
  RpgButton,
  RpgPanel,
  RpgProgressBar,
  RpgStatusPill,
  type RpgStatusTone,
} from '@/features/rpg/components';
import type {
  RpgHubSummary,
  RpgQuestSummary,
} from '@/features/rpg/model/types';
import { getRpgResourcePath, rpgMapPath } from '@/lib/routing/rpgRoutePaths';
import type { RpgShellOutletContext } from '@/features/rpg/shell/RpgShell';
import { getActiveProgrammeDefinition } from '@/programmes';

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

function hasLocalActivity(summary: RpgHubSummary) {
  return (
    summary.courseProgress.completedRequiredItemCount > 0 ||
    summary.recentActivity.length > 0 ||
    summary.studySummary.sessionCount > 0 ||
    summary.xpSummary.totalXp > 0
  );
}

export function RpgHomePage() {
  const { copy } = getActiveProgrammeDefinition().content.terminology;
  const { hubState: state, refreshHub } =
    useOutletContext<RpgShellOutletContext>();

  if (state.status === 'loading' || state.summary === null) {
    if (state.status === 'error') {
      return (
        <section className="page-section rpg-hub">
          <div className="rpg-hub__header rpg-page-header">
            <p className="rpg-hub__eyebrow rpg-page-eyebrow">RPG</p>
            <h1>RPG Hub</h1>
          </div>
          <ErrorState
            action={
              <RpgButton
                onClick={() => {
                  refreshHub();
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
        <div className="rpg-hub__header rpg-page-header">
          <p className="rpg-hub__eyebrow rpg-page-eyebrow">RPG</p>
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
  const { recommendation } = summary;
  const currentQuest = recommendation.quest;
  const newUser = !hasLocalActivity(summary);

  return (
    <section className="page-section rpg-hub">
      <div className="rpg-hub__header rpg-page-header">
        <div>
          <h1>RPG Hub</h1>
        </div>
      </div>

      <div className="rpg-hub__grid">
        <RpgPanel
          className="rpg-hub__quest-panel"
          title={
            recommendation.state === 'needs_attention'
              ? 'Blocked work needs attention'
              : currentQuest === null
                ? 'Required progress'
                : newUser
                  ? 'Start with this quest'
                  : 'Current quest'
          }
          titleAs="h2"
          variant="raised"
        >
          {currentQuest === null ? (
            <div className="rpg-hub__quest-primary">
              <div>
                <h3>
                  {recommendation.state === 'required_complete'
                    ? 'Required tasks complete in ProgressPal'
                    : 'Course data unavailable'}
                </h3>
                <p className="rpg-hub__note">
                  {recommendation.state === 'required_complete'
                    ? copy.rpgRequiredCompleteNote
                    : 'The course could not be summarized. This does not mean your required work is complete.'}
                </p>
                {recommendation.state === 'required_complete' &&
                recommendation.optionalRemainingCount > 0 ? (
                  <p className="rpg-hub__note">{`${recommendation.optionalRemainingCount} optional tasks remain. You can explore them on the Campaign Map.`}</p>
                ) : null}
              </div>
              <RpgButton href={rpgMapPath}>Open Campaign Map</RpgButton>
            </div>
          ) : (
            <div className="rpg-hub__quest-primary">
              <div className="rpg-hub__quest-copy">
                <p className="rpg-hub__quest-kicker">
                  {recommendation.state === 'needs_attention'
                    ? `${recommendation.remainingRequiredCount} required ${recommendation.remainingRequiredCount === 1 ? 'task still needs' : 'tasks still need'} attention`
                    : newUser
                      ? 'Recommended first quest'
                      : 'Next required quest'}
                </p>
                <h3>{currentQuest.title}</h3>
                <p className="rpg-quest-reward">{currentQuest.rewardLabel}</p>
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
                {recommendation.state === 'needs_attention' ? (
                  <p className="rpg-hub__note">
                    Open this task to review your notes and decide how to
                    continue. Blocked tasks remain available.
                  </p>
                ) : null}
              </div>
              <RpgButton href={getRpgResourcePath(currentQuest.id)}>
                {getQuestActionLabel(currentQuest.status)}
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
          {recommendation.state !== 'unavailable' ? (
            <RpgProgressBar
              helperText={`${summary.courseProgress.completedRequiredItemCount} of ${summary.courseProgress.requiredItemCount} required tasks complete`}
              label="Required course progress"
              showValue={summary.courseProgress.requiredItemCount > 0}
              value={summary.courseProgress.completionPercent}
            />
          ) : (
            <p className="rpg-hub__note">
              Required-course totals are unavailable.
            </p>
          )}
          <p className="rpg-hub__note">
            {`This week: ${summary.weeklyProgress.weekStartDate} to ${summary.weeklyProgress.weekEndDate}`}
          </p>
          <dl className="rpg-hub__details rpg-hub__details--summary">
            <div>
              <dt>Tasks last updated</dt>
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
          <details className="rpg-hub__activity-disclosure">
            <summary>How tasks are counted</summary>
            <p>Each task is counted once, by its latest saved change.</p>
          </details>
          {currentQuest === null ? null : (
            <RpgButton href={rpgMapPath} variant="secondary">
              Open Campaign Map
            </RpgButton>
          )}
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
