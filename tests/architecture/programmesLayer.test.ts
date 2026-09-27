import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Epic C / C2 programme-layer dependency direction (C0 programme definition
 * contract §6). ESLint `no-restricted-imports` guards the `@/` alias forms;
 * this test resolves every import specifier, including relative paths,
 * `import type`, re-exports and dynamic imports, so a relative path cannot
 * escape the same rules.
 */

const SRC = path.resolve(process.cwd(), 'src');
const PROGRAMMES = path.join(SRC, 'programmes');
const PROGRAMMES_ENTRYPOINT = path.join(PROGRAMMES, 'index');

/** Lower-layer entrypoints the programme layer may import (contract §6). */
const PROGRAMME_ALLOWED_TARGETS = [
  'lib/domain/index',
  'lib/validation/index',
  'lib/achievements/index',
  'seed/index',
].map((target) => path.join(SRC, target));
const PROGRAMME_ALLOWED_PACKAGES = ['zod'];

const SPECIFIER_PATTERNS = [
  /\b(?:import|export)\s[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

function listSourceFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(fullPath);
    }

    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function specifiersOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');

  return SPECIFIER_PATTERNS.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1]!),
  );
}

/** Resolves to an extensionless absolute path, or null for a bare package. */
function resolveSpecifier(file: string, specifier: string): string | null {
  const bare = specifier.split('?')[0]!;
  let target: string;

  if (bare.startsWith('@/')) {
    target = path.join(SRC, bare.slice(2));
  } else if (bare.startsWith('.')) {
    target = path.resolve(path.dirname(file), bare);
  } else {
    return null;
  }

  target = target.replace(/\.(ts|tsx)$/, '');

  return existsSync(target) && !path.extname(target)
    ? path.join(target, 'index')
    : target;
}

const isInside = (target: string, directory: string) =>
  target === directory || target.startsWith(`${directory}${path.sep}`);
const relativeName = (file: string) =>
  path.relative(process.cwd(), file).replace(/\\/g, '/');

describe('Epic C / C2 programme layer boundary', () => {
  it('scans the programme layer and its consumers', () => {
    expect(listSourceFiles(PROGRAMMES).length).toBeGreaterThan(0);
  });

  it('keeps the programme layer on its permitted lower-layer entrypoints', () => {
    const violations: string[] = [];

    for (const file of listSourceFiles(PROGRAMMES)) {
      for (const specifier of specifiersOf(file)) {
        const target = resolveSpecifier(file, specifier);
        const allowed =
          target === null
            ? PROGRAMME_ALLOWED_PACKAGES.includes(specifier)
            : !/\.[a-z0-9]+$/i.test(target) &&
              (isInside(target, PROGRAMMES) ||
                PROGRAMME_ALLOWED_TARGETS.includes(target));

        if (!allowed) {
          violations.push(`${relativeName(file)} -> ${specifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps lib and shared components free of the programme layer', () => {
    const violations = ['lib', 'components'].flatMap((layer) =>
      listSourceFiles(path.join(SRC, layer)).flatMap((file) =>
        specifiersOf(file)
          .filter((specifier) => {
            const target = resolveSpecifier(file, specifier);
            return target !== null && isInside(target, PROGRAMMES);
          })
          .map((specifier) => `${relativeName(file)} -> ${specifier}`),
      ),
    );

    expect(violations).toEqual([]);
  });

  it('lets app and features reach the programme layer only through its entrypoint', () => {
    const violations = ['app', 'features'].flatMap((layer) =>
      listSourceFiles(path.join(SRC, layer)).flatMap((file) =>
        specifiersOf(file)
          .filter((specifier) => {
            const target = resolveSpecifier(file, specifier);
            return (
              target !== null &&
              isInside(target, PROGRAMMES) &&
              target !== PROGRAMMES_ENTRYPOINT
            );
          })
          .map((specifier) => `${relativeName(file)} -> ${specifier}`),
      ),
    );

    expect(violations).toEqual([]);
  });
});
