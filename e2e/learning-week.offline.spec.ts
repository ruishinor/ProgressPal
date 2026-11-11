import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

test.use({ timezoneId: 'America/Los_Angeles', colorScheme: 'dark' });

test('shows a saved Oslo learning day after reload and in both shells offline', async ({
  page,
  context,
}) => {
  await page.clock.setFixedTime(new Date('2026-03-30T00:30:00+02:00'));
  await completeOnboarding(page);
  await page.goto('/sessions?itemId=week-0-lecture');
  await page.locator('#manual-session-duration').fill('1');
  await page.locator('#manual-session-mode').selectOption('watching');
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(page.getByText('Session saved', { exact: true })).toBeVisible();

  await page.goto('/rpg');
  await expect(
    page.getByText('Du har øvd 1 dag.', { exact: false }),
  ).toBeVisible();
  await page.waitForFunction('navigator.serviceWorker.controller !== null');
  await context.setOffline(true);
  await page.reload();
  await page.setViewportSize({ width: 320, height: 800 });
  const entry = page.getByRole('link', { name: 'Læringslaget' });
  await entry.focus();
  await expect(entry).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/rpg\/laeringslaget$/);
  await expect(
    page.getByRole('heading', { name: 'Læringslaget' }),
  ).toBeVisible();
  await expect(page.getByText(/Koble til nettet for å se laget/)).toBeVisible();
  await expect(
    page.getByText('Du har øvd 1 dag.', { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate('document.documentElement.scrollWidth <= innerWidth'),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include('main').analyze()).violations,
  ).toEqual([]);

  await page.goto('/dashboard');
  await expect(
    page.getByText('Du har øvd 1 dag.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Læringslaget' }).click();
  await expect(page).toHaveURL(/\/laeringslaget$/);
  await expect(page.getByText(/Koble til nettet for å se laget/)).toBeVisible();
});
