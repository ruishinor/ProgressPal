import { expect, test } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';
import {
  graphqlHost,
  installSimulatedProvider,
} from './support/simulatedProvider';

test('group UI shares only dates on demand and hides a private board when offline (simulated transport)', async ({
  page,
  context,
}) => {
  const weekStart = '2026-03-30';
  await page.clock.setFixedTime(new Date(weekStart + 'T12:00:00Z'));
  const provider = await installSimulatedProvider(page);
  const commands: { operation: string; input: unknown }[] = [];
  const membership = 'ab4d2826-20ad-4ee9-80ef-6bf725e82999';
  const group = {
    membership,
    name: 'Øvelaget',
    hasInvite: false,
    canInvite: true,
    members: [
      { nickname: 'Ada', self: true, days: 0 },
      { nickname: 'Bo', self: false, days: 1 },
    ],
  };

  await page.route(graphqlHost + '/**', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') return route.fallback();
    const { query, variables } = request.postDataJSON() as {
      query: string;
      variables: (typeof commands)[number];
    };
    if (!query.includes('social_week')) return route.fallback();
    commands.push(variables);
    expect(request.headers()['authorization']).toMatch(/^Bearer /);
    const operation = variables.operation;
    if (operation === 'share') group.members[0].days = 1;
    await route.fulfill({
      json: {
        data: {
          social_week: [
            {
              result: {
                status: 'ok',
                weekStart,
                group: operation === 'leave' ? null : group,
                invite: null,
              },
            },
          ],
        },
      },
      headers: { 'access-control-allow-origin': '*' },
    });
  });

  await completeOnboarding(page, { theme: 'light' });
  await page.goto('/sessions?itemId=week-0-lecture');
  await page.locator('#manual-session-duration').fill('1');
  await page.locator('#manual-session-mode').selectOption('watching');
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(page.getByText('Session saved', { exact: true })).toBeVisible();

  await page.goto('/rpg/laeringslaget');
  await page.getByRole('link', { name: 'Åpne kontoinnstillinger' }).click();
  const account = page.locator('#cloud-account');
  await expect(account).toBeFocused();
  await account.getByRole('button', { name: 'Turn on cloud services' }).click();
  await account.getByLabel('Email').fill('learner@example.com');
  await account.getByLabel('Password').fill('a-synthetic-password');
  await account.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    account.getByRole('button', { name: 'Back up now' }),
  ).toBeVisible();
  await page.goto('/rpg/laeringslaget');
  expect(commands).toEqual([]);

  await page.getByRole('button', { name: 'Hent laget' }).click();
  await expect(page.getByRole('heading', { name: 'Øvelaget' })).toBeFocused();
  await expect(page.getByText('1. Bo · 1 dag', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Del ukens læringsdager' }).click();
  await expect(
    page.getByText('1. Ada (deg) · 1 dag', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('2 av 4 læringsdager delt.', { exact: false }),
  ).toBeVisible();
  expect(commands).toEqual([
    { operation: 'read', input: {} },
    { operation: 'share', input: { days: [weekStart], membership } },
  ]);

  await context.setOffline(true);
  await expect(page.getByText(/Koble til nettet for å se laget/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Øvelaget' })).toHaveCount(0);
  await expect(
    page.getByText('Du har øvd 1 dag.', { exact: false }),
  ).toBeVisible();
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Hent laget' }).click();
  await page.getByText('Medlemskap og konto').click();
  await page.getByRole('button', { name: 'Forlat laget', exact: true }).click();
  await page.getByRole('button', { name: 'Ja, forlat laget' }).click();
  await expect(page.getByText('Du har forlatt laget.')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Ukas rangering' }),
  ).toHaveCount(0);
  expect(commands.map(({ operation }) => operation)).toEqual([
    'read',
    'share',
    'read',
    'leave',
  ]);
  expect(provider.calls.every(({ path }) => path.includes('/signin/'))).toBe(
    true,
  );
});
