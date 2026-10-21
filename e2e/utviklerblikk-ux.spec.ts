import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { completeOnboarding } from './support/onboarding';
type Tap = { group?: string; name: RegExp };
type Card = { kind: string; id: string; title: string };
const plansPath = '../tests/support/microlearningPlans';
const { needsCheck, rightTaps, wrongTaps } = (await import(plansPath)) as {
  needsCheck: (c: Card) => boolean;
  rightTaps: (c: Card) => Tap[];
  wrongTaps: (c: Card, n?: number) => Tap[];
};
const modulePath =
  '../src/programmes/programvareutvikling/microlearning/tenkSomEnUtvikler';
type Session = { id: string; title: string; cards: Card[] };
const { tenkSomEnUtviklerTrack: track } = (await import(modulePath)) as {
  tenkSomEnUtviklerTrack: {
    categories: { id: string; title: string; sessionIds: string[] }[];
    sessions: Session[];
  };
};
const inCategory = (id: string) =>
  track.categories
    .find((category) => category.id === id)!
    .sessionIds.map(
      (sessionId) => track.sessions.find((s) => s.id === sessionId)!,
    );
const generelt = inCategory('generelt');
type MatchData = Card & {
  leftLabel: string;
  rightLabel: string;
  pairs: { id: string; left: string; right: string }[];
};
type OrderData = Card & {
  correctOrder: string[];
  items: { id: string; label: string }[];
};
const base = '/rpg/track/tenk-som-en-utvikler',
  output = process.env.UX_SCREENSHOT_DIR;
