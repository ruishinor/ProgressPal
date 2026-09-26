import { render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { RpgAchievementArt } from '@/features/rpg/components/RpgAchievementArt';
import { achievementDefinitions } from '@/lib/achievements';

import committedIdentity from '../fixtures/preservation/c1-visual-identity.json';
import {
  extractTokens,
  hashRpgAssets,
  identifyArtFile,
  rpgAssetRoot,
  sha256,
} from './c1VisualIdentity';

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
  const result = image === null ? null : identifyArtFile(image.src);
  unmount();
  return result;
}

describe('C1 visual source identity (visual, identity only)', () => {
  it('hashes every RPG asset file to the committed baseline', () => {
    const hashes = hashRpgAssets();
    expect(Object.keys(hashes)).toHaveLength(17);
    expect(hashes).toEqual(committedIdentity.assets);
  });

  it('maps every achievement to its committed badge file as rendered, with the fallback glyph', () => {
    const mapping = Object.fromEntries(
      achievementDefinitions.map((definition) => [
        definition.id,
        renderedArtFile(definition.id),
      ]),
    );
    expect(mapping).toEqual(committedIdentity.badgeArt);

    const { container } = render(
      <RpgAchievementArt achievementId="c1-unknown-achievement" />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe(committedIdentity.fallbackGlyph);
  });

  it('keeps the emblem file bytes unchanged', () => {
    expect(
      sha256(
        readFileSync(
          path.join(
            rpgAssetRoot,
            'emblems/rpg-emblem-code-knights-primary.webp',
          ),
        ),
      ),
    ).toBe(
      committedIdentity.assets['emblems/rpg-emblem-code-knights-primary.webp'],
    );
  });

  it('keeps every CSS custom property name and value unchanged', () => {
    const tokens = extractTokens();
    expect(Object.keys(tokens)).toEqual(Object.keys(committedIdentity.tokens));
    expect(tokens).toEqual(committedIdentity.tokens);
  });
});
