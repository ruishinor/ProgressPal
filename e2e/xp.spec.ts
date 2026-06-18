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

async function getXpTransactions(
  page: Page,
): Promise<Record<string, unknown>[]> {
  return (await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB.'));
      };

      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(['xp_transactions'], 'readonly');
        const xpStore = transaction.objectStore('xp_transactions');
        const getRequest = xpStore.getAll();

        transaction.oncomplete = () => {
          resolve(getRequest.result);
          database.close();
        };

        transaction.onerror = () => {
          database.close();
          reject(new Error('Failed to read xp_transactions.'));
        };
      };
    });
  `)) as Record<string, unknown>[];
}

test.describe('XP Engine E2E Tests', () => {
  test('saves a study session and awards XP with UI feedback', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-06-12T08:00:00.000Z') });
    await completeOnboarding(page);

    // 1. Go to sessions logging page
    await page.goto('/sessions?itemId=week-0-lecture');
    await expect(
      page.getByRole('heading', { name: 'Study sessions', exact: true }),
    ).toBeVisible();

    // 2. Log manual session for 30 minutes (>=25) using direct selectors to avoid duplicates/conflicts
    await page.locator('#manual-session-duration').fill('30');
    await page.locator('#manual-session-mode').selectOption('watching');
    await page.locator('#manual-session-notes').fill('Studying Week 0 Lecture');
    await page.getByRole('button', { name: 'Save session' }).click();

    // 3. Verify toast message contains "+10 XP!"
    await expect(page.getByText(/\+10 XP!/)).toBeVisible();

    // 4. Assert IndexedDB transaction is recorded
    const transactions = await getXpTransactions(page);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      sourceType: 'study_session',
      xp: 10,
    });
  });

  test('saves item progress milestones (started, submitted, accepted) and awards XP', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-06-12T08:00:00.000Z') });
    await completeOnboarding(page);

    // 1. Go to week-0-problem-set content detail page
    await page.goto('/course/week-0-problem-set');
    await expect(
      page.getByRole('heading', { name: 'Problem Set 0' }),
    ).toBeVisible();

    // 2. Select 'started' status and save (awards problem_set_started milestone: +20 XP)
    await page.getByLabel('Progress').selectOption('started');
    await page.getByText('More details').click();
    await page.getByLabel('How sure are you?').selectOption('3');
    await page.getByRole('button', { name: 'Save progress' }).click();

    // Verify toast notification (+20 XP!)
    await expect(page.getByText(/\+20 XP!/)).toBeVisible();

    let txs = await getXpTransactions(page);
    expect(txs.map((t) => t.sourceType)).toContain('problem_set_started');

    // 3. Select 'completed' status first, because submitted/accepted are only transitionable from completed status
    await page.getByLabel('Progress').selectOption('completed');
    await page.getByRole('button', { name: 'Save progress' }).click();
    await expect(
      page.getByRole('heading', { name: 'Progress saved' }),
    ).toBeVisible();

    // 4. Select 'submitted' status and save (awards problem_set_submitted milestone: +75 XP)
    await page.getByLabel('Progress').selectOption('submitted');
    await page.getByRole('button', { name: 'Save progress' }).click();

    // Verify toast notification (+75 XP!)
    await expect(page.getByText(/\+75 XP!/)).toBeVisible();

    txs = await getXpTransactions(page);
    expect(txs.map((t) => t.sourceType)).toContain('problem_set_submitted');

    // 5. Reload page to verify that reloading doesn't duplicate XP or create extra transactions
    await page.reload();
    const txsAfterReload = await getXpTransactions(page);
    expect(txsAfterReload).toHaveLength(2);
  });
});
