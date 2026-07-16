export type LocalCoordinationBlockReason =
  | 'discovering'
  | 'peer-active'
  | 'stale';

export type LocalCoordinationStatus = {
  blockReason: LocalCoordinationBlockReason | null;
  canWrite: boolean;
  peerActive: boolean;
  phase: 'discovering' | 'ready';
  revision: number;
  stale: boolean;
};

export type LocalCoordinationMessage = {
  id: string;
  kind: 'closing' | 'heartbeat' | 'hello' | 'write';
  revision: number;
  sentAt: number;
  tabId: string;
};

export type LocalCoordinationTransport = {
  close: () => void;
  post: (message: LocalCoordinationMessage) => void;
  subscribe: (
    listener: (message: LocalCoordinationMessage) => void,
  ) => () => void;
};

export type LocalCoordinationScheduler = {
  clearInterval: (handle: ReturnType<typeof setInterval>) => void;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
  setInterval: (
    callback: () => void,
    delay: number,
  ) => ReturnType<typeof setInterval>;
  setTimeout: (
    callback: () => void,
    delay: number,
  ) => ReturnType<typeof setTimeout>;
};

export class LocalWriteBlockedError extends Error {
  readonly reason: LocalCoordinationBlockReason;

  constructor(reason: LocalCoordinationBlockReason, destructive = false) {
    const description =
      reason === 'discovering'
        ? 'Local write coordination is still checking for another tab.'
        : reason === 'stale'
          ? 'This tab has stale local data and must reload before writing.'
          : destructive
            ? 'Close the other ProgressPal tab before replacing or resetting local data.'
            : 'Close the other ProgressPal tab before changing local data.';

    super(description);
    this.name = 'LocalWriteBlockedError';
    this.reason = reason;
  }
}

type LocalDataCoordinatorOptions = {
  discoveryMs?: number;
  heartbeatMs?: number;
  now?: () => number;
  peerTimeoutMs?: number;
  readRevision: () => number;
  scheduler?: LocalCoordinationScheduler;
  tabId: string;
  transport: LocalCoordinationTransport;
  writeRevision: (revision: number) => void;
};

const defaultScheduler: LocalCoordinationScheduler = {
  clearInterval: (handle) => globalThis.clearInterval(handle),
  clearTimeout: (handle) => globalThis.clearTimeout(handle),
  setInterval: (callback, delay) => globalThis.setInterval(callback, delay),
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
};

export class LocalDataCoordinator {
  private readonly discoveryMs: number;
  private readonly heartbeatMs: number;
  private readonly listeners = new Set<
    (status: LocalCoordinationStatus) => void
  >();
  private readonly now: () => number;
  private readonly peerTimeoutMs: number;
  private readonly peers = new Map<string, number>();
  private readonly readRevision: () => number;
  private readonly scheduler: LocalCoordinationScheduler;
  private readonly tabId: string;
  private readonly transport: LocalCoordinationTransport;
  private readonly writeRevision: (revision: number) => void;
  private discoveryHandle: ReturnType<typeof setTimeout> | null = null;
  private heartbeatHandle: ReturnType<typeof setInterval> | null = null;
  private messageSequence = 0;
  private phase: LocalCoordinationStatus['phase'] = 'discovering';
  private revision = 0;
  private stale = false;
  private stopped = false;
  private stopListening: (() => void) | null = null;

  constructor(options: LocalDataCoordinatorOptions) {
    this.discoveryMs = options.discoveryMs ?? 250;
    this.heartbeatMs = options.heartbeatMs ?? 5_000;
    this.now = options.now ?? Date.now;
    this.peerTimeoutMs = options.peerTimeoutMs ?? 15_000;
    this.readRevision = options.readRevision;
    this.scheduler = options.scheduler ?? defaultScheduler;
    this.tabId = options.tabId;
    this.transport = options.transport;
    this.writeRevision = options.writeRevision;
  }

