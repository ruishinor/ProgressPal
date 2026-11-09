import uiCopy from '@/ui-copy/interface.json';
import { startTransition, useEffect, useState } from 'react';
import { ActivityIndicator } from '@/features/rpg/activity/ActivityIndicator';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatMinutes } from '@/lib/time';
import { RpgAchievementArt } from '@/features/rpg/components/RpgAchievementArt';
import { RpgInfoNote } from '@/features/rpg/components/RpgInfoNote';
import {
  RpgButton,
  RpgEmptyState,
  RpgPanel,
  RpgProgressBar,
  RpgHeroIdentity,
  RpgLevelProgress,
} from '@/features/rpg/components';
import { loadRpgHeroProfileSummary } from '@/features/rpg/model/readModels';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope } from '@/lib/domain';
import type { RpgHeroProfileSummary } from '@/features/rpg/model/types';
import {
  rpgBadgesPath,
  rpgLogPath,
  rpgRoutePath,
  rpgSettingsPath,
} from '@/lib/routing/rpgRoutePaths';

type RpgHeroPageStatus = 'error' | 'loading' | 'ready';

type RpgHeroPageState = {
  error: string | null;
  status: RpgHeroPageStatus;
  summary: RpgHeroProfileSummary | null;
};

const initialState: RpgHeroPageState = {
  error: null,
  status: 'loading',
  summary: null,
};

