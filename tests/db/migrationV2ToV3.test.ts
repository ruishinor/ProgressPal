import { describe, expect, it } from 'vitest';

import {
  MigrationAbortedError,
  migrateV2ToV3,
  type LegacyV2Snapshot,
} from '@/lib/db/migrationV2ToV3';

import { defaultTestMigrationContext } from './testDatabase';

/**
 * Epic C / C6 — RED-first evidence for the pure v2 → v3 mapping module.
 * Every abort here must happen before any write decision is made; the
 * caller (Dexie upgrade or backup conversion) is responsible for actually
 * leaving v2 intact, but this module must never partially decide.
 */

const timestamp = '2026-06-01T08:00:00.000Z';

function emptySnapshot(
  overrides: Partial<LegacyV2Snapshot> = {},
): LegacyV2Snapshot {
  return {
    appMeta: null,
    hasOtherRows: false,
    courseUnits: [],
    courseItems: [],
    contentAssets: [],
    contentSlices: [],
    mediaProgressEvents: [],
    resumePoints: [],
    progressEntries: [],
    studySessions: [],
    xpTransactions: [],
    ...overrides,
  };
}

function legacyAppMeta(overrides: Partial<LegacyV2Snapshot['appMeta']> = {}) {
  return {
    id: 'app-meta',
    createdAt: timestamp,
    updatedAt: timestamp,
    appVersion: '1.3.0',
    schemaVersion: 2,
    seedVersion: 0,
    ...overrides,
  };
}

const unit1 = {
  id: 'week-0',
  createdAt: timestamp,
  updatedAt: timestamp,
  courseId: 'cs50x-2026',
  title: 'Week 0',
  order: 0,
  type: 'week' as const,
  sourceYear: 2026,
  required: true,
};

const item1 = {
  id: 'week-0-lecture',
  createdAt: timestamp,
  updatedAt: timestamp,
  unitId: 'week-0',
  type: 'lecture' as const,
  title: 'Lecture',
  required: true,
  estimatedMinutes: 120,
  order: 0,
};

const asset1 = {
  id: 'week-0-lecture-asset',
  createdAt: timestamp,
  updatedAt: timestamp,
  itemId: 'week-0-lecture',
  assetType: 'video' as const,
  title: 'Lecture video',
  sourceLabel: 'Course video',
  estimatedMinutes: 120,
  durationSeconds: 7200,
  defaultSliceMinutes: 20 as const,
  order: 0,
  required: true,
};

