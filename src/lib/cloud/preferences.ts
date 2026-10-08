/**
 * Device-local cloud preferences (Epic G, G2/G4).
 *
 * These are configuration of this browser profile, not learner data: they are
 * not in the IndexedDB schema, not in the backup envelope and never uploaded.
 * Everything defaults to the safe value: cloud off, session-scoped sign-in.
 * An absent, unreadable or malformed record behaves exactly like the default.
 */

export const cloudPreferencesStorageKey = 'progresspal:cloud:preferences';

export interface CloudPreferences {
  /** Cloud account features are available on this device. Default false. */
  enabled: boolean;
  /**
   * The learner explicitly chose to stay signed in on this device. Default
   * false (the session dies with the tab).
   */
  trustedDevice: boolean;
}

export const defaultCloudPreferences: Readonly<CloudPreferences> =
  Object.freeze({ enabled: false, trustedDevice: false });

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function deviceStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Access itself can throw (blocked site data); that means "default".
    return null;
  }
}

export function readCloudPreferences(
  store: KeyValueStore | null = deviceStore(),
): CloudPreferences {
  if (store === null) {
    return { ...defaultCloudPreferences };
  }

  try {
    const raw = store.getItem(cloudPreferencesStorageKey);

    if (raw === null) {
      return { ...defaultCloudPreferences };
    }

    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      return { ...defaultCloudPreferences };
    }

    const record = parsed as Record<string, unknown>;

    return {
      // Only a literal `true` counts; anything else is the safe default.
      enabled: record.enabled === true,
      trustedDevice: record.trustedDevice === true,
    };
  } catch {
    return { ...defaultCloudPreferences };
  }
}

/** Returns false when the device refused the write (the safe default applies). */
export function writeCloudPreferences(
  next: CloudPreferences,
  store: KeyValueStore | null = deviceStore(),
): boolean {
  if (store === null) {
    return false;
  }

  try {
    store.setItem(
      cloudPreferencesStorageKey,
      JSON.stringify({
        version: 1,
        enabled: next.enabled === true,
        trustedDevice: next.trustedDevice === true,
      }),
    );
    return true;
  } catch {
    return false;
  }
}
