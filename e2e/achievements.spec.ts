import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

async function getAchievementUnlocks(
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
        const transaction = database.transaction(['achievement_unlocks'], 'readonly');
        const store = transaction.objectStore('achievement_unlocks');
        const getRequest = store.getAll();

        transaction.oncomplete = () => {
          resolve(getRequest.result);
          database.close();
        };

        transaction.onerror = () => {
          database.close();
          reject(new Error('Failed to read achievement_unlocks.'));
        };
      };
    });
  `)) as Record<string, unknown>[];
}

test.describe('Achievement engine E2E tests', () => {
  test('unlocks an achievement on an explicit save, lists it, and does not duplicate it on reload', async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-06-12T08:00:00.000Z') });
    await completeOnboarding(page);

    // No unlocks exist before any qualifying save.
    await page.goto('/achievements');
    await expect(
      page.getByRole('heading', { name: 'Achievements', exact: true }),
    ).toBeVisible();
    expect(await getAchievementUnlocks(page)).toHaveLength(0);
    await expect(
      page.getByTestId('achievement-first-step').getByText('Locked'),
    ).toBeVisible();

    // Complete a course item via the explicit progress-save flow.
    await page.goto('/course/week-0-problem-set');
    await expect(
      page.getByRole('heading', { name: 'Problem Set 0' }),
    ).toBeVisible();
    await page.getByLabel('Progress').selectOption('completed');
    await page.getByText('More details').click();
    await page.getByLabel('How sure are you?').selectOption('5');
    await page.getByRole('button', { name: 'Save progress' }).click();
    await expect(page.locator('.toast__title').first()).toBeVisible();

    // The unlock is persisted exactly once and shows on the achievements page.
    await expect
      .poll(async () => (await getAchievementUnlocks(page)).length)
      .toBe(1);
    const unlocks = await getAchievementUnlocks(page);
    expect(unlocks[0]).toMatchObject({ achievementId: 'first-step' });

    await page.goto('/achievements');
    await expect(
      page
        .getByTestId('achievement-first-step')
        .getByText('Unlocked', { exact: true }),
    ).toBeVisible();

    // Reloading the page (a passive read) must not duplicate the unlock.
    await page.reload();
    await expect(
      page
        .getByTestId('achievement-first-step')
        .getByText('Unlocked', { exact: true }),
    ).toBeVisible();
    expect(await getAchievementUnlocks(page)).toHaveLength(1);
  });
});
