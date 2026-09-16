import { afterEach, describe, expect, it } from 'vitest';

import {
  buildRpgHeroProfileSummary,
  loadRpgBadgeGallerySummary,
  loadRpgCourseMapSummary,
  loadRpgFocusSessionSummary,
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
  upsertProgress,
  upsertProgressAndAwardXp,
} from '@/lib/db';
import { achievementDefinitions } from '@/lib/achievements';
import { bundledCourseSeed } from '@/seed';
import {
  createClock,
  createTestDatabase,
  type TestDatabaseContext,
} from '../../db/testDatabase';

describe('RPG read models', () => {
  let testDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
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

  it('previews unearned task XP consistently without writing or re-offering earned rewards', async () => {
    const db = await createSeededRpgDatabase();
    const resource = await expectReadOnly(() =>
      loadRpgStudyResourceSummary('week-4-lecture', { db }),
    );
    expect(resource?.rewardLabel).toBe('+40 XP on completion');
    expect((await loadRpgHubSummary({ db })).continueQuest?.rewardLabel).toBe(
      resource?.rewardLabel,
    );
    expect(
      (await loadRpgModuleSummary('week-4', { db }))?.quests.find(
        (quest) => quest.id === 'week-4-lecture',
      )?.rewardLabel,
    ).toBe(resource?.rewardLabel);
    await upsertProgressAndAwardXp(
      { itemId: 'week-4-lecture', status: 'completed', confidence: 3 },
      { db },
    );
    // Moving progress backwards never makes the once-only award available again.
    await upsertProgress(
      { itemId: 'week-4-lecture', status: 'started', confidence: 3 },
      { db },
    );
    expect(
      (
        await expectReadOnly(() =>
          loadRpgStudyResourceSummary('week-4-lecture', { db }),
        )
      )?.rewardLabel,
    ).toBe('Task XP earned');
  });

  it('shows the remaining problem-set milestones and a separate once-only week bonus', async () => {
    const db = await createSeededRpgDatabase();
    const itemId = 'week-0-problem-set';
    expect(
      (await loadRpgStudyResourceSummary(itemId, { db }))?.rewardLabel,
    ).toBe('+220 XP through acceptance · +150 XP week completion bonus');
    await upsertProgressAndAwardXp(
      { itemId, status: 'started', confidence: 3 },
      { db },
    );
    expect(
      (await loadRpgStudyResourceSummary(itemId, { db }))?.rewardLabel,
    ).toBe('+200 XP through acceptance · +150 XP week completion bonus');
    await upsertProgressAndAwardXp(
      { itemId, status: 'submitted', confidence: 3 },
      { db },
    );
    expect(
      (await loadRpgStudyResourceSummary(itemId, { db }))?.rewardLabel,
    ).toBe('+125 XP through acceptance');
    await upsertProgressAndAwardXp(
      { itemId, status: 'accepted', confidence: 3 },
      { db },
    );
    expect(
      (await expectReadOnly(() => loadRpgStudyResourceSummary(itemId, { db })))
        ?.rewardLabel,
    ).toBe('Task XP earned');
  });

  it('labels the shared final-project reward condition and removes it from both tasks once earned', async () => {
    const db = await createSeededRpgDatabase();
    const itemIds = ['final-project-readme', 'final-project-video-demo'];
    for (const itemId of itemIds) {
      expect(
        (
          await expectReadOnly(() =>
            loadRpgStudyResourceSummary(itemId, { db }),
          )
        )?.rewardLabel,
      ).toBe('+200 XP when README + demo are complete (shared reward)');
      await upsertProgressAndAwardXp(
        { itemId, status: 'completed', confidence: 3 },
        { db },
      );
    }
    for (const itemId of itemIds) {
      expect(
        (await loadRpgStudyResourceSummary(itemId, { db }))?.rewardLabel,
      ).toBe('Task XP earned');
    }
    expect(
      (await loadRpgStudyResourceSummary('final-project-build', { db }))
        ?.rewardLabel,
    ).toBe('+250 XP on completion');
    expect(
      (await loadRpgStudyResourceSummary('final-project-submit50', { db }))
        ?.rewardLabel,
    ).toBe('No task XP');
  });

  it('loads a hub summary from real progress, sessions, XP, and course data without mutation', async () => {
    const db = await createSeededRpgDatabase();

    const hub = await expectReadOnly(() =>
      loadRpgHubSummary({
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
    expect(hub.continueQuest).toMatchObject({
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
      loadRpgCourseMapSummary({ db }),
    );
    const weekFour = await expectReadOnly(() =>
      loadRpgModuleSummary(RPG_WEEK_FOUR_UNIT_ID, { db }),
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
      loadRpgStudyResourceSummary('week-4-problem-set', { db }),
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
      loadRpgStudyResourceSummary('week-4-lecture', { db }),
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

  it('loads focus session setup for selected and manual focus states without mutation', async () => {
    const db = await createSeededRpgDatabase();

    const selectedFocus = await expectReadOnly(() =>
      loadRpgFocusSessionSummary('week-4-lecture', { db }),
    );
    const manualFocus = await expectReadOnly(() =>
      loadRpgFocusSessionSummary(null, { db }),
    );

    expect(selectedFocus.selectedResource).toMatchObject({
      itemId: 'week-4-lecture',
      title: 'Lecture 4: Memory',
      unitId: RPG_WEEK_FOUR_UNIT_ID,
      unitTitle: 'Week 4: Memory',
    });
    expect(selectedFocus.items.map((item) => item.id)).toContain(
      'week-4-lecture',
    );
    expect(selectedFocus.units.map((unit) => unit.id)).toContain(
      RPG_WEEK_FOUR_UNIT_ID,
    );
    expect(manualFocus.requestedItemId).toBeNull();
    expect(manualFocus.selectedResource).toBeNull();
    expect(manualFocus.items.length).toBeGreaterThan(0);
    expect(manualFocus.units.length).toBeGreaterThan(0);
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
        db,
        now: createClock('2026-06-21T10:05:00.000Z'),
      },
    );

    const hero = await expectReadOnly(() =>
      loadRpgHeroProfileSummary({
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
      expectReadOnly(() => loadRpgModuleSummary('missing-week', { db })),
    ).resolves.toBeNull();
    await expect(
      expectReadOnly(() =>
        loadRpgStudyResourceSummary('missing-resource', { db }),
      ),
    ).resolves.toBeNull();
  });
});
