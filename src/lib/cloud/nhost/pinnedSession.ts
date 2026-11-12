import type { NhostClient } from '@nhost/nhost-js';
import { createAPIClient } from '@nhost/nhost-js/auth';
import type { StoredSession } from '@nhost/nhost-js/session';

export function isSameSession(
  current: StoredSession | null,
  expected: StoredSession,
) {
  return (
    current?.user?.id === expected.user?.id &&
    current?.accessToken === expected.accessToken &&
    current.refreshToken === expected.refreshToken
  );
}

export function needsRefresh(session: StoredSession) {
  return (session.decodedToken?.exp ?? 0) - Date.now() <= 60_000;
}

export async function renewPinnedSession(
  getClient: () => NhostClient,
  client: NhostClient,
  original: StoredSession,
  signal: AbortSignal,
) {
  const renew = async () => {
    if (signal.aborted || getClient() !== client) return null;
    const current = client.getUserSession();
    if (current?.user?.id !== original.user?.id || !current?.accessToken)
      return null;
    if (!needsRefresh(current)) return current;
    if (!current.refreshToken || !isSameSession(current, original)) return null;

    // The SDK's session response middleware writes /token replies
    // unconditionally. Use its unconfigured Auth client for this exchange.
    const { body } = await createAPIClient(client.auth.baseURL).refreshToken(
      { refreshToken: current.refreshToken },
      { signal },
    );
    if (
      signal.aborted ||
      getClient() !== client ||
      !isSameSession(client.getUserSession(), current) ||
      body?.user?.id !== current.user?.id ||
      !body?.accessToken ||
      !body?.refreshToken
    )
      return null;

    client.sessionStorage.set(body);
    return client.getUserSession();
  };

  // Serialize with the SDK refresh used by the other cloud actions.
  return (
    navigator.locks?.request('nhostSessionLock', { signal }, renew) ?? renew()
  );
}
