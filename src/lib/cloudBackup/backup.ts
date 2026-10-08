import { BackupValidationError, type BackupData } from '@/lib/backup';
import {
  backupConstraintNames,
  remoteBackupPayloadCeilingBytes,
  type CloudBackupStore,
  type CloudRequestFailure,
  type RemoteBackupWritten,
} from '@/lib/cloud';

import { chooseTargetSlot, readInventory } from './inventory';
import { produceBackupPayload, type ProducedPayload } from './payload';
import type {
  BackupGeneration,
  CloudBackupAttempt,
  CloudBackupOutcome,
  NotStoredReason,
} from './types';

/**
 * G5, manual backup. One call is one learner-requested backup and nothing
 * else: no timer, no queue, no persisted attempt, no write to the learner
 * database.
 *
 * Bounds (all counts, no delays): at most TWO writes per call, whether the
 * second is triggered by a lost race or by an attempt that was found absent;
 * at most one inventory read before each write; at most one identity check
 * after each write that did not answer. The same backup identity is used for
 * both writes, so a late first request can never produce a second row.
 *
 * What each outcome means:
 *  - `stored`: the server confirmed the insert AND its own hash equals the hash
 *    this device computed (or an identity check found the row with that hash);
 *  - `not-stored`: a refusal that proves nothing changed;
 *  - `outcome-unknown`: nothing proves either; reported as neither;
 *  - `integrity-violation`: a row with this identity exists but with another
 *    server hash. Never a success; nothing is deleted, replaced or retried.
 */

const maxWriteAttempts = 2;

export interface BackupRunnerOptions {
  store: CloudBackupStore;
  current: BackupGeneration;
  readSnapshot: () => Promise<BackupData>;
  appVersion: string;
  now: () => Date;
  newBackupId: () => string;
}

type Verdict =
  | { kind: 'refused'; reason: NotStoredReason }
  | { kind: 'lost-race' }
  | { kind: 'id-exists' }
  | { kind: 'unknown' };

/**
 * What a failed write proves. Only a refusal by the database or by the
 * platform in front of it proves that nothing was written; anything that is not
 * a clear answer (no response, a gateway fault, an unrecognisable body) may
 * have committed and is therefore unknown.
 */
function judgeWrite(failure: CloudRequestFailure): Verdict {
  switch (failure.kind) {
    case 'rejected':
      if (failure.reason === 'slot-conflict') {
        // A clash on the backup identity means a row with OUR id exists.
        return failure.constraint === backupConstraintNames.backupIdUnique
          ? { kind: 'id-exists' }
          : { kind: 'lost-race' };
      }

      return { kind: 'refused', reason: failure.reason };
    case 'unauthenticated':
      return { kind: 'refused', reason: 'unauthenticated' };
    case 'rate-limited':
      return { kind: 'refused', reason: 'rate-limited' };
    case 'provider-unavailable':
    case 'unexpected-response':
      return { kind: 'unknown' };
  }
}

function readRefusal(failure: CloudRequestFailure): NotStoredReason {
  return failure.kind === 'unauthenticated' || failure.kind === 'rate-limited'
    ? failure.kind
    : 'inventory-unavailable';
}

const notStored = (
  reason: NotStoredReason,
  failure: CloudRequestFailure | null,
): CloudBackupOutcome => ({ kind: 'not-stored', reason, failure });

const outcomeUnknown = (
  attempt: CloudBackupAttempt,
  lastCheck: 'absent' | 'unreachable',
  failure: CloudRequestFailure | null,
): CloudBackupOutcome => ({
  kind: 'outcome-unknown',
  attempt,
  lastCheck,
  failure,
});

type Reconciliation =
  | { found: CloudBackupOutcome }
  | { absent: true }
  | { unreachable: CloudRequestFailure };

