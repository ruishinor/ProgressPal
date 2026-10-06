import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

// Real Chromium checks for the learner-feedback tranche. Synthetic data only.
// Screenshots are review evidence, not a golden-image acceptance test.
const captures = path.resolve('artifacts/learner-feedback');
test.use({ actionTimeout: 10_000 });

for (const theme of ['light', 'dark'] as const) {
  test(`learner feedback: readable blocks and keyboard continuation in ${theme}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await mkdir(captures, { recursive: true });
    await completeOnboarding(page, {
      theme,
      programme: 'Programvareutvikling',
    });

    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const shot = async (name: string) => {
        await page.screenshot({
          path: path.join(captures, `${theme}-${width}-${name}.png`),
        });
      };
      await page.goto('/rpg');
      const home = page
        .getByRole('navigation', { name: 'RPG primary navigation' })
        .getByRole('link', { name: 'Home', exact: true });
      await expect(home).toHaveAttribute('aria-current', 'page');
      await shot('home-selected');

      await page.goto('/rpg/resource/s1-m01-o02');
      const lesson = page.getByRole('article');
      await expect(lesson).toBeVisible();
      await expect(home).not.toHaveAttribute('aria-current', 'page');
      await shot('lesson-heading');
      await expect(
        lesson.locator('.lesson-pre--terminal').first(),
      ).toBeVisible();
      await expect(lesson.locator('.lesson-pre--terminal button')).toHaveCount(
        0,
      );
      await lesson
        .locator('.lesson-pre--terminal')
        .first()
        .scrollIntoViewIfNeeded();
      await shot('terminal');
      await lesson
        .locator('.lesson-callout--tip')
        .first()
        .scrollIntoViewIfNeeded();
      await shot('tip');
      const continueButton = lesson
        .getByRole('button', { name: 'Fortsett', exact: true })
        .first();
      await continueButton.focus();
      await continueButton.scrollIntoViewIfNeeded();
      await shot('continue-before');
      await page.keyboard.press('Enter');
      const target = lesson.locator('[id$="-step-6"]');
      await expect(target).toBeFocused();
      const position = await target.boundingBox();
      expect(position!.y).toBeGreaterThanOrEqual(0);
      expect(position!.y).toBeLessThan(100);
      await shot('continue-after');
      const field = lesson.getByRole('textbox').first();
      await field.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(field).toBeFocused();
      await expect(field).toHaveCSS('outline-style', 'solid');
      await shot('answer-focus');
      const complete = page.getByRole('button', {
        name: 'Mark locally complete',
      });
      await expect(complete).toHaveAccessibleDescription(/Det gir ikke XP/);
      await complete.scrollIntoViewIfNeeded();
      await shot('completion-note');

      await page.goto('/rpg/resource/s1-m01-o03');
      await expect(page.getByRole('article')).toBeVisible();
      const source = page.locator('.lesson-pre--source').first();
      await expect(
        source.getByRole('button', { name: 'Kopier', exact: true }),
      ).toHaveCount(1);
      await source.scrollIntoViewIfNeeded();
      await shot('source-output');
      await expect(
        page.locator('.lesson-pre--output button, .lesson-pre--error button'),
      ).toHaveCount(0);
      await page
        .locator('.lesson-callout--pass-paa')
        .first()
        .scrollIntoViewIfNeeded();
      await shot('warning');
      await page.goto('/rpg/resource/s1-m01-o06');
      await expect(page.getByRole('article')).toBeVisible();
      await page.locator('.lesson-pre--error').first().scrollIntoViewIfNeeded();
      await shot('error');
      expect(
        await page.evaluate(
          'document.documentElement.scrollWidth - document.documentElement.clientWidth',
        ),
      ).toBeLessThanOrEqual(0);
      const accessibility = await new AxeBuilder({ page })
        .include('.lesson')
        .analyze();
      expect(accessibility.violations).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}
