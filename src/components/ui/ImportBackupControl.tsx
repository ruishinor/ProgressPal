import { useId, useState, type ChangeEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  BackupValidationError,
  maxBackupBytes,
  parseBackupFile,
  summarizeBackup,
  type BackupEnvelope,
} from '@/lib/backup';

export type ImportBackupControlProps = {
  busy?: boolean;
  confirmLabel?: string;
  disabled?: boolean;
  expectedSchemaVersion: number;
  heading?: string;
  onConfirmImport: (envelope: BackupEnvelope) => void | Promise<void>;
};

/**
 * Feature-agnostic backup import control: pick a file, validate it locally, show
 * a preview, and confirm a destructive replace-all restore. It never touches the
 * database itself — the route supplies `onConfirmImport` to perform the restore
 * and refresh app state. Reused by both Settings and the onboarding recovery
 * surface so import stays reachable after a reset.
 */
export function ImportBackupControl({
  busy = false,
  confirmLabel = 'Replace local data with this backup',
  disabled = false,
  expectedSchemaVersion,
  heading = 'Import a backup',
  onConfirmImport,
}: ImportBackupControlProps) {
  const inputId = useId();
  const [fileName, setFileName] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<BackupEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setEnvelope(null);
    setError(null);

    if (file === null) {
      setFileName(null);
      return;
    }

    setFileName(file.name);

    if (file.size > maxBackupBytes) {
      setError('This backup file is too large to import.');
      return;
    }

    let text: string;

    try {
      text = await file.text();
    } catch {
      setError('This file could not be read.');
      return;
    }

    try {
      setEnvelope(parseBackupFile(text, { expectedSchemaVersion }));
    } catch (parseError) {
      setError(
        parseError instanceof BackupValidationError
          ? parseError.message
          : 'This file could not be imported as a backup.',
      );
    }
  }

  const summary = envelope === null ? null : summarizeBackup(envelope);

  return (
    <Card title={heading} titleAs="h3">
      <p className="card__description">
        Importing replaces all local data on this device with the contents of
        the backup file. This is destructive, local-only, and cannot be undone.
      </p>
      <div className="data-action">
        <label className="form-field__label" htmlFor={inputId}>
          Backup file
        </label>
        <input
          accept="application/json,.json"
          className="data-action__file"
          disabled={disabled || busy}
          id={inputId}
          onChange={handleFileChange}
          type="file"
        />
        {error ? (
          <p className="data-action__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {summary ? (
        <div className="backup-preview">
          <p className="backup-preview__heading">
            Preview of <span className="backup-preview__file">{fileName}</span>
          </p>
          <dl className="backup-preview__list">
            <div className="backup-preview__row">
              <dt>Profile</dt>
              <dd>
                {summary.hasProfile
                  ? (summary.profileName ?? 'Included')
                  : 'Not included'}
              </dd>
            </div>
            <div className="backup-preview__row">
              <dt>Exported</dt>
              <dd>{summary.exportedAt}</dd>
            </div>
            <div className="backup-preview__row">
              <dt>App version</dt>
              <dd>{summary.appVersion}</dd>
            </div>
            <div className="backup-preview__row">
              <dt>Course units</dt>
              <dd>{summary.counts.courseUnits}</dd>
            </div>
            <div className="backup-preview__row">
              <dt>Progress entries</dt>
              <dd>{summary.counts.progressEntries}</dd>
            </div>
            <div className="backup-preview__row">
              <dt>Study sessions</dt>
              <dd>{summary.counts.studySessions}</dd>
            </div>
            <div className="backup-preview__row">
              <dt>XP transactions</dt>
              <dd>{summary.counts.xpTransactions}</dd>
            </div>
            <div className="backup-preview__row">
              <dt>Achievements</dt>
              <dd>{summary.counts.achievementUnlocks}</dd>
            </div>
          </dl>
          <div className="backup-verify">
            <p className="backup-verify__title">
              After importing, verify your restore:
            </p>
            <ul className="detail-list">
              <li>Confirm the dashboard progress looks right.</li>
              <li>Confirm task statuses and notes are present.</li>
              <li>Confirm XP and achievements look expected.</li>
              <li>Confirm recent sessions and media progress are present.</li>
              <li>Reload once and confirm the restored state remains.</li>
            </ul>
          </div>
          <Button
            disabled={disabled}
            loading={busy}
            onClick={() => {
              if (envelope !== null) {
                void onConfirmImport(envelope);
              }
            }}
            variant="primary"
          >
            {confirmLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
