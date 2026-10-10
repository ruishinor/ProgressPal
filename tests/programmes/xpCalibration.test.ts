import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import type { LessonXpPolicy, LevelCurve } from '@/lib/domain';
import { lessonEffortTier, solvedTaskXp } from '@/lib/rewards';
import { calculateXpSummary } from '@/lib/xp/engine';
import { programvareutviklingDefinition } from '@/programmes/programvareutvikling';

import { p2Index } from './p2Content';
import {
  learnerOrder,
  simulate,
  solvedXpDistribution,
  tasksPerLevel,
  type LearnerPattern,
  type SimulationResult,
} from './xpSimulation';

/**
 * Programme #2 XP and level calibration (owner work order 2026-10-10,
 * checkpoint B). The simulation walks the real M01/M02 content with the real
 * award planner; this file pins the calibration targets the owner set as
 * starting hypotheses and keeps the old and new policies side by side.
 *
 * Reproduce the full report:
 *   LF_XP_SIMULATION_OUT=<folder> npx vitest run tests/programmes/xpCalibration.test.ts
 */

const policy = programvareutviklingDefinition.policy;
const lessonXp = policy.lessonXp!;
const curve = policy.levelCurve!;

/** The Programme #2 policy before this calibration (bc2bc9a), for comparison. */
const previous: { lessonXp: LessonXpPolicy; curve?: LevelCurve } = {
  lessonXp: {
    ...lessonXp,
    solved: {
      formative: 5,
      practical: 8,
      retrieval: 6,
      checkpoint: 8,
      optional: 2,
    },
    authoredMilestone: 10,
    independentRecall: 4,
    lessonCompleted: 15,
    checkpointCleared: 60,
    moduleCompleted: 30,
    effort: undefined,
  },
};

const patterns: readonly LearnerPattern[] = [
  'independent',
  'normal',
  'hint-heavy',
];

let order: Awaited<ReturnType<typeof learnerOrder>>;
const runs = new Map<string, SimulationResult>();

beforeAll(async () => {
  order = await learnerOrder(p2Index);

  for (const pattern of patterns) {
    runs.set(
      `new|${pattern}`,
      simulate({ index: p2Index, order, policy: lessonXp, curve, pattern }),
    );
    runs.set(
      `old|${pattern}`,
      simulate({
        index: p2Index,
        order,
        policy: previous.lessonXp,
        pattern,
      }),
    );
  }
}, 60_000);

describe('the effort rubric is explicit and bound to real content', () => {
  it('names only real tasks and response modes the content uses', () => {
    const effort = lessonXp.effort!;
    const modes = new Set(p2Index.exercises.map((entry) => entry.responseMode));

    for (const subjectId of effort.complex.subjectIds) {
      expect(
        p2Index.exercises.some((entry) => entry.subjectId === subjectId),
      ).toBe(true);
    }
    for (const mode of [
      ...effort.introductory.responseModes,
      ...effort.complex.responseModes,
    ]) {
      expect(modes.has(mode)).toBe(true);
    }
  });

  it('places Task 6 well above a choice question and keeps optional work below required work', () => {
    const meta = (exerciseId: string) =>
      p2Index.exercises.find((entry) => entry.exerciseId === exerciseId)!;
    const task6 = meta('S1-M01-P05-E06');
    const choice = meta('S1-M01-P01-E03');

    expect(lessonEffortTier(lessonXp, task6)).toBe('complex');
    expect(lessonEffortTier(lessonXp, choice)).toBe('introductory');
    expect(solvedTaskXp(lessonXp, task6)).toBe(9);
    expect(solvedTaskXp(lessonXp, choice)).toBe(4);

    for (const entry of p2Index.exercises.filter((item) => item.optional)) {
      const required = {
        ...entry,
        optional: false,
        role: 'formative' as const,
      };

      expect(solvedTaskXp(lessonXp, entry)).toBeLessThan(
        solvedTaskXp(lessonXp, required),
      );
    }
  });

  it('spreads solved XP over the three tiers instead of one flat value', () => {
    const required = order.filter((task) => !task.meta.optional);

    expect(solvedXpDistribution(previous.lessonXp, required)).toEqual({
      '5 XP': 183,
      '6 XP': 14,
      '8 XP': 67,
    });
    expect(solvedXpDistribution(lessonXp, required)).toEqual({
      '4 XP': 60,
      '5 XP': 75,
      '6 XP': 9,
      '7 XP': 10,
      '8 XP': 35,
      '9 XP': 49,
      '10 XP': 4,
      '12 XP': 22,
    });
  });
});

