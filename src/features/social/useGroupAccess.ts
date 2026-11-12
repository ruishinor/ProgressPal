import { useEffect, useRef, useState } from 'react';

import {
  getCloudAccount,
  getSocialGroup,
  type CloudAccountState,
} from '@/lib/cloud';

export const defaultGuildName = 'Code Knights';

type AccountState = CloudAccountState | { status: 'unavailable' };

function readAccountState(): AccountState {
  try {
    return getCloudAccount().getState();
  } catch {
    return { status: 'unavailable' };
  }
}

export function useGroupAccess() {
  const account = getCloudAccount();
  const [state, setState] = useState(readAccountState);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const updateConnection = () => setOnline(navigator.onLine);
    const updateAccount = () => setState(readAccountState());
    const unsubscribe = account.subscribe(setState);
    window.addEventListener('storage', updateAccount);
    window.addEventListener('focus', updateAccount);
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      unsubscribe();
      window.removeEventListener('storage', updateAccount);
      window.removeEventListener('focus', updateAccount);
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, [account]);

  return { state, online };
}

export function useGuildName() {
  const { state, online } = useGroupAccess();
  const userId = online && state.status === 'signed-in' ? state.userId : null;
  const [guild, setGuild] = useState<{ userId: string; name: string | null }>();
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!userId) return;
    const request = new AbortController();
    pending.current = request;
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(15_000),
    ]);

    void getSocialGroup()
      .execute({ operation: 'read' }, userId, signal)
      .then((result) => {
        if (!request.signal.aborted) {
          setGuild({
            userId,
            name: result.status === 'ok' ? (result.group?.name ?? null) : null,
          });
        }
      })
      .catch(() => {
        if (!request.signal.aborted) setGuild({ userId, name: null });
      });
    return () => request.abort();
  }, [userId]);

  function onGuildName(accountId: string, name: string | null) {
    if (accountId !== userId) return;
    pending.current?.abort();
    setGuild({ userId, name });
  }

  return {
    guildName: guild?.userId === userId ? guild.name : null,
    onGuildName,
  };
}
