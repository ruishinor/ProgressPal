import { expect, test } from '@playwright/test';
import { completeOnboarding } from './support/onboarding';
import { pathwayState } from './support/pathways';

test('opens a previously unread Git lesson and records an answer after a cold offline page load', async ({
  page,
  context,
}) => {
  await completeOnboarding(page, { programme: 'Programvareutvikling' });
  const before = await pathwayState(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.close();
  const offlinePage = await context.newPage();
  await offlinePage.goto('/rpg/pathways/git-github/git-m01-o04');
  await expect(
    offlinePage.getByRole('heading', {
      level: 1,
      name: 'Velg innholdet i neste commit',
    }),
  ).toBeVisible();
  const card = offlinePage.getByRole('group', { name: /^Oppgave 1 · / });
  await card
    .getByRole('radio', { name: 'Starttid 10, uten den nye kartlinjen.' })
    .check();
  await card.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(card.getByRole('status', { name: 'Resultat' })).toContainText(
    'Svaret passer',
  );
  await offlinePage.reload();
  await expect(
    offlinePage
      .getByRole('group', { name: /^Oppgave 1 · / })
      .getByRole('status', { name: 'Resultat' }),
  ).toContainText('Svaret passer');
  expect((await pathwayState(offlinePage)).appMeta).toEqual(before.appMeta);
  // Also exercise an unread M05 lesson on the same cold-offline journey.
  await offlinePage.goto('/rpg/pathways/git-github/git-m05-o01');
  await expect(
    offlinePage.getByRole('heading', {
      level: 1,
      name: 'Fra behov til et samarbeid om endring',
    }),
  ).toBeVisible();
  const m05 = offlinePage.getByRole('group', { name: /^Oppgave 1 · / });
  await m05
    .getByRole('radio', {
      name: /At branchen er overført, men review og merge/,
    })
    .check();
  await m05.getByRole('button', { name: 'Sjekk svaret' }).click();
  await expect(m05.getByRole('status', { name: 'Resultat' })).toContainText(
    'Svaret passer',
  );
  await offlinePage.reload();
  await expect(
    offlinePage
      .getByRole('group', { name: /^Oppgave 1 · / })
      .getByRole('status', { name: 'Resultat' }),
  ).toContainText('Svaret passer');
  await offlinePage.getByRole('link', { name: /^Tilbake til/ }).click();
  await expect(offlinePage).toHaveURL(/\/rpg$/);
  await context.setOffline(false);
});
