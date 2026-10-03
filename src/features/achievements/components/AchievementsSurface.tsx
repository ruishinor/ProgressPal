import {
  startTransition,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  achievementCategoryLabels,
  buildCategoryOptions,
  filterAchievements,
  formatUnlockDate,
  type AchievementCategoryFilter,
  type AchievementStatusFilter,
} from '@/features/achievements/model';
import { readAchievementsSurfaceData, type AchievementsView } from '@/lib/db';
import { useAppState } from '@/lib/appState';
import { requireProgrammeScope } from '@/lib/domain';
import { rpgMapPath, rpgRoutePath } from '@/lib/routing/rpgRoutePaths';

// The same achievements surface renders in two shells: the classic Achievements
// route and the RPG "Awards" route (/rpg/badges). Achievements are the product
// concept; the RPG badge is only the visual artifact. Only the section wrapper
// and the route header differ by variant; the definitions, earned/locked truth,
// requirement copy, filters, and the read-only data path are identical.
type AchievementsSurfaceVariant = 'classic' | 'rpg';

type AchievementsSurfaceProps = {
  variant?: AchievementsSurfaceVariant;
  renderArtwork?: (achievementId: string) => ReactNode;
};

type AchievementsPageStatus = 'error' | 'loading' | 'ready';

type AchievementsPageState = {
  error: string | null;
  status: AchievementsPageStatus;
  view: AchievementsView | null;
  xpLevel: number | null;
};

const initialState: AchievementsPageState = {
  error: null,
  status: 'loading',
  view: null,
  xpLevel: null,
};

const statusOptions: { label: string; value: AchievementStatusFilter }[] = [
  { value: 'all', label: 'All achievements' },
  { value: 'unlocked', label: 'Unlocked' },
  { value: 'locked', label: 'Locked' },
];

