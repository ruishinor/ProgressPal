import { describe, expect, it } from 'vitest';

import {
  BackupValidationError,
  backupFileName,
  buildBackupEnvelope,
  currentBackupFormatVersion,
  parseBackupFile,
  serializeBackupEnvelope,
  summarizeBackup,
  type BackupData,
  type BackupEnvelope,
} from '@/lib/backup';

const expectedSchemaVersion = 2;
const scriptNote = '<script>alert(1)</script>';

function makeValidData(): BackupData {
  return {
    appMeta: {
      id: 'app-meta',
      createdAt: '2026-06-16T10:00:00.000Z',
      updatedAt: '2026-06-16T10:00:00.000Z',
      appVersion: '0.1.0',
      schemaVersion: 2,
      activeProgrammeId: 'cs50x',
      onboardingCompletedAt: '2026-06-16T10:00:00.000Z',
    },
    learnerProfile: {
      id: 'learner-profile',
      createdAt: '2026-06-16T10:00:00.000Z',
      updatedAt: '2026-06-16T10:00:00.000Z',
      displayName: 'Ada',
      avatarConfig: { face: 'round', hair: 'short', topColor: 'forest' },
      targetStudyDays: ['monday', 'wednesday'],
      targetMinutesPerWeek: 300,
      preferredTheme: 'system',
      reducedMotion: false,
    },
    courseUnits: [
      {
        id: 'unit-1',
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
        courseId: 'course-1',
        title: 'Unit 1',
        order: 0,
        type: 'week',
        sourceYear: 2026,
        required: true,
      },
    ],
    courseItems: [
      {
        id: 'item-1',
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
        unitId: 'unit-1',
        type: 'lecture',
        title: 'Item 1',
        required: true,
        estimatedMinutes: 20,
        order: 0,
      },
    ],
    progressEntries: [
      {
        id: 'progress-1',
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
        itemId: 'item-1',
        status: 'started',
        startedAt: '2026-06-16T10:00:00.000Z',
        confidence: 3,
      },
    ],
    contentAssets: [
      {
        id: 'asset-1',
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
        itemId: 'item-1',
        assetType: 'video',
        title: 'Item 1 video',
        sourceLabel: 'Course video',
        estimatedMinutes: 20,
        durationSeconds: 1_200,
        defaultSliceMinutes: 20,
        order: 0,
        required: true,
      },
    ],
    contentSlices: [
      {
        id: 'slice-1',
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
        assetId: 'asset-1',
        itemId: 'item-1',
        order: 0,
        label: 'Part 1',
        startSecond: 0,
        endSecond: 600,
        plannedMinutes: 10,
        status: 'active',
      },
    ],
    mediaProgressEvents: [
      {
        id: 'event-1',
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
        itemId: 'item-1',
        assetId: 'asset-1',
        sliceId: 'slice-1',
        sessionId: 'study-session-1',
        startSecond: 0,
        endSecond: 300,
        watchedSeconds: 300,
        completedSlice: false,
        stoppedBecause: 'reached_limit',
        energyBefore: 3,
        energyAfter: 3,
      },
    ],
    resumePoints: [
      {
        id: 'resume-1',
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
        itemId: 'item-1',
        assetId: 'asset-1',
        lastSecond: 300,
        nextSliceId: 'slice-1',
        updatedFromEventId: 'event-1',
      },
    ],
    studySessions: [
      {
        id: 'study-session-1',
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
        unitId: 'unit-1',
        itemId: 'item-1',
        startedAt: '2026-06-16T10:00:00.000Z',
        endedAt: '2026-06-16T10:30:00.000Z',
        durationMinutes: 30,
        mode: 'coding',
        notes: scriptNote,
        blockers: [],
      },
    ],
    xpTransactions: [
      {
        id: 'xp-1',
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
        sourceType: 'study_session',
        sourceId: 'study-session-1',
        xp: 10,
        reason: 'Logged a study session',
        awardedAt: '2026-06-16T10:00:00.000Z',
      },
    ],
    achievementDefinitions: [],
    achievementUnlocks: [
      {
        id: 'unlock-first-session',
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
        achievementId: 'first-session',
        unlockedAt: '2026-06-16T10:00:00.000Z',
        triggerSourceId: 'study-session-1',
      },
    ],
    backups: [],
    catalogueVersions: [],
    programmeEnrolments: [],
  };
}

