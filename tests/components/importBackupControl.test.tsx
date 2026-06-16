import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ImportBackupControl } from '@/components/ui/ImportBackupControl';
import { buildBackupEnvelope, type BackupData } from '@/lib/backup';

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
  };
}

const validEnvelope = buildBackupEnvelope(emptyBackupData(), {
  appVersion: '0.1.0',
  schemaVersion: 2,
  exportedAt: '2026-06-16T11:00:00.000Z',
});

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
    expect(onConfirmImport).toHaveBeenCalledWith(validEnvelope);
  });
});
