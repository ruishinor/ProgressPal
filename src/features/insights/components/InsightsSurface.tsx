import uiCopy from '@/ui-copy/interface.json';
import { startTransition, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card, type CardProps } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { buildCourseMap } from '@/features/course/model';
import {
  buildInsightsModel,
  type InsightsModel,
} from '@/features/insights/model';
import { buildLongFormProgressMap } from '@/lib/progress';
import {
  getAchievementsView,
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
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope } from '@/lib/domain';
import { rpgBadgesPath, rpgRoutePath } from '@/lib/routing/rpgRoutePaths';
import { formatMinutes } from '@/lib/time';

// The same insights surface renders in two shells: the classic Insights route
// and the RPG route (/rpg/log). Insights is the product concept; the RPG view
// is only a visual wrapper, not a second insights engine. Only the section
// wrapper and the route header differ by variant; the data sources, derived
// metrics, empty states, and the read-only data path are identical.
type InsightsSurfaceVariant = 'classic' | 'rpg';

type InsightsSurfaceProps = {
  variant?: InsightsSurfaceVariant;
};

type InsightsPageStatus = 'error' | 'loading' | 'ready';

type InsightsPageState = {
  error: string | null;
  model: InsightsModel | null;
  status: InsightsPageStatus;
};

const initialState: InsightsPageState = {
  error: null,
  model: null,
  status: 'loading',
};

type BarVariant = 'study' | 'watched' | 'xp' | 'share';

// Decorative CSS bar. It is aria-hidden because the exact value is always
// printed as text in the same table cell; the bar only adds a visual cue and is
// never the sole carrier of information.
function bar(value: number, max: number, variant: BarVariant) {
  const width = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <span aria-hidden="true" className="insights-bar">
      <span
        className={`insights-bar__fill insights-bar__fill--${variant}`}
        style={{ width: `${width}%` }}
      />
    </span>
  );
}

function InsightsSection({ rpg, ...props }: CardProps & { rpg: boolean }) {
  const [open, setOpen] = useState(props.title === 'Course progress');
  if (!rpg) return <Card {...props} />;
  return (
    <details
      className="card card--default card--comfortable insights-disclosure"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <h2 className="card__title">{props.title}</h2>
      </summary>
      {open ? <div className="card__body">{props.children}</div> : null}
    </details>
  );
}