const rows: unknown[] = [];
async function capture(page: Page, name: string) {
  if (output) {
    mkdirSync(output, { recursive: true });
    await page.locator('.micro').evaluate((el) => (el.scrollTop = 0));
    await page.screenshot({ path: join(output, name + '.png') });
  }
}
async function inspect(page: Page, label: string) {
  const result = await page.evaluate<{ problems: string[]; scroll: number }>(
    "(() => {\n    const shell = document.querySelector('.micro'), problems = [];\n    const visible = (el) => el.getClientRects().length > 0 &&\n        !el.closest('.sr-only,[hidden],[inert]') &&\n        getComputedStyle(el).display !== 'none';\n    if (document.scrollingElement.scrollHeight >\n        document.scrollingElement.clientHeight + 1)\n        problems.push('document scroll');\n    if (shell.scrollWidth > shell.clientWidth + 1)\n        problems.push('horizontal overflow');\n    for (const el of shell.querySelectorAll('*')) {\n        if (!visible(el))\n            continue;\n        const s = getComputedStyle(el), r = el.getBoundingClientRect();\n        if (['auto', 'scroll'].includes(s.overflowY))\n            problems.push('nested scroll ' + el.className);\n        if (['hidden', 'clip'].includes(s.overflowY) &&\n            el.scrollHeight > el.clientHeight + 2)\n            problems.push('vertical clipping ' + el.className);\n        if (['hidden', 'clip'].includes(s.overflowX) &&\n            el.scrollWidth > el.clientWidth + 2)\n            problems.push('horizontal clipping ' + el.className);\n        if (r.left < -1 || r.right > innerWidth + 1)\n            problems.push('outside width ' + el.className);\n    }\n    for (const el of shell.querySelectorAll('button,a,summary')) {\n        if (!visible(el))\n            continue;\n        const r = el.getBoundingClientRect();\n        if (r.width < 43.9 || r.height < 43.9)\n            problems.push('small target ' + el.textContent);\n    }\n    return {\n        problems,\n        scroll: shell.scrollHeight - shell.clientHeight,\n        feedback: shell\n            .querySelector('[role=status]')\n            ?.getAttribute('data-state'),\n    };\n})()",
  );
  rows.push({ label, ...result });
  expect(result.problems, label).toEqual([]);
  for (const control of await page
    .locator('.micro button:visible,.micro a:visible,.micro summary:visible')
    .all()) {
    await control.scrollIntoViewIfNeeded();
    const hit = await control.evaluate((el) => {
      const r = el.getBoundingClientRect(),
        doc = el.ownerDocument,
        height = doc.defaultView!.innerHeight;
      const target = doc.elementFromPoint(
        r.left + r.width / 2,
        (Math.max(r.top, 0) + Math.min(r.bottom, height)) / 2,
      );
      return {
        top: r.top,
        bottom: r.bottom,
        reachable: !!target && (target === el || el.contains(target)),
      };
    });
    const viewportHeight = page.viewportSize()!.height;
    if (hit.bottom - hit.top > viewportHeight) {
      // Only at enlarged text: a long answer (a set of criteria) can be taller
      // than the screen. Scrolled to, it must fill the screen, not clip.
      expect(hit.top, label).toBeLessThanOrEqual(1);
      expect(hit.bottom, label).toBeGreaterThanOrEqual(viewportHeight - 1);
    } else {
      expect(hit.top, label).toBeGreaterThanOrEqual(-1);
      expect(hit.bottom, label).toBeLessThanOrEqual(viewportHeight + 1);
    }
    expect(hit.reachable, label + ' hit test').toBe(true);
  }
}
async function action(page: Page, name: string) {
  await page.waitForTimeout(430);
  await page.getByRole('button', { name, exact: true }).click();
}
async function taps(page: Page, list: Tap[]) {
  for (const tap of list) {
    if (
      tap.group &&
      (await page.locator('.utviklerblikk-mobile-match').count()) &&
      !(await page
        .getByRole('group', { name: tap.group, exact: true })
        .isVisible())
    )
      await page
        .getByRole('group', { name: 'Startside for koblingen' })
        .getByRole('button', { name: tap.group, exact: true })
        .click();
    const scope = tap.group
      ? page.getByRole('group', { name: tap.group, exact: true })
      : page;
    await scope.getByRole('button', { name: tap.name }).click();
  }
}
async function openCard(page: Page, id: string) {
  const session = track.sessions.find((s) => s.cards.some((c) => c.id === id))!,
    index = session.cards.findIndex((c) => c.id === id);
  await page.goto(base);
  await page.evaluate(
    "((url) => history.replaceState({ ...history.state, usr: { microTrack: true } }, '', url))(" +
      JSON.stringify(
        base + '?aktivitet=' + session.id + '&kort=' + (index + 1),
      ) +
      ')',
  );
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    session.cards[index]!.title,
  );
  return session.cards[index]!;
}
async function tabTo(page: Page, name: RegExp) {
  const target = page.getByRole('button', { name });
  for (let n = 0; n < 30; n++) {
    if (
      (await target.count()) === 1 &&
      (await target.evaluate((el) => el === el.ownerDocument.activeElement))
    )
      return;
    await page.keyboard.press('Tab');
  }
  throw Error('Tab did not reach ' + name);
}
/**
 * Plays one activity from its category's list: every card, checked in every
 * state it reaches. `reveal` misses twice (the miss with its reason, the
 * hint, the answer shown); `right` answers first time.
 */
