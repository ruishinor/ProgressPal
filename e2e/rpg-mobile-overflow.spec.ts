import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

const rpgRoutes = [
  { heading: 'RPG Hub', headerSelector: '.rpg-hub__header', path: '/rpg' },
  {
    heading: 'Campaign Map',
    headerSelector: '.rpg-map__header',
    path: '/rpg/map',
  },
  {
    heading: 'Focus',
    headerSelector: '.rpg-focus__header',
    path: '/rpg/focus',
  },
  {
    heading: 'Hero Profile',
    headerSelector: '.rpg-hero__header',
    path: '/rpg/hero',
  },
  {
    heading: 'Achievements',
    headerSelector: '.rpg-badges__header',
    path: '/rpg/badges',
  },
  {
    heading: 'Insights',
    headerSelector: '.rpg-log__header',
    path: '/rpg/log',
  },
  {
    heading: 'Settings',
    headerSelector: '.rpg-settings__header',
    path: '/rpg/settings',
  },
] as const;

const mobileViewports = [
  { height: 568, width: 320 },
  { height: 800, width: 360 },
  { height: 667, width: 375 },
  { height: 844, width: 390 },
  { height: 932, width: 430 },
] as const;

type BrowserLayoutScope = {
  document: { documentElement: { scrollWidth: number } };
  getComputedStyle: (element: unknown) => {
    backgroundColor: string;
    borderTopWidth: string;
    paddingBottom: string;
    paddingLeft: string;
    paddingRight: string;
  };
  innerWidth: number;
};

async function expectNoHorizontalOverflow(page: Page, route: string) {
  const overflow = await page.evaluate(() => {
    const scope = globalThis as unknown as BrowserLayoutScope;

    return scope.document.documentElement.scrollWidth - scope.innerWidth;
  });

  expect(overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(1);
}

async function expectReadableRpgHeaderSurface(
  page: Page,
  route: (typeof rpgRoutes)[number],
) {
  const header = page.locator(route.headerSelector).first();

  await expect(header, `${route.path} RPG header`).toBeVisible();

  await expect(
    header.getByRole('heading', { exact: true, name: route.heading }),
    `${route.path} route heading inside RPG header`,
  ).toBeVisible();

  const surface = await header.evaluate((element) => {
    const scope = globalThis as unknown as BrowserLayoutScope;
    const styles = scope.getComputedStyle(element);

    return {
      backgroundColor: styles.backgroundColor,
      borderTopWidth: styles.borderTopWidth,
      paddingLeft: styles.paddingLeft,
      paddingRight: styles.paddingRight,
    };
  });

  expect(surface.backgroundColor, `${route.path} header background`).not.toBe(
    'rgba(0, 0, 0, 0)',
  );
  expect(Number.parseFloat(surface.borderTopWidth)).toBeGreaterThan(0);
  expect(Number.parseFloat(surface.paddingLeft)).toBeGreaterThan(0);
  expect(Number.parseFloat(surface.paddingRight)).toBeGreaterThan(0);
}

for (const viewport of mobileViewports) {
  test(`RPG routes stay contained at ${viewport.width}px`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    await completeOnboarding(page);

    for (const route of rpgRoutes) {
      await page.goto(route.path);
      await expect(
        page.getByRole('heading', { exact: true, name: route.heading }),
      ).toBeVisible({ timeout: 15000 });
      await expectReadableRpgHeaderSurface(page, route);
      await expectNoHorizontalOverflow(page, route.path);
      await expect(
        page.getByRole('navigation', { name: 'RPG bottom navigation' }),
      ).toBeVisible();

      const bottomNav = page.getByRole('navigation', {
        name: 'RPG bottom navigation',
      });
      const navBox = await bottomNav.boundingBox();
      const mainBottomPadding = await page
        .locator('#rpg-main-content')
        .evaluate((element) => {
          const scope = globalThis as unknown as BrowserLayoutScope;

          return Number.parseFloat(
            scope.getComputedStyle(element).paddingBottom,
          );
        });

      expect(navBox, `${route.path} bottom navigation box`).not.toBeNull();
      expect(
        mainBottomPadding,
        `${route.path} reserved navigation space`,
      ).toBeGreaterThanOrEqual((navBox?.height ?? 0) - 1);
    }

    await context.close();
  });
}

test('mobile navigation keeps core routes direct and restores focus after More closes', async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await completeOnboarding(page);

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('link', { name: 'Open RPG' }).click();
  await expect(
    page.getByRole('heading', { exact: true, name: 'RPG Hub' }),
  ).toBeVisible();

  const bottomNav = page.getByRole('navigation', {
    name: 'RPG bottom navigation',
  });

  for (const label of ['Hub', 'Map', 'Focus', 'Hero']) {
    await expect(bottomNav.getByRole('link', { name: label })).toBeVisible();
  }

  const moreButton = bottomNav.getByRole('button', { name: 'More' });
  await expect(moreButton).toBeVisible();
  await moreButton.click();

  const moreDestinations = page.getByRole('region', {
    name: 'More RPG destinations',
  });

  await expect(moreDestinations).toBeVisible();
  await expect(
    moreDestinations.getByRole('link', { name: 'Awards' }),
  ).toBeFocused();
  await expect(
    moreDestinations.getByRole('link', { name: 'Open Classic dashboard' }),
  ).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(moreDestinations).not.toBeVisible();
  await expect(moreButton).toBeFocused();

  await moreButton.click();
  await moreDestinations
    .getByRole('link', { name: 'Open Classic dashboard' })
    .click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
});
