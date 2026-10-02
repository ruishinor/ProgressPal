import {
  composeAchievementCatalogue,
  sharedAchievementDefinitions,
} from '@/lib/achievements';
import type { DatabaseMigrationContext } from '@/lib/db';
import {
  completionAwardSourceType,
  statusMilestoneSourceType,
  unitCompletionSourceType,
  type AchievementDefinition,
  type CourseSeed,
  type ProgrammeScope,
  type XpPolicy,
} from '@/lib/domain';
import type { ProgrammeDefinition } from '@/programmes';
import { cs50x2026Definition } from '@/programmes/cs50x-2026';
import { validateProgrammeDefinition } from '@/programmes/definition';

/**
 * Epic C / C7 test-only second programme, shared by the registry, repository,
 * provider and Settings tests. It is the C5 alternate catalogue (distinct
 * catalogue, unit and item IDs) extracted from `catalogueScope.test.tsx` and
 * given a programme-owned policy and terminology that visibly differ from
 * CS50, so a page that renders B's catalogue with A's policy or wording is
 * detectable. It is never registered in the production registry.
 */

export const cs50Definition: ProgrammeDefinition = cs50x2026Definition;
export const cs50ProgrammeId = cs50Definition.programmeId;
export const cs50CourseId = cs50Definition.catalogue.courseId;

export const altCourseId = 'c5-alt-catalogue';
export const altProgrammeId = 'c5-alt-programme';
export const altLectureXp = 25;

export type AltSeedIds = {
  courseId: string;
  lectureId: string;
  problemSetId: string;
  readingId: string;
  unitAId: string;
  unitBId: string;
};

export const defaultAltSeedIds: AltSeedIds = {
  courseId: altCourseId,
  lectureId: 'c5-alt-unit-a-lecture',
  problemSetId: 'c5-alt-unit-a-problem-set',
  readingId: 'c5-alt-unit-b-reading',
  unitAId: 'c5-alt-unit-a',
  unitBId: 'c5-alt-unit-b',
};

export function buildAltSeed(overrides: Partial<AltSeedIds> = {}): CourseSeed {
  const ids = { ...defaultAltSeedIds, ...overrides };

  return {
    courseId: ids.courseId,
    title: 'C5 alternate catalogue',
    dataVersion: 1,
    sourceCheckedDate: '2026-09-28',
    units: [
      {
        id: ids.unitAId,
        order: 0,
        title: 'Alt Unit A',
        type: 'week',
        sourceYear: 2026,
        required: true,
        items: [
          {
            id: ids.lectureId,
            type: 'lecture',
            title: 'Alt lecture',
            required: true,
            estimatedMinutes: 60,
            order: 0,
          },
          {
            id: ids.problemSetId,
            type: 'problem_set',
            title: 'Alt problem set',
            required: true,
            estimatedMinutes: 90,
            order: 1,
          },
        ],
      },
      {
        id: ids.unitBId,
        order: 1,
        title: 'Alt Unit B',
        type: 'special',
        sourceYear: 2026,
        required: false,
        items: [
          {
            id: ids.readingId,
            type: 'reading',
            title: 'Alt reading',
            required: false,
            estimatedMinutes: 30,
            order: 0,
          },
        ],
      },
    ],
  };
}

export type AltDefinitionOptions = {
  definitionKey?: string;
  ids?: Partial<AltSeedIds>;
  itemMilestones?: XpPolicy['itemMilestones'];
  programmeAchievements?: readonly AchievementDefinition[];
  programmeId?: string;
};

