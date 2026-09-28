import { z } from 'zod';

import {
  AppMetaSchema,
  type AppMeta,
  type CatalogueVersion,
  type ContentAsset,
  type ContentSlice,
  type CourseItem,
  type CourseUnit,
  type MediaProgressEvent,
  type ProgrammeEnrolment,
  type ProgressEntry,
  type ResumePoint,
  type StudySession,
  type XpTransaction,
} from '@/lib/domain';
import { parseWithSchema } from '@/lib/validation';
import { getXpAwardSourceKey } from '@/lib/xp/engine';

import type { DatabaseMigrationContext } from './migrationContext';

/**
 * The pure v2 → v3 mapping module (Epic C / C6, §4 of
 * `C6_SCHEMA_CHANGE_DECISION_RECORD.md`). Shared by the Dexie upgrade and the
 * schema-2 backup forward conversion; both callers load raw v2 rows into this
 * shape first. Never writes; every rule here only decides what a caller
 * should write.
 */

export const legacyAppMetaV2Schema = z
  .object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    appVersion: z.string(),
    onboardingCompletedAt: z.string().optional(),
    schemaVersion: z.number(),
    seedVersion: z.number(),
  })
  .strict();

export type LegacyAppMetaV2 = z.infer<typeof legacyAppMetaV2Schema>;

export function parseLegacyAppMetaV2(input: unknown, label: string) {
  return parseWithSchema(legacyAppMetaV2Schema, input, label);
}

export type LegacyV2Snapshot = {
  appMeta: LegacyAppMetaV2 | null;
  /**
   * True when any row exists in any store other than `app_meta`. Computed by
   * the caller (a cheap count across stores), not loaded here.
   */
  hasOtherRows: boolean;
  courseUnits: readonly CourseUnit[];
  courseItems: readonly CourseItem[];
  contentAssets: readonly ContentAsset[];
  contentSlices: readonly ContentSlice[];
  mediaProgressEvents: readonly MediaProgressEvent[];
  resumePoints: readonly ResumePoint[];
  progressEntries: readonly ProgressEntry[];
  studySessions: readonly StudySession[];
  xpTransactions: readonly XpTransaction[];
};

export type V2ToV3MigrationResult =
  | { skip: true }
  | {
      skip: false;
      appMeta: AppMeta;
      catalogueVersions: readonly CatalogueVersion[];
      programmeEnrolments: readonly ProgrammeEnrolment[];
    };

/** Thrown for every rejected v2 → v3 migration; the caller leaves v2 intact. */
export class MigrationAbortedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MigrationAbortedError';
  }
}

function abort(message: string): never {
  throw new MigrationAbortedError(message);
}

/**
 * Binding control 1: before anything is written, validate the complete
 * legacy catalogue-derived relational graph. Every relevant row must
 * deterministically resolve through its parent chain to an authorized
 * catalogue. An orphaned or otherwise unattributable row aborts the
 * migration before any write.
 */
function assertFullRelationalValidity(
  snapshot: LegacyV2Snapshot,
  authorizedCourseIds: ReadonlySet<string>,
) {
  for (const unit of snapshot.courseUnits) {
    if (!authorizedCourseIds.has(unit.courseId)) {
      abort(
        `Course unit "${unit.id}" belongs to an unauthorized catalogue "${unit.courseId}".`,
      );
    }
  }

  const unitById = new Map(snapshot.courseUnits.map((unit) => [unit.id, unit]));

  for (const item of snapshot.courseItems) {
    if (!unitById.has(item.unitId)) {
      abort(
        `Course item "${item.id}" references an unattributable unit "${item.unitId}".`,
      );
    }
  }

  const itemIds = new Set(snapshot.courseItems.map((item) => item.id));
  const itemById = new Map(snapshot.courseItems.map((item) => [item.id, item]));

  for (const asset of snapshot.contentAssets) {
    if (!itemIds.has(asset.itemId)) {
      abort(
        `Content asset "${asset.id}" references an unattributable item "${asset.itemId}".`,
      );
    }
  }

  const assetById = new Map(
    snapshot.contentAssets.map((asset) => [asset.id, asset]),
  );

  for (const slice of snapshot.contentSlices) {
    const asset = assetById.get(slice.assetId);

    if (asset === undefined || !itemIds.has(slice.itemId)) {
      abort(
        `Content slice "${slice.id}" references an unattributable asset or item.`,
      );
    }
    if (asset.itemId !== slice.itemId) {
      abort(`Content slice "${slice.id}" does not belong to its asset's item.`);
    }
  }

  for (const event of snapshot.mediaProgressEvents) {
    const asset = assetById.get(event.assetId);

    if (asset === undefined || !itemIds.has(event.itemId)) {
      abort(
        `Media progress event "${event.id}" references an unattributable asset or item.`,
      );
    }
    if (asset.itemId !== event.itemId) {
      abort(
        `Media progress event "${event.id}" does not belong to its asset's item.`,
      );
    }
  }

  for (const resumePoint of snapshot.resumePoints) {
    const asset = assetById.get(resumePoint.assetId);

    if (asset === undefined || !itemIds.has(resumePoint.itemId)) {
      abort(
        `Resume point "${resumePoint.id}" references an unattributable asset or item.`,
      );
    }
    if (asset.itemId !== resumePoint.itemId) {
      abort(
        `Resume point "${resumePoint.id}" does not belong to its asset's item.`,
      );
    }
  }

  for (const entry of snapshot.progressEntries) {
    if (!itemIds.has(entry.itemId)) {
      abort(
        `Progress entry "${entry.id}" references an unattributable item "${entry.itemId}".`,
      );
    }
  }

  for (const session of snapshot.studySessions) {
    const unit = unitById.get(session.unitId);
    const item = itemById.get(session.itemId);

    if (unit === undefined || item === undefined) {
      abort(
        `Study session "${session.id}" references an unattributable unit or item.`,
      );
    }

    // Epic C6-R, RD3: binding Control 1 requires deterministic parent-chain
    // attribution, so both rows existing independently is not enough - the
    // item's own unit must actually be the unit this session claims.
    if (item.unitId !== session.unitId) {
      abort(`Study session "${session.id}" does not use the item's unit.`);
    }
  }
}

