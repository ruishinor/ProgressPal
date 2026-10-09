import { afterEach, describe, expect, it } from 'vitest';

import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import { buildCourseMap } from '@/features/course/model';
import { loadRpgModuleSummary } from '@/features/rpg';
import {
  enrolAndSwitchActiveProgramme,
  getCatalogueCourseState,
  initializeDatabase,
} from '@/lib/db';
import type { ProgrammeScope } from '@/lib/domain';
import { getDefaultProgrammeDefinition } from '@/programmes';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';
import { bundledCourseSeed } from '@/seed';

import {
  createTestDatabase,
  type TestDatabaseContext,
} from '../db/testDatabase';

/**
 * DC-07 / INV-06: optional practice never adds its minutes to module length.
 * The rule is programme policy, so CS50's existing "planned" totals (which
 * include its optional items) are preserved exactly.
 */

const p2 = programvareutviklingDefinition;
const p2Scope: ProgrammeScope = {
  catalogue: p2.catalogue,
  catalogueId: p2.catalogueId,
  content: p2.content,
  policy: p2.policy,
  programmeId: p2.programmeId,
  title: p2.title,
};
const databases: TestDatabaseContext[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

async function p2Device() {
  const context = createTestDatabase(
    'optional-length',
    resolveDatabaseMigrationContext(),
  );
  databases.push(context);
  await initializeDatabase({ db: context.db, seed: bundledCourseSeed });
  await enrolAndSwitchActiveProgramme(p2.programmeId, {
    db: context.db,
    seed: p2.catalogue,
  });
  return context;
}

describe('module length excludes optional lessons for Programvareutvikling', () => {
  it('computes module 2 as 1,220 minutes, excluding the optional reinforcement mission', async () => {
    const context = await p2Device();
    const state = await getCatalogueCourseState({
      catalogueId: p2.catalogueId,
      db: context.db,
    });
    const map = buildCourseMap(
      state.courseUnits,
      state.courseItems,
      [],
      new Map(),
      {
        optionalItemsInUnitLength:
          p2.policy.catalogueRules.optionalItemsInUnitLength,
      },
    );

    expect(map.units.map((unit) => [unit.id, unit.estimatedMinutes])).toEqual([
      ['s1-m01', 765],
      ['s1-m02', 1_220],
    ]);
  });

  it('shows the same module length on the RPG module surface', async () => {
    const context = await p2Device();
    const summary = await loadRpgModuleSummary(p2Scope, 's1-m02', {
      db: context.db,
    });

    expect(summary?.estimatedMinutes).toBe(1_220);
  });

  it('keeps CS50 totals, which include optional items, unchanged', async () => {
    const context = createTestDatabase('optional-length-cs50');
    databases.push(context);
    const cs50 = getDefaultProgrammeDefinition();
    await initializeDatabase({ db: context.db, seed: bundledCourseSeed });
    const state = await getCatalogueCourseState({
      catalogueId: cs50.catalogueId,
      db: context.db,
    });
    const legacy = buildCourseMap(state.courseUnits, state.courseItems, []);
    const scoped = buildCourseMap(
      state.courseUnits,
      state.courseItems,
      [],
      new Map(),
      {
        optionalItemsInUnitLength:
          cs50.policy.catalogueRules.optionalItemsInUnitLength,
      },
    );

    expect(scoped).toEqual(legacy);
  });
});
