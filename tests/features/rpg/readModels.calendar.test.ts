import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildCourseMap } from '@/features/course/model';
import { buildInsightsModel } from '@/features/insights/model';
import { buildRpgHubSummary } from '@/features/rpg';
import type { DatabaseSnapshot } from '@/lib/db';
import { bundledCourseSeed } from '@/seed';

const seedTimestamp = '2026-01-01T12:00:00.000Z';

function createSnapshot(instants: readonly string[]): DatabaseSnapshot {
  const courseItems = bundledCourseSeed.units.flatMap((unit) =>
    unit.items.map((item) => ({
      ...item,
      unitId: unit.id,
      createdAt: seedTimestamp,
      updatedAt: seedTimestamp,
    })),
  );
  const requiredItems = courseItems.filter((item) => item.required);

  return {
    achievementDefinitions: [],
    achievementUnlocks: [],
    appMeta: null,
    backups: [],
    catalogueVersions: [],
    programmeEnrolments: [],
    learnerEvidence: [],
    lessonPositions: [],
    contentAssets: [],
    contentSlices: [],
    courseItems,
    courseUnits: bundledCourseSeed.units.map((unit) => ({
      id: unit.id,
      courseId: bundledCourseSeed.courseId,
      title: unit.title,
      order: unit.order,
      type: unit.type,
      sourceYear: unit.sourceYear,
      required: unit.required,
      createdAt: seedTimestamp,
      updatedAt: seedTimestamp,
    })),
    learnerProfile: null,
    mediaProgressEvents: [],
    progressEntries: instants.map((instant, index) => ({
      id: `progress-${index}`,
      itemId: requiredItems[index]!.id,
      status: 'completed',
      confidence: 3,
      completedAt: instant,
      createdAt: seedTimestamp,
      updatedAt: instant,
    })),
    resumePoints: [],
    studySessions: instants.map((instant, index) => ({
      id: `session-${index}`,
      itemId: requiredItems[index]!.id,
      unitId: requiredItems[index]!.unitId,
      startedAt: instant,
      endedAt: new Date(Date.parse(instant) + 25 * 60_000).toISOString(),
      durationMinutes: 25,
      mode: 'watching',
      blockers: [],
      createdAt: instant,
      updatedAt: instant,
    })),
    xpTransactions: instants.map((instant, index) => ({
      id: `xp-${index}`,
      sourceId: `session-${index}`,
      programmeId: 'cs50x',
      sourceType: 'study_session',
      reason: 'Synthetic saved-session award',
      xp: 2 ** index,
      awardedAt: instant,
      createdAt: instant,
      updatedAt: instant,
    })),
  };
}

function buildSummaries(snapshot: DatabaseSnapshot, now: string) {
  const before = structuredClone(snapshot);
  const hub = buildRpgHubSummary(snapshot, now);
  const insights = buildInsightsModel(
    {
      achievements: { achievements: [], totalCount: 0, unlockedCount: 0 },
      courseMap: buildCourseMap(
        snapshot.courseUnits,
        snapshot.courseItems,
        snapshot.progressEntries,
      ),
      mediaProgressEvents: snapshot.mediaProgressEvents,
      studySessions: snapshot.studySessions,
      xpTransactions: snapshot.xpTransactions,
    },
    { now },
  );
  const insightWeek = insights.weeklyActivity.weeks.find(
    (week) => week.weekKey === hub.weeklyProgress.weekStartDate,
  );

  expect(hub.weeklyProgress.totalMinutes).toBe(insightWeek?.studyMinutes ?? 0);
  expect(hub.weeklyProgress.xpEarned).toBe(insightWeek?.xpEarned ?? 0);
  expect(snapshot).toEqual(before);

  return { hub, insights };
}

