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
  await expect(page.locator('main').getByText('Du har øvd 1 dag.')).toHaveCount(
    0,
  );
  await page.waitForFunction('navigator.serviceWorker.controller !== null');
  await context.setOffline(true);
  await page.reload();
  await page.setViewportSize({ width: 320, height: 800 });
  const entry = page.locator('a[href="/rpg/guild"]');
  await entry.focus();
  await expect(entry).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/rpg\/guild$/);
  await expect(entry).toHaveAttribute('aria-current', 'page');
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('tabpanel').getByText('Du har øvd 1 dag.', { exact: false }),
  ).toBeVisible();
  await tabs.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel').getByRole('status')).toBeVisible();
  await expect(page.getByRole('tabpanel').getByRole('button')).toHaveCount(0);
  await page.keyboard.press('End');
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(tabs.first()).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.last()).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('tabpanel')).toBeFocused();
  expect(
    await page.evaluate('document.documentElement.scrollWidth <= innerWidth'),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include('main').analyze()).violations,
  ).toEqual([]);

  await page.goto('/rpg/laeringslaget?bookmark=1#week');
  await expect(page).toHaveURL(/\/rpg\/guild\?bookmark=1#week$/);
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');

  await page.goto('/dashboard');
  await expect(
    page.getByText('Du har øvd 1 dag.', { exact: false }),
  ).toBeVisible();
  await page.locator('a[href="/guild"]').click();
  await expect(page).toHaveURL(/\/guild$/);
  // Scoped like the RPG tab panel above: the personal week's loading status
  // can briefly coexist with the Guild card's offline notice.
  const guildCard = page
    .locator('.card')
    .filter({ has: page.getByRole('heading', { name: 'Guild', level: 2 }) });
  await expect(guildCard.getByRole('status')).toBeVisible();
  await page.goto('/laeringslaget?bookmark=1#week');
  await expect(page).toHaveURL(/\/guild\?bookmark=1#week$/);
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Guild', level: 1 }),
  ).toBeVisible();
});
