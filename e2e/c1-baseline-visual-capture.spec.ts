import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * Epic C / C1 retained visual baseline — CAPTURE ONLY (no comparison).
 *
 * Implements C0_VISUAL_PRESERVATION_PLAN.md sections 4-5: fixed clock,
 * synthetic learner state produced through the real UI, both viewports,
 * full-page captures, animations disabled, no running Focus timer. RPG surfaces
 * are captured in BOTH themes because rpg-components.css and rpg-shell.css
 * consume the Classic --color-* tokens that change under data-theme='dark'.
 *
 * States:
 * - fresh: onboarded through the real onboarding form, no progress;
 * - progressed: fresh + `week-0-lecture` marked complete through the RPG
 *   resource "Mark locally complete" control (real XP/unlock write path), so
 *   the badge gallery shows one earned (First Step) and fifteen locked badges.
 *
 * The retained baseline is only the run from the clean evidence-harness
 * commit H; captures from any other run are disposable.
 */

interface FontScope {
  document: { fonts: { ready: Promise<unknown> } };
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
  { heading: 'RPG Hub', path: '/rpg', shell: 'rpg', surface: 'hub' },
  { heading: 'Campaign Map', path: '/rpg/map', shell: 'rpg', surface: 'map' },
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
