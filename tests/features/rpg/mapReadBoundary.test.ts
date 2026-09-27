import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildRpgCourseMapSummary,
  loadRpgCourseMapSummary,
} from '@/features/rpg';
import {
  getCourseMapReadData,
  getDatabaseSnapshot,
  initializeDatabase,
} from '@/lib/db';
import { createProgressPalDatabase } from '@/lib/db/database';
import type {
  CourseSeed,
  MediaProgressEvent,
  StudySession,
  XpTransaction,
} from '@/lib/domain';
import { getXpAwardSourceKey } from '@/lib/xp/engine';
import { bundledCourseSeed } from '@/seed';
import {
  createTestDatabase,
  type TestDatabaseContext,
} from '../../db/testDatabase';
import {
  installDatabaseAccessProbe,
  type DatabaseAccessSnapshot,
} from '../../db/accessProbe';
import { cs50CatalogueId, cs50Policy } from '../../programmes/cs50Policy';

const mapStores = [
  'content_assets',
  'content_slices',
  'course_items',
  'course_units',
  'media_progress_events',
  'progress_entries',
  'resume_points',
  'xp_transactions',
].sort();

const forbiddenMapStores = [
  'achievement_definitions',
  'achievement_unlocks',
  'app_meta',
  'backups',
  'learner_profile',
  'study_sessions',
];

function queryCountByStore(access: DatabaseAccessSnapshot) {
  return Object.fromEntries(
    mapStores.map((store) => [
      store,
      access.operations.filter((operation) => operation.store === store).length,
    ]),
  );
}

function sumRowsByStore(
  access: DatabaseAccessSnapshot,
  key: 'materializedRows' | 'rowsScanned',
) {
  return Object.fromEntries(
    mapStores.map((store) => [
      store,
      access.operations
        .filter((operation) => operation.store === store)
        .reduce((sum, operation) => sum + operation[key], 0),
    ]),
  );
}

function emitMapAccessEvidence(
  surface: string,
  access: DatabaseAccessSnapshot,
  derivedMediaRangePeak?: number,
) {
  if (process.env.A1_ACCESS_EVIDENCE !== '1') {
    return;
  }

  console.info(
    'A1_MAP_GREEN_EVIDENCE',
    JSON.stringify(
      {
        surface,
        transactions: access.transactions,
        queries: access.operations.map((operation) => ({
          store: operation.store,
          operation: operation.operation,
          scope: operation.scope,
          rowsReturned: operation.rowsReturned,
          rowsScanned: operation.rowsScanned,
          materializedRows: operation.materializedRows,
          transactionId: operation.transactionId,
        })),
        materializedRowsByStore: sumRowsByStore(access, 'materializedRows'),
        scannedRowsByStore: sumRowsByStore(access, 'rowsScanned'),
        derivedAggregatePeakByStore:
          derivedMediaRangePeak === undefined
            ? {}
            : { media_progress_events: derivedMediaRangePeak },
        queryCountByStore: queryCountByStore(access),
        totalQueryCount: access.operations.length,
        writesObserved: access.writesObserved,
      },
      null,
      2,
    ),
  );
}

