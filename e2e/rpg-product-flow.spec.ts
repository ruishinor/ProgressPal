import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

test('RPG settings save the one app-wide theme and keep the deliberate interface switch', async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.goto('/rpg/settings');
  const storesBefore = await readRpgRewardStores(page);

  await expect(page.getByRole('heading', { name: 'Interface' })).toBeVisible();
  await expect(
    page.getByText(
      'RPG interface is active. ProgressPal also includes the Classic interface. Both use the same local progress and data; only the layout and navigation change.',
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Applies to both the Classic and RPG interfaces. System follows your device. Light and dark stay local to this app.',
    ),
  ).toBeVisible();

  await page.getByLabel('Display name').fill('Morgan');
  await page.getByLabel('Theme', { exact: true }).selectOption('light');
  await page.getByRole('button', { name: 'Save local settings' }).click();
  await expect(
    page.getByText('Local profile saved', { exact: true }),
  ).toBeVisible();

  const hud = page.getByRole('region', { name: 'Persistent hero HUD' });
  await expect(hud.locator('.rpg-hero-hud__name')).toHaveText('Morgan');
  await page
    .getByRole('navigation', { name: 'RPG primary navigation' })
    .getByRole('link', { name: 'Hero', exact: true })
    .click();
  await expect(
    page.locator('.rpg-identity--profile .rpg-identity__name'),
  ).toHaveText('Morgan');
  await expect(page.locator('.rpg-identity__name')).toHaveCount(1);
  await expect(hud).toHaveCount(0);
  expect(await readRpgRewardStores(page)).toEqual(storesBefore);

  await page.getByRole('link', { name: 'Open Settings' }).click();
  await expect(page.getByLabel('Display name')).toHaveValue('Morgan');
  expect(await readRpgRewardStores(page)).toEqual(storesBefore);

  await page.getByRole('link', { name: 'Open Classic interface' }).click();
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await readRpgRewardStores(page)).toEqual(storesBefore);

  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Open RPG interface' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Home', exact: true }),
  ).toBeVisible();
  expect(await readRpgRewardStores(page)).toEqual(storesBefore);
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
  await expect(hud.getByText('10 / 100 XP to Level 2')).toBeVisible();
  await expect(
    feedback.getByRole('link', { name: 'Start quest: Lecture 0: Scratch' }),
  ).toHaveAttribute('href', '/rpg/resource/week-0-lecture');
  let saved = await readRpgRewardStores(page);
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

  await page.getByText('Review saved sessions (1)', { exact: true }).click();
  const correctionButton = page.getByRole('button', {
    name: 'Correct session',
    exact: true,
  });
  await correctionButton.click();
  await page.getByLabel('Correct task').selectOption('week-4-problem-set');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Save assignment' }).click();
  await expect(
    page.getByText(
      'Session assignment corrected. Time and earned rewards are unchanged.',
    ),
  ).toBeVisible();
  await expect(correctionButton).toBeFocused();
  const corrected = await readRpgRewardStores(page);
  expect(corrected.studySessions[0]).toEqual({
    ...saved.studySessions[0],
    itemId: 'week-4-problem-set',
    unitId: 'week-4',
    updatedAt: expect.any(String),
  });
  expect(corrected.xpTransactions).toEqual(
    saved.xpTransactions.map((tx) => ({
      ...tx,
      reason: 'Logged 25+ minute study session for: Problem Set 4: Memory',
    })),
  );
  expect(corrected.achievementUnlocks).toEqual(saved.achievementUnlocks);
  saved = corrected;
  await page.getByRole('link', { name: 'Hero', exact: true }).click();
  await expect(page.locator('.rpg-hero')).toContainText('25 min');
  await page.goto('/rpg/badges');
  await expect(
    page
      .getByTestId('achievement-bug-hunter')
      .getByText('Earned', { exact: true }),
  ).toBeVisible();
  await page.goto('/rpg/log');
  await page.getByText('Study mode breakdown', { exact: true }).click();
  await page.getByText('Achievement timeline', { exact: true }).click();
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
    page.locator('.rpg-study-resource__header .rpg-quest-reward'),
  ).toHaveText('Up to 40 XP remaining for this task');
  await expect(page.locator('.rpg-hero-hud .rpg-quest-reward')).toHaveCount(0);

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
    page.locator('.rpg-study-resource__header .rpg-quest-reward'),
  ).toHaveText('Task XP earned');
  await expect(
    feedback.getByText('Achievement unlocked: First Step'),
  ).toBeVisible();
  await expect(feedback.getByText('Level 1 progress')).toBeVisible();

  const nextQuestLink = feedback.getByRole('link', {
    name: 'Start quest: Problem Set 0: Scratch',
  });

  await expect(nextQuestLink).toHaveAttribute(
    'href',
    '/rpg/resource/week-0-problem-set',
  );

  const heroHud = page.getByRole('region', { name: 'Persistent hero HUD' });

  await expect(heroHud.getByText('40 / 100 XP to Level 2')).toBeVisible();
  await expect(
    feedback.getByRole('link', {
      name: 'Start quest: Problem Set 0: Scratch',
    }),
  ).toBeVisible();

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
  await page.getByText('Achievement timeline', { exact: true }).click();
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

test('deliberate backward status correction preserves earned rewards and supports keyboard disclosure', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await completeOnboarding(page);
  await page.goto('/rpg/resource/week-0-lecture');
  await page.getByRole('button', { name: 'Mark locally complete' }).click();
  await expect(page.getByText('Local status: Completed')).toBeVisible();
  const before = await readRpgRewardStores(page);
  await page.getByRole('button', { name: 'Correct saved status' }).click();
  await expect(page.getByRole('note')).toContainText(
    'XP and achievements already earned are not removed.',
  );
  await page
    .getByRole('combobox', { name: /^Progress/ })
    .selectOption('blocked');
  const info = page.getByRole('button', { name: 'What does Blocked mean?' });
  await info.focus();
  await page.keyboard.press('Enter');
  await expect(info).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText(/Blocked means you started/)).toBeVisible();
  await page.keyboard.press('Space');
  await expect(info).toHaveAttribute('aria-expanded', 'false');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Save status correction' }).click();
  await expect(page.getByText('Local status: Blocked')).toBeVisible();
  const corrected = await readRpgRewardStores(page);
  expect(corrected.xpTransactions).toEqual(before.xpTransactions);
  expect(corrected.achievementUnlocks).toEqual(before.achievementUnlocks);
  await expect(
    page.locator('.rpg-study-resource__header .rpg-quest-reward'),
  ).toHaveText('Task XP earned');
  await page.getByRole('button', { name: 'Mark locally complete' }).click();
  await expect(page.getByText('Local status: Completed')).toBeVisible();
  expect((await readRpgRewardStores(page)).xpTransactions).toEqual(
    before.xpTransactions,
  );
  await page.goto('/rpg/log');
  await expect(page.locator('.insights-disclosure[open]')).toHaveCount(1);
  const effort = page
    .locator('summary')
    .filter({ hasText: 'Effort over time' });
  await effort.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.insights-disclosure[open]')).toHaveCount(2);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
