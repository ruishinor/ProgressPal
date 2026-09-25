import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const featureRoot = path.resolve(process.cwd(), 'src/features');
const movedSymbolsByOldOwner: Readonly<Record<string, ReadonlySet<string>>> = {
  '@/features/course/model': new Set([
    'CourseStatusVariant',
    'formatMinutes',
    'getItemStatusLabel',
    'getItemStatusVariant',
  ]),
  '@/features/progress': new Set([
    'CourseLongFormProgress',
    'buildLongFormProgressMap',
    'buildLongFormProgressMapFromEventAggregates',
  ]),
  '@/features/progress/model': new Set([
    'CourseLongFormProgress',
    'buildLongFormProgressMap',
    'buildLongFormProgressMapFromEventAggregates',
  ]),
  '@/features/sessions': new Set(['StudySessionSaveResult']),
};

function listFeatureFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listFeatureFiles(fullPath);
    }

    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

describe('Epic B shared-contract ownership', () => {
  it('keeps moved contracts sourced from lib in feature implementations', () => {
    const violations = listFeatureFiles(featureRoot).flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const relativePath = path.relative(process.cwd(), file);

      return Array.from(
        source.matchAll(
          /\bimport\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g,
        ),
      ).flatMap((match) => {
        const [, importedNames, owner] = match;
        const movedSymbols = movedSymbolsByOldOwner[owner ?? ''];

        if (movedSymbols === undefined) {
          return [];
        }

        return (importedNames ?? '')
          .split(',')
          .map(
            (name) =>
              name
                .trim()
                .replace(/^type\s+/, '')
                .split(/\s+/)[0],
          )
          .filter(
            (name): name is string =>
              name !== undefined && movedSymbols.has(name),
          )
          .map((name) => `${relativePath}: ${name} from ${owner}`);
      });
    });

    expect(violations).toEqual([]);
  });
});
