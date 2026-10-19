import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * Epic D layout contract for the RPG primary navigation: in normal document
 * flow above the mobile breakpoint, fixed to the usable viewport bottom at
 * 42rem (672px) and below, with clearance that exists only where the
 * navigation is actually fixed. These tests observe computed geometry and real
 * scrolling; screenshots elsewhere are review evidence, not assertions.
 */

type StyleScope = {
  getComputedStyle: (element: unknown) => Record<string, string>;
};

type ScrollScope = {
  document: { documentElement: { scrollHeight: number; scrollWidth: number } };
  innerHeight: number;
  innerWidth: number;
  scrollY: number;
};

const rpgRoutes = {
  awards: { heading: 'Achievements', path: '/rpg/badges' },
  hero: { heading: 'Hero Profile', path: '/rpg/hero' },
  hub: { heading: 'Home', path: '/rpg' },
  insights: { heading: 'Insights', path: '/rpg/log' },
  map: { heading: 'Campaign', path: '/rpg/map' },
  settings: { heading: 'Settings', path: '/rpg/settings' },
} as const;

async function readStyles(locator: Locator, properties: readonly string[]) {
  return locator.evaluate((element, names) => {
    const scope = globalThis as unknown as StyleScope;
    const style = scope.getComputedStyle(element);

    return Object.fromEntries(names.map((name) => [name, style[name]]));
  }, properties);
}

async function readPx(locator: Locator, property: string) {
  return Number.parseFloat((await readStyles(locator, [property]))[property]!);
}

async function readScroll(page: Page) {
  return page.evaluate(() => {
    const scope = globalThis as unknown as ScrollScope;

    return {
      documentHeight: scope.document.documentElement.scrollHeight,
      overflow: scope.document.documentElement.scrollWidth - scope.innerWidth,
      scrollY: scope.scrollY,
      viewportHeight: scope.innerHeight,
    };
  });
}

function primaryNav(page: Page) {
  return page.getByRole('navigation', { name: 'RPG primary navigation' });
}

async function openRoute(page: Page, route: { heading: string; path: string }) {
  await page.goto(route.path);
  await expect(
    page.getByRole('heading', { exact: true, name: route.heading }),
  ).toBeVisible({ timeout: 15000 });
}

async function box(locator: Locator, label: string) {
  const result = await locator.boundingBox();

  expect(result, `${label} bounding box`).not.toBeNull();

  return result!;
}

const flowViewports = [
  { height: 900, width: 768 },
  { height: 800, width: 1024 },
  { height: 900, width: 1280 },
] as const;