function makeEnvelope(data: BackupData = makeValidData()): BackupEnvelope {
  return buildBackupEnvelope(data, {
    appVersion: '0.1.0',
    schemaVersion: expectedSchemaVersion,
    exportedAt: '2026-06-16T11:00:00.000Z',
  });
}

function parse(envelope: unknown): BackupEnvelope {
  return parseBackupFile(JSON.stringify(envelope), { expectedSchemaVersion });
}

function addSecondItem(data: BackupData) {
  data.courseItems.push({
    ...data.courseItems[0]!,
    id: 'item-2',
    title: 'Item 2',
    order: 1,
  });
}

function addSecondAssetAndSlice(data: BackupData) {
  data.contentAssets.push({
    ...data.contentAssets[0]!,
    id: 'asset-2',
    title: 'Item 1 video 2',
    order: 1,
  });
  data.contentSlices.push({
    ...data.contentSlices[0]!,
    id: 'slice-2',
    assetId: 'asset-2',
  });
}

describe('backup envelope', () => {
  it('builds an envelope with the expected format metadata', () => {
    const envelope = makeEnvelope();

    expect(envelope.format).toBe('progresspal-backup');
    expect(envelope.formatVersion).toBe(currentBackupFormatVersion);
    expect(envelope.schemaVersion).toBe(expectedSchemaVersion);
    expect(envelope.exportedAt).toBe('2026-06-16T11:00:00.000Z');
    expect(envelope.appVersion).toBe('0.1.0');
  });

  it('round-trips build -> stringify -> parse without data loss', () => {
    const envelope = makeEnvelope();

    expect(parse(envelope)).toEqual(envelope);
  });

  it.each([
    ['ASCII', 'Ada Lovelace'],
    ['multibyte', 'Blåbær 🫐'],
  ])(
    'enforces below, exact, and one-byte-over UTF-8 limits for %s data',
    (_label, displayName) => {
      const data = makeValidData();
      data.learnerProfile = { ...data.learnerProfile!, displayName };
      const envelope = makeEnvelope(data);
      const serialized = serializeBackupEnvelope(envelope);

      for (const maxBytes of [
        serialized.byteLength + 1,
        serialized.byteLength,
      ]) {
        expect(serializeBackupEnvelope(envelope, { maxBytes })).toEqual(
          serialized,
        );
        expect(
          parseBackupFile(serialized.contents, {
            expectedSchemaVersion,
            maxBytes,
          }),
        ).toEqual(envelope);
      }

      expect(() =>
        serializeBackupEnvelope(envelope, {
          maxBytes: serialized.byteLength - 1,
        }),
      ).toThrow(/too large to export/i);
      expect(() =>
        parseBackupFile(serialized.contents, {
          expectedSchemaVersion,
          maxBytes: serialized.byteLength - 1,
        }),
      ).toThrow(/too large to import/i);
    },
  );

  it('tolerates a null appMeta and null learnerProfile', () => {
    const data = makeValidData();
    data.appMeta = null;
    data.learnerProfile = null;

    const result = parse(makeEnvelope(data));

    expect(result.data.appMeta).toBeNull();
    expect(result.data.learnerProfile).toBeNull();
  });

  it('accepts unlocks whose definitions are supplied by application code', () => {
    const result = parse(makeEnvelope());

    expect(result.data.achievementDefinitions).toEqual([]);
    expect(result.data.achievementUnlocks).toHaveLength(1);
  });

  it('accepts a historical optional media session id whose row is absent', () => {
    const data = makeValidData();
    data.mediaProgressEvents[0] = {
      ...data.mediaProgressEvents[0]!,
      sessionId: 'historical-missing-session',
    };

    expect(() => parse(makeEnvelope(data))).not.toThrow();
  });

  it('preserves a script-like note as an inert string', () => {
    const result = parse(makeEnvelope());

    expect(result.data.studySessions[0]?.notes).toBe(scriptNote);
    expect(typeof result.data.studySessions[0]?.notes).toBe('string');
  });
});

