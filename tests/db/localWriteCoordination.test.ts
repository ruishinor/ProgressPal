import { afterEach, describe, expect, it } from 'vitest';

import {
  getDatabaseSnapshot,
  initializeDatabase,
  resetAllData,
  upsertProgress,
} from '@/lib/db';
import {
  localCoordinationStorageKeys,
  startLocalDataCoordination,
  type LocalCoordinationMessage,
} from '@/lib/storage';
import {
  createTestDatabase,
  sampleCourseSeed,
  type TestDatabaseContext,
} from './testDatabase';

describe('repository local-write coordination', () => {
  let testDatabase: TestDatabaseContext | null = null;
  let stopCoordination: (() => void) | null = null;

  afterEach(async () => {
    stopCoordination?.();
    stopCoordination = null;
    await testDatabase?.cleanup();
    testDatabase = null;
    localStorage.removeItem(localCoordinationStorageKeys.message);
    localStorage.removeItem(localCoordinationStorageKeys.revision);
  });

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
    const session = startLocalDataCoordination(() => undefined);
    stopCoordination = session.stop;
    await session.ready;
    dispatchPeerMessage('hello');

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
    expect(await getDatabaseSnapshot({ db: testDatabase.db })).toEqual(before);

    dispatchPeerMessage('closing');
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
});
