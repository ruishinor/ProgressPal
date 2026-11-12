import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

const revisionStorageKey = 'progresspal:coordination:revision';

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

test('recovers from corrupt coordination revision metadata through the repair control', async ({
  page,
}) => {
  const consoleIssues: string[] = [];
  collectConsoleIssues(page, consoleIssues);
  await completeOnboarding(page);

  await page.evaluate((key) => {
    localStorage.setItem(key, 'garbage');
  }, revisionStorageKey);
  await page.reload();

  await expect(
    page.getByRole('heading', { name: 'Local startup failed' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Retry local data load' }),
  ).toBeDisabled();

  await page.getByRole('button', { name: 'Repair local tab safety' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Repair local tab safety' }),
  ).toHaveCount(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), revisionStorageKey),
  ).toBe('0');

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByLabel('Display name')).toHaveValue('Alex');
  await page.getByLabel('Display name').fill('Recovered learner');
  await page.getByRole('button', { name: 'Save local settings' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Local profile saved' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Display name')).toHaveValue(
    'Recovered learner',
  );
  expect(consoleIssues).toEqual([]);
});

test('refuses repair while a second tab is open and repairs after it closes', async ({
  context,
  page,
}) => {
  const consoleIssues: string[] = [];
  collectConsoleIssues(page, consoleIssues);
  await completeOnboarding(page);

  await page.evaluate((key) => {
    localStorage.setItem(key, 'garbage');
  }, revisionStorageKey);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Local startup failed' }),
  ).toBeVisible();

  const peer = await context.newPage();
  collectConsoleIssues(peer, consoleIssues);
  await peer.goto('/dashboard');
  await expect(
    peer.getByRole('heading', { name: 'Local startup failed' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Repair local tab safety' }).click();
  const startupError = page.getByRole('heading', {
    name: 'Local startup failed',
  });
  await expect(
    page.getByRole('alert').filter({ hasNot: startupError }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Retry local data load' }),
  ).toBeDisabled();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), revisionStorageKey),
  ).toBe('garbage');

  await peer.close();

  await page.getByRole('button', { name: 'Repair local tab safety' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), revisionStorageKey),
  ).toBe('0');
  expect(consoleIssues).toEqual([]);
});
