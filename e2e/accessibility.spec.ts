import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

type BrowserElement = {
  appendChild(child: BrowserElement): void;
  body?: BrowserElement;
  classList: { contains(value: string): boolean };
  className: string;
  id: string;
  nextElementSibling: BrowserElement | null;
  parentElement: BrowserElement | null;
  remove(): void;
  setAttribute(name: string, value: string): void;
  textContent: string | null;
};

type BrowserStyle = {
  animationDuration: string;
  backgroundColor: string;
  backgroundImage: string;
  color: string;
  outlineStyle: string;
  outlineWidth: string;
};

declare const document: {
  activeElement: BrowserElement | null;
  body: BrowserElement;
  createElement(tagName: string): BrowserElement;
  querySelector(selector: string): BrowserElement | null;
};
declare const HTMLElement: new () => BrowserElement;
declare const HTMLInputElement: new () => BrowserElement;
declare function getComputedStyle(element: BrowserElement): BrowserStyle;

// Module 18 - Accessibility and UX hardening.
//
// These tests guard what axe cannot: axe does not evaluate the colour produced
// by gradient or hardcoded card backgrounds, which is exactly how the dark-theme
// `.card--accent` / `.card--subtle` / `.card--danger` contrast defect went
// unnoticed. Every claimed contrast surface is checked here either on a real
// reachable route/state or via a browser-rendered CSS fixture (a DOM node that
// receives the global production classes), paired with component class-contract
// tests under tests/components/. No product route is added and no app
// failure/loading state is forced.
//
// The in-app reduce-motion setting is isolated from the OS-level
// prefers-reduced-motion path so this suite verifies the in-app toggle itself.
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

const MIN_CONTRAST = 4.5;

// A serialisable fixture node, built into the DOM with safe DOM methods (no
// innerHTML) so it receives the global production stylesheet.
type FixtureNode = {
  attrs?: Record<string, string>;
  children?: FixtureNode[];
  className?: string;
  tag: string;
  text?: string;
};

// Serialised in the page to measure the real, composited contrast a user sees.
// Returns the WCAG ratio of an element's text colour against the effective
// background behind it (compositing translucent layers over the first opaque
// ancestor), and flags when a non-`none` background-image (e.g. a light gradient)
// sits behind the text - which dark theme must not have for these surfaces.
const MEASURE = (selector: string) => {
  const parse = (value: string) => {
    const parts = (value.match(/[\d.]+/g) ?? []).map(Number);
    return {
      r: parts[0] ?? 0,
      g: parts[1] ?? 0,
      b: parts[2] ?? 0,
      a: parts.length >= 4 ? (parts[3] ?? 1) : 1,
    };
  };

  type Rgb = { b: number; g: number; r: number };

  const over = (
    fg: { a: number; b: number; g: number; r: number },
    bg: Rgb,
  ): Rgb => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
  });

  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const luminance = (c: Rgb) =>
    0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);

  const ratio = (a: Rgb, b: Rgb) => {
    const la = luminance(a);
    const lb = luminance(b);
    const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
  };

  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    return { found: false } as const;
  }

  // Effective background: walk up compositing translucent layers until an opaque
  // colour is reached. Stop and flag if a gradient/image background is in the way.
  const layers: Array<{ a: number; b: number; g: number; r: number }> = [];
  let base: Rgb | null = null;
  let gradientBehind = false;
  let node: BrowserElement | null = element;

  while (node) {
    const style = getComputedStyle(node);
    if (style.backgroundImage && style.backgroundImage !== 'none') {
      gradientBehind = true;
      break;
    }
    const color = parse(style.backgroundColor);
    if (color.a > 0) {
      if (color.a >= 1) {
        base = { r: color.r, g: color.g, b: color.b };
        break;
      }
      layers.push(color);
    }
    node = node.parentElement;
  }

  if (gradientBehind || base === null) {
    return { found: true, gradientBehind, ratio: 0 } as const;
  }

  // Composite collected translucent layers (top-down) over the opaque base.
  let effective: Rgb = base;
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    effective = over(layers[index]!, effective);
  }

  const textColor = parse(getComputedStyle(element).color);
  const text =
    textColor.a >= 1
      ? { r: textColor.r, g: textColor.g, b: textColor.b }
      : over(textColor, effective);

  return {
    found: true,
    gradientBehind: false,
    ratio: ratio(text, effective),
  } as const;
};

