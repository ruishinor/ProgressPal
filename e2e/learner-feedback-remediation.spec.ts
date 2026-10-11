import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * Learner feedback 2026-10-08, in a real browser (synthetic data only):
 * LF-014 a stage change from far down a long stage, LF-016 the reward notice
 * while the page is scrolled, LF-023/024/026 the ordering and matching tasks by
 * keyboard and at narrow widths, and LF-029 the end of a lesson.
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
  // Synthetic: 49 XP already in this programme's ledger, so the next correct
  // answer (a choice task, 6 XP) lands on Programme #2's Level 2 threshold
  // at 55 (its own curve since 2026-10-11).
  await page.evaluate(`new Promise((resolve, reject) => {
    const request = indexedDB.open('progresspal-cs50-edition');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(['xp_transactions'], 'readwrite');
      const now = new Date().toISOString();
      transaction.objectStore('xp_transactions').add({
        id: 'seed-xp-1', createdAt: now, updatedAt: now,
        sourceType: 'exercise_solved', sourceId: 'seed-xp-1', xp: 49,
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

const steps = [
  'Problem',
  'Behov',
  'Krav',
  'Modellering',
  'Planlegging',
  'Programmering',
  'Testing',
  'Forbedring',
  'Dokumentasjon',
  'Presentasjon',
];

for (const width of [1280, 390, 320]) {
  test(`Task 6 and Task 7 work by keyboard, mark the wrong places and fit at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: width === 1280 ? 800 : 700 });
    await startOnProgrammeTwo(page);
    await page.goto('/rpg/resource/s1-m01-o04');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const task = page.getByRole('group', { name: /^Oppgave 6 · / });
    const pool = task.getByRole('group', { name: 'Steg å plassere' });
    const submit = task.getByRole('button', { name: 'Sjekk svaret' });

    await expect(submit).toBeEnabled();
    // Steps 3 and 4 swapped: pick by keyboard, Enter on the focused button.
    const attempt = [...steps];
    [attempt[2], attempt[3]] = [attempt[3]!, attempt[2]!];
    for (const step of attempt) {
      const button = pool.getByRole('button', { name: `Legg til: ${step}` });

      await button.focus();
      await page.keyboard.press('Enter');
      // Focus stays in the pool (or on the list when the pool is empty).
      await expect(page.locator(':focus')).not.toHaveJSProperty(
        'tagName',
        'BODY',
      );
    }
    await submit.focus();
    await page.keyboard.press('Enter');
    await expect(task.getByRole('status', { name: 'Resultat' })).toContainText(
      'Ikke riktig ennå',
    );
    await expect(task.getByText('Feil plass', { exact: true })).toHaveCount(2);
    await expect(task.getByText('Riktig plass', { exact: true })).toHaveCount(
      8,
    );

    const axe = await new AxeBuilder({ page })
      .include('[aria-label="Din rekkefølge"]')
      .analyze();

    expect(axe.violations).toEqual([]);

    await task.getByRole('button', { name: 'Prøv igjen' }).click();
    await expect(pool.getByRole('button')).toHaveCount(2);
    await pool.getByRole('button', { name: 'Legg til: Krav' }).click();
    await pool.getByRole('button', { name: 'Legg til: Modellering' }).click();
    await task.getByRole('button', { name: 'Sjekk svaret' }).click();
    await expect(task.getByRole('status', { name: 'Resultat' })).toContainText(
      'Riktig',
    );

    // Task 7 is a different interaction: one option per answer, no repeats.
    const match = page.getByRole('group', { name: /^Oppgave 7 · / });
    const first = match.getByRole('combobox').first();
    const second = match.getByRole('combobox').nth(1);

    await expect(match).toBeVisible();
    await first.selectOption({ index: 1 });
    const chosen = await first.inputValue();

    await expect(second.locator(`option[value="${chosen}"]`)).toBeDisabled();

    const overflow = (await page.evaluate(
      'document.documentElement.scrollWidth - document.documentElement.clientWidth',
    )) as number;

    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('the end of a lesson names the next lesson and the link opens it', async ({
  page,
}) => {
  await startOnProgrammeTwo(page);
  await page.goto('/rpg/resource/s1-m01-o04');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const next = page.getByRole('region', { name: 'Slik går du videre' });

  await expect(next).toContainText('4 av 12');
  await next.getByRole('link', { name: 'Les og forutsi kode' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Les og forutsi kode' }),
  ).toBeVisible();
  expect(page.url()).toMatch(/\/rpg\/resource\/s1-m01-o05$/);
});
