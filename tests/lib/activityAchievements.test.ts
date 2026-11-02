import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import approved from '../fixtures/activity-achievements-approved.json';
import { activityAchievementData } from '@/lib/activity/achievementData';
import { evaluateActivityAchievements } from '@/lib/activity/achievements';
import { activityAchievementDefinitions } from '@/lib/achievements/definitions';
import { evaluateAchievements } from '@/lib/achievements/engine';
import { cs50AchievementCatalogue } from '@/programmes/cs50x-2026/achievements';
import { programvareutviklingAchievements } from '@/programmes/programvareutvikling/achievements';
import type {
  ActivityData,
  ActivityEntry,
  ActivityUnit,
} from '@/lib/domain/activity';

const today = '2026-10-28';
const entry = (
  id: string,
  activityId = 'pushups',
  amount = 1,
  date = '2026-10-01',
  unit: ActivityUnit = 'reps',
): ActivityEntry => ({
  id,
  activityId,
  amount,
  date,
  unit,
  createdAt: '2026-10-28T12:00:00.000Z',
  updatedAt: '2026-10-28T12:00:00.000Z',
});
const data = (
  entries: ActivityEntry[],
  extra: Partial<ActivityData> = {},
): ActivityData => ({
  activityEntries: entries,
  activityDefinitions: [],
  activityDays: [...new Set(entries.map((e) => e.date))].map((id) => ({
    id,
    goals: [],
  })),
  activitySettings: [],
  ...extra,
});
const has = (
  suffix: string,
  entries: ActivityEntry[],
  extra?: Partial<ActivityData>,
) =>
  evaluateActivityAchievements(data(entries, extra), today).some(
    (r) => r.achievementId === `activity-${suffix}`,
  );
const days = (
  activity = 'pushups',
  amount = 1,
  unit: ActivityUnit = 'reps',
  count = 3,
) =>
  Array.from({ length: count }, (_, i) =>
    entry(
      `entry-${i}`,
      activity,
      amount,
      `2026-10-${String(i + 1).padStart(2, '0')}`,
      unit,
    ),
  );

describe('approved Activity achievement fidelity and dispatch', () => {
  it('preserves approved identity and verifies the current Activity catalogue and zero XP', () => {
    // The 2026-10-28 approved JSON is a historical design fixture. The owner's
    // revised November 2026 text and thresholds are defined in the runtime file.
    expect(
      activityAchievementData.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        rule: row.rule,
      })),
    ).toEqual(
      approved.achievements.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        rule: row.rule,
      })),
    );
    expect(
      activityAchievementDefinitions.map((d) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        category: d.category,
        xpReward: d.xpReward,
        ruleConfig: d.ruleConfig,
      })),
    ).toEqual(
      activityAchievementData.map((row) => ({
        id: row.id,
        title: row.name,
        description: row.description,
        category: row.category,
        xpReward: 0,
        ruleConfig: { kind: row.rule, ...row.config },
      })),
    );
    for (const catalogue of [
      cs50AchievementCatalogue,
      programvareutviklingAchievements,
    ])
      expect(
        catalogue.filter((d) => d.ruleType === 'physical_activity'),
      ).toEqual(activityAchievementDefinitions);
    expect(
      evaluateAchievements(activityAchievementDefinitions, {
        courseItems: [],
        courseUnits: [],
        progressEntries: [],
        contentSlices: [],
        mediaProgressEvents: [],
        studySessions: [],
      }),
    ).toEqual([]);
  });
  it('ships every exact approved compact badge in the renderer and offline install list', () => {
    const checks = JSON.parse(
      readFileSync('docs/activity-achievement-assets.json', 'utf8'),
    ) as { id: string; compact: string }[];
    const renderer = readFileSync(
      'src/features/rpg/components/RpgAchievementArt.tsx',
      'utf8',
    );
    const worker = readFileSync('public/sw.js', 'utf8');
    for (const r of checks) {
      expect(
        createHash('sha256')
          .update(readFileSync(`public/assets/badges/${r.id}.webp`))
          .digest('hex'),
      ).toBe(r.compact);
      expect(renderer).toMatch(
        new RegExp(`'${r.id}':\\s*programmeBadge\\(\\s*'${r.id}',?\\s*\\)`),
      );
      expect(worker).toContain(`'/assets/badges/${r.id}.webp'`);
    }
  });
});

