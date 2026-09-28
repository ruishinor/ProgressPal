import Dexie from 'dexie';

import {
  AchievementDefinitionSchema,
  AchievementUnlockSchema,
  AppMetaSchema,
  BackupRecordSchema,
  CatalogueVersionSchema,
  ContentAssetSchema,
  ContentSliceSchema,
  CourseItemSchema,
  CourseUnitSchema,
  LearnerProfileSchema,
  MediaProgressEventSchema,
  ProgrammeEnrolmentSchema,
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
  type CatalogueVersion,
  type ContentAsset,
  type ContentSlice,
  type CourseSeed,
  type CourseItem,
  type CourseUnit,
  type LearnerProfile,
  type MediaProgressEvent,
  type MediaStopReason,
  type ProgrammeEnrolment,
  type ProgrammePolicy,
  type ProgressEntry,
  type ResumePoint,
  type StudySession,
  type XpTransaction,
} from '@/lib/domain';
import { assertBackupDataInvariants } from '@/lib/backup';
import {
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
  type LongFormEventAggregate,
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
  evaluateCompletionPreviewXp,
  evaluateProgressXp,
  getLinkedMilestoneItemIds,
  getXpAwardSourceKey,
  getCrossedBlocks,
  isUnitCompletionAward,
  type XpSummary,
} from '@/lib/xp/engine';

import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  defaultLearnerProfileValues,
  singletonIds,
} from './constants';
import {
  getSharedDatabase,
  type DatabaseMigrationContext,
  type ProgressPalDatabase,
} from './database';

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
    dataVersion: number;
    itemCount: number;
    itemsAdded: number;
    itemsUpdated: number;
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
  catalogueVersions: CatalogueVersion[];
  contentAssets: ContentAsset[];
  contentSlices: ContentSlice[];
  courseItems: CourseItem[];
  courseUnits: CourseUnit[];
  learnerProfile: LearnerProfile | null;
  mediaProgressEvents: MediaProgressEvent[];
  programmeEnrolments: ProgrammeEnrolment[];
  progressEntries: ProgressEntry[];
  resumePoints: ResumePoint[];
  studySessions: StudySession[];
  xpTransactions: XpTransaction[];
};

export type CourseStateReadData = {
  contentAssets: ContentAsset[];
  contentSlices: ContentSlice[];
  courseItems: CourseItem[];
  courseUnits: CourseUnit[];
  mediaProgressByAssetId: ReadonlyMap<string, LongFormEventAggregate>;
  progressEntries: ProgressEntry[];
  resumePoints: ResumePoint[];
};

export type CourseMapReadData = CourseStateReadData & {
  earnedRewardSourceKeys: ReadonlySet<string>;
};

export type RpgRecentStudySession = Pick<
  StudySession,
  'id' | 'itemId' | 'startedAt'
>;

export type RpgRecentXpTransaction = Pick<
  XpTransaction,
  'awardedAt' | 'id' | 'reason' | 'xp'
>;

export type RpgHudReadData = CourseMapReadData & {
  learnerProfile: LearnerProfile | null;
  totalXp: number;
};

export type RpgHubReadData = RpgHudReadData & {
  recentStudySessions: RpgRecentStudySession[];
  recentXpTransactions: RpgRecentXpTransaction[];
  sessionCount: number;
  totalMinutes: number;
  weeklySessionCount: number;
  weeklyTotalMinutes: number;
  weeklyXpEarned: number;
};

export type RpgHeroReadData = CourseStateReadData & {
  achievementUnlocks: AchievementUnlock[];
  learnerProfile: LearnerProfile | null;
  recentStudySessions: RpgRecentStudySession[];
  recentXpTransactions: RpgRecentXpTransaction[];
  sessionCount: number;
  totalMinutes: number;
  totalXp: number;
};

export type RpgHubReadRange = {
  nextStartTime: number;
  startTime: number;
};

export type ModuleReadData = {
  contentAssets: ContentAsset[];
  contentSlices: ContentSlice[];
  courseItems: CourseItem[];
  courseUnit: CourseUnit;
  mediaProgressByAssetId: ReadonlyMap<string, LongFormEventAggregate>;
  progressEntries: ProgressEntry[];
  resumePoints: ResumePoint[];
  earnedRewardSourceKeys: ReadonlySet<string>;
};

export type ResourceReadData = {
  contentAssets: ContentAsset[];
  contentSlices: ContentSlice[];
  courseItem: CourseItem;
  courseItems: CourseItem[];
  courseUnit: CourseUnit;
  mediaProgressByAssetId: ReadonlyMap<string, LongFormEventAggregate>;
  progressEntries: ProgressEntry[];
  resumePoints: ResumePoint[];
  earnedRewardSourceKeys: ReadonlySet<string>;
};

type BaseDatabaseOptions = {
  appVersion?: string;
  db?: ProgressPalDatabase;
  now?: DatabaseClock;
};

/**
 * Options for paths that apply programme policy. The caller passes the active
 * programme's policy explicitly (Epic C / C3); there is no default policy.
 */
type ProgrammePolicyOptions = BaseDatabaseOptions & {
  policy: ProgrammePolicy;
};

/**
 * Options for catalogue-derived reads (Epic C / C5). The caller passes the
 * active definition's catalogue identity (`course_units.courseId`)
 * explicitly; there is no default catalogue.
 */
type CatalogueScopeOptions = BaseDatabaseOptions & {
  catalogueId: string;
};

type ScopedProgrammeOptions = ProgrammePolicyOptions & CatalogueScopeOptions;

/**
 * Rejects a save whose item belongs to another catalogue (Epic C / C5)
 * before anything is written, so the active programme's policy never applies
 * to a foreign item. A missing item or unit keeps its existing handling.
 */
async function assertItemInCatalogue(
  database: ProgressPalDatabase,
  itemId: string,
  catalogueId: string,
) {
  const item = await database.courseItems.get(itemId);

  if (item === undefined) {
    return;
  }

  const unit = await database.courseUnits.get(item.unitId);

  if (unit !== undefined && unit.courseId !== catalogueId) {
    throw new Error(
      `Course item "${itemId}" is not in catalogue "${catalogueId}".`,
    );
  }
}

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

