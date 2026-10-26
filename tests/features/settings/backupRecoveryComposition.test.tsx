import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { buildBackupEnvelope, serializeBackupEnvelope } from '@/lib/backup';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  defaultLearnerProfileValues,
  getDatabaseSnapshot,
  initializeDatabase,
  saveLearnerProfile,
} from '@/lib/db';
import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { renderAppAtRoute } from '@/lib/testing/renderAppAtRoute';
import { bundledCourseSeed } from '@/seed';

import { defaultTestMigrationContext } from '../../db/testDatabase';
import schemaTwoBackup from '../../fixtures/backups/v1.3.0-envelope1-schema2.json';

/**
 * Epic C6-R, D2 composition evidence, on the Epic E forward baseline. This
 * proves the two real production compositions that render the shared import
 * control (Settings and onboarding recovery) wire the live database's bound
 * context, using the real app shell and router: a native schema-5 backup
 * previews and restores, and the historical schema-2 export (accepted
 * E-SCHEMA-1: no 2 → 3 → 4 exported-backup path) is refused clearly before
 * any write, through the same compositions.
 */

async function onboardRealApp(displayName: string) {
  getSharedDatabase(defaultTestMigrationContext);
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName,
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
}

/** A native schema-5 export of the current shared database. */
async function nativeBackupFile() {
  const snapshot = await getDatabaseSnapshot({ db: getSharedDatabase() });
  const { contents } = serializeBackupEnvelope(
    buildBackupEnvelope(snapshot, {
      appVersion: currentApplicationVersion,
      schemaVersion: currentDatabaseSchemaVersion,
      exportedAt: '2026-10-03T08:00:00.000Z',
    }),
  );

  return new File([contents], 'progresspal-schema-5.json', {
    type: 'application/json',
  });
}

function schemaTwoBackupFile() {
  return new File(
    [JSON.stringify(schemaTwoBackup)],
    'v1.3.0-envelope1-schema2.json',
    { type: 'application/json' },
  );
}

describe('backup recovery composition (Epic C6-R, D2; Epic E forward baseline)', () => {
  afterEach(() => {
    closeSharedDatabase();
  });

  it('Settings: refuses a historical schema-2 backup, then previews and restores a native schema-5 backup', async () => {
    await onboardRealApp('Exported Ada');
    const backup = await nativeBackupFile();
    await saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        displayName: 'Changed after export',
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      { completeOnboarding: true },
    );
    closeSharedDatabase();

    await renderAppAtRoute('/settings');
    await screen.findByRole(
      'heading',
      { name: /settings/i },
      { timeout: 15_000 },
    );

    await userEvent.upload(
      screen.getByLabelText('Backup file'),
      schemaTwoBackupFile(),
    );
    expect(
      await screen.findByRole('alert', {}, { timeout: 15_000 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /replace local data with this backup/i,
      }),
    ).not.toBeInTheDocument();
    const untouched = await getDatabaseSnapshot({ db: getSharedDatabase() });
    expect(untouched.learnerProfile?.displayName).toBe('Changed after export');

    await userEvent.upload(screen.getByLabelText('Backup file'), backup);
    const confirmButton = await screen.findByRole(
      'button',
      { name: /replace local data with this backup/i },
      { timeout: 15_000 },
    );
    await userEvent.click(confirmButton);

    // handleImport does not navigate until runLocalMutation's post-restore
    // provider refresh has completed. Waiting for the real destination route
    // therefore keeps teardown from closing the shared database while that
    // refresh is still resolving application state.
    await screen.findByRole('heading', { name: 'Home' }, { timeout: 15_000 });

    await waitFor(
      async () => {
        const snapshot = await getDatabaseSnapshot({ db: getSharedDatabase() });
        expect(snapshot.learnerProfile?.displayName).toBe('Exported Ada');
        expect(snapshot.appMeta).toMatchObject({
          schemaVersion: 5,
          activeProgrammeId: 'cs50x',
        });
      },
      { timeout: 15_000 },
    );
  }, 45_000);

  it('Onboarding recovery: refuses a historical schema-2 backup and reaches the confirmation for a native schema-5 backup', async () => {
    // A native backup from another device; this device was never onboarded,
    // the reset/never-onboarded case the onboarding recovery surface exists for.
    await onboardRealApp('Recovered Ada');
    const backup = await nativeBackupFile();
    closeSharedDatabase();
    getSharedDatabase(defaultTestMigrationContext);
    await getSharedDatabase().delete();
    closeSharedDatabase();

    await renderAppAtRoute('/onboarding');
    await screen.findByText(/already have a backup/i, {}, { timeout: 15_000 });

    await userEvent.upload(
      screen.getByLabelText('Backup file'),
      schemaTwoBackupFile(),
    );
    expect(
      await screen.findByRole('alert', {}, { timeout: 15_000 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /restore this backup/i }),
    ).not.toBeInTheDocument();

    await userEvent.upload(screen.getByLabelText('Backup file'), backup);
    await screen.findByRole(
      'button',
      { name: /restore this backup/i },
      { timeout: 15_000 },
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  }, 45_000);
});
