import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { RpgAchievementArt } from '@/features/rpg/components/RpgAchievementArt';
import { cs50AchievementDefinitions as achievementDefinitions } from '../programmes/cs50Policy';

import committedIdentity from '../fixtures/preservation/c1-visual-identity.json';
import {
  extractTokens,
  hashRpgAssets,
  identifyArtFile,
  rpgAssetRoot,
  sha256,
} from './c1VisualIdentity';

// Explicit owner replacement, 2026-10-31: shield (2)'s compass, coloured like
// shield (1), with alpha. All other original source identities stay pinned.
const guildEmblemHash =
  '9d8d10ec6708aa8de947825fd354611181a4f63d2ac494e7d9a5c12102b198ed';

/**
 * Epic C / C1 evidence area 9 — visual SOURCE IDENTITY.
 *
 * Family: VISUAL (identity only). Records the SHA-256 of every RPG asset, the
 * achievement ID -> badge file mapping as actually rendered by
 * `RpgAchievementArt` (the inlined data URI is decoded and matched to exactly one file), the
 * fallback glyph, and the exact CSS custom properties of
 * src/styles/tokens.css (light, reduced-motion and dark blocks) and
 * src/styles/rpg-tokens.css.
 *
 * Equal asset bytes and token values are necessary but NOT sufficient for
 * visual preservation: they do not prove rendered parity. Rendered evidence is
 * the retained C1 capture baseline (C0_VISUAL_PRESERVATION_PLAN.md section 4).
 * Owner after C8: CS50 badge art and emblem become programme presentation;
 * shared badge art stays shared (C0 contract section 4c).
 */

function renderedArtFile(achievementId: string): string | null {
  const { container, unmount } = render(
    <RpgAchievementArt achievementId={achievementId} />,
  );
  const image = container.querySelector('img');
  const src = image?.getAttribute('src');
  const result = src?.startsWith('/assets/badges/')
    ? src.slice('/assets/'.length)
    : image === null
      ? null
      : identifyArtFile(image.src);
  unmount();
  return result;
}

