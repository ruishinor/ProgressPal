import { Fragment, useMemo, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { useAppState } from '@/lib/appState';
import {
  getCloudBackupStore,
  type CloudAccountPort,
  type CloudSignOutResult,
} from '@/lib/cloud';
import { createCloudBackupService } from '@/lib/cloudBackup';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  getDatabaseSnapshot,
  restoreDatabaseFromBackup,
} from '@/lib/db';
import { getSharedDatabase } from '@/lib/db/database';

import type { CloudSettingsDependencies } from '../cloudDependencies';
import {
  breakablePieces,
  describeBackupOutcome,
  describeCloudError,
  describeInventory,
  inventoryScopeNote,
  type BackupNotice,
  type InventoryView,
} from '../cloudModel';
import { CloudNotice } from './CloudNotice';
import { CloudRestorePanel } from './CloudRestorePanel';

type CloudBackupPanelProps = {
  account: Pick<CloudAccountPort, 'getState' | 'signOut'>;
  dependencies?: Partial<CloudSettingsDependencies>;
  email: string;
  staysSignedIn: boolean;
  /** A local import or reset is running. */
  localBusy: boolean;
  exporting: boolean;
  onExportLocal: () => void | Promise<void>;
  onSignedOut: (result: CloudSignOutResult) => void;
  onRestored: () => void;
};

type Busy = 'backup' | 'check' | 'list' | 'sign-out';

/**
 * The signed-in state: one manual backup, the server's list of backups, one
 * restore, and sign-out. Every request is a button the learner pressed; there
 * is no effect, timer or listener that talks to the cloud, so opening Settings
 * or navigating never causes a request.
 */
