import { useEffect, useState } from 'react';

import { getCloudAccount, type CloudAccountState } from '@/lib/cloud';

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
  const userId = state.status === 'signed-in' ? state.userId : null;
  const [guild, setGuild] = useState<{
    userId: string | null;
    name: string | null;
  }>({
    userId,
    name: null,
  });
  if (guild.userId !== userId) setGuild({ userId, name: null });

  function onGuildName(accountId: string, name: string | null) {
    const account = readAccountState();
    if (account.status !== 'signed-in' || account.userId !== accountId) return;
    setGuild((previous) =>
      previous.userId === accountId ? { userId: accountId, name } : previous,
    );
  }

  return {
    guildName: online && guild.userId === userId ? guild.name : null,
    onGuildName,
  };
}
