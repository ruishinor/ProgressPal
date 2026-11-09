import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const catalogue = JSON.parse(
  readFileSync(resolve(root, 'src/ui-copy/interface.json'), 'utf8'),
) as { surfaces: Record<string, Record<string, string>> };

function tsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = join(directory, entry.name);
    if (entry.isDirectory()) return tsxFiles(name);
    return entry.isFile() && name.endsWith('.tsx') ? [name] : [];
  });
}

describe('independently editable UI copy', () => {
  it('has no dangling or unreferenced surface keys', () => {
    const referenced = new Set<string>();
    for (const filename of tsxFiles(resolve(root, 'src'))) {
      const source = readFileSync(filename, 'utf8');
      const importsCatalogue = source.includes(
        "import uiCopy from '@/ui-copy/interface.json';",
      );
      const matches = [
        ...source.matchAll(
          /uiCopy\s*\.\s*surfaces\s*\.\s*([A-Za-z]\w*)\s*\.\s*([A-Za-z]\w*)/g,
        ),
      ];
      if (matches.length > 0) {
        expect(importsCatalogue, relative(root, filename)).toBe(true);
      }
      for (const match of matches) {
        const group = match[1]!;
        const key = match[2]!;
        expect(typeof catalogue.surfaces[group]?.[key], `${group}.${key}`).toBe(
          'string',
        );
        referenced.add(`${group}.${key}`);
      }
    }
    const defined = Object.entries(catalogue.surfaces).flatMap(
      ([group, values]) => Object.keys(values).map((key) => `${group}.${key}`),
    );
    expect([...referenced].sort()).toEqual(defined.sort());
  });

  it('keeps explanatory Pathways status definitions inside opt-in disclosure', () => {
    const page = readFileSync(
      resolve(root, 'src/features/pathways/PathwaysPage.tsx'),
      'utf8',
    );
    expect(page).toContain(
      '<details className="pathways-track__progress-info">',
    );
    expect(page).toContain('uiCopy.pathways.progressInfoBody');
    expect(page).not.toContain('«Påbegynt» betyr lagret aktivitet');
  });
});
