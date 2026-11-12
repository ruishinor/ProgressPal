import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';
import {
  graphqlHost,
  installSimulatedProvider,
} from './support/simulatedProvider';

test('group UI shares only dates on demand and hides a private board when offline (simulated transport)', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(60_000);
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
  let enrolled = true;
  const invite = 'abcd1234'.repeat(8);

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
    if (operation === 'invite') group.hasInvite = true;
    if (operation === 'revoke') group.hasInvite = false;
    if (operation === 'leave') enrolled = false;
    if (operation === 'create' || operation === 'join') enrolled = true;
    const invalidCode =
      operation === 'join' &&
      (variables.input as { code: string }).code !== invite;
    if (invalidCode) enrolled = false;
    await route.fulfill({
      json: {
        data: {
          social_week: [
            {
              result: {
                status: invalidCode ? 'invalid-code' : 'ok',
                weekStart,
                group: enrolled ? group : null,
                invite: operation === 'invite' ? invite : null,
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

  await page.goto('/rpg');
  const hud = page.getByRole('region', { name: 'Persistent hero HUD' });
  const teamLink = hud.locator('a[href="/rpg/laeringslaget"]');
  await expect(teamLink).toHaveAccessibleName(/\S/);
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await hud.screenshot({
      path: testInfo.outputPath(`team-hud-${width}.png`),
    });
  }
  await teamLink.click();
  const tabs = page.getByRole('tab');
  const panel = page.getByRole('tabpanel');
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await tabs.nth(1).click();
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
  await teamLink.click();
  await expect(
    panel.getByText('Du har øvd 1 dag.', { exact: false }),
  ).toBeVisible();
  const capture = async (surface: string) => {
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          'document.documentElement.scrollWidth <= innerWidth',
        ),
      ).toBe(true);
      await page.locator('.rpg-team').screenshot({
        path: testInfo.outputPath(`${surface}-${width}.png`),
      });
    }
  };
  await capture('min-uke');
  await tabs.last().click();
  await tabs.nth(1).click();
  expect(commands).toEqual([]);

  await panel.getByRole('button', { name: 'Hent laget' }).click();
  await expect(page.getByRole('heading', { name: 'Øvelaget' })).toBeFocused();
  await expect(panel.getByText('1. Bo · 1 dag', { exact: true })).toBeVisible();
  await capture('team');
  await tabs.last().click();
  expect(commands.map(({ operation }) => operation)).toEqual(['read']);
  await panel.getByRole('button', { name: 'Del ukens læringsdager' }).click();
  await expect(panel.getByRole('status')).toContainText(/\S/);
  await tabs.nth(1).click();
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
  await tabs.last().click();
  await panel.getByRole('button', { name: 'Lag invitasjonskode' }).click();
  await expect(panel.getByRole('textbox')).toHaveValue(invite);
  await capture('administrasjon');
  expect(
    (await new AxeBuilder({ page }).include('.rpg-team').analyze()).violations,
  ).toEqual([]);
  await panel.getByRole('button', { name: 'Deaktiver koden' }).click();
  await expect(panel.getByRole('textbox')).toHaveCount(0);
  await tabs.nth(1).click();

  await context.setOffline(true);
  await expect(panel.getByRole('status')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Øvelaget' })).toHaveCount(0);
  await tabs.first().click();
  await expect(
    page.getByText('Du har øvd 1 dag.', { exact: false }),
  ).toBeVisible();
  await context.setOffline(false);
  await tabs.last().click();
  await panel.getByRole('button', { name: 'Hent laget' }).click();
  await panel.getByText('Medlemskap og konto').click();
  await panel
    .getByRole('button', { name: 'Forlat laget', exact: true })
    .click();
  expect(commands.at(-1)?.operation).toBe('read');
  await panel.getByRole('button', { name: 'Avbryt' }).click();
  await panel
    .getByRole('button', { name: 'Forlat laget', exact: true })
    .click();
  await panel.getByRole('button', { name: 'Ja, forlat laget' }).click();
  const nickname = panel.getByLabel('Kallenavn');
  await expect(nickname).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Ukas rangering' }),
  ).toHaveCount(0);
  await panel.getByRole('button', { name: 'Bli med i et lag' }).click();
  await nickname.fill('Ada');
  const code = panel.getByLabel('Invitasjonskode');
  const invalidInvite = '0'.repeat(64);
  await code.fill(invalidInvite);
  await tabs.nth(1).click();
  await tabs.last().click();
  await expect(code).toHaveValue(invalidInvite);
  await panel.getByRole('button', { name: 'Bli med', exact: true }).click();
  await expect(panel.locator('[aria-busy]')).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await expect(panel.getByRole('status')).toContainText(/\S/);
  await expect(code).toHaveValue(invalidInvite);
  await panel.getByRole('button', { name: 'Opprett et lag' }).click();
  await panel.getByLabel('Lagnavn').fill(group.name);
  await panel.getByRole('button', { name: 'Opprett laget' }).click();
  await expect(
    panel.getByRole('button', { name: 'Del ukens læringsdager' }),
  ).toBeEnabled();
  await panel.getByText('Medlemskap og konto').click();
  await panel
    .getByRole('button', { name: 'Forlat laget', exact: true })
    .click();
  await panel.getByRole('button', { name: 'Ja, forlat laget' }).click();
  await expect(nickname).toBeVisible();
  await panel.getByRole('button', { name: 'Bli med i et lag' }).click();
  await code.fill(invite);
  await nickname.fill('Ada');
  await panel.getByRole('button', { name: 'Bli med', exact: true }).click();
  await expect(
    panel.getByRole('button', { name: 'Del ukens læringsdager' }),
  ).toBeEnabled();
  expect(commands.map(({ operation }) => operation)).toEqual([
    'read',
    'share',
    'invite',
    'revoke',
    'read',
    'leave',
    'join',
    'create',
    'leave',
    'join',
  ]);
  await tabs.nth(1).click();
  await expect(panel.getByRole('heading', { name: group.name })).toBeVisible();
  await page.goto('/rpg/settings');
  await account.getByRole('button', { name: 'Sign out' }).click();
  await expect(account.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await teamLink.click();
  await tabs.nth(1).click();
  await expect(panel.getByRole('heading', { name: group.name })).toHaveCount(0);
  await expect(
    panel.locator('a[href="/rpg/settings#cloud-account"]'),
  ).toBeVisible();
  expect(commands.at(-1)?.operation).toBe('join');
  expect(provider.calls.map(({ path }) => path)).toEqual([
    '/v1/signin/email-password',
    '/v1/signout',
  ]);
});
