import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

// Microlearning Lab (M01/M02, Programme 2). The hard contract is a 360 x 560
// CSS px phone at 100% text scale: one card is one viewport. For every card
// of the real bank, in every state of the one-retry loop (prompt, answering,
// ready to check, first miss, retry, correct, correct after a retry, answer
// revealed), there is no page scroll, no horizontal overflow, no nested
// scroll container, no clipped content, every control is in view and at
// least 44 x 44 px, and the feedback and the one action are visible. A tall
// Galaxy S22+ class phone must also fit, with the interaction kept near the
// footer. The Campaign shell is not involved, and nothing the session does
// may change what the learner has stored.

const HARD = { height: 560, width: 360 } as const;
// A Galaxy S22+ class CSS viewport (the repository has no device profile).
const PHONE = { height: 800, width: 384 } as const;

// The bank and the tap plans are loaded by path so this project's type graph
// stays free of the application's `@/` alias; both are pure data and functions
// over data, shared with the jsdom tests so every card of the real bank is
// driven, not a hand-picked few.
type Tap = { group?: string; name: RegExp };
type PlanCard = { id: string; kind: string; title: string };
type Plans = {
  needsCheck: (card: PlanCard) => boolean;
  rightTaps: (card: PlanCard) => Tap[];
  wrongTaps: (card: PlanCard, n?: number) => Tap[];
};

type BankSession = {
  cards: PlanCard[];
  id: string;
  prepares?: string[];
  title: string;
};
type CampaignRows = {
  firstRequired: (index: unknown, count: number) => string[];
  progressRows: (
    items: readonly string[],
    status: 'completed' | 'started',
  ) => unknown[];
};

const bankPath = '../src/programmes/programvareutvikling/microlearning/index';
const plansPath = '../tests/support/microlearningPlans';
const campaignPath = '../tests/support/campaignPosition';
const { programvareutviklingMicrolearning: bank } = (await import(
  bankPath
)) as {
  programvareutviklingMicrolearning: {
    primers: BankSession[];
    sessions: BankSession[];
    tracks: { id: string; sessions: BankSession[]; title: string }[];
  };
};
const { needsCheck, rightTaps, wrongTaps } = (await import(plansPath)) as Plans;
const { firstRequired, progressRows } = (await import(
  campaignPath
)) as CampaignRows;

// The packaged content index, read as the browser will read it, so the seeded
// Campaign progress names real missions in their real authored order.
const contentDirectory = join(
  process.cwd(),
  'public',
  'content',
  'programvareutvikling',
);
const contentIndex = JSON.parse(
  readFileSync(
    join(
      contentDirectory,
      readdirSync(contentDirectory).find((name) =>
        /^index\..*\.json$/.test(name),
      )!,
    ),
    'utf8',
  ),
) as unknown;

// Runs inside the page. A string, because this project's E2E TypeScript
// config has no DOM lib. Returns a list of human-readable problems.
const FIT_SCRIPT = `(() => {
  const problems = [];
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const doc = document.scrollingElement;
  const slack = 0.5;
  const describe = (el) =>
    el.tagName.toLowerCase() +
    (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') +
    ' "' + (el.textContent || '').trim().slice(0, 28) + '"';

  if (doc.scrollHeight > doc.clientHeight) problems.push('page scrolls vertically: ' + doc.scrollHeight + ' > ' + doc.clientHeight);
  if (doc.scrollWidth > doc.clientWidth) problems.push('page scrolls horizontally: ' + doc.scrollWidth + ' > ' + doc.clientWidth);
  if (window.scrollX !== 0 || window.scrollY !== 0) problems.push('page is scrolled');

  const micro = document.querySelector('.micro');
  const body = document.querySelector('.micro-card__body');
  if (!micro || !body) return ['the immersive shell or card body is missing'];
  const bodyRect = body.getBoundingClientRect();
  const inSrOnly = (el) => el.closest('.sr-only') !== null;
  const elements = [micro, ...micro.querySelectorAll('*')].filter((el) => !inSrOnly(el));

  for (const el of elements) {
    const style = getComputedStyle(el);
    // The shell is the one scroll context (it scrolls only at larger text);
    // at normal size it must not scroll, which the box checks below enforce.
    if (el !== micro && /(auto|scroll)/.test(style.overflowX + ' ' + style.overflowY)) problems.push('scroll container: ' + describe(el));
    if (el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 1) problems.push('content taller than its box (clipped or scrollable): ' + describe(el) + ' ' + el.scrollHeight + ' > ' + el.clientHeight);
    if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) problems.push('content wider than its box: ' + describe(el) + ' ' + el.scrollWidth + ' > ' + el.clientWidth);

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.top < -slack || rect.left < -slack || rect.bottom > vh + slack || rect.right > vw + slack) {
      problems.push('outside the viewport: ' + describe(el) + ' [' + Math.round(rect.left) + ',' + Math.round(rect.top) + ',' + Math.round(rect.right) + ',' + Math.round(rect.bottom) + ']');
    }
    if (body.contains(el) && (rect.bottom > bodyRect.bottom + slack || rect.right > bodyRect.right + slack)) {
      problems.push('clipped by the card body: ' + describe(el));
    }
    if (el.matches('button, a') && (rect.width < 43.5 || rect.height < 43.5)) {
      problems.push('touch target under 44px: ' + describe(el) + ' ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
    }
  }

  const buttons = [...micro.querySelectorAll('button, a')].filter((el) => !inSrOnly(el));
  if (buttons.length === 0) problems.push('no controls rendered');
  const foot = micro.querySelector('.micro-card__foot');
  const feedback = micro.querySelector('.micro-feedback');
  if (feedback && feedback.textContent.trim() === '') problems.push('feedback strip is empty');
  if (feedback && feedback.getBoundingClientRect().height === 0) problems.push('feedback strip is not visible');
  if (foot && !foot.querySelector('button, a')) problems.push('the footer has no action');
  return problems;
})()`;

