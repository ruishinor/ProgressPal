import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { Select } from '@/components/ui/Select';
import type {
  CloudBackupService,
  PreparedCloudRestore,
} from '@/lib/cloudBackup';

import {
  describeCloudError,
  describeConfirmRefusal,
  describePrepareRefusal,
  formatStoredAt,
  type InventoryRow,
  type Notice,
} from '../cloudModel';
import { CloudNotice } from './CloudNotice';

type CloudRestorePanelProps = {
  service: Pick<CloudBackupService, 'prepareRestore' | 'confirmRestore'>;
  /** Only the backups this version can restore. */
  rows: readonly InventoryRow[];
  /** Why restoring is not possible right now, or null. */
  blockedReason: string | null;
  /** Another cloud action of this card is running. */
  busyElsewhere: boolean;
  exporting: boolean;
  onExportLocal: () => void | Promise<void>;
  onRestored: () => void;
};

type Step = 'prepare' | 'confirm';

/**
 * Restore, one chosen backup at a time. Choosing and "Download and check" write
 * nothing; the only step that changes this device is the last button, and it is
 * pressed after the learner has seen the destructive warning (whenever the
 * device holds learner data) and ticked the acknowledgement. No sentence here
 * compares the cloud copy with this device.
 */
export function CloudRestorePanel({
  service,
  rows,
  blockedReason,
  busyElsewhere,
  exporting,
  onExportLocal,
  onRestored,
}: CloudRestorePanelProps) {
  const selectId = useId();
  const previewTitle = useRef<HTMLParagraphElement>(null);
  const [selectedId, setSelectedId] = useState('');
  const [prepared, setPrepared] = useState<PreparedCloudRestore | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  // True once a confirmation found learner data that was not there at preview.
  const [dataAppeared, setDataAppeared] = useState(false);
  const [busy, setBusy] = useState<Step | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const chosen = rows.find((row) => row.backupId === selectedId) ?? rows[0];
  const needsAcknowledgement =
    prepared !== null &&
    (prepared.localData === 'has-learner-data' || dataAppeared);
  const working = busy !== null || busyElsewhere;
  // Replacing this device's data is unavailable while the learner's own local
  // export is still running: that export may still be reading the data this
  // restore would replace, and the file it hands over must be what was here
  // when the learner asked for it. Exporting is never consent by itself.
  const canReplace =
    !working &&
    !exporting &&
    blockedReason === null &&
    (!needsAcknowledgement || acknowledged);

  useEffect(() => {
    if (prepared !== null) {
      previewTitle.current?.focus();
    }
  }, [prepared]);

  function discard() {
    setPrepared(null);
    setAcknowledged(false);
    setDataAppeared(false);
    setNotice(null);
  }

  async function prepare() {
    if (chosen === undefined) {
      return;
    }

    discard();
    setBusy('prepare');

    try {
      const result = await service.prepareRestore({
        slot: chosen.slot,
        backupId: chosen.backupId,
      });

      if (result.kind === 'ready') {
        setPrepared(result.prepared);
      } else {
        setNotice(describePrepareRefusal(result));
      }
    } catch (error) {
      setNotice({
        tone: 'danger',
        title: 'Backup not used',
        lines: [
          describeCloudError(error),
          'Nothing was changed on this device.',
        ],
      });
    } finally {
      setBusy(null);
    }
  }

  async function confirm() {
    // The button is disabled in these states; this keeps the handler honest
    // if it is ever reached another way (a stale event, a script).
    if (prepared === null || !canReplace) {
      return;
    }

    setBusy('confirm');
    setNotice(null);

    try {
      const result = await service.confirmRestore(prepared, {
        acknowledgedReplacingLocalData: acknowledged,
      });

      if (result.kind === 'restored') {
        onRestored();
        return;
      }

      if (
        result.kind === 'refused' &&
        result.reason === 'acknowledgement-required'
      ) {
        setDataAppeared(true);
      }

      if (result.kind === 'refused' && result.reason === 'not-prepared') {
        setPrepared(null);
      }

      setNotice(describeConfirmRefusal(result));
    } catch (error) {
      setNotice({
        tone: 'danger',
        title: 'Not restored',
        lines: [
          describeCloudError(error),
          'Nothing was changed on this device.',
        ],
      });
    } finally {
      setBusy(null);
    }
  }

  if (chosen === undefined) {
    return null;
  }

  const slotRow = (label: string, value: string | number) => (
    <div className="backup-preview__row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );

  return (
    <div className="backup-preview">
      <p className="backup-verify__title">Restore a backup</p>
      <FormField controlId={selectId} label="Backup to restore">
        {({ inputId }) => (
          <Select
            disabled={working || blockedReason !== null || prepared !== null}
            id={inputId}
            onChange={(event) => setSelectedId(event.target.value)}
            options={rows.map((row) => ({
              label: row.choice,
              value: row.backupId,
            }))}
            value={chosen.backupId}
          />
        )}
      </FormField>
      {blockedReason ? (
        <p className="card__description">{blockedReason}</p>
      ) : null}
      {prepared === null ? (
        <div className="action-row">
          <Button
            disabled={working || blockedReason !== null}
            loading={busy === 'prepare'}
            onClick={() => {
              void prepare();
            }}
            variant="secondary"
          >
            Download and check
          </Button>
        </div>
      ) : (
        <div className="backup-preview">
          <p className="backup-verify__title" ref={previewTitle} tabIndex={-1}>
            Backup from slot {prepared.slot.slot + 1} is ready to restore
          </p>
          <p className="backup-preview__heading">
            Downloaded, matched against the server&apos;s checksum and read
            successfully. Nothing has been changed yet.
          </p>
          <dl className="backup-preview__list">
            {slotRow(
              'Profile',
              prepared.summary.hasProfile
                ? (prepared.summary.profileName ?? 'Included')
                : 'Not included',
            )}
            {slotRow(
              'Stored (server time)',
              formatStoredAt(prepared.slot.storedAt),
            )}
            {slotRow(
              'Exported (uploading device)',
              prepared.summary.exportedAt,
            )}
            {slotRow('App version', prepared.summary.appVersion)}
            {slotRow('Course units', prepared.summary.counts.courseUnits)}
            {slotRow(
              'Progress entries',
              prepared.summary.counts.progressEntries,
            )}
            {slotRow('Study sessions', prepared.summary.counts.studySessions)}
            {slotRow('XP transactions', prepared.summary.counts.xpTransactions)}
            {slotRow(
              'Achievements',
              prepared.summary.counts.achievementUnlocks,
            )}
          </dl>
          {needsAcknowledgement ? (
            <>
              <p className="data-action__error" role="alert">
                Restoring replaces all learner data on this device with this
                backup. This is destructive and cannot be undone.
              </p>
              <Checkbox
                checked={acknowledged}
                disabled={working}
                label="Replace this device's data with this backup"
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
            </>
          ) : (
            <p className="card__description">
              This device holds no learner data, so nothing here is replaced.
            </p>
          )}
          <div className="action-row">
            {needsAcknowledgement ? (
              <Button
                disabled={working}
                loading={exporting}
                onClick={() => {
                  void onExportLocal();
                }}
                variant="secondary"
              >
                Export local backup first
              </Button>
            ) : null}
            <Button
              disabled={!canReplace}
              loading={busy === 'confirm'}
              onClick={() => {
                void confirm();
              }}
              variant="danger"
            >
              Replace local data with this backup
            </Button>
            <Button disabled={working} onClick={discard} variant="quiet">
              Cancel
            </Button>
          </div>
        </div>
      )}
      {notice ? <CloudNotice notice={notice} /> : null}
    </div>
  );
}
