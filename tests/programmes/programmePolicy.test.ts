import { describe, expect, it } from 'vitest';

import { parseCourseSeed, type CourseSeed } from '@/lib/domain';
import { getActiveProgrammeDefinition } from '@/programmes';
import {
  validateProgrammeDefinition,
  type ProgrammeDefinition,
} from '@/programmes/definition';

/**
 * Epic C / C3 evidence: CS50 catalogue, reward, workflow and achievement
 * policy is programme configuration, not shared-engine code.
 */

const cs50 = getActiveProgrammeDefinition();

const seedWithoutFinalProject: CourseSeed = {
  courseId: 'test-programme-2026',
  title: 'Test programme',
  dataVersion: 1,
  sourceCheckedDate: '2026-06-11',
  units: [
    {
      id: 'module-a',
      order: 0,
      title: 'Module A',
      type: 'week',
      sourceYear: 2026,
      required: true,
      items: [
        {
          id: 'module-a-reading',
          type: 'reading',
          title: 'Reading',
          required: true,
          estimatedMinutes: 30,
          order: 0,
        },
      ],
    },
  ],
};

/** A test-only definition; it is never registered. */
function testDefinition(
  overrides: Partial<ProgrammeDefinition> = {},
): ProgrammeDefinition {
  return {
    definitionKey: seedWithoutFinalProject.courseId,
    catalogueId: seedWithoutFinalProject.courseId,
    title: seedWithoutFinalProject.title,
    catalogue: seedWithoutFinalProject,
    policy: { ...cs50.policy, catalogueRules: { requiredUnitTypes: [] } },
    content: {
      externalResources: {
        allowedUrlPrefixes: ['https://example.test/'],
        unitLinks: {},
        itemLinks: {},
      },
      studyGuides: { unitGuides: {}, itemGuides: {} },
    },
    ...overrides,
  };
}

describe('P1: the final_project requirement is programme policy', () => {
  it('lets the generic seed parser accept a catalogue without a final_project unit', () => {
    expect(parseCourseSeed(seedWithoutFinalProject)).toEqual(
      seedWithoutFinalProject,
    );
  });

  it('accepts a test-only definition whose policy does not require final_project', () => {
    const definition = testDefinition();
    expect(validateProgrammeDefinition(definition)).toBe(definition);
  });

  it('still requires a final_project unit for CS50', () => {
    expect(cs50.policy.catalogueRules.requiredUnitTypes).toEqual([
      'final_project',
    ]);
    expect(() =>
      validateProgrammeDefinition(
        testDefinition({
          policy: { ...cs50.policy },
        }),
      ),
    ).toThrow(/catalogue must contain a final_project unit/);
    expect(() =>
      validateProgrammeDefinition({
        ...cs50,
        catalogue: {
          ...cs50.catalogue,
          units: cs50.catalogue.units.filter(
            (unit) => unit.type !== 'final_project',
          ),
        },
      }),
    ).toThrow(/catalogue must contain a final_project unit/);
  });
});