/** Builds a definition that passes the real definition validation. */
export function buildAltDefinition(
  options: AltDefinitionOptions = {},
): ProgrammeDefinition {
  const seed = buildAltSeed(options.ids);
  const itemMilestones = options.itemMilestones ?? [];
  // An XP policy may not repeat a sourceType, so a fixed milestone that mimics
  // another programme's generated key displaces this policy's own generated
  // award of that type.
  const fixedSourceTypes = new Set(
    itemMilestones.map((milestone) => milestone.sourceType),
  );
  const programmeAchievements = options.programmeAchievements ?? [];
  const achievements = composeAchievementCatalogue({
    programmeDefinitions: programmeAchievements,
    order: [
      ...sharedAchievementDefinitions.map((definition) => definition.id),
      ...programmeAchievements.map((definition) => definition.id),
    ],
  });

  return validateProgrammeDefinition({
    definitionKey: options.definitionKey ?? seed.courseId,
    catalogueId: seed.courseId,
    programmeId: options.programmeId ?? altProgrammeId,
    title: seed.title,
    catalogue: seed,
    policy: {
      ...cs50Definition.policy,
      catalogueRules: { requiredUnitTypes: [] },
      xp: {
        ...cs50Definition.policy.xp,
        completionAwards: cs50Definition.policy.xp.completionAwards
          .filter(
            (award) =>
              !fixedSourceTypes.has(completionAwardSourceType(award.itemType)),
          )
          .map((award) =>
            award.itemType === 'lecture'
              ? { ...award, xp: altLectureXp }
              : award,
          ),
        statusMilestones: cs50Definition.policy.xp.statusMilestones.filter(
          (milestone) =>
            !fixedSourceTypes.has(
              statusMilestoneSourceType(
                milestone.itemType,
                milestone.milestone,
              ),
            ),
        ),
        unitCompletionBonuses:
          cs50Definition.policy.xp.unitCompletionBonuses.filter(
            (bonus) =>
              !fixedSourceTypes.has(unitCompletionSourceType(bonus.unitType)),
          ),
        itemMilestones,
      },
      achievements,
    },
    content: {
      externalResources: {
        allowedUrlPrefixes: ['https://example.test/'],
        unitLinks: {},
        itemLinks: {},
      },
      studyGuides: { unitGuides: {}, itemGuides: {} },
      terminology: {
        ...cs50Definition.content.terminology,
        unitNoun: { lowercase: 'module', capitalized: 'Module' },
        rpgIdentity: {
          guildLabel: 'Alt Guild',
          classLabel: 'Alt Class',
          pathLabel: 'Alt Path',
        },
        unitMapOrdinals: Object.fromEntries(
          seed.units.map((unit, index) => [unit.id, `A${index}`]),
        ),
        copy: {
          ...cs50Definition.content.terminology.copy,
          courseMapEyebrow: 'Alt course map',
          dashboardDescription: 'Alt programme progress on this device.',
        },
      },
    },
  });
}

export const altSeed: CourseSeed = buildAltSeed();
export const altUnitIds = altSeed.units.map((unit) => unit.id);
export const altItemIds = altSeed.units.flatMap((unit) =>
  unit.items.map((item) => item.id),
);

/** Test-only definition over the alternate catalogue; never registered. */
export const altDefinition: ProgrammeDefinition = buildAltDefinition();

/** Test-only migration context over the alt definition alone; never registered. */
export const altMigrationContext: DatabaseMigrationContext = {
  programmeId: altProgrammeId,
  authorizedCatalogues: [
    { courseId: altSeed.courseId, programmeId: altProgrammeId },
  ],
};

/**
 * Test-only context authorizing both catalogues at once, in the registry
 * order CS50 then alternate; the default/bootstrap programme stays CS50.
 * Pinned to exactly these two (not derived from the default test context,
 * which since Epic E also authorizes Programvareutvikling).
 */
export const bothCataloguesMigrationContext: DatabaseMigrationContext = {
  programmeId: cs50ProgrammeId,
  authorizedCatalogues: [
    { courseId: cs50CourseId, programmeId: cs50ProgrammeId },
    ...altMigrationContext.authorizedCatalogues,
  ],
};

export function scopeOf(definition: ProgrammeDefinition): ProgrammeScope {
  return {
    catalogue: definition.catalogue,
    catalogueId: definition.catalogueId,
    content: definition.content,
    policy: definition.policy,
    programmeId: definition.programmeId,
    title: definition.title,
  };
}

export const cs50FixtureScope = scopeOf(cs50Definition);
export const altFixtureScope = scopeOf(altDefinition);

export const fixtureScopesByProgrammeId: Readonly<
  Record<string, ProgrammeScope>
> = {
  [cs50ProgrammeId]: cs50FixtureScope,
  [altProgrammeId]: altFixtureScope,
};