async function walkActivity(
  page: Page,
  session: Session,
  row: number,
  prefix: string,
  mode: 'reveal' | 'right' = 'reveal',
) {
  await action(page, row + '. ' + session.title);
  for (const card of session.cards) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      card.title,
    );
    await inspect(page, prefix + ' ' + card.id + ' idle');
    const shoot = [
      'tsu-a3-koble',
      'tsu-a5-rekkefolge',
      'tsu-a4-best',
      'tsu-kanban-k04-ny',
      'tsu-smidig-a04-ny',
      'tsu-smidig-a05-sporsmal',
    ].includes(card.id);
    if (shoot) await capture(page, prefix + '-' + card.id + '-idle');
    if (card.kind !== 'learn' && mode === 'right') {
      await taps(page, rightTaps(card));
      if (needsCheck(card)) await action(page, 'Sjekk');
      await expect(page.getByRole('status')).toHaveAttribute(
        'data-state',
        'correct',
      );
      await inspect(page, prefix + ' ' + card.id + ' correct');
      if (shoot) await capture(page, prefix + '-' + card.id + '-correct');
    } else if (card.kind !== 'learn') {
      await taps(page, wrongTaps(card));
      if (needsCheck(card)) await action(page, 'Sjekk');
      await expect(page.getByRole('status')).toHaveAttribute(
        'data-state',
        'incorrect',
      );
      await inspect(page, prefix + ' ' + card.id + ' wrong');
      if (shoot) await capture(page, prefix + '-' + card.id + '-wrong');
      await action(page, 'Prøv igjen');
      await inspect(page, prefix + ' ' + card.id + ' retry');
      if (shoot) await capture(page, prefix + '-' + card.id + '-retry');
      await taps(page, wrongTaps(card, 1));
      if (needsCheck(card)) await action(page, 'Sjekk');
      if (card.kind === 'order') {
        await expect(page.getByRole('status')).toHaveAttribute(
          'data-state',
          'incorrect',
        );
        await action(page, 'Vis løsning');
      }
      await expect(page.getByRole('status')).toHaveAttribute(
        'data-state',
        'revealed',
      );
      await inspect(page, prefix + ' ' + card.id + ' revealed');
      if (shoot) await capture(page, prefix + '-' + card.id + '-revealed');
    }
    if (['tsu-a1-ord', 'tsu-a2-typer', 'tsu-a6-scrum'].includes(card.id))
      await capture(page, prefix + '-' + card.id + '-learn');
    await action(
      page,
      card === session.cards[session.cards.length - 1] ? 'Fullfør' : 'Neste',
    );
  }
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Husk dette',
  );
  await inspect(page, prefix + ' ' + session.id + ' done');
  if (session.id === 'tsu-kravtyper') await capture(page, prefix + '-a2-done');
  await action(page, 'Velg en annen aktivitet');
}
test.afterAll(() => {
  if (output) mkdirSync(output, { recursive: true });
  if (output)
    writeFileSync(
      join(output, 'measurements-' + test.info().workerIndex + '.json'),
      JSON.stringify(rows, null, 2),
    );
});

for (const viewport of [
  { width: 320, height: 568 },
  { width: 360, height: 560 },
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
  { width: 360, height: 560, scale: 150 },
  { width: 360, height: 560, scale: 200 },
]) {
  test(
    'Utviklerblikk reachable matrix ' +
      viewport.width +
      'x' +
      viewport.height +
      (viewport.scale ? ' ' + viewport.scale + '%' : ''),
    async ({ page }) => {
      test.setTimeout(420000);
      await page.setViewportSize(viewport);
      await completeOnboarding(page, { programme: 'Programvareutvikling' });
      await page.goto(base);
      if (viewport.scale) {
        const factor = viewport.scale / 100;
        await page.addStyleTag({
          content:
            viewport.scale === 200
              ? 'html{font-size:200% !important}'
              : ':root{--text-sm:' +
                0.875 * factor +
                'rem;--text-base:' +
                factor +
                'rem;--text-lg:' +
                1.125 * factor +
                'rem;--text-xl:' +
                1.5 * factor +
                'rem}',
        });
      }
      await page.getByRole('button', { name: /Generelt/ }).click();
      const prefix =
        viewport.width +
        'x' +
        viewport.height +
        (viewport.scale ? '-' + viewport.scale : '');
      for (const [s, session] of generelt.entries()) {
        await walkActivity(page, session, s + 1, prefix);
      }
    },
  );
}

