import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { createSimulatedNhost } from '../tests/infra/simulatedNhostCore.mjs';
import {
  graphqlHost,
  installSimulatedProvider,
} from './support/simulatedProvider';

const email = 'learner@example.test';
const password = 'synthetic-password-9';
type Row = { revision: number; hash: string; payload: string };

function simulatedSync() {
  const shared = createSimulatedNhost({ schemaVersion: 5 });
  const rows = new Map<string, Row>();
  const calls: string[] = [];
  const failures = { nextWrite: false };
  let lastWrite: Row | undefined;
  return {
    calls,
    failures,
    get lastWrite() {
      return lastWrite;
    },
    async install(page: Page, exchangeCode?: string) {
      const auth = await installSimulatedProvider(page, {
        shared,
        exchangeCode,
        accounts: { [email]: password },
      });
      await page.route(graphqlHost + '/**', async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') return route.fallback();
        const { query, variables } = request.postDataJSON() as {
          query: string;
          variables: {
            operation: string;
            input: Partial<Row> & { expectedRevision?: number };
          };
        };
        if (!query.includes('sync_learning_v1')) return route.fallback();
        const bearer = request.headers().authorization;
        expect(bearer).toMatch(/^Bearer /);
        const jwtBody = bearer?.split('.')[1];
        expect(jwtBody).toBeTruthy();
        const { sub } = JSON.parse(
          Buffer.from(jwtBody!, 'base64url').toString(),
        ) as { sub: string };
        const row = rows.get(sub);
        const { operation, input } = variables;
        calls.push(operation);
        let result: unknown;
        if (operation === 'head') {
          expect(input).toEqual({});
          result = {
            status: 'ok',
            revision: row?.revision ?? 0,
            hash: row?.hash ?? null,
          };
        } else if (input.expectedRevision !== (row?.revision ?? 0)) {
          result = { status: 'conflict' };
        } else if (operation === 'read') {
          result = { status: 'ok', ...row };
        } else {
          expect(operation).toBe('write');
          if (failures.nextWrite) {
            failures.nextWrite = false;
            await route.fulfill({
              status: 503,
              json: { errors: [{ message: 'simulated temporary failure' }] },
              headers: { 'access-control-allow-origin': '*' },
            });
            return;
          }
          expect(input.payload).toBeDefined();
          expect(
            createHash('sha256').update(input.payload!).digest('hex'),
          ).toBe(input.hash);
          lastWrite = {
            revision: (row?.revision ?? 0) + 1,
            payload: input.payload!,
            hash: input.hash!,
          };
          rows.set(sub, lastWrite);
          result = {
            status: 'ok',
            revision: lastWrite.revision,
            hash: lastWrite.hash,
          };
        }
        await route.fulfill({
          json: { data: { sync_learning_v1: [{ result }] } },
          headers: { 'access-control-allow-origin': '*' },
        });
      });
      return auth;
    },
  };
}

async function signIn(page: Page, address = email, secret = password) {
  await page.getByLabel('E-post', { exact: true }).fill(address);
  await page.getByLabel('Passord', { exact: true }).fill(secret);
  await page.getByRole('button', { name: 'Logg inn', exact: true }).click();
}

async function chooseProgramme(page: Page) {
  const group = page.getByRole('radiogroup', { name: 'Choose your programme' });
  await expect(group).toBeVisible();
  await expect(group.locator('input:checked')).toHaveCount(0);
  await group.getByRole('radio', { name: /CS50x/ }).check();
  await page.getByRole('button', { name: 'Use default learner' }).click();
}

async function logSession(page: Page, minutes: string) {
  await page.goto('/sessions?itemId=week-0-lecture');
  await page.locator('#manual-session-duration').fill(minutes);
  await page.locator('#manual-session-mode').selectOption('watching');
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(page.getByText('Session saved', { exact: true })).toBeVisible();
}

