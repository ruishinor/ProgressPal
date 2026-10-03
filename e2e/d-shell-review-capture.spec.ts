import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * Epic D review capture — CAPTURE ONLY (no comparison, no golden baseline).
 *
 * Produces the same screenshots and shell-geometry records for the Epic D base
 * and candidate so a reviewer can compare them. `D_CAPTURE_LABEL` names the
 * output set (`baseline` or `candidate`); a capture is not visual acceptance.
 * Owner visual acceptance remains a separate evidence class.
 */

const captureLabel = process.env.D_CAPTURE_LABEL ?? 'unlabelled';
const captureDirectory = path.resolve('artifacts/epic-d-review', captureLabel);
const fixedTime = new Date('2026-09-19T12:00:00.000Z');
const specName = 'e2e/d-shell-review-capture.spec.ts';

const viewports = [
  { height: 844, label: '390', width: 390 },
  { height: 900, label: '1280', width: 1280 },
] as const;
const themes = ['light', 'dark'] as const;

type Surface = {
  heading: string;
  path: string;
  state: 'fresh' | 'progressed';
  surface: string;
};

const freshSurfaces: readonly Surface[] = [
  { heading: 'Home', path: '/rpg', state: 'fresh', surface: 'hub' },
];

const progressedSurfaces: readonly Surface[] = [
  { heading: 'Home', path: '/rpg', state: 'progressed', surface: 'hub' },
  {
    heading: 'Campaign Map',
    path: '/rpg/map',
    state: 'progressed',
    surface: 'map',
  },
  {
    heading: 'Focus',
    path: '/rpg/focus?itemId=week-0-lecture',
    state: 'progressed',
    surface: 'focus',
  },
  {
    heading: 'Hero Profile',
    path: '/rpg/hero',
    state: 'progressed',
    surface: 'hero',
  },
  {
    heading: 'Achievements',
    path: '/rpg/badges',
    state: 'progressed',
    surface: 'awards',
  },
  {
    heading: 'Insights',
    path: '/rpg/log',
    state: 'progressed',
    surface: 'insights',
  },
  {
    heading: 'Settings',
    path: '/rpg/settings',
    state: 'progressed',
    surface: 'settings',
  },
];

type GeometryRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

type GeometryElement = {
  compareDocumentPosition: (other: GeometryElement) => number;
  getBoundingClientRect: () => GeometryRect;
  querySelectorAll: (selector: string) => ArrayLike<GeometryElement>;
};

type GeometryScope = {
  document: {
    documentElement: { scrollHeight: number; scrollWidth: number };
    querySelector: (selector: string) => GeometryElement | null;
  };
  getComputedStyle: (element: GeometryElement) => {
    paddingBottom: string;
    position: string;
  };
  innerHeight: number;
  innerWidth: number;
};

type ShellGeometry = {
  currentDestinations: number;
  documentHeight: number;
  horizontalOverflow: number;
  hud: GeometryRect | null;
  main: (GeometryRect & { paddingBottom: number }) | null;
  nav: (GeometryRect & { position: string }) | null;
  navPrecedesHud: boolean | null;
  navPrecedesMain: boolean | null;
  utility: GeometryRect | null;
  viewportHeight: number;
  viewportWidth: number;
};

