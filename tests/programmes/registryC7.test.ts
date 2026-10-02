import { describe, expect, it } from 'vitest';

import {
  defineAchievement,
  sharedAchievementDefinitions,
} from '@/lib/achievements';
import {
  deriveLongFormAssetId,
  deriveLongFormSliceId,
  deriveResumePointId,
} from '@/lib/progress';
import {
  createProgrammeRegistry,
  getProgrammeRegistry,
  listRegisteredDefinitionKeys,
  type ProgrammeDefinition,
} from '@/programmes';
import { validateProgrammeDefinition } from '@/programmes/definition';

import {
  altCourseId,
  altDefinition,
  altProgrammeId,
  buildAltDefinition,
  cs50Definition,
  cs50ProgrammeId,
} from './c7Fixture';

/**
 * Epic C / C7 registry contract: an immutable, validated registry that holds
 * several definitions with an explicit default, fails closed on lookup, and
 * rejects cross-definition identity collisions all-or-nothing.
 */

function create(...definitions: ProgrammeDefinition[]) {
  return createProgrammeRegistry({
    defaultProgrammeId: cs50ProgrammeId,
    definitions,
  });
}

describe('C7 fixture sanity (must hold before any production change)', () => {
  it('builds a definition that passes the real definition validation', () => {
    expect(validateProgrammeDefinition(altDefinition)).toBe(altDefinition);
    expect(altDefinition.programmeId).toBe(altProgrammeId);
    expect(altDefinition.catalogue.courseId).toBe(altCourseId);
    expect(altDefinition.content.terminology.unitNoun.capitalized).toBe(
      'Module',
    );
  });

  it('shares the six canonical achievements identically with CS50', () => {
    for (const shared of sharedAchievementDefinitions) {
      expect(cs50Definition.policy.achievements).toContain(shared);
      expect(altDefinition.policy.achievements).toContain(shared);
    }
  });

  it('is not part of the production registry', () => {
    expect(listRegisteredDefinitionKeys()).not.toContain(
      altDefinition.definitionKey,
    );
    expect(listRegisteredDefinitionKeys()).toEqual([
      'cs50x-2026',
      'programvareutvikling-2026',
    ]);
  });
});

describe('C7 registry construction', () => {
  it('accepts two valid definitions in construction order with an explicit default', () => {
    const registry = create(cs50Definition, altDefinition);

    expect(registry.definitions.map((entry) => entry.programmeId)).toEqual([
      cs50ProgrammeId,
      altProgrammeId,
    ]);
    expect(registry.getDefault()).toBe(cs50Definition);
    expect(registry.getByProgrammeId(altProgrammeId)).toBe(altDefinition);
    expect(registry.getByDefinitionKey(altCourseId)).toBe(altDefinition);
    expect(registry.getByProgrammeId(cs50ProgrammeId)).toBe(cs50Definition);
    expect(registry.getByDefinitionKey('cs50x-2026')).toBe(cs50Definition);
  });

  it('takes the default from the explicit id, never from insertion order', () => {
    const registry = create(altDefinition, cs50Definition);

    expect(registry.definitions.map((entry) => entry.programmeId)).toEqual([
      altProgrammeId,
      cs50ProgrammeId,
    ]);
    expect(registry.getDefault()).toBe(cs50Definition);
  });

  it('rejects a default programme that is not registered', () => {
    expect(() =>
      createProgrammeRegistry({
        defaultProgrammeId: 'not-registered',
        definitions: [cs50Definition, altDefinition],
      }),
    ).toThrow(/default programme "not-registered" is not registered/i);
  });

  it('rejects an empty registry', () => {
    expect(() =>
      createProgrammeRegistry({
        defaultProgrammeId: cs50ProgrammeId,
        definitions: [],
      }),
    ).toThrow(/at least one/i);
  });

  it('fails closed on lookup of an unregistered key or programme', () => {
    const registry = create(cs50Definition, altDefinition);

    expect(() => registry.getByProgrammeId('ghost')).toThrow(
      /Unregistered programme "ghost"/,
    );
    expect(() => registry.getByDefinitionKey('ghost')).toThrow(
      /Unregistered programme definition key "ghost"/,
    );
    expect(() => registry.getByProgrammeId('')).toThrow(/Unregistered/);
  });

  it('still validates every individual definition', () => {
    const invalid = {
      ...altDefinition,
      catalogueId: 'does-not-match-the-catalogue',
    };

    expect(() => create(cs50Definition, invalid)).toThrow(
      /does not match catalogue courseId/,
    );
  });

  it('is immutable: the published definition list cannot be edited into the registry', () => {
    const registry = create(cs50Definition, altDefinition);

    expect(Object.isFrozen(registry.definitions)).toBe(true);
    expect(() =>
      (registry.definitions as ProgrammeDefinition[]).push(altDefinition),
    ).toThrow();
    expect(registry.definitions).toHaveLength(2);
  });

  // Epic E (accepted-oracle change): the production registry holds CS50 and
  // Programvareutvikling, built through the same validated path.
  it('builds the production registry through the same validated path, with CS50 and Programvareutvikling', () => {
    const production = getProgrammeRegistry();

    expect(production.definitions.map((entry) => entry.programmeId)).toEqual([
      cs50ProgrammeId,
      'programvareutvikling',
    ]);
    expect(production.getDefault()).toBe(cs50Definition);
    expect(production.getByProgrammeId('cs50x')).toBe(cs50Definition);
    // Only `createProgrammeRegistry` freezes what it publishes, so this proves
    // the production registry is not a separately assembled map.
    expect(Object.isFrozen(production)).toBe(true);
    expect(Object.isFrozen(production.definitions)).toBe(true);
    expect(getProgrammeRegistry()).toBe(production);
    expect(listRegisteredDefinitionKeys()).toEqual([
      'cs50x-2026',
      'programvareutvikling-2026',
    ]);
  });

  it('publishes nothing when construction is rejected (all-or-nothing)', () => {
    expect(() =>
      create(
        cs50Definition,
        altDefinition,
        buildAltDefinition({
          definitionKey: 'c5-third-key',
          programmeId: 'c5-third-programme',
          ids: { courseId: 'c5-third-catalogue' },
        }),
        // Collides with the alternate programme's ID.
        buildAltDefinition({
          definitionKey: 'c5-fourth-key',
          ids: { courseId: 'c5-fourth-catalogue' },
        }),
      ),
    ).toThrow(/programmeId "c5-alt-programme"/);
    expect(getProgrammeRegistry().definitions).toHaveLength(2);
    expect(listRegisteredDefinitionKeys()).toEqual([
      'cs50x-2026',
      'programvareutvikling-2026',
    ]);
  });
});

