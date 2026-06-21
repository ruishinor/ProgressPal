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
import { loadRpgCourseMapSummary } from '@/features/rpg/model/readModels';
import type { RpgCourseMapSummary } from '@/features/rpg/model/types';
import { getRpgWeekPath } from '@/lib/routing/rpgRoutePaths';

type RpgMapPageStatus = 'error' | 'loading' | 'ready';

type RpgMapPageState = {
  error: string | null;
  status: RpgMapPageStatus;
  summary: RpgCourseMapSummary | null;
};

const initialState: RpgMapPageState = {
  error: null,
  status: 'loading',
  summary: null,
};

export function RpgMapPage() {
  const [state, setState] = useState<RpgMapPageState>(initialState);
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
        const summary = await loadRpgCourseMapSummary();

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
        console.error('RPG map loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: 'The RPG course map could not be loaded from local data.',
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
            description="This read-only route uses the RPG course map model."
            eyebrow="RPG"
            title="RPG Map"
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
            description={state.error ?? 'Unknown RPG map error.'}
            title="RPG map could not be read"
          />
        </section>
      );
    }

    return (
      <section className="page-section">
        <PageHeader
          description="The app is reading the local RPG course map."
          eyebrow="RPG"
          title="RPG Map"
        />
        <LoadingState
          description="Building the RPG map from local progress."
          title="Loading RPG map"
        />
      </section>
    );
  }

  const { summary } = state;

  return (
    <section className="page-section">
      <PageHeader
        description="Read-only route shell for RPG week navigation."
        eyebrow="RPG"
        meta={
          <>
            <Badge tone="neutral">{`${summary.unitCount} units`}</Badge>
            <Badge tone="accent">
              {`${summary.completedRequiredItemCount} of ${summary.requiredItemCount} required complete`}
            </Badge>
          </>
        }
        title="RPG Map"
      />
      <Card
        description={`${summary.completedRequiredItemCount} of ${summary.requiredItemCount} required tasks complete`}
        title="Required completion"
      >
        <ProgressBar
          helperText="Required CS50 work only"
          label="Required completion"
          value={summary.completionPercent}
        />
      </Card>
      <div className="course-unit-list">
        {summary.modules.map((module) => (
          <Card
            data-testid={`rpg-module-${module.id}`}
            description={`${module.typeLabel} - ${formatMinutes(
              module.estimatedMinutes,
            )} planned`}
            key={module.id}
            title={module.title}
          >
            <div className="course-unit-card__header">
              <ProgressBar
                helperText={`${module.completedRequiredItemCount} of ${module.requiredItemCount} required quests complete`}
                label={`${module.title} progress`}
                showValue={module.requiredItemCount > 0}
                tone={module.statusVariant === 'blocked' ? 'warning' : 'accent'}
                value={module.completionPercent}
              />
              <div className="course-unit-card__meta">
                <StatusPill variant={module.statusVariant}>
                  {module.statusLabel}
                </StatusPill>
                <Badge tone="neutral">{`${module.itemCount} quests`}</Badge>
                <Badge tone="accent">
                  {formatMinutes(module.estimatedMinutes)}
                </Badge>
              </div>
              <Link
                className="button button--quiet button--md"
                to={getRpgWeekPath(module.id)}
              >
                Open week
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