async function measureShellGeometry(page: Page): Promise<ShellGeometry> {
  return page.evaluate(() => {
    const scope = globalThis as unknown as GeometryScope;
    const round = (value: number) => Math.round(value * 100) / 100;
    const rectOf = (element: GeometryElement): GeometryRect => {
      const rect = element.getBoundingClientRect();

      return {
        bottom: round(rect.bottom),
        height: round(rect.height),
        left: round(rect.left),
        right: round(rect.right),
        top: round(rect.top),
        width: round(rect.width),
      };
    };
    const find = (selector: string) => scope.document.querySelector(selector);
    const follows = (
      first: GeometryElement | null,
      second: GeometryElement | null,
    ) =>
      first === null || second === null
        ? null
        : (first.compareDocumentPosition(second) & 4) !== 0;
    // Both class names are matched so the identical spec measures the Epic D
    // base (rpg-bottom-nav) and the candidate (rpg-primary-nav).
    const nav = find('nav.rpg-bottom-nav, nav.rpg-primary-nav');
    const hud = find('[aria-label="Persistent hero HUD"]');
    const main = find('#rpg-main-content');
    const utility = find('[aria-label="RPG utility navigation"]');
    const navStyle = nav === null ? null : scope.getComputedStyle(nav);
    const mainStyle = main === null ? null : scope.getComputedStyle(main);

    return {
      currentDestinations:
        nav?.querySelectorAll('[aria-current="page"]').length ?? 0,
      documentHeight: scope.document.documentElement.scrollHeight,
      horizontalOverflow:
        scope.document.documentElement.scrollWidth - scope.innerWidth,
      hud: hud === null ? null : rectOf(hud),
      main:
        main === null || mainStyle === null
          ? null
          : {
              ...rectOf(main),
              paddingBottom: Number.parseFloat(mainStyle.paddingBottom),
            },
      nav:
        nav === null || navStyle === null
          ? null
          : { ...rectOf(nav), position: navStyle.position },
      navPrecedesHud: follows(nav, hud),
      navPrecedesMain: follows(nav, main),
      utility: utility === null ? null : rectOf(utility),
      viewportHeight: scope.innerHeight,
      viewportWidth: scope.innerWidth,
    };
  });
}

async function markWeekZeroLectureComplete(page: Page) {
  await page.goto('/rpg/resource/week-0-lecture');
  await expect(
    page.getByRole('heading', { exact: true, name: 'Lecture 0: Scratch' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mark locally complete' }).click();
  await expect(page.getByText('Local status: Completed')).toBeVisible();
}

type CaptureRecord = {
  geometry: ShellGeometry;
  route: string;
  spec: string;
  state: Surface['state'];
  surface: string;
  theme: (typeof themes)[number];
  viewport: string;
  files: { fullPage: string; topOfPage: string };
};

async function capture(
  page: Page,
  surface: Surface,
  viewportLabel: string,
  theme: (typeof themes)[number],
): Promise<CaptureRecord> {
  await page.goto(surface.path);
  await expect(
    page.getByRole('heading', { exact: true, name: surface.heading }).first(),
  ).toBeVisible();
  await expect(page.locator('.loading-state')).toHaveCount(0);
  if (surface.surface === 'hero') {
    await expect(page.locator('.rpg-identity__name')).toHaveCount(1);
  } else {
    await expect(page.locator('.rpg-hero-hud__name')).toHaveText('Alex');
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.evaluate(async () => {
    await (
      globalThis as unknown as {
        document: { fonts: { ready: Promise<unknown> } };
      }
    ).document.fonts.ready;
  });

  const stem = `${viewportLabel}-rpg-${surface.surface}-${surface.state}-${theme}`;
  const geometry = await measureShellGeometry(page);

  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    path: path.join(captureDirectory, `${stem}-top.png`),
  });
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
    path: path.join(captureDirectory, `${stem}-full.png`),
  });

  return {
    files: { fullPage: `${stem}-full.png`, topOfPage: `${stem}-top.png` },
    geometry,
    route: surface.path,
    spec: specName,
    state: surface.state,
    surface: surface.surface,
    theme,
    viewport: viewportLabel,
  };
}

for (const theme of themes) {
  for (const viewport of viewports) {
    test(`captures the D shell review set at ${viewport.label}px in the ${theme} theme`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      await mkdir(captureDirectory, { recursive: true });
      await page.clock.install({ time: fixedTime });
      await page.setViewportSize({
        height: viewport.height,
        width: viewport.width,
      });
      await completeOnboarding(page, { theme });

      const records: CaptureRecord[] = [];

      for (const surface of freshSurfaces) {
        records.push(await capture(page, surface, viewport.label, theme));
      }

      await markWeekZeroLectureComplete(page);

      for (const surface of progressedSurfaces) {
        records.push(await capture(page, surface, viewport.label, theme));
      }

      await writeFile(
        path.join(captureDirectory, `records-${viewport.label}-${theme}.json`),
        `${JSON.stringify(records, null, 2)}\n`,
      );
    });
  }
}
