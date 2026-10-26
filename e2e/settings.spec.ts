import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

function collectConsoleIssues(page: Page, issues: string[]) {
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      issues.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    issues.push(error.message);
  });
}

async function logWatchedRangeWithNote(page: Page, note: string) {
  await page.goto('/course');
  await page
    .getByTestId('course-item-week-0-lecture')
    .getByRole('link', { name: 'Open' })
    .click();
  await expect(page).toHaveURL(/\/course\/week-0-lecture$/);
  await page.getByLabel('Session Notes').fill(note);
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(
    page.getByText('Last watched 0:00-20:00 (20 min)'),
  ).toBeVisible();
}

async function readLedgerCounts(page: Page) {
  return (await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');
      request.onerror = () => reject(new Error('open failed'));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          ['xp_transactions', 'study_sessions', 'media_progress_events'],
          'readonly',
        );
        const xp = transaction.objectStore('xp_transactions').count();
        const sessions = transaction.objectStore('study_sessions').count();
        const media = transaction.objectStore('media_progress_events').count();
        transaction.oncomplete = () => {
          resolve({
            xpTransactions: xp.result,
            studySessions: sessions.result,
            mediaProgressEvents: media.result,
          });
          database.close();
        };
        transaction.onerror = () => {
          reject(new Error('count failed'));
          database.close();
        };
      };
    });
  `)) as {
    mediaProgressEvents: number;
    studySessions: number;
    xpTransactions: number;
  };
}

async function readLatestImportFileName(page: Page) {
  return (await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');
      request.onerror = () => reject(new Error('open failed'));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('backups', 'readonly');
        const read = transaction.objectStore('backups').getAll();
        transaction.oncomplete = () => {
          const imports = read.result
            .filter((record) => record.type === 'import')
            .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
          resolve(imports.at(-1)?.fileName ?? null);
          database.close();
        };
        transaction.onerror = () => {
          reject(new Error('backup history read failed'));
          database.close();
        };
      };
    });
  `)) as string | null;
}

async function downgradeStoredAppVersion(page: Page) {
  await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');
      request.onerror = () => reject(new Error('open failed'));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('app_meta', 'readwrite');
        const store = transaction.objectStore('app_meta');
        const read = store.get('app-meta');

        read.onerror = () => reject(new Error('metadata read failed'));
        read.onsuccess = () => {
          store.put({ ...read.result, appVersion: '1.2.0' });
        };
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(new Error('metadata update failed'));
        };
      };
    });
  `);
}

async function readStartupSnapshot(page: Page) {
  return (await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');
      request.onerror = () => reject(new Error('open failed'));
      request.onsuccess = () => {
        const database = request.result;
        const stores = [
          'app_meta',
          'learner_profile',
          'course_units',
          'course_items',
          'content_assets',
          'content_slices',
        ];
        const transaction = database.transaction(stores, 'readonly');
        const reads = Object.fromEntries(
          stores.map((storeName) => [
            storeName,
            transaction.objectStore(storeName).getAll(),
          ]),
        );
        transaction.oncomplete = () => {
          resolve(
            JSON.stringify(
              Object.fromEntries(
                stores.map((storeName) => [storeName, reads[storeName].result]),
              ),
            ),
          );
          database.close();
        };
        transaction.onerror = () => {
          reject(new Error('snapshot failed'));
          database.close();
        };
      };
    });
  `)) as string;
}

