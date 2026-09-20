import { afterEach, describe, expect, it } from 'vitest';

import { initializeDatabase } from '@/lib/db';
import { bundledCourseSeed } from '@/seed';
import { createTestDatabase, type TestDatabaseContext } from './testDatabase';
import { installDatabaseAccessProbe } from './accessProbe';

describe('database access probe', () => {
  let testDatabase: TestDatabaseContext | null = null;

  afterEach(async () => {
    await testDatabase?.cleanup();
    testDatabase = null;
  });

  async function createSeededProbe() {
    testDatabase = createTestDatabase('access-probe');
    const probe = installDatabaseAccessProbe(testDatabase.db);

    await initializeDatabase({
      db: testDatabase.db,
      seed: bundledCourseSeed,
    });
    probe.reset();

    return { db: testDatabase.db, probe };
  }

  it('distinguishes keyed, materialized query, cursor scan, and N+1 access', async () => {
    const { db, probe } = await createSeededProbe();

    await db.courseItems.get('week-0-lecture');
    let access = probe.snapshot();

    expect(access.operations).toHaveLength(1);
    expect(access.operations[0]).toMatchObject({
      materializedRows: 1,
      operation: 'get',
      rowsReturned: 1,
      rowsScanned: 1,
      store: 'course_items',
      writes: 0,
    });

    probe.reset();
    const allUnits = await db.courseUnits.toArray();
    access = probe.snapshot();

    expect(access.operations).toHaveLength(1);
    expect(access.operations[0]).toMatchObject({
      materializedRows: allUnits.length,
      operation: 'query',
      rowsReturned: allUnits.length,
      rowsScanned: allUnits.length,
      store: 'course_units',
    });

    probe.reset();
    const weekZeroItems = await db.courseItems
      .where('unitId')
      .equals('week-0')
      .toArray();
    access = probe.snapshot();

    expect(access.operations).toHaveLength(1);
    expect(access.operations[0]).toMatchObject({
      index: 'unitId',
      materializedRows: weekZeroItems.length,
      operation: 'query',
      rowsReturned: weekZeroItems.length,
      rowsScanned: weekZeroItems.length,
      store: 'course_items',
    });

    probe.reset();
    let cursorRows = 0;
    await db.courseItems
      .where('unitId')
      .equals('week-0')
      .each(() => {
        cursorRows += 1;
      });
    access = probe.snapshot();

    expect(access.operations).toHaveLength(1);
    expect(access.operations[0]).toMatchObject({
      index: 'unitId',
      materializedRows: 0,
      operation: 'cursor',
      rowsReturned: cursorRows,
      rowsScanned: cursorRows,
      store: 'course_items',
    });

    const units = await db.courseUnits.toArray();
    probe.reset();

    await Promise.all(
      units.map((unit) =>
        db.courseItems.where('unitId').equals(unit.id).toArray(),
      ),
    );
    access = probe.snapshot();

    expect(
      access.operations.filter(
        (operation) =>
          operation.store === 'course_items' && operation.operation === 'query',
      ),
    ).toHaveLength(units.length);
    expect(access.writesObserved).toBe(0);
  });

  it('exposes the real cursor operation to an async barrier hook', async () => {
    testDatabase = createTestDatabase('access-probe-barrier');
    const seenOperations: Array<{
      operation: string;
      store: string;
      transactionId: string;
    }> = [];
    const probe = installDatabaseAccessProbe(testDatabase.db, {
      beforeCursor(operation) {
        seenOperations.push(operation);
        return Promise.resolve();
      },
    });

    await initializeDatabase({
      db: testDatabase.db,
      seed: bundledCourseSeed,
    });
    seenOperations.length = 0;
    probe.reset();

    let cursorRows = 0;
    await testDatabase.db.courseItems
      .where('unitId')
      .equals('week-0')
      .each(() => {
        cursorRows += 1;
      });

    const access = probe.snapshot();

    expect(seenOperations).toHaveLength(1);
    expect(seenOperations[0]).toMatchObject({
      operation: 'cursor',
      store: 'course_items',
      transactionId: access.operations[0]?.transactionId,
    });
    expect(access.operations[0]).toMatchObject({
      operation: 'cursor',
      rowsReturned: cursorRows,
      rowsScanned: cursorRows,
      store: 'course_items',
    });
  });
});
