import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * Follow-up 2026-10-11, in a real browser with synthetic data only: on
 * Programvareutvikling a Campaign module node opens its module at the task it
 * leads to (scrolled into view, focused, not under the fixed navigation), and
 * "Continue learning" opens the lesson. Keyboard, Back and a reload included.
 */

const firstTask = /^Open resource: /;

/** The focused element is fully in view and is what a tap on its centre hits. */
async function expectFocusedTaskReachable(page: Page) {
  const focused = page.locator(':focus');

  await expect(focused).toHaveAccessibleName(firstTask);
  expect(
    await focused.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const view = element.ownerDocument.defaultView!;
      const hit = element.ownerDocument.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );

      return (
        box.top >= 0 &&
        box.bottom <= view.innerHeight &&
        hit !== null &&
        element.contains(hit)
      );
    }),
  ).toBe(true);
}

for (const width of [320, 390, 1280]) {
  test(`Campaign nodes and Continue open their destination at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: width >= 1280 ? 800 : 740 });
    await completeOnboarding(page, { programme: 'Programvareutvikling' });
    await page.goto('/rpg/map');

    // Continue learning opens the lesson, and Back returns to the map.
    const continueLink = page.getByRole('link', { name: 'Continue learning' });

    await expect(continueLink).toHaveAttribute(
      'href',
      '/rpg/resource/s1-m01-o01',
    );
    await continueLink.click();
    await expect(page).toHaveURL(/\/rpg\/resource\/s1-m01-o01$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/rpg\/map$/);

    // A module node, by keyboard, opens its module at the task, focused.
    const node = page
      .getByTestId('rpg-module-s1-m02')
      .getByRole('link', { name: /^Open / });

    await node.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/rpg\/week\/s1-m02#s1-m02-o01$/);
    await expectFocusedTaskReachable(page);
    await expect(page.locator(':focus')).toHaveAttribute(
      'href',
      '/rpg/resource/s1-m02-o01',
    );

    // Back and forward, and a reload of the deep link, land there again.
    await page.goBack();
    await expect(page).toHaveURL(/\/rpg\/map$/);
    await page.goForward();
    await expectFocusedTaskReachable(page);
    await page.reload();
    await expectFocusedTaskReachable(page);

    // The module overview stays one click away, without a task target.
    await page.goto('/rpg/week/s1-m02');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate('window.scrollY')).toBe(0);
  });
}
