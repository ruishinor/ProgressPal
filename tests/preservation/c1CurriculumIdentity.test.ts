import { describe, expect, it } from 'vitest';

import { buildCourseMap } from '@/features/course/model';
import { loadRpgCourseMapSummary } from '@/features/rpg';
import { getCourseMapReadData } from '@/lib/db';
import { bundledCourseSeed } from '@/seed';

import { createSeededDatabase } from './c1Support';
import { cs50CatalogueId, cs50Policy } from '../programmes/cs50Policy';

/**
 * Epic C / C1 evidence area 1 — curriculum identity and order.
 *
 * Family: SEMANTIC ORACLE. Authority: src/seed/cs50x-2026.json (catalogue
 * identity `cs50x-2026`, dataVersion 20260617), reviewed row by row in C1.
 * Owner after C3/C4: CS50-owned catalogue content (C0 contract section 4c);
 * the Programme -> Unit -> Item shape itself is shared.
 *
 * The same identity and order is asserted through the runtime consumers that
 * render it (Classic course map model and RPG campaign map summary), not only
 * through the parsed seed.
 */

type UnitRow = readonly [
  id: string,
  type: string,
  required: boolean,
  order: number,
];
type ItemRow = readonly [
  unitId: string,
  id: string,
  type: string,
  required: boolean,
  order: number,
];

const expectedUnits: readonly UnitRow[] = [
  ['week-0', 'week', true, 0],
  ['week-1', 'week', true, 10],
  ['week-2', 'week', true, 20],
  ['week-3', 'week', true, 30],
  ['week-4', 'week', true, 40],
  ['week-5', 'week', true, 50],
  ['week-6', 'week', true, 60],
  ['week-7', 'week', true, 70],
  ['artificial-intelligence', 'special', false, 75],
  ['week-8', 'week', true, 80],
  ['week-9', 'week', true, 90],
  ['week-10', 'week', true, 100],
  ['additional-practice', 'special', false, 110],
  ['final-project', 'final_project', true, 120],
];

const expectedItems: readonly ItemRow[] = [
  ['week-0', 'week-0-lecture', 'lecture', true, 0],
  ['week-0', 'week-0-problem-set', 'problem_set', true, 1],
  ['week-1', 'week-1-lecture', 'lecture', true, 0],
  ['week-1', 'week-1-shorts', 'shorts', false, 1],
  ['week-1', 'week-1-section', 'section', false, 2],
  ['week-1', 'week-1-problem-set', 'problem_set', true, 3],
  ['week-2', 'week-2-lecture', 'lecture', true, 0],
  ['week-2', 'week-2-shorts', 'shorts', false, 1],
  ['week-2', 'week-2-section', 'section', false, 2],
  ['week-2', 'week-2-problem-set', 'problem_set', true, 3],
  ['week-3', 'week-3-lecture', 'lecture', true, 0],
  ['week-3', 'week-3-shorts', 'shorts', false, 1],
  ['week-3', 'week-3-section', 'section', false, 2],
  ['week-3', 'week-3-problem-set', 'problem_set', true, 3],
  ['week-4', 'week-4-lecture', 'lecture', true, 0],
  ['week-4', 'week-4-shorts', 'shorts', false, 1],
  ['week-4', 'week-4-section', 'section', false, 2],
  ['week-4', 'week-4-problem-set', 'problem_set', true, 3],
  ['week-5', 'week-5-lecture', 'lecture', true, 0],
  ['week-5', 'week-5-shorts', 'shorts', false, 1],
  ['week-5', 'week-5-section', 'section', false, 2],
  ['week-5', 'week-5-problem-set', 'problem_set', true, 3],
  ['week-6', 'week-6-lecture', 'lecture', true, 0],
  ['week-6', 'week-6-shorts', 'shorts', false, 1],
  ['week-6', 'week-6-section', 'section', false, 2],
  ['week-6', 'week-6-problem-set', 'problem_set', true, 3],
  ['week-7', 'week-7-lecture', 'lecture', true, 0],
  ['week-7', 'week-7-shorts', 'shorts', false, 1],
  ['week-7', 'week-7-section', 'section', false, 2],
  ['week-7', 'week-7-problem-set', 'problem_set', true, 3],
  [
    'artificial-intelligence',
    'artificial-intelligence-lecture',
    'lecture',
    false,
    0,
  ],
  ['week-8', 'week-8-lecture', 'lecture', true, 0],
  ['week-8', 'week-8-shorts', 'shorts', false, 1],
  ['week-8', 'week-8-section', 'section', false, 2],
  ['week-8', 'week-8-problem-set', 'problem_set', true, 3],
  ['week-9', 'week-9-lecture', 'lecture', true, 0],
  ['week-9', 'week-9-shorts', 'shorts', false, 1],
  ['week-9', 'week-9-section', 'section', false, 2],
  ['week-9', 'week-9-problem-set', 'problem_set', true, 3],
  ['week-10', 'week-10-lecture', 'lecture', true, 0],
  ['week-10', 'week-10-seminars', 'reading', false, 1],
  ['additional-practice', 'practice-debug', 'practice', false, 0],
  ['additional-practice', 'practice-half', 'practice', false, 1],
  ['additional-practice', 'practice-prime', 'practice', false, 2],
  ['additional-practice', 'practice-hours', 'practice', false, 3],
  ['additional-practice', 'practice-no-vowels', 'practice', false, 4],
  ['additional-practice', 'practice-password', 'practice', false, 5],
  ['additional-practice', 'practice-recursive-atoi', 'practice', false, 6],
  [
    'additional-practice',
    'practice-average-temperatures',
    'practice',
    false,
    7,
  ],
  ['additional-practice', 'practice-max', 'practice', false, 8],
  ['additional-practice', 'practice-snackbar', 'practice', false, 9],
  ['additional-practice', 'practice-bottom-up', 'practice', false, 10],
  ['additional-practice', 'practice-license', 'practice', false, 11],
  ['additional-practice', 'practice-trie', 'practice', false, 12],
  ['additional-practice', 'practice-bank', 'practice', false, 13],
  [
    'additional-practice',
    'practice-frank-ian-and-glens-letters',
    'practice',
    false,
    14,
  ],
  ['additional-practice', 'practice-jar', 'practice', false, 15],
  ['additional-practice', 'practice-seven-day-average', 'practice', false, 16],
  ['additional-practice', 'practice-taqueria', 'practice', false, 17],
  ['additional-practice', 'practice-favorites', 'practice', false, 18],
  ['additional-practice', 'practice-hall-of-prophecy', 'practice', false, 19],
  ['additional-practice', 'practice-radio-shack-redo', 'practice', false, 20],
  ['additional-practice', 'practice-hello-flask', 'practice', false, 21],
  ['final-project', 'final-project-build', 'project_task', true, 0],
  ['final-project', 'final-project-video-demo', 'project_task', true, 1],
  ['final-project', 'final-project-readme', 'project_task', true, 2],
  ['final-project', 'final-project-submit50', 'project_task', true, 3],
  ['final-project', 'final-project-gradebook-check', 'project_task', true, 4],
];

