/// <reference lib="dom" />
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import approved from '../tests/fixtures/activity-achievements-approved.json' with { type: 'json' };
import { completeOnboarding } from './support/onboarding';

test('approved Activity awards: actual save, repeat, combination, persistence, Classic and offline artwork', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await completeOnboarding(page);
  await page.goto('/rpg/badges');
  const first = page.getByTestId('achievement-activity-hello-overworld');
  await expect(first).toHaveAttribute('data-unlocked', 'false');
  await page.goto('/rpg/movement');
  await page.getByLabel('Amount', { exact: true }).fill('10');
  await page
    .getByRole('button', { name: 'Save activity', exact: true })
    .click();
  const reward = page.getByTestId('reward-notice-region');
  const narrative = page.getByTestId('activity-narrative-panel');
  await expect(narrative).toContainText('Hello, Overworld!');
  await expect(narrative).toContainText(approved.achievements[0].fiction);
  await expect(reward).toBeEmpty();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(narrative).toHaveCSS('animation-name', 'none');
  await page.setViewportSize({ width: 320, height: 580 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(narrative).toBeVisible();
  await expect(
    page.locator('.activity-page').getByTestId('activity-narrative-panel'),
  ).toBeVisible();
  await expect(narrative).toHaveCSS('position', 'static');
  await expect(narrative).toHaveAttribute('role', 'group');
  const settingsTab = page.getByRole('tab', { name: 'Settings', exact: true });
  await settingsTab.click();
  await expect(settingsTab).toHaveAttribute('aria-selected', 'true');
  await expect(narrative).toContainText(approved.achievements[0].fiction);
  await page.getByRole('tab', { name: 'Today', exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({
    path: 'artifacts/activity-achievements/unlock-desktop-dark.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Dismiss stories' }).click();
  await expect(narrative).toHaveCount(0);
  await page.getByLabel('Amount', { exact: true }).fill('1');
  await page
    .getByRole('button', { name: 'Save activity', exact: true })
    .click();
  await expect(page.locator('.activity-feedback')).toHaveText(
    'Activity saved.',
  );
  await expect(reward).toBeEmpty();
  await page
    .getByLabel('Activity type', { exact: true })
    .selectOption('walking');
  await page.getByLabel('Measurement', { exact: true }).selectOption('metres');
  await page.getByLabel('Amount', { exact: true }).fill('1');
  await page
    .getByRole('button', { name: 'Save activity', exact: true })
    .click();
  await expect(narrative).toContainText('Merge Quest');
  await page
    .getByRole('link', { name: 'Explore Activity achievements' })
    .click();
  await expect(
    page.getByTestId('achievement-activity-merge-quest'),
  ).toHaveAttribute('data-unlocked', 'true');
  await expect(first).toHaveAttribute('data-unlocked', 'true');
  await expect(
    first.getByText(approved.achievements[0].fiction, { exact: true }),
  ).toBeVisible();
  for (const row of approved.achievements) {
    const card = page.getByTestId(`achievement-${row.id}`);
    await expect(card).toContainText(row.name);
    await expect(card).toContainText(row.description);
    const img = card.locator('img');
    await expect(img).toHaveAttribute('alt', '');
    await expect(img).toHaveJSProperty('naturalWidth', 256);
  }
  await page.reload();
  await expect(first).toHaveAttribute('data-unlocked', 'true');
  await expect(reward).toBeEmpty();
  await expect(narrative).toHaveCount(0);
  await page.goto('/achievements');
  await expect(first).toHaveAttribute('data-unlocked', 'true');
  await expect(first.locator('img')).toHaveCount(0);
  await page.goto('/rpg/badges');
  await page.evaluate('navigator.serviceWorker.ready');
  await page.reload();
  await page.waitForFunction('navigator.serviceWorker.controller !== null');
  await context.setOffline(true);
  await page.reload();
  await expect(first).toHaveAttribute('data-unlocked', 'true');
  for (const row of approved.achievements)
    await expect(
      page.getByTestId(`achievement-${row.id}`).locator('img'),
    ).toHaveJSProperty('naturalWidth', 256);
  // The moved existing First Step must remain available offline too.
  await expect(
    page.getByTestId('achievement-first-step').locator('img'),
  ).toHaveJSProperty('naturalWidth', 192);
  await page.goto('/rpg/movement');
  await page.getByLabel('Amount', { exact: true }).fill('1');
  await page
    .getByRole('button', { name: 'Save activity', exact: true })
    .click();
  await expect(page.locator('.activity-feedback')).toHaveText(
    'Activity saved.',
  );
  await expect(reward).toBeEmpty();
  await context.setOffline(false);
  await page.goto('/course');
  await expect(
    page.getByRole('heading', { name: 'Course Map', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('Activity gallery: 320/390/desktop, both themes, enlarged text, native art, keyboard and axe', async ({
  page,
}) => {
  await completeOnboarding(page, { theme: 'light' });
  await page.goto('/rpg/badges');
  await expect(
    page.getByTestId('achievement-activity-long-term-support'),
  ).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      `document.documentElement.setAttribute('data-theme','${theme}')`,
    );
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const size of ['100%', '200%']) {
        await page.evaluate(
          `document.documentElement.style.fontSize='${size}'`,
        );
        expect(
          await page.evaluate(
            'document.documentElement.scrollWidth <= innerWidth',
          ),
        ).toBe(true);
        if (width === 320 && size === '200%')
          await page.screenshot({
            path: `artifacts/activity-achievements/gallery-${theme}-320-enlarged.png`,
            fullPage: true,
          });
      }
      await page.evaluate("document.documentElement.style.fontSize='100%'");
      await page.screenshot({
        path: `artifacts/activity-achievements/gallery-${theme}-${width}.png`,
        fullPage: true,
      });
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
  const card = page.getByTestId('achievement-activity-hello-overworld');
  const summary = card.locator('summary');
  await summary.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(summary).toBeFocused();
  await expect(summary).not.toHaveCSS('outline-style', 'none');
  await page.keyboard.press('Enter');
  await expect(
    card.getByText(approved.achievements[0].fiction, { exact: true }),
  ).toBeVisible();
  await expect(card.locator('img')).toHaveCSS('width', '80px');
  await page.screenshot({
    path: 'artifacts/activity-achievements/gallery-reward-detail.png',
    fullPage: true,
  });
});
