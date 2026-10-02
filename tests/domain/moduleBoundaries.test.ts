import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

function listFilesRecursively(directoryPath: string): string[] {
  return readdirSync(directoryPath, { withFileTypes: true }).flatMap(
    (entry) => {
      const fullPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        return listFilesRecursively(fullPath);
      }

      return [fullPath];
    },
  );
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDirectory, '..', '..');

describe('Module 05 boundaries', () => {
  it('preserves the Module 04 database layer surface', () => {
    const databaseFiles = listFilesRecursively(
      path.join(workspaceRoot, 'src/lib/db'),
    )
      .map((filePath) =>
        path.relative(path.join(workspaceRoot, 'src/lib/db'), filePath),
      )
      .filter((relativePath) => relativePath !== 'README.md')
      .sort();

    expect(databaseFiles).toEqual([
      'constants.ts',
      'database.ts',
      'index.ts',
      // Epic E (accepted E-SCHEMA-1): the learner-evidence repository.
      'learnerEvidence.ts',
      'migrationContext.ts',
      'migrationV2ToV3.ts',
      'repositories.ts',
    ]);
  });

  it('exposes the bundled seed through a narrow public surface', () => {
    const seedFiles = listFilesRecursively(path.join(workspaceRoot, 'src/seed'))
      .map((filePath) =>
        path.relative(path.join(workspaceRoot, 'src/seed'), filePath),
      )
      .sort();

    expect(seedFiles).toEqual(['README.md', 'cs50x-2026.json', 'index.ts']);
  });
});
