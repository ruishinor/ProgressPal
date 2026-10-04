import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { knownRoutePaths } from '@/app/router/routeDefinitions';

/**
 * Installable-PWA source contract (v1.6.0). The manifest, its icons and the
 * shell links are static files no build step checks, so these guards pin
 * what installability depends on: a valid manifest, icons whose real pixel
 * size matches their declared size, a root identity the router handles, and
 * every install file in the service worker's explicit precache so an
 * installed app launched offline still finds them. Browser-native
 * installability (Chromium's own manifest parser) is proven in
 * e2e/offline.spec.ts.
 */

const REPO_ROOT = process.cwd();
const PUBLIC_ROOT = path.resolve(REPO_ROOT, 'public');
const PNG_SIGNATURE = '89504e470d0a1a0a';

type ManifestIcon = {
  purpose?: string;
  sizes: string;
  src: string;
  type: string;
};

const manifest = JSON.parse(
  readFileSync(path.join(PUBLIC_ROOT, 'manifest.webmanifest'), 'utf8'),
) as Record<string, unknown> & { icons: ManifestIcon[] };
const shellHtml = readFileSync(path.resolve(REPO_ROOT, 'index.html'), 'utf8');
const swSource = readFileSync(path.join(PUBLIC_ROOT, 'sw.js'), 'utf8');

/** Width, height and colour type from a PNG's IHDR chunk. */
function readPngHeader(publicPath: string) {
  const file = readFileSync(path.join(PUBLIC_ROOT, publicPath));

  expect(file.subarray(0, 8).toString('hex'), `${publicPath} is a PNG`).toBe(
    PNG_SIGNATURE,
  );
  expect(file.toString('latin1', 12, 16)).toBe('IHDR');

  return {
    colourType: file[25],
    height: file.readUInt32BE(20),
    width: file.readUInt32BE(16),
  };
}

function linkHref(rel: string) {
  return shellHtml.match(
    new RegExp(`<link rel="${rel}" href="(/[^"]+)" />`),
  )?.[1];
}

describe('web app manifest', () => {
  it('declares a standalone app with a stable root identity the router handles', () => {
    expect(manifest).toMatchObject({
      display: 'standalone',
      id: '/',
      name: 'ProgressPal',
      scope: '/',
      short_name: 'ProgressPal',
      start_url: '/',
    });
    expect(knownRoutePaths).toContain(manifest.start_url);
    // Not forced: orientation and language follow the device and content.
    expect(manifest).not.toHaveProperty('orientation');
    expect(manifest).not.toHaveProperty('lang');
  });

  it('uses the documented theme-neutral canvas for splash and title bar', () => {
    // Before the learner's saved theme is read, the RPG shell paints this
    // neutral so neither palette is asserted (src/styles/rpg-shell.css); a
    // launch splash is the same moment.
    expect(manifest.background_color).toBe('#6a6f76');
    expect(manifest.theme_color).toBe('#6a6f76');
    expect(
      readFileSync(path.resolve(REPO_ROOT, 'src/styles/rpg-shell.css'), 'utf8'),
    ).toMatch(
      /:root:not\(\[data-theme\]\) body:has\(\.rpg-shell--preparing\) \{\s*background: #6a6f76;/,
    );
  });

  it('ships every declared icon at its declared pixel size', () => {
    for (const icon of manifest.icons) {
      expect(icon.type).toBe('image/png');
      expect(existsSync(path.join(PUBLIC_ROOT, icon.src)), icon.src).toBe(true);

      const { height, width } = readPngHeader(icon.src);
      expect(`${width}x${height}`, icon.src).toBe(icon.sizes);
    }

    const sizesFor = (purpose: string) =>
      manifest.icons
        .filter((icon) => (icon.purpose ?? 'any') === purpose)
        .map((icon) => icon.sizes);

    expect(sizesFor('any')).toEqual(['192x192', '512x512']);
    expect(sizesFor('maskable')).toEqual(['512x512']);
  });

  it('keeps the maskable icon full-bleed and opaque', () => {
    const maskable = manifest.icons.find((icon) => icon.purpose === 'maskable');

    // Colour type 2 is RGB without alpha: nothing shows through the mask.
    expect(readPngHeader(maskable!.src).colourType).toBe(2);
  });
});

describe('installable shell', () => {
  it('links the manifest and an opaque 180x180 Apple touch icon', () => {
    expect(linkHref('manifest')).toBe('/manifest.webmanifest');

    const touchIcon = linkHref('apple-touch-icon');
    expect(touchIcon).toBeDefined();
    expect(readPngHeader(touchIcon!)).toEqual({
      colourType: 2,
      height: 180,
      width: 180,
    });
    expect(shellHtml).toContain(
      '<meta name="apple-mobile-web-app-title" content="ProgressPal" />',
    );
  });

  it('precaches every install file so an offline launch resolves them', () => {
    const precached = Array.from(
      swSource
        .match(/const STATIC_ASSET_URLS = \[([^\]]*)\];/)![1]
        .matchAll(/'([^']+)'/g),
      (match) => match[1],
    );
    const installFiles = new Set([
      linkHref('manifest')!,
      linkHref('apple-touch-icon')!,
      ...manifest.icons.map((icon) => icon.src),
    ]);

    for (const file of installFiles) {
      expect(precached, file).toContain(file);
    }
  });
});
