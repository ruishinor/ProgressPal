import { afterEach, describe, expect, it } from 'vitest';

import {
  loadRpgCourseMapSummary,
  loadRpgHeroProfileSummary,
  loadRpgHubSummary,
  loadRpgHudSummary,
  loadRpgModuleSummary,
  loadRpgStudyResourceSummary,
} from '@/features/rpg/model/readModels';
import {
  getDatabaseSnapshot,
  initializeDatabase,
  readAchievementsSurfaceData,
  readStudySessionLedgerRows,
  readStudySessionsSurfaceData,
  upsertProgressAndAwardXp,
} from '@/lib/db';
import type { ProgressPalDatabase } from '@/lib/db/database';
import { MediaProgressEventSchema, StudySessionSchema } from '@/lib/domain';
import { SchemaValidationError } from '@/lib/validation';
import { bundledCourseSeed } from '@/seed';
import {
  createTestDatabase,
  type TestDatabaseContext,
} from '../../db/testDatabase';
import { cs50Policy } from '../../programmes/cs50Policy';

const now = '2026-09-21T12:00:00.000Z';
type History = 'media' | 'xp' | 'sessions';
type Reader = (db: ProgressPalDatabase, history: History) => Promise<unknown>;

const readers: Record<string, Reader> = {
  Map: (db) => loadRpgCourseMapSummary({ db }),
  Module: (db) => loadRpgModuleSummary('week-0', { db }),
  Resource: (db, history) =>
    loadRpgStudyResourceSummary(
      history === 'xp' ? 'week-0-problem-set' : 'week-0-lecture',
      { db },
    ),
  HUD: (db) => loadRpgHudSummary({ db }),
  Hub: (db) => loadRpgHubSummary({ db, now: () => now }),
  Hero: (db) => loadRpgHeroProfileSummary({ db }),
  Focus: (db) =>
    readStudySessionsSurfaceData(
      () => ({ context: null, projectSession: (session) => session.id }),
      { db },
    ),
  'Focus refresh': (db) =>
    readStudySessionLedgerRows((session) => session.id, { db }),
  Badges: (db) => readAchievementsSurfaceData({ policy: cs50Policy, db }),
};

const cases = [
  ...['Map', 'Module', 'Resource', 'HUD', 'Hub', 'Hero'].flatMap((surface) =>
    (['media', 'xp'] as const).map((history) => ({ surface, history })),
  ),
  ...['Hub', 'Hero', 'Focus', 'Focus refresh'].map((surface) => ({
    surface,
    history: 'sessions' as const,
  })),
  { surface: 'Badges', history: 'xp' as const },
];

describe('A7 passive cursor error propagation', () => {
  const databases: TestDatabaseContext[] = [];
  afterEach(async () => {
    await Promise.all(databases.splice(0).map((context) => context.cleanup()));
  });

  async function fixture() {
    const context = createTestDatabase('a7-cursor-errors');
    databases.push(context);
    const { db } = context;
    await initializeDatabase({ db, seed: bundledCourseSeed, now: () => now });
    const save = await upsertProgressAndAwardXp(
      { itemId: 'week-0-problem-set', status: 'started', confidence: 3 },
      { policy: cs50Policy, db, now: () => now },
    );
    const award = save.awardedTransactions[0];
    const asset = await db.contentAssets
      .where('itemId')
      .equals('week-0-lecture')
      .first();
    if (!award || !asset)
      throw new Error('A7 fixture requires a real award and lecture asset');
    await db.mediaProgressEvents.bulkPut(
      ['a7-media-a', 'a7-media-z'].map((id) =>
        MediaProgressEventSchema.parse({
          id,
          itemId: asset.itemId,
          assetId: asset.id,
          startSecond: 0,
          endSecond: 60,
          watchedSeconds: 60,
          completedSlice: false,
          stoppedBecause: 'time_box_finished',
          energyBefore: 3,
          energyAfter: 3,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );
    await db.studySessions.bulkPut(
      ['a7-session-a', 'a7-session-z'].map((id) =>
        StudySessionSchema.parse({
          id,
          itemId: asset.itemId,
          unitId: 'week-0',
          startedAt: now,
          endedAt: now,
          durationMinutes: 25,
          mode: 'coding',
          blockers: [],
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );
    return { db, award };
  }

  it.each(cases)(
    '$surface rejects malformed $history rows instead of returning partial data',
    async ({ surface, history }) => {
      const { db, award } = await fixture();
      const read = readers[surface];
      if (!read) throw new Error(`Missing A7 reader ${surface}`);
      // Exercise the same real scoped read successfully before corrupting a row
      // that it must visit. No mocked loader or synthetic rejection is involved.
      await expect(read(db, history)).resolves.toBeDefined();
      if (history === 'xp')
        await db.xpTransactions.update(award.id, { xp: -1 });
      if (history === 'media')
        await db.mediaProgressEvents.update('a7-media-z', {
          watchedSeconds: -1,
        });
      if (history === 'sessions')
        await db.studySessions.update('a7-session-a', { durationMinutes: -1 });

      // The deliberate completeness boundary already rejects this same data.
      await expect(getDatabaseSnapshot({ db })).rejects.toBeInstanceOf(
        SchemaValidationError,
      );
      await expect(
        read(db, history),
        `A7_${surface}_CURSOR_VALIDATION_ERROR_MUST_PROPAGATE`,
      ).rejects.toBeInstanceOf(SchemaValidationError);
    },
  );

  it('propagates a Focus projection error instead of resolving a truncated visible ledger', async () => {
    const { db } = await fixture();
    const error = new Error('A7 synthetic projection failure');
    await expect(
      readStudySessionLedgerRows(
        () => {
          throw error;
        },
        { db },
      ),
    ).rejects.toBe(error);
  });
});
