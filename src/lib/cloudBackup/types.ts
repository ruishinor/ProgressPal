import type {
  BackupData,
  BackupSummary,
  ParseBackupOptions,
} from '@/lib/backup';
import type {
  CloudAccountPort,
  CloudBackupStore,
  CloudRequestFailure,
  RemoteBackupSlot,
} from '@/lib/cloud';

/**
 * Types of the manual cloud backup and restore domain (Epic G, G5/G6).
 *
 * Every operation answers with a value, not an exception, for everything that
 * can legitimately happen (a refusal, an unknown outcome, a bad payload). The
 * only exceptions are preconditions the caller must satisfy first: cloud is
 * disabled on this device (`CloudError` code `disabled`) or nobody is signed in
 * (`session-ended`). A `busy` answer means another cloud operation of the same
 * service is still running; nothing was started.
 */

/** The file format and data version this build writes and can restore. */
export interface BackupGeneration {
  formatVersion: number;
  schemaVersion: number;
}

export interface CloudBackupDependencies {
  /** Only `getState` is used: cloud enabled, and someone signed in. */
  account: Pick<CloudAccountPort, 'getState'>;
  store: CloudBackupStore;
  /**
   * Reads the learner database for the export and for the "has learner data"
   * fact. READ ONLY: the cloud path never writes the learner database.
   */
  readSnapshot: () => Promise<BackupData>;
  appVersion: string;
  /** The current data version: written into the envelope, expected on restore. */
  schemaVersion: number;
  migrationContext?: ParseBackupOptions['migrationContext'];
  /**
   * The existing atomic, lease-coordinated, fail-closed replace-all restore.
   * The domain has no other way to change local data; wrap it (for example in
   * the app's local-mutation runner) before injecting it.
   */
  restoreLocal: (
    data: BackupData,
    options: { fileName: string },
  ) => Promise<unknown>;
  /** Clock for the envelope's `exportedAt`. Defaults to the system clock. */
  now?: () => Date;
  /** Identity for a new backup attempt. Defaults to `crypto.randomUUID()`. */
  newBackupId?: () => string;
}

/** An inventory slot with its compatibility with THIS build. */
export interface InventorySlot extends RemoteBackupSlot {
  /** Format AND data version both equal this build's. */
  compatible: boolean;
}

/**
 * What a successful inventory states, and nothing more (Epic F section 8.1).
 * "Latest" always means greatest server time; it never means most complete,
 * most recent learning, or equal to this device. Metadata only: no payload was
 * downloaded and no integrity was checked.
 */
export type InventoryFacts =
  /** A successful inventory with no slot at all. */
  | { kind: 'no-remote-backups' }
  /** Slots exist, but none is restorable by this build. */
  | { kind: 'no-compatible-backup'; slotCount: number; newest: InventorySlot }
  | {
      kind: 'has-compatible-backup';
      latestCompatible: InventorySlot;
      /** Set only when the newest slot overall is NOT restorable by this build. */
      newerIncompatible: InventorySlot | null;
    };

export type CloudInventoryResult =
  | { kind: 'ok'; slots: InventorySlot[]; facts: InventoryFacts }
  /** No usable answer. This is never an empty inventory. */
  | { kind: 'unavailable'; failure: CloudRequestFailure };

export interface StoredBackupFacts {
  backupId: string;
  slot: number;
  /** The server's time for the insert, not the client's. */
  storedAt: string;
  /** The hash the server derived from the stored text. */
  payloadSha256: string;
  payloadBytes: number;
  /** The backup this one replaced, when the delete part removed one. */
  replacedBackupId: string | null;
}

/** What is needed to check an outcome-unknown attempt again later. In memory only. */
export interface CloudBackupAttempt {
  backupId: string;
  expectedSha256: string;
  slot: number;
  payloadBytes: number;
}

/** Confirmed: nothing was changed remotely (and nothing locally). */
export type NotStoredReason =
  | 'local-export-failed'
  | 'payload-over-remote-ceiling'
  | 'inventory-unavailable'
  | 'unauthenticated'
  | 'rate-limited'
  | 'unsupported-generation'
  | 'integrity-mismatch'
  | 'payload-too-large'
  | 'slot-out-of-range'
  | 'other-constraint'
  | 'lost-race';

