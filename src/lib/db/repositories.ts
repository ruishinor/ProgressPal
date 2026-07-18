import Dexie from 'dexie';

import {
  AchievementDefinitionSchema,
  AchievementUnlockSchema,
  AppMetaSchema,
  BackupRecordSchema,
  ContentAssetSchema,
  ContentSliceSchema,
  CourseItemSchema,
  CourseUnitSchema,
  LearnerProfileSchema,
  MediaProgressEventSchema,
  ProgressEntrySchema,
  ResumePointSchema,
  StudySessionSchema,
  XpTransactionSchema,
  domainScalarSchemas,
  parseCourseSeed,
  type AchievementCategory,
  type AchievementDefinition,
  type AchievementUnlock,
  type AppMeta,
  type BackupRecord,
  type ContentAsset,
  type ContentSlice,
  type CourseSeed,
  type CourseItem,
  type CourseUnit,
  type LearnerProfile,
  type MediaProgressEvent,
  type MediaStopReason,
  type ProgressEntry,
  type ResumePoint,
  type StudySession,
  type XpTransaction,
} from '@/lib/domain';
import { assertBackupDataInvariants } from '@/lib/backup';
import {
  achievementDefinitions,
  deriveAchievementUnlockId,
  evaluateAchievements,
  type AchievementEvaluationContext,
} from '@/lib/achievements';
import {
  buildLongFormProgressView,
  createSlicePlan,
  deriveLongFormAssetId,
  deriveLongFormSliceId,
  deriveResumePointId,
  getLongFormAssetDefinition,
  mergeCoveredRanges,
  type CoveredRange,
  type LongFormProgressView,
} from '@/lib/progress';
import { SchemaValidationError, parseWithSchema } from '@/lib/validation';
import {
  beginDestructiveLocalWrite,
  beginLocalWrite,
  type LocalWriteLease,
} from '@/lib/storage';
import {
  calculateXpSummary,
  deriveXpTransactionId,
  evaluateProgressXp,
  getCrossedBlocks,
  type XpSummary,
} from '@/lib/xp/engine';

import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  defaultLearnerProfileValues,
  singletonIds,
} from './constants';
import { getSharedDatabase, type ProgressPalDatabase } from './database';

export type DatabaseClock = () => string;

type CoordinatedTransactionContext = {
  database: ProgressPalDatabase;
  destructive: boolean;
};

const coordinatedTransactions = new WeakMap<
  object,
  CoordinatedTransactionContext
>();

function markCurrentTransactionCoordinated(
  database: ProgressPalDatabase,
  destructive = false,
) {
  const transaction = Dexie.currentTransaction;

  if (transaction === null) {
    throw new Error('A coordinated Dexie transaction was expected.');
  }

  if (transaction.db !== database) {
    throw new Error(
      'A coordinated Dexie transaction must belong to its target database.',
    );
  }

  coordinatedTransactions.set(transaction, { database, destructive });
}

function beginCoordinatedWrite(database: ProgressPalDatabase) {
  const coordinatedWrite = prepareCoordinatedWrite(database);

  coordinatedWrite.begin();

  return coordinatedWrite;
}

function prepareCoordinatedWrite(
  database: ProgressPalDatabase,
  mode: 'destructive' | 'ordinary' = 'ordinary',
) {
  const currentTransaction = Dexie.currentTransaction;
  const transactionTargetsDatabase = currentTransaction?.db === database;
  const inheritedContext =
    currentTransaction === null
      ? undefined
      : coordinatedTransactions.get(currentTransaction);

  if (transactionTargetsDatabase && inheritedContext?.database !== database) {
    throw new Error(
      'Repository writes cannot run inside an uncoordinated external transaction.',
    );
  }

  if (
    transactionTargetsDatabase &&
    mode === 'destructive' &&
    inheritedContext?.destructive !== true
  ) {
    throw new Error(
      'Destructive repository writes cannot inherit an ordinary coordinated transaction.',
    );
  }

  const isTopLevelWrite = !transactionTargetsDatabase;
  let destructiveAcquisition: Promise<void> | null = null;
  let lease: LocalWriteLease | null = null;
  let started = false;
  let settled = false;

  return {
    abort: () => {
      if (!started || settled) {
        return;
      }

      settled = true;
      lease?.abort();
    },
    begin: () => {
      if (started) {
        return;
      }

      if (isTopLevelWrite) {
        lease = beginLocalWrite();
      }

      started = true;
    },
    beginDestructive: () => {
      if (started) {
        return null;
      }

      if (!isTopLevelWrite) {
        started = true;
        return null;
      }

      destructiveAcquisition ??= beginDestructiveLocalWrite().then(
        (acquiredLease) => {
          lease = acquiredLease;
          started = true;
        },
      );

      return destructiveAcquisition;
    },
    complete: () => {
      if (!started || settled) {
        return;
      }

      settled = true;
      lease?.complete();
    },
  };
}

type PreparedCoordinatedWrite = ReturnType<typeof prepareCoordinatedWrite>;

type LogicalWriteScope = {
  changed: boolean;
  coordinatedWrite: PreparedCoordinatedWrite;
  database: ProgressPalDatabase;
};

function createLogicalWriteScope(database: ProgressPalDatabase) {
  return {
    changed: false,
    coordinatedWrite: prepareCoordinatedWrite(database),
    database,
  } satisfies LogicalWriteScope;
}

function settleLogicalWriteScope(scope: LogicalWriteScope) {
  if (scope.changed) {
    scope.coordinatedWrite.complete();
  } else {
    scope.coordinatedWrite.abort();
  }
}

async function runCoordinatedWrite<T>(
  database: ProgressPalDatabase,
  action: () => Promise<T>,
) {
  const coordinatedWrite = beginCoordinatedWrite(database);

  try {
    const result = await action();
    coordinatedWrite.complete();
    return result;
  } catch (error) {
    coordinatedWrite.abort();
    throw error;
  }
}

async function runDestructiveCoordinatedWrite<T>(
  database: ProgressPalDatabase,
  action: () => Promise<T>,
) {
  const coordinatedWrite = prepareCoordinatedWrite(database, 'destructive');

  try {
    const acquisition = coordinatedWrite.beginDestructive();

    if (acquisition !== null) {
      await acquisition;
    }

    const result = await action();
    coordinatedWrite.complete();
    return result;
  } catch (error) {
    coordinatedWrite.abort();
    throw error;
  }
}

export type DatabaseInitializationResult = {
  appMeta: AppMeta;
  createdAppMeta: boolean;
  createdLearnerProfile: boolean;
  seedSync: {
    itemCount: number;
    itemsAdded: number;
    itemsUpdated: number;
    seedVersion: number;
    unitCount: number;
    unitsAdded: number;
    unitsUpdated: number;
  } | null;
};

export type UpdateLearnerProfileInput = Partial<
  Omit<LearnerProfile, 'id' | 'createdAt' | 'updatedAt'>
>;

export type SaveLearnerProfileInput = Omit<
  LearnerProfile,
  'id' | 'createdAt' | 'updatedAt'
>;

export type UpsertProgressInput = Omit<
  ProgressEntry,
  'id' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
};

export type AddStudySessionInput = Omit<
  StudySession,
  'id' | 'createdAt' | 'updatedAt' | 'blockers'
> & {
  id?: string;
  blockers?: string[];
};

export type AddXpTransactionInput = Omit<
  XpTransaction,
  'id' | 'createdAt' | 'updatedAt'
> & {
  id?: string;
};

export type LogMediaProgressInput = {
  assetId: string;
  endSecond: number;
  energyAfter: number;
  energyBefore: number;
  notes?: string;
  sessionId?: string;
  startSecond: number;
  stoppedBecause: MediaStopReason;
};

export type LogMediaProgressResult = {
  asset: ContentAsset;
  event: MediaProgressEvent;
  longFormProgress: LongFormProgressView | null;
  progressEntry: ProgressEntry;
  resumePoint: ResumePoint;
  slices: ContentSlice[];
};

export type DatabaseSnapshot = {
  achievementDefinitions: AchievementDefinition[];
  achievementUnlocks: AchievementUnlock[];
  appMeta: AppMeta | null;
  backups: BackupRecord[];
  contentAssets: ContentAsset[];
  contentSlices: ContentSlice[];
  courseItems: CourseItem[];
  courseUnits: CourseUnit[];
  learnerProfile: LearnerProfile | null;
  mediaProgressEvents: MediaProgressEvent[];
  progressEntries: ProgressEntry[];
  resumePoints: ResumePoint[];
  studySessions: StudySession[];
  xpTransactions: XpTransaction[];
};

type BaseDatabaseOptions = {
  appVersion?: string;
  db?: ProgressPalDatabase;
  now?: DatabaseClock;
};

type InitializeDatabaseOptions = BaseDatabaseOptions & {
  seed?: CourseSeed | null;
};

type SeedSyncOptions = BaseDatabaseOptions & {
  skipBaseInitialization?: boolean;
};

type BaseInitializationResult = Pick<
  DatabaseInitializationResult,
  'appMeta' | 'createdAppMeta' | 'createdLearnerProfile'
> & {
  changed: boolean;
};

const defaultClock: DatabaseClock = () => new Date().toISOString();

function resolveDatabase(database?: ProgressPalDatabase) {
  return database ?? getSharedDatabase();
}

async function openingDatabaseMayWrite(database: ProgressPalDatabase) {
  if (typeof indexedDB.databases !== 'function') {
    // Without a read-only database catalog, the safe assumption is that open
    // may create or upgrade the database. This can conservatively block a
    // second tab on older engines, but it never permits an uncoordinated write.
    return true;
  }

  let databaseInfo: IDBDatabaseInfo | undefined;

  try {
    databaseInfo = (await indexedDB.databases()).find(
      (candidate) => candidate.name === database.name,
    );
  } catch {
    return true;
  }

  if (databaseInfo === undefined || databaseInfo.version === undefined) {
    return true;
  }

  const configuredNativeVersion = Math.round(database.verno * 10);
  return databaseInfo.version < configuredNativeVersion;
}

const pendingDatabaseOpens = new Map<string, Promise<void>>();

async function ensureOpen(
  database: ProgressPalDatabase,
  logicalWriteScope?: LogicalWriteScope,
) {
  if (database.isOpen()) {
    return database;
  }

  if (
    logicalWriteScope !== undefined &&
    logicalWriteScope.database !== database
  ) {
    throw new Error('A logical write scope cannot switch database objects.');
  }

  const precedingOpen = pendingDatabaseOpens.get(database.name);

  const queuedOpen = (async () => {
    if (precedingOpen !== undefined) {
      await precedingOpen;
    }

    if (database.isOpen()) {
      return;
    }

    if (await openingDatabaseMayWrite(database)) {
      if (logicalWriteScope === undefined) {
        await runCoordinatedWrite(database, () => database.open());
      } else {
        logicalWriteScope.coordinatedWrite.begin();
        await database.open();
        logicalWriteScope.changed = true;
      }
    } else {
      await database.open();
    }
  })();

  pendingDatabaseOpens.set(database.name, queuedOpen);

  try {
    await queuedOpen;
    return database;
  } finally {
    if (pendingDatabaseOpens.get(database.name) === queuedOpen) {
      pendingDatabaseOpens.delete(database.name);
    }
  }
}

