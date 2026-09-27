import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildRpgHeroProfileSummary,
  buildRpgHubSummary,
  loadRpgHeroProfileSummary,
  loadRpgHubSummary,
  loadRpgHudSummary,
  projectRpgHudSummary,
} from '@/features/rpg/model/readModels';
import {
  getDatabaseSnapshot,
  getRpgHubReadData,
  initializeDatabase,
} from '@/lib/db';
import { createProgressPalDatabase } from '@/lib/db/database';
import type {
  MediaProgressEvent,
  StudySession,
  XpTransaction,
} from '@/lib/domain';
import { bundledCourseSeed } from '@/seed';
import {
  createTestDatabase,
  type TestDatabaseContext,
} from '../../db/testDatabase';
import {
  installDatabaseAccessProbe,
  type DatabaseAccessSnapshot,
} from '../../db/accessProbe';
import { cs50Policy } from '../../programmes/cs50Policy';

const fixedNow = '2026-09-21T12:00:00.000Z';

const hudStores = [
  'content_assets',
  'content_slices',
  'course_items',
  'course_units',
  'learner_profile',
  'media_progress_events',
  'progress_entries',
  'resume_points',
  'xp_transactions',
].sort();

const hubStores = [...hudStores, 'study_sessions'].sort();
const heroStores = [...hubStores, 'achievement_unlocks'].sort();

const hudBudgetByStore: Record<string, number> = {
  content_assets: 1,
  content_slices: 1,
  course_items: 1,
  course_units: 1,
  learner_profile: 1,
  media_progress_events: 1,
  progress_entries: 1,
  resume_points: 1,
  xp_transactions: 2,
};

const hubBudgetByStore: Record<string, number> = {
  ...hudBudgetByStore,
  study_sessions: 1,
};

const heroBudgetByStore: Record<string, number> = {
  achievement_unlocks: 1,
  content_assets: 1,
  content_slices: 1,
  course_items: 1,
  course_units: 1,
  learner_profile: 1,
  media_progress_events: 1,
  progress_entries: 1,
  resume_points: 1,
  study_sessions: 1,
  xp_transactions: 1,
};

type A4Surface = 'hero' | 'hub' | 'hud';

function sumRows(
  access: DatabaseAccessSnapshot,
  store: string,
  key: 'materializedRows' | 'rowsScanned',
) {
  return access.operations
    .filter((operation) => operation.store === store)
    .reduce((total, operation) => total + operation[key], 0);
}

function emitAccessEvidence(
  surface: A4Surface,
  access: DatabaseAccessSnapshot,
  readDurationMs?: number,
) {
  console.info(
    'A4_GREEN_ACCESS_EVIDENCE',
    JSON.stringify(
      {
        surface,
        transactions: access.transactions,
        touchedStores: [
          ...new Set(access.operations.map((operation) => operation.store)),
        ].sort(),
        totalQueryCount: access.operations.length,
        histories: {
          media: {
            scanned: sumRows(access, 'media_progress_events', 'rowsScanned'),
            materialized: sumRows(
              access,
              'media_progress_events',
              'materializedRows',
            ),
          },
          sessions: {
            scanned: sumRows(access, 'study_sessions', 'rowsScanned'),
            materialized: sumRows(access, 'study_sessions', 'materializedRows'),
          },
          xp: {
            scanned: sumRows(access, 'xp_transactions', 'rowsScanned'),
            materialized: sumRows(
              access,
              'xp_transactions',
              'materializedRows',
            ),
          },
        },
        readDurationMs,
        writesObserved: access.writesObserved,
      },
      null,
      2,
    ),
  );
}

