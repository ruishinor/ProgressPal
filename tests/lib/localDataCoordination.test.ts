import { describe, expect, it, vi } from 'vitest';

import {
  getLocalCoordinationStatus,
  LocalDataCoordinator,
  LocalWriteBlockedError,
  localCoordinationStorageKeys,
  startLocalDataCoordination,
  type LocalCoordinationMessage,
  type LocalCoordinationScheduler,
  type LocalCoordinationTransport,
} from '@/lib/storage';

class FakeTransport implements LocalCoordinationTransport {
  available = true;
  closeCount = 0;
  markUnavailableOnThrow = true;
  readonly posted: LocalCoordinationMessage[] = [];
  throwOnPost = false;
  throwOnSubscribe = false;
  private listener: ((message: LocalCoordinationMessage) => void) | null = null;

  close() {
    this.closeCount += 1;
    this.listener = null;
  }

  post(message: LocalCoordinationMessage) {
    if (this.throwOnPost) {
      if (this.markUnavailableOnThrow) {
        this.available = false;
      }
      throw new Error('Injected transport failure.');
    }

    this.posted.push(message);
  }

  isAvailable() {
    return this.available;
  }

  receive(message: LocalCoordinationMessage) {
    this.listener?.(message);
  }

  subscribe(listener: (message: LocalCoordinationMessage) => void) {
    if (this.throwOnSubscribe) {
      throw new Error('Injected subscription failure.');
    }

    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }
}

type ManualWriteOwnershipState = 'contended' | 'owned' | 'unavailable';

class ManualWriteOwnership {
  deferExclusivePresenceRestore = false;
  exclusivePresenceAvailable = true;
  exclusivePresenceAcquireCount = 0;
  exclusivePresenceReleaseCount = 0;
  stopCount = 0;
  private listener: ((state: ManualWriteOwnershipState) => void) | null = null;
  private resolveExclusivePresenceRestore: (() => void) | null = null;
  private restoreExclusivePresencePromise: Promise<void> | null = null;

  constructor(private state: ManualWriteOwnershipState) {}

  acquireExclusivePresence() {
    this.exclusivePresenceAcquireCount += 1;

    if (!this.exclusivePresenceAvailable) {
      return Promise.reject(new Error('Another ProgressPal tab is active.'));
    }

    let released = false;
    return Promise.resolve(() => {
      if (!released) {
        released = true;
        this.exclusivePresenceReleaseCount += 1;

        if (this.deferExclusivePresenceRestore) {
          this.restoreExclusivePresencePromise = new Promise<void>(
            (resolve) => {
              this.resolveExclusivePresenceRestore = resolve;
            },
          );
        }
      }

      return this.restoreExclusivePresencePromise ?? undefined;
    });
  }

  completeExclusivePresenceRestore() {
    this.resolveExclusivePresenceRestore?.();
    this.resolveExclusivePresenceRestore = null;
  }

  start(listener: (state: ManualWriteOwnershipState) => void) {
    this.listener = listener;
    listener(this.state);
    return Promise.resolve();
  }

  stop() {
    this.stopCount += 1;
    this.listener = null;
  }

  transition(state: ManualWriteOwnershipState) {
    this.state = state;
    this.listener?.(state);
  }
}

class ManualScheduler implements LocalCoordinationScheduler {
  private nextHandle = 1;
  private readonly intervals = new Map<number, () => void>();
  private readonly timeouts = new Map<number, () => void>();

  clearInterval(handle: ReturnType<typeof setInterval>) {
    this.intervals.delete(Number(handle));
  }

  clearTimeout(handle: ReturnType<typeof setTimeout>) {
    this.timeouts.delete(Number(handle));
  }

  runIntervals() {
    for (const callback of this.intervals.values()) {
      callback();
    }
  }

  runTimeouts() {
    const callbacks = [...this.timeouts.values()];
    this.timeouts.clear();
    callbacks.forEach((callback) => callback());
  }

  setInterval(callback: () => void) {
    const handle = this.nextHandle++;
    this.intervals.set(handle, callback);
    return handle as unknown as ReturnType<typeof setInterval>;
  }

  setTimeout(callback: () => void) {
    const handle = this.nextHandle++;
    this.timeouts.set(handle, callback);
    return handle as unknown as ReturnType<typeof setTimeout>;
  }
}

