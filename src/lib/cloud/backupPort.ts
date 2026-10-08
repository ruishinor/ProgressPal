import type { CloudRequestFailure } from './port';

/**
 * Provider-neutral store for the remote backup slots (Epic G, G5/G6).
 *
 * Product concepts only: no provider, SDK type, token, URL or query language is
 * named here. The single adapter under ./nhost implements it. The store moves
 * metadata and exact text; it never parses, normalises or interprets a backup,
 * never touches the learner database, and never retries or decides anything:
 * every judgement (which slot, whether an outcome is known, whether a restore
 * may proceed) belongs to the caller.
 */

/** Five slots per account, numbered 0..4. A database invariant, mirrored here. */
export const backupSlotCount = 5;

/** One occupied slot as the inventory reports it. Metadata only. */
export interface RemoteBackupSlot {
  slot: number;
  backupId: string;
  formatVersion: number;
  schemaVersion: number;
  appVersion: string;
  /**
   * The uploading device's own claim. Display only: it is never used to order
   * slots, choose a slot, or judge which data is newer.
   */
  exportedAt: string;
  /**
   * Server time of the insert. The only ordering the ring and every "latest"
   * statement use. Compare with {@link compareStoredAt}, never as text.
   */
  storedAt: string;
  payloadBytes: number;
}

/** One slot with its payload, as downloaded for a restore. */
export interface RemoteBackupDownload extends RemoteBackupSlot {
  /** Exactly the text that was stored. */
  payload: string;
  /** Server-computed SHA-256 of the UTF-8 bytes of `payload`, lowercase hex. */
  payloadSha256: string;
}

/** One replacement: delete the observed occupant (if any) and insert, atomically. */
export interface RemoteBackupWrite {
  slot: number;
  /** The occupant the caller saw; null when it saw the slot empty. */
  observedBackupId: string | null;
  backupId: string;
  formatVersion: number;
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  payload: string;
  /** SHA-256 (lowercase hex) of the UTF-8 bytes of `payload`: the insert precondition. */
  expectedSha256: string;
}

/** What the provider confirmed for a committed replacement. */
export interface RemoteBackupWritten {
  backupId: string;
  /** Server-derived hash of the stored text, lowercase hex. */
  payloadSha256: string;
  storedAt: string;
  /** Rows the delete part removed; null when the request had no delete part. */
  deletedRows: number | null;
}

/** The answer to "is my attempt there?": identity and server hash, no payload. */
export interface RemoteBackupLookup {
  backupId: string;
  slot: number;
  payloadSha256: string;
  storedAt: string;
}

/**
 * A request either produced a value or failed in one of the classified ways of
 * {@link CloudRequestFailure}. A failure is data, not an exception: whether it
 * means "nothing happened" or "unknown" depends on the operation.
 */
export type CloudRequestResult<T> =
  | { ok: true; value: T }
  | { ok: false; failure: CloudRequestFailure };

export interface CloudBackupStore {
  /** The account's slots, metadata only (no payload, no hash). */
  listSlots(): Promise<CloudRequestResult<RemoteBackupSlot[]>>;

  /**
   * One request, one transaction: delete the observed occupant and insert the
   * new row. A refusal by any database gate rolls the delete back too.
   */
  replaceSlot(
    write: RemoteBackupWrite,
  ): Promise<CloudRequestResult<RemoteBackupWritten>>;

  /** Looks an attempt up by its own identity; null when no such row exists. */
  findBackup(
    backupId: string,
  ): Promise<CloudRequestResult<RemoteBackupLookup | null>>;

  /** Downloads one slot, but only if it still holds `backupId`; else null. */
  downloadBackup(
    slot: number,
    backupId: string,
  ): Promise<CloudRequestResult<RemoteBackupDownload | null>>;
}

export interface StoredAtKey {
  /** Whole seconds since the epoch. */
  seconds: number;
  /** Fractional seconds as exactly nine digits (zero padded on the right). */
  fraction: string;
}

const storedAtShape =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Parses a server timestamp keeping sub-millisecond precision. The provider
 * trims trailing zeros (`...04.37582+00:00`), so two timestamps can differ in
 * length; a `Date` would drop everything below a millisecond and two inserts
 * in the same millisecond would tie. Returns null for anything else.
 */
export function parseStoredAt(value: string): StoredAtKey | null {
  const match = value.match(storedAtShape);

  if (match === null) {
    return null;
  }

  const [, base, fraction = '', zone] = match;
  const milliseconds = Date.parse(`${base}${zone}`);

  if (Number.isNaN(milliseconds)) {
    return null;
  }

  return {
    seconds: Math.floor(milliseconds / 1000),
    fraction: fraction.padEnd(9, '0'),
  };
}

/**
 * Orders two server timestamps. Negative when `left` is earlier. Unparseable
 * input is a programming error here: the adapter refuses such a row before it
 * can reach a caller.
 */
export function compareStoredAt(left: string, right: string): number {
  const a = parseStoredAt(left);
  const b = parseStoredAt(right);

  if (a === null || b === null) {
    throw new RangeError('Not a server timestamp.');
  }

  if (a.seconds !== b.seconds) {
    return a.seconds < b.seconds ? -1 : 1;
  }

  if (a.fraction === b.fraction) {
    return 0;
  }

  return a.fraction < b.fraction ? -1 : 1;
}
