import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildBackupEnvelope,
  parseBackupFile,
  serializeBackupEnvelope,
} from '@/lib/backup';
import {
  activityParticipation,
  activityTotals,
  goalProgress,
  previousActivityDate,
  recentActivityDays,
  toActivityAmount,
} from '@/lib/activity/model';
import {
  ActivityDateSchema,
  assertActivityInvariants,
  defaultActivitySettings,
  type ActivityEntry,
} from '@/lib/domain/activity';
import {
  currentDatabaseSchemaVersion,
  getDatabaseSnapshot,
  initializeDatabase,
  resetAllData,
  restoreDatabaseFromBackup,
} from '@/lib/db';
import {
  deleteActivityEntry,
  readActivityData,
  readActivityParticipation,
  saveActivityDefinition,
  saveActivityEntry,
  saveActivitySettings,
} from '@/lib/db/activity';
import { createP2Device, attemptInput } from './learnerEvidenceFixture';
import {
  submitExerciseAttempt,
  recordEvaluationResult,
  saveLessonPosition,
  getXpSummary,
  upsertProgress,
} from '@/lib/db';
import {
  createTestDatabase,
  sampleCourseSeed,
  type TestDatabaseContext,
} from './testDatabase';

const now = () => '2026-10-25T12:00:00.000Z';
const contexts: TestDatabaseContext[] = [];
async function device() {
  const context = createTestDatabase('activity');
  contexts.push(context);
  await initializeDatabase({ db: context.db, seed: sampleCourseSeed, now });
  return { ...context, options: { db: context.db, now } };
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(contexts.splice(0).map((context) => context.cleanup()));
});
const input = (amount = 8, date = '2026-10-25') => ({
  activityId: 'pushups',
  unit: 'reps' as const,
  amount,
  date,
});
const goal = {
  id: 'goal-pushups',
  activityId: 'pushups',
  unit: 'reps' as const,
  target: 20,
  enabled: true,
};