function expectedItemRowsFor(unitId: string) {
  return expectedItems.filter((row) => row[0] === unitId);
}

describe('C1 curriculum identity and order (semantic)', () => {
  it('pins the catalogue identity, version and cardinality', () => {
    expect(bundledCourseSeed.courseId).toBe('cs50x-2026');
    expect(bundledCourseSeed.dataVersion).toBe(20260617);
    expect(expectedUnits).toHaveLength(14);
    expect(expectedItems).toHaveLength(68);
    expect(expectedItems.filter((row) => row[3])).toHaveLength(26);
  });

  it('matches every unit and item row of the parsed bundled seed in order', () => {
    expect(
      bundledCourseSeed.units.map(
        (unit) => [unit.id, unit.type, unit.required, unit.order] as const,
      ),
    ).toEqual(expectedUnits);
    expect(
      bundledCourseSeed.units.flatMap((unit) =>
        unit.items.map(
          (item) =>
            [unit.id, item.id, item.type, item.required, item.order] as const,
        ),
      ),
    ).toEqual(expectedItems);
  });

  it('renders the same unit and item order through the Classic course map model', async () => {
    const context = await createSeededDatabase('curriculum-classic');
    try {
      const data = await getCourseMapReadData({
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: context.db,
      });
      const map = buildCourseMap(
        data.courseUnits,
        data.courseItems,
        data.progressEntries,
      );

      expect(map.units.map((unit) => [unit.id, unit.required])).toEqual(
        expectedUnits.map((row) => [row[0], row[2]]),
      );
      for (const unit of map.units) {
        expect(
          unit.items.map((item) => [item.id, item.type, item.required]),
        ).toEqual(
          expectedItemRowsFor(unit.id).map((row) => [row[1], row[2], row[3]]),
        );
      }
      expect(map.unitCount).toBe(14);
      expect(map.itemCount).toBe(68);
      expect(map.requiredItemCount).toBe(26);
      expect([
        ...new Set(data.courseUnits.map((unit) => unit.courseId)),
      ]).toEqual(['cs50x-2026']);
    } finally {
      await context.cleanup();
    }
  });

  it('renders the same module and quest order through the RPG campaign map summary', async () => {
    const context = await createSeededDatabase('curriculum-rpg');
    try {
      const summary = await loadRpgCourseMapSummary({ db: context.db });

      expect(summary.modules.map((module) => module.id)).toEqual(
        expectedUnits.map((row) => row[0]),
      );
      for (const module of summary.modules) {
        expect(
          module.quests.map((quest) => [quest.id, quest.type, quest.required]),
        ).toEqual(
          expectedItemRowsFor(module.id).map((row) => [row[1], row[2], row[3]]),
        );
      }
      expect(summary.unitCount).toBe(14);
      expect(summary.requiredItemCount).toBe(26);
    } finally {
      await context.cleanup();
    }
  });
});
