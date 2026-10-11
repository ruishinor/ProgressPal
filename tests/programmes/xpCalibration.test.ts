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
 * Programme #2 XP and level calibration (owner work orders 2026-10-10,
 * checkpoint B, and 2026-10-11). The simulation walks the real M01/M02
 * content with the real award planner; this file pins the calibration
 * targets and keeps the previous policy (8560194) beside the current one.
 *
 * Reproduce the full report:
 *   LF_XP_SIMULATION_OUT=<folder> npx vitest run tests/programmes/xpCalibration.test.ts
 */

const policy = programvareutviklingDefinition.policy;
const lessonXp = policy.lessonXp!;
const curve = policy.levelCurve!;

/** The Programme #2 policy of 8560194 before the 2026-10-11 calibration. */
const previous: { lessonXp: LessonXpPolicy; curve: LevelCurve } = {
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
    effort: {
      introductory: { adjust: -1, responseModes: ['mcq'] },
      complex: {
        adjust: 4,
        responseModes: ['program', 'diagnose', 'trace', 'testtable'],
        subjectIds: ['s1-m01-p05-e06'],
      },
    },
  },
  curve: { firstLevelXp: 40, levelStepXp: 15 },
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
        curve: previous.curve,
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
    expect(solvedTaskXp(lessonXp, task6)).toBe(13);
    expect(solvedTaskXp(lessonXp, choice)).toBe(6);

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
      '4 XP': 60,
      '5 XP': 75,
      '6 XP': 9,
      '7 XP': 10,
      '8 XP': 35,
      '9 XP': 49,
      '10 XP': 4,
      '12 XP': 22,
    });
    // 60 of 264 (23%) earn the lowest value; a demanding task earns twice a
    // choice task or more.
    expect(solvedXpDistribution(lessonXp, required)).toEqual({
      '6 XP': 60,
      '8 XP': 74,
      '9 XP': 1,
      '10 XP': 2,
      '11 XP': 9,
      '12 XP': 24,
      '13 XP': 49,
      '14 XP': 19,
      '16 XP': 4,
      '17 XP': 9,
      '19 XP': 13,
    });
  });
});