describe('summarizeBackup', () => {
  it('reports profile presence and per-store counts', () => {
    const summary = summarizeBackup(makeEnvelope());

    expect(summary.hasProfile).toBe(true);
    expect(summary.profileName).toBe('Ada');
    expect(summary.appVersion).toBe('0.1.0');
    expect(summary.schemaVersion).toBe(expectedSchemaVersion);
    expect(summary.counts.studySessions).toBe(1);
    expect(summary.counts.xpTransactions).toBe(1);
    expect(summary.counts.achievementUnlocks).toBe(1);
    expect(summary.counts.courseUnits).toBe(1);
  });

  it('reports a missing profile honestly', () => {
    const data = makeValidData();
    data.learnerProfile = null;

    const summary = summarizeBackup(makeEnvelope(data));

    expect(summary.hasProfile).toBe(false);
    expect(summary.profileName).toBeNull();
  });
});

describe('parseBackupFile rejections', () => {
  it('rejects malformed JSON', () => {
    expect(() =>
      parseBackupFile('{ not json', { expectedSchemaVersion }),
    ).toThrow(BackupValidationError);
  });

  it('rejects oversized input before parsing', () => {
    expect(() =>
      parseBackupFile('x'.repeat(50), {
        expectedSchemaVersion,
        maxTextLength: 10,
      }),
    ).toThrow(/too large/i);
  });

  it('rejects a non-object payload', () => {
    expect(() =>
      parseBackupFile(JSON.stringify([1, 2, 3]), { expectedSchemaVersion }),
    ).toThrow(/not a ProgressPal backup/i);
  });

  it('rejects a wrong format identifier', () => {
    const envelope = { ...makeEnvelope(), format: 'something-else' };

    expect(() => parse(envelope)).toThrow(/not a ProgressPal backup/i);
  });

  it('rejects an unsupported format version', () => {
    const envelope = { ...makeEnvelope(), formatVersion: 99 };

    expect(() => parse(envelope)).toThrow(/format version/i);
  });

  it('rejects a mismatched data (schema) version', () => {
    const envelope = { ...makeEnvelope(), schemaVersion: 1 };

    expect(() => parse(envelope)).toThrow(/data version/i);
  });

  /**
   * Epic C6-R, D2 API hardening: `migrationContext` is required on the
   * production `ImportBackupControl` (a caller can no longer forget
   * authorization and still compile), so the context-free rejection this
   * used to prove indirectly through the component belongs at this parser
   * layer instead. The check fires before any legacy-shape validation, so
   * this is deliberately schema-3-shaped data merely labeled schemaVersion 2.
   */
  it('rejects a schema-2 backup when the app expects schema 3 and no migration context is supplied', () => {
    const envelope = { ...makeEnvelope(), schemaVersion: 2 };

    expect(() =>
      parseBackupFile(JSON.stringify(envelope), { expectedSchemaVersion: 3 }),
    ).toThrow(/different data version/i);
  });

  it('rejects an unknown top-level field', () => {
    const envelope = { ...makeEnvelope(), unexpected: true };

    expect(() => parse(envelope)).toThrow(/malformed/i);
  });

  it('rejects an unknown nested data field', () => {
    const data = {
      ...makeValidData(),
      extraStore: [],
    } as unknown as BackupData;

    expect(() => parse(makeEnvelope(data))).toThrow(/malformed/i);
  });

  it('rejects a malformed row', () => {
    const data = makeValidData();
    data.studySessions[0] = {
      ...data.studySessions[0]!,
      mode: 'not-a-mode' as never,
    };

    expect(() => parse(makeEnvelope(data))).toThrow(/malformed/i);
  });

  it('rejects an invalid avatar config value', () => {
    const data = makeValidData();
    data.learnerProfile = {
      ...data.learnerProfile!,
      avatarConfig: { face: '<svg/>' as never },
    };

    expect(() => parse(makeEnvelope(data))).toThrow(/malformed/i);
  });

  it.each<[string, (data: BackupData) => void]>([
    [
      'a non-canonical app metadata singleton ID',
      (data: BackupData) => {
        data.appMeta = { ...data.appMeta!, id: 'other-app-meta' };
      },
    ],
    [
      'a non-canonical learner profile singleton ID',
      (data: BackupData) => {
        data.learnerProfile = {
          ...data.learnerProfile!,
          id: 'other-learner-profile',
        };
      },
    ],
    [
      'an app metadata schema version mismatch',
      (data: BackupData) => {
        data.appMeta = { ...data.appMeta!, schemaVersion: 3 };
      },
    ],
    [
      'duplicate progress entry item IDs',
      (data: BackupData) => {
        data.progressEntries.push({
          ...data.progressEntries[0]!,
          id: 'progress-2',
        });
      },
    ],
    [
      'duplicate achievement unlock achievement IDs',
      (data: BackupData) => {
        data.achievementUnlocks.push({
          ...data.achievementUnlocks[0]!,
          id: 'unlock-first-session-2',
        });
      },
    ],
    [
      'duplicate resume point asset IDs',
      (data: BackupData) => {
        data.resumePoints.push({
          ...data.resumePoints[0]!,
          id: 'resume-2',
        });
      },
    ],
    [
      'a course item with a missing unit',
      (data: BackupData) => {
        data.courseItems[0] = {
          ...data.courseItems[0]!,
          unitId: 'missing-unit',
        };
      },
    ],
    [
      'a progress entry with a missing item',
      (data: BackupData) => {
        data.progressEntries[0] = {
          ...data.progressEntries[0]!,
          itemId: 'missing-item',
        };
      },
    ],
    [
      'a content asset with a missing item',
      (data: BackupData) => {
        data.contentAssets[0] = {
          ...data.contentAssets[0]!,
          itemId: 'missing-item',
        };
      },
    ],
    [
      'a content slice with a missing asset',
      (data: BackupData) => {
        data.contentSlices[0] = {
          ...data.contentSlices[0]!,
          assetId: 'missing-asset',
        };
      },
    ],
    [
      'a content slice with a missing item',
      (data: BackupData) => {
        data.contentSlices[0] = {
          ...data.contentSlices[0]!,
          itemId: 'missing-item',
        };
      },
    ],
    [
      'a content slice whose item does not match its asset',
      (data: BackupData) => {
        addSecondItem(data);
        data.contentSlices[0] = {
          ...data.contentSlices[0]!,
          itemId: 'item-2',
        };
      },
    ],
    [
      'a study session with a missing unit',
      (data: BackupData) => {
        data.studySessions[0] = {
          ...data.studySessions[0]!,
          unitId: 'missing-unit',
        };
      },
    ],
    [
      'a study session with a missing item',
      (data: BackupData) => {
        data.studySessions[0] = {
          ...data.studySessions[0]!,
          itemId: 'missing-item',
        };
      },
    ],
    [
      "a study session whose unit does not match its item's unit",
      (data: BackupData) => {
        data.courseUnits.push({
          ...data.courseUnits[0]!,
          id: 'unit-2',
          title: 'Unit 2',
          order: 1,
        });
        data.studySessions[0] = {
          ...data.studySessions[0]!,
          unitId: 'unit-2',
        };
      },
    ],
    [
      'a media event with a missing item',
      (data: BackupData) => {
        data.mediaProgressEvents[0] = {
          ...data.mediaProgressEvents[0]!,
          itemId: 'missing-item',
        };
      },
    ],
    [
      'a media event with a missing asset',
      (data: BackupData) => {
        data.mediaProgressEvents[0] = {
          ...data.mediaProgressEvents[0]!,
          assetId: 'missing-asset',
        };
      },
    ],
    [
      "a media event whose item does not match its asset's item",
      (data: BackupData) => {
        addSecondItem(data);
        data.mediaProgressEvents[0] = {
          ...data.mediaProgressEvents[0]!,
          itemId: 'item-2',
        };
      },
    ],
    [
      'a media event with a missing slice',
      (data: BackupData) => {
        data.mediaProgressEvents[0] = {
          ...data.mediaProgressEvents[0]!,
          sliceId: 'missing-slice',
        };
      },
    ],
    [
      'a media event whose slice does not match its asset',
      (data: BackupData) => {
        addSecondAssetAndSlice(data);
        data.mediaProgressEvents[0] = {
          ...data.mediaProgressEvents[0]!,
          sliceId: 'slice-2',
        };
      },
    ],
    [
      'a media event whose session does not match its item',
      (data: BackupData) => {
        addSecondItem(data);
        data.studySessions.push({
          ...data.studySessions[0]!,
          id: 'study-session-2',
          itemId: 'item-2',
        });
        data.mediaProgressEvents[0] = {
          ...data.mediaProgressEvents[0]!,
          sessionId: 'study-session-2',
        };
      },
    ],
    [
      'a resume point with a missing item',
      (data: BackupData) => {
        data.resumePoints[0] = {
          ...data.resumePoints[0]!,
          itemId: 'missing-item',
        };
      },
    ],
    [
      'a resume point with a missing asset',
      (data: BackupData) => {
        data.resumePoints[0] = {
          ...data.resumePoints[0]!,
          assetId: 'missing-asset',
        };
      },
    ],
    [
      "a resume point whose item does not match its asset's item",
      (data: BackupData) => {
        addSecondItem(data);
        data.resumePoints[0] = {
          ...data.resumePoints[0]!,
          itemId: 'item-2',
        };
      },
    ],
    [
      'a resume point with a missing source event',
      (data: BackupData) => {
        data.resumePoints[0] = {
          ...data.resumePoints[0]!,
          updatedFromEventId: 'missing-event',
        };
      },
    ],
    [
      'a resume point whose source event does not match its asset',
      (data: BackupData) => {
        addSecondAssetAndSlice(data);
        data.mediaProgressEvents.push({
          ...data.mediaProgressEvents[0]!,
          id: 'event-2',
          assetId: 'asset-2',
          sliceId: 'slice-2',
        });
        data.resumePoints[0] = {
          ...data.resumePoints[0]!,
          updatedFromEventId: 'event-2',
        };
      },
    ],
    [
      'a resume point with a missing next slice',
      (data: BackupData) => {
        data.resumePoints[0] = {
          ...data.resumePoints[0]!,
          nextSliceId: 'missing-slice',
        };
      },
    ],
    [
      'a resume point whose next slice does not match its asset',
      (data: BackupData) => {
        addSecondAssetAndSlice(data);
        data.resumePoints[0] = {
          ...data.resumePoints[0]!,
          nextSliceId: 'slice-2',
        };
      },
    ],
  ])('rejects %s', (_label, mutate) => {
    const data = makeValidData();
    mutate(data);

    expect(() => parse(makeEnvelope(data))).toThrow(BackupValidationError);
  });

  it('rejects duplicate IDs within a single store', () => {
    const data = makeValidData();
    const session = data.studySessions[0]!;
    data.studySessions = [session, { ...session }];

    expect(() => parse(makeEnvelope(data))).toThrow(/duplicate studySessions/i);
  });

  it('allows the same ID to appear in two unrelated stores', () => {
    const data = makeValidData();
    data.studySessions[0] = { ...data.studySessions[0]!, id: 'shared-1' };
    data.mediaProgressEvents[0] = {
      ...data.mediaProgressEvents[0]!,
      sessionId: 'shared-1',
    };
    data.xpTransactions[0] = { ...data.xpTransactions[0]!, id: 'shared-1' };

    expect(() => parse(makeEnvelope(data))).not.toThrow();
  });
});

describe('backupFileName', () => {
  it('formats a device-local dated file name', () => {
    expect(backupFileName(new Date(2026, 5, 6))).toBe(
      'progresspal-backup-2026-06-06.json',
    );
  });
});
