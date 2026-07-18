import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ControlledBroadcastChannel,
  FakeLockManager,
  flushCoordinationMicrotasks,
  installNavigatorLocks,
} from './localDataCoordinationFakes';

type CoordinationModule = typeof import('@/lib/storage/localDataCoordination');
type CoordinationSession = ReturnType<
  CoordinationModule['startLocalDataCoordination']
>;

const channelName = 'progresspal-coordination-v1';
const presenceLockName = 'progresspal:local-data:presence';
const revisionStorageKey = 'progresspal:coordination:revision';
const writerLockName = 'progresspal:local-data:writer';

const sessions: CoordinationSession[] = [];
let restoreNavigatorLocks: () => void = () => undefined;

async function importFreshCoordinationModule() {
  vi.resetModules();
  return import('@/lib/storage/localDataCoordination');
}

function setNavigatorLocks(lockManager: unknown) {
  restoreNavigatorLocks();
  restoreNavigatorLocks = installNavigatorLocks(lockManager);
}

async function finishInitialDiscovery(
  ...startedSessions: CoordinationSession[]
) {
  await flushCoordinationMicrotasks();
  await vi.advanceTimersByTimeAsync(250);
  await flushCoordinationMicrotasks();
  await Promise.all(startedSessions.map(({ ready }) => ready));
}

async function startTwoBrowserSessions(
  lockManager: FakeLockManager,
  deliveryMode: 'delay' | 'deliver' | 'drop',
) {
  setNavigatorLocks(lockManager);
  ControlledBroadcastChannel.deliveryMode = deliveryMode;
  const firstModule = await importFreshCoordinationModule();
  const secondModule = await importFreshCoordinationModule();
  const firstSession = firstModule.startLocalDataCoordination(() => undefined);
  const secondSession = secondModule.startLocalDataCoordination(
    () => undefined,
  );
  sessions.push(firstSession, secondSession);
  await finishInitialDiscovery(firstSession, secondSession);

  return {
    firstModule,
    firstSession,
    secondModule,
    secondSession,
  };
}

function splitOwnerAndContender(
  firstModule: CoordinationModule,
  firstSession: CoordinationSession,
  secondModule: CoordinationModule,
  secondSession: CoordinationSession,
) {
  const firstCanWrite = firstModule.getLocalCoordinationStatus().canWrite;
  const secondCanWrite = secondModule.getLocalCoordinationStatus().canWrite;
  expect([firstCanWrite, secondCanWrite].filter(Boolean)).toHaveLength(1);

  return firstCanWrite
    ? {
        contenderModule: secondModule,
        contenderSession: secondSession,
        ownerModule: firstModule,
        ownerSession: firstSession,
      }
    : {
        contenderModule: firstModule,
        contenderSession: firstSession,
        ownerModule: secondModule,
        ownerSession: secondSession,
      };
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  ControlledBroadcastChannel.reset();
  vi.stubGlobal('BroadcastChannel', ControlledBroadcastChannel);
});

afterEach(async () => {
  for (const session of sessions.splice(0).reverse()) {
    session.stop();
  }
  await flushCoordinationMicrotasks();
  restoreNavigatorLocks();
  restoreNavigatorLocks = () => undefined;
  ControlledBroadcastChannel.reset();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
});

