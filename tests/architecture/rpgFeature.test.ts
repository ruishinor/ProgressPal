import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const RPG_FEATURE_ROOT = path.resolve(process.cwd(), 'src/features/rpg');
const RPG_STYLE_ROOT = path.resolve(process.cwd(), 'src/styles');
const RPG_UI_DIRECTORIES = ['components', 'routes', 'shell'] as const;
const CSS_IMPORT_PATTERN = /@import\b/i;
const CSS_REMOTE_URL_PATTERN = /url\(\s*['"]?https?:\/\//i;
const CSS_DATA_URL_PATTERN = /url\(\s*['"]?data:/i;
const MAP_READ_IMPLEMENTATION_FILES = [
  path.resolve(process.cwd(), 'src/features/rpg/model/readModels.ts'),
  path.resolve(process.cwd(), 'src/lib/db/repositories.ts'),
] as const;
const RAW_DATABASE_ESCAPE_PATTERNS: ReadonlyArray<{
  label: string;
  pattern: RegExp;
}> = [
  { label: 'raw IndexedDB open', pattern: /\bindexedDB\s*\.\s*open\s*\(/ },
  { label: 'Dexie backend escape', pattern: /\bbackendDB\s*\(/ },
  { label: 'Dexie core escape', pattern: /\.core\s*(?:\.|\[)/ },
  { label: 'native objectStore access', pattern: /\bobjectStore\s*\(/ },
];

function listSourceFiles(directoryPath: string): string[] {
  if (!existsSync(directoryPath)) {
    return [];
  }

  return readdirSync(directoryPath, { withFileTypes: true }).flatMap(
    (entry) => {
      const fullPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        return listSourceFiles(fullPath);
      }

      return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
    },
  );
}

function listRpgStyleFiles(directoryPath: string): string[] {
  if (!existsSync(directoryPath)) {
    return [];
  }

  return readdirSync(directoryPath, { withFileTypes: true }).flatMap(
    (entry) => {
      const fullPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        return listRpgStyleFiles(fullPath);
      }

      return /^rpg-.*\.css$/.test(entry.name) ? [fullPath] : [];
    },
  );
}

describe('RPG feature architecture boundary', () => {
  it('keeps future RPG UI files from importing the database layer directly', () => {
    const uiFiles = RPG_UI_DIRECTORIES.flatMap((directory) =>
      listSourceFiles(path.join(RPG_FEATURE_ROOT, directory)),
    );
    const directDatabaseImports = uiFiles
      .filter((file) => {
        const source = readFileSync(file, 'utf8');

        return /from\s+['"]@\/lib\/db(?:\/[^'"]*)?['"]/.test(source);
      })
      .map((file) => path.relative(process.cwd(), file).replace(/\\/g, '/'));

    expect(directDatabaseImports).toEqual([]);
  });

  it('keeps the Map read path on the instrumentable Dexie/repository boundary', () => {
    const violations = MAP_READ_IMPLEMENTATION_FILES.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const relativePath = path
        .relative(process.cwd(), file)
        .replace(/\\/g, '/');

      return RAW_DATABASE_ESCAPE_PATTERNS.filter(({ pattern }) =>
        pattern.test(source),
      ).map(({ label }) => `${relativePath}: ${label}`);
    });

    expect(violations).toEqual([]);
  });

  it('keeps RPG styles free of remote CSS assets and inline data blobs', () => {
    const styleFiles = listRpgStyleFiles(RPG_STYLE_ROOT);
    const violations = styleFiles
      .flatMap((file) => {
        const source = readFileSync(file, 'utf8');
        const relativePath = path
          .relative(process.cwd(), file)
          .replace(/\\/g, '/');
        const fileViolations: string[] = [];

        if (CSS_IMPORT_PATTERN.test(source)) {
          fileViolations.push(`${relativePath}: CSS import`);
        }

        if (CSS_REMOTE_URL_PATTERN.test(source)) {
          fileViolations.push(`${relativePath}: remote CSS asset URL`);
        }

        if (CSS_DATA_URL_PATTERN.test(source)) {
          fileViolations.push(`${relativePath}: inline data URL asset`);
        }

        return fileViolations;
      })
      .sort();

    expect(styleFiles.length).toBeGreaterThan(0);
    expect(violations).toEqual([]);
  });
});
