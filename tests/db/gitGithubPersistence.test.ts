import { expect, it } from 'vitest';
import { resolveDatabaseMigrationContext } from '@/app/providers/programmeComposition';
import {
  buildBackupEnvelope,
  parseBackupFile,
  serializeBackupEnvelope,
} from '@/lib/backup';
import {
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  enrolAndSwitchActiveProgramme,
  getDatabaseSnapshot,
  getLessonPosition,
  initializeDatabase,
  recordEvaluationResult,
  resetAllData,
  restoreDatabaseFromBackup,
  saveLessonPosition,
  submitExerciseAttempt,
  upsertProgress,
} from '@/lib/db';
import { gitGithubDefinition as git } from '@/programmes/git-github';
import { bundledCourseSeed } from '@/seed';
import { createTestDatabase } from './testDatabase';

it('round-trips Git reports and versioned positions through reset/restore while retaining CS50 progress and zero XP', async () => {
  const migrationContext = resolveDatabaseMigrationContext();
  const context = createTestDatabase('git-pilot-roundtrip', migrationContext);
  const options = { db: context.db };
  try {
    await initializeDatabase({ ...options, seed: bundledCourseSeed });
    const cs50Progress = await upsertProgress(
      {
        itemId: 'week-0-lecture',
        status: 'started',
        confidence: 0,
      },
      options,
    );
    await enrolAndSwitchActiveProgramme(git.programmeId, {
      ...options,
      seed: git.catalogue,
    });
    const loaded = await git.content.lessons!.loadIndex();
    expect(loaded.status).toBe('ready');
    if (loaded.status !== 'ready') throw new Error(loaded.reason);
    const meta = loaded.value.exercises.find(
      (exercise) => exercise.responseMode === 'reflect',
    )!;
    const input = {
      id: 'git-report-1',
      programmeId: git.programmeId,
      contentVersion: 1,
      subjectId: meta.subjectId,
      contentHash: meta.contentHash,
      responseMode: 'reflect' as const,
      answer: { text: 'Jeg stoppet etter at jeg oppdaget feil staging.' },
    };
    const first = await submitExerciseAttempt(input, options);
    await recordEvaluationResult(
      { id: 'git-result-1', attemptId: first.record.id, outcome: 'recorded' },
      options,
    );
    expect((await submitExerciseAttempt(input, options)).created).toBe(false);
    const revised = await submitExerciseAttempt(
      {
        ...input,
        id: 'git-report-2',
        answer: { text: 'Jeg rettet utvalget og kontrollerte siste commit.' },
      },
      options,
    );
    expect(revised.record.attemptNumber).toBe(2);
    await recordEvaluationResult(
      { id: 'git-result-2', attemptId: revised.record.id, outcome: 'recorded' },
      options,
    );
    const position = await saveLessonPosition(
      {
        programmeId: git.programmeId,
        itemId: 'git-m01-o05',
        unitId: 'git-m01-l05',
        contentVersion: 1,
        stepIndex: 3,
      },
      options,
    );
    await upsertProgress(
      { itemId: 'git-m01-o05', status: 'completed', confidence: 0 },
      options,
    );
    const snapshot = await getDatabaseSnapshot(options);
    expect(snapshot.xpTransactions).toEqual([]);
    const { contents } = serializeBackupEnvelope(
      buildBackupEnvelope(snapshot, {
        appVersion: currentApplicationVersion,
        schemaVersion: currentDatabaseSchemaVersion,
        exportedAt: '2026-11-03T00:00:00.000Z',
      }),
    );
    const parsed = parseBackupFile(contents, {
      expectedSchemaVersion: currentDatabaseSchemaVersion,
      migrationContext,
    });
    expect(parsed.data.learnerEvidence).toHaveLength(4);
    await resetAllData({ ...options, seed: bundledCourseSeed });
    expect((await getDatabaseSnapshot(options)).learnerEvidence).toEqual([]);
    const restored = await restoreDatabaseFromBackup(parsed.data, {
      ...options,
      seed: bundledCourseSeed,
      fileName: 'synthetic-git-pilot.json',
    });
    expect(restored.learnerEvidence).toEqual(snapshot.learnerEvidence);
    expect(restored.xpTransactions).toEqual([]);
    expect(restored.appMeta?.activeProgrammeId).toBe(git.programmeId);
    expect(await getLessonPosition('git-m01-o05', options)).toEqual(position);
    expect(restored.progressEntries).toContainEqual(cs50Progress);
    await enrolAndSwitchActiveProgramme('cs50x', {
      ...options,
      seed: bundledCourseSeed,
    });
    const switched = await getDatabaseSnapshot(options);
    expect(switched.progressEntries).toEqual(restored.progressEntries);
    expect(switched.learnerEvidence).toEqual(restored.learnerEvidence);
    expect(switched.lessonPositions).toEqual(restored.lessonPositions);
  } finally {
    await context.cleanup();
  }
});