function assertMapAccessContract(access: DatabaseAccessSnapshot) {
  const violations: string[] = [];
  const touchedStores = [
    ...new Set(access.operations.map((operation) => operation.store)),
  ].sort();
  const forbiddenOperations = access.operations.filter((operation) =>
    forbiddenMapStores.includes(operation.store),
  );
  const transaction = access.transactions[0];
  const transactionIds = new Set(
    access.operations.map((operation) => operation.transactionId),
  );
  const mediaOperations = access.operations.filter(
    (operation) => operation.store === 'media_progress_events',
  );
  const xpOperations = access.operations.filter(
    (operation) => operation.store === 'xp_transactions',
  );
  const queryCounts = queryCountByStore(access);

  if (JSON.stringify(touchedStores) !== JSON.stringify(mapStores)) {
    violations.push(`store allowlist: ${JSON.stringify(touchedStores)}`);
  }

  if (forbiddenOperations.length > 0) {
    violations.push(
      `forbidden stores: ${JSON.stringify(
        [
          ...new Set(forbiddenOperations.map((operation) => operation.store)),
        ].sort(),
      )}`,
    );
  }

  if (access.transactions.length !== 1 || transaction === undefined) {
    violations.push(`transaction count: ${access.transactions.length}`);
  } else {
    if (transaction.mode !== 'readonly') {
      violations.push(`transaction mode: ${transaction.mode}`);
    }

    if (JSON.stringify(transaction.stores) !== JSON.stringify(mapStores)) {
      violations.push(
        `transaction stores: ${JSON.stringify(transaction.stores)}`,
      );
    }

    if (transactionIds.size !== 1 || !transactionIds.has(transaction.id)) {
      violations.push(
        `operation transaction IDs: ${JSON.stringify([...transactionIds])}`,
      );
    }
  }

  if (access.writesObserved !== 0) {
    violations.push(`writes observed: ${access.writesObserved}`);
  }

  for (const [store, count] of Object.entries(queryCounts)) {
    if (count !== 1) {
      violations.push(`${store} query count: ${count}`);
    }
  }

  if (mediaOperations.length !== 1) {
    violations.push(`media operation count: ${mediaOperations.length}`);
  } else if (
    mediaOperations[0]?.operation !== 'cursor' ||
    mediaOperations[0]?.materializedRows !== 0
  ) {
    violations.push(
      `media history access: ${JSON.stringify(mediaOperations[0])}`,
    );
  }

  if (xpOperations.length !== 1) {
    violations.push(`XP operation count: ${xpOperations.length}`);
  } else if (
    xpOperations[0]?.operation !== 'cursor' ||
    xpOperations[0]?.materializedRows !== 0
  ) {
    violations.push(`XP history access: ${JSON.stringify(xpOperations[0])}`);
  }

  if (violations.length > 0) {
    console.info('A1_MAP_ACCESS_EVIDENCE', JSON.stringify(access, null, 2));
  }

  expect(violations, 'A1_MAP_ACCESS_CONTRACT').toEqual([]);
}

function createSyntheticCourseSeed(scaleFactor: number): CourseSeed {
  return {
    // Materialized under the active catalogue identity: loaders read only
    // that catalogue (Epic C / C5).
    courseId: cs50CatalogueId,
    title: 'A1 Map Scale Course',
    dataVersion: 1,
    sourceCheckedDate: '2026-09-20',
    units: Array.from({ length: scaleFactor }, (_, scaleIndex) => [
      {
        id: `scale-week-${scaleIndex}`,
        order: scaleIndex * 2,
        title: `Scale Week ${scaleIndex}`,
        type: 'week' as const,
        sourceYear: 2026,
        required: true,
        items: [
          {
            id: `scale-week-${scaleIndex}-lecture`,
            type: 'lecture' as const,
            title: `Lecture ${scaleIndex}`,
            required: true,
            estimatedMinutes: 60,
            order: 0,
          },
          {
            id: `scale-week-${scaleIndex}-problem-set`,
            type: 'problem_set' as const,
            title: `Problem Set ${scaleIndex}`,
            required: true,
            estimatedMinutes: 90,
            order: 1,
          },
        ],
      },
      {
        id: `scale-final-project-${scaleIndex}`,
        order: scaleIndex * 2 + 1,
        title: `Scale Final Project ${scaleIndex}`,
        type: 'final_project' as const,
        sourceYear: 2026,
        required: true,
        items: [
          {
            id: `scale-final-project-${scaleIndex}-task`,
            type: 'project_task' as const,
            title: `Scale final project task ${scaleIndex}`,
            required: true,
            estimatedMinutes: 120,
            order: 0,
          },
        ],
      },
    ]).flat(),
  };
}