  getStatus(): LocalCoordinationStatus {
    this.removeExpiredPeers();
    const peerActive = this.peers.size > 0;
    const blockReason =
      this.phase === 'discovering'
        ? 'discovering'
        : this.stale
          ? 'stale'
          : peerActive
            ? 'peer-active'
            : null;

    return {
      blockReason,
      canWrite: blockReason === null,
      peerActive,
      phase: this.phase,
      revision: this.revision,
      stale: this.stale,
    };
  }

  subscribe(listener: (status: LocalCoordinationStatus) => void) {
    this.listeners.add(listener);
    listener(this.getStatus());

    return () => {
      this.listeners.delete(listener);
    };
  }

  start() {
    this.stopped = false;
    this.revision = this.readRevision();
    this.stopListening = this.transport.subscribe((message) => {
      this.receive(message);
    });
    this.post('hello');
    this.heartbeatHandle = this.scheduler.setInterval(() => {
      this.removeExpiredPeers();
      this.post('heartbeat');
      this.emit();
    }, this.heartbeatMs);

    return new Promise<void>((resolve) => {
      this.discoveryHandle = this.scheduler.setTimeout(() => {
        this.discoveryHandle = null;
        this.phase = 'ready';
        this.emit();
        resolve();
      }, this.discoveryMs);
    });
  }

  stop() {
    if (this.stopped) {
      return;
    }

    this.stopped = true;
    this.post('closing');
    this.stopListening?.();
    this.stopListening = null;

    if (this.discoveryHandle !== null) {
      this.scheduler.clearTimeout(this.discoveryHandle);
      this.discoveryHandle = null;
    }

    if (this.heartbeatHandle !== null) {
      this.scheduler.clearInterval(this.heartbeatHandle);
      this.heartbeatHandle = null;
    }

    this.transport.close();
    this.peers.clear();
  }

  assertWriteAllowed(options: { destructive?: boolean } = {}) {
    const { blockReason } = this.getStatus();

    if (blockReason !== null) {
      throw new LocalWriteBlockedError(
        blockReason,
        options.destructive === true,
      );
    }
  }

  recordWrite() {
    this.revision = Math.max(this.revision, this.readRevision()) + 1;
    this.writeRevision(this.revision);
    this.post('write');
    this.emit();
  }

  markSynchronized() {
    this.revision = this.readRevision();
    this.stale = false;
    this.emit();
  }

  private receive(message: LocalCoordinationMessage) {
    if (message.tabId === this.tabId) {
      return;
    }

    if (message.kind === 'closing') {
      this.peers.delete(message.tabId);
      this.emit();
      return;
    }

    this.peers.set(message.tabId, message.sentAt);

    if (message.kind === 'write' && message.revision > this.revision) {
      this.stale = true;
    }

    if (message.kind === 'hello') {
      this.post('heartbeat');
    }

    this.emit();
  }

  private removeExpiredPeers() {
    const cutoff = this.now() - this.peerTimeoutMs;

    for (const [tabId, lastSeen] of this.peers) {
      if (lastSeen < cutoff) {
        this.peers.delete(tabId);
      }
    }
  }

  private post(kind: LocalCoordinationMessage['kind']) {
    this.messageSequence += 1;
    this.transport.post({
      id: `${this.tabId}-${this.messageSequence}`,
      kind,
      revision: this.revision,
      sentAt: this.now(),
      tabId: this.tabId,
    });
  }

  private emit() {
    const status = this.getStatus();

    for (const listener of this.listeners) {
      listener(status);
    }
  }
}

const messageStorageKey = 'progresspal:coordination:message';
const revisionStorageKey = 'progresspal:coordination:revision';
const channelName = 'progresspal-coordination-v1';

export const localCoordinationStorageKeys = {
  message: messageStorageKey,
  revision: revisionStorageKey,
} as const;

