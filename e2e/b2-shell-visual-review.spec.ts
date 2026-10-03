import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

const visualReviewDirectory = path.resolve(
  'artifacts/b2-phase-2-visual-review',
);

async function captureRpgNavigation(page: Page, fileName: string) {
  const navigation = page.getByRole('navigation', {
    name: 'RPG primary navigation',
  });

  await expect(navigation).toBeVisible();
  await navigation.screenshot({
    path: path.join(visualReviewDirectory, fileName),
  });
}

async function captureInterfaceCard(page: Page, fileName: string) {
  const heading = page.getByRole('heading', { name: 'Interface' });

  await expect(heading).toBeVisible();
  await heading
    .locator('..')
    .locator('..')
    .screenshot({
      path: path.join(visualReviewDirectory, fileName),
    });
}

test('captures the B2 shell and interface transition for owner visual review', async ({
  page,
}) => {
  await mkdir(visualReviewDirectory, { recursive: true });
  await completeOnboarding(page);

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto('/rpg');
  await expect(
    page.getByRole('heading', { exact: true, name: 'Home' }),
  ).toBeVisible();
  await captureRpgNavigation(page, '390-rpg-navigation.png');

  await page.goto('/rpg/settings');
  await captureInterfaceCard(page, '390-rpg-settings-interface.png');

  await page.goto('/settings');
  await expect(page.getByLabel('Theme', { exact: true })).toBeVisible();
  await captureInterfaceCard(page, '390-classic-settings-interface.png');

  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto('/rpg');
  await expect(
    page.getByRole('heading', { exact: true, name: 'Home' }),
  ).toBeVisible();
  await captureRpgNavigation(page, '1280-rpg-navigation.png');

  await page.goto('/rpg/settings');
  await captureInterfaceCard(page, '1280-rpg-settings-interface.png');

  await page.goto('/settings');
  await expect(page.getByLabel('Theme', { exact: true })).toBeVisible();
  await captureInterfaceCard(page, '1280-classic-settings-interface.png');
});