function createEntityId(prefix: string) {
  const cryptoApi = globalThis.crypto;
  const randomToken =
    cryptoApi !== undefined && typeof cryptoApi.randomUUID === 'function'
      ? cryptoApi.randomUUID().replaceAll('-', '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;

  return `${prefix}-${randomToken.slice(0, 24)}`.toLowerCase();
}

function parseStoredArray<T>(
  values: unknown[],
  label: string,
  schema: Parameters<typeof parseWithSchema<T>>[0],
) {
  return values.map((value, index) =>
    parseWithSchema(schema, value, `${label} ${index + 1}`),
  );
}

function createDefaultAppMeta(timestamp: string, appVersion: string) {
  return parseWithSchema(
    AppMetaSchema,
    {
      id: singletonIds.appMeta,
      createdAt: timestamp,
      updatedAt: timestamp,
      appVersion,
      schemaVersion: currentDatabaseSchemaVersion,
      seedVersion: 0,
    },
    'App metadata',
  );
}

function createDefaultLearnerProfile(timestamp: string) {
  return parseWithSchema(
    LearnerProfileSchema,
    {
      id: singletonIds.learnerProfile,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...defaultLearnerProfileValues,
    },
    'Learner profile',
  );
}

async function getExistingProfileOrThrow(database: ProgressPalDatabase) {
  const existingProfile = await getProfile({ db: database });

  if (existingProfile === null) {
    throw new Error('Learner profile is missing after initialization.');
  }

  return existingProfile;
}

async function ensureBaseInitialization(
  options: BaseDatabaseOptions = {},
  inheritedWriteScope?: LogicalWriteScope,
): Promise<BaseInitializationResult> {
  const appVersion = options.appVersion ?? currentApplicationVersion;
  const now = options.now ?? defaultClock;
  const requestedDatabase = resolveDatabase(options.db);
  const ownsWriteScope = inheritedWriteScope === undefined;
  const logicalWriteScope =
    inheritedWriteScope ?? createLogicalWriteScope(requestedDatabase);
  let database: ProgressPalDatabase;

  try {
    database = await ensureOpen(requestedDatabase, logicalWriteScope);
  } catch (error) {
    if (ownsWriteScope) {
      settleLogicalWriteScope(logicalWriteScope);
    }
    throw error;
  }

  const [initialAppMetaRecord, initialProfileRecord] = await Promise.all([
    database.appMeta.get(singletonIds.appMeta),
    database.learnerProfile.get(singletonIds.learnerProfile),
  ]);
  const initialAppMeta =
    initialAppMetaRecord === undefined
      ? null
      : parseWithSchema(
          AppMetaSchema,
          initialAppMetaRecord,
          'Stored app metadata',
        );

  if (initialProfileRecord !== undefined) {
    parseWithSchema(
      LearnerProfileSchema,
      initialProfileRecord,
      'Stored learner profile',
    );
  }

  const needsAppMetaWrite =
    initialAppMeta === null ||
    initialAppMeta.schemaVersion !== currentDatabaseSchemaVersion ||
    initialAppMeta.appVersion !== appVersion;
  const needsProfileWrite = initialProfileRecord === undefined;

  if (!needsAppMetaWrite && !needsProfileWrite) {
    if (ownsWriteScope) {
      settleLogicalWriteScope(logicalWriteScope);
    }

    return {
      appMeta: initialAppMeta,
      changed: false,
      createdAppMeta: false,
      createdLearnerProfile: false,
    };
  }

  logicalWriteScope.coordinatedWrite.begin();

  let createdAppMeta = false;
  let createdLearnerProfile = false;
  let updatedAppMeta = false;
  let appMeta: AppMeta | null = null;
  let finalAppMeta: AppMeta;

  try {
    finalAppMeta = await database.transaction(
      'rw',
      database.appMeta,
      database.learnerProfile,
      async () => {
        const timestamp = now();
        const storedAppMeta = await database.appMeta.get(singletonIds.appMeta);

        if (storedAppMeta === undefined) {
          createdAppMeta = true;
          appMeta = createDefaultAppMeta(timestamp, appVersion);
          await database.appMeta.add(appMeta);
        } else {
          const parsedAppMeta = parseWithSchema(
            AppMetaSchema,
            storedAppMeta,
            'Stored app metadata',
          );

          if (
            parsedAppMeta.schemaVersion !== currentDatabaseSchemaVersion ||
            parsedAppMeta.appVersion !== appVersion
          ) {
            updatedAppMeta = true;
            appMeta = parseWithSchema(
              AppMetaSchema,
              {
                ...parsedAppMeta,
                appVersion,
                schemaVersion: currentDatabaseSchemaVersion,
                updatedAt: timestamp,
              },
              'Updated app metadata',
            );
            await database.appMeta.put(appMeta);
          } else {
            appMeta = parsedAppMeta;
          }
        }

        const storedLearnerProfile = await database.learnerProfile.get(
          singletonIds.learnerProfile,
        );

        if (storedLearnerProfile === undefined) {
          createdLearnerProfile = true;
          await database.learnerProfile.add(
            createDefaultLearnerProfile(timestamp),
          );
        } else {
          parseWithSchema(
            LearnerProfileSchema,
            storedLearnerProfile,
            'Stored learner profile',
          );
        }

        if (appMeta === null) {
          throw new Error('App metadata is missing during initialization.');
        }

        return appMeta;
      },
    );
  } catch (error) {
    if (ownsWriteScope) {
      settleLogicalWriteScope(logicalWriteScope);
    }
    throw error;
  }

  const changed = createdAppMeta || createdLearnerProfile || updatedAppMeta;

  logicalWriteScope.changed ||= changed;

  if (ownsWriteScope) {
    settleLogicalWriteScope(logicalWriteScope);
  }

  return {
    appMeta: finalAppMeta,
    changed,
    createdAppMeta,
    createdLearnerProfile,
  };
}

function materializeCourseUnit(
  courseSeed: CourseSeed,
  unit: CourseSeed['units'][number],
  timestamp: string,
) {
  return parseWithSchema(
    CourseUnitSchema,
    {
      id: unit.id,
      createdAt: timestamp,
      updatedAt: timestamp,
      courseId: courseSeed.courseId,
      title: unit.title,
      order: unit.order,
      type: unit.type,
      sourceYear: unit.sourceYear,
      required: unit.required,
    },
    `Course unit "${unit.id}"`,
  );
}

function materializeCourseItem(
  unitId: string,
  item: CourseSeed['units'][number]['items'][number],
  timestamp: string,
) {
  return parseWithSchema(
    CourseItemSchema,
    {
      id: item.id,
      createdAt: timestamp,
      updatedAt: timestamp,
      unitId,
      type: item.type,
      title: item.title,
      required: item.required,
      estimatedMinutes: item.estimatedMinutes,
      order: item.order,
    },
    `Course item "${item.id}"`,
  );
}

function courseUnitNeedsUpdate(existing: CourseUnit, next: CourseUnit) {
  return (
    existing.courseId !== next.courseId ||
    existing.title !== next.title ||
    existing.order !== next.order ||
    existing.type !== next.type ||
    existing.sourceYear !== next.sourceYear ||
    existing.required !== next.required
  );
}

function courseItemNeedsUpdate(existing: CourseItem, next: CourseItem) {
  return (
    existing.unitId !== next.unitId ||
    existing.type !== next.type ||
    existing.title !== next.title ||
    existing.required !== next.required ||
    existing.estimatedMinutes !== next.estimatedMinutes ||
    existing.order !== next.order
  );
}

function sortCourseUnits(units: CourseUnit[]) {
  return [...units].sort(
    (left, right) =>
      left.order - right.order ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id),
  );
}

function sortCourseItems(items: CourseItem[]) {
  return [...items].sort(
    (left, right) =>
      left.order - right.order ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id),
  );
}

function sortProgressEntries(entries: ProgressEntry[]) {
  return [...entries].sort((left, right) =>
    left.itemId.localeCompare(right.itemId),
  );
}

function sortStudySessions(sessions: StudySession[]) {
  return [...sessions].sort(
    (left, right) =>
      left.startedAt.localeCompare(right.startedAt) ||
      left.id.localeCompare(right.id),
  );
}

function sortXpTransactions(transactions: XpTransaction[]) {
  return [...transactions].sort(
    (left, right) =>
      left.awardedAt.localeCompare(right.awardedAt) ||
      left.id.localeCompare(right.id),
  );
}

function sortAchievementUnlocks(unlocks: AchievementUnlock[]) {
  return [...unlocks].sort(
    (left, right) =>
      left.unlockedAt.localeCompare(right.unlockedAt) ||
      left.achievementId.localeCompare(right.achievementId),
  );
}

function sortContentAssets(assets: ContentAsset[]) {
  return [...assets].sort(
    (left, right) =>
      left.itemId.localeCompare(right.itemId) ||
      left.order - right.order ||
      left.id.localeCompare(right.id),
  );
}

function sortContentSlices(slices: ContentSlice[]) {
  return [...slices].sort(
    (left, right) =>
      left.assetId.localeCompare(right.assetId) ||
      left.order - right.order ||
      left.id.localeCompare(right.id),
  );
}

function sortMediaProgressEvents(events: MediaProgressEvent[]) {
  return [...events].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
  );
}

function sortResumePoints(resumePoints: ResumePoint[]) {
  return [...resumePoints].sort(
    (left, right) =>
      left.itemId.localeCompare(right.itemId) ||
      left.assetId.localeCompare(right.assetId),
  );
}

function calculateSliceCoverage(
  slice: Pick<ContentSlice, 'endSecond' | 'startSecond'>,
  coverageRanges: readonly CoveredRange[],
) {
  const sliceDuration = slice.endSecond - slice.startSecond;

  if (sliceDuration <= 0) {
    return 0;
  }

  const coveredSeconds = coverageRanges.reduce((total, range) => {
    const overlapStart = Math.max(slice.startSecond, range.startSecond);
    const overlapEnd = Math.min(slice.endSecond, range.endSecond);

    if (overlapEnd <= overlapStart) {
      return total;
    }

    return total + (overlapEnd - overlapStart);
  }, 0);

  return Math.min(coveredSeconds / sliceDuration, 1);
}

