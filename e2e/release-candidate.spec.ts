import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

const routeChecks = [
  { heading: 'Local profile for Alex', path: '/profile' },
  { heading: 'Dashboard', path: '/dashboard' },
  { heading: 'Course Map', path: '/course' },
  { heading: 'Log Lecture', path: '/course/week-0-lecture' },
  { heading: 'Study sessions', path: '/sessions' },
  { heading: 'Achievements', path: '/achievements' },
  { heading: 'Insights', path: '/insights' },
  { heading: 'Settings', path: '/settings' },
  { heading: 'Home', path: '/rpg' },
  { heading: 'Campaign Map', path: '/rpg/map' },
  { heading: 'Week 4: Memory', path: '/rpg/week/week-4' },
  { heading: 'Lecture 0: Scratch', path: '/rpg/resource/week-0-lecture' },
  { heading: 'Live focus session', path: '/rpg/focus' },
  { heading: 'Hero Profile', path: '/rpg/hero' },
  { heading: 'Achievements', path: '/rpg/badges' },
  { heading: 'Insights', path: '/rpg/log' },
  { heading: 'Settings', path: '/rpg/settings' },
] as const;

const viewportChecks = [
  { height: 568, name: 'small-mobile', width: 320 },
  { height: 844, name: 'mobile', width: 390 },
  { height: 1024, name: 'tablet', width: 768 },
  { height: 800, name: 'small-desktop', width: 1024 },
  { height: 900, name: 'desktop', width: 1440 },
] as const;

type BrowserLayoutScope = {
  document: { documentElement: { scrollWidth: number } };
  innerWidth: number;
};

async function expectNoHorizontalOverflow(page: Page, route: string) {
  const overflow = await page.evaluate(() => {
    const scope = globalThis as unknown as BrowserLayoutScope;

    return scope.document.documentElement.scrollWidth - scope.innerWidth;
  });

  expect(overflow, `${route} horizontal overflow`).toBeLessThanOrEqual(2);
}

for (const viewport of viewportChecks) {
  test(`release-candidate routes fit ${viewport.name} viewport`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: {
        height: viewport.height,
        width: viewport.width,
      },
    });
    const page = await context.newPage();
    const consoleIssues: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        consoleIssues.push(message.text());
      }
    });

    await completeOnboarding(page);

    for (const route of routeChecks) {
      await page.goto(route.path);
      await expect(
        page.getByRole('heading', { exact: true, name: route.heading }),
      ).toBeVisible({ timeout: 15000 });

      if (route.path === '/rpg/focus') {
        // The route owns the page-level h1; focus cards follow beneath it.
        await expect(
          page.getByRole('heading', {
            exact: true,
            level: 1,
            name: 'Focus',
          }),
        ).toBeVisible();
      }

      await expectNoHorizontalOverflow(page, route.path);
      await expect(page).toHaveURL(route.path);
    }

    expect(consoleIssues).toEqual([]);
    await context.close();
  });
}
