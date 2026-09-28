import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addStudySessionAndAwardXp,
  correctStudySessionAssignment,
  getDatabaseSnapshot,
  initializeDatabase,
  logMediaProgressAndAwardXp,
  recordBackupEvent,
  resetAllData,
  restoreDatabaseFromBackup,
  upsertProgress,
  upsertProgressAndAwardXp,
} from '@/lib/db';
import {
  createProgressPalDatabase,
  type ProgressPalDatabase,
} from '@/lib/db/database';
import {
  captureLocalDataRevision,
  getLocalCoordinationStatus,
  localCoordinationStorageKeys,
  markLocalDataSynchronized,
  startLocalDataCoordination,
  type LocalCoordinationMessage,
} from '@/lib/storage';
import {
  createTestDatabase,
  defaultTestMigrationContext,
  sampleCourseSeed,
  type TestDatabaseContext,
} from './testDatabase';
import { cs50CatalogueId, cs50Policy } from '../programmes/cs50Policy';

const legacyVersionOneStoreDefinitions = {
  app_meta: '&id, schemaVersion, seedVersion',
  learner_profile: '&id, updatedAt, preferredTheme',
  course_units: '&id, courseId, [courseId+order], type, required',
  course_items: '&id, unitId, [unitId+order], type, required',
  progress_entries: '&id, &itemId, status, completedAt',
  study_sessions: '&id, unitId, itemId, mode, startedAt, endedAt',
  xp_transactions: '&id, sourceType, sourceId, awardedAt',
  achievement_definitions: '&id, category, ruleType',
  achievement_unlocks: '&id, &achievementId, unlockedAt, triggerSourceId',
  backups: '&id, type, createdAt',
} as const;

type TestLockMode = 'exclusive' | 'shared';

type PendingTestLockRequest<T = unknown> = {
  callback: (lock: Lock | null) => T | PromiseLike<T>;
  mode: TestLockMode;
  name: string;
  reject: (error: unknown) => void;
  resolve: (value: T | PromiseLike<T>) => void;
  signal?: AbortSignal;
};

class TestLockManager {
  private readonly exclusiveHolders = new Set<string>();
  private readonly queues = new Map<string, PendingTestLockRequest[]>();
  private readonly sharedHolderCounts = new Map<string, number>();

  async hold(name: string, mode: TestLockMode) {
    let release: () => void = () => undefined;
    let reportAcquired: () => void = () => undefined;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const acquired = new Promise<void>((resolve) => {
      reportAcquired = resolve;
    });
    const request = this.request(name, { mode }, async (lock) => {
      if (lock === null) {
        throw new Error(`Test lock ${name} was not acquired.`);
      }

      reportAcquired();
      await released;
    });

    await acquired;

    return async () => {
      release();
      await request;
    };
  }

  isHeld(name: string) {
    return this.exclusiveHolders.has(name) || this.sharedHolderCounts.has(name);
  }

  request<T>(
    name: string,
    options: LockOptions,
    callback: (lock: Lock | null) => T | PromiseLike<T>,
  ) {
    const mode = options.mode ?? 'exclusive';

    return new Promise<T>((resolve, reject) => {
      const pending: PendingTestLockRequest<T> = {
        callback,
        mode,
        name,
        reject,
        resolve,
        signal: options.signal,
      };

      if (options.signal?.aborted === true) {
        reject(new DOMException('Lock request aborted.', 'AbortError'));
        return;
      }

      if (options.ifAvailable === true) {
        if (this.canGrant(name, mode)) {
          this.grant(pending);
        } else {
          void Promise.resolve(callback(null)).then(resolve, reject);
        }
        return;
      }

      if (this.canGrant(name, mode) && !this.queues.has(name)) {
        this.grant(pending);
        return;
      }

      const queue = this.queues.get(name) ?? [];
      queue.push(pending as PendingTestLockRequest);
      this.queues.set(name, queue);

      options.signal?.addEventListener(
        'abort',
        () => {
          const currentQueue = this.queues.get(name);
          const index = currentQueue?.indexOf(
            pending as PendingTestLockRequest,
          );

          if (currentQueue === undefined || index === undefined || index < 0) {
            return;
          }

          currentQueue.splice(index, 1);
          if (currentQueue.length === 0) {
            this.queues.delete(name);
          }
          reject(new DOMException('Lock request aborted.', 'AbortError'));
        },
        { once: true },
      );
    });
  }