test('first-time and retry success stay distinct from reveals, in both themes', async ({
  page,
}) => {
  test.setTimeout(180000);
  await completeOnboarding(page, { programme: 'Programvareutvikling' });
  await page.setViewportSize({ width: 320, height: 568 });
  for (const id of ['tsu-a3-koble', 'tsu-a5-rekkefolge']) {
    const card = await openCard(page, id);
    await taps(page, rightTaps(card));
    if (needsCheck(card)) await action(page, 'Sjekk');
    await expect(page.getByRole('status')).toHaveAttribute(
      'data-state',
      'correct',
    );
    await expect(page.getByRole('status')).toContainText('Riktig.');
    await capture(page, '320-' + id + '-correct');
    await inspect(page, id + ' first correct');
    expect(
      (await new AxeBuilder({ page }).include('.micro').analyze()).violations,
    ).toEqual([]);
    await openCard(page, id);
    await taps(page, wrongTaps(card));
    if (needsCheck(card)) await action(page, 'Sjekk');
    await action(page, 'Prøv igjen');
    await taps(page, rightTaps(card));
    if (needsCheck(card)) await action(page, 'Sjekk');
    await expect(page.getByRole('status')).toContainText('Riktig nå.');
  }
  await page.evaluate(
    "(() => (document.documentElement.dataset.theme = 'light'))()",
  );
  for (const id of ['tsu-a3-koble', 'tsu-a5-rekkefolge']) {
    const card = await openCard(page, id);
    await page.evaluate(
      "(() => (document.documentElement.dataset.theme = 'light'))()",
    );
    await taps(page, wrongTaps(card));
    if (needsCheck(card)) await action(page, 'Sjekk');
    expect(
      (await new AxeBuilder({ page }).include('.micro').analyze()).violations,
    ).toEqual([]);
    await capture(page, '320-' + id + '-light-wrong');
  }
});

