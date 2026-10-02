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
  type RewardNotification,
} from '@/lib/rewards/RewardNotificationContext';
import type { RewardEvent } from '@/lib/rewards/rewardEvents';

/**
 * In-memory, first-in-first-out reward presentation queue. Events enter only
 * through the announcer (called once per committed award mutation); nothing
 * is persisted, so a reload starts empty and never replays. One notification
 * shows at a time; each leaves after the fixed timeline and the next follows.
 */
export function RewardNotificationProvider({ children }: PropsWithChildren) {
  const nextIdRef = useRef(0);
  const [queue, setQueue] = useState<readonly RewardNotification[]>([]);
  const [leavingId, setLeavingId] = useState<number | null>(null);

  const announce = useCallback((events: readonly RewardEvent[]) => {
    if (events.length === 0) {
      return;
    }

    const notifications = events.map((event) => {
      nextIdRef.current += 1;
      return { ...event, id: nextIdRef.current };
    });

    setQueue((current) => [...current, ...notifications]);
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
  const state = useMemo(() => ({ current, leaving }), [current, leaving]);

  return (
    <RewardAnnouncerContext.Provider value={announce}>
      <RewardNotificationStateContext.Provider value={state}>
        {children}
      </RewardNotificationStateContext.Provider>
    </RewardAnnouncerContext.Provider>
  );
}
