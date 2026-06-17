import { expect, test, type Page } from '@playwright/test';

async function completeOnboarding(page: Page) {
  await page.goto('/');

  await page.getByLabel('Display name').fill('Alex');
  await page.getByLabel('Target minutes per week').fill('360');
  await page.getByLabel('Face shape').selectOption('square');
  await page.getByLabel('Hair').selectOption('parted');
  await page.getByLabel('Top color').selectOption('ocean');
  await page.getByLabel('Theme').selectOption('dark');
  await page.getByLabel('Reduce motion in this app').check();
  await page.getByRole('button', { name: 'Save and open dashboard' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

async function readSessionStores(page: Page) {
  return (await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB.'));
      };

      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          [
            'study_sessions',
            'progress_entries',
            'media_progress_events',
            'content_slices',
            'resume_points',
            'xp_transactions',
            'achievement_unlocks',
            'backups',
          ],
          'readonly',
        );

        const studySessionsRequest =
          transaction.objectStore('study_sessions').getAll();
        const progressEntriesRequest =
          transaction.objectStore('progress_entries').getAll();
        const mediaEventsRequest =
          transaction.objectStore('media_progress_events').getAll();
        const contentSlicesRequest =
          transaction.objectStore('content_slices').getAll();
        const resumePointsRequest =
          transaction.objectStore('resume_points').getAll();
        const xpTransactionsRequest =
          transaction.objectStore('xp_transactions').getAll();
        const achievementUnlocksRequest =
          transaction.objectStore('achievement_unlocks').getAll();
        const backupsRequest = transaction.objectStore('backups').getAll();

        transaction.oncomplete = () => {
          resolve({
            achievementUnlocks: achievementUnlocksRequest.result.length,
            backups: backupsRequest.result.length,
            contentSlices: contentSlicesRequest.result.length,
            mediaProgressEvents: mediaEventsRequest.result.length,
            progressEntries: progressEntriesRequest.result.length,
            resumePoints: resumePointsRequest.result.length,
            studySessions: Array.isArray(studySessionsRequest.result)
              ? studySessionsRequest.result
              : [],
            xpTransactions: xpTransactionsRequest.result.length,
          });
          database.close();
        };

        transaction.onerror = () => {
          database.close();
          reject(new Error('Failed to read session-related IndexedDB stores.'));
        };
      };
    });
  `)) as {
    achievementUnlocks: number;
    backups: number;
    contentSlices: number;
    mediaProgressEvents: number;
    progressEntries: number;
    resumePoints: number;
    studySessions: Array<Record<string, unknown>>;
    xpTransactions: number;
  };
}

test('saves one live session, persists the ledger, and leaves non-session stores unchanged', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-06-12T08:00:00.000Z') });

  await completeOnboarding(page);
  await page.goto('/sessions?itemId=week-0-lecture');

  const beforeStores = await readSessionStores(page);

  await page.locator('#live-session-mode').selectOption('watching');
  await page.getByRole('button', { name: 'Start live session' }).click();

  await expect(page.getByRole('status')).toContainText('00:00');
  await page.clock.runFor('00:30');
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('status')).toContainText('00:30');
  await page.clock.fastForward('00:20');
  await expect(page.getByRole('status')).toContainText('00:30');
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.clock.runFor('00:40');
  await page.getByRole('button', { name: 'Finish' }).click();

  await expect(page.getByText('1 min logged effort')).toBeVisible();
  await page
    .locator('#live-session-notes')
    .fill('Focused on the opening lecture segment.');
  await page.locator('#live-session-blockers').fill('Context switch');
  await page.getByRole('button', { name: 'Save study session' }).click();

  await expect(page.getByText('Session saved', { exact: true })).toBeVisible();
  await expect(page.getByText('Week 0: Scratch - Lecture')).toBeVisible();
  await expect(
    page.locator('.session-ledger-list').getByText('Watching'),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByText('Week 0: Scratch - Lecture')).toBeVisible();
  await expect(page.getByText('1 min')).toBeVisible();

  const afterStores = await readSessionStores(page);

  expect(afterStores.studySessions).toHaveLength(
    beforeStores.studySessions.length + 1,
  );
  expect(afterStores.progressEntries).toBe(beforeStores.progressEntries);
  expect(afterStores.mediaProgressEvents).toBe(
    beforeStores.mediaProgressEvents,
  );
  expect(afterStores.contentSlices).toBe(beforeStores.contentSlices);
  expect(afterStores.resumePoints).toBe(beforeStores.resumePoints);
  expect(afterStores.xpTransactions).toBe(beforeStores.xpTransactions);
  expect(afterStores.achievementUnlocks).toBe(beforeStores.achievementUnlocks);
  expect(afterStores.backups).toBe(beforeStores.backups);
});

test('rejects invalid manual input and writes nothing for discard or reload-mid-session', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-06-12T09:00:00.000Z') });

  await completeOnboarding(page);
  await page.goto('/sessions?itemId=week-0-lecture');

  const beforeStores = await readSessionStores(page);

  await page.locator('#manual-session-duration').fill('0');
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(
    page.getByText('Enter a whole number of minutes between 1 and 720.'),
  ).toBeVisible();

  await page.locator('#manual-session-duration').fill('9999');
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(
    page.getByText('Enter a whole number of minutes between 1 and 720.'),
  ).toBeVisible();

  await page.locator('#manual-session-duration').fill('25');
  await page.locator('#manual-session-mode').selectOption('');
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(
    page.getByText('Choose a session mode before saving.'),
  ).toBeVisible();

  await page.locator('#live-session-mode').selectOption('watching');
  await page.getByRole('button', { name: 'Start live session' }).click();
  await page.clock.runFor('00:20');
  await page.getByRole('button', { name: 'Discard' }).click();
  await page.getByRole('button', { name: 'Discard session' }).click();

  await expect(page.getByText('Session discarded')).toBeVisible();

  await page.locator('#live-session-mode').selectOption('watching');
  await page.getByRole('button', { name: 'Start live session' }).click();
  await page.clock.runFor('01:10');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Start live session' }),
  ).toBeVisible();

  const afterStores = await readSessionStores(page);

  expect(afterStores.studySessions).toEqual(beforeStores.studySessions);
  expect(afterStores.progressEntries).toBe(beforeStores.progressEntries);
  expect(afterStores.mediaProgressEvents).toBe(
    beforeStores.mediaProgressEvents,
  );
  expect(afterStores.contentSlices).toBe(beforeStores.contentSlices);
  expect(afterStores.resumePoints).toBe(beforeStores.resumePoints);
  expect(afterStores.xpTransactions).toBe(beforeStores.xpTransactions);
  expect(afterStores.achievementUnlocks).toBe(beforeStores.achievementUnlocks);
  expect(afterStores.backups).toBe(beforeStores.backups);
});
