import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

// Browser globals for code that runs in the page (the E2E project has no DOM lib).
declare function getComputedStyle(element: unknown): {
  color: string;
  fontWeight: string;
};

/**
 * Hero Profile accomplishments and identity hierarchy (owner request
 * 2026-10-10), in a real browser with synthetic data only: the three newest
 * earned badges of the active programme with their artwork, the way to the
 * gallery by keyboard, Guild, Class and Path values with equal emphasis and
 * muted labels, long path names wrapping without overflow, and a persistent
 * HUD that stays free of badges.
 */

async function seedUnlocks(
  page: Page,
  rows: ReadonlyArray<readonly [string, number]>,
) {
  await page.evaluate(`new Promise((resolve, reject) => {
    const rows = ${JSON.stringify(rows)};
    const request = indexedDB.open('progresspal-cs50-edition');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(['achievement_unlocks'], 'readwrite');
      for (const [achievementId, day] of rows) {
        const at = new Date(Date.UTC(2026, 9, day, 9, 0, 0)).toISOString();
        transaction.objectStore('achievement_unlocks').add({
          id: 'seed-unlock-' + achievementId, createdAt: at, updatedAt: at,
          achievementId, unlockedAt: at, triggerSourceId: 'synthetic-seed',
        });
      }
      transaction.oncomplete = () => { database.close(); resolve(undefined); };
      transaction.onerror = () => reject(transaction.error);
    };
  })`);
}

for (const width of [320, 390, 672, 673, 1280]) {
  test(`Hero Profile shows recent badges and an even identity at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: width >= 1280 ? 900 : 800 });
    await completeOnboarding(page, { programme: 'Programvareutvikling' });
    await seedUnlocks(page, [
      ['first-step', 1],
      ['p2-code-reader', 4],
      ['p2-error-reader', 2],
      ['p2-foundation-checkpoint', 3],
      // Earned in CS50x: not in this programme's catalogue.
      ['pointer-survivor', 9],
    ]);
    await page.goto('/rpg/hero');

    const heading = page.getByRole('heading', {
      level: 2,
      name: 'Recent badges',
    });
    await expect(heading).toBeVisible();
    const panel = page.locator('section.rpg-panel').filter({ has: heading });
    const items = panel.getByRole('listitem');

    // Newest first: p2-code-reader (day 4), p2-foundation-checkpoint (day 3),
    // p2-error-reader (day 2); First Step (day 1) is the fourth and not shown.
    await expect(items).toHaveText([
      'Read Before You Run',
      'Run, Fix, Commit',
      'Trace the Bug',
    ]);
    // Every miniature's artwork has loaded (inlined or a same-origin file).
    await expect
      .poll(() =>
        panel
          .locator('img.rpg-achievement-art')
          .evaluateAll(
            (images) =>
              images.filter(
                (image) =>
                  (image as unknown as { naturalWidth: number }).naturalWidth >
                  0,
              ).length,
          ),
      )
      .toBe(3);

    // Guild, Class and Path values read alike; their labels are muted.
    const identity = page.locator('.rpg-hero__identity .rpg-identity__traits');
    const styleOf = (selector: string) =>
      identity.locator(selector).evaluate((element) => {
        const style = getComputedStyle(element);
        return { color: style.color, weight: style.fontWeight };
      });
    const guild = await styleOf('.rpg-identity__guild dd');
    const pathValue = await styleOf('.rpg-identity__path dd');
    const pathLabel = await styleOf('.rpg-identity__path dt');

    expect(await styleOf('.rpg-identity__class dd')).toEqual(guild);
    expect(pathValue).toEqual(guild);
    expect(pathLabel.color).not.toBe(pathValue.color);

    const overflow = (await page.evaluate(
      'document.documentElement.scrollWidth - document.documentElement.clientWidth',
    )) as number;
    const panelBox = await page.locator('.rpg-hero__identity').boundingBox();
    const pathBox = await identity
      .locator('.rpg-identity__path dd')
      .boundingBox();

    expect(overflow).toBeLessThanOrEqual(0);
    expect(pathBox!.x + pathBox!.width).toBeLessThanOrEqual(
      panelBox!.x + panelBox!.width,
    );

    const axe = await new AxeBuilder({ page }).include('.rpg-hero').analyze();
    expect(axe.violations).toEqual([]);

    // The gallery is one keyboard step away.
    await panel.getByRole('link', { name: 'View all badges' }).focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Achievements' }),
    ).toBeVisible();
    expect(page.url()).toMatch(/\/rpg\/badges$/);

    // The persistent HUD stays as it was: no badge art, no badge names.
    await page.goto('/rpg/map');
    const hud = page.getByRole('region', { name: 'Persistent hero HUD' });
    await expect(hud).toBeVisible();
    await expect(hud.locator('.rpg-achievement-art')).toHaveCount(0);
    await expect(hud).not.toContainText('Read Before You Run');
  });
}

test('Hero Profile says where badges will appear before any is earned', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await completeOnboarding(page, { programme: 'Programvareutvikling' });
  await page.goto('/rpg/hero');

  const heading = page.getByRole('heading', {
    level: 2,
    name: 'Recent badges',
  });
  await expect(heading).toBeVisible();
  const panel = page.locator('section.rpg-panel').filter({ has: heading });

  await expect(panel.getByRole('listitem')).toHaveCount(0);
  await expect(panel).toContainText('The badges you earn will appear here.');
  await expect(
    panel.getByRole('link', { name: 'View all badges' }),
  ).toBeVisible();
});
