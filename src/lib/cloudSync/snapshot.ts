import { z } from 'zod';

import {
  assertBackupDataInvariants,
  BackupDataSchema,
  type BackupData,
} from '@/lib/backup';
import { maxSyncPayloadBytes, SyncFailure } from '@/lib/cloud';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  materializeSyncCatalogue,
} from '@/lib/db';
import { singletonIds, type DatabaseMigrationContext } from '@/lib/db';
import { hasCompletedOnboarding } from '@/lib/profile';
import { sha256Hex } from '@/lib/validation';

const wireData = BackupDataSchema.omit({
  achievementDefinitions: true,
  appMeta: true,
  backups: true,
  catalogueVersions: true,
  contentAssets: true,
  contentSlices: true,
  courseItems: true,
  courseUnits: true,
  learnerProfile: true,
}).extend({
  appMeta: BackupDataSchema.shape.appMeta.unwrap().pick({
    activeProgrammeId: true,
    onboardingCompletedAt: true,
  }),
  learnerProfile: BackupDataSchema.shape.learnerProfile.unwrap(),
});

const wireSnapshot = z.strictObject({
  version: z.literal(1),
  schema: z.literal(currentDatabaseSchemaVersion),
  data: wireData,
});
type WireData = z.infer<typeof wireData>;

export type SyncCatalogue = {
  seeds: Parameters<typeof materializeSyncCatalogue>[0];
  context: DatabaseMigrationContext;
};

function project(snapshot: BackupData): WireData {
  const {
    achievementDefinitions,
    appMeta,
    backups,
    catalogueVersions,
    contentAssets,
    contentSlices,
    courseItems,
    courseUnits,
    learnerProfile,
    ...learnerData
  } = snapshot;
  // These stores are bundled definitions, derived geometry or local audit data.
  void [
    achievementDefinitions,
    backups,
    catalogueVersions,
    contentAssets,
    contentSlices,
    courseItems,
    courseUnits,
  ];
  if (appMeta === null || learnerProfile === null)
    throw new SyncFailure('incompatible');
  return {
    ...learnerData,
    appMeta: {
      activeProgrammeId: appMeta.activeProgrammeId,
      onboardingCompletedAt: appMeta.onboardingCompletedAt,
    },
    learnerProfile,
  };
}

function canonicalJson(value: unknown) {
  return JSON.stringify(value, (_, item: unknown) =>
    item !== null && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) =>
            a < b ? -1 : Number(a !== b),
          ),
        )
      : item,
  );
}

function wireText(data: WireData) {
  // Every top-level collection is a set of rows. Nested arrays retain their
  // domain order (such as attempts used to justify a checkpoint).
  const sorted = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      Array.isArray(value)
        ? value
            .map((row) => ({ row, key: canonicalJson(row) }))
            .sort((a, b) => (a.key < b.key ? -1 : Number(a.key !== b.key)))
            .map(({ row }) => row)
        : value,
    ]),
  );
  return canonicalJson({
    version: 1,
    schema: currentDatabaseSchemaVersion,
    data: sorted,
  });
}

export function snapshotText(snapshot: BackupData) {
  return wireText(project(snapshot));
}

export function hasAccountLearning(
  snapshot: BackupData,
  defaultProgrammeId: string,
) {
  const { appMeta, learnerProfile, programmeEnrolments, ...rows } =
    project(snapshot);
  return (
    hasCompletedOnboarding(snapshot.appMeta, learnerProfile) ||
    appMeta.activeProgrammeId !== defaultProgrammeId ||
    programmeEnrolments.some(
      ({ programmeId }) => programmeId !== defaultProgrammeId,
    ) ||
    Object.values(rows).some((table) => table.length > 0) ||
    snapshot.contentSlices.some(({ status }) => status === 'skipped')
  );
}

function reconstruct(data: WireData, catalogue: SyncCatalogue): BackupData {
  const timestamp = data.learnerProfile.createdAt;
  const snapshot: BackupData = {
    ...data,
    ...materializeSyncCatalogue(
      catalogue.seeds,
      data.mediaProgressEvents,
      timestamp,
    ),
    appMeta: {
      ...data.appMeta,
      id: singletonIds.appMeta,
      appVersion: currentApplicationVersion,
      schemaVersion: currentDatabaseSchemaVersion,
      createdAt: timestamp,
      updatedAt: data.appMeta.onboardingCompletedAt ?? timestamp,
    },
    achievementDefinitions: [],
    backups: [],
  };
  try {
    assertBackupDataInvariants(snapshot, {
      expectedSchemaVersion: currentDatabaseSchemaVersion,
      migrationContext: catalogue.context,
    });
    return snapshot;
  } catch {
    throw new SyncFailure('incompatible');
  }
}

export async function decodeSyncSnapshot(
  text: string,
  expectedHash: string,
  catalogue: SyncCatalogue,
) {
  if (new TextEncoder().encode(text).length > maxSyncPayloadBytes)
    throw new SyncFailure('too-large');
  if ((await sha256Hex(text)) !== expectedHash)
    throw new SyncFailure('incompatible');
  let candidate: unknown;
  try {
    candidate = JSON.parse(text);
  } catch {
    throw new SyncFailure('incompatible');
  }
  const decoded = wireSnapshot.safeParse(candidate);
  if (!decoded.success || wireText(decoded.data.data) !== text)
    throw new SyncFailure('incompatible');
  return reconstruct(decoded.data.data, catalogue);
}

export function checkSyncUpload(
  snapshot: BackupData,
  text: string,
  catalogue: SyncCatalogue,
) {
  if (new TextEncoder().encode(text).length > maxSyncPayloadBytes)
    throw new SyncFailure('too-large');
  const data = wireData.safeParse(project(snapshot));
  if (!data.success) throw new SyncFailure('incompatible');
  const rebuilt = reconstruct(data.data, catalogue);
  const assets = new Map(
    rebuilt.contentAssets.map((asset) => [asset.id, asset]),
  );
  const slices = new Map(
    rebuilt.contentSlices.map((slice) => [slice.id, slice]),
  );
  const watched = new Set(
    snapshot.mediaProgressEvents.map(({ assetId }) => assetId),
  );
  // Existing media history may still use an older slice plan. Fail closed
  // rather than reinterpret that history against a different bundled plan.
  if (
    snapshot.contentAssets.some(
      (asset) =>
        watched.has(asset.id) &&
        (assets.get(asset.id)?.durationSeconds !== asset.durationSeconds ||
          assets.get(asset.id)?.defaultSliceMinutes !==
            asset.defaultSliceMinutes),
    ) ||
    snapshot.contentSlices.some(
      (slice) =>
        slice.status === 'skipped' ||
        (watched.has(slice.assetId) &&
          (slices.get(slice.id)?.startSecond !== slice.startSecond ||
            slices.get(slice.id)?.endSecond !== slice.endSecond ||
            slices.get(slice.id)?.status !== slice.status)),
    )
  )
    throw new SyncFailure('incompatible');
}
