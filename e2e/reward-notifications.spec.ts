import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * Transient reward notices (level up, achievement earned) in the production
 * build: they follow genuine award saves only, present once each, sit clear of
 * the fixed mobile RPG navigation, never shift layout or take pointer input,
 * and keep their feedback when motion is reduced. Synthetic data only.
 */

type PresentedScope = { __presentedRewardNotices: string[] };
type StyleScope = {
  getComputedStyle: (element: unknown) => Record<string, string>;
};
type ScrollScope = {
  document: { documentElement: { scrollWidth: number } };
  innerWidth: number;
};

// Each document records every reward notice element inserted into it, so a
// replay, duplicate or remount is an extra entry.
async function recordPresentedNotices(page: Page) {
  await page.addInitScript(`
    window.__presentedRewardNotices = [];
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.classList && node.classList.contains('reward-notice')) {
            window.__presentedRewardNotices.push(node.textContent ?? '');
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  `);
}

function presentedNotices(page: Page) {
  return page.evaluate(
    () =>
      (globalThis as unknown as PresentedScope).__presentedRewardNotices ?? [],
  );
}

async function startAsDefaultLearner(page: Page) {
  await page.goto('/');
  await page.getByRole('radio', { name: /CS50x/ }).check();
  await page.getByRole('button', { name: 'Use default learner' }).click();
  await expect(
    page.getByRole('heading', { name: 'Home', exact: true }),
  ).toBeVisible();
}

async function markResourceComplete(page: Page, itemId: string) {
  await page.goto(`/rpg/resource/${itemId}`);
  const button = page.getByRole('button', { name: 'Mark locally complete' });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(
    page.locator('.rpg-study-resource__save-result').getByText(/XP awarded/),
  ).toBeVisible();
}

const notice = (page: Page) =>
  page.getByTestId('reward-notice-region').getByRole('status');

async function readNoticeMotion(page: Page) {
  return notice(page).evaluate((element) => {
    const style = (globalThis as unknown as StyleScope).getComputedStyle(
      element,
    );
    return {
      animationDuration: style.animationDuration,
      animationName: style.animationName,
    };
  });
}

test('a crossed level and a first achievement present once over the RPG shell at mobile width', async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await recordPresentedNotices(page);
  await startAsDefaultLearner(page);

  const before = await page.evaluate(() => {
    const scope = globalThis as unknown as ScrollScope;
    return {
      scrollWidth: scope.document.documentElement.scrollWidth,
      innerWidth: scope.innerWidth,
    };
  });

  // +40 XP (level 1) and First Step.
  await markResourceComplete(page, 'week-0-lecture');
  await expect(notice(page)).toHaveText('Achievement earned First Step');
  await expect(notice(page)).toHaveAttribute('data-reward-kind', 'achievement');
  expect(await readNoticeMotion(page)).toEqual({
    animationDuration: '0.26s',
    animationName: 'reward-notice-enter',
  });
  await expect(
    notice(page).locator('.reward-notice__art .rpg-achievement-art'),
  ).toBeVisible();

  const geometry = (await page.evaluate(`(() => {
    const noticeElement = document.querySelector('.reward-notice');
    const box = noticeElement.getBoundingClientRect();
    const navBox = document
      .querySelector('.rpg-primary-nav')
      .getBoundingClientRect();
    const hit = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );

    return {
      hitIsNotice: hit !== null && noticeElement.contains(hit),
      navTop: navBox.top,
      noticeBottom: box.bottom,
      noticeLeft: box.left,
      noticeRight: box.right,
      noticeTop: box.top,
      scrollWidth: document.documentElement.scrollWidth,
    };
  })()`)) as {
    hitIsNotice: boolean;
    navTop: number;
    noticeBottom: number;
    noticeLeft: number;
    noticeRight: number;
    noticeTop: number;
    scrollWidth: number;
  };
  // Top of the viewport, fully on screen, clear of the fixed bottom nav, and
  // transparent to pointer input.
  expect(geometry.noticeTop).toBeGreaterThanOrEqual(0);
  expect(geometry.noticeLeft).toBeGreaterThanOrEqual(0);
  expect(geometry.noticeRight).toBeLessThanOrEqual(before.innerWidth);
  expect(geometry.noticeBottom).toBeLessThan(geometry.navTop);
  expect(geometry.hitIsNotice).toBe(false);
  expect(geometry.scrollWidth).toBe(before.scrollWidth);

  // Contrast and semantics with the notice settled on screen (light theme).
  await page.waitForTimeout(400);
  const axe = await new AxeBuilder({ page })
    .include('[data-testid="reward-notice-region"]')
    .analyze();
  expect(axe.violations).toEqual([]);

  await expect(notice(page)).toHaveCount(0, { timeout: 5_000 });

  // +40 XP (80 total): no level boundary, no new achievement.
  await markResourceComplete(page, 'week-1-lecture');
  await page.waitForTimeout(500);
  await expect(notice(page)).toHaveCount(0);
  expect(await presentedNotices(page)).toEqual([]);

  // +40 XP crosses 100 XP: level 2.
  await markResourceComplete(page, 'week-2-lecture');
  await expect(notice(page)).toHaveText('Level up! Level 2');
  await expect(notice(page)).toHaveAttribute('data-reward-kind', 'level-up');
  // In-app navigation while it shows neither restarts nor duplicates it.
  await page.getByRole('link', { name: 'Open Hero Profile' }).click();
  await expect(
    page.getByRole('heading', { name: 'Hero Profile', exact: true }),
  ).toBeVisible();
  await expect(notice(page)).toHaveCount(0, { timeout: 5_000 });
  expect(await presentedNotices(page)).toEqual(['Level up! Level 2']);

  // Reload: the rewards are persisted state now, never replayed as events.
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Hero Profile', exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(500);
  await expect(notice(page)).toHaveCount(0);
  expect(await presentedNotices(page)).toEqual([]);
});