describe('native-unit and distinct-date boundaries', () => {
  it('requires a valid eligible first entry; future records do not count', () => {
    expect(has('hello-overworld', [])).toBe(false);
    expect(has('hello-overworld', [entry('first')])).toBe(true);
    expect(
      has('hello-overworld', [entry('future', 'pushups', 1, '2026-10-29')]),
    ).toBe(false);
  });
  it.each([
    ['push-to-main', 'pushups', 200, 3],
    ['leg-day-compiler', 'squats', 404, 4],
  ] as const)(
    '%s requires its amount and configured distinct dates',
    (id, activity, total, count) => {
      const logs = days(activity, 1, 'reps', count);
      logs[count - 1].amount = total - count + 1;
      expect(has(id, logs)).toBe(true);
      expect(
        has(
          id,
          logs.map((e, i) =>
            i === count - 1 ? { ...e, amount: e.amount - 1 } : e,
          ),
        ),
      ).toBe(false);
      expect(
        has(
          id,
          logs.map((e) => ({ ...e, date: '2026-10-01' })),
        ),
      ).toBe(false);
      expect(
        has(
          id,
          logs.map((e) => ({ ...e, activityId: 'custom-lookalike' })),
          {
            activityDefinitions: [
              {
                id: 'custom-lookalike',
                name: activity,
                units: ['reps'],
                archived: false,
              },
            ],
          },
        ),
      ).toBe(false);
    },
  );
  it.each([
    ['cache-me-outside', 'walking', 16000, 11520, 1],
    ['runtime-ranger', 'running', 42000, 15120, 7],
    ['cycle-of-power', 'cycling', 64000, 11520, 4],
  ] as const)(
    '%s evaluates each native branch with its own dates',
    (id, activity, metres, seconds, count) => {
      for (const [unit, target] of [
        ['metres', metres],
        ['seconds', seconds],
      ] as const) {
        const logs = days(activity, 1, unit, count);
        logs[count - 1].amount = target - count + 1;
        expect(has(id, logs)).toBe(true);
        expect(
          has(
            id,
            logs.map((e, i) =>
              i === count - 1 ? { ...e, amount: e.amount - 1 } : e,
            ),
          ),
        ).toBe(false);
        if (count > 1)
          expect(
            has(id, [
              entry('a', activity, target, '2026-10-01', unit),
              entry('b', activity, 1, '2026-10-02', unit),
              entry(
                'c',
                activity,
                1,
                '2026-10-03',
                unit === 'metres' ? 'seconds' : 'metres',
              ),
            ]),
          ).toBe(false);
      }
      expect(
        has(id, [
          entry('a', activity, metres - 1, '2026-10-01', 'metres'),
          entry('b', activity, seconds - 1, '2026-10-02', 'seconds'),
        ]),
      ).toBe(false);
    },
  );
  it('counts activity IDs, never units or duplicate entry IDs, for Full Stack', () => {
    const two = [
      entry('a'),
      entry('b', 'walking', 1, undefined, 'metres'),
      entry('c', 'walking', 1, undefined, 'seconds'),
    ];
    expect(has('full-stack-adventurer', two)).toBe(false);
    expect(
      has('full-stack-adventurer', [...two, entry('d', 'kickbacks')]),
    ).toBe(false);
    expect(
      has('full-stack-adventurer', [
        ...two,
        entry('d', 'kickbacks'),
        entry('e', 'squats'),
        entry('f', 'cycling', 1, undefined, 'metres'),
      ]),
    ).toBe(true);
  });
  it('Merge Quest requires a same-date different-ID pair and an intact threshold', () => {
    const reps = entry('a', 'kickbacks', 101);
    for (const [unit, amount] of [
      ['metres', 10000],
      ['seconds', 6000],
    ] as const) {
      expect(
        has('merge-quest', [
          reps,
          entry('b', 'walking', amount, undefined, unit),
        ]),
      ).toBe(true);
      expect(
        has('merge-quest', [
          reps,
          entry('b', 'walking', amount - 1, undefined, unit),
        ]),
      ).toBe(false);
      expect(
        has('merge-quest', [
          reps,
          entry('b', 'walking', amount, '2026-10-02', unit),
        ]),
      ).toBe(false);
      expect(
        has('merge-quest', [
          entry('a', 'custom-a', 101),
          entry('b', 'custom-a', amount, undefined, unit),
        ]),
      ).toBe(false);
    }
    expect(
      has('merge-quest', [
        reps,
        entry('b', 'walking', 500, undefined, 'metres'),
        entry('c', 'walking', 300, undefined, 'seconds'),
      ]),
    ).toBe(false);
  });
});