async function addSyntheticHistory(
  context: TestDatabaseContext,
  historyCount: number,
) {
  const timestamp = '2026-09-20T10:00:00.000Z';
  const asset = await context.db.contentAssets.get('week-0-lecture-asset');

  if (asset === undefined) {
    throw new Error(
      'Bundled Week 0 lecture asset is required for A1 fixtures.',
    );
  }

  const mediaProgressEvents: MediaProgressEvent[] = Array.from(
    { length: historyCount },
    (_, index) => ({
      id: `a1-media-${historyCount}-${index}`,
      itemId: asset.itemId,
      assetId: asset.id,
      startSecond: 0,
      endSecond: 60,
      watchedSeconds: 60,
      completedSlice: false,
      stoppedBecause: 'time_box_finished',
      energyBefore: 3,
      energyAfter: 3,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  );
  const studySessions: StudySession[] = Array.from(
    { length: historyCount },
    (_, index) => ({
      id: `a1-session-${historyCount}-${index}`,
      unitId: 'week-0',
      itemId: 'week-0-lecture',
      startedAt: timestamp,
      endedAt: timestamp,
      durationMinutes: 1,
      mode: 'watching',
      blockers: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  );
  const xpTransactions: XpTransaction[] = Array.from(
    { length: historyCount },
    (_, index) => ({
      id: `a1-history-xp-${historyCount}-${index}`,
      sourceType: 'a1_history_fixture',
      sourceId: `a1-history-source-${historyCount}-${index}`,
      xp: 1,
      reason: 'A1 unrelated XP history fixture',
      awardedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  );

  xpTransactions.push({
    id: `a1-relevant-xp-${historyCount}`,
    sourceType: 'lecture_completed',
    sourceId: 'week-0-lecture-completed',
    xp: 40,
    reason: 'A1 relevant earned reward fixture',
    awardedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await context.db.transaction(
    'rw',
    [
      context.db.mediaProgressEvents,
      context.db.studySessions,
      context.db.xpTransactions,
    ],
    async () => {
      await Promise.all([
        context.db.mediaProgressEvents.bulkAdd(mediaProgressEvents),
        context.db.studySessions.bulkAdd(studySessions),
        context.db.xpTransactions.bulkAdd(xpTransactions),
      ]);
    },
  );
}

describe('RPG Campaign Map read boundary', () => {
  const databases: TestDatabaseContext[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(databases.splice(0).map((context) => context.cleanup()));
  });

  async function createBundledMapDatabase(label: string) {
    const context = createTestDatabase(label);
    databases.push(context);
    const probe = installDatabaseAccessProbe(context.db);

    await initializeDatabase({ db: context.db, seed: bundledCourseSeed });
    probe.reset();

    return { context, probe };
  }

  it('preserves published Map values and all-store nonmutation while enforcing the targeted read boundary', async () => {
    const { context, probe } =
      await createBundledMapDatabase('map-equivalence');

    await addSyntheticHistory(context, 100);
    const before = await getDatabaseSnapshot({ db: context.db });
    const expected = buildRpgCourseMapSummary(before);
    probe.reset();

    const actual = await loadRpgCourseMapSummary({ db: context.db });
    const access = probe.snapshot();
    const after = await getDatabaseSnapshot({ db: context.db });

    emitMapAccessEvidence('loader-equivalence', access);
    expect(actual).toEqual(expected);
    expect(after).toEqual(before);
    assertMapAccessContract(access);
  });

  it.each([1_000, 10_000])(
    'keeps Map access isolated with %i rows in every append-only history',
    async (historyCount) => {
      const { context, probe } = await createBundledMapDatabase(
        `map-history-${historyCount}`,
      );

      await addSyntheticHistory(context, historyCount);
      const beforeCounts = await Promise.all([
        context.db.mediaProgressEvents.count(),
        context.db.studySessions.count(),
        context.db.xpTransactions.count(),
      ]);
      probe.reset();

      const actual = await loadRpgCourseMapSummary({ db: context.db });
      const access = probe.snapshot();
      const afterCounts = await Promise.all([
        context.db.mediaProgressEvents.count(),
        context.db.studySessions.count(),
        context.db.xpTransactions.count(),
      ]);

      emitMapAccessEvidence(`loader-history-${historyCount}`, access);
      assertMapAccessContract(access);
      expect(afterCounts).toEqual(beforeCounts);

      const mediaOperation = access.operations.find(
        (operation) => operation.store === 'media_progress_events',
      );
      const sessionOperations = access.operations.filter(
        (operation) => operation.store === 'study_sessions',
      );
      const xpOperation = access.operations.find(
        (operation) => operation.store === 'xp_transactions',
      );

      expect(mediaOperation).toMatchObject({
        rowsScanned: historyCount,
        materializedRows: 0,
      });
      expect(sessionOperations).toEqual([]);
      expect(xpOperation?.rowsScanned).toBeLessThan(historyCount);
      expect(xpOperation?.materializedRows).toBe(0);
      expect(actual.modules[0]?.quests[0]).toMatchObject({
        longFormProgress: { eventCount: historyCount },
        rewardLabel: 'Task XP earned',
      });
    },
    90_000,
  );

  it('keeps query fan-out constant from 1x to 10x catalogue cardinality', async () => {
    async function measure(scaleFactor: number) {
      const context = createTestDatabase(`map-catalogue-${scaleFactor}`);
      databases.push(context);
      const probe = installDatabaseAccessProbe(context.db);

      await initializeDatabase({
        db: context.db,
        seed: createSyntheticCourseSeed(scaleFactor),
      });
      probe.reset();

      await loadRpgCourseMapSummary({ db: context.db });
      const access = probe.snapshot();

      assertMapAccessContract(access);
      emitMapAccessEvidence(`loader-catalogue-${scaleFactor}`, access);

      return queryCountByStore(access);
    }

    expect(await measure(10)).toEqual(await measure(1));
  });

  it('uses the sourceId index without retaining duplicate or unrelated XP history rows', async () => {
    const { context, probe } =
      await createBundledMapDatabase('map-xp-index-scope');
    const timestamp = '2026-09-20T10:00:00.000Z';

    await context.db.xpTransactions.bulkAdd([
      ...Array.from({ length: 1_000 }, (_, index) => ({
        id: `a1-unrelated-xp-${index}`,
        sourceType: 'a1_unrelated_noise',
        sourceId: `a1-unrelated-source-${index}`,
        xp: 1,
        reason: 'A1 unrelated XP index fixture',
        awardedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      ...Array.from({ length: 100 }, (_, index) => ({
        id: `a1-colliding-xp-${index}`,
        sourceType: 'a1_colliding_noise',
        sourceId: 'week-0-lecture-completed',
        xp: 1,
        reason: 'A1 non-unique sourceId collision fixture',
        awardedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      {
        id: 'a1-relevant-xp',
        sourceType: 'lecture_completed',
        sourceId: 'week-0-lecture-completed',
        xp: 40,
        reason: 'A1 relevant earned reward fixture',
        awardedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
    probe.reset();

    const data = await getCourseMapReadData({
      catalogueId: cs50CatalogueId,
      policy: cs50Policy,
      db: context.db,
    });
    const access = probe.snapshot();
    const xpOperation = access.operations.find(
      (operation) => operation.store === 'xp_transactions',
    );

    emitMapAccessEvidence('read-data-xp-index-scope', access);
    assertMapAccessContract(access);
    expect(xpOperation).toMatchObject({
      materializedRows: 0,
      rowsScanned: 101,
    });
    expect(
      data.earnedRewardSourceKeys.has(
        getXpAwardSourceKey('lecture_completed', 'week-0-lecture-completed'),
      ),
    ).toBe(true);
    expect(data.earnedRewardSourceKeys.size).toBe(1);
  });

  it('records history-dependent derived media range growth without retaining source rows', async () => {
    const eventCount = 100;
    const { context, probe } = await createBundledMapDatabase(
      'map-disjoint-derived-state',
    );
    const asset = await context.db.contentAssets.get('week-0-lecture-asset');

    if (asset === undefined) {
      throw new Error(
        'Bundled Week 0 lecture asset is required for A1 fixtures.',
      );
    }

    await context.db.mediaProgressEvents.bulkAdd(
      Array.from({ length: eventCount }, (_, index) => ({
        id: `a1-disjoint-media-${index}`,
        itemId: asset.itemId,
        assetId: asset.id,
        startSecond: index * 2,
        endSecond: index * 2 + 1,
        watchedSeconds: 1,
        completedSlice: false,
        stoppedBecause: 'time_box_finished' as const,
        energyBefore: 3,
        energyAfter: 3,
        createdAt: `2026-09-20T12:${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}.000Z`,
        updatedAt: '2026-09-20T12:00:00.000Z',
      })),
    );
    probe.reset();

    const data = await getCourseMapReadData({
      catalogueId: cs50CatalogueId,
      policy: cs50Policy,
      db: context.db,
    });
    const access = probe.snapshot();
    const aggregate = data.mediaProgressByAssetId.get(asset.id);
    const mediaOperation = access.operations.find(
      (operation) => operation.store === 'media_progress_events',
    );
    const derivedMediaRangePeak = Math.max(
      0,
      ...[...data.mediaProgressByAssetId.values()].map(
        (value) => value.coverageRanges.length,
      ),
    );

    emitMapAccessEvidence(
      'read-data-disjoint-history',
      access,
      derivedMediaRangePeak,
    );
    assertMapAccessContract(access);
    expect(mediaOperation).toMatchObject({
      materializedRows: 0,
      rowsScanned: eventCount,
    });
    expect(aggregate?.eventCount).toBe(eventCount);
    expect(aggregate?.coverageRanges).toHaveLength(eventCount);
  });

  it('propagates a Map catalog read failure without mutating persisted state', async () => {
    const { context } = await createBundledMapDatabase('map-read-failure');
    const before = await getDatabaseSnapshot({ db: context.db });
    const readFailure = new Error('Synthetic A1 Map catalog read failure');

    // Epic C / C5: the catalogue read is the scoped `courseId` query.
    vi.spyOn(context.db.courseUnits, 'where').mockReturnValueOnce({
      equals: () => ({ toArray: () => Promise.reject(readFailure) }),
    } as unknown as ReturnType<typeof context.db.courseUnits.where>);

    await expect(loadRpgCourseMapSummary({ db: context.db })).rejects.toBe(
      readFailure,
    );
    expect(await getDatabaseSnapshot({ db: context.db })).toEqual(before);
  });

  it('holds the actual Map loader transaction across a competing media write', async () => {
    const context = createTestDatabase('map-coherence');
    databases.push(context);

    let barrierEnabled = false;
    let barrierUsed = false;
    let announceRead!: () => void;
    let releaseRead!: () => void;
    const readReachedMediaCursor = new Promise<void>((resolve) => {
      announceRead = resolve;
    });
    const releaseMediaCursor = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    const probe = installDatabaseAccessProbe(context.db, {
      beforeCursor(operation) {
        if (
          barrierEnabled &&
          !barrierUsed &&
          operation.store === 'media_progress_events' &&
          operation.operation === 'cursor'
        ) {
          barrierUsed = true;
          announceRead();
          return releaseMediaCursor;
        }
      },
    });

    await initializeDatabase({ db: context.db, seed: bundledCourseSeed });

    const asset = await context.db.contentAssets.get('week-0-lecture-asset');

    if (asset === undefined) {
      throw new Error(
        'Bundled Week 0 lecture asset is required for A1 fixtures.',
      );
    }

    probe.reset();
    barrierEnabled = true;

    const writerDb = createProgressPalDatabase(context.name);
    await writerDb.open();

    let readPromise: ReturnType<typeof loadRpgCourseMapSummary> | null = null;
    let writerPromise: Promise<void> | null = null;
    let writerState: 'pending' | 'fulfilled' | 'rejected' = 'pending';
    let writerError: unknown;

    try {
      readPromise = loadRpgCourseMapSummary({ db: context.db });
      await readReachedMediaCursor;

      writerPromise = writerDb.mediaProgressEvents
        .put({
          id: 'a1-coherence-media-write',
          itemId: asset.itemId,
          assetId: asset.id,
          startSecond: 0,
          endSecond: 60,
          watchedSeconds: 60,
          completedSlice: false,
          stoppedBecause: 'time_box_finished',
          energyBefore: 3,
          energyAfter: 3,
          createdAt: '2026-09-20T11:00:00.000Z',
          updatedAt: '2026-09-20T11:00:00.000Z',
        })
        .then(
          () => {
            writerState = 'fulfilled';
          },
          (error: unknown) => {
            writerState = 'rejected';
            writerError = error;
          },
        );

      await Promise.race([
        writerPromise,
        new Promise<void>((resolve) => {
          setTimeout(resolve, 25);
        }),
      ]);

      expect(writerState).toBe('pending');
      releaseRead();

      const summary = await readPromise;
      await writerPromise;
      const access = probe.snapshot();
      const lecture = summary.modules
        .flatMap((module) => module.quests)
        .find((quest) => quest.id === 'week-0-lecture');

      assertMapAccessContract(access);
      emitMapAccessEvidence('loader-coherence', access);
      expect(barrierUsed).toBe(true);
      expect(writerState).toBe('fulfilled');
      expect(writerError).toBeUndefined();
      expect(lecture?.longFormProgress?.eventCount).toBe(0);
      expect(
        await writerDb.mediaProgressEvents.get('a1-coherence-media-write'),
      ).toBeDefined();
    } finally {
      releaseRead();

      const pendingPromises: Promise<unknown>[] = [];

      if (readPromise !== null) {
        pendingPromises.push(readPromise);
      }

      if (writerPromise !== null) {
        pendingPromises.push(writerPromise);
      }

      await Promise.allSettled(pendingPromises);
      writerDb.close();
    }
  });
});
