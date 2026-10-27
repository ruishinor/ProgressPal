import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { completeOnboarding } from './support/onboarding';

// Same runtime import boundary as the existing Utviklerblikk browser spec:
// the node test project does not compile the app's domain/source project.
type ChoiceCard = {
  kind: 'select';
  id: string;
  title: string;
  correctId: string;
  options: { id: string; label: string; feedback?: string }[];
  hint: string;
  explanation: string;
};
type Activity = {
  id: string;
  title: string;
  takeaway: string;
  cards: (ChoiceCard | { kind: 'learn'; id: string; title: string })[];
};
const modulePath =
  '../src/programmes/programvareutvikling/microlearning/utviklerblikk/uxUu';
const { uxUuSessions } = (await import(modulePath)) as {
  uxUuSessions: Activity[];
};

const base = '/rpg/track/tenk-som-en-utvikler';
const category = 'ux-og-universell-utforming';
async function tabTo(page: Page, target: Locator) {
  for (let n = 0; n < 40; n++) {
    if (await target.evaluate((el) => el === el.ownerDocument.activeElement))
      return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Target not reached with Tab');
}
async function activate(page: Page, target: Locator, keyboard = false) {
  // Respect the existing 400 ms guard between deliberate navigation actions.
  await page.waitForTimeout(430);
  if (keyboard) {
    await tabTo(page, target);
    await page.keyboard.press('Enter');
  } else await target.click();
}
async function scan(page: Page) {
  expect(
    (await new AxeBuilder({ page }).include('.micro').analyze()).violations,
  ).toEqual([]);
}
async function layout(page: Page) {
  await expect(page.locator('.micro')).toBeVisible();
  expect(
    await page.evaluate<string[]>(`(() => {
    const root = document.querySelector('.micro'), problems = [];
    if (root.scrollWidth > root.clientWidth + 1) problems.push('horizontal overflow');
    for (const el of root.querySelectorAll('*')) {
      if (!el.getClientRects().length || el.closest('.sr-only,[hidden]')) continue;
      const s = getComputedStyle(el);
      if (['hidden','clip'].includes(s.overflowY) && el.scrollHeight > el.clientHeight + 2) problems.push('clipped text');
      if (['auto','scroll'].includes(s.overflowY)) problems.push('nested scrolling');
    }
    return problems;
  })()`),
  ).toEqual([]);
  const headerLines = await page
    .locator('.micro__top > .rpg-button > span:last-child, .micro__top > small')
    .evaluateAll((labels) =>
      labels.map((label) => {
        const range = label.ownerDocument.createRange();
        range.selectNodeContents(label);
        return new Set(
          Array.from(
            range.getClientRects() as ArrayLike<{ top: number }>,
            (rect) => rect.top,
          ),
        ).size;
      }),
    );
  expect(headerLines.every((lines) => lines === 1)).toBe(true);
  for (const control of await page
    .locator('.micro button:visible,.micro a:visible')
    .all()) {
    await control.scrollIntoViewIfNeeded();
    const box = (await control.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(43.9);
    expect(box.height).toBeGreaterThanOrEqual(43.9);
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(
      page.viewportSize()!.width + 1,
    );
    await expect(control).toBeInViewport();
  }
}
async function walk(page: Page, session: Activity, keyboard = false) {
  for (const [index, card] of session.cards.entries()) {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      card.title,
    );
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    if (card.kind === 'select') {
      const answer = card.options.find((o) => o.id === card.correctId)!;
      await activate(
        page,
        page.getByRole('button', { name: answer.label, exact: true }),
        keyboard,
      );
      await expect(page.getByRole('status')).toContainText(card.explanation);
      await expect(page.getByRole('status')).toHaveAttribute(
        'data-state',
        'correct',
      );
      await layout(page);
    }
    await activate(
      page,
      page.getByRole('button', {
        name: index === session.cards.length - 1 ? 'Fullfør' : 'Neste',
        exact: true,
      }),
      keyboard,
    );
  }
  await expect(page.getByRole('heading', { name: 'Husk dette' })).toBeVisible();
  await expect(
    page.getByText(session.takeaway!, { exact: true }),
  ).toBeVisible();
}

test('UX/UU discovery, keyboard retry, transfer, history and explicit exits', async ({
  page,
}, testInfo) => {
  await completeOnboarding(page, { programme: 'Programvareutvikling' });
  await page.goto(base);
  const topic = page.getByRole('button', {
    name: /^UX og universell utforming/,
  });
  await tabTo(page, topic);
  const outline = await topic.evaluate((el) => {
    const style = el.ownerDocument.defaultView!.getComputedStyle(el);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThan(0);
  await scan(page);
  await activate(page, topic, true);
  await expect(page).toHaveURL(base + '?kategori=' + category);
  await expect(
    page.getByRole('list', { name: 'Velg en aktivitet' }).getByRole('button'),
  ).toHaveText(uxUuSessions.map((s, i) => `${i + 1}. ${s.title}`));
  const session = uxUuSessions[0]!;
  await activate(
    page,
    page.getByRole('button', { name: '1. ' + session.title }),
    true,
  );
  await activate(
    page,
    page.getByRole('button', { name: 'Neste', exact: true }),
    true,
  );
  const question = session.cards[1] as ChoiceCard;
  const wrong = question.options.find((o) => o.id === 'snarvei')!;
  await activate(
    page,
    page.getByRole('button', { name: wrong.label, exact: true }),
    true,
  );
  await expect(page.getByRole('status')).toBeFocused();
  await expect(page.getByRole('status')).toContainText(wrong.feedback!);
  await expect(page.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  await scan(page);
  await activate(page, page.getByRole('button', { name: 'Prøv igjen' }), true);
  await expect(page.getByRole('status')).toContainText(question.hint);
  await activate(
    page,
    page.getByRole('button', {
      name: question.options.find((o) => o.id === question.correctId)!.label,
      exact: true,
    }),
    true,
  );
  await expect(page.getByRole('status')).toContainText('Riktig nå.');
  await page.screenshot({ path: testInfo.outputPath('ux-uu-retry.png') });
  await activate(
    page,
    page.getByRole('button', { name: 'Neste', exact: true }),
    true,
  );
  await page.goBack();
  await expect(page).toHaveURL(base + '?aktivitet=' + session.id + '&kort=2');
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    session.cards[2]!.title,
  );
  // Finish the remaining diagnosis and a distinct application: a lost application form.
  for (const card of session.cards.slice(2)) {
    if (card.kind !== 'select') throw new Error('Expected selection');
    await activate(
      page,
      page.getByRole('button', {
        name: card.options.find((o) => o.id === card.correctId)!.label,
        exact: true,
      }),
      true,
    );
    await expect(page.getByRole('status')).toContainText(card.explanation);
    await activate(
      page,
      page.getByRole('button', {
        name: card === session.cards.at(-1) ? 'Fullfør' : 'Neste',
        exact: true,
      }),
      true,
    );
  }
  await expect(
    page.getByText(session.takeaway!, { exact: true }),
  ).toBeVisible();
  await activate(
    page,
    page.getByRole('button', { name: 'Velg en annen aktivitet' }),
    true,
  );
  await expect(page).toHaveURL(base + '?kategori=' + category);
  await activate(
    page,
    page.getByRole('button', { name: '2. ' + uxUuSessions[1]!.title }),
    true,
  );
  await activate(
    page,
    page.getByRole('button', { name: 'Tilbake til aktiviteter' }),
    true,
  );
  await expect(page).toHaveURL(base + '?kategori=' + category);
  await activate(
    page,
    page.getByRole('link', { name: 'Lukk Utviklerblikk' }),
    true,
  );
  await expect(page).toHaveURL('/rpg');
});

test('UX/UU on a narrow phone and with 200 percent text: perception, forms and verification', async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 320, height: 568 });
  await completeOnboarding(page, {
    programme: 'Programvareutvikling',
    theme: 'light',
  });
  for (const [index, enlarged] of [
    [4, false],
    [5, true],
  ] as const) {
    const session = uxUuSessions[index]!;
    await page.goto(base + '?aktivitet=' + session.id);
    if (enlarged)
      await page.addStyleTag({ content: 'html {font-size:200% !important}' });
    await layout(page);
    await page.screenshot({
      path: testInfo.outputPath(
        enlarged ? 'ux-uu-200-percent.png' : 'ux-uu-mobile.png',
      ),
    });
    await scan(page);
    await walk(page, session);
    await layout(page);
    await scan(page);
  }
});
