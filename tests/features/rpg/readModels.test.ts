import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildRpgHubSummary,
  buildRpgHeroProfileSummary,
  buildRpgCourseMapSummary,
  loadRpgBadgeGallerySummary,
  loadRpgCourseMapSummary,
  loadRpgHeroProfileSummary,
  loadRpgHubSummary,
  loadRpgModuleSummary,
  loadRpgStudyResourceSummary,
  RPG_WEEK_FOUR_UNIT_ID,
} from '@/features/rpg';
import {
  addStudySession,
  addXpTransaction,
  getDatabaseSnapshot,
  initializeDatabase,
  logMediaProgress,
  upsertProgress,
  upsertProgressAndAwardXp,
  type DatabaseSnapshot,
} from '@/lib/db';
import type { CourseItem, ProgressStatus } from '@/lib/domain';
import {
  cs50AchievementDefinitions as achievementDefinitions,
  cs50Scope,
} from '../../programmes/cs50Policy';
import { bundledCourseSeed } from '@/seed';
import {
  createClock,
  createTestDatabase,
  type TestDatabaseContext,
} from '../../db/testDatabase';
import { cs50CatalogueId, cs50Policy } from '../../programmes/cs50Policy';

describe('RPG read models', () => {
  let testDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
    vi.restoreAllMocks();
    await testDatabase?.cleanup();
    testDatabase = null;
  });

  async function createSeededRpgDatabase() {
    testDatabase = createTestDatabase('rpg-read-models');

    await initializeDatabase({
      db: testDatabase.db,
      now: createClock('2026-06-21T08:00:00.000Z'),
      seed: bundledCourseSeed,
    });

    await upsertProgress(
      {
        completedAt: '2026-06-21T08:30:00.000Z',
        confidence: 3,
        evidenceText: undefined,
        evidenceType: undefined,
        itemId: 'week-0-lecture',
        notes: 'Completed before the current memory work.',
        startedAt: '2026-06-21T08:00:00.000Z',
        status: 'completed',
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-21T08:35:00.000Z'),
      },
    );

    await upsertProgress(
      {
        completedAt: undefined,
        confidence: 2,
        evidenceText: undefined,
        evidenceType: undefined,
        itemId: 'week-4-lecture',
        notes: 'Working through memory.',
        startedAt: '2026-06-21T09:00:00.000Z',
        status: 'started',
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-21T09:05:00.000Z'),
      },
    );

    await addStudySession(
      {
        durationMinutes: 35,
        endedAt: '2026-06-21T09:35:00.000Z',
        itemId: 'week-4-lecture',
        mode: 'watching',
        startedAt: '2026-06-21T09:00:00.000Z',
        unitId: RPG_WEEK_FOUR_UNIT_ID,
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-21T09:36:00.000Z'),
      },
    );

    await addXpTransaction(
      {
        awardedAt: '2026-06-21T09:35:00.000Z',
        reason: 'Fixture XP from an existing source event.',
        sourceId: 'rpg-read-model-fixture-session',
        sourceType: 'study_session',
        xp: 10,
      },
      {
        db: testDatabase.db,
        now: createClock('2026-06-21T09:37:00.000Z'),
      },
    );

    return testDatabase.db;
  }

  async function expectReadOnly<T>(read: () => Promise<T>) {
    if (testDatabase === null) {
      throw new Error('Test database was not created.');
    }

    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const result = await read();
    const after = await getDatabaseSnapshot({ db: testDatabase.db });

    expect(after).toEqual(before);

    return result;
  }

  async function createRecommendationSnapshot(
    statusForItem: (item: CourseItem) => ProgressStatus | null = () => null,
  ): Promise<DatabaseSnapshot> {
    const db = await createSeededRpgDatabase();
    const snapshot = await getDatabaseSnapshot({ db });
    const timestamp = '2026-09-16T08:00:00.000Z';

    return {
      ...snapshot,
      progressEntries: snapshot.courseItems.flatMap((item) => {
        const status = statusForItem(item);

        return status === null
          ? []
          : [
              {
                id: `recommendation-${item.id}`,
                itemId: item.id,
                confidence: 3,
                status,
                createdAt: timestamp,
                updatedAt: timestamp,
              },
            ];
      }),
    };
  }

  it('keeps all-blocked required work inspectable without claiming completion or changing data', async () => {
    const snapshot = await createRecommendationSnapshot((item) =>
      item.required ? 'blocked' : null,
    );
    const before = structuredClone(snapshot);
    const hub = buildRpgHubSummary(snapshot);
    const firstRequiredItem = bundledCourseSeed.units
      .flatMap((unit) => unit.items)
      .find((item) => item.required);

    expect(hub.courseProgress).toEqual({
      completedRequiredItemCount: 0,
      completionPercent: 0,
      requiredItemCount: snapshot.courseItems.filter((item) => item.required)
        .length,
    });
    expect(hub.recommendation).toMatchObject({
      state: 'needs_attention',
      quest: { id: firstRequiredItem?.id, status: 'blocked' },
      remainingRequiredCount: hub.courseProgress.requiredItemCount,
    });
    expect(hub.currentModule?.id).toBe(hub.recommendation.quest?.unitId);
    expect(buildRpgCourseMapSummary(snapshot).currentModule).toEqual(
      hub.currentModule,
    );
    expect(snapshot).toEqual(before);
  });

  it('routes to the final blocked gradebook check while required progress remains incomplete', async () => {
    const blockedItemId = 'final-project-gradebook-check';
    const snapshot = await createRecommendationSnapshot((item) =>
      !item.required
        ? null
        : item.id === blockedItemId
          ? 'blocked'
          : 'completed',
    );
    const requiredCount = snapshot.courseItems.filter(
      (item) => item.required,
    ).length;
    const hub = buildRpgHubSummary(snapshot);

    expect(hub.courseProgress).toEqual({
      completedRequiredItemCount: requiredCount - 1,
      completionPercent:
        Math.round(((requiredCount - 1) / requiredCount) * 1000) / 10,
      requiredItemCount: requiredCount,
    });
    expect(hub.recommendation).toMatchObject({
      state: 'needs_attention',
      quest: {
        id: blockedItemId,
        title: 'Confirm completion in the gradebook',
        status: 'blocked',
      },
      remainingRequiredCount: 1,
    });
    expect(hub.currentModule?.id).toBe('final-project');
  });

  it('retains blocked lecture progress without preferring it over actionable work', async () => {
    const snapshot = await createRecommendationSnapshot((item) =>
      item.required ? 'blocked' : null,
    );

    if (testDatabase === null) {
      throw new Error('Test database was not created.');
    }

    await logMediaProgress(
      {
        assetId: 'week-0-lecture-asset',
        endSecond: 1200,
        energyAfter: 3,
        energyBefore: 4,
        startSecond: 0,
        stoppedBecause: 'confusion',
      },
      { db: testDatabase.db, now: createClock('2026-09-16T08:00:00.000Z') },
    );
    const loggedSnapshot = await getDatabaseSnapshot({ db: testDatabase.db });
    const blockedSnapshot = {
      ...snapshot,
      mediaProgressEvents: loggedSnapshot.mediaProgressEvents,
      resumePoints: loggedSnapshot.resumePoints,
    };
    const blocked = buildRpgHubSummary(blockedSnapshot);

    expect(blocked.recommendation).toMatchObject({
      state: 'needs_attention',
      quest: {
        id: 'week-0-lecture',
        status: 'blocked',
        longFormProgress: { hasProgress: true },
      },
    });
    const actionable = buildRpgHubSummary({
      ...blockedSnapshot,
      progressEntries: blockedSnapshot.progressEntries.filter(
        (entry) => entry.itemId !== 'week-0-problem-set',
      ),
    });

    expect(actionable.recommendation).toMatchObject({
      state: 'actionable',
      quest: { id: 'week-0-problem-set', status: 'not_started' },
    });
    expect(
      buildRpgCourseMapSummary(blockedSnapshot)
        .modules.flatMap((module) => module.quests)
        .find((quest) => quest.id === 'week-0-lecture')?.longFormProgress,
    ).toEqual(blocked.recommendation.quest?.longFormProgress);
  });

  it('uses established course order and prioritizes actionable started work', async () => {
    const snapshot = await createRecommendationSnapshot((item) =>
      ['week-2-lecture', 'week-4-lecture'].includes(item.id) ? 'started' : null,
    );
    const reversedSnapshot = {
      ...snapshot,
      courseUnits: [...snapshot.courseUnits].reverse(),
      courseItems: [...snapshot.courseItems].reverse(),
      progressEntries: [...snapshot.progressEntries].reverse(),
    };

    expect(buildRpgHubSummary(reversedSnapshot).recommendation).toMatchObject({
      state: 'actionable',
      quest: { id: 'week-2-lecture', status: 'started' },
    });
    expect(
      buildRpgHubSummary({ ...reversedSnapshot, progressEntries: [] })
        .recommendation,
    ).toMatchObject({
      state: 'actionable',
      quest: { id: 'week-0-lecture', status: 'not_started' },
    });
  });

  it('recognizes the authoritative complete statuses with no required or optional work remaining', async () => {
    const completeStatuses: ProgressStatus[] = [
      'completed',
      'submitted',
      'accepted',
    ];
    let completedItemIndex = 0;
    const snapshot = await createRecommendationSnapshot((item) =>
      item.required
        ? completeStatuses[completedItemIndex++ % completeStatuses.length]
        : 'skipped_optional',
    );
    const hub = buildRpgHubSummary(snapshot);

    expect(hub.recommendation).toEqual({
      state: 'required_complete',
      quest: null,
      remainingRequiredCount: 0,
      optionalRemainingCount: 0,
    });
    expect(hub.courseProgress.completedRequiredItemCount).toBe(
      snapshot.courseItems.filter((item) => item.required).length,
    );
    expect(hub.courseProgress.completionPercent).toBe(100);
    expect(hub.currentModule).toBeNull();
  });

  it('keeps optional-only remainder visible without preventing required completion', async () => {
    const snapshot = await createRecommendationSnapshot((item) =>
      item.required ? 'completed' : null,
    );
    const hub = buildRpgHubSummary(snapshot);

    expect(hub.recommendation).toEqual({
      state: 'required_complete',
      quest: null,
      remainingRequiredCount: 0,
      optionalRemainingCount: snapshot.courseItems.filter(
        (item) => !item.required,
      ).length,
    });
    expect(hub.courseProgress.completionPercent).toBe(100);
  });

  it('counts started and blocked optional work but excludes completed and deliberately skipped optional work', async () => {
    const optionalStatuses: (ProgressStatus | null)[] = [
      null,
      'started',
      'blocked',
      'completed',
      'submitted',
      'accepted',
      'skipped_optional',
    ];
    let optionalIndex = 0;
    const snapshot = await createRecommendationSnapshot((item) => {
      if (item.required) {
        return 'completed';
      }

      const status = optionalStatuses[optionalIndex];
      optionalIndex += 1;

      return status === undefined ? 'skipped_optional' : status;
    });

    expect(optionalIndex).toBeGreaterThanOrEqual(optionalStatuses.length);
    expect(buildRpgHubSummary(snapshot).recommendation).toMatchObject({
      state: 'required_complete',
      optionalRemainingCount: 3,
    });
  });

  it.each([
    'empty',
    'no-items',
    'no-units',
    'empty-required-unit',
    'orphan-item',
  ] as const)(
    'marks %s course data unavailable instead of treating it as required completion',
    async (scenario) => {
      const snapshot = await createRecommendationSnapshot(() => 'completed');
      const unavailableSnapshot = {
        ...snapshot,
        courseItems:
          scenario === 'empty' || scenario === 'no-items'
            ? []
            : scenario === 'empty-required-unit'
              ? snapshot.courseItems.filter((item) => item.unitId !== 'week-0')
              : snapshot.courseItems,
        courseUnits:
          scenario === 'empty' || scenario === 'no-units'
            ? []
            : scenario === 'orphan-item'
              ? snapshot.courseUnits.filter((unit) => unit.id !== 'week-0')
              : snapshot.courseUnits,
      };
      const hub = buildRpgHubSummary(unavailableSnapshot);

      expect(hub.recommendation).toEqual({ state: 'unavailable', quest: null });
      expect(hub.currentModule).toBeNull();
    },
  );

  it('propagates a failed catalog read so consumers cannot confuse it with completion', async () => {
    const db = await createSeededRpgDatabase();
    const before = await getDatabaseSnapshot({ db });
    const readFailure = new Error('Synthetic catalog read failure');
    // Epic C / C5: the catalogue read is the scoped `courseId` query.
    vi.spyOn(db.courseUnits, 'where').mockReturnValueOnce({
      equals: () => ({ toArray: () => Promise.reject(readFailure) }),
    } as unknown as ReturnType<typeof db.courseUnits.where>);

    await expect(loadRpgHubSummary(cs50Scope, { db })).rejects.toBe(
      readFailure,
    );
    expect(await getDatabaseSnapshot({ db })).toEqual(before);
  });

  it('previews unearned task XP consistently without writing or re-offering earned rewards', async () => {
    const db = await createSeededRpgDatabase();
    const resource = await expectReadOnly(() =>
      loadRpgStudyResourceSummary(cs50Scope, 'week-4-lecture', { db }),
    );
    expect(resource?.rewardLabel).toBe('Up to 40 XP remaining for this task');
    expect(
      (await loadRpgHubSummary(cs50Scope, { db })).recommendation.quest
        ?.rewardLabel,
    ).toBe('Up to +40 XP');
    expect(
      (await loadRpgModuleSummary(cs50Scope, 'week-4', { db }))?.quests.find(
        (quest) => quest.id === 'week-4-lecture',
      )?.rewardLabel,
    ).toBe('Up to +40 XP');
    await upsertProgressAndAwardXp(
      { itemId: 'week-4-lecture', status: 'completed', confidence: 3 },
      { catalogueId: cs50CatalogueId, policy: cs50Policy, db },
    );
    // Moving progress backwards never makes the once-only award available again.
    await upsertProgress(
      { itemId: 'week-4-lecture', status: 'started', confidence: 3 },
      { db },
    );
    expect(
      (
        await expectReadOnly(() =>
          loadRpgStudyResourceSummary(cs50Scope, 'week-4-lecture', { db }),
        )
      )?.rewardLabel,
    ).toBe('Task XP earned');
  });

  it('shows the remaining problem-set milestones and a separate once-only week bonus', async () => {
    const db = await createSeededRpgDatabase();
    const itemId = 'week-0-problem-set';
    expect(
      (await loadRpgStudyResourceSummary(cs50Scope, itemId, { db }))
        ?.rewardLabel,
    ).toBe(
      'Up to 220 XP remaining for this task · +150 XP when Week 0: Scratch is complete',
    );
    await upsertProgressAndAwardXp(
      { itemId, status: 'started', confidence: 3 },
      { catalogueId: cs50CatalogueId, policy: cs50Policy, db },
    );
    expect(
      (await loadRpgStudyResourceSummary(cs50Scope, itemId, { db }))
        ?.rewardLabel,
    ).toBe(
      'Up to 200 XP remaining for this task · +150 XP when Week 0: Scratch is complete',
    );
    await upsertProgressAndAwardXp(
      { itemId, status: 'submitted', confidence: 3 },
      { catalogueId: cs50CatalogueId, policy: cs50Policy, db },
    );
    expect(
      (await loadRpgStudyResourceSummary(cs50Scope, itemId, { db }))
        ?.rewardLabel,
    ).toBe('Up to 125 XP remaining for this task');
    await upsertProgressAndAwardXp(
      { itemId, status: 'accepted', confidence: 3 },
      { catalogueId: cs50CatalogueId, policy: cs50Policy, db },
    );
    expect(
      (
        await expectReadOnly(() =>
          loadRpgStudyResourceSummary(cs50Scope, itemId, { db }),
        )
      )?.rewardLabel,
    ).toBe('Task XP earned');
  });

  it('labels the shared final-project reward condition and removes it from both tasks once earned', async () => {
    const db = await createSeededRpgDatabase();
    const itemIds = ['final-project-readme', 'final-project-video-demo'];
    for (const itemId of itemIds) {
      expect(
        (
          await expectReadOnly(() =>
            loadRpgStudyResourceSummary(cs50Scope, itemId, { db }),
          )
        )?.rewardLabel,
      ).toBe(
        'Up to 200 XP remaining for this task (shared with README + demo)',
      );
      await upsertProgressAndAwardXp(
        { itemId, status: 'completed', confidence: 3 },
        { catalogueId: cs50CatalogueId, policy: cs50Policy, db },
      );
    }
    for (const itemId of itemIds) {
      expect(
        (await loadRpgStudyResourceSummary(cs50Scope, itemId, { db }))
          ?.rewardLabel,
      ).toBe('Task XP earned');
    }
    expect(
      (
        await loadRpgStudyResourceSummary(cs50Scope, 'final-project-build', {
          db,
        })
      )?.rewardLabel,
    ).toBe('Up to 250 XP remaining for this task');
    expect(
      (
        await loadRpgStudyResourceSummary(cs50Scope, 'final-project-submit50', {
          db,
        })
      )?.rewardLabel,
    ).toBe('No task XP');
  });

  it('loads a hub summary from real progress, sessions, XP, and course data without mutation', async () => {
    const db = await createSeededRpgDatabase();

    const hub = await expectReadOnly(() =>
      loadRpgHubSummary(cs50Scope, {
        db,
        now: createClock('2026-06-21T12:00:00.000Z'),
      }),
    );

    expect(hub.learnerName).toBe('Learner');
    expect(hub.identity).toEqual({
      classLabel: 'Generalist',
      guildLabel: 'Code Knights',
      pathLabel: 'CS Foundations',
      rankLabel: 'Initiate',
    });
    expect(hub.xpSummary.totalXp).toBe(10);
    expect(hub.xpSummary.level).toBe(1);
    expect(hub.xpSummary.levelProgressPercent).toBe(10);
    expect(hub.currentModule).toMatchObject({
      id: RPG_WEEK_FOUR_UNIT_ID,
      title: 'Week 4: Memory',
    });
    expect(hub.studySummary).toEqual({
      sessionCount: 1,
      totalMinutes: 35,
    });
    expect(hub.weeklyProgress).toEqual({
      completedRequiredItemCount: 1,
      savedProgressCount: 2,
      sessionCount: 1,
      totalMinutes: 35,
      weekEndDate: '2026-06-21',
      weekStartDate: '2026-06-15',
      xpEarned: 10,
    });
    expect(hub.recentActivity.map((activity) => activity.label)).toEqual([
      'Earned 10 XP - Fixture XP from an existing source event.',
      'Saved progress - Lecture 4: Memory (started)',
      'Saved study session - Lecture 4: Memory',
      'Saved progress - Lecture 0: Scratch (completed)',
    ]);
    expect(hub.courseProgress.requiredItemCount).toBeGreaterThan(0);
    expect(hub.recommendation.state).toBe('actionable');
    expect(hub.recommendation.quest).toMatchObject({
      id: 'week-4-lecture',
      status: 'started',
      title: 'Lecture 4: Memory',
      unitId: RPG_WEEK_FOUR_UNIT_ID,
      unitTitle: 'Week 4: Memory',
    });
    expect(hub.weekFour).toMatchObject({
      id: RPG_WEEK_FOUR_UNIT_ID,
      title: 'Week 4: Memory',
    });
  });

  it('loads course map and Week 4 module summaries from seeded course data without mutation', async () => {
    const db = await createSeededRpgDatabase();

    const courseMap = await expectReadOnly(() =>
      loadRpgCourseMapSummary(cs50Scope, { db }),
    );
    const weekFour = await expectReadOnly(() =>
      loadRpgModuleSummary(cs50Scope, RPG_WEEK_FOUR_UNIT_ID, { db }),
    );

    expect(courseMap.unitCount).toBeGreaterThan(10);
    expect(courseMap.weekFour).toMatchObject({
      id: RPG_WEEK_FOUR_UNIT_ID,
      title: 'Week 4: Memory',
    });
    expect(courseMap.currentModule).toMatchObject({
      id: RPG_WEEK_FOUR_UNIT_ID,
      title: 'Week 4: Memory',
    });
    expect(weekFour).toMatchObject({
      completionPercent: 0,
      id: RPG_WEEK_FOUR_UNIT_ID,
      officialLink: {
        label: 'Week 4 on CS50.harvard.edu',
        url: 'https://cs50.harvard.edu/x/weeks/4/',
      },
      title: 'Week 4: Memory',
    });
    expect(weekFour?.quests.map((quest) => quest.id)).toEqual([
      'week-4-lecture',
      'week-4-shorts',
      'week-4-section',
      'week-4-problem-set',
    ]);
    expect(weekFour?.quests[0]).toMatchObject({
      id: 'week-4-lecture',
      status: 'started',
      statusLabel: 'Started',
    });
  });

  it('loads a study resource summary for one real item without mutation', async () => {
    const db = await createSeededRpgDatabase();

    const resource = await expectReadOnly(() =>
      loadRpgStudyResourceSummary(cs50Scope, 'week-4-problem-set', { db }),
    );

    expect(resource).toMatchObject({
      estimatedMinutesLabel: '6h',
      itemId: 'week-4-problem-set',
      itemType: 'problem_set',
      officialLink: {
        label: 'Problem Set 4 on CS50.harvard.edu',
        url: 'https://cs50.harvard.edu/x/psets/4/',
      },
      progressStatus: 'not_started',
      required: true,
      statusLabel: 'Not started',
      title: 'Problem Set 4: Memory',
      typeLabel: 'Problem set',
      unitId: RPG_WEEK_FOUR_UNIT_ID,
      unitTitle: 'Week 4: Memory',
    });
    expect(resource?.savedProgress).toBeNull();
  });

  it('loads saved study resource progress notes without mutation', async () => {
    const db = await createSeededRpgDatabase();

    const resource = await expectReadOnly(() =>
      loadRpgStudyResourceSummary(cs50Scope, 'week-4-lecture', { db }),
    );

    expect(resource).toMatchObject({
      itemId: 'week-4-lecture',
      itemType: 'lecture',
      progressStatus: 'started',
      savedProgress: {
        completedAt: null,
        confidence: 2,
        evidenceText: null,
        notes: 'Working through memory.',
        startedAt: '2026-06-21T09:00:00.000Z',
        status: 'started',
      },
      statusLabel: 'Started',
      title: 'Lecture 4: Memory',
      unitId: RPG_WEEK_FOUR_UNIT_ID,
    });
  });

  it('loads Badge Gallery definitions and persisted unlocks without mutation', async () => {
    const db = await createSeededRpgDatabase();

    await upsertProgressAndAwardXp(
      {
        completedAt: '2026-06-21T10:00:00.000Z',
        confidence: 4,
        evidenceText: undefined,
        evidenceType: undefined,
        itemId: 'week-0-problem-set',
        notes: 'Completes Week 0 from the badge fixture.',
        startedAt: '2026-06-21T09:00:00.000Z',
        status: 'completed',
      },
      {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db,
        now: createClock('2026-06-21T10:05:00.000Z'),
      },
    );

    const badgeGallery = await expectReadOnly(() =>
      loadRpgBadgeGallerySummary({ db }),
    );

    expect(badgeGallery.totalBadgeCount).toBe(achievementDefinitions.length);
    expect(badgeGallery.earnedBadgeCount).toBeGreaterThan(0);
    expect(badgeGallery.lockedBadgeCount).toBe(
      achievementDefinitions.length - badgeGallery.earnedBadgeCount,
    );

    const firstStep = badgeGallery.badges.find(
      (badge) => badge.id === 'first-step',
    );
    expect(firstStep).toMatchObject({
      categoryLabel: 'Course progress',
      earned: true,
      earnedAt: '2026-06-21T10:05:00.000Z',
      requirementText: 'Complete your first task of any kind.',
      status: 'earned',
      statusLabel: 'Earned',
      title: 'First Step',
    });

    const courseComplete = badgeGallery.badges.find(
      (badge) => badge.id === 'course-complete',
    );
    expect(courseComplete).toMatchObject({
      earned: false,
      earnedAt: null,
      requirementText:
        'Complete every required item of every required unit in the course.',
      status: 'locked',
      statusLabel: 'Locked',
      title: 'Course Complete',
    });
  });

  it('loads Hero Profile from local progress, XP, sessions, and badges without mutation', async () => {
    const db = await createSeededRpgDatabase();

    await upsertProgressAndAwardXp(
      {
        completedAt: '2026-06-21T10:00:00.000Z',
        confidence: 4,
        evidenceText: undefined,
        evidenceType: undefined,
        itemId: 'week-0-problem-set',
        notes: 'Completes Week 0 from the hero fixture.',
        startedAt: '2026-06-21T09:00:00.000Z',
        status: 'completed',
      },
      {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db,
        now: createClock('2026-06-21T10:05:00.000Z'),
      },
    );

    const hero = await expectReadOnly(() =>
      loadRpgHeroProfileSummary(cs50Scope, {
        db,
        now: createClock('2026-06-21T12:00:00.000Z'),
      }),
    );

    expect(hero.learnerName).toBe('Learner');
    expect(hero.identity).toEqual({
      classLabel: 'Generalist',
      guildLabel: 'Code Knights',
      pathLabel: 'CS Foundations',
      rankLabel: 'Initiate',
    });
    expect(hero.courseProgress.completedRequiredItemCount).toBe(2);
    expect(hero.courseProgress.requiredItemCount).toBeGreaterThan(0);
    expect(hero.studySummary).toEqual({
      sessionCount: 1,
      totalMinutes: 35,
    });
    expect(hero.xpSummary.totalXp).toBeGreaterThan(10);
    expect(hero.xpSummary.level).toBeGreaterThanOrEqual(1);
    expect(hero.badges.earnedBadgeCount).toBeGreaterThan(0);
    expect(hero.badges.totalBadgeCount).toBe(achievementDefinitions.length);
    expect(hero.hasLocalActivity).toBe(true);
    expect(hero.recentActivity.length).toBeGreaterThan(0);
  });

  it('builds Hero Profile with a safe learner fallback when profile is missing', async () => {
    await createSeededRpgDatabase();

    if (testDatabase === null) {
      throw new Error('Test database was not created.');
    }

    const snapshot = await getDatabaseSnapshot({ db: testDatabase.db });
    const summary = buildRpgHeroProfileSummary({
      ...snapshot,
      learnerProfile: null,
    });

    expect(summary.learnerName).toBe('Learner');
    expect(summary.identity.pathLabel).toBe('CS Foundations');
    expect(summary.identity.classLabel).toBe('Generalist');
    expect(summary.identity.guildLabel).toBe('Code Knights');
  });

  it('returns null for missing module and resource IDs without mutation', async () => {
    const db = await createSeededRpgDatabase();

    await expect(
      expectReadOnly(() =>
        loadRpgModuleSummary(cs50Scope, 'missing-week', { db }),
      ),
    ).resolves.toBeNull();
    await expect(
      expectReadOnly(() =>
        loadRpgStudyResourceSummary(cs50Scope, 'missing-resource', { db }),
      ),
    ).resolves.toBeNull();
  });
});
