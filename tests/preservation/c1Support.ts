import { initializeDatabase, listCourseItems, listCourseUnits } from '@/lib/db';
import type { CourseItem, CourseUnit } from '@/lib/domain';
import { bundledCourseSeed } from '@/seed';

import {
  createTestDatabase,
  type TestDatabaseContext,
} from '../db/testDatabase';

/**
 * Epic C / C1 preservation support. Test-only helpers shared by the C1
 * baseline evidence suites. They exercise the real repositories over the real
 * bundled CS50 catalogue; nothing here is imported by product code.
 */

export const c1Timestamp = '2026-09-19T12:00:00.000Z';

/** Monotonic ISO clock so repository timestamps are deterministic. */
export function createIncrementingClock(start = c1Timestamp, stepMs = 1000) {
  let current = Date.parse(start);

  return () => {
    const value = new Date(current).toISOString();
    current += stepMs;
    return value;
  };
}

/** A fresh isolated database initialized from the real bundled CS50 seed. */
export async function createSeededDatabase(
  label: string,
): Promise<TestDatabaseContext> {
  const context = createTestDatabase(`c1-${label}`);
  await initializeDatabase({
    db: context.db,
    now: createIncrementingClock(),
    seed: bundledCourseSeed,
  });
  return context;
}

/** The catalogue as materialized by the real seed sync. */
export async function readMaterializedCatalogue(
  context: TestDatabaseContext,
): Promise<{ items: CourseItem[]; units: CourseUnit[] }> {
  const [units, items] = await Promise.all([
    listCourseUnits(undefined, { db: context.db }),
    listCourseItems(undefined, { db: context.db }),
  ]);
  return { items, units };
}
