import { mkdirSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

type Card = {
  id: string;
  kind: string;
  title: string;
  hint: string;
  explanation: string;
  options: { id: string; label: string; feedback?: string }[];
  correctId: string;
  tokens: { id: string; text: string }[];
  correctOrder: string[];
};
const contentPath =
  '../src/programmes/programvareutvikling/microlearning/utviklerblikk/sqlMysql';
const { sqlMysqlSessions: sessions } = (await import(contentPath)) as {
  sqlMysqlSessions: { id: string; title: string; cards: Card[] }[];
};

const base = '/rpg/track/tenk-som-en-utvikler';
const category = 'Databaser – SQL/MySQL';
const output = 'artifacts/sql-mysql';

async function press(page: Page, name: string) {
  // The established action guard separates deliberate presses by 400 ms.
  await page.waitForTimeout(430);
  await page.getByRole('button', { name, exact: true }).click();
}

async function inspect(page: Page) {
  const issues = await page.evaluate<string[]>(`(() => {
    const shell = document.querySelector('.micro'), issues = [];
    if (shell.scrollWidth > shell.clientWidth + 1) issues.push('horizontal overflow');
    for (const el of shell.querySelectorAll('*')) {
      if (!el.getClientRects().length || el.closest('[hidden],[inert],.sr-only')) continue;
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      if (['hidden','clip'].includes(s.overflowY) && el.scrollHeight > el.clientHeight + 2)
        issues.push('clipped height: ' + el.className);
      if (['hidden','clip'].includes(s.overflowX) && el.scrollWidth > el.clientWidth + 2)
        issues.push('clipped width: ' + el.className);
      if (r.left < -1 || r.right > innerWidth + 1) issues.push('outside width: ' + el.className);
    }
    return issues;
  })()`);
  expect(issues).toEqual([]);
  for (const control of await page
    .locator('.micro button:visible, .micro a:visible')
    .all()) {
    await control.scrollIntoViewIfNeeded();
    const rect = await control.boundingBox();
    expect(rect!.width).toBeGreaterThanOrEqual(43.9);
    expect(rect!.height).toBeGreaterThanOrEqual(43.9);
  }
}

async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 35; i++) {
    if (await target.evaluate((el) => el === el.ownerDocument.activeElement))
      return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Keyboard could not reach ' + (await target.textContent()));
}

async function enter(page: Page) {
  await page.goto(base);
  await press(
    page,
    (
      await page
        .getByRole('button', { name: new RegExp('^' + category) })
        .innerText()
    ).replace(/\n/g, ' '),
  );
}

async function walk(page: Page, keyboard: boolean) {
  for (const [index, session] of sessions.entries()) {
    await press(page, `${index + 1}. ${session.title}`);
    for (const card of session.cards) {
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        card.title,
      );
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
      await inspect(page);
      if (
        card.id === 'tsu-sql-04-resultat' ||
        card.id === 'tsu-sql-06-transaksjon'
      ) {
        await page.locator('.micro').evaluate((el) => (el.scrollTop = 0));
        await page.screenshot({
          path: `${output}/${keyboard ? 'desktop' : 'mobile-200'}-${card.id}.png`,
        });
      }
      if (card.kind === 'select') {
        // A real wrong choice, retry hint and explanation on one representative task.
        if (keyboard && card.id === 'tsu-sql-02-resultat') {
          const wrong = card.options.find((o) => o.id !== card.correctId)!;
          await page
            .getByRole('button', { name: wrong.label, exact: true })
            .click();
          await expect(page.getByRole('status')).toContainText(wrong.feedback!);
          await press(page, 'Prøv igjen');
          await expect(page.getByRole('status')).toContainText(card.hint);
        }
        const answer = card.options.find((o) => o.id === card.correctId)!;
        await page
          .getByRole('button', { name: answer.label, exact: true })
          .click();
        await expect(page.getByRole('status')).toContainText(card.explanation);
      } else if (card.kind === 'assemble') {
        for (const id of card.correctOrder) {
          const token = card.tokens.find((t) => t.id === id)!;
          const target = page
            .getByRole('group', { name: 'Deler', exact: true })
            .getByRole('button', { name: token.text, exact: true });
          if (keyboard) {
            await tabTo(page, target);
            await page.keyboard.press('Space');
          } else await target.click();
        }
        await press(page, 'Sjekk');
        await expect(page.getByRole('status')).toHaveAttribute(
          'data-state',
          'correct',
        );
      }
      await inspect(page);
      await press(page, card === session.cards.at(-1) ? 'Fullfør' : 'Neste');
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Husk dette',
    );
    await press(page, 'Velg en annen aktivitet');
  }
}

