import { expect, type Page } from '@playwright/test';

/**
 * Drives the first-run onboarding screen through the "Customize first" path,
 * filling the detailed profile form and landing on the RPG Hub. Shared by the
 * E2E specs so the form-fill flow stays consistent after UX-06 collapsed the
 * detailed form behind the quick-start choices. `options.theme` selects the
 * PreferredTheme picked in the form; it defaults to 'dark' so every existing
 * caller keeps its current behavior ('light' is also a valid PreferredTheme).
 * A fresh learner explicitly chooses the starting programme first (owner
 * decision 2026-10-03); `options.programme` defaults to CS50x, so every
 * existing caller keeps its current behavior.
 */
export async function completeOnboarding(
  page: Page,
  options: {
    theme?: 'dark' | 'light';
    programme?: 'CS50x' | 'Programvareutvikling';
  } = {},
) {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Start with ProgressPal' }),
  ).toBeVisible();

  await page
    .getByRole('radiogroup', { name: 'Choose your programme' })
    .getByRole('radio', { name: new RegExp(options.programme ?? 'CS50x') })
    .check();
  await page.getByRole('button', { name: 'Customize first' }).click();

  await expect(
    page.getByRole('heading', { name: 'Create your local learner profile' }),
  ).toBeVisible();

  await page.getByLabel('Display name').fill('Alex');
  await page.getByLabel('Target minutes per week').fill('360');
  await page.getByLabel('Theme').selectOption(options.theme ?? 'dark');
  await page.getByLabel('Reduce motion in this app').check();
  await page.getByRole('button', { name: 'Save and continue' }).click();

  await expect(
    page.getByRole('heading', { name: 'RPG Hub', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/rpg$/);
  // Existing engine regressions exercise Tracker after checking the RPG default.
  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible();
}