function materializeContentAsset(item: CourseItem, timestamp: string) {
  const assetDefinition = getLongFormAssetDefinition(item);

  if (assetDefinition === null) {
    return null;
  }

  return parseWithSchema(
    ContentAssetSchema,
    {
      id: deriveLongFormAssetId(item.id),
      createdAt: timestamp,
      updatedAt: timestamp,
      itemId: item.id,
      assetType: assetDefinition.assetType,
      title: item.title,
      sourceLabel: assetDefinition.sourceLabel,
      sourceUrl: undefined,
      estimatedMinutes: item.estimatedMinutes,
      durationSeconds: assetDefinition.durationSeconds,
      defaultSliceMinutes: assetDefinition.defaultSliceMinutes,
      order: 0,
      required: item.required,
    },
    `Content asset for "${item.id}"`,
  );
}

function materializeContentSlices(
  asset: ContentAsset,
  timestamp: string,
  existingSlices: readonly ContentSlice[] = [],
  coverageRanges: readonly CoveredRange[] = [],
) {
  if (
    asset.durationSeconds === undefined ||
    asset.defaultSliceMinutes === undefined
  ) {
    return [];
  }

  const existingSlicesById = new Map(
    existingSlices.map((slice) => [slice.id, slice]),
  );

  return createSlicePlan(asset.durationSeconds, asset.defaultSliceMinutes).map(
    (slicePlan) => {
      const sliceId = deriveLongFormSliceId(asset.id, slicePlan.order);
      const existingSlice = existingSlicesById.get(sliceId);
      const coverage = calculateSliceCoverage(
        {
          endSecond: slicePlan.endSecond,
          startSecond: slicePlan.startSecond,
        },
        coverageRanges,
      );
      const nextStatus =
        existingSlice?.status === 'skipped'
          ? 'skipped'
          : coverage >= 1
            ? 'completed'
            : coverage > 0
              ? 'active'
              : 'not_started';

      return parseWithSchema(
        ContentSliceSchema,
        {
          id: sliceId,
          assetId: asset.id,
          itemId: asset.itemId,
          createdAt: existingSlice?.createdAt ?? timestamp,
          updatedAt: timestamp,
          order: slicePlan.order,
          label: slicePlan.label,
          startSecond: slicePlan.startSecond,
          endSecond: slicePlan.endSecond,
          plannedMinutes: slicePlan.plannedMinutes,
          status: nextStatus,
          skipReason:
            nextStatus === 'skipped' ? existingSlice?.skipReason : undefined,
          completedAt:
            nextStatus === 'completed'
              ? (existingSlice?.completedAt ?? timestamp)
              : undefined,
        },
        `Content slice "${sliceId}"`,
      );
    },
  );
}

function contentAssetNeedsUpdate(existing: ContentAsset, next: ContentAsset) {
  return (
    existing.itemId !== next.itemId ||
    existing.assetType !== next.assetType ||
    existing.title !== next.title ||
    existing.sourceLabel !== next.sourceLabel ||
    existing.sourceUrl !== next.sourceUrl ||
    existing.estimatedMinutes !== next.estimatedMinutes ||
    existing.durationSeconds !== next.durationSeconds ||
    existing.defaultSliceMinutes !== next.defaultSliceMinutes ||
    existing.order !== next.order ||
    existing.required !== next.required
  );
}

function derivedSlicesAreUnchanged(
  existingSlices: readonly ContentSlice[],
  nextSlices: readonly ContentSlice[],
) {
  if (existingSlices.length !== nextSlices.length) {
    return false;
  }

  const existingSlicesById = new Map(
    existingSlices.map((slice) => [slice.id, slice]),
  );

  // Compares the semantic slice plan only. Metadata timestamps (createdAt and
  // updatedAt) are intentionally ignored so a repeated bootstrap does not
  // rewrite rows whose derived plan has not changed.
  return nextSlices.every((nextSlice) => {
    const existingSlice = existingSlicesById.get(nextSlice.id);

    return (
      existingSlice !== undefined &&
      existingSlice.assetId === nextSlice.assetId &&
      existingSlice.itemId === nextSlice.itemId &&
      existingSlice.order === nextSlice.order &&
      existingSlice.label === nextSlice.label &&
      existingSlice.startSecond === nextSlice.startSecond &&
      existingSlice.endSecond === nextSlice.endSecond &&
      existingSlice.plannedMinutes === nextSlice.plannedMinutes &&
      existingSlice.status === nextSlice.status &&
      existingSlice.skipReason === nextSlice.skipReason &&
      existingSlice.completedAt === nextSlice.completedAt
    );
  });
}

async function syncDerivedLongFormCatalogFromCourseItems(
  courseItems: readonly CourseItem[],
  options: BaseDatabaseOptions & { beforeWrite?: () => void } = {},
) {
  const now = options.now ?? defaultClock;
  const database = await ensureOpen(resolveDatabase(options.db));
  const longFormItems = courseItems
    .map((item) => ({
      item,
      nextAsset: materializeContentAsset(item, now()),
    }))
    .filter(
      (candidate): candidate is { item: CourseItem; nextAsset: ContentAsset } =>
        candidate.nextAsset !== null,
    );

  if (longFormItems.length === 0) {
    return false;
  }

  let changed = false;

  await database.transaction(
    'rw',
    database.contentAssets,
    database.contentSlices,
    database.mediaProgressEvents,
    database.resumePoints,
    async () => {
      for (const { item, nextAsset } of longFormItems) {
        const [
          existingAssetRecord,
          existingSliceRecords,
          mediaProgressRecords,
        ] = await Promise.all([
          database.contentAssets.get(nextAsset.id),
          database.contentSlices
            .where('assetId')
            .equals(nextAsset.id)
            .toArray(),
          database.mediaProgressEvents
            .where('assetId')
            .equals(nextAsset.id)
            .toArray(),
        ]);
        const timestamp = now();
        const existingAsset =
          existingAssetRecord === undefined
            ? null
            : parseWithSchema(
                ContentAssetSchema,
                existingAssetRecord,
                `Stored content asset "${nextAsset.id}"`,
              );
        const existingSlices = parseStoredArray(
          existingSliceRecords,
          `Stored content slice for "${nextAsset.id}"`,
          ContentSliceSchema,
        );
        const mediaProgressEvents = sortMediaProgressEvents(
          parseStoredArray(
            mediaProgressRecords,
            `Stored media progress event for "${nextAsset.id}"`,
            MediaProgressEventSchema,
          ),
        );
        const coverageRanges = mergeCoveredRanges(
          mediaProgressEvents.map((event) => ({
            endSecond: event.endSecond,
            startSecond: event.startSecond,
          })),
        );
        const hasSavedMediaProgress = mediaProgressEvents.length > 0;
        const assetToPersist = parseWithSchema(
          ContentAssetSchema,
          {
            ...nextAsset,
            createdAt: existingAsset?.createdAt ?? timestamp,
            durationSeconds:
              hasSavedMediaProgress &&
              existingAsset?.durationSeconds !== undefined
                ? existingAsset.durationSeconds
                : nextAsset.durationSeconds,
            defaultSliceMinutes:
              hasSavedMediaProgress &&
              existingAsset?.defaultSliceMinutes !== undefined
                ? existingAsset.defaultSliceMinutes
                : nextAsset.defaultSliceMinutes,
            estimatedMinutes: hasSavedMediaProgress
              ? (existingAsset?.estimatedMinutes ?? nextAsset.estimatedMinutes)
              : nextAsset.estimatedMinutes,
            required: item.required,
            title: item.title,
            updatedAt: timestamp,
          },
          `Synced content asset "${nextAsset.id}"`,
        );

        if (existingAsset === null) {
          options.beforeWrite?.();
          changed = true;
          await database.contentAssets.add(assetToPersist);
          await database.contentSlices.bulkAdd(
            materializeContentSlices(assetToPersist, timestamp),
          );
          continue;
        }

        if (contentAssetNeedsUpdate(existingAsset, assetToPersist)) {
          options.beforeWrite?.();
          changed = true;
          await database.contentAssets.put(assetToPersist);
        }

        if (hasSavedMediaProgress) {
          continue;
        }

        const nextSlices = materializeContentSlices(
          assetToPersist,
          timestamp,
          existingSlices,
          coverageRanges,
        );

        // Idempotency guard: when the derived slice plan is semantically
        // unchanged, leave the stored rows untouched so a repeated bootstrap
        // does not churn updatedAt on unwatched assets. A real plan change
        // (e.g. a seed-estimate edit before any media history) still falls
        // through to the deliberate rewrite below.
        if (derivedSlicesAreUnchanged(existingSlices, nextSlices)) {
          continue;
        }

        options.beforeWrite?.();
        changed = true;
        await database.contentSlices
          .where('assetId')
          .equals(assetToPersist.id)
          .delete();

        if (nextSlices.length > 0) {
          await database.contentSlices.bulkAdd(nextSlices);
        }
      }
    },
  );

  return changed;
}

export async function initializeDatabase(
  options: InitializeDatabaseOptions = {},
): Promise<DatabaseInitializationResult> {
  const database = resolveDatabase(options.db);
  const logicalWriteScope = createLogicalWriteScope(database);
  const scopedOptions = { ...options, db: database };

  try {
    const baseInitialization = await ensureBaseInitialization(
      scopedOptions,
      logicalWriteScope,
    );
    const seedSync =
      options.seed === null || options.seed === undefined
        ? null
        : await ensureCourseCatalogFromSeedWithinScope(
            options.seed,
            {
              ...scopedOptions,
              skipBaseInitialization: true,
            },
            logicalWriteScope,
          );

    settleLogicalWriteScope(logicalWriteScope);

    return {
      appMeta: baseInitialization.appMeta,
      createdAppMeta: baseInitialization.createdAppMeta,
      createdLearnerProfile: baseInitialization.createdLearnerProfile,
      seedSync,
    };
  } catch (error) {
    settleLogicalWriteScope(logicalWriteScope);
    throw error;
  }
}

export async function getAppMeta(options: BaseDatabaseOptions = {}) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const appMeta = await database.appMeta.get(singletonIds.appMeta);

  return appMeta === undefined
    ? null
    : parseWithSchema(AppMetaSchema, appMeta, 'Stored app metadata');
}

export async function getRequiredAppMeta(options: BaseDatabaseOptions = {}) {
  const appMeta = await getAppMeta(options);

  if (appMeta === null) {
    throw new Error('App metadata has not been initialized.');
  }

  return appMeta;
}

export async function getProfile(options: BaseDatabaseOptions = {}) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const learnerProfile = await database.learnerProfile.get(
    singletonIds.learnerProfile,
  );

  return learnerProfile === undefined
    ? null
    : parseWithSchema(
        LearnerProfileSchema,
        learnerProfile,
        'Stored learner profile',
      );
}

