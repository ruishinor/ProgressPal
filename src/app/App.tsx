import { useSyncExternalStore } from 'react';

import { AccountSyncGate } from '@/app/providers/AccountSyncGate';
import { AppProviders } from '@/app/providers/AppProviders';
import { AppRouter } from '@/app/router/AppRouter';
import { router } from '@/app/router/router';
import { cloudCallbackPath } from '@/lib/cloud';
import {
  accountSyncEnabled,
  hasAccountBinding,
  syncBindingKey,
} from '@/lib/cloudSync/rollout';

function currentPath() {
  return router.state.location.pathname;
}

function subscribeToAccountBinding(change: () => void) {
  function storageChanged(event: StorageEvent) {
    if (event.key === syncBindingKey || event.key === null) change();
  }
  window.addEventListener('storage', storageChanged);
  return () => window.removeEventListener('storage', storageChanged);
}

export function App() {
  const pathname = useSyncExternalStore(router.subscribe, currentPath);
  const hasBinding = useSyncExternalStore(
    subscribeToAccountBinding,
    hasAccountBinding,
  );
  const requiresAccount = accountSyncEnabled || hasBinding;
  if (requiresAccount && pathname === cloudCallbackPath) return <AppRouter />;
  return (
    <AppProviders gate={requiresAccount ? AccountSyncGate : undefined}>
      <AppRouter />
    </AppProviders>
  );
}
