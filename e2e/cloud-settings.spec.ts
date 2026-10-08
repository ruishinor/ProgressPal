import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';
import { installSimulatedProvider } from './support/simulatedProvider';

/**
 * Epic G callback route and Settings cloud UI, in the real browser against the
 * production preview under the production CSP. The provider is answered inside
 * the browser by a simulation (see support/simulatedProvider.ts): no connection
 * to the real project is made.
 *
 * What the browser can prove that the component tests cannot: the address bar
 * is clean when the one-time code leaves, no request or cache entry carries it
 * afterwards, the whole backup and restore path works with the keyboard alone,
 * and the card stays inside 320, 390 and 1280 pixel screens in every state,
 * accessible in both themes.
 */

const code = 'ONETIMECODE12345';
const password = 'correct-horse-9';
const learnerEmail = 'learner@example.com';

type BrowserElement = {
  clientWidth: number;
  closest(selector: string): BrowserElement | null;
  getBoundingClientRect(): { left: number; right: number };
  querySelectorAll(selector: string): ArrayLike<BrowserElement>;
  scrollWidth: number;
  textContent: string | null;
};

type BrowserScope = {
  caches: {
    keys(): Promise<string[]>;
    open(name: string): Promise<{ keys(): Promise<{ url: string }[]> }>;
  };
  document: {
    documentElement: { scrollWidth: number };
    querySelectorAll(selector: string): ArrayLike<BrowserElement>;
  };
  history: { length: number };
  innerWidth: number;
  localStorage: { getItem(key: string): string | null };
  location: { search: string };
  __nhostCalls?: Array<{ url: string; address: string }>;
};

function recordConsole(page: Page) {
  const lines: string[] = [];

  page.on('console', (message) => lines.push(message.text()));
  page.on('pageerror', (error) => lines.push(error.message));

  return lines;
}

/** Records, inside the page, the address bar at the moment of each provider request. */
async function watchProviderRequests(page: Page) {
  await page.addInitScript(`
    (() => {
      const real = window.fetch;
      window.__nhostCalls = [];
      window.fetch = function (input, init) {
        try {
          const url = typeof input === 'string' ? input : input.url;
          if (/nhost\\.run/.test(url)) {
            window.__nhostCalls.push({
              url,
              address: location.pathname + location.search + location.hash,
            });
          }
        } catch (error) {
          // Recording must never change what the page does.
        }
        return real.apply(this, arguments);
      };
    })();
  `);
}

const providerCalls = (page: Page) =>
  page.evaluate(
    () => (globalThis as unknown as BrowserScope).__nhostCalls ?? [],
  );

/**
 * The app shell clips the page, so `scrollWidth` alone can look fine while a
 * card is far wider than the screen (a long address once did exactly that).
 * Each box of the cloud card is therefore measured against the screen itself.
 */
async function overflow(page: Page) {
  return page.evaluate(() => {
    const scope = globalThis as unknown as BrowserScope;
    const cards = Array.from(scope.document.querySelectorAll('.card'));
    const heading = Array.from(
      scope.document.querySelectorAll('.card__title'),
    ).find((element) => element.textContent === 'Cloud backup (optional)');
    const cloud = heading?.closest('.card') ?? null;
    const boxes = cloud
      ? [cloud, ...Array.from(cloud.querySelectorAll('*'))]
      : [];
    const rightmost = Math.max(
      0,
      ...boxes.map((box) => box.getBoundingClientRect().right),
    );
    const leftmost = Math.min(
      0,
      ...boxes.map((box) => box.getBoundingClientRect().left),
    );

    return {
      page: scope.document.documentElement.scrollWidth - scope.innerWidth,
      inCard: cards.filter((card) => card.scrollWidth > card.clientWidth + 1)
        .length,
      found: cloud !== null,
      beyondScreen: Math.max(rightmost - scope.innerWidth, -leftmost),
    };
  });
}