describe('C1 visual source identity (visual, identity only)', () => {
  it('hashes every RPG asset file to the committed baseline', () => {
    const hashes = hashRpgAssets();
    expect(Object.keys(hashes)).toHaveLength(17);
    expect(hashes).toEqual({
      ...committedIdentity.assets,
      'emblems/rpg-emblem-code-knights-primary.webp': guildEmblemHash,
    });
  });

  it('maps every achievement to its committed badge file as rendered, with the fallback glyph', () => {
    // The frozen C1 identity baseline covers the original sixteen badges.
    // Activity achievements are validated by their own approved asset tests.
    const originalDefinitions = achievementDefinitions.filter(
      (definition) => definition.ruleType !== 'physical_activity',
    );
    const mapping = Object.fromEntries(
      originalDefinitions.map((definition) => [
        definition.id,
        renderedArtFile(definition.id),
      ]),
    );
    expect(mapping).toEqual(committedIdentity.badgeArt);

    // ACH-02: originals above stay byte-exact. Raster presentation now uses
    // faithful alpha cutouts in the same-origin offline static set.
    for (const [id, file] of Object.entries(committedIdentity.badgeArt)) {
      if (!file.endsWith('.webp')) continue;
      const { container, unmount } = render(
        <RpgAchievementArt achievementId={id} />,
      );
      expect(container.querySelector('img')).toHaveAttribute(
        'src',
        `/assets/${file}`,
      );
      const exported = readFileSync(path.resolve('public/assets', file));
      expect(exported.toString('ascii', 12, 16)).toBe('VP8X');
      expect(exported[20]! & 0x10, `${id} must retain alpha`).toBe(0x10);
      unmount();
    }

    const { container } = render(
      <RpgAchievementArt achievementId="c1-unknown-achievement" />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe(committedIdentity.fallbackGlyph);
  });

  it('pins the owner-requested transparent gold compass emblem', () => {
    expect(
      sha256(
        readFileSync(
          path.join(
            rpgAssetRoot,
            'emblems/rpg-emblem-code-knights-primary.webp',
          ),
        ),
      ),
    ).toBe(guildEmblemHash);
  });

  it('keeps the accepted dark RPG palette exactly under the app-wide dark theme', () => {
    // Theme repair: RPG follows the one app theme. The dark block must keep
    // the 14 pre-repair RPG tokens exactly, and each new token's dark value
    // must equal the hard-coded literal it replaced in rpg-shell/components
    // (R2 adds --rpg-emblem-blend, whose dark value is the former literal).
    expect(
      extractTokens()[
        "src/styles/rpg-tokens.css | :root[data-theme='dark'] body.rpg-route-active"
      ],
    ).toEqual({
      '--rpg-accent': '#d6ad5c',
      '--rpg-accent-strong': '#f1d28b',
      '--rpg-bg': '#111923',
      '--rpg-border': '#405064',
      '--rpg-border-strong': '#8b7951',
      '--rpg-danger': '#d8897e',
      '--rpg-emblem-blend': 'screen',
      '--rpg-focus-ring': '#f3cf7d',
      '--rpg-nav-hub-shade': '#090d12',
      '--rpg-nav-ring': 'rgb(9 13 18 / 0.72)',
      '--rpg-nav-shade': '#080c11',
      '--rpg-on-accent': '#17202b',
      '--rpg-on-success': '#17202b',
      '--rpg-overlay': 'rgba(5, 9, 14, 0.72)',
      '--rpg-progress': '#c9943e',
      '--rpg-success': '#78b98c',
      '--rpg-surface': '#172331',
      '--rpg-surface-raised': '#203041',
      '--rpg-text': '#f4f1e8',
      '--rpg-text-muted': '#c7d0d6',
      '--rpg-track': 'rgba(244, 241, 232, 0.1)',
      '--rpg-warning': '#d8a84f',
    });
  });

  it('keeps every CSS custom property name and value unchanged', () => {
    const tokens = extractTokens();
    expect(Object.keys(tokens)).toEqual(Object.keys(committedIdentity.tokens));
    // The RPG light values are a provisional candidate until owner visual
    // acceptance (C1-R2): their token names are pinned here and their
    // character is checked below; every other block stays value-exact.
    const { [lightRpgBlock]: light, ...pinned } = tokens;
    const { [lightRpgBlock]: committedLight, ...committedPinned } =
      committedIdentity.tokens as Record<string, Record<string, string>>;
    expect(pinned).toEqual(committedPinned);
    expect(Object.keys(light!)).toEqual(Object.keys(committedLight!));
  });

  it('keeps the provisional RPG light palette light, readable and neutral-to-cool', () => {
    const light = extractTokens()[lightRpgBlock]!;
    for (const name of [
      '--rpg-bg',
      '--rpg-surface',
      '--rpg-surface-raised',
      '--rpg-border',
      '--rpg-nav-shade',
      '--rpg-nav-hub-shade',
    ]) {
      const { b, chroma } = oklab(light[name]!);
      // OKLab b > 0 leans yellow: cream, beige, parchment or yellow-white.
      expect(b, `${name} ${light[name]} leans warm`).toBeLessThanOrEqual(0);
      expect(chroma, `${name} ${light[name]} chroma`).toBeLessThanOrEqual(
        0.025,
      );
    }
    for (const name of ['--rpg-bg', '--rpg-surface', '--rpg-surface-raised']) {
      expect(luminance(light[name]!), name).toBeGreaterThan(0.7);
      expect(
        contrast(light['--rpg-text']!, light[name]!),
        `text on ${name}`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(light['--rpg-text-muted']!, light[name]!),
        `muted text on ${name}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

const lightRpgBlock = 'src/styles/rpg-tokens.css | body.rpg-route-active';

function linearChannels(hex: string) {
  return [1, 3, 5].map((offset) => {
    const c = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
}

function luminance(hex: string) {
  const [r, g, b] = linearChannels(hex);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(foreground: string, background: string) {
  const [high, low] = [luminance(foreground), luminance(background)].sort(
    (x, y) => y - x,
  );
  return (high! + 0.05) / (low! + 0.05);
}

function oklab(hex: string) {
  const [r, g, b] = linearChannels(hex);
  const l = Math.cbrt(
    0.4122214708 * r! + 0.5363325363 * g! + 0.0514459929 * b!,
  );
  const m = Math.cbrt(
    0.2119034982 * r! + 0.6806995451 * g! + 0.1073969566 * b!,
  );
  const s = Math.cbrt(
    0.0883024619 * r! + 0.2817188376 * g! + 0.6299787005 * b!,
  );
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const labB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { b: labB, chroma: Math.hypot(a, labB) };
}
