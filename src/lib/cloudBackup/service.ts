import { currentBackupFormatVersion } from '@/lib/backup';
import { CloudError } from '@/lib/cloud';

import { createBackupRunner } from './backup';
import { readInventory } from './inventory';
import { createRestoreRunner } from './restore';
import type { CloudBackupDependencies, CloudBackupService } from './types';

/**
 * The manual cloud backup and restore service (Epic G, G5/G6).
 *
 * Nothing here starts by itself: creating the service performs no work, and
 * there is no timer, listener, queue or schedule. Every operation is a method
 * the learner's action calls.
 *
 * Preconditions are exceptions, not results: cloud disabled on this device
 * (`CloudError` code `disabled`) and nobody signed in (`session-ended`) are
 * things the caller must put right first, and no request is made before them.
 *
 * One mutating cloud operation runs at a time per service. A second one asked
 * for meanwhile is turned away with `busy`: nothing is queued, nothing is
 * doubled. Restore writes still go through the local write lease of the
 * injected restore, which also serialises them against file imports.
 */
export function createCloudBackupService(
  dependencies: CloudBackupDependencies,
): CloudBackupService {
  const current = {
    formatVersion: currentBackupFormatVersion,
    schemaVersion: dependencies.schemaVersion,
  };
  const backup = createBackupRunner({
    store: dependencies.store,
    current,
    readSnapshot: dependencies.readSnapshot,
    appVersion: dependencies.appVersion,
    now: dependencies.now ?? (() => new Date()),
    newBackupId: dependencies.newBackupId ?? (() => crypto.randomUUID()),
  });
  const restore = createRestoreRunner({
    store: dependencies.store,
    current,
    readSnapshot: dependencies.readSnapshot,
    migrationContext: dependencies.migrationContext,
    restoreLocal: dependencies.restoreLocal,
  });
  let running = false;

  function requireSignedIn() {
    const state = dependencies.account.getState();

    if (state.status === 'disabled') {
      throw new CloudError(
        'disabled',
        'Cloud backup is turned off on this device.',
      );
    }

    if (state.status === 'signed-out') {
      throw new CloudError('session-ended', 'Sign in to use cloud backup.');
    }
  }

  async function exclusive<T>(
    run: () => Promise<T>,
  ): Promise<T | { kind: 'busy' }> {
    if (running) {
      return { kind: 'busy' };
    }

    running = true;

    try {
      return await run();
    } finally {
      running = false;
    }
  }

  return {
    async listBackups() {
      requireSignedIn();

      return await readInventory(dependencies.store, current);
    },

    async backUpNow() {
      requireSignedIn();

      return await exclusive(backup.backUpNow);
    },

    async checkAttempt(attempt) {
      requireSignedIn();

      return await exclusive(() => backup.checkAttempt(attempt));
    },

    async prepareRestore(choice) {
      requireSignedIn();

      return await exclusive(() => restore.prepareRestore(choice));
    },

    // A prepared backup is already verified and in memory: confirming it is a
    // local act and needs no provider, so it has no cloud precondition.
    async confirmRestore(prepared, options) {
      return await exclusive(() => restore.confirmRestore(prepared, options));
    },
  };
}
