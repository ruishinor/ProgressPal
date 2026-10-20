import { RpgInfoNote } from '@/features/rpg/components/RpgInfoNote';
import { getQuestActionLabel } from '@/features/rpg/model/presentation';
import {
  loadRpgMicroAvailability,
  type RpgMicroAvailability,
} from '@/features/rpg/model/readModels';
import { useEffect, useState } from 'react';
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
import {
  getRpgResourcePath,
  getRpgTrackPath,
  rpgMapPath,
  rpgMicroPath,
} from '@/lib/routing/rpgRoutePaths';
import type { RpgShellOutletContext } from '@/features/rpg/shell/RpgShell';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope, type ProgrammeScope } from '@/lib/domain';

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

/**
 * What the Microlearning line on Home may promise, from the very function that
 * fills the `/rpg/micro` picker (a read, nothing written). `null` until it has
 * answered for the current summary, when the programme ships no bank, and when
 * the answer failed: Home then says nothing rather than advertise a session
 * that may not exist, and the quest above is never held up waiting for it.
 */
function useMicroOffer(scope: ProgrammeScope, summary: RpgHubSummary | null) {
  const hasBank = scope.content.microlearning !== undefined;
  const [read, setRead] = useState<{
    availability: RpgMicroAvailability;
    summary: RpgHubSummary;
  } | null>(null);

  useEffect(() => {
    if (!hasBank || summary === null) {
      return undefined;
    }
    let active = true;

    void loadRpgMicroAvailability(scope).then((availability) => {
      if (active) {
        setRead({ availability, summary });
      }
    });

    return () => {
      active = false;
    };
  }, [hasBank, scope, summary]);

  if (read === null || read.summary !== summary) {
    return null;
  }
  const { availability } = read;

  return availability.status === 'ready'
    ? {
        primer: availability.primerId !== null,
        repeat: availability.repeatSessions.length > 0,
      }
    : null;
}

/**
 * Shown only on request, behind the (i) of an entry. True to the app: these
 * surfaces write nothing, and XP comes from Campaign work (tasks, focus
 * sessions and content within them).
 */
const campaignRewards =
  'XP, nivåer og Achievements får du gjennom arbeidet i kampanjen.';

/** What Mikroøkt offers right now, from the same answer as its link. */
function getMicroNow(offer: { primer: boolean; repeat: boolean }) {
  if (offer.primer && offer.repeat) {
    return 'Nå kan du både forberede deg og øve igjen.';
  }
  if (offer.primer) {
    return 'Nå kan du forberede deg på neste oppgave.';
  }
  return offer.repeat
    ? 'Nå kan du øve igjen på det du har jobbet med.'
    : 'Akkurat nå er det ingen mikroøkt.';
}

export function RpgHomePage() {
  const scope = requireProgrammeScope(useAppState().programmeScope);
  const { copy, notesOnDemand } = scope.content.terminology;
  const { hubState: state, refreshHub } =
    useOutletContext<RpgShellOutletContext>();
  const microOffer = useMicroOffer(scope, state.summary);
  const tracks = scope.content.microlearning?.tracks ?? [];

  if (state.status === 'loading' || state.summary === null) {
    if (state.status === 'error') {
      return (
        <section className="page-section rpg-hub">
          <h1 className="sr-only">Home</h1>
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
            description={state.error ?? 'Unknown Home error.'}
            title="Home could not be read"
          />
        </section>
      );
    }

    return (
      <section className="page-section rpg-hub">
        <h1 className="sr-only">Home</h1>
        <LoadingState
          description="Building Home from local progress."
          title="Loading Home"
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
      {/* The persistent HUD and navigation already frame Home; the page
          heading stays for assistive technology without repeating chrome. */}
      <h1 className="sr-only">Home</h1>

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
                {recommendation.state === 'required_complete' ? (
                  <RpgInfoNote
                    className="rpg-hub__note"
                    inline={!notesOnDemand}
                    label="About completion"
                  >
                    {copy.rpgRequiredCompleteNote}
                  </RpgInfoNote>
                ) : (
                  <p className="rpg-hub__note">
                    The course could not be summarized. This does not mean your
                    required work is complete.
                  </p>
                )}
                {recommendation.state === 'required_complete' &&
                recommendation.optionalRemainingCount > 0 ? (
                  <p className="rpg-hub__note">{`${recommendation.optionalRemainingCount} optional tasks remain. You can explore them in Campaign.`}</p>
                ) : null}
              </div>
              <RpgButton href={rpgMapPath}>Open Campaign</RpgButton>
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

          {/* Secondary, contextual ways in, after the quest above and never
              instead of it. Mikroøkt: only a programme that ships
              microlearning has it, and the link exists only while the picker
              would list a session; some Campaign phases (Lab, Oppdrag)
              honestly have none, and Home then says so and links nowhere.
              Tracks are open whatever the Campaign position, so their
              entries need no progress read. Each entry is a link with its own
              (i) beside it, never inside it; side by side where there is
              room, stacked where not. */}
          {microOffer === null && tracks.length === 0 ? null : (
            <div
              className="rpg-hub__module-context rpg-hub__entries"
              // An open (i) makes its own entry taller, never moves the other.
              style={{ alignItems: 'start' }}
            >
              {microOffer === null ? null : (
                <div className="rpg-hub__entry">
                  {microOffer.primer || microOffer.repeat ? (
                    <RpgButton href={rpgMicroPath} variant="secondary">
                      Mikroøkt
                    </RpgButton>
                  ) : (
                    <p className="rpg-hub__note">
                      Ingen mikroøkt akkurat nå. Fortsett kampanjen, så åpnes
                      flere.
                    </p>
                  )}
                  <RpgInfoNote label="Om Mikroøkt" size="md">
                    I Mikroøkt kan du forberede deg på kommende oppgaver og øve
                    på det du allerede har jobbet med, gjennom korte oppgaver.{' '}
                    {getMicroNow(microOffer)} {campaignRewards}
                  </RpgInfoNote>
                </div>
              )}
              {tracks.map((track) => (
                <div className="rpg-hub__entry" key={track.id}>
                  <RpgButton
                    href={getRpgTrackPath(track.id)}
                    variant="secondary"
                  >
                    {track.title}
                  </RpgButton>
                  <RpgInfoNote label={`Om ${track.title}`} size="md">
                    {track.about ?? track.summary} {campaignRewards}
                  </RpgInfoNote>
                </div>
              ))}
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
              Open Campaign
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