describe('browser Web Locks local-data coordination', () => {
  it('grants exactly one writer across simultaneous sessions when notifications are dropped', async () => {
    const lockManager = new FakeLockManager();
    const { firstModule, secondModule } = await startTwoBrowserSessions(
      lockManager,
      'drop',
    );
    const statuses = [
      firstModule.getLocalCoordinationStatus(),
      secondModule.getLocalCoordinationStatus(),
    ];

    expect(statuses.filter(({ canWrite }) => canWrite)).toHaveLength(1);
    expect(
      statuses.filter(({ blockReason }) => blockReason === 'peer-active'),
    ).toHaveLength(1);
    expect(lockManager.heldCount(writerLockName, 'exclusive')).toBe(1);
    expect(lockManager.heldCount(presenceLockName, 'shared')).toBe(2);
  });

  it('keeps lock authority exclusive before and after delayed notifications arrive', async () => {
    const lockManager = new FakeLockManager();
    const { firstModule, secondModule } = await startTwoBrowserSessions(
      lockManager,
      'delay',
    );

    expect(
      [firstModule, secondModule].filter(
        (module) => module.getLocalCoordinationStatus().canWrite,
      ),
    ).toHaveLength(1);

    for (let pass = 0; pass < 4; pass += 1) {
      ControlledBroadcastChannel.flushDelayed();
      await flushCoordinationMicrotasks();
    }

    const statuses = [
      firstModule.getLocalCoordinationStatus(),
      secondModule.getLocalCoordinationStatus(),
    ];
    expect(statuses.filter(({ canWrite }) => canWrite)).toHaveLength(1);
    expect(statuses.every(({ peerActive }) => peerActive)).toBe(true);
    expect(lockManager.heldCount(writerLockName, 'exclusive')).toBe(1);
  });

  it('fails closed when the Web Locks API is absent', async () => {
    setNavigatorLocks(undefined);
    const module = await importFreshCoordinationModule();
    const session = module.startLocalDataCoordination(() => undefined);
    sessions.push(session);

    await finishInitialDiscovery(session);

    expect(module.getLocalCoordinationStatus()).toMatchObject({
      blockReason: 'unavailable',
      canWrite: false,
    });
    expect(() => module.beginLocalWrite()).toThrowError(
      expect.objectContaining({ reason: 'unavailable' }),
    );
  });

  it.each([presenceLockName, writerLockName])(
    'fails closed when the %s request rejects',
    async (rejectedLockName) => {
      const lockManager = new FakeLockManager();
      lockManager.rejectRequestsFor(rejectedLockName);
      setNavigatorLocks(lockManager);
      const module = await importFreshCoordinationModule();
      const session = module.startLocalDataCoordination(() => undefined);
      sessions.push(session);

      await finishInitialDiscovery(session);

      expect(module.getLocalCoordinationStatus()).toMatchObject({
        blockReason: 'unavailable',
        canWrite: false,
      });
      expect(lockManager.heldCount(writerLockName)).toBe(0);
    },
  );

  it('allows contended reads but requires a fresh token after lock ownership transfers', async () => {
    const lockManager = new FakeLockManager();
    const started = await startTwoBrowserSessions(lockManager, 'drop');
    const { contenderModule, ownerSession } = splitOwnerAndContender(
      started.firstModule,
      started.firstSession,
      started.secondModule,
      started.secondSession,
    );
    const contendedToken = contenderModule.captureLocalDataRevision();

    expect(contenderModule.markLocalDataSynchronized(contendedToken)).toBe(
      true,
    );
    expect(contenderModule.getLocalCoordinationStatus()).toMatchObject({
      blockReason: 'peer-active',
      canWrite: false,
      stale: false,
    });

    ownerSession.stop();
    await flushCoordinationMicrotasks();

    expect(contenderModule.getLocalCoordinationStatus()).toMatchObject({
      blockReason: 'discovering',
      canWrite: false,
      stale: true,
    });
    expect(contenderModule.validateLocalDataRevision(contendedToken)).toBe(
      false,
    );
    expect(contenderModule.markLocalDataSynchronized(contendedToken)).toBe(
      false,
    );

    await vi.advanceTimersByTimeAsync(250);
    await flushCoordinationMicrotasks();
    expect(contenderModule.getLocalCoordinationStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      stale: true,
    });

    const rereadToken = contenderModule.captureLocalDataRevision();
    expect(contenderModule.markLocalDataSynchronized(rereadToken)).toBe(true);
    expect(contenderModule.getLocalCoordinationStatus().canWrite).toBe(true);
    expect(lockManager.heldCount(writerLockName, 'exclusive')).toBe(1);
  });

  it('refuses destructive presence while another participant exists, then releases and reacquires the shared guard', async () => {
    const lockManager = new FakeLockManager();
    const started = await startTwoBrowserSessions(lockManager, 'drop');
    const { contenderSession, ownerModule } = splitOwnerAndContender(
      started.firstModule,
      started.firstSession,
      started.secondModule,
      started.secondSession,
    );

    await expect(
      ownerModule.beginDestructiveLocalWrite(),
    ).rejects.toMatchObject({
      name: 'LocalWriteBlockedError',
      reason: 'peer-active',
    });
    expect(lockManager.heldCount(presenceLockName, 'shared')).toBe(2);
    expect(lockManager.heldCount(presenceLockName, 'exclusive')).toBe(0);
    expect(lockManager.heldCount(writerLockName, 'exclusive')).toBe(1);
    expect(ownerModule.getLocalCoordinationStatus().canWrite).toBe(true);

    contenderSession.stop();
    await flushCoordinationMicrotasks();
    const destructiveLease = await ownerModule.beginDestructiveLocalWrite();

    expect(lockManager.heldCount(presenceLockName, 'shared')).toBe(0);
    expect(lockManager.heldCount(presenceLockName, 'exclusive')).toBe(1);
    expect(ownerModule.getLocalCoordinationStatus().canWrite).toBe(false);

    destructiveLease.abort();
    await flushCoordinationMicrotasks();

    expect(lockManager.heldCount(presenceLockName, 'exclusive')).toBe(0);
    expect(lockManager.heldCount(presenceLockName, 'shared')).toBe(1);
    expect(lockManager.heldCount(writerLockName, 'exclusive')).toBe(1);
    expect(ownerModule.getLocalCoordinationStatus().canWrite).toBe(true);
  });

  it('keeps a synchronously started replacement session as the sole active global session', async () => {
    const lockManager = new FakeLockManager();
    setNavigatorLocks(lockManager);
    ControlledBroadcastChannel.deliveryMode = 'drop';
    const module = await importFreshCoordinationModule();
    let replacementSession: CoordinationSession | null = null;
    let replacementStarted = false;
    const firstSession = module.startLocalDataCoordination(() => {
      if (!replacementStarted) {
        replacementStarted = true;
        replacementSession = module.startLocalDataCoordination(() => undefined);
      }
    });
    sessions.push(firstSession);
    expect(replacementSession).not.toBeNull();
    sessions.push(replacementSession as unknown as CoordinationSession);

    await finishInitialDiscovery(
      firstSession,
      replacementSession as unknown as CoordinationSession,
    );

    expect(module.getLocalCoordinationStatus().canWrite).toBe(true);
    expect(lockManager.heldCount(writerLockName, 'exclusive')).toBe(1);
    expect(lockManager.heldCount(presenceLockName, 'shared')).toBe(1);

    firstSession.stop();
    await flushCoordinationMicrotasks();

    expect(module.getLocalCoordinationStatus().canWrite).toBe(true);
    expect(lockManager.heldCount(writerLockName, 'exclusive')).toBe(1);
  });

  it('defers pagehide write and closing notifications until an active lease commits', async () => {
    const lockManager = new FakeLockManager();
    setNavigatorLocks(lockManager);
    const receivedKinds: string[] = [];
    const receiver = new ControlledBroadcastChannel(channelName);
    receiver.addEventListener('message', (event) => {
      receivedKinds.push((event.data as { kind: string }).kind);
    });
    const module = await importFreshCoordinationModule();
    const session = module.startLocalDataCoordination(() => undefined);
    sessions.push(session);
    await finishInitialDiscovery(session);
    await flushCoordinationMicrotasks();
    receivedKinds.length = 0;
    const lease = module.beginLocalWrite();

    window.dispatchEvent(new Event('pagehide'));
    await flushCoordinationMicrotasks();

    expect(receivedKinds).not.toContain('closing');
    expect(lockManager.heldCount(writerLockName, 'exclusive')).toBe(1);

    lease.complete();
    await flushCoordinationMicrotasks();

    expect(receivedKinds.slice(-2)).toEqual(['write', 'closing']);
    expect(lockManager.heldCount(writerLockName)).toBe(0);
    receiver.close();
  });

  it('defers pagehide closing until an active lease aborts without publishing a write', async () => {
    const lockManager = new FakeLockManager();
    setNavigatorLocks(lockManager);
    const receivedKinds: string[] = [];
    const receiver = new ControlledBroadcastChannel(channelName);
    receiver.addEventListener('message', (event) => {
      receivedKinds.push((event.data as { kind: string }).kind);
    });
    const module = await importFreshCoordinationModule();
    const session = module.startLocalDataCoordination(() => undefined);
    sessions.push(session);
    await finishInitialDiscovery(session);
    await flushCoordinationMicrotasks();
    receivedKinds.length = 0;
    const lease = module.beginLocalWrite();

    window.dispatchEvent(new Event('pagehide'));
    await flushCoordinationMicrotasks();
    lease.abort();
    await flushCoordinationMicrotasks();

    expect(receivedKinds).not.toContain('write');
    expect(receivedKinds.at(-1)).toBe('closing');
    expect(lockManager.heldCount(writerLockName)).toBe(0);
    receiver.close();
  });

  it('exposes non-mutating stale-token validation and lets only marking clear stale state', async () => {
    const lockManager = new FakeLockManager();
    setNavigatorLocks(lockManager);
    ControlledBroadcastChannel.deliveryMode = 'drop';
    const module = await importFreshCoordinationModule();
    const session = module.startLocalDataCoordination(() => undefined);
    sessions.push(session);
    await finishInitialDiscovery(session);
    localStorage.setItem(revisionStorageKey, '2');
    expect(module.getLocalCoordinationStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      revision: 2,
      stale: true,
    });
    const token = module.captureLocalDataRevision();

    expect(module.validateLocalDataRevision(token)).toBe(true);
    expect(module.getLocalCoordinationStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      stale: true,
    });

    expect(module.markLocalDataSynchronized(token)).toBe(true);
    expect(module.getLocalCoordinationStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      stale: false,
    });
  });

  it('treats revision persistence failure as advisory while lock handoff still forces a reread', async () => {
    const lockManager = new FakeLockManager();
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      if (key === revisionStorageKey) {
        throw new Error('Injected revision persistence failure.');
      }
      originalSetItem.call(this, key, value);
    });
    const started = await startTwoBrowserSessions(lockManager, 'drop');
    const { contenderModule, ownerModule, ownerSession } =
      splitOwnerAndContender(
        started.firstModule,
        started.firstSession,
        started.secondModule,
        started.secondSession,
      );
    const lease = ownerModule.beginLocalWrite();

    lease.complete();

    expect(ownerModule.getLocalCoordinationStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      revision: 1,
      stale: true,
    });
    const freshOwnerToken = ownerModule.captureLocalDataRevision();
    expect(ownerModule.markLocalDataSynchronized(freshOwnerToken)).toBe(true);
    expect(ownerModule.getLocalCoordinationStatus().canWrite).toBe(true);
    expect(localStorage.getItem(revisionStorageKey)).toBeNull();

    ownerSession.stop();
    await flushCoordinationMicrotasks();
    await vi.advanceTimersByTimeAsync(250);
    await flushCoordinationMicrotasks();

    expect(contenderModule.getLocalCoordinationStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      revision: 0,
      stale: true,
    });
  });

  it.each(['NaN', '-1', '1.5', String(Number.MAX_SAFE_INTEGER + 1)])(
    'fails closed when browser revision metadata is %s',
    async (invalidRevision) => {
      const lockManager = new FakeLockManager();
      setNavigatorLocks(lockManager);
      localStorage.setItem(revisionStorageKey, invalidRevision);
      const module = await importFreshCoordinationModule();
      const session = module.startLocalDataCoordination(() => undefined);
      sessions.push(session);

      await finishInitialDiscovery(session);

      expect(module.getLocalCoordinationStatus()).toMatchObject({
        blockReason: 'unavailable',
        canWrite: false,
      });
    },
  );

  it('treats unreadable browser revision metadata as advisory under valid lock authority', async () => {
    const lockManager = new FakeLockManager();
    setNavigatorLocks(lockManager);
    const originalGetItem = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
      this: Storage,
      key,
    ) {
      if (key === revisionStorageKey) {
        throw new Error('Injected revision read failure.');
      }
      return originalGetItem.call(this, key);
    });
    const module = await importFreshCoordinationModule();
    const session = module.startLocalDataCoordination(() => undefined);
    sessions.push(session);

    await finishInitialDiscovery(session);

    expect(module.getLocalCoordinationStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      revision: 0,
    });
  });
});