describe('the level curve', () => {
  it('needs 40 XP for level 2 and 15 more for each next level, exactly at the threshold', () => {
    expect(calculateXpSummary(39, curve)).toMatchObject({
      level: 1,
      xpToNextLevel: 1,
      nextLevelXp: 40,
    });
    expect(calculateXpSummary(40, curve)).toMatchObject({
      level: 2,
      currentLevelFloorXp: 40,
      nextLevelXp: 95,
    });
    expect(calculateXpSummary(95, curve).level).toBe(3);
    expect(calculateXpSummary(165, curve).level).toBe(4);
  });

  it('grows every level requirement monotonically', () => {
    let previousNeed = 0;

    for (let level = 1; level < 60; level += 1) {
      const summary = calculateXpSummary(thresholdOf(level, curve), curve);
      const need = summary.nextLevelXp - summary.currentLevelFloorXp;

      expect(summary.level).toBe(level);
      expect(need).toBeGreaterThan(previousNeed);
      previousNeed = need;
    }
  });

  it('is the shared curve exactly when given 100 and 200, so CS50x is unchanged', () => {
    const shared = { firstLevelXp: 100, levelStepXp: 200 };

    for (let totalXp = 0; totalXp <= 50_000; totalXp += 1) {
      expect(calculateXpSummary(totalXp, shared)).toEqual(
        calculateXpSummary(totalXp),
      );
    }
  });
});

describe('simulated progression through M01 and M02', () => {
  it('reaches level 2 after about five solved tasks, then 7-10 and 10-13 more', () => {
    for (const pattern of patterns) {
      const perLevel = tasksPerLevel(runs.get(`new|${pattern}`)!);

      expect(perLevel[0]).toBeGreaterThanOrEqual(4);
      expect(perLevel[0]).toBeLessThanOrEqual(6);
      expect(perLevel[1]).toBeGreaterThanOrEqual(7);
      expect(perLevel[1]).toBeLessThanOrEqual(10);
      expect(perLevel[2]).toBeGreaterThanOrEqual(10);
      expect(perLevel[2]).toBeLessThanOrEqual(13);
    }
  });

  it('keeps later levels attainable, without a level that takes most of a module', () => {
    for (const pattern of patterns) {
      const perLevel = tasksPerLevel(runs.get(`new|${pattern}`)!);

      expect(Math.max(...perLevel)).toBeLessThanOrEqual(40);
    }
    // The previous policy reached only level 5 in M01 and M02 together.
    expect(runs.get('old|normal')!.finalLevel).toBe(5);
    expect(runs.get('new|normal')!.finalLevel).toBeGreaterThanOrEqual(12);
  });

  it('rewards independent work more than hint-heavy work, but never takes XP away', () => {
    const independent = runs.get('new|independent')!;
    const normal = runs.get('new|normal')!;
    const hintHeavy = runs.get('new|hint-heavy')!;

    expect(independent.totalXp).toBeGreaterThanOrEqual(normal.totalXp);
    expect(normal.totalXp).toBeGreaterThan(hintHeavy.totalXp);
    // Hints cost only the bonuses for independent work; every solved task
    // and every completed lesson still counts.
    expect(hintHeavy.xpBySource.exercise_solved).toBe(
      independent.xpBySource.exercise_solved,
    );
    expect(hintHeavy.xpBySource.lesson_completed).toBe(
      independent.xpBySource.lesson_completed,
    );
    expect(hintHeavy.xpBySource.checkpoint_cleared).toBeUndefined();
  });

  it('keeps lesson, checkpoint and module bonuses below a third of all XP', () => {
    const normal = runs.get('new|normal')!;
    const bonuses =
      (normal.xpBySource.lesson_completed ?? 0) +
      (normal.xpBySource.checkpoint_cleared ?? 0) +
      (normal.xpBySource.module_completed ?? 0);

    expect(bonuses / normal.totalXp).toBeLessThan(1 / 3);
  });

  it('writes the full comparison when asked', () => {
    const out = process.env.LF_XP_SIMULATION_OUT;

    if (out === undefined) {
      return;
    }

    writeFileSync(join(out, 'xp-simulation.md'), report());
    writeFileSync(
      join(out, 'xp-simulation.json'),
      JSON.stringify(
        Object.fromEntries(
          [...runs.entries()].map(([key, run]) => [
            key,
            {
              totalXp: run.totalXp,
              finalLevel: run.finalLevel,
              xpBySource: run.xpBySource,
              levelReachedAt: Object.fromEntries(run.levelReachedAt),
              missionEnds: run.missionEnds,
              tasks: run.tasks,
            },
          ]),
        ),
        null,
        2,
      ),
    );
  });
});

