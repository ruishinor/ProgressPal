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
  let failNextRead = false;
  let releaseFailedRead!: () => void;
  const failedRead = new Promise<void>((resolve) => {
    releaseFailedRead = resolve;
  });
  let staleMembership = false;
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
    if (operation === 'read' && failNextRead) {
      failNextRead = false;
      await failedRead;
      return route.fulfill({
        status: 503,
        json: { errors: [{ message: 'Unavailable' }] },
        headers: { 'access-control-allow-origin': '*' },
      });
    }
    const name = (variables.input as { name?: string }).name;
    const invalidRename = operation === 'rename' && !name;
    if (operation === 'rename' && name) group.name = name;
    if (operation === 'share' && !staleMembership) group.members[0].days = 1;
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
                status:
                  operation === 'share' && staleMembership
                    ? 'membership-changed'
                    : invalidCode
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
  const refresh = panel.getByRole('button', { name: 'Oppdater Guild' });
  const share = panel.getByRole('button', { name: 'Del ukens læringsdager' });
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
  await expect(share).toHaveCount(0);
  await tabs.last().click();
  await tabs.nth(1).click();
  expect(commands).toEqual([]);

  await expect(tabs.nth(1)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(panel).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(refresh).toBeFocused();
  expect(
    await refresh.evaluate((button) => getComputedStyle(button).outlineStyle),
  ).toBe('solid');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Øvelaget' })).toBeFocused();
  await expect(guildLink).toHaveText(group.name);
  const ranking = panel
    .getByRole('list', { name: 'Ukas rangering' })
    .getByRole('listitem');
  await expect(panel.getByRole('list')).toHaveCount(1);
  await expect(ranking).toHaveText(['1. Bo 1 dag', '2. Ada (deg) 0 dager']);
  expect((await ranking.nth(1).boundingBox())!.y).toBeGreaterThan(
    (await ranking.first().boundingBox())!.y,
  );
  const progress = panel.getByRole('progressbar', { name: 'Felles ukemål' });
  await expect(progress).toHaveAttribute('aria-valuenow', '1');
  await expect(progress).toHaveAttribute('aria-valuemax', '4');
  await capture('guild');
  const refreshTarget = (await refresh.boundingBox())!;
  expect(refreshTarget.width).toBeGreaterThanOrEqual(44);
  expect(refreshTarget.height).toBeGreaterThanOrEqual(44);
  await expect(refresh).toHaveText('');
  expect(
    (await new AxeBuilder({ page }).include('.rpg-guild').analyze()).violations,
  ).toEqual([]);
  await expect(share).toHaveCount(0);
  await tabs.last().click();
  await expect(share).toHaveCount(0);
  await tabs.first().click();
  expect(commands.map(({ operation }) => operation)).toEqual(['read']);
  await share.click();
  await expect(share).toBeEnabled();
  await expect(panel.getByRole('status')).toContainText(/\S/);
  await capture('min-uke-deling');
  await tabs.nth(1).click();
  await expect(ranking).toHaveText(['1. Ada (deg) 1 dag', '1. Bo 1 dag']);
  await expect(progress).toHaveAttribute('aria-valuenow', '2');
  await expect(panel.getByText('2 / 4 læringsdager')).toBeVisible();
  expect(commands).toEqual([
    { operation: 'read', input: {} },
    { operation: 'share', input: { days: [weekStart], membership } },
  ]);
  failNextRead = true;
  await refresh.focus();
  await page.keyboard.press('Enter');
  await expect(refresh).toBeDisabled();
  await expect(refresh).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => commands.length).toBe(3);
  releaseFailedRead();
  await expect(refresh).toBeEnabled();
  await expect(panel.getByRole('status')).toContainText(/Kunne ikke bekrefte/);
  await expect(ranking).toHaveCount(2);
  await expect(guildLink).toHaveText(group.name);
  await refresh.click();
  await expect(refresh).toBeEnabled();
  await expect(panel.getByRole('status')).toBeEmpty();
  expect(commands.slice(2)).toEqual([
    { operation: 'read', input: {} },
    { operation: 'read', input: {} },
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
  const renamed = 'Kodeverkstedets utholdende problemløsere';
  await field.fill(renamed);
  await capture('guild-navneendring');
  expect(
    (await new AxeBuilder({ page }).include('.rpg-guild').analyze()).violations,
  ).toEqual([]);
  await field.press('Enter');
  await expect(gear).toBeFocused();
  await expect(field).toBeHidden();
  const guildName = panel.getByRole('heading', { name: renamed });
  await expect(guildName).toBeVisible();
  const headingLayout = await guildName.evaluate((heading) => {
    const name = heading.firstChild!;
    const range = document.createRange();
    const title = heading.getBoundingClientRect();
    const header = heading.closest('.learning-group__heading')!;
    const actions = header.querySelectorAll(
      '.learning-group__refresh, .learning-group__gear',
    );
    return {
      width: title.width,
      headerWidth: header.getBoundingClientRect().width,
      belowActions: Array.from(actions).every(
        (action) => action.getBoundingClientRect().bottom <= title.top,
      ),
      wordLines: Array.from(name.textContent!.matchAll(/\S+/g), (word) => {
        range.setStart(name, word.index);
        range.setEnd(name, word.index + word[0].length);
        return range.getClientRects().length;
      }),
    };
  });
  expect(headingLayout.width).toBe(headingLayout.headerWidth);
  expect(headingLayout.belowActions).toBe(true);
  expect(headingLayout.wordLines.every((lines) => lines === 1)).toBe(true);
  await capture('guild-langt-navn');
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
  await expect(share).toHaveCount(0);
  await expect(panel.getByRole('status')).toHaveCount(0);
  await context.setOffline(false);
  await expect(guildLink).toHaveText(renamed);
  expect(commands.at(-1)?.operation).toBe('rename');
  group.members[1].days = 5;
  await tabs.last().click();
  await panel.getByRole('button', { name: 'Hent medlemskap' }).click();
  await tabs.nth(1).click();
  await expect(progress).toHaveAttribute('aria-valuenow', '4');
  await expect(progress).toHaveAttribute('aria-valuemax', '4');
  await expect(panel.getByText('6 / 4 læringsdager')).toBeVisible();
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
  await expect(
    panel.getByRole('button', { name: 'Bli med', exact: true }),
  ).toBeEnabled();
  await expect(panel.getByRole('status')).toContainText(/\S/);
  await expect(code).toHaveValue(invalidInvite);
  await panel.getByRole('button', { name: 'Opprett en Guild' }).click();
  await expect(panel.getByLabel('Guild-navn')).toHaveValue('Code Knights');
  await panel.getByLabel('Guild-navn').fill(group.name);
  await panel.getByRole('button', { name: 'Opprett Guild' }).click();
  await tabs.first().click();
  await expect(share).toBeEnabled();
  await tabs.last().click();
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
  await tabs.first().click();
  await expect(share).toBeEnabled();
  expect(commands.map(({ operation }) => operation)).toEqual([
    'read',
    'share',
    'read',
    'read',
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
  await refresh.click();
  await expect(guildLink).toHaveText(renamed);
  holdNextRead = true;
  await refresh.click();
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
  await expect(refresh).toBeVisible();
  expect(commands).toHaveLength(explicitCommands);
  group.name = 'Andre kontoens Guild';
  await refresh.click();
  await expect(guildLink).toHaveText(group.name);

  await page.goto('/laeringslaget');
  const classic = page.locator('main .learning-group');
  await classic.getByRole('button', { name: 'Oppdater Guild' }).click();
  const classicShare = classic.getByRole('button', {
    name: 'Del ukens læringsdager',
  });
  await classicShare.click();
  await expect(classicShare).toBeEnabled();
  expect(commands.slice(-2)).toEqual([
    { operation: 'read', input: {} },
    { operation: 'share', input: { days: [weekStart], membership } },
  ]);
  staleMembership = true;
  await classicShare.click();
  await expect(classicShare).toHaveCount(0);
  await expect(classic.getByRole('list')).toHaveCount(0);
  await expect(classic.getByRole('status')).toContainText(
    /Medlemskapet har endret seg/,
  );
});
