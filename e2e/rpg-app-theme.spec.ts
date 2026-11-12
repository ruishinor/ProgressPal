/// <reference lib="dom" />
import { writeFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

import { completeOnboarding } from './support/onboarding';

/**
 * App-wide theme (owner decision, Epic C / C1 theme repair): the single
 * learner preference `preferredTheme` (system | light | dark) drives BOTH the
 * Classic and the RPG interface. RPG keeps its own identity in both themes.
 *
 * These checks read computed RPG tokens and the real rendered canvas; the root
 * `data-theme` attribute alone is not accepted as proof of an RPG light theme.
 */

interface ThemeScope {
  document: {
    body: unknown;
    documentElement: { dataset: Record<string, string | undefined> };
  };
  getComputedStyle(element: unknown): {
    backgroundColor: string;
    borderColor: string;
    color: string;
    outlineColor: string;
    outlineStyle: string;
    getPropertyValue(name: string): string;
  };
}

type RpgPaletteSample = {
  bodyBackground: string;
  bodyBackgroundLuminance: number;
  bodyClassActive: boolean;
  navShade: string;
  rootTheme: string | undefined;
  tokens: Record<string, string>;
};

/** The accepted dark RPG palette; dark mode must keep these exact values. */
const darkRpgPalette: Record<string, string> = {
  '--rpg-accent': '#d6ad5c',
  '--rpg-accent-strong': '#f1d28b',
  '--rpg-bg': '#111923',
  '--rpg-border': '#405064',
  '--rpg-border-strong': '#8b7951',
  '--rpg-danger': '#d8897e',
  '--rpg-focus-ring': '#f3cf7d',
  '--rpg-progress': '#c9943e',
  '--rpg-success': '#78b98c',
  '--rpg-surface': '#172331',
  '--rpg-surface-raised': '#203041',
  '--rpg-text': '#f4f1e8',
  '--rpg-text-muted': '#c7d0d6',
  '--rpg-warning': '#d8a84f',
};

function hexLuminance(hex: string) {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => {
    const c = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

/** sRGB channels (0-255) of `#rrggbb` or a computed `rgb(r, g, b)`. */
function channelsOf(color: string) {
  if (color.startsWith('#')) {
    return [1, 3, 5].map((offset) =>
      Number.parseInt(color.slice(offset, offset + 2), 16),
    );
  }
  const channels = (color.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
  return color.startsWith('color(srgb')
    ? channels.map((channel) => channel * 255)
    : channels;
}

function contrastBetween(foreground: string, background: string) {
  const luminances = [foreground, background].map((color) => {
    const [r, g, b] = channelsOf(color).map((value) => {
      const c = value / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  });
  return (Math.max(...luminances) + 0.05) / (Math.min(...luminances) + 0.05);
}

/**
 * Warmth/neutrality of a colour in OKLab: `b` > 0 leans yellow (cream,
 * beige, parchment), and chroma is the overall colour intensity.
 */
function oklabWarmth(color: string) {
  const [r, g, b] = channelsOf(color).map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(
    0.4122214708 * r! + 0.5363325363 * g! + 0.0514459929 * b!,
  );
  const m = Math.cbrt(
    0.2119034982 * r! + 0.6806995451 * g! + 0.1073969566 * b!,
  );
  const s = Math.cbrt(
    0.0883024619 * r! + 0.2817188376 * g! + 0.6299787005 * b!,
  );
  const labA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const labB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { b: labB, chroma: Math.hypot(labA, labB) };
}

/**
 * Owner constraint for RPG light (C1-R2): the light neutrals are restrained
 * neutral-to-cool, never cream/beige/parchment/yellow-white and not strongly
 * blue. Exact light values stay provisional until owner visual acceptance.
 */
function expectNeutralCool(name: string, color: string) {
  const { b, chroma } = oklabWarmth(color);
  expect(b, `${name} ${color} leans warm/yellow`).toBeLessThanOrEqual(0);
  expect(chroma, `${name} ${color} is not low-chroma`).toBeLessThanOrEqual(
    0.025,
  );
}

async function sampleRpgPalette(page: Page): Promise<RpgPaletteSample> {
  return page.evaluate((names) => {
    const scope = globalThis as unknown as ThemeScope;
    const body = scope.document.body as {
      classList: { contains(c: string): boolean };
    };
    const style = scope.getComputedStyle(scope.document.body);
    const match = style.backgroundColor.match(/\d+(\.\d+)?/g) ?? [
      '0',
      '0',
      '0',
    ];
    const [r, g, b] = match.slice(0, 3).map((part) => {
      const c = Number(part) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return {
      bodyBackground: style.backgroundColor,
      bodyBackgroundLuminance: 0.2126 * r! + 0.7152 * g! + 0.0722 * b!,
      bodyClassActive: body.classList.contains('rpg-route-active'),
      navShade: style.getPropertyValue('--rpg-nav-shade').trim(),
      rootTheme: scope.document.documentElement.dataset.theme,
      tokens: Object.fromEntries(
        names.map((name) => [name, style.getPropertyValue(name).trim()]),
      ),
    };
  }, Object.keys(darkRpgPalette));
}

async function openRpgHub(page: Page) {
  await page.goto('/rpg');
  await expect(
    page.getByRole('heading', { exact: true, name: 'Home' }),
  ).toBeVisible();
}

function expectLightRpg(sample: RpgPaletteSample) {
  expect(sample.bodyClassActive).toBe(true);
  expect(sample.rootTheme).toBe('light');
  // A genuinely light RPG canvas: light background/surfaces, dark text.
  expect(hexLuminance(sample.tokens['--rpg-bg']!)).toBeGreaterThan(0.7);
  expect(hexLuminance(sample.tokens['--rpg-surface']!)).toBeGreaterThan(0.7);
  expect(hexLuminance(sample.tokens['--rpg-text']!)).toBeLessThan(0.1);
  expect(sample.bodyBackgroundLuminance).toBeGreaterThan(0.7);
  expect(sample.tokens).not.toEqual(darkRpgPalette);
  for (const name of [
    '--rpg-bg',
    '--rpg-surface',
    '--rpg-surface-raised',
    '--rpg-border',
  ]) {
    expectNeutralCool(name, sample.tokens[name]!);
  }
  expectNeutralCool('--rpg-nav-shade', sample.navShade);
  expectNeutralCool('body background', sample.bodyBackground);
}

function expectDarkRpg(sample: RpgPaletteSample) {
  expect(sample.bodyClassActive).toBe(true);
  expect(sample.rootTheme).toBe('dark');
  expect(sample.tokens).toEqual(darkRpgPalette);
  expect(sample.bodyBackground).toBe('rgb(17, 25, 35)');
}

async function saveThemeFromSettings(
  page: Page,
  path: '/rpg/settings' | '/settings',
  theme: 'dark' | 'light' | 'system',
) {
  await page.goto(path);
  await page.locator('select[id$="-theme"]').selectOption(theme);
  await page.getByRole('button', { name: 'Save local settings' }).click();
  await expect(
    page.getByText('Local profile saved', { exact: true }),
  ).toBeVisible();
}

test('a light preference renders a genuinely light RPG palette', async ({
  page,
}) => {
  await completeOnboarding(page, { theme: 'light' });
  await openRpgHub(page);
  expectLightRpg(await sampleRpgPalette(page));
  // The opaque guild emblem is not screen-blended away on the light canvas.
  await expect(page.locator('.rpg-identity__guild img').first()).toHaveCSS(
    'mix-blend-mode',
    'normal',
  );
});

test('a dark preference keeps the accepted dark RPG palette exactly', async ({
  page,
}) => {
  await completeOnboarding(page, { theme: 'dark' });
  await openRpgHub(page);
  expectDarkRpg(await sampleRpgPalette(page));
  // The approved transparent compass uses normal alpha composition in both themes.
  await expect(page.locator('.rpg-identity__guild img').first()).toHaveCSS(
    'mix-blend-mode',
    'normal',
  );
});

test('saving the preference in either Settings surface switches both interfaces', async ({
  page,
}) => {
  await completeOnboarding(page, { theme: 'dark' });

  await saveThemeFromSettings(page, '/rpg/settings', 'light');
  expectLightRpg(await sampleRpgPalette(page));
  await page.goto('/dashboard');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await saveThemeFromSettings(page, '/settings', 'dark');
  await openRpgHub(page);
  expectDarkRpg(await sampleRpgPalette(page));
});

test('switching between Classic and RPG keeps the one saved preference', async ({
  page,
}) => {
  await completeOnboarding(page, { theme: 'light' });

  await page.goto('/rpg/settings');
  await expect(page.locator('select[id$="-theme"]')).toHaveValue('light');
  await page.getByRole('link', { name: 'Open Classic interface' }).click();
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/settings');
  await expect(page.locator('select[id$="-theme"]')).toHaveValue('light');
  await page
    .getByRole('navigation', { name: 'Primary' })
    .getByRole('link', { name: 'Open RPG interface' })
    .click();
  await expect(
    page.getByRole('heading', { exact: true, name: 'Home' }),
  ).toBeVisible();
  expectLightRpg(await sampleRpgPalette(page));
});

/**
 * Startup truth (Epic C / C1-R2). On a hard refresh the saved preference is
 * only known once the verified local snapshot is read, after the startup
 * coordination window. While it is unresolved, the RPG preparation screen must
 * not paint the opposite of the theme the learner ends up with. Every
 * animation frame of the real reload is sampled (rAF runs before each paint),
 * so the check reads what was rendered in the preparation state, not only the
 * final hydrated page.
 */
type StartupFrame = {
  canvasLuminance: number;
  canvasRgb: number[];
  contrast: number | null;
  phase: 'loaded' | 'other' | 'pre-app' | 'preparing';
  rootTheme: string | null;
  surfaceLuminance: number | null;
  surfaceRgb: number[] | null;
};

const STARTUP_FRAME_LIMIT = 900;

function installStartupSampler(page: Page) {
  return page.addInitScript((limit) => {
    type Style = {
      backgroundColor: string;
      color: string;
    };
    type Node = {
      childElementCount: number;
      textContent: string | null;
    };
    const scope = globalThis as unknown as {
      __startupFrames: { done: boolean; frames: unknown[] };
      document: {
        body: Node | null;
        documentElement: { dataset: Record<string, string | undefined> };
        getElementById(id: string): Node | null;
        querySelector(selector: string): Node | null;
        querySelectorAll(selector: string): Iterable<Node>;
      };
      getComputedStyle(element: Node): Style;
      requestAnimationFrame(callback: () => void): void;
    };
    const parse = (value: string) => {
      const parts = (value.match(/[\d.]+/g) ?? []).map(Number);
      const scale = value.startsWith('color(srgb') ? 255 : 1;
      return {
        a: parts.length >= 4 ? parts[3]! : 1,
        rgb: [0, 1, 2].map((index) => (parts[index] ?? 0) * scale),
      };
    };
    const luminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map((channel) => {
        const c = channel / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
    };
    const over = (top: { a: number; rgb: number[] }, base: number[]) =>
      top.rgb.map((c, index) => c * top.a + base[index]! * (1 - top.a));
    const ratio = (x: number, y: number) =>
      (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);

    const state = { done: false, frames: [] as unknown[] };
    scope.__startupFrames = state;
    let loadedFrames = 0;

    const sample = () => {
      const { document } = scope;
      const body = document.body;
      const root = document.getElementById('root');
      const preparing = document.querySelector(
        '[data-testid="rpg-route-shell-loading"]',
      );
      const loaded = [...document.querySelectorAll('h1')].some(
        (heading) => heading.textContent === 'Home',
      );
      const canvas =
        body === null
          ? [255, 255, 255]
          : parse(scope.getComputedStyle(body).backgroundColor).rgb;
      let surfaceLuminance: number | null = null;
      let surfaceRgb: number[] | null = null;
      let contrast: number | null = null;
      const card =
        preparing === null ? null : document.querySelector('.loading-state');
      const text =
        preparing === null
          ? null
          : document.querySelector('.loading-state__description');
      if (card !== null && text !== null) {
        const fill = parse(scope.getComputedStyle(card).backgroundColor);
        const effective = over(fill, canvas);
        // A mostly opaque card is a painted surface of its own.
        surfaceLuminance = fill.a >= 0.5 ? luminance(effective) : null;
        surfaceRgb = fill.a >= 0.5 ? effective : null;
        const ink = parse(scope.getComputedStyle(text).color);
        contrast = ratio(luminance(over(ink, effective)), luminance(effective));
      }
      state.frames.push({
        canvasLuminance: luminance(canvas),
        canvasRgb: canvas,
        contrast,
        phase: loaded
          ? 'loaded'
          : preparing !== null
            ? 'preparing'
            : root === null || root.childElementCount === 0
              ? 'pre-app'
              : 'other',
        rootTheme: document.documentElement.dataset.theme ?? null,
        surfaceLuminance,
        surfaceRgb,
      });
      loadedFrames += loaded ? 1 : 0;
      if (loadedFrames >= 3 || state.frames.length >= limit) {
        state.done = true;
        return;
      }
      scope.requestAnimationFrame(sample);
    };
    scope.requestAnimationFrame(sample);
  }, STARTUP_FRAME_LIMIT);
}

// Luminance classes: every accepted light canvas/surface is above 0.5 and
// every accepted dark one below 0.05, so these bands separate the themes.
const isLightClass = (luminance: number) => luminance >= 0.5;
const isDarkClass = (luminance: number) => luminance <= 0.05;

/**
 * Luminance classes only say "not the opposite theme"; a saturated
 * mid-luminance colour would pass them. While the theme is unresolved the
 * preparation canvas/surface must also be neutral in hue: OKLab chroma at
 * most 0.02 (the R2 preparation `#6a6f76` is about 0.013).
 */
const PREPARATION_NEUTRAL_MAX_CHROMA = 0.02;
const preparationChroma = (rgb: number[]) =>
  oklabWarmth(`rgb(${rgb.join(', ')})`).chroma;

test('the preparation neutral bound rejects saturated mid-luminance colours', () => {
  expect(preparationChroma(channelsOf('#6a6f76'))).toBeLessThanOrEqual(
    PREPARATION_NEUTRAL_MAX_CHROMA,
  );
  for (const saturated of ['#c0392b', '#2e7d32', '#5b6fb0', '#8a6d00']) {
    const luminance = hexLuminance(saturated);
    // Neither a light nor a dark class, so luminance alone would accept it.
    expect(isLightClass(luminance) || isDarkClass(luminance), saturated).toBe(
      false,
    );
    expect(preparationChroma(channelsOf(saturated)), saturated).toBeGreaterThan(
      PREPARATION_NEUTRAL_MAX_CHROMA,
    );
  }
});

const startupScenarios = [
  // OS set opposite to the saved choice: a startup that guessed from the
  // device theme, or forced one theme, would fail these.
  { name: 'saved light', os: 'dark', saved: 'light', expected: 'light' },
  { name: 'saved dark', os: 'light', saved: 'dark', expected: 'dark' },
  {
    name: 'system + light OS',
    os: 'light',
    saved: 'system',
    expected: 'light',
  },
  { name: 'system + dark OS', os: 'dark', saved: 'system', expected: 'dark' },
] as const;

for (const scenario of startupScenarios) {
  test(`hard refresh (${scenario.name}): RPG preparation never paints the opposite theme`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scenario.os });
    await completeOnboarding(page, {
      theme: scenario.saved === 'light' ? 'light' : 'dark',
    });
    if (scenario.saved === 'system') {
      await saveThemeFromSettings(page, '/settings', 'system');
    }

    await installStartupSampler(page);
    await openRpgHub(page);
    await page.reload();
    await expect(
      page.getByRole('heading', { exact: true, name: 'Home' }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (globalThis as unknown as { __startupFrames: { done: boolean } })
              .__startupFrames.done,
        ),
      )
      .toBe(true);
    const frames = await page.evaluate(
      () =>
        (globalThis as unknown as { __startupFrames: { frames: unknown[] } })
          .__startupFrames.frames,
    );
    const sampled = frames as StartupFrame[];
    const expectedDark = scenario.expected === 'dark';
    const contradicts = (luminance: number) =>
      expectedDark ? isLightClass(luminance) : isDarkClass(luminance);

    // The preparation state was actually rendered and observed.
    const preparing = sampled.filter((frame) => frame.phase === 'preparing');
    expect(preparing.length).toBeGreaterThan(0);

    // While the theme is unresolved (no html[data-theme]) the painted
    // preparation canvas and any opaque surface are neutral in hue.
    const unresolved = preparing.filter((frame) => frame.rootTheme === null);
    expect(unresolved.length).toBeGreaterThan(0);
    for (const frame of unresolved) {
      expect(
        preparationChroma(frame.canvasRgb),
        JSON.stringify(frame),
      ).toBeLessThanOrEqual(PREPARATION_NEUTRAL_MAX_CHROMA);
      if (frame.surfaceRgb !== null) {
        expect(
          preparationChroma(frame.surfaceRgb),
          JSON.stringify(frame),
        ).toBeLessThanOrEqual(PREPARATION_NEUTRAL_MAX_CHROMA);
      }
    }

    for (const frame of sampled) {
      // The static document before any app code runs has no preparation UI
      // and no theme source; it is shared with Classic and reported, not
      // asserted.
      if (frame.phase === 'pre-app') {
        continue;
      }
      expect(contradicts(frame.canvasLuminance), JSON.stringify(frame)).toBe(
        false,
      );
      if (frame.surfaceLuminance !== null) {
        expect(contradicts(frame.surfaceLuminance), JSON.stringify(frame)).toBe(
          false,
        );
      }
      if (frame.contrast !== null) {
        expect(frame.contrast, JSON.stringify(frame)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
      if (frame.rootTheme !== null) {
        expect(frame.rootTheme).toBe(scenario.expected);
      }
    }

    const loaded = sampled.filter((frame) => frame.phase === 'loaded');
    expect(loaded.length).toBeGreaterThan(0);
    for (const frame of loaded) {
      expect(frame.rootTheme).toBe(scenario.expected);
      if (expectedDark) {
        expect(frame.canvasLuminance).toBeCloseTo(hexLuminance('#111923'), 6);
      } else {
        expect(frame.canvasLuminance).toBeGreaterThan(0.7);
      }
    }
    expectLightOrDark(await sampleRpgPalette(page), scenario.expected);

    test.info().annotations.push({
      description: `${sampled.filter((frame) => frame.phase === 'pre-app').length} pre-app, ${preparing.length} preparing (${unresolved.length} unresolved), ${loaded.length} loaded frame(s)`,
      type: 'startup-frames',
    });
  });
}

function expectLightOrDark(sample: RpgPaletteSample, theme: 'dark' | 'light') {
  if (theme === 'dark') {
    expectDarkRpg(sample);
  } else {
    expectLightRpg(sample);
  }
}

test('a system preference drives both interfaces and follows device changes', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await completeOnboarding(page, { theme: 'dark' });
  await saveThemeFromSettings(page, '/settings', 'system');

  await openRpgHub(page);
  expectDarkRpg(await sampleRpgPalette(page));

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expectLightRpg(await sampleRpgPalette(page));

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expectDarkRpg(await sampleRpgPalette(page));

  // Classic follows the device in both directions too (computed canvas, not
  // only the root attribute).
  const classicCanvas = () =>
    page.evaluate(
      () =>
        (globalThis as unknown as ThemeScope).getComputedStyle(
          (globalThis as unknown as ThemeScope).document.body,
        ).backgroundColor,
    );
  await page.goto('/dashboard');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await classicCanvas()).toBe('rgb(31, 36, 39)');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await classicCanvas()).toBe('rgb(244, 241, 232)');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await classicCanvas()).toBe('rgb(31, 36, 39)');
});

const learningEntryLinks = [
  '/rpg/pathways',
  '/rpg/oppslag',
  '/rpg/micro',
  '/rpg/track/tenk-som-en-utvikler',
];

async function expectLearningActionsOnOneRow(entry: Locator) {
  const link = (await entry.getByRole('link').boundingBox())!;
  const info = (await entry.getByRole('button').boundingBox())!;
  expect(Math.abs(link.y - info.y)).toBeLessThanOrEqual(1);
  expect(link.x + link.width).toBeLessThanOrEqual(info.x);
  expect(info.height).toBeGreaterThanOrEqual(44);
  expect(info.width).toBeGreaterThanOrEqual(44);
}

for (const theme of ['light', 'dark'] as const) {
  test(`RPG Home learning entries have distinct accessible surfaces in ${theme}`, async ({
    page,
  }, testInfo) => {
    await completeOnboarding(page, {
      theme,
      programme: 'Programvareutvikling',
    });
    await page.goto('/rpg');
    const grid = page.locator('.rpg-hub__learning-grid');
    const entries = grid.locator('.rpg-hub__entry');
    await expect(entries).toHaveCount(4);

    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const samples = [];
      for (const href of learningEntryLinks) {
        const target = page.locator(`a[href="${href}"]`);
        const entry = entries.filter({ has: target });
        const link = entry.getByRole('link');
        const info = entry.getByRole('button');
        await expect(link).toBeVisible();
        await expect(info).toHaveAccessibleName(/\S/);
        await expectLearningActionsOnOneRow(entry);
        await link.focus();
        const sample = await entry.evaluate((card) => {
          const scope = globalThis as unknown as ThemeScope;
          const target = card as unknown as {
            querySelector(selector: string): unknown;
          };
          const surface = scope.getComputedStyle(card);
          const action = scope.getComputedStyle(target.querySelector('a'));
          const disclosure = scope.getComputedStyle(
            target.querySelector('button'),
          );
          return {
            card: surface.backgroundColor,
            button: action.backgroundColor,
            buttonText: action.color,
            infoText: disclosure.color,
            infoBorder: disclosure.borderColor,
            focus: action.outlineColor,
            focusStyle: action.outlineStyle,
          };
        });
        expect(
          contrastBetween(sample.buttonText, sample.button),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastBetween(sample.infoText, sample.card),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastBetween(sample.infoBorder, sample.card),
        ).toBeGreaterThanOrEqual(3);
        expect(
          contrastBetween(sample.focus, sample.card),
        ).toBeGreaterThanOrEqual(3);
        expect(sample.focusStyle).toBe('solid');
        samples.push({ href, ...sample });
      }
      expect(new Set(samples.map(({ card }) => card)).size).toBe(4);
      expect(new Set(samples.map(({ button }) => button)).size).toBe(4);
      await writeFile(
        testInfo.outputPath(`computed-colours-${theme}-${width}.json`),
        JSON.stringify(samples, null, 2),
      );
      await grid.screenshot({
        path: testInfo.outputPath(`learning-${theme}-${width}.png`),
      });
    }

    const reference = entries.filter({
      has: page.locator('a[href="/rpg/oppslag"]'),
    });
    const info = reference.getByRole('button');
    await info.focus();
    await page.keyboard.press('Enter');
    await expect(info).toHaveAttribute('aria-expanded', 'true');
    await expect(page).toHaveURL(/\/rpg$/);
    const controlledId = await info.getAttribute('aria-controls');
    await expect(page.locator(`[id="${controlledId}"]`)).toBeVisible();
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    for (const entry of await entries.all()) {
      await expectLearningActionsOnOneRow(entry);
    }
    expect(
      await page.evaluate('document.documentElement.scrollWidth <= innerWidth'),
    ).toBe(true);
    const gridBounds = (await grid.boundingBox())!;
    for (const control of await grid
      .getByRole('link')
      .or(grid.getByRole('button'))
      .all()) {
      const bounds = (await control.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(gridBounds.x);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(
        gridBounds.x + gridBounds.width + 1,
      );
    }
  });
}

const styleChoices = ['vibrant', 'glass', 'playful'] as const;
const rpgStyleStorageKey = 'progresspal:rpg-style';
const homeContrastTargets = [
  '.rpg-hero-hud__name',
  '.rpg-identity__guild-link',
  '.rpg-identity__path dd',
  '.rpg-hub__quest-panel .rpg-panel__title',
  '.rpg-hub__quest-primary .rpg-button > span',
  '.rpg-hub__learning-grid .rpg-button > span',
  '.rpg-hub__details--summary :is(dt, dd)',
].join(', ');
const guildContrastTargets = [
  '.rpg-guild h1',
  '.rpg-guild .rpg-page-lede',
  '.rpg-guild [role="tab"]',
  '.rpg-guild [role="tabpanel"]:not([hidden]) .rpg-panel__title',
].join(', ');

async function sampleRenderedContrast(page: Page, selector: string) {
  const targets = await page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        name: element.textContent?.trim(),
        foreground: getComputedStyle(element).color,
        y: Math.floor(rect.top + scrollY + rect.height / 2),
        xs: [0.15, 0.5, 0.85].map((fraction) =>
          Math.floor(rect.left + scrollX + rect.width * fraction),
        ),
      };
    }),
  );
  expect(targets.length).toBeGreaterThan(0);
  // Read the background behind each label directly from rendered pixels,
  // including the gradient, blur and all translucent layers.
  const background = await page.screenshot({
    fullPage: true,
    scale: 'css',
    style: `:is(${selector}) { color: transparent !important; }`,
  });
  const sampled = await page.evaluate(
    async ({ png, targets }) => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + png;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const paint = canvas.getContext('2d')!;
      paint.drawImage(image, 0, 0);
      return targets.map((target) => ({
        ...target,
        backgrounds: target.xs.map((x) => {
          const [r, g, b] = paint.getImageData(x, target.y, 1, 1).data;
          return `rgb(${r}, ${g}, ${b})`;
        }),
      }));
    },
    { png: background.toString('base64'), targets },
  );

  return sampled.map(({ name, foreground, backgrounds }) => {
    const minimum = Math.min(
      ...backgrounds.map((bg) => contrastBetween(foreground, bg)),
    );
    expect(
      minimum,
      `${name} against ${backgrounds.join(' / ')}`,
    ).toBeGreaterThanOrEqual(4.5);
    return { name, foreground, backgrounds, minimum };
  });
}

