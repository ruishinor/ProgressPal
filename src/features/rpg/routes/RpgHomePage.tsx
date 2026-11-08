import { rpgPathwaysPath } from '@/lib/routing/pathwaysPaths';
import uiCopy from '@/ui-copy/interface.json';
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
          <h1 className="sr-only">{uiCopy.surfaces.rpgHome.home}</h1>
          <ErrorState
            action={
              <RpgButton
                onClick={() => {
                  refreshHub();
                }}
                variant="secondary"
              >
                {uiCopy.surfaces.rpgHome.tryAgain}
              </RpgButton>
            }
            description={
              state.error ?? uiCopy.surfaces.rpgHome.unknownHomeError
            }
            title={uiCopy.surfaces.rpgHome.homeCouldNotBeRead}
          />
        </section>
      );
    }

    return (
      <section className="page-section rpg-hub">
        <h1 className="sr-only">{uiCopy.surfaces.rpgHome.home}</h1>
        <LoadingState
          description={uiCopy.surfaces.rpgHome.buildingHomeFromLocalProgress}
          title={uiCopy.surfaces.rpgHome.loadingHome}
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
      <h1 className="sr-only">{uiCopy.surfaces.rpgHome.home}</h1>

      <div className="rpg-hub__grid">
        <RpgPanel
          className="rpg-hub__quest-panel"
          title={
            recommendation.state === 'needs_attention'
              ? uiCopy.surfaces.rpgHome.blockedWorkNeedsAttention
              : currentQuest === null
                ? uiCopy.surfaces.rpgHome.requiredProgress
                : newUser
                  ? uiCopy.surfaces.rpgHome.startWithThisQuest
                  : uiCopy.surfaces.rpgHome.currentQuest
          }
          titleAs="h2"
          variant="raised"
        >
          {currentQuest === null ? (
            <div className="rpg-hub__quest-primary">
              <div>
                <h3>
                  {recommendation.state === 'required_complete'
                    ? uiCopy.surfaces.rpgHome.requiredTasksCompleteInProgressPal
                    : uiCopy.surfaces.rpgHome.courseDataUnavailable}
                </h3>
                {recommendation.state === 'required_complete' ? (
                  <RpgInfoNote
                    className="rpg-hub__note"
                    inline={!notesOnDemand}
                    label={uiCopy.surfaces.rpgHome.aboutCompletion}
                  >
                    {copy.rpgRequiredCompleteNote}
                  </RpgInfoNote>
                ) : (
                  <p className="rpg-hub__note">
                    {
                      uiCopy.surfaces.rpgHome
                        .theCourseCouldNotBeSummarizedThisDoes
                    }
                  </p>
                )}
                {recommendation.state === 'required_complete' &&
                recommendation.optionalRemainingCount > 0 ? (
                  <p className="rpg-hub__note">{`${recommendation.optionalRemainingCount} optional tasks remain. You can explore them in Campaign.`}</p>
                ) : null}
              </div>
              <RpgButton href={rpgMapPath}>
                {uiCopy.surfaces.rpgHome.openCampaign}
              </RpgButton>
            </div>
          ) : (
            <div className="rpg-hub__quest-primary">
              <div className="rpg-hub__quest-copy">
                <p className="rpg-hub__quest-kicker">
                  {recommendation.state === 'needs_attention'
                    ? `${recommendation.remainingRequiredCount} required ${recommendation.remainingRequiredCount === 1 ? 'task still needs' : 'tasks still need'} attention`
                    : newUser
                      ? uiCopy.surfaces.rpgHome.recommendedFirstQuest
                      : uiCopy.surfaces.rpgHome.nextRequiredQuest}
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
                    {currentQuest.required
                      ? uiCopy.surfaces.rpgHome.required
                      : uiCopy.surfaces.rpgHome.optional}
                  </RpgStatusPill>
                </div>
                {recommendation.state === 'needs_attention' ? (
                  <p className="rpg-hub__note">
                    {uiCopy.surfaces.rpgHome.openThisTaskToReviewYourNotesAnd}
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
                  <dt>{uiCopy.surfaces.rpgHome.currentModule}</dt>
                  <dd>{summary.currentModule.title}</dd>
                </div>
                <div>
                  <dt>{uiCopy.surfaces.rpgHome.moduleStatus}</dt>
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
            <h3>{uiCopy.rpg.learnExploreHeading}</h3>
            <div className="rpg-hub__entries rpg-hub__learning-grid">
              <div className="rpg-hub__entry rpg-hub__entry--pathways">
                <RpgButton href={rpgPathwaysPath} variant="secondary">
                  {uiCopy.surfaces.rpgHome.pathways}
                </RpgButton>
                <RpgInfoNote
                  label={uiCopy.surfaces.rpgHome.omPathways}
                  size="md"
                >
                  {
                    uiCopy.surfaces.rpgHome
                      .laerFerdigheterDuKanBrukeUansettStudieprogramGit
                  }
                </RpgInfoNote>
              </div>
              <div className="rpg-hub__entry rpg-hub__entry--reference">
                <RpgButton href={rpgReferencePath} variant="secondary">
                  {uiCopy.surfaces.rpgHome.teknologioppslag}
                </RpgButton>
                <RpgInfoNote
                  label={uiCopy.surfaces.rpgHome.omTeknologioppslag}
                  size="md"
                >
                  {
                    uiCopy.surfaces.rpgHome
                      .finnForklaringerPaBegreperVerktoyOgSammenhengerNar
                  }
                </RpgInfoNote>
              </div>
              {microOffer === null ? null : (
                <div className="rpg-hub__entry rpg-hub__entry--micro">
                  {microOffer.primer || microOffer.repeat ? (
                    <>
                      <RpgButton href={rpgMicroPath} variant="secondary">
                        {uiCopy.surfaces.rpgHome.mikrookt}
                      </RpgButton>
                      <RpgInfoNote
                        label={uiCopy.surfaces.rpgHome.omMikrookt}
                        size="md"
                      >
                        {
                          uiCopy.surfaces.rpgHome
                            .korteOppgaverSomHjelperDegAForberedeDeg
                        }
                      </RpgInfoNote>
                    </>
                  ) : (
                    <p className="rpg-hub__note">
                      {
                        uiCopy.surfaces.rpgHome
                          .ingenMikrooktAkkuratNaFortsettICampaignFor
                      }
                    </p>
                  )}
                </div>
              )}
              {tracks.map((track) => (
                <div
                  className="rpg-hub__entry rpg-hub__entry--track"
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
          title={uiCopy.surfaces.rpgHome.progressSnapshot}
          titleAs="h2"
        >
          {recommendation.state !== 'unavailable' ? (
            <RpgProgressBar
              helperText={`${summary.courseProgress.completedRequiredItemCount} of ${summary.courseProgress.requiredItemCount} required tasks complete`}
              label={uiCopy.surfaces.rpgHome.requiredCourseProgress}
              showValue={summary.courseProgress.requiredItemCount > 0}
              value={summary.courseProgress.completionPercent}
            />
          ) : (
            <p className="rpg-hub__note">
              {uiCopy.surfaces.rpgHome.requiredCourseTotalsAreUnavailable}
            </p>
          )}
          <p className="rpg-hub__note">
            {`This week: ${summary.weeklyProgress.weekStartDate} to ${summary.weeklyProgress.weekEndDate}`}
          </p>
          <dl className="rpg-hub__details rpg-hub__details--summary">
            <div>
              <dt>{uiCopy.surfaces.rpgHome.tasksLastUpdated}</dt>
              <dd>{summary.weeklyProgress.savedProgressCount}</dd>
            </div>
            <div>
              <dt>{uiCopy.surfaces.rpgHome.studyTime}</dt>
              <dd>{formatMinutes(summary.weeklyProgress.totalMinutes)}</dd>
            </div>
            <div>
              <dt>{uiCopy.surfaces.rpgHome.sessions}</dt>
              <dd>{summary.weeklyProgress.sessionCount}</dd>
            </div>
            <div>
              <dt>{uiCopy.surfaces.rpgHome.xP}</dt>
              <dd>{summary.weeklyProgress.xpEarned}</dd>
            </div>
          </dl>
          <details className="rpg-hub__activity-disclosure">
            <summary>{uiCopy.surfaces.rpgHome.howTasksAreCounted}</summary>
            <p>{uiCopy.surfaces.rpgHome.eachTaskIsCountedOnceByItsLatest}</p>
          </details>
          {currentQuest === null ? null : (
            <RpgButton href={rpgMapPath} variant="secondary">
              {uiCopy.surfaces.rpgHome.openCampaign}
            </RpgButton>
          )}
        </RpgPanel>

        {summary.recentActivity.length === 0 ? null : (
          <details className="rpg-hub__activity-disclosure">
            <summary>{uiCopy.surfaces.rpgHome.recentSavedActivity}</summary>
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
