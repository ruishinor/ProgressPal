import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Module 5 service worker source-contract guards.
 *
 * `public/sw.js` is unhashed, unbundled, and not type-checked, so nothing else
 * in the pipeline verifies the file that gates the entire offline contract.
 * These guards read the worker source and pin its security-relevant contracts:
 *
 * - CACHE_VERSION stays in lockstep with package.json, so a version bump is
 *   the wholesale cache-reset mechanism and a forgotten bump fails here.
 * - Activation purges only ProgressPal-prefixed caches, never foreign
 *   same-origin caches (finding M1).
 * - Successful navigations refresh the cached shell (finding M2).
 * - Unrelated static-request misses are never populated. Navigation can cache
 *   its validated boot set, but a 200 SPA rewrite must never be stored as
 *   JavaScript under an unknown asset URL (finding L1).
 * - The fixed profile avatar, the web app manifest and its install icons are
 *   the explicit install-time static set.
 * - No file under src/ uses dynamic import(): every boot asset must be a
 *   static import so install-time discovery sees the complete boot set
 *   (finding L3; the service worker relies on this to cache everything).
 *
 * The string matching is deliberately brittle: a sw.js refactor SHOULD force a
 * human to re-read these contracts.
 */

const REPO_ROOT = process.cwd();
const SW_PATH = path.resolve(REPO_ROOT, 'public', 'sw.js');
const SRC_ROOT = path.resolve(REPO_ROOT, 'src');

const swSource = readFileSync(SW_PATH, 'utf8');
const pkg = JSON.parse(
  readFileSync(path.resolve(REPO_ROOT, 'package.json'), 'utf8'),
) as { version: string };

/** Recursively collect runtime application source files (excludes tests). */
function listAppSourceFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listAppSourceFiles(full));
      continue;
    }

    if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)
    ) {
      files.push(full);
    }
  }

  return files;
}

/**
 * Remove comments so only executable code is scanned — a comment mentioning
 * dynamic import syntax must not trip the L3 guard.
 */
function stripComments(source: string): string {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, ' ');

  return withoutBlockComments
    .split('\n')
    .map((line) => {
      for (let i = 0; i < line.length - 1; i += 1) {
        if (line[i] === '/' && line[i + 1] === '/' && line[i - 1] !== ':') {
          return line.slice(0, i);
        }
      }

      return line;
    })
    .join('\n');
}

describe('service worker source contract', () => {
  it('pins CACHE_VERSION to the package version', () => {
    // Contract: the cache version is bumped with every release so activation
    // purges stale caches wholesale; a forgotten bump must fail certification.
    expect(
      swSource,
      'sw.js cache-versioning contract: CACHE_VERSION must be ' +
        `'progresspal-cache-v${pkg.version}' (matching package.json version) ` +
        'so a release bump purges stale caches (finding L2)',
    ).toContain(`const CACHE_VERSION = 'progresspal-cache-v${pkg.version}';`);
  });

  it('purges only ProgressPal-prefixed caches on activate', () => {
    // Contract: activation deletes keys under CACHE_PREFIX that are not the
    // current version — legacy ProgressPal caches are cleaned, foreign
    // same-origin caches are preserved.
    expect(
      swSource,
      'sw.js activate contract: cache deletion must be guarded by ' +
        'key.startsWith(CACHE_PREFIX) so foreign same-origin caches survive ' +
        '(finding M1)',
    ).toContain('key.startsWith(CACHE_PREFIX)');
  });

  it('refreshes the cached shell on successful navigations', () => {
    // Contract: the network-first navigation handler writes the fresh response
    // back to the shell entry so the offline shell never goes permanently
    // stale behind an online user.
    expect(
      swSource,
      'sw.js shell-refresh contract: the navigation handler must ' +
        'cache.put(SHELL_URL, ...) after a successful network-first fetch ' +
        '(finding M2)',
    ).toMatch(/request\.mode === 'navigate'[\s\S]*cache\.put\(SHELL_URL/);
  });

  it('never populates the asset cache from runtime cache misses', () => {
    // A runtime fetch of an unknown asset can receive a 200 HTML SPA rewrite,
    // so the non-navigation branch must never call cache.put(request, ...).
    expect(
      swSource,
      'sw.js runtime-caching contract: a runtime cache miss must not be ' +
        'inserted because a 200 HTML SPA rewrite could poison an asset URL',
    ).not.toContain('cache.put(request');
  });

  it('pre-caches all bundled avatars and the install manifest and icons', () => {
    const list = swSource.match(/const STATIC_ASSET_URLS = \[([^\]]*)\];/);

    expect(list, 'sw.js must declare STATIC_ASSET_URLS').not.toBeNull();
    expect(
      Array.from(list![1].matchAll(/'([^']+)'/g), (match) => match[1]),
    ).toEqual([
      '/assets/character-profile.png',
      '/assets/avatars/avatar-auburn-braid.png',
      '/assets/avatars/avatar-short-curls.png',
      '/assets/avatars/avatar-wavy-bob.png',
      '/manifest.webmanifest',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/icons/apple-touch-icon.png',
    ]);
    expect(swSource).toContain('...STATIC_ASSET_URLS');
  });

  it('keeps src/ free of dynamic import() so install-time discovery sees the full boot set', () => {
    // Contract: every boot asset is a static import, so the modulepreload tags
    // the worker discovers at install time are the complete set needed to boot.
    const sourceFiles = listAppSourceFiles(SRC_ROOT);

    // Fail loudly if the walker silently finds nothing (otherwise the guard
    // below would trivially pass).
    expect(
      sourceFiles.length,
      'L3 static-import guard: the src/ file walker must find source files',
    ).toBeGreaterThan(0);

    const violations: string[] = [];

    for (const file of sourceFiles) {
      const code = stripComments(readFileSync(file, 'utf8'));
      const relativePath = path.relative(REPO_ROOT, file).replace(/\\/g, '/');

      // Owner decision 2026-10-03 (runtime spike): the Python worker loads
      // the pinned runtime's entry module from the runtime folder, which the
      // build lists in runtime/offline.json (cached on first use). It is not
      // an app chunk and not part of the boot set. Exactly that one import is
      // allowed there; any other dynamic import is still a violation.
      if (
        relativePath === 'src/lib/evaluation/pythonWorker.ts' &&
        (code.match(/\bimport\s*\(/g) ?? []).length === 1 &&
        /\bimport\s*\(\s*`\$\{message\.indexURL\}pyodide\.mjs`\s*\)/.test(code)
      ) {
        continue;
      }

      if (/\bimport\s*\(/.test(code)) {
        violations.push(relativePath);
      }
    }

    expect(
      violations,
      'L3 static-import contract: no file under src/ may use dynamic ' +
        'import(), because the offline service worker relies on static-only ' +
        'imports for install-time discovery of the complete boot asset set',
    ).toEqual([]);
  });
});
