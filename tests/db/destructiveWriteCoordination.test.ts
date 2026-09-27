import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const coordinationMocks = vi.hoisted(() => ({
  beginDestructiveLocalWrite: vi.fn(),
  beginLocalWrite: vi.fn(),
}));

vi.mock('@/lib/storage', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  beginDestructiveLocalWrite: coordinationMocks.beginDestructiveLocalWrite,
  beginLocalWrite: coordinationMocks.beginLocalWrite,
}));

import {
  getDatabaseSnapshot,
  initializeDatabase,
  resetAllData,
  restoreDatabaseFromBackup,
  upsertProgress,
  upsertProgressAndAwardXp,
} from '@/lib/db';
import {
  createTestDatabase,
  sampleCourseSeed,
  type TestDatabaseContext,
} from './testDatabase';
import { cs50CatalogueId, cs50Policy } from '../programmes/cs50Policy';

function createLease() {
  return {
    abort: vi.fn(),
    complete: vi.fn(),
  };
}

describe('destructive repository write coordination', () => {
  let testDatabase: TestDatabaseContext | null = null;

  beforeEach(() => {
    coordinationMocks.beginDestructiveLocalWrite.mockReset();
    coordinationMocks.beginLocalWrite.mockReset();
    coordinationMocks.beginDestructiveLocalWrite.mockImplementation(async () =>
      createLease(),
    );
    coordinationMocks.beginLocalWrite.mockImplementation(() => createLease());
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await testDatabase?.cleanup();
    testDatabase = null;
  });

  it('waits for exclusive presence before reset and releases it after commit', async () => {
    testDatabase = createTestDatabase('destructive-reset');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    coordinationMocks.beginDestructiveLocalWrite.mockReset();
    coordinationMocks.beginLocalWrite.mockReset();
    coordinationMocks.beginLocalWrite.mockImplementation(() => {
      throw new Error('Reset must not acquire an ordinary write lease.');
    });
    const lease = createLease();
    let resolveLease: (lease: ReturnType<typeof createLease>) => void = () =>
      undefined;
    const leaseReady = new Promise<ReturnType<typeof createLease>>(
      (resolve) => {
        resolveLease = resolve;
      },
    );
    coordinationMocks.beginDestructiveLocalWrite.mockReturnValue(leaseReady);
    const firstClear = vi.spyOn(testDatabase.db.appMeta, 'clear');
    const reset = resetAllData({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    const observedReset = reset.then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ error, ok: false as const }),
    );

    try {
      await Promise.resolve();
      expect(
        coordinationMocks.beginDestructiveLocalWrite,
      ).toHaveBeenCalledTimes(1);
      expect(firstClear).not.toHaveBeenCalled();
    } finally {
      resolveLease(lease);
      await observedReset;
    }

    const outcome = await observedReset;
    expect(outcome).toMatchObject({ ok: true });
    expect(firstClear).toHaveBeenCalledTimes(1);
    expect(coordinationMocks.beginLocalWrite).not.toHaveBeenCalled();
    expect(lease.complete).toHaveBeenCalledTimes(1);
    expect(lease.abort).not.toHaveBeenCalled();
  });

  it('aborts exclusive presence when restore rolls back', async () => {
    testDatabase = createTestDatabase('destructive-restore');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    coordinationMocks.beginDestructiveLocalWrite.mockReset();
    coordinationMocks.beginLocalWrite.mockReset();
    coordinationMocks.beginLocalWrite.mockImplementation(() => {
      throw new Error('Restore must not acquire an ordinary write lease.');
    });
    const lease = createLease();
    coordinationMocks.beginDestructiveLocalWrite.mockResolvedValue(lease);
    vi.spyOn(testDatabase.db.courseUnits, 'bulkAdd').mockRejectedValueOnce(
      new Error('Injected restore failure.'),
    );

    await expect(
      restoreDatabaseFromBackup(before, {
        db: testDatabase.db,
        fileName: 'destructive-restore.json',
        seed: sampleCourseSeed,
      }),
    ).rejects.toThrow('Injected restore failure.');

    expect(coordinationMocks.beginDestructiveLocalWrite).toHaveBeenCalledTimes(
      1,
    );
    expect(coordinationMocks.beginLocalWrite).not.toHaveBeenCalled();
    expect(lease.abort).toHaveBeenCalledTimes(1);
    expect(lease.complete).not.toHaveBeenCalled();
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);
  });

  it('keeps ordinary repository writes on the non-destructive lease path', async () => {
    testDatabase = createTestDatabase('ordinary-write');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    coordinationMocks.beginDestructiveLocalWrite.mockReset();
    coordinationMocks.beginLocalWrite.mockReset();
    const lease = createLease();
    coordinationMocks.beginLocalWrite.mockReturnValue(lease);

    await expect(
      upsertProgress(
        {
          confidence: 3,
          itemId: 'week-0-lecture',
          status: 'started',
        },
        { db: testDatabase.db },
      ),
    ).resolves.toMatchObject({
      itemId: 'week-0-lecture',
      status: 'started',
    });

    expect(coordinationMocks.beginLocalWrite).toHaveBeenCalledTimes(1);
    expect(coordinationMocks.beginDestructiveLocalWrite).not.toHaveBeenCalled();
    expect(lease.complete).toHaveBeenCalledTimes(1);
    expect(lease.abort).not.toHaveBeenCalled();
  });

  it('rejects a destructive operation nested under an ordinary coordinated transaction', async () => {
    testDatabase = createTestDatabase('nested-destructive-write');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    coordinationMocks.beginDestructiveLocalWrite.mockReset();
    coordinationMocks.beginLocalWrite.mockReset();
    const lease = createLease();
    coordinationMocks.beginLocalWrite.mockReturnValue(lease);

    vi.spyOn(testDatabase.db.progressEntries, 'put').mockImplementationOnce(
      () =>
        Dexie.Promise.resolve().then(async () => {
          await resetAllData({
            db: testDatabase!.db,
            seed: sampleCourseSeed,
          });

          return 'unreachable-progress-id';
        }),
    );

    await expect(
      upsertProgressAndAwardXp(
        {
          confidence: 3,
          itemId: 'week-0-lecture',
          status: 'completed',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
        },
      ),
    ).rejects.toThrow(
      'Destructive repository writes cannot inherit an ordinary coordinated transaction.',
    );

    expect(coordinationMocks.beginDestructiveLocalWrite).not.toHaveBeenCalled();
    expect(lease.abort).toHaveBeenCalledTimes(1);
    expect(lease.complete).not.toHaveBeenCalled();
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);
  });
});
