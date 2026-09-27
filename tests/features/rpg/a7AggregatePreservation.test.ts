import { afterEach, describe, expect, it } from 'vitest';

import {
  buildRpgHeroProfileSummary,
  buildRpgHubSummary,
  loadRpgHeroProfileSummary,
  loadRpgHubSummary,
  loadRpgHudSummary,
  loadRpgStudyResourceSummary,
  projectRpgHudSummary,
} from '@/features/rpg/model/readModels';
import {
  addStudySessionAndAwardXp,
  getDatabaseSnapshot,
  initializeDatabase,
  readAchievementsSurfaceData,
  upsertProgressAndAwardXp,
} from '@/lib/db';
import {
  createProgressPalDatabase,
  type ProgressPalDatabase,
} from '@/lib/db/database';
import { bundledCourseSeed } from '@/seed';
import { installDatabaseAccessProbe } from '../../db/accessProbe';
import {
  createTestDatabase,
  type TestDatabaseContext,
} from '../../db/testDatabase';
import { cs50Policy } from '../../programmes/cs50Policy';

const now = '2026-09-21T12:00:00.000Z';
type Snapshot = Awaited<ReturnType<typeof getDatabaseSnapshot>>;
const surfaces = [
  {
    name: 'HUD',
    load: loadRpgHudSummary,
    build: (snapshot: Snapshot) =>
      projectRpgHudSummary(buildRpgHubSummary(snapshot, now)),
    budget: 10,
  },
  {
    name: 'Hub',
    load: loadRpgHubSummary,
    build: (snapshot: Snapshot) => buildRpgHubSummary(snapshot, now),
    budget: 11,
  },
  {
    name: 'Hero',
    load: loadRpgHeroProfileSummary,
    build: (snapshot: Snapshot) => buildRpgHeroProfileSummary(snapshot, now),
    budget: 11,
  },
];

