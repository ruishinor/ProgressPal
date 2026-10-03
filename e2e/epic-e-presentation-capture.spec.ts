import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * Epic E presentation probe and review capture (owner decision 2026-10-03:
 * contextual lesson presentation). A representative normal lesson and the
 * module checkpoint, in Classic and RPG, light and dark, at 390 px and
 * 1280 px. Each state is checked for horizontal overflow, console errors,
 * failed same-origin assets, its landmarks and headings, a visible keyboard
 * focus ring and its presentation; the screenshots are review evidence only
 * (no golden comparison, not visual acceptance). Synthetic data only.
 */

const captureDirectory = path.resolve('artifacts/epic-e2/presentation');
const viewports = [
  { label: '390', width: 390, height: 844 },
  { label: '1280', width: 1280, height: 900 },
] as const;
const surfaces = [
  {
    label: 'classic-lesson',
    path: '/course/s1-m01-o01',
    presentation: 'classic',
  },
  {
    label: 'classic-checkpoint',
    path: '/course/s1-m01-chk',
    presentation: 'classic',
  },
  {
    label: 'rpg-lesson',
    path: '/rpg/resource/s1-m01-o01',
    presentation: 'rpg',
  },
  {
    label: 'rpg-checkpoint',
    path: '/rpg/resource/s1-m01-chk',
    presentation: 'rpg',
  },
] as const;

function collectProblems(page: Page, problems: string[]) {
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`page: ${error.message}`));
  page.on('requestfailed', (request) =>
    problems.push(`failed: ${request.url()}`),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) {
      problems.push(`${response.status()}: ${response.url()}`);
    }
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`presents the lesson and the checkpoint coherently in ${theme}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const problems: string[] = [];
    collectProblems(page, problems);
    await mkdir(captureDirectory, { recursive: true });

    await completeOnboarding(page, { theme });
    await page.goto('/settings');
    await page
      .getByLabel('Programme to switch to')
      .selectOption('programvareutvikling');
    await page.getByRole('button', { name: 'Enrol and switch' }).click();
    await expect(
      page.getByText('Active programme: Programvareutvikling'),
    ).toBeVisible();

    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      for (const surface of surfaces) {
        await page.goto(surface.path);
        const article = page.getByRole('article', { name: /./ });
        await expect(article).toBeVisible({ timeout: 15_000 });
        await expect(article).toHaveAttribute(
          'data-presentation',
          surface.presentation,
        );
        await expect(page.getByRole('main')).toHaveCount(1);
        await expect(article.getByRole('heading', { level: 1 })).toBeVisible();
        expect(
          (await page.evaluate(
            'document.documentElement.scrollWidth - document.documentElement.clientWidth',
          )) as number,
          `${theme} ${viewport.label} ${surface.label} overflow`,
        ).toBeLessThanOrEqual(0);

        await page.screenshot({
          path: path.join(
            captureDirectory,
            `${theme}-${viewport.label}-${surface.label}.png`,
          ),
        });

        // Keyboard focus is visible on the lesson's controls.
        const control = article
          .getByRole('button', { name: /Vis hint/ })
          .first();
        await control.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        const ring = await control.evaluate((element) => {
          // e2e specs compile without the DOM library.
          const style = (
            globalThis as unknown as {
              getComputedStyle(target: unknown): {
                outlineStyle: string;
                boxShadow: string;
              };
            }
          ).getComputedStyle(element);
          return { outline: style.outlineStyle, shadow: style.boxShadow };
        });
        expect(
          ring.outline !== 'none' || ring.shadow !== 'none',
          `${theme} ${viewport.label} ${surface.label} focus ring`,
        ).toBe(true);
      }
    }

    expect(problems).toEqual([]);
  });
}
