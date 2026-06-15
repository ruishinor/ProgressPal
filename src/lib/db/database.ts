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

  constructor(databaseName = progressPalDatabaseName) {
    super(databaseName);

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

export function createProgressPalDatabase(databaseName?: string) {
  return new ProgressPalDatabase(databaseName);
}

export function getSharedDatabase() {
  if (sharedDatabase === null) {
    sharedDatabase = createProgressPalDatabase();
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
