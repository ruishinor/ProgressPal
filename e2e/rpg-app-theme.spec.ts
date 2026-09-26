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
});

test('a dark preference keeps the accepted dark RPG palette exactly', async ({
  page,
}) => {
  await completeOnboarding(page, { theme: 'dark' });
  await openRpgHub(page);
  expectDarkRpg(await sampleRpgPalette(page));
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

  await page.goto('/dashboard');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
