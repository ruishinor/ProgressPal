import {
  getQuestActionLabel,
  getLevelProgressDisplay,
} from '@/features/rpg/model/presentation';
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';

import { RpgButton, RpgPanel, RpgProgressBar } from '@/features/rpg/components';
import type { RpgShellOutletContext } from '@/features/rpg/shell/RpgShell';
import { StudySessionsSurface } from '@/features/sessions';
import { achievementDefinitionsById } from '@/lib/achievements';
import type { AddStudySessionWithXpResult } from '@/lib/db';
import { getRpgResourcePath, rpgMapPath } from '@/lib/routing/rpgRoutePaths';

type RpgFocusSaveFeedback = {
  achievementNames: string[];
  durationMinutes: number;
  levelProgressLabel: string;
  level: number;
  levelProgressPercent: number | null;
  nextActionHref: string | null;
  nextActionLabel: string | null;
  refreshStatus: 'loading' | 'ready' | 'error';
  totalXp: number;
  xpAdded: number;
  xpToNextLevel: number;
};

// The RPG variant shares the timer and save engine with Classic. Its disclosures
// and reward feedback present the authoritative save result without new writes.
export function RpgFocusPage() {
  const { refreshHud } = useOutletContext<RpgShellOutletContext>();
  const { key: pageKey } = useLocation();
  const activePageKey = useRef<string | null>(pageKey);
  const [saveFeedback, setSaveFeedback] = useState<RpgFocusSaveFeedback | null>(
    null,
  );
  const refreshVersion = useRef(0);
  useEffect(() => {
    activePageKey.current = pageKey;
    startTransition(() => setSaveFeedback(null));

    return () => {
      activePageKey.current = null;
      refreshVersion.current += 1;
    };
  }, [pageKey]);
  const refreshProgressSummary = useCallback(
    async (feedback: RpgFocusSaveFeedback) => {
      const version = ++refreshVersion.current;
      setSaveFeedback({ ...feedback, refreshStatus: 'loading' });
      try {
        const hudSummary = await refreshHud();
        if (version !== refreshVersion.current) {
          return;
        }
        const recommendation = hudSummary.recommendation;
        const nextQuest = recommendation.quest;
        setSaveFeedback({
          ...feedback,
          levelProgressLabel: hudSummary.xpSummary.levelProgressLabel,
          level: hudSummary.xpSummary.level,
          levelProgressPercent: hudSummary.xpSummary.levelProgressPercent,
          nextActionHref:
            nextQuest === null ? rpgMapPath : getRpgResourcePath(nextQuest.id),
          nextActionLabel:
            nextQuest === null
              ? 'Open Campaign Map'
              : `${getQuestActionLabel(nextQuest.status)}: ${nextQuest.title}`,
          refreshStatus: 'ready',
          totalXp: hudSummary.xpSummary.totalXp,
          xpToNextLevel: hudSummary.xpSummary.xpToNextLevel,
        });
      } catch (loadError) {
        console.error(
          'RPG Focus next-quest feedback could not be refreshed.',
          loadError,
        );
        if (version === refreshVersion.current) {
          setSaveFeedback({ ...feedback, refreshStatus: 'error' });
        }
      }
    },
    [refreshHud],
  );
  const handleProgressSaved = useCallback(
    (result: AddStudySessionWithXpResult) => {
      if (activePageKey.current !== pageKey) {
        refreshHud();
        return;
      }

      const xpAdded = result.awardedTransactions.reduce(
        (total, transaction) => total + transaction.xp,
        0,
      );
      const achievementNames = result.unlockedAchievements
        .map(
          (unlock) =>
            achievementDefinitionsById.get(unlock.achievementId)?.title ?? '',
        )
        .filter(Boolean);
      const baseFeedback = {
        achievementNames,
        durationMinutes: result.studySession.durationMinutes,
        levelProgressLabel: getLevelProgressDisplay(result.xpSummary)
          .levelProgressLabel,
        level: result.xpSummary.level,
        levelProgressPercent: null,
        nextActionHref: null,
        nextActionLabel: null,
        refreshStatus: 'loading',
        totalXp: result.xpSummary.totalXp,
        xpAdded,
        xpToNextLevel: result.xpSummary.xpToNextLevel,
      } satisfies RpgFocusSaveFeedback;

      void refreshProgressSummary(baseFeedback);
    },
    [pageKey, refreshHud, refreshProgressSummary],
  );

  const feedbackPanel =
    saveFeedback === null ? null : (
      <RpgPanel
        className="rpg-focus__save-result"
        role="status"
        title="Session saved"
        titleAs="h2"
        variant="raised"
      >
        <p>{`${saveFeedback.durationMinutes} min study session saved locally.`}</p>
        {saveFeedback.xpAdded > 0 ? (
          <p>{`XP awarded: ${saveFeedback.xpAdded}`}</p>
        ) : null}
        {saveFeedback.achievementNames.length > 0 ? (
          <p>{`Achievement unlocked: ${saveFeedback.achievementNames.join(', ')}`}</p>
        ) : null}
        {saveFeedback.levelProgressPercent === null ? (
          <p>{`At save: Level ${saveFeedback.level}, ${saveFeedback.levelProgressLabel}.`}</p>
        ) : (
          <RpgProgressBar
            helperText={saveFeedback.levelProgressLabel}
            label={`Level ${saveFeedback.level} progress`}
            value={saveFeedback.levelProgressPercent}
          />
        )}
        {saveFeedback.refreshStatus === 'error' ? (
          <>
            <p>
              Your session is saved locally. The current progression and next
              quest could not be refreshed.
            </p>
            <RpgButton
              onClick={() => {
                void refreshProgressSummary(saveFeedback);
              }}
              variant="secondary"
            >
              Refresh progress summary
            </RpgButton>
          </>
        ) : saveFeedback.refreshStatus === 'loading' ? (
          <p>Refreshing the progress summary…</p>
        ) : saveFeedback.nextActionHref !== null ? (
          <RpgButton href={saveFeedback.nextActionHref} variant="secondary">
            {saveFeedback.nextActionLabel}
          </RpgButton>
        ) : null}
      </RpgPanel>
    );

  return (
    <StudySessionsSurface
      onProgressSaved={handleProgressSaved}
      saveFeedback={feedbackPanel}
      variant="rpg"
    />
  );
}