describe('C7 cross-definition collision validation', () => {
  it('accepts non-colliding definitions whose only overlap is the six shared achievements', () => {
    expect(() =>
      create(
        cs50Definition,
        buildAltDefinition({
          programmeAchievements: [
            defineAchievement({
              id: 'c7-alt-unit-a-done',
              title: 'Alt Unit A done',
              description: 'Complete every required item of Alt Unit A.',
              category: 'course_progress',
              ruleType: 'unit_required_completed',
              ruleConfig: { unitId: 'c5-alt-unit-a' },
            }),
          ],
        }),
      ),
    ).not.toThrow();
  });

  it.each([
    [
      'a duplicate definitionKey',
      buildAltDefinition({
        definitionKey: 'cs50x-2026',
        ids: { courseId: 'c7-dup-key-catalogue' },
        programmeId: 'c7-dup-key-programme',
        // Distinct units and items so only the key collides.
      }),
      /definitionKey "cs50x-2026"/,
    ],
    [
      'a duplicate programmeId',
      buildAltDefinition({
        ids: { courseId: 'c7-dup-programme-catalogue' },
        definitionKey: 'c7-dup-programme-key',
        programmeId: 'cs50x',
      }),
      /programmeId "cs50x"/,
    ],
    [
      'a duplicate catalogue ID',
      buildAltDefinition({
        ids: { courseId: 'cs50x-2026' },
        definitionKey: 'c7-dup-catalogue-key',
        programmeId: 'c7-dup-catalogue-programme',
      }),
      /catalogue "cs50x-2026"/,
    ],
    [
      'a course unit ID owned by another programme',
      buildAltDefinition({
        ids: { unitAId: 'week-0' },
        definitionKey: 'c7-unit-key',
        programmeId: 'c7-unit-programme',
      }),
      /course unit "week-0"/,
    ],
    [
      'a course item ID owned by another programme',
      buildAltDefinition({
        ids: { lectureId: 'week-0-lecture' },
        definitionKey: 'c7-item-key',
        programmeId: 'c7-item-programme',
      }),
      /course item "week-0-lecture"/,
    ],
    [
      'a fixed XP source key equal to a generated CS50 completion key',
      buildAltDefinition({
        definitionKey: 'c7-xp-fixed-vs-generated-key',
        programmeId: 'c7-xp-fixed-vs-generated-programme',
        ids: { courseId: 'c7-xp-fixed-catalogue' },
        itemMilestones: [
          {
            sourceType: 'lecture_completed',
            sourceId: 'week-0-lecture-completed',
            itemIds: ['c5-alt-unit-a-lecture'],
            xp: 10,
            reason: 'Collides with the CS50 Week 0 lecture completion award',
          },
        ],
      }),
      /XP reward source key .*week-0-lecture-completed/,
    ],
    [
      'a fixed XP source key equal to a fixed CS50 milestone key',
      buildAltDefinition({
        definitionKey: 'c7-xp-fixed-vs-fixed-key',
        programmeId: 'c7-xp-fixed-vs-fixed-programme',
        ids: { courseId: 'c7-xp-fixed-fixed-catalogue' },
        itemMilestones: [
          {
            sourceType: 'final_project_build_completed',
            sourceId: 'final-project-build-completed',
            itemIds: ['c5-alt-unit-a-lecture'],
            xp: 10,
            reason: 'Collides with the CS50 final-project build milestone',
          },
        ],
      }),
      /XP reward source key .*final-project-build-completed/,
    ],
    [
      'a programme-specific achievement ID owned by another programme',
      buildAltDefinition({
        definitionKey: 'c7-achievement-key',
        programmeId: 'c7-achievement-programme',
        ids: { courseId: 'c7-achievement-catalogue' },
        programmeAchievements: [
          defineAchievement({
            id: 'scratch-initiate',
            title: 'Scratch Initiate (alt)',
            description: 'Complete every required item of Alt Unit A.',
            category: 'course_progress',
            ruleType: 'unit_required_completed',
            ruleConfig: { unitId: 'c5-alt-unit-a' },
          }),
        ],
      }),
      /achievement "scratch-initiate"/,
    ],
  ])('rejects %s', (_label, conflicting, message) => {
    expect(() => create(cs50Definition, conflicting)).toThrow(message);
    // Order of registration does not matter.
    expect(() => create(conflicting, cs50Definition)).toThrow(message);
  });

  it('reports a fixed key in the first definition against a generated key in the second', () => {
    const fixedFirst = buildAltDefinition({
      definitionKey: 'c7-fixed-first-key',
      programmeId: 'c7-fixed-first-programme',
      ids: { courseId: 'c7-fixed-first-catalogue' },
      itemMilestones: [
        {
          sourceType: 'lecture_completed',
          sourceId: 'week-1-lecture-completed',
          itemIds: ['c5-alt-unit-a-lecture'],
          xp: 5,
          reason: 'Collides with CS50 Week 1 lecture completion',
        },
      ],
    });

    expect(() =>
      createProgrammeRegistry({
        defaultProgrammeId: 'c7-fixed-first-programme',
        definitions: [fixedFirst, cs50Definition],
      }),
    ).toThrow(/XP reward source key .*week-1-lecture-completed/);
  });

  it('rejects a duplicate that is an XP-key collision only, not an ID collision', () => {
    // The alternate programme reuses no CS50 ID here, so the XP-key domain is
    // the only thing that can reject it.
    const fixed = buildAltDefinition({
      definitionKey: 'c7-only-xp-key',
      programmeId: 'c7-only-xp-programme',
      ids: { courseId: 'c7-only-xp-catalogue' },
      itemMilestones: [
        {
          sourceType: 'section_completed',
          sourceId: 'week-2-section-completed',
          itemIds: ['c5-alt-unit-a-lecture'],
          xp: 5,
          reason: 'Collides with CS50 Week 2 section completion',
        },
      ],
    });

    expect(() => create(cs50Definition, fixed)).toThrow(/XP reward source key/);
  });
});

describe('C7 derived long-form identity domains', () => {
  it('derives asset, slice and resume IDs as pure functions of the item ID', () => {
    // Registry validation rejects item-ID collisions across programmes; the
    // derived long-form IDs are deterministic functions of the item ID, so a
    // globally unique item ID makes them globally unique too.
    expect(deriveLongFormAssetId('week-0-lecture')).toBe(
      deriveLongFormAssetId('week-0-lecture'),
    );
    expect(deriveLongFormAssetId('week-0-lecture')).not.toBe(
      deriveLongFormAssetId('c5-alt-unit-a-lecture'),
    );
    const assetId = deriveLongFormAssetId('c5-alt-unit-a-lecture');
    expect(deriveLongFormSliceId(assetId, 0)).not.toBe(
      deriveLongFormSliceId(deriveLongFormAssetId('week-0-lecture'), 0),
    );
    expect(
      deriveResumePointId(deriveLongFormAssetId('week-0-lecture')),
    ).not.toBe(deriveResumePointId(assetId));
  });
});
