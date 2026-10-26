import { afterEach, describe, expect, it } from 'vitest';

import {
  BackupValidationError,
  assertBackupDataInvariants,
  buildBackupEnvelope,
  maxBackupBytes,
  parseBackupFile,
  serializeBackupEnvelope,
  summarizeBackup,
  type BackupData,
} from '@/lib/backup';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  getDatabaseSnapshot,
  addXpTransaction,
  getXpSummary,
  recordEvaluationResult,
  recordSupportEvent,
  restoreDatabaseFromBackup,
  saveLessonPosition,
  submitExerciseAttempt,
  type DatabaseSnapshot,
} from '@/lib/db';
import { answerBounds } from '@/lib/domain';

import {
  attemptInput,
  createP2Device,
  hashA,
  hashB,
  p2MigrationContext,
  p2ProgrammeId,
} from '../db/learnerEvidenceFixture';
import type { TestDatabaseContext } from '../db/testDatabase';

/**
 * Epic E educational backup invariants retained on the owner-authorized
 * Activity schema-5 baseline. Native v5 export, import, restore and reset are required; older and newer
 * exports are refused clearly before any write; the backup's claims about
 * the two new stores are never trusted.
 */

const exportedAt = '2026-10-03T12:00:00.000Z';
const databases: TestDatabaseContext[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((context) => context.cleanup()));
});

async function device(label: string) {
  const context = await createP2Device(label, { materialize: true });
  databases.push(context);
  return context;
}

/** A P2-enrolled device with one resolved attempt, one unresolved attempt, a hint and a position. */
async function deviceWithEvidence(label: string) {
  const context = await device(label);
  await recordSupportEvent(
    {
      id: 'hint-1',
      programmeId: p2ProgrammeId,
      contentVersion: 1,
      subjectId: 's1-m01-p01-e05',
      contentHash: hashA,
      supportKind: 'hint_reveal',
      hintNumber: 1,
    },
    { db: context.db },
  );
  await submitExerciseAttempt(attemptInput(), { db: context.db });
  await recordEvaluationResult(
    { id: 'result-1', attemptId: 'attempt-1', outcome: 'correct' },
    { db: context.db },
  );
  await submitExerciseAttempt(
    attemptInput({
      id: 'attempt-pending',
      subjectId: 's1-m01-p01-e06',
      responseMode: 'predict',
      answer: { text: 'Hei, verden!' },
    }),
    { db: context.db },
  );
  await saveLessonPosition(
    {
      itemId: 's1-m01-o01',
      programmeId: p2ProgrammeId,
      contentVersion: 1,
      unitId: 's1-m01-p01',
      stepIndex: 7,
    },
    { db: context.db },
  );

  return context;
}

function envelopeText(data: BackupData, schemaVersion = 5) {
  return serializeBackupEnvelope(
    buildBackupEnvelope(data, {
      appVersion: currentApplicationVersion,
      schemaVersion,
      exportedAt,
    }),
  ).contents;
}

function withSchemaVersion(snapshot: DatabaseSnapshot, schemaVersion: number) {
  return {
    ...snapshot,
    appMeta:
      snapshot.appMeta === null ? null : { ...snapshot.appMeta, schemaVersion },
  };
}

