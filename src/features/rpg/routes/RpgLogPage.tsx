import { startTransition, useEffect, useState } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatMinutes } from '@/features/course/model';
import {
  RpgButton,
  RpgEmptyState,
  RpgPanel,
  RpgStatusPill,
  type RpgStatusTone,
} from '@/features/rpg/components';
import { loadRpgJourneyLogSummary } from '@/features/rpg/model/readModels';
import type {
  RpgJourneyLogActivity,
  RpgJourneyLogSummary,
} from '@/features/rpg/model/types';
import { rpgMapPath, rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

type RpgLogPageStatus = 'error' | 'loading' | 'ready';

type RpgLogPageState = {
  error: string | null;
  status: RpgLogPageStatus;
  summary: RpgJourneyLogSummary | null;
};

const initialState: RpgLogPageState = {
  error: null,
  status: 'loading',
  summary: null,
};

function getActivityTone(type: RpgJourneyLogActivity['type']): RpgStatusTone {
  const tones: Record<RpgJourneyLogActivity['type'], RpgStatusTone> = {
    progress: 'progress',
    study_session: 'success',
    xp: 'warning',
  };

  return tones[type];
}

function formatTimestamp(isoTimestamp: string) {
  const [date = isoTimestamp, timeWithZone = ''] = isoTimestamp.split('T');
  const time = timeWithZone.slice(0, 5);

  return time.length > 0 ? `${date} ${time} UTC` : date;
}

function hasActivity(summary: RpgJourneyLogSummary) {
  return summary.activities.length > 0;
}

export function RpgLogPage() {
  const [state, setState] = useState<RpgLogPageState>(initialState);
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
        const summary = await loadRpgJourneyLogSummary();

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
        console.error('RPG journey log loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: 'The Journey Log could not be loaded from local data.',
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
        <section className="page-section rpg-log">
          <div className="rpg-log__header">
            <p className="rpg-log__eyebrow">RPG</p>
            <h1>Journey Log</h1>
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
                Try again
              </RpgButton>
            }
            description={state.error ?? 'Unknown Journey Log error.'}
            title="Journey Log could not be read"
          />
        </section>
      );
    }

    return (
      <section className="page-section rpg-log">
        <div className="rpg-log__header">
          <p className="rpg-log__eyebrow">RPG</p>
          <h1>Journey Log</h1>
        </div>
        <LoadingState
          description="Reading saved local progress, sessions, and XP."
          title="Loading Journey Log"
        />
      </section>
    );
  }

  const { summary } = state;

  return (
    <section className="page-section rpg-log">
      <div className="rpg-log__header">
        <div>
          <p className="rpg-log__eyebrow">RPG</p>
          <h1>Journey Log</h1>
          <p className="rpg-log__lede">
            Read-only history from saved local progress, study sessions, and XP.
          </p>
        </div>
        <div className="rpg-log__actions">
          <RpgButton href={rpgRoutePath}>Back to Hub</RpgButton>
          <RpgButton href={rpgMapPath} variant="secondary">
            Open Campaign Map
          </RpgButton>
        </div>
      </div>

      {hasActivity(summary) ? (
        <>
          <RpgPanel title="Local activity totals" titleAs="h2">
            <dl className="rpg-log__totals">
              <div>
                <dt>Saved progress</dt>
                <dd>{summary.totals.progressCount}</dd>
              </div>
              <div>
                <dt>Finished sessions</dt>
                <dd>{summary.totals.sessionCount}</dd>
              </div>
              <div>
                <dt>Study time</dt>
                <dd>{formatMinutes(summary.totals.totalMinutes)}</dd>
              </div>
              <div>
                <dt>XP transactions</dt>
                <dd>{summary.totals.xpTransactionCount}</dd>
              </div>
              <div>
                <dt>Total XP</dt>
                <dd>{summary.totals.totalXp}</dd>
              </div>
            </dl>
          </RpgPanel>

          <RpgPanel
            description="Newest saved local records appear first."
            title="Saved local activity"
            titleAs="h2"
          >
            <ol className="rpg-log__activity-list">
              {summary.activities.map((activity) => (
                <li className="rpg-log__activity-item" key={activity.id}>
                  <div className="rpg-log__activity-header">
                    <div>
                      <p className="rpg-log__timestamp">
                        {formatTimestamp(activity.timestamp)}
                      </p>
                      <h3>{activity.title}</h3>
                    </div>
                    <RpgStatusPill tone={getActivityTone(activity.type)}>
                      {activity.typeLabel}
                    </RpgStatusPill>
                  </div>
                  <p className="rpg-log__activity-detail">{activity.detail}</p>
                  {activity.contextLabel !== null ? (
                    <p className="rpg-log__context">{activity.contextLabel}</p>
                  ) : null}
                  {activity.note !== null ? (
                    <p className="rpg-log__note">{activity.note}</p>
                  ) : null}
                  {activity.links.length > 0 ? (
                    <div className="rpg-log__entry-actions">
                      {activity.links.map((link) => (
                        <RpgButton
                          href={link.href}
                          key={`${activity.id}:${link.href}`}
                          size="sm"
                          variant="quiet"
                        >
                          {link.label}
                        </RpgButton>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
          </RpgPanel>
        </>
      ) : (
        <RpgEmptyState
          action={
            <div className="rpg-log__actions">
              <RpgButton href={rpgMapPath}>Open Campaign Map</RpgButton>
              <RpgButton href={rpgRoutePath} variant="secondary">
                Back to Hub
              </RpgButton>
            </div>
          }
          description="Save progress on a Study Resource or finish a Focus Session. Those saved local records will appear here without creating new activity on page load."
          eyebrow="Read-only history"
          title="No saved RPG activity in Journey Log"
        />
      )}
    </section>
  );
}