export async function saveLearnerProfile(
  input: SaveLearnerProfileInput,
  options: BaseDatabaseOptions & { completeOnboarding?: boolean } = {},
) {
  const now = options.now ?? defaultClock;
  const database = await ensureOpen(resolveDatabase(options.db));

  await ensureBaseInitialization(options);

  const [existingProfile, appMeta] = await Promise.all([
    getExistingProfileOrThrow(database),
    getRequiredAppMeta({ db: database }),
  ]);
  const timestamp = now();
  const learnerProfile = parseWithSchema(
    LearnerProfileSchema,
    {
      ...existingProfile,
      ...input,
      updatedAt: timestamp,
    },
    'Saved learner profile',
  );
  const shouldMarkOnboardingComplete =
    options.completeOnboarding === true ||
    appMeta.onboardingCompletedAt !== undefined;
  const nextAppMeta = shouldMarkOnboardingComplete
    ? parseWithSchema(
        AppMetaSchema,
        {
          ...appMeta,
          onboardingCompletedAt: appMeta.onboardingCompletedAt ?? timestamp,
          updatedAt: timestamp,
        },
        'Updated app metadata',
      )
    : appMeta;

  await runCoordinatedWrite(database, () =>
    database.transaction(
      'rw',
      database.appMeta,
      database.learnerProfile,
      async () => {
        await database.learnerProfile.put(learnerProfile);

        if (nextAppMeta !== appMeta) {
          await database.appMeta.put(nextAppMeta);
        }
      },
    ),
  );

  return {
    appMeta: nextAppMeta,
    learnerProfile,
  };
}

export async function updateProfile(
  input: UpdateLearnerProfileInput,
  options: BaseDatabaseOptions = {},
) {
  const now = options.now ?? defaultClock;
  const database = await ensureOpen(resolveDatabase(options.db));

  await ensureBaseInitialization(options);

  const existingProfile = await getExistingProfileOrThrow(database);

  const updatedProfile = parseWithSchema(
    LearnerProfileSchema,
    {
      ...existingProfile,
      ...input,
      updatedAt: now(),
    },
    'Updated learner profile',
  );

  await runCoordinatedWrite(database, () =>
    database.learnerProfile.put(updatedProfile),
  );

  return updatedProfile;
}

async function ensureCourseCatalogFromSeedWithinScope(
  seedInput: unknown,
  options: SeedSyncOptions = {},
  inheritedWriteScope?: LogicalWriteScope,
) {
  const parsedSeed = parseCourseSeed(seedInput);
  const now = options.now ?? defaultClock;
  const requestedDatabase = resolveDatabase(options.db);
  const ownsWriteScope = inheritedWriteScope === undefined;
  const logicalWriteScope =
    inheritedWriteScope ?? createLogicalWriteScope(requestedDatabase);
  const coordinatedWrite = logicalWriteScope.coordinatedWrite;
  let database: ProgressPalDatabase;

  try {
    database = await ensureOpen(requestedDatabase, logicalWriteScope);
  } catch (error) {
    if (ownsWriteScope) {
      settleLogicalWriteScope(logicalWriteScope);
    }
    throw error;
  }

  let changed = false;
  try {
    if (options.skipBaseInitialization !== true) {
      await ensureBaseInitialization(options, logicalWriteScope);
    }

    const result = await database.transaction(
      'rw',
      [
        database.appMeta,
        database.courseUnits,
        database.courseItems,
        database.contentAssets,
        database.contentSlices,
        database.mediaProgressEvents,
        database.resumePoints,
      ],
      async () => {
        const timestamp = now();
        const units = parsedSeed.units;
        const items = units.flatMap((unit) =>
          unit.items.map((item) => ({ item, unitId: unit.id })),
        );

        const existingUnits = await database.courseUnits.bulkGet(
          units.map((unit) => unit.id),
        );
        const existingItems = await database.courseItems.bulkGet(
          items.map(({ item }) => item.id),
        );

        const unitsToAdd: CourseUnit[] = [];
        const unitsToUpdate: CourseUnit[] = [];

        for (const [index, unit] of units.entries()) {
          const nextUnit = materializeCourseUnit(parsedSeed, unit, timestamp);
          const existingUnitRecord = existingUnits[index];

          if (existingUnitRecord === undefined) {
            unitsToAdd.push(nextUnit);
            continue;
          }

          const existingUnit = parseWithSchema(
            CourseUnitSchema,
            existingUnitRecord,
            `Stored course unit "${unit.id}"`,
          );

          if (courseUnitNeedsUpdate(existingUnit, nextUnit)) {
            unitsToUpdate.push({
              ...nextUnit,
              createdAt: existingUnit.createdAt,
            });
          }
        }

        const itemsToAdd: CourseItem[] = [];
        const itemsToUpdate: CourseItem[] = [];

        for (const [index, { item, unitId }] of items.entries()) {
          const nextItem = materializeCourseItem(unitId, item, timestamp);
          const existingItemRecord = existingItems[index];

          if (existingItemRecord === undefined) {
            itemsToAdd.push(nextItem);
            continue;
          }

          const existingItem = parseWithSchema(
            CourseItemSchema,
            existingItemRecord,
            `Stored course item "${item.id}"`,
          );

          if (courseItemNeedsUpdate(existingItem, nextItem)) {
            itemsToUpdate.push({
              ...nextItem,
              createdAt: existingItem.createdAt,
            });
          }
        }

        const unitsAdded = unitsToAdd.length;
        const unitsUpdated = unitsToUpdate.length;
        const itemsAdded = itemsToAdd.length;
        const itemsUpdated = itemsToUpdate.length;

        const appMeta = await getRequiredAppMeta({ db: database });
        const shouldUpdateMetadata =
          appMeta.seedVersion !== parsedSeed.dataVersion ||
          unitsAdded > 0 ||
          unitsUpdated > 0 ||
          itemsAdded > 0 ||
          itemsUpdated > 0;

        if (shouldUpdateMetadata) {
          coordinatedWrite.begin();
        }

        if (unitsToAdd.length > 0) {
          await database.courseUnits.bulkAdd(unitsToAdd);
        }

        if (unitsToUpdate.length > 0) {
          await database.courseUnits.bulkPut(unitsToUpdate);
        }

        if (itemsToAdd.length > 0) {
          await database.courseItems.bulkAdd(itemsToAdd);
        }

        if (itemsToUpdate.length > 0) {
          await database.courseItems.bulkPut(itemsToUpdate);
        }

        if (shouldUpdateMetadata) {
          await database.appMeta.put(
            parseWithSchema(
              AppMetaSchema,
              {
                ...appMeta,
                seedVersion: parsedSeed.dataVersion,
                updatedAt: now(),
              },
              'Updated app metadata',
            ),
          );
        }

        const catalogChanged =
          shouldUpdateMetadata ||
          unitsAdded > 0 ||
          unitsUpdated > 0 ||
          itemsAdded > 0 ||
          itemsUpdated > 0;

        const derivedChanged = await syncDerivedLongFormCatalogFromCourseItems(
          await listCourseItems(undefined, { db: database }),
          { beforeWrite: coordinatedWrite.begin, db: database, now },
        );
        changed = catalogChanged || derivedChanged;

        const synchronizedAppMeta = await getRequiredAppMeta({ db: database });

        return {
          unitCount: parsedSeed.units.length,
          unitsAdded,
          unitsUpdated,
          itemCount: parsedSeed.units.reduce(
            (total, unit) => total + unit.items.length,
            0,
          ),
          itemsAdded,
          itemsUpdated,
          seedVersion: synchronizedAppMeta.seedVersion,
        };
      },
    );

    logicalWriteScope.changed ||= changed;

    if (ownsWriteScope) {
      settleLogicalWriteScope(logicalWriteScope);
    }

    return result;
  } catch (error) {
    if (ownsWriteScope) {
      settleLogicalWriteScope(logicalWriteScope);
    }
    throw error;
  }
}

export async function ensureCourseCatalogFromSeed(
  seedInput: unknown,
  options: SeedSyncOptions = {},
) {
  return ensureCourseCatalogFromSeedWithinScope(seedInput, options);
}

export async function listCourseUnits(
  courseId?: string,
  options: BaseDatabaseOptions = {},
) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const validatedCourseId =
    courseId === undefined
      ? undefined
      : parseWithSchema(domainScalarSchemas.entityId, courseId, 'Course id');

  const units =
    validatedCourseId === undefined
      ? await database.courseUnits.toArray()
      : await database.courseUnits
          .where('courseId')
          .equals(validatedCourseId)
          .toArray();

  return sortCourseUnits(
    parseStoredArray(units, 'Stored course unit', CourseUnitSchema),
  );
}

export async function getCourseUnit(
  unitId: string,
  options: BaseDatabaseOptions = {},
) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const validatedUnitId = parseWithSchema(
    domainScalarSchemas.entityId,
    unitId,
    'Unit id',
  );
  const unitRecord = await database.courseUnits.get(validatedUnitId);

  return unitRecord === undefined
    ? null
    : parseWithSchema(
        CourseUnitSchema,
        unitRecord,
        `Stored course unit "${validatedUnitId}"`,
      );
}

export async function listCourseItems(
  unitId?: string,
  options: BaseDatabaseOptions = {},
) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const validatedUnitId =
    unitId === undefined
      ? undefined
      : parseWithSchema(domainScalarSchemas.entityId, unitId, 'Unit id');

  const items =
    validatedUnitId === undefined
      ? await database.courseItems.toArray()
      : await database.courseItems
          .where('unitId')
          .equals(validatedUnitId)
          .toArray();

  return sortCourseItems(
    parseStoredArray(items, 'Stored course item', CourseItemSchema),
  );
}

export async function getCourseItem(
  itemId: string,
  options: BaseDatabaseOptions = {},
) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const validatedItemId = parseWithSchema(
    domainScalarSchemas.entityId,
    itemId,
    'Item id',
  );
  const itemRecord = await database.courseItems.get(validatedItemId);

  return itemRecord === undefined
    ? null
    : parseWithSchema(
        CourseItemSchema,
        itemRecord,
        `Stored course item "${validatedItemId}"`,
      );
}

export async function listContentAssets(
  itemId?: string,
  options: BaseDatabaseOptions = {},
) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const validatedItemId =
    itemId === undefined
      ? undefined
      : parseWithSchema(domainScalarSchemas.entityId, itemId, 'Item id');

  const assets =
    validatedItemId === undefined
      ? await database.contentAssets.toArray()
      : await database.contentAssets
          .where('itemId')
          .equals(validatedItemId)
          .toArray();

  return sortContentAssets(
    parseStoredArray(assets, 'Stored content asset', ContentAssetSchema),
  );
}