export function RpgHeroPage() {
  const { programmeScope } = useAppState();
  const { copy, notesOnDemand } = requireProgrammeScope(
    useAppState().programmeScope,
  ).content.terminology;
  const [state, setState] = useState<RpgHeroPageState>(initialState);
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
        const summary = await loadRpgHeroProfileSummary(
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
        console.error('RPG hero profile loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: 'The Hero Profile could not be loaded from local data.',
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
        <section className="page-section rpg-hero">
          <div className="rpg-hero__header rpg-page-header">
            <p className="rpg-hero__eyebrow rpg-page-eyebrow">
              {uiCopy.surfaces.rpgHero.rPG}
            </p>
            <h1>{uiCopy.surfaces.rpgHero.heroProfile}</h1>
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
                {uiCopy.surfaces.rpgHero.tryAgain}
              </RpgButton>
            }
            description={
              state.error ?? uiCopy.surfaces.rpgHero.unknownHeroProfileError
            }
            title={uiCopy.surfaces.rpgHero.heroProfileCouldNotBeRead}
          />
        </section>
      );
    }

    return (
      <section className="page-section rpg-hero">
        <div className="rpg-hero__header rpg-page-header">
          <h1>{uiCopy.surfaces.rpgHero.heroProfile}</h1>
        </div>
        <LoadingState
          description={
            uiCopy.surfaces.rpgHero
              .buildingTheProfileFromLocalProgressXPSessions
          }
          title={uiCopy.surfaces.rpgHero.loadingHeroProfile}
        />
      </section>
    );
  }

  const { summary } = state;

  return (
    <section className="page-section rpg-hero">
      <div className="rpg-hero__header rpg-page-header">
        <div>
          <p className="rpg-hero__eyebrow rpg-page-eyebrow">
            {uiCopy.surfaces.rpgHero.rPG}
          </p>
          <h1>{uiCopy.surfaces.rpgHero.heroProfile}</h1>
          <p className="rpg-hero__lede rpg-page-lede">
            {
              uiCopy.surfaces.rpgHero
                .yourStudyProgressMilestonesAndSavedActivity
            }
          </p>
        </div>
        <div className="rpg-hero__actions">
          <RpgButton href={rpgSettingsPath} variant="secondary">
            {uiCopy.surfaces.rpgHero.editProfile}
          </RpgButton>
        </div>
      </div>

      <div className="rpg-hero__grid">
        <RpgPanel
          className="rpg-hero__identity"
          aria-label={uiCopy.surfaces.rpgHero.learnerIdentityAndProgression}
          variant="raised"
        >
          <div className="rpg-hero__identity-layout">
            <RpgHeroIdentity
              avatarConfig={summary.learnerAvatarConfig}
              identity={summary.identity}
              name={summary.learnerName}
              variant="profile"
              secondaryStatistic={<ActivityIndicator />}
            />
            <RpgLevelProgress xp={summary.xpSummary} />
          </div>
        </RpgPanel>

        <RpgPanel
          className="rpg-hero__recent"
          title={uiCopy.surfaces.rpgHero.recentBadges}
          titleAs="h2"
        >
          {summary.recentBadges.length === 0 ? (
            <p className="rpg-hero__note">
              {uiCopy.surfaces.rpgHero.theBadgesYouEarnWillAppearHere}
            </p>
          ) : (
            <ul className="rpg-hero__badges">
              {summary.recentBadges.map((badge) => (
                <li key={badge.id}>
                  <RpgAchievementArt achievementId={badge.id} />
                  <span>{badge.title}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="rpg-hero__actions">
            <RpgButton href={rpgBadgesPath} size="sm" variant="quiet">
              {uiCopy.surfaces.rpgHero.viewAllBadges}
            </RpgButton>
          </div>
        </RpgPanel>

        {summary.hasLocalActivity ? null : (
          <RpgEmptyState
            className="rpg-hero__recent"
            action={
              <RpgButton href={rpgRoutePath}>
                {uiCopy.surfaces.rpgHero.openHome}
              </RpgButton>
            }
            description={
              uiCopy.surfaces.rpgHero.saveProgressOrFinishAFocusSessionTo
            }
            title={uiCopy.surfaces.rpgHero.noSavedHeroActivityYet}
          />
        )}

        <RpgPanel
          title={uiCopy.surfaces.rpgHero.requiredCourseProgress}
          titleAs="h2"
        >
          <RpgProgressBar
            helperText={`${summary.courseProgress.completedRequiredItemCount} of ${summary.courseProgress.requiredItemCount} required tasks complete`}
            label={uiCopy.surfaces.rpgHero.requiredProgress}
            showValue={summary.courseProgress.requiredItemCount > 0}
            value={summary.courseProgress.completionPercent}
          />
          <RpgInfoNote
            className="rpg-hero__note"
            inline={!notesOnDemand}
            label={uiCopy.surfaces.rpgHero.aboutRequiredProgress}
          >
            {copy.rpgHeroProgressNote}
          </RpgInfoNote>
        </RpgPanel>

        <RpgPanel
          title={uiCopy.surfaces.rpgHero.localActivityTotals}
          titleAs="h2"
        >
          <dl className="rpg-hero__details rpg-hero__details--compact">
            <div>
              <dt>{uiCopy.surfaces.rpgHero.studySessions}</dt>
              <dd>{summary.studySummary.sessionCount}</dd>
            </div>
            <div>
              <dt>{uiCopy.surfaces.rpgHero.studyTime}</dt>
              <dd>{formatMinutes(summary.studySummary.totalMinutes)}</dd>
            </div>
            <div>
              <dt>{uiCopy.surfaces.rpgHero.xPToNextLevel}</dt>
              <dd>{summary.xpSummary.xpToNextLevel}</dd>
            </div>
            <div>
              <dt>{uiCopy.surfaces.rpgHero.badges}</dt>
              <dd>{`${summary.badges.earnedBadgeCount} of ${summary.badges.totalBadgeCount}`}</dd>
            </div>
          </dl>
          <div className="rpg-hero__actions">
            <RpgButton href={rpgBadgesPath} size="sm" variant="quiet">
              {uiCopy.surfaces.rpgHero.openBadgeGallery}
            </RpgButton>
            <RpgButton href={rpgLogPath} size="sm" variant="quiet">
              {uiCopy.surfaces.rpgHero.openInsights}
            </RpgButton>
          </div>
        </RpgPanel>

        <RpgPanel
          className="rpg-hero__recent"
          title={uiCopy.surfaces.rpgHero.recentSavedActivity}
          titleAs="h2"
        >
          {summary.recentActivity.length === 0 ? (
            <p className="rpg-hero__note">
              {
                uiCopy.surfaces.rpgHero
                  .yourSavedProgressStudySessionsAndAchievementsWill
              }
            </p>
          ) : (
            <ol className="rpg-hero__activity-list">
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
