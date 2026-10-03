import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  addStudySession,
  addStudySessionAndAwardXp,
  addXpTransaction,
  getDatabaseSnapshot,
  initializeDatabase,
  logMediaProgressAndAwardXp,
  restoreDatabaseFromBackup,
  saveLearnerProfile,
  upsertProgressAndAwardXp,
  defaultLearnerProfileValues,
  type AddStudySessionWithXpResult,
  type LogMediaProgressWithXpResult,
  type UpsertProgressWithXpResult,
} from '@/lib/db';
import {
  deriveRewardEvents,
  isRewardMutationResult,
  type RewardMutationResult,
} from '@/lib/rewards';
import { bundledCourseSeed } from '@/seed';
import {
  cs50AchievementDefinitions,
  cs50CatalogueId,
  cs50Policy,
} from '../programmes/cs50Policy';

const scope = { catalogueId: cs50CatalogueId, policy: cs50Policy };

async function seedXp(xp: number) {
  await addXpTransaction({
    awardedAt: '2026-06-10T08:00:00.000Z',
    id: 'xp-synthetic-seed',
    reason: 'Synthetic test seed',
    sourceId: 'synthetic-seed',
    programmeId: 'cs50x',
    sourceType: 'study_session',
    xp,
  });
}

async function seedDeepSessions(count: number) {
  for (let index = 0; index < count; index += 1) {
    await addStudySession({
      durationMinutes: 45,
      endedAt: `2026-06-1${index}T09:45:00.000Z`,
      id: `session-seeded-${index}`,
      itemId: 'week-0-lecture',
      mode: 'watching',
      startedAt: `2026-06-1${index}T09:00:00.000Z`,
      unitId: 'week-0',
    });
  }
}

function completeLecture(itemId: string) {
  return upsertProgressAndAwardXp(
    { confidence: 3, itemId, status: 'completed' },
    scope,
  );
}

describe('reward events from committed award mutations', () => {
  it('matches every award mutation result type', () => {
    expectTypeOf<UpsertProgressWithXpResult>().toExtend<RewardMutationResult>();
    expectTypeOf<LogMediaProgressWithXpResult>().toExtend<RewardMutationResult>();
    expectTypeOf<AddStudySessionWithXpResult>().toExtend<RewardMutationResult>();
  });

  it('reports a newly unlocked achievement without a level-up when XP stays inside the level', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });

    const result = await completeLecture('week-0-lecture');

    expect(result.xpSummary).toMatchObject({ level: 1, totalXp: 40 });
    expect(isRewardMutationResult(result)).toBe(true);
    expect(deriveRewardEvents(result, cs50AchievementDefinitions)).toEqual([
      { achievementId: 'first-step', kind: 'achievement', title: 'First Step' },
    ]);
  });

  it('reports nothing when the same save is repeated against persisted state', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await completeLecture('week-0-lecture');

    const repeated = await completeLecture('week-0-lecture');

    expect(repeated.awardedTransactions).toEqual([]);
    expect(repeated.unlockedAchievements).toEqual([]);
    expect(deriveRewardEvents(repeated, cs50AchievementDefinitions)).toEqual(
      [],
    );
  });

  it('reports XP without a level-up as no reward', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await completeLecture('week-0-lecture');

    const result = await completeLecture('week-1-lecture');

    expect(result.awardedTransactions.length).toBeGreaterThan(0);
    expect(result.xpSummary.level).toBe(1);
    expect(deriveRewardEvents(result, cs50AchievementDefinitions)).toEqual([]);
  });

  it('reports the level crossed by the awarded XP before the achievements, in mutation order', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await seedXp(95);
    await seedDeepSessions(3);

    const result = await completeLecture('week-0-lecture');

    expect(result.xpSummary).toMatchObject({ level: 2, totalXp: 135 });
    expect(deriveRewardEvents(result, cs50AchievementDefinitions)).toEqual([
      { kind: 'level-up', level: 2 },
      { achievementId: 'first-step', kind: 'achievement', title: 'First Step' },
      {
        achievementId: 'three-deep-sessions',
        kind: 'achievement',
        title: 'Three Deep Sessions',
      },
    ]);
  });

  it('never reports a level that persisted state already had', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await seedXp(450);

    const result = await completeLecture('week-0-lecture');

    // 490 XP is level 3 both before (450) and after the award.
    expect(result.xpSummary.level).toBe(3);
    expect(
      deriveRewardEvents(result, cs50AchievementDefinitions).map(
        (event) => event.kind,
      ),
    ).toEqual(['achievement']);
  });

  it('reports one level-up for the level reached by a multi-level jump', () => {
    expect(
      deriveRewardEvents(
        {
          awardedTransactions: [{ xp: 400 }],
          unlockedAchievements: [],
          xpSummary: { level: 3, totalXp: 450 },
        },
        [],
      ),
    ).toEqual([{ kind: 'level-up', level: 3 }]);
  });

  it('keeps an unlock whose definition is unknown, labelled by its id', () => {
    expect(
      deriveRewardEvents(
        {
          awardedTransactions: [],
          unlockedAchievements: [{ achievementId: 'retired-badge' }],
          xpSummary: { level: 1, totalXp: 0 },
        },
        [],
      ),
    ).toEqual([
      {
        achievementId: 'retired-badge',
        kind: 'achievement',
        title: 'retired-badge',
      },
    ]);
  });

  it('recognises the study-session and media award results', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await seedDeepSessions(2);

    const session = await addStudySessionAndAwardXp(
      {
        durationMinutes: 50,
        endedAt: '2026-06-20T09:50:00.000Z',
        itemId: 'week-0-lecture',
        mode: 'debugging',
        startedAt: '2026-06-20T09:00:00.000Z',
        unitId: 'week-0',
      },
      scope,
    );

    expect(isRewardMutationResult(session)).toBe(true);
    expect(deriveRewardEvents(session, cs50AchievementDefinitions)).toEqual([
      { achievementId: 'bug-hunter', kind: 'achievement', title: 'Bug Hunter' },
      {
        achievementId: 'three-deep-sessions',
        kind: 'achievement',
        title: 'Three Deep Sessions',
      },
    ]);

    const snapshot = await getDatabaseSnapshot();
    const asset = snapshot.contentAssets[0]!;
    const media = await logMediaProgressAndAwardXp(
      {
        assetId: asset.id,
        endSecond: 60,
        energyAfter: 3,
        energyBefore: 3,
        startSecond: 0,
        stoppedBecause: 'fatigue',
      },
      scope,
    );

    expect(isRewardMutationResult(media)).toBe(true);
  });

  it('ignores mutation results that are not award results', async () => {
    await initializeDatabase({ seed: bundledCourseSeed });
    await completeLecture('week-0-lecture');
    const profile = await saveLearnerProfile(
      {
        ...defaultLearnerProfileValues,
        targetStudyDays: [...defaultLearnerProfileValues.targetStudyDays],
      },
      { completeOnboarding: true },
    );
    const snapshot = await getDatabaseSnapshot();
    const restored = await restoreDatabaseFromBackup(snapshot, {
      seed: bundledCourseSeed,
    });

    for (const value of [undefined, null, 3, profile, snapshot, restored]) {
      expect(isRewardMutationResult(value)).toBe(false);
    }
  });
});