  private canGrant(name: string, mode: TestLockMode) {
    if (this.exclusiveHolders.has(name)) {
      return false;
    }

    return mode === 'shared' || !this.sharedHolderCounts.has(name);
  }

  private drain(name: string) {
    const queue = this.queues.get(name);

    if (queue === undefined) {
      return;
    }

    while (queue.length > 0) {
      const next = queue[0];

      if (!this.canGrant(name, next.mode)) {
        break;
      }

      queue.shift();
      this.grant(next);

      if (next.mode === 'exclusive') {
        break;
      }
    }

    if (queue.length === 0) {
      this.queues.delete(name);
    }
  }

  private grant<T>(request: PendingTestLockRequest<T>) {
    if (request.mode === 'exclusive') {
      this.exclusiveHolders.add(request.name);
    } else {
      this.sharedHolderCounts.set(
        request.name,
        (this.sharedHolderCounts.get(request.name) ?? 0) + 1,
      );
    }

    const lock = {
      mode: request.mode,
      name: request.name,
    } as Lock;

    void Promise.resolve()
      .then(() => request.callback(lock))
      .then(
        (value) => {
          this.release(request);
          request.resolve(value);
        },
        (error) => {
          this.release(request);
          request.reject(error);
        },
      );
  }

  private release<T>(request: PendingTestLockRequest<T>) {
    if (request.mode === 'exclusive') {
      this.exclusiveHolders.delete(request.name);
    } else {
      const remaining = (this.sharedHolderCounts.get(request.name) ?? 1) - 1;

      if (remaining === 0) {
        this.sharedHolderCounts.delete(request.name);
      } else {
        this.sharedHolderCounts.set(request.name, remaining);
      }
    }

    this.drain(request.name);
  }
}

async function createLegacyVersionOneFixture(databaseName: string) {
  const legacyDatabase = new Dexie(databaseName);

  legacyDatabase.version(1).stores(legacyVersionOneStoreDefinitions);
  await legacyDatabase.open();
  await legacyDatabase.table('app_meta').add({
    id: 'app-meta',
    appVersion: '0.0.1-test',
    createdAt: '2026-06-01T08:00:00.000Z',
    schemaVersion: 1,
    seedVersion: 0,
    updatedAt: '2026-06-01T08:00:00.000Z',
  });
  await legacyDatabase.table('learner_profile').add({
    id: 'learner-profile',
    avatarConfig: { face: 'round' },
    createdAt: '2026-06-01T08:00:00.000Z',
    displayName: 'Legacy Learner',
    preferredTheme: 'system',
    reducedMotion: false,
    targetMinutesPerWeek: 240,
    targetStudyDays: ['monday', 'wednesday'],
    updatedAt: '2026-06-01T08:00:00.000Z',
  });
  legacyDatabase.close();
}

async function getNativeDatabaseVersion(databaseName: string) {
  const databaseInfo = (await indexedDB.databases()).find(
    (candidate) => candidate.name === databaseName,
  );

  return databaseInfo?.version ?? null;
}

