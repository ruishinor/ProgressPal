import { expect, test } from '@playwright/test';
import { completeOnboarding } from './support/onboarding';

test('opens a previously unread Git lesson and records an answer after a cold offline page load', async ({
  page,
  context,
}) => {
  await completeOnboarding(page, { programme: 'Git & GitHub' });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.close();
  const offlinePage = await context.newPage();
  await offlinePage.goto('/rpg/resource/git-m01-o04');
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
  await context.setOffline(false);
});
