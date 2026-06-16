import { describe, expect, it } from 'vitest';

import {
  BackupValidationError,
  backupFileName,
  buildBackupEnvelope,
  currentBackupFormatVersion,
  parseBackupFile,
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
      seedVersion: 1,
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
    courseUnits: [],
    courseItems: [],
    progressEntries: [],
    contentAssets: [],
    contentSlices: [],
    mediaProgressEvents: [],
    resumePoints: [],
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

  it('tolerates a null appMeta and null learnerProfile', () => {
    const data = makeValidData();
    data.appMeta = null;
    data.learnerProfile = null;

    const result = parse(makeEnvelope(data));

    expect(result.data.appMeta).toBeNull();
    expect(result.data.learnerProfile).toBeNull();
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
    expect(summary.counts.courseUnits).toBe(0);
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

  it('rejects duplicate IDs within a single store', () => {
    const data = makeValidData();
    const session = data.studySessions[0]!;
    data.studySessions = [session, { ...session }];

    expect(() => parse(makeEnvelope(data))).toThrow(/duplicate studySessions/i);
  });

  it('allows the same ID to appear in two unrelated stores', () => {
    const data = makeValidData();
    data.studySessions[0] = { ...data.studySessions[0]!, id: 'shared-1' };
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