function isCoordinationMessage(
  value: unknown,
): value is LocalCoordinationMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<LocalCoordinationMessage>;

  return (
    typeof candidate.id === 'string' &&
    ['closing', 'heartbeat', 'hello', 'write'].includes(candidate.kind ?? '') &&
    typeof candidate.revision === 'number' &&
    Number.isSafeInteger(candidate.revision) &&
    candidate.revision >= 0 &&
    typeof candidate.sentAt === 'number' &&
    typeof candidate.tabId === 'string'
  );
}

function createBrowserTransport(): LocalCoordinationTransport {
  const listeners = new Set<(message: LocalCoordinationMessage) => void>();
  const seenMessages = new Set<string>();
  const seenMessageOrder: string[] = [];
  const channel =
    typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel(channelName);

  const deliver = (value: unknown) => {
    if (!isCoordinationMessage(value) || seenMessages.has(value.id)) {
      return;
    }

    seenMessages.add(value.id);
    seenMessageOrder.push(value.id);

    if (seenMessageOrder.length > 512) {
      const oldestMessageId = seenMessageOrder.shift();
      if (oldestMessageId !== undefined) {
        seenMessages.delete(oldestMessageId);
      }
    }

    for (const listener of listeners) {
      listener(value);
    }
  };

  if (channel !== null) {
    channel.addEventListener('message', (event) => deliver(event.data));
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== messageStorageKey || event.newValue === null) {
      return;
    }

    try {
      deliver(JSON.parse(event.newValue));
    } catch {
      // Ignore unrelated or corrupt coordination metadata. It never contains
      // learner data and cannot authorize a write.
    }
  };

  window.addEventListener('storage', handleStorage);

  return {
    close: () => {
      window.removeEventListener('storage', handleStorage);
      channel?.close();
      listeners.clear();
    },
    post: (message) => {
      channel?.postMessage(message);

      try {
        localStorage.setItem(messageStorageKey, JSON.stringify(message));
      } catch {
        // BroadcastChannel remains the primary path when localStorage is
        // unavailable. If both transports are unavailable, this tab remains
        // protected only by its local stale-write guard.
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function readBrowserRevision() {
  try {
    const value = Number(localStorage.getItem(revisionStorageKey) ?? '0');
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function writeBrowserRevision(revision: number) {
  try {
    localStorage.setItem(revisionStorageKey, String(revision));
  } catch {
    // The in-memory revision still protects the current tab. The UI continues
    // to state that browser persistence is best-effort and backups are needed.
  }
}

const uncoordinatedStatus: LocalCoordinationStatus = {
  blockReason: null,
  canWrite: true,
  peerActive: false,
  phase: 'ready',
  revision: 0,
  stale: false,
};

let activeCoordinator: LocalDataCoordinator | null = null;

export function startLocalDataCoordination(
  listener: (status: LocalCoordinationStatus) => void,
) {
  if (typeof window === 'undefined') {
    listener(uncoordinatedStatus);
    return { ready: Promise.resolve(), stop: () => undefined };
  }

  activeCoordinator?.stop();
  const coordinator = new LocalDataCoordinator({
    readRevision: readBrowserRevision,
    tabId:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    transport: createBrowserTransport(),
    writeRevision: writeBrowserRevision,
  });
  activeCoordinator = coordinator;
  const unsubscribe = coordinator.subscribe(listener);
  const ready = coordinator.start();
  const handlePageHide = () => coordinator.stop();
  window.addEventListener('pagehide', handlePageHide, { once: true });

  return {
    ready,
    stop: () => {
      window.removeEventListener('pagehide', handlePageHide);
      unsubscribe();
      coordinator.stop();
      if (activeCoordinator === coordinator) {
        activeCoordinator = null;
      }
    },
  };
}

export function getLocalCoordinationStatus() {
  return activeCoordinator?.getStatus() ?? uncoordinatedStatus;
}

export function assertLocalWriteAllowed(
  options: { destructive?: boolean } = {},
) {
  activeCoordinator?.assertWriteAllowed(options);
}

export function recordLocalWrite() {
  activeCoordinator?.recordWrite();
}

export function markLocalDataSynchronized() {
  activeCoordinator?.markSynchronized();
}
