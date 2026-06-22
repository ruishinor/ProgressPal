import { afterEach, describe, expect, it } from 'vitest';

import {
  loadRpgBadgeGallerySummary,
  loadRpgCourseMapSummary,
  loadRpgFocusSessionSummary,
  loadRpgHubSummary,
  loadRpgJourneyLogSummary,
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

  it('loads Journey Log activity from progress, sessions, and XP without mutation', async () => {
    const db = await createSeededRpgDatabase();

    const log = await expectReadOnly(() => loadRpgJourneyLogSummary({ db }));

    expect(log.totals).toEqual({
      activityCount: 4,
      progressCount: 2,
      sessionCount: 1,
      totalMinutes: 35,
      totalXp: 10,
      xpTransactionCount: 1,
    });
    expect(log.activities.map((activity) => activity.typeLabel)).toEqual([
      'Study session finished',
      'XP awarded',
      'Progress saved',
      'Progress saved',
    ]);
    expect(log.activities[0]).toMatchObject({
      contextLabel: 'Week 4: Memory - Lecture 4: Memory',
      detail: '35 min watching',
      note: null,
      title: 'Study session finished',
      type: 'study_session',
    });
    expect(log.activities[1]).toMatchObject({
      contextLabel: null,
      detail: '10 XP - Fixture XP from an existing source event.',
      note: null,
      title: 'XP awarded',
      type: 'xp',
    });
    expect(log.activities[2]).toMatchObject({
      contextLabel: 'Week 4: Memory - Lecture 4: Memory',
      detail: 'Lecture 4: Memory saved as Started',
      itemId: 'week-4-lecture',
      itemTitle: 'Lecture 4: Memory',
      note: 'Working through memory.',
      title: 'Progress saved',
      type: 'progress',
      unitId: RPG_WEEK_FOUR_UNIT_ID,
      unitTitle: 'Week 4: Memory',
    });
    expect(log.activities[2].links).toEqual([
      {
        href: '/rpg/resource/week-4-lecture',
        label: 'Open resource',
      },
      {
        href: '/rpg/focus?itemId=week-4-lecture',
        label: 'Focus',
      },
      {
        href: '/rpg/week/week-4',
        label: 'Open week',
      },
    ]);
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
