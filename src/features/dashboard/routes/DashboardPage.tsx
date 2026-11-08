import uiCopy from '@/ui-copy/interface.json';
import { pathwaysPath } from '@/lib/routing/pathwaysPaths';
import { startTransition, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusPill, type StatusPillVariant } from '@/components/ui/StatusPill';
import { buildCourseMap } from '@/features/course/model';
import { getCourseItemDetailPath } from '@/features/course/paths';
import {
  buildDashboardModel,
  type DashboardContinueNextReason,
  type DashboardCourseProgress,
  type DashboardModel,
} from '@/features/dashboard/model';
import { buildLongFormProgressMap } from '@/lib/progress';
import {
  getAchievementsView,
  getCatalogueCourseState,
  getXpSummary,
  listStudySessions,
  listXpTransactions,
} from '@/lib/db';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope } from '@/lib/domain';
import { rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

type DashboardPageStatus = 'error' | 'loading' | 'ready';

type DashboardPageState = {
  error: string | null;
  model: DashboardModel | null;
  status: DashboardPageStatus;
};

const initialState: DashboardPageState = {
  error: null,
  model: null,
  status: 'loading',
};

function courseStatusVariant(
  progress: DashboardCourseProgress,
): StatusPillVariant {
  if (progress.blockedItemCount > 0) {
    return 'blocked';
  }

  if (
    progress.requiredItemCount > 0 &&
    progress.completedRequiredItemCount === progress.requiredItemCount
  ) {
    return 'completed';
  }

  if (progress.completedRequiredItemCount > 0) {
    return 'inProgress';
  }

  return 'notStarted';
}

function continueNextReasonLabel(reason: DashboardContinueNextReason) {
  return reason === 'in_progress'
    ? 'Continue where you left off'
    : 'Recommended next step';
}

export function DashboardPage() {
  const { programmeScope } = useAppState();
  const { copy } = requireProgrammeScope(useAppState().programmeScope).content
    .terminology;
  const [state, setState] = useState<DashboardPageState>(initialState);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      startTransition(() => {
        setState((currentState) => ({
          ...currentState,
          error: null,
          status: 'loading',
        }));
      });

      try {
        // All reads only. The dashboard derives every value from existing
        // source-of-truth stores and existing read models; it persists nothing.
        // Catalogue-derived course, progress, media and resume context is
        // the active catalogue's (Epic C / C5). Sessions (OD-4), the XP
        // ledger and level (OD-1) and unlocks (OD-2) stay global.
        const scope = requireProgrammeScope(programmeScope);
        const [
          {
            contentAssets,
            contentSlices,
            courseItems: items,
            courseUnits: units,
            mediaProgressEvents,
            progressEntries,
            resumePoints,
          },
          studySessions,
          xpTransactions,
          xpSummary,
          achievements,
        ] = await Promise.all([
          getCatalogueCourseState({ catalogueId: scope.catalogueId }),
          listStudySessions(),
          listXpTransactions({ programmeId: scope.programmeId }),
          getXpSummary({
            programmeId: scope.programmeId,
            levelCurve: scope.policy.levelCurve,
          }),
          getAchievementsView({ policy: scope.policy }),
        ]);

        if (!isActive) {
          return;
        }

        const longFormByItemId = buildLongFormProgressMap(
          contentAssets,
          contentSlices,
          mediaProgressEvents,
          resumePoints,
          progressEntries,
        );
        const courseMap = buildCourseMap(
          units,
          items,
          progressEntries,
          longFormByItemId,
          requireProgrammeScope(programmeScope).policy.catalogueRules,
        );
        const model = buildDashboardModel({
          achievements,
          courseMap,
          longFormByItemId,
          mediaProgressEvents,
          progressEntries,
          resumePoints,
          studySessions,
          xpSummary,
          xpTransactions,
        });

        startTransition(() => {
          setState({ error: null, model, status: 'ready' });
        });
      } catch (loadError) {
        console.error('Dashboard loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: 'The local dashboard could not be loaded.',
            model: null,
            status: 'error',
          });
        });
      }
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [programmeScope, reloadToken]);

  if (state.status === 'error') {
    return (
      <section className="page-section">
        <PageHeader
          description={copy.dashboardErrorDescription}
          title={uiCopy.surfaces.classicDashboard.dashboard}
        />
        <ErrorState
          action={
            <button
              className="button button--secondary button--md"
              onClick={() => {
                startTransition(() => {
                  setState(initialState);
                });
                setReloadToken((currentToken) => currentToken + 1);
              }}
              type="button"
            >
              {uiCopy.surfaces.classicDashboard.tryAgain}
            </button>
          }
          description={
            state.error ??
            uiCopy.surfaces.classicDashboard.unknownLocalDashboardError
          }
          title={uiCopy.surfaces.classicDashboard.localDataCouldNotBeRead}
        />
      </section>
    );
  }

  if (state.status === 'loading' || state.model === null) {
    return (
      <section className="page-section">
        <PageHeader
          description={
            uiCopy.surfaces.classicDashboard
              .theAppIsReadingYourLocalProgressSessions
          }
          title={uiCopy.surfaces.classicDashboard.dashboard}
        />
        <LoadingState
          description={uiCopy.surfaces.classicDashboard.buildingYourDashboard}
          title={uiCopy.surfaces.classicDashboard.loadingYourLocalData}
        />
      </section>
    );
  }

  const {
    achievements,
    blockedItems,
    continueNext,
    courseProgress,
    recentActivity,
    resume,
    studySummary,
    xpSummary,
  } = state.model;

  return (
    <section className="page-section">
      <PageHeader
        actions={
          <div className="action-row">
            <Link
              className="button button--secondary button--md"
              to={pathwaysPath}
            >
              {uiCopy.surfaces.classicDashboard.pathways}
            </Link>
            <Link className="button button--secondary button--md" to="/course">
              {uiCopy.surfaces.classicDashboard.courseMap}
            </Link>
            <Link
              className="button button--secondary button--md"
              to="/sessions"
            >
              {uiCopy.surfaces.classicDashboard.sessions}
            </Link>
            <Link
              className="button button--secondary button--md"
              to="/achievements"
            >
              {uiCopy.surfaces.classicDashboard.achievements}
            </Link>
            <Link
              className="button button--secondary button--md"
              to={rpgRoutePath}
            >
              {uiCopy.surfaces.classicDashboard.openRPG}
            </Link>
          </div>
        }
        description={copy.dashboardDescription}
        meta={
          <>
            <StatusPill variant={courseStatusVariant(courseProgress)}>
              {courseProgress.statusLabel}
            </StatusPill>
            <Badge tone="accent">{`Level ${xpSummary.level}`}</Badge>
          </>
        }
        title={uiCopy.surfaces.classicDashboard.dashboard}
      />

      <div className="dashboard-grid">
        <Card title={uiCopy.surfaces.classicDashboard.courseProgress}>
          <ProgressBar
            helperText={`${courseProgress.completedRequiredItemCount} of ${courseProgress.requiredItemCount} required tasks complete`}
            label={uiCopy.surfaces.classicDashboard.requiredCourseProgress}
            tone={
              courseProgress.blockedItemCount > 0
                ? 'warning'
                : courseProgress.completionPercent === 100
                  ? 'success'
                  : 'accent'
            }
            value={courseProgress.completionPercent}
          />
          <dl className="profile-summary-list">
            <div>
              <dt>{uiCopy.surfaces.classicDashboard.unitsComplete}</dt>
              <dd>{`${courseProgress.completedUnitCount} of ${courseProgress.unitCount}`}</dd>
            </div>
            <div>
              <dt>{uiCopy.surfaces.classicDashboard.blocked}</dt>
              <dd>{courseProgress.blockedItemCount}</dd>
            </div>
          </dl>
        </Card>

        <Card title={uiCopy.surfaces.classicDashboard.whatSNext}>
          {continueNext.kind === 'recommended' ? (
            <>
              <p className="dashboard-metric">
                <strong>{continueNext.itemTitle}</strong>
              </p>
              <p className="card__description">
                {`${continueNext.unitTitle} · ${continueNextReasonLabel(continueNext.reason)}`}
              </p>
              <div className="action-row">
                <Link
                  className="button button--primary button--sm"
                  to={getCourseItemDetailPath(continueNext.itemId)}
                >
                  {uiCopy.surfaces.classicDashboard.start}
                </Link>
              </div>
            </>
          ) : continueNext.kind === 'course_complete' ? (
            <p>
              {
                uiCopy.surfaces.classicDashboard
                  .allRequiredItemsAreCompleteNiceWork
              }
            </p>
          ) : continueNext.kind === 'blocked_only' ? (
            <p>
              {
                uiCopy.surfaces.classicDashboard
                  .everyRemainingRequiredItemIsBlockedSeeNeeds
              }
            </p>
          ) : (
            <p>
              {
                uiCopy.surfaces.classicDashboard
                  .noRequiredItemsAreInTheLocalCatalog
              }
            </p>
          )}
        </Card>

        <Card title={uiCopy.surfaces.classicDashboard.xP}>
          <p className="dashboard-metric">
            <strong>{`Level ${xpSummary.level}`}</strong>
            <span>{`${xpSummary.totalXp} XP total`}</span>
          </p>
          <ProgressBar
            helperText={`${xpSummary.xpToNextLevel} XP to level ${xpSummary.level + 1}`}
            label={`Progress to level ${xpSummary.level + 1}`}
            value={xpSummary.levelProgressPercent}
          />
          {xpSummary.isEmpty ? (
            <>
              <p className="card__description">
                {uiCopy.surfaces.classicDashboard.noXPEarnedYetSaveProgressOnA}
              </p>
              <div className="action-row">
                <Link
                  className="button button--secondary button--sm"
                  to="/course"
                >
                  {uiCopy.surfaces.classicDashboard.openCourseMap}
                </Link>
              </div>
            </>
          ) : achievements.unlockedCount > 0 ? (
            <div className="action-row">
              <Link
                className="button button--secondary button--sm"
                to="/achievements"
              >
                {achievements.unlockedCount === 1
                  ? uiCopy.surfaces.classicDashboard.text1AchievementUnlocked
                  : `${achievements.unlockedCount} achievements unlocked`}
              </Link>
            </div>
          ) : null}
        </Card>

        <Card title={uiCopy.surfaces.classicDashboard.achievements}>
          <p className="dashboard-metric">
            <strong>{`${achievements.unlockedCount} of ${achievements.totalCount}`}</strong>
            <span>{uiCopy.surfaces.classicDashboard.unlocked}</span>
          </p>
          <p className="card__description">
            {achievements.latestUnlockTitle === null
              ? uiCopy.surfaces.classicDashboard.noAchievementsUnlockedYet
              : `Most recent: ${achievements.latestUnlockTitle} (${achievements.latestUnlockDate})`}
          </p>
          <div className="action-row">
            <Link
              className="button button--secondary button--sm"
              to="/achievements"
            >
              {uiCopy.surfaces.classicDashboard.viewAchievements}
            </Link>
          </div>
        </Card>

        <Card title={uiCopy.surfaces.classicDashboard.resumeLecture}>
          {resume.kind === 'resume' ? (
            <>
              <p className="dashboard-metric">
                <strong>{resume.itemTitle}</strong>
              </p>
              <p className="card__description">
                {`${resume.resumeLabel} · ${resume.sliceProgressLabel}`}
              </p>
              <div className="action-row">
                <Link
                  className="button button--secondary button--sm"
                  to={getCourseItemDetailPath(resume.itemId)}
                >
                  {uiCopy.surfaces.classicDashboard.resume}
                </Link>
              </div>
            </>
          ) : (
            <p className="card__description">
              {uiCopy.surfaces.classicDashboard.noLongFormItemIsInProgressRight}
            </p>
          )}
        </Card>

        <Card title={uiCopy.surfaces.classicDashboard.needsAttention}>
          {blockedItems.isEmpty ? (
            <p className="card__description">
              {uiCopy.surfaces.classicDashboard.nothingIsBlockedRightNow}
            </p>
          ) : (
            <>
              {/*
                Severity is conveyed with a text StatusPill on a normal card
                surface rather than the `card--danger` variant: that variant
                uses a hardcoded light gradient background that is not adapted
                for dark theme (a deferred design-system gap), so using it here
                would make this expected blocked state visually low-contrast.
              */}
              <StatusPill variant="blocked">
                {`${blockedItems.items.length} blocked`}
              </StatusPill>
              <ul className="detail-list">
                {blockedItems.items.map((blocked) => (
                  <li key={blocked.itemId}>
                    <Link to={getCourseItemDetailPath(blocked.itemId)}>
                      {blocked.itemTitle}
                    </Link>
                    {` — ${blocked.unitTitle}`}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card title={uiCopy.surfaces.classicDashboard.studySessions}>
          <dl className="profile-summary-list">
            <div>
              <dt>{uiCopy.surfaces.classicDashboard.sessionsLogged}</dt>
              <dd>{studySummary.sessionCount}</dd>
            </div>
            <div>
              <dt>{uiCopy.surfaces.classicDashboard.totalTime}</dt>
              <dd>{studySummary.totalMinutesLabel}</dd>
            </div>
            <div>
              <dt>{uiCopy.surfaces.classicDashboard.lastSession}</dt>
              <dd>
                {studySummary.lastSessionDate ??
                  uiCopy.surfaces.classicDashboard.noneYet}
              </dd>
            </div>
          </dl>
          <div className="action-row">
            <Link
              className="button button--secondary button--sm"
              to="/sessions"
            >
              {uiCopy.surfaces.classicDashboard.openSessions}
            </Link>
          </div>
        </Card>

        <Card title={uiCopy.surfaces.classicDashboard.recentActivity}>
          {recentActivity.isEmpty ? (
            <p className="card__description">
              {
                uiCopy.surfaces.classicDashboard
                  .noLocalActivityRecordedYetYourExplicitSaves
              }
            </p>
          ) : (
            <ul className="dashboard-activity-list">
              {recentActivity.items.map((entry) => (
                <li key={entry.id}>
                  <span>{entry.label}</span>
                  <span className="dashboard-activity-list__date">
                    {entry.date}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}
