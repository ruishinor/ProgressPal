import { rpgPathwaysPath } from '@/lib/routing/pathwaysPaths';
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
import { formatEstimatedMinutes, formatMinutes } from '@/lib/time';
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
  rpgReferencePath,
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
                  {`${currentQuest.unitTitle} - ${currentQuest.typeLabel} - ${formatEstimatedMinutes(
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
                <div className="rpg-hub__stat rpg-hub__stat--current-module">
                  <dt>Current module</dt>
                  <dd>{summary.currentModule.title}</dd>
                </div>
                <div className="rpg-hub__stat rpg-hub__stat--module-status">
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

          {/* Secondary learning surfaces; actual programme availability owns
              whether Microlearning/tracks are offered. Independent (i)
              disclosures never nest inside navigation links. */}
          <div className="rpg-hub__module-context rpg-hub__learning" lang="nb">
            <h3>Lær og utforsk</h3>
            <div className="rpg-hub__entries rpg-hub__learning-grid">
              <div className="rpg-hub__entry rpg-hub__entry--pathways">
                <RpgButton href={rpgPathwaysPath} variant="secondary">
                  Pathways
                </RpgButton>
                <RpgInfoNote label="Om Pathways" size="md">
                  I Pathways finner du læringsveier som viser hvor du kan
                  begynne, hva du bør lære videre, og hvordan stegene henger
                  sammen. Foreløpig kan du begynne med Git og GitHub.
                </RpgInfoNote>
              </div>
              <div className="rpg-hub__entry rpg-hub__entry--reference">
                <RpgButton href={rpgReferencePath} variant="secondary">
                  Teknologioppslag
                </RpgButton>
                <RpgInfoNote label="Om Teknologioppslag" size="md">
                  Finn forklaringer på begreper, verktøy og sammenhenger når du
                  trenger dem.
                </RpgInfoNote>
              </div>
              {microOffer === null ? null : (
                <div className="rpg-hub__entry rpg-hub__entry--micro">
                  {microOffer.primer || microOffer.repeat ? (
                    <>
                      <RpgButton href={rpgMicroPath} variant="secondary">
                        Mikroøkt
                      </RpgButton>
                      <RpgInfoNote label="Om Mikroøkt" size="md">
                        Korte oppgaver som hjelper deg å forberede deg på nytt
                        stoff eller repetere det du har lært.
                      </RpgInfoNote>
                    </>
                  ) : (
                    <p className="rpg-hub__note">
                      Ingen mikroøkt akkurat nå. Fortsett i Campaign for å åpne
                      flere.
                    </p>
                  )}
                </div>
              )}
              {tracks.map((track) => (
                <div
                  className={
                    track.id === 'tenk-som-en-utvikler'
                      ? 'rpg-hub__entry rpg-hub__entry--utviklerblikk'
                      : 'rpg-hub__entry rpg-hub__entry--track'
                  }
                  key={track.id}
                >
                  <RpgButton
                    href={getRpgTrackPath(track.id)}
                    variant="secondary"
                  >
                    {track.title}
                  </RpgButton>
                  <RpgInfoNote label={`Om ${track.title}`} size="md">
                    {track.about ?? track.summary}
                  </RpgInfoNote>
                </div>
              ))}
            </div>
          </div>
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
            <div className="rpg-hub__stat rpg-hub__stat--tasks">
              <dt>Tasks last updated</dt>
              <dd>{summary.weeklyProgress.savedProgressCount}</dd>
            </div>
            <div className="rpg-hub__stat rpg-hub__stat--study-time">
              <dt>Study time</dt>
              <dd>{formatMinutes(summary.weeklyProgress.totalMinutes)}</dd>
            </div>
            <div className="rpg-hub__stat rpg-hub__stat--sessions">
              <dt>Sessions</dt>
              <dd>{summary.weeklyProgress.sessionCount}</dd>
            </div>
            <div className="rpg-hub__stat rpg-hub__stat--xp">
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