describe('RPG and Insights local Monday weeks', () => {
  // Vitest runs this file in its isolated fork. Restore the actual process TZ
  // after every case so neither another case nor the remaining suite inherits it.
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('puts the reviewed Oslo 25-minute session in the week beginning September 14', () => {
    vi.stubEnv('TZ', 'Europe/Oslo');
    const instant = '2026-09-13T22:30:00.000Z';
    expect(new Date(instant).getTimezoneOffset()).toBe(-120);
    const snapshot = createSnapshot([instant]);
    const { hub, insights } = buildSummaries(snapshot, instant);

    expect(insights.weeklyActivity.weeks).toEqual([
      expect.objectContaining({ weekKey: '2026-09-14', studyMinutes: 25 }),
    ]);
    expect(hub.weeklyProgress).toEqual({
      completedRequiredItemCount: 1,
      savedProgressCount: 1,
      sessionCount: 1,
      totalMinutes: 25,
      weekEndDate: '2026-09-20',
      weekStartDate: '2026-09-14',
      xpEarned: 1,
    });
  });

  it('preserves session-start, award-time, and progress-snapshot attribution as different metrics', () => {
    vi.stubEnv('TZ', 'Europe/Oslo');
    const sessionStart = '2026-09-13T21:50:00.000Z';
    const savedAt = '2026-09-13T22:15:00.000Z';
    expect(new Date(sessionStart).getTimezoneOffset()).toBe(-120);
    const snapshot = createSnapshot([sessionStart]);
    snapshot.progressEntries[0]!.updatedAt = savedAt;
    snapshot.xpTransactions[0]!.awardedAt = savedAt;
    const { hub, insights } = buildSummaries(snapshot, savedAt);

    expect(hub.weeklyProgress).toMatchObject({
      completedRequiredItemCount: 1,
      savedProgressCount: 1,
      sessionCount: 0,
      totalMinutes: 0,
      weekStartDate: '2026-09-14',
      xpEarned: 1,
    });
    // Hub describes currently completed progress rows updated this week;
    // Insights completion awards describe immutable milestone awards instead.
    expect(insights.completionAwards.totalItemAwards).toBe(0);
    expect(
      buildSummaries(snapshot, sessionStart).hub.weeklyProgress,
    ).toMatchObject({
      completedRequiredItemCount: 0,
      savedProgressCount: 0,
      sessionCount: 1,
      totalMinutes: 25,
      weekStartDate: '2026-09-07',
      xpEarned: 0,
    });
  });

  it.each([
    {
      name: 'Oslo positive UTC offset',
      timezone: 'Europe/Oslo',
      start: '2026-09-13T22:00:00.000Z',
      nextStart: '2026-09-20T22:00:00.000Z',
      startDate: '2026-09-14',
      endDate: '2026-09-20',
      offset: -120,
      elapsedHours: 168,
    },
    {
      name: 'Los Angeles negative UTC offset',
      timezone: 'America/Los_Angeles',
      start: '2026-09-14T07:00:00.000Z',
      nextStart: '2026-09-21T07:00:00.000Z',
      startDate: '2026-09-14',
      endDate: '2026-09-20',
      offset: 420,
      elapsedHours: 168,
    },
    {
      name: 'Oslo spring DST transition',
      timezone: 'Europe/Oslo',
      start: '2026-03-22T23:00:00.000Z',
      nextStart: '2026-03-29T22:00:00.000Z',
      startDate: '2026-03-23',
      endDate: '2026-03-29',
      offset: -60,
      elapsedHours: 167,
    },
    {
      name: 'Oslo autumn DST transition',
      timezone: 'Europe/Oslo',
      start: '2026-10-18T22:00:00.000Z',
      nextStart: '2026-10-25T23:00:00.000Z',
      startDate: '2026-10-19',
      endDate: '2026-10-25',
      offset: -120,
      elapsedHours: 169,
    },
  ])(
    'uses [local Monday, next Monday) for every weekly field: $name',
    (fixture) => {
      vi.stubEnv('TZ', fixture.timezone);
      const start = Date.parse(fixture.start);
      const nextStart = Date.parse(fixture.nextStart);
      expect(new Date(start).getTimezoneOffset()).toBe(fixture.offset);
      expect(new Date(start).getDay()).toBe(1);
      expect(new Date(start).getHours()).toBe(0);
      expect(new Date(nextStart).getDay()).toBe(1);
      expect(new Date(nextStart).getHours()).toBe(0);
      expect((nextStart - start) / 3_600_000).toBe(fixture.elapsedHours);

      const beforeStart = new Date(start - 1).toISOString();
      const snapshot = createSnapshot([
        beforeStart,
        fixture.start,
        new Date(nextStart - 1).toISOString(),
        fixture.nextStart,
      ]);
      const { hub, insights } = buildSummaries(snapshot, fixture.start);

      expect(hub.weeklyProgress).toEqual({
        completedRequiredItemCount: 2,
        savedProgressCount: 2,
        sessionCount: 2,
        totalMinutes: 50,
        weekEndDate: fixture.endDate,
        weekStartDate: fixture.startDate,
        xpEarned: 6,
      });
      expect(insights.weeklyActivity.weeks).toHaveLength(3);

      // A session crossing midnight is still counted whole at its start. The
      // identical records therefore partition once across the three weeks.
      const previous = buildSummaries(snapshot, beforeStart).hub.weeklyProgress;
      const next = buildSummaries(snapshot, fixture.nextStart).hub
        .weeklyProgress;
      expect(previous).toMatchObject({
        completedRequiredItemCount: 1,
        savedProgressCount: 1,
        sessionCount: 1,
        totalMinutes: 25,
        xpEarned: 1,
      });
      expect(next).toMatchObject({
        completedRequiredItemCount: 1,
        savedProgressCount: 1,
        sessionCount: 1,
        totalMinutes: 25,
        xpEarned: 8,
      });
    },
  );
});