async function measureContrast(page: Page, selector: string) {
  const result = await page.evaluate(MEASURE, selector);
  expect(result.found, `expected to find ${selector}`).toBe(true);
  return result as { found: true; gradientBehind: boolean; ratio: number };
}

async function completeOnboardingDark(page: Page) {
  await completeOnboarding(page);

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
}

async function completeOnboardingLight(page: Page) {
  await completeOnboarding(page, { theme: 'light' });

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
}

// Builds a fixture node tree with createElement/textContent (no innerHTML) inside
// a `#a11y-fixture` host, so it inherits the live dark-theme global stylesheet.
// Translucent fills are wrapped in a default card in the specs so they composite
// over a real surface rather than the gradient body background.
async function mountFixture(page: Page, spec: FixtureNode) {
  await page.evaluate((node) => {
    const build = (descriptor: typeof node) => {
      const created = document.createElement(descriptor.tag);
      if (descriptor.className) {
        created.className = descriptor.className;
      }
      for (const [name, value] of Object.entries(descriptor.attrs ?? {})) {
        created.setAttribute(name, value);
      }
      if (descriptor.text) {
        created.textContent = descriptor.text;
      }
      for (const child of descriptor.children ?? []) {
        created.appendChild(build(child));
      }
      return created;
    };

    const host = document.createElement('div');
    host.id = 'a11y-fixture';
    host.appendChild(build(node));
    const main = document.querySelector('#main-content') ?? document.body;
    main.appendChild(host);
  }, spec);
}

async function unmountFixture(page: Page) {
  await page.evaluate(() => {
    document.querySelector('#a11y-fixture')?.remove();
  });
}

test('real reachable routes meet dark-theme contrast with no light gradient behind text', async ({
  page,
}) => {
  await completeOnboardingDark(page);

  // `.card--accent` renders live on Home (saved-profile card).
  await page.goto('/profile');
  await expect(
    page.getByRole('heading', { name: 'Local profile for Alex' }),
  ).toBeVisible();
  const accent = await measureContrast(
    page,
    '.card--accent .card__description',
  );
  expect(accent.gradientBehind).toBe(false);
  expect(accent.ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);

  // `.card--subtle` via EmptyState renders live on the not-found route.
  await page.goto('/missing-route');
  await expect(
    page.getByRole('heading', { name: 'No route matches this address' }),
  ).toBeVisible();
  const emptyState = await measureContrast(
    page,
    '.state-card .state-card__description',
  );
  expect(emptyState.gradientBehind).toBe(false);
  expect(emptyState.ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);

  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
});

