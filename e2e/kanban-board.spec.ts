import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding } from './support/onboarding';

const base = '/rpg/track/tenk-som-en-utvikler';
const output = process.env.KAN_SCREENSHOT_DIR;

async function advance(page: Page, name: string | RegExp) {
  // Respect the existing 400ms protection against accidental double activation.
  await page.waitForTimeout(430);
  await page
    .getByRole('button', { name, exact: typeof name === 'string' })
    .click();
}

async function checkLayout(page: Page) {
  const problems = await page.locator('.micro').evaluate((shell) => {
    const failures: string[] = [];
    if (shell.scrollWidth > shell.clientWidth + 1)
      failures.push('horizontal overflow');
    for (const element of shell.querySelectorAll<HTMLElement>('*')) {
      const style = getComputedStyle(element);
      if (!element.getClientRects().length || element.closest('.sr-only'))
        continue;
      if (
        ['hidden', 'clip'].includes(style.overflowY) &&
        element.scrollHeight > element.clientHeight + 2
      )
        failures.push('clipped content');
      if (['auto', 'scroll'].includes(style.overflowY))
        failures.push('nested scrolling');
    }
    return failures;
  });
  expect(problems).toEqual([]);
}

async function capture(page: Page, name: string) {
  if (!output) return;
  mkdirSync(output, { recursive: true });
  await page.locator('.micro').evaluate((shell) => {
    shell.scrollTop = 0;
  });
  await page.screenshot({ path: join(output, name + '.png') });
  const board = page.getByRole('figure');
  const box = await board.boundingBox();
  if (box && box.height <= page.viewportSize()!.height) {
    await board.screenshot({ path: join(output, name + '-board.png') });
  } else {
    // A fixed scrolling shell cannot be captured as one oversized element:
    // record its real viewport at each column and at the agreement instead.
    for (const [index, column] of (
      await board.locator('.micro-kanban__column').all()
    ).entries()) {
      await column
        .locator('h2')
        .evaluate((heading) => heading.scrollIntoView({ block: 'start' }));
      await page.screenshot({
        path: join(output, name + '-column-' + index + '.png'),
      });
    }
    await board
      .locator('[data-blocked]')
      .evaluate((item) => item.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: join(output, name + '-blocked.png') });
    await board
      .locator(':scope > p')
      .last()
      .evaluate((agreement) => agreement.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: join(output, name + '-agreement.png') });
  }
}

for (const viewport of [
  { width: 320, height: 568, scale: 100, theme: 'dark' as const },
  { width: 390, height: 844, scale: 100, theme: 'light' as const },
  { width: 1280, height: 900, scale: 100, theme: 'dark' as const },
  { width: 320, height: 568, scale: 200, theme: 'light' as const },
]) {
  test(`KAN-01 board decisions ${viewport.width}px ${viewport.scale}% ${viewport.theme}`, async ({
    page,
    context,
  }) => {
    test.setTimeout(150_000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await completeOnboarding(page, {
      programme: 'Programvareutvikling',
      theme: viewport.theme,
    });
    await page.goto(base);
    await page.getByRole('button', { name: /^Kanban/ }).click();
    await advance(page, /2\. For mye arbeid samtidig/);
    // All four cards in their final route/shell, with the existing progression.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'WIP og WIP-grenser',
    );
    await advance(page, 'Neste');
    if (viewport.scale === 200)
      await page.addStyleTag({ content: 'html{font-size:200% !important}' });
    const before = page.getByRole('figure', {
      name: 'Tavla til festivalappen · Før',
    });
    await expect(
      before.getByRole('list', { name: 'Pågår' }).getByRole('listitem'),
    ).toHaveCount(4);
    await checkLayout(page);
    await capture(page, `${viewport.width}-${viewport.scale}-before`);
    await advance(page, 'Neste');
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    await checkLayout(page);
    expect(
      (await new AxeBuilder({ page }).include('.micro').analyze()).violations,
    ).toEqual([]);
    // Tab through the real focus order, not direct DOM activation.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toHaveAttribute(
      'data-state',
      'incorrect',
    );
    await expect(page.getByRole('status')).toBeFocused();
    const right = page.getByRole('button', {
      name: /^Vente med kartet og hjelpe/,
    });
    for (
      let i = 0;
      i < 10 && !(await right.evaluate((el) => el === document.activeElement));
      i++
    )
      await page.keyboard.press('Tab');
    await expect(right).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toHaveAttribute(
      'data-state',
      'correct',
    );
    await expect(before).toBeAttached();
    await advance(page, 'Neste');
    const after = page.getByRole('figure', {
      name: 'Tavla til festivalappen · Etter',
    });
    await expect(
      after.getByRole('list', { name: 'Pågår' }).getByRole('listitem'),
    ).toHaveCount(2);
    await expect(after.getByRole('list', { name: 'Ferdig' })).toContainText(
      'Billettkjøp',
    );
    await expect(after.getByRole('list', { name: 'Ferdig' })).toContainText(
      'Varsler',
    );
    await expect(after.getByRole('list', { name: 'Pågår' })).toContainText(
      'Blokkert:',
    );
    await checkLayout(page);
    await capture(page, `${viewport.width}-${viewport.scale}-after`);
    await page
      .getByRole('button', { name: /^Teamet kan hente kartet/ })
      .click();
    await expect(page.getByRole('status')).toHaveAttribute(
      'data-state',
      'correct',
    );
    await expect(page.getByRole('status')).toContainText('skoleavis');
    await checkLayout(page);
    if (viewport.width === 1280) {
      // Reload the same illustrated question from the production cache, offline.
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await expect
        .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
        .toBe(true);
      await context.setOffline(true);
      await page.reload();
      await expect(
        page.getByRole('figure', { name: 'Tavla til festivalappen · Etter' }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: /^Teamet kan hente kartet/ })
        .click();
      await expect(page.getByRole('status')).toHaveAttribute(
        'data-state',
        'correct',
      );
      await context.setOffline(false);
    }
    await advance(page, 'Fullfør');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Husk dette',
    );
  });
}
