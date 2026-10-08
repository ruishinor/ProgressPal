/**
 * One short-lived, explicitly named record for the PKCE code verifier.
 *
 * The email link opens in whatever tab or browser the learner uses, so the
 * verifier has to survive a navigation (the provider documents localStorage
 * for this). It is single-use and is not a session credential: it is removed
 * the moment it is read, on success, failure and expiry alike. It lives under
 * its own key, never inside the learner database or the backup envelope.
 */

export const pkceVerifierStorageKey = 'progresspal:cloud:pkce-verifier';

/**
 * How long a started flow can be completed on this device. The emailed link
 * can be opened some time after the request (the 5-minute provider limit
 * applies to the code, which is issued when the link is opened), so this is a
 * conservative bound on the unused verifier. Re-validated in live G2.
 */
export const pkceVerifierTtlMs = 60 * 60 * 1000;

export type PkcePurpose = 'signup' | 'reset';

export interface PendingPkceFlow {
  verifier: string;
  purpose: PkcePurpose;
  createdAt: number;
}

export type TakenPkceFlow =
  | { state: 'ok'; verifier: string; purpose: PkcePurpose }
  | { state: 'expired'; purpose: PkcePurpose }
  | { state: 'missing' };

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function deviceStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function savePkceFlow(
  flow: PendingPkceFlow,
  store: KeyValueStore | null = deviceStore(),
): boolean {
  if (store === null) {
    return false;
  }

  try {
    store.setItem(
      pkceVerifierStorageKey,
      JSON.stringify({ version: 1, ...flow }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearPkceFlow(store: KeyValueStore | null = deviceStore()) {
  try {
    store?.removeItem(pkceVerifierStorageKey);
  } catch {
    // Nothing more can be done; the TTL still bounds a leftover record.
  }
}

/** Reads and removes the record in one step. */
export function takePkceFlow(
  now: number,
  store: KeyValueStore | null = deviceStore(),
): TakenPkceFlow {
  if (store === null) {
    return { state: 'missing' };
  }

  let raw: string | null;

  try {
    raw = store.getItem(pkceVerifierStorageKey);
  } catch {
    return { state: 'missing' };
  }

  // Consume first: a malformed, expired or used record never lingers.
  clearPkceFlow(store);

  if (raw === null) {
    return { state: 'missing' };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingPkceFlow> | null;

    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      typeof parsed.verifier !== 'string' ||
      parsed.verifier.length < 43 ||
      (parsed.purpose !== 'signup' && parsed.purpose !== 'reset') ||
      typeof parsed.createdAt !== 'number'
    ) {
      return { state: 'missing' };
    }

    if (now - parsed.createdAt > pkceVerifierTtlMs || now < parsed.createdAt) {
      return { state: 'expired', purpose: parsed.purpose };
    }

    return { state: 'ok', verifier: parsed.verifier, purpose: parsed.purpose };
  } catch {
    return { state: 'missing' };
  }
}