// The enlarged-text contract. The route may grow past the viewport, and then
// the route scrolls: one scroll context, nothing clipped, nothing nested, no
// sideways scroll, every control reachable by scrolling and still on top, and
// the footer after the content in reading order without covering it.
const ENLARGED_SCRIPT = `(() => {
  const problems = [];
  const doc = document.scrollingElement;
  const micro = document.querySelector('.micro');
  if (!micro) return { problems: ['the immersive shell is missing'], scrolls: false };
  const slack = 0.5;
  const describe = (el) =>
    el.tagName.toLowerCase() +
    (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') +
    ' "' + (el.textContent || '').trim().slice(0, 28) + '"';

  if (doc.scrollHeight > doc.clientHeight) problems.push('the document scrolls instead of the route: ' + doc.scrollHeight + ' > ' + doc.clientHeight);
  if (doc.scrollWidth > doc.clientWidth) problems.push('page scrolls horizontally');
  if (micro.scrollWidth > micro.clientWidth + 1) problems.push('route scrolls horizontally: ' + micro.scrollWidth + ' > ' + micro.clientWidth);
  if (!/(auto|scroll)/.test(getComputedStyle(micro).overflowY)) problems.push('the route cannot scroll');
  micro.scrollTop = 0;

  const inSrOnly = (el) => el.closest('.sr-only') !== null;
  const elements = [...micro.querySelectorAll('*')].filter((el) => !inSrOnly(el));
  for (const el of elements) {
    const style = getComputedStyle(el);
    if (/(auto|scroll|overlay)/.test(style.overflowX + ' ' + style.overflowY)) problems.push('nested scroll container: ' + describe(el));
    if (/(fixed|sticky)/.test(style.position)) problems.push('pinned element can cover enlarged content: ' + describe(el));
    // A box that clips (anything but visible) must hold its content; a visible
    // box cannot hide anything, and what it spills is checked against the route.
    if (style.overflowY !== 'visible' && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 1) problems.push('content taller than its box (clipped or scrollable): ' + describe(el) + ' ' + el.scrollHeight + ' > ' + el.clientHeight);
    if (style.overflowX !== 'visible' && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) problems.push('content wider than its box: ' + describe(el) + ' ' + el.scrollWidth + ' > ' + el.clientWidth);
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.left < -slack || rect.right > micro.clientWidth + slack) problems.push('outside the width: ' + describe(el) + ' [' + Math.round(rect.left) + ',' + Math.round(rect.right) + ']');
    if (el.matches('button, a') && (rect.width < 43.5 || rect.height < 43.5)) problems.push('touch target under 44px: ' + describe(el) + ' ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
  }

  const shown = micro.getBoundingClientRect();
  const controls = [...micro.querySelectorAll('button, a')].filter((el) => !inSrOnly(el));
  if (controls.length === 0) problems.push('no controls rendered');
  for (const control of controls) {
    if (getComputedStyle(control).visibility === 'hidden') continue;
    control.scrollIntoView({ block: 'nearest' });
    const rect = control.getBoundingClientRect();
    const inView = rect.top >= shown.top - slack && rect.bottom <= shown.bottom + slack;
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (!inView) problems.push('control cannot be scrolled into view: ' + describe(control));
    else if (hit !== control && !control.contains(hit)) problems.push('control is covered by ' + (hit ? describe(hit) : 'nothing') + ': ' + describe(control));
  }
  micro.scrollTop = 0;

  const body = micro.querySelector('.micro-card__body');
  const foot = micro.querySelector('.micro-card__foot');
  const feedback = micro.querySelector('.micro-feedback');
  const act = foot && foot.querySelector('button, a');
  if (body && foot && foot.getBoundingClientRect().top < body.getBoundingClientRect().bottom - slack) problems.push('the footer overlaps the card body');
  if (feedback && act && feedback.getBoundingClientRect().bottom > act.getBoundingClientRect().top + slack) problems.push('the action overlaps the feedback');
  if (feedback && feedback.textContent.trim() === '') problems.push('feedback strip is empty');
  if (foot && !act) problems.push('the footer has no action');
  return { problems, scrolls: micro.scrollHeight > micro.clientHeight + 1 };
})()`;

// How far the interaction sits above the footer. On a tall phone it must be
// anchored next to it (the thumb zone), not floating high with a gap below.
const GAP_SCRIPT = `(() => {
  const play = document.querySelector('.micro-card__play');
  const foot = document.querySelector('.micro-card__foot');
  if (!play || !foot) return null;
  return Math.round(foot.getBoundingClientRect().top - play.getBoundingClientRect().bottom);
})()`;

// Free vertical space in the card body: the gap between what the card says
// and the interaction (or the body's end). Small and positive is the tightest.
const SLACK_SCRIPT = `(() => {
  const body = document.querySelector('.micro-card__body');
  const prompt = document.querySelector('.micro-card__prompt');
  const play = document.querySelector('.micro-card__play');
  if (!body || !prompt) return null;
  const style = getComputedStyle(body);
  const gap = parseFloat(style.rowGap) || 0;
  const pad = parseFloat(style.paddingBottom);
  const promptBottom = prompt.getBoundingClientRect().bottom;
  const limit = body.getBoundingClientRect().bottom - pad;
  if (!play) return Math.round(limit - promptBottom);
  const playHeight = play.getBoundingClientRect().height;
  return Math.round(limit - playHeight - gap - promptBottom);
})()`;

// Where the footer and the interaction sit. Within one card they must not move
// between states: a mark, a badge or a longer message may not reflow the row
// the learner is about to tap, and the action stays where the thumb left it.
const GEOMETRY_SCRIPT = `(() => {
  const box = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return [Math.round(rect.top), Math.round(rect.height)];
  };
  return JSON.stringify({ foot: box('.micro-card__foot'), play: box('.micro-card__play') });
})()`;

// Soft: a run reports every state that fails, not only the first, so a card
// that does not fit is fixed together with its neighbours.
async function assertFits(page: Page, label: string) {
  const problems = (await page.evaluate(FIT_SCRIPT)) as string[];
  expect.soft(problems, label).toEqual([]);
}

// Automated stress proxies for larger text, not a standards result and not a
// substitute for a real device font scale. `text` scales only the font-size
// tokens (boxes keep their rem size); `root` scales the root font size, so
// every rem length (spacing, tap targets, bars) grows with the text. Both are
// style overrides injected after the route has loaded.
interface Scale {
  mechanism: 'root' | 'text';
  percent: number;
}

function scaleCss({ mechanism, percent }: Scale): string {
  if (mechanism === 'root') {
    return `html { font-size: ${percent}% !important }`;
  }
  const rem = (value: number) => `${((value * percent) / 100).toFixed(4)}rem`;

  return (
    `:root { --text-xs: ${rem(0.75)} !important; --text-sm: ${rem(0.875)} !important; ` +
    `--text-base: ${rem(1)} !important; --text-lg: ${rem(1.125)} !important; ` +
    `--text-xl: ${rem(1.5)} !important } body { font-size: ${rem(1)} !important }`
  );
}

let routeScrolled = 0;

async function assertEnlarged(page: Page, label: string) {
  const result = (await page.evaluate(ENLARGED_SCRIPT)) as {
    problems: string[];
    scrolls: boolean;
  };

  if (result.scrolls) {
    routeScrolled += 1;
  }
  expect.soft(result.problems, label).toEqual([]);
}

async function assertAccessible(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .include('.micro')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect
    .soft(
      results.violations.map(
        (violation) => `${violation.id}: ${violation.help}`,
      ),
      label,
    )
    .toEqual([]);
}

