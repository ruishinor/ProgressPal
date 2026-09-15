import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

test('RPG settings refresh identity immediately and explain the Classic theme preference', async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto('/rpg/settings');
  const storesBefore = await readRpgRewardStores(page);
  await expect(
    page.getByText(
      'Applies to Classic pages. RPG keeps its dark study theme. System follows your device.',
    ),
  ).toBeVisible();
  await page.getByLabel('Display name').fill('Morgan');
  await page.getByLabel('Classic theme').selectOption('light');
  await page.getByRole('button', { name: 'Save local settings' }).click();
  await expect(
    page.getByText('Local profile saved', { exact: true }),
  ).toBeVisible();
  const hud = page.getByRole('region', { name: 'Persistent hero HUD' });
  await expect(hud.locator('.rpg-hero-hud__name')).toHaveText('Morgan');
  await page
    .getByRole('navigation', { name: 'RPG bottom navigation' })
    .getByRole('link', { name: 'Hero', exact: true })
    .click();
  await expect(
    page.locator('.rpg-identity--profile .rpg-identity__name'),
  ).toHaveText('Morgan');
  await expect(hud.locator('.rpg-hero-hud__name')).toHaveText('Morgan');
  expect(await readRpgRewardStores(page)).toEqual(storesBefore);
  await page
    .getByRole('link', { name: 'Open Classic dashboard', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('RPG Focus saves one timed session and refreshes rewards without completing its task', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-09-15T08:00:00.000Z') });
  await completeOnboarding(page);
  await page.goto('/rpg/resource/week-0-lecture');
  await page
    .getByRole('link', { name: 'Start focus session', exact: true })
    .click();
  const before = await readRpgRewardStores(page);
  await page.locator('#live-session-mode').selectOption('debugging');
  await page.getByRole('button', { name: 'Start live session' }).click();
  await page.clock.fastForward('10:00');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('.sessions-timer__value')).toHaveText('10:00');
  await page.clock.fastForward('02:00');
  await expect(page.locator('.sessions-timer__value')).toHaveText('10:00');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.fastForward('15:00');
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(page.getByText('25 min logged effort')).toBeVisible();
  await page
    .locator('#live-session-notes')
    .fill('Synthetic QA: traced a loop and checked the fix.');
  await page
    .getByRole('button', { name: 'Save study session', exact: true })
    .click();
  const feedback = page.locator('.rpg-focus__save-result');
  await expect(
    feedback.getByRole('heading', { name: 'Session saved' }),
  ).toBeVisible();
  await expect(feedback.getByText('XP awarded: 10')).toBeVisible();
  await expect(
    feedback.getByText('Achievement unlocked: Bug Hunter'),
  ).toBeVisible();
  const hud = page.getByRole('region', { name: 'Persistent hero HUD' });
  await expect(hud.getByText(/^10 XP total/)).toBeVisible();
  await expect(
    hud.getByText('Lecture 0: Scratch', { exact: true }),
  ).toBeVisible();
  const saved = await readRpgRewardStores(page);
  expect(saved.studySessions).toHaveLength(before.studySessions.length + 1);
  expect(saved.studySessions[0]).toMatchObject({
    durationMinutes: 25,
    itemId: 'week-0-lecture',
    mode: 'debugging',
  });
  expect(saved.progressEntries).toEqual(before.progressEntries);
  expect(saved.xpTransactions).toHaveLength(before.xpTransactions.length + 1);
  expect(saved.achievementUnlocks).toHaveLength(
    before.achievementUnlocks.length + 1,
  );
  await page.getByRole('link', { name: 'Hero', exact: true }).click();
  await expect(page.locator('.rpg-hero')).toContainText('25 min');
  await page.goto('/rpg/badges');
  await expect(
    page
      .getByTestId('achievement-bug-hunter')
      .getByText('Earned', { exact: true }),
  ).toBeVisible();
  await page.goto('/rpg/log');
  await expect(page.getByRole('row', { name: /Debugging/ })).toContainText(
    '25',
  );
  await expect(page.getByRole('row', { name: /Bug Hunter/ })).toBeVisible();
  await page.goto('/rpg/focus?itemId=week-0-lecture');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Start live session' }),
  ).toBeVisible();
  expect(await readRpgRewardStores(page)).toEqual(saved);
});

async function readRpgRewardStores(page: Page) {
  return (await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');

      request.onerror = () => reject(new Error('Failed to open IndexedDB.'));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(
          ['progress_entries', 'xp_transactions', 'achievement_unlocks', 'study_sessions'],
          'readonly',
        );
        const progressRequest = transaction.objectStore('progress_entries').getAll();
        const xpRequest = transaction.objectStore('xp_transactions').getAll();
        const unlockRequest = transaction.objectStore('achievement_unlocks').getAll();
        const sessionRequest = transaction.objectStore('study_sessions').getAll();

        transaction.oncomplete = () => {
          resolve({
            progressEntries: progressRequest.result,
            xpTransactions: xpRequest.result,
            achievementUnlocks: unlockRequest.result,
            studySessions: sessionRequest.result,
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
    studySessions: Array<Record<string, unknown>>;
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
  await expect(firstStep.locator('img')).toHaveJSProperty('naturalWidth', 192);

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
