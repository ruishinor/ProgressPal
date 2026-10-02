import { describe, expect, it } from 'vitest';

import { buildCourseMap, courseItemTypeLabels } from '@/features/course/model';
import {
  CourseItemSchema,
  CourseItemTypeSchema,
  CourseUnitSchema,
  CourseUnitTypeSchema,
  completionAwardSourceId,
  completionAwardSourceType,
  courseItemTypeValues,
  courseUnitTypeValues,
  getXpAwardSourceKey,
  listPotentialXpRewardSourceKeys,
  unitCompletionSourceType,
  type CourseItem,
  type CourseSeed,
  type CourseUnit,
  type ProgressEntry,
} from '@/lib/domain';
import { evaluateProgressXp } from '@/lib/xp/engine';
import { validateProgrammeDefinition } from '@/programmes/definition';
import { createProgrammeRegistry } from '@/programmes/registry';

import { buildAltDefinition, cs50Definition } from './c7Fixture';

/**
 * `module` (unit) and `lesson` (item) are additive shared vocabulary for
 * programmes whose catalogue units are modules rather than weeks. These tests
 * pin that the addition is append-only and that the new values travel the real
 * validation, registry, XP and course-map paths. No production programme uses
 * them yet; the fixture below is synthetic and never registered.
 */

const stamp = '2026-10-02T10:00:00.000Z';
const probeCourseId = 'module-lesson-probe-catalogue';
const probeProgrammeId = 'module-lesson-probe';

const frozenUnitTypePrefix = ['week', 'special', 'final_project'];
const frozenItemTypePrefix = [
  'lecture',
  'section',
  'shorts',
  'reading',
  'problem_set',
  'lab',
  'practice',
  'project_task',
  'notes',
  'reflection',
];

const probeSeed: CourseSeed = {
  courseId: probeCourseId,
  title: 'Module and lesson probe',
  dataVersion: 1,
  sourceCheckedDate: '2026-10-02',
  units: [
    {
      id: 'probe-module-one',
      order: 0,
      title: 'Probe module one',
      type: 'module',
      sourceYear: 2026,
      required: true,
      items: [
        {
          id: 'probe-lesson-one',
          type: 'lesson',
          title: 'Probe lesson one',
          required: true,
          estimatedMinutes: 40,
          order: 0,
        },
        {
          id: 'probe-lesson-two',
          type: 'lesson',
          title: 'Probe lesson two',
          required: true,
          estimatedMinutes: 20,
          order: 1,
        },
      ],
    },
  ],
};

function buildProbeDefinition() {
  const base = buildAltDefinition();

  return validateProgrammeDefinition({
    ...base,
    definitionKey: probeCourseId,
    catalogueId: probeCourseId,
    programmeId: probeProgrammeId,
    title: probeSeed.title,
    catalogue: probeSeed,
    policy: {
      ...base.policy,
      catalogueRules: { requiredUnitTypes: ['module'] },
      xp: {
        completionAwards: [{ itemType: 'lesson', xp: 10 }],
        statusMilestones: [],
        unitCompletionBonuses: [{ unitType: 'module', xp: 50 }],
        itemMilestones: [],
      },
    },
    content: {
      ...base.content,
      terminology: {
        ...base.content.terminology,
        unitMapOrdinals: { 'probe-module-one': 'M1' },
      },
    },
  });
}

