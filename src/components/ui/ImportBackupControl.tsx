import { useId, useRef, useState, type ChangeEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  BackupValidationError,
  maxBackupBytes,
  parseBackupFile,
  summarizeBackup,
  type BackupEnvelope,
} from '@/lib/backup';
import type { DatabaseMigrationContext } from '@/lib/db';

export type ImportBackupControlProps = {
  busy?: boolean;
  confirmLabel?: string;
  disabled?: boolean;
  expectedSchemaVersion: number;
  heading?: string;
  /**
   * The live database's bound migration context (Epic C6-R, D2). Required so
   * every caller of this production, authorized-import path supplies
   * authorization explicitly rather than being able to compile without it -
   * a caller that forgets it would otherwise silently vary behavior by
   * backup schema (a schema-3 backup would still preview; a schema-2 backup
   * would be rejected). Context-free structural parsing is still exercised
   * directly at the `parseBackupFile` layer, not through this component. The
   * destructive restore path always separately revalidates against the live
   * database's own bound context regardless of what this preview supplied.
   */
  migrationContext: DatabaseMigrationContext;
  onConfirmImport: (selection: BackupImportSelection) => void | Promise<void>;
};

export type BackupImportSelection = Readonly<{
  envelope: BackupEnvelope;
  fileName: string;
  generation: number;
}>;

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
  migrationContext,
  onConfirmImport,
}: ImportBackupControlProps) {
  const inputId = useId();
  const selectionGeneration = useRef(0);
  const [selection, setSelection] = useState<BackupImportSelection | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const generation = ++selectionGeneration.current;
    setSelection(null);
    setError(null);

    if (file === null) {
      return;
    }

    if (file.size > maxBackupBytes) {
      setError('This backup file is too large to import.');
      return;
    }

    let text: string;

    try {
      text = await file.text();
    } catch {
      if (generation === selectionGeneration.current) {
        setError('This file could not be read.');
      }
      return;
    }

    if (generation !== selectionGeneration.current) {
      return;
    }

    try {
      const envelope = parseBackupFile(text, {
        expectedSchemaVersion,
        migrationContext,
      });

      if (generation === selectionGeneration.current) {
        setSelection(
          Object.freeze({ envelope, fileName: file.name, generation }),
        );
      }
    } catch (parseError) {
      if (generation === selectionGeneration.current) {
        setError(
          parseError instanceof BackupValidationError
            ? parseError.message
            : 'This file could not be imported as a backup.',
        );
      }
    }
  }

  const preview =
    selection === null
      ? null
      : { selection, summary: summarizeBackup(selection.envelope) };

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
          onClick={(event) => {
            // Opening the picker invalidates the old selection immediately.
            // Clearing the input also permits choosing the same file again.
            selectionGeneration.current += 1;
            setSelection(null);
            setError(null);
            event.currentTarget.value = '';
          }}
          type="file"
        />
        {error ? (
          <p className="data-action__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {preview ? (
        <div className="backup-preview">
          <p className="backup-preview__heading">
            Preview of{' '}
            <span className="backup-preview__file">
              {preview.selection.fileName}
            </span>
          </p>
          <dl className="backup-preview__list">
            <div className="backup-preview__row">
              <dt>Profile</dt>
              <dd>
                {preview.summary.hasProfile
                  ? (preview.summary.profileName ?? 'Included')
                  : 'Not included'}
              </dd>
            </div>
            <div className="backup-preview__row">
              <dt>Exported</dt>
              <dd>{preview.summary.exportedAt}</dd>
            </div>
            <div className="backup-preview__row">
              <dt>App version</dt>
              <dd>{preview.summary.appVersion}</dd>
            </div>
            <div className="backup-preview__row">
              <dt>Course units</dt>
              <dd>{preview.summary.counts.courseUnits}</dd>
            </div>
            <div className="backup-preview__row">
              <dt>Progress entries</dt>
              <dd>{preview.summary.counts.progressEntries}</dd>
            </div>
            <div className="backup-preview__row">
              <dt>Study sessions</dt>
              <dd>{preview.summary.counts.studySessions}</dd>
            </div>
            <div className="backup-preview__row">
              <dt>XP transactions</dt>
              <dd>{preview.summary.counts.xpTransactions}</dd>
            </div>
            <div className="backup-preview__row">
              <dt>Achievements</dt>
              <dd>{preview.summary.counts.achievementUnlocks}</dd>
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
              if (selection !== null) {
                void onConfirmImport(selection);
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