function peerMessage(
  kind: LocalCoordinationMessage['kind'],
  revision = 0,
): LocalCoordinationMessage {
  return {
    id: `peer-${kind}-${revision}`,
    kind,
    revision,
    sentAt: 1_000,
    tabId: 'peer-tab',
  };
}

function createCoordinator(
  options: {
    writeOwnership?: ManualWriteOwnership;
  } = {},
) {
  let persistedRevision = 0;
  let now = 1_000;
  const scheduler = new ManualScheduler();
  const transport = new FakeTransport();
  const coordinatorOptions = {
    discoveryMs: 10,
    heartbeatMs: 100,
    now: () => now,
    peerTimeoutMs: 500,
    readRevision: () => persistedRevision,
    scheduler,
    tabId: 'local-tab',
    transport,
    writeRevision: (revision: number) => {
      persistedRevision = revision;
    },
    writeOwnership: options.writeOwnership,
  };
  const coordinator = new LocalDataCoordinator(coordinatorOptions);

  return {
    advanceTo: (timestamp: number) => {
      now = timestamp;
    },
    coordinator,
    getPersistedRevision: () => persistedRevision,
    setPersistedRevision: (revision: number) => {
      persistedRevision = revision;
    },
    scheduler,
    transport,
  };
}

describe('local data coordination', () => {
  it('blocks writes during discovery and allows them after a peer-free handshake', async () => {
    const { coordinator, scheduler } = createCoordinator();
    const ready = coordinator.start();

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'discovering',
      canWrite: false,
      phase: 'discovering',
    });
    expect(() => coordinator.assertWriteAllowed()).toThrow(
      LocalWriteBlockedError,
    );

    scheduler.runTimeouts();
    await ready;

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      phase: 'ready',
    });
  });

  it('requires exclusive writer ownership even when peer messages are delayed', async () => {
    const ownerLock = new ManualWriteOwnership('owned');
    const contenderLock = new ManualWriteOwnership('contended');
    const owner = createCoordinator({ writeOwnership: ownerLock });
    const contender = createCoordinator({ writeOwnership: contenderLock });
    const ownerReady = owner.coordinator.start();
    const contenderReady = contender.coordinator.start();

    owner.scheduler.runTimeouts();
    contender.scheduler.runTimeouts();
    await Promise.all([ownerReady, contenderReady]);

    expect(owner.coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
    });
    expect(contender.coordinator.getStatus()).toMatchObject({
      blockReason: 'peer-active',
      canWrite: false,
      peerActive: true,
    });
  });

  it('allows an exact contended read acknowledgement but invalidates its token when writer ownership transfers', async () => {
    const writeOwnership = new ManualWriteOwnership('contended');
    const { coordinator, scheduler } = createCoordinator({ writeOwnership });
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    const tokenCapturedWhileContended = coordinator.captureRevision();

    expect(coordinator.markSynchronized(tokenCapturedWhileContended)).toBe(
      true,
    );
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'peer-active',
      canWrite: false,
      stale: false,
    });

    writeOwnership.transition('owned');

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'discovering',
      canWrite: false,
      phase: 'discovering',
      stale: true,
    });

    scheduler.runTimeouts();
    expect(coordinator.markSynchronized(tokenCapturedWhileContended)).toBe(
      false,
    );
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      phase: 'ready',
      stale: true,
    });

    expect(coordinator.markSynchronized(coordinator.captureRevision())).toBe(
      true,
    );
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      stale: false,
    });
  });

  it('keeps notification peers diagnostic without demoting the exclusive writer', async () => {
    const { coordinator, scheduler, transport } = createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    transport.receive(peerMessage('hello'));

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      peerActive: true,
    });

    transport.receive(peerMessage('closing'));
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      peerActive: false,
    });
  });

  it('keeps a remotely changed tab stale until it explicitly synchronizes', async () => {
    const { coordinator, scheduler, transport } = createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    transport.receive(peerMessage('write', 1));
    transport.receive(peerMessage('closing', 1));

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      peerActive: false,
      stale: true,
    });

    coordinator.markSynchronized(coordinator.captureRevision());
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      stale: false,
    });
  });

  it('only acknowledges the exact revision that application state actually read', async () => {
    const { coordinator, scheduler, transport } = createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    const revisionReadByApplication = coordinator.captureRevision();
    transport.receive(
      peerMessage('write', revisionReadByApplication.revision + 1),
    );
    transport.receive(
      peerMessage('closing', revisionReadByApplication.revision + 1),
    );

    expect(coordinator.markSynchronized(revisionReadByApplication)).toBe(false);
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      revision: revisionReadByApplication.revision + 1,
      stale: true,
    });
  });

  it('rejects synchronization while a local write lease is unsettled', async () => {
    const { coordinator, scheduler } = createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    const token = coordinator.captureRevision();
    const lease = coordinator.beginWrite();

    expect(coordinator.markSynchronized(token)).toBe(false);
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'write-active',
      canWrite: false,
      stale: true,
    });

    lease.abort();
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      stale: true,
    });
  });

  it('keeps synchronization stale when a same-tab write commits after the read', async () => {
    const { coordinator, scheduler } = createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    const token = coordinator.captureRevision();
    const lease = coordinator.beginWrite();

    lease.complete();

    expect(coordinator.markSynchronized(token)).toBe(false);
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      revision: token.revision + 1,
      stale: true,
    });
  });

  it('acknowledges a stable revision after application state is read', async () => {
    const { coordinator, scheduler, transport } = createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    transport.receive(peerMessage('write', 2));
    transport.receive(peerMessage('closing', 2));

    expect(coordinator.markSynchronized(coordinator.captureRevision())).toBe(
      true,
    );
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      revision: 2,
      stale: false,
    });
  });

  it('validates a current stale token without mutating synchronization state', async () => {
    const { coordinator, scheduler, transport } = createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    transport.receive(peerMessage('write', 2));
    transport.receive(peerMessage('closing', 2));
    const token = coordinator.captureRevision();

    expect(coordinator.validateRevision(token)).toBe(true);
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      revision: 2,
      stale: true,
    });

    expect(coordinator.markSynchronized(token)).toBe(true);
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      stale: false,
    });
  });

  it('rejects outdated, durably superseded, prior-epoch, and active-write revision tokens', async () => {
    const outdated = createCoordinator();
    const outdatedReady = outdated.coordinator.start();
    outdated.scheduler.runTimeouts();
    await outdatedReady;
    const outdatedToken = outdated.coordinator.captureRevision();
    outdated.transport.receive(peerMessage('write', 1));
    expect(outdated.coordinator.validateRevision(outdatedToken)).toBe(false);

    const durablySuperseded = createCoordinator();
    const durablySupersededReady = durablySuperseded.coordinator.start();
    durablySuperseded.scheduler.runTimeouts();
    await durablySupersededReady;
    const durablySupersededToken =
      durablySuperseded.coordinator.captureRevision();
    durablySuperseded.setPersistedRevision(1);
    expect(
      durablySuperseded.coordinator.validateRevision(durablySupersededToken),
    ).toBe(false);

    const priorEpoch = createCoordinator();
    const priorEpochReady = priorEpoch.coordinator.start();
    priorEpoch.scheduler.runTimeouts();
    await priorEpochReady;
    const priorEpochToken = priorEpoch.coordinator.captureRevision();
    const priorEpochLease = priorEpoch.coordinator.beginWrite();
    priorEpochLease.abort();
    expect(priorEpoch.coordinator.validateRevision(priorEpochToken)).toBe(
      false,
    );

    const activeWrite = createCoordinator();
    const activeWriteReady = activeWrite.coordinator.start();
    activeWrite.scheduler.runTimeouts();
    await activeWriteReady;
    const activeLease = activeWrite.coordinator.beginWrite();
    const activeWriteToken = activeWrite.coordinator.captureRevision();
    expect(activeWrite.coordinator.validateRevision(activeWriteToken)).toBe(
      false,
    );
    activeLease.abort();
  });

  it('acknowledges a stable read while contended without granting write authority', async () => {
    const writeOwnership = new ManualWriteOwnership('contended');
    const { coordinator, scheduler } = createCoordinator({ writeOwnership });
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    const token = coordinator.captureRevision();

    expect(coordinator.markSynchronized(token)).toBe(true);
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'peer-active',
      canWrite: false,
      peerActive: true,
      stale: false,
    });
  });

  it('rejects a revision token issued by a replaced coordinator', async () => {
    const first = createCoordinator();
    const firstReady = first.coordinator.start();
    first.scheduler.runTimeouts();
    await firstReady;
    const replacedCoordinatorToken = first.coordinator.captureRevision();

    const replacement = createCoordinator();
    const replacementReady = replacement.coordinator.start();
    replacement.scheduler.runTimeouts();
    await replacementReady;

    expect(
      replacement.coordinator.markSynchronized(replacedCoordinatorToken),
    ).toBe(false);
  });

  it('reconciles a newer revision carried only by a closing message', async () => {
    const { coordinator, scheduler, transport } = createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    transport.receive(peerMessage('closing', 5));

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      peerActive: false,
      revision: 5,
      stale: true,
    });
  });

  it('increments and broadcasts the revision after a successful write', async () => {
    const { coordinator, getPersistedRevision, scheduler, transport } =
      createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    coordinator.recordWrite();

    expect(getPersistedRevision()).toBe(1);
    expect(transport.posted.at(-1)).toMatchObject({
      kind: 'write',
      revision: 1,
      tabId: 'local-tab',
    });
  });

  it('requires a stable reread after every committed local write', async () => {
    const { coordinator, scheduler } = createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    const lease = coordinator.beginWrite();

    lease.complete();

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      revision: 1,
      stale: true,
    });
    expect(() => coordinator.beginWrite()).toThrow(LocalWriteBlockedError);

    expect(coordinator.markSynchronized(coordinator.captureRevision())).toBe(
      true,
    );
    expect(coordinator.getStatus().canWrite).toBe(true);
  });

  it('requires exclusive tab presence for destructive writes', async () => {
    const writeOwnership = new ManualWriteOwnership('owned');
    writeOwnership.exclusivePresenceAvailable = false;
    const { coordinator, getPersistedRevision, scheduler } = createCoordinator({
      writeOwnership,
    });
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    await expect(coordinator.beginDestructiveWrite()).rejects.toMatchObject({
      name: 'LocalWriteBlockedError',
      reason: 'peer-active',
    });

    expect(writeOwnership.exclusivePresenceAcquireCount).toBe(1);
    expect(getPersistedRevision()).toBe(0);
    expect(coordinator.getStatus().canWrite).toBe(true);
  });

  it('holds exclusive tab presence through destructive commit and releases it once', async () => {
    const writeOwnership = new ManualWriteOwnership('owned');
    const { coordinator, getPersistedRevision, scheduler } = createCoordinator({
      writeOwnership,
    });
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    const lease = await coordinator.beginDestructiveWrite();

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'discovering',
      canWrite: false,
    });

    lease.complete();

    await Promise.resolve();
    await Promise.resolve();

    expect(getPersistedRevision()).toBe(1);
    expect(writeOwnership.exclusivePresenceReleaseCount).toBe(1);
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      revision: 1,
      stale: true,
    });
  });

  it('stays fail-closed until shared presence is restored after a destructive abort', async () => {
    const writeOwnership = new ManualWriteOwnership('owned');
    writeOwnership.deferExclusivePresenceRestore = true;
    const { coordinator, scheduler } = createCoordinator({ writeOwnership });
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    const lease = await coordinator.beginDestructiveWrite();
    const tokenCapturedUnderExclusivePresence = coordinator.captureRevision();

    lease.abort();

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'discovering',
      canWrite: false,
    });
    expect(() => coordinator.beginWrite()).toThrow(LocalWriteBlockedError);
    expect(
      coordinator.markSynchronized(tokenCapturedUnderExclusivePresence),
    ).toBe(false);

    writeOwnership.completeExclusivePresenceRestore();
    await Promise.resolve();
    await Promise.resolve();

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      stale: true,
    });
    expect(coordinator.markSynchronized(coordinator.captureRevision())).toBe(
      true,
    );
    expect(coordinator.getStatus().canWrite).toBe(true);
  });

  it('expires a crashed peer after the bounded heartbeat timeout', async () => {
    const { advanceTo, coordinator, scheduler, transport } =
      createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    transport.receive(peerMessage('heartbeat'));

    advanceTo(1_501);
    scheduler.runIntervals();

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      peerActive: false,
    });
  });

  it('uses local receipt time rather than a delayed sender timestamp for peer liveness', async () => {
    const { advanceTo, coordinator, scheduler, transport } =
      createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    advanceTo(2_000);

    transport.receive({
      ...peerMessage('heartbeat'),
      sentAt: 0,
    });

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      peerActive: true,
    });

    advanceTo(2_501);
    scheduler.runIntervals();
    expect(coordinator.getStatus().peerActive).toBe(false);
  });

  it('expires peers even when an invalid sender timestamp is NaN', async () => {
    const { advanceTo, coordinator, scheduler, transport } =
      createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    transport.receive({
      ...peerMessage('heartbeat'),
      sentAt: Number.NaN,
    });
    expect(coordinator.getStatus().peerActive).toBe(true);

    advanceTo(1_501);
    scheduler.runIntervals();
    expect(coordinator.getStatus().peerActive).toBe(false);
  });

  it('fails closed when persisted revision advances without a delivered message', async () => {
    const { coordinator, scheduler, setPersistedRevision } =
      createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    const tokenBeforeMissedWrite = coordinator.captureRevision();
    setPersistedRevision(3);

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      revision: 3,
      stale: true,
    });
    expect(() => coordinator.assertWriteAllowed()).toThrow(
      LocalWriteBlockedError,
    );
    expect(coordinator.markSynchronized(tokenBeforeMissedWrite)).toBe(false);
  });

  it('retains a received revision when durable revision storage is unavailable', async () => {
    const { coordinator, scheduler, transport } = createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    transport.receive(peerMessage('heartbeat', 5));
    transport.receive(peerMessage('closing', 5));
    coordinator.markSynchronized(coordinator.captureRevision());

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      revision: 5,
      stale: false,
    });
  });

  it('fails closed when every tab-to-tab transport is unavailable', async () => {
    const { coordinator, scheduler, transport } = createCoordinator();
    transport.available = false;
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'unavailable',
      canWrite: false,
      phase: 'ready',
    });
    expect(() => coordinator.assertWriteAllowed()).toThrow(
      LocalWriteBlockedError,
    );
  });

  it('restarts peer discovery before writing after a transport recovers', async () => {
    const { coordinator, scheduler, transport } = createCoordinator();
    transport.available = false;
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    expect(coordinator.getStatus().blockReason).toBe('unavailable');
    const helloCountBeforeRecovery = transport.posted.filter(
      ({ kind }) => kind === 'hello',
    ).length;

    transport.available = true;

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'discovering',
      canWrite: false,
      phase: 'discovering',
    });
    expect(transport.posted.at(-1)?.kind).toBe('hello');
    expect(
      transport.posted.filter(({ kind }) => kind === 'hello'),
    ).toHaveLength(helloCountBeforeRecovery + 1);

    scheduler.runTimeouts();
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      phase: 'ready',
    });
  });

  it('restarts the full discovery interval when transport recovers during discovery', async () => {
    const { coordinator, scheduler, transport } = createCoordinator();
    transport.available = false;
    const ready = coordinator.start();
    const helloCountBeforeRecovery = transport.posted.filter(
      ({ kind }) => kind === 'hello',
    ).length;

    transport.available = true;

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'discovering',
      canWrite: false,
      phase: 'discovering',
    });
    expect(
      transport.posted.filter(({ kind }) => kind === 'hello'),
    ).toHaveLength(helloCountBeforeRecovery + 1);

    scheduler.runTimeouts();
    await ready;
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      phase: 'ready',
    });
  });

  it('fails closed before a revision can exceed Number.MAX_SAFE_INTEGER', async () => {
    const { coordinator, scheduler, setPersistedRevision } =
      createCoordinator();
    setPersistedRevision(Number.MAX_SAFE_INTEGER);
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'unavailable',
      canWrite: false,
      revision: Number.MAX_SAFE_INTEGER,
    });
    expect(() => coordinator.beginWrite()).toThrow(LocalWriteBlockedError);
  });

  it.each([
    ['NaN', () => Number.NaN],
    ['a negative integer', () => -1],
    ['a fractional number', () => 1.5],
    ['an unsafe integer', () => Number.MAX_SAFE_INTEGER + 1],
  ])(
    'fails closed when persisted revision metadata is %s',
    async (_case, readRevision) => {
      const scheduler = new ManualScheduler();
      const transport = new FakeTransport();
      const writeOwnership = new ManualWriteOwnership('owned');
      const coordinator = new LocalDataCoordinator({
        discoveryMs: 10,
        readRevision,
        scheduler,
        tabId: 'invalid-revision-tab',
        transport,
        writeOwnership,
        writeRevision: () => undefined,
      });
      const ready = coordinator.start();

      scheduler.runTimeouts();
      await ready;

      expect(coordinator.getStatus()).toMatchObject({
        blockReason: 'unavailable',
        canWrite: false,
      });
      expect(() => coordinator.beginWrite()).toThrow(LocalWriteBlockedError);
    },
  );

  it('treats a revision read failure as advisory while lock ownership and transport remain valid', async () => {
    const scheduler = new ManualScheduler();
    const transport = new FakeTransport();
    const writeOwnership = new ManualWriteOwnership('owned');
    const coordinator = new LocalDataCoordinator({
      discoveryMs: 10,
      readRevision: () => {
        throw new Error('Injected revision read failure.');
      },
      scheduler,
      tabId: 'unreadable-revision-tab',
      transport,
      writeOwnership,
      writeRevision: () => undefined,
    });
    const ready = coordinator.start();

    scheduler.runTimeouts();
    await ready;

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      revision: 0,
    });
  });

  it('fails closed without leaking a partial coordinator when subscription setup throws', async () => {
    const { coordinator, transport } = createCoordinator();
    transport.throwOnSubscribe = true;

    await expect(coordinator.start()).resolves.toBeUndefined();
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'unavailable',
      canWrite: false,
    });
  });

  it('fails closed when transport posting throws without self-reporting unavailability', async () => {
    const { coordinator, scheduler, transport } = createCoordinator();
    transport.markUnavailableOnThrow = false;
    transport.throwOnPost = true;
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    expect(transport.available).toBe(true);
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'unavailable',
      canWrite: false,
      phase: 'ready',
    });
  });

  it('does not surface a committed write as failed when transport posting throws', async () => {
    const { coordinator, getPersistedRevision, scheduler, transport } =
      createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    transport.throwOnPost = true;

    expect(() => coordinator.recordWrite()).not.toThrow();
    expect(getPersistedRevision()).toBe(1);
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'unavailable',
      canWrite: false,
      revision: 1,
    });
  });

  it('keeps an authorized write bound to its coordinator until commit', async () => {
    const { coordinator, getPersistedRevision, scheduler, transport } =
      createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    const lease = coordinator.beginWrite();

    coordinator.stop();

    expect(transport.closeCount).toBe(0);
    expect(transport.posted.at(-1)?.kind).not.toBe('closing');
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'unavailable',
      canWrite: false,
    });
    transport.receive(peerMessage('hello'));
    expect(transport.posted.at(-1)?.kind).toBe('heartbeat');

    lease.complete();

    expect(getPersistedRevision()).toBe(1);
    expect(transport.posted.slice(-2).map(({ kind }) => kind)).toEqual([
      'write',
      'closing',
    ]);
    expect(transport.closeCount).toBe(1);
  });

  it('closes without recording a revision after an authorized write aborts', async () => {
    const { coordinator, getPersistedRevision, scheduler, transport } =
      createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    const lease = coordinator.beginWrite();

    coordinator.stop();
    lease.abort();

    expect(getPersistedRevision()).toBe(0);
    expect(transport.posted.at(-1)?.kind).toBe('closing');
    expect(transport.closeCount).toBe(1);
  });

  it('allows only one top-level write lease and settles it only once', async () => {
    const { coordinator, getPersistedRevision, scheduler, transport } =
      createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    const committedLease = coordinator.beginWrite();

    expect(() => coordinator.beginWrite()).toThrowError(
      expect.objectContaining({
        name: 'LocalWriteBlockedError',
        reason: 'write-active',
      }),
    );

    coordinator.stop();
    expect(transport.closeCount).toBe(0);

    committedLease.complete();
    committedLease.complete();
    committedLease.abort();

    expect(getPersistedRevision()).toBe(1);
    expect(transport.posted.slice(-2).map(({ kind }) => kind)).toEqual([
      'write',
      'closing',
    ]);
    expect(transport.closeCount).toBe(1);
  });

  it('does not strand shutdown when a status listener throws after commit', async () => {
    const { coordinator, getPersistedRevision, scheduler, transport } =
      createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    coordinator.subscribe((status) => {
      if (status.revision > 0) {
        throw new Error('Injected status listener failure.');
      }
    });
    const lease = coordinator.beginWrite();

    coordinator.stop();

    expect(() => lease.complete()).not.toThrow();
    expect(getPersistedRevision()).toBe(1);
    expect(transport.closeCount).toBe(1);
  });

  it.each([
    ['the durable revision is unchanged', 4],
    ['the durable revision advanced while frozen', 5],
  ])(
    'restores from BFCache as stale when %s',
    async (_case, resumedRevision) => {
      vi.useFakeTimers();
      localStorage.setItem(localCoordinationStorageKeys.revision, '4');
      const session = startLocalDataCoordination(() => undefined);

      try {
        await vi.advanceTimersByTimeAsync(250);
        await session.ready;
        expect(getLocalCoordinationStatus()).toMatchObject({
          blockReason: null,
          canWrite: true,
          revision: 4,
          stale: false,
        });

        const pageHide = new Event('pagehide');
        Object.defineProperty(pageHide, 'persisted', { value: true });
        window.dispatchEvent(pageHide);
        localStorage.setItem(
          localCoordinationStorageKeys.revision,
          String(resumedRevision),
        );
        expect(getLocalCoordinationStatus()).toMatchObject({
          canWrite: false,
        });

        const pageShow = new Event('pageshow');
        Object.defineProperty(pageShow, 'persisted', { value: true });
        window.dispatchEvent(pageShow);
        expect(getLocalCoordinationStatus()).toMatchObject({
          blockReason: 'discovering',
          canWrite: false,
          phase: 'discovering',
        });

        await vi.advanceTimersByTimeAsync(250);
        expect(getLocalCoordinationStatus()).toMatchObject({
          blockReason: 'stale',
          canWrite: false,
          phase: 'ready',
          revision: resumedRevision,
          stale: true,
        });
      } finally {
        session.stop();
        localStorage.removeItem(localCoordinationStorageKeys.revision);
        localStorage.removeItem(localCoordinationStorageKeys.message);
        vi.useRealTimers();
      }
    },
  );
});