describe('the level curve', () => {
  it('needs 55 XP for level 2 and 20 more for each next level, exactly at the threshold', () => {
    expect(calculateXpSummary(54, curve)).toMatchObject({
      level: 1,
      xpToNextLevel: 1,
      nextLevelXp: 55,
    });
    expect(calculateXpSummary(55, curve)).toMatchObject({
      level: 2,
      currentLevelFloorXp: 55,
      nextLevelXp: 130,
    });
    expect(calculateXpSummary(130, curve).level).toBe(3);
    expect(calculateXpSummary(225, curve).level).toBe(4);
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
  it('reaches level 2 after four to seven substantive tasks', () => {
    for (const pattern of patterns) {
      const first = tasksPerLevel(runs.get(`new|${pattern}`)!)[0]!;

      expect(first).toBeGreaterThanOrEqual(4);
      expect(first).toBeLessThanOrEqual(7);
    }
  });

  it('asks more tasks per level over time, without a level that takes most of a module', () => {
    const mean = (values: number[]) =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    for (const pattern of patterns) {
      const perLevel = tasksPerLevel(runs.get(`new|${pattern}`)!);
      const thirds = [0, 1, 2].map((third) =>
        mean(perLevel.slice(third * 5, third * 5 + 5)),
      );

      // Milestones and task mix make single levels noisy; the trend is up.
      expect(thirds[0]).toBeLessThan(thirds[1]!);
      expect(thirds[1]).toBeLessThan(thirds[2]!);
      expect(Math.max(...perLevel)).toBeLessThanOrEqual(30);
    }
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

  it('keeps lesson, checkpoint and module bonuses below a fifth of all XP', () => {
    const normal = runs.get('new|normal')!;
    const bonuses =
      (normal.xpBySource.lesson_completed ?? 0) +
      (normal.xpBySource.checkpoint_cleared ?? 0) +
      (normal.xpBySource.module_completed ?? 0);

    expect(bonuses / normal.totalXp).toBeLessThan(1 / 5);
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

const tierOrder = ['introductory', 'standard', 'complex'] as const;
const familyOf = (meta: { role: string }) =>
  meta.role === 'lab' || meta.role === 'quest' ? 'practical' : meta.role;

function report(): string {
  const required = order.filter((task) => !task.meta.optional);
  const lines: string[] = [
    '# Programme #2 XP and level calibration (M01 + M02)',
    '',
    `Generated by tests/programmes/xpCalibration.test.ts from content version ${p2Index.contentVersion}.`,
    `Required evaluable tasks in learner order: ${required.length}; optional tasks are not simulated.`,
    '',
    `Previous (8560194): curve ${JSON.stringify(previous.curve)}, solved ${JSON.stringify(previous.lessonXp.solved)}, effort -1 / +4.`,
    `Current: curve ${JSON.stringify(curve)}, solved ${JSON.stringify(lessonXp.solved)}, effort ${lessonXp.effort!.introductory.adjust} / +${lessonXp.effort!.complex.adjust}; bonuses lesson ${lessonXp.lessonCompleted}, milestone ${lessonXp.authoredMilestone}, recall ${lessonXp.independentRecall}, checkpoint ${lessonXp.checkpointCleared}, module ${lessonXp.moduleCompleted}.`,
    '',
    '## (a) Solved-task XP by difficulty tier and role family (required tasks)',
    '',
    'Tiers: introductory = choice tasks; complex = program, diagnose, trace, test table and Task 6; standard = the rest.',
    '',
    '| Tier | Role family | Previous XP | Current XP | Tasks |',
    '| --- | --- | ---: | ---: | ---: |',
  ];

  for (const tier of tierOrder) {
    for (const family of [
      'formative',
      'practical',
      'retrieval',
      'checkpoint',
    ]) {
      const group = required.filter(
        (task) =>
          lessonEffortTier(lessonXp, task.meta) === tier &&
          familyOf(task.meta) === family,
      );

      if (group.length === 0) {
        continue;
      }

      const range = (policy: LessonXpPolicy) => {
        const values = group.map((task) => solvedTaskXp(policy, task.meta));
        const low = Math.min(...values);
        const high = Math.max(...values);

        return low === high ? `${low}` : `${low}-${high}`;
      };

      lines.push(
        `| ${tier} | ${family} | ${range(previous.lessonXp)} | ${range(lessonXp)} | ${group.length} |`,
      );
    }
  }

  const normalNew = runs.get('new|normal')!;
  const normalOld = runs.get('old|normal')!;
  const reachedOld = [...normalOld.levelReachedAt.entries()];
  const reachedNew = [...normalNew.levelReachedAt.entries()];

  lines.push(
    '',
    '## (b) Thresholds and solved-task intervals per level (normal pattern)',
    '',
    '| Level reached | Previous threshold XP | Previous interval | Current threshold XP | Current interval |',
    '| ---: | ---: | ---: | ---: | ---: |',
  );
  for (
    let level = 2;
    level <= Math.max(normalNew.finalLevel, normalOld.finalLevel);
    level += 1
  ) {
    const cell = (
      reached: typeof reachedNew,
      levelCurve: LevelCurve,
    ): [string, string] => {
      const at = reached.find(([l]) => l === level);
      const before = reached.find(([l]) => l === level - 1);

      return at === undefined
        ? ['-', '-']
        : [`${thresholdOf(level, levelCurve)}`, `${at[1] - before![1]}`];
    };
    const [oldThreshold, oldInterval] = cell(reachedOld, previous.curve);
    const [newThreshold, newInterval] = cell(reachedNew, curve);

    lines.push(
      `| ${level} | ${oldThreshold} | ${oldInterval} | ${newThreshold} | ${newInterval} |`,
    );
  }

  lines.push(
    '',
    '## (c) and (d) Levels at the end of M01 and M02, previous against current',
    '',
    '| Pattern | Previous XP | Previous M01 / M02 level | Current XP | Current M01 / M02 level | Previous intervals | Current intervals |',
    '| --- | ---: | --- | ---: | --- | --- | --- |',
  );
  for (const pattern of patterns) {
    const old = runs.get(`old|${pattern}`)!;
    const next = runs.get(`new|${pattern}`)!;
    const end = (run: SimulationResult, mission: string) =>
      run.missionEnds.find((entry) => entry.missionId === mission)!.level;

    lines.push(
      `| ${pattern} | ${old.totalXp} | ${end(old, 'S1-M01-CHK')} / ${end(old, 'S1-M02-CHK')} | ${next.totalXp} | ${end(next, 'S1-M01-CHK')} / ${end(next, 'S1-M02-CHK')} | ${tasksPerLevel(old).join(', ')} | ${tasksPerLevel(next).join(', ')} |`,
    );
  }

  lines.push(
    '',
    `XP by source, current normal: ${JSON.stringify(normalNew.xpBySource)}`,
    `XP by source, previous normal: ${JSON.stringify(normalOld.xpBySource)}`,
    '',
    'First ten solved tasks (current, normal):',
    '',
    '| # | Task | Mode | Awards | XP | Total | Level |',
    '| ---: | --- | --- | --- | ---: | ---: | ---: |',
  );
  for (const task of normalNew.tasks.slice(0, 10)) {
    lines.push(
      `| ${task.n} | ${task.exerciseId} | ${task.responseMode} | ${task.awards.map((award) => `${award.sourceType} ${award.xp}`).join(', ')} | ${task.xp} | ${task.totalXp} | ${task.level} |`,
    );
  }
  lines.push('');

  return lines.join('\n');
}
