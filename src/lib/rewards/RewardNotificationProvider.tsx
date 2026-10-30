import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  RewardAnnouncerContext,
  RewardNotificationStateContext,
  rewardNotificationTiming,
  type ActivityNarrativeNotification,
  type RewardNotification,
} from '@/lib/rewards/RewardNotificationContext';
import type { RewardEvent } from '@/lib/rewards/rewardEvents';

/**
 * In-memory, first-in-first-out reward presentation queue. Events enter only
 * through the announcer (called once per committed award mutation); nothing
 * is persisted, so a reload starts empty and never replays. Non-Activity
 * notices retain their original timeline. Activity fiction is grouped into
 * one non-modal, manually dismissible reading panel instead of timed toasts.
 */
export function RewardNotificationProvider({ children }: PropsWithChildren) {
  const nextIdRef = useRef(0);
  const [queue, setQueue] = useState<readonly RewardNotification[]>([]);
  const [leavingId, setLeavingId] = useState<number | null>(null);
  const [narratives, setNarratives] = useState<
    readonly ActivityNarrativeNotification[]
  >([]);
  const dismissNarratives = useCallback(() => setNarratives([]), []);

  const announce = useCallback((events: readonly RewardEvent[]) => {
    if (events.length === 0) {
      return;
    }

    const notifications = events.map((event) => {
      nextIdRef.current += 1;
      return { ...event, id: nextIdRef.current };
    });

    const stories = notifications.filter(
      (event): event is ActivityNarrativeNotification =>
        event.kind === 'achievement' && typeof event.narrative === 'string',
    );
    if (stories.length > 0) {
      setNarratives((current) => [
        ...current,
        ...stories.filter(
          (story) =>
            !current.some((item) => item.achievementId === story.achievementId),
        ),
      ]);
    }
    // A simultaneous Activity unlock is a single readable panel, not a
    // procession of three-second toasts. Ordinary rewards are unchanged.
    const transient = notifications.filter(
      (event) =>
        !(event.kind === 'achievement' && typeof event.narrative === 'string'),
    );
    if (transient.length > 0) {
      setQueue((current) => [...current, ...transient]);
    }
  }, []);

  const current = queue[0] ?? null;
  const currentId = current?.id ?? null;

  useEffect(() => {
    if (currentId === null) {
      return;
    }

    const { enterMs, exitMs, holdMs } = rewardNotificationTiming;
    const leaveTimer = window.setTimeout(() => {
      setLeavingId(currentId);
    }, enterMs + holdMs);
    const doneTimer = window.setTimeout(
      () => {
        setQueue((queued) =>
          queued[0]?.id === currentId ? queued.slice(1) : queued,
        );
      },
      enterMs + holdMs + exitMs,
    );

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, [currentId]);

  const leaving = current !== null && leavingId === current.id;
  const state = useMemo(
    () => ({ current, leaving, narratives, dismissNarratives }),
    [current, leaving, narratives, dismissNarratives],
  );

  return (
    <RewardAnnouncerContext.Provider value={announce}>
      <RewardNotificationStateContext.Provider value={state}>
        {children}
      </RewardNotificationStateContext.Provider>
    </RewardAnnouncerContext.Provider>
  );
}
