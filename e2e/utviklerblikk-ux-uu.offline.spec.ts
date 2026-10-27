import { expect, test } from '@playwright/test';
import { completeOnboarding } from './support/onboarding';

// A fresh browser context installs the production boot set before going offline.
// No new content endpoint or service-worker policy is involved.
test('new UX/UU category and authored content cold-load offline', async ({
  page,
  context,
}) => {
  await completeOnboarding(page, { programme: 'Programvareutvikling' });
  await page.waitForFunction('navigator.serviceWorker.controller !== null');
  const newPage = await context.newPage();
  await page.close();
  await context.setOffline(true);
  await newPage.goto('/rpg/track/tenk-som-en-utvikler');
  await newPage
    .getByRole('button', { name: /^UX og universell utforming/ })
    .click();
  await expect(
    newPage
      .getByRole('list', { name: 'Velg en aktivitet' })
      .getByRole('button'),
  ).toHaveCount(6);
  await newPage.waitForTimeout(430);
  await newPage
    .getByRole('button', { name: '3. Hvem møter en hindring?' })
    .click();
  await expect(
    newPage.getByRole('heading', { name: 'Lett for hvem?' }),
  ).toBeVisible();
  await newPage.waitForTimeout(430);
  await newPage.getByRole('button', { name: 'Neste', exact: true }).click();
  await newPage
    .getByRole('button', {
      name: 'En tilgjengelighetsbarriere, selv om andre lykkes.',
      exact: true,
    })
    .click();
  await expect(newPage.getByRole('status')).toHaveAttribute(
    'data-state',
    'correct',
  );
});
