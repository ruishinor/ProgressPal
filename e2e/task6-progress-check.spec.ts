import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * Task 6 (S1-M01-P05-E06) after the owner's 2026-10-10 review, in a real
 * browser with synthetic data only: the order is built, moved and checked so
 * far by keyboard alone, the two checks follow their rule, nothing is
 * written for them, and the card fits from 320 px to desktop, around the
 * 42rem breakpoint too.
 */

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

const evidenceCount = (page: Page) =>
  page.evaluate(`new Promise((resolve, reject) => {
    const request = indexedDB.open('progresspal-cs50-edition');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const count = database
        .transaction(['learner_evidence'], 'readonly')
        .objectStore('learner_evidence')
        .count();
      count.onsuccess = () => { database.close(); resolve(count.result); };
      count.onerror = () => reject(count.error);
    };
  })`) as Promise<number>;

for (const width of [320, 390, 672, 673, 1280]) {
  test(`Task 6 is built, moved and checked so far by keyboard and fits at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: width >= 1280 ? 800 : 740 });
    await completeOnboarding(page, { programme: 'Programvareutvikling' });
    await page.goto('/rpg/resource/s1-m01-o04');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const task = page.getByRole('group', { name: /^Oppgave 6 · / });
    const pool = task.getByRole('group', { name: 'Steg å plassere' });
    const check = task.getByRole('button', { name: 'Sjekk så langt' });

    await expect(
      task.getByRole('button', { name: 'Sjekk svaret' }),
    ).toBeEnabled();
    await expect(task).toContainText('Plassert: 0 av 10');
    await expect(check).toBeDisabled();

    // Places 2 and 3 swapped: two of the first four stand right.
    for (const step of ['Problem', 'Krav', 'Behov', 'Modellering']) {
      await pool.getByRole('button', { name: `Legg til: ${step}` }).focus();
      await page.keyboard.press('Enter');
    }
    await expect(task).toContainText('Plassert: 4 av 10');
    await check.focus();
    await page.keyboard.press('Enter');
    await expect(
      task.getByRole('status').filter({ hasText: /står riktig\./ }),
    ).toContainText('2 av 4 står riktig.');
    await expect(check).toBeDisabled();

    // Move Behov up one place by keyboard; focus stays on its control.
    await task.getByRole('button', { name: 'Flytt opp: Behov' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(':focus')).toHaveAccessibleName(
      /^Flytt (opp|ned): Behov$/,
    );
    await expect(
      task.getByRole('list', { name: 'Din rekkefølge' }).getByRole('listitem'),
    ).toHaveText([/^Problem/, /^Behov/, /^Krav/, /^Modellering/, 'Tom plass']);

    for (const step of ['Planlegging', 'Programmering', 'Testing']) {
      await pool.getByRole('button', { name: `Legg til: ${step}` }).focus();
      await page.keyboard.press(' ');
    }
    await expect(check).toBeEnabled();
    await check.focus();
    await page.keyboard.press(' ');
    await expect(task).toContainText('7 av 7 står riktig.');
    await expect(check).toBeDisabled();
    await expect(task).toContainText('Begge sjekkene er brukt.');
    // No step or place is ever named by a check, and nothing was stored.
    await expect(task.getByText('Riktig plass', { exact: true })).toHaveCount(
      0,
    );
    expect(await evidenceCount(page)).toBe(0);

    const axe = await new AxeBuilder({ page })
      .include(
        '[role="group"][aria-labelledby]:has([aria-label="Din rekkefølge"])',
      )
      .analyze();

    expect(axe.violations).toEqual([]);

    const overflow = (await page.evaluate(
      'document.documentElement.scrollWidth - document.documentElement.clientWidth',
    )) as number;

    expect(overflow).toBeLessThanOrEqual(0);

    const card = await task.boundingBox();
    const controls = await task
      .getByRole('button', { name: /^(Flytt (opp|ned)|Fjern): / })
      .evaluateAll((elements) =>
        elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right };
        }),
      );

    expect(card).not.toBeNull();
    // One right-hand column: every row's last action ends at the same edge.
    const removeEdges = await task
      .getByRole('button', { name: /^Fjern: / })
      .evaluateAll((elements) =>
        elements.map((element) =>
          Math.round(element.getBoundingClientRect().right),
        ),
      );

    expect(new Set(removeEdges).size).toBe(1);
    for (const control of controls) {
      expect(control.left).toBeGreaterThanOrEqual(card!.x);
      expect(control.right).toBeLessThanOrEqual(card!.x + card!.width);
    }

    // The scored action stays reachable above the fixed navigation: focusing
    // it brings it into view, and it is what a tap on its centre hits.
    const submit = task.getByRole('button', { name: 'Sjekk svaret' });

    await submit.focus();
    expect(
      await submit.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const hit = element.ownerDocument.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );

        return hit !== null && element.contains(hit);
      }),
    ).toBe(true);

    // The scored answer still needs all ten and is evaluated once.
    for (const step of steps.slice(7)) {
      await pool.getByRole('button', { name: `Legg til: ${step}` }).click();
    }
    await task.getByRole('button', { name: 'Sjekk svaret' }).click();
    await expect(task.getByRole('status', { name: 'Resultat' })).toContainText(
      'Riktig',
    );
    expect(await evidenceCount(page)).toBe(2);
  });
}