function assertA4AccessContract(
  surface: A4Surface,
  access: DatabaseAccessSnapshot,
) {
  const allowedStores =
    surface === 'hud' ? hudStores : surface === 'hub' ? hubStores : heroStores;
  const budgetByStore =
    surface === 'hud'
      ? hudBudgetByStore
      : surface === 'hub'
        ? hubBudgetByStore
        : heroBudgetByStore;
  const totalBudget = surface === 'hud' ? 10 : 11;
  const violations: string[] = [];
  const transaction = access.transactions[0];
  const touchedStores = [
    ...new Set(access.operations.map((operation) => operation.store)),
  ].sort();
  const operationTransactionIds = new Set(
    access.operations.map((operation) => operation.transactionId),
  );

  if (access.transactions.length !== 1 || transaction === undefined) {
    violations.push(`transaction count ${access.transactions.length} != 1`);
  } else {
    if (transaction.mode !== 'readonly') {
      violations.push(`transaction mode ${transaction.mode} != readonly`);
    }

    if (JSON.stringify(transaction.stores) !== JSON.stringify(allowedStores)) {
      violations.push(
        `transaction stores ${JSON.stringify(transaction.stores)} != ${JSON.stringify(allowedStores)}`,
      );
    }

    if (
      operationTransactionIds.size !== 1 ||
      !operationTransactionIds.has(transaction.id)
    ) {
      violations.push(
        `operations span transaction IDs ${JSON.stringify([...operationTransactionIds])}`,
      );
    }
  }

  const unexpectedStores = touchedStores.filter(
    (store) => !allowedStores.includes(store),
  );

  if (unexpectedStores.length > 0) {
    violations.push(
      `forbidden stores touched ${JSON.stringify(unexpectedStores)}`,
    );
  }

  for (const [store, maximum] of Object.entries(budgetByStore)) {
    const count = access.operations.filter(
      (operation) => operation.store === store,
    ).length;

    if (count > maximum) {
      violations.push(`${store} query count ${count} > ${maximum}`);
    }
  }

  if (access.operations.length > totalBudget) {
    violations.push(
      `total query count ${access.operations.length} > ${totalBudget}`,
    );
  }

  for (const store of [
    'media_progress_events',
    'study_sessions',
    'xp_transactions',
  ]) {
    const materializedRows = sumRows(access, store, 'materializedRows');

    if (materializedRows > 0) {
      violations.push(
        `${store} materialized source rows ${materializedRows} > 0`,
      );
    }
  }

  if (access.writesObserved !== 0) {
    violations.push(`writes observed ${access.writesObserved} != 0`);
  }

  expect(violations, `${surface} A4 access contract`).toEqual([]);
}

async function getLectureAsset(context: TestDatabaseContext) {
  const asset = await context.db.contentAssets
    .where('itemId')
    .equals('week-0-lecture')
    .first();

  if (asset === undefined) {
    throw new Error(
      'Bundled Week 0 lecture asset is required for A4 fixtures.',
    );
  }

  return asset;
}

