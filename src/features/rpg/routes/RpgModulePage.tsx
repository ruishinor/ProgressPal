import { startTransition, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusPill } from '@/components/ui/StatusPill';
import { formatMinutes } from '@/features/course/model';
import { loadRpgModuleSummary } from '@/features/rpg/model/readModels';
import type { RpgModuleSummary } from '@/features/rpg/model/types';
import { getRpgResourcePath, rpgMapPath } from '@/lib/routing/rpgRoutePaths';

type RpgModulePageStatus = 'error' | 'loading' | 'ready';

type RpgModulePageState = {
  error: string | null;
  status: RpgModulePageStatus;
  summary: RpgModuleSummary | null;
};

const initialState: RpgModulePageState = {
  error: null,
  status: 'loading',
  summary: null,
};

export function RpgModulePage() {
  const { unitId } = useParams();
  const [state, setState] = useState<RpgModulePageState>(initialState);
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

      if (unitId === undefined || unitId.trim().length === 0) {
        startTransition(() => {
          setState({
            error: 'RPG week route is missing a unit id.',
            status: 'error',
            summary: null,
          });
        });
        return;
      }

      try {
        const summary = await loadRpgModuleSummary(unitId);

        if (!isActive) {
          return;
        }

        if (summary === null) {
          startTransition(() => {
            setState({
              error: `No RPG week was found for "${unitId}".`,
              status: 'error',
              summary: null,
            });
          });
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
        console.error('RPG week loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: 'The RPG week could not be loaded from local data.',
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
  }, [reloadToken, unitId]);

  if (state.status === 'loading' || state.summary === null) {
    if (state.status === 'error') {
      return (
        <section className="page-section">
          <PageHeader
            actions={
              <Link
                className="button button--secondary button--md"
                to={rpgMapPath}
              >
                Back to RPG map
              </Link>
            }
            description="This read-only route uses the RPG module summary model."
            eyebrow="RPG week"
            title="RPG Week"
          />
          <ErrorState
            action={
              unitId !== undefined && unitId.trim().length > 0 ? (
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
              ) : null
            }
            description={state.error ?? 'Unknown RPG week error.'}
            title="RPG week not found"
          />
        </section>
      );
    }

    return (
      <section className="page-section">
        <PageHeader
          description="The app is reading the local RPG week summary."
          eyebrow="RPG week"
          title="RPG Week"
        />
        <LoadingState
          description="Building the RPG week from local progress."
          title="Loading RPG week"
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
            <Link
              className="button button--secondary button--md"
              to={rpgMapPath}
            >
              Back to RPG map
            </Link>
            {summary.officialLink !== null ? (
              <a
                className="button button--quiet button--md"
                href={summary.officialLink.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {summary.officialLink.label}
              </a>
            ) : null}
          </div>
        }
        description={`${summary.typeLabel} - ${formatMinutes(
          summary.estimatedMinutes,
        )} planned`}
        eyebrow="RPG week"
        meta={
          <>
            <StatusPill variant={summary.statusVariant}>
              {summary.statusLabel}
            </StatusPill>
            <Badge tone="accent">{`${summary.completedRequiredItemCount} of ${summary.requiredItemCount} required complete`}</Badge>
          </>
        }
        title={summary.title}
      />
      <Card
        description={`${summary.completedRequiredItemCount} of ${summary.requiredItemCount} required quests complete`}
        title="Module completion"
      >
        <ProgressBar
          helperText="Required quests only"
          label="Module completion"
          showValue={summary.requiredItemCount > 0}
          tone={summary.statusVariant === 'blocked' ? 'warning' : 'accent'}
          value={summary.completionPercent}
        />
      </Card>
      <Card title="Quests and resources">
        <ol className="course-item-list">
          {summary.quests.map((quest) => (
            <li
              className="course-item-row"
              data-testid={`rpg-resource-${quest.id}`}
              key={quest.id}
            >
              <div className="course-item-row__copy">
                <div className="course-item-row__title-row">
                  <p className="course-item-row__title">{quest.title}</p>
                  <Badge tone={quest.required ? 'accent' : 'neutral'}>
                    {quest.required ? 'Required' : 'Optional'}
                  </Badge>
                </div>
                <p className="course-item-row__eyebrow">
                  {quest.typeLabel} - {formatMinutes(quest.estimatedMinutes)}
                </p>
                {quest.longFormProgress !== null &&
                quest.longFormProgress.hasProgress ? (
                  <p className="course-item-row__detail">
                    {quest.longFormProgress.summaryLine}
                  </p>
                ) : null}
              </div>
              <div className="course-item-row__aside">
                <StatusPill variant={quest.statusVariant}>
                  {quest.statusLabel}
                </StatusPill>
                <Link
                  className="button button--quiet button--md"
                  to={getRpgResourcePath(quest.id)}
                >
                  Open resource
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}