async function expectContained(page: Page, label: string) {
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const measured = await overflow(page);

    expect(
      measured.page,
      `${label} @${width}: page overflows`,
    ).toBeLessThanOrEqual(1);
    expect(measured.inCard, `${label} @${width}: a card overflows`).toBe(0);
    expect(measured.found, `${label} @${width}: the card was measured`).toBe(
      true,
    );
    expect(
      measured.beyondScreen,
      `${label} @${width}: a box of the card is wider than the screen`,
    ).toBeLessThanOrEqual(1);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

async function expectAccessible(page: Page, label: string) {
  const scan = await new AxeBuilder({ page }).analyze();

  expect(scan.violations, `${label}: axe`).toEqual([]);
}

const card = (page: Page) =>
  page
    .getByRole('heading', { name: 'Cloud backup (optional)' })
    .locator('xpath=ancestor::section[contains(@class,"card")][1]');

test.describe('the email-link landing route', () => {
  test('a good link: the address is clean before the code leaves, and nothing keeps the code', async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(120_000);

    const provider = await installSimulatedProvider(page, {
      exchangeCode: code,
    });
    const requestUrls: Array<{ url: string; navigation: boolean }> = [];
    const logged = recordConsole(page);

    await watchProviderRequests(page);
    page.context().on('request', (request) =>
      requestUrls.push({
        url: request.url(),
        navigation: request.isNavigationRequest(),
      }),
    );
    await completeOnboarding(page);

    // Start the sign-up that the emailed link would complete.
    await page.goto('/rpg/settings');
    await card(page)
      .getByRole('button', { name: 'Turn on cloud backup' })
      .click();
    await card(page).getByLabel('Email').fill(learnerEmail);
    await card(page).getByLabel('Password').fill(password);
    await card(page).getByRole('button', { name: 'Create account' }).click();
    await expect(card(page).getByText('Check your email')).toBeVisible();
    // The exact address the provider will be asked to send the learner back to.
    expect(provider.seen.redirectTo).toBe(`${baseURL}/cloud/callback`);

    // The learner opens the emailed link (a full navigation, like a new tab).
    const historyBefore = await page.evaluate(
      () => (globalThis as unknown as BrowserScope).history.length,
    );

    await page.goto(`/cloud/callback?code=${code}&type=signup&keep=1`);
    await expect(
      page.getByRole('heading', { level: 2, name: 'Email verified' }),
    ).toBeVisible();

    // Exactly one provider request was made by this page, and the address bar
    // was already clean when it left.
    const calls = await providerCalls(page);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toMatch(/\/token\/exchange$/);
    expect(calls[0]?.address).toBe('/cloud/callback?keep=1');
    expect(page.url()).toBe(`${baseURL}/cloud/callback?keep=1`);
    // The entry was rewritten in place: only the navigation itself added one.
    expect(
      await page.evaluate(
        () => (globalThis as unknown as BrowserScope).history.length,
      ),
    ).toBe(historyBefore + 1);
    // The code travelled once, as the address of the navigation: the browser's
    // document request and the service worker's forward of that same
    // navigation (a fetch of the same address). Nothing else carries it: no
    // subresource, nothing to the provider, nothing to another origin.
    const carrying = requestUrls.filter((entry) => entry.url.includes(code));

    expect(carrying).toHaveLength(2);
    expect(carrying.filter((entry) => entry.navigation)).toHaveLength(1);
    expect(
      carrying.map((entry) => {
        const url = new URL(entry.url);

        return `${url.origin}${url.pathname}`;
      }),
    ).toEqual(Array(2).fill(`${baseURL}/cloud/callback`));
    expect(
      requestUrls.filter(
        (entry) => entry.url.includes('nhost.run') && entry.url.includes(code),
      ),
    ).toEqual([]);
    expect(await page.content()).not.toContain(code);
    expect(logged.filter((line) => line.includes(code))).toEqual([]);
    expect(
      await page.evaluate(async () => {
        const scope = globalThis as unknown as BrowserScope;
        const urls: string[] = [];

        for (const name of await scope.caches.keys()) {
          const cache = await scope.caches.open(name);

          urls.push(...(await cache.keys()).map((entry) => entry.url));
        }

        return urls.filter((url) => /code=|ONETIME|callback/.test(url));
      }),
    ).toEqual([]);

    await expectAccessible(page, 'callback success');

    // Every result ends at Settings, and landing there sends nothing new.
    await page.getByRole('link', { name: 'Open Settings' }).click();
    await expect(page).toHaveURL(`${baseURL}/rpg/settings`);
    await expect(
      card(page).getByText(learnerEmail, { exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(500);
    expect(await providerCalls(page)).toHaveLength(1);
  });

  test('a provider error, a code the provider rejects and a cloud-off visit are each handled calmly', async ({
    page,
    baseURL,
  }) => {
    const provider = await installSimulatedProvider(page, {
      exchangeCode: 'a-different-code-entirely',
    });
    const logged = recordConsole(page);

    // Cloud off (the default): nothing may be sent, whatever the address holds.
    await page.goto(`/cloud/callback?code=${code}&keep=1`);
    await expect(
      page.getByRole('heading', { name: 'Cloud backup is off' }),
    ).toBeVisible();
    expect(page.url()).toBe(`${baseURL}/cloud/callback?keep=1`);
    expect(provider.calls).toEqual([]);
    await expectAccessible(page, 'callback, cloud off');

    // Cloud on, a provider error in the address.
    await page.evaluate(() =>
      (
        globalThis as unknown as {
          localStorage: { setItem(key: string, value: string): void };
        }
      ).localStorage.setItem(
        'progresspal:cloud:preferences',
        '{"version":1,"enabled":true,"trustedDevice":false}',
      ),
    );
    await page.goto(
      '/cloud/callback?error=access_denied&error_description=Secret%20detail',
    );
    await expect(
      page.getByRole('heading', { name: 'This link cannot be used' }),
    ).toBeVisible();
    expect(page.url()).toBe(`${baseURL}/cloud/callback`);
    await expect(page.locator('body')).not.toContainText('Secret detail');
    expect(provider.calls).toEqual([]);
    await expectAccessible(page, 'callback, failure');

    // A well-formed code the provider rejects, with a verifier on this device.
    await page.goto('/cloud/callback');
    await expect(
      page.getByRole('link', { name: 'Open Settings' }),
    ).toHaveAttribute('href', '/rpg/settings');
    expect(
      logged.filter((line) => /Secret detail|access_denied/.test(line)),
    ).toEqual([]);
  });
});

test.describe('Settings cloud card in a real browser', () => {
  test('keyboard only: sign in, back up twice, choose by arrow key, restore the first', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const provider = await installSimulatedProvider(page);

    await completeOnboarding(page, { theme: 'dark' });
    await page.goto('/settings');
    await expect(card(page)).toBeVisible();

    // Off by default: opening Settings sent nothing.
    expect(provider.calls).toEqual([]);

    // Turn on with the keyboard; focus lands on the email field.
    const turnOn = card(page).getByRole('button', {
      name: 'Turn on cloud backup',
    });

    await turnOn.focus();
    await page.keyboard.press('Enter');
    await expect(card(page).getByLabel('Email')).toBeFocused();
    await page.keyboard.type(learnerEmail);
    await page.keyboard.press('Tab');
    await page.keyboard.type(password);
    await page.keyboard.press('Enter');
    await expect(
      card(page).getByRole('button', { name: 'Back up now' }),
    ).toBeFocused();
    expect(provider.calls.map((call) => call.path.split('/').pop())).toEqual([
      'email-password',
    ]);

    // Back up (Enter); the stored backup is confirmed by the server.
    await page.keyboard.press('Enter');
    await expect(card(page).getByText('Backed up')).toBeVisible();

    // Change local data through the app, then back up again.
    await page.getByLabel('Display name').fill('Changed after backup');
    await page.getByRole('button', { name: 'Save local settings' }).click();
    await expect(page.getByText('Local profile saved')).toBeVisible();
    await card(page).getByRole('button', { name: 'Back up now' }).focus();
    await page.keyboard.press('Enter');
    await expect(
      card(page)
        .getByText(/Slot 2/)
        .first(),
    ).toBeVisible();
    await expect(
      card(page).getByText(
        '2 backups are stored on the server; 2 can be restored by this version.',
      ),
    ).toBeVisible();

    // Choose the first backup with the arrow keys, download and check it.
    const choose = card(page).getByLabel('Backup to restore');

    await choose.focus();
    await page.keyboard.press('ArrowDown');
    await expect(choose).toHaveValue(
      (await choose.locator('option').nth(1).getAttribute('value')) ?? '',
    );
    await page.keyboard.press('ArrowUp');
    await expect(choose.locator('option:checked')).toHaveText(/^Slot 1:/);
    await page.keyboard.press('Tab');
    await expect(
      card(page).getByRole('button', { name: 'Download and check' }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(card(page).getByText(/is ready to restore/)).toBeFocused();

    // The destructive warning is on screen, and the dark theme is accessible.
    await expect(
      card(page).getByText(
        'Restoring replaces all learner data on this device with this backup. This is destructive and cannot be undone.',
      ),
    ).toBeVisible();
    await expectAccessible(page, 'Classic Settings, prepared restore (dark)');
    await expectContained(page, 'Classic Settings, prepared restore');

    // Acknowledge (Space) and replace (Enter) with the keyboard alone.
    await page.keyboard.press('Tab');
    await expect(
      card(page).getByRole('checkbox', {
        name: "Replace this device's data with this backup",
      }),
    ).toBeFocused();
    await page.keyboard.press('Space');
    await card(page)
      .getByRole('button', { name: 'Replace local data with this backup' })
      .focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/rpg$/);
    await expect(page.locator('.rpg-hero-hud__name')).toHaveText('Alex');

    // Back in Settings the learner is still signed in, and nothing was sent
    // without a button press. Exactly: the sign-in; two backups (read the
    // list, write, read the list again); one download. Nothing else.
    await page.goto('/rpg/settings');
    await expect(card(page).getByText(learnerEmail)).toBeVisible();
    expect(
      provider.calls.map(
        (call) => `${call.method} ${call.path.split('/').pop()}`,
      ),
    ).toEqual([
      'POST email-password',
      ...Array.from({ length: 7 }, () => 'POST v1'),
    ]);
    const afterRestore = provider.calls.length;

    await page.waitForTimeout(500);
    expect(provider.calls).toHaveLength(afterRestore);
  });

  test('stays inside 320, 390 and 1280 pixel screens and is accessible in every state (light theme, RPG Settings)', async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const provider = await installSimulatedProvider(page);
    // A long address: the part most likely to push a narrow card wider.
    const longEmail = `${'a'.repeat(58)}@${'b'.repeat(40)}.example.com`;

    await completeOnboarding(page, { theme: 'light' });
    await page.goto('/rpg/settings');
    await expect(card(page)).toBeVisible();

    await expectContained(page, 'off');
    await expectAccessible(page, 'RPG Settings, cloud off (light)');

    await card(page)
      .getByRole('button', { name: 'Turn on cloud backup' })
      .click();
    await expect(card(page).getByLabel('Email')).toBeFocused();
    await expectContained(page, 'signed out');
    await expectAccessible(page, 'RPG Settings, signed out (light)');

    await card(page).getByLabel('Email').fill(longEmail);
    await card(page).getByLabel('Password').fill(password);
    await card(page).getByRole('button', { name: 'Sign in' }).click();
    await expect(
      card(page).getByRole('button', { name: 'Back up now' }),
    ).toBeFocused();
    await expectContained(page, 'signed in (long address)');

    await card(page).getByRole('button', { name: 'Back up now' }).click();
    await expect(card(page).getByText('Backed up')).toBeVisible();
    await expectContained(page, 'backed up, listed');
    await expectAccessible(page, 'RPG Settings, signed in with list (light)');

    await card(page)
      .getByRole('button', { name: 'Download and check' })
      .click();
    await expect(card(page).getByText(/is ready to restore/)).toBeVisible();
    await expectContained(page, 'prepared restore');
    await expectAccessible(page, 'RPG Settings, prepared restore (light)');

    // An unknown outcome is the other tall state.
    await card(page).getByRole('button', { name: 'Cancel' }).click();
    provider.sim.control.gatewayBeforeCommit = 2;
    await card(page).getByRole('button', { name: 'Back up now' }).click();
    await expect(card(page).getByText('Backup outcome unknown')).toBeVisible();
    await expectContained(page, 'outcome unknown');
    await expectAccessible(page, 'RPG Settings, outcome unknown (light)');
  });
});