test('design-system fixture surfaces meet dark-theme contrast with no light gradient', async ({
  page,
}) => {
  await completeOnboardingDark(page);
  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { name: 'Course progress' }),
  ).toBeVisible();

  // ErrorState (.card--danger) - only reachable via app startup failure, so use a
  // browser-rendered CSS fixture carrying the production classes.
  await mountFixture(page, {
    tag: 'section',
    className: 'card card--danger card--comfortable error-state',
    attrs: { role: 'alert' },
    children: [
      {
        tag: 'div',
        className: 'error-state__content',
        children: [
          {
            tag: 'p',
            className: 'error-state__eyebrow',
            text: 'Needs attention',
          },
          {
            tag: 'h3',
            className: 'error-state__title',
            text: 'Local startup failed',
          },
          {
            tag: 'p',
            className: 'error-state__description',
            text: 'Local data could not be loaded.',
          },
        ],
      },
    ],
  });
  const danger = await measureContrast(
    page,
    '#a11y-fixture .error-state__description',
  );
  expect(danger.gradientBehind).toBe(false);
  expect(danger.ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);
  await unmountFixture(page);

  // LoadingState (.card--subtle) - transient, so cover it via the fixture too.
  await mountFixture(page, {
    tag: 'section',
    className: 'card card--subtle card--comfortable loading-state',
    attrs: { role: 'status' },
    children: [
      {
        tag: 'div',
        className: 'loading-state__header',
        children: [
          {
            tag: 'span',
            className: 'loading-state__bar',
            attrs: { 'aria-hidden': 'true' },
          },
          {
            tag: 'div',
            children: [
              {
                tag: 'h3',
                className: 'loading-state__title',
                text: 'Preparing your workspace',
              },
              {
                tag: 'p',
                className: 'loading-state__description',
                text: 'Opening local data stores.',
              },
            ],
          },
        ],
      },
    ],
  });
  const loading = await measureContrast(
    page,
    '#a11y-fixture .loading-state__description',
  );
  expect(loading.gradientBehind).toBe(false);
  expect(loading.ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);
  await unmountFixture(page);

  // `.badge--warning` text on its (dark-theme translucent) fill.
  await mountFixture(page, {
    tag: 'section',
    className: 'card card--default card--comfortable',
    children: [
      { tag: 'span', className: 'badge badge--warning', text: 'Warning' },
    ],
  });
  const warningBadge = await measureContrast(
    page,
    '#a11y-fixture .badge--warning',
  );
  expect(warningBadge.gradientBehind).toBe(false);
  expect(warningBadge.ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);
  await unmountFixture(page);

  // Invalid field background must keep its value text readable in dark theme.
  await mountFixture(page, {
    tag: 'section',
    className: 'card card--default card--comfortable',
    children: [
      {
        tag: 'input',
        className: 'field-control',
        attrs: {
          'aria-invalid': 'true',
          value: 'Invalid value',
          readonly: 'readonly',
        },
      },
    ],
  });
  const invalidField = await measureContrast(
    page,
    '#a11y-fixture .field-control',
  );
  expect(invalidField.gradientBehind).toBe(false);
  expect(invalidField.ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);
  await unmountFixture(page);
});

test('shared RPG capability surfaces keep measured dark contrast under a light profile preference', async ({
  page,
}) => {
  await completeOnboardingLight(page);

  const surfaces = [
    {
      heading: 'Focus',
      path: '/rpg/focus?itemId=week-0-lecture',
      selector: '.rpg-focus .card--accent .card__description',
    },
    {
      heading: 'Achievements',
      path: '/rpg/badges',
      selector: '.rpg-badges .achievement-card__how',
    },
    {
      heading: 'Insights',
      path: '/rpg/log',
      selector: '.rpg-log .card__description',
    },
    {
      heading: 'Settings',
      path: '/rpg/settings',
      selector: '.rpg-settings .card__title',
    },
  ] as const;

  for (const surface of surfaces) {
    await page.goto(surface.path);
    await expect(
      page.getByRole('heading', { exact: true, name: surface.heading }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator(surface.selector).first()).toBeVisible();

    const contrast = await measureContrast(page, surface.selector);

    expect(contrast.gradientBehind).toBe(false);
    expect(contrast.ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);
  }
});

test('primary and danger buttons stay readable on hover in dark theme', async ({
  page,
}) => {
  await completeOnboardingDark(page);

  // Primary button hover - the "Open dashboard" CTA on the Tracker profile.
  await page.goto('/profile');
  const primary = page.getByRole('link', { name: 'Open dashboard' });
  await primary.hover();
  await expect(page.locator('.button--primary')).toHaveCount(1);
  const primaryHover = await measureContrast(page, '.button--primary');
  expect(primaryHover.ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);

  // Danger button hover - enable the Settings reset button via normal input
  // (typing the confirmation phrase), then hover only. Nothing is clicked, so no
  // data is mutated.
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByLabel('Confirmation phrase').fill('RESET');
  const danger = page.getByRole('button', { name: 'Reset all local data' });
  await expect(danger).toBeEnabled();
  await danger.hover();
  await expect(page.locator('.button--danger')).toHaveCount(1);
  const dangerHover = await measureContrast(page, '.button--danger');
  expect(dangerHover.ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);
});

test('the custom checkbox shows a visible keyboard focus indicator in dark theme', async ({
  page,
}) => {
  await completeOnboardingDark(page);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  const checkbox = page.getByLabel('Reduce motion in this app');
  // Land focus on the input via the keyboard so :focus-visible matches.
  await checkbox.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(checkbox).toBeFocused();

  const focusOutline = await page.evaluate(() => {
    // Read the indicator of the actually-focused checkbox input (Settings has
    // several checkboxes, so the focused one is not necessarily the first).
    const input = document.activeElement;
    const indicator = input?.nextElementSibling;
    if (
      !(input instanceof HTMLInputElement) ||
      !input.classList.contains('checkbox__input') ||
      !(indicator instanceof HTMLElement)
    ) {
      return { width: 0, style: 'none', matched: false };
    }
    const style = getComputedStyle(indicator);
    return {
      width: Number.parseFloat(style.outlineWidth) || 0,
      style: style.outlineStyle,
      matched: true,
    };
  });

  expect(focusOutline.matched).toBe(true);

  expect(focusOutline.style).not.toBe('none');
  expect(focusOutline.width).toBeGreaterThan(0);
});

test('an RPG settings toast does not cover the bottom navigation', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { height: 844, width: 390 },
  });
  const page = await context.newPage();

  await completeOnboardingDark(page);
  await page.goto('/rpg/settings');
  await page.getByRole('button', { name: 'Save local settings' }).click();
  await expect(
    page.getByRole('status').getByText('Local profile saved'),
  ).toBeVisible();

  const toastBox = await page.locator('.toast').boundingBox();
  const navigationBox = await page
    .getByRole('navigation', { name: 'RPG bottom navigation' })
    .boundingBox();

  expect(toastBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(toastBox!.y + toastBox!.height).toBeLessThanOrEqual(navigationBox!.y);
  await context.close();
});