async function expectRpgReflow(page: Page, selectors: string) {
  const clipped = await page.locator(selectors).evaluateAll((elements) =>
    elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.left < 0 ||
          rect.right > innerWidth + 1 ||
          element.scrollWidth > element.clientWidth + 1
        );
      })
      .map((element) => element.textContent),
  );
  expect(clipped).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

for (const theme of ['light', 'dark'] as const) {
  test(`RPG visual styles render contrasting Home and Guild surfaces in ${theme}`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    await completeOnboarding(page, {
      theme,
      programme: 'Programvareutvikling',
    });
    const select = page.locator('#rpg-visual-style');
    const body = page.locator('body');
    const entries = page.locator('.rpg-hub__learning-grid .rpg-hub__entry');
    const surfaces = () =>
      entries.evaluateAll((elements) =>
        elements.map((entry) => ({
          card: getComputedStyle(entry).backgroundColor,
          button: getComputedStyle(entry.querySelector('a')!).backgroundColor,
        })),
      );
    const stats = page.locator('.rpg-hub__details--summary dd');
    const hud = page.locator('.rpg-hero-hud');
    const themeSignature = () =>
      hud.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: getComputedStyle(document.body).backgroundImage,
          surface: style.backgroundColor,
          shadow: style.boxShadow,
          blur: style.backdropFilter,
        };
      });
    await openRpgHub(page);
    await expect(entries).toHaveCount(4);
    const standard = await themeSignature();
    const standardButtons = (await surfaces()).map(({ button }) => button);
    const savedStats = await stats.allTextContents();
    expect(savedStats.length).toBeGreaterThan(0);
    const signatures = [];

    for (const style of styleChoices) {
      await page.goto('/rpg/settings');
      await expect(select).toHaveAccessibleName(/\S/);
      await select.selectOption(style);
      await expect(body).toHaveAttribute('data-rpg-style', style);
      await openRpgHub(page);
      await expect(entries).toHaveCount(4);
      const signature = await themeSignature();
      expect(signature).not.toEqual(standard);
      signatures.push(signature);
      expect(await stats.allTextContents()).toEqual(savedStats);
      expect((await surfaces()).map(({ button }) => button)).toEqual(
        standardButtons,
      );
      if (style === 'glass') expect(signature.blur).not.toBe('none');
      if (style === 'playful') {
        const fills = await stats.evaluateAll((elements) => {
          const cards = elements.map((element) => element.parentElement!);
          const fill = (card: HTMLElement) =>
            getComputedStyle(card).backgroundColor;
          const original = cards.map(fill);
          const list = cards[0].parentElement!;
          list.prepend(cards.at(-1)!);
          const reordered = cards.map(fill);
          list.append(cards.at(-1)!);
          return { original, reordered };
        });
        expect(new Set(fills.original).size).toBe(fills.original.length);
        expect(fills.reordered).toEqual(fills.original);
      }

      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 900 });
        const css = await surfaces();
        expect(new Set(css.map(({ card }) => card)).size).toBe(4);
        await expectRpgReflow(page, '.rpg-hub__learning-grid :is(a, button)');
        if (width === 320) {
          const reference = entries.filter({
            has: page.getByRole('link', {
              name: 'Teknologioppslag',
              exact: true,
            }),
          });
          await expectLearningActionsOnOneRow(reference);
          const title = reference.getByRole('link').locator('span');
          await expect(title).toBeVisible();
          const lines = await title.evaluate((label) => {
            const range = document.createRange();
            range.selectNodeContents(label);
            return [...range.getClientRects()].map((rect) => ({
              top: rect.top,
              left: rect.left,
              right: rect.right,
            }));
          });
          expect(new Set(lines.map(({ top }) => top)).size).toBe(1);
          const button = (await reference.getByRole('link').boundingBox())!;
          for (const line of lines) {
            expect(line.left).toBeGreaterThanOrEqual(button.x);
            expect(line.right).toBeLessThanOrEqual(button.x + button.width);
          }
        }
        const entryLink = entries.first().getByRole('link');
        await entryLink.focus();
        await expect(entryLink).toHaveCSS('outline-style', 'solid');
        const outline = await entryLink.evaluate(
          (element) => getComputedStyle(element).outlineColor,
        );
        expect(contrastBetween(outline, css[0]!.card)).toBeGreaterThanOrEqual(
          3,
        );
        await entryLink.blur();
        await page.screenshot({
          fullPage: true,
          path: testInfo.outputPath(`${style}-${theme}-${width}.png`),
        });
        const contrast = await sampleRenderedContrast(
          page,
          homeContrastTargets,
        );
        await writeFile(
          testInfo.outputPath(`${style}-${theme}-${width}-home.json`),
          JSON.stringify({ signature, css, contrast }, null, 2),
        );
      }
      if (style === 'glass') {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
        });
        await expect(hud).toHaveCSS('backdrop-filter', 'none');
        await expect(body).toHaveCSS('background-image', 'none');
        await sampleRenderedContrast(page, homeContrastTargets);
        await cdp.send('Emulation.setEmulatedMedia', { features: [] });
        await cdp.detach();
      }
      const enlarged = await page.addStyleTag({
        content: 'html { font-size: 200% !important; }',
      });
      await expectRpgReflow(page, '.rpg-hub__learning-grid :is(a, button)');
      const guildLink = hud.locator('a[href="/rpg/laeringslaget"]');
      await guildLink.focus();
      await expect(guildLink).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/rpg\/laeringslaget$/);
      await expect(page.getByRole('tabpanel')).toBeVisible();
      await expectRpgReflow(page, '.rpg-guild :is([role="tab"], a:visible)');
      await enlarged.evaluate((tag) => {
        tag.parentNode?.removeChild(tag);
      });

      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.locator('.rpg-guild').screenshot({
          path: testInfo.outputPath(`guild-${style}-${theme}-${width}.png`),
        });
        const contrast = await sampleRenderedContrast(
          page,
          guildContrastTargets,
        );
        await writeFile(
          testInfo.outputPath(`${style}-${theme}-${width}-guild.json`),
          JSON.stringify(contrast, null, 2),
        );
      }
      expect(
        (await new AxeBuilder({ page }).include('.rpg-guild').analyze())
          .violations,
      ).toEqual([]);
    }

    expect(
      new Set(signatures.map((signature) => JSON.stringify(signature))).size,
    ).toBe(3);
    await page.goto('/rpg/settings');
    await select.selectOption('standard');
    await openRpgHub(page);
    expect(await themeSignature()).toEqual(standard);
  });
}

