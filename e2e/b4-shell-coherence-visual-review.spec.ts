import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

const visualReviewDirectory = path.resolve(
  'artifacts/b4-phase-4-visual-review',
);

const primaryViewports = [
  { height: 844, label: '390', width: 390 },
  { height: 900, label: '1280', width: 1280 },
] as const;

const changedSurfaces = [
  {
    fileName: 'focus-progressed',
    heading: 'Focus',
    path: '/rpg/focus?itemId=week-0-lecture',
  },
  {
    fileName: 'hero-progressed',
    heading: 'Hero Profile',
    path: '/rpg/hero',
  },
  {
    fileName: 'awards-progressed',
    heading: 'Achievements',
    path: '/rpg/badges',
  },
  {
    fileName: 'insights-progressed',
    heading: 'Insights',
    path: '/rpg/log',
  },
  {
    fileName: 'settings',
    heading: 'Settings',
    path: '/rpg/settings',
  },
] as const;

async function prepareProgressedRpgState(page: Page) {
  await page.clock.install({ time: new Date('2026-09-19T12:00:00.000Z') });
  await completeOnboarding(page);
  await page.goto('/rpg/resource/week-0-lecture');
  await expect(
    page.getByRole('heading', { exact: true, name: 'Lecture 0: Scratch' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Mark locally complete' }).click();
  await expect(page.getByText('Local status: Completed')).toBeVisible();
}

async function prepareSurfaceForCapture(page: Page, fileName: string) {
  if (fileName === 'focus-progressed') {
    await expect(page.locator('.rpg-focus__selected-task')).toContainText(
      'Lecture 0: Scratch',
    );
    await page.locator('#live-session-mode').selectOption('debugging');
    await page.getByRole('button', { name: 'Start live session' }).click();
    await expect(page.locator('.sessions-timer__value')).toHaveText('00:00');
    await expect(
      page.locator('.sessions-timer').getByText('Running', { exact: true }),
    ).toBeVisible();
    return;
  }

  if (fileName === 'awards-progressed') {
    await expect(
      page
        .getByTestId('achievement-first-step')
        .getByText('Earned', { exact: true }),
    ).toBeVisible();
    return;
  }

  if (fileName === 'insights-progressed') {
    await page.locator('summary').filter({ hasText: 'XP over time' }).click();
    await page
      .locator('summary')
      .filter({ hasText: 'Recorded completion awards' })
      .click();
    await expect(
      page.getByRole('heading', { exact: true, name: 'XP over time' }),
    ).toBeVisible();
    return;
  }

  if (fileName === 'settings') {
    await expect(
      page.getByRole('heading', { exact: true, name: 'Interface' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { exact: true, name: 'Open Classic interface' }),
    ).toBeVisible();
  }
}

for (const viewport of primaryViewports) {
  for (const surface of changedSurfaces) {
    test(`captures ${viewport.label}px ${surface.heading} for B4 shell coherence review`, async ({
      page,
    }) => {
      await mkdir(visualReviewDirectory, { recursive: true });
      await page.setViewportSize({
        height: viewport.height,
        width: viewport.width,
      });
      await prepareProgressedRpgState(page);
      await page.goto(surface.path);
      await expect(
        page.getByRole('heading', { exact: true, name: surface.heading }),
      ).toBeVisible();
      await prepareSurfaceForCapture(page, surface.fileName);
      await page.screenshot({
        fullPage: true,
        path: path.join(
          visualReviewDirectory,
          `${viewport.label}-rpg-${surface.fileName}.png`,
        ),
      });
    });
  }
}
