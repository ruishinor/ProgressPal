import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { useAppState } from '@/lib/appState';
import { getCloudAccount, getCloudSyncStore, SyncFailure } from '@/lib/cloud';
import {
  reconcileLearning,
  type SyncResolution,
  type SyncResult,
} from '@/lib/cloudSync/reconcile';
import type { SyncCatalogue } from '@/lib/cloudSync/snapshot';
import { getDatabaseSnapshot, restoreDatabaseFromBackup } from '@/lib/db';
import { LocalWriteBlockedError } from '@/lib/storage';

type View =
  | SyncResult
  | {
      status:
        | 'initial'
        | 'synchronizing'
        | 'offline'
        | 'unavailable'
        | 'authentication'
        | 'incompatible'
        | 'disabled'
        | 'device-unreadable'
        | 'too-large';
    };

type Controller = {
  changed: () => void;
  retry: () => void;
  resolve: (resolution: SyncResolution) => void;
};

const saveDelay = 1_500;
const minCycleGap = 4_000;
const pollDelay = () =>
  (document.hidden ? 60_000 : 20_000) + Math.random() * 10_000;

export function useLearningSync(
  userId: string | null,
  catalogue: SyncCatalogue,
) {
  const app = useAppState();
  const appRef = useRef(app);
  const controller = useRef<Controller | null>(null);
  const [state, setState] = useState<{ userId: string; view: View } | null>(
    null,
  );

  useLayoutEffect(() => {
    appRef.current = app;
  }, [app]);

  const {
    status,
    coordination: { canWrite, peerActive, revision },
  } = app;
  useEffect(() => {
    controller.current?.changed();
  }, [status, canWrite, peerActive, revision]);

  useEffect(() => {
    if (userId === null) return;
    const account = getCloudAccount();
    const lifetime = new AbortController();
    const signal = lifetime.signal;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    let again = false;
    let paused = false;
    let failureCount = 0;
    let retryAt = 0;
    let nextCycleAt = 0;
    let view: View = { status: 'initial' };

    function publish(next: View) {
      if (signal.aborted) return;
      view = next;
      setState({ userId: userId!, view: next });
    }

    function isCurrentAccount() {
      const auth = account.getState();
      return auth.status === 'signed-in' && auth.userId === userId;
    }

    function schedule(delay: number) {
      clearTimeout(timer);
      timer = setTimeout(
        () => void run(),
        Math.max(delay, Math.max(retryAt, nextCycleAt) - Date.now()),
      );
    }

    async function run(resolution?: SyncResolution) {
      if (signal.aborted || inFlight || (paused && resolution === undefined))
        return;
      if (!isCurrentAccount()) {
        lifetime.abort();
        return;
      }
      if (!navigator.onLine) {
        publish({ status: 'offline' });
        return;
      }
      if (appRef.current.status === 'error') {
        publish({ status: 'unavailable' });
        return;
      }
      if (
        appRef.current.status !== 'ready' ||
        !appRef.current.coordination.canWrite
      ) {
        schedule(pollDelay());
        return;
      }

      inFlight = true;
      nextCycleAt = Date.now() + minCycleGap;
      let nextDelay = pollDelay();
      if (resolution !== undefined) publish({ status: 'pending' });
      try {
        const result = await reconcileLearning(
          {
            userId: userId!,
            isCurrentAccount,
            signal,
            store: getCloudSyncStore(),
            storage: localStorage,
            catalogue,
            readLocal: getDatabaseSnapshot,
            mayReplaceLocal: () => !appRef.current.coordination.peerActive,
            onTransfer: () => publish({ status: 'synchronizing' }),
            replaceLocal: async (snapshot, assertCurrent, operationSignal) => {
              await appRef.current.runLocalMutation(
                () =>
                  restoreDatabaseFromBackup(snapshot, {
                    synchronization: { assertCurrent, signal: operationSignal },
                  }),
                { invalidateRoute: true },
              );
            },
          },
          resolution,
        );
        failureCount = 0;
        retryAt = 0;
        paused = !['ready', 'ready-to-learn', 'pending', 'tab-open'].includes(
          result.status,
        );
        publish(result);
        if (result.status === 'pending') nextDelay = saveDelay;
      } catch (error) {
        if (signal.aborted) return;
        const code =
          error instanceof SyncFailure
            ? error.code
            : error instanceof LocalWriteBlockedError
              ? 'unavailable'
              : 'incompatible';
        if (!navigator.onLine) {
          paused = false;
          publish({ status: 'offline' });
          return;
        }
        switch (code) {
          case 'stale':
            paused = false;
            publish({ status: 'pending' });
            nextDelay = saveDelay;
            break;
          case 'unavailable':
          case 'rate-limited':
            paused = false;
            publish({ status: 'unavailable' });
            failureCount += 1;
            retryAt =
              Date.now() +
              Math.max(
                code === 'rate-limited' ? 60_000 : 0,
                Math.min(120_000, 5_000 * 2 ** Math.min(failureCount - 1, 5)),
              ) +
              Math.random() * 3_000;
            nextDelay = 0;
            break;
          default:
            paused = true;
            publish({ status: code });
        }
      } finally {
        inFlight = false;
        if (!signal.aborted && !paused && navigator.onLine) {
          schedule(again ? saveDelay : nextDelay);
        }
        again = false;
      }
    }

    function changed() {
      if (paused) return;
      if (view.status === 'ready') publish({ status: 'pending' });
      if (inFlight) again = true;
      else schedule(saveDelay);
    }

    function wake() {
      if (paused || inFlight) return;
      schedule(saveDelay);
    }

    function offline() {
      if (!paused) publish({ status: 'offline' });
    }

    const unsubscribe = account.subscribe(() => {
      if (!isCurrentAccount()) {
        lifetime.abort();
        clearTimeout(timer);
      }
    });
    const visibility = () => {
      if (!document.hidden) wake();
    };
    controller.current = {
      changed,
      retry() {
        paused = false;
        void appRef.current.refresh().then(wake);
      },
      resolve(resolution) {
        void run(resolution);
      },
    };
    window.addEventListener('online', wake);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', visibility);
    schedule(0);

    return () => {
      lifetime.abort();
      unsubscribe();
      clearTimeout(timer);
      window.removeEventListener('online', wake);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', visibility);
      controller.current = null;
    };
  }, [catalogue, userId]);

  return {
    view:
      state?.userId === userId ? state.view : ({ status: 'initial' } as const),
    retry: () => controller.current?.retry(),
    resolve: (resolution: SyncResolution) =>
      controller.current?.resolve(resolution),
  };
}