function createDefaultAppMeta(
  timestamp: string,
  appVersion: string,
  activeProgrammeId: string,
) {
  return parseWithSchema(
    AppMetaSchema,
    {
      id: singletonIds.appMeta,
      createdAt: timestamp,
      updatedAt: timestamp,
      appVersion,
      schemaVersion: currentDatabaseSchemaVersion,
      activeProgrammeId,
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
      database.programmeEnrolments,
      async () => {
        const timestamp = now();
        const storedAppMeta = await database.appMeta.get(singletonIds.appMeta);
        const activeProgrammeId = database.migrationContext.programmeId;

        if (storedAppMeta === undefined) {
          createdAppMeta = true;
          appMeta = createDefaultAppMeta(timestamp, appVersion, activeProgrammeId);
          await database.appMeta.add(appMeta);

          const existingEnrolment =
            await database.programmeEnrolments.get(activeProgrammeId);

          if (existingEnrolment === undefined) {
            await database.programmeEnrolments.add(
              parseWithSchema(
                ProgrammeEnrolmentSchema,
                { programmeId: activeProgrammeId, enrolledAt: timestamp },
                'Programme enrolment',
              ),
            );
          }
        } else {
          const parsedAppMeta = parseWithSchema(
            AppMetaSchema,
            storedAppMeta,
            'Stored app metadata',
          );

          if (parsedAppMeta.activeProgrammeId !== activeProgrammeId) {
            throw new Error(
              `Active programme "${parsedAppMeta.activeProgrammeId}" does not match the registered programme "${activeProgrammeId}".`,
            );
          }

          const enrolment = await database.programmeEnrolments.get(
            parsedAppMeta.activeProgrammeId,
          );

          if (enrolment === undefined) {
            throw new Error(
              `No enrolment exists for active programme "${parsedAppMeta.activeProgrammeId}".`,
            );
          }

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

/**
 * Epic C / C6, MR-3: `catalogue_versions` is the sole version authority.
 * Sync is authorized (the seed's `courseId` must be registered in the
 * database's bound migration context), monotonic (a lower `dataVersion`
 * fails closed, an equal one writes nothing) and collision-rejecting (P2: a
 * unit or item ID already owned by a different catalogue is rejected, never
 * rewritten).
 */
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

  const authorizedCatalogue = database.migrationContext.authorizedCatalogues.find(
    (catalogue) => catalogue.courseId === parsedSeed.courseId,
  );

  if (authorizedCatalogue === undefined) {
    if (ownsWriteScope) {
      settleLogicalWriteScope(logicalWriteScope);
    }
    throw new Error(
      `Course seed catalogue "${parsedSeed.courseId}" is not an authorized catalogue.`,
    );
  }

  let changed = false;
  try {
    if (options.skipBaseInitialization !== true) {
      await ensureBaseInitialization(options, logicalWriteScope);
    }

    const result = await database.transaction(
      'rw',
      [
        database.courseUnits,
        database.courseItems,
        database.catalogueVersions,
        database.contentAssets,
        database.contentSlices,
        database.mediaProgressEvents,
        database.resumePoints,
      ],
      async () => {
        const timestamp = now();
        const existingVersion = await database.catalogueVersions.get(
          parsedSeed.courseId,
        );

        if (
          existingVersion !== undefined &&
          existingVersion.dataVersion > parsedSeed.dataVersion
        ) {
          throw new Error(
            `Course seed data version ${parsedSeed.dataVersion} is lower than the synced version ${existingVersion.dataVersion} for catalogue "${parsedSeed.courseId}".`,
          );
        }

        const itemCount = parsedSeed.units.reduce(
          (total, unit) => total + unit.items.length,
          0,
        );

        if (
          existingVersion !== undefined &&
          existingVersion.dataVersion === parsedSeed.dataVersion
        ) {
          return {
            unitCount: parsedSeed.units.length,
            unitsAdded: 0,
            unitsUpdated: 0,
            itemCount,
            itemsAdded: 0,
            itemsUpdated: 0,
            dataVersion: existingVersion.dataVersion,
          };
        }

        coordinatedWrite.begin();

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

        // P2: a unit ID already owned by a different catalogue is rejected,
        // never rewritten to this catalogue.
        for (const [index, unit] of units.entries()) {
          const existingUnitRecord = existingUnits[index];

          if (existingUnitRecord === undefined) {
            continue;
          }

          const existingUnit = parseWithSchema(
            CourseUnitSchema,
            existingUnitRecord,
            `Stored course unit "${unit.id}"`,
          );

          if (existingUnit.courseId !== parsedSeed.courseId) {
            throw new Error(
              `Course unit "${unit.id}" is already owned by catalogue "${existingUnit.courseId}" and cannot be reused by catalogue "${parsedSeed.courseId}".`,
            );
          }
        }

        // P2: an item ID already owned by a unit outside this catalogue is
        // rejected the same way. Units within this seed are already proven
        // to belong to this catalogue above; only items whose existing
        // owning unit falls outside the seed need a foreign-unit lookup.
        const seedUnitIds = new Set(units.map((unit) => unit.id));
        const existingItemUnitIds = new Map<string, string>();

        for (const [index, { item }] of items.entries()) {
          const existingItemRecord = existingItems[index];

          if (existingItemRecord === undefined) {
            continue;
          }

          const existingItem = parseWithSchema(
            CourseItemSchema,
            existingItemRecord,
            `Stored course item "${item.id}"`,
          );

          existingItemUnitIds.set(item.id, existingItem.unitId);
        }

        const foreignUnitIds = [...new Set(existingItemUnitIds.values())].filter(
          (unitId) => !seedUnitIds.has(unitId),
        );
        const foreignUnits =
          foreignUnitIds.length > 0
            ? await database.courseUnits.bulkGet(foreignUnitIds)
            : [];
        const foreignUnitCourseIds = new Map(
          foreignUnits
            .filter((unit): unit is CourseUnit => unit !== undefined)
            .map((unit) => [unit.id, unit.courseId] as const),
        );

        for (const [itemId, unitId] of existingItemUnitIds) {
          const ownerCourseId = seedUnitIds.has(unitId)
            ? parsedSeed.courseId
            : foreignUnitCourseIds.get(unitId);

          if (
            ownerCourseId !== undefined &&
            ownerCourseId !== parsedSeed.courseId
          ) {
            throw new Error(
              `Course item "${itemId}" is already owned by catalogue "${ownerCourseId}" and cannot be reused by catalogue "${parsedSeed.courseId}".`,
            );
          }
        }

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

        const catalogueVersion: CatalogueVersion = parseWithSchema(
          CatalogueVersionSchema,
          {
            courseId: parsedSeed.courseId,
            programmeId: authorizedCatalogue.programmeId,
            dataVersion: parsedSeed.dataVersion,
            syncedAt: timestamp,
          },
          'Catalogue version',
        );

        await database.catalogueVersions.put(catalogueVersion);

        await syncDerivedLongFormCatalogFromCourseItems(
          await listCourseItems(undefined, { db: database }),
          { beforeWrite: coordinatedWrite.begin, db: database, now },
        );
        // The catalogue version row above always changes on this branch
        // (a first sync creates it; a real version bump updates it).
        changed = true;

        return {
          unitCount: parsedSeed.units.length,
          unitsAdded,
          unitsUpdated,
          itemCount,
          itemsAdded,
          itemsUpdated,
          dataVersion: catalogueVersion.dataVersion,
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

type StudySessionLedgerProjection<Context, Row> = {
  context: Context;
  projectSession: (session: StudySession) => Row;
};

function forEachValidatedRow<Row>(
  source: { each: (visitor: (row: Row) => void) => PromiseLike<unknown> },
  visit: (row: Row) => void,
) {
  // Dexie's cursor callback wrapper can swallow thrown errors. Retain the first
  // failure in constant space and reject outside that wrapper so callers never
  // receive a partial aggregate or ledger. The cursor still visits every row.
  let failure: { error: unknown } | undefined;
  // Keep the collection's transaction-aware promise chain; an extra native
  // async wrapper can let an otherwise idle transaction commit too early.
  return source
    .each((row) => {
      try {
        visit(row);
      } catch (error) {
        failure ??= { error };
      }
    })
    .then(() => {
      if (failure !== undefined) throw failure.error;
    });
}

async function streamStudySessionLedgerRows<Row>(
  database: ProgressPalDatabase,
  projectSession: (session: StudySession) => Row,
) {
  const ledgerRows: Row[] = [];

  // `startedAt` is already indexed. A descending index cursor also traverses
  // duplicate index keys by primary key in descending order, preserving the
  // published `startedAt DESC, id DESC` ledger order without retaining a
  // second complete StudySession[] solely for sorting.
  await forEachValidatedRow(
    database.studySessions.orderBy('startedAt').reverse(),
    (storedSession) => {
      const session = parseWithSchema(
        StudySessionSchema,
        storedSession,
        'Stored study session',
      );

      ledgerRows.push(projectSession(session));
    },
  );

  return ledgerRows;
}

export async function readStudySessionsSurfaceData<Context, Row>(
  createProjection: (
    courseUnits: readonly CourseUnit[],
    courseItems: readonly CourseItem[],
  ) => StudySessionLedgerProjection<Context, Row>,
  options: BaseDatabaseOptions = {},
): Promise<{ context: Context; ledgerRows: Row[] }> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const tables = [
    database.courseUnits,
    database.courseItems,
    database.studySessions,
  ] as const;

  return database.transaction('r', [...tables], async () => {
    const [storedUnits, storedItems] = await Promise.all([
      database.courseUnits.toArray(),
      database.courseItems.toArray(),
    ]);
    const courseUnits = sortCourseUnits(
      parseStoredArray(storedUnits, 'Stored course unit', CourseUnitSchema),
    );
    const courseItems = sortCourseItems(
      parseStoredArray(storedItems, 'Stored course item', CourseItemSchema),
    );
    const { context, projectSession } = createProjection(
      courseUnits,
      courseItems,
    );
    const ledgerRows = await streamStudySessionLedgerRows(
      database,
      projectSession,
    );

    return { context, ledgerRows };
  });
}

export async function readStudySessionLedgerRows<Row>(
  projectSession: (session: StudySession) => Row,
  options: BaseDatabaseOptions = {},
): Promise<Row[]> {
  const database = await ensureOpen(resolveDatabase(options.db));

  return database.transaction('r', database.studySessions, () =>
    streamStudySessionLedgerRows(database, projectSession),
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

/** Correct attribution only; earned rewards remain historical records. */
export async function correctStudySessionAssignment(
  input: { sessionId: string; itemId: string },
  options: BaseDatabaseOptions = {},
) {
  const sessionId = parseWithSchema(
    domainScalarSchemas.entityId,
    input.sessionId,
    'Session id',
  );
  const itemId = parseWithSchema(
    domainScalarSchemas.entityId,
    input.itemId,
    'Item id',
  );
  const database = await ensureOpen(resolveDatabase(options.db));
  const now = options.now ?? defaultClock;
  return runCoordinatedWrite(database, () =>
    database.transaction(
      'rw',
      [
        database.studySessions,
        database.courseItems,
        database.courseUnits,
        database.xpTransactions,
      ],
      async () => {
        markCurrentTransactionCoordinated(database);
        const session = await database.studySessions.get(sessionId);
        const item = await database.courseItems.get(itemId);
        if (!session) throw new Error('The saved session no longer exists.');
        if (!item || !(await database.courseUnits.get(item.unitId))) {
          throw new Error('Choose an existing course task.');
        }
        const corrected = parseWithSchema(
          StudySessionSchema,
          {
            ...session,
            itemId: item.id,
            unitId: item.unitId,
            updatedAt: now(),
          },
          'Corrected study session',
        );
        await database.studySessions.put(corrected);
        const rewards = await database.xpTransactions
          .where('sourceId')
          .equals(session.id)
          .filter((reward) => reward.sourceType === 'study_session')
          .toArray();
        for (const reward of rewards) {
          await database.xpTransactions.update(reward.id, {
            reason: `Logged 25+ minute study session for: ${item.title}`,
          });
        }
        return corrected;
      },
    ),
  );
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
 * Merges the programme's validated achievement catalogue with persisted
 * `achievement_unlocks` into a locked/unlocked view for the Achievements page.
 * Pure read: it evaluates no rules and writes nothing.
 */
export async function getAchievementsView(
  options: ProgrammePolicyOptions,
): Promise<AchievementsView> {
  const unlocks = await listAchievementUnlocks(options);
  return buildAchievementsView(unlocks, options.policy.achievements);
}

function buildAchievementsView(
  unlocks: readonly AchievementUnlock[],
  achievementDefinitions: readonly AchievementDefinition[],
): AchievementsView {
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
 * One passive snapshot for the shared classic/RPG achievements surface. Only
 * unlocks for code definitions are retained; lifetime XP is validated and
 * accumulated one row at a time, with no hidden source-history array.
 */
export async function readAchievementsSurfaceData(
  options: ProgrammePolicyOptions,
): Promise<{ view: AchievementsView; xpSummary: XpSummary }> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const achievementDefinitions = options.policy.achievements;

  return database.transaction(
    'r',
    [database.achievementUnlocks, database.xpTransactions],
    async () => {
      const records = await database.achievementUnlocks
        .where('achievementId')
        .anyOf(achievementDefinitions.map((definition) => definition.id))
        .toArray();
      const unlocks = parseStoredArray(
        records,
        'Stored achievement unlock',
        AchievementUnlockSchema,
      );
      let totalXp = 0;
      let validationError: unknown;

      await database.xpTransactions.each((storedTransaction) => {
        // Dexie's cursor callback wrapper can swallow thrown exceptions. Keep
        // the first validation error and reject outside that callback so a
        // corrupt row cannot silently produce a partial lifetime summary.
        try {
          const transaction = parseWithSchema(
            XpTransactionSchema,
            storedTransaction,
            'Stored XP transaction',
          );
          totalXp += transaction.xp;
        } catch (error) {
          validationError ??= error;
        }
      });

      if (validationError !== undefined) throw validationError;

      return {
        view: buildAchievementsView(unlocks, achievementDefinitions),
        xpSummary: calculateXpSummary(totalXp),
      };
    },
  );
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
  achievementDefinitions: readonly AchievementDefinition[],
  catalogueId: string,
): Promise<AchievementUnlock[]> {
  // The catalogue context (units and items) is the active catalogue's
  // (Epic C / C5). Learner activity - progress, slices, media events and
  // sessions - stays whole-store, so activity achievements and global unlock
  // ownership (OD-2) are unchanged.
  const { courseItems, courseUnits } = await readScopedCatalogue(
    database,
    catalogueId,
  );
  const [
    progressEntryRecords,
    contentSliceRecords,
    mediaProgressEventRecords,
    studySessionRecords,
  ] = await Promise.all([
    database.progressEntries.toArray(),
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
    courseItems,
    courseUnits,
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

  const satisfied = evaluateAchievements(achievementDefinitions, context);
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
  options: ScopedProgrammeOptions,
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
        await assertItemInCatalogue(
          database,
          input.itemId,
          options.catalogueId,
        );
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

        const linkedItemIds = getLinkedMilestoneItemIds(
          options.policy.xp,
          item.id,
        );
        const milestoneProgress =
          linkedItemIds.length > 0
            ? await database.progressEntries
                .where('itemId')
                .anyOf(linkedItemIds)
                .toArray()
            : [];

        const potentialAwards = evaluateProgressXp({
          policy: options.policy.xp,
          progressEntry: progressEntry!,
          item,
          unit,
          allUnitItems,
          allUnitProgress,
          milestoneProgress,
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
          options.policy.achievements,
          options.catalogueId,
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
  options: ScopedProgrammeOptions,
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
        const targetAsset = await database.contentAssets.get(input.assetId);

        if (targetAsset !== undefined) {
          await assertItemInCatalogue(
            database,
            targetAsset.itemId,
            options.catalogueId,
          );
        }

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

            const linkedItemIds = getLinkedMilestoneItemIds(
              options.policy.xp,
              item.id,
            );
            const milestoneProgress =
              linkedItemIds.length > 0
                ? await database.progressEntries
                    .where('itemId')
                    .anyOf(linkedItemIds)
                    .toArray()
                : [];

            const progressAwards = evaluateProgressXp({
              policy: options.policy.xp,
              progressEntry,
              item,
              unit,
              allUnitItems,
              allUnitProgress,
              milestoneProgress,
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
          options.policy.achievements,
          options.catalogueId,
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
  options: ScopedProgrammeOptions,
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
          options.policy.achievements,
          options.catalogueId,
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

type MutableLongFormEventAggregate = LongFormEventAggregate & {
  lastCreatedAt: string | null;
  lastEventId: string | null;
};

function addCoverageRange(ranges: CoveredRange[], range: CoveredRange): void {
  let startSecond = Math.floor(range.startSecond);
  let endSecond = Math.floor(range.endSecond);

  if (endSecond <= startSecond) {
    return;
  }

  let lower = 0;
  let upper = ranges.length;

  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);

    if (ranges[middle]!.endSecond < startSecond) {
      lower = middle + 1;
    } else {
      upper = middle;
    }
  }

  const index = lower;
  let removeCount = 0;

  while (
    index + removeCount < ranges.length &&
    ranges[index + removeCount]!.startSecond <= endSecond
  ) {
    const current = ranges[index + removeCount]!;
    startSecond = Math.min(startSecond, current.startSecond);
    endSecond = Math.max(endSecond, current.endSecond);
    removeCount += 1;
  }

  ranges.splice(index, removeCount, { endSecond, startSecond });
}

function getCourseMapRewardSources(
  policy: ProgrammePolicy,
  courseUnits: readonly CourseUnit[],
  courseItems: readonly CourseItem[],
  progressEntries: readonly ProgressEntry[],
) {
  const sourceIds = new Set<string>();
  const sourceKeys = new Set<string>();
  const unitById = new Map(courseUnits.map((unit) => [unit.id, unit]));

  for (const item of courseItems) {
    const unit = unitById.get(item.unitId);

    if (unit === undefined) {
      continue;
    }

    for (const award of evaluateCompletionPreviewXp({
      policy: policy.xp,
      workflow: policy.workflow,
      allCourseItems: courseItems,
      allProgress: progressEntries,
      item,
      unit,
    })) {
      if (isUnitCompletionAward(policy.xp, award)) {
        continue;
      }

      sourceIds.add(award.sourceId);
      sourceKeys.add(getXpAwardSourceKey(award.sourceType, award.sourceId));
    }
  }

  return { sourceIds: [...sourceIds], sourceKeys };
}

function getResourceRewardSources(
  policy: ProgrammePolicy,
  courseUnit: CourseUnit,
  courseItems: readonly CourseItem[],
  progressEntries: readonly ProgressEntry[],
  courseItem: CourseItem,
) {
  const sourceIds = new Set<string>();
  const sourceKeys = new Set<string>();

  for (const award of evaluateCompletionPreviewXp({
    policy: policy.xp,
    workflow: policy.workflow,
    allCourseItems: courseItems,
    allProgress: progressEntries,
    item: courseItem,
    unit: courseUnit,
  })) {
    sourceIds.add(award.sourceId);
    sourceKeys.add(getXpAwardSourceKey(award.sourceType, award.sourceId));
  }

  return { sourceIds: [...sourceIds], sourceKeys };
}

type A4CourseState = CourseStateReadData & {
  learnerProfile: LearnerProfile | null;
};

function compareRecentActivityRows(
  left: { id: string; timestamp: string },
  right: { id: string; timestamp: string },
) {
  return (
    right.timestamp.localeCompare(left.timestamp) ||
    left.id.localeCompare(right.id)
  );
}

function retainRecentStudySession(
  recent: RpgRecentStudySession[],
  session: StudySession,
) {
  recent.push({
    id: session.id,
    itemId: session.itemId,
    startedAt: session.startedAt,
  });
  recent.sort((left, right) =>
    compareRecentActivityRows(
      { id: `study_session:${left.id}`, timestamp: left.startedAt },
      { id: `study_session:${right.id}`, timestamp: right.startedAt },
    ),
  );
  if (recent.length > 5) recent.pop();
}

function retainRecentXpTransaction(
  recent: RpgRecentXpTransaction[],
  transaction: XpTransaction,
) {
  recent.push({
    awardedAt: transaction.awardedAt,
    id: transaction.id,
    reason: transaction.reason,
    xp: transaction.xp,
  });
  recent.sort((left, right) =>
    compareRecentActivityRows(
      { id: `xp:${left.id}`, timestamp: left.awardedAt },
      { id: `xp:${right.id}`, timestamp: right.awardedAt },
    ),
  );
  if (recent.length > 5) recent.pop();
}

/**
 * The units and items of one materialized catalogue (Epic C / C5): units by
 * the `courseId` index, items by those units' IDs. A catalogue with no
 * materialized unit fails closed; it is never read as an empty course. Runs
 * inside the caller's transaction.
 */
async function readScopedCatalogue(
  database: ProgressPalDatabase,
  catalogueId: string,
) {
  const courseUnits = sortCourseUnits(
    parseStoredArray(
      await database.courseUnits
        .where('courseId')
        .equals(catalogueId)
        .toArray(),
      'Stored course unit',
      CourseUnitSchema,
    ),
  );

  if (courseUnits.length === 0) {
    throw new Error(
      `Catalogue "${catalogueId}" has no materialized course units.`,
    );
  }

  const courseItems = sortCourseItems(
    parseStoredArray(
      await database.courseItems
        .where('unitId')
        .anyOf(courseUnits.map((unit) => unit.id))
        .toArray(),
      'Stored course item',
      CourseItemSchema,
    ),
  );

  return { courseItems, courseUnits };
}

/**
 * Catalogue-derived course state for one catalogue (Epic C / C5). Progress,
 * long-form rows and media history are bounded by the scoped item and asset
 * IDs, one query per store; media history is aggregated without retaining
 * source rows.
 */
async function readScopedCourseRows(
  database: ProgressPalDatabase,
  catalogueId: string,
) {
  const { courseItems, courseUnits } = await readScopedCatalogue(
    database,
    catalogueId,
  );
  const itemIds = courseItems.map((item) => item.id);
  const [progressEntries, contentAssets, contentSlices, resumePoints] =
    itemIds.length === 0
      ? [[], [], [], []]
      : await Promise.all([
          database.progressEntries.where('itemId').anyOf(itemIds).toArray(),
          database.contentAssets.where('itemId').anyOf(itemIds).toArray(),
          database.contentSlices.where('itemId').anyOf(itemIds).toArray(),
          database.resumePoints.where('itemId').anyOf(itemIds).toArray(),
        ]);
  const parsedProgressEntries = sortProgressEntries(
    parseStoredArray(
      progressEntries,
      'Stored progress entry',
      ProgressEntrySchema,
    ),
  );
  const parsedContentAssets = sortContentAssets(
    parseStoredArray(contentAssets, 'Stored content asset', ContentAssetSchema),
  );
  const parsedContentSlices = sortContentSlices(
    parseStoredArray(contentSlices, 'Stored content slice', ContentSliceSchema),
  );
  const parsedResumePoints = sortResumePoints(
    parseStoredArray(resumePoints, 'Stored resume point', ResumePointSchema),
  );

  return {
    contentAssets: parsedContentAssets,
    contentSlices: parsedContentSlices,
    courseItems,
    courseUnits,
    progressEntries: parsedProgressEntries,
    resumePoints: parsedResumePoints,
  };
}

async function readScopedCourseState(
  database: ProgressPalDatabase,
  catalogueId: string,
): Promise<CourseStateReadData> {
  const rows = await readScopedCourseRows(database, catalogueId);
  const mediaProgressByAssetId = new Map<
    string,
    MutableLongFormEventAggregate
  >();
  const assetIds = rows.contentAssets.map((asset) => asset.id);

  if (assetIds.length > 0) {
    await forEachValidatedRow(
      database.mediaProgressEvents.where('assetId').anyOf(assetIds),
      (storedEvent) => {
        const event = parseWithSchema(
          MediaProgressEventSchema,
          storedEvent,
          'Stored media progress event',
        );
        const aggregate = mediaProgressByAssetId.get(event.assetId) ?? {
          coverageRanges: [],
          eventCount: 0,
          lastCreatedAt: null,
          lastEventEndSecond: null,
          lastEventId: null,
        };

        aggregate.eventCount += 1;
        addCoverageRange(aggregate.coverageRanges, {
          endSecond: event.endSecond,
          startSecond: event.startSecond,
        });

        if (
          aggregate.lastCreatedAt === null ||
          event.createdAt > aggregate.lastCreatedAt ||
          (event.createdAt === aggregate.lastCreatedAt &&
            (aggregate.lastEventId === null ||
              event.id > aggregate.lastEventId))
        ) {
          aggregate.lastCreatedAt = event.createdAt;
          aggregate.lastEventEndSecond = event.endSecond;
          aggregate.lastEventId = event.id;
        }

        mediaProgressByAssetId.set(event.assetId, aggregate);
      },
    );
  }

  return {
    ...rows,
    mediaProgressByAssetId: new Map(
      [...mediaProgressByAssetId].map(([assetId, aggregate]) => [
        assetId,
        {
          coverageRanges: aggregate.coverageRanges,
          eventCount: aggregate.eventCount,
          lastEventEndSecond: aggregate.lastEventEndSecond,
        },
      ]),
    ),
  };
}

async function readA4CourseState(
  database: ProgressPalDatabase,
  catalogueId: string,
): Promise<A4CourseState> {
  const [courseState, learnerProfileRecord] = await Promise.all([
    readScopedCourseState(database, catalogueId),
    database.learnerProfile.get(singletonIds.learnerProfile),
  ]);
  const learnerProfile =
    learnerProfileRecord === undefined
      ? null
      : parseWithSchema(
          LearnerProfileSchema,
          learnerProfileRecord,
          'Stored learner profile',
        );

  return { ...courseState, learnerProfile };
}

async function readA4EarnedRewardSourceKeys(
  database: ProgressPalDatabase,
  courseState: CourseStateReadData,
  policy: ProgrammePolicy,
  validationLabel = 'Stored RPG reward XP transaction',
) {
  const rewardSources = getCourseMapRewardSources(
    policy,
    courseState.courseUnits,
    courseState.courseItems,
    courseState.progressEntries,
  );
  const earnedRewardSourceKeys = new Set<string>();

  if (rewardSources.sourceIds.length > 0) {
    await forEachValidatedRow(
      database.xpTransactions.where('sourceId').anyOf(rewardSources.sourceIds),
      (storedTransaction) => {
        const transaction = parseWithSchema(
          XpTransactionSchema,
          storedTransaction,
          validationLabel,
        );
        const sourceKey = getXpAwardSourceKey(
          transaction.sourceType,
          transaction.sourceId,
        );

        if (rewardSources.sourceKeys.has(sourceKey)) {
          earnedRewardSourceKeys.add(sourceKey);
        }
      },
    );
  }

  return earnedRewardSourceKeys;
}

async function readA4XpHistory(
  database: ProgressPalDatabase,
  options: {
    collectRecent: boolean;
    range?: RpgHubReadRange;
  },
) {
  let totalXp = 0;
  let weeklyXpEarned = 0;
  const recentXpTransactions: RpgRecentXpTransaction[] = [];

  await forEachValidatedRow(database.xpTransactions, (storedTransaction) => {
    const transaction = parseWithSchema(
      XpTransactionSchema,
      storedTransaction,
      'Stored XP transaction',
    );

    totalXp += transaction.xp;

    if (
      options.range !== undefined &&
      Date.parse(transaction.awardedAt) >= options.range.startTime &&
      Date.parse(transaction.awardedAt) < options.range.nextStartTime
    ) {
      weeklyXpEarned += transaction.xp;
    }

    if (options.collectRecent) {
      retainRecentXpTransaction(recentXpTransactions, transaction);
    }
  });

  return { recentXpTransactions, totalXp, weeklyXpEarned };
}

async function readA4SessionHistory(
  database: ProgressPalDatabase,
  range?: RpgHubReadRange,
) {
  let sessionCount = 0;
  let totalMinutes = 0;
  let weeklySessionCount = 0;
  let weeklyTotalMinutes = 0;
  const recentStudySessions: RpgRecentStudySession[] = [];

  await forEachValidatedRow(database.studySessions, (storedSession) => {
    const session = parseWithSchema(
      StudySessionSchema,
      storedSession,
      'Stored study session',
    );

    sessionCount += 1;
    totalMinutes += session.durationMinutes;
    retainRecentStudySession(recentStudySessions, session);

    if (
      range !== undefined &&
      Date.parse(session.startedAt) >= range.startTime &&
      Date.parse(session.startedAt) < range.nextStartTime
    ) {
      weeklySessionCount += 1;
      weeklyTotalMinutes += session.durationMinutes;
    }
  });

  return {
    recentStudySessions,
    sessionCount,
    totalMinutes,
    weeklySessionCount,
    weeklyTotalMinutes,
  };
}

export async function getRpgHudReadData(
  options: ScopedProgrammeOptions,
): Promise<RpgHudReadData> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const tables = [
    database.learnerProfile,
    database.courseUnits,
    database.courseItems,
    database.progressEntries,
    database.contentAssets,
    database.contentSlices,
    database.mediaProgressEvents,
    database.resumePoints,
    database.xpTransactions,
  ] as const;

  return database.transaction('r', [...tables], async () => {
    const courseState = await readA4CourseState(database, options.catalogueId);
    const [earnedRewardSourceKeys, xp] = await Promise.all([
      readA4EarnedRewardSourceKeys(database, courseState, options.policy),
      readA4XpHistory(database, { collectRecent: false }),
    ]);

    return {
      ...courseState,
      earnedRewardSourceKeys,
      totalXp: xp.totalXp,
    };
  });
}

export async function getRpgHubReadData(
  range: RpgHubReadRange,
  options: ScopedProgrammeOptions,
): Promise<RpgHubReadData> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const tables = [
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
  ] as const;

  return database.transaction('r', [...tables], async () => {
    const courseState = await readA4CourseState(database, options.catalogueId);
    const [earnedRewardSourceKeys, sessions, xp] = await Promise.all([
      readA4EarnedRewardSourceKeys(database, courseState, options.policy),
      readA4SessionHistory(database, range),
      readA4XpHistory(database, { collectRecent: true, range }),
    ]);

    return {
      ...courseState,
      earnedRewardSourceKeys,
      recentStudySessions: sessions.recentStudySessions,
      recentXpTransactions: xp.recentXpTransactions,
      sessionCount: sessions.sessionCount,
      totalMinutes: sessions.totalMinutes,
      totalXp: xp.totalXp,
      weeklySessionCount: sessions.weeklySessionCount,
      weeklyTotalMinutes: sessions.weeklyTotalMinutes,
      weeklyXpEarned: xp.weeklyXpEarned,
    };
  });
}

export async function getRpgHeroReadData(
  options: CatalogueScopeOptions,
): Promise<RpgHeroReadData> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const tables = [
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
    database.achievementUnlocks,
  ] as const;

  return database.transaction('r', [...tables], async () => {
    const courseState = await readA4CourseState(database, options.catalogueId);
    const [sessions, xp, achievementUnlockRecords] = await Promise.all([
      readA4SessionHistory(database),
      readA4XpHistory(database, { collectRecent: true }),
      database.achievementUnlocks.toArray(),
    ]);
    const achievementUnlocks = sortAchievementUnlocks(
      parseStoredArray(
        achievementUnlockRecords,
        'Stored achievement unlock',
        AchievementUnlockSchema,
      ),
    );

    return {
      ...courseState,
      achievementUnlocks,
      recentStudySessions: sessions.recentStudySessions,
      recentXpTransactions: xp.recentXpTransactions,
      sessionCount: sessions.sessionCount,
      totalMinutes: sessions.totalMinutes,
      totalXp: xp.totalXp,
    };
  });
}

export type CatalogueCourseState = {
  contentAssets: ContentAsset[];
  contentSlices: ContentSlice[];
  courseItems: CourseItem[];
  courseUnits: CourseUnit[];
  mediaProgressEvents: MediaProgressEvent[];
  progressEntries: ProgressEntry[];
  resumePoints: ResumePoint[];
};

/**
 * Catalogue-derived course state for the Classic Course and Dashboard
 * surfaces (Epic C / C5): the active catalogue's scoped rows plus the raw
 * media history of its assets, in one read-only transaction. A catalogue
 * with no materialized unit fails closed.
 */
export async function getCatalogueCourseState(
  options: CatalogueScopeOptions,
): Promise<CatalogueCourseState> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const tables = [
    database.courseUnits,
    database.courseItems,
    database.progressEntries,
    database.contentAssets,
    database.contentSlices,
    database.mediaProgressEvents,
    database.resumePoints,
  ] as const;

  return database.transaction('r', [...tables], async () => {
    const rows = await readScopedCourseRows(database, options.catalogueId);
    const assetIds = rows.contentAssets.map((asset) => asset.id);
    const mediaProgressEvents =
      assetIds.length === 0
        ? []
        : sortMediaProgressEvents(
            parseStoredArray(
              await database.mediaProgressEvents
                .where('assetId')
                .anyOf(assetIds)
                .toArray(),
              'Stored media progress event',
              MediaProgressEventSchema,
            ),
          );

    return { ...rows, mediaProgressEvents };
  });
}

export async function getCourseMapReadData(
  options: ScopedProgrammeOptions,
): Promise<CourseMapReadData> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const tables = [
    database.courseUnits,
    database.courseItems,
    database.progressEntries,
    database.contentAssets,
    database.contentSlices,
    database.mediaProgressEvents,
    database.resumePoints,
    database.xpTransactions,
  ] as const;

  return database.transaction('r', [...tables], async () => {
    const courseState = await readScopedCourseState(
      database,
      options.catalogueId,
    );
    const earnedRewardSourceKeys = await readA4EarnedRewardSourceKeys(
      database,
      courseState,
      options.policy,
      'Stored Map reward XP transaction',
    );

    return { ...courseState, earnedRewardSourceKeys };
  });
}

export async function getModuleReadData(
  unitId: string,
  options: ScopedProgrammeOptions,
): Promise<ModuleReadData | null> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const tables = [
    database.courseUnits,
    database.courseItems,
    database.progressEntries,
    database.contentAssets,
    database.contentSlices,
    database.mediaProgressEvents,
    database.resumePoints,
    database.xpTransactions,
  ] as const;

  return database.transaction('r', [...tables], async () => {
    const storedUnit = await database.courseUnits.get(unitId);

    if (storedUnit === undefined) {
      return null;
    }

    const courseUnit = parseWithSchema(
      CourseUnitSchema,
      storedUnit,
      `Stored course unit "${unitId}"`,
    );

    // A unit of another catalogue is not a unit of this one (Epic C / C5).
    if (courseUnit.courseId !== options.catalogueId) {
      return null;
    }
    const courseItems = sortCourseItems(
      parseStoredArray(
        await database.courseItems.where('unitId').equals(unitId).toArray(),
        'Stored course item',
        CourseItemSchema,
      ),
    );
    const itemIds = courseItems.map((item) => item.id);
    const progressEntries =
      itemIds.length === 0
        ? []
        : await database.progressEntries
            .where('itemId')
            .anyOf(itemIds)
            .toArray();
    const contentAssets =
      itemIds.length === 0
        ? []
        : await database.contentAssets.where('itemId').anyOf(itemIds).toArray();
    const contentSlices =
      itemIds.length === 0
        ? []
        : await database.contentSlices.where('itemId').anyOf(itemIds).toArray();
    const resumePoints =
      itemIds.length === 0
        ? []
        : await database.resumePoints.where('itemId').anyOf(itemIds).toArray();
    const parsedProgressEntries = sortProgressEntries(
      parseStoredArray(
        progressEntries,
        'Stored progress entry',
        ProgressEntrySchema,
      ),
    );
    const parsedContentAssets = sortContentAssets(
      parseStoredArray(
        contentAssets,
        'Stored content asset',
        ContentAssetSchema,
      ),
    );
    const parsedContentSlices = sortContentSlices(
      parseStoredArray(
        contentSlices,
        'Stored content slice',
        ContentSliceSchema,
      ),
    );
    const parsedResumePoints = sortResumePoints(
      parseStoredArray(resumePoints, 'Stored resume point', ResumePointSchema),
    );
    const mediaProgressByAssetId = new Map<
      string,
      MutableLongFormEventAggregate
    >();

    if (itemIds.length > 0) {
      await forEachValidatedRow(
        database.mediaProgressEvents.where('itemId').anyOf(itemIds),
        (storedEvent) => {
          const event = parseWithSchema(
            MediaProgressEventSchema,
            storedEvent,
            'Stored media progress event',
          );
          const aggregate = mediaProgressByAssetId.get(event.assetId) ?? {
            coverageRanges: [],
            eventCount: 0,
            lastCreatedAt: null,
            lastEventEndSecond: null,
            lastEventId: null,
          };

          aggregate.eventCount += 1;
          addCoverageRange(aggregate.coverageRanges, {
            endSecond: event.endSecond,
            startSecond: event.startSecond,
          });

          if (
            aggregate.lastCreatedAt === null ||
            event.createdAt > aggregate.lastCreatedAt ||
            (event.createdAt === aggregate.lastCreatedAt &&
              (aggregate.lastEventId === null ||
                event.id > aggregate.lastEventId))
          ) {
            aggregate.lastCreatedAt = event.createdAt;
            aggregate.lastEventEndSecond = event.endSecond;
            aggregate.lastEventId = event.id;
          }

          mediaProgressByAssetId.set(event.assetId, aggregate);
        },
      );
    }

    const rewardSources = getCourseMapRewardSources(
      options.policy,
      [courseUnit],
      courseItems,
      parsedProgressEntries,
    );
    const earnedRewardSourceKeys = new Set<string>();

    if (rewardSources.sourceIds.length > 0) {
      await forEachValidatedRow(
        database.xpTransactions
          .where('sourceId')
          .anyOf(rewardSources.sourceIds),
        (storedTransaction) => {
          const transaction = parseWithSchema(
            XpTransactionSchema,
            storedTransaction,
            'Stored Module reward XP transaction',
          );
          const sourceKey = getXpAwardSourceKey(
            transaction.sourceType,
            transaction.sourceId,
          );

          if (rewardSources.sourceKeys.has(sourceKey)) {
            earnedRewardSourceKeys.add(sourceKey);
          }
        },
      );
    }

    return {
      contentAssets: parsedContentAssets,
      contentSlices: parsedContentSlices,
      courseItems,
      courseUnit,
      mediaProgressByAssetId: new Map(
        [...mediaProgressByAssetId].map(([assetId, aggregate]) => [
          assetId,
          {
            coverageRanges: aggregate.coverageRanges,
            eventCount: aggregate.eventCount,
            lastEventEndSecond: aggregate.lastEventEndSecond,
          },
        ]),
      ),
      progressEntries: parsedProgressEntries,
      resumePoints: parsedResumePoints,
      earnedRewardSourceKeys,
    };
  });
}

export async function getResourceReadData(
  itemId: string,
  options: ScopedProgrammeOptions,
): Promise<ResourceReadData | null> {
  const database = await ensureOpen(resolveDatabase(options.db));
  const tables = [
    database.courseUnits,
    database.courseItems,
    database.progressEntries,
    database.contentAssets,
    database.contentSlices,
    database.mediaProgressEvents,
    database.resumePoints,
    database.xpTransactions,
  ] as const;

  return database.transaction('r', [...tables], async () => {
    const storedItem = await database.courseItems.get(itemId);

    if (storedItem === undefined) {
      return null;
    }

    const courseItem = parseWithSchema(
      CourseItemSchema,
      storedItem,
      `Stored course item "${itemId}"`,
    );
    const storedUnit = await database.courseUnits.get(courseItem.unitId);

    if (storedUnit === undefined) {
      return null;
    }

    const courseUnit = parseWithSchema(
      CourseUnitSchema,
      storedUnit,
      `Stored course unit "${courseItem.unitId}"`,
    );

    // An item of another catalogue is not an item of this one (Epic C / C5).
    if (courseUnit.courseId !== options.catalogueId) {
      return null;
    }
    const courseItems = sortCourseItems(
      parseStoredArray(
        await database.courseItems
          .where('unitId')
          .equals(courseItem.unitId)
          .toArray(),
        'Stored course item',
        CourseItemSchema,
      ),
    );
    const unitItemIds = courseItems.map((item) => item.id);
    const progressEntries =
      unitItemIds.length === 0
        ? []
        : await database.progressEntries
            .where('itemId')
            .anyOf(unitItemIds)
            .toArray();
    const contentAssets = await database.contentAssets
      .where('itemId')
      .equals(itemId)
      .toArray();
    const contentSlices = await database.contentSlices
      .where('itemId')
      .equals(itemId)
      .toArray();
    const resumePoints = await database.resumePoints
      .where('itemId')
      .equals(itemId)
      .toArray();
    const parsedProgressEntries = sortProgressEntries(
      parseStoredArray(
        progressEntries,
        'Stored progress entry',
        ProgressEntrySchema,
      ),
    );
    const parsedContentAssets = sortContentAssets(
      parseStoredArray(
        contentAssets,
        'Stored content asset',
        ContentAssetSchema,
      ),
    );
    const parsedContentSlices = sortContentSlices(
      parseStoredArray(
        contentSlices,
        'Stored content slice',
        ContentSliceSchema,
      ),
    );
    const parsedResumePoints = sortResumePoints(
      parseStoredArray(resumePoints, 'Stored resume point', ResumePointSchema),
    );
    const mediaProgressByAssetId = new Map<
      string,
      MutableLongFormEventAggregate
    >();

    await forEachValidatedRow(
      database.mediaProgressEvents.where('itemId').equals(itemId),
      (storedEvent) => {
        const event = parseWithSchema(
          MediaProgressEventSchema,
          storedEvent,
          'Stored Resource media progress event',
        );
        const aggregate = mediaProgressByAssetId.get(event.assetId) ?? {
          coverageRanges: [],
          eventCount: 0,
          lastCreatedAt: null,
          lastEventEndSecond: null,
          lastEventId: null,
        };

        aggregate.eventCount += 1;
        addCoverageRange(aggregate.coverageRanges, {
          endSecond: event.endSecond,
          startSecond: event.startSecond,
        });

        if (
          aggregate.lastCreatedAt === null ||
          event.createdAt > aggregate.lastCreatedAt ||
          (event.createdAt === aggregate.lastCreatedAt &&
            (aggregate.lastEventId === null ||
              event.id > aggregate.lastEventId))
        ) {
          aggregate.lastCreatedAt = event.createdAt;
          aggregate.lastEventEndSecond = event.endSecond;
          aggregate.lastEventId = event.id;
        }

        mediaProgressByAssetId.set(event.assetId, aggregate);
      },
    );

    const rewardSources = getResourceRewardSources(
      options.policy,
      courseUnit,
      courseItems,
      parsedProgressEntries,
      courseItem,
    );
    const earnedRewardSourceKeys = new Set<string>();

    if (rewardSources.sourceIds.length > 0) {
      await forEachValidatedRow(
        database.xpTransactions
          .where('sourceId')
          .anyOf(rewardSources.sourceIds),
        (storedTransaction) => {
          const transaction = parseWithSchema(
            XpTransactionSchema,
            storedTransaction,
            'Stored Resource reward XP transaction',
          );
          const sourceKey = getXpAwardSourceKey(
            transaction.sourceType,
            transaction.sourceId,
          );

          if (rewardSources.sourceKeys.has(sourceKey)) {
            earnedRewardSourceKeys.add(sourceKey);
          }
        },
      );
    }

    return {
      contentAssets: parsedContentAssets,
      contentSlices: parsedContentSlices,
      courseItem,
      courseItems,
      courseUnit,
      mediaProgressByAssetId: new Map(
        [...mediaProgressByAssetId].map(([assetId, aggregate]) => [
          assetId,
          {
            coverageRanges: aggregate.coverageRanges,
            eventCount: aggregate.eventCount,
            lastEventEndSecond: aggregate.lastEventEndSecond,
          },
        ]),
      ),
      progressEntries: parsedProgressEntries,
      resumePoints: parsedResumePoints,
      earnedRewardSourceKeys,
    };
  });
}

export async function getDatabaseSnapshot(options: BaseDatabaseOptions = {}) {
  const database = await ensureOpen(resolveDatabase(options.db));
  const tables = allDataTables(database);
  const includedTableNames = new Set(tables.map((table) => table.name));
  const omittedTableNames = database.tables
    .map((table) => table.name)
    .filter((name) => !includedTableNames.has(name));

  if (
    omittedTableNames.length > 0 ||
    includedTableNames.size !== database.tables.length
  ) {
    throw new Error(
      `Database snapshot table coverage is incomplete: ${omittedTableNames.join(', ') || 'duplicate table mapping'}.`,
    );
  }

  return database.transaction('r', tables, async () => {
    const [
      storedAppMeta,
      storedLearnerProfile,
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
      catalogueVersions,
      programmeEnrolments,
    ] = await Promise.all([
      database.appMeta.get(singletonIds.appMeta),
      database.learnerProfile.get(singletonIds.learnerProfile),
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
      database.catalogueVersions.toArray(),
      database.programmeEnrolments.toArray(),
    ]);
    const appMeta =
      storedAppMeta === undefined
        ? null
        : parseWithSchema(AppMetaSchema, storedAppMeta, 'Stored app metadata');
    const learnerProfile =
      storedLearnerProfile === undefined
        ? null
        : parseWithSchema(
            LearnerProfileSchema,
            storedLearnerProfile,
            'Stored learner profile',
          );

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
        parseStoredArray(
          resumePoints,
          'Stored resume point',
          ResumePointSchema,
        ),
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
      catalogueVersions: parseStoredArray(
        catalogueVersions,
        'Stored catalogue version',
        CatalogueVersionSchema,
      ),
      programmeEnrolments: parseStoredArray(
        programmeEnrolments,
        'Stored programme enrolment',
        ProgrammeEnrolmentSchema,
      ),
    };
  });
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
    database.catalogueVersions,
    database.programmeEnrolments,
  ];
}

/**
 * Re-validate every row of a backup snapshot through the domain schemas before
 * any write. Defense in depth: the UI already validated the envelope, but the
 * restore path must never trust unvalidated structured input.
 */
function parseSnapshotForRestore(
  snapshot: DatabaseSnapshot,
  migrationContext: DatabaseMigrationContext,
) {
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
    catalogueVersions: parseStoredArray(
      snapshot.catalogueVersions,
      'Backup catalogue version',
      CatalogueVersionSchema,
    ),
    programmeEnrolments: parseStoredArray(
      snapshot.programmeEnrolments,
      'Backup programme enrolment',
      ProgrammeEnrolmentSchema,
    ),
  };

  assertBackupDataInvariants(restored, {
    expectedSchemaVersion: currentDatabaseSchemaVersion,
    migrationContext,
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
  const database = await ensureOpen(resolveDatabase(options.db));
  const restored = parseSnapshotForRestore(snapshot, database.migrationContext);
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
        database.catalogueVersions.bulkAdd(restored.catalogueVersions),
        database.programmeEnrolments.bulkAdd(restored.programmeEnrolments),
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
        migrationContext: database.migrationContext,
      });

      return finalSnapshot;
    }),
  );
}
