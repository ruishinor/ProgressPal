import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * Learner feedback 2026-10-08, in a real browser (synthetic data only):
 * LF-014 a stage change from far down a long stage, and LF-016 the reward
 * notice while the page is scrolled.
 */

type ScrollScope = {
  scrollY: number;
  scrollBy: (x: number, y: number) => void;
};

const scrollY = (page: Page) =>
  page.evaluate(() => (globalThis as unknown as ScrollScope).scrollY);

async function startOnProgrammeTwo(page: Page) {
  await completeOnboarding(page, { programme: 'Programvareutvikling' });
}

test('Neste etappe from far down a long stage lands on the new stage, focused', async ({
  page,
}) => {
  await startOnProgrammeTwo(page);
  await page.goto('/rpg/resource/s1-m01-o03');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const next = page.getByRole('button', { name: 'Neste etappe' });

  await next.scrollIntoViewIfNeeded();
  const before = await scrollY(page);

  expect(before).toBeGreaterThan(2_000);
  await next.click();

  const heading = page.getByText(/^Etappe 2 av 2/);

  await expect(heading).toBeVisible();
  await expect(page.locator(':focus')).toContainText('Etappe 2 av 2');
  await expect(heading).toBeInViewport({ ratio: 1 });

  const box = await heading.boundingBox();

  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeLessThan(200);
  expect(await scrollY(page)).toBeLessThan(before - 1_000);
});

test('a level-up shows inside the viewport while the page is scrolled far down', async ({
  page,
}) => {
  await startOnProgrammeTwo(page);
  // Synthetic: 97 XP already in this programme's ledger, so the next correct
  // answer crosses the Level 2 threshold at 100.
  await page.evaluate(`new Promise((resolve, reject) => {
    const request = indexedDB.open('progresspal-cs50-edition');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(['xp_transactions'], 'readwrite');
      const now = new Date().toISOString();
      transaction.objectStore('xp_transactions').add({
        id: 'seed-xp-1', createdAt: now, updatedAt: now,
        sourceType: 'exercise_solved', sourceId: 'seed-xp-1', xp: 97,
        reason: 'synthetic seed', awardedAt: now,
        programmeId: 'programvareutvikling',
      });
      transaction.oncomplete = () => { database.close(); resolve(undefined); };
      transaction.onerror = () => reject(transaction.error);
    };
  })`);
  await page.goto('/rpg/resource/s1-m01-o01');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const card = page.getByRole('group', { name: /^Oppgave 3 · / });

  await card.scrollIntoViewIfNeeded();
  await card.getByLabel(/Du har ikke lagret filen etter endringen/).check();
  await page.evaluate(() =>
    (globalThis as unknown as ScrollScope).scrollBy(0, 300),
  );
  expect(await scrollY(page)).toBeGreaterThan(2_000);
  await card.getByRole('button', { name: 'Sjekk svaret' }).click();

  const notice = page
    .getByTestId('reward-notice-region')
    .getByRole('status')
    .filter({ hasText: 'Level up! Level 2' });

  await expect(notice).toBeInViewport({ ratio: 1 });
});
