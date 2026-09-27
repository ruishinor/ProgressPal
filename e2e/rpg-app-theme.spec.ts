import { expect, test, type Page } from '@playwright/test';

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
  return (color.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
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
    page.getByRole('heading', { exact: true, name: 'RPG Hub' }),
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
  await expect(page.locator('.rpg-identity__guild img').first()).toHaveCSS(
    'mix-blend-mode',
    'screen',
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
    .getByRole('link', { name: 'Return to RPG' })
    .click();
  await expect(
    page.getByRole('heading', { exact: true, name: 'RPG Hub' }),
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
  contrast: number | null;
  phase: 'loaded' | 'other' | 'pre-app' | 'preparing';
  rootTheme: string | null;
  surfaceLuminance: number | null;
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
        (heading) => heading.textContent === 'RPG Hub',
      );
      const canvas =
        body === null
          ? [255, 255, 255]
          : parse(scope.getComputedStyle(body).backgroundColor).rgb;
      let surfaceLuminance: number | null = null;
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
        const ink = parse(scope.getComputedStyle(text).color);
        contrast = ratio(luminance(over(ink, effective)), luminance(effective));
      }
      state.frames.push({
        canvasLuminance: luminance(canvas),
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
      page.getByRole('heading', { exact: true, name: 'RPG Hub' }),
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
      description: `${sampled.filter((frame) => frame.phase === 'pre-app').length} pre-app, ${preparing.length} preparing, ${loaded.length} loaded frame(s)`,
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