test.beforeEach(async ({ page }) => {
  mkdirSync(output, { recursive: true });
  await completeOnboarding(page, { programme: 'Programvareutvikling' });
});

test('SQL category: construction by keyboard, results, retry, history and exit', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const external: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1:42183/'))
      external.push(request.url());
  });
  await page.goto('/rpg');
  await page.getByRole('link', { name: 'Utviklerblikk', exact: true }).click();
  const categoryButton = page.getByRole('button', {
    name: new RegExp('^' + category),
  });
  await categoryButton.click();
  await expect(page).toHaveURL(/kategori=sql-mysql/);
  await page.goBack();
  await expect(categoryButton).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole('button', {
      name: '1. Hvordan henger data sammen?',
      exact: true,
    }),
  ).toBeVisible();
  await walk(page, true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: 'Lukk Utviklerblikk' }).click();
  await expect(page).toHaveURL(/\/rpg$/);
  expect(external).toEqual([]);
});

test('SQL content reflows at 320 px and 200% root text', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 568 });
  await enter(page);
  await page.evaluate("document.documentElement.style.fontSize = '200%'");
  await walk(page, false);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('unopened SQL activities load and assemble after an offline reload', async ({
  page,
  context,
}) => {
  await page.evaluate(`(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve =>
      navigator.serviceWorker.addEventListener('controllerchange', resolve, {once:true}));
  })()`);
  await context.setOffline(true);
  await page.goto(base + '?kategori=sql-mysql');
  await press(page, '2. Finn riktig informasjon');
  const activity = sessions[1]!;
  const assemblyIndex = activity.cards.findIndex(
    (card) => card.id === 'tsu-sql-02-bygg',
  );
  expect(assemblyIndex).toBeGreaterThan(0);
  for (let index = 0; index < assemblyIndex; index++)
    await press(page, 'Neste');
  const card = activity.cards[assemblyIndex]!;
  if (card.kind !== 'assemble') throw new Error('Expected SQL assembly');
  for (const id of card.correctOrder) {
    const token = card.tokens.find((t) => t.id === id)!;
    await page
      .getByRole('group', { name: 'Deler', exact: true })
      .getByRole('button', { name: token.text, exact: true })
      .click();
  }
  await press(page, 'Sjekk');
  await expect(page.getByRole('status')).toHaveAttribute(
    'data-state',
    'correct',
  );
});

test('representative SQL assembly: mobile rendering, wrong answer, focus and axe', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await enter(page);
  await press(page, '2. Finn riktig informasjon');
  await page.locator('.micro-code').scrollIntoViewIfNeeded();
  await page.screenshot({ path: output + '/mobile-normal-sql.png' });
  const activity = sessions[1]!;
  const assemblyIndex = activity.cards.findIndex(
    (card) => card.id === 'tsu-sql-02-bygg',
  );
  expect(assemblyIndex).toBeGreaterThan(0);
  for (let index = 0; index < assemblyIndex; index++)
    await press(page, 'Neste');
  const card = activity.cards[assemblyIndex]!;
  const pool = page.getByRole('group', { name: 'Deler', exact: true });
  await pool
    .getByRole('button', { name: 'FROM deltakere', exact: true })
    .click();
  await press(page, 'Sjekk');
  await expect(page.getByRole('status')).toContainText(card.hint);
  await press(page, 'Prøv igjen');
  await expect(page.getByRole('group', { name: 'Linjen din' })).toContainText(
    'Linjen din er tom.',
  );
  for (const id of card.correctOrder) {
    await pool
      .getByRole('button', {
        name: card.tokens.find((t) => t.id === id)!.text,
        exact: true,
      })
      .click();
  }
  await press(page, 'Sjekk');
  await expect(page.getByRole('status')).toContainText(card.explanation);
  await inspect(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole('group', { name: 'Linjen din' })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: output + '/mobile-normal-assembly.png' });
  await page.evaluate("document.documentElement.style.fontSize = '200%'");
  await inspect(page);
  const next = page.getByRole('button', { name: 'Neste', exact: true });
  await tabTo(page, next);
  await expect(next).toBeFocused();
  await page.screenshot({ path: output + '/mobile-200-feedback.png' });
  await page.waitForTimeout(430);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    activity.cards[assemblyIndex + 1]!.title,
  );
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await press(page, 'Neste');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Hvilke navn kommer ut?',
  );
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
