import { startTransition, useEffect, useState } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatMinutes } from '@/features/course/model';
import {
  RpgButton,
  RpgEmptyState,
  RpgPanel,
  RpgProgressBar,
  RpgRankBadge,
  RpgStatusPill,
} from '@/features/rpg/components';
import { loadRpgHeroProfileSummary } from '@/features/rpg/model/readModels';
import type { RpgHeroProfileSummary } from '@/features/rpg/model/types';
import {
  rpgBadgesPath,
  rpgLogPath,
  rpgMapPath,
  rpgRoutePath,
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

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials.length > 0 ? initials : 'L';
}

export function RpgHeroPage() {
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
        const summary = await loadRpgHeroProfileSummary();

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
  }, [reloadToken]);

  if (state.status === 'loading' || state.summary === null) {
    if (state.status === 'error') {
      return (
        <section className="page-section rpg-hero">
          <div className="rpg-hero__header">
            <p className="rpg-hero__eyebrow">RPG</p>
            <h1>Hero Profile</h1>
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
            description={state.error ?? 'Unknown Hero Profile error.'}
            title="Hero Profile could not be read"
          />
        </section>
      );
    }

    return (
      <section className="page-section rpg-hero">
        <div className="rpg-hero__header">
          <p className="rpg-hero__eyebrow">RPG</p>
          <h1>Hero Profile</h1>
        </div>
        <LoadingState
          description="Building the profile from local progress, XP, sessions, and badges."
          title="Loading Hero Profile"
        />
      </section>
    );
  }

  const { summary } = state;

  return (
    <section className="page-section rpg-hero">
      <div className="rpg-hero__header">
        <div>
          <p className="rpg-hero__eyebrow">RPG</p>
          <h1>Hero Profile</h1>
          <p className="rpg-hero__lede">
            Read-only profile derived from local ProgressPal records.
          </p>
        </div>
        <div className="rpg-hero__actions">
          <RpgButton href={rpgRoutePath}>Back to Hub</RpgButton>
          <RpgButton href={rpgMapPath} variant="secondary">
            Open Campaign Map
          </RpgButton>
        </div>
      </div>

      {summary.hasLocalActivity ? null : (
        <RpgEmptyState
          action={
            <div className="rpg-hero__actions">
              <RpgButton href={rpgMapPath}>Open Campaign Map</RpgButton>
              <RpgButton href={rpgRoutePath} variant="secondary">
                Back to Hub
              </RpgButton>
            </div>
          }
          description="Save progress or finish a Focus Session to fill this profile with local XP, study time, badges, and recent activity."
          eyebrow="New local profile"
          title="No saved Hero activity yet"
        />
      )}

      <div className="rpg-hero__grid">
        <RpgPanel
          className="rpg-hero__identity"
          title={`${summary.learnerName}'s profile`}
          titleAs="h2"
          variant="raised"
        >
          <div className="rpg-hero__identity-layout">
            <div className="rpg-hero__avatar" aria-hidden="true">
              {getInitials(summary.learnerName)}
            </div>
            <div className="rpg-hero__identity-copy">
              <RpgRankBadge rank={summary.identity.rankLabel} />
              <RpgStatusPill tone="neutral">
                {`Guild: ${summary.identity.guildLabel}`}
              </RpgStatusPill>
              <p className="rpg-hero__note">
                Rank reflects local required-course progress only.
              </p>
            </div>
          </div>
          <dl className="rpg-hero__details">
            <div>
              <dt>Path</dt>
              <dd>{summary.identity.pathLabel}</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>{summary.identity.classLabel}</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>{summary.xpSummary.level}</dd>
            </div>
            <div>
              <dt>XP</dt>
              <dd>{summary.xpSummary.totalXp}</dd>
            </div>
          </dl>
        </RpgPanel>

        <RpgPanel title="Required course progress" titleAs="h2">
          <RpgProgressBar
            helperText={`${summary.courseProgress.completedRequiredItemCount} of ${summary.courseProgress.requiredItemCount} required tasks complete`}
            label="Required progress"
            showValue={summary.courseProgress.requiredItemCount > 0}
            value={summary.courseProgress.completionPercent}
          />
          <p className="rpg-hero__note">
            Local ProgressPal progress, not official CS50 completion.
          </p>
        </RpgPanel>

        <RpgPanel title="Local activity totals" titleAs="h2">
          <dl className="rpg-hero__details rpg-hero__details--compact">
            <div>
              <dt>Study sessions</dt>
              <dd>{summary.studySummary.sessionCount}</dd>
            </div>
            <div>
              <dt>Study time</dt>
              <dd>{formatMinutes(summary.studySummary.totalMinutes)}</dd>
            </div>
            <div>
              <dt>XP to next level</dt>
              <dd>{summary.xpSummary.xpToNextLevel}</dd>
            </div>
            <div>
              <dt>Badges</dt>
              <dd>{`${summary.badges.earnedBadgeCount} of ${summary.badges.totalBadgeCount}`}</dd>
            </div>
          </dl>
          <div className="rpg-hero__actions">
            <RpgButton href={rpgBadgesPath} size="sm" variant="quiet">
              Open Badge Gallery
            </RpgButton>
            <RpgButton href={rpgLogPath} size="sm" variant="quiet">
              Open Journey Log
            </RpgButton>
          </div>
        </RpgPanel>

        <RpgPanel
          className="rpg-hero__recent"
          title="Recent saved activity"
          titleAs="h2"
        >
          {summary.recentActivity.length === 0 ? (
            <p className="rpg-hero__note">
              No recent saved activity yet. Saved progress, study sessions, XP,
              and badges will shape this profile after explicit local actions.
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