function expectRejected(data: BackupData, issue: RegExp) {
  let thrown: unknown;

  try {
    assertBackupDataInvariants(data, {
      expectedSchemaVersion: 5,
      migrationContext: p2MigrationContext,
    });
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(BackupValidationError);
  expect(
    [
      (thrown as BackupValidationError).message,
      ...(thrown as BackupValidationError).issues,
    ].join('\n'),
  ).toMatch(issue);
}

describe('native schema-5 export, import and restore (educational preservation)', () => {
  it('round-trips attempts, results, support events and positions exactly', async () => {
    const source = await deviceWithEvidence('backup-v4-source');
    const snapshot = await getDatabaseSnapshot({ db: source.db });
    const text = envelopeText(snapshot);

    const parsed = parseBackupFile(text, {
      expectedSchemaVersion: currentDatabaseSchemaVersion,
      migrationContext: p2MigrationContext,
    });
    expect(parsed.schemaVersion).toBe(5);
    expect(parsed.data.learnerEvidence).toEqual(snapshot.learnerEvidence);
    expect(parsed.data.lessonPositions).toEqual(snapshot.lessonPositions);

    const target = await device('backup-v4-target');
    const restored = await restoreDatabaseFromBackup(parsed.data, {
      db: target.db,
      fileName: 'v4.json',
    });

    expect(restored.learnerEvidence).toEqual(snapshot.learnerEvidence);
    expect(restored.lessonPositions).toEqual(snapshot.lessonPositions);
    expect(restored.appMeta?.schemaVersion).toBe(5);
  });

  it('replaces both stores on restore, so a backup without evidence empties them', async () => {
    const emptySource = await device('backup-v4-empty-source');
    const emptySnapshot = await getDatabaseSnapshot({ db: emptySource.db });
    const target = await deviceWithEvidence('backup-v4-replace-target');

    const restored = await restoreDatabaseFromBackup(emptySnapshot, {
      db: target.db,
      fileName: 'empty.json',
    });

    expect(restored.learnerEvidence).toEqual([]);
    expect(restored.lessonPositions).toEqual([]);
  });

  it('summarizes evidence and position counts for the preview', async () => {
    const source = await deviceWithEvidence('backup-v4-summary');
    const snapshot = await getDatabaseSnapshot({ db: source.db });
    const summary = summarizeBackup(
      parseBackupFile(envelopeText(snapshot), {
        expectedSchemaVersion: 5,
        migrationContext: p2MigrationContext,
      }),
    );

    expect(summary.counts.learnerEvidence).toBe(4);
    expect(summary.counts.lessonPositions).toBe(1);
  });
});

describe('older and newer exports are refused clearly before any write', () => {
  for (const schemaVersion of [2, 3, 4, 6]) {
    it(`refuses a schema-${schemaVersion} backup with the data-version message and leaves the database byte-identical`, async () => {
      const target = await deviceWithEvidence(`backup-refuse-${schemaVersion}`);
      const before = await getDatabaseSnapshot({ db: target.db });
      const foreign = {
        ...withSchemaVersion(before, schemaVersion),
      } as Record<string, unknown>;

      if (schemaVersion < 4) {
        delete foreign.learnerEvidence;
        delete foreign.lessonPositions;
      }

      const text = envelopeText(foreign as BackupData, schemaVersion);

      expect(() =>
        parseBackupFile(text, {
          expectedSchemaVersion: currentDatabaseSchemaVersion,
          migrationContext: p2MigrationContext,
        }),
      ).toThrow(
        'This backup was created with a different data version. Expected data version 5.',
      );
      await expect(
        restoreDatabaseFromBackup(withSchemaVersion(before, schemaVersion), {
          db: target.db,
          fileName: `schema-${schemaVersion}.json`,
        }),
      ).rejects.toBeInstanceOf(BackupValidationError);
      expect(await getDatabaseSnapshot({ db: target.db })).toEqual(before);
    });
  }

  it('rejects a schema-4 backup in a schema-3 application by the existing rule', async () => {
    const source = await deviceWithEvidence('backup-v4-in-v3');
    const text = envelopeText(await getDatabaseSnapshot({ db: source.db }));

    expect(() =>
      parseBackupFile(text, {
        expectedSchemaVersion: 3,
        migrationContext: p2MigrationContext,
      }),
    ).toThrow(/different data version/);
  });
});

describe('backup invariants for the new stores (a backup claim is never trusted)', () => {
  async function evidenceData(label: string) {
    const source = await deviceWithEvidence(label);
    return getDatabaseSnapshot({ db: source.db });
  }

  it('accepts the valid evidence set, including an unresolved attempt', async () => {
    const data = await evidenceData('backup-inv-valid');

    expect(() =>
      assertBackupDataInvariants(data, {
        expectedSchemaVersion: 5,
        migrationContext: p2MigrationContext,
      }),
    ).not.toThrow();
  });

  it('rejects a result whose attemptId resolves to no attempt', async () => {
    const data = await evidenceData('backup-inv-dangling');
    const evidence = data.learnerEvidence.map((row) =>
      row.kind === 'evaluation_result' ? { ...row, attemptId: 'ghost' } : row,
    );

    expectRejected({ ...data, learnerEvidence: evidence }, /ghost/);
  });

  for (const field of [
    'programmeId',
    'subjectId',
    'contentVersion',
    'contentHash',
  ] as const) {
    it(`rejects a result whose ${field} differs from its attempt's`, async () => {
      const data = await evidenceData(`backup-inv-binding-${field}`);
      const changed = {
        programmeId: 'cs50x',
        subjectId: 's1-m01-p01-e99',
        contentVersion: 2,
        contentHash: hashB,
      }[field];
      const evidence = data.learnerEvidence.map((row) =>
        row.kind === 'evaluation_result' ? { ...row, [field]: changed } : row,
      );

      expectRejected(
        { ...data, learnerEvidence: evidence },
        /binding|differs/i,
      );
    });
  }

  it('rejects two results for one attempt', async () => {
    const data = await evidenceData('backup-inv-duplicate-result');
    const result = data.learnerEvidence.find(
      (row) => row.kind === 'evaluation_result',
    )!;

    expectRejected(
      {
        ...data,
        learnerEvidence: [
          ...data.learnerEvidence,
          { ...result, id: 'result-duplicate', outcome: 'incorrect' },
        ],
      },
      /attemptId/i,
    );
  });

  it('rejects duplicate attempt numbers for one subject', async () => {
    const data = await evidenceData('backup-inv-duplicate-number');
    const attempt = data.learnerEvidence.find(
      (row) => row.kind === 'exercise_attempt',
    )!;

    expectRejected(
      {
        ...data,
        learnerEvidence: [
          ...data.learnerEvidence,
          { ...attempt, id: 'attempt-duplicate' },
        ],
      },
      /attempt number/i,
    );
  });

  it('rejects evidence for an unregistered programme', async () => {
    const data = await evidenceData('backup-inv-unknown-programme');
    const evidence = data.learnerEvidence.map((row) =>
      row.kind === 'support_event'
        ? { ...row, programmeId: 'unknown-programme' }
        : row,
    );

    expectRejected({ ...data, learnerEvidence: evidence }, /unknown-programme/);
  });

  it('rejects evidence for a registered programme the backup does not enrol', async () => {
    const data = await evidenceData('backup-inv-unenrolled');

    expectRejected(
      {
        ...data,
        programmeEnrolments: data.programmeEnrolments.filter(
          (enrolment) => enrolment.programmeId !== p2ProgrammeId,
        ),
      },
      /enrol/i,
    );
  });

  it('rejects a checkpoint result whose basis names no attempt, a non-attempt row or another programme', async () => {
    const data = await evidenceData('backup-inv-checkpoint-basis');
    const checkpoint = (basisAttemptIds: string[]) => ({
      id: 'checkpoint-1',
      kind: 'checkpoint_result' as const,
      programmeId: p2ProgrammeId,
      contentVersion: 1,
      subjectId: 's1-m01-chk',
      contentHash: hashA,
      recordedAt: exportedAt,
      attemptNumber: 1,
      criteria: [
        { criterion: 'c' as const, skillId: 'sk-git-01', level: 'D' as const },
      ],
      passed: true,
      ruleId: 'some-rule',
      basisAttemptIds,
    });

    expectRejected(
      {
        ...data,
        learnerEvidence: [...data.learnerEvidence, checkpoint(['ghost'])],
      },
      /basis/i,
    );
    expectRejected(
      {
        ...data,
        learnerEvidence: [...data.learnerEvidence, checkpoint(['hint-1'])],
      },
      /basis/i,
    );
  });

  it('rejects an attempt row carrying an outcome', async () => {
    const data = await evidenceData('backup-inv-attempt-outcome');
    const evidence = data.learnerEvidence.map((row) =>
      row.kind === 'exercise_attempt' ? { ...row, outcome: 'correct' } : row,
    );

    expect(() =>
      parseBackupFile(
        envelopeText({ ...data, learnerEvidence: evidence } as BackupData),
        {
          expectedSchemaVersion: 5,
          migrationContext: p2MigrationContext,
        },
      ),
    ).toThrow(BackupValidationError);
  });

  it('rejects a lesson position for an item missing from the backup catalogue', async () => {
    const data = await evidenceData('backup-inv-position-item');
    const positions = data.lessonPositions.map((row) => ({
      ...row,
      itemId: 'not-a-lesson',
    }));

    expectRejected({ ...data, lessonPositions: positions }, /not-a-lesson/);
  });

  it('rejects a lesson position whose programme does not own its item', async () => {
    const data = await evidenceData('backup-inv-position-programme');
    const positions = data.lessonPositions.map((row) => ({
      ...row,
      programmeId: 'cs50x',
    }));

    expectRejected({ ...data, lessonPositions: positions }, /programme/i);
  });

  it('rejects two positions for one item and duplicate evidence ids', async () => {
    const data = await evidenceData('backup-inv-duplicates');

    expectRejected(
      {
        ...data,
        lessonPositions: [
          ...data.lessonPositions,
          { ...data.lessonPositions[0]!, id: 'position-duplicate' },
        ],
      },
      /item/i,
    );
    expectRejected(
      {
        ...data,
        learnerEvidence: [...data.learnerEvidence, data.learnerEvidence[0]!],
      },
      /duplicate/i,
    );
  });
});

describe('a maximal realistic evidence dataset stays within the backup cap', () => {
  it('exports every exercise attempted five times at its answer bound, and fails closed above the cap', async () => {
    const source = await device('backup-max-realistic');
    const base = await getDatabaseSnapshot({ db: source.db });
    const evidence: DatabaseSnapshot['learnerEvidence'] = [];

    // 291 exercises; 42 program items carry the largest bounded payload.
    for (let exercise = 1; exercise <= 291; exercise += 1) {
      const isProgram = exercise <= 42;

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const attemptId = `attempt-${exercise}-${attempt}`;
        const subjectId = `s1-m02-x${exercise}`;
        evidence.push({
          id: attemptId,
          kind: 'exercise_attempt',
          programmeId: p2ProgrammeId,
          contentVersion: 1,
          subjectId,
          contentHash: hashA,
          recordedAt: exportedAt,
          attemptNumber: attempt,
          responseMode: isProgram ? 'program' : 'predict',
          answer: isProgram
            ? { source: 'x'.repeat(answerBounds.programSourceChars) }
            : { text: 'y'.repeat(answerBounds.freeTextChars) },
          hintsUsedMax: 0,
          teachingReopened: false,
        });
        evidence.push({
          id: `result-${exercise}-${attempt}`,
          kind: 'evaluation_result',
          programmeId: p2ProgrammeId,
          contentVersion: 1,
          subjectId,
          contentHash: hashA,
          recordedAt: exportedAt,
          attemptId,
          outcome: 'incorrect',
        });
      }
    }

    const data = { ...base, learnerEvidence: evidence };
    const { byteLength } = serializeBackupEnvelope(
      buildBackupEnvelope(data, {
        appVersion: currentApplicationVersion,
        schemaVersion: 5,
        exportedAt,
      }),
    );

    expect(byteLength).toBeLessThan(maxBackupBytes);
    expect(() =>
      serializeBackupEnvelope(
        buildBackupEnvelope(data, {
          appVersion: currentApplicationVersion,
          schemaVersion: 5,
          exportedAt,
        }),
        { maxBytes: byteLength - 1 },
      ),
    ).toThrow(BackupValidationError);
  });
});

