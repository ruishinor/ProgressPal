import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';
import {
  graphqlHost,
  installSimulatedProvider,
} from './support/simulatedProvider';

// Runs only in a build with VITE_PROGRESSPAL_GUILD_COMMONS=true (its own
// Playwright project). The provider is SIMULATED: this proves the client
// against the contract in infra/nhost/social, not the installed provider.
const membership = 'ab4d2826-20ad-4ee9-80ef-6bf725e82999';
const peer = 'bb4d2826-20ad-4ee9-80ef-6bf725e82999';
type Note = {
  id: string;
  kind: string;
  body: string;
  author: string;
  createdAt: string;
  own: boolean;
  canRemove: boolean;
};

function simulatedGuild(weekStart: string) {
  const commands: { fn: string; operation: string; input: unknown }[] = [];
  const state = {
    isAdmin: true,
    ethos: '',
    about: '',
    focus: '',
    notes: [
      {
        id: 'ca4d2826-20ad-4ee9-80ef-6bf725e82999',
        kind: 'offer',
        body: 'Jeg kan hjelpe med løkker.',
        author: 'Bo',
        createdAt: weekStart + 'T08:00:00Z',
        own: false,
        canRemove: true,
      },
    ] as Note[],
  };
  const board = () => ({
    ethos: state.ethos,
    about: state.about,
    isAdmin: state.isAdmin,
    members: [
      { nickname: 'Ada', membership, self: true },
      { nickname: 'Bo', membership: peer, self: false },
    ],
    notes: state.notes.map((note) => ({
      ...note,
      canRemove: note.own || state.isAdmin,
    })),
  });
  return {
    commands,
    state,
    async install(page: Page) {
      await page.route(graphqlHost + '/**', async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') return route.fallback();
        const { query, variables } = request.postDataJSON() as {
          query: string;
          variables: { operation: string; input: Record<string, string> };
        };
        const headers = { 'access-control-allow-origin': '*' };
        expect(request.headers()['authorization']).toMatch(/^Bearer /);
        const { operation, input } = variables;
        if (query.includes('social_week')) {
          commands.push({ fn: 'social_week', operation, input });
          return route.fulfill({
            headers,
            json: {
              data: {
                social_week: [
                  {
                    result: {
                      status: 'ok',
                      weekStart,
                      invite: null,
                      group: {
                        membership,
                        name: 'Øvelaget',
                        hasInvite: false,
                        canInvite: state.isAdmin,
                        canCreateInvite: state.isAdmin,
                        members: [
                          { nickname: 'Ada', self: true, days: 0 },
                          { nickname: 'Bo', self: false, days: 1 },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          });
        }
        if (!query.includes('guild_commons_v1')) return route.fallback();
        commands.push({ fn: 'guild_commons_v1', operation, input });
        expect(input.membership).toBe(membership);
        if (operation === 'post')
          state.notes.push({
            id: 'aa4d2826-20ad-4ee9-80ef-6bf725e82999',
            kind: input.kind,
            body: input.body,
            author: 'Ada',
            createdAt: weekStart + 'T11:00:00Z',
            own: true,
            canRemove: true,
          });
        if (operation === 'remove')
          state.notes = state.notes.filter((note) => note.id !== input.note);
        if (operation === 'transfer') state.isAdmin = false;
        if (operation === 'focus') state.focus = input.text;
        return route.fulfill({
          headers,
          json: {
            data: {
              guild_commons_v1: [
                {
                  result: {
                    status: 'ok',
                    group: board(),
                    focus: { text: state.focus, weekStart },
                  },
                },
              ],
            },
          },
        });
      });
    },
  };
}

async function fitsWidth(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  expect(
    await page.evaluate('document.documentElement.scrollWidth <= innerWidth'),
  ).toBe(true);
}

async function axe(page: Page, selector: string) {
  expect(
    (await new AxeBuilder({ page }).include(selector).analyze()).violations,
  ).toEqual([]);
}

async function signIn(page: Page, account: Locator) {
  await account.getByRole('button', { name: 'Turn on cloud services' }).click();
  await account.getByLabel('Email').fill('learner@example.com');
  await account.getByLabel('Password').fill('a-synthetic-password');
  await account.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    account.getByRole('button', { name: 'Back up now' }),
  ).toBeVisible();
}

test('Guild Commons opens only on request and works by keyboard in RPG and Classic (simulated provider)', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const weekStart = '2026-03-30';
  await page.clock.setFixedTime(new Date(weekStart + 'T12:00:00Z'));
  await installSimulatedProvider(page);
  const guild = simulatedGuild(weekStart);
  await guild.install(page);
  const commonsCalls = () =>
    guild.commands.filter(({ fn }) => fn === 'guild_commons_v1');

  await completeOnboarding(page, { theme: 'light' });
  await page.goto('/rpg/settings');
  await signIn(page, page.locator('#cloud-account'));
  await page.goto('/rpg/guild');
  const panel = page.getByRole('tabpanel');
  await page.getByRole('tab').nth(1).click();
  await panel.getByRole('button', { name: 'Oppdater Guild' }).click();
  const open = panel.getByRole('button', { name: 'Åpne Guild-fellesrom' });
  await expect(open).toBeVisible();
  expect(commonsCalls()).toEqual([]);

  // Keyboard only from here: open, write and share a note.
  await open.focus();
  await page.keyboard.press('Enter');
  const commons = panel.getByRole('region', { name: 'Guild-fellesrom' });
  const notes = commons.getByRole('region', { name: 'Guild-oppslag' });
  await expect(notes.getByRole('listitem')).toHaveCount(1);
  expect(commonsCalls().map(({ operation }) => operation)).toEqual(['read']);
  await expect(notes.getByRole('listitem').locator('time')).toHaveAttribute(
    'datetime',
    weekStart + 'T08:00:00Z',
  );

  await notes.getByText('Skriv et oppslag').focus();
  await page.keyboard.press('Enter');
  await notes.getByLabel('Type oppslag').selectOption('help');
  const body = notes.getByRole('textbox', { name: 'Beskjed' });
  await body.focus();
  // Native maxlength counts UTF-16 units: 200 emoji are capped at 140, which
  // stays within the server's 280 code points.
  await page.keyboard.insertText('🚀'.repeat(200));
  const typed = await body.inputValue();
  expect(typed.length).toBe(280);
  expect([...typed].length).toBe(140);
  await notes.getByRole('button', { name: 'Del oppslag' }).focus();
  await page.keyboard.press('Enter');
  await expect(
    commons.getByRole('heading', { name: 'Guild-fellesrom' }),
  ).toBeFocused();
  expect(commonsCalls().at(-1)).toEqual({
    fn: 'guild_commons_v1',
    operation: 'post',
    input: { membership, kind: 'help', body: typed },
  });
  await expect(notes.getByRole('listitem')).toHaveCount(2);
  await expect(commons.getByRole('status')).not.toBeEmpty();

  // The administrator sets the week's focus by keyboard; Enter submits.
  const focusSection = commons.getByRole('region', { name: 'Ukens fokus' });
  await focusSection.locator('summary').focus();
  await page.keyboard.press('Enter');
  await focusSection.getByRole('textbox', { name: 'Fokus for uken' }).focus();
  await page.keyboard.insertText('Rekursjon og løkker');
  await page.keyboard.press('Enter');
  await expect(
    commons.getByRole('heading', { name: 'Guild-fellesrom' }),
  ).toBeFocused();
  expect(commonsCalls().at(-1)).toEqual({
    fn: 'guild_commons_v1',
    operation: 'focus',
    input: { membership, text: 'Rekursjon og løkker' },
  });
  await expect(focusSection).toContainText('Rekursjon og løkker');
  await focusSection.locator('summary').click();
  await expect(
    focusSection.getByRole('button', { name: 'Fjern fokus' }),
  ).toBeVisible();

  for (const width of [320, 640, 1280]) await fitsWidth(page, width);
  await axe(page, '.rpg-guild');

  // Handover asks once more, then the Guild is re-read for the new roles.
  await commons.getByText('Overfør administratorrollen').click();
  await commons.getByRole('button', { name: 'Gå videre' }).click();
  expect(commonsCalls().at(-1)?.operation).toBe('focus');
  await commons
    .getByRole('button', { name: 'Ja, overfør administratorrollen' })
    .click();
  await expect(commons.getByText('Overfør administratorrollen')).toHaveCount(0);
  expect(commonsCalls().at(-1)).toMatchObject({
    operation: 'transfer',
    input: { target: peer },
  });
  await expect
    .poll(() => guild.commands.at(-1))
    .toMatchObject({ fn: 'social_week', operation: 'read' });
  await expect(
    notes.getByRole('button', { name: 'Fjern', exact: true }),
  ).toHaveCount(1);

  // Classic: the same closed entry point; nothing is read until opened.
  const before = commonsCalls().length;
  await page.goto('/guild');
  const classic = page.locator('main .learning-group');
  await classic.getByRole('button', { name: 'Oppdater Guild' }).click();
  await classic.getByRole('button', { name: 'Åpne Guild-fellesrom' }).click();
  await expect(
    classic
      .getByRole('region', { name: 'Guild-oppslag' })
      .getByRole('listitem'),
  ).toHaveCount(2);
  expect(commonsCalls()).toHaveLength(before + 1);
  for (const width of [320, 640]) await fitsWidth(page, width);
  await axe(page, 'main .learning-group');

  // Signing out drops the private board; signing in again does not re-read it.
  await page.goto('/settings');
  const account = page.locator('#cloud-account');
  await account.getByRole('button', { name: 'Sign out' }).click();
  await expect(account.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await page.goto('/guild');
  await expect(
    page.getByRole('region', { name: 'Guild-fellesrom' }),
  ).toHaveCount(0);
  await page.goto('/settings');
  await account.getByLabel('Email').fill('learner@example.com');
  await account.getByLabel('Password').fill('a-synthetic-password');
  await account.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    account.getByRole('button', { name: 'Back up now' }),
  ).toBeVisible();
  await page.goto('/guild');
  await classic.getByRole('button', { name: 'Oppdater Guild' }).click();
  await expect(
    classic.getByRole('button', { name: 'Åpne Guild-fellesrom' }),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Guild-oppslag' })).toHaveCount(
    0,
  );
  expect(commonsCalls()).toHaveLength(before + 1);
});
