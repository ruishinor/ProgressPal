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

test('keyboard focus stays above the fixed RPG navigation in forms', async ({
  page,
}) => {
  await completeOnboarding(page);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [path, readyButton] of [
      ['/rpg/resource/week-4-lecture', 'Save progress'],
      ['/rpg/focus', 'Start live session'],
      ['/rpg/settings', 'Save local settings'],
    ] as const) {
      await page.goto(path);
      await expect(page.locator('.rpg-hero-hud__name')).toHaveText('Alex');
      await expect(
        page.getByRole('button', { exact: true, name: readyButton }),
      ).toBeVisible();
      const main = page.locator('#rpg-main-content');
      const disclosure = main.locator('summary').filter({
        hasText:
          path === '/rpg/focus'
            ? 'Log a past session manually'
            : 'More details',
      });
      if (path !== '/rpg/settings') {
        await disclosure.focus();
        await page.keyboard.press('Enter');
      }
      const controls = main
        .locator(
          'a[href], button, input, select, textarea, summary, [tabindex="0"]',
        )
        .filter({ visible: true });
      const expected = await controls.evaluateAll((elements) =>
        elements.flatMap((element, index) =>
          element.tabIndex >= 0 && !element.matches(':disabled') ? [index] : [],
        ),
      );
      expect(expected.length).toBeGreaterThan(0);
      await main.focus();
      const visited = new Set<number>();
      // Native datetime controls have several internal Tab stops. Require every
      // enabled control once, rather than counting repeated trips around the page.
      for (let tab = 0; tab < expected.length * 8; tab++) {
        await page.keyboard.press('Tab');
        const focus = await controls.evaluateAll((elements) => {
          const scope = globalThis as unknown as {
            document: {
              activeElement: unknown;
              querySelector: (selector: string) => {
                getBoundingClientRect: () => { top: number };
              } | null;
            };
          };
          const index = elements.findIndex(
            (element) => element === scope.document.activeElement,
          );
          const element = elements[index];
          const nav = scope.document
            .querySelector('.rpg-bottom-nav')
            ?.getBoundingClientRect();
          if (!element || !nav) return null;
          const rect = element.getBoundingClientRect();
          return { index, top: rect.top, bottom: rect.bottom, navTop: nav.top };
        });
        expect(
          focus,
          `${path} ${width}px Tab ${tab} left the form`,
        ).not.toBeNull();
        if (focus === null) break;
        visited.add(focus.index);
        expect(
          focus.top,
          `${path} ${width}px Tab ${tab} above viewport`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          focus.bottom,
          `${path} ${width}px Tab ${tab} covered by navigation`,
        ).toBeLessThanOrEqual(focus.navTop);
        if (visited.size === expected.length) break;
      }
      expect([...visited].sort((a, b) => a - b)).toEqual(expected);
    }
  }
});

type BrowserLayoutScope = {
  document: { documentElement: { scrollWidth: number } };
  getComputedStyle: (element: unknown) => {
    backgroundColor: string;
    borderTopWidth: string;
    paddingBottom: string;
    paddingLeft: string;
    paddingRight: string;
    position: string;
  };
  innerWidth: number;
  scrollY: number;
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
      const hud = page.getByRole('region', {
        name:
          route.path === '/rpg/hero'
            ? 'Learner identity and progression'
            : 'Persistent hero HUD',
      });
      for (const identity of [
        'New Learner',
        'Guild',
        'Code Knights',
        'Class',
        'Generalist',
        'Path',
        'CS Foundations',
        '0 / 100 XP to Level 2',
      ]) {
        await expect(hud.getByText(identity, { exact: true })).toBeVisible();
      }
      if (viewport.width === 390 && route.path !== '/rpg/hero') {
        expect((await hud.boundingBox())!.height).toBeLessThan(310);
      }
      await expect(
        page.getByRole('navigation', { name: 'RPG bottom navigation' }),
      ).toBeVisible();

      const bottomNav = page.getByRole('navigation', {
        name: 'RPG bottom navigation',
      });
      const navBox = await bottomNav.boundingBox();
      const navPosition = await bottomNav.evaluate((element) => {
        const scope = globalThis as unknown as BrowserLayoutScope;

        return scope.getComputedStyle(element).position;
      });
      const mainBottomPadding = await page
        .locator('#rpg-main-content')
        .evaluate((element) => {
          const scope = globalThis as unknown as BrowserLayoutScope;

          return Number.parseFloat(
            scope.getComputedStyle(element).paddingBottom,
          );
        });

      expect(navBox, `${route.path} bottom navigation box`).not.toBeNull();
      expect(navPosition, `${route.path} bottom navigation position`).toBe(
        'fixed',
      );
      expect(
        Math.abs(navBox?.x ?? Number.POSITIVE_INFINITY),
        `${route.path} bottom navigation left edge`,
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(viewport.width - ((navBox?.x ?? 0) + (navBox?.width ?? 0))),
        `${route.path} bottom navigation right edge`,
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(viewport.height - ((navBox?.y ?? 0) + (navBox?.height ?? 0))),
        `${route.path} bottom navigation bottom edge`,
      ).toBeLessThanOrEqual(1);
      expect(
        mainBottomPadding,
        `${route.path} reserved navigation space`,
      ).toBeGreaterThanOrEqual((navBox?.height ?? 0) - 1);
    }

    await context.close();
  });
}

