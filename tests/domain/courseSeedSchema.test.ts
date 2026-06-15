import { describe, expect, it } from 'vitest';

import {
  CourseSeedSchema,
  parseCourseSeed,
  type CourseSeed,
} from '@/lib/domain';
import { SchemaValidationError } from '@/lib/validation';

const validCourseSeed: CourseSeed = {
  courseId: 'cs50x-2026',
  title: 'CS50x 2026',
  dataVersion: 1,
  sourceCheckedDate: '2026-06-11',
  units: [
    {
      id: 'week-0',
      order: 0,
      title: 'Scratch',
      type: 'week',
      sourceYear: 2026,
      required: true,
      items: [
        {
          id: 'week-0-lecture',
          type: 'lecture',
          title: 'Lecture',
          required: true,
          estimatedMinutes: 120,
          order: 0,
        },
        {
          id: 'pset-0',
          type: 'problem_set',
          title: 'Problem Set 0',
          required: true,
          estimatedMinutes: 180,
          order: 1,
        },
      ],
    },
    {
      id: 'final-project',
      order: 11,
      title: 'Final Project',
      type: 'final_project',
      sourceYear: 2026,
      required: true,
      items: [
        {
          id: 'final-project-plan',
          type: 'project_task',
          title: 'Plan',
          required: true,
          estimatedMinutes: 90,
          order: 0,
        },
      ],
    },
  ],
};

describe('CourseSeedSchema', () => {
  it('accepts a valid CS50 course seed payload', () => {
    expect(CourseSeedSchema.parse(validCourseSeed)).toEqual(validCourseSeed);
    expect(parseCourseSeed(validCourseSeed)).toEqual(validCourseSeed);
  });

  it('rejects duplicate unit and item identifiers with readable issues', () => {
    const duplicateIdSeed: unknown = {
      ...validCourseSeed,
      units: [
        validCourseSeed.units[0],
        {
          ...validCourseSeed.units[1],
          id: validCourseSeed.units[0].id,
          items: [
            {
              ...validCourseSeed.units[1].items[0],
              id: validCourseSeed.units[0].items[0].id,
            },
          ],
        },
      ],
    };

    try {
      parseCourseSeed(duplicateIdSeed);
      expect.unreachable('Expected parseCourseSeed to reject duplicate IDs.');
    } catch (error) {
      expect(error).toBeInstanceOf(SchemaValidationError);

      if (error instanceof SchemaValidationError) {
        expect(error.issues).toEqual(
          expect.arrayContaining([
            'units: Duplicate unit id "week-0" is not allowed.',
            'units: Duplicate course item id "week-0-lecture" is not allowed.',
          ]),
        );
      }
    }
  });

  it('rejects seeds that omit the final project unit or make every item optional', () => {
    const invalidSeed: unknown = {
      ...validCourseSeed,
      units: [
        {
          ...validCourseSeed.units[0],
          items: validCourseSeed.units[0].items.map((item) => ({
            ...item,
            required: false,
          })),
        },
      ],
    };

    const result = CourseSeedSchema.safeParse(invalidSeed);

    expect(result.success).toBe(false);

    if (!result.success) {
      const messages = result.error.issues.map((issue) => issue.message);

      expect(messages).toEqual(
        expect.arrayContaining([
          'Course seed must contain a final_project unit.',
          'Course seed must contain at least one required item.',
        ]),
      );
    }
  });

  it('rejects invalid item types in bundled seed candidates', () => {
    const invalidTypeSeed: unknown = {
      ...validCourseSeed,
      units: [
        {
          ...validCourseSeed.units[0],
          items: [
            {
              ...validCourseSeed.units[0].items[0],
              type: 'quiz',
            },
            validCourseSeed.units[0].items[1],
          ],
        },
        validCourseSeed.units[1],
      ],
    };

    const result = CourseSeedSchema.safeParse(invalidTypeSeed);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path.join('.') === 'units.0.items.0.type',
        ),
      ).toBe(true);
    }
  });

  it('rejects seeds that omit fields required by the database layer', () => {
    const invalidSeed: unknown = {
      ...validCourseSeed,
      units: [
        {
          ...validCourseSeed.units[0],
          sourceYear: undefined,
          items: [
            {
              ...validCourseSeed.units[0].items[0],
              estimatedMinutes: undefined,
            },
            validCourseSeed.units[0].items[1],
          ],
        },
        validCourseSeed.units[1],
      ],
    };

    const result = CourseSeedSchema.safeParse(invalidSeed);

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.path.join('.') === 'units.0.sourceYear',
        ),
      ).toBe(true);
      expect(
        result.error.issues.some(
          (issue) =>
            issue.path.join('.') === 'units.0.items.0.estimatedMinutes',
        ),
      ).toBe(true);
    }
  });
});
