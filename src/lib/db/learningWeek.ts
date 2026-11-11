import { osloDate, type OsloWeek } from '@/lib/time/osloWeek';

import { getSharedDatabase } from './database';

function learningDate(week: OsloWeek, timestamp: string | undefined) {
  if (timestamp === undefined) return null;
  const instant = new Date(timestamp);
  if (!Number.isFinite(instant.getTime())) return null;
  const date = osloDate(instant);
  return date >= week.start && date <= week.today ? date : null;
}

export function deriveLearningDays(
  week: OsloWeek,
  timestamps: Iterable<string | undefined>,
): string[] {
  const days = new Set<string>();
  for (const timestamp of timestamps) {
    const date = learningDate(week, timestamp);
    if (date !== null) days.add(date);
  }
  return [...days].sort();
}

/** Read qualifying records across programmes in one snapshot. Return dates only. */
export async function readLearningDays(week: OsloWeek): Promise<string[]> {
  const db = getSharedDatabase();
  return db.transaction(
    'r',
    db.studySessions,
    db.progressEntries,
    db.learnerEvidence,
    async () => {
      const days = new Set<string>();
      const record = (timestamp: string | undefined) => {
        const date = learningDate(week, timestamp);
        if (date !== null) days.add(date);
      };
      await db.studySessions.each(({ startedAt }) => record(startedAt));
      await db.progressEntries
        .where('status')
        .equals('completed')
        .each(({ completedAt }) => record(completedAt));
      await db.learnerEvidence.each((row) => {
        if (row.kind === 'exercise_attempt') record(row.recordedAt);
      });
      return [...days].sort();
    },
  );
}
