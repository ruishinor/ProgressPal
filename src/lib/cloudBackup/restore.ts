import {
  BackupValidationError,
  parseBackupFile,
  summarizeBackup,
  type BackupData,
  type BackupEnvelope,
  type ParseBackupOptions,
} from '@/lib/backup';
import type { CloudBackupStore, CloudRequestFailure } from '@/lib/cloud';
import { LocalWriteBlockedError } from '@/lib/storage';

import { isCompatible } from './inventory';
import { sha256Hex } from './payload';
import type {
  BackupGeneration,
  ConfirmRestoreOptions,
  ConfirmRestoreResult,
  LocalDataFact,
  PrepareRefusal,
  PrepareRestoreResult,
  PreparedCloudRestore,
} from './types';

/**
 * G6, restore. Two steps, so the learner's explicit confirmation sits between
 * them: `prepareRestore` downloads, verifies and previews (it writes nothing),
 * `confirmRestore` hands the verified data to the existing atomic restore.
 *
 * Verification order, each step its own outcome (Epic F section 9):
 *   1. the slot still holds the backup the learner chose;
 *   2. its declared generation is this build's (compatible);
 *   3. the SHA-256 of the downloaded text equals the hash the SERVER derived;
 *      a mismatch is refused and nothing is parsed;
 *   4. the existing strict parser accepts the text (a compatible slot can
 *      still fail here, and that is a different outcome from a hash mismatch);
 *   5. one local fact is read: does this device hold learner data?
 *
 * There is NO recency inference. This module never compares the cloud copy's
 * times with anything on this device, and never says which side is newer: the
 * only local fact it uses is whether the device holds learner data at all.
 */

/**
 * Stores whose rows the learner's own actions create. Catalogue, seeded
 * definitions, enrolment bookkeeping and the export/import audit log are not
 * learner activity: a freshly initialised device has them, and an audit row
 * about an earlier file export does not make data worth a warning.
 */
const activityStores = [
  'progressEntries',
  'studySessions',
  'xpTransactions',
  'achievementUnlocks',
  'mediaProgressEvents',
  'resumePoints',
  'learnerEvidence',
  'lessonPositions',
] as const satisfies ReadonlyArray<keyof BackupData>;

/** True when onboarding was completed or any learner-activity store has a row. */
export function hasLearnerData(data: BackupData): boolean {
  return (
    data.appMeta?.onboardingCompletedAt !== undefined ||
    activityStores.some((store) => data[store].length > 0)
  );
}

export interface RestoreRunnerOptions {
  store: CloudBackupStore;
  current: BackupGeneration;
  readSnapshot: () => Promise<BackupData>;
  migrationContext?: ParseBackupOptions['migrationContext'];
  restoreLocal: (
    data: BackupData,
    options: { fileName: string },
  ) => Promise<unknown>;
}

export function createRestoreRunner(options: RestoreRunnerOptions) {
  const { store, current } = options;
  /**
   * The verified data behind each preparation. A preparation the service did
   * not itself issue (a copy, a clone, a hand-built object) is not in here and
   * can never reach the restore.
   */
  const verified = new WeakMap<PreparedCloudRestore, BackupEnvelope>();

  const refused = (
    reason: PrepareRefusal,
    failure: CloudRequestFailure | null = null,
    message: string | null = null,
  ): PrepareRestoreResult => ({ kind: 'refused', reason, failure, message });

  async function localDataFact(): Promise<LocalDataFact | null> {
    try {
      return hasLearnerData(await options.readSnapshot())
        ? 'has-learner-data'
        : 'empty';
    } catch {
      return null;
    }
  }

  async function prepareRestore(choice: {
    slot: number;
    backupId: string;
  }): Promise<PrepareRestoreResult> {
    const downloaded = await store.downloadBackup(choice.slot, choice.backupId);

    if (!downloaded.ok) {
      return refused('unavailable', downloaded.failure);
    }

    if (downloaded.value === null) {
      return refused('slot-changed');
    }

    const { payload, payloadSha256, ...slot } = downloaded.value;

    if (!isCompatible(slot, current)) {
      return refused('incompatible');
    }

    let computed: string;

    try {
      computed = await sha256Hex(payload);
    } catch {
      // No WebCrypto (an insecure context, say): nothing can be verified, so
      // nothing is trusted. This is not a mismatch and not a bad backup.
      return refused('verification-unavailable');
    }

    if (computed !== payloadSha256) {
      return refused('hash-mismatch');
    }

    let envelope: BackupEnvelope;

    try {
      envelope = parseBackupFile(payload, {
        expectedSchemaVersion: current.schemaVersion,
        migrationContext: options.migrationContext,
      });
    } catch (error) {
      return refused(
        'invalid-backup',
        null,
        error instanceof BackupValidationError
          ? error.message
          : 'This backup could not be read.',
      );
    }

    const localData = await localDataFact();

    if (localData === null) {
      return refused('local-state-unreadable');
    }

    const prepared: PreparedCloudRestore = Object.freeze({
      slot,
      summary: summarizeBackup(envelope),
      localData,
      integrity: 'hash-verified-and-parsed' as const,
    });

    verified.set(prepared, envelope);

    return { kind: 'ready', prepared };
  }

  async function confirmRestore(
    prepared: PreparedCloudRestore,
    confirmation: ConfirmRestoreOptions = {},
  ): Promise<ConfirmRestoreResult> {
    const envelope = verified.get(prepared);

    if (envelope === undefined) {
      return { kind: 'refused', reason: 'not-prepared' };
    }

    // Judged again now: the device may have changed since the preview.
    const localData = await localDataFact();

    if (localData === null) {
      return { kind: 'refused', reason: 'local-state-unreadable' };
    }

    if (
      localData === 'has-learner-data' &&
      confirmation.acknowledgedReplacingLocalData !== true
    ) {
      return { kind: 'refused', reason: 'acknowledgement-required' };
    }

    try {
      await options.restoreLocal(envelope.data, {
        fileName: `cloud-backup-${prepared.slot.backupId}.json`,
      });
    } catch (error) {
      // The existing restore is atomic and fails closed: local data is unchanged.
      return {
        kind: 'failed',
        reason:
          error instanceof LocalWriteBlockedError
            ? 'local-write-blocked'
            : 'restore-failed',
      };
    }

    verified.delete(prepared);

    return {
      kind: 'restored',
      backupId: prepared.slot.backupId,
      slot: prepared.slot.slot,
    };
  }

  return { prepareRestore, confirmRestore };
}
