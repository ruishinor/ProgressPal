import { mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import entries from '../src/features/technologyReference/entries.json' with { type: 'json' };
import { completeOnboarding } from './support/onboarding';

const output = 'artifacts/technology-reference';
async function inspect(page: Page) {
  expect(
    await page.locator('.reference').evaluate((root) => {
      const problems: string[] = [];
      if (document.documentElement.scrollWidth > innerWidth + 1)
        problems.push('document overflow');
      for (const el of root.querySelectorAll<HTMLElement>('*')) {
        if (!el.getClientRects().length) continue;
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (rect.left < -1 || rect.right > innerWidth + 1)
          problems.push('outside viewport: ' + el.tagName);
        if (
          ['hidden', 'clip'].includes(style.overflowY) &&
          el.scrollHeight > el.clientHeight + 2
        )
          problems.push('clipped text: ' + el.tagName);
      }
      return problems;
    }),
  ).toEqual([]);
}

for (const programme of ['CS50x', 'Programvareutvikling'] as const) {
  test(`reference: ${programme} Home, keyboard, search history, reload and errors`, async ({
    page,
  }) => {
    await completeOnboarding(page, { programme, theme: 'light' });
    await page.goto('/rpg');
    await page
      .getByRole('link', { name: 'Teknologioppslag', exact: true })
      .click();
    await expect(
      page
        .getByRole('navigation', { name: 'RPG primary navigation' })
        .getByRole('link'),
    ).toHaveText(['Home', 'Campaign', 'Focus', 'Awards', 'Insights']);
    const external: string[] = [];
    const origin = new URL(page.url()).origin;
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin)
        external.push(request.url());
    });
    await page.getByRole('searchbox').focus();
    await expect(page.getByRole('searchbox')).toBeFocused();
    expect(
      await page
        .getByRole('searchbox')
        .evaluate((el) => getComputedStyle(el).outlineStyle),
    ).not.toBe('none');
    await page.keyboard.type('Azure AD');
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('combobox', { name: 'Tema', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Søk', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(
      page.getByText('Alias-treff: Azure AD', { exact: false }),
    ).toBeVisible();
    await page
      .getByRole('link', { name: 'Microsoft Entra ID', exact: true })
      .focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Microsoft Entra ID',
    );
    await expect(page.locator('#rpg-main-content')).toBeFocused();
    await page
      .getByRole('link', { name: 'Autentisering', exact: true })
      .click();
    await page.getByRole('link', { name: 'Tilbake til søk og tema' }).click();
    await expect(page.getByRole('searchbox')).toHaveValue('Azure AD');
    await page.goBack();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Autentisering',
    );
    await page.goForward();
    await page.reload();
    await expect(page.getByRole('searchbox')).toHaveValue('Azure AD');
    await page.goto('/rpg/oppslag?q=surdeigsstarter');
    await expect(
      page.getByRole('status').filter({ hasText: 'Ingen treff' }),
    ).toBeVisible();
    await page.goto('/rpg/oppslag?q=Kubernets');
    await expect(page.getByText('Mente du', { exact: false })).toBeVisible();
    await page.goto('/rpg/oppslag/does-not-exist?q=React');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Oppføringen finnes ikke',
    );
    await page.getByRole('link', { name: 'Tilbake til søk og tema' }).click();
    await expect(page.getByRole('searchbox')).toHaveValue('React');
    await page.goto('/rpg/oppslag?q=API%3F&tema=Drift');
    await expect(
      page.getByRole('list', { name: 'Direkte treff' }).getByRole('link'),
    ).toHaveCount(0);
    await expect(
      page.getByRole('link', { name: 'Kubernetes', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('link', { name: 'Søk i alle temaer' }).click();
    await expect(page.getByRole('searchbox')).toHaveValue('API?');
    await expect(
      page.getByRole('list', { name: 'Direkte treff' }).getByRole('link'),
    ).toHaveText(['API']);
    await expect(
      page.getByRole('region', { name: 'Relaterte begreper og omtaler' }),
    ).toBeVisible();
    await inspect(page);
    expect(
      (await new AxeBuilder({ page }).include('.reference').analyze())
        .violations,
    ).toEqual([]);
    await page.goto('/rpg/oppslag?q=Hva+er+React%3F');
    await expect(
      page.getByRole('list', { name: 'Direkte treff' }).getByRole('link'),
    ).toHaveText(['React']);
    await page
      .getByRole('list', { name: 'Direkte treff' })
      .getByRole('link')
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('React');
    await page.getByRole('link', { name: 'Tilbake til søk og tema' }).click();
    await expect(page.getByRole('searchbox')).toHaveValue('Hva er React?');
    await page.goto('/rpg/oppslag?q=hvordan+kj%C3%B8re+containere');
    await expect(
      page.getByRole('list', { name: 'Direkte treff' }).getByRole('link'),
    ).toHaveText(['Docker']);
    await page.goto('/rpg/oppslag?q=Java');
    await expect(
      page.getByRole('status').filter({ hasText: 'Ingen treff' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'JavaScript', exact: true }),
    ).toHaveCount(0);
    expect(external).toEqual([]);
  });
}

for (const theme of ['light', 'dark'] as const) {
  for (const [width, scale] of [
    [320, 100],
    [1024, 200],
    [320, 200],
  ] as const) {
    test(`reference: ${theme}, ${width}px, ${scale}% text, all entries reflow and axe`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      mkdirSync(output, { recursive: true });
      await completeOnboarding(page, { theme });
      await page.setViewportSize({ width, height: 850 });
      await page.goto('/rpg/oppslag');
      await page.evaluate((percent) => {
        document.documentElement.style.fontSize = `${percent}%`;
      }, scale);
      await inspect(page);
      expect(
        (await new AxeBuilder({ page }).include('.reference').analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({
        path: `${output}/${theme}-${width}-${scale}-index.png`,
        fullPage: true,
      });
      for (const entry of entries) {
        // Client-side links retain the separately applied text-size stress.
        await page.getByRole('link', { name: entry.name, exact: true }).click();
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
          entry.name,
        );
        await inspect(page);
        if (['api', 'react', 'kubernetes'].includes(entry.id)) {
          expect(
            (await new AxeBuilder({ page }).include('.reference').analyze())
              .violations,
          ).toEqual([]);
          await page.screenshot({
            path: `${output}/${theme}-${width}-${scale}-${entry.id}.png`,
            fullPage: true,
          });
        }
        for (const source of await page
          .locator('.reference a[href^="https:"]')
          .all()) {
          await expect(source).toHaveAttribute('referrerpolicy', 'no-referrer');
          await expect(source).toHaveAttribute('rel', 'noopener noreferrer');
        }
        await page
          .getByRole('link', { name: 'Tilbake til søk og tema' })
          .click();
      }
    });
  }
}