test('the in-app reduce-motion setting neutralizes keyframe animations', async ({
  page,
}) => {
  await completeOnboardingDark(page);
  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { name: 'Course progress' }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');

  // The looping spinner/skeleton animations are not naturally on screen here, so
  // mount them via the fixture; under the in-app reduced-motion toggle they must
  // be neutralized (duration ~0), matching the OS prefers-reduced-motion path.
  await mountFixture(page, {
    tag: 'div',
    children: [
      { tag: 'span', className: 'button__spinner' },
      { tag: 'span', className: 'loading-state__bar' },
      { tag: 'span', className: 'loading-state__line' },
    ],
  });

  const durations = await page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector(`#a11y-fixture ${selector}`);
      if (!(element instanceof HTMLElement)) {
        return Number.NaN;
      }
      const value = getComputedStyle(element)
        .animationDuration.split(',')[0]!
        .trim();
      if (value.endsWith('ms')) {
        return Number.parseFloat(value);
      }
      if (value.endsWith('s')) {
        return Number.parseFloat(value) * 1000;
      }
      return Number.parseFloat(value) || 0;
    };
    return {
      spinner: read('.button__spinner'),
      bar: read('.loading-state__bar'),
      line: read('.loading-state__line'),
    };
  });

  await unmountFixture(page);

  expect(durations.spinner).toBeLessThanOrEqual(1);
  expect(durations.bar).toBeLessThanOrEqual(1);
  expect(durations.line).toBeLessThanOrEqual(1);
});

test('the RPG resource form has a complete keyboard path and clean invalid state', async ({
  page,
}) => {
  await completeOnboardingDark(page);
  await page.goto('/rpg/resource/week-4-problem-set');
  await expect(
    page.getByRole('heading', { name: 'Problem Set 4: Memory' }),
  ).toBeVisible();

  const resourceFields = page.locator('label.rpg-study-resource__field');
  const progress = resourceFields
    .filter({ hasText: /^Progress/ })
    .locator('select');
  const note = resourceFields
    .filter({ hasText: /^Add study note/ })
    .locator('textarea');
  const confidence = resourceFields
    .filter({ hasText: /^How sure are you/ })
    .locator('select');
  const detailsSummary = page.locator('summary', { hasText: 'More details' });

  await progress.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(progress).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(note).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(detailsSummary).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(confidence).toBeFocused();

  await progress.selectOption('completed');
  await page.getByRole('button', { name: 'Save progress' }).click();
  await expect(
    page.getByRole('heading', { name: 'Progress saved' }),
  ).toBeVisible();

  await progress.selectOption('accepted');
  const evidence = resourceFields
    .filter({ hasText: /^Submission note/ })
    .locator('textarea');
  await expect(evidence).toBeVisible();
  await page.getByRole('button', { name: 'Save progress' }).click();
  await expect(evidence).toHaveAttribute('aria-invalid', 'true');
  await expect(evidence).toHaveAttribute(
    'aria-describedby',
    'rpg-resource-evidence-error',
  );

  const scan = await new AxeBuilder({ page }).analyze();
  expect(scan.violations).toEqual([]);
});