async function logSlack(page: Page, label: string) {
  const slack = (await page.evaluate(SLACK_SCRIPT)) as number | null;
  const size = page.viewportSize()!;
  console.log(`SLACK ${size.width}x${size.height} | ${label} | ${slack}px`);
}

async function tapAll(page: Page, taps: Tap[]) {
  for (const tap of taps) {
    const scope =
      tap.group === undefined
        ? page
        : page.getByRole('group', { exact: true, name: tap.group });

    await scope.getByRole('button', { name: tap.name }).first().click();
  }
}

// The action guard ignores a second press of an action within 400 ms of the
// last one (a double tap would otherwise land on the action's successor). A
// scripted press has no human pause, so it waits out the window; a person
// pressing again after reading is always slower.
const GUARD_WAIT_MS = 450;
const lastActivation = new WeakMap<Page, number>();

async function waitOutGuard(page: Page) {
  const since = Date.now() - (lastActivation.get(page) ?? 0);

  if (since < GUARD_WAIT_MS) {
    await page.waitForTimeout(GUARD_WAIT_MS - since);
  }
}

async function activate(page: Page, control: Locator) {
  await waitOutGuard(page);
  await control.click();
  lastActivation.set(page, Date.now());
}

/** A real double tap: two clicks at one point with no pause between them. */
async function doubleTap(page: Page, control: Locator) {
  await waitOutGuard(page);
  await control.dblclick();
  lastActivation.set(page, Date.now());
}

const action = (page: Page, name: string) =>
  page.getByRole('button', { exact: true, name });

const press = (page: Page, name: string) => activate(page, action(page, name));

const sessionButton = (page: Page, title: string) =>
  page.getByRole('button', {
    name: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
  });

// The Campaign's own progress records (the ones behind Home's "N of 24
// required tasks complete"), for a learner who has completed the first `count`
// required missions in authored order. Raising the count adds rows.
const requiredOrder = firstRequired(contentIndex, 99);