for (const scale of [100, 200])
  test(
    'keyboard and mixed pointer recovery ' + scale + '%',
    async ({ page }) => {
      test.setTimeout(180000);
      await completeOnboarding(page, { programme: 'Programvareutvikling' });
      await page.setViewportSize({ width: 320, height: 568 });
      if (scale === 200)
        await page.addInitScript(
          "document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.fontSize='200%')",
        );
      const card = (await openCard(page, 'tsu-a3-koble')) as MatchData;
      await taps(page, wrongTaps(card));
      await expect(page.getByRole('status')).not.toBeFocused();
      await tabTo(page, /^Prøv igjen$/);
      await page.waitForTimeout(430);
      await page.keyboard.press('Enter');
      const first = page
        .getByRole('group', { name: card.leftLabel, exact: true })
        .getByRole('button')
        .first();
      await expect(first).toBeFocused();
      const rect = await first.boundingBox();
      expect(rect!.y).toBeGreaterThanOrEqual(0);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(568);
      for (const tap of rightTaps(card)) {
        await tabTo(page, tap.name);
        await page.keyboard.press('Enter');
      }
      await expect(page.getByRole('status')).toBeFocused();
      await expect(page.getByRole('status')).toHaveAttribute(
        'data-state',
        'correct',
      );
      await page.keyboard.press('Tab');
      await expect(
        page.getByRole('button', {
          name: 'Tilbake til aktiviteter',
          exact: true,
        }),
      ).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(
        page.getByRole('button', { name: 'Neste', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await page.waitForTimeout(430);
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Utviklerblikk',
      );
      await page.goBack();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        card.title,
      );
      await page.goForward();
      const order = await openCard(page, 'tsu-a5-rekkefolge');
      const ids = rightTaps(order);
      await tabTo(page, ids[0]!.name);
      await page.keyboard.press('Space');
      await page.keyboard.press('Shift+Tab'); // Native navigation, no custom arrow contract.
      await page.keyboard.press('Tab');
      await openCard(page, order.id);
      for (const tap of wrongTaps(order)) {
        await tabTo(page, tap.name);
        await page.keyboard.press('Space');
      }
      await tabTo(page, /^Sjekk$/);
      await page.waitForTimeout(430);
      await page.keyboard.press('Enter');
      await expect(page.getByRole('status')).toBeFocused();
      await tabTo(page, /^Prøv igjen$/);
      await page.waitForTimeout(430);
      await page.keyboard.press('Enter');
      for (const tap of rightTaps(order)) {
        await tabTo(page, tap.name);
        await page.keyboard.press('Enter');
      }
      await tabTo(page, /^Sjekk$/);
      await page.waitForTimeout(430);
      await page.keyboard.press('Enter');
      await expect(page.getByRole('status')).toHaveAttribute(
        'data-state',
        'correct',
      );
      await expect(page.getByRole('status')).toBeFocused();
      await inspect(page, 'keyboard repair ' + scale);
      await capture(page, '320-keyboard-' + scale);
    },
  );

test.describe('stable touch workspace', () => {
  test.use({ hasTouch: true });
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 560 },
    { width: 390, height: 844 },
  ])
    test(
      'inline sources, both directions and retained pairs ' + viewport.width,
      async ({ page }) => {
        test.setTimeout(120000);
        await page.setViewportSize(viewport);
        await completeOnboarding(page, { programme: 'Programvareutvikling' });
        for (const side of ['left', 'right'] as const) {
          const card = (await openCard(page, 'tsu-a3-koble')) as MatchData,
            own = side === 'left' ? card.leftLabel : card.rightLabel,
            other = side === 'left' ? card.rightLabel : card.leftLabel,
            opposite = side === 'left' ? 'right' : 'left';
          if (side === 'right')
            await page
              .getByRole('group', { name: 'Startside for koblingen' })
              .getByRole('button', { name: own, exact: true })
              .tap();
          const source = page
            .getByRole('group', { name: own, exact: true })
            .getByRole('button', { name: card.pairs[1]![side], exact: true });
          await source.scrollIntoViewIfNeeded();
          const sourceNode = await source.elementHandle();
          const before = await source.boundingBox(),
            scroll = await page
              .locator('.micro')
              .evaluate((el) => el.scrollTop);
          await source.tap();
          expect(
            await source.evaluate(
              (el, original) => el === original,
              sourceNode,
            ),
          ).toBe(true);
          const after = await source.boundingBox();
          expect(Math.abs(after!.y - before!.y)).toBeLessThan(1);
          const candidate = page
              .getByRole('group', { name: other, exact: true })
              .getByRole('button')
              .first(),
            box = await candidate.boundingBox();
          rows.push({
            label: viewport.width + ' ' + side + ' selected',
            sourceY: after!.y,
            firstCandidateGap: box!.y - after!.y - after!.height,
            scrollBefore: scroll,
            scrollAfter: await page
              .locator('.micro')
              .evaluate((el) => el.scrollTop),
          });
          expect(box!.y - after!.y - after!.height).toBeLessThan(90);
          await capture(page, viewport.width + '-match-selected-' + side);
          await page
            .getByRole('group', { name: other, exact: true })
            .getByRole('button', {
              name: card.pairs[1]![opposite],
              exact: true,
            })
            .tap();
          const found = page.locator('.utviklerblikk-found');
          await expect(found).toContainText(card.pairs[1]!.left);
          await expect(found).toContainText(card.pairs[1]!.right);
          await capture(page, viewport.width + '-match-found-' + side);
          await page
            .getByRole('group', { name: own, exact: true })
            .getByRole('button', { name: card.pairs[0]![side], exact: true })
            .tap();
          await page
            .getByRole('group', { name: other, exact: true })
            .getByRole('button', {
              name: card.pairs[2]![opposite],
              exact: true,
            })
            .tap();
          await expect(page.getByRole('status')).not.toBeFocused();
          await expect(found).toContainText('Du koblet');
          await inspect(page, 'touch wrong ' + viewport.width + ' ' + side);
          await action(page, 'Prøv igjen');
          await page
            .getByRole('group', { name: own, exact: true })
            .getByRole('button', { name: card.pairs[0]![side], exact: true })
            .tap();
          await page
            .getByRole('group', { name: other, exact: true })
            .getByRole('button', {
              name: card.pairs[2]![opposite],
              exact: true,
            })
            .tap();
          await expect(page.getByRole('status')).toHaveAttribute(
            'data-state',
            'revealed',
          );
          await expect(
            page.getByRole('region', { name: 'Fasit for koblingene' }),
          ).toContainText('Par 2: Du koblet');
          await inspect(page, 'touch reveal ' + viewport.width + ' ' + side);
        }
      },
    );
});

