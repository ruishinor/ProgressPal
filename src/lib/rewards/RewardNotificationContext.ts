import { createContext, useContext } from 'react';

import type { RewardEvent } from '@/lib/rewards/rewardEvents';

/** One queued reward presentation; `id` is unique per provider instance. */
export type RewardNotification = RewardEvent & { readonly id: number };

export type RewardNotificationState = {
  /** The notification on screen, or null when the queue is empty. */
  readonly current: RewardNotification | null;
  /** Whether `current` is in its exit phase. */
  readonly leaving: boolean;
};

/**
 * Presentation timeline (ms). The enter and exit values match the
 * `.reward-notice` animations in design-system.css.
 */
export const rewardNotificationTiming = {
  enterMs: 260,
  holdMs: 2800,
  exitMs: 240,
} as const;

export type AnnounceRewards = (events: readonly RewardEvent[]) => void;

// Two contexts: the announcer is stable, so its consumer (app state) never
// re-renders when the queue advances.
export const RewardAnnouncerContext = createContext<AnnounceRewards | null>(
  null,
);

export const RewardNotificationStateContext =
  createContext<RewardNotificationState>({ current: null, leaving: false });

/** The queue's announcer, or null outside a RewardNotificationProvider. */
export function useRewardAnnouncer() {
  return useContext(RewardAnnouncerContext);
}

export function useRewardNotificationState() {
  return useContext(RewardNotificationStateContext);
}
