import { startTransition, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatMinutes } from '@/features/course/model';
import { loadRpgHubSummary } from '@/features/rpg/model/readModels';
import type { RpgHubSummary } from '@/features/rpg/model/types';
import { getRpgWeekPath, rpgMapPath } from '@/lib/routing/rpgRoutePaths';

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
        <section className="page-section">
          <PageHeader
            description="This read-only route uses the RPG summary model."
            eyebrow="RPG"
            title="RPG Hub"
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
            description={state.error ?? 'Unknown RPG hub error.'}
            title="RPG hub could not be read"
          />
        </section>
      );
    }

    return (
      <section className="page-section">
        <PageHeader
          description="The app is reading your local RPG summary."
          eyebrow="RPG"
          title="RPG Hub"
        />
        <LoadingState
          description="Building the RPG hub from local progress."
          title="Loading RPG hub"
        />
      </section>
    );
  }

  const { summary } = state;

  return (
    <section className="page-section">
      <PageHeader
        actions={
          <div className="action-row">
            <Link className="button button--primary button--md" to={rpgMapPath}>
              Open RPG map
            </Link>
            {summary.weekFour !== null ? (
              <Link
                className="button button--secondary button--md"
                to={getRpgWeekPath(summary.weekFour.id)}
              >
                Open Week 4
              </Link>
            ) : null}
          </div>
        }
        description={`RPG shell for ${summary.learnerName}.`}
        eyebrow="RPG"
        meta={
          <>
            <Badge tone="accent">{`Level ${summary.xpSummary.level}`}</Badge>
            <Badge tone="neutral">{`${summary.xpSummary.totalXp} XP`}</Badge>
            <Badge tone="neutral">
              {`${summary.xpSummary.xpToNextLevel} XP to next level`}
            </Badge>
          </>
        }
        title="RPG Hub"
      />
      <div className="dashboard-grid">
        <Card
          description={`${summary.courseProgress.completedRequiredItemCount} of ${summary.courseProgress.requiredItemCount} required tasks complete`}
          title="Course completion"
        >
          <ProgressBar
            helperText="Required CS50 work only"
            label="Course completion"
            value={summary.courseProgress.completionPercent}
          />
        </Card>
        <Card title="Study sessions">
          <p className="dashboard-metric">
            <strong>{summary.studySummary.sessionCount}</strong>
            <span>sessions</span>
          </p>
          <p className="dashboard-metric">
            <strong>{formatMinutes(summary.studySummary.totalMinutes)}</strong>
            <span>total logged</span>
          </p>
        </Card>
        <Card
          description="Next required quest selected by the RPG read model."
          title="Continue quest"
        >
          {summary.continueQuest === null ? (
            <p className="course-item-row__detail">
              No required quest is pending.
            </p>
          ) : (
            <div className="course-map-focus-card">
              <p className="course-map-focus-card__title">
                {summary.continueQuest.title}
              </p>
              <p className="course-item-row__detail">
                {summary.continueQuest.unitTitle} -{' '}
                {formatMinutes(summary.continueQuest.estimatedMinutes)}
              </p>
              <div className="meta-cluster">
                <StatusPill variant={summary.continueQuest.statusVariant}>
                  {summary.continueQuest.statusLabel}
                </StatusPill>
                <Badge tone="accent">{summary.continueQuest.typeLabel}</Badge>
              </div>
            </div>
          )}
        </Card>
        <Card title="RPG map">
          <p className="course-item-row__detail">
            Review modules and open read-only RPG route shells.
          </p>
          <Link className="button button--quiet button--md" to={rpgMapPath}>
            Open map
          </Link>
        </Card>
      </div>
    </section>
  );
}