test('one-list noncontiguous locks, undo, resize, reset and chosen solution', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 320, height: 568 });
  await completeOnboarding(page, { programme: 'Programvareutvikling' });
  const card = (await openCard(page, 'tsu-a5-rekkefolge')) as OrderData;
  const item = (id: string) =>
    page.getByRole('button', {
      name: namePattern(card.items.find((i) => i.id === id)!.label),
    });
  const row = (id: string) =>
    page
      .getByRole('list', { name: 'Trinn med valgte plasser' })
      .getByRole('listitem')
      .filter({ has: item(id) });
  const put = async (ids: string[]) => {
    for (const id of ids) await item(id).click();
  };
  const [a, b, c, d] = card.correctOrder as [string, string, string, string];
  await put([c, b, d, a]);
  await action(page, 'Sjekk');
  await expect(row(b)).toHaveAttribute('data-position', '2');
  await expect(row(b)).toHaveAttribute('data-result', 'correct');
  await capture(page, '320-order-partial');
  await action(page, 'Prøv igjen');
  await put([a, c]);
  await item(a).click();
  await expect(row(c)).toHaveAttribute('data-position', '3');
  await expect(row(b)).toHaveAttribute('data-position', '2');
  for (const width of [390, 768, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(row(b)).toHaveAttribute('data-position', '2');
    await expect(row(a)).not.toHaveAttribute('data-position');
    await inspect(page, 'partial order resize ' + width);
  }
  await put([a, d]);
  await action(page, 'Sjekk');
  await expect(page.getByRole('status')).toHaveAttribute(
    'data-state',
    'correct',
  );
  await expect(
    page
      .getByRole('list', { name: 'Trinn med valgte plasser' })
      .getByRole('listitem'),
  ).toHaveCount(4);
  await capture(page, '320-order-repaired');
  await openCard(page, card.id);
  await put([b, c, a, d]);
  await action(page, 'Sjekk');
  await expect(row(d)).toHaveAttribute('data-position', '4');
  await action(page, 'Start på nytt');
  for (let n = 0; n < 3; n++) {
    await put([...card.correctOrder].reverse());
    await action(page, 'Sjekk');
    await expect(page.getByRole('status')).toHaveAttribute(
      'data-state',
      'incorrect',
    );
    if (n < 2) await action(page, 'Prøv igjen');
  }
  await action(page, 'Vis løsning');
  await expect(page.getByRole('status')).toHaveAttribute(
    'data-state',
    'revealed',
  );
  await expect(page.getByText('Vist løsning', { exact: true })).toHaveCount(4);
  await inspect(page, 'optional order solution');
});
function namePattern(text: string) {
  return new RegExp(
    '^' + text.replace(/[.*+?^$()|[\]\\]/g, '\\$&') + '(?:,| |$)',
  );
}

