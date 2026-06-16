import { z } from 'zod';

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
} from '@/lib/domain';
import { formatZodIssues, getDuplicateValues } from '@/lib/validation';

/**
 * Stable identifier embedded in every ProgressPal backup file. Import refuses
 * any file that does not declare this exact format string.
 */
export const backupFormatIdentifier = 'progresspal-backup';

/**
 * Backup envelope format version. This is independent from the Dexie schema
 * version: it tracks the shape of the wrapper, not the stored rows.
 */
export const currentBackupFormatVersion = 1;

/**
 * Hard upper bound for an importable backup. Used as a `File.size` guard in the
 * UI and as a defense-in-depth text-length guard inside {@link parseBackupFile}.
 */
export const maxBackupBytes = 25 * 1024 * 1024;
export const maxBackupTextLength = maxBackupBytes;

const isoDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const backupTimestampSchema = z.string().regex(isoDateTimePattern, {
  message: 'Expected an ISO 8601 datetime string.',
});

/**
 * Strict shape of the restorable data payload. Mirrors `DatabaseSnapshot` so a
 * snapshot is directly assignable here. `appMeta` / `learnerProfile` may be
 * null; post-restore re-initialization re-bootstraps default singletons.
 */
export const BackupDataSchema = z
  .object({
    appMeta: AppMetaSchema.nullable(),
    learnerProfile: LearnerProfileSchema.nullable(),
    courseUnits: z.array(CourseUnitSchema),
    courseItems: z.array(CourseItemSchema),
    progressEntries: z.array(ProgressEntrySchema),
    contentAssets: z.array(ContentAssetSchema),
    contentSlices: z.array(ContentSliceSchema),
    mediaProgressEvents: z.array(MediaProgressEventSchema),
    resumePoints: z.array(ResumePointSchema),
    studySessions: z.array(StudySessionSchema),
    xpTransactions: z.array(XpTransactionSchema),
    achievementDefinitions: z.array(AchievementDefinitionSchema),
    achievementUnlocks: z.array(AchievementUnlockSchema),
    backups: z.array(BackupRecordSchema),
  })
  .strict();

export const BackupEnvelopeSchema = z
  .object({
    format: z.literal(backupFormatIdentifier),
    formatVersion: z.literal(currentBackupFormatVersion),
    appVersion: z.string().trim().min(1).max(80),
    schemaVersion: z.number().int().positive(),
    exportedAt: backupTimestampSchema,
    data: BackupDataSchema,
  })
  .strict();

export type BackupData = z.infer<typeof BackupDataSchema>;
export type BackupEnvelope = z.infer<typeof BackupEnvelopeSchema>;

/** Stores that carry a unique `id`; checked for in-file duplicate IDs. */
const idBearingStoreKeys = [
  'courseUnits',
  'courseItems',
  'progressEntries',
  'contentAssets',
  'contentSlices',
  'mediaProgressEvents',
  'resumePoints',
  'studySessions',
  'xpTransactions',
  'achievementDefinitions',
  'achievementUnlocks',
  'backups',
] as const satisfies ReadonlyArray<keyof BackupData>;

export type BackupCountKey = (typeof idBearingStoreKeys)[number];

export type BackupSummary = {
  format: string;
  formatVersion: number;
  appVersion: string;
  schemaVersion: number;
  exportedAt: string;
  hasProfile: boolean;
  profileName: string | null;
  counts: Record<BackupCountKey, number>;
};

export type BuildBackupEnvelopeMeta = {
  appVersion: string;
  schemaVersion: number;
  exportedAt: string;
};

export type ParseBackupOptions = {
  expectedSchemaVersion: number;
  maxTextLength?: number;
};

/**
 * Thrown for every rejected backup. `message` is safe to show to the learner;
 * `issues` carries optional schema detail for diagnostics.
 */
export class BackupValidationError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = 'BackupValidationError';
    this.issues = issues;
  }
}