describe('migrateV2ToV3', () => {
  it('skips a never-initialized database (no app_meta, no other rows)', () => {
    const result = migrateV2ToV3(
      emptySnapshot(),
      defaultTestMigrationContext,
    );

    expect(result).toEqual({ skip: true });
  });

  it('aborts when rows exist without app_meta', () => {
    expect(() =>
      migrateV2ToV3(
        emptySnapshot({ hasOtherRows: true }),
        defaultTestMigrationContext,
      ),
    ).toThrow(MigrationAbortedError);
  });

  it('aborts on a course unit owned by an unauthorized catalogue', () => {
    const snapshot = emptySnapshot({
      appMeta: legacyAppMeta(),
      courseUnits: [{ ...unit1, courseId: 'unknown-catalogue' }],
    });

    expect(() =>
      migrateV2ToV3(snapshot, defaultTestMigrationContext),
    ).toThrow(/unauthorized catalogue/i);
  });

  it('aborts on a course item referencing an unattributable unit', () => {
    const snapshot = emptySnapshot({
      appMeta: legacyAppMeta(),
      courseUnits: [unit1],
      courseItems: [{ ...item1, unitId: 'missing-unit' }],
    });

    expect(() =>
      migrateV2ToV3(snapshot, defaultTestMigrationContext),
    ).toThrow(/unattributable unit/i);
  });

  it('aborts on a content asset referencing an unattributable item', () => {
    const snapshot = emptySnapshot({
      appMeta: legacyAppMeta(),
      courseUnits: [unit1],
      courseItems: [item1],
      contentAssets: [{ ...asset1, itemId: 'missing-item' }],
    });

    expect(() =>
      migrateV2ToV3(snapshot, defaultTestMigrationContext),
    ).toThrow(/unattributable/i);
  });

  it('aborts on a content slice whose asset belongs to a different item', () => {
    const otherItem = { ...item1, id: 'week-0-shorts' };
    const snapshot = emptySnapshot({
      appMeta: legacyAppMeta(),
      courseUnits: [unit1],
      courseItems: [item1, otherItem],
      contentAssets: [asset1],
      contentSlices: [
        {
          id: 'slice-1',
          createdAt: timestamp,
          updatedAt: timestamp,
          assetId: asset1.id,
          itemId: otherItem.id,
          order: 0,
          label: 'Part 1',
          startSecond: 0,
          endSecond: 600,
          plannedMinutes: 10,
          status: 'active' as const,
        },
      ],
    });

    expect(() =>
      migrateV2ToV3(snapshot, defaultTestMigrationContext),
    ).toThrow(/does not belong to its asset's item/i);
  });

  it('aborts on a progress entry referencing an unattributable item', () => {
    const snapshot = emptySnapshot({
      appMeta: legacyAppMeta(),
      courseUnits: [unit1],
      courseItems: [item1],
      progressEntries: [
        {
          id: 'progress-1',
          createdAt: timestamp,
          updatedAt: timestamp,
          itemId: 'missing-item',
          status: 'started' as const,
          confidence: 1,
        },
      ],
    });

    expect(() =>
      migrateV2ToV3(snapshot, defaultTestMigrationContext),
    ).toThrow(/unattributable item/i);
  });

  it('aborts on a study session referencing an unattributable unit or item', () => {
    const snapshot = emptySnapshot({
      appMeta: legacyAppMeta(),
      courseUnits: [unit1],
      courseItems: [item1],
      studySessions: [
        {
          id: 'session-1',
          createdAt: timestamp,
          updatedAt: timestamp,
          unitId: 'missing-unit',
          itemId: item1.id,
          startedAt: timestamp,
          endedAt: timestamp,
          durationMinutes: 20,
          mode: 'watching' as const,
          blockers: [],
        },
      ],
    });

    expect(() =>
      migrateV2ToV3(snapshot, defaultTestMigrationContext),
    ).toThrow(/unattributable unit or item/i);
  });

  it('aborts on two XP transactions sharing a (sourceType, sourceId) key', () => {
    const duplicateXp = {
      id: 'xp-1',
      createdAt: timestamp,
      updatedAt: timestamp,
      sourceType: 'lecture_completed',
      sourceId: 'week-0-lecture-completed',
      xp: 40,
      reason: 'Completed lecture',
      awardedAt: timestamp,
    };
    const snapshot = emptySnapshot({
      appMeta: legacyAppMeta(),
      xpTransactions: [duplicateXp, { ...duplicateXp, id: 'xp-2' }],
    });

    expect(() =>
      migrateV2ToV3(snapshot, defaultTestMigrationContext),
    ).toThrow(/duplicate xp/i);
  });

  it('aborts when seedVersion is positive but no catalogue units exist', () => {
    const snapshot = emptySnapshot({
      appMeta: legacyAppMeta({ seedVersion: 5 }),
    });

    expect(() =>
      migrateV2ToV3(snapshot, defaultTestMigrationContext),
    ).toThrow(/seedVersion is positive/i);
  });

  it('succeeds with no version row when there are no units and seedVersion is 0', () => {
    const snapshot = emptySnapshot({ appMeta: legacyAppMeta() });
    const result = migrateV2ToV3(snapshot, defaultTestMigrationContext);

    expect(result).toMatchObject({ skip: false, catalogueVersions: [] });
    if (result.skip) throw new Error('unreachable');
    expect(result.appMeta.activeProgrammeId).toBe('cs50x');
    expect(result.programmeEnrolments).toEqual([
      { programmeId: 'cs50x', enrolledAt: timestamp },
    ]);
  });

  it('enrols using onboardingCompletedAt when present, else createdAt', () => {
    const onboarded = migrateV2ToV3(
      emptySnapshot({
        appMeta: legacyAppMeta({ onboardingCompletedAt: '2026-06-05T00:00:00.000Z' }),
      }),
      defaultTestMigrationContext,
    );
    if (onboarded.skip) throw new Error('unreachable');
    expect(onboarded.programmeEnrolments[0]?.enrolledAt).toBe(
      '2026-06-05T00:00:00.000Z',
    );

    const notOnboarded = migrateV2ToV3(
      emptySnapshot({ appMeta: legacyAppMeta() }),
      defaultTestMigrationContext,
    );
    if (notOnboarded.skip) throw new Error('unreachable');
    expect(notOnboarded.programmeEnrolments[0]?.enrolledAt).toBe(timestamp);
  });

  it('migrates a materialized catalogue into a catalogue_versions row, writing no XP or unlocks', () => {
    const snapshot = emptySnapshot({
      appMeta: legacyAppMeta({ seedVersion: 20260617 }),
      courseUnits: [unit1],
      courseItems: [item1],
    });
    const result = migrateV2ToV3(snapshot, defaultTestMigrationContext);

    if (result.skip) throw new Error('unreachable');
    expect(result.catalogueVersions).toEqual([
      {
        courseId: 'cs50x-2026',
        programmeId: 'cs50x',
        dataVersion: 20260617,
        syncedAt: timestamp,
      },
    ]);
    expect(result.appMeta).toEqual({
      id: 'app-meta',
      createdAt: timestamp,
      updatedAt: timestamp,
      appVersion: '1.3.0',
      schemaVersion: 3,
      activeProgrammeId: 'cs50x',
    });
  });
});
