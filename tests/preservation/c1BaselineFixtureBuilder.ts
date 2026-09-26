import { vi } from 'vitest';

import {
  buildBackupEnvelope,
  serializeBackupEnvelope,
  type BackupEnvelope,
} from '@/lib/backup';
import {
  addStudySessionAndAwardXp,
  correctStudySessionAssignment,
  currentApplicationVersion,
  currentDatabaseSchemaVersion,
  getDatabaseSnapshot,
  logMediaProgressAndAwardXp,
  recordBackupEvent,
  saveLearnerProfile,
  upsertProgressAndAwardXp,
} from '@/lib/db';
import type { ProgressStatus, StudySessionMode } from '@/lib/domain';

import { createIncrementingClock, createSeededDatabase } from './c1Support';

/**
 * Epic C / C1 evidence area 7 — baseline schema-2 migration fixture builder.
 *
 * Builds a synthetic, progressed learner database ENTIRELY through the real
 * production repositories and exports it through the real backup path
 * (`getDatabaseSnapshot` -> `buildBackupEnvelope` -> `serializeBackupEnvelope`,
 * exactly as the Settings export does). Nothing in the fixture is
 * hand-written.
 *
 * Determinism: every repository call receives a fixed incrementing clock,
 * sessions carry explicit synthetic IDs, and `crypto.randomUUID` is replaced
 * for the duration of the build by a counter so generated entity IDs are
 * reproducible. The committed fixture
 * `tests/fixtures/backups/c1-baseline-envelope1-schema2.json` was produced by
 * this builder at the product baseline; `c1BaselineFixture.test.ts` rebuilds it
 * and requires deep equality.
 *
 * Known gap (recorded for C6): the schema allows `content_slices.status =
 * 'skipped'`, but no production write path creates a skipped slice (the slice
 * planner only preserves an existing `skipped` status). The fixture therefore
 * contains no skipped slice; C6 needs a separate legacy/adversarial fixture
 * for that case.
 */

export const c1FixtureExportedAt = '2026-09-19T18:00:00.000Z';
const syntheticNote = 'Synthetic C1 fixture note.';
const syntheticEvidence = 'Synthetic C1 submission note.';

type ProgressStep = [itemId: string, status: ProgressStatus];

const progressSteps: readonly ProgressStep[] = [
  ['week-0-lecture', 'completed'],
  ['week-0-problem-set', 'started'],
  ['week-0-problem-set', 'submitted'],
  ['week-0-problem-set', 'accepted'],
  ['week-1-lecture', 'completed'],
  ['week-1-problem-set', 'submitted'],
  ['week-1-section', 'completed'],
  ['week-1-shorts', 'completed'],
  ['week-2-problem-set', 'submitted'],
  ['week-3-lecture', 'completed'],
  ['week-3-problem-set', 'completed'],
  ['week-3-section', 'blocked'],
  ['week-4-lecture', 'completed'],
  ['week-4-problem-set', 'completed'],
  ['week-4-shorts', 'started'],
  ['week-5-lecture', 'completed'],
  ['week-5-problem-set', 'completed'],
  ['week-6-lecture', 'completed'],
  ['week-6-problem-set', 'completed'],
  ['week-7-lecture', 'completed'],
  ['week-7-problem-set', 'completed'],
  ['week-8-lecture', 'completed'],
  ['week-8-problem-set', 'completed'],
  ['week-9-lecture', 'completed'],
  ['week-9-problem-set', 'completed'],
  ['week-10-lecture', 'completed'],
  ['week-10-seminars', 'skipped_optional'],
  ['practice-debug', 'completed'],
  ['final-project-build', 'completed'],
  ['final-project-readme', 'completed'],
  ['final-project-video-demo', 'completed'],
  ['final-project-submit50', 'completed'],
  ['final-project-gradebook-check', 'completed'],
];

type SessionStep = [
  id: string,
  unitId: string,
  itemId: string,
  mode: StudySessionMode,
  minutes: number,
];

