import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { sharedAchievementDefinitions } from '@/lib/achievements';
import { getActiveProgrammeDefinition } from '@/programmes';
import seedJson from '@/seed/cs50x-2026.json';

/**
 * Epic C / C3 guard G-7 (`VALIDATION_READINESS.md` §3): shared library code
 * must not hard-code CS50-owned identifiers. CS50 policy reaches `src/lib/**`
 * only as a parameter from the programme layer.
 *
 * CS50-owned identifiers are the catalogue unit and item IDs, the ten
 * CS50-bound achievement IDs and the final-project milestone `sourceId`s. The
 * six shared achievement IDs and shared vocabulary (enum values such as
 * `final_project` or `problem_set`) are not CS50-owned and are exempt.
 *
 * This is a bounded source-text guard: it extracts quoted string literals
 * (including those inside comments) and compares them exactly. It is not a
 * TypeScript parser and does not see identifiers assembled at runtime.
 */

const libRoot = join(process.cwd(), 'src', 'lib');

/** Independent restatement of C0 contract §4e (the ten CS50-bound IDs). */
const cs50AchievementIds = [
  'scratch-initiate',
  'pointer-survivor',
  'data-structure-builder',
  'python-shift',
  'query-builder',
  'browser-builder',
  'flask-route-maker',
  'pset-chain',
  'final-project-mvp',
  'final-project-shipped',
];

/** C0 contract §4b final-project milestone source IDs. */
const cs50MilestoneSourceIds = [
  'final-project-build-completed',
  'final-project-readme-demo-combined',
];

const catalogueIds = [
  seedJson.courseId,
  ...seedJson.units.map((unit) => unit.id),
  ...seedJson.units.flatMap((unit) => unit.items.map((item) => item.id)),
];

export const cs50OwnedIdentifiers: ReadonlySet<string> = new Set([
  ...catalogueIds,
  ...cs50AchievementIds,
  ...cs50MilestoneSourceIds,
]);

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return /\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

const stringLiteralPattern = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g;

function findOwnedLiterals(source: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(stringLiteralPattern)) {
    const value = match[2]!;
    if (cs50OwnedIdentifiers.has(value)) found.push(value);
  }
  return found;
}

describe('G-7: src/lib contains no CS50-owned identifier literal', () => {
  it('covers the full CS50 identifier set', () => {
    expect(catalogueIds).toHaveLength(1 + 14 + 68);
    expect(cs50OwnedIdentifiers.size).toBe(
      catalogueIds.length +
        cs50AchievementIds.length +
        cs50MilestoneSourceIds.length,
    );
  });

  it('matches the programme-owned achievements and milestones of the CS50 definition', () => {
    const { achievements, xp } = getActiveProgrammeDefinition().policy;
    const sharedIds = new Set(
      sharedAchievementDefinitions.map((definition) => definition.id),
    );
    expect(
      achievements
        .map((definition) => definition.id)
        .filter((id) => !sharedIds.has(id))
        .sort(),
    ).toEqual([...cs50AchievementIds].sort());
    expect(xp.itemMilestones.map((milestone) => milestone.sourceId)).toEqual(
      cs50MilestoneSourceIds,
    );
  });

  it('detects an owned literal (positive control)', () => {
    expect(findOwnedLiterals(`const id = 'week-0';`)).toEqual(['week-0']);
    expect(findOwnedLiterals('const x = "pset-chain";')).toEqual([
      'pset-chain',
    ]);
    expect(findOwnedLiterals("const t = 'final_project';")).toEqual([]);
  });

  it('finds none under src/lib', () => {
    const violations = listSourceFiles(libRoot).flatMap((path) =>
      findOwnedLiterals(readFileSync(path, 'utf8')).map(
        (value) => `${relative(process.cwd(), path)}: ${value}`,
      ),
    );

    expect(violations).toEqual([]);
  });
});