export function CloudBackupPanel({
  account,
  dependencies,
  email,
  exporting,
  localBusy,
  onExportLocal,
  onRestored,
  onSignedOut,
  staysSignedIn,
}: CloudBackupPanelProps) {
  const { coordination, runLocalMutation } = useAppState();
  const [busy, setBusy] = useState<Busy | null>(null);
  const [backupNotice, setBackupNotice] = useState<BackupNotice | null>(null);
  const [inventory, setInventory] = useState<InventoryView | null>(null);

  // Creating the service performs no work and no request. The existing atomic
  // restore runs inside the app's local-mutation runner, so app state refreshes
  // exactly as after a file import. If the runner ever changes, a preparation
  // made by the earlier service is refused as `not-prepared` and the learner
  // is asked to download and check again; it can never be applied by mistake.
  const service = useMemo(
    () =>
      createCloudBackupService({
        account,
        store: dependencies?.store ?? getCloudBackupStore(),
        readSnapshot:
          dependencies?.readSnapshot ?? (() => getDatabaseSnapshot()),
        appVersion: currentApplicationVersion,
        schemaVersion: currentDatabaseSchemaVersion,
        migrationContext:
          dependencies?.migrationContext ??
          getSharedDatabase().migrationContext,
        restoreLocal: (data, options) =>
          runLocalMutation(
            () =>
              (dependencies?.restoreLocal ?? restoreDatabaseFromBackup)(
                data,
                options,
              ),
            { invalidateRoute: true },
          ),
      }),
    [account, dependencies, runLocalMutation],
  );

  const working = busy !== null;
  const canWriteLocally = coordination.canWrite && !coordination.peerActive;
  const restoreBlockedReason = !canWriteLocally
    ? 'This tab cannot write local data right now, so restore is unavailable.'
    : localBusy
      ? 'A local import or reset is running.'
      : null;
  const restorable =
    inventory?.kind === 'ok'
      ? inventory.rows.filter((row) => row.restorable)
      : [];

  async function loadInventory() {
    try {
      setInventory(describeInventory(await service.listBackups()));
    } catch (error) {
      setInventory({
        kind: 'unavailable',
        summary: `The backup list could not be read. ${describeCloudError(error)}`,
      });
    }
  }

  async function settle(outcome: Parameters<typeof describeBackupOutcome>[0]) {
    setBackupNotice(describeBackupOutcome(outcome));

    // The backup the server now holds belongs in the list the learner sees.
    if (outcome.kind === 'stored') {
      await loadInventory();
    }

    if (outcome.kind === 'integrity-violation' && outcome.inventory !== null) {
      setInventory(describeInventory(outcome.inventory));
    }
  }

  async function backUpNow() {
    setBusy('backup');
    setBackupNotice(null);

    try {
      await settle(await service.backUpNow());
    } catch (error) {
      setBackupNotice({
        tone: 'danger',
        title: 'Not backed up',
        lines: [describeCloudError(error)],
        attempt: null,
      });
    } finally {
      setBusy(null);
    }
  }

  async function checkAgain(attempt: NonNullable<BackupNotice['attempt']>) {
    setBusy('check');

    try {
      await settle(await service.checkAttempt(attempt));
    } catch (error) {
      setBackupNotice({
        tone: 'danger',
        title: 'Could not check',
        lines: [describeCloudError(error)],
        // The attempt is still unresolved; keep it so it can be checked again.
        attempt,
      });
    } finally {
      setBusy(null);
    }
  }

  async function showBackups() {
    setBusy('list');

    try {
      await loadInventory();
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    setBusy('sign-out');

    try {
      onSignedOut(await account.signOut());
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <p className="card__description">
        Signed in as{' '}
        <strong>
          {breakablePieces(email).map((piece, index) => (
            // Line-break opportunities only: the text itself is unchanged.
            <Fragment key={index}>
              {piece}
              <wbr />
            </Fragment>
          ))}
        </strong>
        .{staysSignedIn ? ' This device stays signed in.' : ''}
      </p>
      <p className="card__description">
        Back up now sends a full copy of your ProgressPal data to the cloud
        service. Nothing is sent automatically.
      </p>
      <div className="action-row">
        <Button
          data-cloud-focus=""
          disabled={working || localBusy}
          loading={busy === 'backup'}
          onClick={() => {
            void backUpNow();
          }}
          variant="primary"
        >
          Back up now
        </Button>
        <Button
          disabled={working}
          loading={busy === 'list'}
          onClick={() => {
            void showBackups();
          }}
          variant="secondary"
        >
          {inventory === null ? 'Show backups' : 'Refresh list'}
        </Button>
        <Button
          disabled={working}
          loading={busy === 'sign-out'}
          onClick={() => {
            void signOut();
          }}
          variant="quiet"
        >
          Sign out
        </Button>
      </div>
      {backupNotice ? (
        <CloudNotice notice={backupNotice}>
          {backupNotice.attempt !== null ? (
            <div className="action-row">
              <Button
                disabled={working}
                loading={busy === 'check'}
                onClick={() => {
                  if (backupNotice.attempt !== null) {
                    void checkAgain(backupNotice.attempt);
                  }
                }}
                variant="secondary"
              >
                Check again
              </Button>
            </div>
          ) : null}
        </CloudNotice>
      ) : null}
      {inventory ? (
        <div className="backup-preview">
          <p className="backup-verify__title">Backups on the server</p>
          <p className="backup-preview__heading">{inventoryScopeNote}</p>
          <p
            className={
              inventory.kind === 'unavailable'
                ? 'data-action__error'
                : 'card__description'
            }
            role={inventory.kind === 'unavailable' ? 'alert' : 'status'}
          >
            {inventory.summary}
          </p>
          {inventory.kind === 'ok' && inventory.rows.length > 0 ? (
            <dl className="backup-preview__list">
              {inventory.rows.map((row) => (
                <div className="backup-preview__row" key={row.backupId}>
                  <dt>{row.label}</dt>
                  <dd>{row.detail}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
      {restorable.length > 0 ? (
        <CloudRestorePanel
          blockedReason={restoreBlockedReason}
          busyElsewhere={working}
          exporting={exporting}
          onExportLocal={onExportLocal}
          onRestored={onRestored}
          rows={restorable}
          service={service}
        />
      ) : null}
    </>
  );
}