describe('repository local-write coordination', () => {
  let testDatabase: TestDatabaseContext | null = null;
  let additionalTestDatabase: TestDatabaseContext | null = null;
  let lockManager: TestLockManager;
  const peerLockReleases: Array<() => Promise<void>> = [];
  let restoreNavigatorLocks: () => void = () => undefined;
  let secondaryDatabase: ProgressPalDatabase | null = null;
  let stopCoordination: (() => void) | null = null;

  beforeEach(() => {
    lockManager = new TestLockManager();
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      globalThis.navigator,
      'locks',
    );

    Object.defineProperty(globalThis.navigator, 'locks', {
      configurable: true,
      value: lockManager as unknown as LockManager,
    });
    restoreNavigatorLocks = () => {
      if (originalDescriptor === undefined) {
        Reflect.deleteProperty(globalThis.navigator, 'locks');
      } else {
        Object.defineProperty(
          globalThis.navigator,
          'locks',
          originalDescriptor,
        );
      }
    };
  });

  afterEach(async () => {
    stopCoordination?.();
    stopCoordination = null;
    await Promise.all(peerLockReleases.splice(0).map((release) => release()));
    restoreNavigatorLocks();
    restoreNavigatorLocks = () => undefined;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    secondaryDatabase?.close();
    secondaryDatabase = null;
    await additionalTestDatabase?.cleanup();
    additionalTestDatabase = null;
    await testDatabase?.cleanup();
    testDatabase = null;
    localStorage.removeItem(localCoordinationStorageKeys.message);
    localStorage.removeItem(localCoordinationStorageKeys.revision);
  });

  async function holdPeerTabLocks() {
    const releasePresence = await lockManager.hold(
      localCoordinationStorageKeys.presenceLock,
      'shared',
    );
    const releaseWriter = await lockManager.hold(
      localCoordinationStorageKeys.writerLock,
      'exclusive',
    );
    let released = false;
    const release = async () => {
      if (released) {
        return;
      }

      released = true;
      await releaseWriter();
      await releasePresence();
    };

    peerLockReleases.push(release);
    return release;
  }

  async function synchronizeAfterOwnershipTransfer(
    database: ProgressPalDatabase,
  ) {
    await vi.waitFor(() => {
      expect(getLocalCoordinationStatus()).toMatchObject({
        phase: 'ready',
        writeOwnership: 'owned',
      });
    });
    const token = captureLocalDataRevision();
    await getDatabaseSnapshot({ db: database });
    expect(markLocalDataSynchronized(token)).toBe(true);
  }

  function dispatchPeerMessage(kind: LocalCoordinationMessage['kind']) {
    const message: LocalCoordinationMessage = {
      id: `peer-${kind}-${Date.now()}`,
      kind,
      revision: 0,
      sentAt: Date.now(),
      tabId: 'peer-tab',
    };

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: localCoordinationStorageKeys.message,
        newValue: JSON.stringify(message),
      }),
    );
  }

  it('blocks ordinary and destructive repository writes while a peer tab is active', async () => {
    testDatabase = createTestDatabase('coordinated-write');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    testDatabase.db.close();
    const releasePeer = await holdPeerTabLocks();
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    await expect(
      upsertProgress(
        { itemId: 'week-0-lecture', status: 'started', confidence: 2 },
        { db: testDatabase.db },
      ),
    ).rejects.toMatchObject({
      name: 'LocalWriteBlockedError',
      reason: 'peer-active',
    });
    await expect(
      resetAllData({ db: testDatabase.db, seed: sampleCourseSeed }),
    ).rejects.toThrow(
      'Close the other ProgressPal tab before replacing or resetting local data.',
    );
    await expect(
      correctStudySessionAssignment(
        { sessionId: 'saved-session', itemId: 'week-0-lecture' },
        { db: testDatabase.db },
      ),
    ).rejects.toMatchObject({
      name: 'LocalWriteBlockedError',
      reason: 'peer-active',
    });
    await expect(
      restoreDatabaseFromBackup(before, {
        db: testDatabase.db,
        fileName: 'peer-blocked.json',
        seed: sampleCourseSeed,
      }),
    ).rejects.toThrow(
      'Close the other ProgressPal tab before replacing or resetting local data.',
    );
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);

    await releasePeer();
    await synchronizeAfterOwnershipTransfer(testDatabase.db);
    await expect(
      upsertProgress(
        { itemId: 'week-0-lecture', status: 'started', confidence: 2 },
        { db: testDatabase.db },
      ),
    ).resolves.toMatchObject({ itemId: 'week-0-lecture', status: 'started' });
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
  });

  it('blocks database creation before IndexedDB can write while a peer tab is active', async () => {
    testDatabase = createTestDatabase('coordinated-create');
    await holdPeerTabLocks();
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    await expect(
      initializeDatabase({
        db: testDatabase.db,
        seed: sampleCourseSeed,
      }),
    ).rejects.toMatchObject({
      name: 'LocalWriteBlockedError',
      reason: 'peer-active',
    });
    expect(await getNativeDatabaseVersion(testDatabase.name)).toBeNull();
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);
  });

  it('records one revision for database creation plus base and seed initialization', async () => {
    testDatabase = createTestDatabase('coordinated-create-initialize');
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    await expect(
      initializeDatabase({
        db: testDatabase.db,
        seed: sampleCourseSeed,
      }),
    ).resolves.toMatchObject({
      appMeta: { schemaVersion: 2 },
      createdAppMeta: true,
      createdLearnerProfile: true,
      seedSync: {
        itemsAdded: 3,
        seedVersion: 1,
        unitsAdded: 2,
      },
    });
    expect(await getNativeDatabaseVersion(testDatabase.name)).toBe(20);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
  });

  it('releases the database-open lease after an open failure', async () => {
    testDatabase = createTestDatabase('coordinated-open-failure');
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;
    const open = vi
      .spyOn(testDatabase.db, 'open')
      .mockRejectedValueOnce(new Error('Injected database open failure.'));

    await expect(
      initializeDatabase({
        db: testDatabase.db,
        seed: sampleCourseSeed,
      }),
    ).rejects.toThrow('Injected database open failure.');
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);
    open.mockRestore();

    session.stop();
    await vi.waitFor(() => {
      expect(lockManager.isHeld(localCoordinationStorageKeys.writerLock)).toBe(
        false,
      );
    });
    const replacement = startLocalDataCoordination(() => undefined);
    stopCoordination = replacement.stop;
    await replacement.ready;
    expect(getLocalCoordinationStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      peerActive: false,
    });
  });

  it('blocks schema migration before IndexedDB can write while a peer tab is active', async () => {
    testDatabase = createTestDatabase('coordinated-migration');
    await createLegacyVersionOneFixture(testDatabase.name);
    expect(await getNativeDatabaseVersion(testDatabase.name)).toBe(10);
    const releasePeer = await holdPeerTabLocks();
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    await expect(
      initializeDatabase({
        appVersion: '1.3.0',
        db: testDatabase.db,
      }),
    ).rejects.toMatchObject({
      name: 'LocalWriteBlockedError',
      reason: 'peer-active',
    });
    expect(await getNativeDatabaseVersion(testDatabase.name)).toBe(10);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);

    await releasePeer();
    session.stop();
    await vi.waitFor(() => {
      expect(
        lockManager.isHeld(localCoordinationStorageKeys.presenceLock),
      ).toBe(false);
      expect(lockManager.isHeld(localCoordinationStorageKeys.writerLock)).toBe(
        false,
      );
    });
    const replacement = startLocalDataCoordination(() => undefined);
    stopCoordination = replacement.stop;
    await replacement.ready;
    await expect(
      initializeDatabase({
        appVersion: '1.3.0',
        db: testDatabase.db,
      }),
    ).resolves.toMatchObject({
      appMeta: { appVersion: '1.3.0', schemaVersion: 2 },
    });
    expect(await getNativeDatabaseVersion(testDatabase.name)).toBe(20);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
  });

  it('rolls back the entire base initialization when its second singleton write fails', async () => {
    testDatabase = createTestDatabase('coordinated-base-rollback');
    await testDatabase.db.open();
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;
    vi.spyOn(testDatabase.db.learnerProfile, 'add').mockRejectedValueOnce(
      new Error('Injected learner profile failure.'),
    );

    await expect(initializeDatabase({ db: testDatabase.db })).rejects.toThrow(
      'Injected learner profile failure.',
    );
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);
  });

  it('records one revision when seed initialization fails after earlier stages committed', async () => {
    testDatabase = createTestDatabase('coordinated-partial-initialization');
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;
    vi.spyOn(testDatabase.db.courseUnits, 'bulkAdd').mockRejectedValueOnce(
      new Error('Injected seed initialization failure.'),
    );

    await expect(
      initializeDatabase({
        db: testDatabase.db,
        seed: sampleCourseSeed,
      }),
    ).rejects.toThrow('Injected seed initialization failure.');

    expect(await getNativeDatabaseVersion(testDatabase.name)).toBe(20);
    expect(await testDatabase.db.appMeta.count()).toBe(1);
    expect(await testDatabase.db.learnerProfile.count()).toBe(1);
    expect(await testDatabase.db.courseUnits.count()).toBe(0);
    expect(await testDatabase.db.courseItems.count()).toBe(0);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
    expect(getLocalCoordinationStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      revision: 1,
      stale: true,
    });
  });

  it('allows current no-op initialization in a peer-active read-only tab', async () => {
    testDatabase = createTestDatabase('coordinated-no-op');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    testDatabase.db.close();
    await holdPeerTabLocks();
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    await expect(
      initializeDatabase({
        db: testDatabase.db,
        seed: sampleCourseSeed,
      }),
    ).resolves.toMatchObject({
      createdAppMeta: false,
      createdLearnerProfile: false,
      seedSync: {
        itemsAdded: 0,
        itemsUpdated: 0,
        unitsAdded: 0,
        unitsUpdated: 0,
      },
    });
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);
  });

  it('blocks required initialization repairs while a peer tab is active', async () => {
    testDatabase = createTestDatabase('coordinated-initialization');
    await initializeDatabase({
      appVersion: '1.3.0',
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    await testDatabase.db.appMeta.update('app-meta', {
      appVersion: '1.2.0',
      updatedAt: '2026-07-01T10:00:00.000Z',
    });
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const releasePeer = await holdPeerTabLocks();
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    await expect(
      initializeDatabase({
        appVersion: '1.3.0',
        db: testDatabase.db,
        seed: sampleCourseSeed,
      }),
    ).rejects.toMatchObject({
      name: 'LocalWriteBlockedError',
      reason: 'peer-active',
    });
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);

    await releasePeer();
    await synchronizeAfterOwnershipTransfer(testDatabase.db);
    await expect(
      initializeDatabase({
        appVersion: '1.3.0',
        db: testDatabase.db,
        seed: sampleCourseSeed,
      }),
    ).resolves.toMatchObject({
      appMeta: { appVersion: '1.3.0' },
    });
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
  });

  it('blocks a required seed-catalog repair without changing the partial database', async () => {
    testDatabase = createTestDatabase('coordinated-seed-repair');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    await testDatabase.db.courseItems.delete('week-0-shorts');
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const releasePeer = await holdPeerTabLocks();
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    await expect(
      initializeDatabase({
        db: testDatabase.db,
        seed: sampleCourseSeed,
      }),
    ).rejects.toMatchObject({
      name: 'LocalWriteBlockedError',
      reason: 'peer-active',
    });
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);

    await releasePeer();
    await synchronizeAfterOwnershipTransfer(testDatabase.db);
    await initializeDatabase({ db: testDatabase.db, seed: sampleCourseSeed });
    expect(
      await testDatabase.db.courseItems.get('week-0-shorts'),
    ).toBeDefined();
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
  });

  it('blocks a required derived-catalog repair without changing the partial database', async () => {
    testDatabase = createTestDatabase('coordinated-derived-repair');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    const derivedSlice = await testDatabase.db.contentSlices
      .where('assetId')
      .equals('week-0-lecture-asset')
      .first();
    expect(derivedSlice).toBeDefined();
    await testDatabase.db.contentSlices.delete(derivedSlice!.id);
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const releasePeer = await holdPeerTabLocks();
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    await expect(
      initializeDatabase({
        db: testDatabase.db,
        seed: sampleCourseSeed,
      }),
    ).rejects.toMatchObject({
      name: 'LocalWriteBlockedError',
      reason: 'peer-active',
    });
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);

    await releasePeer();
    await synchronizeAfterOwnershipTransfer(testDatabase.db);
    await initializeDatabase({ db: testDatabase.db, seed: sampleCourseSeed });
    expect(
      await testDatabase.db.contentSlices.get(derivedSlice!.id),
    ).toBeDefined();
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
  });

  it('rolls back catalog and derived repairs together and converges on retry', async () => {
    testDatabase = createTestDatabase('coordinated-resumable-seed');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    const baseline = await getDatabaseSnapshot({ db: testDatabase.db });
    const updatedSeed = {
      ...sampleCourseSeed,
      dataVersion: 2,
      units: sampleCourseSeed.units.map((unit) => ({
        ...unit,
        items: unit.items.map((item) =>
          item.id === 'week-0-lecture'
            ? { ...item, title: 'Lecture, revised' }
            : item,
        ),
      })),
    };
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;
    const derivedWrite = vi
      .spyOn(testDatabase.db.contentAssets, 'put')
      .mockRejectedValueOnce(new Error('Injected derived catalog failure.'));

    await expect(
      initializeDatabase({ db: testDatabase.db, seed: updatedSeed }),
    ).rejects.toThrow('Injected derived catalog failure.');
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(
      baseline,
    );
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);

    derivedWrite.mockRestore();
    await initializeDatabase({ db: testDatabase.db, seed: updatedSeed });
    const converged = await getDatabaseSnapshot({ db: testDatabase.db });
    expect(
      converged.contentAssets.find(
        (asset) => asset.id === 'week-0-lecture-asset',
      )?.title,
    ).toBe('Lecture, revised');
    expect(converged.courseItems).toHaveLength(baseline.courseItems.length);
    expect(converged.contentAssets).toHaveLength(baseline.contentAssets.length);
    expect(converged.contentSlices).toHaveLength(baseline.contentSlices.length);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
  });

  it('broadcasts a committed base repair even when the requested write is invalid', async () => {
    testDatabase = createTestDatabase('coordinated-repair-before-error');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    await upsertProgress(
      {
        confidence: 2,
        id: 'progress-original',
        itemId: 'week-0-lecture',
        status: 'started',
      },
      { db: testDatabase.db },
    );
    await testDatabase.db.learnerProfile.clear();
    const progressBefore = await testDatabase.db.progressEntries.toArray();
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    await expect(
      upsertProgress(
        {
          confidence: 2,
          id: 'progress-conflict',
          itemId: 'week-0-lecture',
          status: 'started',
        },
        { db: testDatabase.db },
      ),
    ).rejects.toThrow(
      'input id does not match the existing record for this itemId',
    );

    expect(await testDatabase.db.learnerProfile.count()).toBe(1);
    expect(await testDatabase.db.progressEntries.toArray()).toEqual(
      progressBefore,
    );
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
  });

  it('rolls back a composite write when its final XP summary read fails', async () => {
    testDatabase = createTestDatabase('coordinated-composite-rollback');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;
    const xpRead = vi
      .spyOn(testDatabase.db.xpTransactions, 'toArray')
      .mockRejectedValueOnce(new Error('Injected XP summary failure.'));

    await expect(
      upsertProgressAndAwardXp(
        {
          confidence: 2,
          itemId: 'week-0-lecture',
          status: 'completed',
        },
        {
          catalogueId: cs50CatalogueId,
          policy: cs50Policy,
          db: testDatabase.db,
        },
      ),
    ).rejects.toThrow('Injected XP summary failure.');
    xpRead.mockRestore();

    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);
  });

  it('rolls back and cleanly retries a media composite write after its XP summary read fails', async () => {
    testDatabase = createTestDatabase('coordinated-media-rollback');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;
    const input = {
      assetId: 'week-0-lecture-asset',
      endSecond: 600,
      energyAfter: 3,
      energyBefore: 4,
      startSecond: 0,
      stoppedBecause: 'interruption' as const,
    };
    vi.spyOn(testDatabase.db.xpTransactions, 'toArray').mockRejectedValueOnce(
      new Error('Injected XP summary failure.'),
    );

    await expect(
      logMediaProgressAndAwardXp(input, {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: testDatabase.db,
      }),
    ).rejects.toThrow('Injected XP summary failure.');
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);

    await expect(
      logMediaProgressAndAwardXp(input, {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: testDatabase.db,
      }),
    ).resolves.toMatchObject({
      event: { assetId: 'week-0-lecture-asset' },
    });
    const afterRetry = await getDatabaseSnapshot({ db: testDatabase.db });
    expect(afterRetry.mediaProgressEvents).toHaveLength(1);
    expect(afterRetry.xpTransactions).toHaveLength(1);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
  });

  it('rolls back and cleanly retries a study-session composite write after its XP summary read fails', async () => {
    testDatabase = createTestDatabase('coordinated-study-rollback');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    await addStudySessionAndAwardXp(
      {
        durationMinutes: 30,
        endedAt: '2026-07-15T10:30:00.000Z',
        id: 'study-session-existing',
        itemId: 'week-0-lecture',
        mode: 'watching',
        startedAt: '2026-07-15T10:00:00.000Z',
        unitId: 'week-0',
      },
      { catalogueId: cs50CatalogueId, policy: cs50Policy, db: testDatabase.db },
    );
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;
    const input = {
      durationMinutes: 30,
      endedAt: '2026-07-16T10:30:00.000Z',
      id: 'study-session-rollback',
      itemId: 'week-0-lecture',
      mode: 'watching' as const,
      startedAt: '2026-07-16T10:00:00.000Z',
      unitId: 'week-0',
    };
    vi.spyOn(testDatabase.db.xpTransactions, 'toArray').mockRejectedValueOnce(
      new Error('Injected XP summary failure.'),
    );

    await expect(
      addStudySessionAndAwardXp(input, {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: testDatabase.db,
      }),
    ).rejects.toThrow('Injected XP summary failure.');
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);

    await expect(
      addStudySessionAndAwardXp(input, {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: testDatabase.db,
      }),
    ).resolves.toMatchObject({
      studySession: { id: 'study-session-rollback' },
    });
    const afterRetry = await getDatabaseSnapshot({ db: testDatabase.db });
    expect(afterRetry.studySessions).toHaveLength(
      before.studySessions.length + 1,
    );
    expect(afterRetry.xpTransactions).toHaveLength(
      before.xpTransactions.length + 1,
    );
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
  });

  it('records exactly one revision for a saved-session assignment correction', async () => {
    testDatabase = createTestDatabase('coordinated-study-correction');
    await initializeDatabase({ db: testDatabase.db, seed: sampleCourseSeed });
    await addStudySessionAndAwardXp(
      {
        id: 'saved-session',
        itemId: 'week-0-lecture',
        unitId: 'week-0',
        durationMinutes: 30,
        mode: 'watching',
        startedAt: '2026-07-16T10:00:00.000Z',
        endedAt: '2026-07-16T10:30:00.000Z',
      },
      { catalogueId: cs50CatalogueId, policy: cs50Policy, db: testDatabase.db },
    );
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;
    await correctStudySessionAssignment(
      { sessionId: 'saved-session', itemId: 'week-0-lecture' },
      { db: testDatabase.db },
    );
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
  });

  it('does not record a revision for an idempotent study-session composite', async () => {
    testDatabase = createTestDatabase('coordinated-study-idempotent');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    const input = {
      durationMinutes: 30,
      endedAt: '2026-07-16T10:30:00.000Z',
      id: 'study-session-idempotent',
      itemId: 'week-0-lecture',
      mode: 'watching' as const,
      startedAt: '2026-07-16T10:00:00.000Z',
      unitId: 'week-0',
    };
    await addStudySessionAndAwardXp(input, {
      catalogueId: cs50CatalogueId,
      policy: cs50Policy,
      db: testDatabase.db,
    });
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    await expect(
      addStudySessionAndAwardXp(input, {
        catalogueId: cs50CatalogueId,
        policy: cs50Policy,
        db: testDatabase.db,
      }),
    ).resolves.toMatchObject({
      studySession: { id: 'study-session-idempotent' },
    });

    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);
  });

  it('rejects repository writes nested in an uncoordinated external transaction', async () => {
    testDatabase = createTestDatabase('uncoordinated-external-transaction');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    const before = await getDatabaseSnapshot({ db: testDatabase.db });
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    await expect(
      testDatabase.db.transaction(
        'rw',
        [
          testDatabase.db.appMeta,
          testDatabase.db.learnerProfile,
          testDatabase.db.progressEntries,
        ],
        async () =>
          await upsertProgress(
            {
              confidence: 2,
              itemId: 'week-0-lecture',
              status: 'started',
            },
            { db: testDatabase!.db },
          ),
      ),
    ).rejects.toThrow(
      'Repository writes cannot run inside an uncoordinated external transaction.',
    );
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);
  });

  it('independently coordinates a write nested under an unrelated database transaction', async () => {
    additionalTestDatabase = createTestDatabase('unrelated-transaction-owner');
    testDatabase = createTestDatabase('unrelated-transaction-target');
    await initializeDatabase({
      db: additionalTestDatabase.db,
      seed: sampleCourseSeed,
    });
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    await expect(
      additionalTestDatabase.db.transaction(
        'r',
        additionalTestDatabase.db.appMeta,
        async () =>
          await Dexie.waitFor(
            upsertProgress(
              {
                confidence: 2,
                itemId: 'week-0-lecture',
                status: 'started',
              },
              { db: testDatabase!.db },
            ),
          ),
      ),
    ).resolves.toMatchObject({
      itemId: 'week-0-lecture',
      status: 'started',
    });
    expect(await testDatabase.db.progressEntries.count()).toBe(1);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
  });

  it('does not inherit a coordinated transaction across database objects', async () => {
    testDatabase = createTestDatabase('coordinated-transaction-owner');
    additionalTestDatabase = createTestDatabase(
      'coordinated-transaction-target',
    );
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    await initializeDatabase({
      db: additionalTestDatabase.db,
      seed: sampleCourseSeed,
    });
    const ownerBefore = await getDatabaseSnapshot({ db: testDatabase.db });
    const targetBefore = await getDatabaseSnapshot({
      db: additionalTestDatabase.db,
    });
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;
    const originalClear = testDatabase.db.appMeta.clear.bind(
      testDatabase.db.appMeta,
    );

    vi.spyOn(testDatabase.db.appMeta, 'clear').mockImplementationOnce(() =>
      Dexie.Promise.resolve()
        .then(async () => {
          dispatchPeerMessage('hello');
          await recordBackupEvent(
            {
              fileName: 'cross-database-export.json',
              type: 'export',
            },
            { db: additionalTestDatabase!.db },
          );
        })
        .then(() => originalClear()),
    );

    await expect(
      resetAllData({ db: testDatabase.db, seed: sampleCourseSeed }),
    ).rejects.toMatchObject({
      name: 'LocalWriteBlockedError',
      reason: 'discovering',
    });
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(
      ownerBefore,
    );
    expect(
      await getDatabaseSnapshot({ db: additionalTestDatabase.db }),
    ).toEqual(targetBefore);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(0);
  });

  it('records one creation revision for concurrent objects sharing a database name', async () => {
    testDatabase = createTestDatabase('coordinated-shared-name-open');
    secondaryDatabase = createProgressPalDatabase(
      defaultTestMigrationContext,
      testDatabase.name,
    );
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;

    const [firstSnapshot, secondSnapshot] = await Promise.all([
      getDatabaseSnapshot({ db: testDatabase.db }),
      getDatabaseSnapshot({ db: secondaryDatabase }),
    ]);

    expect(firstSnapshot).toEqual(secondSnapshot);
    expect(await getNativeDatabaseVersion(testDatabase.name)).toBe(20);
    expect(
      Number(localStorage.getItem(localCoordinationStorageKeys.revision)),
    ).toBe(1);
  });

  it('attributes an in-flight write to its original coordinator before closing on pagehide', async () => {
    testDatabase = createTestDatabase('coordinated-pagehide-in-flight');
    await initializeDatabase({
      db: testDatabase.db,
      seed: sampleCourseSeed,
    });
    const broadcastMessages: LocalCoordinationMessage[] = [];

    class RecordingBroadcastChannel {
      addEventListener() {
        return undefined;
      }

      close() {
        return undefined;
      }

      postMessage(message: LocalCoordinationMessage) {
        broadcastMessages.push(message);
      }
    }

    vi.stubGlobal('BroadcastChannel', RecordingBroadcastChannel);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Injected unavailable durable revision storage.');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Injected unavailable durable revision storage.');
    });
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;
    const originalPut = testDatabase.db.progressEntries.put.bind(
      testDatabase.db.progressEntries,
    );
    let releaseWrite: () => void = () => {};
    let reportWriteStarted: () => void = () => {};
    const writeGate = new Promise<void>((resolve) => {
      releaseWrite = resolve;
    });
    const writeStarted = new Promise<void>((resolve) => {
      reportWriteStarted = resolve;
    });
    vi.spyOn(testDatabase.db.progressEntries, 'put').mockImplementationOnce(
      (value) =>
        Dexie.Promise.resolve().then(async () => {
          reportWriteStarted();
          await writeGate;
          return originalPut(value);
        }),
    );
    const pendingWrite = upsertProgress(
      {
        confidence: 2,
        itemId: 'week-0-lecture',
        status: 'started',
      },
      { db: testDatabase.db },
    );
    await writeStarted;

    const pageHide = new Event('pagehide');
    Object.defineProperty(pageHide, 'persisted', { value: true });
    window.dispatchEvent(pageHide);
    expect(getLocalCoordinationStatus()).toMatchObject({
      blockReason: 'unavailable',
      canWrite: false,
      revision: 0,
    });

    releaseWrite();
    await pendingWrite;

    expect(broadcastMessages.slice(-2).map(({ kind }) => kind)).toEqual([
      'write',
      'closing',
    ]);
    expect(getLocalCoordinationStatus()).toMatchObject({
      blockReason: 'unavailable',
      canWrite: false,
      revision: 1,
    });
  });
});