describe('Activity records and recovery', () => {
  it('keeps 8+7+5 individual records, recalculates correction/deletion and never touches educational rows', async () => {
    const { options } = await device();
    const before = await getDatabaseSnapshot(options);
    await saveActivitySettings(
      { ...defaultActivitySettings, goals: [goal] },
      options,
    );
    const first = await saveActivityEntry(input(8), options);
    const second = await saveActivityEntry(input(7), options);
    await saveActivityEntry(input(5), options);
    let data = await readActivityData(options);
    expect(new Set(data.activityEntries.map((entry) => entry.id)).size).toBe(3);
    expect(goalProgress(goal, data.activityEntries)).toEqual({
      amount: 20,
      complete: true,
    });
    await saveActivityEntry({ ...second, amount: 6 }, options);
    data = await readActivityData(options);
    expect(goalProgress(goal, data.activityEntries)).toEqual({
      amount: 19,
      complete: false,
    });
    expect(
      data.activityEntries.find((entry) => entry.id === second.id)?.createdAt,
    ).toBe(second.createdAt);
    await deleteActivityEntry(first.id, options);
    expect(
      goalProgress(goal, (await readActivityData(options)).activityEntries)
        .amount,
    ).toBe(11);
    const after = await getDatabaseSnapshot(options);
    for (const key of Object.keys(before) as Array<keyof typeof before>)
      if (!key.startsWith('activity'))
        expect(after[key], key).toEqual(before[key]);
  });
  it('logs without goals, accepts large volumes, and uses an index-only HUD projection', async () => {
    const { db, options } = await device();
    await saveActivityEntry(input(50000), options);
    await saveActivityEntry(input(2), options);
    const fullScan = vi.spyOn(db.activityEntries, 'toArray');
    expect(await readActivityParticipation(options)).toMatchObject({
      activeDays: 1,
      level: 1,
    });
    expect(fullScan).not.toHaveBeenCalled();
    expect((await readActivityData(options)).activitySettings).toEqual([]);
  });
  it('rejects invalid dates, unknown units, fractions, future dates and nonexistent edits without writes', async () => {
    const { options } = await device();
    const before = await getDatabaseSnapshot(options);
    for (const change of [
      { amount: -1 },
      { amount: 0 },
      { amount: NaN },
      { amount: Infinity },
      { amount: 1.5 },
      { date: '2026-02-30' },
      { date: '2026-10-26' },
      { activityId: 'missing' },
      { unit: 'metres' as const },
      { id: 'missing' },
    ]) {
      await expect(
        saveActivityEntry({ ...input(), ...change }, options),
      ).rejects.toThrow();
    }
    expect(await getDatabaseSnapshot(options)).toEqual(before);
  });
  it('keeps custom identities and history on rename/archive; disables current goals and permits correction', async () => {
    const { options } = await device();
    const custom = await saveActivityDefinition(
      { name: 'Wheelchair movement', unit: 'metres' },
      options,
    );
    await saveActivitySettings(
      {
        ...defaultActivitySettings,
        goals: [{ ...goal, activityId: custom.id, unit: 'metres' }],
      },
      options,
    );
    const entry = await saveActivityEntry(
      { ...input(), activityId: custom.id, unit: 'metres', amount: 2500 },
      options,
    );
    await saveActivityDefinition(
      { id: custom.id, name: 'Outdoor movement', archived: true },
      options,
    );
    const data = await readActivityData(options);
    expect(data.activityDefinitions[0]).toMatchObject({
      id: custom.id,
      name: 'Outdoor movement',
      archived: true,
    });
    expect(data.activitySettings[0]?.goals[0]?.enabled).toBe(false);
    expect(() =>
      assertActivityInvariants({
        ...data,
        activitySettings: [
          {
            ...data.activitySettings[0]!,
            goals: [{ ...data.activitySettings[0]!.goals[0]!, enabled: true }],
          },
        ],
      }),
    ).toThrow(/removed activity/);
    expect(data.activityEntries[0]?.activityId).toBe(custom.id);
    await expect(
      saveActivityEntry({ ...entry, amount: 2600 }, options),
    ).resolves.toMatchObject({ amount: 2600 });
    await expect(
      saveActivityEntry(
        { ...input(), activityId: custom.id, unit: 'metres' },
        options,
      ),
    ).rejects.toThrow();
  });
  it('preserves historical goals and never invents targets for a backfilled date', async () => {
    const { options } = await device();
    await saveActivitySettings(
      { ...defaultActivitySettings, goals: [goal] },
      { ...options, now: () => '2026-10-24T12:00:00.000Z' },
    );
    await saveActivityEntry(input(20, '2026-10-24'), options);
    await saveActivitySettings(
      { ...defaultActivitySettings, goals: [{ ...goal, target: 30 }] },
      options,
    );
    await saveActivityEntry(input(5, '2026-10-23'), options);
    const data = await readActivityData(options);
    expect(
      data.activityDays.find((day) => day.id === '2026-10-24')?.goals[0]
        ?.target,
    ).toBe(20);
    expect(
      data.activityDays.find((day) => day.id === '2026-10-23')?.goals,
    ).toEqual([]);
    expect(
      data.activityDays.find((day) => day.id === '2026-10-25')?.goals[0]
        ?.target,
    ).toBe(30);
  });
  it('round-trips all Activity stores and preserves atomic reset/restore; rejects malformed relations before writing', async () => {
    const { db, options } = await device();
    const custom = await saveActivityDefinition(
      { name: 'Stretching', unit: 'seconds' },
      options,
    );
    await saveActivitySettings(
      {
        ...defaultActivitySettings,
        reminderMinutes: 30,
        goals: [{ ...goal, activityId: custom.id, unit: 'seconds' }],
      },
      options,
    );
    await saveActivityEntry(
      { ...input(), activityId: custom.id, unit: 'seconds', amount: 600 },
      options,
    );
    const original = await getDatabaseSnapshot(options);
    const backup = serializeBackupEnvelope(
      buildBackupEnvelope(original, {
        appVersion: '1.8.0',
        schemaVersion: 5,
        exportedAt: now(),
      }),
    );
    const parsed = parseBackupFile(backup.contents, {
      expectedSchemaVersion: 5,
      migrationContext: db.migrationContext,
    });
    await resetAllData({ ...options, seed: sampleCourseSeed });
    expect((await readActivityData(options)).activityEntries).toEqual([]);
    const restored = await restoreDatabaseFromBackup(parsed.data, {
      ...options,
      seed: sampleCourseSeed,
    });
    for (const key of [
      'activityEntries',
      'activityDefinitions',
      'activitySettings',
      'activityDays',
    ] as const)
      expect(restored[key]).toEqual(original[key]);
    const before = await getDatabaseSnapshot(options);
    await expect(
      restoreDatabaseFromBackup(
        { ...parsed.data, activityDefinitions: [] },
        options,
      ),
    ).rejects.toThrow();
    expect(await getDatabaseSnapshot(options)).toEqual(before);
    const fail = () => {
      throw new Error('Forced write failure');
    };
    db.activityEntries.hook('creating', fail);
    await expect(
      restoreDatabaseFromBackup(parsed.data, {
        ...options,
        seed: sampleCourseSeed,
      }),
    ).rejects.toThrow('Forced write failure');
    db.activityEntries.hook('creating').unsubscribe(fail);
    expect(await getDatabaseSnapshot(options)).toEqual(before);
  });
  it('refuses schema-4 backups before writing, under the revised owner decision', async () => {
    const { options } = await device();
    const before = await getDatabaseSnapshot(options);
    const envelope = buildBackupEnvelope(before, {
      appVersion: '1.8.0',
      schemaVersion: 5,
      exportedAt: now(),
    });
    expect(() =>
      parseBackupFile(JSON.stringify({ ...envelope, schemaVersion: 4 }), {
        expectedSchemaVersion: 5,
      }),
    ).toThrow(/different data version/);
    expect(await getDatabaseSnapshot(options)).toEqual(before);
  });
  it('directly upgrades a genuine native-40 database with every old store byte-identical except metadata version', async () => {
    const context = await createP2Device('activity-v4-populated', {
      materialize: true,
    });
    contexts.push(context);
    const source = { ...context, options: { db: context.db, now } };
    await upsertProgress(
      { itemId: 'week-0-lecture', status: 'started', confidence: 3 },
      source.options,
    );
    await source.db.xpTransactions.add({
      id: 'xp-migration',
      programmeId: 'cs50x',
      sourceType: 'migration-fixture',
      sourceId: 'week-0-lecture',
      xp: 137,
      reason: 'Synthetic historical XP',
      awardedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    });
    await source.db.achievementDefinitions.add({
      id: 'migration-badge',
      title: 'Synthetic badge',
      description: 'Migration fixture',
      category: 'course_progress',
      xpReward: 0,
      ruleType: 'first_item_completed',
      ruleConfig: {},
      createdAt: now(),
      updatedAt: now(),
    });
    await source.db.achievementUnlocks.add({
      id: 'migration-unlock',
      achievementId: 'migration-badge',
      triggerSourceId: 'week-0-lecture',
      unlockedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    });
    await source.db.studySessions.add({
      id: 'migration-session',
      unitId: 'week-0',
      itemId: 'week-0-lecture',
      mode: 'coding',
      startedAt: '2026-10-25T11:00:00.000Z',
      endedAt: now(),
      durationMinutes: 60,
      blockers: [],
      createdAt: now(),
      updatedAt: now(),
    });
    const attempt = await submitExerciseAttempt(attemptInput(), source.options);
    await recordEvaluationResult(
      {
        id: 'migration-result',
        attemptId: attempt.record.id,
        outcome: 'correct',
      },
      source.options,
    );
    await saveLessonPosition(
      {
        itemId: 's1-m01-o01',
        programmeId: 'programvareutvikling',
        contentVersion: 1,
        unitId: 's1-m01-p01',
        stepIndex: 3,
      },
      source.options,
    );
    const xpBefore = await getXpSummary({
      ...source.options,
      programmeId: 'cs50x',
    });
    // Valid educational profile, XP, attempts and other stores are already
    // exhaustively preserved by the existing schema/lifecycle fixtures. Here
    // copy every current educational store, including empty ones, into v4.
    const snapshot = await getDatabaseSnapshot(source.options);
    const old = createTestDatabase('activity-v4-upgrade');
    contexts.push(old);
    const legacy = new Dexie(old.name);
    const stores = Object.fromEntries(
      source.db.tables
        .filter((table) => !table.name.startsWith('activity_'))
        .map((table) => [
          table.name,
          [
            table.schema.primKey.src,
            ...table.schema.indexes.map((index) => index.src),
          ].join(', '),
        ]),
    );
    legacy.version(4).stores(stores);
    await legacy.open();
    for (const table of source.db.tables.filter(
      (table) => !table.name.startsWith('activity_'),
    )) {
      const rows = await table.toArray();
      if (table.name === 'app_meta')
        for (const row of rows) row.schemaVersion = 4;
      await legacy.table(table.name).bulkAdd(rows);
    }
    const before = Object.fromEntries(
      await Promise.all(
        legacy.tables.map(async (table) => [table.name, await table.toArray()]),
      ),
    );
    legacy.close();
    await old.db.open();
    expect(await getXpSummary({ db: old.db, programmeId: 'cs50x' })).toEqual(
      xpBefore,
    );
    expect(old.db.verno).toBe(5);
    expect(currentDatabaseSchemaVersion).toBe(5);
    for (const [name, rows] of Object.entries(before))
      expect(await old.db.table(name).toArray(), name).toEqual(
        name === 'app_meta'
          ? (rows as Record<string, unknown>[]).map(
              (row: Record<string, unknown>) => ({ ...row, schemaVersion: 5 }),
            )
          : rows,
      );
    expect(await readActivityData({ db: old.db })).toEqual({
      activityEntries: [],
      activityDefinitions: [],
      activitySettings: [],
      activityDays: [],
    });
    expect((await getDatabaseSnapshot({ db: old.db })).learnerProfile).toEqual(
      snapshot.learnerProfile,
    );
  });
});