test('mobile bottom navigation stays fixed during real document scroll', async ({
  page,
}) => {
  const viewport = { height: 844, width: 390 };
  await page.setViewportSize(viewport);
  await completeOnboarding(page);
  await page.goto('/rpg/settings');

  await expect(
    page.getByRole('heading', { exact: true, name: 'Settings' }),
  ).toBeVisible({ timeout: 15000 });

  const bottomNav = page.getByRole('navigation', {
    name: 'RPG bottom navigation',
  });
  await expect(bottomNav).toBeVisible();

  const initialNavBox = await bottomNav.boundingBox();
  expect(initialNavBox, 'initial bottom navigation box').not.toBeNull();

  await page.mouse.move(2, viewport.height / 2);
  await page.mouse.wheel(0, 2000);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const scope = globalThis as unknown as BrowserLayoutScope;
        return scope.scrollY;
      }),
    )
    .toBeGreaterThan(100);

  const scrolledNavBox = await bottomNav.boundingBox();
  expect(scrolledNavBox, 'scrolled bottom navigation box').not.toBeNull();
  expect(
    Math.abs(
      (scrolledNavBox?.y ?? Number.POSITIVE_INFINITY) - (initialNavBox?.y ?? 0),
    ),
    'bottom navigation stays at the same viewport Y position while scrolling',
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      viewport.height -
        ((scrolledNavBox?.y ?? 0) + (scrolledNavBox?.height ?? 0)),
    ),
    'bottom navigation remains attached to the viewport bottom after scrolling',
  ).toBeLessThanOrEqual(1);
});

test('mobile navigation keeps the six RPG destinations direct and moves Classic to Settings', async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await completeOnboarding(page);
  await page.goto('/rpg');

  await expect(
    page.getByRole('heading', { exact: true, name: 'RPG Hub' }),
  ).toBeVisible();

  const bottomNav = page.getByRole('navigation', {
    name: 'RPG bottom navigation',
  });

  for (const label of ['Map', 'Focus', 'Hero', 'Hub', 'Awards', 'Insights']) {
    await expect(bottomNav.getByRole('link', { name: label })).toBeVisible();
  }

  await expect(bottomNav.getByRole('button', { name: 'More' })).toHaveCount(0);
  await expect(
    bottomNav.getByRole('link', { name: /Tracker|Classic/i }),
  ).toHaveCount(0);
  await expect(bottomNav.getByRole('link', { name: 'Hub' })).toHaveClass(
    /rpg-bottom-nav__link--hub/,
  );

  await page.getByRole('link', { name: 'Open Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Interface' })).toBeVisible();
  await expect(page.getByLabel('Classic appearance')).toBeVisible();
  await page.getByRole('link', { name: 'Open Classic interface' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  const classicNav = page.getByRole('navigation', { name: 'Primary' });
  await expect(
    classicNav.getByRole('link', { name: 'Return to RPG' }),
  ).toBeVisible();

  await classicNav.getByRole('link', { name: 'Return to RPG' }).click();
  await expect(
    page.getByRole('heading', { exact: true, name: 'RPG Hub' }),
  ).toBeVisible();
});

test('mobile Hub puts the recommended quest before secondary progress', async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await completeOnboarding(page);
  await page.getByRole('link', { name: 'Open RPG' }).click();

  const questPanel = page.locator('.rpg-hub__quest-panel');

  await expect(
    questPanel.getByRole('heading', { name: 'Start with this quest' }),
  ).toBeVisible();
  await expect(questPanel.getByText('Recommended first quest')).toBeVisible();
  await expect(
    questPanel.getByRole('heading', { name: 'Lecture 0: Scratch' }),
  ).toBeInViewport();
  await expect(questPanel.locator('.rpg-hub__quest-meta')).toBeInViewport();
  await expect(
    questPanel.locator('.rpg-hub__quest-statuses').getByText('Not started'),
  ).toBeInViewport();
  await expect(
    questPanel.getByRole('link', { name: 'Start quest' }),
  ).toBeInViewport();
  await expect(
    page.getByRole('link', { name: 'Start quest', exact: true }),
  ).toHaveCount(1);
  await expect(page.getByText('Progress snapshot')).toBeVisible();
  await expect(page.getByText('Recent saved activity')).toHaveCount(0);
  await expect(page.locator('.rpg-hub__identity')).toHaveCount(0);
});

test('mobile campaign path reaches a Week task and its real resource action', async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await completeOnboarding(page);
  await page.goto('/rpg/map');

  const weekZeroModule = page.getByTestId('rpg-module-week-0');
  const continueLink = weekZeroModule.getByRole('link', {
    name: 'Continue learning',
  });

  await expect(
    weekZeroModule.getByRole('list', {
      name: 'Week 0: Scratch quest status',
    }),
  ).toBeVisible();
  await expect(continueLink).toHaveAttribute('href', '/rpg/week/week-0');
  await expect(continueLink).toHaveAttribute('aria-current', 'step');
  await expectNoHorizontalOverflow(page, '/rpg/map');
  await continueLink.click();
  await expect(
    page.getByRole('heading', { exact: true, name: 'Week 0: Scratch' }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, '/rpg/week/week-0');

  const resourceLink = page.getByRole('link', {
    name: 'Open resource: Lecture 0: Scratch',
  });

  await resourceLink.scrollIntoViewIfNeeded();
  await expect(resourceLink).toBeInViewport();
  await resourceLink.click();
  await expect(
    page.getByRole('heading', { exact: true, name: 'Lecture 0: Scratch' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/rpg\/resource\/week-0-lecture$/);
  await expectNoHorizontalOverflow(page, '/rpg/resource/week-0-lecture');
});
