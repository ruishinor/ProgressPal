import {
  DEFAULT_SESSION_KEY,
  LocalStorage,
  type SessionStorageBackend,
  type StoredSession,
} from '@nhost/nhost-js/session';

/**
 * Where the signed-in session lives. The SDK's own default is localStorage;
 * ProgressPal's default is the opposite: the session dies with the tab, and
 * persistence is an explicit, device-local learner choice (trusted device).
 */

/** Key used by the session-scoped backend (sessionStorage). */
export const cloudSessionStorageKey = 'progresspal:cloud:session';

/** Key used by the SDK's persistent backend: the SDK default, unchanged. */
export const persistentSessionStorageKey = DEFAULT_SESSION_KEY;

type SessionStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function tabStore(): SessionStore | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Synchronous `SessionStorageBackend` over sessionStorage (exact get/set/remove
 * semantics of SDK 4.9.0). If the tab store is unavailable the session is held
 * in memory for this tab only: still session-scoped, never promoted to
 * persistent storage.
 */
export function createSessionScopedBackend(
  resolveStore: () => SessionStore | null = tabStore,
): SessionStorageBackend {
  let memory: StoredSession | null = null;

  return {
    get() {
      if (memory !== null) {
        return memory;
      }

      const store = resolveStore();

      if (store === null) {
        return null;
      }

      try {
        const raw = store.getItem(cloudSessionStorageKey);
        return raw === null ? null : (JSON.parse(raw) as StoredSession);
      } catch {
        // Unreadable record: drop it rather than keep failing.
        try {
          store.removeItem(cloudSessionStorageKey);
        } catch {
          // ignore
        }
        return null;
      }
    },
    set(value) {
      const store = resolveStore();

      try {
        if (store === null) {
          throw new Error('tab storage unavailable');
        }
        store.setItem(cloudSessionStorageKey, JSON.stringify(value));
        memory = null;
      } catch {
        memory = value;
      }
    },
    remove() {
      memory = null;

      try {
        resolveStore()?.removeItem(cloudSessionStorageKey);
      } catch {
        // ignore
      }
    },
  };
}

/** The SDK's persistent backend; selected only after an explicit opt-in. */
export function createTrustedDeviceBackend(): SessionStorageBackend {
  return new LocalStorage({ storageKey: persistentSessionStorageKey });
}

/** Removes a session from both backends' stores (no network, no client). */
export function removeStoredCloudSessions(): void {
  try {
    sessionStorage.removeItem(cloudSessionStorageKey);
  } catch {
    // ignore
  }

  try {
    localStorage.removeItem(persistentSessionStorageKey);
  } catch {
    // ignore
  }
}
