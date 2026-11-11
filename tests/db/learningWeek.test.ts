import { describe, expect, it } from 'vitest';

import { closeSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { deriveLearningDays, readLearningDays } from '@/lib/db/learningWeek';
import { getOsloWeek } from '@/lib/time/osloWeek';

import { defaultTestMigrationContext } from './testDatabase';

describe('Oslo calendar week', () => {
  it.each([
    ['2026-03-29T21:59:59Z', '2026-03-23', '2026-03-29'],
    ['2026-03-29T22:00:00Z', '2026-03-30', '2026-03-30'],
    ['2026-10-25T22:59:59Z', '2026-10-19', '2026-10-25'],
    ['2026-10-25T23:00:00Z', '2026-10-26', '2026-10-26'],
    ['2024-02-29T12:00:00-08:00', '2024-02-26', '2024-02-29'],
    ['2025-12-31T23:00:00Z', '2025-12-29', '2026-01-01'],
  ])('uses Oslo for %s', (instant, start, today) => {
    expect(getOsloWeek(new Date(instant))).toMatchObject({ start, today });
  });

  it('deduplicates an autumn repeated hour and discards the previous week and future dates', () => {
    const repeatedHour = ['2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z'];
    const sunday = getOsloWeek(new Date('2026-10-25T21:00:00Z'));
    expect(
      deriveLearningDays(sunday, [
        ...repeatedHour,
        '2026-10-26T00:00:00Z',
        'invalid',
        undefined,
      ]),
    ).toEqual(['2026-10-25']);
    expect(
      deriveLearningDays(
        getOsloWeek(new Date('2026-10-26T01:00:00Z')),
        repeatedHour,
      ),
    ).toEqual([]);
  });
});

it('reads real IndexedDB across programmes, excludes support and stale completions, and respects reopen', async () => {
  const db = getSharedDatabase(defaultTestMigrationContext);
  const monday = '2026-03-29T22:30:00Z';
  const tuesday = '2026-03-31T10:00:00Z';
  const wednesday = '2026-04-01T10:00:00Z';
  const thursday = '2026-04-02T10:00:00Z';
  const fields = { createdAt: monday, updatedAt: thursday };
  await db.studySessions.add({
    ...fields,
    id: 'short-session',
    itemId: 'week-0-lecture',
    unitId: 'week-0',
    mode: 'coding',
    startedAt: monday,
    endedAt: monday,
    durationMinutes: 0,
    blockers: [],
  });
  const evidence = {
    programmeId: 'cs50x-2026',
    subjectId: 'exercise',
    contentVersion: 1,
    contentHash: 'a'.repeat(64),
  };
  await db.learnerEvidence.bulkAdd([
    {
      ...evidence,
      id: 'duplicate',
      kind: 'exercise_attempt',
      recordedAt: monday,
      attemptNumber: 1,
      responseMode: 'predict',
      answer: { text: 'wrong' },
      hintsUsedMax: 0,
      teachingReopened: false,
    },
    {
      ...evidence,
      programmeId: 'git-github',
      subjectId: 'git-exercise',
      id: 'pathway-submission',
      kind: 'exercise_attempt',
      recordedAt: tuesday,
      attemptNumber: 1,
      responseMode: 'cmd',
      answer: { command: 'git status' },
      hintsUsedMax: 0,
      teachingReopened: false,
    },
    {
      ...evidence,
      id: 'incorrect',
      kind: 'evaluation_result',
      attemptId: 'duplicate',
      recordedAt: thursday,
      outcome: 'incorrect',
    },
    {
      ...evidence,
      id: 'hint',
      kind: 'support_event',
      supportKind: 'hint_reveal',
      hintNumber: 1,
      recordedAt: thursday,
    },
  ]);
  await db.progressEntries.bulkAdd([
    {
      ...fields,
      id: 'complete',
      itemId: 'done',
      status: 'completed',
      completedAt: wednesday,
      confidence: 0,
    },
    {
      ...fields,
      id: 'old-completion',
      itemId: 'reopened',
      status: 'started',
      completedAt: thursday,
      confidence: 0,
    },
    {
      ...fields,
      id: 'no-completion-time',
      itemId: 'missing-time',
      status: 'completed',
      confidence: 0,
    },
  ]);

  await db.activityEntries.add({
    id: 'workout',
    date: '2026-04-02',
    activityId: 'walk',
    unit: 'seconds',
    amount: 20,
    createdAt: thursday,
    updatedAt: thursday,
  });

  const week = getOsloWeek(new Date('2026-04-03T12:00:00Z'));
  expect(await readLearningDays(week)).toEqual([
    '2026-03-30',
    '2026-03-31',
    '2026-04-01',
  ]);

  await db.progressEntries.update('complete', { status: 'started' });
  closeSharedDatabase();
  getSharedDatabase(defaultTestMigrationContext);
  expect(await readLearningDays(week)).toEqual(['2026-03-30', '2026-03-31']);
});
