import { describe, expect, it } from 'vitest';

import {
  composeAchievementCatalogue,
  defineAchievement,
  sharedAchievementDefinitions,
} from '@/lib/achievements';
import { upsertProgressAndAwardXp } from '@/lib/db';
import {
  courseItemTypeValues,
  getWorkflowTerminalStatus,
  parseCourseSeed,
  type CourseSeed,
  type ProgrammePolicy,
  type ProgressEntry,
  type XpPolicy,
} from '@/lib/domain';
import { evaluateProgressXp } from '@/lib/xp/engine';
import { getActiveProgrammeDefinition } from '@/programmes';
import {
  validateProgrammeDefinition,
  type ProgrammeDefinition,
} from '@/programmes/definition';

import {
  c1Timestamp,
  createIncrementingClock,
  createSeededDatabase,
  readMaterializedCatalogue,
} from '../preservation/c1Support';

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

/** Test-only policy: CS50 values without CS50 catalogue references. */
const testPolicy: ProgrammePolicy = {
  ...cs50.policy,
  catalogueRules: { requiredUnitTypes: [] },
  xp: { ...cs50.policy.xp, itemMilestones: [] },
  achievements: sharedAchievementDefinitions,
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
    policy: testPolicy,
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
          policy: {
            ...testPolicy,
            catalogueRules: cs50.policy.catalogueRules,
          },
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

describe('policy isolation: a test-only policy changes only its own awards', () => {
  const noWeekBonus: XpPolicy = {
    ...cs50.policy.xp,
    unitCompletionBonuses: [],
  };

  function complete(itemId: string): ProgressEntry {
    return {
      confidence: 0,
      createdAt: c1Timestamp,
      id: `isolation-${itemId}`,
      itemId,
      status: 'completed',
      updatedAt: c1Timestamp,
    };
  }

  it('drops only the week bonus for every required CS50 week over the real catalogue', async () => {
    const context = await createSeededDatabase('policy-isolation-engine');

    try {
      const catalogue = await readMaterializedCatalogue(context);
      const weeks = catalogue.units.filter(
        (unit) => unit.type === 'week' && unit.required,
      );
      expect(weeks).toHaveLength(11);

      for (const unit of weeks) {
        const unitItems = catalogue.items.filter(
          (item) => item.unitId === unit.id,
        );
        const required = unitItems.filter((item) => item.required);
        const last = required[required.length - 1]!;
        const evaluate = (policy: XpPolicy) =>
          evaluateProgressXp({
            policy,
            item: last,
            unit,
            progressEntry: complete(last.id),
            allUnitItems: unitItems,
            allUnitProgress: required.map((item) => complete(item.id)),
          });

        const cs50Awards = evaluate(cs50.policy.xp);
        expect(cs50Awards).toContainEqual({
          sourceType: 'week_completed',
          sourceId: unit.id,
          xp: 150,
          reason: `Completed all required items for ${unit.title}`,
        });
        expect(evaluate(noWeekBonus)).toEqual(
          cs50Awards.filter((award) => award.sourceType !== 'week_completed'),
        );
      }
    } finally {
      await context.cleanup();
    }
  });

  it('persists every CS50 award except the week bonus through the real save path', async () => {
    const run = async (label: string, policy: ProgrammePolicy) => {
      const context = await createSeededDatabase(label);
      const now = createIncrementingClock('2026-09-19T13:00:00.000Z');

      try {
        const catalogue = await readMaterializedCatalogue(context);
        const awarded: string[] = [];
        for (const item of catalogue.items.filter(
          (candidate) => candidate.unitId === 'week-0' && candidate.required,
        )) {
          const result = await upsertProgressAndAwardXp(
            {
              confidence: 3,
              itemId: item.id,
              status: item.type === 'problem_set' ? 'accepted' : 'completed',
              evidenceText: 'Synthetic submission note',
            },
            { db: context.db, now, policy },
          );
          awarded.push(...result.awardedTransactions.map((tx) => tx.id));
        }
        return awarded;
      } finally {
        await context.cleanup();
      }
    };

    const cs50Awarded = await run('policy-isolation-cs50', cs50.policy);
    const testAwarded = await run('policy-isolation-test', {
      ...cs50.policy,
      xp: noWeekBonus,
    });

    expect(cs50Awarded).toContain('xp-week_completed-week-0');
    expect(testAwarded).toEqual(
      cs50Awarded.filter((id) => id !== 'xp-week_completed-week-0'),
    );
  });
});

describe('submission workflow is programme policy', () => {
  it('keeps the CS50 lab/problem_set asymmetry (X-2)', () => {
    expect(cs50.policy.workflow).toEqual({
      sequenceItemTypes: ['lab', 'problem_set'],
      correctionItemTypes: ['problem_set'],
    });
  });

  it('derives the preview terminal status from the workflow', () => {
    const terminal = courseItemTypeValues.map((itemType) => [
      itemType,
      getWorkflowTerminalStatus(cs50.policy.workflow, itemType),
    ]);
    expect(Object.fromEntries(terminal)).toEqual({
      lecture: 'completed',
      section: 'completed',
      shorts: 'completed',
      reading: 'completed',
      problem_set: 'accepted',
      lab: 'accepted',
      practice: 'completed',
      project_task: 'completed',
      notes: 'completed',
      reflection: 'completed',
    });
  });

  it('fails closed on a correction type without a submission workflow', () => {
    expect(() =>
      validateProgrammeDefinition(
        testDefinition({
          policy: {
            ...testPolicy,
            workflow: {
              sequenceItemTypes: ['problem_set'],
              correctionItemTypes: ['lab'],
            },
          },
        }),
      ),
    ).toThrow(/Correction item type "lab" has no submission workflow/);
  });
});

describe('composed achievement catalogue (C0 contract §5)', () => {
  const sharedIds = sharedAchievementDefinitions.map(
    (definition) => definition.id,
  );
  const programmeDefinition = defineAchievement({
    id: 'test-only-badge',
    title: 'Test Only',
    description: 'A test-only programme achievement.',
    category: 'course_progress',
    ruleType: 'item_completed',
    ruleConfig: { itemId: 'module-a-reading' },
  });
  const compose = (
    programmeDefinitions: Parameters<
      typeof composeAchievementCatalogue
    >[0]['programmeDefinitions'],
    order: readonly string[],
  ) => composeAchievementCatalogue({ programmeDefinitions, order });

  it('keeps the six shared definitions shared and the CS50 catalogue at 16', () => {
    expect(sharedIds).toEqual([
      'first-step',
      'first-slice',
      'course-complete',
      'clean-stop',
      'three-deep-sessions',
      'bug-hunter',
    ]);
    expect(cs50.policy.achievements).toHaveLength(16);
    for (const shared of sharedAchievementDefinitions) {
      expect(cs50.policy.achievements).toContain(shared);
    }
  });

  it('composes a valid test-only catalogue in the given order', () => {
    const order = ['test-only-badge', ...sharedIds];
    expect(
      compose([programmeDefinition], order).map((definition) => definition.id),
    ).toEqual(order);
  });

  it.each([
    ['an omitted ID', sharedIds, /achievement order omits "test-only-badge"/],
    [
      'a duplicated ID',
      ['test-only-badge', 'test-only-badge', ...sharedIds],
      /lists "test-only-badge" more than once/,
    ],
    [
      'an unknown ID',
      ['test-only-badge', 'not-an-achievement', ...sharedIds],
      /unknown achievement "not-an-achievement"/,
    ],
    [
      'an omitted shared ID',
      ['test-only-badge', ...sharedIds.slice(1)],
      /achievement order omits "first-step"/,
    ],
  ])('rejects an order with %s', (_label, order, message) => {
    expect(() => compose([programmeDefinition], order)).toThrow(message);
  });

  it('rejects a programme achievement that collides with a shared ID', () => {
    const colliding = defineAchievement({
      id: 'first-step',
      title: 'Programme First Step',
      description: 'Collides with the shared definition.',
      category: 'course_progress',
      ruleType: 'first_item_completed',
      ruleConfig: {},
    });
    expect(() => compose([colliding], sharedIds)).toThrow(
      /programme achievement "first-step" collides with a shared achievement/,
    );
  });

  it('rejects a programme achievement defined twice', () => {
    expect(() =>
      compose(
        [programmeDefinition, programmeDefinition],
        ['test-only-badge', ...sharedIds],
      ),
    ).toThrow(/"test-only-badge" is defined more than once/);
  });

  it('rejects an unsupported rule type', () => {
    expect(() =>
      defineAchievement({
        ...programmeDefinition,
        ruleType: 'problem_set_status_count' as never,
      }),
    ).toThrow(/Unsupported rule type "problem_set_status_count"/);
  });

  it('fails closed when a definition omits or redefines a shared achievement', () => {
    const withoutBugHunter = cs50.policy.achievements.filter(
      (definition) => definition.id !== 'bug-hunter',
    );
    expect(() =>
      validateProgrammeDefinition({
        ...cs50,
        policy: { ...cs50.policy, achievements: withoutBugHunter },
      }),
    ).toThrow(/shared achievement "bug-hunter" is missing/);

    const redefined = cs50.policy.achievements.map((definition) =>
      definition.id === 'bug-hunter'
        ? { ...definition, title: 'Renamed' }
        : definition,
    );
    expect(() =>
      validateProgrammeDefinition({
        ...cs50,
        policy: { ...cs50.policy, achievements: redefined },
      }),
    ).toThrow(/shared achievement "bug-hunter" is redefined/);
  });

  it('fails closed when an achievement references a unit outside the catalogue', () => {
    const achievements = cs50.policy.achievements.map((definition) =>
      definition.id === 'scratch-initiate'
        ? { ...definition, ruleConfig: { unitId: 'week-99' } }
        : definition,
    );
    expect(() =>
      validateProgrammeDefinition({
        ...cs50,
        policy: { ...cs50.policy, achievements },
      }),
    ).toThrow(
      /achievement "scratch-initiate" unit "week-99" is not a catalogue unit/,
    );
  });
});