test('completes the export, reset, and onboarding-restore recovery loop', async ({
  page,
}) => {
  const consoleIssues: string[] = [];
  const dialogs: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(message.text());
    }
  });
  // Any dialog here would mean an injected note executed as script.
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });

  await completeOnboarding(page);
  await logWatchedRangeWithNote(page, "<script>alert('pp16')</script>");

  const beforeExport = await readLedgerCounts(page);
  expect(beforeExport.mediaProgressEvents).toBeGreaterThan(0);

  // Export a backup from settings and capture the downloaded file.
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export local backup' }).click(),
  ]);
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  await expect(
    page.getByRole('status').getByText('Backup download started'),
  ).toBeVisible();

  // The destructive/reset surface must be accessible in dark theme and must not
  // use design-system card variants whose light backgrounds break dark theme.
  await expect(
    page.locator('.card--accent, .card--danger, .card--subtle, .state-card'),
  ).toHaveCount(0);
  const settingsScan = await new AxeBuilder({ page }).analyze();
  expect(settingsScan.violations).toEqual([]);

  // Reset everything; the app gates back to onboarding with no activity left.
  await page.getByLabel('Confirmation phrase').fill('RESET');
  await page.getByRole('button', { name: 'Reset all local data' }).click();
  await expect(
    page.getByRole('heading', { name: 'Start with ProgressPal' }),
  ).toBeVisible();
  expect(await readLedgerCounts(page)).toEqual({
    xpTransactions: 0,
    studySessions: 0,
    mediaProgressEvents: 0,
  });

  // Import the backup from the reachable onboarding recovery control.
  await page.getByLabel('Backup file').setInputFiles(backupPath);
  const selectedFileName = await page
    .locator('.backup-preview__file')
    .textContent();
  expect(selectedFileName).toBeTruthy();
  await page.getByRole('button', { name: 'Restore this backup' }).click();

  // The restored backup completed onboarding, so the app returns to the
  // protected route that initiated the reset/recovery round trip.
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);
  expect(await readLatestImportFileName(page)).toBe(selectedFileName);

  const afterRestore = await readLedgerCounts(page);
  expect(afterRestore).toEqual(beforeExport);

  // Restored profile and activity are visible across a reload.
  await page.goto('/profile');
  await expect(
    page.getByRole('heading', { name: 'Local profile for Alex' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Local profile for Alex' }),
  ).toBeVisible();
  expect(await readLedgerCounts(page)).toEqual(beforeExport);

  expect(dialogs).toEqual([]);
  expect(consoleIssues).toEqual([]);
});

test('imports a backup from settings when onboarding is complete', async ({
  page,
}) => {
  await completeOnboarding(page);
  await logWatchedRangeWithNote(page, 'Saved from Playwright.');

  await page.goto('/settings');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export local backup' }).click(),
  ]);
  const backupPath = await download.path();

  const before = await readLedgerCounts(page);
  expect(before.mediaProgressEvents).toBeGreaterThan(0);

  await page.getByLabel('Backup file').setInputFiles(backupPath);
  await page
    .getByRole('button', { name: 'Replace local data with this backup' })
    .click();

  // A settings import lands on the restored RPG Home as its confirmation.
  await expect(
    page.getByRole('heading', { name: 'Home', exact: true }),
  ).toBeVisible();
  expect(await readLedgerCounts(page)).toEqual(before);
});

