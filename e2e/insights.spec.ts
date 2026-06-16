import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function completeOnboarding(page: Page) {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Create your local learner profile' }),
  ).toBeVisible();

  await page.getByLabel('Display name').fill('Alex');
  await page.getByLabel('Target minutes per week').fill('360');
  await page.getByLabel('Face shape').selectOption('square');
  await page.getByLabel('Hair').selectOption('parted');
  await page.getByLabel('Top color').selectOption('ocean');
  await page.getByLabel('Theme').selectOption('dark');
  await page.getByLabel('Reduce motion in this app').check();
  await page.getByRole('button', { name: 'Save and open dashboard' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Course progress' }),
  ).toBeVisible();
}

async function readLedgerCounts(page: Page) {
  return (await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB in the browser context.'));
      };

      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          [
            'xp_transactions',
            'study_sessions',
            'achievement_unlocks',
            'media_progress_events',
          ],
          'readonly',
        );
        const xpRequest = transaction.objectStore('xp_transactions').count();
        const sessionsRequest = transaction
          .objectStore('study_sessions')
          .count();
        const unlocksRequest = transaction
          .objectStore('achievement_unlocks')
          .count();
        const mediaRequest = transaction
          .objectStore('media_progress_events')
          .count();

        transaction.oncomplete = () => {
          resolve({
            xpTransactions: xpRequest.result,
            studySessions: sessionsRequest.result,
            achievementUnlocks: unlocksRequest.result,
            mediaProgressEvents: mediaRequest.result,
          });
          database.close();
        };

        transaction.onerror = () => {
          reject(new Error('Failed to read ledger counts from IndexedDB.'));
          database.close();
        };
      };
    });
  `)) as {
    achievementUnlocks: number;
    mediaProgressEvents: number;
    studySessions: number;
    xpTransactions: number;
  };
}

test('renders accessible insights derived from a real saved activity flow', async ({
  page,
}) => {
  const consoleIssues: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleIssues.push(message.text());
    }
  });

  await completeOnboarding(page);

  // One explicit save through the real app: log a watched long-form range. This
  // persists a media event, resume point, started progress, and XP locally. (No
  // blocked item and no unsafe card variant are involved.)
  await page.goto('/course');
  await page
    .getByTestId('course-item-week-0-lecture')
    .getByRole('link', { name: 'Open detail' })
    .click();
  await expect(page).toHaveURL(/\/course\/week-0-lecture$/);
  await page.getByLabel('Logging note').fill('Saved from Playwright.');
  await page.getByRole('button', { name: 'Save watched range' }).click();
  await expect(page.getByText('Last range 0:00-20:00 (20 min)')).toBeVisible();

  // Open insights so it reads the freshly persisted activity.
  await page.goto('/insights');
  await expect(page.getByRole('heading', { name: 'Insights' })).toBeVisible();

  // Every insights section renders from local data (empty sections still show
  // their card heading with a truthful empty state).
  for (const sectionHeading of [
    'Course progress',
    'Effort over time',
    'XP over time',
    'Study mode breakdown',
    'Active days',
    'Recorded completion awards',
    'Achievement timeline',
  ]) {
    await expect(
      page.getByRole('heading', { name: sectionHeading, exact: true }),
    ).toBeVisible();
  }

  // The logged watched range produced a real weekly effort row.
  await expect(
    page.getByRole('columnheader', { name: 'Watched (logged)' }),
  ).toBeVisible();

  // Reload must not change the immutable ledgers Insights reads.
  const beforeReload = await readLedgerCounts(page);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Effort over time' }),
  ).toBeVisible();
  const afterReload = await readLedgerCounts(page);

  expect(afterReload).toEqual(beforeReload);

  // Regression guard: Insights must not use design-system card variants whose
  // hardcoded light backgrounds are not dark-theme safe. axe cannot evaluate
  // their gradient backgrounds, so this guards what axe cannot.
  await expect(
    page.locator('.card--accent, .card--danger, .card--subtle, .state-card'),
  ).toHaveCount(0);

  // The fully loaded insights surface is accessible in dark theme.
  const accessibilityScan = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScan.violations).toEqual([]);
  expect(consoleIssues).toEqual([]);
});
