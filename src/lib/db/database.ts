import Dexie, { type Table, type Transaction } from 'dexie';
import type { ZodType } from 'zod';

import {
  ContentAssetSchema,
  ContentSliceSchema,
  CourseItemSchema,
  CourseUnitSchema,
  MediaProgressEventSchema,
  ProgressEntrySchema,
  ResumePointSchema,
  StudySessionSchema,
  XpTransactionSchema,
  type AchievementDefinition,
  type AchievementUnlock,
  type AppMeta,
  type BackupRecord,
  type CatalogueVersion,
  type ContentAsset,
  type ContentSlice,
  type CourseItem,
  type CourseUnit,
  type LearnerProfile,
  type MediaProgressEvent,
  type ProgrammeEnrolment,
  type ProgressEntry,
  type ResumePoint,
  type StudySession,
  type XpTransaction,
} from '@/lib/domain';
import { parseWithSchema } from '@/lib/validation';

import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  progressPalDatabaseName,
} from './constants';
import {
  migrateV2ToV3,
  parseLegacyAppMetaV2,
  type LegacyV2Snapshot,
} from './migrationV2ToV3';
import {
  assertValidMigrationContext,
  migrationContextsAreEquivalent,
  type DatabaseMigrationContext,
} from './migrationContext';

export {
  isAuthorizedProgramme,
  listAuthorizedProgrammeIds,
  type DatabaseMigrationContext,
} from './migrationContext';

const versionOneStoreDefinitions = {
  app_meta: '&id, schemaVersion, seedVersion',
  learner_profile: '&id, updatedAt, preferredTheme',
  course_units: '&id, courseId, [courseId+order], type, required',
  course_items: '&id, unitId, [unitId+order], type, required',
  progress_entries: '&id, &itemId, status, completedAt',
  study_sessions: '&id, unitId, itemId, mode, startedAt, endedAt',
  xp_transactions: '&id, sourceType, sourceId, awardedAt',
  achievement_definitions: '&id, category, ruleType',
  achievement_unlocks: '&id, &achievementId, unlockedAt, triggerSourceId',
  backups: '&id, type, createdAt',
} as const;

const currentStoreDefinitions = {
  ...versionOneStoreDefinitions,
  content_assets: '&id, itemId, [itemId+order], assetType, required',
  content_slices: '&id, assetId, itemId, [assetId+order], status, completedAt',
  media_progress_events:
    '&id, itemId, assetId, sliceId, sessionId, [assetId+createdAt]',
  resume_points: '&id, &assetId, itemId, nextSliceId',
} as const;

function migrateVersionOneToVersionTwo(transaction: Transaction) {
  return Promise.all([
    transaction
      .table('study_sessions')
      .toCollection()
      .modify((session: Record<string, unknown>) => {
        if (!Array.isArray(session.blockers)) {
          session.blockers = [];
        }
      }),
    transaction
      .table('app_meta')
      .toCollection()
      .modify((appMeta: Record<string, unknown>) => {
        appMeta.schemaVersion = currentDatabaseSchemaVersion;

        if (typeof appMeta.seedVersion !== 'number') {
          appMeta.seedVersion = 0;
        }

        if (
          typeof appMeta.appVersion !== 'string' ||
          appMeta.appVersion.trim().length === 0
        ) {
          appMeta.appVersion = currentApplicationVersion;
        }

        if (
          typeof appMeta.updatedAt !== 'string' &&
          typeof appMeta.createdAt === 'string'
        ) {
          appMeta.updatedAt = appMeta.createdAt;
        }
      }),
  ]);
}

const versionThreeStoreDefinitions = {
  ...currentStoreDefinitions,
  // The unused `seedVersion` index is dropped; the field itself is removed
  // from the row shape by the upgrade below.
  app_meta: '&id, schemaVersion',
  catalogue_versions: '&courseId, programmeId',
  programme_enrolments: '&programmeId',
} as const;