test('active match resizing keeps source identity and solved pairs across the breakpoint', async ({
  page,
}) => {
  await completeOnboarding(page, { programme: 'Programvareutvikling' });
  await page.setViewportSize({ width: 390, height: 844 });
  const card = (await openCard(page, 'tsu-a3-koble')) as MatchData;
  await taps(page, rightTaps(card).slice(0, 2));
  await page
    .getByRole('group', { name: card.leftLabel, exact: true })
    .getByRole('button', { name: card.pairs[1]!.left, exact: true })
    .click();
  for (const width of [640, 641, 768, 1280, 600, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(
      page
        .getByRole('group', { name: card.leftLabel, exact: true })
        .getByRole('button', { name: card.pairs[1]!.left, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    if (width <= 640)
      await expect(page.locator('.utviklerblikk-found')).toContainText(
        card.pairs[0]!.left,
      );
    else {
      const columns = page.locator('.utviklerblikk-match .micro-match__column');
      await expect(columns).toHaveCount(2);
      const a = await columns.nth(0).boundingBox(),
        b = await columns.nth(1).boundingBox();
      expect(Math.abs(a!.y - b!.y)).toBeLessThan(1);
    }
    await inspect(page, 'selected match resize ' + width);
  }
  await page
    .getByRole('group', { name: card.rightLabel, exact: true })
    .getByRole('button', { name: card.pairs[1]!.right, exact: true })
    .click();
  await expect(page.locator('.utviklerblikk-found')).toHaveCount(2);
});

test('navigation DOM and geometry keep activities left and advance right across types', async ({
  page,
}) => {
  await completeOnboarding(page, { programme: 'Programvareutvikling' });
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    for (const id of [
      'tsu-a1-ord',
      'tsu-a1-behov',
      'tsu-a3-koble',
      'tsu-a5-rekkefolge',
    ]) {
      await openCard(page, id);
      const footer = page.locator('.micro-card__foot'),
        buttons = footer.getByRole('button');
      await expect(buttons.first()).toHaveText('Tilbake til aktiviteter');
      const a = await buttons.nth(0).boundingBox(),
        b = await buttons.nth(1).boundingBox();
      if (Math.abs(a!.y - b!.y) < 1) expect(a!.x).toBeLessThan(b!.x);
      else expect(a!.y).toBeLessThan(b!.y);
      await expect(
        page.getByRole('link', { name: 'Lukk Utviklerblikk', exact: true }),
      ).toHaveAttribute('href', '/rpg');
    }
  }
});

for (const width of [320, 1280]) {
  test('Utviklerblikk category navigation at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await completeOnboarding(page, { programme: 'Programvareutvikling' });
    await page.goto(base);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Utviklerblikk',
    );
    for (const name of ['Generelt', 'Scrum', 'Smidig samarbeid', 'Kanban']) {
      await expect(
        page.getByRole('button', { name: new RegExp(name) }),
      ).toBeEnabled();
    }
    await expect(page.getByText('Ingen aktiviteter ennå')).toHaveCount(0);
    await inspect(page, 'categories ' + width);
    expect(
      (await new AxeBuilder({ page }).include('.micro').analyze()).violations,
    ).toEqual([]);
    await capture(page, 'categories-' + width);
    await tabTo(page, /Generelt/);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(base + '?kategori=generelt');
    await expect(
      page.getByRole('list', { name: 'Velg en aktivitet' }).getByRole('button'),
    ).toHaveCount(6);
    await page.reload();
    await expect(page.getByText('Generelt · 6 aktiviteter')).toBeVisible();
    await inspect(page, 'category activities ' + width);
    await action(page, '1. ' + track.sessions[0]!.title);
    await expect(page).toHaveURL(
      base + '?aktivitet=' + track.sessions[0]!.id + '&kort=1',
    );
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      track.sessions[0]!.cards[0]!.title,
    );
    await action(page, 'Tilbake til aktiviteter');
    await expect(page).toHaveURL(base + '?kategori=generelt');
    await action(page, 'Tilbake til temaer');
    await expect(page).toHaveURL(base);
    await page.goBack();
    await expect(
      page.getByRole('heading', { name: 'Velg en aktivitet' }),
    ).toBeVisible();
    await page.goForward();
    await expect(page.getByRole('button', { name: /Generelt/ })).toBeVisible();
    await page.goto(base + '?kategori=scrum');
    await expect(page.getByText('Scrum · 6 aktiviteter')).toBeVisible();
    await page.goto(base + '?kategori=finnes-ikke');
    await expect(page).toHaveURL(base);
    await expect(page.getByRole('button', { name: /Generelt/ })).toBeVisible();
  });
}

