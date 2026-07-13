import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

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
    page.getByRole('status').getByText('Backup exported'),
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
    page.getByRole('heading', { name: 'Start tracking CS50 locally' }),
  ).toBeVisible();
  expect(await readLedgerCounts(page)).toEqual({
    xpTransactions: 0,
    studySessions: 0,
    mediaProgressEvents: 0,
  });

  // Import the backup from the reachable onboarding recovery control.
  await page.getByLabel('Backup file').setInputFiles(backupPath);
  await page.getByRole('button', { name: 'Restore this backup' }).click();

  // The restored backup completed onboarding, so the app returns to the
  // protected route that initiated the reset/recovery round trip.
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page).toHaveURL(/\/settings$/);

  const afterRestore = await readLedgerCounts(page);
  expect(afterRestore).toEqual(beforeExport);

  // Restored profile and activity are visible across a reload.
  await page.goto('/');
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

  // A settings import lands on the restored dashboard as its confirmation.
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(await readLedgerCounts(page)).toEqual(before);
});

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