test('RPG visual style persists separately from colour mode, including peer and storage failure', async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await completeOnboarding(page);
  await page.evaluate(
    (key) => localStorage.setItem(key, 'unknown-style'),
    rpgStyleStorageKey,
  );
  await saveThemeFromSettings(page, '/rpg/settings', 'system');
  const select = page.locator('#rpg-visual-style');
  const body = page.locator('body');
  await expect(select).toHaveValue('standard');
  await select.selectOption('glass');
  await page.reload();
  await expect(select).toHaveValue('glass');
  await expect(body).toHaveAttribute('data-rpg-style', 'glass');
  const peer = await context.newPage();
  await openRpgHub(peer);
  await expect(peer.locator('body')).toHaveAttribute('data-rpg-style', 'glass');

  await select.selectOption('vibrant');
  await expect(peer.locator('body')).toHaveAttribute(
    'data-rpg-style',
    'vibrant',
  );
  await peer.close();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(body).toHaveAttribute('data-rpg-style', 'vibrant');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(body).toHaveAttribute('data-rpg-style', 'vibrant');

  await page.evaluate((key) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key)
        throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      setItem.call(this, name, value);
    };
  }, rpgStyleStorageKey);
  await select.selectOption('playful');
  await expect(body).toHaveAttribute('data-rpg-style', 'playful');
  await expect(
    page
      .locator('.rpg-settings')
      .getByRole('status')
      .filter({ hasText: 'reload' }),
  ).toBeVisible();
  await page.reload();
  await expect(select).toHaveValue('vibrant');
  await page.goto('/settings');
  await expect(select).toHaveCount(0);
  await expect(body).not.toHaveAttribute('data-rpg-style');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/rpg/settings');
  await select.selectOption('glass');
  await openRpgHub(page);
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-color-scheme', value: 'dark' },
      { name: 'prefers-reduced-transparency', value: 'reduce' },
    ],
  });
  await expect(page.locator('.rpg-hero-hud')).toHaveCSS(
    'backdrop-filter',
    'none',
  );
  await expect(page.locator('.rpg-hero-hud')).toHaveCSS(
    'background-color',
    'rgb(22, 45, 64)',
  );
  await page.addInitScript((key) => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (name) {
      if (name === key)
        throw new DOMException('Synthetic read failure', 'SecurityError');
      return getItem.call(this, name);
    };
  }, rpgStyleStorageKey);
  await page.goto('/rpg/settings');
  await expect(select).toHaveValue('standard');
});