async function seedCampaign(page: Page, count: number) {
  const rows = progressRows(requiredOrder.slice(0, count), 'completed');

  await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');
      request.onerror = () => reject(new Error('open failed'));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('progress_entries', 'readwrite');
        const store = transaction.objectStore('progress_entries');
        for (const row of ${JSON.stringify(rows)}) store.put(row);
        transaction.oncomplete = () => { database.close(); resolve(undefined); };
        transaction.onerror = () => reject(new Error('seed failed'));
      };
    });
  `);
}

const status = (page: Page) => page.getByRole('status');

type Mode = 'right' | 'miss-twice' | 'retry-right';

// A half-finished interaction for the cards that take several taps.
function partialCut(card: PlanCard, taps: Tap[]): number {
  if (card.kind === 'match') {
    return 3;
  }

  return card.kind === 'order' || card.kind === 'assemble'
    ? Math.ceil(taps.length / 2)
    : 0;
}

interface Checks {
  axe: boolean;
  /** Set for the enlarged-text walks: the route may scroll, geometry shifts. */
  enlarged?: boolean;
  slack: boolean;
}

/** The fit oracle for the contract the walk is running under. */
async function assertState(page: Page, label: string, checks: Checks) {
  if (checks.enlarged === true) {
    await assertEnlarged(page, label);
  } else {
    await assertFits(page, label);
  }
}

/** Plays one card in the given mode, asserting fit at every state. */
async function playCard(
  page: Page,
  card: PlanCard,
  index: number,
  total: number,
  mode: Mode,
  checks: Checks,
) {
  const at = (state: string) =>
    `${mode}, card ${index + 1} of ${total} (${card.id}), ${state}`;
  let steady: string | null = null;
  const fit = async (state: string, axe = false) => {
    await assertState(page, at(state), checks);
    if (checks.enlarged !== true) {
      const geometry = (await page.evaluate(GEOMETRY_SCRIPT)) as string;

      if (steady === null) {
        steady = geometry;
      } else {
        expect
          .soft(geometry, `${at(state)}: the footer or interaction moved`)
          .toBe(steady);
      }
    }
    if (checks.axe && axe) {
      await assertAccessible(page, at(state));
    }
    if (checks.slack) {
      await logSlack(page, at(state));
    }
  };
  const last = index === total - 1;
  const advance = () => press(page, last ? 'Fullfør' : 'Neste');

  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText(card.title);
  await expect(heading).toBeFocused();
  await fit('prompt', true);

  if (card.kind === 'learn') {
    await advance();
    return;
  }

  const check = async () => {
    if (needsCheck(card)) {
      await fit('ready to check');
      await press(page, 'Sjekk');
    }
  };
  const right = rightTaps(card);
  const partial = partialCut(card, right);

  if (mode === 'right') {
    if (partial > 0) {
      await tapAll(page, right.slice(0, partial));
      await fit('answering');
      await tapAll(page, right.slice(partial));
    } else {
      await tapAll(page, right);
    }
    await check();
    await expect(status(page)).toContainText('Riktig.');
    await fit('correct', true);
  } else {
    await tapAll(page, wrongTaps(card, 0));
    await check();
    await expect(status(page)).toContainText('Ikke helt.');
    await fit('first miss', true);
    await press(page, 'Prøv igjen');
    await expect(status(page)).toContainText('Tips:');
    await fit('retry', true);

    if (mode === 'retry-right') {
      await tapAll(page, right);
      await check();
      await expect(status(page)).toContainText('Riktig nå.');
      await fit('correct after retry', true);
    } else {
      const second = wrongTaps(card, 1);

      if (card.kind === 'match') {
        // Select the left item and look at the card before the second miss.
        await tapAll(page, second.slice(0, 1));
        await fit('retry answering');
        await tapAll(page, second.slice(1));
      } else {
        await tapAll(page, second);
      }
      await check();
      await expect(status(page)).toContainText('Her er svaret.');
      await fit('answer revealed', true);
    }
  }

  await advance();
}

async function runSession(
  page: Page,
  sessionIndex: number,
  mode: Mode,
  checks: Checks,
) {
  await runSessionOf(page, bank.sessions[sessionIndex]!, mode, checks);
}

/** Starts a session or a primer from the picker and plays it to its finish. */
async function runSessionOf(
  page: Page,
  session: BankSession,
  mode: Mode,
  checks: Checks,
) {
  const heading = page.getByRole('heading', { level: 1 });

  await expect(heading).toHaveText('Velg en mikroøkt');
  await assertState(page, `${session.id}: picker`, checks);
  if (checks.axe) {
    await assertAccessible(page, `${session.id}: picker`);
  }
  await activate(page, sessionButton(page, session.title));

  for (const [index, card] of session.cards.entries()) {
    await playCard(page, card, index, session.cards.length, mode, checks);
  }

  await expect(heading).toHaveText('Økten er ferdig');
  await assertState(page, `${session.id}: done`, checks);
  if (checks.axe) {
    await assertAccessible(page, `${session.id}: done`);
  }
  if (checks.slack) {
    await logSlack(page, `${session.id}: done`);
  }
  await press(page, 'Velg en annen økt');
}

const sessionIndexes = bank.sessions.map((_, index) => index);

/**
 * A Programme 2 learner who has completed the first `complete` required
 * missions (all 24 by default: every «Repeter» session open, no primer).
 */
async function openPicker(
  page: Page,
  theme: 'dark' | 'light',
  complete = 24,
  scale?: Scale,
) {
  await completeOnboarding(page, { programme: 'Programvareutvikling', theme });
  await seedCampaign(page, complete);
  await gotoPicker(page, scale);
}

/** Opens `/rpg/micro` directly, as a link or a bookmark would. */
async function gotoPicker(page: Page, scale?: Scale) {
  await page.goto('/rpg/micro');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Velg en mikroøkt',
  );
  if (scale !== undefined) {
    await page.addStyleTag({ content: scaleCss(scale) });
  }
}

test.describe('microlearning lab at 360 x 560', () => {
  test.use({ viewport: HARD });

  test('every card state fits when missed twice, dark theme, with axe', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await openPicker(page, 'dark');
    for (const index of sessionIndexes) {
      await runSession(page, index, 'miss-twice', { axe: true, slack: true });
    }
  });

  test('every card state fits when solved first time, light theme, with axe', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await openPicker(page, 'light');
    for (const index of sessionIndexes) {
      await runSession(page, index, 'right', { axe: true, slack: true });
    }
  });

  test('every card state fits when solved on the retry, dark theme, with axe', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await openPicker(page, 'dark');
    for (const index of sessionIndexes) {
      await runSession(page, index, 'retry-right', { axe: true, slack: false });
    }
  });

  test('the immersive session shows no primary navigation and closes back to the Campaign', async ({
    page,
  }) => {
    await openPicker(page, 'dark');
    await page.getByRole('button', { name: /^Følg variablene/ }).click();

    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByTestId('rpg-shell')).toHaveCount(0);
    await expect(
      page.getByRole('progressbar', { name: 'Framdrift i økten' }),
    ).toHaveAttribute('aria-valuetext', 'Kort 1 av 6');

    await page.getByRole('link', { name: 'Lukk mikroøkten' }).click();
    await expect(page).toHaveURL(/\/rpg$/);
    await expect(page.getByTestId('rpg-shell')).toBeVisible();
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });

  test('the fit checks can fail: an oversized element, a small target and a clipped card are all caught', async ({
    page,
  }) => {
    await openPicker(page, 'dark');
    await page.getByRole('button', { name: /^Følg variablene/ }).click();
    await assertFits(page, 'control: unmodified card fits');

    await page.evaluate(`(() => {
      const play = document.querySelector('.micro-card__prompt');
      const filler = document.createElement('div');
      filler.style.height = '600px';
      filler.textContent = 'filler';
      play.appendChild(filler);
      const small = document.createElement('button');
      small.style.cssText = 'width:20px;height:20px';
      small.textContent = 'x';
      play.appendChild(small);
    })()`);
    const problems = (await page.evaluate(FIT_SCRIPT)) as string[];

    expect(problems.join(' | ')).toMatch(/content taller than its box/);
    expect(problems.join(' | ')).toMatch(/touch target under 44px/);
    expect(problems.join(' | ')).toMatch(/clipped by the card body|outside/);
  });

  test('a full session, right or wrong, changes nothing the learner has stored', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await openPicker(page, 'dark');
    const before = await snapshotDatabase(page);
    expect(before).toContain('"learner_profile"');

    await runSession(page, 0, 'right', { axe: false, slack: false });
    await runSession(page, 3, 'miss-twice', { axe: false, slack: false });
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Velg en mikroøkt',
    );

    expect(await snapshotDatabase(page)).toBe(before);
  });
});

test.describe('microlearning lab on a Galaxy S22+ class phone', () => {
  test.use({ viewport: PHONE });

  test('every card state fits and the interaction sits next to the footer', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await openPicker(page, 'dark');

    for (const index of sessionIndexes) {
      const session = bank.sessions[index]!;

      await runSession(page, index, 'miss-twice', { axe: false, slack: true });
      // The anchoring is checked on the cards of one more, quick, right pass.
      await activate(page, sessionButton(page, session.title));
      for (const [cardIndex, card] of session.cards.entries()) {
        const gap = (await page.evaluate(GAP_SCRIPT)) as number | null;

        if (gap !== null) {
          expect(
            gap,
            `${card.id}: interaction is ${gap}px above the footer`,
          ).toBeLessThanOrEqual(24);
        }
        await playCard(page, card, cardIndex, session.cards.length, 'right', {
          axe: false,
          slack: false,
        });
      }
      await press(page, 'Velg en annen økt');
    }
  });
});

// Larger text, on the hard 360 x 560 phone. Every card, picker and finished
// screen is walked through the retry loop with real clicks (Playwright scrolls
// a control into view, so a control the route cannot reach fails the click),
// and each state must keep the enlarged-text contract: nothing clipped, one
// scroll context, nothing nested, no sideways scroll, controls reachable.
test.describe('microlearning at enlarged text', () => {
  test.use({ viewport: HARD });

  const scales: Scale[] = [
    { mechanism: 'text', percent: 125 },
    { mechanism: 'text', percent: 150 },
    { mechanism: 'root', percent: 200 },
  ];

  for (const scale of scales) {
    test(`every card state stays reachable at ${scale.percent}% (${scale.mechanism} scale)`, async ({
      page,
    }) => {
      test.setTimeout(420_000);
      routeScrolled = 0;
      await openPicker(page, 'dark', 24, scale);
      for (const index of sessionIndexes) {
        await runSession(page, index, 'miss-twice', {
          axe: false,
          enlarged: true,
          slack: false,
        });
      }
      // Not vacuous: the stress really did push content past the viewport.
      expect(routeScrolled, 'states where the route scrolled').toBeGreaterThan(
        0,
      );
    });
  }

  test('the grouped picker and the primers stay reachable at enlarged text', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    routeScrolled = 0;
    const enlarged = { axe: false, enlarged: true, slack: false } as const;

    // Progress only ever grows in this test (seeded rows are added, not
    // removed), so it goes in Campaign order: a fresh learner's picker, the
    // primers with cards of their own at the strongest stress, then a mid
    // learner's picker and the fullest picker.
    await openPicker(page, 'dark', 0, { mechanism: 'root', percent: 200 });
    await assertEnlarged(page, 'picker at 0 complete');
    for (const primer of bank.primers.slice(0, 5)) {
      await seedCampaign(page, requiredOrder.indexOf(primer.prepares![0]!));
      await gotoPicker(page, { mechanism: 'root', percent: 200 });
      await runSessionOf(page, primer, 'miss-twice', enlarged);
    }
    for (const [complete, scale] of [
      [13, { mechanism: 'text', percent: 150 }],
      [17, { mechanism: 'root', percent: 200 }],
    ] as const) {
      await seedCampaign(page, complete);
      await gotoPicker(page, scale);
      await assertEnlarged(page, `picker at ${complete} complete`);
    }
    expect(routeScrolled, 'states where the route scrolled').toBeGreaterThan(0);
  });

  test('the enlarged-text checks can fail: clipping, a nested scroller, a pinned footer and sideways overflow are all caught', async ({
    page,
  }) => {
    await openPicker(page, 'dark', 24, {
      mechanism: 'text',
      percent: 125,
    });
    await activate(page, sessionButton(page, bank.sessions[0]!.title));
    const run = async () =>
      (await page.evaluate(ENLARGED_SCRIPT)) as { problems: string[] };

    expect((await run()).problems, 'control: unmodified card').toEqual([]);

    // The old behaviour: a card body clipped to a box that is too small.
    await page.addStyleTag({
      content: '.micro-card__body { flex: none; height: 6rem; overflow: clip }',
    });
    expect((await run()).problems.join(' | ')).toMatch(
      /content taller than its box/,
    );

    // Other ways to lose content or reachability.
    await page.addStyleTag({
      content:
        '.micro-card__body { flex: 1; height: auto; overflow: visible } ' +
        '.micro-card__prompt { overflow-y: auto } ' +
        '.micro-card__foot { position: sticky; bottom: 0 } ' +
        '.micro-card__text { width: 140vw }',
    });
    const text = (await run()).problems.join(' | ');

    expect(text).toMatch(/nested scroll container/);
    expect(text).toMatch(/pinned element/);
    expect(text).toMatch(/route scrolls horizontally|outside the width/);
  });

  test('a new card starts at the top, and keyboard focus stays visible in reading order', async ({
    page,
  }) => {
    await openPicker(page, 'dark', 24, {
      mechanism: 'root',
      percent: 200,
    });
    const session = bank.sessions[0]!;

    await activate(page, sessionButton(page, session.title));
    const heading = page.getByRole('heading', { level: 1 });
    const route = page.getByRole('main');

    // Leave the first card scrolled to its action, then advance.
    await expect(heading).toHaveText(session.cards[0]!.title);
    await action(page, 'Neste').scrollIntoViewIfNeeded();
    expect(
      await route.evaluate((el) => el.scrollTop),
      'the route scrolls to reach the action',
    ).toBeGreaterThan(0);
    await press(page, 'Neste');
    await expect(heading).toHaveText(session.cards[1]!.title);
    expect(await route.evaluate((el) => el.scrollTop)).toBe(0);

    // Tab through the card: every stop is inside the route, on screen, shows a
    // focus indicator and comes after the previous one in the document.
    const problems: string[] = [];
    const visited: string[] = [];

    await page.evaluate(`window.__previousStop = document.activeElement`);
    for (let step = 0; step < 14; step += 1) {
      await page.keyboard.press('Tab');
      const stop = (await page.evaluate(`(() => {
        const micro = document.querySelector('.micro');
        const el = document.activeElement;
        if (!el || !micro.contains(el)) return null;
        const rect = el.getBoundingClientRect();
        const shown = micro.getBoundingClientRect();
        const style = getComputedStyle(el);
        const previous = window.__previousStop;
        window.__previousStop = el;
        return {
          indicated: (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none',
          name: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28),
          onScreen: rect.top >= shown.top - 0.5 && rect.bottom <= shown.bottom + 0.5,
          ordered: Boolean(previous.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING),
          tabindex: el.tabIndex,
        };
      })()`)) as {
        indicated: boolean;
        name: string;
        onScreen: boolean;
        ordered: boolean;
        tabindex: number;
      } | null;

      if (stop === null) {
        break;
      }
      visited.push(stop.name);
      if (!stop.onScreen) problems.push(`${stop.name}: focus is off screen`);
      if (!stop.indicated) problems.push(`${stop.name}: no focus indicator`);
      if (!stop.ordered) problems.push(`${stop.name}: out of reading order`);
      if (stop.tabindex > 0) problems.push(`${stop.name}: positive tabindex`);
    }

    expect(
      visited.length,
      `focus stops: ${visited.join(' > ')}`,
    ).toBeGreaterThan(2);
    expect(problems).toEqual([]);
  });
});

test.describe('microlearning without a bank', () => {
  test.use({ viewport: HARD });

  test('CS50x gets a notice that fits, not Programme 2’s cards', async ({
    page,
  }) => {
    await completeOnboarding(page, { programme: 'CS50x', theme: 'dark' });
    await page.goto('/rpg/micro');

    await expect(
      page.getByRole('heading', { level: 1, name: 'Nothing to practise here' }),
    ).toBeVisible();
    await expect(page.getByText('Følg variablene')).toHaveCount(0);
    await assertFits(page, 'CS50x notice');
    await assertAccessible(page, 'CS50x notice');
    await page.getByRole('link', { name: 'Back to the Campaign' }).click();
    await expect(page).toHaveURL(/\/rpg$/);
  });
});

test.describe('microlearning offers what the Campaign position allows, on one screen', () => {
  test.use({ viewport: HARD });

  const groups = (page: Page) =>
    page.getByRole('heading', { level: 2 }).allTextContents();

  test('a fresh learner has a primer and a plain line that Repeter opens later', async ({
    page,
  }) => {
    await openPicker(page, 'dark', 0);

    expect(await groups(page)).toEqual(['Forbered deg', 'Repeter']);
    await expect(page.getByRole('listitem')).toHaveCount(1);
    await expect(
      sessionButton(page, 'Python, editor og terminal'),
    ).toBeVisible();
    await expect(
      page.getByText('Repeter åpnes etter hvert som du jobber i kampanjen.'),
    ).toBeVisible();
    await expect(page.getByText('Følg variablene')).toHaveCount(0);
    await assertFits(page, 'fresh learner');
    await assertAccessible(page, 'fresh learner');
  });

  test('the physical-test learner (3 of 24 complete) is not left at a dead end', async ({
    page,
  }) => {
    await openPicker(page, 'dark', 3);

    await expect(sessionButton(page, 'Koden er bare ett steg')).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(1);
    await expect(
      page.getByText('Repeter åpnes etter hvert som du jobber i kampanjen.'),
    ).toBeVisible();
    await expect(page.getByText(/Slik leser du en feilmelding/)).toHaveCount(0);
    await assertFits(page, '3 of 24 complete');
    await assertAccessible(page, '3 of 24 complete');
  });

  test('later learners get Repeter beside the next primer, up to four rows with both groups', async ({
    page,
  }) => {
    await openPicker(page, 'dark', 13);
    await expect(page.getByRole('listitem')).toHaveCount(2);
    await expect(sessionButton(page, 'Følg variablene')).toBeVisible();
    await expect(
      sessionButton(page, 'Tall og tekst er ulike typer'),
    ).toBeVisible();
    await expect(page.getByText(/Flere åpnes/)).toBeVisible();
    await assertFits(page, '13 complete');

    // The most the picker ever shows: the next primer and three sessions.
    for (const complete of [17, 18]) {
      await seedCampaign(page, complete);
      await gotoPicker(page);
      await expect(page.getByRole('listitem')).toHaveCount(4);
      expect(await groups(page)).toEqual(['Forbered deg', 'Repeter']);
      await assertFits(page, `${complete} complete: primer and three sessions`);
      await assertAccessible(page, `${complete} complete`);
    }
  });

  test('a learner who has completed everything sees the four sessions, and no primer', async ({
    page,
  }) => {
    await openPicker(page, 'dark');

    await expect(page.getByRole('listitem')).toHaveCount(4);
    expect(await groups(page)).toEqual(['Repeter']);
    await expect(page.getByText(/Flere åpnes/)).toHaveCount(0);
    await assertFits(page, 'four sessions open');
  });

  test('every primer fits in every state of its short session, and nothing it does is stored', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await completeOnboarding(page, {
      programme: 'Programvareutvikling',
      theme: 'dark',
    });

    for (const primer of bank.primers) {
      // The learner is exactly at the mission this primer is for.
      await seedCampaign(page, requiredOrder.indexOf(primer.prepares![0]!));
      await gotoPicker(page);
      const before = await snapshotDatabase(page);

      await runSessionOf(page, primer, 'miss-twice', {
        axe: true,
        slack: true,
      });
      expect(
        await snapshotDatabase(page),
        `${primer.id}: a primer changed what is stored`,
      ).toBe(before);
    }
  });
});

test.describe('the way into microlearning from Home', () => {
  test.use({ viewport: HARD });

  const overflow = (page: Page) =>
    page.evaluate(
      `document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth`,
    ) as Promise<number>;

  test('a Programme 2 learner finds a secondary entry that fits a phone', async ({
    page,
  }) => {
    await completeOnboarding(page, {
      programme: 'Programvareutvikling',
      theme: 'dark',
    });
    await page.goto('/rpg');
    const entry = page.getByRole('link', { name: 'Åpne mikroøkt' });

    await expect(entry).toBeVisible();
    await entry.scrollIntoViewIfNeeded();
    const box = (await entry.boundingBox())!;

    expect(box.height).toBeGreaterThanOrEqual(43.5);
    expect(box.width).toBeGreaterThanOrEqual(43.5);
    expect(box.x + box.width).toBeLessThanOrEqual(HARD.width + 0.5);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    // It supports the Campaign's own call to action and never replaces it.
    await expect(
      page.locator('.rpg-hub__quest-panel a[href*="/rpg/resource/"]'),
    ).toHaveCount(1);
    await expect(entry).toHaveClass(/rpg-button--secondary/);
    await expect(
      page.locator('.rpg-hub__quest-panel a[href*="/rpg/resource/"]'),
    ).toHaveClass(/rpg-button--primary/);
    await expect(page.getByRole('navigation').first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('.rpg-hub__quest-panel')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations.map((violation) => violation.id)).toEqual([]);

    await entry.click();
    await expect(page).toHaveURL(/\/rpg\/micro$/);
    await expect(
      sessionButton(page, 'Python, editor og terminal'),
    ).toBeVisible();
  });

  test('larger text keeps the entry reachable without sideways scrolling', async ({
    page,
  }) => {
    await completeOnboarding(page, {
      programme: 'Programvareutvikling',
      theme: 'dark',
    });
    await page.goto('/rpg');
    const entry = page.getByRole('link', { name: 'Åpne mikroøkt' });

    await expect(entry).toBeVisible();
    for (const scale of [
      { mechanism: 'text', percent: 150 },
      { mechanism: 'root', percent: 200 },
    ] as const) {
      await page.addStyleTag({ content: scaleCss(scale) });
      await entry.scrollIntoViewIfNeeded();
      await expect(entry).toBeVisible();
      expect(
        await overflow(page),
        `${scale.percent}% (${scale.mechanism})`,
      ).toBeLessThanOrEqual(0);
    }
  });

  test('the 3-of-24 learner from the physical test is offered an active entry, and it opens that primer', async ({
    page,
  }) => {
    await completeOnboarding(page, {
      programme: 'Programvareutvikling',
      theme: 'dark',
    });
    await seedCampaign(page, 3);
    await page.goto('/rpg');
    const entry = page.getByRole('link', { name: 'Åpne mikroøkt' });

    await expect(entry).toBeVisible();
    await expect(
      page.getByText(
        'Mikroøkt: forbered deg på neste oppgave på noen få minutter.',
      ),
    ).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await entry.click();
    await expect(page).toHaveURL(/\/rpg\/micro$/);
    await expect(sessionButton(page, 'Koden er bare ett steg')).toBeVisible();
  });

  // The four Build-phase positions have neither a primer nor a repeat session
  // on purpose. Home must not promise one, and must not link to the picker's
  // empty notice either; the Campaign stays the one thing to do.
  for (const complete of [7, 8, 9, 10]) {
    test(`promises no session after ${complete} complete (an intentional Build phase), and fits`, async ({
      page,
    }) => {
      await completeOnboarding(page, {
        programme: 'Programvareutvikling',
        theme: 'dark',
      });
      await seedCampaign(page, complete);
      await page.goto('/rpg');
      const line = page.getByText(
        'Ingen mikroøkt akkurat nå. Fortsett kampanjen, så åpnes flere.',
      );

      await expect(line).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Åpne mikroøkt' }),
      ).toHaveCount(0);
      await expect(page.locator('a[href$="/rpg/micro"]')).toHaveCount(0);
      await expect(
        page.locator('.rpg-hub__quest-panel a[href*="/rpg/resource/"]'),
      ).toHaveClass(/rpg-button--primary/);
      await line.scrollIntoViewIfNeeded();
      expect(await overflow(page)).toBeLessThanOrEqual(0);

      const results = await new AxeBuilder({ page })
        .include('.rpg-hub__quest-panel')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations.map((violation) => violation.id)).toEqual([]);
      for (const scale of [
        { mechanism: 'text', percent: 150 },
        { mechanism: 'root', percent: 200 },
      ] as const) {
        await page.addStyleTag({ content: scaleCss(scale) });
        await line.scrollIntoViewIfNeeded();
        await expect(line).toBeVisible();
        expect(
          await overflow(page),
          `${scale.percent}% (${scale.mechanism})`,
        ).toBeLessThanOrEqual(0);
      }
    });
  }

  test.describe('on a tall S22+ class phone', () => {
    test.use({ viewport: PHONE });

    for (const [complete, active] of [
      [0, true],
      [8, false],
    ] as const) {
      test(`Home after ${complete} complete: ${active ? 'active entry' : 'passive line'}, no sideways scroll`, async ({
        page,
      }) => {
        await completeOnboarding(page, {
          programme: 'Programvareutvikling',
          theme: 'light',
        });
        await seedCampaign(page, complete);
        await page.goto('/rpg');

        await expect(
          page.locator('.rpg-hub__quest-panel a[href*="/rpg/resource/"]'),
        ).toBeVisible();
        await expect(
          page.getByRole('link', { name: 'Åpne mikroøkt' }),
        ).toHaveCount(active ? 1 : 0);
        await expect(
          page.getByText(
            active
              ? /^Mikroøkt: forbered deg/
              : 'Ingen mikroøkt akkurat nå. Fortsett kampanjen, så åpnes flere.',
          ),
        ).toBeVisible();
        expect(await overflow(page)).toBeLessThanOrEqual(0);
      });
    }
  });

  test('a CS50x learner is offered no microlearning', async ({ page }) => {
    await completeOnboarding(page, { programme: 'CS50x', theme: 'dark' });
    await page.goto('/rpg');

    await expect(
      page.getByRole('link', { name: 'Campaign' }).first(),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Åpne mikroøkt' })).toHaveCount(
      0,
    );
    await expect(page.getByText(/Mikroøkt|Ingen mikroøkt/)).toHaveCount(0);
  });
});

test.describe('one physical activation, one progression, in a real browser', () => {
  test.use({ viewport: HARD });

  const heading = (page: Page) => page.getByRole('heading', { level: 1 });

  test('a double click on Sjekk shows the feedback instead of skipping it', async ({
    page,
  }) => {
    await openPicker(page, 'dark');
    const session = bank.sessions[0]!;

    await activate(page, sessionButton(page, session.title));
    await playCard(page, session.cards[0]!, 0, 6, 'right', {
      axe: false,
      slack: false,
    });
    await playCard(page, session.cards[1]!, 1, 6, 'right', {
      axe: false,
      slack: false,
    });
    const order = session.cards[2]!;

    await expect(heading(page)).toHaveText(order.title);
    await tapAll(page, rightTaps(order));
    await doubleTap(page, action(page, 'Sjekk'));

    await expect(heading(page)).toHaveText(order.title);
    await expect(status(page)).toContainText('Riktig.');
    await expect(action(page, 'Neste')).toBeVisible();

    await press(page, 'Neste');
    await expect(heading(page)).toHaveText(session.cards[3]!.title);
  });

  test('a double click on Neste after an answer does not skip the Learn card that follows', async ({
    page,
  }) => {
    await openPicker(page, 'dark');
    const session = bank.sessions[1]!;

    await activate(page, sessionButton(page, session.title));
    for (const [at, card] of session.cards.slice(0, 2).entries()) {
      await playCard(page, card, at, 6, 'right', { axe: false, slack: false });
    }
    const match = session.cards[2]!;

    await expect(heading(page)).toHaveText(match.title);
    await tapAll(page, rightTaps(match));
    await expect(status(page)).toContainText('Riktig.');
    await doubleTap(page, action(page, 'Neste'));

    await expect(heading(page)).toHaveText(session.cards[3]!.title);
    await expect(
      page.getByRole('progressbar', { name: 'Framdrift i økten' }),
    ).toHaveAttribute('aria-valuetext', 'Kort 4 av 6');
  });

  test('a double click on Fullfør does not leave the finished screen', async ({
    page,
  }) => {
    await openPicker(page, 'dark');
    const session = bank.sessions[3]!;

    await activate(page, sessionButton(page, session.title));
    for (const [at, card] of session.cards.slice(0, 5).entries()) {
      await playCard(page, card, at, 6, 'right', { axe: false, slack: false });
    }
    const last = session.cards[5]!;

    await tapAll(page, rightTaps(last));
    await press(page, 'Sjekk');
    await expect(status(page)).toContainText('Riktig.');
    await doubleTap(page, action(page, 'Fullfør'));

    await expect(heading(page)).toHaveText('Økten er ferdig');
    await expect(page).toHaveURL(/\/rpg\/micro$/);

    await waitOutGuard(page);
    await page.getByRole('link', { name: 'Tilbake til kampanjen' }).click();
    await expect(page).toHaveURL(/\/rpg$/);
  });
});

// Every object store of the learner database, serialised, so a session that
// wrote anything (evidence, XP, positions, achievements) would differ.
async function snapshotDatabase(page: Page) {
  return (await page.evaluate(`
    new Promise((resolve, reject) => {
      const request = indexedDB.open('progresspal-cs50-edition');
      request.onerror = () => reject(new Error('open failed'));
      request.onsuccess = async () => {
        const database = request.result;
        try {
          const out = {};
          for (const name of Array.from(database.objectStoreNames).sort()) {
            out[name] = await new Promise((done, fail) => {
              const read = database.transaction(name, 'readonly').objectStore(name).getAll();
              read.onerror = () => fail(new Error('read failed: ' + name));
              read.onsuccess = () => done(read.result);
            });
          }
          resolve(JSON.stringify(out));
        } catch (error) {
          reject(error);
        } finally {
          database.close();
        }
      };
    });
  `)) as string;
}

// «Tenk som en utvikler», the voluntary track: the same card contract (one
// card is one viewport at 360 x 560, every state of every card; enlarged text
// scrolls the route and clips nothing), its own six-row list, and a Home entry
// that needs no Campaign progress. Screenshots are written only when
// TRACK_SCREENSHOT_DIR is set, outside the repository.
const [thinkingTrack] = bank.tracks;
const trackPath = `/rpg/track/${thinkingTrack!.id}`;
const screenshotDir = process.env.TRACK_SCREENSHOT_DIR;

async function shoot(page: Page, name: string) {
  if (screenshotDir !== undefined) {
    await page.screenshot({ path: join(screenshotDir, `${name}.png`) });
  }
}

async function openTrack(page: Page, theme: 'dark' | 'light', scale?: Scale) {
  await completeOnboarding(page, { programme: 'Programvareutvikling', theme });
  await page.goto(trackPath);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    thinkingTrack!.title,
  );
  if (scale !== undefined) {
    await page.addStyleTag({ content: scaleCss(scale) });
  }
}

async function runTrackSession(
  page: Page,
  index: number,
  mode: Mode,
  checks: Checks,
  shots = false,
) {
  const session = thinkingTrack!.sessions[index]!;
  const heading = page.getByRole('heading', { level: 1 });

  await expect(heading).toHaveText(thinkingTrack!.title);
  await assertState(page, `${session.id}: list`, checks);
  if (checks.axe) {
    await assertAccessible(page, `${session.id}: list`);
  }
  await activate(
    page,
    page.getByRole('button', { name: new RegExp(`^${index + 1}\\. `) }),
  );

  for (const [cardIndex, card] of session.cards.entries()) {
    if (shots && cardIndex < 3) {
      await expect(heading).toHaveText(card.title);
      await shoot(page, `${session.id}-${cardIndex + 1}-prompt`);
    }
    await playCard(page, card, cardIndex, session.cards.length, mode, checks);
  }

  await expect(heading).toHaveText('Hva tar jeg med meg?');
  await assertState(page, `${session.id}: takeaway`, checks);
  if (checks.axe) {
    await assertAccessible(page, `${session.id}: takeaway`);
  }
  if (shots) {
    await shoot(page, `${session.id}-takeaway`);
  }
  await press(page, 'Velg en annen aktivitet');
}

const trackIndexes = thinkingTrack!.sessions.map((_, index) => index);

test.describe('«Tenk som en utvikler» at 360 x 560', () => {
  test.use({ viewport: HARD });

  test('every card state fits when missed twice, dark theme, with axe', async ({
    page,
  }) => {
    test.setTimeout(420_000);
    await openTrack(page, 'dark');
    await shoot(page, 'track-list-360x560');
    for (const index of trackIndexes) {
      await runTrackSession(page, index, 'miss-twice', {
        axe: true,
        slack: false,
      });
    }
  });

  test('every card state fits when solved first time, light theme, with axe', async ({
    page,
  }) => {
    test.setTimeout(420_000);
    await openTrack(page, 'light');
    for (const index of trackIndexes) {
      await runTrackSession(
        page,
        index,
        'right',
        { axe: true, slack: false },
        index === 0 || index === 3,
      );
    }
  });

  test('a wrong option says why it is wrong, then the retry offers the hint', async ({
    page,
  }) => {
    await openTrack(page, 'dark');
    await activate(page, page.getByRole('button', { name: /^1\. / }));
    await press(page, 'Neste');
    const card = thinkingTrack!.sessions[0]!.cards[1] as unknown as {
      correctId: string;
      hint: string;
      options: { feedback?: string; id: string; label: string }[];
    };
    const wrong = card.options.find((option) => option.id !== card.correctId)!;

    await page.getByRole('button', { name: wrong.label }).click();
    await expect(status(page)).toContainText(wrong.feedback!);
    await shoot(page, 'feedback-wrong-option-360x560');
    await press(page, 'Prøv igjen');
    await expect(status(page)).toContainText(card.hint);
  });

  test('a fresh learner with no Campaign progress finds the entry on Home, and it fits', async ({
    page,
  }) => {
    await completeOnboarding(page, {
      programme: 'Programvareutvikling',
      theme: 'dark',
    });
    await page.goto('/rpg');
    const entry = page.getByRole('link', {
      name: `Åpne ${thinkingTrack!.title}`,
    });

    await expect(entry).toBeVisible();
    await entry.scrollIntoViewIfNeeded();
    const box = (await entry.boundingBox())!;

    expect(box.height).toBeGreaterThanOrEqual(43.5);
    expect(box.x + box.width).toBeLessThanOrEqual(HARD.width + 0.5);
    await shoot(page, 'home-entry-360x560');
    await entry.click();
    await expect(page).toHaveURL(new RegExp(`${trackPath}$`));
    await expect(page.getByRole('listitem')).toHaveCount(6);
  });

  test('the keyboard reaches an activity, and focus lands on each new card', async ({
    page,
  }) => {
    await openTrack(page, 'dark');
    const first = page.getByRole('button', { name: /^1\. / });

    await first.focus();
    await expect(first).toBeFocused();
    await waitOutGuard(page);
    await page.keyboard.press('Enter');
    const heading = page.getByRole('heading', { level: 1 });

    await expect(heading).toHaveText(
      thinkingTrack!.sessions[0]!.cards[0]!.title,
    );
    await expect(heading).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(action(page, 'Neste')).toBeFocused();
    // A keyboard press is not recorded by activate(): wait the guard out.
    await page.waitForTimeout(GUARD_WAIT_MS);
    await page.keyboard.press('Enter');
    await expect(heading).toHaveText(
      thinkingTrack!.sessions[0]!.cards[1]!.title,
    );
    await expect(heading).toBeFocused();
  });

  test('closing leaves for Home, and the track starts over; nothing is stored', async ({
    page,
  }) => {
    await openTrack(page, 'dark');
    const before = await snapshotDatabase(page);

    await activate(page, page.getByRole('button', { name: /^2\. / }));
    await press(page, 'Neste');
    await page.getByRole('link', { name: 'Lukk mikroøkten' }).click();
    await expect(page).toHaveURL(/\/rpg$/);
    await page.goto(trackPath);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      thinkingTrack!.title,
    );
    expect(await snapshotDatabase(page)).toBe(before);
  });

  test('CS50x has neither the entry nor the track', async ({ page }) => {
    await completeOnboarding(page);
    await page.goto('/rpg');
    await expect(page.getByRole('navigation').first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: `Åpne ${thinkingTrack!.title}` }),
    ).toHaveCount(0);
    await page.goto(trackPath);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Ingenting å øve på her',
    );
    await assertFits(page, 'CS50x track notice');
  });
});

test.describe('«Tenk som en utvikler» on a Galaxy S22+ class phone', () => {
  test.use({ viewport: PHONE });

  test('every card state fits when solved on the retry', async ({ page }) => {
    test.setTimeout(420_000);
    await openTrack(page, 'dark');
    await shoot(page, 'track-list-384x800');
    for (const index of trackIndexes) {
      await runTrackSession(
        page,
        index,
        'retry-right',
        { axe: false, slack: false },
        index === 1,
      );
    }
  });
});

test.describe('«Tenk som en utvikler» at enlarged text', () => {
  test.use({ viewport: HARD });

  for (const scale of [
    { mechanism: 'text', percent: 150 },
    { mechanism: 'root', percent: 200 },
  ] as Scale[]) {
    test(`every card state stays reachable at ${scale.percent}% (${scale.mechanism} scale)`, async ({
      page,
    }) => {
      test.setTimeout(420_000);
      routeScrolled = 0;
      await openTrack(page, 'dark', scale);
      for (const index of trackIndexes) {
        await runTrackSession(page, index, 'miss-twice', {
          axe: false,
          enlarged: true,
          slack: false,
        });
      }
      expect(routeScrolled, 'states where the route scrolled').toBeGreaterThan(
        0,
      );
    });
  }
});