export async function listContentSlices(
  assetId?: string,
  options: BaseDatabaseOptions = {},
) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const validatedAssetId =
    assetId === undefined
      ? undefined
      : parseWithSchema(domainScalarSchemas.entityId, assetId, 'Asset id');

  const slices =
    validatedAssetId === undefined
      ? await database.contentSlices.toArray()
      : await database.contentSlices
          .where('assetId')
          .equals(validatedAssetId)
          .toArray();

  return sortContentSlices(
    parseStoredArray(slices, 'Stored content slice', ContentSliceSchema),
  );
}

export async function listMediaProgressEvents(
  assetId?: string,
  options: BaseDatabaseOptions = {},
) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const validatedAssetId =
    assetId === undefined
      ? undefined
      : parseWithSchema(domainScalarSchemas.entityId, assetId, 'Asset id');

  const events =
    validatedAssetId === undefined
      ? await database.mediaProgressEvents.toArray()
      : await database.mediaProgressEvents
          .where('assetId')
          .equals(validatedAssetId)
          .toArray();

  return sortMediaProgressEvents(
    parseStoredArray(
      events,
      'Stored media progress event',
      MediaProgressEventSchema,
    ),
  );
}

export async function getResumePoint(
  assetId: string,
  options: BaseDatabaseOptions = {},
) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const validatedAssetId = parseWithSchema(
    domainScalarSchemas.entityId,
    assetId,
    'Asset id',
  );
  const resumePoint = await database.resumePoints
    .where('assetId')
    .equals(validatedAssetId)
    .first();

  return resumePoint === undefined
    ? null
    : parseWithSchema(
        ResumePointSchema,
        resumePoint,
        `Resume point for "${validatedAssetId}"`,
      );
}

export async function listResumePoints(options: BaseDatabaseOptions = {}) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const resumePoints = await database.resumePoints.toArray();

  return sortResumePoints(
    parseStoredArray(resumePoints, 'Stored resume point', ResumePointSchema),
  );
}

export async function getProgress(
  itemId: string,
  options: BaseDatabaseOptions = {},
) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const validatedItemId = parseWithSchema(
    domainScalarSchemas.entityId,
    itemId,
    'Item id',
  );
  const progressEntry = await database.progressEntries
    .where('itemId')
    .equals(validatedItemId)
    .first();

  return progressEntry === undefined
    ? null
    : parseWithSchema(
        ProgressEntrySchema,
        progressEntry,
        `Progress entry for "${validatedItemId}"`,
      );
}

export async function listProgressEntries(options: BaseDatabaseOptions = {}) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const progressEntries = await database.progressEntries.toArray();

  return sortProgressEntries(
    parseStoredArray(
      progressEntries,
      'Stored progress entry',
      ProgressEntrySchema,
    ),
  );
}

export async function listStudySessions(options: BaseDatabaseOptions = {}) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const studySessions = await database.studySessions.toArray();

  return sortStudySessions(
    parseStoredArray(studySessions, 'Stored study session', StudySessionSchema),
  );
}

export async function upsertProgress(
  input: UpsertProgressInput,
  options: BaseDatabaseOptions = {},
) {
  const now = options.now ?? defaultClock;
  const database = await ensureOpen(resolveDatabase(options.db));

  await ensureBaseInitialization(options);

  const existingProgress = await getProgress(input.itemId, { db: database });
  const timestamp = now();

  if (
    existingProgress !== null &&
    input.id !== undefined &&
    input.id !== existingProgress.id
  ) {
    throw new SchemaValidationError('Progress entry', [
      'root: input id does not match the existing record for this itemId.',
    ]);
  }

  const progressEntry = parseWithSchema(
    ProgressEntrySchema,
    {
      ...input,
      id: existingProgress?.id ?? input.id ?? createEntityId('progress'),
      createdAt: existingProgress?.createdAt ?? timestamp,
      updatedAt: timestamp,
    },
    'Progress entry',
  );

  await runCoordinatedWrite(database, () =>
    database.progressEntries.put(progressEntry),
  );

  return progressEntry;
}

export async function logMediaProgress(
  input: LogMediaProgressInput,
  options: BaseDatabaseOptions = {},
): Promise<LogMediaProgressResult> {
  const now = options.now ?? defaultClock;
  const database = await ensureOpen(resolveDatabase(options.db));

  await ensureBaseInitialization(options);

  const validatedAssetId = parseWithSchema(
    domainScalarSchemas.entityId,
    input.assetId,
    'Asset id',
  );
  const validatedStartSecond = parseWithSchema(
    domainScalarSchemas.nonNegativeInteger,
    input.startSecond,
    'Media progress startSecond',
  );
  const validatedEndSecond = parseWithSchema(
    domainScalarSchemas.positiveInteger,
    input.endSecond,
    'Media progress endSecond',
  );
  const validatedSessionId =
    input.sessionId === undefined
      ? undefined
      : parseWithSchema(
          domainScalarSchemas.entityId,
          input.sessionId,
          'Study session id',
        );
  const assetRecord = await database.contentAssets.get(validatedAssetId);

  if (assetRecord === undefined) {
    throw new Error(`Content asset "${validatedAssetId}" was not found.`);
  }

  const asset = parseWithSchema(
    ContentAssetSchema,
    assetRecord,
    `Content asset "${validatedAssetId}"`,
  );

  if (asset.durationSeconds === undefined) {
    throw new SchemaValidationError('Media progress event', [
      'root: the targeted content asset does not define a durationSeconds value.',
    ]);
  }

  if (validatedEndSecond <= validatedStartSecond) {
    throw new SchemaValidationError('Media progress event', [
      'root: endSecond must be greater than startSecond.',
    ]);
  }

  if (validatedEndSecond > asset.durationSeconds) {
    throw new SchemaValidationError('Media progress event', [
      'root: endSecond cannot exceed the asset duration.',
    ]);
  }

  const [
    existingSliceRecords,
    existingEventRecords,
    existingResumePoint,
    existingProgress,
  ] = await Promise.all([
    database.contentSlices.where('assetId').equals(asset.id).toArray(),
    database.mediaProgressEvents.where('assetId').equals(asset.id).toArray(),
    getResumePoint(asset.id, { db: database }),
    getProgress(asset.itemId, { db: database }),
  ]);
  const existingSlices = sortContentSlices(
    parseStoredArray(
      existingSliceRecords,
      `Stored content slice for "${asset.id}"`,
      ContentSliceSchema,
    ),
  );
  const existingEvents = sortMediaProgressEvents(
    parseStoredArray(
      existingEventRecords,
      `Stored media progress event for "${asset.id}"`,
      MediaProgressEventSchema,
    ),
  );

  if (
    existingEvents.some(
      (event) =>
        event.startSecond === validatedStartSecond &&
        event.endSecond === validatedEndSecond,
    )
  ) {
    throw new SchemaValidationError('Media progress event', [
      'root: duplicate exact time ranges for the same asset are not allowed.',
    ]);
  }

  const timestamp = now();
  const coverageBefore = mergeCoveredRanges(
    existingEvents.map((event) => ({
      endSecond: event.endSecond,
      startSecond: event.startSecond,
    })),
  );
  const coverageAfter = mergeCoveredRanges([
    ...coverageBefore,
    {
      endSecond: validatedEndSecond,
      startSecond: validatedStartSecond,
    },
  ]);
  const updatedSlices = sortContentSlices(
    materializeContentSlices(asset, timestamp, existingSlices, coverageAfter),
  );
  const newlyCompletedSlices = updatedSlices.filter((slice) => {
    const previousCoverage = calculateSliceCoverage(slice, coverageBefore);
    const nextCoverage = calculateSliceCoverage(slice, coverageAfter);

    return previousCoverage < 1 && nextCoverage >= 1;
  });
  const activeSlice =
    updatedSlices.find(
      (slice) =>
        validatedStartSecond >= slice.startSecond &&
        validatedStartSecond < slice.endSecond,
    ) ?? null;
  const eventSlice = activeSlice ?? newlyCompletedSlices[0] ?? null;
  const mediaProgressEvent = parseWithSchema(
    MediaProgressEventSchema,
    {
      id: createEntityId('media-event'),
      itemId: asset.itemId,
      assetId: asset.id,
      sliceId: eventSlice?.id,
      sessionId: validatedSessionId,
      startSecond: validatedStartSecond,
      endSecond: validatedEndSecond,
      watchedSeconds: validatedEndSecond - validatedStartSecond,
      completedSlice: newlyCompletedSlices.length > 0,
      stoppedBecause: input.stoppedBecause,
      energyBefore: input.energyBefore,
      energyAfter: input.energyAfter,
      notes: input.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    'Media progress event',
  );
  const allSlicesComplete =
    updatedSlices.length > 0 &&
    updatedSlices.every((slice) => slice.status === 'completed');
  const nextSlice =
    updatedSlices.find((slice) => slice.status !== 'completed') ?? null;
  const resumePoint = parseWithSchema(
    ResumePointSchema,
    {
      id: existingResumePoint?.id ?? deriveResumePointId(asset.id),
      itemId: asset.itemId,
      assetId: asset.id,
      createdAt: existingResumePoint?.createdAt ?? timestamp,
      updatedAt: timestamp,
      lastSecond: allSlicesComplete
        ? asset.durationSeconds
        : validatedEndSecond,
      nextSliceId: allSlicesComplete ? undefined : nextSlice?.id,
      updatedFromEventId: mediaProgressEvent.id,
    },
    'Resume point',
  );
  const preservesCompletedStatus =
    existingProgress !== null &&
    ['accepted', 'completed', 'submitted'].includes(existingProgress.status);
  const progressStatus = allSlicesComplete
    ? 'completed'
    : preservesCompletedStatus
      ? existingProgress.status
      : existingProgress?.status === 'blocked'
        ? 'blocked'
        : 'started';
  const progressEntry = parseWithSchema(
    ProgressEntrySchema,
    {
      id: existingProgress?.id ?? createEntityId('progress'),
      itemId: asset.itemId,
      createdAt: existingProgress?.createdAt ?? timestamp,
      updatedAt: timestamp,
      status: progressStatus,
      startedAt: existingProgress?.startedAt ?? timestamp,
      completedAt:
        allSlicesComplete || preservesCompletedStatus
          ? (existingProgress?.completedAt ?? timestamp)
          : undefined,
      confidence: existingProgress?.confidence ?? 0,
      notes: existingProgress?.notes,
      evidenceType: existingProgress?.evidenceType,
      evidenceText: existingProgress?.evidenceText,
    },
    'Progress entry',
  );

  await runCoordinatedWrite(database, () =>
    database.transaction(
      'rw',
      [
        database.contentSlices,
        database.mediaProgressEvents,
        database.progressEntries,
        database.resumePoints,
        database.studySessions,
      ],
      async () => {
        if (validatedSessionId !== undefined) {
          const sessionRecord =
            await database.studySessions.get(validatedSessionId);

          if (sessionRecord === undefined) {
            throw new SchemaValidationError('Media progress event', [
              `root: study session "${validatedSessionId}" was not found.`,
            ]);
          }

          const session = parseWithSchema(
            StudySessionSchema,
            sessionRecord,
            `Study session "${validatedSessionId}"`,
          );

          if (session.itemId !== asset.itemId) {
            throw new SchemaValidationError('Media progress event', [
              'root: the study session does not belong to the targeted content item.',
            ]);
          }
        }

        await database.mediaProgressEvents.add(mediaProgressEvent);
        await database.contentSlices.bulkPut(updatedSlices);
        await database.resumePoints.put(resumePoint);
        await database.progressEntries.put(progressEntry);
      },
    ),
  );

  return {
    asset,
    event: mediaProgressEvent,
    longFormProgress: buildLongFormProgressView(
      asset,
      updatedSlices,
      [...existingEvents, mediaProgressEvent],
      resumePoint,
      progressEntry,
    ),
    progressEntry,
    resumePoint,
    slices: updatedSlices,
  };
}

export async function addStudySession(
  input: AddStudySessionInput,
  options: BaseDatabaseOptions = {},
) {
  const now = options.now ?? defaultClock;
  const database = await ensureOpen(resolveDatabase(options.db));

  await ensureBaseInitialization(options);

  const timestamp = now();
  const studySession = parseWithSchema(
    StudySessionSchema,
    {
      ...input,
      id: input.id ?? createEntityId('study-session'),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    'Study session',
  );

  await runCoordinatedWrite(database, () =>
    database.studySessions.add(studySession),
  );

  return studySession;
}

export async function addXpTransaction(
  input: AddXpTransactionInput,
  options: BaseDatabaseOptions = {},
) {
  const now = options.now ?? defaultClock;
  const database = await ensureOpen(resolveDatabase(options.db));

  await ensureBaseInitialization(options);

  const timestamp = now();
  const xpTransaction = parseWithSchema(
    XpTransactionSchema,
    {
      ...input,
      id: input.id ?? createEntityId('xp'),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    'XP transaction',
  );

  await runCoordinatedWrite(database, () =>
    database.xpTransactions.add(xpTransaction),
  );

  return xpTransaction;
}

export type UpsertProgressWithXpResult = {
  progressEntry: ProgressEntry;
  awardedTransactions: XpTransaction[];
  unlockedAchievements: AchievementUnlock[];
  xpSummary: XpSummary;
};

export type LogMediaProgressWithXpResult = LogMediaProgressResult & {
  awardedTransactions: XpTransaction[];
  unlockedAchievements: AchievementUnlock[];
  xpSummary: XpSummary;
};

export type AddStudySessionWithXpResult = {
  studySession: StudySession;
  awardedTransactions: XpTransaction[];
  unlockedAchievements: AchievementUnlock[];
  xpSummary: XpSummary;
};

export async function listXpTransactions(
  options: BaseDatabaseOptions = {},
): Promise<XpTransaction[]> {
  const database = await ensureOpen(resolveDatabase(options.db));

  const txs = await database.xpTransactions.toArray();
  const parsedTxs = parseStoredArray(
    txs,
    'Stored XP transaction',
    XpTransactionSchema,
  );
  return sortXpTransactions(parsedTxs);
}

async function calculateStoredXpSummary(database: ProgressPalDatabase) {
  const records = await database.xpTransactions.toArray();
  const transactions = parseStoredArray(
    records,
    'Stored XP transaction',
    XpTransactionSchema,
  );
  return calculateXpSummary(
    transactions.reduce((total, transaction) => total + transaction.xp, 0),
  );
}

export async function getXpSummary(
  options: BaseDatabaseOptions = {},
): Promise<XpSummary> {
  const database = await ensureOpen(resolveDatabase(options.db));
  return calculateStoredXpSummary(database);
}

export type AchievementView = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  xpReward: number;
  ruleType: string;
  ruleConfig: Record<string, unknown>;
  unlocked: boolean;
  unlockedAt: string | null;
  triggerSourceId: string | null;
};

export type AchievementsView = {
  achievements: AchievementView[];
  totalCount: number;
  unlockedCount: number;
};

/**
 * Read-only list of persisted achievement unlocks. This never evaluates rules
 * and never creates unlocks — it only reads the `achievement_unlocks` store.
 */
export async function listAchievementUnlocks(
  options: BaseDatabaseOptions = {},
): Promise<AchievementUnlock[]> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const unlocks = await database.achievementUnlocks.toArray();

  return sortAchievementUnlocks(
    parseStoredArray(
      unlocks,
      'Stored achievement unlock',
      AchievementUnlockSchema,
    ),
  );
}

/**
 * Merges the validated code-only achievement definitions with persisted
 * `achievement_unlocks` into a locked/unlocked view for the Achievements page.
 * Pure read: it evaluates no rules and writes nothing.
 */
export async function getAchievementsView(
  options: BaseDatabaseOptions = {},
): Promise<AchievementsView> {
  const unlocks = await listAchievementUnlocks(options);
  const unlockByAchievementId = new Map(
    unlocks.map((unlock) => [unlock.achievementId, unlock]),
  );

  const achievements = achievementDefinitions.map((definition) => {
    const unlock = unlockByAchievementId.get(definition.id) ?? null;

    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      category: definition.category,
      xpReward: definition.xpReward,
      ruleType: definition.ruleType,
      ruleConfig: definition.ruleConfig,
      unlocked: unlock !== null,
      unlockedAt: unlock?.unlockedAt ?? null,
      triggerSourceId: unlock?.triggerSourceId ?? null,
    };
  });

  return {
    achievements,
    totalCount: achievements.length,
    unlockedCount: achievements.filter((achievement) => achievement.unlocked)
      .length,
  };
}

