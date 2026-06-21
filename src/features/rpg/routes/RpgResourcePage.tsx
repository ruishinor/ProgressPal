import { startTransition, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { loadRpgStudyResourceSummary } from '@/features/rpg/model/readModels';
import type { RpgStudyResourceSummary } from '@/features/rpg/model/types';
import { getRpgWeekPath } from '@/lib/routing/rpgRoutePaths';

type RpgResourcePageStatus = 'error' | 'loading' | 'ready';

type RpgResourcePageState = {
  error: string | null;
  status: RpgResourcePageStatus;
  summary: RpgStudyResourceSummary | null;
};

const initialState: RpgResourcePageState = {
  error: null,
  status: 'loading',
  summary: null,
};

export function RpgResourcePage() {
  const { itemId } = useParams();
  const [state, setState] = useState<RpgResourcePageState>(initialState);
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

      if (itemId === undefined || itemId.trim().length === 0) {
        startTransition(() => {
          setState({
            error: 'RPG resource route is missing an item id.',
            status: 'error',
            summary: null,
          });
        });
        return;
      }

      try {
        const summary = await loadRpgStudyResourceSummary(itemId);

        if (!isActive) {
          return;
        }

        if (summary === null) {
          startTransition(() => {
            setState({
              error: `No RPG resource was found for "${itemId}".`,
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
        console.error('RPG resource loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: 'The RPG resource could not be loaded from local data.',
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
  }, [itemId, reloadToken]);

  if (state.status === 'loading' || state.summary === null) {
    if (state.status === 'error') {
      return (
        <section className="page-section">
          <PageHeader
            description="This read-only route uses the RPG study resource model."
            eyebrow="RPG resource"
            title="RPG Resource"
          />
          <ErrorState
            action={
              itemId !== undefined && itemId.trim().length > 0 ? (
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
            description={state.error ?? 'Unknown RPG resource error.'}
            title="RPG resource not found"
          />
        </section>
      );
    }

    return (
      <section className="page-section">
        <PageHeader
          description="The app is reading the local RPG resource summary."
          eyebrow="RPG resource"
          title="RPG Resource"
        />
        <LoadingState
          description="Building the RPG resource from local progress."
          title="Loading RPG resource"
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
              to={getRpgWeekPath(summary.unitId)}
            >
              Back to parent week
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
        description={summary.unitTitle}
        eyebrow="RPG resource"
        meta={
          <>
            <StatusPill variant={summary.statusVariant}>
              {summary.statusLabel}
            </StatusPill>
            <Badge tone="accent">{summary.typeLabel}</Badge>
            <Badge tone={summary.required ? 'accent' : 'neutral'}>
              {summary.required ? 'Required' : 'Optional'}
            </Badge>
            <Badge tone="neutral">{summary.estimatedMinutesLabel}</Badge>
          </>
        }
        title={summary.title}
      />
      <Card title="Resource summary">
        <dl className="detail-list">
          <div>
            <dt>Unit</dt>
            <dd>{summary.unitTitle}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{summary.typeLabel}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{summary.statusLabel}</dd>
          </div>
          <div>
            <dt>Estimated time</dt>
            <dd>{summary.estimatedMinutesLabel}</dd>
          </div>
          <div>
            <dt>Requirement</dt>
            <dd>{summary.required ? 'Required' : 'Optional'}</dd>
          </div>
        </dl>
        {summary.longFormProgress !== null &&
        summary.longFormProgress.hasProgress ? (
          <p className="course-item-row__detail">
            {summary.longFormProgress.summaryLine}
          </p>
        ) : null}
      </Card>
    </section>
  );
}