describe('corrupt revision recovery', () => {
  it('rewrites a corrupt durable revision to 0 under exclusive presence while the in-memory revision stays poisoned', async () => {
    const writeOwnership = new ManualWriteOwnership('owned');
    const {
      coordinator,
      getPersistedRevision,
      scheduler,
      setPersistedRevision,
    } = createCoordinator({ writeOwnership });
    setPersistedRevision(Number.NaN);
    const consoleInfo = vi
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'unavailable',
      canWrite: false,
      revision: Number.MAX_SAFE_INTEGER,
    });

    await expect(coordinator.repairPersistedRevision()).resolves.toBe(
      'repaired',
    );

    expect(getPersistedRevision()).toBe(0);
    expect(writeOwnership.exclusivePresenceAcquireCount).toBe(1);
    expect(writeOwnership.exclusivePresenceReleaseCount).toBe(1);
    expect(consoleInfo).toHaveBeenCalledWith(
      'ProgressPal repaired corrupt local coordination revision metadata.',
    );
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'unavailable',
      canWrite: false,
      revision: Number.MAX_SAFE_INTEGER,
    });
    consoleInfo.mockRestore();
  });

  it('refuses repair while a peer holds exclusive presence and leaves the durable value untouched', async () => {
    const writeOwnership = new ManualWriteOwnership('owned');
    writeOwnership.exclusivePresenceAvailable = false;
    const {
      coordinator,
      getPersistedRevision,
      scheduler,
      setPersistedRevision,
    } = createCoordinator({ writeOwnership });
    setPersistedRevision(Number.NaN);
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    await expect(coordinator.repairPersistedRevision()).resolves.toBe(
      'blocked',
    );

    expect(writeOwnership.exclusivePresenceAcquireCount).toBe(1);
    expect(writeOwnership.exclusivePresenceReleaseCount).toBe(0);
    expect(getPersistedRevision()).toBe(Number.NaN);
    expect(coordinator.getStatus().revision).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('refuses repair without a lock attempt when writer ownership is contended', async () => {
    const writeOwnership = new ManualWriteOwnership('contended');
    const { coordinator, scheduler, setPersistedRevision } = createCoordinator({
      writeOwnership,
    });
    setPersistedRevision(Number.NaN);
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    await expect(coordinator.repairPersistedRevision()).resolves.toBe(
      'blocked',
    );

    expect(writeOwnership.exclusivePresenceAcquireCount).toBe(0);
  });

  it('reports a healthy coordinator as not needing repair without acquiring presence', async () => {
    const writeOwnership = new ManualWriteOwnership('owned');
    const { coordinator, getPersistedRevision, scheduler } = createCoordinator({
      writeOwnership,
    });
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    await expect(coordinator.repairPersistedRevision()).resolves.toBe(
      'not-needed',
    );

    expect(writeOwnership.exclusivePresenceAcquireCount).toBe(0);
    expect(getPersistedRevision()).toBe(0);
  });

  it('adopts an externally healed durable revision without writing or acquiring presence', async () => {
    const writeOwnership = new ManualWriteOwnership('owned');
    const {
      coordinator,
      getPersistedRevision,
      scheduler,
      setPersistedRevision,
    } = createCoordinator({ writeOwnership });
    setPersistedRevision(Number.NaN);
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    expect(coordinator.getStatus().revision).toBe(Number.MAX_SAFE_INTEGER);

    setPersistedRevision(7);

    await expect(coordinator.repairPersistedRevision()).resolves.toBe(
      'repaired',
    );

    expect(writeOwnership.exclusivePresenceAcquireCount).toBe(0);
    expect(getPersistedRevision()).toBe(7);
    expect(coordinator.getStatus().revision).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('refuses repair while a write lease is active', async () => {
    const writeOwnership = new ManualWriteOwnership('owned');
    const { coordinator, scheduler, setPersistedRevision } = createCoordinator({
      writeOwnership,
    });
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    const lease = coordinator.beginWrite();
    setPersistedRevision(Number.NaN);

    await expect(coordinator.repairPersistedRevision()).resolves.toBe(
      'blocked',
    );

    expect(writeOwnership.exclusivePresenceAcquireCount).toBe(0);
    lease.abort();
  });

  it('restores coordinator state and releases presence when the post-acquisition recheck fails', async () => {
    const writeOwnership = new ManualWriteOwnership('owned');
    const {
      coordinator,
      getPersistedRevision,
      scheduler,
      setPersistedRevision,
      transport,
    } = createCoordinator({ writeOwnership });
    setPersistedRevision(Number.NaN);
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;
    const originalAcquire =
      writeOwnership.acquireExclusivePresence.bind(writeOwnership);
    writeOwnership.acquireExclusivePresence = () => {
      transport.available = false;
      return originalAcquire();
    };

    await expect(coordinator.repairPersistedRevision()).resolves.toBe(
      'blocked',
    );

    expect(writeOwnership.exclusivePresenceAcquireCount).toBe(1);
    expect(writeOwnership.exclusivePresenceReleaseCount).toBe(1);
    expect(getPersistedRevision()).toBe(Number.NaN);
    // A stuck destructiveWritePending would report 'discovering' instead.
    expect(coordinator.getStatus().blockReason).toBe('unavailable');
  });

  it('sanitizes poisoned initial state so a BFCache restore cannot re-poison a fresh coordinator', async () => {
    const scheduler = new ManualScheduler();
    const transport = new FakeTransport();
    const writeOwnership = new ManualWriteOwnership('owned');
    const coordinator = new LocalDataCoordinator({
      discoveryMs: 10,
      initialState: { revision: Number.MAX_SAFE_INTEGER, stale: true },
      readRevision: () => 5,
      scheduler,
      tabId: 'sanitized-initial-revision-tab',
      transport,
      writeOwnership,
      writeRevision: () => undefined,
    });
    const ready = coordinator.start();

    scheduler.runTimeouts();
    await ready;

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'stale',
      canWrite: false,
      revision: 5,
      stale: true,
    });
    expect(coordinator.markSynchronized(coordinator.captureRevision())).toBe(
      true,
    );
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      revision: 5,
    });
  });
});