/**
 * Evaluates achievements against all accumulated local source data and persists
 * any newly satisfied unlocks. Intended to run inside a caller's `rw`
 * transaction (the caller must include `achievementUnlocks` and the read stores
 * in scope). Writes only to `achievement_unlocks`; it writes no
 * `xp_transactions` and mutates no source store. The `&achievementId` unique
 * index plus the explicit existence check make re-running a no-op.
 *
 * History-based unlocking is intentional: because this runs only from explicit
 * save flows, a save can unlock achievements whose criteria were already met by
 * earlier local activity. It never runs from a passive read or page load.
 */
async function evaluateAndUnlockAchievements(
  database: ProgressPalDatabase,
  now: DatabaseClock,
): Promise<AchievementUnlock[]> {
  const [
    progressEntryRecords,
    courseItemRecords,
    courseUnitRecords,
    contentSliceRecords,
    mediaProgressEventRecords,
    studySessionRecords,
  ] = await Promise.all([
    database.progressEntries.toArray(),
    database.courseItems.toArray(),
    database.courseUnits.toArray(),
    database.contentSlices.toArray(),
    database.mediaProgressEvents.toArray(),
    database.studySessions.toArray(),
  ]);

  const context: AchievementEvaluationContext = {
    progressEntries: parseStoredArray(
      progressEntryRecords,
      'Stored progress entry',
      ProgressEntrySchema,
    ),
    courseItems: parseStoredArray(
      courseItemRecords,
      'Stored course item',
      CourseItemSchema,
    ),
    courseUnits: parseStoredArray(
      courseUnitRecords,
      'Stored course unit',
      CourseUnitSchema,
    ),
    contentSlices: parseStoredArray(
      contentSliceRecords,
      'Stored content slice',
      ContentSliceSchema,
    ),
    mediaProgressEvents: parseStoredArray(
      mediaProgressEventRecords,
      'Stored media progress event',
      MediaProgressEventSchema,
    ),
    studySessions: parseStoredArray(
      studySessionRecords,
      'Stored study session',
      StudySessionSchema,
    ),
  };

  const satisfied = evaluateAchievements(context);
  const newlyUnlocked: AchievementUnlock[] = [];

  for (const { achievementId, triggerSourceId } of satisfied) {
    const existing = await database.achievementUnlocks
      .where('achievementId')
      .equals(achievementId)
      .first();

    if (existing !== undefined) {
      continue;
    }

    const timestamp = now();
    const unlock = parseWithSchema(
      AchievementUnlockSchema,
      {
        id: deriveAchievementUnlockId(achievementId),
        achievementId,
        unlockedAt: timestamp,
        triggerSourceId,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      `Achievement unlock "${achievementId}"`,
    );

    await database.achievementUnlocks.add(unlock);
    newlyUnlocked.push(unlock);
  }

  return newlyUnlocked;
}

export async function upsertProgressAndAwardXp(
  input: UpsertProgressInput,
  options: BaseDatabaseOptions = {},
): Promise<UpsertProgressWithXpResult> {
  const now = options.now ?? defaultClock;
  const database = await ensureOpen(resolveDatabase(options.db));
  let progressEntry: ProgressEntry | null = null;
  const awardedTransactions: XpTransaction[] = [];
  let unlockedAchievements: AchievementUnlock[] = [];
  let xpSummary: XpSummary | null = null;

  await runCoordinatedWrite(database, () =>
    database.transaction(
      'rw',
      [
        database.progressEntries,
        database.xpTransactions,
        database.courseItems,
        database.courseUnits,
        database.contentSlices,
        database.mediaProgressEvents,
        database.studySessions,
        database.achievementUnlocks,
        database.appMeta,
        database.learnerProfile,
      ],
      async () => {
        markCurrentTransactionCoordinated(database);
        // 1. Write progress source event
        progressEntry = await upsertProgress(input, {
          ...options,
          db: database,
        });

        // 2. Evaluate and award XP
        const item = await database.courseItems.get(progressEntry!.itemId);
        if (!item) {
          xpSummary = await calculateStoredXpSummary(database);
          return;
        }
        const unit = await database.courseUnits.get(item.unitId);
        if (!unit) {
          xpSummary = await calculateStoredXpSummary(database);
          return;
        }

        const allUnitItems = await database.courseItems
          .where('unitId')
          .equals(unit.id)
          .toArray();
        const allUnitProgress = await database.progressEntries
          .where('itemId')
          .anyOf(allUnitItems.map((i) => i.id))
          .toArray();

        let finalProjectProgress: ProgressEntry[] = [];
        if (
          item.id === 'final-project-readme' ||
          item.id === 'final-project-video-demo'
        ) {
          const finalProjectUnit = await database.courseUnits
            .where('type')
            .equals('final_project')
            .first();
          if (finalProjectUnit) {
            const finalProjectItems = await database.courseItems
              .where('unitId')
              .equals(finalProjectUnit.id)
              .toArray();
            finalProjectProgress = await database.progressEntries
              .where('itemId')
              .anyOf(finalProjectItems.map((i) => i.id))
              .toArray();
          }
        }

        const potentialAwards = evaluateProgressXp({
          progressEntry: progressEntry!,
          item,
          unit,
          allUnitItems,
          allUnitProgress,
          finalProjectProgress,
        });

        for (const award of potentialAwards) {
          const exists = await database.xpTransactions
            .where('sourceId')
            .equals(award.sourceId)
            .filter((tx) => tx.sourceType === award.sourceType)
            .first();

          if (!exists) {
            const txId = deriveXpTransactionId(
              award.sourceType,
              award.sourceId,
            );
            const tx = await addXpTransaction(
              {
                id: txId,
                sourceType: award.sourceType,
                sourceId: award.sourceId,
                xp: award.xp,
                reason: award.reason,
                awardedAt: progressEntry!.updatedAt,
              },
              { ...options, db: database },
            );
            awardedTransactions.push(tx);
          }
        }

        // 3. Evaluate achievements against all accumulated source data. Writes
        // only achievement_unlocks; never xp_transactions.
        unlockedAchievements = await evaluateAndUnlockAchievements(
          database,
          now,
        );
        xpSummary = await calculateStoredXpSummary(database);
      },
    ),
  );

  return {
    progressEntry: progressEntry!,
    awardedTransactions,
    unlockedAchievements,
    xpSummary: xpSummary!,
  };
}

export async function logMediaProgressAndAwardXp(
  input: LogMediaProgressInput,
  options: BaseDatabaseOptions = {},
): Promise<LogMediaProgressWithXpResult> {
  const now = options.now ?? defaultClock;
  const database = await ensureOpen(resolveDatabase(options.db));
  let result: LogMediaProgressResult | null = null;
  const awardedTransactions: XpTransaction[] = [];
  let unlockedAchievements: AchievementUnlock[] = [];
  let xpSummary: XpSummary | null = null;

  await runCoordinatedWrite(database, () =>
    database.transaction(
      'rw',
      [
        database.contentAssets,
        database.contentSlices,
        database.mediaProgressEvents,
        database.progressEntries,
        database.resumePoints,
        database.xpTransactions,
        database.courseItems,
        database.courseUnits,
        database.studySessions,
        database.achievementUnlocks,
        database.appMeta,
        database.learnerProfile,
      ],
      async () => {
        markCurrentTransactionCoordinated(database);
        // 1. Log media progress
        result = await logMediaProgress(input, { ...options, db: database });

        const { event, slices, asset, progressEntry } = result!;

        // 2. Evaluate and award XP
        // a) Clean stop:
        if (
          event.watchedSeconds >= 900 &&
          (event.stoppedBecause === 'reached_limit' ||
            event.stoppedBecause === 'completed_slice')
        ) {
          const sourceId = event.id;
          const exists = await database.xpTransactions
            .where('sourceId')
            .equals(sourceId)
            .filter((tx) => tx.sourceType === 'media_clean_stop')
            .first();

          if (!exists) {
            const txId = deriveXpTransactionId('media_clean_stop', sourceId);
            const tx = await addXpTransaction(
              {
                id: txId,
                sourceType: 'media_clean_stop',
                sourceId,
                xp: 5,
                reason: `Clean stop after 15+ minutes of focus on: ${asset.title}`,
                awardedAt: event.createdAt,
              },
              { ...options, db: database },
            );
            awardedTransactions.push(tx);
          }
        }

        // b) Unique 10-minute coverage blocks:
        const allEvents = await database.mediaProgressEvents
          .where('assetId')
          .equals(asset.id)
          .toArray();
        const coverageAfterRanges = allEvents.map((ev) => ({
          startSecond: ev.startSecond,
          endSecond: ev.endSecond,
        }));
        const coverageBeforeRanges = allEvents
          .filter((ev) => ev.id !== event.id)
          .map((ev) => ({
            startSecond: ev.startSecond,
            endSecond: ev.endSecond,
          }));

        const crossedAfter = getCrossedBlocks(
          coverageAfterRanges,
          asset.durationSeconds ?? 0,
        );
        const crossedBefore = getCrossedBlocks(
          coverageBeforeRanges,
          asset.durationSeconds ?? 0,
        );
        const newlyCrossed = crossedAfter.filter(
          (idx) => !crossedBefore.includes(idx),
        );

        for (const blockIndex of newlyCrossed) {
          const sourceId = `${asset.id}-block-${blockIndex}`;
          const exists = await database.xpTransactions
            .where('sourceId')
            .equals(sourceId)
            .filter((tx) => tx.sourceType === 'media_unique_10_minutes')
            .first();

          if (!exists) {
            const txId = deriveXpTransactionId(
              'media_unique_10_minutes',
              sourceId,
            );
            const blockNum = blockIndex + 1;
            const tx = await addXpTransaction(
              {
                id: txId,
                sourceType: 'media_unique_10_minutes',
                sourceId,
                xp: 4,
                reason: `Crossed 10 focused minutes (block ${blockNum}) on: ${asset.title}`,
                awardedAt: event.createdAt,
              },
              { ...options, db: database },
            );
            awardedTransactions.push(tx);
          }
        }

        // c) Completed content slice:
        const mergedBefore = mergeCoveredRanges(coverageBeforeRanges);
        const mergedAfter = mergeCoveredRanges(coverageAfterRanges);
        const newlyCompletedSlices = slices.filter((slice) => {
          const prevCov = calculateSliceCoverage(slice, mergedBefore);
          const nextCov = calculateSliceCoverage(slice, mergedAfter);
          return prevCov < 1 && nextCov >= 1;
        });

        for (const slice of newlyCompletedSlices) {
          const sourceId = slice.id;
          const exists = await database.xpTransactions
            .where('sourceId')
            .equals(sourceId)
            .filter((tx) => tx.sourceType === 'content_slice_completed')
            .first();

          if (!exists) {
            const txId = deriveXpTransactionId(
              'content_slice_completed',
              sourceId,
            );
            const tx = await addXpTransaction(
              {
                id: txId,
                sourceType: 'content_slice_completed',
                sourceId,
                xp: 10,
                reason: `Completed content slice: ${slice.label} of: ${asset.title}`,
                awardedAt: event.createdAt,
              },
              { ...options, db: database },
            );
            awardedTransactions.push(tx);
          }
        }

        // d) Progress entry cascading milestone awards:
        const item = await database.courseItems.get(asset.itemId);
        if (item) {
          const unit = await database.courseUnits.get(item.unitId);
          if (unit) {
            const allUnitItems = await database.courseItems
              .where('unitId')
              .equals(unit.id)
              .toArray();
            const allUnitProgress = await database.progressEntries
              .where('itemId')
              .anyOf(allUnitItems.map((i) => i.id))
              .toArray();

            let finalProjectProgress: ProgressEntry[] = [];
            if (
              item.id === 'final-project-readme' ||
              item.id === 'final-project-video-demo'
            ) {
              const finalProjectUnit = await database.courseUnits
                .where('type')
                .equals('final_project')
                .first();
              if (finalProjectUnit) {
                const finalProjectItems = await database.courseItems
                  .where('unitId')
                  .equals(finalProjectUnit.id)
                  .toArray();
                finalProjectProgress = await database.progressEntries
                  .where('itemId')
                  .anyOf(finalProjectItems.map((i) => i.id))
                  .toArray();
              }
            }

            const progressAwards = evaluateProgressXp({
              progressEntry,
              item,
              unit,
              allUnitItems,
              allUnitProgress,
              finalProjectProgress,
            });

            for (const award of progressAwards) {
              const exists = await database.xpTransactions
                .where('sourceId')
                .equals(award.sourceId)
                .filter((tx) => tx.sourceType === award.sourceType)
                .first();

              if (!exists) {
                const txId = deriveXpTransactionId(
                  award.sourceType,
                  award.sourceId,
                );
                const tx = await addXpTransaction(
                  {
                    id: txId,
                    sourceType: award.sourceType,
                    sourceId: award.sourceId,
                    xp: award.xp,
                    reason: award.reason,
                    awardedAt: progressEntry.updatedAt,
                  },
                  { ...options, db: database },
                );
                awardedTransactions.push(tx);
              }
            }
          }
        }

        // e) Evaluate achievements against all accumulated source data. Writes
        // only achievement_unlocks; never xp_transactions.
        unlockedAchievements = await evaluateAndUnlockAchievements(
          database,
          now,
        );
        xpSummary = await calculateStoredXpSummary(database);
      },
    ),
  );

  return {
    ...result!,
    awardedTransactions,
    unlockedAchievements,
    xpSummary: xpSummary!,
  };
}

export async function addStudySessionAndAwardXp(
  input: AddStudySessionInput,
  options: BaseDatabaseOptions = {},
): Promise<AddStudySessionWithXpResult> {
  const now = options.now ?? defaultClock;
  const database = await ensureOpen(resolveDatabase(options.db));
  let changed = false;
  let studySession: StudySession | null = null;
  const awardedTransactions: XpTransaction[] = [];
  let unlockedAchievements: AchievementUnlock[] = [];
  let xpSummary: XpSummary | null = null;

  const coordinatedWrite = beginCoordinatedWrite(database);

  try {
    await database.transaction(
      'rw',
      [
        database.studySessions,
        database.xpTransactions,
        database.courseItems,
        database.courseUnits,
        database.progressEntries,
        database.contentSlices,
        database.mediaProgressEvents,
        database.achievementUnlocks,
        database.appMeta,
        database.learnerProfile,
      ],
      async () => {
        markCurrentTransactionCoordinated(database);
        // 1. Save study session source event
        if (input.id) {
          const existing = await database.studySessions.get(input.id);
          if (existing) {
            studySession = existing;
          }
        }
        if (!studySession) {
          studySession = await addStudySession(input, {
            ...options,
            db: database,
          });
          changed = true;
        }

        // 2. Award XP if duration >= 25 minutes
        if (studySession.durationMinutes >= 25) {
          const sourceId = studySession.id;
          const exists = await database.xpTransactions
            .where('sourceId')
            .equals(sourceId)
            .filter((tx) => tx.sourceType === 'study_session')
            .first();

          if (!exists) {
            const item = await database.courseItems.get(studySession.itemId);
            const itemTitle = item ? item.title : 'Course item';
            const txId = deriveXpTransactionId('study_session', sourceId);
            const tx = await addXpTransaction(
              {
                id: txId,
                sourceType: 'study_session',
                sourceId,
                xp: 10,
                reason: `Logged 25+ minute study session for: ${itemTitle}`,
                awardedAt: studySession.endedAt,
              },
              { ...options, db: database },
            );
            awardedTransactions.push(tx);
            changed = true;
          }
        }

        // 3. Evaluate achievements against all accumulated source data. Writes
        // only achievement_unlocks; never xp_transactions.
        unlockedAchievements = await evaluateAndUnlockAchievements(
          database,
          now,
        );
        changed ||= unlockedAchievements.length > 0;
        xpSummary = await calculateStoredXpSummary(database);
      },
    );

    if (changed) {
      coordinatedWrite.complete();
    } else {
      coordinatedWrite.abort();
    }
  } catch (error) {
    coordinatedWrite.abort();
    throw error;
  }

  return {
    studySession: studySession!,
    awardedTransactions,
    unlockedAchievements,
    xpSummary: xpSummary!,
  };
}

export async function getDatabaseSnapshot(options: BaseDatabaseOptions = {}) {
  const database = await ensureOpen(resolveDatabase(options.db));

  const [
    appMeta,
    learnerProfile,
    courseUnits,
    courseItems,
    progressEntries,
    contentAssets,
    contentSlices,
    mediaProgressEvents,
    resumePoints,
    studySessions,
    xpTransactions,
    achievementDefinitions,
    achievementUnlocks,
    backups,
  ] = await Promise.all([
    getAppMeta({ db: database }),
    getProfile({ db: database }),
    database.courseUnits.toArray(),
    database.courseItems.toArray(),
    database.progressEntries.toArray(),
    database.contentAssets.toArray(),
    database.contentSlices.toArray(),
    database.mediaProgressEvents.toArray(),
    database.resumePoints.toArray(),
    database.studySessions.toArray(),
    database.xpTransactions.toArray(),
    database.achievementDefinitions.toArray(),
    database.achievementUnlocks.toArray(),
    database.backups.toArray(),
  ]);

  return {
    appMeta,
    learnerProfile,
    courseUnits: sortCourseUnits(
      parseStoredArray(courseUnits, 'Stored course unit', CourseUnitSchema),
    ),
    courseItems: sortCourseItems(
      parseStoredArray(courseItems, 'Stored course item', CourseItemSchema),
    ),
    progressEntries: sortProgressEntries(
      parseStoredArray(
        progressEntries,
        'Stored progress entry',
        ProgressEntrySchema,
      ),
    ),
    contentAssets: sortContentAssets(
      parseStoredArray(
        contentAssets,
        'Stored content asset',
        ContentAssetSchema,
      ),
    ),
    contentSlices: sortContentSlices(
      parseStoredArray(
        contentSlices,
        'Stored content slice',
        ContentSliceSchema,
      ),
    ),
    mediaProgressEvents: sortMediaProgressEvents(
      parseStoredArray(
        mediaProgressEvents,
        'Stored media progress event',
        MediaProgressEventSchema,
      ),
    ),
    resumePoints: sortResumePoints(
      parseStoredArray(resumePoints, 'Stored resume point', ResumePointSchema),
    ),
    studySessions: sortStudySessions(
      parseStoredArray(
        studySessions,
        'Stored study session',
        StudySessionSchema,
      ),
    ),
    xpTransactions: sortXpTransactions(
      parseStoredArray(
        xpTransactions,
        'Stored XP transaction',
        XpTransactionSchema,
      ),
    ),
    achievementDefinitions: parseStoredArray(
      achievementDefinitions,
      'Stored achievement definition',
      AchievementDefinitionSchema,
    ),
    achievementUnlocks: parseStoredArray(
      achievementUnlocks,
      'Stored achievement unlock',
      AchievementUnlockSchema,
    ),
    backups: parseStoredArray(
      backups,
      'Stored backup record',
      BackupRecordSchema,
    ),
  };
}

function allDataTables(database: ProgressPalDatabase) {
  return [
    database.appMeta,
    database.learnerProfile,
    database.courseUnits,
    database.courseItems,
    database.progressEntries,
    database.contentAssets,
    database.contentSlices,
    database.mediaProgressEvents,
    database.resumePoints,
    database.studySessions,
    database.xpTransactions,
    database.achievementDefinitions,
    database.achievementUnlocks,
    database.backups,
  ];
}

/**
 * Re-validate every row of a backup snapshot through the domain schemas before
 * any write. Defense in depth: the UI already validated the envelope, but the
 * restore path must never trust unvalidated structured input.
 */
function parseSnapshotForRestore(snapshot: DatabaseSnapshot) {
  const restored = {
    appMeta:
      snapshot.appMeta === null
        ? null
        : parseWithSchema(
            AppMetaSchema,
            snapshot.appMeta,
            'Backup app metadata',
          ),
    learnerProfile:
      snapshot.learnerProfile === null
        ? null
        : parseWithSchema(
            LearnerProfileSchema,
            snapshot.learnerProfile,
            'Backup learner profile',
          ),
    courseUnits: parseStoredArray(
      snapshot.courseUnits,
      'Backup course unit',
      CourseUnitSchema,
    ),
    courseItems: parseStoredArray(
      snapshot.courseItems,
      'Backup course item',
      CourseItemSchema,
    ),
    progressEntries: parseStoredArray(
      snapshot.progressEntries,
      'Backup progress entry',
      ProgressEntrySchema,
    ),
    contentAssets: parseStoredArray(
      snapshot.contentAssets,
      'Backup content asset',
      ContentAssetSchema,
    ),
    contentSlices: parseStoredArray(
      snapshot.contentSlices,
      'Backup content slice',
      ContentSliceSchema,
    ),
    mediaProgressEvents: parseStoredArray(
      snapshot.mediaProgressEvents,
      'Backup media progress event',
      MediaProgressEventSchema,
    ),
    resumePoints: parseStoredArray(
      snapshot.resumePoints,
      'Backup resume point',
      ResumePointSchema,
    ),
    studySessions: parseStoredArray(
      snapshot.studySessions,
      'Backup study session',
      StudySessionSchema,
    ),
    xpTransactions: parseStoredArray(
      snapshot.xpTransactions,
      'Backup XP transaction',
      XpTransactionSchema,
    ),
    achievementDefinitions: parseStoredArray(
      snapshot.achievementDefinitions,
      'Backup achievement definition',
      AchievementDefinitionSchema,
    ),
    achievementUnlocks: parseStoredArray(
      snapshot.achievementUnlocks,
      'Backup achievement unlock',
      AchievementUnlockSchema,
    ),
    backups: parseStoredArray(
      snapshot.backups,
      'Backup record',
      BackupRecordSchema,
    ),
  };

  assertBackupDataInvariants(restored, {
    expectedSchemaVersion: currentDatabaseSchemaVersion,
  });

  return restored;
}

export type RecordBackupEventInput = {
  type: BackupRecord['type'];
  fileName: string;
  notes?: string;
};

/**
 * Append one local audit record describing an export or import event. This is a
 * deliberate, explicit-action mutation; it is the only write an export performs.
 */
export async function recordBackupEvent(
  input: RecordBackupEventInput,
  options: BaseDatabaseOptions = {},
): Promise<BackupRecord> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const timestamp = (options.now ?? defaultClock)();
  const record = parseWithSchema(
    BackupRecordSchema,
    {
      id: createEntityId('backup'),
      createdAt: timestamp,
      updatedAt: timestamp,
      type: input.type,
      fileName: input.fileName,
      ...(input.notes === undefined ? {} : { notes: input.notes }),
    },
    'Backup record',
  );

  await runCoordinatedWrite(database, () => database.backups.add(record));

  return record;
}

