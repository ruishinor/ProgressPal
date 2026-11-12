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
  let releaseStaleRead!: () => void;
  const staleRead = new Promise<void>((resolve) => {
    releaseStaleRead = resolve;
  });
  let finishStaleRead!: () => void;
  const staleReadHandled = new Promise<void>((resolve) => {
    finishStaleRead = resolve;
  });
  let holdNextRead = false;
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
    const name = (variables.input as { name?: string }).name;
    const invalidRename = operation === 'rename' && !name;
    if (operation === 'rename' && name) group.name = name;
    if (operation === 'share') group.members[0].days = 1;
    if (operation === 'invite') group.hasInvite = true;
    if (operation === 'revoke') group.hasInvite = false;
    if (operation === 'leave') enrolled = false;
    if (operation === 'create' || operation === 'join') enrolled = true;
    const invalidCode =
      operation === 'join' &&
      (variables.input as { code: string }).code !== invite;
    if (invalidCode) enrolled = false;
    if (operation === 'join' && !invalidCode) group.canInvite = false;
    const snapshot = enrolled ? structuredClone(group) : null;
    const held = operation === 'read' && holdNextRead;
    if (held) {
      holdNextRead = false;
      await staleRead;
    }
    await route.fulfill({
      json: {
        data: {
          social_week: [
            {
              result: {
                status: invalidCode
                  ? 'invalid-code'
                  : invalidRename
                    ? 'invalid-input'
                    : 'ok',
                weekStart,
                group: snapshot,
                invite: operation === 'invite' ? invite : null,
              },
            },
          ],
        },
      },
      headers: { 'access-control-allow-origin': '*' },
    });
    if (held) finishStaleRead();
  });

  await completeOnboarding(page, { theme: 'light' });
  await page.goto('/sessions?itemId=week-0-lecture');
  await page.locator('#manual-session-duration').fill('1');
  await page.locator('#manual-session-mode').selectOption('watching');
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(page.getByText('Session saved', { exact: true })).toBeVisible();

  await page.goto('/rpg');
  const hud = page.getByRole('region', { name: 'Persistent hero HUD' });
  const guildLink = hud.locator('a[href="/rpg/laeringslaget"]');
  await expect(guildLink).toHaveAccessibleName(/\S/);
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await hud.screenshot({
      path: testInfo.outputPath(`guild-hud-${width}.png`),
    });
  }
  await guildLink.click();
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
  await expect(guildLink).toHaveText('Code Knights');
  await guildLink.click();
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
      await page.locator('.rpg-guild').screenshot({
        path: testInfo.outputPath(`${surface}-${width}.png`),
      });
    }
  };
  await capture('min-uke');
  await tabs.last().click();
  await tabs.nth(1).click();
  expect(commands).toEqual([]);

  await panel.getByRole('button', { name: 'Hent Guild' }).click();
  await expect(page.getByRole('heading', { name: 'Øvelaget' })).toBeFocused();
  await expect(guildLink).toHaveText(group.name);
  const members = panel
    .getByRole('list', { name: 'Medlemmer' })
    .getByRole('listitem');
  await expect(members).toHaveText(['Ada (deg)', 'Bo']);
  expect((await members.nth(1).boundingBox())!.y).toBeGreaterThan(
    (await members.first().boundingBox())!.y,
  );
  const ranking = panel
    .getByRole('list', { name: 'Ukas rangering' })
    .getByRole('listitem');
  await expect(ranking.first()).toHaveText('1. Bo 1 dag');
  const progress = panel.getByRole('progressbar', { name: 'Felles mål' });
  await expect(progress).toHaveAttribute('aria-valuenow', '1');
  await expect(progress).toHaveAttribute('aria-valuemax', '4');
  await capture('guild');
  await tabs.last().click();
  expect(commands.map(({ operation }) => operation)).toEqual(['read']);
  await panel.getByRole('button', { name: 'Del ukens læringsdager' }).click();
  await expect(panel.getByRole('status')).toContainText(/\S/);
  await tabs.nth(1).click();
  await expect(ranking).toHaveText(['1. Ada (deg) 1 dag', '1. Bo 1 dag']);
  await expect(progress).toHaveAttribute('aria-valuenow', '2');
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
    (await new AxeBuilder({ page }).include('.rpg-guild').analyze()).violations,
  ).toEqual([]);
  await panel.getByRole('button', { name: 'Deaktiver koden' }).click();
  await expect(panel.getByRole('textbox')).toHaveCount(0);
  await tabs.nth(1).click();
  const gear = panel.getByLabel('Endre Guild-navn');
  const field = panel.getByLabel('Guild-navn', { exact: true });
  const saveName = panel.getByRole('button', { name: 'Lagre navn' });
  await gear.focus();
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue(group.name);
  const target = (await gear.boundingBox())!;
  const card = (await panel.locator('.learning-group').boundingBox())!;
  expect(target.width).toBeGreaterThanOrEqual(44);
  expect(target.height).toBeGreaterThanOrEqual(44);
  expect(target.x).toBeGreaterThan(card.x + card.width / 2);
  await field.fill('Kast dette utkastet');
  await panel.getByRole('button', { name: 'Avbryt' }).click();
  await expect(gear).toBeFocused();
  expect(commands.at(-1)?.operation).toBe('revoke');
  await page.keyboard.press('Space');
  await expect(field).toHaveValue(group.name);
  await field.fill('   ');
  await saveName.click();
  await expect(panel.getByRole('status')).toContainText(/Guild-navn/);
  await expect(guildLink).toHaveText(group.name);
  const renamed = 'Øvingsguild' + 'Kode'.repeat(7);
  await field.fill(renamed);
  await capture('guild-navneendring');
  expect(
    (await new AxeBuilder({ page }).include('.rpg-guild').analyze()).violations,
  ).toEqual([]);
  await field.press('Enter');
  await expect(gear).toBeFocused();
  await expect(field).toBeHidden();
  await expect(panel.getByRole('heading', { name: renamed })).toBeVisible();
  await expect(guildLink).toHaveText(renamed);
  expect(commands.at(-1)).toEqual({
    operation: 'rename',
    input: { membership, name: renamed },
  });

  await context.setOffline(true);
  await expect(panel.getByRole('status')).toBeVisible();
  await expect(page.getByRole('heading', { name: renamed })).toHaveCount(0);
  await expect(guildLink).toHaveText('Code Knights');
  await tabs.first().click();
  await expect(
    page.getByText('Du har øvd 1 dag.', { exact: false }),
  ).toBeVisible();
  await context.setOffline(false);
  await expect(guildLink).toHaveText(renamed);
  expect(commands.at(-1)?.operation).toBe('rename');
  group.members[1].days = 5;
  await tabs.last().click();
  await panel.getByRole('button', { name: 'Hent Guild' }).click();
  await tabs.nth(1).click();
  await expect(progress).toHaveAttribute('aria-valuenow', '4');
  await expect(progress).toHaveAttribute('aria-valuemax', '4');
  await expect(panel.getByText(/6 av 4 læringsdager delt/)).toBeVisible();
  expect(
    await progress.evaluate(
      (track) =>
        track.firstElementChild!.getBoundingClientRect().width /
        track.clientWidth,
    ),
  ).toBeCloseTo(1, 2);
  await tabs.last().click();
  await panel.getByText('Medlemskap og konto').click();
  await panel
    .getByRole('button', { name: 'Forlat Guilden', exact: true })
    .click();
  expect(commands.at(-1)?.operation).toBe('read');
  await panel.getByRole('button', { name: 'Avbryt' }).click();
  await panel
    .getByRole('button', { name: 'Forlat Guilden', exact: true })
    .click();
  await panel.getByRole('button', { name: 'Ja, forlat Guilden' }).click();
  const nickname = panel.getByLabel('Kallenavn');
  await expect(nickname).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Ukas rangering' }),
  ).toHaveCount(0);
  await panel.getByRole('button', { name: 'Bli med i en Guild' }).click();
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
  await panel.getByRole('button', { name: 'Opprett en Guild' }).click();
  await expect(panel.getByLabel('Guild-navn')).toHaveValue('Code Knights');
  await panel.getByLabel('Guild-navn').fill(group.name);
  await panel.getByRole('button', { name: 'Opprett Guild' }).click();
  await expect(
    panel.getByRole('button', { name: 'Del ukens læringsdager' }),
  ).toBeEnabled();
  await panel.getByText('Medlemskap og konto').click();
  await panel
    .getByRole('button', { name: 'Forlat Guilden', exact: true })
    .click();
  await panel.getByRole('button', { name: 'Ja, forlat Guilden' }).click();
  await expect(nickname).toBeVisible();
  await panel.getByRole('button', { name: 'Bli med i en Guild' }).click();
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
    'rename',
    'rename',
    'read',
    'leave',
    'join',
    'create',
    'leave',
    'join',
  ]);
  await tabs.nth(1).click();
  await expect(panel.getByRole('heading', { name: group.name })).toBeVisible();
  await expect(gear).toHaveCount(0);
  await page.reload();
  await expect(guildLink).toHaveText('Code Knights');
  expect(commands.at(-1)?.operation).toBe('join');
  await tabs.nth(1).click();
  await panel.getByRole('button', { name: 'Hent Guild' }).click();
  await expect(guildLink).toHaveText(renamed);
  holdNextRead = true;
  await panel.getByRole('button', { name: 'Oppdater Guild' }).click();
  await expect.poll(() => holdNextRead).toBe(false);
  await hud.getByRole('link', { name: 'Open Settings' }).click();
  await account.getByRole('button', { name: 'Sign out' }).click();
  await expect(account.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(guildLink).toHaveText('Code Knights');
  await guildLink.click();
  await tabs.nth(1).click();
  await expect(panel.getByRole('heading', { name: group.name })).toHaveCount(0);
  await expect(
    panel.locator('a[href="/rpg/settings#cloud-account"]'),
  ).toBeVisible();
  await expect(guildLink).toHaveText('Code Knights');
  expect(commands.at(-1)?.operation).toBe('read');
  expect(provider.calls.map(({ path }) => path)).toEqual([
    '/v1/signin/email-password',
    '/v1/signout',
  ]);
  await panel.getByRole('link', { name: 'Åpne kontoinnstillinger' }).click();
  await account.getByLabel('Email').fill('other-learner@example.com');
  await account.getByLabel('Password').fill('a-synthetic-password');
  await account.getByRole('button', { name: 'Sign in' }).click();
  await expect(account.getByText('other-learner@example.com')).toBeVisible();
  const explicitCommands = commands.length;
  releaseStaleRead();
  await staleReadHandled;
  await expect(guildLink).toHaveText('Code Knights');
  await guildLink.click();
  await tabs.nth(1).click();
  await expect(panel.getByRole('button', { name: 'Hent Guild' })).toBeVisible();
  expect(commands).toHaveLength(explicitCommands);
  group.name = 'Andre kontoens Guild';
  await panel.getByRole('button', { name: 'Hent Guild' }).click();
  await expect(guildLink).toHaveText(group.name);
});