/** Bounded diagnostics: no payload, no token, no full hash. */
export interface IntegrityDiagnostics {
  backupId: string;
  slot: number;
  /** First eight hex characters of the hash this device expected. */
  expectedHashPrefix: string;
  /** First eight hex characters of the hash the server holds. */
  storedHashPrefix: string;
}

export type CloudBackupOutcome =
  /** Only on the server's own confirmation, with the matching hash. */
  | { kind: 'stored'; backup: StoredBackupFacts; reconciled: boolean }
  | {
      kind: 'not-stored';
      reason: NotStoredReason;
      failure: CloudRequestFailure | null;
    }
  /** Neither stored nor refused could be established. Never reported as either. */
  | {
      kind: 'outcome-unknown';
      attempt: CloudBackupAttempt;
      /** `absent`: not found when checked; `unreachable`: the check itself failed. */
      lastCheck: 'absent' | 'unreachable';
      failure: CloudRequestFailure | null;
    }
  /** A row with our identity exists but its server hash is not ours. */
  | {
      kind: 'integrity-violation';
      diagnostics: IntegrityDiagnostics;
      inventory: CloudInventoryResult | null;
    }
  | { kind: 'busy' };

/** Whether this device's own database holds anything the learner generated. */
export type LocalDataFact = 'has-learner-data' | 'empty';

/**
 * A backup that was downloaded, hash-verified and passed the existing strict
 * parser. Opaque on purpose: the verified data stays inside the service and can
 * be applied only by handing THIS object back to `confirmRestore`.
 */
export interface PreparedCloudRestore {
  readonly slot: RemoteBackupSlot;
  readonly summary: BackupSummary;
  readonly localData: LocalDataFact;
  readonly integrity: 'hash-verified-and-parsed';
}

export type PrepareRefusal =
  | 'unavailable'
  | 'slot-changed'
  | 'incompatible'
  | 'hash-mismatch'
  | 'invalid-backup'
  | 'local-state-unreadable';

export type PrepareRestoreResult =
  | { kind: 'ready'; prepared: PreparedCloudRestore }
  | {
      kind: 'refused';
      reason: PrepareRefusal;
      /** The classified failure, for `unavailable`. */
      failure: CloudRequestFailure | null;
      /** The parser's learner-safe message, for `invalid-backup`. */
      message: string | null;
    }
  | { kind: 'busy' };

export interface ConfirmRestoreOptions {
  /**
   * The learner was told that this restore replaces everything on this device
   * and chose to go on. Required whenever this device holds learner data.
   */
  acknowledgedReplacingLocalData?: boolean;
}

export type ConfirmRestoreResult =
  | { kind: 'restored'; backupId: string; slot: number }
  | {
      kind: 'refused';
      reason:
        | 'not-prepared'
        | 'acknowledgement-required'
        | 'local-state-unreadable';
    }
  /** Local data is unchanged: the restore is atomic and fails closed. */
  | { kind: 'failed'; reason: 'local-write-blocked' | 'restore-failed' }
  | { kind: 'busy' };

export interface CloudBackupService {
  /** Metadata only. Does not wait for, or block, a running operation. */
  listBackups(): Promise<CloudInventoryResult>;
  /** One manual backup. Never automatic: nothing calls this but the learner's action. */
  backUpNow(): Promise<CloudBackupOutcome>;
  /** Checks an `outcome-unknown` attempt again by identity and hash. */
  checkAttempt(attempt: CloudBackupAttempt): Promise<CloudBackupOutcome>;
  /** Downloads one chosen slot and verifies it. Writes nothing locally. */
  prepareRestore(choice: {
    slot: number;
    backupId: string;
  }): Promise<PrepareRestoreResult>;
  /** Applies a prepared restore through the existing atomic restore. */
  confirmRestore(
    prepared: PreparedCloudRestore,
    options?: ConfirmRestoreOptions,
  ): Promise<ConfirmRestoreResult>;
}
