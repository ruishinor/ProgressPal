import type { PropsWithChildren } from 'react';

import { ActivityNarrativePanel } from '@/components/ui/ActivityNarrativePanel';
import { RewardNoticeRegion } from '@/components/ui/RewardNotice';
import { RpgAchievementArt } from '@/features/rpg';
import { AppStateProvider } from '@/lib/appState';
import {
  RewardNotificationProvider,
  useRewardNotificationState,
} from '@/lib/rewards';

import {
  resolveDatabaseMigrationContext,
  resolveProgrammeScope,
} from './programmeComposition';

function renderAchievementArtwork(achievementId: string) {
  return <RpgAchievementArt achievementId={achievementId} />;
}

/**
 * The one reward notice presentation for Classic and RPG alike. It sits
 * outside the router, so route changes and data-epoch remounts never restart
 * or replay a notice. The timed toast keeps its shell-specific artwork;
 * Activity fiction is presented with its badge in both shells.
 */
function RewardNotices() {
  const { current, leaving, narratives, dismissNarratives } =
    useRewardNotificationState();

  return (
    <>
      <RewardNoticeRegion
        leaving={leaving}
        notification={current}
        renderArtwork={renderAchievementArtwork}
      />
      <ActivityNarrativePanel
        notifications={narratives}
        onDismiss={dismissNarratives}
        renderArtwork={renderAchievementArtwork}
      />
    </>
  );
}

/**
 * The composition root hands app state two stable resolvers (Epic C / C7): one
 * that authorizes every registered programme for the database, and one that
 * resolves a persisted programme ID to its runtime scope. App state derives
 * the active scope from persisted state on every stable resolution. An
 * unresolvable programme becomes the existing bootstrap error state.
 */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <RewardNotificationProvider>
      <AppStateProvider
        resolveProgramme={resolveProgrammeScope}
        resolveMigrationContext={resolveDatabaseMigrationContext}
      >
        {children}
      </AppStateProvider>
      <RewardNotices />
    </RewardNotificationProvider>
  );
}