async function addSyntheticHistories(
  context: TestDatabaseContext,
  count: number,
  label: string,
) {
  const asset = await getLectureAsset(context);
  const media: MediaProgressEvent[] = [];
  const sessions: StudySession[] = [];
  const xp: XpTransaction[] = [];

  for (let index = 0; index < count; index += 1) {
    const timestamp = new Date(
      Date.parse('2026-01-01T00:00:00.000Z') + index * 1_000,
    ).toISOString();

    media.push({
      id: `${label}-media-${index}`,
      itemId: asset.itemId,
      assetId: asset.id,
      startSecond: index % 120,
      endSecond: (index % 120) + 1,
      watchedSeconds: 1,
      completedSlice: false,
      stoppedBecause: 'time_box_finished',
      energyBefore: 3,
      energyAfter: 3,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    sessions.push({
      id: `${label}-session-${index}`,
      unitId: 'week-0',
      itemId: 'week-0-lecture',
      startedAt: timestamp,
      endedAt: timestamp,
      durationMinutes: 1,
      mode: 'watching',
      blockers: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    xp.push({
      id: `${label}-xp-${index}`,
      sourceType: 'a4_scale',
      sourceId: `${label}-source-${index}`,
      xp: 1,
      reason: 'A4 scale fixture',
      awardedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  await context.db.transaction(
    'rw',
    [
      context.db.mediaProgressEvents,
      context.db.studySessions,
      context.db.xpTransactions,
    ],
    async () => {
      await Promise.all([
        context.db.mediaProgressEvents.bulkAdd(media),
        context.db.studySessions.bulkAdd(sessions),
        context.db.xpTransactions.bulkAdd(xp),
      ]);
    },
  );
}

describe('A4 HUD/Hub/Hero read boundaries', () => {
  const databases: TestDatabaseContext[] = [];
  const readerDatabases: ReturnType<typeof createProgressPalDatabase>[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();

    for (const database of readerDatabases.splice(0)) {
      database.close();
    }

    await Promise.all(databases.splice(0).map((context) => context.cleanup()));
  });

  async function createA4Database(label: string, historyCount = 1) {
    const context = createTestDatabase(label);
    databases.push(context);

    await initializeDatabase({ db: context.db, seed: bundledCourseSeed });
    await addSyntheticHistories(context, historyCount, label);

    const reader = createProgressPalDatabase(context.name);
    readerDatabases.push(reader);
    const probe = installDatabaseAccessProbe(reader);
    await reader.open();

    return { context, probe, reader };
  }

  it('preserves the published HUD projection with the narrow HUD contract', async () => {
    const { context, probe, reader } = await createA4Database('a4-hud');
    const snapshot = await getDatabaseSnapshot({ db: context.db });
    const expected = projectRpgHudSummary(
      buildRpgHubSummary(snapshot, fixedNow),
    );

    const actual = await loadRpgHudSummary({ db: reader, now: () => fixedNow });
    const access = probe.snapshot();

    expect(actual).toEqual(expected);
    assertA4AccessContract('hud', access);
    emitAccessEvidence('hud', access);
  });

  it('preserves the published Hub summary with the narrow Hub contract', async () => {
    const { context, probe, reader } = await createA4Database('a4-hub');
    const snapshot = await getDatabaseSnapshot({ db: context.db });
    const expected = buildRpgHubSummary(snapshot, fixedNow);

    const actual = await loadRpgHubSummary({ db: reader, now: () => fixedNow });
    const access = probe.snapshot();

    expect(actual).toEqual(expected);
    assertA4AccessContract('hub', access);
    emitAccessEvidence('hub', access);
  });

  it('preserves the published Hero summary with the narrow Hero contract', async () => {
    const { context, probe, reader } = await createA4Database('a4-hero');
    const snapshot = await getDatabaseSnapshot({ db: context.db });
    const expected = buildRpgHeroProfileSummary(snapshot, fixedNow);

    const actual = await loadRpgHeroProfileSummary({
      db: reader,
      now: () => fixedNow,
    });
    const access = probe.snapshot();

    expect(actual).toEqual(expected);
    assertA4AccessContract('hero', access);
    emitAccessEvidence('hero', access);
  });

  it.each([1_000, 10_000])(
    'streams all three A4 histories at %i rows without source-row materialization',
    async (historyCount) => {
      const { probe, reader } = await createA4Database(
        `a4-scale-${historyCount}`,
        historyCount,
      );
      const start = performance.now();
      const data = await getRpgHubReadData(
        {
          startTime: Date.parse('2026-09-21T00:00:00.000Z'),
          nextStartTime: Date.parse('2026-09-28T00:00:00.000Z'),
        },
        { policy: cs50Policy, db: reader },
      );
      const readDurationMs = Math.round(performance.now() - start);
      const access = probe.snapshot();

      assertA4AccessContract('hub', access);
      expect(sumRows(access, 'media_progress_events', 'rowsScanned')).toBe(
        historyCount,
      );
      expect(sumRows(access, 'study_sessions', 'rowsScanned')).toBe(
        historyCount,
      );
      expect(sumRows(access, 'xp_transactions', 'rowsScanned')).toBe(
        historyCount,
      );
      expect(data.recentStudySessions.length).toBeLessThanOrEqual(5);
      expect(data.recentXpTransactions.length).toBeLessThanOrEqual(5);
      expect(data.mediaProgressByAssetId.size).toBeLessThanOrEqual(
        data.contentAssets.length,
      );
      emitAccessEvidence('hub', access, readDurationMs);

      for (const surface of ['hud', 'hero'] as const) {
        probe.reset();
        const surfaceStarted = performance.now();
        const summary = await (surface === 'hud'
          ? loadRpgHudSummary({ db: reader })
          : loadRpgHeroProfileSummary({ db: reader }));
        const surfaceAccess = probe.snapshot();
        assertA4AccessContract(surface, surfaceAccess);
        expect(summary.xpSummary.totalXp).toBe(historyCount);
        expect(
          sumRows(surfaceAccess, 'media_progress_events', 'rowsScanned'),
        ).toBe(historyCount);
        expect(sumRows(surfaceAccess, 'xp_transactions', 'rowsScanned')).toBe(
          historyCount,
        );
        expect(sumRows(surfaceAccess, 'study_sessions', 'rowsScanned')).toBe(
          surface === 'hero' ? historyCount : 0,
        );
        emitAccessEvidence(
          surface,
          surfaceAccess,
          Math.round(performance.now() - surfaceStarted),
        );
      }
    },
    240_000,
  );
});