/**
 * Destructively clear every store and re-bootstrap a fresh default profile and
 * seeded catalog. Clear and re-initialization share one atomic transaction.
 */
export async function resetAllData(
  options: InitializeDatabaseOptions = {},
): Promise<DatabaseInitializationResult> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const tables = allDataTables(database);

  return runDestructiveCoordinatedWrite(database, () =>
    database.transaction('rw', tables, async () => {
      markCurrentTransactionCoordinated(database, true);
      await Promise.all(tables.map((table) => table.clear()));

      return initializeDatabase({ ...options, db: database });
    }),
  );
}

export type RestoreDatabaseFromBackupOptions = InitializeDatabaseOptions & {
  fileName?: string;
};

/**
 * Replace-all restore. Validates every row first, then in one atomic
 * transaction clears all stores, writes the validated rows, re-initializes,
 * reconciles the bundled seed catalog (idempotent on already-current data),
 * appends exactly one `import` audit record, and reads the final snapshot. The
 * `backups` store therefore equals the backup's `backups` plus that one record;
 * the other 13 stores match the backup exactly.
 */
export async function restoreDatabaseFromBackup(
  snapshot: DatabaseSnapshot,
  options: RestoreDatabaseFromBackupOptions = {},
): Promise<DatabaseSnapshot> {
  const restored = parseSnapshotForRestore(snapshot);
  const database = await ensureOpen(resolveDatabase(options.db));
  const tables = allDataTables(database);

  return runDestructiveCoordinatedWrite(database, () =>
    database.transaction('rw', tables, async () => {
      markCurrentTransactionCoordinated(database, true);
      await Promise.all(tables.map((table) => table.clear()));

      if (restored.appMeta !== null) {
        await database.appMeta.add(restored.appMeta);
      }

      if (restored.learnerProfile !== null) {
        await database.learnerProfile.add(restored.learnerProfile);
      }

      await Promise.all([
        database.courseUnits.bulkAdd(restored.courseUnits),
        database.courseItems.bulkAdd(restored.courseItems),
        database.progressEntries.bulkAdd(restored.progressEntries),
        database.contentAssets.bulkAdd(restored.contentAssets),
        database.contentSlices.bulkAdd(restored.contentSlices),
        database.mediaProgressEvents.bulkAdd(restored.mediaProgressEvents),
        database.resumePoints.bulkAdd(restored.resumePoints),
        database.studySessions.bulkAdd(restored.studySessions),
        database.xpTransactions.bulkAdd(restored.xpTransactions),
        database.achievementDefinitions.bulkAdd(
          restored.achievementDefinitions,
        ),
        database.achievementUnlocks.bulkAdd(restored.achievementUnlocks),
        database.backups.bulkAdd(restored.backups),
      ]);

      await initializeDatabase({ ...options, db: database });

      await recordBackupEvent(
        {
          type: 'import',
          fileName: options.fileName ?? 'imported-backup.json',
        },
        { db: database, now: options.now },
      );

      const finalSnapshot = await getDatabaseSnapshot({ db: database });

      // Seed reconciliation can update catalog ownership after the preflight
      // check. Re-validate the committed shape while rollback is still possible.
      assertBackupDataInvariants(finalSnapshot, {
        expectedSchemaVersion: currentDatabaseSchemaVersion,
      });

      return finalSnapshot;
    }),
  );
}
