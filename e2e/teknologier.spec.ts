import { mkdirSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

// E2E is a separate TS project; load authored data without importing app types.
type Card = { id: string; title: string } & (
  | { kind: 'learn' }
  | {
      kind: 'select';
      options: { id: string; label: string; feedback?: string }[];
      correctId: string;
      hint: string;
      explanation: string;
    }
);
type Session = { id: string; title: string; takeaway: string; cards: Card[] };

const contentPath =
  '../src/programmes/programvareutvikling/microlearning/utviklerblikk/teknologier';
const { teknologiSessions: sessions } = (await import(contentPath)) as {
  teknologiSessions: readonly Session[];
};
const path = '/rpg/track/tenk-som-en-utvikler';
const category = 'teknologier-og-rammeverk';
const output = 'artifacts/edu-04';

async function press(page: Page, name: string) {
  // Respect the existing deliberate-press guard.
  await page.waitForTimeout(430);
  await page.getByRole('button', { name, exact: true }).click();
}

async function keyboardClick(page: Page, target: Locator) {
  for (let i = 0; i < 40; i++) {
    if (await target.evaluate((el) => el === el.ownerDocument.activeElement)) {
      await page.keyboard.press('Enter');
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error('Keyboard could not reach ' + (await target.textContent()));
}

async function inspect(page: Page) {
  expect(
    await page.locator('.micro').evaluate((root) => {
      const issues: string[] = [];
      if (root.scrollWidth > root.clientWidth + 1)
        issues.push('horizontal overflow');
      for (const el of root.querySelectorAll<HTMLElement>('*')) {
        if (
          !el.getClientRects().length ||
          el.closest('[hidden],[inert],.sr-only')
        )
          continue;
        const style = getComputedStyle(el),
          rect = el.getBoundingClientRect();
        if (
          ['hidden', 'clip'].includes(style.overflowY) &&
          el.scrollHeight > el.clientHeight + 2
        )
          issues.push('clipped height: ' + el.className);
        if (
          ['hidden', 'clip'].includes(style.overflowX) &&
          el.scrollWidth > el.clientWidth + 2
        )
          issues.push('clipped width: ' + el.className);
        if (rect.left < -1 || rect.right > innerWidth + 1)
          issues.push('outside width: ' + el.className);
      }
      return issues;
    }),
  ).toEqual([]);
  for (const control of await page
    .locator('.micro button:visible, .micro a:visible')
    .all()) {
    await control.scrollIntoViewIfNeeded();
    const rect = (await control.boundingBox())!;
    expect(rect.width).toBeGreaterThanOrEqual(43.9);
    expect(rect.height).toBeGreaterThanOrEqual(43.9);
  }
}

async function walk(page: Page, label: string, keyboard = false) {
  for (const [index, session] of sessions.entries()) {
    await press(page, `${index + 1}. ${session.title}`);
    for (const card of session.cards) {
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        card.title,
      );
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
      await inspect(page);
      if (card.kind === 'select') {
        if (keyboard && card.id === 'tsu-tek-04-valg') {
          const wrong = card.options.find((o) => o.id !== card.correctId)!;
          await keyboardClick(
            page,
            page.getByRole('button', { name: wrong.label, exact: true }),
          );
          await expect(page.getByRole('status')).toContainText(wrong.feedback!);
          expect(
            (await new AxeBuilder({ page }).include('.micro').analyze())
              .violations,
          ).toEqual([]);
          await page.screenshot({ path: `${output}/desktop-wrong.png` });
          await inspect(page);
          await page.waitForTimeout(430);
          await keyboardClick(
            page,
            page.getByRole('button', { name: 'Prøv igjen', exact: true }),
          );
          await expect(page.getByRole('status')).toContainText(card.hint);
        }
        const answer = card.options.find((o) => o.id === card.correctId)!;
        const button = page.getByRole('button', {
          name: answer.label,
          exact: true,
        });
        if (keyboard) await keyboardClick(page, button);
        else await button.click();
        await expect(page.getByRole('status')).toContainText(card.explanation);
        await inspect(page);
      }
      if (card.id.endsWith('-eksempel')) {
        await page.locator('.micro').evaluate((el) => (el.scrollTop = 0));
        await page.screenshot({ path: `${output}/${label}-${session.id}.png` });
      }
      await press(page, card === session.cards.at(-1) ? 'Fullfør' : 'Neste');
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Husk dette',
    );
    await expect(
      page.getByText(session.takeaway!, { exact: true }),
    ).toBeVisible();
    await inspect(page);
    await press(page, 'Velg en annen aktivitet');
  }
}

test.beforeEach(async ({ page }) => {
  mkdirSync(output, { recursive: true });
  await completeOnboarding(page, {
    programme: 'Programvareutvikling',
    theme: 'light',
  });
});

test('technologies: discovery, keyboard, diagnostic feedback, history and completion', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const external: string[] = [];
  const origin = new URL(page.url()).origin;
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== origin) external.push(request.url());
  });
  // The onboarding helper ends in Classic; the existing shared route is accessible there too.
  await page.goto(path);
  const picker = page.getByRole('button', {
    name: /^Teknologier og rammeverk/,
  });
  await keyboardClick(page, picker);
  await expect(page).toHaveURL(new RegExp(`kategori=${category}$`));
  await page.goBack();
  await expect(picker).toBeVisible();
  await page.goForward();
  await walk(page, 'desktop', true);
  expect(
    (await new AxeBuilder({ page }).include('.micro').analyze()).violations,
  ).toEqual([]);
  await page.getByRole('link', { name: 'Lukk Utviklerblikk' }).click();
  await expect(page).toHaveURL(/\/rpg$/);
  await page.getByRole('link', { name: 'Utviklerblikk', exact: true }).click();
  await expect(picker).toBeVisible();
  expect(external).toEqual([]);
});