// ACT 18: Scrum, Kanban and Smidig samarbeid. Content and answer keys for all
// 18 are checked without a browser (tests/programmes/utviklerblikkContent and
// the jsdom walk in tests/app/microTrackRoute); here each category is played
// once on a phone through every state, and the unusual formats (K04 and A04
// with an unused choice, A05's sets of criteria) on a desktop, at enlarged
// text and by keyboard.
for (const [id, title] of [
  ['scrum', 'Scrum'],
  ['kanban', 'Kanban'],
  ['smidig-samarbeid', 'Smidig samarbeid'],
] as const) {
  test(
    'ACT 18 ' + title + ': each activity in its category at 360x560',
    async ({ page }) => {
      test.setTimeout(420000);
      await page.setViewportSize({ width: 360, height: 560 });
      await completeOnboarding(page, { programme: 'Programvareutvikling' });
      await page.goto(base);
      await page.getByRole('button', { name: new RegExp('^' + title) }).click();
      await expect(page).toHaveURL(base + '?kategori=' + id);
      const sessions = inCategory(id);
      await expect(
        page
          .getByRole('list', { name: 'Velg en aktivitet' })
          .getByRole('button'),
      ).toHaveText(sessions.map((s, n) => n + 1 + '. ' + s.title));
      expect(
        (await new AxeBuilder({ page }).include('.micro').analyze()).violations,
      ).toEqual([]);
      for (const [n, session] of sessions.entries()) {
        await walkActivity(page, session, n + 1, '360x560 ' + id);
        await expect(page).toHaveURL(base + '?kategori=' + id);
      }
    },
  );
}

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 320, height: 568, scale: 200 },
]) {
  const label =
    viewport.width + 'x' + viewport.height + (viewport.scale ? ' 200%' : '');
  test(
    'ACT 18 unused match choices and grouped criteria at ' + label,
    async ({ page }) => {
      test.setTimeout(240000);
      await page.setViewportSize(viewport);
      await completeOnboarding(page, { programme: 'Programvareutvikling' });
      const enlarge = () =>
        viewport.scale
          ? page.addStyleTag({ content: 'html{font-size:200% !important}' })
          : undefined;

      for (const [id, unused] of [
        ['tsu-kanban-k04-ny', 'WIP'],
        ['tsu-smidig-a04-ny', 'Langt møte med hele teamet'],
      ] as const) {
        const card = (await openCard(page, id)) as MatchData;
        await enlarge();
        await inspect(page, label + ' ' + id + ' idle');
        await capture(page, label + '-' + id + '-idle');
        const [first] = card.pairs;
        // The unused choice is chosen by keyboard and refused as a pair.
        if (await page.locator('.utviklerblikk-mobile-match').count()) {
          await page
            .getByRole('group', { name: card.leftLabel })
            .getByRole('button', {
              name: new RegExp('^' + first!.left.slice(0, 20)),
            })
            .click();
          await page
            .getByRole('group', { name: card.rightLabel })
            .getByRole('button', { name: new RegExp('^' + unused) })
            .click();
        } else {
          await tabTo(page, new RegExp('^' + first!.left.slice(0, 20)));
          await page.keyboard.press('Enter');
          await tabTo(page, new RegExp('^' + unused));
          await page.keyboard.press('Enter');
        }
        await expect(page.getByRole('status')).toHaveAttribute(
          'data-state',
          'incorrect',
        );
        await expect(page.getByRole('status')).toContainText(
          '«' + unused + '» er ikke et par.',
        );
        await inspect(page, label + ' ' + id + ' wrong');
        await action(page, 'Prøv igjen');
        await taps(page, rightTaps(card));
        await expect(page.getByRole('status')).toContainText('Riktig nå.');
        await expect(
          page.getByRole('region', { name: 'Dine koblinger' }),
        ).toContainText('Ikke brukt: ' + unused);
        await inspect(page, label + ' ' + id + ' correct');
        await capture(page, label + '-' + id + '-correct');
      }

      const sets = await openCard(page, 'tsu-smidig-a05-sporsmal');
      await enlarge();
      const options = page
        .getByRole('group', { name: 'Svaralternativer' })
        .getByRole('button');
      await expect(options).toHaveCount(4);
      for (const option of await options.all()) {
        // Three criteria, each on its own line, inside one choice.
        const tops = await option
          .locator('.micro-option-set > span')
          .evaluateAll((lines) =>
            lines.map((line) => line.getBoundingClientRect().top),
          );
        expect(tops).toHaveLength(3);
        expect(tops[0]!).toBeLessThan(tops[1]!);
        expect(tops[1]!).toBeLessThan(tops[2]!);
      }
      await inspect(page, label + ' a05 idle');
      await capture(page, label + '-a05-idle');
      await taps(page, rightTaps(sets));
      await expect(page.getByRole('status')).toContainText('Riktig.');
      await inspect(page, label + ' a05 correct');
      await capture(page, label + '-a05-correct');
    },
  );
}
