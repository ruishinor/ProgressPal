import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Epic C / C5 repair guard: the active programme scope (catalogue identity
 * and policy passed to shared read and write paths) is resolved once, at the
 * app composition root, and handed to app state. Features and other app files
 * take it from app state; they never derive a catalogue identity or read/write
 * options from the programme accessor themselves, and nothing outside the
 * programme layer seeds the bundled catalogue directly.
 *
 * Bounded source-text guard over whitespace-normalized code. Content lookups
 * (terminology, links, guides) and presentation lookups of the policy are
 * outside it.
 */

const SRC = join(process.cwd(), 'src');
const COMPOSITION_ROOT = 'src/app/providers/AppProviders.tsx';

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

const normalize = (source: string) => source.replace(/\s+/g, ' ');
const name = (path: string) =>
  relative(process.cwd(), path).replace(/\\/g, '/');

const catalogueFromAccessor = [
  /\{[^{}]*\bcatalogueId\b[^{}]*\} = getActiveProgrammeDefinition\(\)/,
  /getActiveProgrammeDefinition\(\) ?\. ?catalogueId\b/,
];
const optionsFromAccessor =
  /\bpolicy ?: ?getActiveProgrammeDefinition\(\) ?\. ?policy ?[,}]/;
const bundledSeedImport = /from ['"]@\/seed['"]/;

function violations(files: string[], pattern: RegExp) {
  return files
    .filter((file) => pattern.test(normalize(readFileSync(file, 'utf8'))))
    .map(name);
}

const appAndFeatureFiles = ['app', 'features'].flatMap((layer) =>
  listSourceFiles(join(SRC, layer)),
);

describe('C5 programme scope is resolved once at the composition root', () => {
  it('detects the forbidden patterns (positive control)', () => {
    const sample = normalize(`
      const { catalogueId, policy } = getActiveProgrammeDefinition();
      read({ policy: getActiveProgrammeDefinition().policy, db });
      const id = getActiveProgrammeDefinition().catalogueId;
      import { bundledCourseSeed } from '@/seed';
    `);
    for (const pattern of [
      ...catalogueFromAccessor,
      optionsFromAccessor,
      bundledSeedImport,
    ]) {
      expect(pattern.test(sample), String(pattern)).toBe(true);
    }
  });

  it('resolves the catalogue identity only in the composition root', () => {
    const found = catalogueFromAccessor.flatMap((pattern) =>
      violations(appAndFeatureFiles, pattern),
    );
    expect([...new Set(found)]).toEqual([COMPOSITION_ROOT]);
  });

  it('never builds shared read or write options from the accessor', () => {
    expect(violations(appAndFeatureFiles, optionsFromAccessor)).toEqual([]);
  });

  it('seeds the bundled catalogue only through the programme layer', () => {
    const files = ['app', 'features', 'lib', 'components'].flatMap((layer) =>
      listSourceFiles(join(SRC, layer)),
    );
    expect(violations(files, bundledSeedImport)).toEqual([]);
  });
});