test('account-first, two-device round trip, offline replay and account isolation', async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  test.setTimeout(110_000);
  const provider = simulatedSync();
  const auth = await provider.install(page);
  const other = await browser.newContext({ baseURL });
  try {
    const second = await other.newPage();
    await provider.install(second);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Velkommen til ProgressPal' }),
    ).toBeVisible();
    await expect(page.getByRole('radiogroup')).toHaveCount(0);
    expect(auth.calls).toHaveLength(0);
    await signIn(page, email, 'incorrect-password');
    await expect(page.getByText('Innloggingen mislyktes')).toBeVisible();
    expect(provider.calls).toEqual([]);
    await page.getByLabel('Forbli innlogget på denne enheten').check();
    await signIn(page);
    await chooseProgramme(page);
    await logSession(page, '13');
    await expect
      .poll(() => provider.lastWrite?.payload.includes('"durationMinutes":13'))
      .toBe(true);
    await expect(page.getByText('Synkronisert', { exact: true })).toBeVisible();
    expect(provider.lastWrite?.payload).not.toContain('"courseItems"');
    expect(provider.lastWrite?.payload).not.toContain('"backups"');

    await second.goto('/sessions');
    await signIn(second);
    await expect(
      second.getByText('13 min', { exact: true }).first(),
    ).toBeVisible();
    await expect(second.getByRole('radiogroup')).toHaveCount(0);
    await logSession(second, '19');
    await expect(
      second.getByText('Synkronisert', { exact: true }),
    ).toBeVisible();
    // No refresh, navigation or focus event on the first device. Its poll
    // downloads the new revision and refreshes the visible session history.
    await expect(page.getByText('19 min', { exact: true }).first()).toBeVisible(
      { timeout: 40_000 },
    );
    await expect(page.getByText('Synkronisert', { exact: true })).toBeVisible();

    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
    );
    await context.setOffline(true);
    await logSession(page, '23');
    await page.reload();
    await expect(
      page.getByText('23 min', { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText(/^Frakoblet\./)).toBeVisible();
    expect(provider.lastWrite?.payload).not.toContain('"durationMinutes":23');
    provider.failures.nextWrite = true;
    await context.setOffline(false);
    await expect(
      page.getByText(/Synkronisering er midlertidig utilgjengelig/),
    ).toBeVisible();
    expect(provider.lastWrite?.payload).not.toContain('"durationMinutes":23');
    await expect
      .poll(
        () => provider.lastWrite?.payload.includes('"durationMinutes":23'),
        { timeout: 15_000 },
      )
      .toBe(true);
    await expect(page.getByText('Synkronisert', { exact: true })).toBeVisible();

    await second.reload();
    await expect(
      second.getByText('23 min', { exact: true }).first(),
    ).toBeVisible();
    await second.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
    );
    await context.setOffline(true);
    await other.setOffline(true);
    await logSession(page, '27');
    await logSession(second, '29');
    await context.setOffline(false);
    await expect
      .poll(() => provider.lastWrite?.payload.includes('"durationMinutes":27'))
      .toBe(true);
    await other.setOffline(false);
    await expect(
      second.getByRole('heading', {
        name: 'Velg hvilke studiedata du vil fortsette med',
      }),
    ).toBeVisible();
    const keepRemote = second.getByRole('button', {
      name: 'Behold dataene fra kontoen',
    });
    await expect(keepRemote).toBeDisabled();
    for (const [name, duration] of [
      ['Last ned fra denne enheten', 29],
      ['Last ned fra kontoen', 27],
    ] as const) {
      const downloaded = second.waitForEvent('download');
      await second.getByRole('button', { name }).click();
      const copy = await downloaded;
      const parsed = JSON.parse(await readFile(await copy.path(), 'utf8')) as {
        data: { studySessions: { durationMinutes: number }[] };
      };
      expect(
        parsed.data.studySessions.some(
          (session) => session.durationMinutes === duration,
        ),
      ).toBe(true);
    }
    await second.getByLabel('Jeg har lagret kopiene jeg trenger').check();
    await keepRemote.click();
    await expect(
      second.getByText('27 min', { exact: true }).first(),
    ).toBeVisible();
    await expect(second.getByText('29 min', { exact: true })).toHaveCount(0);
    await expect(
      second.getByText('Synkronisert', { exact: true }),
    ).toBeVisible();

    await page.goto('/settings?section=data');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Velkommen til ProgressPal' }),
    ).toBeVisible();
    await signIn(page, 'another@example.test');
    await expect(page.getByText(/tilhører en annen konto/)).toBeVisible();
    await expect(page.getByText('23 min', { exact: true })).toHaveCount(0);
  } finally {
    await context.setOffline(false);
    await other.close();
  }
});

test('registration and password recovery use the account welcome and scrub one-time codes', async ({
  page,
}) => {
  test.setTimeout(55_000);
  const code = 'test-code-unique';
  const provider = simulatedSync();
  const auth = await provider.install(page, code);
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('E-post', { exact: true })).toBeFocused();
  await page.addStyleTag({ content: 'html { font-size: 200% !important }' });
  const overflowing = () =>
    page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(await overflowing()).toBe(false);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByLabel('E-post', { exact: true }).fill(email);
  await page.getByLabel('Passord', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Opprett konto' }).click();
  await expect(page.getByText('Sjekk e-posten din')).toBeVisible();
  await page.goto('/cloud/callback?code=' + code);
  await expect(
    page.getByRole('heading', { name: 'E-postadressen er bekreftet' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/cloud\/callback$/);
  expect(
    auth.calls.filter(({ path }) => path.endsWith('/token/exchange')),
  ).toHaveLength(1);
  expect(provider.calls).toEqual([]);
  await page.getByRole('link', { name: 'Fortsett til ProgressPal' }).click();
  await expect(page.getByRole('radiogroup')).toBeVisible();

  // Recovery on a new browser session, with a real SDK exchange against the
  // simulator. The recovery bearer never starts a learning sync session.
  await page.context().clearCookies();
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  await page.setViewportSize({ width: 390, height: 760 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Glemt passord?' }).click();
  await page.getByLabel('E-post', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Send lenke' }).click();
  await expect(page.getByText('Sjekk e-posten din')).toBeVisible();
  const before = provider.calls.length;
  await page.goto('/cloud/callback?code=' + code);
  await page
    .getByLabel('Nytt passord', { exact: true })
    .fill('another-synthetic-9');
  await page.getByLabel('Gjenta passordet').fill('another-synthetic-9');
  await page.getByRole('button', { name: 'Lagre nytt passord' }).click();
  await expect(
    page.getByRole('heading', { name: 'Passordet er endret' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/cloud\/callback$/);
  expect(provider.calls).toHaveLength(before);
  await page.getByRole('link', { name: 'Fortsett til ProgressPal' }).click();
  await expect(
    page.getByRole('heading', { name: 'Velkommen til ProgressPal' }),
  ).toBeVisible();
  await page.addStyleTag({ content: 'html { font-size: 200% !important }' });
  expect(await overflowing()).toBe(false);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze())
      .violations,
  ).toEqual([]);
});
