import { expect, test, type Locator, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

type LayoutScope = {
  document: { documentElement: { scrollWidth: number } };
  getComputedStyle: (element: unknown) => {
    outlineStyle: string;
    outlineWidth: string;
  };
  innerWidth: number;
};

async function documentOverflow(page: Page) {
  return page.evaluate(() => {
    const scope = globalThis as unknown as LayoutScope;

    return scope.document.documentElement.scrollWidth - scope.innerWidth;
  });
}

async function size(locator: Locator, label: string) {
  const box = await locator.boundingBox();

  expect(box, `${label} bounding box`).not.toBeNull();

  return box!;
}

// A fresh learner chooses the programme before anything else; the longest name
// ("Programvareutvikling") is one unbreakable word.
for (const viewport of [
  { height: 700, width: 320 },
  { height: 560, width: 360 },
  { height: 854, width: 384 },
]) {
  test(`programme selection fits without horizontal scroll at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Start with ProgressPal' }),
    ).toBeVisible();

    const options = page
      .getByRole('radiogroup', { name: 'Choose your programme' })
      .getByRole('radio');

    await expect(options).toHaveCount(2);

    for (const option of await options.all()) {
      const label = option.locator('xpath=ancestor::label');
      const box = await size(label, 'programme option');

      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    expect(await documentOverflow(page)).toBeLessThanOrEqual(1);
  });
}

for (const viewport of [
  { height: 560, width: 360 },
  { height: 854, width: 384 },
  { height: 800, width: 1280 },
]) {
  test(`primary navigation and Hero entry are usable at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await completeOnboarding(page);

    const nav = page.getByRole('navigation', {
      name: 'RPG primary navigation',
    });

    for (const path of ['/rpg', '/rpg/map', '/rpg/badges']) {
      await page.goto(path);
      await expect(nav.getByRole('link')).toHaveCount(5);
      await expect(nav.getByRole('link')).toHaveText([
        'Home',
        'Campaign',
        'Focus',
        'Awards',
        'Insights',
      ]);

      for (const link of await nav.getByRole('link').all()) {
        const box = await size(link, `${path} nav link`);

        expect(box.width, `${path} nav link width`).toBeGreaterThanOrEqual(44);
        expect(box.height, `${path} nav link height`).toBeGreaterThanOrEqual(
          44,
        );
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);

        // The label is never clipped by its own link.
        const label = link.locator('.rpg-primary-nav__label');
        const clipped = await label.evaluate(
          (element) => element.scrollWidth > element.clientWidth + 1,
        );

        expect(clipped, `${path} nav label clipped`).toBe(false);
      }

      expect(
        await documentOverflow(page),
        `${path} overflow`,
      ).toBeLessThanOrEqual(1);
    }

    // Exactly the current destination is marked.
    await page.goto('/rpg/map');
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(nav.getByRole('link', { name: 'Campaign' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    // The learner avatar is the profile entry: touch-sized, labelled, focusable
    // with a visible indicator, and it opens the existing Hero Profile.
    const profile = page.getByRole('link', { name: 'Open Hero Profile' });
    const profileBox = await size(profile, 'profile entry');

    expect(profileBox.width).toBeGreaterThanOrEqual(44);
    expect(profileBox.height).toBeGreaterThanOrEqual(44);
    await expect(
      profile.getByRole('img', { name: 'Alex hero avatar' }),
    ).toBeVisible();

    await profile.focus();
    const outline = await profile.evaluate((element) => {
      const scope = globalThis as unknown as LayoutScope;
      const style = scope.getComputedStyle(element);

      return { style: style.outlineStyle, width: style.outlineWidth };
    });

    expect(outline.style).not.toBe('none');
    expect(Number.parseFloat(outline.width)).toBeGreaterThan(0);

    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { exact: true, name: 'Hero Profile' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/rpg\/hero$/);
  });
}
