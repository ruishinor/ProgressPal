import {
  createProgressPalDatabase,
  deleteDatabaseByName,
  type DatabaseMigrationContext,
  type ProgressPalDatabase,
} from '@/lib/db/database';
import type { CourseSeed } from '@/lib/domain';

let databaseCounter = 0;

export type TestDatabaseContext = {
  cleanup: () => Promise<void>;
  db: ProgressPalDatabase;
  name: string;
};

/**
 * The default test migration context (Epic C / C6): authorizes exactly
 * `sampleCourseSeed`'s catalogue for programme `cs50x`, matching the real
 * `cs50x-2026` definition's identity. A test exercising unauthorized-catalogue
 * or missing/conflicting-context behavior supplies its own context instead.
 */
export const defaultTestMigrationContext: DatabaseMigrationContext = {
  programmeId: 'cs50x',
  authorizedCatalogues: [{ courseId: 'cs50x-2026', programmeId: 'cs50x' }],
};

export function createTestDatabase(
  label = 'db',
  migrationContext: DatabaseMigrationContext = defaultTestMigrationContext,
): TestDatabaseContext {
  databaseCounter += 1;

  const name = `progresspal-test-${label}-${databaseCounter}`;
  const db = createProgressPalDatabase(migrationContext, name);

  return {
    name,
    db,
    cleanup: async () => {
      db.close();
      await deleteDatabaseByName(name);
    },
  };
}

export function createClock(...timestamps: string[]) {
  let index = 0;

  return () => {
    const nextTimestamp =
      timestamps[Math.min(index, Math.max(timestamps.length - 1, 0))];

    index += 1;

    if (nextTimestamp === undefined) {
      throw new Error('createClock requires at least one timestamp.');
    }

    return nextTimestamp;
  };
}

export const sampleCourseSeed: CourseSeed = {
  courseId: 'cs50x-2026',
  title: 'CS50x 2026',
  dataVersion: 1,
  sourceCheckedDate: '2026-06-01',
  units: [
    {
      id: 'week-0',
      order: 0,
      title: 'Week 0',
      type: 'week',
      sourceYear: 2026,
      required: true,
      items: [
        {
          id: 'week-0-lecture',
          type: 'lecture',
          title: 'Lecture',
          required: true,
          estimatedMinutes: 120,
          order: 0,
        },
        {
          id: 'week-0-shorts',
          type: 'shorts',
          title: 'Shorts',
          required: false,
          estimatedMinutes: 45,
          order: 1,
        },
      ],
    },
    {
      id: 'final-project',
      order: 1,
      title: 'Final Project',
      type: 'final_project',
      sourceYear: 2026,
      required: true,
      items: [
        {
          id: 'final-project-plan',
          type: 'project_task',
          title: 'Plan milestone',
          required: true,
          estimatedMinutes: 180,
          order: 0,
        },
      ],
    },
  ],
};