describe('E-SCHEMA-1A: XP ownership in schema-4 backups', () => {
  async function xpData(label: string) {
    const source = await device(label);
    await addXpTransaction(
      {
        programmeId: 'cs50x',
        sourceType: 'exercise_solved',
        sourceId: 'shared-id',
        xp: 900,
        reason: 'CS50 award',
        awardedAt: exportedAt,
      },
      { db: source.db },
    );
    await addXpTransaction(
      {
        programmeId: p2ProgrammeId,
        sourceType: 'exercise_solved',
        sourceId: 'shared-id',
        xp: 100,
        reason: 'Programvareutvikling award',
        awardedAt: exportedAt,
      },
      { db: source.db },
    );
    return getDatabaseSnapshot({ db: source.db });
  }

  it('round-trips each row with its owning programme and keeps the ledgers independent', async () => {
    const snapshot = await xpData('backup-xp-roundtrip');
    const parsed = parseBackupFile(envelopeText(snapshot), {
      expectedSchemaVersion: currentDatabaseSchemaVersion,
      migrationContext: p2MigrationContext,
    });

    expect(parsed.data.xpTransactions).toEqual(snapshot.xpTransactions);
    expect(
      parsed.data.xpTransactions.map((row) => row.programmeId).sort(),
    ).toEqual(['cs50x', p2ProgrammeId]);

    const target = await device('backup-xp-target');
    await restoreDatabaseFromBackup(parsed.data, {
      db: target.db,
      fileName: 'xp.json',
    });

    expect(
      await getXpSummary({ db: target.db, programmeId: 'cs50x' }),
    ).toMatchObject({ totalXp: 900, level: 4 });
    expect(
      await getXpSummary({ db: target.db, programmeId: p2ProgrammeId }),
    ).toMatchObject({ totalXp: 100, level: 2 });
  });

  it('rejects an XP row without a programme', async () => {
    const data = await xpData('backup-xp-ownerless');
    const xpTransactions = data.xpTransactions.map((row) => {
      const copy: Record<string, unknown> = { ...row };
      delete copy.programmeId;
      return copy;
    });

    expect(() =>
      assertBackupDataInvariants(
        { ...data, xpTransactions } as unknown as BackupData,
        { expectedSchemaVersion: 5, migrationContext: p2MigrationContext },
      ),
    ).toThrow();
  });

  it('rejects XP owned by a programme the backup does not enrol, or an unknown one', async () => {
    const data = await xpData('backup-xp-unenrolled');

    expectRejected(
      {
        ...data,
        programmeEnrolments: data.programmeEnrolments.filter(
          (enrolment) => enrolment.programmeId !== p2ProgrammeId,
        ),
        learnerEvidence: [],
        lessonPositions: [],
      },
      /enrol/i,
    );
    expectRejected(
      {
        ...data,
        xpTransactions: data.xpTransactions.map((row) => ({
          ...row,
          programmeId: 'unknown-programme',
        })),
      },
      /unknown-programme/,
    );
  });

  it('rejects a duplicate award inside one programme but not across programmes', async () => {
    const data = await xpData('backup-xp-duplicate');
    const p2Row = data.xpTransactions.find(
      (row) => row.programmeId === p2ProgrammeId,
    )!;

    expect(() =>
      assertBackupDataInvariants(data, {
        expectedSchemaVersion: 5,
        migrationContext: p2MigrationContext,
      }),
    ).not.toThrow();
    expectRejected(
      {
        ...data,
        xpTransactions: [...data.xpTransactions, { ...p2Row, id: 'xp-copy' }],
      },
      /duplicate|shared-id/i,
    );
  });
});