const otherV2StoreNames = [
  'learner_profile',
  'course_units',
  'course_items',
  'progress_entries',
  'content_assets',
  'content_slices',
  'media_progress_events',
  'resume_points',
  'study_sessions',
  'xp_transactions',
  'achievement_definitions',
  'achievement_unlocks',
  'backups',
] as const;

function parseLegacyRows<Row>(
  rows: unknown[],
  schema: ZodType<Row>,
  label: string,
): Row[] {
  return rows.map((row) => parseWithSchema(schema, row, label));
}

/**
 * Epic C / C6 — the Dexie v2 → v3 upgrade. Loads the legacy snapshot, hands
 * it to the pure mapping module (which validates before deciding anything),
 * then performs exactly the writes it returns inside this same
 * version-change transaction: an aborting validation leaves v2 intact.
 */
async function migrateVersionTwoToVersionThree(
  transaction: Transaction,
  migrationContext: DatabaseMigrationContext,
) {
  const [
    rawAppMeta,
    courseUnitRows,
    courseItemRows,
    contentAssetRows,
    contentSliceRows,
    mediaProgressEventRows,
    resumePointRows,
    progressEntryRows,
    studySessionRows,
    xpTransactionRows,
    otherRowCounts,
  ] = await Promise.all([
    transaction.table('app_meta').toCollection().first(),
    transaction.table('course_units').toArray(),
    transaction.table('course_items').toArray(),
    transaction.table('content_assets').toArray(),
    transaction.table('content_slices').toArray(),
    transaction.table('media_progress_events').toArray(),
    transaction.table('resume_points').toArray(),
    transaction.table('progress_entries').toArray(),
    transaction.table('study_sessions').toArray(),
    transaction.table('xp_transactions').toArray(),
    Promise.all(
      otherV2StoreNames.map((name) => transaction.table(name).count()),
    ),
  ]);

  const snapshot: LegacyV2Snapshot = {
    appMeta:
      rawAppMeta === undefined
        ? null
        : parseLegacyAppMetaV2(rawAppMeta, 'Stored app metadata'),
    hasOtherRows: otherRowCounts.some((count) => count > 0),
    courseUnits: parseLegacyRows(
      courseUnitRows,
      CourseUnitSchema,
      'Stored course unit',
    ),
    courseItems: parseLegacyRows(
      courseItemRows,
      CourseItemSchema,
      'Stored course item',
    ),
    contentAssets: parseLegacyRows(
      contentAssetRows,
      ContentAssetSchema,
      'Stored content asset',
    ),
    contentSlices: parseLegacyRows(
      contentSliceRows,
      ContentSliceSchema,
      'Stored content slice',
    ),
    mediaProgressEvents: parseLegacyRows(
      mediaProgressEventRows,
      MediaProgressEventSchema,
      'Stored media progress event',
    ),
    resumePoints: parseLegacyRows(
      resumePointRows,
      ResumePointSchema,
      'Stored resume point',
    ),
    progressEntries: parseLegacyRows(
      progressEntryRows,
      ProgressEntrySchema,
      'Stored progress entry',
    ),
    studySessions: parseLegacyRows(
      studySessionRows,
      StudySessionSchema,
      'Stored study session',
    ),
    xpTransactions: parseLegacyRows(
      xpTransactionRows,
      XpTransactionSchema,
      'Stored XP transaction',
    ),
  };

  const result = migrateV2ToV3(snapshot, migrationContext);

  if (result.skip) {
    return;
  }

  await Promise.all([
    transaction.table('app_meta').put(result.appMeta),
    transaction
      .table('catalogue_versions')
      .bulkAdd([...result.catalogueVersions]),
    transaction
      .table('programme_enrolments')
      .bulkAdd([...result.programmeEnrolments]),
  ]);
}