export function createBackupRunner(options: BackupRunnerOptions) {
  const { store, current } = options;

  async function integrityViolation(
    expectedSha256: string,
    backupId: string,
    slot: number,
    storedSha256: string,
  ): Promise<CloudBackupOutcome> {
    // Re-read the inventory so the caller sees the real state. Nothing is
    // deleted, replaced or written because of this.
    const inventory = await readInventory(store, current).catch(() => null);

    return {
      kind: 'integrity-violation',
      diagnostics: {
        backupId,
        slot,
        expectedHashPrefix: expectedSha256.slice(0, 8),
        storedHashPrefix: storedSha256.slice(0, 8),
      },
      inventory,
    };
  }

  /** Looks the attempt up by identity; success needs the row AND its hash. */
  async function reconcile(
    attempt: CloudBackupAttempt,
  ): Promise<Reconciliation> {
    const looked = await store.findBackup(attempt.backupId);

    if (!looked.ok) {
      return { unreachable: looked.failure };
    }

    const row = looked.value;

    if (row === null) {
      return { absent: true };
    }

    if (row.payloadSha256 === attempt.expectedSha256) {
      return {
        found: {
          kind: 'stored',
          reconciled: true,
          backup: {
            backupId: row.backupId,
            slot: row.slot,
            storedAt: row.storedAt,
            payloadSha256: row.payloadSha256,
            payloadBytes: attempt.payloadBytes,
            replacedBackupId: null,
          },
        },
      };
    }

    return {
      found: await integrityViolation(
        attempt.expectedSha256,
        row.backupId,
        row.slot,
        row.payloadSha256,
      ),
    };
  }

  /**
   * Success is claimed only when the server's own answer carries OUR identity
   * and a server-derived hash equal to the one this device computed.
   */
  async function confirmed(
    attempt: CloudBackupAttempt,
    written: RemoteBackupWritten,
    observedBackupId: string | null,
  ): Promise<CloudBackupOutcome> {
    if (
      written.backupId === attempt.backupId &&
      written.payloadSha256 === attempt.expectedSha256
    ) {
      return {
        kind: 'stored',
        reconciled: false,
        backup: {
          backupId: written.backupId,
          slot: attempt.slot,
          storedAt: written.storedAt,
          payloadSha256: written.payloadSha256,
          payloadBytes: attempt.payloadBytes,
          replacedBackupId: written.deletedRows === 1 ? observedBackupId : null,
        },
      };
    }

    // The database committed a row whose server hash is not ours.
    return integrityViolation(
      attempt.expectedSha256,
      attempt.backupId,
      attempt.slot,
      written.payloadSha256,
    );
  }

  async function produce(): Promise<ProducedPayload | CloudBackupOutcome> {
    let produced: ProducedPayload;

    try {
      produced = await produceBackupPayload({
        data: await options.readSnapshot(),
        appVersion: options.appVersion,
        schemaVersion: current.schemaVersion,
        exportedAt: options.now().toISOString(),
      });
    } catch (error) {
      // The existing serialiser refuses above the local 25 MiB file limit.
      return notStored(
        error instanceof BackupValidationError
          ? 'payload-over-remote-ceiling'
          : 'local-export-failed',
        null,
      );
    }

    return produced.byteLength > remoteBackupPayloadCeilingBytes
      ? notStored('payload-over-remote-ceiling', null)
      : produced;
  }

  async function backUpNow(): Promise<CloudBackupOutcome> {
    const produced = await produce();

    if ('kind' in produced) {
      return produced;
    }

    const backupId = options.newBackupId();
    // Set once a write's outcome could not be established.
    let earlier: {
      slot: number;
      lastCheck: 'absent' | 'unreachable';
      failure: CloudRequestFailure | null;
    } | null = null;

    const attemptAt = (slot: number): CloudBackupAttempt => ({
      backupId,
      expectedSha256: produced.sha256,
      slot,
      payloadBytes: produced.byteLength,
    });

    for (let number = 1; ; number += 1) {
      const listed = await store.listSlots();

      if (!listed.ok) {
        return earlier === null
          ? notStored(readRefusal(listed.failure), listed.failure)
          : outcomeUnknown(
              attemptAt(earlier.slot),
              earlier.lastCheck,
              listed.failure,
            );
      }

      const target = chooseTargetSlot(listed.value);
      const attempt = attemptAt(target.slot);
      const written = await store.replaceSlot({
        slot: target.slot,
        observedBackupId: target.observedBackupId,
        backupId,
        formatVersion: current.formatVersion,
        schemaVersion: current.schemaVersion,
        appVersion: options.appVersion,
        exportedAt: produced.exportedAt,
        payload: produced.contents,
        expectedSha256: produced.sha256,
      });

      if (written.ok) {
        return confirmed(attempt, written.value, target.observedBackupId);
      }

      const verdict = judgeWrite(written.failure);

      switch (verdict.kind) {
        case 'refused':
          return notStored(verdict.reason, written.failure);

        case 'id-exists': {
          const found = await reconcile(attempt);

          if ('found' in found) {
            return found.found;
          }

          return outcomeUnknown(
            attempt,
            'absent' in found ? 'absent' : 'unreachable',
            'unreachable' in found ? found.unreachable : written.failure,
          );
        }

        case 'lost-race': {
          if (earlier !== null) {
            // An earlier write may have landed late in this very slot.
            const found = await reconcile(attempt);

            if ('found' in found) {
              return found.found;
            }

            if ('unreachable' in found) {
              return outcomeUnknown(attempt, 'unreachable', found.unreachable);
            }
          }

          if (number < maxWriteAttempts) {
            continue;
          }

          return notStored('lost-race', written.failure);
        }

        case 'unknown': {
          const found = await reconcile(attempt);

          if ('found' in found) {
            return found.found;
          }

          const lastCheck = 'absent' in found ? 'absent' : 'unreachable';
          const failure =
            'unreachable' in found ? found.unreachable : written.failure;

          earlier = { slot: target.slot, lastCheck, failure };

          if (lastCheck === 'absent' && number < maxWriteAttempts) {
            continue;
          }

          return outcomeUnknown(attempt, lastCheck, failure);
        }
      }
    }
  }

  /** Checks an earlier attempt again by identity and hash. Writes nothing. */
  async function checkAttempt(
    attempt: CloudBackupAttempt,
  ): Promise<CloudBackupOutcome> {
    const found = await reconcile(attempt);

    if ('found' in found) {
      return found.found;
    }

    return 'absent' in found
      ? outcomeUnknown(attempt, 'absent', null)
      : outcomeUnknown(attempt, 'unreachable', found.unreachable);
  }

  return { backUpNow, checkAttempt };
}