export function AchievementsSurface({
  variant = 'classic',
  renderArtwork,
}: AchievementsSurfaceProps) {
  const { programmeScope } = useAppState();
  const isRpgVariant = variant === 'rpg';
  const sectionClassName = isRpgVariant
    ? 'page-section rpg-badges'
    : 'page-section';
  const [state, setState] = useState<AchievementsPageState>(initialState);
  const [reloadToken, setReloadToken] = useState(0);
  const [statusFilter, setStatusFilter] =
    useState<AchievementStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] =
    useState<AchievementCategoryFilter>('all');

  const statusFilterId = useId();
  const categoryFilterId = useId();

  useEffect(() => {
    let isActive = true;

    async function loadAchievements() {
      startTransition(() => {
        setState((currentState) => ({
          ...currentState,
          error: null,
          status: 'loading',
        }));
      });

      try {
        // Read-only: this merges code definitions with persisted unlocks. It
        // never evaluates rules and never creates unlocks.
        const scope = requireProgrammeScope(programmeScope);
        const { view, xpSummary } = await readAchievementsSurfaceData({
          policy: scope.policy,
          programmeId: scope.programmeId,
        });

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: null,
            status: 'ready',
            view,
            xpLevel: xpSummary.level,
          });
        });
      } catch (loadError) {
        console.error('Achievements loading failed.', loadError);

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState({
            error: 'The local achievements could not be loaded.',
            status: 'error',
            view: null,
            xpLevel: null,
          });
        });
      }
    }

    void loadAchievements();

    return () => {
      isActive = false;
    };
  }, [programmeScope, reloadToken]);

  const categoryOptions = useMemo(
    () => (state.view ? buildCategoryOptions(state.view) : []),
    [state.view],
  );

  const visibleAchievements = useMemo(
    () =>
      state.view
        ? filterAchievements(state.view, statusFilter, categoryFilter)
        : [],
    [state.view, statusFilter, categoryFilter],
  );

  if (state.status === 'error') {
    return (
      <section className={sectionClassName}>
        {isRpgVariant ? (
          <div className="rpg-badges__header rpg-page-header">
            <div>
              <p className="rpg-badges__eyebrow rpg-page-eyebrow">RPG</p>
              <h1>Achievements</h1>
            </div>
            <div className="rpg-badges__actions">
              <Link
                className="button button--secondary button--md"
                to={rpgRoutePath}
              >
                Back to Hub
              </Link>
            </div>
          </div>
        ) : (
          <PageHeader
            description="This page shows your earned and locked achievements."
            title="Achievements"
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
              Try again
            </button>
          }
          description={state.error ?? 'Unknown local achievements error.'}
          title="Achievements could not be read"
        />
      </section>
    );
  }

  if (state.status === 'loading' || state.view === null) {
    return (
      <section className={sectionClassName}>
        {isRpgVariant ? (
          <div className="rpg-badges__header rpg-page-header">
            <div>
              <p className="rpg-badges__eyebrow rpg-page-eyebrow">RPG</p>
              <h1>Achievements</h1>
            </div>
          </div>
        ) : (
          <PageHeader
            description="Loading your achievements."
            title="Achievements"
          />
        )}
        <LoadingState
          description="Opening your achievements."
          title="Loading achievements"
        />
      </section>
    );
  }

  const { unlockedCount, totalCount } = state.view;
  const AchievementTitle = isRpgVariant ? 'h2' : 'h3';

  const headerDescription =
    'Achievements unlock when you save progress and complete work. Everything is stored on this device.';
  const headerMeta = (
    <>
      {state.xpLevel !== null ? (
        <Badge tone="accent">{`Level ${state.xpLevel}`}</Badge>
      ) : null}
      <StatusPill
        variant={unlockedCount > 0 ? 'completed' : 'notStarted'}
      >{`${unlockedCount} of ${totalCount} unlocked`}</StatusPill>
    </>
  );

  return (
    <section className={sectionClassName}>
      {isRpgVariant ? (
        <div className="rpg-badges__header rpg-page-header">
          <div>
            <p className="rpg-badges__eyebrow rpg-page-eyebrow">RPG</p>
            <h1>Achievements</h1>
            <p className="rpg-badges__lede rpg-page-lede">
              {headerDescription}
            </p>
            <div className="meta-cluster">{headerMeta}</div>
          </div>
          <div className="rpg-badges__actions">
            <Link
              className="button button--secondary button--md"
              to={rpgRoutePath}
            >
              Back to Hub
            </Link>
            <Link
              className="button button--secondary button--md"
              to={rpgMapPath}
            >
              Open Campaign Map
            </Link>
          </div>
        </div>
      ) : (
        <PageHeader
          description={headerDescription}
          meta={headerMeta}
          title="Achievements"
        />
      )}

      <Card
        className="achievements-filters"
        title="Filter achievements"
        titleAs={isRpgVariant ? 'h2' : 'h3'}
        variant="subtle"
      >
        <div className="achievements-filters__controls">
          <div className="form-field">
            <label className="form-field__label" htmlFor={statusFilterId}>
              Status
            </label>
            <Select
              id={statusFilterId}
              onChange={(event) =>
                setStatusFilter(event.target.value as AchievementStatusFilter)
              }
              options={statusOptions}
              value={statusFilter}
            />
          </div>
          <div className="form-field">
            <label className="form-field__label" htmlFor={categoryFilterId}>
              Category
            </label>
            <Select
              id={categoryFilterId}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value as AchievementCategoryFilter,
                )
              }
              options={categoryOptions}
              value={categoryFilter}
            />
          </div>
        </div>
      </Card>

      {visibleAchievements.length === 0 ? (
        <EmptyState
          description="No achievements match the current filters. Try widening the status or category filter."
          eyebrow="No matches"
          title="Nothing to show here yet"
        />
      ) : (
        <ul className="achievements-grid" role="list">
          {visibleAchievements.map((achievement) => (
            <li key={achievement.id}>
              <Card
                as="article"
                className="achievement-card"
                data-testid={`achievement-${achievement.id}`}
                data-unlocked={achievement.unlocked ? 'true' : 'false'}
                variant={achievement.unlocked ? 'accent' : 'default'}
              >
                <div className="achievement-card__head">
                  {isRpgVariant ? renderArtwork?.(achievement.id) : null}
                  <AchievementTitle className="achievement-card__title">
                    {achievement.title}
                  </AchievementTitle>
                  <StatusPill
                    variant={achievement.unlocked ? 'completed' : 'notStarted'}
                  >
                    {achievement.unlocked
                      ? isRpgVariant
                        ? 'Earned'
                        : 'Unlocked'
                      : 'Locked'}
                  </StatusPill>
                </div>

                <p className="achievement-card__how">
                  {!isRpgVariant ? (
                    <span className="achievement-card__how-label">
                      {achievement.unlocked
                        ? isRpgVariant
                          ? 'Requirement met: '
                          : 'Earned for: '
                        : isRpgVariant
                          ? 'Requirement: '
                          : 'How to unlock: '}
                    </span>
                  ) : null}
                  {achievement.description}
                </p>

                <div className="achievement-card__meta">
                  <Badge tone="neutral">
                    {achievementCategoryLabels[achievement.category]}
                  </Badge>
                  {achievement.unlocked && achievement.unlockedAt ? (
                    <span className="achievement-card__date">
                      {`${isRpgVariant ? 'Earned' : 'Unlocked'} ${formatUnlockDate(achievement.unlockedAt)}`}
                    </span>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
