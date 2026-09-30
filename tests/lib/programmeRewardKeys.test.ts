import { describe, expect, it } from 'vitest';

import {
  getXpAwardSourceKey,
  listPotentialXpRewardSourceKeys,
  progressStatusValues,
  type CourseItem,
  type CourseSeed,
  type CourseUnit,
  type ProgressEntry,
  type XpPolicy,
} from '@/lib/domain';
import { evaluateProgressXp } from '@/lib/xp/engine';

import { altDefinition, cs50Definition } from '../programmes/c7Fixture';

/**
 * Epic C / C7: the complete potential XP reward identity set of a definition
 * comes from one pure derivation next to the neutral XP vocabulary, and that
 * derivation is proven identical to the identities the production XP engine
 * actually generates (award dedupe identity is `(sourceType, sourceId)`).
 */

const timestamp = '2026-09-30T00:00:00.000Z';

function unitsOf(seed: CourseSeed): CourseUnit[] {
  return seed.units.map((unit) => ({
    id: unit.id,
    createdAt: timestamp,
    updatedAt: timestamp,
    courseId: seed.courseId,
    title: unit.title,
    order: unit.order,
    type: unit.type,
    sourceYear: unit.sourceYear,
    required: unit.required,
  }));
}

function itemsOf(seed: CourseSeed): CourseItem[] {
  return seed.units.flatMap((unit) =>
    unit.items.map((item) => ({
      id: item.id,
      createdAt: timestamp,
      updatedAt: timestamp,
      unitId: unit.id,
      type: item.type,
      title: item.title,
      required: item.required,
      estimatedMinutes: item.estimatedMinutes,
      order: item.order,
    })),
  );
}

function progressOf(itemId: string, status: ProgressEntry['status']) {
  return {
    id: `progress-${itemId}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    itemId,
    status,
    confidence: 3,
  } satisfies ProgressEntry;
}

/**
 * Every identity the real engine can emit for a catalogue: each item at each
 * status while every other item is already complete (so unit bonuses and
 * shared milestones can fire).
 */
function engineGeneratedKeys(seed: CourseSeed, xp: XpPolicy) {
  const units = unitsOf(seed);
  const items = itemsOf(seed);
  const generated = new Set<string>();

  for (const item of items) {
    const unit = units.find((candidate) => candidate.id === item.unitId)!;
    const others = items
      .filter((candidate) => candidate.id !== item.id)
      .map((candidate) => progressOf(candidate.id, 'completed'));

    for (const status of progressStatusValues) {
      const awards = evaluateProgressXp({
        policy: xp,
        progressEntry: progressOf(item.id, status),
        item,
        unit,
        allUnitItems: items.filter((candidate) => candidate.unitId === unit.id),
        allUnitProgress: others.filter((entry) =>
          items.some(
            (candidate) =>
              candidate.id === entry.itemId && candidate.unitId === unit.id,
          ),
        ),
        milestoneProgress: others,
      });

      for (const award of awards) {
        generated.add(getXpAwardSourceKey(award.sourceType, award.sourceId));
      }
    }
  }

  return generated;
}

describe('potential XP reward source keys', () => {
  it('derives completion, status-milestone, required-unit-bonus and fixed-milestone identities', () => {
    const seed: CourseSeed = {
      courseId: 'rk-course',
      title: 'Reward key fixture',
      dataVersion: 1,
      sourceCheckedDate: '2026-09-30',
      units: [
        {
          id: 'rk-week',
          order: 0,
          title: 'RK week',
          type: 'week',
          sourceYear: 2026,
          required: true,
          items: [
            {
              id: 'rk-lecture',
              type: 'lecture',
              title: 'Lecture',
              required: true,
              estimatedMinutes: 10,
              order: 0,
            },
            {
              id: 'rk-pset',
              type: 'problem_set',
              title: 'Problem set',
              required: true,
              estimatedMinutes: 10,
              order: 1,
            },
          ],
        },
      ],
    };
    const xp: XpPolicy = {
      completionAwards: [{ itemType: 'lecture', xp: 10 }],
      statusMilestones: [
        {
          itemType: 'problem_set',
          milestone: 'submitted',
          statuses: ['submitted'],
          xp: 5,
          reasonLabel: 'Submitted',
        },
      ],
      unitCompletionBonuses: [{ unitType: 'week', xp: 20 }],
      itemMilestones: [
        {
          sourceType: 'rk_fixed',
          sourceId: 'rk-fixed-source',
          itemIds: ['rk-lecture'],
          xp: 7,
          reason: 'Fixed',
        },
      ],
    };

    expect([...listPotentialXpRewardSourceKeys(seed, xp)].sort()).toEqual(
      [
        JSON.stringify(['lecture_completed', 'rk-lecture-completed']),
        JSON.stringify(['problem_set_submitted', 'rk-pset-submitted']),
        JSON.stringify(['week_completed', 'rk-week']),
        JSON.stringify(['rk_fixed', 'rk-fixed-source']),
      ].sort(),
    );
  });

  it('uses the key format the XP ledger dedupes on', () => {
    expect(
      getXpAwardSourceKey('lecture_completed', 'week-0-lecture-completed'),
    ).toBe(JSON.stringify(['lecture_completed', 'week-0-lecture-completed']));
  });

  it.each([
    ['CS50', cs50Definition],
    ['the test-only alternate programme', altDefinition],
  ])(
    'equals the identities the production XP engine generates for %s',
    (_label, definition) => {
      const derived = new Set(
        listPotentialXpRewardSourceKeys(
          definition.catalogue,
          definition.policy.xp,
        ),
      );
      const generated = engineGeneratedKeys(
        definition.catalogue,
        definition.policy.xp,
      );

      expect(generated.size).toBeGreaterThan(0);
      expect([...derived].sort()).toEqual([...generated].sort());
    },
  );
});