describe('A7 aggregate preservation', () => {
  const contexts: TestDatabaseContext[] = [];
  const readers: ProgressPalDatabase[] = [];
  afterEach(async () => {
    for (const reader of readers.splice(0)) reader.close();
    await Promise.all(contexts.splice(0).map((context) => context.cleanup()));
  });

  async function fixture() {
    const context = createTestDatabase('a7-preservation');
    contexts.push(context);
    await initializeDatabase({
      db: context.db,
      seed: bundledCourseSeed,
      now: () => now,
    });
    return context;
  }

  function makeReader(context: TestDatabaseContext) {
    const reader = createProgressPalDatabase(context.name);
    readers.push(reader);
    return reader;
  }

  it.each(surfaces)(
    '$name stays coherent across an atomic profile and XP update',
    async (surface) => {
      const context = await fixture();
      const beforeSnapshot = await getDatabaseSnapshot({ db: context.db });
      const profile = beforeSnapshot.learnerProfile;
      if (!profile) throw new Error('A7 profile missing');
      let announce!: () => void;
      let release!: () => void;
      const reached = new Promise<void>((resolve) => {
        announce = resolve;
      });
      const barrier = new Promise<void>((resolve) => {
        release = resolve;
      });
      let paused = false;
      const reader = makeReader(context);
      const probe = installDatabaseAccessProbe(reader, {
        beforeCursor(op) {
          if (!paused && op.store === 'media_progress_events') {
            paused = true;
            announce();
            return barrier;
          }
        },
      });
      const read = surface.load({ db: reader, now: () => now });
      let write: Promise<void> | undefined;
      let state: 'pending' | 'fulfilled' | 'rejected' = 'pending';
      let writeError: unknown;
      try {
        await reached;
        write = context.db
          .transaction(
            'rw',
            [context.db.learnerProfile, context.db.xpTransactions],
            async () => {
              await context.db.learnerProfile.update(profile.id, {
                displayName: 'A7 changed learner',
              });
              await context.db.xpTransactions.add({
                id: 'a7-atomic-xp',
                sourceType: 'a7-fixture',
                sourceId: 'a7-atomic-source',
                xp: 400,
                reason: 'A7 atomic writer',
                awardedAt: now,
                createdAt: now,
                updatedAt: now,
              });
            },
          )
          .then(
            () => {
              state = 'fulfilled';
            },
            (error: unknown) => {
              state = 'rejected';
              writeError = error;
            },
          );
        await Promise.race([
          write,
          new Promise<void>((resolve) => {
            setTimeout(resolve, 25);
          }),
        ]);
        expect(state).toBe('pending');
        release();
        expect(await read).toEqual(surface.build(beforeSnapshot));
        const access = probe.snapshot();
        expect(access.transactions).toHaveLength(1);
        expect(access.transactions[0]?.mode).toBe('readonly');
        expect(access.transactions[0]?.stores).toEqual(
          [
            'content_assets',
            'content_slices',
            'course_items',
            'course_units',
            'learner_profile',
            'media_progress_events',
            'progress_entries',
            'resume_points',
            'xp_transactions',
            ...(surface.name === 'HUD' ? [] : ['study_sessions']),
            ...(surface.name === 'Hero' ? ['achievement_unlocks'] : []),
          ].sort(),
        );
        expect(access.writesObserved).toBe(0);
        await write;
        expect(state).toBe('fulfilled');
        expect(writeError).toBeUndefined();
        const afterSnapshot = await getDatabaseSnapshot({ db: context.db });
        const after = await surface.load({ db: reader, now: () => now });
        expect(after).toEqual(surface.build(afterSnapshot));
        expect(after).not.toEqual(surface.build(beforeSnapshot));
        console.info(
          'A7_COHERENCE',
          JSON.stringify({
            surface: surface.name,
            barrierUsed: paused,
            competingWriterBlocked: true,
            access,
          }),
        );
      } finally {
        release();
        await Promise.allSettled([read, ...(write ? [write] : [])]);
      }
    },
  );

  it.each(surfaces)(
    '$name has constant queries at 1x and 10x catalogue and asset cardinality',
    async (surface) => {
      const queryCounts: number[] = [];
      for (const factor of [1, 10]) {
        const context = await fixture();
        const base = await getDatabaseSnapshot({ db: context.db });
        for (let copy = 1; copy < factor; copy += 1) {
          const suffix = `-a7-copy-${copy}`;
          await context.db.transaction(
            'rw',
            [
              context.db.courseUnits,
              context.db.courseItems,
              context.db.contentAssets,
              context.db.contentSlices,
            ],
            async () => {
              await context.db.courseUnits.bulkAdd(
                base.courseUnits.map((row) => ({
                  ...row,
                  id: row.id + suffix,
                })),
              );
              await context.db.courseItems.bulkAdd(
                base.courseItems.map((row) => ({
                  ...row,
                  id: row.id + suffix,
                  unitId: row.unitId + suffix,
                })),
              );
              await context.db.contentAssets.bulkAdd(
                base.contentAssets.map((row) => ({
                  ...row,
                  id: row.id + suffix,
                  itemId: row.itemId + suffix,
                })),
              );
              await context.db.contentSlices.bulkAdd(
                base.contentSlices.map((row) => ({
                  ...row,
                  id: row.id + suffix,
                  itemId: row.itemId + suffix,
                  assetId: row.assetId + suffix,
                })),
              );
            },
          );
        }
        const snapshot = await getDatabaseSnapshot({ db: context.db });
        expect(snapshot.courseItems.length).toBe(
          base.courseItems.length * factor,
        );
        expect(snapshot.courseUnits.length).toBe(
          base.courseUnits.length * factor,
        );
        expect(snapshot.contentAssets.length).toBe(
          base.contentAssets.length * factor,
        );
        expect(snapshot.contentSlices.length).toBe(
          base.contentSlices.length * factor,
        );
        const reader = makeReader(context);
        const probe = installDatabaseAccessProbe(reader);
        expect(await surface.load({ db: reader, now: () => now })).toEqual(
          surface.build(snapshot),
        );
        const access = probe.snapshot();
        queryCounts.push(access.operations.length);
        expect(access.operations.length).toBeLessThanOrEqual(surface.budget);
        expect(access.transactions).toHaveLength(1);
        expect(access.writesObserved).toBe(0);
        console.info(
          'A7_CATALOGUE_SCALE',
          JSON.stringify({
            surface: surface.name,
            factor,
            items: snapshot.courseItems.length,
            assets: snapshot.contentAssets.length,
            access,
          }),
        );
      }
      expect(queryCounts[1]).toBe(queryCounts[0]);
    },
  );

  it.each(['Resource', 'Focus'] as const)(
    '%s save results match Hub/Badges without passive compensation or repeat awards',
    async (surface) => {
      const context = await fixture();
      const options = { db: context.db, now: () => now };
      const mutate = () =>
        surface === 'Resource'
          ? upsertProgressAndAwardXp(
              {
                itemId: 'week-0-problem-set',
                status: 'accepted',
                confidence: 5,
                evidenceText: 'A7 synthetic completed work',
              },
              { ...options, policy: cs50Policy },
            )
          : addStudySessionAndAwardXp(
              {
                id: 'a7-saved-focus',
                unitId: 'week-0',
                itemId: 'week-0-lecture',
                startedAt: '2026-09-21T10:00:00.000Z',
                endedAt: '2026-09-21T10:25:00.000Z',
                durationMinutes: 25,
                mode: 'debugging',
              },
              { ...options, policy: cs50Policy },
            );
      const result = await mutate();
      expect(result.awardedTransactions.length).toBeGreaterThan(0);
      expect(result.unlockedAchievements.length).toBeGreaterThan(0);
      const saved = await getDatabaseSnapshot(options);
      const reader = makeReader(context);
      const probe = installDatabaseAccessProbe(reader);
      const hub = await loadRpgHubSummary({ db: reader, now: () => now });
      const badges = await readAchievementsSurfaceData({
        policy: cs50Policy,
        db: reader,
      });
      expect(badges.xpSummary).toEqual(result.xpSummary);
      expect(hub.xpSummary).toMatchObject({
        totalXp: result.xpSummary.totalXp,
        level: result.xpSummary.level,
        xpToNextLevel: result.xpSummary.xpToNextLevel,
      });
      expect(hub).toEqual(buildRpgHubSummary(saved, now));
      for (const unlock of result.unlockedAchievements) {
        expect(
          badges.view.achievements.find(
            (badge) => badge.id === unlock.achievementId,
          )?.unlocked,
        ).toBe(true);
      }
      if (surface === 'Resource') {
        const resource = await loadRpgStudyResourceSummary(
          'week-0-problem-set',
          { db: reader },
        );
        expect(resource?.progressStatus).toBe('accepted');
      } else {
        expect(hub.studySummary).toMatchObject({
          sessionCount: 1,
          totalMinutes: 25,
        });
      }
      expect(probe.snapshot().writesObserved).toBe(0);
      expect(await getDatabaseSnapshot(options)).toEqual(saved);
      const repeated = await mutate();
      expect(repeated.awardedTransactions).toEqual([]);
      expect(repeated.unlockedAchievements).toEqual([]);
      expect(repeated.xpSummary).toEqual(result.xpSummary);
      const final = await getDatabaseSnapshot(options);
      expect(final.xpTransactions).toEqual(saved.xpTransactions);
      expect(final.achievementUnlocks).toEqual(saved.achievementUnlocks);
    },
  );
});