test('Classic saves present the same notice, without translation under OS reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await recordPresentedNotices(page);
  await startAsDefaultLearner(page);
  await page.goto('/course/week-0-lecture');
  await page.getByLabel(/^(Progress|Status)/).selectOption('completed');
  await page.getByRole('button', { name: 'Save progress' }).click();

  await expect(notice(page)).toHaveText('Achievement earned First Step');
  await expect(notice(page)).toHaveCSS('opacity', '1');
  await expect(notice(page)).toHaveCSS('transform', 'none');
  expect((await readNoticeMotion(page)).animationName).toBe(
    'reward-notice-fade-in',
  );
  // Classic keeps its artwork-free presentation.
  await expect(notice(page).locator('.reward-notice__art')).toBeHidden();
  // The notice stays readable for its hold time, then leaves on its own.
  await page.waitForTimeout(2_000);
  await expect(notice(page)).toBeVisible();
  await expect(notice(page)).toHaveCount(0, { timeout: 5_000 });
  expect(await presentedNotices(page)).toEqual([
    'Achievement earned First Step',
  ]);
});

test('an RPG Focus session save presents its achievement once beside the page feedback, under the in-app reduce-motion setting', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-06-12T08:00:00.000Z') });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await recordPresentedNotices(page);
  // Dark theme with "Reduce motion in this app" checked.
  await completeOnboarding(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await page.goto('/rpg/focus?itemId=week-0-lecture');
  await page.locator('#live-session-mode').selectOption('debugging');
  await page.getByRole('button', { name: 'Start live session' }).click();
  await page.clock.fastForward('25:00');
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page
    .getByRole('button', { name: 'Save study session', exact: true })
    .click();

  const feedback = page.locator('.rpg-focus__save-result');
  await expect(
    feedback.getByText('Achievement unlocked: Bug Hunter'),
  ).toBeVisible();
  await expect(notice(page)).toHaveText('Achievement earned Bug Hunter');
  expect((await readNoticeMotion(page)).animationName).toBe(
    'reward-notice-fade-in',
  );
  await expect(notice(page)).toHaveCSS('transform', 'none');
  const axe = await new AxeBuilder({ page })
    .include('[data-testid="reward-notice-region"]')
    .analyze();
  expect(axe.violations).toEqual([]);

  await page.clock.fastForward('00:05');
  await expect(notice(page)).toHaveCount(0);
  expect(await presentedNotices(page)).toEqual([
    'Achievement earned Bug Hunter',
  ]);
});
