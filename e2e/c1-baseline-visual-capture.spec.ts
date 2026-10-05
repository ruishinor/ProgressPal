import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * Epic C / C1 retained visual baseline — CAPTURE ONLY (no comparison).
 *
 * Implements C0_VISUAL_PRESERVATION_PLAN.md sections 4-5: fixed clock,
 * synthetic learner state produced through the real UI, both viewports,
 * full-page captures, animations disabled, no running Focus timer. The one
 * learner theme preference is app-wide (owner decision, C1 theme repair), so
 * every Classic AND RPG surface is captured in light and dark. Before each RPG
 * capture the computed RPG canvas token and body background are asserted, so
 * a capture labelled light cannot silently render the dark RPG palette.
 *
 * States:
 * - fresh: onboarded through the real onboarding form, no progress;
 * - progressed: fresh + `week-0-lecture` marked complete through the RPG
 *   resource "Mark locally complete" control (real XP/unlock write path), so
 *   the badge gallery shows one earned (First Step) and fifteen locked badges.
 *
 * No retained corrected C1 baseline run is currently authorized. A retained
 * capture needs separate authorization after owner acceptance and must bind
 * the exact accepted candidate commit; every other run, including review-only
 * runs, is disposable and non-retained. A successful capture is not visual
 * acceptance.
 */

interface FontScope {
  document: { fonts: { ready: Promise<unknown> } };
}

interface CanvasScope {
  document: { body: unknown };
  getComputedStyle(element: unknown): {
    backgroundColor: string;
    getPropertyValue(name: string): string;
  };
}

/** Accepted dark RPG canvas (rpg-tokens.css); kept exact. */
const rpgDarkCanvas = { background: 'rgb(17, 25, 35)', token: '#111923' };

/** WCAG relative luminance of a computed `rgb(r, g, b)` colour. */
function rgbLuminance(value: string) {
  const [r, g, b] = (value.match(/\d+(\.\d+)?/g) ?? [])
    .slice(0, 3)
    .map((part) => {
      const c = Number(part) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

const captureDirectory = path.resolve(
  'artifacts/epic-c1-visual-baseline/captures',
);
const fixedTime = new Date('2026-09-19T12:00:00.000Z');

const viewports = [
  { height: 844, label: '390', width: 390 },
  { height: 900, label: '1280', width: 1280 },
] as const;
const themes = ['light', 'dark'] as const;

type Surface = {
  heading: string;
  path: string;
  shell: 'classic' | 'rpg';
  surface: string;
  ready?: (page: Page) => Promise<void>;
};

const freshSurfaces: readonly Surface[] = [
  { heading: 'Home', path: '/rpg', shell: 'rpg', surface: 'hub' },
  { heading: 'Campaign', path: '/rpg/map', shell: 'rpg', surface: 'map' },
];

const progressedSurfaces: readonly Surface[] = [
  ...freshSurfaces,
  {
    heading: 'Week 0: Scratch',
    path: '/rpg/week/week-0',
    ready: async (page) => {
      await expect(
        page.getByText('Building the RPG week from local progress.'),
      ).toHaveCount(0);
    },
    shell: 'rpg',
    surface: 'module-week-0',
  },
  {
    heading: 'Lecture 0: Scratch',
    path: '/rpg/resource/week-0-lecture',
    ready: async (page) => {
      await expect(
        page.getByText('Completed before slice logging', { exact: false }),
      ).toBeVisible();
    },
    shell: 'rpg',
    surface: 'resource-week-0-lecture',
  },
  {
    heading: 'Focus',
    path: '/rpg/focus?itemId=week-0-lecture',
    ready: async (page) => {
      await expect(page.locator('.rpg-focus__selected-task')).toContainText(
        'Lecture 0: Scratch',
      );
    },
    shell: 'rpg',
    surface: 'focus',
  },
  { heading: 'Hero Profile', path: '/rpg/hero', shell: 'rpg', surface: 'hero' },
  {
    heading: 'Achievements',
    path: '/rpg/badges',
    ready: async (page) => {
      await expect(
        page
          .getByTestId('achievement-first-step')
          .getByText('Earned', { exact: true }),
      ).toBeVisible();
    },
    shell: 'rpg',
    surface: 'badges',
  },
  { heading: 'Insights', path: '/rpg/log', shell: 'rpg', surface: 'log' },
  {
    heading: 'Settings',
    path: '/rpg/settings',
    shell: 'rpg',
    surface: 'settings',
  },
  {
    heading: 'Dashboard',
    path: '/dashboard',
    shell: 'classic',
    surface: 'dashboard',
  },
  {
    heading: 'Course Map',
    path: '/course',
    shell: 'classic',
    surface: 'course',
  },
  {
    heading: 'Week 0: Scratch - Problem Set 0: Scratch',
    path: '/course/week-0-problem-set',
    ready: async (page) => {
      await expect(page.getByTestId('item-guide-card')).toBeVisible();
      await expect(
        page.locator('a[href^="https://cs50.harvard.edu/"]').first(),
      ).toBeVisible();
    },
    shell: 'classic',
    surface: 'content-week-0-problem-set',
  },
  {
    heading: 'Achievements',
    path: '/achievements',
    shell: 'classic',
    surface: 'achievements',
  },
  {
    heading: 'Settings',
    path: '/settings',
    shell: 'classic',
    surface: 'settings',
  },
];

async function capture(
  page: Page,
  surface: Surface,
  state: 'fresh' | 'progressed',
  viewportLabel: string,
  theme: (typeof themes)[number],
) {
  await page.goto(surface.path);
  await expect(
    page.getByRole('heading', { exact: true, name: surface.heading }).first(),
  ).toBeVisible();
  await surface.ready?.(page);
  await expect(page.locator('.loading-state')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  if (surface.shell === 'rpg') {
    await expect(page.locator('body')).toHaveClass(/rpg-route-active/);
    const canvas = await page.evaluate(() => {
      const scope = globalThis as unknown as CanvasScope;
      const style = scope.getComputedStyle(scope.document.body);
      return {
        background: style.backgroundColor,
        token: style.getPropertyValue('--rpg-bg').trim(),
      };
    });
    if (theme === 'dark') {
      expect(canvas).toEqual(rpgDarkCanvas);
    } else {
      // The light candidate is provisional until owner visual acceptance, so
      // it is guarded structurally: a genuinely light RPG canvas.
      expect(rgbLuminance(canvas.background)).toBeGreaterThan(0.7);
      expect(canvas.token).not.toBe(rpgDarkCanvas.token);
    }
  }
  await page.evaluate(async () => {
    await (globalThis as unknown as FontScope).document.fonts.ready;
  });
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
    path: path.join(
      captureDirectory,
      `${viewportLabel}-${surface.shell}-${surface.surface}-${state}-${theme}.png`,
    ),
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

for (const theme of themes) {
  for (const viewport of viewports) {
    test(`captures the C1 baseline at ${viewport.label}px in the ${theme} theme`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await mkdir(captureDirectory, { recursive: true });
      await page.clock.install({ time: fixedTime });
      await page.setViewportSize({
        height: viewport.height,
        width: viewport.width,
      });
      await completeOnboarding(page, { theme });

      for (const surface of freshSurfaces) {
        await capture(page, surface, 'fresh', viewport.label, theme);
      }

      await markWeekZeroLectureComplete(page);

      for (const surface of progressedSurfaces) {
        await capture(page, surface, 'progressed', viewport.label, theme);
      }
    });
  }
}