// Route tables mirror the headings asserted in e2e/release-candidate.spec.ts so
// the axe sweeps scan the same reachable surfaces the release gate walks.
const classicAxeRoutes = [
  { heading: 'Dashboard', path: '/dashboard' },
  { heading: 'Course Map', path: '/course' },
  { heading: 'Log Lecture', path: '/course/week-0-lecture' },
  { heading: 'Study sessions', path: '/sessions' },
  { heading: 'Achievements', path: '/achievements' },
  { heading: 'Insights', path: '/insights' },
  { heading: 'Settings', path: '/settings' },
] as const;

const classicLightAxeRoutes = [
  { heading: 'Dashboard', path: '/dashboard' },
  { heading: 'Log Lecture', path: '/course/week-0-lecture' },
  { heading: 'Study sessions', path: '/sessions' },
  { heading: 'Settings', path: '/settings' },
] as const;

const rpgAxeRoutes = [
  { heading: 'RPG Hub', path: '/rpg' },
  { heading: 'Campaign Map', path: '/rpg/map' },
  { heading: 'Week 4: Memory', path: '/rpg/week/week-4' },
  { heading: 'Lecture 0: Scratch', path: '/rpg/resource/week-0-lecture' },
  { heading: 'Live focus session', path: '/rpg/focus' },
  { heading: 'Hero Profile', path: '/rpg/hero' },
  { heading: 'Achievements', path: '/rpg/badges' },
  { heading: 'Insights', path: '/rpg/log' },
  { heading: 'Settings', path: '/rpg/settings' },
] as const;

test('classic routes pass axe in dark theme', async ({ page }) => {
  await completeOnboardingDark(page);

  for (const route of classicAxeRoutes) {
    await page.goto(route.path);
    await expect(
      page.getByRole('heading', { exact: true, name: route.heading }),
    ).toBeVisible({ timeout: 15000 });

    const scan = await new AxeBuilder({ page }).analyze();
    expect(scan.violations).toEqual([]);
  }
});

test('key classic routes pass axe in light theme', async ({ page }) => {
  await completeOnboardingLight(page);

  for (const route of classicLightAxeRoutes) {
    await page.goto(route.path);
    await expect(
      page.getByRole('heading', { exact: true, name: route.heading }),
    ).toBeVisible({ timeout: 15000 });

    const scan = await new AxeBuilder({ page }).analyze();
    expect(scan.violations).toEqual([]);
  }
});

test('RPG routes pass axe', async ({ page }) => {
  await completeOnboardingDark(page);

  for (const route of rpgAxeRoutes) {
    await page.goto(route.path);
    await expect(
      page.getByRole('heading', { exact: true, name: route.heading }),
    ).toBeVisible({ timeout: 15000 });

    const scan = await new AxeBuilder({ page }).analyze();
    expect(scan.violations).toEqual([]);
  }
});

test('route changes move focus to the main content region', async ({
  page,
}) => {
  await completeOnboardingDark(page);

  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { exact: true, name: 'Dashboard' }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Insights' })
    .click();
  await expect(page.locator('#main-content')).toBeFocused();

  await page.goto('/rpg');
  await expect(
    page.getByRole('heading', { exact: true, name: 'RPG Hub' }),
  ).toBeVisible({ timeout: 15000 });
  await page
    .getByRole('navigation', { name: 'RPG bottom navigation' })
    .getByRole('link', { name: 'Map' })
    .click();
  await expect(page.locator('#rpg-main-content')).toBeFocused();
});