describe('snapshots, custom history, return paths and witnesses', () => {
  it('Build Passed needs seven nonempty completed enabled historical plans', () => {
    const logs = days('pushups', 10, 'reps', 7);
    const plans = logs.map((e) => ({
      id: e.date,
      goals: [
        {
          id: 'goal',
          activityId: 'pushups',
          unit: 'reps' as const,
          target: 10,
          enabled: true,
        },
        {
          id: 'disabled',
          activityId: 'squats',
          unit: 'reps' as const,
          target: 20,
          enabled: false,
        },
      ],
    }));
    expect(has('build-passed', logs, { activityDays: plans })).toBe(true);
    expect(has('build-passed', logs)).toBe(false);
    expect(
      has('build-passed', logs, {
        activityDays: plans.map((p, i) => (i === 2 ? { ...p, goals: [] } : p)),
      }),
    ).toBe(false);
    expect(
      has('build-passed', logs, {
        activityDays: plans.map((p) => ({
          ...p,
          goals: p.goals.map((g) => ({ ...g, target: 11 })),
        })),
      }),
    ).toBe(false);
    expect(
      has('build-passed', logs, {
        activityDays: plans.map((p) => ({
          ...p,
          goals: p.goals.map((g) => ({ ...g, enabled: false })),
        })),
      }),
    ).toBe(false);
  });
  it('Fork Your Path retains one archived renamed custom identity across eight dates', () => {
    const defs = [
      {
        id: 'custom-a',
        name: 'Push-ups',
        units: ['reps'] as ActivityUnit[],
        archived: true,
      },
      {
        id: 'custom-b',
        name: 'Other',
        units: ['reps'] as ActivityUnit[],
        archived: false,
      },
    ];
    const logs = days('custom-a', 1, 'reps', 8);
    expect(has('fork-your-path', logs, { activityDefinitions: defs })).toBe(
      true,
    );
    expect(
      has(
        'fork-your-path',
        logs.map((e, i) => (i === 7 ? { ...e, activityId: 'custom-b' } : e)),
        { activityDefinitions: defs },
      ),
    ).toBe(false);
    expect(has('fork-your-path', days())).toBe(false);
  });
  it('Warm Reboot uses three fully blank dates OR eleven active dates', () => {
    expect(
      has('warm-reboot', [entry('a'), entry('b', 'pushups', 1, '2026-10-05')]),
    ).toBe(true);
    expect(
      has('warm-reboot', [entry('a'), entry('b', 'pushups', 1, '2026-10-04')]),
    ).toBe(false);
    expect(
      has('warm-reboot', [
        entry('a'),
        entry('middle', 'pushups', 1, '2026-10-03'),
        entry('b', 'pushups', 1, '2026-10-05'),
      ]),
    ).toBe(false);
    expect(has('warm-reboot', days('pushups', 1, 'reps', 11))).toBe(true);
    expect(has('warm-reboot', days('pushups', 1, 'reps', 10))).toBe(false);
  });
  it('Long-Term Support counts 20 nonconsecutive dates and no log inflation', () => {
    const logs = Array.from({ length: 20 }, (_, i) =>
      entry(
        `entry-${i}`,
        'kickbacks',
        1,
        new Date(Date.UTC(2026, 6, 1 + i * 2)).toISOString().slice(0, 10),
      ),
    );
    expect(has('long-term-support', logs)).toBe(true);
    expect(has('long-term-support', logs.slice(1))).toBe(false);
    expect(
      has(
        'long-term-support',
        logs.map((e) => ({ ...e, date: '2026-10-01' })),
      ),
    ).toBe(false);
  });
  it('uses the first qualifying date/ID prefix, independently of insertion order', () => {
    const logs = [
      entry('z', 'walking', 10000, undefined, 'metres'),
      entry('a', 'pushups', 101),
      entry('later', 'walking', 6000, '2026-10-02', 'metres'),
    ];
    const result = evaluateActivityAchievements(data(logs), today);
    expect(result).toEqual(
      evaluateActivityAchievements(data([...logs].reverse()), today),
    );
    expect(
      result.find((r) => r.achievementId === 'activity-hello-overworld')
        ?.triggerSourceId,
    ).toBe('a');
    expect(
      result.find((r) => r.achievementId === 'activity-merge-quest')
        ?.triggerSourceId,
    ).toBe('z');
    expect(
      result.find((r) => r.achievementId === 'activity-cache-me-outside')
        ?.triggerSourceId,
    ).toBe('later');
  });
});
