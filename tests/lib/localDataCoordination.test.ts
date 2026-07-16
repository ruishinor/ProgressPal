import { describe, expect, it } from 'vitest';

import {
  LocalDataCoordinator,
  LocalWriteBlockedError,
  type LocalCoordinationMessage,
  type LocalCoordinationScheduler,
  type LocalCoordinationTransport,
} from '@/lib/storage';

class FakeTransport implements LocalCoordinationTransport {
  readonly posted: LocalCoordinationMessage[] = [];
  private listener: ((message: LocalCoordinationMessage) => void) | null = null;

  close() {
    this.listener = null;
  }

  post(message: LocalCoordinationMessage) {
    this.posted.push(message);
  }

  receive(message: LocalCoordinationMessage) {
    this.listener?.(message);
  }

  subscribe(listener: (message: LocalCoordinationMessage) => void) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
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

function createCoordinator() {
  let persistedRevision = 0;
  let now = 1_000;
  const scheduler = new ManualScheduler();
  const transport = new FakeTransport();
  const coordinator = new LocalDataCoordinator({
    discoveryMs: 10,
    heartbeatMs: 100,
    now: () => now,
    peerTimeoutMs: 500,
    readRevision: () => persistedRevision,
    scheduler,
    tabId: 'local-tab',
    transport,
    writeRevision: (revision) => {
      persistedRevision = revision;
    },
  });

  return {
    advanceTo: (timestamp: number) => {
      now = timestamp;
    },
    coordinator,
    getPersistedRevision: () => persistedRevision,
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

  it('makes every active tab read-only and explicitly blocks destructive writes', async () => {
    const { coordinator, scheduler, transport } = createCoordinator();
    const ready = coordinator.start();
    scheduler.runTimeouts();
    await ready;

    transport.receive(peerMessage('hello'));

    expect(coordinator.getStatus()).toMatchObject({
      blockReason: 'peer-active',
      canWrite: false,
      peerActive: true,
    });
    expect(() => coordinator.assertWriteAllowed({ destructive: true })).toThrow(
      /Close the other ProgressPal tab before replacing or resetting/,
    );

    transport.receive(peerMessage('closing'));
    expect(coordinator.getStatus().canWrite).toBe(true);
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

    coordinator.markSynchronized();
    expect(coordinator.getStatus()).toMatchObject({
      blockReason: null,
      canWrite: true,
      stale: false,
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
});