const sessionSteps: readonly SessionStep[] = [
  ['c1-session-deep-1', 'week-3', 'week-3-problem-set', 'coding', 45],
  ['c1-session-deep-2', 'week-4', 'week-4-problem-set', 'coding', 50],
  ['c1-session-deep-3', 'week-5', 'week-5-problem-set', 'coding', 45],
  ['c1-session-debug', 'week-1', 'week-1-problem-set', 'debugging', 30],
  ['c1-session-corrected', 'week-0', 'week-0-lecture', 'watching', 25],
];

export async function buildC1BaselineEnvelope(): Promise<BackupEnvelope> {
  let counter = 0;
  const uuid = vi
    .spyOn(globalThis.crypto, 'randomUUID')
    .mockImplementation(() => {
      counter += 1;
      return `${counter.toString(16).padStart(8, '0')}-c1c1-4c1c-8c1c-c1c1c1c1c1c1`;
    });
  const context = await createSeededDatabase('baseline-fixture');
  const now = createIncrementingClock('2026-09-19T12:05:00.000Z', 60_000);
  const options = { db: context.db, now };

  try {
    await saveLearnerProfile(
      {
        avatarConfig: { face: 'oval', hair: 'curly', topColor: 'ocean' },
        displayName: 'C1 Synthetic Learner',
        preferredTheme: 'light',
        reducedMotion: true,
        targetMinutesPerWeek: 300,
        targetStudyDays: ['monday', 'wednesday', 'friday'],
      },
      { ...options, completeOnboarding: true },
    );

    for (const [itemId, status] of progressSteps) {
      await upsertProgressAndAwardXp(
        {
          confidence: 3,
          itemId,
          notes: syntheticNote,
          status,
          ...(status === 'submitted' || status === 'accepted'
            ? { evidenceText: syntheticEvidence }
            : {}),
        },
        options,
      );
    }

    // Long-form: a clean stop, a completed first slice, then the rest of the
    // lecture (completes week-2-lecture through events); and one partial
    // optional lecture that keeps an active slice and a resume point.
    const week2 = 'week-2-lecture-asset';
    await logMediaProgressAndAwardXp(
      {
        assetId: week2,
        endSecond: 900,
        energyAfter: 3,
        energyBefore: 4,
        notes: syntheticNote,
        startSecond: 0,
        stoppedBecause: 'reached_limit',
      },
      options,
    );
    await logMediaProgressAndAwardXp(
      {
        assetId: week2,
        endSecond: 1200,
        energyAfter: 3,
        energyBefore: 3,
        startSecond: 900,
        stoppedBecause: 'completed_slice',
      },
      options,
    );
    await logMediaProgressAndAwardXp(
      {
        assetId: week2,
        endSecond: 9000,
        energyAfter: 2,
        energyBefore: 3,
        startSecond: 1200,
        stoppedBecause: 'completed_slice',
      },
      options,
    );
    await logMediaProgressAndAwardXp(
      {
        assetId: 'artificial-intelligence-lecture-asset',
        endSecond: 600,
        energyAfter: 3,
        energyBefore: 3,
        startSecond: 0,
        stoppedBecause: 'interruption',
      },
      options,
    );

    for (const [id, unitId, itemId, mode, minutes] of sessionSteps) {
      const startedAt = now();
      await addStudySessionAndAwardXp(
        {
          durationMinutes: minutes,
          endedAt: new Date(
            Date.parse(startedAt) + minutes * 60_000,
          ).toISOString(),
          id,
          itemId,
          mode,
          notes: syntheticNote,
          startedAt,
          unitId,
        },
        options,
      );
    }
    await correctStudySessionAssignment(
      { itemId: 'week-4-lecture', sessionId: 'c1-session-corrected' },
      options,
    );

    await recordBackupEvent(
      { fileName: 'c1-synthetic-earlier-export.json', type: 'export' },
      options,
    );

    const snapshot = await getDatabaseSnapshot({ db: context.db });
    const envelope = buildBackupEnvelope(snapshot, {
      appVersion: currentApplicationVersion,
      exportedAt: c1FixtureExportedAt,
      schemaVersion: currentDatabaseSchemaVersion,
    });
    return JSON.parse(serializeBackupEnvelope(envelope).contents);
  } finally {
    await context.cleanup();
    uuid.mockRestore();
  }
}
