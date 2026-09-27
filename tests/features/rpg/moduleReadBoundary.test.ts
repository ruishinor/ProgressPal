import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildRpgModuleSummary, loadRpgModuleSummary } from '@/features/rpg';
import {
  getDatabaseSnapshot,
  getModuleReadData,
  initializeDatabase,
  logMediaProgress,
  upsertProgress,
  upsertProgressAndAwardXp,
  type ModuleReadData,
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
import { cs50Policy } from '../../programmes/cs50Policy';

const moduleStores = [
  'content_assets',
  'content_slices',
  'course_items',
  'course_units',
  'media_progress_events',
  'progress_entries',
  'resume_points',
  'xp_transactions',
].sort();

const forbiddenModuleStores = [
  'achievement_definitions',
  'achievement_unlocks',
  'app_meta',
  'backups',
  'learner_profile',
  'study_sessions',
];

function queryCountByStore(access: DatabaseAccessSnapshot) {
  return Object.fromEntries(
    moduleStores.map((store) => [
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
    moduleStores.map((store) => [
      store,
      access.operations
        .filter((operation) => operation.store === store)
        .reduce((sum, operation) => sum + operation[key], 0),
    ]),
  );
}

function retainedRowsFromReadData(data: ModuleReadData | null) {
  if (data === null) {
    return {};
  }

  return {
    content_assets: data.contentAssets.length,
    content_slices: data.contentSlices.length,
    course_items: data.courseItems.length,
    course_units: 1,
    media_progress_events: 0,
    progress_entries: data.progressEntries.length,
    resume_points: data.resumePoints.length,
    xp_transactions: 0,
  };
}

function emitModuleAccessEvidence(
  surface: string,
  access: DatabaseAccessSnapshot,
  options: {
    data?: ModuleReadData | null;
    derivedMediaRangePeak?: number;
  } = {},
) {
  if (process.env.A2_ACCESS_EVIDENCE !== '1') {
    return;
  }

  console.info(
    'A2_MODULE_GREEN_EVIDENCE',
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
        retainedRowsByStore: retainedRowsFromReadData(options.data ?? null),
        scannedRowsByStore: sumRowsByStore(access, 'rowsScanned'),
        derivedAggregatePeakByStore:
          options.derivedMediaRangePeak === undefined
            ? {}
            : { media_progress_events: options.derivedMediaRangePeak },
        queryCountByStore: queryCountByStore(access),
        totalQueryCount: access.operations.length,
        writesObserved: access.writesObserved,
      },
      null,
      2,
    ),
  );
}

function assertModuleAccessContract(access: DatabaseAccessSnapshot) {
  const violations: string[] = [];
  const touchedStores = [
    ...new Set(access.operations.map((operation) => operation.store)),
  ].sort();
  const forbiddenOperations = access.operations.filter((operation) =>
    forbiddenModuleStores.includes(operation.store),
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

  if (JSON.stringify(touchedStores) !== JSON.stringify(moduleStores)) {
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

    if (JSON.stringify(transaction.stores) !== JSON.stringify(moduleStores)) {
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
    console.info(
      'A2_MODULE_ACCESS_EVIDENCE',
      JSON.stringify(
        {
          violations,
          transactions: access.transactions,
          operations: access.operations,
          writesObserved: access.writesObserved,
        },
        null,
        2,
      ),
    );
  }

  expect(violations, 'A2_MODULE_ACCESS_CONTRACT').toEqual([]);
}

function assertMissingModuleAccess(access: DatabaseAccessSnapshot) {
  expect(access.writesObserved).toBe(0);
  expect(access.transactions).toHaveLength(1);
  expect(access.transactions[0]).toMatchObject({
    mode: 'readonly',
    stores: moduleStores,
  });
  expect(access.operations).toHaveLength(1);
  expect(access.operations[0]).toMatchObject({
    store: 'course_units',
    operation: 'get',
    rowsReturned: 0,
    materializedRows: 0,
    writes: 0,
  });
}

function createSyntheticModuleSeed(itemCount: number): CourseSeed {
  return {
    courseId: 'a2-module-scale-course',
    title: 'A2 Module Scale Course',
    dataVersion: 1,
    sourceCheckedDate: '2026-09-21',
    units: [
      {
        id: 'scale-week',
        order: 0,
        title: 'Scale Week',
        type: 'week',
        sourceYear: 2026,
        required: true,
        items: Array.from({ length: itemCount }, (_, index) => ({
          id: `scale-week-lecture-${index}`,
          type: 'lecture' as const,
          title: `Scale lecture ${index}`,
          required: true,
          estimatedMinutes: 60,
          order: index,
        })),
      },
      {
        id: 'scale-final-project',
        order: 1,
        title: 'Scale Final Project',
        type: 'final_project',
        sourceYear: 2026,
        required: true,
        items: [
          {
            id: 'scale-final-project-task',
            type: 'project_task',
            title: 'Scale final project task',
            required: true,
            estimatedMinutes: 120,
            order: 0,
          },
        ],
      },
    ],
  };
}

async function addSyntheticHistory(
  context: TestDatabaseContext,
  historyCount: number,
) {
  const timestamp = '2026-09-21T10:00:00.000Z';
  const asset = await context.db.contentAssets.get('week-4-lecture-asset');

  if (asset === undefined) {
    throw new Error(
      'Bundled Week 4 lecture asset is required for A2 fixtures.',
    );
  }

  const mediaProgressEvents: MediaProgressEvent[] = Array.from(
    { length: historyCount },
    (_, index) => ({
      id: `a2-media-${historyCount}-${index}`,
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
      id: `a2-session-${historyCount}-${index}`,
      unitId: 'week-4',
      itemId: asset.itemId,
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
      id: `a2-history-xp-${historyCount}-${index}`,
      sourceType: 'a2_history_fixture',
      sourceId: `a2-history-source-${historyCount}-${index}`,
      xp: 1,
      reason: 'A2 unrelated XP history fixture',
      awardedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  );

  xpTransactions.push({
    id: `a2-relevant-xp-${historyCount}`,
    sourceType: 'lecture_completed',
    sourceId: 'week-4-lecture-completed',
    xp: 40,
    reason: 'A2 relevant earned reward fixture',
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

describe('RPG Module read boundary', () => {
  const databases: TestDatabaseContext[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(databases.splice(0).map((context) => context.cleanup()));
  });

  async function createBundledModuleDatabase(label: string) {
    const context = createTestDatabase(label);
    databases.push(context);
    const probe = installDatabaseAccessProbe(context.db);

    await initializeDatabase({ db: context.db, seed: bundledCourseSeed });
    probe.reset();

    return { context, probe };
  }

  it('preserves published Module values, long-form state, and all-store nonmutation', async () => {
    const { context, probe } =
      await createBundledModuleDatabase('module-equivalence');

    await logMediaProgress(
      {
        assetId: 'week-4-lecture-asset',
        startSecond: 0,
        endSecond: 180,
        energyBefore: 3,
        energyAfter: 3,
        stoppedBecause: 'time_box_finished',
      },
      { db: context.db },
    );
    const before = await getDatabaseSnapshot({ db: context.db });
    const expected = buildRpgModuleSummary(before, 'week-4');
    probe.reset();

    const actual = await loadRpgModuleSummary('week-4', { db: context.db });
    const access = probe.snapshot();
    const after = await getDatabaseSnapshot({ db: context.db });

    emitModuleAccessEvidence('loader-equivalence', access);
    expect(actual).toEqual(expected);
    expect(after).toEqual(before);
    expect(
      actual?.quests.find((quest) => quest.id === 'week-4-lecture')
        ?.longFormProgress,
    ).toMatchObject({
      eventCount: 1,
      hasProgress: true,
    });
    assertModuleAccessContract(access);
  });

  it('preserves representative Module values across early, mid-course, and final-project units', async () => {
    const context = createTestDatabase('module-representative-equivalence');
    databases.push(context);
    await initializeDatabase({ db: context.db, seed: bundledCourseSeed });
    const snapshot = await getDatabaseSnapshot({ db: context.db });

    for (const unitId of ['week-0', 'week-4', 'final-project']) {
      expect(await loadRpgModuleSummary(unitId, { db: context.db })).toEqual(
        buildRpgModuleSummary(snapshot, unitId),
      );
    }
  });

  it.each(['missing-week', 'INVALID UNIT ID!'])(
    'returns the published null result for missing unit id %s without querying Module-dependent stores',
    async (unitId) => {
      const { context, probe } = await createBundledModuleDatabase(
        `module-missing-${unitId === 'missing-week' ? 'valid-id' : 'invalid-id'}`,
      );
      const snapshot = await getDatabaseSnapshot({ db: context.db });
      const expected = buildRpgModuleSummary(snapshot, unitId);
      probe.reset();

      const actual = await loadRpgModuleSummary(unitId, {
        db: context.db,
      });
      const access = probe.snapshot();

      emitModuleAccessEvidence(`loader-missing-${unitId}`, access);
      expect(actual).toEqual(expected);
      expect(actual).toBeNull();
      assertMissingModuleAccess(access);
    },
  );

  it.each([1_000, 10_000])(
    'keeps Module access isolated with %i rows in every append-only history',
    async (historyCount) => {
      const { context, probe } = await createBundledModuleDatabase(
        `module-history-${historyCount}`,
      );

      await addSyntheticHistory(context, historyCount);
      const beforeCounts = await Promise.all([
        context.db.mediaProgressEvents.count(),
        context.db.studySessions.count(),
        context.db.xpTransactions.count(),
      ]);
      probe.reset();

      const actual = await loadRpgModuleSummary('week-4', { db: context.db });
      const access = probe.snapshot();
      const afterCounts = await Promise.all([
        context.db.mediaProgressEvents.count(),
        context.db.studySessions.count(),
        context.db.xpTransactions.count(),
      ]);

      emitModuleAccessEvidence(`loader-history-${historyCount}`, access);
      assertModuleAccessContract(access);
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
      const lecture = actual?.quests.find(
        (quest) => quest.id === 'week-4-lecture',
      );

      expect(mediaOperation).toMatchObject({
        rowsScanned: historyCount,
        materializedRows: 0,
      });
      expect(sessionOperations).toEqual([]);
      expect(xpOperation?.rowsScanned).toBeLessThan(historyCount);
      expect(xpOperation?.materializedRows).toBe(0);
      expect(lecture).toMatchObject({
        longFormProgress: { eventCount: historyCount },
        rewardLabel: 'Task XP earned',
      });
    },
    90_000,
  );

  it('keeps Module query fan-out constant from 1x to 10x item cardinality', async () => {
    async function measure(itemCount: number) {
      const context = createTestDatabase(`module-catalogue-${itemCount}`);
      databases.push(context);
      const probe = installDatabaseAccessProbe(context.db);

      await initializeDatabase({
        db: context.db,
        seed: createSyntheticModuleSeed(itemCount),
      });
      probe.reset();

      await loadRpgModuleSummary('scale-week', { db: context.db });
      const access = probe.snapshot();

      assertModuleAccessContract(access);
      emitModuleAccessEvidence(`loader-catalogue-${itemCount}`, access);

      return queryCountByStore(access);
    }

    expect(await measure(10)).toEqual(await measure(1));
  });

  it('uses the sourceId index without retaining duplicate or unrelated XP rows', async () => {
    const { context, probe } = await createBundledModuleDatabase(
      'module-xp-index-scope',
    );
    const timestamp = '2026-09-21T10:00:00.000Z';

    await context.db.xpTransactions.bulkAdd([
      ...Array.from({ length: 1_000 }, (_, index) => ({
        id: `a2-unrelated-xp-${index}`,
        sourceType: 'a2_unrelated_noise',
        sourceId: `a2-unrelated-source-${index}`,
        xp: 1,
        reason: 'A2 unrelated XP index fixture',
        awardedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      ...Array.from({ length: 100 }, (_, index) => ({
        id: `a2-colliding-xp-${index}`,
        sourceType: 'a2_colliding_noise',
        sourceId: 'week-4-lecture-completed',
        xp: 1,
        reason: 'A2 non-unique sourceId collision fixture',
        awardedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      {
        id: 'a2-relevant-xp',
        sourceType: 'lecture_completed',
        sourceId: 'week-4-lecture-completed',
        xp: 40,
        reason: 'A2 relevant earned reward fixture',
        awardedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
    probe.reset();

    const data = await getModuleReadData('week-4', {
      policy: cs50Policy,
      db: context.db,
    });
    const access = probe.snapshot();
    const xpOperation = access.operations.find(
      (operation) => operation.store === 'xp_transactions',
    );

    emitModuleAccessEvidence('read-data-xp-index-scope', access, { data });
    assertModuleAccessContract(access);
    expect(xpOperation).toMatchObject({
      materializedRows: 0,
      rowsScanned: 101,
    });
    expect(
      data?.earnedRewardSourceKeys.has(
        getXpAwardSourceKey('lecture_completed', 'week-4-lecture-completed'),
      ),
    ).toBe(true);
    expect(data?.earnedRewardSourceKeys.size).toBe(1);
  });

  it('records history-dependent derived media range growth without retaining source rows', async () => {
    const eventCount = 100;
    const { context, probe } = await createBundledModuleDatabase(
      'module-disjoint-derived-state',
    );
    const asset = await context.db.contentAssets.get('week-4-lecture-asset');

    if (asset === undefined) {
      throw new Error(
        'Bundled Week 4 lecture asset is required for A2 fixtures.',
      );
    }

    await context.db.mediaProgressEvents.bulkAdd(
      Array.from({ length: eventCount }, (_, index) => ({
        id: `a2-disjoint-media-${index}`,
        itemId: asset.itemId,
        assetId: asset.id,
        startSecond: index * 2,
        endSecond: index * 2 + 1,
        watchedSeconds: 1,
        completedSlice: false,
        stoppedBecause: 'time_box_finished' as const,
        energyBefore: 3,
        energyAfter: 3,
        createdAt: `2026-09-21T12:${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}.000Z`,
        updatedAt: '2026-09-21T12:00:00.000Z',
      })),
    );
    probe.reset();

    const data = await getModuleReadData('week-4', {
      policy: cs50Policy,
      db: context.db,
    });
    const access = probe.snapshot();
    const aggregate = data?.mediaProgressByAssetId.get(asset.id);
    const mediaOperation = access.operations.find(
      (operation) => operation.store === 'media_progress_events',
    );
    const derivedMediaRangePeak = Math.max(
      0,
      ...[...(data?.mediaProgressByAssetId.values() ?? [])].map(
        (value) => value.coverageRanges.length,
      ),
    );

    emitModuleAccessEvidence('read-data-disjoint-history', access, {
      data,
      derivedMediaRangePeak,
    });
    assertModuleAccessContract(access);
    expect(mediaOperation).toMatchObject({
      materializedRows: 0,
      rowsScanned: eventCount,
    });
    expect(aggregate?.eventCount).toBe(eventCount);
    expect(aggregate?.coverageRanges).toHaveLength(eventCount);
  });

  it('preserves ordinary reward labels across a backward progress correction', async () => {
    const context = createTestDatabase('module-rewards-ordinary');
    databases.push(context);
    await initializeDatabase({ db: context.db, seed: bundledCourseSeed });

    expect(
      (await loadRpgModuleSummary('week-4', { db: context.db }))?.quests.find(
        (quest) => quest.id === 'week-4-lecture',
      )?.rewardLabel,
    ).toBe('Up to +40 XP');

    await upsertProgressAndAwardXp(
      { itemId: 'week-4-lecture', status: 'completed', confidence: 3 },
      { policy: cs50Policy, db: context.db },
    );
    await upsertProgress(
      { itemId: 'week-4-lecture', status: 'started', confidence: 3 },
      { db: context.db },
    );

    expect(
      (await loadRpgModuleSummary('week-4', { db: context.db }))?.quests.find(
        (quest) => quest.id === 'week-4-lecture',
      )?.rewardLabel,
    ).toBe('Task XP earned');
  });

  it('preserves shared final-project reward labels', async () => {
    const context = createTestDatabase('module-rewards-final-project');
    databases.push(context);
    await initializeDatabase({ db: context.db, seed: bundledCourseSeed });

    const sharedIds = ['final-project-readme', 'final-project-video-demo'];
    const beforeShared = await loadRpgModuleSummary('final-project', {
      db: context.db,
    });

    for (const itemId of sharedIds) {
      expect(
        beforeShared?.quests.find((quest) => quest.id === itemId)?.rewardLabel,
      ).toBe('Up to +200 XP');
      await upsertProgressAndAwardXp(
        { itemId, status: 'completed', confidence: 3 },
        { policy: cs50Policy, db: context.db },
      );
    }

    const afterShared = await loadRpgModuleSummary('final-project', {
      db: context.db,
    });

    for (const itemId of sharedIds) {
      expect(
        afterShared?.quests.find((quest) => quest.id === itemId)?.rewardLabel,
      ).toBe('Task XP earned');
    }
  });

  it('propagates a Module catalog read failure without mutating persisted state', async () => {
    const { context } = await createBundledModuleDatabase(
      'module-read-failure',
    );
    const before = await getDatabaseSnapshot({ db: context.db });
    const readFailure = new Error('Synthetic A2 Module catalog read failure');

    vi.spyOn(context.db.courseUnits, 'get').mockRejectedValueOnce(readFailure);

    await expect(
      loadRpgModuleSummary('week-4', { db: context.db }),
    ).rejects.toBe(readFailure);
    expect(await getDatabaseSnapshot({ db: context.db })).toEqual(before);
  });

  it('holds the actual Module loader transaction across a competing media write', async () => {
    const context = createTestDatabase('module-coherence');
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
    const asset = await context.db.contentAssets.get('week-4-lecture-asset');

    if (asset === undefined) {
      throw new Error(
        'Bundled Week 4 lecture asset is required for A2 fixtures.',
      );
    }

    probe.reset();
    barrierEnabled = true;

    const writerDb = createProgressPalDatabase(context.name);
    await writerDb.open();

    let readPromise: ReturnType<typeof loadRpgModuleSummary> | null = null;
    let writerPromise: Promise<void> | null = null;
    let writerState: 'pending' | 'fulfilled' | 'rejected' = 'pending';
    let writerError: unknown;

    try {
      readPromise = loadRpgModuleSummary('week-4', { db: context.db });
      await readReachedMediaCursor;

      writerPromise = writerDb.mediaProgressEvents
        .put({
          id: 'a2-coherence-media-write',
          itemId: asset.itemId,
          assetId: asset.id,
          startSecond: 0,
          endSecond: 60,
          watchedSeconds: 60,
          completedSlice: false,
          stoppedBecause: 'time_box_finished',
          energyBefore: 3,
          energyAfter: 3,
          createdAt: '2026-09-21T11:00:00.000Z',
          updatedAt: '2026-09-21T11:00:00.000Z',
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
      const lecture = summary?.quests.find(
        (quest) => quest.id === 'week-4-lecture',
      );

      assertModuleAccessContract(access);
      emitModuleAccessEvidence('loader-coherence', access);
      expect(barrierUsed).toBe(true);
      expect(writerState).toBe('fulfilled');
      expect(writerError).toBeUndefined();
      expect(lecture?.longFormProgress?.eventCount ?? 0).toBe(0);
      expect(
        await writerDb.mediaProgressEvents.get('a2-coherence-media-write'),
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