function unitRow(unit: CourseSeed['units'][number]): CourseUnit {
  const { items: _items, ...fields } = unit;
  void _items;
  return {
    ...fields,
    id: unit.id,
    courseId: probeCourseId,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function itemRows(unit: CourseSeed['units'][number]): CourseItem[] {
  return unit.items.map((item) => ({
    ...item,
    unitId: unit.id,
    createdAt: stamp,
    updatedAt: stamp,
  }));
}

function progress(itemId: string, status: ProgressEntry['status']) {
  return {
    id: `progress-${itemId}`,
    itemId,
    status,
    confidence: 0,
    createdAt: stamp,
    updatedAt: stamp,
  } satisfies ProgressEntry;
}

describe('module and lesson vocabulary is append-only shared vocabulary', () => {
  it('keeps every earlier value in place and appends the new ones', () => {
    expect(courseUnitTypeValues.slice(0, frozenUnitTypePrefix.length)).toEqual(
      frozenUnitTypePrefix,
    );
    expect(courseItemTypeValues.slice(0, frozenItemTypePrefix.length)).toEqual(
      frozenItemTypePrefix,
    );
    expect(courseUnitTypeValues.slice(frozenUnitTypePrefix.length)).toEqual([
      'module',
    ]);
    expect(courseItemTypeValues.slice(frozenItemTypePrefix.length)).toEqual([
      'lesson',
    ]);
  });

  it('accepts the new values and still rejects anything undeclared', () => {
    expect(CourseUnitTypeSchema.parse('module')).toBe('module');
    expect(CourseItemTypeSchema.parse('lesson')).toBe('lesson');
    expect(CourseUnitTypeSchema.safeParse('chapter').success).toBe(false);
    expect(CourseItemTypeSchema.safeParse('mission').success).toBe(false);
  });

  it('accepts module and lesson rows through the persisted row schemas', () => {
    const [unit] = probeSeed.units;

    expect(CourseUnitSchema.safeParse(unitRow(unit)).success).toBe(true);
    for (const item of itemRows(unit)) {
      expect(CourseItemSchema.safeParse(item).success).toBe(true);
    }
  });
});

describe('a module and lesson programme passes the real contracts', () => {
  it('validates as a definition, including a required module unit rule', () => {
    expect(() => buildProbeDefinition()).not.toThrow();
  });

  it('fails the required-module rule when the catalogue has no module', () => {
    const definition = buildProbeDefinition();

    expect(() =>
      validateProgrammeDefinition({
        ...definition,
        catalogue: {
          ...probeSeed,
          units: probeSeed.units.map((unit) => ({ ...unit, type: 'special' })),
        },
      }),
    ).toThrow(/catalogue must contain a module unit/);
  });

  it('registers beside CS50 with CS50 still the explicit default and no collisions', () => {
    const registry = createProgrammeRegistry({
      defaultProgrammeId: cs50Definition.programmeId,
      definitions: [cs50Definition, buildProbeDefinition()],
    });

    expect(registry.getDefault()).toBe(cs50Definition);
    expect(registry.getByProgrammeId(probeProgrammeId).title).toBe(
      probeSeed.title,
    );
  });

  it('derives award identities that are new vocabulary and disjoint from CS50', () => {
    const definition = buildProbeDefinition();
    const probeKeys = listPotentialXpRewardSourceKeys(
      definition.catalogue,
      definition.policy.xp,
    );
    const cs50Keys = new Set(
      listPotentialXpRewardSourceKeys(
        cs50Definition.catalogue,
        cs50Definition.policy.xp,
      ),
    );

    expect(probeKeys).toContain(
      getXpAwardSourceKey(
        completionAwardSourceType('lesson'),
        completionAwardSourceId('probe-lesson-one'),
      ),
    );
    expect(probeKeys).toContain(
      getXpAwardSourceKey(
        unitCompletionSourceType('module'),
        'probe-module-one',
      ),
    );
    expect(probeKeys.some((key) => cs50Keys.has(key))).toBe(false);
    expect([...cs50Keys].some((key) => key.includes('lesson_completed'))).toBe(
      false,
    );
  });

  it('awards lesson completion and the module bonus through the real XP engine', () => {
    const { xp } = buildProbeDefinition().policy;
    const [unit] = probeSeed.units;
    const [lessonOne, lessonTwo] = itemRows(unit);
    const unitRecord = unitRow(unit);

    const first = evaluateProgressXp({
      policy: xp,
      progressEntry: progress(lessonOne.id, 'completed'),
      item: lessonOne,
      unit: unitRecord,
      allUnitItems: [lessonOne, lessonTwo],
      allUnitProgress: [],
    });
    expect(first).toEqual([
      expect.objectContaining({
        sourceType: 'lesson_completed',
        sourceId: 'probe-lesson-one-completed',
        xp: 10,
      }),
    ]);

    const second = evaluateProgressXp({
      policy: xp,
      progressEntry: progress(lessonTwo.id, 'completed'),
      item: lessonTwo,
      unit: unitRecord,
      allUnitItems: [lessonOne, lessonTwo],
      allUnitProgress: [progress(lessonOne.id, 'completed')],
    });
    expect(second.map((award) => award.sourceType)).toEqual([
      'lesson_completed',
      'module_completed',
    ]);
    expect(second[1]).toMatchObject({
      sourceId: 'probe-module-one',
      xp: 50,
    });
  });
});

describe('course map labels name the real unit and item kinds', () => {
  it('labels a module unit and lesson items instead of calling them a week', () => {
    const [unit] = probeSeed.units;
    const view = buildCourseMap([unitRow(unit)], itemRows(unit), []);

    expect(view.units[0].typeLabel).toBe('Module');
    expect(view.units[0].items.map((item) => item.typeLabel)).toEqual([
      'Lesson',
      'Lesson',
    ]);
    expect(courseItemTypeLabels.lesson).toBe('Lesson');
  });

  it('leaves every existing label unchanged', () => {
    const cs50Unit = cs50Definition.catalogue.units.find(
      (unit) => unit.type === 'week',
    )!;
    const view = buildCourseMap(
      [{ ...unitRow(cs50Unit), courseId: cs50Definition.catalogueId }],
      itemRows(cs50Unit),
      [],
    );

    expect(view.units[0].typeLabel).toBe('Week');
    expect(courseItemTypeLabels).toMatchObject({
      lab: 'Lab',
      lecture: 'Lecture',
      notes: 'Notes',
      practice: 'Practice',
      problem_set: 'Problem set',
      project_task: 'Project task',
      reading: 'Reading',
      reflection: 'Reflection',
      section: 'Section',
      shorts: 'Shorts',
    });
  });
});
