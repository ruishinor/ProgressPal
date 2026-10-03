import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveSameOriginAsset } from '@/lib/assets/sameOriginAsset';

/**
 * Module 19 local-only / source-safety guardrail.
 *
 * This is a regression guard for ProgressPal's offline-only, local-first
 * posture: it fails when runtime application source under `src/` introduces an
 * obvious external-communication primitive, dynamic code-execution sink, or
 * HTML-injection sink. It is NOT proof of comprehensive security or privacy
 * compliance, and "local-only" does not mean encrypted, tamper-proof, or safe
 * against someone with access to the device or browser profile.
 *
 * Scope is deliberately narrow and boring:
 * - Only runtime application source is scanned (src .ts/.tsx), excluding
 *   `*.test.*` / `*.spec.*` files, which legitimately reference these tokens
 *   (this guard itself does).
 * - The service worker `public/sw.js` is intentionally NOT scanned: it lives
 *   outside `src/` and legitimately uses the network and Cache APIs to serve
 *   the app shell offline (Module 17).
 * - Comments are stripped before scanning, so explanatory prose (including
 *   documentation URLs) never trips the guard. Only executable code is checked.
 * - URL detection allowlists XML namespace URIs (e.g. the SVG namespace), which
 *   are identifiers and are never fetched.
 *
 * If a future module needs a justified exception, widen `ALLOWED_URL_PREFIXES`
 * with an inline comment explaining why — do not loosen the primitive checks.
 *
 * Note: a few detection tokens are assembled from string fragments rather than
 * written verbatim so this guard file does not itself trip naive dangerous-API
 * source scanners. The runtime behavior is unchanged.
 */

const SRC_ROOT = path.resolve(process.cwd(), 'src');

// Assembled from fragments on purpose (see the note above).
const htmlInjectionPropPattern = new RegExp(
  `\\b${'dangerously'}${'SetInnerHTML'}\\b`,
);

/** Network, dynamic-code-execution, and HTML-injection primitives. */
const FORBIDDEN_PATTERNS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: 'network fetch', pattern: /\bfetch\s*\(/ },
  { label: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/ },
  { label: 'navigator beacon', pattern: /\bsendBeacon\b/ },
  { label: 'WebSocket', pattern: /\bWebSocket\b/ },
  { label: 'EventSource', pattern: /\bEventSource\b/ },
  { label: 'eval call', pattern: /\beval\s*\(/ },
  { label: 'Function constructor', pattern: /\bnew\s+Function\b/ },
  { label: 'dangerous HTML prop', pattern: htmlInjectionPropPattern },
  // Assignment only (not `===` comparisons), for inner/outerHTML sinks.
  { label: 'innerHTML assignment', pattern: /\.innerHTML\s*=(?!=)/ },
  { label: 'outerHTML assignment', pattern: /\.outerHTML\s*=(?!=)/ },
  { label: 'document write sink', pattern: /\bdocument\s*\.\s*write\b/ },
];

/**
 * Absolute-URL prefixes that are safe in source. XML namespace URIs are string
 * identifiers consumed by the DOM, never network requests.
 */
const ALLOWED_URL_PREFIXES: ReadonlyArray<string> = [
  'http://www.w3.org/',
  'https://www.w3.org/',
  // The cs50x-2026 programme definition (src/programmes/cs50x-2026/
  // externalResources.ts, moved from features/course/cs50Links.ts in Epic C /
  // C2) holds static string constants for <a href> anchors that let the
  // learner navigate to the official CS50 course pages. No fetch, XHR, or
  // WebSocket is involved; the browser navigates on click, not the app.
  'https://cs50.harvard.edu/',
];

const URL_PATTERN = /https?:\/\/[^\s'"`)<>]+/g;

/**
 * The one module allowed a network read (owner decision 2026-10-03): it
 * reads static, versioned assets packaged with this build from this origin
 * (programme content and the client-side Python runtime) and refuses any
 * other path; see the "same-origin packaged assets" tests below. Every other
 * primitive check still applies to it, and no other file may fetch.
 */
const PACKAGED_ASSET_READER = 'src/lib/assets/sameOriginAsset.ts';

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
 * Remove comments so only executable code is scanned. Block comments are
 * stripped first; line comments are then stripped, treating `://` as part of a
 * URL rather than the start of a comment.
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

describe('local-only source safety guardrail', () => {
  const sourceFiles = listAppSourceFiles(SRC_ROOT);

  it('scans a non-empty set of runtime source files', () => {
    // Fail loudly if the walker silently finds nothing (otherwise the guard
    // below would trivially pass).
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it('keeps runtime source free of network, code-exec, and HTML-injection primitives', () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const code = stripComments(readFileSync(file, 'utf8'));
      const relativePath = path
        .relative(process.cwd(), file)
        .replace(/\\/g, '/');

      for (const { label, pattern } of FORBIDDEN_PATTERNS) {
        if (
          label === 'network fetch' &&
          relativePath === PACKAGED_ASSET_READER
        ) {
          continue;
        }

        if (pattern.test(code)) {
          violations.push(`${relativePath}: ${label}`);
        }
      }

      for (const url of code.match(URL_PATTERN) ?? []) {
        const allowed = ALLOWED_URL_PREFIXES.some((prefix) =>
          url.startsWith(prefix),
        );

        if (!allowed) {
          violations.push(`${relativePath}: external URL ${url}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

describe('same-origin packaged assets: the one permitted network read', () => {
  const base = 'https://progresspal.example/';

  it('is a single, fixed module that fetches exactly once', () => {
    const code = stripComments(
      readFileSync(path.resolve(process.cwd(), PACKAGED_ASSET_READER), 'utf8'),
    );

    expect(code.match(/\bfetch\s*\(/g)).toHaveLength(1);
    expect(code).not.toMatch(URL_PATTERN);
  });

  it('resolves packaged content and runtime paths on this origin only', () => {
    expect(
      resolveSameOriginAsset(
        'content/programvareutvikling/index.0123456789abcdef.json',
        base,
      ).href,
    ).toBe(
      'https://progresspal.example/content/programvareutvikling/index.0123456789abcdef.json',
    );
    expect(
      resolveSameOriginAsset('runtime/pyodide-314.0.7/pyodide.mjs', base)
        .origin,
    ).toBe('https://progresspal.example');
  });

  it.each([
    'https://cdn.example.com/content/x.json',
    '//cdn.example.com/content/x.json',
    '/content/x.json',
    'content/../index.html',
    'content//x.json',
    'assets/index.js',
    'data:application/json,{}',
    'javascript:alert(1)',
    'Content/x.json',
    '',
  ])('refuses %j before any request', (unsafe) => {
    expect(() => resolveSameOriginAsset(unsafe, base)).toThrow();
  });
});
