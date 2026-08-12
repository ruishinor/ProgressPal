import { useCallback, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import { RpgButton, RpgPanel, RpgProgressBar } from '@/features/rpg/components';
import { loadRpgHubSummary } from '@/features/rpg/model/readModels';
import type { RpgShellOutletContext } from '@/features/rpg/shell/RpgShell';
import {
  StudySessionsSurface,
  type StudySessionSaveResult,
} from '@/features/sessions';
import { achievementDefinitionsById } from '@/lib/achievements';
import { getRpgResourcePath, rpgMapPath } from '@/lib/routing/rpgRoutePaths';

type RpgFocusSaveFeedback = {
  achievementNames: string[];
  durationMinutes: number;
  level: number;
  levelProgressPercent: number | null;
  nextActionHref: string;
  nextActionLabel: string;
  totalXp: number;
  xpAdded: number;
  xpToNextLevel: number;
};

// /rpg/focus wraps the classic study-session/focus surface in the RPG shell.
// The flow, controls, timer behavior, and engine writes are the classic ones;
// only the surrounding RPG header and shell styling differ. See the Phase 2C
// wrapper contract: "color it and leave it".
export function RpgFocusPage() {
  const { refreshHud } = useOutletContext<RpgShellOutletContext>();
  const [saveFeedback, setSaveFeedback] = useState<RpgFocusSaveFeedback | null>(
    null,
  );
  const handleProgressSaved = useCallback(
    (result: StudySessionSaveResult) => {
      refreshHud();

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
        level: result.xpSummary.level,
        levelProgressPercent: null,
        nextActionHref: rpgMapPath,
        nextActionLabel: 'Open Campaign Map',
        totalXp: result.xpSummary.totalXp,
        xpAdded,
        xpToNextLevel: result.xpSummary.xpToNextLevel,
      } satisfies RpgFocusSaveFeedback;

      void loadRpgHubSummary()
        .then((hubSummary) => {
          const nextQuest = hubSummary.continueQuest;

          setSaveFeedback({
            ...baseFeedback,
            level: hubSummary.xpSummary.level,
            levelProgressPercent: hubSummary.xpSummary.levelProgressPercent,
            nextActionHref:
              nextQuest === null
                ? rpgMapPath
                : getRpgResourcePath(nextQuest.id),
            nextActionLabel:
              nextQuest === null
                ? 'Open Campaign Map'
                : `Continue quest: ${nextQuest.title}`,
            totalXp: hubSummary.xpSummary.totalXp,
            xpToNextLevel: hubSummary.xpSummary.xpToNextLevel,
          });
        })
        .catch((loadError: unknown) => {
          console.error(
            'RPG Focus next-quest feedback could not be refreshed.',
            loadError,
          );
          setSaveFeedback(baseFeedback);
        });
    },
    [refreshHud],
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
          <p>{`Level ${saveFeedback.level}: ${saveFeedback.totalXp} XP total, ${saveFeedback.xpToNextLevel} XP to next level.`}</p>
        ) : (
          <RpgProgressBar
            helperText={`${saveFeedback.totalXp} XP total - ${saveFeedback.xpToNextLevel} XP to next level`}
            label={`Level ${saveFeedback.level} progress`}
            value={saveFeedback.levelProgressPercent}
          />
        )}
        <RpgButton href={saveFeedback.nextActionHref} variant="secondary">
          {saveFeedback.nextActionLabel}
        </RpgButton>
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