describe('Activity calculations and local calendar boundaries', () => {
  it('uses current goals for an unsnapshotted today without inventing historical targets', () => {
    const days = recentActivityDays([], [], '2026-10-26', [goal]);
    expect(days[0]).toMatchObject({
      date: '2026-10-26',
      active: false,
      configured: 1,
      complete: 0,
    });
    expect(days[0].goalStatusKnown).toBe(true);
    expect(days[1]).toMatchObject({
      date: '2026-10-25',
      active: false,
      goalStatusKnown: false,
      configured: 0,
    });

    const snapshotDays = recentActivityDays(
      [],
      [{ id: '2026-10-24', goals: [goal] }],
      '2026-10-26',
      [goal],
    );
    expect(snapshotDays[2]).toMatchObject({
      date: '2026-10-24',
      active: false,
      goalStatusKnown: true,
      configured: 1,
      complete: 0,
    });

    const backfilledDays = recentActivityDays(
      [],
      [{ id: '2026-10-25', goals: [] }],
      '2026-10-26',
      [goal],
    );
    expect(backfilledDays[1].goalStatusKnown).toBe(false);
  });
  const entry = (
    date: string,
    amount: number,
    unit: ActivityEntry['unit'] = 'reps',
  ): ActivityEntry => ({
    id: `e-${date}`,
    date,
    activityId: 'walking',
    unit,
    amount,
    createdAt: now(),
    updatedAt: now(),
  });
  it('uses an inclusive 28-calendar-day window and keeps distance/duration/repetitions separate', () => {
    const totals = activityTotals(
      [
        entry('2026-09-27', 1),
        entry('2026-09-28', 2),
        entry('2026-10-25', 3),
        entry('2026-10-25', 1500, 'metres'),
        entry('2026-10-25', 600, 'seconds'),
      ],
      '2026-10-25',
    );
    expect(totals).toEqual([
      { activityId: 'walking', unit: 'reps', recent: 5, lifetime: 6 },
      { activityId: 'walking', unit: 'metres', recent: 1500, lifetime: 1500 },
      { activityId: 'walking', unit: 'seconds', recent: 600, lifetime: 600 },
    ]);
  });
  it('counts distinct participation dates, not volume, and corrects levels/streaks after removal', () => {
    const dates = Array.from({ length: 7 }, (_, index) =>
      previousActivityDate('2026-10-25', index),
    );
    expect(
      activityParticipation([...dates, ...dates], '2026-10-25'),
    ).toMatchObject({
      level: 2,
      activeDays: 7,
      currentStreak: 7,
      bestStreak: 7,
    });
    expect(activityParticipation(dates.slice(1), '2026-10-25')).toMatchObject({
      level: 1,
      currentStreak: 6,
    });
    expect(activityParticipation(dates, '2026-10-27').currentStreak).toBe(0);
    expect(activityParticipation(['2026-10-26'], '2026-10-25').activeDays).toBe(
      0,
    );
  });
  it('validates real dates, leap years, DST-adjacent dates and measurement precision', () => {
    expect(ActivityDateSchema.safeParse('2026-02-29').success).toBe(false);
    expect(ActivityDateSchema.safeParse('2024-02-29').success).toBe(true);
    expect(previousActivityDate('2026-10-26')).toBe('2026-10-25');
    expect(previousActivityDate('2026-03-30')).toBe('2026-03-29');
    expect(toActivityAmount('1.5', 'seconds')).toBe(90);
    expect(toActivityAmount('2.001', 'metres')).toBe(2001);
    expect(() => toActivityAmount('1.5', 'reps')).toThrow();
    expect(() => toActivityAmount('', 'reps')).toThrow();
  });
});
