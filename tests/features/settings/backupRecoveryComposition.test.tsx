import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import {
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
 * Epic C6-R, D2 composition evidence. The component-level tests in
 * tests/components/importBackupControl.test.tsx already prove the shared
 * control can forward-convert a schema-2 backup when directly supplied a
 * migration context. This proves the two real production compositions that
 * render that control - Settings and onboarding recovery - actually wire the
 * live database's bound context, using the real app shell/router rather than
 * a synthetic call to the shared control.
 */

async function onboardRealApp() {
  getSharedDatabase(defaultTestMigrationContext);
  await initializeDatabase({ seed: bundledCourseSeed });
  await saveLearnerProfile(
    {
      ...defaultLearnerProfileValues,
      displayName: 'D2 Composition Learner',
      targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
    },
    { completeOnboarding: true },
  );
  closeSharedDatabase();
}

function schemaTwoBackupFile() {
  return new File(
    [JSON.stringify(schemaTwoBackup)],
    'v1.3.0-envelope1-schema2.json',
    { type: 'application/json' },
  );
}

describe('backup recovery composition (Epic C6-R, D2)', () => {
  afterEach(() => {
    closeSharedDatabase();
  });

  it('Settings: previews and restores a historical schema-2 backup through the real production composition', async () => {
    await onboardRealApp();

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
    await screen.findByRole(
      'heading',
      { name: 'RPG Hub' },
      { timeout: 15_000 },
    );

    await waitFor(
      async () => {
        const snapshot = await getDatabaseSnapshot({ db: getSharedDatabase() });
        expect(snapshot.learnerProfile?.displayName).toBe('Current Ada');
        expect(snapshot.appMeta).toMatchObject({
          schemaVersion: 3,
          activeProgrammeId: 'cs50x',
        });
      },
      { timeout: 15_000 },
    );
  }, 30_000);

  it('Onboarding recovery: previews a historical schema-2 backup and the confirmation is reachable', async () => {
    // No prior onboarding: this is the reset/never-onboarded device the
    // onboarding recovery surface exists for.
    getSharedDatabase(defaultTestMigrationContext);
    closeSharedDatabase();

    await renderAppAtRoute('/onboarding');
    await screen.findByText(/already have a backup/i, {}, { timeout: 15_000 });

    await userEvent.upload(
      screen.getByLabelText('Backup file'),
      schemaTwoBackupFile(),
    );

    // Preview succeeded and confirmation is reachable through the real
    // onboarding recovery composition - this is the exact path the rejected
    // C6 candidate could never reach for a schema-2 backup.
    await screen.findByRole(
      'button',
      { name: /restore this backup/i },
      { timeout: 15_000 },
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  }, 30_000);
});