/**
 * Wrap a database snapshot in a versioned backup envelope. Pure: the supplied
 * data is preserved exactly so an export → import round trip is faithful.
 */
export function buildBackupEnvelope(
  data: BackupData,
  meta: BuildBackupEnvelopeMeta,
): BackupEnvelope {
  return {
    format: backupFormatIdentifier,
    formatVersion: currentBackupFormatVersion,
    appVersion: meta.appVersion,
    schemaVersion: meta.schemaVersion,
    exportedAt: meta.exportedAt,
    data,
  };
}

function assertNoDuplicateIds(data: BackupData) {
  for (const key of idBearingStoreKeys) {
    const rows = data[key];
    const duplicates = getDuplicateValues(rows.map((row) => row.id));

    if (duplicates.length > 0) {
      throw new BackupValidationError(
        `This backup contains duplicate ${key} IDs and cannot be imported.`,
        duplicates,
      );
    }
  }
}

/**
 * Parse and fully validate raw backup file text. Throws
 * {@link BackupValidationError} with a learner-facing message for malformed
 * JSON, oversized input, wrong format/format version, mismatched data version,
 * unknown fields, malformed rows, or in-file duplicate IDs. Never mutates and
 * never executes file content.
 */
export function parseBackupFile(
  text: string,
  options: ParseBackupOptions,
): BackupEnvelope {
  const maxLength = options.maxTextLength ?? maxBackupTextLength;

  if (text.length > maxLength) {
    throw new BackupValidationError('This backup file is too large to import.');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupValidationError(
      'This file is not valid JSON, so it cannot be imported as a backup.',
    );
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new BackupValidationError('This file is not a ProgressPal backup.');
  }

  const candidate = parsed as Record<string, unknown>;

  if (candidate.format !== backupFormatIdentifier) {
    throw new BackupValidationError('This file is not a ProgressPal backup.');
  }

  if (candidate.formatVersion !== currentBackupFormatVersion) {
    throw new BackupValidationError(
      `This backup uses an unsupported format version. Expected format version ${currentBackupFormatVersion}.`,
    );
  }

  if (candidate.schemaVersion !== options.expectedSchemaVersion) {
    throw new BackupValidationError(
      `This backup was created with a different data version. Expected data version ${options.expectedSchemaVersion}.`,
    );
  }

  const result = BackupEnvelopeSchema.safeParse(candidate);

  if (!result.success) {
    throw new BackupValidationError(
      'This backup file is malformed and cannot be imported.',
      formatZodIssues(result.error),
    );
  }

  assertNoDuplicateIds(result.data.data);

  return result.data;
}

/** Build a human-readable preview of an already-validated backup envelope. */
export function summarizeBackup(envelope: BackupEnvelope): BackupSummary {
  const { data } = envelope;

  return {
    format: envelope.format,
    formatVersion: envelope.formatVersion,
    appVersion: envelope.appVersion,
    schemaVersion: envelope.schemaVersion,
    exportedAt: envelope.exportedAt,
    hasProfile: data.learnerProfile !== null,
    profileName: data.learnerProfile?.displayName ?? null,
    counts: {
      courseUnits: data.courseUnits.length,
      courseItems: data.courseItems.length,
      progressEntries: data.progressEntries.length,
      contentAssets: data.contentAssets.length,
      contentSlices: data.contentSlices.length,
      mediaProgressEvents: data.mediaProgressEvents.length,
      resumePoints: data.resumePoints.length,
      studySessions: data.studySessions.length,
      xpTransactions: data.xpTransactions.length,
      achievementDefinitions: data.achievementDefinitions.length,
      achievementUnlocks: data.achievementUnlocks.length,
      backups: data.backups.length,
    },
  };
}

/** Device-local default backup file name, e.g. `progresspal-backup-2026-06-16.json`. */
export function backupFileName(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `progresspal-backup-${year}-${month}-${day}.json`;
}