for (const [width, scale] of [
  [320, 100],
  [390, 100],
  [320, 200],
]) {
  test(`technologies: all cards and feedback at ${width}px, ${scale}% text`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: width!, height: 800 });
    await page.goto(path);
    await expect(page.locator('.micro')).toBeVisible();
    await page.evaluate((percent) => {
      document.documentElement.style.fontSize = `${percent}%`;
    }, scale);
    await inspect(page);
    await page.locator('.micro').evaluate((el) => (el.scrollTop = 0));
    await page.screenshot({
      path: `${output}/${width}-${scale}-categories.png`,
    });
    await page.waitForTimeout(430);
    await page
      .getByRole('button', { name: /^Teknologier og rammeverk/ })
      .click();
    await inspect(page);
    await walk(page, `${width}-${scale}`);
    expect(
      (await new AxeBuilder({ page }).include('.micro').analyze()).violations,
    ).toEqual([]);
  });
}

test('technologies: unopened content works after cold offline load and reload', async ({
  page,
  context,
}) => {
  await page.waitForFunction('navigator.serviceWorker.controller !== null');
  const cold = await context.newPage();
  await page.close();
  await context.setOffline(true);
  await cold.goto(`${path}?kategori=${category}`);
  await press(cold, '5. Sett sammen en løsning');
  await press(cold, 'Neste');
  await press(cold, 'Neste');
  await cold
    .getByRole('button', {
      name: 'Vurdere Next.js og planlegge datalagring og serverdrift.',
      exact: true,
    })
    .click();
  await expect(cold.getByRole('status')).toHaveAttribute(
    'data-state',
    'correct',
  );
  await cold.reload();
  // Existing history keeps the card position. Its in-memory answer is gone.
  await expect(cold.getByRole('heading', { level: 1 })).toHaveText(
    'Offentlige sider og påmeldinger',
  );
  await expect(cold.getByRole('status')).not.toHaveAttribute(
    'data-state',
    'correct',
  );
  await cold
    .getByRole('button', {
      name: 'Vurdere Next.js og planlegge datalagring og serverdrift.',
      exact: true,
    })
    .click();
  await expect(cold.getByRole('status')).toHaveAttribute(
    'data-state',
    'correct',
  );
});
