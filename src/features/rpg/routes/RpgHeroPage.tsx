import { startTransition, useEffect, useState } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { formatMinutes } from '@/lib/time';
import {
  RpgButton,
  RpgEmptyState,
  RpgPanel,
  RpgProgressBar,
  RpgHeroIdentity,
  RpgLevelProgress,
} from '@/features/rpg/components';
import { loadRpgHeroProfileSummary } from '@/features/rpg/model/readModels';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope } from '@/lib/domain';
import type { RpgHeroProfileSummary } from '@/features/rpg/model/types';
import {
  rpgBadgesPath,
  rpgLogPath,
  rpgRoutePath,
  rpgSettingsPath,
} from '@/lib/routing/rpgRoutePaths';
import { getActiveProgrammeDefinition } from '@/programmes';

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

export function RpgHeroPage() {
  const { programmeScope } = useAppState();
  const { copy } = getActiveProgrammeDefinition().content.terminology;
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
        const summary = await loadRpgHeroProfileSummary(
          requireProgrammeScope(programmeScope),
        );

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
  }, [programmeScope, reloadToken]);

  if (state.status === 'loading' || state.summary === null) {
    if (state.status === 'error') {
      return (
        <section className="page-section rpg-hero">
          <div className="rpg-hero__header rpg-page-header">
            <p className="rpg-hero__eyebrow rpg-page-eyebrow">RPG</p>
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
        <div className="rpg-hero__header rpg-page-header">
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
      <div className="rpg-hero__header rpg-page-header">
        <div>
          <p className="rpg-hero__eyebrow rpg-page-eyebrow">RPG</p>
          <h1>Hero Profile</h1>
          <p className="rpg-hero__lede rpg-page-lede">
            Your study progress, milestones, and saved activity.
          </p>
        </div>
        <div className="rpg-hero__actions">
          <RpgButton href={rpgSettingsPath} variant="secondary">
            Edit profile
          </RpgButton>
        </div>
      </div>

      <div className="rpg-hero__grid">
        <RpgPanel
          className="rpg-hero__identity"
          aria-label="Learner identity and progression"
          variant="raised"
        >
          <div className="rpg-hero__identity-layout">
            <RpgHeroIdentity
              avatarConfig={summary.learnerAvatarConfig}
              identity={summary.identity}
              name={summary.learnerName}
              variant="profile"
            />
            <RpgLevelProgress xp={summary.xpSummary} />
          </div>
          <p className="rpg-hero__note">
            Rank reflects local required-course progress only.
          </p>
        </RpgPanel>

        {summary.hasLocalActivity ? null : (
          <RpgEmptyState
            className="rpg-hero__recent"
            action={<RpgButton href={rpgRoutePath}>Open Hub</RpgButton>}
            description="Save progress or finish a Focus Session to build your XP, study time, and achievements."
            title="No saved Hero activity yet"
          />
        )}

        <RpgPanel title="Required course progress" titleAs="h2">
          <RpgProgressBar
            helperText={`${summary.courseProgress.completedRequiredItemCount} of ${summary.courseProgress.requiredItemCount} required tasks complete`}
            label="Required progress"
            showValue={summary.courseProgress.requiredItemCount > 0}
            value={summary.courseProgress.completionPercent}
          />
          <p className="rpg-hero__note">{copy.rpgHeroProgressNote}</p>
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
              Open Insights
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
              Your saved progress, study sessions, and achievements will appear
              here.
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
