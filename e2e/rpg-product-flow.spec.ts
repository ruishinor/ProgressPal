import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

async function readRpgRewardStores(page: Page) {
  return (await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');

      request.onerror = () => reject(new Error('Failed to open IndexedDB.'));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          ['progress_entries', 'xp_transactions', 'achievement_unlocks'],
          'readonly',
        );
        const progressRequest = transaction.objectStore('progress_entries').getAll();
        const xpRequest = transaction.objectStore('xp_transactions').getAll();
        const unlockRequest = transaction.objectStore('achievement_unlocks').getAll();

        transaction.oncomplete = () => {
          resolve({
            progressEntries: progressRequest.result,
            xpTransactions: xpRequest.result,
            achievementUnlocks: unlockRequest.result,
          });
          database.close();
        };
        transaction.onerror = () => {
          database.close();
          reject(new Error('Failed to read RPG reward stores.'));
        };
      };
    });
  `)) as {
    achievementUnlocks: Array<Record<string, unknown>>;
    progressEntries: Array<Record<string, unknown>>;
    xpTransactions: Array<Record<string, unknown>>;
  };
}

test('explicit RPG progress save updates rewards, HUD, and next real quest', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await completeOnboarding(page);
  await page.goto('/rpg/resource/week-0-lecture');

  await expect(
    page.getByRole('heading', { exact: true, name: 'Lecture 0: Scratch' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Open official CS50x resource' }),
  ).toHaveAttribute('target', '_blank');

  await page.getByRole('button', { name: 'Mark locally complete' }).click();

  const feedback = page.locator('.rpg-study-resource__save-result');

  await expect(
    feedback.getByRole('heading', { name: 'Progress saved' }),
  ).toBeVisible();
  await expect(feedback.getByText('Local status: Completed')).toBeVisible();
  await expect(feedback.getByText('XP awarded: 40')).toBeVisible();
  await expect(
    feedback.getByText('Achievement unlocked: First Step'),
  ).toBeVisible();
  await expect(feedback.getByText('Level 1 progress')).toBeVisible();

  const nextQuestLink = feedback.getByRole('link', {
    name: 'Continue quest: Problem Set 0: Scratch',
  });

  await expect(nextQuestLink).toHaveAttribute(
    'href',
    '/rpg/resource/week-0-problem-set',
  );

  const heroHud = page.getByRole('region', { name: 'Persistent hero HUD' });

  await expect(heroHud.getByText(/^40 XP total/)).toBeVisible();
  await expect(heroHud.getByText('Problem Set 0: Scratch')).toBeVisible();

  const stores = await readRpgRewardStores(page);

  expect(stores.progressEntries).toContainEqual(
    expect.objectContaining({
      itemId: 'week-0-lecture',
      status: 'completed',
    }),
  );
  expect(stores.xpTransactions).toContainEqual(
    expect.objectContaining({
      sourceType: 'lecture_completed',
      xp: 40,
    }),
  );
  expect(stores.achievementUnlocks).toContainEqual(
    expect.objectContaining({ achievementId: 'first-step' }),
  );

  await nextQuestLink.click();
  await expect(
    page.getByRole('heading', {
      exact: true,
      name: 'Problem Set 0: Scratch',
    }),
  ).toBeVisible();

  await page.goto('/rpg/badges');
  const firstStep = page.getByTestId('achievement-first-step');

  await expect(firstStep.getByText('Earned', { exact: true })).toBeVisible();
  await expect(firstStep.getByText(/^Earned 2026-/)).toBeVisible();
  await expect(firstStep.getByText('0 XP')).toHaveCount(0);

  await page.goto('/rpg/log');
  await expect(
    page.getByRole('heading', { name: 'Achievement timeline' }),
  ).toBeVisible();
  await expect(page.getByRole('row', { name: /First Step/ })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'View achievements' }),
  ).toHaveAttribute('href', '/rpg/badges');

  await page.goto('/rpg');
  await expect(
    page.getByRole('heading', { name: 'Problem Set 0: Scratch' }),
  ).toBeVisible();

  await page.goto('/rpg/map');
  const currentWeek = page.getByTestId('rpg-module-week-0');

  await expect(currentWeek.getByText('Current module')).toBeVisible();
  await expect(currentWeek.getByText('In progress')).toBeVisible();
});
