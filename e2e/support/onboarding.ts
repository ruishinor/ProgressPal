import { expect, type Page } from '@playwright/test';

/**
 * Drives the first-run onboarding screen through the "Customize first" path,
 * filling the detailed profile form and landing on the dashboard. Shared by the
 * E2E specs so the form-fill flow stays consistent after UX-06 collapsed the
 * detailed form behind the quick-start choices.
 */
export async function completeOnboarding(page: Page) {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Start tracking CS50 locally' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Customize first' }).click();

  await expect(
    page.getByRole('heading', { name: 'Create your local learner profile' }),
  ).toBeVisible();

  await page.getByLabel('Display name').fill('Alex');
  await page.getByLabel('Target minutes per week').fill('360');
  await page.getByLabel('Face shape').selectOption('square');
  await page.getByLabel('Hair').selectOption('parted');
  await page.getByLabel('Top color').selectOption('ocean');
  await page.getByLabel('Theme').selectOption('dark');
  await page.getByLabel('Reduce motion in this app').check();
  await page.getByRole('button', { name: 'Save and continue' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}
