import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const RPG_FEATURE_ROOT = path.resolve(process.cwd(), 'src/features/rpg');
const RPG_UI_DIRECTORIES = ['components', 'routes', 'shell'] as const;

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
});