function assertNoDuplicateXpSourceKeys(
  xpTransactions: readonly XpTransaction[],
) {
  const seen = new Set<string>();

  for (const transaction of xpTransactions) {
    const key = getXpAwardSourceKey(
      transaction.sourceType,
      transaction.sourceId,
    );

    if (seen.has(key)) {
      abort(
        `Duplicate XP transaction source (${transaction.sourceType}, ${transaction.sourceId}).`,
      );
    }
    seen.add(key);
  }
}

/**
 * Applies §4 of the schema-change decision record to one legacy v2 snapshot.
 * Validates first (control 1 and the duplicate-XP guard); only on success
 * does it decide what a caller should write. Never itself writes anything,
 * and never awards XP or achievement unlocks.
 */
export function migrateV2ToV3(
  snapshot: LegacyV2Snapshot,
  context: DatabaseMigrationContext,
): V2ToV3MigrationResult {
  if (snapshot.appMeta === null) {
    if (snapshot.hasOtherRows) {
      abort(
        'Rows exist without app metadata; the v2 database cannot be migrated.',
      );
    }

    return { skip: true };
  }

  const authorizedCatalogueByCourseId = new Map(
    context.authorizedCatalogues.map((catalogue) => [
      catalogue.courseId,
      catalogue,
    ]),
  );

  assertFullRelationalValidity(
    snapshot,
    new Set(authorizedCatalogueByCourseId.keys()),
  );
  assertNoDuplicateXpSourceKeys(snapshot.xpTransactions);

  const legacyAppMeta = snapshot.appMeta;
  const presentCourseIds = new Set(
    snapshot.courseUnits.map((unit) => unit.courseId),
  );
  const catalogueVersions: CatalogueVersion[] = [];

  if (presentCourseIds.size > 0) {
    for (const courseId of presentCourseIds) {
      const authorized = authorizedCatalogueByCourseId.get(courseId);

      if (authorized === undefined) {
        abort(`Course unit catalogue "${courseId}" is not authorized.`);
      }

      catalogueVersions.push({
        courseId,
        programmeId: authorized.programmeId,
        dataVersion: legacyAppMeta.seedVersion,
        syncedAt: legacyAppMeta.updatedAt,
      });
    }
  } else if (legacyAppMeta.seedVersion > 0) {
    abort(
      'seedVersion is positive but no catalogue units exist; the v2 database cannot be migrated.',
    );
  }

  const programmeEnrolments: ProgrammeEnrolment[] = [
    {
      programmeId: context.programmeId,
      enrolledAt:
        legacyAppMeta.onboardingCompletedAt ?? legacyAppMeta.createdAt,
    },
  ];

  const appMeta = parseWithSchema(
    AppMetaSchema,
    {
      id: legacyAppMeta.id,
      createdAt: legacyAppMeta.createdAt,
      updatedAt: legacyAppMeta.updatedAt,
      appVersion: legacyAppMeta.appVersion,
      onboardingCompletedAt: legacyAppMeta.onboardingCompletedAt,
      schemaVersion: 3,
      activeProgrammeId: context.programmeId,
    },
    'Migrated app metadata',
  );

  return { skip: false, appMeta, catalogueVersions, programmeEnrolments };
}