export function InsightsSurface({ variant = 'classic' }: InsightsSurfaceProps) {
  const { programmeScope } = useAppState();
  const { copy } = requireProgrammeScope(useAppState().programmeScope).content
    .terminology;
  const isRpgVariant = variant === 'rpg';
  const sectionClassName = isRpgVariant
    ? 'page-section rpg-log'
    : 'page-section';
  const [state, setState] = useState<InsightsPageState>(initialState);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadInsights() {
      startTransition(() => {
        setState((currentState) => ({
          ...currentState,
          error: null,
          status: 'loading',
        }));
      });

      try {
        // All reads only. Insights derives every value from existing
        // source-of-truth stores and read models; it persists nothing.
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
          listXpTransactions({
            programmeId: requireProgrammeScope(programmeScope).programmeId,
          }),
          getAchievementsView({
            policy: requireProgrammeScope(programmeScope).policy,
          }),
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
        const model = buildInsightsModel({
          achievements,
          courseMap,
          mediaProgressEvents,
          studySessions,
          xpTransactions,
        });

        startTransition(() => {
          setState({ error: null, model, status: 'ready' });
        });
      } catch (loadError) {
        console.error('Insights loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: 'The local insights could not be loaded.',
            model: null,
            status: 'error',
          });
        });
      }
    }

    void loadInsights();

    return () => {
      isActive = false;
    };
  }, [programmeScope, reloadToken]);

  if (state.status === 'error') {
    return (
      <section className={sectionClassName}>
        {isRpgVariant ? (
          <div className="rpg-log__header rpg-page-header">
            <div>
              <p className="rpg-log__eyebrow rpg-page-eyebrow">
                {uiCopy.surfaces.insightsScreen.rPG}
              </p>
              <h1>{uiCopy.surfaces.insightsScreen.insights}</h1>
            </div>
            <div className="rpg-log__actions">
              <Link
                className="button button--secondary button--md"
                to={rpgRoutePath}
              >
                {uiCopy.surfaces.insightsScreen.backToHome}
              </Link>
            </div>
          </div>
        ) : (
          <PageHeader
            description={copy.insightsErrorDescription}
            title={uiCopy.surfaces.insightsScreen.insights}
          />
        )}
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
              {uiCopy.surfaces.insightsScreen.tryAgain}
            </button>
          }
          description={
            state.error ??
            uiCopy.surfaces.insightsScreen.unknownLocalInsightsError
          }
          title={uiCopy.surfaces.insightsScreen.localDataCouldNotBeRead}
        />
      </section>
    );
  }

  if (state.status === 'loading' || state.model === null) {
    return (
      <section className={sectionClassName}>
        {isRpgVariant ? (
          <div className="rpg-log__header rpg-page-header">
            <div>
              <p className="rpg-log__eyebrow rpg-page-eyebrow">
                {uiCopy.surfaces.insightsScreen.rPG}
              </p>
              <h1>{uiCopy.surfaces.insightsScreen.insights}</h1>
            </div>
          </div>
        ) : (
          <PageHeader
            description={
              uiCopy.surfaces.insightsScreen.theAppIsReadingYourLocalSessionsXP
            }
            title={uiCopy.surfaces.insightsScreen.insights}
          />
        )}
        <LoadingState
          description={uiCopy.surfaces.insightsScreen.buildingYourInsights}
          title={uiCopy.surfaces.insightsScreen.loadingYourLocalData}
        />
      </section>
    );
  }

  const {
    achievementTimeline,
    activeDays,
    completionAwards,
    courseProgress,
    modeBreakdown,
    weeklyActivity,
  } = state.model;

  return (
    <section className={sectionClassName}>
      {isRpgVariant ? (
        <div className="rpg-log__header rpg-page-header">
          <div>
            <p className="rpg-log__eyebrow rpg-page-eyebrow">
              {uiCopy.surfaces.insightsScreen.rPG}
            </p>
            <h1>{uiCopy.surfaces.insightsScreen.insights}</h1>
            <p className="rpg-log__lede rpg-page-lede">
              {
                uiCopy.surfaces.insightsScreen
                  .studyTimeProgressAndEarnedRewardsDatesUse
              }
            </p>
          </div>
        </div>
      ) : (
        <PageHeader
          description={copy.insightsDescription}
          title={uiCopy.surfaces.insightsScreen.insights}
        />
      )}

      <div className="insights-grid">
        <InsightsSection
          rpg={isRpgVariant}
          title={uiCopy.surfaces.insightsScreen.courseProgress}
          titleAs={isRpgVariant ? 'h2' : 'h3'}
        >
          <ProgressBar
            helperText={`${courseProgress.completedRequiredItemCount} of ${courseProgress.requiredItemCount} required tasks complete`}
            label={uiCopy.surfaces.insightsScreen.requiredCourseProgressCurrent}
            tone={
              courseProgress.completionPercent === 100 ? 'success' : 'accent'
            }
            value={courseProgress.completionPercent}
          />
          <p className="card__description">
            {
              uiCopy.surfaces.insightsScreen
                .aCurrentSnapshotOfRequiredItemCompletionNot
            }
          </p>
        </InsightsSection>

        <InsightsSection
          rpg={isRpgVariant}
          title={uiCopy.surfaces.insightsScreen.effortOverTime}
          titleAs={isRpgVariant ? 'h2' : 'h3'}
        >
          {weeklyActivity.isEmpty ? (
            <p className="card__description">
              {
                uiCopy.surfaces.insightsScreen
                  .noSessionsOrVideoLoggedYetWeeklyEffort
              }
            </p>
          ) : (
            <table className="insights-table">
              <caption className="insights-table__caption">
                {
                  uiCopy.surfaces.insightsScreen
                    .studyMinutesAndWatchedMinutesLoggedPerLocal
                }
              </caption>
              <thead>
                <tr>
                  <th scope="col">{uiCopy.surfaces.insightsScreen.week}</th>
                  <th className="insights-table__numeric" scope="col">
                    {uiCopy.surfaces.insightsScreen.study}
                  </th>
                  <th className="insights-table__numeric" scope="col">
                    {uiCopy.surfaces.insightsScreen.watchedLogged}
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeklyActivity.weeks.map((week) => (
                  <tr key={week.weekKey}>
                    <th scope="row">{week.weekLabel}</th>
                    <td className="insights-table__numeric">
                      {formatMinutes(week.studyMinutes)}
                      {bar(
                        week.studyMinutes,
                        weeklyActivity.maxStudyMinutes,
                        'study',
                      )}
                    </td>
                    <td className="insights-table__numeric">
                      {formatMinutes(week.watchedMinutesLogged)}
                      {bar(
                        week.watchedMinutesLogged,
                        weeklyActivity.maxWatchedMinutesLogged,
                        'watched',
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{uiCopy.surfaces.insightsScreen.total}</th>
                  <td className="insights-table__numeric">
                    {weeklyActivity.totalStudyMinutesLabel}
                  </td>
                  <td className="insights-table__numeric">
                    {weeklyActivity.totalWatchedMinutesLoggedLabel}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </InsightsSection>

        <InsightsSection
          rpg={isRpgVariant}
          title={uiCopy.surfaces.insightsScreen.xPOverTime}
          titleAs={isRpgVariant ? 'h2' : 'h3'}
        >
          {weeklyActivity.isEmpty ? (
            <p className="card__description">
              {uiCopy.surfaces.insightsScreen.noXPEarnedYetSavingProgressOrA}
            </p>
          ) : (
            <table className="insights-table">
              <caption className="insights-table__caption">
                {
                  uiCopy.surfaces.insightsScreen
                    .xPEarnedPerLocalWeekAndTheRunning
                }
              </caption>
              <thead>
                <tr>
                  <th scope="col">{uiCopy.surfaces.insightsScreen.week}</th>
                  <th className="insights-table__numeric" scope="col">
                    {uiCopy.surfaces.insightsScreen.xPEarned}
                  </th>
                  <th className="insights-table__numeric" scope="col">
                    {uiCopy.surfaces.insightsScreen.cumulativeXP}
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeklyActivity.weeks.map((week) => (
                  <tr key={week.weekKey}>
                    <th scope="row">{week.weekLabel}</th>
                    <td className="insights-table__numeric">
                      {`${week.xpEarned} XP`}
                      {bar(week.xpEarned, weeklyActivity.maxWeeklyXp, 'xp')}
                    </td>
                    <td className="insights-table__numeric">
                      {`${week.xpCumulative} XP`}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{uiCopy.surfaces.insightsScreen.total}</th>
                  <td className="insights-table__numeric">
                    {`${weeklyActivity.totalXp} XP`}
                  </td>
                  <td className="insights-table__numeric" />
                </tr>
              </tfoot>
            </table>
          )}
        </InsightsSection>

        <InsightsSection
          rpg={isRpgVariant}
          title={uiCopy.surfaces.insightsScreen.studyModeBreakdown}
          titleAs={isRpgVariant ? 'h2' : 'h3'}
        >
          {modeBreakdown.isEmpty ? (
            <p className="card__description">
              {
                uiCopy.surfaces.insightsScreen
                  .noStudySessionsLoggedYetYourEffortBy
              }
            </p>
          ) : (
            <table className="insights-table">
              <caption className="insights-table__caption">
                {
                  uiCopy.surfaces.insightsScreen
                    .loggedStudyTimeGroupedBySessionMode
                }
              </caption>
              <thead>
                <tr>
                  <th scope="col">{uiCopy.surfaces.insightsScreen.mode}</th>
                  <th className="insights-table__numeric" scope="col">
                    {uiCopy.surfaces.insightsScreen.sessions}
                  </th>
                  <th className="insights-table__numeric" scope="col">
                    {uiCopy.surfaces.insightsScreen.time}
                  </th>
                  <th className="insights-table__numeric" scope="col">
                    {uiCopy.surfaces.insightsScreen.share}
                  </th>
                </tr>
              </thead>
              <tbody>
                {modeBreakdown.rows.map((row) => (
                  <tr key={row.mode}>
                    <th scope="row">{row.modeLabel}</th>
                    <td className="insights-table__numeric">
                      {row.sessionCount}
                    </td>
                    <td className="insights-table__numeric">
                      {row.totalMinutesLabel}
                    </td>
                    <td className="insights-table__numeric">
                      {`${row.percentOfMinutes}%`}
                      {bar(row.percentOfMinutes, 100, 'share')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </InsightsSection>

        <InsightsSection
          rpg={isRpgVariant}
          title={uiCopy.surfaces.insightsScreen.activeDays}
          titleAs={isRpgVariant ? 'h2' : 'h3'}
        >
          {activeDays.isEmpty ? (
            <p className="card__description">
              {
                uiCopy.surfaces.insightsScreen
                  .noStudySessionsLoggedYetActiveDayCounts
              }
            </p>
          ) : (
            <dl className="profile-summary-list">
              <div>
                <dt>{`Active days (last ${activeDays.windowDays})`}</dt>
                <dd>{activeDays.activeDaysInWindow}</dd>
              </div>
              <div>
                <dt>{uiCopy.surfaces.insightsScreen.mostRecentActiveRun}</dt>
                <dd>{activeDays.consecutiveActiveDays}</dd>
              </div>
              <div>
                <dt>{uiCopy.surfaces.insightsScreen.mostRecentActiveDay}</dt>
                <dd>
                  {activeDays.lastActiveDate ??
                    uiCopy.surfaces.insightsScreen.noneYet}
                </dd>
              </div>
            </dl>
          )}
        </InsightsSection>

        <InsightsSection
          rpg={isRpgVariant}
          title={uiCopy.surfaces.insightsScreen.recordedCompletionAwards}
          titleAs={isRpgVariant ? 'h2' : 'h3'}
        >
          {completionAwards.isEmpty ? (
            <p className="card__description">
              {uiCopy.surfaces.insightsScreen.noCompletionAwardsRecordedYet}
            </p>
          ) : (
            <table className="insights-table">
              <caption className="insights-table__caption">
                {
                  uiCopy.surfaces.insightsScreen
                    .countsOfCompletionXPAwardsPerLocalWeek
                }
              </caption>
              <thead>
                <tr>
                  <th scope="col">{uiCopy.surfaces.insightsScreen.week}</th>
                  <th className="insights-table__numeric" scope="col">
                    {uiCopy.surfaces.insightsScreen.taskAwards}
                  </th>
                  <th className="insights-table__numeric" scope="col">
                    {uiCopy.surfaces.insightsScreen.unitAwards}
                  </th>
                </tr>
              </thead>
              <tbody>
                {completionAwards.weeks.map((week) => (
                  <tr key={week.weekKey}>
                    <th scope="row">{week.weekLabel}</th>
                    <td className="insights-table__numeric">
                      {week.itemAwardCount}
                    </td>
                    <td className="insights-table__numeric">
                      {week.unitAwardCount}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{uiCopy.surfaces.insightsScreen.total}</th>
                  <td className="insights-table__numeric">
                    {completionAwards.totalItemAwards}
                  </td>
                  <td className="insights-table__numeric">
                    {completionAwards.totalUnitAwards}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </InsightsSection>

        <InsightsSection
          rpg={isRpgVariant}
          title={uiCopy.surfaces.insightsScreen.achievementTimeline}
          titleAs={isRpgVariant ? 'h2' : 'h3'}
        >
          {achievementTimeline.isEmpty ? (
            <p className="card__description">
              {
                uiCopy.surfaces.insightsScreen
                  .noAchievementsUnlockedYetUnlocksWillAppearHere
              }
            </p>
          ) : (
            <table className="insights-table">
              <caption className="insights-table__caption">
                {`${achievementTimeline.unlockedCount} of ${achievementTimeline.totalCount} achievements unlocked, most recent first.`}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{uiCopy.surfaces.insightsScreen.unlocked}</th>
                  <th scope="col">
                    {uiCopy.surfaces.insightsScreen.achievement}
                  </th>
                </tr>
              </thead>
              <tbody>
                {achievementTimeline.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.unlockedDate}</td>
                    <th scope="row">{entry.title}</th>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="action-row">
            <Link
              className="button button--secondary button--sm"
              to={isRpgVariant ? rpgBadgesPath : '/achievements'}
            >
              {uiCopy.surfaces.insightsScreen.viewAchievements}
            </Link>
          </div>
        </InsightsSection>
      </div>
    </section>
  );
}
