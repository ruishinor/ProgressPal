import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Epic E dependency boundaries (bounded source-text guard; it resolves import
 * specifiers with simple patterns and is not a full parser):
 * - the mastery engine is pure: no persistence, browser storage or UI;
 * - evaluators are pure; only the submission lifecycle touches persistence;
 * - the lesson feature receives content through the runtime programme scope
 *   and never reads the registry, a programme module or the snapshot files;
 * - the committed content snapshot is imported by its programme only.
 */

const SRC = path.resolve(process.cwd(), 'src');
const SPECIFIER =
  /\b(?:import|export)\s[^'"]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function filesUnder(relative: string): string[] {
  const directory = path.join(SRC, relative);

  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return filesUnder(path.relative(SRC, full));
    }
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)
      ? [full]
      : [];
  });
}

function specifiers(file: string) {
  return [...readFileSync(file, 'utf8').matchAll(SPECIFIER)].map(
    (match) => (match[1] ?? match[2])!,
  );
}

describe('Epic E module boundaries', () => {
  it('has the new modules in place', () => {
    expect(filesUnder('lib/mastery').length).toBeGreaterThan(0);
    expect(filesUnder('lib/evaluation').length).toBeGreaterThan(0);
    expect(filesUnder('features/lessons').length).toBeGreaterThan(0);
  });

  it('keeps the mastery engine pure', () => {
    for (const file of filesUnder('lib/mastery')) {
      for (const specifier of specifiers(file)) {
        expect(specifier, file).not.toMatch(
          /^@\/lib\/(db|storage|appState)|^dexie$|^react/,
        );
      }
    }
  });

  it('lets only the submission lifecycle touch persistence among the evaluation modules', () => {
    for (const file of filesUnder('lib/evaluation')) {
      const persistent = specifiers(file).filter((specifier) =>
        /^@\/lib\/(db|storage)|^dexie$/.test(specifier),
      );

      if (path.basename(file) !== 'lifecycle.ts') {
        expect(persistent, file).toEqual([]);
      }
    }
  });

  it('keeps the lesson feature off the registry, programme modules and snapshot files', () => {
    for (const file of filesUnder('features/lessons')) {
      for (const specifier of specifiers(file)) {
        expect(specifier, file).not.toMatch(/^@\/programmes|\.json$/);
      }
    }
  });

  it('imports the content snapshot only from its own programme', () => {
    const importers = [
      ...filesUnder('app'),
      ...filesUnder('components'),
      ...filesUnder('features'),
      ...filesUnder('lib'),
      ...filesUnder('programmes'),
    ].filter((file) =>
      specifiers(file).some(
        (specifier) =>
          /programvareutvikling\/content\//.test(specifier) ||
          /content\/(manifest|s1-m0\d)\.json$/.test(specifier),
      ),
    );

    for (const file of importers) {
      expect(path.relative(SRC, file).replace(/\\/g, '/')).toMatch(
        /^programmes\/programvareutvikling\//,
      );
    }
    expect(importers.length).toBeGreaterThan(0);
  });
});
