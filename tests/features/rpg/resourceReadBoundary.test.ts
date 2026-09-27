import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildRpgStudyResourceSummary,
  loadRpgStudyResourceSummary,
} from '@/features/rpg';
import {
  getDatabaseSnapshot,
  getResourceReadData,
  initializeDatabase,
  logMediaProgress,
  upsertProgress,
  upsertProgressAndAwardXp,
  type ResourceReadData,
} from '@/lib/db';
import { createProgressPalDatabase } from '@/lib/db/database';
import type {
  ContentAsset,
  ContentSlice,
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

const resourceStores = [
  'content_assets',
  'content_slices',
  'course_items',
  'course_units',
  'media_progress_events',
  'progress_entries',
  'resume_points',
  'xp_transactions',
].sort();

const forbiddenResourceStores = [
  'achievement_definitions',
  'achievement_unlocks',
  'app_meta',
  'backups',
  'learner_profile',
  'study_sessions',
];

const queryBudgetByStore: Record<string, number> = {
  content_assets: 1,
  content_slices: 1,
  course_items: 2,
  course_units: 1,
  media_progress_events: 1,
  progress_entries: 1,
  resume_points: 1,
  xp_transactions: 1,
};

function queryCountByStore(access: DatabaseAccessSnapshot) {
  return Object.fromEntries(
    resourceStores.map((store) => [
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
    resourceStores.map((store) => [
      store,
      access.operations
        .filter((operation) => operation.store === store)
        .reduce((sum, operation) => sum + operation[key], 0),
    ]),
  );
}

function retainedRowsFromReadData(data: ResourceReadData | null) {
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

function emitResourceAccessEvidence(
  surface: string,
  access: DatabaseAccessSnapshot,
  options: {
    data?: ResourceReadData | null;
    derivedMediaRangePeak?: number;
    readDurationMs?: number;
  } = {},
) {
  if (process.env.A3_ACCESS_EVIDENCE !== '1') {
    return;
  }

  console.info(
    'A3_RESOURCE_GREEN_EVIDENCE',
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
        readDurationMs: options.readDurationMs,
        writesObserved: access.writesObserved,
      },
      null,
      2,
    ),
  );
}

function assertResourceAccessContract(access: DatabaseAccessSnapshot) {
  const violations: string[] = [];
  const touchedStores = [
    ...new Set(access.operations.map((operation) => operation.store)),
  ].sort();
  const forbiddenOperations = access.operations.filter((operation) =>
    forbiddenResourceStores.includes(operation.store),
  );
  const transaction = access.transactions[0];
  const transactionIds = new Set(
    access.operations.map((operation) => operation.transactionId),
  );
  const unexpectedStores = touchedStores.filter(
    (store) => !resourceStores.includes(store),
  );
  const mediaOperations = access.operations.filter(
    (operation) => operation.store === 'media_progress_events',
  );
  const xpOperations = access.operations.filter(
    (operation) => operation.store === 'xp_transactions',
  );

  if (unexpectedStores.length > 0) {
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

    if (JSON.stringify(transaction.stores) !== JSON.stringify(resourceStores)) {
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

  for (const [store, maximum] of Object.entries(queryBudgetByStore)) {
    const count = access.operations.filter(
      (operation) => operation.store === store,
    ).length;

    if (count > maximum) {
      violations.push(`${store} query count: ${count} > ${maximum}`);
    }
  }

  if (access.operations.length > 9) {
    violations.push(`total query count: ${access.operations.length} > 9`);
  }

  if (mediaOperations.length > 1) {
    violations.push(`media operation count: ${mediaOperations.length}`);
  } else if (
    mediaOperations.length === 1 &&
    (mediaOperations[0]?.operation !== 'cursor' ||
      mediaOperations[0]?.materializedRows !== 0)
  ) {
    violations.push(
      `media history access: ${JSON.stringify(mediaOperations[0])}`,
    );
  }

  if (xpOperations.length > 1) {
    violations.push(`XP operation count: ${xpOperations.length}`);
  } else if (
    xpOperations.length === 1 &&
    (xpOperations[0]?.operation !== 'cursor' ||
      xpOperations[0]?.materializedRows !== 0)
  ) {
    violations.push(`XP history access: ${JSON.stringify(xpOperations[0])}`);
  }

  if (violations.length > 0) {
    console.info(
      'A3_RESOURCE_ACCESS_EVIDENCE',
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

  expect(violations, 'A3_RESOURCE_ACCESS_CONTRACT').toEqual([]);
}

function assertMissingItemAccess(access: DatabaseAccessSnapshot) {
  expect(access.writesObserved).toBe(0);
  expect(access.transactions).toHaveLength(1);
  expect(access.transactions[0]).toMatchObject({
    mode: 'readonly',
    stores: resourceStores,
  });
  expect(access.operations).toHaveLength(1);
  expect(access.operations[0]).toMatchObject({
    store: 'course_items',
    operation: 'get',
    rowsReturned: 0,
    materializedRows: 0,
    writes: 0,
  });
}

function createSyntheticResourceSeed(itemCount: number): CourseSeed {
  return {
    // Materialized under the active catalogue identity: loaders read only
    // that catalogue (Epic C / C5).
    courseId: cs50CatalogueId,
    title: 'A3 Resource Scale Course',
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
      'Bundled Week 4 lecture asset is required for A3 fixtures.',
    );
  }

  const mediaProgressEvents: MediaProgressEvent[] = Array.from(
    { length: historyCount },
    (_, index) => ({
      id: `a3-media-${historyCount}-${index}`,
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
      id: `a3-session-${historyCount}-${index}`,
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
      id: `a3-history-xp-${historyCount}-${index}`,
      sourceType: 'a3_history_fixture',
      sourceId: `a3-history-source-${historyCount}-${index}`,
      xp: 1,
      reason: 'A3 unrelated XP history fixture',
      awardedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  );

  xpTransactions.push({
    id: `a3-relevant-xp-${historyCount}`,
    sourceType: 'lecture_completed',
    sourceId: 'week-4-lecture-completed',
    xp: 40,
    reason: 'A3 relevant earned reward fixture',
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

describe('RPG Resource read boundary', () => {
  const databases: TestDatabaseContext[] = [];
  const readerDatabases: ReturnType<typeof createProgressPalDatabase>[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    for (const database of readerDatabases.splice(0)) {
      database.close();
    }
    await Promise.all(databases.splice(0).map((context) => context.cleanup()));
  });

  async function createUninstrumentedBundledResourceDatabase(label: string) {
    const context = createTestDatabase(label);
    databases.push(context);
    await initializeDatabase({ db: context.db, seed: bundledCourseSeed });
    return context;
  }

  async function openProbedResourceReader(context: TestDatabaseContext) {
    const database = createProgressPalDatabase(context.name);
    readerDatabases.push(database);
    const probe = installDatabaseAccessProbe(database);
    await database.open();
    return { database, probe };
  }

  async function createBundledResourceDatabase(label: string) {
    const context = createTestDatabase(label);
    databases.push(context);
    const probe = installDatabaseAccessProbe(context.db);

    await initializeDatabase({ db: context.db, seed: bundledCourseSeed });
    probe.reset();

    return { context, probe };
  }

  it('preserves published Resource values, long-form state, and all-store nonmutation', async () => {
    const { context, probe } = await createBundledResourceDatabase(
      'resource-equivalence',
    );

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
    const expected = buildRpgStudyResourceSummary(before, 'week-4-lecture');
    probe.reset();

    const actual = await loadRpgStudyResourceSummary('week-4-lecture', {
      db: context.db,
    });
    const access = probe.snapshot();
    const after = await getDatabaseSnapshot({ db: context.db });

    emitResourceAccessEvidence('loader-equivalence', access);
    expect(actual).toEqual(expected);
    expect(after).toEqual(before);
    expect(actual?.longFormProgress).toMatchObject({
      eventCount: 1,
      hasProgress: true,
    });
    assertResourceAccessContract(access);
  });

  it.each(['week-0-problem-set', 'week-4-lecture', 'final-project-readme'])(
    'preserves representative published Resource values for %s',
    async (itemId) => {
      const { context } = await createBundledResourceDatabase(
        `resource-representative-${itemId}`,
      );
      const snapshot = await getDatabaseSnapshot({ db: context.db });

      expect(
        await loadRpgStudyResourceSummary(itemId, { db: context.db }),
      ).toEqual(buildRpgStudyResourceSummary(snapshot, itemId));
    },
  );

  it.each(['missing-resource', 'INVALID ITEM ID!'])(
    'returns the published null result for missing item id %s with one lookup',
    async (itemId) => {
      const { context, probe } = await createBundledResourceDatabase(
        `resource-missing-${itemId === 'missing-resource' ? 'valid' : 'invalid'}`,
      );
      const snapshot = await getDatabaseSnapshot({ db: context.db });
      probe.reset();

      expect(buildRpgStudyResourceSummary(snapshot, itemId)).toBeNull();
      expect(
        await loadRpgStudyResourceSummary(itemId, { db: context.db }),
      ).toBeNull();

      const access = probe.snapshot();
      emitResourceAccessEvidence(`loader-missing-${itemId}`, access);
      assertMissingItemAccess(access);
    },
  );

  it('returns null for an item whose unit cannot be resolved without dependent reads', async () => {
    const { context, probe } = await createBundledResourceDatabase(
      'resource-missing-unit',
    );
    await context.db.courseUnits.delete('week-4');
    probe.reset();

    expect(
      await loadRpgStudyResourceSummary('week-4-lecture', { db: context.db }),
    ).toBeNull();

    const access = probe.snapshot();
    expect(access.writesObserved).toBe(0);
    expect(access.transactions).toHaveLength(1);
    expect(access.transactions[0]).toMatchObject({
      mode: 'readonly',
      stores: resourceStores,
    });
    expect(access.operations).toHaveLength(2);
    expect(access.operations[0]).toMatchObject({
      store: 'course_items',
      operation: 'get',
      rowsReturned: 1,
    });
    expect(access.operations[1]).toMatchObject({
      store: 'course_units',
      operation: 'get',
      rowsReturned: 0,
    });
  });

  it.each([1_000, 10_000])(
    'keeps Resource access isolated with %i rows in append-only histories',
    async (historyCount) => {
      const context = await createUninstrumentedBundledResourceDatabase(
        `resource-history-${historyCount}`,
      );
      await addSyntheticHistory(context, historyCount);
      const beforeCounts = await Promise.all([
        context.db.mediaProgressEvents.count(),
        context.db.studySessions.count(),
        context.db.xpTransactions.count(),
      ]);
      const { database, probe } = await openProbedResourceReader(context);

      const readStartedAt = Date.now();
      const data = await getResourceReadData('week-4-lecture', {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: database,
      });
      const readDurationMs = Date.now() - readStartedAt;
      const access = probe.snapshot();
      const afterCounts = await Promise.all([
        context.db.mediaProgressEvents.count(),
        context.db.studySessions.count(),
        context.db.xpTransactions.count(),
      ]);
      const mediaOperation = access.operations.find(
        (operation) => operation.store === 'media_progress_events',
      );
      const xpOperation = access.operations.find(
        (operation) => operation.store === 'xp_transactions',
      );

      emitResourceAccessEvidence(`read-data-history-${historyCount}`, access, {
        data,
        readDurationMs,
      });
      assertResourceAccessContract(access);
      expect(afterCounts).toEqual(beforeCounts);
      expect(mediaOperation).toMatchObject({
        materializedRows: 0,
        rowsScanned: historyCount,
      });
      expect(xpOperation).toMatchObject({
        materializedRows: 0,
        rowsScanned: 1,
      });
      expect(
        access.operations.some(
          (operation) => operation.store === 'study_sessions',
        ),
      ).toBe(false);
      expect(
        data?.mediaProgressByAssetId.get('week-4-lecture-asset')?.eventCount,
      ).toBe(historyCount);
    },
    90_000,
  );

  it('keeps Resource query fan-out constant from 1x to 10x unit-item cardinality', async () => {
    const snapshots: Array<{
      count: number;
      access: DatabaseAccessSnapshot;
      data: ResourceReadData | null;
    }> = [];

    for (const count of [1, 10]) {
      const context = createTestDatabase(`resource-unit-cardinality-${count}`);
      databases.push(context);
      const probe = installDatabaseAccessProbe(context.db);
      await initializeDatabase({
        db: context.db,
        seed: createSyntheticResourceSeed(count),
      });
      probe.reset();

      const data = await getResourceReadData('scale-week-lecture-0', {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: context.db,
      });
      const access = probe.snapshot();
      assertResourceAccessContract(access);
      snapshots.push({ count, access, data });
    }

    expect(queryCountByStore(snapshots[0]!.access)).toEqual(
      queryCountByStore(snapshots[1]!.access),
    );
    expect(snapshots[0]!.access.operations).toHaveLength(9);
    expect(snapshots[1]!.access.operations).toHaveLength(9);
    expect(snapshots[0]!.data?.courseItems).toHaveLength(1);
    expect(snapshots[1]!.data?.courseItems).toHaveLength(10);
  });

  it('keeps Resource query fan-out constant as selected-item asset and slice cardinality grows', async () => {
    const { context, probe } = await createBundledResourceDatabase(
      'resource-content-cardinality',
    );
    const baseAsset = await context.db.contentAssets.get(
      'week-4-lecture-asset',
    );
    const baseSlice = await context.db.contentSlices
      .where('assetId')
      .equals('week-4-lecture-asset')
      .first();

    if (baseAsset === undefined || baseSlice === undefined) {
      throw new Error('Bundled Week 4 content is required for A3 fixtures.');
    }

    await context.db.contentSlices
      .where('itemId')
      .equals('week-4-lecture')
      .delete();
    const singleSlice: ContentSlice = {
      ...baseSlice,
      id: 'a3-cardinality-slice-0',
      assetId: baseAsset.id,
      itemId: baseAsset.itemId,
      order: 0,
      startSecond: 0,
      endSecond: 60,
      plannedMinutes: 1,
      status: 'not_started',
      skipReason: undefined,
      completedAt: undefined,
    };
    await context.db.contentSlices.add(singleSlice);
    probe.reset();

    const oneData = await getResourceReadData('week-4-lecture', {
      catalogueId: cs50CatalogueId,
      policy: cs50Policy,
      db: context.db,
    });
    const oneAccess = probe.snapshot();
    assertResourceAccessContract(oneAccess);

    const additionalAssets: ContentAsset[] = Array.from(
      { length: 9 },
      (_, index) => ({
        ...baseAsset,
        id: `a3-cardinality-asset-${index + 1}`,
        title: `A3 cardinality asset ${index + 1}`,
        sourceLabel: 'A3 cardinality fixture',
        order: index + 1,
      }),
    );
    const additionalSlices: ContentSlice[] = additionalAssets.map(
      (asset, index) => ({
        ...singleSlice,
        id: `a3-cardinality-slice-${index + 1}`,
        assetId: asset.id,
        order: index + 1,
      }),
    );
    await context.db.contentAssets.bulkAdd(additionalAssets);
    await context.db.contentSlices.bulkAdd(additionalSlices);
    probe.reset();

    const tenData = await getResourceReadData('week-4-lecture', {
      catalogueId: cs50CatalogueId,
      policy: cs50Policy,
      db: context.db,
    });
    const tenAccess = probe.snapshot();
    assertResourceAccessContract(tenAccess);

    expect(queryCountByStore(oneAccess)).toEqual(queryCountByStore(tenAccess));
    expect(oneData?.contentAssets).toHaveLength(1);
    expect(oneData?.contentSlices).toHaveLength(1);
    expect(tenData?.contentAssets).toHaveLength(10);
    expect(tenData?.contentSlices).toHaveLength(10);
  });

  it('uses the sourceId index without retaining duplicate or unrelated XP rows', async () => {
    const context = await createUninstrumentedBundledResourceDatabase(
      'resource-xp-index-scope',
    );
    const timestamp = '2026-09-21T10:00:00.000Z';

    await context.db.xpTransactions.bulkAdd([
      ...Array.from({ length: 1_000 }, (_, index) => ({
        id: `a3-unrelated-xp-${index}`,
        sourceType: 'a3_unrelated_noise',
        sourceId: `a3-unrelated-source-${index}`,
        xp: 1,
        reason: 'A3 unrelated XP index fixture',
        awardedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      ...Array.from({ length: 100 }, (_, index) => ({
        id: `a3-colliding-xp-${index}`,
        sourceType: 'a3_colliding_noise',
        sourceId: 'week-4-lecture-completed',
        xp: 1,
        reason: 'A3 non-unique sourceId collision fixture',
        awardedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
      {
        id: 'a3-relevant-xp',
        sourceType: 'lecture_completed',
        sourceId: 'week-4-lecture-completed',
        xp: 40,
        reason: 'A3 relevant earned reward fixture',
        awardedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
    const { database, probe } = await openProbedResourceReader(context);

    const data = await getResourceReadData('week-4-lecture', {
      catalogueId: cs50CatalogueId,
      policy: cs50Policy,
      db: database,
    });
    const access = probe.snapshot();
    const xpOperation = access.operations.find(
      (operation) => operation.store === 'xp_transactions',
    );

    emitResourceAccessEvidence('read-data-xp-index-scope', access, { data });
    assertResourceAccessContract(access);
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
  }, 30_000);

  it('records history-dependent derived media range growth without retaining source rows', async () => {
    const eventCount = 100;
    const { context, probe } = await createBundledResourceDatabase(
      'resource-disjoint-derived-state',
    );
    const asset = await context.db.contentAssets.get('week-4-lecture-asset');

    if (asset === undefined) {
      throw new Error(
        'Bundled Week 4 lecture asset is required for A3 fixtures.',
      );
    }

    await context.db.mediaProgressEvents.bulkAdd(
      Array.from({ length: eventCount }, (_, index) => ({
        id: `a3-disjoint-media-${index}`,
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

    const data = await getResourceReadData('week-4-lecture', {
      catalogueId: cs50CatalogueId,
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

    emitResourceAccessEvidence('read-data-disjoint-history', access, {
      data,
      derivedMediaRangePeak,
    });
    assertResourceAccessContract(access);
    expect(mediaOperation).toMatchObject({
      materializedRows: 0,
      rowsScanned: eventCount,
    });
    expect(aggregate?.eventCount).toBe(eventCount);
    expect(aggregate?.coverageRanges).toHaveLength(eventCount);
  });

  it('preserves detailed task and week-completion reward semantics', async () => {
    const context = await createUninstrumentedBundledResourceDatabase(
      'resource-week-rewards',
    );
    const unit = await context.db.courseUnits.get('week-0');

    if (unit === undefined) {
      throw new Error(
        'Bundled Week 0 unit is required for A3 reward fixtures.',
      );
    }

    async function expectPublishedRewardLabel() {
      const snapshot = await getDatabaseSnapshot({ db: context.db });
      const expected = buildRpgStudyResourceSummary(
        snapshot,
        'week-0-problem-set',
      );
      const actual = await loadRpgStudyResourceSummary('week-0-problem-set', {
        db: context.db,
      });

      expect(actual).toEqual(expected);
      return actual?.rewardLabel;
    }

    expect(await expectPublishedRewardLabel()).toBe(
      'Up to 220 XP remaining for this task',
    );

    await upsertProgressAndAwardXp(
      { itemId: 'week-0-lecture', status: 'completed', confidence: 3 },
      { catalogueId: cs50CatalogueId, policy: cs50Policy, db: context.db },
    );

    expect(await expectPublishedRewardLabel()).toContain(
      `+150 XP when ${unit.title} is complete`,
    );

    await upsertProgressAndAwardXp(
      { itemId: 'week-0-problem-set', status: 'accepted', confidence: 3 },
      { catalogueId: cs50CatalogueId, policy: cs50Policy, db: context.db },
    );
    await upsertProgress(
      { itemId: 'week-0-problem-set', status: 'started', confidence: 3 },
      { db: context.db },
    );

    expect(await expectPublishedRewardLabel()).toBe('Task XP earned');
  });

  it('preserves shared final-project detailed reward semantics', async () => {
    const context = createTestDatabase('resource-final-project-rewards');
    databases.push(context);
    await initializeDatabase({ db: context.db, seed: bundledCourseSeed });

    const before = await loadRpgStudyResourceSummary('final-project-readme', {
      db: context.db,
    });
    expect(before?.rewardLabel).toBe(
      'Up to 200 XP remaining for this task (shared with README + demo)',
    );

    await upsertProgressAndAwardXp(
      { itemId: 'final-project-readme', status: 'completed', confidence: 3 },
      { catalogueId: cs50CatalogueId, policy: cs50Policy, db: context.db },
    );
    await upsertProgressAndAwardXp(
      {
        itemId: 'final-project-video-demo',
        status: 'completed',
        confidence: 3,
      },
      { catalogueId: cs50CatalogueId, policy: cs50Policy, db: context.db },
    );

    expect(
      (
        await loadRpgStudyResourceSummary('final-project-readme', {
          db: context.db,
        })
      )?.rewardLabel,
    ).toBe('Task XP earned');
  });

  it('reflects a committed mutation result on Resource readback without passive writes', async () => {
    const context = await createUninstrumentedBundledResourceDatabase(
      'resource-post-save-readback',
    );
    const result = await upsertProgressAndAwardXp(
      { itemId: 'week-4-lecture', status: 'completed', confidence: 4 },
      { catalogueId: cs50CatalogueId, policy: cs50Policy, db: context.db },
    );
    const committedSnapshot = await getDatabaseSnapshot({ db: context.db });
    const expected = buildRpgStudyResourceSummary(
      committedSnapshot,
      'week-4-lecture',
    );
    const { database, probe } = await openProbedResourceReader(context);

    const summary = await loadRpgStudyResourceSummary('week-4-lecture', {
      db: database,
    });
    const access = probe.snapshot();

    assertResourceAccessContract(access);
    expect(summary).toEqual(expected);
    expect(summary?.savedProgress).toMatchObject({
      status: result.progressEntry.status,
      confidence: result.progressEntry.confidence,
      updatedAt: result.progressEntry.updatedAt,
    });
    expect(summary?.rewardLabel).toBe('Task XP earned');
    expect(access.writesObserved).toBe(0);
  });

  it('propagates a Resource catalog read failure without mutating persisted state', async () => {
    const { context } = await createBundledResourceDatabase(
      'resource-read-failure',
    );
    const before = await getDatabaseSnapshot({ db: context.db });
    const readFailure = new Error('Synthetic A3 Resource catalog read failure');

    vi.spyOn(context.db.courseItems, 'get').mockRejectedValueOnce(readFailure);

    await expect(
      loadRpgStudyResourceSummary('week-4-lecture', { db: context.db }),
    ).rejects.toBe(readFailure);
    expect(await getDatabaseSnapshot({ db: context.db })).toEqual(before);
  });

  it('holds the actual Resource loader transaction across a competing media write', async () => {
    const context = createTestDatabase('resource-coherence');
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
        'Bundled Week 4 lecture asset is required for A3 fixtures.',
      );
    }

    probe.reset();
    barrierEnabled = true;

    const writerDb = createProgressPalDatabase(context.name);
    await writerDb.open();

    let readPromise: ReturnType<typeof loadRpgStudyResourceSummary> | null =
      null;
    let writerPromise: Promise<void> | null = null;
    let writerState: 'pending' | 'fulfilled' | 'rejected' = 'pending';
    let writerError: unknown;

    try {
      readPromise = loadRpgStudyResourceSummary('week-4-lecture', {
        db: context.db,
      });
      await readReachedMediaCursor;

      writerPromise = writerDb.mediaProgressEvents
        .put({
          id: 'a3-coherence-media-write',
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

      assertResourceAccessContract(access);
      emitResourceAccessEvidence('loader-coherence', access);
      expect(barrierUsed).toBe(true);
      expect(writerState).toBe('fulfilled');
      expect(writerError).toBeUndefined();
      expect(summary?.longFormProgress?.eventCount ?? 0).toBe(0);
      expect(
        await writerDb.mediaProgressEvents.get('a3-coherence-media-write'),
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