export class ProgressPalDatabase extends Dexie {
  appMeta!: Table<AppMeta, string>;
  learnerProfile!: Table<LearnerProfile, string>;
  courseUnits!: Table<CourseUnit, string>;
  courseItems!: Table<CourseItem, string>;
  progressEntries!: Table<ProgressEntry, string>;
  contentAssets!: Table<ContentAsset, string>;
  contentSlices!: Table<ContentSlice, string>;
  mediaProgressEvents!: Table<MediaProgressEvent, string>;
  resumePoints!: Table<ResumePoint, string>;
  studySessions!: Table<StudySession, string>;
  xpTransactions!: Table<XpTransaction, string>;
  achievementDefinitions!: Table<AchievementDefinition, string>;
  achievementUnlocks!: Table<AchievementUnlock, string>;
  backups!: Table<BackupRecord, string>;
  catalogueVersions!: Table<CatalogueVersion, string>;
  programmeEnrolments!: Table<ProgrammeEnrolment, string>;
  /** Bound once at construction (Epic C / C6, binding control 2). */
  readonly migrationContext: DatabaseMigrationContext;

  constructor(
    migrationContext: DatabaseMigrationContext,
    databaseName = progressPalDatabaseName,
  ) {
    super(databaseName);
    assertValidMigrationContext(migrationContext);
    this.migrationContext = migrationContext;

    this.version(1).stores(versionOneStoreDefinitions);
    this.version(2)
      .stores(currentStoreDefinitions)
      .upgrade(migrateVersionOneToVersionTwo);
    this.version(3)
      .stores(versionThreeStoreDefinitions)
      .upgrade((transaction) =>
        migrateVersionTwoToVersionThree(transaction, this.migrationContext),
      );

    this.appMeta = this.table('app_meta');
    this.learnerProfile = this.table('learner_profile');
    this.courseUnits = this.table('course_units');
    this.courseItems = this.table('course_items');
    this.progressEntries = this.table('progress_entries');
    this.contentAssets = this.table('content_assets');
    this.contentSlices = this.table('content_slices');
    this.mediaProgressEvents = this.table('media_progress_events');
    this.resumePoints = this.table('resume_points');
    this.studySessions = this.table('study_sessions');
    this.xpTransactions = this.table('xp_transactions');
    this.achievementDefinitions = this.table('achievement_definitions');
    this.achievementUnlocks = this.table('achievement_unlocks');
    this.backups = this.table('backups');
    this.catalogueVersions = this.table('catalogue_versions');
    this.programmeEnrolments = this.table('programme_enrolments');
  }
}

let sharedDatabase: ProgressPalDatabase | null = null;

export function createProgressPalDatabase(
  migrationContext: DatabaseMigrationContext,
  databaseName?: string,
) {
  return new ProgressPalDatabase(migrationContext, databaseName);
}

/**
 * The shared singleton instance. The first call in a database lifetime must
 * supply `migrationContext`, bound once to that instance (Epic C / C6,
 * binding control 2); a later call may omit it (returning the already-bound
 * instance) or repeat an equivalent context, but a conflicting context fails
 * closed. There is no separate module-global context: it lives only on the
 * instance itself, and is discarded along with it by `closeSharedDatabase`.
 */
export function getSharedDatabase(migrationContext?: DatabaseMigrationContext) {
  if (sharedDatabase === null) {
    if (migrationContext === undefined) {
      throw new Error(
        'The ProgressPal database migration context is required to open the shared database and was not supplied.',
      );
    }

    sharedDatabase = createProgressPalDatabase(migrationContext);

    return sharedDatabase;
  }

  if (
    migrationContext !== undefined &&
    !migrationContextsAreEquivalent(
      sharedDatabase.migrationContext,
      migrationContext,
    )
  ) {
    throw new Error(
      'The supplied ProgressPal database migration context conflicts with the context already bound to the shared database.',
    );
  }

  return sharedDatabase;
}

export function closeSharedDatabase() {
  if (sharedDatabase !== null) {
    sharedDatabase.close();
    sharedDatabase = null;
  }
}

export async function deleteDatabaseByName(databaseName: string) {
  if (sharedDatabase?.name === databaseName) {
    closeSharedDatabase();
  }

  await Dexie.delete(databaseName);
}

export async function deleteSharedDatabase() {
  await deleteDatabaseByName(progressPalDatabaseName);
}

export function isIndexedDbAvailable() {
  return typeof indexedDB !== 'undefined';
}
