import Dexie, { type Table, type Transaction } from 'dexie';

import type {
  AchievementDefinition,
  AchievementUnlock,
  AppMeta,
  BackupRecord,
  ContentAsset,
  ContentSlice,
  CourseItem,
  CourseUnit,
  LearnerProfile,
  MediaProgressEvent,
  ProgressEntry,
  ResumePoint,
  StudySession,
  XpTransaction,
} from '@/lib/domain';

import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  progressPalDatabaseName,
} from './constants';

/**
 * Neutral catalogue-authorization context for the v2 → v3 migration and
 * catalogue sync (Epic C / C6, binding control 2). Supplied by the app
 * composition root and bound to one `ProgressPalDatabase` instance at
 * construction; it never lives in a separate module-global and is never
 * threaded through the repository API. `src/lib` never imports
 * `@/programmes`: composition passes this as plain data.
 */
export type DatabaseMigrationContext = {
  readonly programmeId: string;
  readonly authorizedCatalogues: ReadonlyArray<{
    readonly courseId: string;
    readonly programmeId: string;
  }>;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertValidMigrationContext(
  context: DatabaseMigrationContext,
): void {
  if (!isNonEmptyString(context?.programmeId)) {
    throw new Error(
      'Database migration context requires a non-empty programmeId.',
    );
  }

  if (
    !Array.isArray(context.authorizedCatalogues) ||
    context.authorizedCatalogues.length === 0
  ) {
    throw new Error(
      'Database migration context requires at least one authorized catalogue.',
    );
  }

  for (const catalogue of context.authorizedCatalogues) {
    if (
      !isNonEmptyString(catalogue?.courseId) ||
      !isNonEmptyString(catalogue?.programmeId)
    ) {
      throw new Error(
        'Database migration context authorized catalogues require a non-empty courseId and programmeId.',
      );
    }
  }
}

function migrationContextsAreEquivalent(
  a: DatabaseMigrationContext,
  b: DatabaseMigrationContext,
): boolean {
  return (
    a.programmeId === b.programmeId &&
    a.authorizedCatalogues.length === b.authorizedCatalogues.length &&
    a.authorizedCatalogues.every((entry, index) => {
      const other = b.authorizedCatalogues[index];

      return (
        other !== undefined &&
        entry.courseId === other.courseId &&
        entry.programmeId === other.programmeId
      );
    })
  );
}

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
export function getSharedDatabase(
  migrationContext?: DatabaseMigrationContext,
) {
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
