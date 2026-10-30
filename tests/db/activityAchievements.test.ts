import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  saveActivityEntry,
  deleteActivityEntry,
  readActivityData,
  saveActivitySettings,
} from '@/lib/db/activity';
import {
  getDatabaseSnapshot,
  initializeDatabase,
  restoreDatabaseFromBackup,
  resetAllData,
} from '@/lib/db';
import {
  buildBackupEnvelope,
  parseBackupFile,
  serializeBackupEnvelope,
} from '@/lib/backup';
import { defaultActivitySettings } from '@/lib/domain/activity';
import { deriveRewardEvents } from '@/lib/rewards';
import {
  createTestDatabase,
  sampleCourseSeed,
  type TestDatabaseContext,
} from './testDatabase';

const now = () => '2026-10-28T12:00:00.000Z';
const contexts: TestDatabaseContext[] = [];
async function device() {
  const context = createTestDatabase('activity-awards');
  contexts.push(context);
  const options = { db: context.db, seed: sampleCourseSeed, now };
  await initializeDatabase(options);
  return { ...context, options };
}
const input = {
  activityId: 'pushups',
  unit: 'reps' as const,
  amount: 10,
  date: '2026-10-28',
};
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(contexts.splice(0).map((c) => c.cleanup()));
});

describe('atomic Activity awards on explicit entry saves only', () => {
  it('returns committed new awards with exact feedback, retains them after edits/deletion and never touches education', async () => {
    const { db, options } = await device();
    const before = await getDatabaseSnapshot(options);
    const first = await saveActivityEntry(input, options);
    expect(first.unlockedAchievements).toMatchObject([
      {
        achievementId: 'activity-hello-overworld',
        triggerSourceId: first.id,
        unlockedAt: now(),
      },
    ]);
    expect(deriveRewardEvents(first, [])).toEqual([
      {
        kind: 'achievement',
        achievementId: 'activity-hello-overworld',
        title: 'Hello, Overworld!',
        message: 'Runlight lit. Adventure is now executing.',
        narrative:
          'Your character lights the Runlight Lantern and leaves the training hall as an adventurer.',
      },
    ]);
    const edited = await saveActivityEntry({ ...first, amount: 1 }, options);
    expect(edited.unlockedAchievements).toEqual([]);
    await deleteActivityEntry(first.id, options);
    expect(await db.achievementUnlocks.count()).toBe(1);
    const after = await getDatabaseSnapshot(options);
    for (const key of Object.keys(before) as (keyof typeof before)[])
      if (!key.startsWith('activity') && key !== 'achievementUnlocks')
        expect(after[key], key).toEqual(before[key]);
  });
  it('rolls back the entry and day when unlock persistence fails; retry commits once', async () => {
    const { db, options } = await device();
    const before = await getDatabaseSnapshot(options);
    const fail = () => {
      throw Error('synthetic award failure');
    };
    db.achievementUnlocks.hook('creating', fail);
    await expect(saveActivityEntry(input, options)).rejects.toThrow(
      'synthetic award failure',
    );
    db.achievementUnlocks.hook('creating').unsubscribe(fail);
    expect(await getDatabaseSnapshot(options)).toEqual(before);
    const saved = await saveActivityEntry(input, options);
    expect(saved.unlockedAchievements).toHaveLength(1);
    expect(
      (await saveActivityEntry(input, options)).unlockedAchievements,
    ).toEqual([]);
    expect(await db.achievementUnlocks.count()).toBe(1);
  });
  it('recognizes qualifying older history on a save, with actual save time and first-prefix witness', async () => {
    const { db, options } = await device();
    await saveActivityEntry(
      { ...input, amount: 11, date: '2026-10-01' },
      options,
    );
    await saveActivityEntry(
      { ...input, amount: 10, date: '2026-10-02' },
      options,
    );
    const third = await saveActivityEntry(
      { ...input, amount: 11, date: '2026-10-03' },
      options,
    );
    expect(third.unlockedAchievements).toMatchObject([
      {
        achievementId: 'activity-push-to-main',
        triggerSourceId: third.id,
        unlockedAt: now(),
      },
    ]);
    const walking = await saveActivityEntry(
      {
        ...input,
        activityId: 'walking',
        unit: 'metres',
        amount: 1000,
        date: '2026-10-03',
      },
      options,
    );
    expect(walking.unlockedAchievements.map((r) => r.achievementId)).toEqual([
      'activity-merge-quest',
    ]);
    expect(await db.xpTransactions.count()).toBe(0);
    await saveActivitySettings(
      {
        ...defaultActivitySettings,
        goals: [
          {
            id: 'g',
            activityId: 'pushups',
            unit: 'reps',
            target: 1,
            enabled: true,
          },
        ],
      },
      options,
    );
    await readActivityData(options);
    expect(await db.achievementUnlocks.count()).toBe(3);
  });
  it('round-trips exact unlocks and ledger through complete backup, restores silently, resets and replays safely', async () => {
    const source = await device();
    const saved = await saveActivityEntry(input, source.options);
    const envelope = buildBackupEnvelope(
      await getDatabaseSnapshot(source.options),
      { appVersion: '1.10.0', schemaVersion: 5, exportedAt: now() },
    );
    const parsed = parseBackupFile(serializeBackupEnvelope(envelope).contents, {
      expectedSchemaVersion: 5,
    });
    const target = await device();
    await restoreDatabaseFromBackup(parsed.data, target.options);
    expect(await target.db.achievementUnlocks.toArray()).toEqual(
      await source.db.achievementUnlocks.toArray(),
    );
    expect(await readActivityData(target.options)).toEqual(
      await readActivityData(source.options),
    );
    expect(
      (await saveActivityEntry({ ...saved, amount: 12 }, target.options))
        .unlockedAchievements,
    ).toEqual([]);
    // Old/restored eligible data with no unlock stays unawarded until a save.
    await target.db.achievementUnlocks.clear();
    const old = buildBackupEnvelope(await getDatabaseSnapshot(target.options), {
      appVersion: '1.10.0',
      schemaVersion: 5,
      exportedAt: now(),
    });
    await restoreDatabaseFromBackup(old.data, target.options);
    await readActivityData(target.options);
    expect(await target.db.achievementUnlocks.count()).toBe(0);
    expect(
      (await saveActivityEntry({ ...saved, amount: 13 }, target.options))
        .unlockedAchievements,
    ).toHaveLength(1);
    await resetAllData(target.options);
    expect(await target.db.activityEntries.count()).toBe(0);
    expect(await target.db.achievementUnlocks.count()).toBe(0);
  });
});
