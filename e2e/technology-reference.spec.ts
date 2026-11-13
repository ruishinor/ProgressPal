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
      page.getByRole('region', { name: 'Persistent hero HUD' }),
    ).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open Settings' })).toHaveCount(
      1,
    );
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
    await page
      .getByRole('combobox', { name: 'Tema', exact: true })
      .selectOption('Drift');
    await page.getByRole('searchbox').fill('Kub');
    const live = page.getByRole('list', { name: 'Søkeforslag' });
    await expect(live.getByRole('link')).toHaveText(['Kubernetes']);
    await expect(page.getByRole('searchbox')).toHaveValue('Kub');
    await page.getByRole('searchbox').press('Tab');
    await expect(live.getByRole('link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Kubernetes',
    );
    await expect(page.locator('#rpg-main-content')).toBeFocused();
    await page.getByRole('link', { name: 'Tilbake til søk og tema' }).click();
    await expect(page.getByRole('searchbox')).toHaveValue('Kub');
    await expect(
      page.getByRole('combobox', { name: 'Tema', exact: true }),
    ).toHaveValue('Drift');
    await page
      .getByRole('combobox', { name: 'Tema', exact: true })
      .selectOption('');
    await page.getByRole('searchbox').clear();
    await page.getByRole('searchbox').focus();
    await expect(page.getByRole('searchbox')).toBeFocused();
    expect(
      await page
        .getByRole('searchbox')
        .evaluate((el) => getComputedStyle(el).outlineStyle),
    ).not.toBe('none');
    await page.keyboard.type('Azure AD');
    await expect(live.getByRole('link')).toHaveText(['Microsoft Entra ID']);
    await page.keyboard.press('Escape');
    await expect(live).toHaveCount(0);
    await expect(page.getByRole('searchbox')).toHaveValue('Azure AD');
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

test('reference: quiet reading top, live links and focused reflow in both themes', async ({
  page,
}) => {
  const output = 'artifacts/reference-ux';
  mkdirSync(output, { recursive: true });
  await completeOnboarding(page);
  for (const theme of ['light', 'dark']) {
    await page.goto('/rpg/settings?section=profile');
    await page.locator('select[id$="-theme"]').selectOption(theme);
    await page.getByRole('button', { name: 'Save local settings' }).click();
    await expect(
      page.getByText('Local profile saved', { exact: true }),
    ).toBeVisible();
    for (const [width, scale] of [
      [390, 100],
      [320, 200],
      [1024, 200],
    ]) {
      await page.setViewportSize({ width, height: 850 });
      await page.goto('/rpg/oppslag');
      await expect(page.getByRole('searchbox')).toBeVisible();
      // Root-text proxy, not browser zoom or a physical phone.
      await page.evaluate((scale) => {
        document.documentElement.style.fontSize = `${scale}%`;
      }, scale);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await inspect(page);
      expect(
        await page.getByRole('heading', { level: 1 }).evaluate((heading) => {
          const range = document.createRange();
          range.selectNodeContents(heading);
          return range.getClientRects().length;
        }),
      ).toBe(1);
      const input = page.getByRole('searchbox');
      const box = (await input.boundingBox())!;
      const nav = (await page
        .getByRole('navigation', { name: 'RPG primary navigation' })
        .boundingBox())!;
      expect(box.y + box.height).toBeLessThan(width < 672 ? nav.y : 850);
      await page.screenshot({
        path: `${output}/after-${theme}-${width}-${scale}-index.png`,
      });
      await page
        .getByRole('combobox', { name: 'Tema', exact: true })
        .selectOption('Drift');
      await input.fill('Kub');
      const suggestions = page.getByRole('list', { name: 'Søkeforslag' });
      await expect(suggestions.getByRole('link')).toHaveText(['Kubernetes']);
      const suggestionBox = (await suggestions
        .getByRole('link')
        .boundingBox())!;
      if (width < 672)
        expect(suggestionBox.y + suggestionBox.height).toBeLessThan(nav.y);
      await page.screenshot({
        path: `${output}/after-${theme}-${width}-${scale}-suggestions.png`,
      });
      expect(
        (await new AxeBuilder({ page }).include('.reference').analyze())
          .violations,
      ).toEqual([]);
      // Native link click covers pointer/touch-style activation as well as
      // the separate keyboard journey in the two programme cases above.
      await suggestions.getByRole('link').click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Kubernetes',
      );
      await inspect(page);
      expect(
        await page.getByRole('heading', { level: 1 }).evaluate((heading) => {
          const range = document.createRange();
          range.selectNodeContents(heading);
          return range.getClientRects().length;
        }),
      ).toBe(1);
      await page.screenshot({
        path: `${output}/after-${theme}-${width}-${scale}-article.png`,
      });
      await page.getByRole('link', { name: 'Tilbake til søk og tema' }).click();
      await expect(page.getByRole('searchbox')).toHaveValue('Kub');
      await expect(
        page.getByRole('combobox', { name: 'Tema', exact: true }),
      ).toHaveValue('Drift');
      await page.getByRole('searchbox').fill('surdeigsstarter');
      await expect(page.getByRole('list', { name: 'Søkeforslag' })).toHaveCount(
        0,
      );
      await page.getByRole('searchbox').fill('Java');
      await expect(page.getByRole('list', { name: 'Søkeforslag' })).toHaveCount(
        0,
      );
    }
  }
  await page.getByRole('link', { name: 'Open Settings' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
});