function thresholdOf(level: number, levelCurve: LevelCurve) {
  let total = 0;

  for (let reached = 1; reached < level; reached += 1) {
    total += levelCurve.firstLevelXp + (reached - 1) * levelCurve.levelStepXp;
  }

  return total;
}

function report(): string {
  const lines: string[] = [
    '# Programme #2 XP and level simulation (M01 + M02)',
    '',
    `Generated by tests/programmes/xpCalibration.test.ts from content version ${p2Index.contentVersion}.`,
    `Evaluable tasks in learner order: ${order.length} (required ${order.filter((task) => !task.meta.optional).length}; optional tasks are not simulated).`,
    '',
    'Old: bc2bc9a values (flat per family; shared curve 100, +200).',
    `New: effort rubric ${JSON.stringify(lessonXp.effort)}; curve ${JSON.stringify(curve)}.`,
    '',
  ];

  for (const pattern of patterns) {
    const old = runs.get(`old|${pattern}`)!;
    const next = runs.get(`new|${pattern}`)!;

    lines.push(`## ${pattern}`, '');
    lines.push(
      `Old: ${old.totalXp} XP, level ${old.finalLevel}. Solved tasks per level: ${tasksPerLevel(old).join(', ')}.`,
    );
    lines.push(
      `New: ${next.totalXp} XP, level ${next.finalLevel}. Solved tasks per level: ${tasksPerLevel(next).join(', ')}.`,
    );
    lines.push(`Old XP by source: ${JSON.stringify(old.xpBySource)}`);
    lines.push(`New XP by source: ${JSON.stringify(next.xpBySource)}`, '');
    lines.push(
      '| Mission end | Solved | Old XP | Old level (to next) | New XP | New level (to next) |',
      '| --- | ---: | ---: | --- | ---: | --- |',
    );
    next.missionEnds.forEach((end, index) => {
      const before = old.missionEnds[index]!;

      lines.push(
        `| ${end.missionId} ${end.title} | ${end.solved} | ${before.totalXp} | ${before.level} (+${before.xpToNextLevel}) | ${end.totalXp} | ${end.level} (+${end.xpToNextLevel}) |`,
      );
    });
    lines.push('', 'First ten solved tasks (new):', '');
    lines.push(
      '| # | Task | Mode | Awards | XP | Total | Level |',
      '| ---: | --- | --- | --- | ---: | ---: | ---: |',
    );
    for (const task of next.tasks.slice(0, 10)) {
      lines.push(
        `| ${task.n} | ${task.exerciseId} | ${task.responseMode} | ${task.awards.map((award) => `${award.sourceType} ${award.xp}`).join(', ')} | ${task.xp} | ${task.totalXp} | ${task.level} |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