for (const viewport of flowViewports) {
  test(`primary navigation sits in normal document flow at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await completeOnboarding(page);

    for (const route of [
      rpgRoutes.map,
      rpgRoutes.awards,
      rpgRoutes.hero,
      rpgRoutes.settings,
    ]) {
      await openRoute(page, route);

      const nav = primaryNav(page);
      const main = page.locator('#rpg-main-content');
      const utility = page.getByRole('navigation', {
        name: 'RPG utility navigation',
      });
      const hud = page.getByRole('region', { name: 'Persistent hero HUD' });
      const label = `${route.path} at ${viewport.width}px`;

      expect(['fixed', 'sticky'], `${label} navigation position`).not.toContain(
        (await readStyles(nav, ['position'])).position,
      );

      const navBox = await box(nav, `${label} navigation`);
      const mainBox = await box(main, `${label} main`);
      // The Hero route intentionally has no persistent HUD; there the one
      // Settings launch is the utility bar, elsewhere the HUD's gear.
      const contentTop =
        route === rpgRoutes.hero
          ? mainBox.y
          : (await box(hud, `${label} HUD`)).y;

      if (route === rpgRoutes.hero) {
        const utilityBox = await box(utility, `${label} utility`);

        // Visual order matches DOM order: utility, navigation, main.
        expect(
          utilityBox.y + utilityBox.height,
          `${label} utility`,
        ).toBeLessThanOrEqual(navBox.y + 1);
      } else {
        await expect(utility, `${label} utility`).toHaveCount(0);
        const gear = hud.getByRole('link', { name: 'Open Settings' });
        const gearBox = await box(gear, `${label} Settings gear`);
        const hudBox = await box(hud, `${label} HUD`);

        // Inside the HUD, at its top-right, and a full touch target.
        expect(gearBox.x + gearBox.width).toBeLessThanOrEqual(
          hudBox.x + hudBox.width + 1,
        );
        expect(gearBox.x).toBeGreaterThan(hudBox.x + hudBox.width / 2);
        expect(gearBox.y).toBeGreaterThanOrEqual(hudBox.y - 1);
        expect(gearBox.y).toBeLessThan(hudBox.y + 24);
        expect(gearBox.width).toBeGreaterThanOrEqual(44);
        expect(gearBox.height).toBeGreaterThanOrEqual(44);
      }
      await expect(
        page.getByRole('link', { name: 'Open Settings' }),
        `${label} one Settings launch`,
      ).toHaveCount(1);
      await expect(
        page.getByRole('link', { name: 'Open Settings' }),
      ).toBeVisible();
      // Visual order matches DOM order: navigation, HUD, main.
      expect(
        navBox.y + navBox.height,
        `${label} navigation overlap`,
      ).toBeLessThanOrEqual(contentTop + 1);
      expect(contentTop, `${label} content`).toBeLessThanOrEqual(mainBox.y + 1);
      expect(navBox.width, `${label} navigation width`).toBeGreaterThan(
        viewport.width * 0.8,
      );

      // No bottom-navigation clearance is reserved where nothing is fixed.
      expect(await readPx(main, 'paddingBottom'), `${label} main padding`).toBe(
        0,
      );
      expect(
        await readPx(page.locator('html'), 'scrollPaddingBottom'),
        `${label} scroll padding`,
      ).toBe(16);
      expect(
        (await readScroll(page)).overflow,
        `${label} overflow`,
      ).toBeLessThanOrEqual(1);
    }
  });
}

test('primary navigation scrolls away with the page instead of floating over content', async ({
  page,
}) => {
  const viewport = { height: 800, width: 1280 };
  await page.setViewportSize(viewport);
  await completeOnboarding(page);
  await openRoute(page, rpgRoutes.map);

  const nav = primaryNav(page);
  const initial = await box(nav, 'initial navigation');
  const before = await readScroll(page);

  expect(before.documentHeight).toBeGreaterThan(before.viewportHeight + 1000);

  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.mouse.wheel(0, 1500);
  await expect
    .poll(async () => (await readScroll(page)).scrollY)
    .toBeGreaterThan(1000);

  const scrolled = await box(nav, 'scrolled navigation');
  const after = await readScroll(page);

  // The navigation moved up with the document and left the viewport entirely.
  expect(scrolled.y + after.scrollY).toBeCloseTo(initial.y + before.scrollY, 0);
  expect(scrolled.y + scrolled.height).toBeLessThanOrEqual(0);
});

test('short desktop pages keep the navigation and main content apart', async ({
  page,
}) => {
  await page.setViewportSize({ height: 1800, width: 1280 });
  await completeOnboarding(page);
  await openRoute(page, rpgRoutes.hero);

  const state = await readScroll(page);

  expect(state.documentHeight).toBeLessThanOrEqual(state.viewportHeight);

  const nav = await box(primaryNav(page), 'navigation');
  const main = await box(page.locator('#rpg-main-content'), 'main');

  expect(nav.y + nav.height).toBeLessThanOrEqual(main.y + 1);
  // The navigation is at the top of the page, not attached to the viewport end.
  expect(nav.y + nav.height).toBeLessThan(state.viewportHeight / 2);
});

test('desktop toasts keep the standard corner offset instead of reserving navigation space', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await completeOnboarding(page);
  await openRoute(page, rpgRoutes.settings);
  await page.getByRole('button', { name: 'Save local settings' }).click();
  await expect(page.getByText('Local profile saved')).toBeVisible();

  expect(await readPx(page.locator('.toast-stack'), 'bottom')).toBe(16);

  const toast = await box(page.locator('.toast'), 'toast');

  expect(Math.abs(900 - (toast.y + toast.height) - 16)).toBeLessThanOrEqual(1);
});

for (const width of [320, 390, 430]) {
  test(`mobile navigation stays fixed with clearance for content and toasts at ${width}px`, async ({
    page,
  }) => {
    const height = 800;
    await page.setViewportSize({ height, width });
    await completeOnboarding(page);
    await openRoute(page, rpgRoutes.settings);

    const nav = primaryNav(page);
    const main = page.locator('#rpg-main-content');
    const navBox = await box(nav, 'navigation');

    expect((await readStyles(nav, ['position'])).position).toBe('fixed');
    expect(Math.abs(height - (navBox.y + navBox.height))).toBeLessThanOrEqual(
      1,
    );
    // Content, keyboard-scroll padding and toasts clear the fixed navigation.
    expect(await readPx(main, 'paddingBottom')).toBeGreaterThanOrEqual(
      navBox.height - 1,
    );
    expect(
      await readPx(page.locator('html'), 'scrollPaddingBottom'),
    ).toBeGreaterThanOrEqual(navBox.height);

    await page.getByRole('button', { name: 'Save local settings' }).click();
    await expect(page.getByText('Local profile saved')).toBeVisible();

    const toast = await box(page.locator('.toast'), 'toast');

    expect(toast.y + toast.height).toBeLessThanOrEqual(navBox.y);
    expect((await readScroll(page)).overflow).toBeLessThanOrEqual(1);

    // Scrolling the document to its end leaves the last content above the nav.
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.wheel(0, 20000);
    await expect
      .poll(async () => {
        const state = await readScroll(page);

        return state.scrollY + state.viewportHeight;
      })
      .toBeGreaterThanOrEqual((await readScroll(page)).documentHeight - 1);

    const mainAtEnd = await box(main, 'main at document end');
    const navAtEnd = await box(nav, 'navigation at document end');
    const reservedSpace = await readPx(main, 'paddingBottom');

    expect(reservedSpace).toBeGreaterThanOrEqual(navAtEnd.height - 1);
    // The last real content (above the reserved padding) ends above the nav.
    expect(mainAtEnd.y + mainAtEnd.height - reservedSpace).toBeLessThanOrEqual(
      navAtEnd.y + 1,
    );
  });
}

const navStyleProperties = [
  'backgroundColor',
  'borderTopColor',
  'boxShadow',
  'color',
] as const;

for (const theme of ['dark', 'light'] as const) {
  for (const viewport of [
    { height: 844, width: 390 },
    { height: 900, width: 1280 },
  ]) {
    test(`only the current destination is visually selected at ${viewport.width}px in the ${theme} theme`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await completeOnboarding(page, { theme });

      const labels = ['Home', 'Campaign', 'Focus', 'Awards', 'Insights'];
      const styleOf = async (label: string) => {
        const link = primaryNav(page).getByRole('link', {
          exact: true,
          name: label,
        });
        const frame = link.locator('.rpg-primary-nav__icon-frame');

        return {
          link: await readStyles(link, navStyleProperties),
          iconFrame: await readStyles(frame, ['height', 'width']),
        };
      };

      for (const [route, current] of [
        [rpgRoutes.map, 'Campaign'],
        [rpgRoutes.hub, 'Home'],
        [rpgRoutes.insights, 'Insights'],
      ] as const) {
        await openRoute(page, route);
        await expect(
          primaryNav(page).locator('[aria-current="page"]'),
        ).toHaveCount(1);
        await expect(
          primaryNav(page).getByRole('link', { exact: true, name: current }),
        ).toHaveAttribute('aria-current', 'page');

        const styles = new Map<string, Awaited<ReturnType<typeof styleOf>>>();

        for (const label of labels) {
          styles.set(label, await styleOf(label));
        }

        const selected = styles.get(current)!;
        const inactive = labels.filter((label) => label !== current);

        // The selected link carries a solid indicator edge no inactive link has.
        expect(selected.link.boxShadow).not.toBe('none');

        for (const label of inactive) {
          const style = styles.get(label)!;

          // Inactive links (Hub included) are identical to each other...
          expect(style, `${label} while ${current} is current`).toEqual(
            styles.get(inactive[0]!),
          );
          // ...and the selected one differs in every cue that marks selection.
          expect(style.link.boxShadow).toBe('none');
          expect(style.link.backgroundColor).not.toBe(
            selected.link.backgroundColor,
          );
          expect(style.link.borderTopColor).not.toBe(
            selected.link.borderTopColor,
          );
          expect(style.link.color).not.toBe(selected.link.color);
        }
      }
    });
  }
}

test('the skip link, primary navigation and the HUD form a logical keyboard path', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await completeOnboarding(page);
  await openRoute(page, rpgRoutes.map);

  const stops = [
    'Skip to RPG content',
    'Home',
    'Campaign',
    'Focus',
    'Awards',
    'Insights',
  ];

  // Start from the document, as a fresh keyboard user would.
  await page.mouse.click(1, 1);

  for (const name of stops) {
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAccessibleName(name);

    // Every keyboard stop in the shell shows a visible focus indicator.
    const outline = await readStyles(page.locator(':focus'), [
      'outlineStyle',
      'outlineWidth',
    ]);

    expect(outline.outlineStyle, `${name} outline`).not.toBe('none');
    expect(Number.parseFloat(outline.outlineWidth!)).toBeGreaterThan(0);
  }

  // The persistent HUD follows the navigation, before the page content: the
  // avatar opens the Hero Profile, then its top-right Settings gear, then the
  // current-quest action. Each shows a visible focus indicator.
  for (const name of [
    'Open Hero Profile',
    'Open Settings',
    /^(Start|Continue) quest$/,
  ]) {
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAccessibleName(name);
    const outline = await readStyles(page.locator(':focus'), ['outlineStyle']);

    expect(outline.outlineStyle, `${String(name)} outline`).not.toBe('none');
  }
});

test('the skip link moves focus to the RPG main content', async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await completeOnboarding(page);
  await openRoute(page, rpgRoutes.map);
  await page.mouse.click(1, 1);

  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveAccessibleName(
    'Skip to RPG content',
  );
  await page.keyboard.press('Enter');
  await expect(page.locator('#rpg-main-content')).toBeFocused();
});

for (const theme of ['dark', 'light'] as const) {
  test(`mobile RPG routes with the fixed navigation pass axe in the ${theme} theme`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await completeOnboarding(page, { theme });

    for (const route of [rpgRoutes.hub, rpgRoutes.map, rpgRoutes.settings]) {
      await openRoute(page, route);
      await expect(page.locator('.rpg-hero-hud__name')).toHaveText('Alex');

      const scan = await new AxeBuilder({ page }).analyze();

      expect(scan.violations, `${route.path} axe violations`).toEqual([]);
    }
  });
}

const hudIdentityText = [
  'Alex',
  'Rank:',
  'New Learner',
  'Guild',
  'Code Knights',
  'Class',
  'Generalist',
  'Path',
  'CS Foundations',
  'Level',
] as const;

for (const viewport of [
  { height: 700, width: 320 },
  { height: 800, width: 360 },
  { height: 844, width: 390 },
  { height: 900, width: 430 },
  { height: 900, width: 768 },
  { height: 900, width: 1280 },
]) {
  test(`the compact HUD keeps every data field and its route rules at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await completeOnboarding(page);

    const hud = page.getByRole('region', { name: 'Persistent hero HUD' });

    // Quest routes: identity, level, XP and the Current quest with its action.
    await openRoute(page, rpgRoutes.map);
    await expect(hud.getByText('Alex', { exact: true })).toBeVisible();

    for (const text of hudIdentityText) {
      await expect(hud.getByText(text, { exact: true }).first()).toBeVisible();
    }

    await expect(hud.getByText('0 / 100 XP to Level 2')).toBeVisible();
    await expect(
      hud.getByRole('progressbar', { name: /XP progress to level 2/i }),
    ).toBeVisible();
    await expect(hud.getByText('Current quest', { exact: true })).toBeVisible();
    await expect(hud.getByText('Lecture 0: Scratch')).toBeVisible();
    await expect(hud.getByText(/^Up to \+\d+ XP$/)).toBeVisible();
    await expect(hud.getByText(/^Week 0: Scratch \/ /)).toBeVisible();
    await expect(
      hud.getByRole('link', { name: 'Start quest', exact: true }),
    ).toHaveAttribute('href', '/rpg/resource/week-0-lecture');

    const hudBox = await box(hud, 'HUD');

    expect(hudBox.x).toBeGreaterThanOrEqual(0);
    expect(hudBox.x + hudBox.width).toBeLessThanOrEqual(viewport.width);
    expect((await readScroll(page)).overflow).toBeLessThanOrEqual(1);

    // Existing inclusion rules: no Current quest on Hub, Focus or resources.
    for (const path of [
      rpgRoutes.hub.path,
      '/rpg/focus',
      '/rpg/resource/week-0-lecture',
    ]) {
      await page.goto(path);
      await expect(hud.getByText('Alex', { exact: true })).toBeVisible();
      await expect(hud.getByText('Current quest')).toHaveCount(0);
      await expect(hud.getByRole('link', { name: /quest$/ })).toHaveCount(0);
    }

    // Hero keeps its persistent-HUD exclusion.
    await page.goto(rpgRoutes.hero.path);
    await expect(
      page.getByRole('heading', { exact: true, name: 'Hero Profile' }),
    ).toBeVisible();
    await expect(hud).toHaveCount(0);
  });
}
