import {
  enrolInProgramme,
  ensureCourseCatalogFromSeed,
  initializeDatabase,
  type DatabaseMigrationContext,
} from '@/lib/db';
import type { ExerciseAttemptInput } from '@/lib/db';
import type { CourseSeed } from '@/lib/domain';

import {
  createTestDatabase,
  sampleCourseSeed,
  type TestDatabaseContext,
} from './testDatabase';

/**
 * Epic E data-layer fixture: a CS50-active device that also authorizes the
 * Programvareutvikling catalogue (as the production composition root does
 * once the programme is registered) and, unless told otherwise, is enrolled
 * in it. Content bindings use synthetic, shape-valid hashes; the real
 * content binding is exercised by the provider and lifecycle suites.
 */

export const p2ProgrammeId = 'programvareutvikling';
export const p2CatalogueId = 'programvareutvikling-2026';

export const p2MigrationContext: DatabaseMigrationContext = {
  programmeId: 'cs50x',
  authorizedCatalogues: [
    { courseId: 'cs50x-2026', programmeId: 'cs50x' },
    { courseId: p2CatalogueId, programmeId: p2ProgrammeId },
  ],
};

/**
 * A small module/lesson-shaped catalogue under the Programvareutvikling
 * catalogue identity, for data-layer tests that need materialized lesson
 * items (lesson positions, backups) without depending on the real export.
 */
export const p2TestSeed: CourseSeed = {
  courseId: p2CatalogueId,
  title: 'Programvareutvikling',
  dataVersion: 1,
  sourceCheckedDate: '2026-10-03',
  units: [
    {
      id: 's1-m01',
      order: 0,
      title: 'Kom i gang: kjør, les feil, commit',
      type: 'module',
      sourceYear: 2026,
      required: true,
      items: [
        {
          id: 's1-m01-o01',
          type: 'lesson',
          title: 'Sett opp arbeidsstedet',
          required: true,
          estimatedMinutes: 70,
          order: 0,
        },
        {
          id: 's1-m01-o02',
          type: 'lesson',
          title: 'Terminalen og mapper',
          required: true,
          estimatedMinutes: 60,
          order: 1,
        },
      ],
    },
    {
      id: 's1-m02',
      order: 1,
      title: 'Verdier, typer og input',
      type: 'module',
      sourceYear: 2026,
      required: true,
      items: [
        {
          id: 's1-m02-o01',
          type: 'lesson',
          title: 'Variabler og verditabeller',
          required: true,
          estimatedMinutes: 95,
          order: 0,
        },
        {
          id: 's1-m02-o05',
          type: 'lesson',
          title: 'Når typene ikke stemmer',
          required: true,
          estimatedMinutes: 170,
          order: 1,
        },
      ],
    },
  ],
};

export const hashA = 'a'.repeat(64);
export const hashB = 'b'.repeat(64);

export const evidenceTime = '2026-10-03T10:00:00.000Z';

export function attemptInput(
  overrides: Partial<ExerciseAttemptInput> = {},
): ExerciseAttemptInput {
  return {
    id: 'attempt-1',
    programmeId: p2ProgrammeId,
    contentVersion: 1,
    subjectId: 's1-m01-p01-e05',
    contentHash: hashA,
    responseMode: 'mcq',
    answer: { selected: ['a'] },
    ...overrides,
  };
}

export async function createP2Device(
  label: string,
  options: { enrol?: boolean; materialize?: boolean } = {},
): Promise<TestDatabaseContext> {
  const context = createTestDatabase(label, p2MigrationContext);

  await initializeDatabase({
    db: context.db,
    seed: sampleCourseSeed,
    now: () => evidenceTime,
  });

  if (options.enrol ?? true) {
    await enrolInProgramme(p2ProgrammeId, {
      db: context.db,
      now: () => evidenceTime,
    });
  }

  if (options.materialize ?? false) {
    await ensureCourseCatalogFromSeed(p2TestSeed, {
      db: context.db,
      now: () => evidenceTime,
    });
  }

  return context;
}