// On a desktop the two profile cards sit side by side and the shorter one is
// stretched to the taller one's height; its heading, explanation and fields
// must stay together at the top (they once spread over that height). On a
// phone the cards stack and the spacing is as before. Screenshots go to
// TRACK_SCREENSHOT_DIR when it is set, outside the repository.
for (const viewport of [
  { height: 900, width: 1280 },
  { height: 900, width: 1600 },
  { height: 844, width: 390 },
] as const) {
  test(`keeps the profile editor together on /rpg/settings at ${viewport.width}px, with one Settings gear in the HUD`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await completeOnboarding(page);
    await page.goto('/rpg/settings');
    const card = page
      .locator('.card')
      .filter({ has: page.getByRole('heading', { name: 'Edit profile' }) });
    const title = card.getByRole('heading', { name: 'Edit profile' });
    const description = card.locator('.card__description').first();
    const nameLabel = card.getByText('Display name', { exact: true });

    await expect(title).toBeVisible();
    // Measured top to top: a stretched grid row also stretches the heading's
    // own box, so a bottom-to-top gap would hide the drift.
    const gap = async () =>
      (await description.boundingBox())!.y - (await title.boundingBox())!.y;
    const fieldGap = async () =>
      (await nameLabel.boundingBox())!.y - (await description.boundingBox())!.y;

    expect(await gap()).toBeLessThan(48);
    expect(await fieldGap()).toBeLessThan(96);
    if (viewport.width >= 1280) {
      // With the default profile both cards are about as tall. The owner's
      // screenshot had a taller neighbour (more avatar choices): make it so,
      // and the editor still keeps together.
      await page.addStyleTag({
        content: '.profile-page-grid > .card:last-child { min-height: 1600px }',
      });
      expect(await gap(), 'beside a taller card').toBeLessThan(48);
      expect(await fieldGap(), 'beside a taller card').toBeLessThan(96);
      const dir = process.env.TRACK_SCREENSHOT_DIR;

      if (dir !== undefined) {
        await card.screenshot({
          path: `${dir}/settings-profile-taller-neighbour-after-${viewport.width}.png`,
        });
      }
      // The check can fail: with the cards' content stretched again (the old
      // behaviour), the heading and its explanation drift apart, as in the
      // owner's screenshot.
      await page.addStyleTag({
        content: '.profile-page-grid > .card { align-content: normal }',
      });
      expect(await gap(), 'the old stretched layout').toBeGreaterThan(100);
      if (dir !== undefined) {
        await card.screenshot({
          path: `${dir}/settings-profile-taller-neighbour-before-${viewport.width}.png`,
        });
      }
      await page.reload();
      await expect(title).toBeVisible();
    }
    // The real controls are all still there.
    await expect(
      page.getByRole('button', { name: 'Save local settings' }),
    ).toBeEnabled();
    await expect(
      page.getByRole('button', { name: 'Export local backup' }),
    ).toBeEnabled();
    // One Settings launch, in the HUD, marked as the current page.
    const gear = page.getByRole('link', { name: 'Open Settings' });

    await expect(gear).toHaveCount(1);
    await expect(gear).toHaveAttribute('aria-current', 'page');
    expect(
      await page
        .getByRole('region', { name: 'Persistent hero HUD' })
        .getByRole('link', { name: 'Open Settings' })
        .count(),
    ).toBe(1);
    if (process.env.TRACK_SCREENSHOT_DIR !== undefined) {
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${process.env.TRACK_SCREENSHOT_DIR}/settings-profile-${viewport.width}.png`,
      });
      await page.goto('/rpg');
      await page.getByRole('region', { name: 'Persistent hero HUD' }).waitFor();
      await page.screenshot({
        path: `${process.env.TRACK_SCREENSHOT_DIR}/home-hud-settings-${viewport.width}.png`,
      });
    }
  });
}

test('rejects an invalid backup file without mutating data', async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto('/settings');

  const before = await readLedgerCounts(page);

  await page.getByLabel('Backup file').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ not valid json'),
  });

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Replace local data with this backup' }),
  ).toHaveCount(0);
  expect(await readLedgerCounts(page)).toEqual(before);
});

test('keeps one writer, makes the peer read-only, and blocks destructive recovery', async ({
  context,
  page,
}) => {
  const consoleIssues: string[] = [];
  collectConsoleIssues(page, consoleIssues);
  await completeOnboarding(page);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  const beforePeer = await readStartupSnapshot(page);

  const peer = await context.newPage();
  collectConsoleIssues(peer, consoleIssues);
  await peer.goto('/settings');

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(peer.getByRole('heading', { name: 'Settings' })).toBeVisible();
  for (const openPage of [page, peer]) {
    await expect(
      openPage.getByRole('heading', { name: 'Local startup failed' }),
    ).toHaveCount(0);
  }

  await expect(
    page.getByRole('heading', { name: 'This ProgressPal tab is read-only' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Save local settings' }),
  ).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Export local backup' }),
  ).toBeEnabled();
  await expect(page.getByLabel('Backup file')).toBeDisabled();
  await expect(page.getByLabel('Confirmation phrase')).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Reset all local data' }),
  ).toBeDisabled();

  await expect(
    peer.getByRole('heading', { name: 'This ProgressPal tab is read-only' }),
  ).toBeVisible();
  await expect(
    peer.getByRole('button', { name: 'Save local settings' }),
  ).toBeDisabled();
  await expect(
    peer.getByRole('button', { name: 'Export local backup' }),
  ).toBeEnabled();
  await expect(peer.getByLabel('Backup file')).toBeDisabled();
  await expect(peer.getByLabel('Confirmation phrase')).toBeDisabled();
  await expect(
    peer.getByRole('button', { name: 'Reset all local data' }),
  ).toBeDisabled();

  await peer.goto('/course/week-0-problem-set');
  await expect(
    peer.getByRole('heading', { name: 'Problem Set Progress' }),
  ).toBeVisible();
  await expect(
    peer.getByRole('heading', { name: 'This ProgressPal tab is read-only' }),
  ).toBeVisible();
  await expect(
    peer.getByRole('button', { name: 'Save progress' }),
  ).toBeDisabled();

  await peer.goto('/rpg/resource/week-4-problem-set');
  await expect(
    peer.getByRole('heading', { name: 'Problem Set 4: Memory' }),
  ).toBeVisible();
  await expect(
    peer.getByRole('heading', { name: 'This ProgressPal tab is read-only' }),
  ).toBeVisible();
  await expect(
    peer.getByRole('button', { name: 'Save progress' }),
  ).toBeDisabled();
  await expect(
    peer.getByRole('button', { name: 'Mark locally complete' }),
  ).toBeDisabled();

  await page.getByLabel('Display name').fill('Owner tab update');
  await page.getByRole('button', { name: 'Save local settings' }).click();
  await expect(page.getByText('Local profile saved')).toBeVisible();
  expect(await readStartupSnapshot(page)).not.toBe(beforePeer);

  await peer.close();

  await expect(
    page.getByRole('button', { name: 'Export local backup' }),
  ).toBeEnabled();
  await expect(page.getByLabel('Backup file')).toBeEnabled();
  await expect(page.getByLabel('Confirmation phrase')).toBeEnabled();
  await page.getByLabel('Confirmation phrase').fill('RESET');
  await expect(
    page.getByRole('button', { name: 'Reset all local data' }),
  ).toBeEnabled();
  expect(consoleIssues).toEqual([]);
});

test('automatically recovers a blocked startup repair after the active peer closes', async ({
  context,
  page,
}) => {
  await completeOnboarding(page);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await downgradeStoredAppVersion(page);

  const peer = await context.newPage();
  const consoleIssues: string[] = [];
  collectConsoleIssues(peer, consoleIssues);
  await peer.goto('/rpg/settings');
  await expect(
    peer.getByRole('heading', { name: 'RPG startup failed' }),
  ).toBeVisible();
  await expect(
    peer.getByText(
      'This local database still needs a startup repair. Close the other ProgressPal tab, then retry. ProgressPal stopped before the blocked repair step.',
    ),
  ).toBeVisible();
  const retry = peer.getByRole('button', { name: 'Retry local data load' });
  await expect(retry).toBeDisabled();

  await page.close();
  await expect(peer.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(retry).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await peer.evaluate(`
          new Promise((resolve, reject) => {
            const request = indexedDB.open('progresspal-cs50-edition');
            request.onerror = () => reject(new Error('open failed'));
            request.onsuccess = () => {
              const database = request.result;
              const transaction = database.transaction('app_meta', 'readonly');
              const read = transaction.objectStore('app_meta').get('app-meta');
              read.onerror = () => reject(new Error('metadata read failed'));
              read.onsuccess = () => {
                const appVersion = read.result.appVersion;
                database.close();
                resolve(appVersion);
              };
            };
          });
        `)) as string,
    )
    .toBe('1.9.0');
  expect(consoleIssues).toEqual([]);
});
