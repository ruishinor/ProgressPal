import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ImportBackupControl } from '@/components/ui/ImportBackupControl';
import { buildBackupEnvelope, type BackupData } from '@/lib/backup';
import { defaultTestMigrationContext } from '../db/testDatabase';
import schemaTwoBackup from '../fixtures/backups/v1.3.0-envelope1-schema2.json';

function emptyBackupData(): BackupData {
  return {
    appMeta: null,
    learnerProfile: null,
    courseUnits: [],
    courseItems: [],
    progressEntries: [],
    contentAssets: [],
    contentSlices: [],
    mediaProgressEvents: [],
    resumePoints: [],
    studySessions: [],
    xpTransactions: [],
    achievementDefinitions: [],
    achievementUnlocks: [],
    backups: [],
    catalogueVersions: [],
    programmeEnrolments: [],
  };
}

const validEnvelope = buildBackupEnvelope(emptyBackupData(), {
  appVersion: '0.1.0',
  schemaVersion: 2,
  exportedAt: '2026-06-16T11:00:00.000Z',
});

function envelopeWithVersion(appVersion: string) {
  return buildBackupEnvelope(emptyBackupData(), {
    appVersion,
    schemaVersion: 2,
    exportedAt: '2026-06-16T11:00:00.000Z',
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function jsonFile(name: string, contents: string) {
  return new File([contents], name, { type: 'application/json' });
}

describe('ImportBackupControl', () => {
  it('does not show a confirm action until a valid backup is parsed', () => {
    render(
      <ImportBackupControl
        expectedSchemaVersion={2}
        onConfirmImport={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /replace local data/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a friendly error for an invalid file and offers no import', async () => {
    const onConfirmImport = vi.fn();
    render(
      <ImportBackupControl
        expectedSchemaVersion={2}
        onConfirmImport={onConfirmImport}
      />,
    );

    await userEvent.upload(
      screen.getByLabelText('Backup file'),
      jsonFile('broken.json', '{ not json'),
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /replace local data/i }),
    ).not.toBeInTheDocument();
    expect(onConfirmImport).not.toHaveBeenCalled();
  });

  it('shows a preview and confirms import for a valid backup', async () => {
    const onConfirmImport = vi.fn();
    render(
      <ImportBackupControl
        expectedSchemaVersion={2}
        onConfirmImport={onConfirmImport}
      />,
    );

    await userEvent.upload(
      screen.getByLabelText('Backup file'),
      jsonFile('backup.json', JSON.stringify(validEnvelope)),
    );

    expect(await screen.findByText('0.1.0')).toBeInTheDocument();
    expect(screen.getByText('Not included')).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', {
      name: /replace local data/i,
    });
    await userEvent.click(confirmButton);

    expect(onConfirmImport).toHaveBeenCalledTimes(1);
    expect(onConfirmImport).toHaveBeenCalledWith({
      envelope: validEnvelope,
      fileName: 'backup.json',
      generation: 2,
    });
  });

  it('keeps the newest file and provenance when an older read finishes last', async () => {
    const user = userEvent.setup();
    const onConfirmImport = vi.fn();
    const slowRead = deferred<string>();
    const fastEnvelope = envelopeWithVersion('fast-b');
    const slowEnvelope = envelopeWithVersion('slow-a');
    const slowFile = jsonFile('slow-a.json', JSON.stringify(slowEnvelope));
    const fastFile = jsonFile('fast-b.json', JSON.stringify(fastEnvelope));
    vi.spyOn(slowFile, 'text').mockImplementation(() => slowRead.promise);

    render(
      <ImportBackupControl
        expectedSchemaVersion={2}
        onConfirmImport={onConfirmImport}
      />,
    );

    const input = screen.getByLabelText('Backup file');
    await user.upload(input, slowFile);
    await user.upload(input, fastFile);

    expect(await screen.findByText('fast-b')).toBeInTheDocument();
    expect(screen.getByText('fast-b.json')).toBeInTheDocument();

    slowRead.resolve(JSON.stringify(slowEnvelope));
    await Promise.resolve();
    expect(screen.queryByText('slow-a')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /replace local data/i }),
    );
    expect(onConfirmImport).toHaveBeenCalledWith(
      expect.objectContaining({
        envelope: fastEnvelope,
        fileName: 'fast-b.json',
      }),
    );
  });

  it('invalidates a valid preview when the next selection is invalid or cancelled', async () => {
    const user = userEvent.setup();
    const onConfirmImport = vi.fn();
    render(
      <ImportBackupControl
        expectedSchemaVersion={2}
        onConfirmImport={onConfirmImport}
      />,
    );

    const input = screen.getByLabelText('Backup file');
    await user.upload(
      input,
      jsonFile('valid-a.json', JSON.stringify(validEnvelope)),
    );
    expect(
      await screen.findByRole('button', { name: /replace local data/i }),
    ).toBeInTheDocument();

    await user.upload(input, jsonFile('invalid-b.json', '{ not json'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /replace local data/i }),
    ).not.toBeInTheDocument();

    await user.upload(
      input,
      jsonFile('valid-a.json', JSON.stringify(validEnvelope)),
    );
    expect(
      await screen.findByRole('button', { name: /replace local data/i }),
    ).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [] } });
    expect(
      screen.queryByRole('button', { name: /replace local data/i }),
    ).not.toBeInTheDocument();
    expect(onConfirmImport).not.toHaveBeenCalled();
  });

  it('accepts selecting the same file name again as a new generation', async () => {
    const user = userEvent.setup();
    const onConfirmImport = vi.fn();
    const firstEnvelope = envelopeWithVersion('first');
    const secondEnvelope = envelopeWithVersion('second');
    render(
      <ImportBackupControl
        expectedSchemaVersion={2}
        onConfirmImport={onConfirmImport}
      />,
    );

    const input = screen.getByLabelText('Backup file');
    await user.upload(
      input,
      jsonFile('same-name.json', JSON.stringify(firstEnvelope)),
    );
    expect(await screen.findByText('first')).toBeInTheDocument();

    await user.upload(
      input,
      jsonFile('same-name.json', JSON.stringify(secondEnvelope)),
    );
    expect(await screen.findByText('second')).toBeInTheDocument();
    expect(screen.queryByText('first')).not.toBeInTheDocument();
  });

  /**
   * Owner-review C6-R RED checkpoint (D2): the production import control must
   * be able to preview a historical schema-2 backup once the application is on
   * schema 3, but only when it is given the authorized migration context. A
   * rejected C6 candidate wired `ImportBackupControl` without a
   * `migrationContext` prop, so `parseBackupFile` always rejected a schema-2
   * file during preview and the destructive restore path was never reachable
   * through the real product UI.
   */
  it('D2-A: previews a historical schema-2 backup under the authorized migration context', async () => {
    const onConfirmImport = vi.fn();
    render(
      <ImportBackupControl
        expectedSchemaVersion={3}
        migrationContext={defaultTestMigrationContext}
        onConfirmImport={onConfirmImport}
      />,
    );

    await userEvent.upload(
      screen.getByLabelText('Backup file'),
      jsonFile('schema2-backup.json', JSON.stringify(schemaTwoBackup)),
    );

    // Wait for the control to settle on either outcome (preview or error)
    // rather than only `findByRole('button', ...)`, so a pre-fix failure
    // surfaces immediately as "the alert appeared instead of the button"
    // rather than as a generic 5s async-utility timeout.
    await waitFor(() => {
      const hasAlert = screen.queryByRole('alert') !== null;
      const hasConfirmButton =
        screen.queryByRole('button', { name: /replace local data/i }) !== null;

      expect(hasAlert || hasConfirmButton).toBe(true);
    });

    // Pre-fix, `ImportBackupControl` never forwards `migrationContext` to
    // `parseBackupFile`, so this schema-2 file is rejected with the same
    // "different data version" alert asserted in the control test below,
    // even though the caller supplied an authorized context here.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /replace local data/i }),
    ).toBeInTheDocument();
  });

  it('D2-A (control): rejects the same schema-2 backup when no migration context is supplied', async () => {
    const onConfirmImport = vi.fn();
    render(
      <ImportBackupControl
        expectedSchemaVersion={3}
        onConfirmImport={onConfirmImport}
      />,
    );

    await userEvent.upload(
      screen.getByLabelText('Backup file'),
      jsonFile('schema2-backup.json', JSON.stringify(schemaTwoBackup)),
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /replace local data/i }),
    ).not.toBeInTheDocument();
    expect(onConfirmImport).not.toHaveBeenCalled();
  });
});
