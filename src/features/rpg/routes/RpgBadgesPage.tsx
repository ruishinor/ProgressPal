import { startTransition, useEffect, useState } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  RpgButton,
  RpgEmptyState,
  RpgPanel,
  RpgStatusPill,
  type RpgStatusTone,
} from '@/features/rpg/components';
import { loadRpgBadgeGallerySummary } from '@/features/rpg/model/readModels';
import type {
  RpgBadgeGallerySummary,
  RpgBadgeSummary,
} from '@/features/rpg/model/types';
import { rpgMapPath, rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

type RpgBadgesPageStatus = 'error' | 'loading' | 'ready';

type RpgBadgesPageState = {
  error: string | null;
  status: RpgBadgesPageStatus;
  summary: RpgBadgeGallerySummary | null;
};

const initialState: RpgBadgesPageState = {
  error: null,
  status: 'loading',
  summary: null,
};

function getBadgeTone(badge: RpgBadgeSummary): RpgStatusTone {
  return badge.earned ? 'success' : 'neutral';
}

function formatEarnedDate(isoTimestamp: string) {
  return isoTimestamp.slice(0, 10);
}

function hasEarnedBadges(summary: RpgBadgeGallerySummary) {
  return summary.earnedBadgeCount > 0;
}

export function RpgBadgesPage() {
  const [state, setState] = useState<RpgBadgesPageState>(initialState);
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
        const summary = await loadRpgBadgeGallerySummary();

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
        console.error('RPG badge gallery loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: 'The Badge Gallery could not be loaded from local data.',
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
        <section className="page-section rpg-badges">
          <div className="rpg-badges__header">
            <p className="rpg-badges__eyebrow">RPG</p>
            <h1>Badge Gallery</h1>
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
            description={state.error ?? 'Unknown Badge Gallery error.'}
            title="Badge Gallery could not be read"
          />
        </section>
      );
    }

    return (
      <section className="page-section rpg-badges">
        <div className="rpg-badges__header">
          <p className="rpg-badges__eyebrow">RPG</p>
          <h1>Badge Gallery</h1>
        </div>
        <LoadingState
          description="Reading existing achievement definitions and unlock records."
          title="Loading Badge Gallery"
        />
      </section>
    );
  }

  const { summary } = state;

  return (
    <section className="page-section rpg-badges">
      <div className="rpg-badges__header">
        <div>
          <p className="rpg-badges__eyebrow">RPG</p>
          <h1>Badge Gallery</h1>
          <p className="rpg-badges__lede">
            Read-only achievement gallery from local unlock records.
          </p>
        </div>
        <div className="rpg-badges__actions">
          <RpgButton href={rpgRoutePath}>Back to Hub</RpgButton>
          <RpgButton href={rpgMapPath} variant="secondary">
            Open Campaign Map
          </RpgButton>
        </div>
      </div>

      <RpgPanel title="Badge summary" titleAs="h2">
        <dl className="rpg-badges__summary">
          <div>
            <dt>Earned badges</dt>
            <dd>{summary.earnedBadgeCount}</dd>
          </div>
          <div>
            <dt>Locked badges</dt>
            <dd>{summary.lockedBadgeCount}</dd>
          </div>
          <div>
            <dt>Total available</dt>
            <dd>{summary.totalBadgeCount}</dd>
          </div>
        </dl>
        <p className="rpg-badges__note">
          {`${summary.earnedBadgeCount} of ${summary.totalBadgeCount} badges earned`}
        </p>
      </RpgPanel>

      {hasEarnedBadges(summary) ? null : (
        <RpgEmptyState
          action={
            <div className="rpg-badges__actions">
              <RpgButton href={rpgMapPath}>Open Campaign Map</RpgButton>
              <RpgButton href={rpgRoutePath} variant="secondary">
                Back to Hub
              </RpgButton>
            </div>
          }
          description="No badges have been earned yet. The locked badges below show the exact existing achievement requirements without unlocking anything on page load."
          eyebrow="No earned badges"
          title="Badge Gallery is ready"
        />
      )}

      <RpgPanel
        description="Requirements come from the existing achievement definitions."
        title="Available badges"
        titleAs="h2"
      >
        <ul className="rpg-badges__grid" role="list">
          {summary.badges.map((badge) => {
            const titleId = `rpg-badge-title-${badge.id}`;

            return (
              <li key={badge.id}>
                <article
                  aria-labelledby={titleId}
                  className="rpg-badges__card"
                  data-earned={badge.earned ? 'true' : 'false'}
                >
                  <div className="rpg-badges__card-header">
                    <div className="rpg-badges__mark" aria-hidden="true">
                      {badge.earned ? 'E' : 'L'}
                    </div>
                    <div>
                      <p className="rpg-badges__category">
                        {badge.categoryLabel}
                      </p>
                      <h3 id={titleId}>{badge.title}</h3>
                    </div>
                    <RpgStatusPill tone={getBadgeTone(badge)}>
                      {badge.statusLabel}
                    </RpgStatusPill>
                  </div>

                  <dl className="rpg-badges__details">
                    <div>
                      <dt>Requirement</dt>
                      <dd>{badge.requirementText}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{badge.statusLabel}</dd>
                    </div>
                    {badge.earnedAt !== null ? (
                      <div>
                        <dt>Earned date</dt>
                        <dd>{`Earned ${formatEarnedDate(badge.earnedAt)}`}</dd>
                      </div>
                    ) : null}
                  </dl>
                </article>
              </li>
            );
          })}
        </ul>
      </RpgPanel>
    </section>
  );
}
