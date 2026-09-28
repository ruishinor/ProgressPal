import { z } from 'zod';

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
} from '@/lib/domain';
import { singletonIds } from '@/lib/db/constants';
import type { DatabaseMigrationContext } from '@/lib/db/database';
import {
  legacyAppMetaV2Schema,
  migrateV2ToV3,
  type LegacyV2Snapshot,
} from '@/lib/db/migrationV2ToV3';
import { formatZodIssues, getDuplicateValues } from '@/lib/validation';
import { getXpAwardSourceKey } from '@/lib/xp/engine';

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
 * UI and as a defense-in-depth UTF-8 byte guard inside {@link parseBackupFile}.
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
    catalogueVersions: z.array(CatalogueVersionSchema),
    programmeEnrolments: z.array(ProgrammeEnrolmentSchema),
  })
  .strict();

/**
 * Schema-2 shape of the restorable data payload (Epic C / C6). Used only to
 * validate a legacy backup's structure before {@link migrateV2ToV3} converts
 * it; every other consumer sees only the current {@link BackupDataSchema}.
 */
const legacyBackupDataV2Schema = z
  .object({
    appMeta: legacyAppMetaV2Schema.nullable(),
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

type LegacyBackupDataV2 = z.infer<typeof legacyBackupDataV2Schema>;

/**
 * Forward-converts a validated schema-2 backup payload to the current
 * schema-3 shape (Epic C / C6 §6), sharing the same pure mapping module and
 * binding control 1 (full relational validation) as the Dexie upgrade.
 * Learner-global stores pass through unchanged.
 */
function convertLegacyBackupDataV2ToV3(
  legacy: LegacyBackupDataV2,
  context: DatabaseMigrationContext,
): BackupData {
  const snapshot: LegacyV2Snapshot = {
    appMeta: legacy.appMeta,
    hasOtherRows:
      legacy.learnerProfile !== null ||
      legacy.courseUnits.length > 0 ||
      legacy.courseItems.length > 0 ||
      legacy.progressEntries.length > 0 ||
      legacy.contentAssets.length > 0 ||
      legacy.contentSlices.length > 0 ||
      legacy.mediaProgressEvents.length > 0 ||
      legacy.resumePoints.length > 0 ||
      legacy.studySessions.length > 0 ||
      legacy.xpTransactions.length > 0 ||
      legacy.achievementDefinitions.length > 0 ||
      legacy.achievementUnlocks.length > 0 ||
      legacy.backups.length > 0,
    courseUnits: legacy.courseUnits,
    courseItems: legacy.courseItems,
    contentAssets: legacy.contentAssets,
    contentSlices: legacy.contentSlices,
    mediaProgressEvents: legacy.mediaProgressEvents,
    resumePoints: legacy.resumePoints,
    progressEntries: legacy.progressEntries,
    studySessions: legacy.studySessions,
    xpTransactions: legacy.xpTransactions,
  };

  const result = migrateV2ToV3(snapshot, context);

  if (result.skip) {
    throw new BackupValidationError(
      'This backup contains no data to restore and cannot be imported.',
    );
  }

  return {
    appMeta: result.appMeta,
    learnerProfile: legacy.learnerProfile,
    courseUnits: legacy.courseUnits,
    courseItems: legacy.courseItems,
    progressEntries: legacy.progressEntries,
    contentAssets: legacy.contentAssets,
    contentSlices: legacy.contentSlices,
    mediaProgressEvents: legacy.mediaProgressEvents,
    resumePoints: legacy.resumePoints,
    studySessions: legacy.studySessions,
    xpTransactions: legacy.xpTransactions,
    achievementDefinitions: legacy.achievementDefinitions,
    achievementUnlocks: legacy.achievementUnlocks,
    backups: legacy.backups,
    catalogueVersions: [...result.catalogueVersions],
    programmeEnrolments: [...result.programmeEnrolments],
  };
}

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

/** Envelope wrapper for a schema-2 payload, used only during conversion. */
const legacyBackupEnvelopeV2Schema = z
  .object({
    format: z.literal(backupFormatIdentifier),
    formatVersion: z.literal(currentBackupFormatVersion),
    appVersion: z.string().trim().min(1).max(80),
    schemaVersion: z.literal(2),
    exportedAt: backupTimestampSchema,
    data: legacyBackupDataV2Schema,
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
  maxBytes?: number;
  /** @deprecated Use `maxBytes`; retained for internal caller compatibility. */
  maxTextLength?: number;
  /**
   * Required to forward-convert a schema-2 backup (Epic C / C6 §6) and to
   * check the new catalogue/enrolment invariants on a schema-3 backup. A
   * schema-2 backup without a supplied context is rejected; a schema-3
   * backup without one skips only those two invariants (the destructive
   * restore path always supplies one from the live database instance).
   */
  migrationContext?: DatabaseMigrationContext;
};

export type SerializeBackupOptions = {
  indentation?: number;
  maxBytes?: number;
};

export type ValidateBackupDataOptions = {
  expectedSchemaVersion: number;
  migrationContext?: DatabaseMigrationContext;
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

function utf8ByteLength(text: string) {
  return new TextEncoder().encode(text).byteLength;
}

/** Serialize an export and enforce the same UTF-8 byte limit as import. */
export function serializeBackupEnvelope(
  envelope: BackupEnvelope,
  options: SerializeBackupOptions = {},
) {
  const contents = JSON.stringify(envelope, null, options.indentation ?? 2);
  const byteLength = utf8ByteLength(contents);

  if (byteLength > (options.maxBytes ?? maxBackupBytes)) {
    throw new BackupValidationError(
      'This backup is too large to export. Remove some local history and try again.',
    );
  }

  return { byteLength, contents };
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

function assertNoDuplicateUniqueValues(
  values: readonly string[],
  label: string,
) {
  const duplicates = getDuplicateValues(values);

  if (duplicates.length > 0) {
    throw new BackupValidationError(
      `This backup contains duplicate ${label} values and cannot be imported.`,
      duplicates,
    );
  }
}

function assertRelationship(
  condition: boolean,
  issue: string,
): asserts condition {
  if (!condition) {
    throw new BackupValidationError(
      'This backup contains inconsistent related records and cannot be imported.',
      [issue],
    );
  }
}

/**
 * Validate invariants enforced by singleton lookups, explicit unique indexes,
 * and repository read models. Pure and shared by file preview and direct
 * restore callers so every rejection happens before destructive writes.
 */
export function assertBackupDataInvariants(
  data: BackupData,
  options: ValidateBackupDataOptions,
) {
  assertNoDuplicateIds(data);

  if (data.appMeta !== null) {
    if (data.appMeta.id !== singletonIds.appMeta) {
      throw new BackupValidationError(
        'This backup contains invalid app metadata and cannot be imported.',
        [`Expected app metadata id "${singletonIds.appMeta}".`],
      );
    }

    if (data.appMeta.schemaVersion !== options.expectedSchemaVersion) {
      throw new BackupValidationError(
        'This backup contains app metadata for a different data version.',
        [
          `Expected app metadata schema version ${options.expectedSchemaVersion}.`,
        ],
      );
    }
  }

  if (
    data.learnerProfile !== null &&
    data.learnerProfile.id !== singletonIds.learnerProfile
  ) {
    throw new BackupValidationError(
      'This backup contains an invalid learner profile and cannot be imported.',
      [`Expected learner profile id "${singletonIds.learnerProfile}".`],
    );
  }

  assertNoDuplicateUniqueValues(
    data.progressEntries.map((entry) => entry.itemId),
    'progress entry item IDs',
  );
  assertNoDuplicateUniqueValues(
    data.achievementUnlocks.map((unlock) => unlock.achievementId),
    'achievement unlock achievement IDs',
  );
  assertNoDuplicateUniqueValues(
    data.resumePoints.map((resumePoint) => resumePoint.assetId),
    'resume point asset IDs',
  );

  const unitsById = new Map(data.courseUnits.map((unit) => [unit.id, unit]));
  const itemsById = new Map(data.courseItems.map((item) => [item.id, item]));
  const assetsById = new Map(
    data.contentAssets.map((asset) => [asset.id, asset]),
  );
  const slicesById = new Map(
    data.contentSlices.map((slice) => [slice.id, slice]),
  );
  const eventsById = new Map(
    data.mediaProgressEvents.map((event) => [event.id, event]),
  );
  const sessionsById = new Map(
    data.studySessions.map((session) => [session.id, session]),
  );

  for (const item of data.courseItems) {
    assertRelationship(
      unitsById.has(item.unitId),
      `Course item "${item.id}" references missing unit "${item.unitId}".`,
    );
  }

  for (const entry of data.progressEntries) {
    assertRelationship(
      itemsById.has(entry.itemId),
      `Progress entry "${entry.id}" references missing item "${entry.itemId}".`,
    );
  }

  for (const asset of data.contentAssets) {
    assertRelationship(
      itemsById.has(asset.itemId),
      `Content asset "${asset.id}" references missing item "${asset.itemId}".`,
    );
  }

  for (const slice of data.contentSlices) {
    const asset = assetsById.get(slice.assetId);

    assertRelationship(
      asset !== undefined,
      `Content slice "${slice.id}" references missing asset "${slice.assetId}".`,
    );
    assertRelationship(
      itemsById.has(slice.itemId),
      `Content slice "${slice.id}" references missing item "${slice.itemId}".`,
    );
    assertRelationship(
      asset.itemId === slice.itemId,
      `Content slice "${slice.id}" does not belong to the asset's item.`,
    );
  }

  for (const session of data.studySessions) {
    const item = itemsById.get(session.itemId);

    assertRelationship(
      unitsById.has(session.unitId),
      `Study session "${session.id}" references missing unit "${session.unitId}".`,
    );
    assertRelationship(
      item !== undefined,
      `Study session "${session.id}" references missing item "${session.itemId}".`,
    );
    assertRelationship(
      item.unitId === session.unitId,
      `Study session "${session.id}" does not use the item's unit.`,
    );
  }

  for (const event of data.mediaProgressEvents) {
    const asset = assetsById.get(event.assetId);

    assertRelationship(
      itemsById.has(event.itemId),
      `Media progress event "${event.id}" references missing item "${event.itemId}".`,
    );
    assertRelationship(
      asset !== undefined,
      `Media progress event "${event.id}" references missing asset "${event.assetId}".`,
    );
    assertRelationship(
      asset.itemId === event.itemId,
      `Media progress event "${event.id}" does not belong to the asset's item.`,
    );

    if (event.sliceId !== undefined) {
      const slice = slicesById.get(event.sliceId);

      assertRelationship(
        slice !== undefined,
        `Media progress event "${event.id}" references missing slice "${event.sliceId}".`,
      );
      assertRelationship(
        slice.assetId === event.assetId && slice.itemId === event.itemId,
        `Media progress event "${event.id}" does not match its slice.`,
      );
    }

    if (event.sessionId !== undefined) {
      const session = sessionsById.get(event.sessionId);

      // Early schema-v2 writers accepted an optional session id without
      // enforcing that the session row still existed. Preserve those backups,
      // but reject contradictory records when the referenced row is present.
      if (session !== undefined) {
        assertRelationship(
          session.itemId === event.itemId,
          `Media progress event "${event.id}" does not match its session.`,
        );
      }
    }
  }

  for (const resumePoint of data.resumePoints) {
    const asset = assetsById.get(resumePoint.assetId);
    const event = eventsById.get(resumePoint.updatedFromEventId);

    assertRelationship(
      itemsById.has(resumePoint.itemId),
      `Resume point "${resumePoint.id}" references missing item "${resumePoint.itemId}".`,
    );
    assertRelationship(
      asset !== undefined,
      `Resume point "${resumePoint.id}" references missing asset "${resumePoint.assetId}".`,
    );
    assertRelationship(
      asset.itemId === resumePoint.itemId,
      `Resume point "${resumePoint.id}" does not belong to the asset's item.`,
    );
    assertRelationship(
      event !== undefined,
      `Resume point "${resumePoint.id}" references missing event "${resumePoint.updatedFromEventId}".`,
    );
    assertRelationship(
      event.assetId === resumePoint.assetId &&
        event.itemId === resumePoint.itemId,
      `Resume point "${resumePoint.id}" does not match its source event.`,
    );

    if (resumePoint.nextSliceId !== undefined) {
      const slice = slicesById.get(resumePoint.nextSliceId);

      assertRelationship(
        slice !== undefined,
        `Resume point "${resumePoint.id}" references missing slice "${resumePoint.nextSliceId}".`,
      );
      assertRelationship(
        slice.assetId === resumePoint.assetId &&
          slice.itemId === resumePoint.itemId,
        `Resume point "${resumePoint.id}" does not match its next slice.`,
      );
    }
  }

  const xpSourceKeys = new Set<string>();

  for (const transaction of data.xpTransactions) {
    const key = getXpAwardSourceKey(
      transaction.sourceType,
      transaction.sourceId,
    );

    if (xpSourceKeys.has(key)) {
      throw new BackupValidationError(
        'This backup contains duplicate XP transaction sources and cannot be imported.',
        [`Duplicate XP source (${transaction.sourceType}, ${transaction.sourceId}).`],
      );
    }
    xpSourceKeys.add(key);
  }

  const { migrationContext } = options;

  if (migrationContext === undefined) {
    return;
  }

  // Epic C / C6 §6: a backup's own programmeId claims are never trusted over
  // the composition-supplied authorization context.
  const authorizedProgrammeIds = new Set([
    migrationContext.programmeId,
    ...migrationContext.authorizedCatalogues.map(
      (catalogue) => catalogue.programmeId,
    ),
  ]);
  const authorizedCatalogueByCourseId = new Map(
    migrationContext.authorizedCatalogues.map((catalogue) => [
      catalogue.courseId,
      catalogue,
    ]),
  );

  if (
    data.appMeta !== null &&
    data.appMeta.activeProgrammeId !== migrationContext.programmeId
  ) {
    throw new BackupValidationError(
      'This backup contains an unregistered active programme and cannot be imported.',
      [`Unregistered active programme "${data.appMeta.activeProgrammeId}".`],
    );
  }

  for (const enrolment of data.programmeEnrolments) {
    if (!authorizedProgrammeIds.has(enrolment.programmeId)) {
      throw new BackupValidationError(
        'This backup contains an enrolment for an unregistered programme and cannot be imported.',
        [`Unregistered programme "${enrolment.programmeId}".`],
      );
    }
  }

  if (
    data.appMeta !== null &&
    !data.programmeEnrolments.some(
      (enrolment) => enrolment.programmeId === data.appMeta!.activeProgrammeId,
    )
  ) {
    throw new BackupValidationError(
      'This backup has no enrolment for its active programme and cannot be imported.',
      [`Missing enrolment for "${data.appMeta.activeProgrammeId}".`],
    );
  }

  const materializedCourseIds = new Set(
    data.courseUnits.map((unit) => unit.courseId),
  );

  for (const version of data.catalogueVersions) {
    const authorized = authorizedCatalogueByCourseId.get(version.courseId);

    if (authorized === undefined || authorized.programmeId !== version.programmeId) {
      throw new BackupValidationError(
        'This backup contains an unauthorized catalogue and cannot be imported.',
        [`Unauthorized catalogue "${version.courseId}".`],
      );
    }

    if (
      version.dataVersion > 0 &&
      !materializedCourseIds.has(version.courseId)
    ) {
      throw new BackupValidationError(
        'This backup contains a catalogue version for an unmaterialized catalogue and cannot be imported.',
        [`Unmaterialized catalogue "${version.courseId}".`],
      );
    }
  }

  for (const unit of data.courseUnits) {
    if (!authorizedCatalogueByCourseId.has(unit.courseId)) {
      throw new BackupValidationError(
        'This backup contains an unauthorized catalogue and cannot be imported.',
        [`Unauthorized catalogue "${unit.courseId}".`],
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
  const maxLength =
    options.maxBytes ?? options.maxTextLength ?? maxBackupTextLength;

  if (utf8ByteLength(text) > maxLength) {
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

  // Epic C / C6 §6: a schema-2 backup forward-converts through one pure
  // conversion, then the same full validation as a native schema-3 backup.
  // Any other mismatched data version is rejected with the existing message.
  const isLegacySchemaTwoImport =
    candidate.schemaVersion === 2 && options.expectedSchemaVersion === 3;

  if (
    candidate.schemaVersion !== options.expectedSchemaVersion &&
    !isLegacySchemaTwoImport
  ) {
    throw new BackupValidationError(
      `This backup was created with a different data version. Expected data version ${options.expectedSchemaVersion}.`,
    );
  }

  if (isLegacySchemaTwoImport) {
    if (options.migrationContext === undefined) {
      throw new BackupValidationError(
        'This backup was created with a different data version. Expected data version ' +
          `${options.expectedSchemaVersion}.`,
      );
    }

    const legacyResult = legacyBackupEnvelopeV2Schema.safeParse(candidate);

    if (!legacyResult.success) {
      throw new BackupValidationError(
        'This backup file is malformed and cannot be imported.',
        formatZodIssues(legacyResult.error),
      );
    }

    const convertedData = convertLegacyBackupDataV2ToV3(
      legacyResult.data.data,
      options.migrationContext,
    );
    const convertedEnvelope: BackupEnvelope = {
      ...legacyResult.data,
      schemaVersion: options.expectedSchemaVersion,
      data: convertedData,
    };

    assertBackupDataInvariants(convertedEnvelope.data, {
      expectedSchemaVersion: options.expectedSchemaVersion,
      migrationContext: options.migrationContext,
    });

    return convertedEnvelope;
  }

  const result = BackupEnvelopeSchema.safeParse(candidate);

  if (!result.success) {
    throw new BackupValidationError(
      'This backup file is malformed and cannot be imported.',
      formatZodIssues(result.error),
    );
  }

  assertBackupDataInvariants(result.data.data, {
    expectedSchemaVersion: options.expectedSchemaVersion,
    migrationContext: options.migrationContext,
  });

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
