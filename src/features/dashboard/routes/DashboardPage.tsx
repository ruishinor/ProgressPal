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
import { buildLongFormProgressMap } from '@/features/progress';
import {
  getAchievementsView,
  getXpSummary,
  listContentAssets,
  listContentSlices,
  listCourseItems,
  listCourseUnits,
  listMediaProgressEvents,
  listProgressEntries,
  listResumePoints,
  listStudySessions,
  listXpTransactions,
} from '@/lib/db';

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
        const [
          units,
          items,
          progressEntries,
          contentAssets,
          contentSlices,
          mediaProgressEvents,
          resumePoints,
          studySessions,
          xpTransactions,
          xpSummary,
          achievements,
        ] = await Promise.all([
          listCourseUnits(),
          listCourseItems(),
          listProgressEntries(),
          listContentAssets(),
          listContentSlices(),
          listMediaProgressEvents(),
          listResumePoints(),
          listStudySessions(),
          listXpTransactions(),
          getXpSummary(),
          getAchievementsView(),
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
  }, [reloadToken]);

  if (state.status === 'error') {
    return (
      <section className="page-section">
        <PageHeader
          description="This route reads only your local progress, sessions, XP, and achievement records."
          eyebrow="Route: /dashboard"
          title="Dashboard"
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
              Try again
            </button>
          }
          description={state.error ?? 'Unknown local dashboard error.'}
          title="Local data could not be read"
        />
      </section>
    );
  }

  if (state.status === 'loading' || state.model === null) {
    return (
      <section className="page-section">
        <PageHeader
          description="The app is reading your local progress, sessions, XP, and achievement records."
          eyebrow="Route: /dashboard"
          title="Dashboard"
        />
        <LoadingState
          description="Opening local stores and assembling your derived dashboard."
          title="Loading your local data"
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
            <Link className="button button--secondary button--md" to="/course">
              Course map
            </Link>
            <Link
              className="button button--secondary button--md"
              to="/sessions"
            >
              Sessions
            </Link>
            <Link
              className="button button--secondary button--md"
              to="/achievements"
            >
              Achievements
            </Link>
          </div>
        }
        description="A read-only view derived from your local CS50 records. Nothing here is synced, fetched, or stored separately — it reflects only what you have explicitly saved on this device."
        eyebrow="Route: /dashboard"
        meta={
          <>
            <StatusPill variant={courseStatusVariant(courseProgress)}>
              {courseProgress.statusLabel}
            </StatusPill>
            <Badge tone="accent">{`Level ${xpSummary.level}`}</Badge>
          </>
        }
        title="Dashboard"
      />

      <div className="dashboard-grid">
        <Card title="Course progress" variant="accent">
          <ProgressBar
            helperText={`${courseProgress.completedRequiredItemCount} of ${courseProgress.requiredItemCount} required items complete`}
            label="Required course progress"
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
              <dt>Units complete</dt>
              <dd>{`${courseProgress.completedUnitCount} of ${courseProgress.unitCount}`}</dd>
            </div>
            <div>
              <dt>Blocked items</dt>
              <dd>{courseProgress.blockedItemCount}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Continue next">
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
                  Open item
                </Link>
              </div>
            </>
          ) : continueNext.kind === 'course_complete' ? (
            <p>All required items are complete. Nice work.</p>
          ) : continueNext.kind === 'blocked_only' ? (
            <p>
              Every remaining required item is blocked. See &ldquo;Needs
              attention&rdquo; below.
            </p>
          ) : (
            <p>No required items are in the local catalog.</p>
          )}
        </Card>

        <Card title="XP">
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
            <p className="card__description">
              No XP earned yet. Saving progress or a study session starts
              earning it.
            </p>
          ) : null}
        </Card>

        <Card title="Achievements">
          <p className="dashboard-metric">
            <strong>{`${achievements.unlockedCount} of ${achievements.totalCount}`}</strong>
            <span>unlocked</span>
          </p>
          <p className="card__description">
            {achievements.latestUnlockTitle === null
              ? 'No achievements unlocked yet.'
              : `Most recent: ${achievements.latestUnlockTitle} (${achievements.latestUnlockDate})`}
          </p>
          <div className="action-row">
            <Link
              className="button button--secondary button--sm"
              to="/achievements"
            >
              View achievements
            </Link>
          </div>
        </Card>

        <Card title="Resume long-form">
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
                  className="button button--primary button--sm"
                  to={getCourseItemDetailPath(resume.itemId)}
                >
                  Resume item
                </Link>
              </div>
            </>
          ) : (
            <p className="card__description">
              No long-form item is in progress right now.
            </p>
          )}
        </Card>

        <Card
          title="Needs attention"
          variant={blockedItems.isEmpty ? 'default' : 'danger'}
        >
          {blockedItems.isEmpty ? (
            <p className="card__description">No items are marked blocked.</p>
          ) : (
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
          )}
        </Card>

        <Card title="Study sessions">
          <dl className="profile-summary-list">
            <div>
              <dt>Sessions logged</dt>
              <dd>{studySummary.sessionCount}</dd>
            </div>
            <div>
              <dt>Total time</dt>
              <dd>{studySummary.totalMinutesLabel}</dd>
            </div>
            <div>
              <dt>Last session</dt>
              <dd>{studySummary.lastSessionDate ?? 'None yet'}</dd>
            </div>
          </dl>
          <div className="action-row">
            <Link
              className="button button--secondary button--sm"
              to="/sessions"
            >
              Open sessions
            </Link>
          </div>
        </Card>

        <Card title="Recent activity">
          {recentActivity.isEmpty ? (
            <p className="card__description">
              No local activity recorded yet. Your explicit saves — progress,
              study sessions, watched ranges, XP, and unlocks — will appear
              here.
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
