import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

const routes = [
  ['/rpg', false],
  ['/rpg/map', true],
  ['/rpg/week/week-0', true],
  ['/rpg/resource/week-0-lecture', false],
  ['/rpg/focus', false],
  ['/rpg/badges', true],
  ['/rpg/log', true],
  ['/rpg/settings', true],
  ['/rpg/movement', true],
] as const;

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => {
      const scope = globalThis as unknown as {
        innerWidth: number;
        document: { documentElement: { scrollWidth: number } };
      };
      return scope.document.documentElement.scrollWidth <= scope.innerWidth;
    }),
  ).toBe(true);
}

async function touchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
}

for (const width of [320, 390, 1280]) {
  test(`shared mobile HUD retains core access and discloses secondary facts at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await completeOnboarding(page);
    const hud = page.getByRole('region', { name: 'Persistent hero HUD' });
    for (const [path, quest] of routes) {
      await page.goto(path);
      await expect(
        hud.getByRole('link', { name: 'Activity Level 1', exact: true }),
      ).toBeVisible();
      await expect(hud.getByText('Alex', { exact: true })).toBeVisible();
      await expect(
        hud.getByRole('group', { name: 'Hero progression' }),
      ).toContainText('0 / 100 XP to Level 2');
      await expect(
        hud.getByRole('progressbar', { name: 'XP progress to level 2' }),
      ).toHaveAttribute('aria-valuenow', '0');
      await expect(
        hud.getByRole('link', { name: 'Open Settings', exact: true }),
      ).toHaveAttribute('href', '/rpg/settings');
      await touchTarget(
        hud.getByRole('link', { name: 'Open Settings', exact: true }),
      );
      await touchTarget(
        hud.getByRole('link', { name: 'Open Hero Profile', exact: true }),
      );
      if (quest) {
        await expect(
          hud.getByRole('link', { name: 'Start quest', exact: true }),
        ).toHaveAttribute('href', '/rpg/resource/week-0-lecture');
        await expect(
          hud.getByText('Lecture 0: Scratch', { exact: true }),
        ).toBeVisible();
        await touchTarget(
          hud.getByRole('link', { name: 'Start quest', exact: true }),
        );
      } else {
        await expect(hud.getByRole('link', { name: /quest$/ })).toHaveCount(0);
      }
      if (width < 672) {
        const details = hud.getByLabel('Character details');
        await expect(details).toBeVisible();
        await touchTarget(details);
        await touchTarget(
          hud.getByRole('link', { name: 'Activity Level 1', exact: true }),
        );
        const box = await hud.boundingBox();
        expect(box!.height, `${path} closed HUD height`).toBeLessThan(
          quest ? (width === 320 ? 260 : 240) : 190,
        );
        expect(
          (await page.locator('#rpg-main-content').boundingBox())!.y,
        ).toBeLessThan(width === 320 ? 290 : 270);
        await expect(
          hud.getByText('Code Knights', { exact: true }),
        ).not.toBeVisible();
      } else {
        await expect(hud.getByLabel('Character details')).toHaveCount(0);
        await expect(
          hud.getByText('Code Knights', { exact: true }),
        ).toBeVisible();
      }
      await expect(
        page
          .getByRole('navigation', { name: 'RPG primary navigation' })
          .getByRole('link'),
      ).toHaveText(['Home', 'Campaign', 'Focus', 'Awards', 'Insights']);
      await noOverflow(page);
    }

    // Immersive sessions/tracks intentionally live outside RpgShell.
    for (const path of ['/rpg/micro', '/rpg/track/utviklerblikk']) {
      await page.goto(path);
      await expect(hud).toHaveCount(0);
    }

    await page.goto('/rpg/map');
    await expect(hud.getByText('Alex', { exact: true })).toBeVisible();
    if (width < 672) {
      const summary = hud.getByLabel('Character details');
      await summary.focus();
      await page.keyboard.press('Enter');
      await expect(hud.locator('details')).toHaveAttribute('open');
      for (const text of [
        'New Learner',
        'Code Knights',
        'Generalist',
        'CS Foundations',
      ]) {
        await expect(hud.getByText(text, { exact: true })).toBeVisible();
        await expect(hud.getByText(text, { exact: true })).toHaveCount(1);
      }
      await expect(hud.getByText(/Programme: CS50x/)).toBeVisible();
      await expect(
        hud.getByText('Week 0: Scratch / 2h 30m', { exact: true }),
      ).toBeVisible();
      for (const theme of ['dark', 'light']) {
        await page.evaluate((selected) => {
          (
            globalThis as unknown as {
              document: {
                documentElement: {
                  setAttribute(name: string, value: string): void;
                };
              };
            }
          ).document.documentElement.setAttribute('data-theme', selected);
        }, theme);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await hud.screenshot({
          path: `artifacts/mobile-hud-expanded-${width}-${theme}.png`,
        });
        await noOverflow(page);
      }
      await summary.focus();
      await page.keyboard.press('Space');
      await expect(hud.locator('details')).not.toHaveAttribute('open');
      await expect(summary).toBeFocused();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
    await hud.getByRole('link', { name: 'Start quest', exact: true }).click();
    await expect(page).toHaveURL(/\/rpg\/resource\/week-0-lecture$/);
    await hud.getByRole('link', { name: 'Open Settings', exact: true }).click();
    await expect(page).toHaveURL(/\/rpg\/settings$/);
    await hud
      .getByRole('link', { name: 'Activity Level 1', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Activity', exact: true }),
    ).toBeVisible();
    await hud
      .getByRole('link', { name: 'Open Hero Profile', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Hero Profile', exact: true }),
    ).toBeVisible();
    await expect(hud).toHaveCount(0);
    await expect(
      page
        .getByRole('region', { name: 'Learner identity and progression' })
        .getByText('Code Knights', { exact: true }),
    ).toBeVisible();
  });
}

test('mobile HUD reflows for enlarged text and a long programme identity', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await completeOnboarding(page, { programme: 'Programvareutvikling' });
  await page.goto('/rpg/movement');
  const hud = page.getByRole('region', { name: 'Persistent hero HUD' });
  await expect(
    hud.getByRole('link', { name: 'Aktivitetsnivå 1', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    (
      globalThis as unknown as {
        document: { documentElement: { style: { fontSize: string } } };
      }
    ).document.documentElement.style.fontSize = '200%';
  });
  await noOverflow(page);
  const copy = await hud.locator('.rpg-hero-hud__quest-copy').boundingBox();
  const action = await hud
    .getByRole('link', { name: 'Start quest', exact: true })
    .boundingBox();
  const hudBox = await hud.boundingBox();
  expect(copy!.width).toBeGreaterThan(hudBox!.width * 0.7);
  expect(action!.y).toBeGreaterThanOrEqual(copy!.y + copy!.height);
  for (const link of [
    'Open Hero Profile',
    'Open Settings',
    'Aktivitetsnivå 1',
    'Start quest',
  ]) {
    await hud.getByRole('link', { name: link, exact: true }).focus();
    await expect(
      hud.getByRole('link', { name: link, exact: true }),
    ).toBeFocused();
    await touchTarget(hud.getByRole('link', { name: link, exact: true }));
  }
  await hud.getByLabel('Character details').focus();
  await page.keyboard.press('Enter');
  await expect(hud.getByText(/Programme: Programvareutvikling/)).toBeVisible();
  await expect(hud.locator('.rpg-identity__path dd')).toBeVisible();
  await expect(hud.locator('.rpg-identity__path dd')).toHaveText(
    'Programvareutvikling 1',
  );
  await noOverflow(page);
  const clipped = await hud
    .locator(
      '.rpg-hero-hud__detail-content p, .rpg-hero-hud__detail-content dd, .rpg-hero-hud__detail-content .rpg-rank-badge',
    )
    .evaluateAll((elements) =>
      elements
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .map((element) => element.textContent),
    );
  expect(clipped).toEqual([]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await hud.screenshot({
    path: 'artifacts/mobile-hud-expanded-320-enlarged.png',
  });
  await hud
    .locator('.rpg-hero-hud__detail-content')
    .screenshot({ path: 'artifacts/mobile-hud-details-320-enlarged.png' });
  await page.keyboard.press('Space');
  await expect(hud.locator('details')).not.toHaveAttribute('open');
  await hud.screenshot({
    path: 'artifacts/mobile-hud-closed-320-enlarged.png',
  });
});
