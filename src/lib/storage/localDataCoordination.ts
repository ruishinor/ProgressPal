export type LocalCoordinationBlockReason =
  | 'discovering'
  | 'peer-active'
  | 'stale'
  | 'unavailable'
  | 'write-active';

export type LocalCoordinationStatus = {
  blockReason: LocalCoordinationBlockReason | null;
  canWrite: boolean;
  peerActive: boolean;
  phase: 'discovering' | 'ready';
  revision: number;
  stale: boolean;
  writeOwnership: LocalWriteOwnershipState;
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
  isAvailable: () => boolean;
  post: (message: LocalCoordinationMessage) => void;
  subscribe: (
    listener: (message: LocalCoordinationMessage) => void,
  ) => () => void;
};

export type LocalWriteLease = {
  abort: () => void;
  complete: () => void;
};

export type LocalWriteOwnershipState = 'contended' | 'owned' | 'unavailable';

export type LocalWriteOwnership = {
  acquireExclusivePresence: () => Promise<() => void | Promise<void>>;
  start: (listener: (state: LocalWriteOwnershipState) => void) => Promise<void>;
  stop: () => void;
};

const localDataRevisionTokenOwner = Symbol('local-data-revision-token-owner');
const localDataRevisionTokenWriteEpoch = Symbol(
  'local-data-revision-token-write-epoch',
);

export type LocalDataRevisionToken = Readonly<{
  revision: number;
  [localDataRevisionTokenOwner]: LocalDataCoordinator | null;
  [localDataRevisionTokenWriteEpoch]: number;
}>;

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
        : reason === 'write-active'
          ? 'Another local change is still being saved.'
          : reason === 'unavailable'
            ? 'Local write coordination is unavailable in this browser context.'
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
  initialState?: Pick<LocalCoordinationStatus, 'revision' | 'stale'>;
  now?: () => number;
  peerTimeoutMs?: number;
  readRevision: () => number;
  scheduler?: LocalCoordinationScheduler;
  tabId: string;
  transport: LocalCoordinationTransport;
  writeOwnership?: LocalWriteOwnership;
  writeRevision: (revision: number) => void;
};

const defaultScheduler: LocalCoordinationScheduler = {
  clearInterval: (handle) => globalThis.clearInterval(handle),
  clearTimeout: (handle) => globalThis.clearTimeout(handle),
  setInterval: (callback, delay) => globalThis.setInterval(callback, delay),
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
};

const immediateWriteOwnership: LocalWriteOwnership = {
  acquireExclusivePresence: () => Promise.resolve(() => Promise.resolve()),
  start: (listener) => {
    listener('owned');
    return Promise.resolve();
  },
  stop: () => undefined,
};

export class LocalDataCoordinator {
  private activeWriteLeases = 0;
  private closeFinalized = false;
  private destructiveWriteActive = false;
  private destructiveWritePending = false;
  private discoveryElapsed = false;
  private readonly discoveryMs: number;
  private readonly heartbeatMs: number;
  private readonly initialState:
    | Pick<LocalCoordinationStatus, 'revision' | 'stale'>
    | undefined;
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
  private readonly writeOwnership: LocalWriteOwnership;
  private readonly writeRevision: (revision: number) => void;
  private discoveryHandle: ReturnType<typeof setTimeout> | null = null;
  private heartbeatHandle: ReturnType<typeof setInterval> | null = null;
  private messageSequence = 0;
  private lifecycleStarted = false;
  private ownershipInitialized = false;
  private ownershipState: LocalWriteOwnershipState = 'unavailable';
  private phase: LocalCoordinationStatus['phase'] = 'discovering';
  private revision = 0;
  private stale = false;
  private started = false;
  private stopped = false;
  private stopListening: (() => void) | null = null;
  private transportAvailableLast = true;
  private transportFailed = false;
  private resolveReady: (() => void) | null = null;
  private readyPromise: Promise<void> | null = null;
  private writeEpoch = 0;

  constructor(options: LocalDataCoordinatorOptions) {
    this.discoveryMs = options.discoveryMs ?? 250;
    this.heartbeatMs = options.heartbeatMs ?? 5_000;
    this.initialState = options.initialState;
    this.now = options.now ?? Date.now;
    this.peerTimeoutMs = options.peerTimeoutMs ?? 15_000;
    this.readRevision = options.readRevision;
    this.scheduler = options.scheduler ?? defaultScheduler;
    this.tabId = options.tabId;
    this.transport = options.transport;
    this.writeOwnership = options.writeOwnership ?? immediateWriteOwnership;
    this.writeRevision = options.writeRevision;
  }

  getStatus(): LocalCoordinationStatus {
    if (this.started) {
      const persistedRevision = this.readPersistedRevision();

      if (persistedRevision > this.revision) {
        this.revision = persistedRevision;
        this.stale = true;
      }
    }

    this.removeExpiredPeers();
    const peerActive =
      this.ownershipState === 'contended' || this.peers.size > 0;
    let transportAvailable = this.isTransportAvailable();

    if (
      this.started &&
      !this.stopped &&
      !this.transportAvailableLast &&
      transportAvailable
    ) {
      this.transportAvailableLast = transportAvailable;
      this.restartDiscovery();
      transportAvailable = this.isTransportAvailable();
    }

    this.transportAvailableLast = transportAvailable;
    const blockReason = this.stopped
      ? 'unavailable'
      : this.destructiveWritePending || this.destructiveWriteActive
        ? 'discovering'
        : this.activeWriteLeases > 0
          ? 'write-active'
          : this.phase === 'discovering'
            ? 'discovering'
            : !transportAvailable ||
                this.ownershipState === 'unavailable' ||
                this.revision >= Number.MAX_SAFE_INTEGER
              ? 'unavailable'
              : this.stale
                ? 'stale'
                : this.ownershipState !== 'owned'
                  ? 'peer-active'
                  : null;

    return {
      blockReason,
      canWrite: blockReason === null,
      peerActive,
      phase: this.phase,
      revision: this.revision,
      stale: this.stale,
      writeOwnership: this.ownershipState,
    };
  }

  subscribe(listener: (status: LocalCoordinationStatus) => void) {
    this.listeners.add(listener);
    try {
      listener(this.getStatus());
    } catch {
      // A listener that cannot consume the initial snapshot is not retained.
      // Other listeners and coordinator startup remain isolated from it.
      this.listeners.delete(listener);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  start() {
    if (this.lifecycleStarted) {
      return this.readyPromise ?? Promise.resolve();
    }

    this.lifecycleStarted = true;
    this.stopped = false;
    this.closeFinalized = false;
    this.discoveryElapsed = false;
    this.phase = 'discovering';
    const persistedRevision = this.readPersistedRevision();
    const initialRevision = this.initialState?.revision;
    this.revision = Math.max(
      initialRevision ?? persistedRevision,
      persistedRevision,
    );
    this.stale =
      (this.initialState?.stale ?? false) ||
      (initialRevision !== undefined && persistedRevision > initialRevision);
    this.started = true;
    this.ownershipInitialized = false;
    this.ownershipState = 'unavailable';
    this.transportFailed = false;
    this.transportAvailableLast = this.isTransportAvailable();
    const ready = new Promise<void>((resolve) => {
      this.resolveReady = resolve;
    });
    this.readyPromise = ready;

    try {
      this.stopListening = this.transport.subscribe((message) => {
        this.receive(message);
      });
      this.post('hello');
      this.transportAvailableLast = this.isTransportAvailable();
      this.heartbeatHandle = this.scheduler.setInterval(() => {
        this.removeExpiredPeers();
        this.post('heartbeat');
        this.emit();
      }, this.heartbeatMs);
      this.scheduleDiscovery();
      const ownershipStarted = this.writeOwnership.start((state) => {
        this.handleOwnershipState(state);
      });

      void Promise.resolve(ownershipStarted).then(
        () => {
          if (!this.ownershipInitialized && !this.stopped) {
            this.failStartup();
          }
        },
        () => {
          this.failStartup();
        },
      );
    } catch {
      this.failStartup();
    }

    return ready;
  }

  stop() {
    if (this.stopped) {
      return;
    }

    this.stopped = true;
    this.started = false;

    if (this.activeWriteLeases === 0) {
      this.finalizeStop();
    }
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

  beginWrite(options: { destructive?: boolean } = {}): LocalWriteLease {
    if (options.destructive === true) {
      throw new Error(
        'Destructive local writes require asynchronous exclusive presence.',
      );
    }

    this.assertWriteAllowed(options);
    return this.createWriteLease();
  }

  async beginDestructiveWrite(): Promise<LocalWriteLease> {
    this.assertWriteAllowed({ destructive: true });

    if (this.activeWriteLeases > 0) {
      throw new LocalWriteBlockedError('unavailable', true);
    }

    this.writeEpoch += 1;
    this.destructiveWritePending = true;
    this.emit();
    let releaseExclusivePresence: (() => void | Promise<void>) | null = null;

    try {
      releaseExclusivePresence =
        await this.writeOwnership.acquireExclusivePresence();

      if (
        this.stopped ||
        !this.started ||
        this.ownershipState !== 'owned' ||
        !this.isTransportAvailable() ||
        this.stale
      ) {
        throw new LocalWriteBlockedError('unavailable', true);
      }

      this.destructiveWritePending = false;
      this.destructiveWriteActive = true;

      return this.createWriteLease(() => {
        const restoration = releaseExclusivePresence?.();

        void Promise.resolve(restoration).then(
          () => {
            this.destructiveWriteActive = false;
            this.emit();
          },
          () => {
            this.destructiveWriteActive = false;
            this.ownershipState = 'unavailable';
            this.emit();
          },
        );
      }, false);
    } catch (error) {
      this.destructiveWritePending = false;

      try {
        await releaseExclusivePresence?.();
      } catch {
        this.ownershipState = 'unavailable';
      }

      this.emit();

      if (error instanceof LocalWriteBlockedError) {
        throw error;
      }

      throw new LocalWriteBlockedError('peer-active', true);
    }
  }

  private createWriteLease(
    onSettled: () => void = () => undefined,
    incrementWriteEpoch = true,
  ): LocalWriteLease {
    if (incrementWriteEpoch) {
      this.writeEpoch += 1;
    }

    this.activeWriteLeases += 1;
    this.emit();
    let settled = false;

    const settle = (committed: boolean) => {
      if (settled) {
        return;
      }

      settled = true;

      try {
        if (committed) {
          this.recordWrite();
        }
      } finally {
        this.activeWriteLeases -= 1;
        onSettled();
        this.emit();

        if (this.stopped && this.activeWriteLeases === 0) {
          this.finalizeStop();
        }
      }
    };

    return {
      abort: () => settle(false),
      complete: () => settle(true),
    };
  }

  captureRevision(): LocalDataRevisionToken {
    return {
      [localDataRevisionTokenOwner]: this,
      [localDataRevisionTokenWriteEpoch]: this.writeEpoch,
      revision: this.getStatus().revision,
    };
  }

  validateRevision(token: LocalDataRevisionToken) {
    return this.isRevisionTokenCurrent(token, this.readPersistedRevision());
  }

  recordWrite() {
    const currentRevision = Math.max(
      this.revision,
      this.readPersistedRevision(),
    );

    if (currentRevision >= Number.MAX_SAFE_INTEGER) {
      this.revision = Number.MAX_SAFE_INTEGER;
      this.transportFailed = true;
      this.stale = true;
      this.emit();
      return;
    }

    this.revision = currentRevision + 1;
    this.stale = true;

    try {
      this.writeRevision(this.revision);
    } catch {
      // Revision storage is an advisory invalidation aid, not write authority.
      // The exclusive writer lock and the mandatory reread on every ownership
      // transfer remain sufficient when localStorage is unavailable.
    }

    this.post('write');
    this.emit();
  }

  markSynchronized(token: LocalDataRevisionToken) {
    const persistedRevision = this.readPersistedRevision();

    if (persistedRevision > this.revision) {
      this.revision = persistedRevision;
      this.stale = true;
    }

    if (!this.isRevisionTokenCurrent(token, persistedRevision)) {
      this.stale = true;
      this.emit();
      return false;
    }

    this.stale = false;
    this.emit();
    return true;
  }

  private isRevisionTokenCurrent(
    token: LocalDataRevisionToken,
    persistedRevision: number,
  ) {
    return (
      token[localDataRevisionTokenOwner] === this &&
      token[localDataRevisionTokenWriteEpoch] === this.writeEpoch &&
      Number.isSafeInteger(token.revision) &&
      token.revision >= 0 &&
      !this.stopped &&
      this.started &&
      this.phase === 'ready' &&
      this.isTransportAvailable() &&
      !this.destructiveWritePending &&
      !this.destructiveWriteActive &&
      this.activeWriteLeases === 0 &&
      this.revision < Number.MAX_SAFE_INTEGER &&
      this.revision === token.revision &&
      persistedRevision <= token.revision
    );
  }

  private receive(message: LocalCoordinationMessage) {
    if (message.tabId === this.tabId) {
      return;
    }

    if (message.revision > this.revision) {
      this.revision = message.revision;
      this.stale = true;
    }

    if (message.kind === 'closing') {
      this.peers.delete(message.tabId);
      this.emit();
      return;
    }

    this.peers.set(message.tabId, this.now());

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

  private finalizeStop() {
    if (this.closeFinalized) {
      return;
    }

    this.closeFinalized = true;
    this.post('closing');
    try {
      this.stopListening?.();
    } catch {
      // Listener teardown is best-effort after writes are already settled.
    }
    this.stopListening = null;

    if (this.discoveryHandle !== null) {
      try {
        this.scheduler.clearTimeout(this.discoveryHandle);
      } catch {
        // Timer teardown is best-effort during terminal shutdown.
      }
      this.discoveryHandle = null;
    }

    if (this.heartbeatHandle !== null) {
      try {
        this.scheduler.clearInterval(this.heartbeatHandle);
      } catch {
        // Timer teardown is best-effort during terminal shutdown.
      }
      this.heartbeatHandle = null;
    }

    try {
      this.transport.close();
    } catch {
      // Transport teardown cannot change the outcome of a settled write.
    }

    try {
      this.writeOwnership.stop();
    } catch {
      // Releasing ownership is best-effort during terminal teardown. Browser
      // lock ownership is also released automatically with the document.
    }
    this.peers.clear();
    this.resolveReady?.();
    this.resolveReady = null;
  }

  private isTransportAvailable() {
    if (this.transportFailed) {
      return false;
    }

    try {
      return this.transport.isAvailable();
    } catch {
      this.transportFailed = true;
      return false;
    }
  }

  private readPersistedRevision() {
    try {
      const revision = this.readRevision();

      if (!Number.isSafeInteger(revision) || revision < 0) {
        // Corrupt or exhausted revision metadata cannot safely participate in
        // the bounded notification protocol. Web Locks still prevent a second
        // writer, but this coordinator must remain unavailable until the
        // metadata is repaired under an explicit recovery flow.
        return Number.MAX_SAFE_INTEGER;
      }

      return revision;
    } catch {
      return this.revision;
    }
  }

  private post(kind: LocalCoordinationMessage['kind']) {
    this.messageSequence += 1;

    try {
      this.transport.post({
        id: `${this.tabId}-${this.messageSequence}`,
        kind,
        revision: this.revision,
        sentAt: this.now(),
        tabId: this.tabId,
      });
    } catch {
      // Coordination transport failure must never turn a committed IndexedDB
      // write into an apparent application failure. Browser transports expose
      // availability separately so the next status read fails closed.
      this.transportFailed = true;
    }
  }

  private handleOwnershipState(state: LocalWriteOwnershipState) {
    const previousState = this.ownershipState;
    const wasInitialized = this.ownershipInitialized;

    this.ownershipInitialized = true;
    this.ownershipState = state;

    if (this.stopped) {
      return;
    }

    if (wasInitialized && state !== previousState) {
      // Every ownership transition invalidates tokens captured under the prior
      // role. In particular, a token read while queued as a reader cannot be
      // reused to clear the mandatory reread after writer ownership transfers.
      this.writeEpoch += 1;
    }

    if (wasInitialized && state === 'owned' && previousState !== 'owned') {
      // A new writer may have missed any number of prior notifications while
      // it was queued. Ownership transfer therefore always requires a fresh
      // database read before writes can resume.
      this.stale = true;
      this.restartDiscovery();
      return;
    }

    this.finishDiscoveryIfReady();
    this.emit();
  }

  private scheduleDiscovery() {
    try {
      this.discoveryHandle = this.scheduler.setTimeout(() => {
        this.discoveryHandle = null;
        this.discoveryElapsed = true;
        this.finishDiscoveryIfReady();
      }, this.discoveryMs);
    } catch {
      this.failStartup();
    }
  }

  private finishDiscoveryIfReady() {
    if (this.stopped || !this.discoveryElapsed || !this.ownershipInitialized) {
      return;
    }

    this.phase = 'ready';
    this.emit();

    if (this.phase === 'ready') {
      this.resolveReady?.();
      this.resolveReady = null;
    }
  }

  private failStartup() {
    if (this.closeFinalized) {
      return;
    }

    this.closeFinalized = true;
    this.stopped = true;
    this.started = false;
    this.transportFailed = true;
    this.ownershipInitialized = true;
    this.ownershipState = 'unavailable';
    this.discoveryElapsed = true;
    this.phase = 'ready';

    try {
      this.stopListening?.();
    } catch {
      // Partial subscription teardown is best-effort after fail-closed state.
    }
    this.stopListening = null;

    if (this.discoveryHandle !== null) {
      try {
        this.scheduler.clearTimeout(this.discoveryHandle);
      } catch {
        // Timer teardown is best-effort after fail-closed state.
      }
      this.discoveryHandle = null;
    }

    if (this.heartbeatHandle !== null) {
      try {
        this.scheduler.clearInterval(this.heartbeatHandle);
      } catch {
        // Timer teardown is best-effort after fail-closed state.
      }
      this.heartbeatHandle = null;
    }

    try {
      this.transport.close();
    } catch {
      // Transport teardown is best-effort after fail-closed state.
    }

    try {
      this.writeOwnership.stop();
    } catch {
      // Ownership teardown is best-effort after fail-closed state.
    }

    this.resolveReady?.();
    this.resolveReady = null;
    this.emit();
  }

  private restartDiscovery() {
    if (this.stopped) {
      return;
    }

    if (this.discoveryHandle !== null) {
      try {
        this.scheduler.clearTimeout(this.discoveryHandle);
      } catch {
        this.failStartup();
        return;
      }
    }

    this.discoveryElapsed = false;
    this.phase = 'discovering';
    this.post('hello');
    this.scheduleDiscovery();
    this.emit();
  }

  private emit() {
    const status = this.getStatus();

    for (const listener of this.listeners) {
      try {
        listener(status);
      } catch {
        // UI listeners cannot invalidate a committed write or strand shutdown.
      }
    }
  }
}

const messageStorageKey = 'progresspal:coordination:message';
const revisionStorageKey = 'progresspal:coordination:revision';
const channelName = 'progresspal-coordination-v1';
const presenceLockName = 'progresspal:local-data:presence';
const writerLockName = 'progresspal:local-data:writer';

export const localCoordinationStorageKeys = {
  message: messageStorageKey,
  presenceLock: presenceLockName,
  revision: revisionStorageKey,
  writerLock: writerLockName,
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
    Number.isFinite(candidate.sentAt) &&
    typeof candidate.tabId === 'string'
  );
}

export function createBrowserWriteOwnership(): LocalWriteOwnership {
  const lockManager =
    typeof navigator !== 'undefined' &&
    'locks' in navigator &&
    navigator.locks !== undefined
      ? navigator.locks
      : null;

  if (lockManager === null) {
    return {
      acquireExclusivePresence: () =>
        Promise.reject(
          new Error('Exclusive local-data presence is unavailable.'),
        ),
      start: (listener) => {
        listener('unavailable');
        return Promise.resolve();
      },
      stop: () => undefined,
    };
  }

  let abortPresenceRequest: AbortController | null = null;
  let abortQueuedWriterRequest: AbortController | null = null;
  let presenceRequest: Promise<unknown> | null = null;
  let presenceRestore: Promise<void> = Promise.resolve();
  let releaseExclusivePresence: (() => void) | null = null;
  let releaseSharedPresence: (() => void) | null = null;
  let releaseWriterLock: (() => void) | null = null;
  let stopped = false;

  const holdWriterLock = () =>
    new Promise<void>((resolve) => {
      if (stopped) {
        resolve();
        return;
      }

      releaseWriterLock = resolve;
    });

  const acquireSharedPresence = () => {
    if (stopped) {
      return Promise.resolve();
    }

    abortPresenceRequest = new AbortController();
    let resolveAcquired: () => void = () => undefined;
    let rejectAcquired: (error: unknown) => void = () => undefined;
    const acquired = new Promise<void>((resolve, reject) => {
      resolveAcquired = resolve;
      rejectAcquired = reject;
    });

    try {
      presenceRequest = lockManager.request(
        presenceLockName,
        {
          mode: 'shared',
          signal: abortPresenceRequest.signal,
        },
        async () => {
          abortPresenceRequest = null;

          if (stopped) {
            resolveAcquired();
            return;
          }

          resolveAcquired();
          await new Promise<void>((resolve) => {
            releaseSharedPresence = resolve;
          });
          releaseSharedPresence = null;
        },
      );

      void presenceRequest.catch((error) => {
        if (!stopped) {
          rejectAcquired(error);
        } else {
          resolveAcquired();
        }
      });
    } catch (error) {
      rejectAcquired(error);
    }

    return acquired;
  };

  const startWriterOwnership = (
    listener: (state: LocalWriteOwnershipState) => void,
  ) =>
    new Promise<void>((resolveInitialState) => {
      let initialStateResolved = false;
      const resolveInitialStateOnce = () => {
        if (!initialStateResolved) {
          initialStateResolved = true;
          resolveInitialState();
        }
      };
      const reportUnavailable = () => {
        if (!stopped) {
          listener('unavailable');
        }
        resolveInitialStateOnce();
      };
      const queueForOwnership = () => {
        abortQueuedWriterRequest = new AbortController();

        try {
          const queuedRequest = lockManager.request(
            writerLockName,
            {
              mode: 'exclusive',
              signal: abortQueuedWriterRequest.signal,
            },
            async () => {
              abortQueuedWriterRequest = null;

              if (stopped) {
                return;
              }

              listener('owned');
              await holdWriterLock();
            },
          );

          void queuedRequest.catch(() => {
            if (!stopped) {
              listener('unavailable');
            }
          });
        } catch {
          reportUnavailable();
        }
      };

      try {
        const initialRequest = lockManager.request(
          writerLockName,
          { ifAvailable: true, mode: 'exclusive' },
          async (lock) => {
            if (stopped) {
              resolveInitialStateOnce();
              return;
            }

            if (lock === null) {
              listener('contended');
              queueForOwnership();
              resolveInitialStateOnce();
              return;
            }

            listener('owned');
            resolveInitialStateOnce();
            await holdWriterLock();
          },
        );

        void initialRequest.catch(reportUnavailable);
      } catch {
        reportUnavailable();
      }
    });

  return {
    acquireExclusivePresence: async () => {
      if (stopped) {
        throw new Error('Local-data ownership has already stopped.');
      }

      await presenceRestore;

      if (releaseSharedPresence === null || presenceRequest === null) {
        throw new Error('Shared local-data presence is unavailable.');
      }

      releaseSharedPresence();
      releaseSharedPresence = null;
      await presenceRequest;
      presenceRequest = null;

      let resolveAttempt: (release: (() => void) | null) => void = () =>
        undefined;
      let rejectAttempt: (error: unknown) => void = () => undefined;
      const attempt = new Promise<(() => void) | null>((resolve, reject) => {
        resolveAttempt = resolve;
        rejectAttempt = reject;
      });
      let exclusiveRequest: Promise<unknown> | null = null;

      try {
        exclusiveRequest = lockManager.request(
          presenceLockName,
          { ifAvailable: true, mode: 'exclusive' },
          async (lock) => {
            if (lock === null || stopped) {
              resolveAttempt(null);
              return;
            }

            let released = false;
            const release = () => {
              if (released) {
                return;
              }

              released = true;
              releaseExclusivePresence?.();
            };

            resolveAttempt(release);
            await new Promise<void>((resolve) => {
              releaseExclusivePresence = resolve;
            });
            releaseExclusivePresence = null;
          },
        );

        void exclusiveRequest.catch(rejectAttempt);
      } catch (error) {
        rejectAttempt(error);
      }

      let release: (() => void) | null;

      try {
        release = await attempt;
      } catch (error) {
        // Releasing this tab's shared presence is part of the upgrade attempt.
        // A rejected lock request must restore that shared guard before the
        // caller can continue in read-only mode.
        presenceRestore = acquireSharedPresence();

        try {
          await presenceRestore;
        } catch {
          // The original lock failure is the useful failure to surface. A
          // failed restore still leaves the coordinator fail-closed because a
          // later destructive attempt cannot find a held shared presence.
        }

        throw error;
      }

      if (release === null) {
        presenceRestore = acquireSharedPresence();
        await presenceRestore;
        throw new Error('Another ProgressPal tab is active.');
      }

      let restoration: Promise<void> | null = null;
      return () => {
        if (restoration !== null) {
          return restoration;
        }

        release();
        presenceRestore = Promise.resolve(exclusiveRequest).then(() => {
          if (!stopped) {
            return acquireSharedPresence();
          }
        });
        restoration = presenceRestore;
        return restoration;
      };
    },
    start: async (listener) => {
      // Presence must be held before writer ownership is announced. Otherwise
      // a fast writer-lock grant could make the coordinator writable while its
      // shared presence request is still queued.
      await acquireSharedPresence();
      await startWriterOwnership(listener);
    },
    stop: () => {
      if (stopped) {
        return;
      }

      stopped = true;
      abortPresenceRequest?.abort();
      abortPresenceRequest = null;
      abortQueuedWriterRequest?.abort();
      abortQueuedWriterRequest = null;
      releaseExclusivePresence?.();
      releaseExclusivePresence = null;
      releaseSharedPresence?.();
      releaseSharedPresence = null;
      releaseWriterLock?.();
      releaseWriterLock = null;
    },
  };
}

function createBrowserTransport(): LocalCoordinationTransport {
  const listeners = new Set<(message: LocalCoordinationMessage) => void>();
  const seenMessages = new Set<string>();
  const seenMessageOrder: string[] = [];
  let channel: BroadcastChannel | null = null;
  let broadcastAvailable = false;
  let closed = false;
  let storageAvailable = true;

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(channelName);
      broadcastAvailable = true;
    } catch {
      channel = null;
    }
  }

  try {
    localStorage.getItem(messageStorageKey);
  } catch {
    storageAvailable = false;
  }

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
    try {
      channel.addEventListener('message', (event) => deliver(event.data));
    } catch {
      broadcastAvailable = false;
    }
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
      closed = true;
      window.removeEventListener('storage', handleStorage);
      try {
        channel?.close();
      } catch {
        // Closing a failed transport is best-effort.
      }
      broadcastAvailable = false;
      storageAvailable = false;
      listeners.clear();
    },
    isAvailable: () => !closed && (broadcastAvailable || storageAvailable),
    post: (message) => {
      if (closed) {
        return;
      }

      if (channel !== null && broadcastAvailable) {
        try {
          channel.postMessage(message);
        } catch {
          broadcastAvailable = false;
        }
      }

      try {
        localStorage.setItem(messageStorageKey, JSON.stringify(message));
        storageAvailable = true;
      } catch {
        storageAvailable = false;
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
    const storedValue = localStorage.getItem(revisionStorageKey);

    if (storedValue === null) {
      return 0;
    }

    const value = Number(storedValue);
    return Number.isSafeInteger(value) && value >= 0
      ? value
      : Number.MAX_SAFE_INTEGER;
  } catch {
    return 0;
  }
}

function writeBrowserRevision(revision: number) {
  localStorage.setItem(revisionStorageKey, String(revision));
}

const uncoordinatedStatus: LocalCoordinationStatus = {
  blockReason: null,
  canWrite: true,
  peerActive: false,
  phase: 'ready',
  revision: 0,
  stale: false,
  writeOwnership: 'owned',
};

let activeCoordinator: LocalDataCoordinator | null = null;
let stopActiveSession: (() => void) | null = null;

export function startLocalDataCoordination(
  listener: (status: LocalCoordinationStatus) => void,
) {
  if (typeof window === 'undefined') {
    listener(uncoordinatedStatus);
    return { ready: Promise.resolve(), stop: () => undefined };
  }

  stopActiveSession?.();
  let coordinator: LocalDataCoordinator | null = null;
  let retainedGuard: LocalDataCoordinator | null = null;
  let resolveReady: () => void = () => undefined;
  let sessionStopped = false;
  let unsubscribe: (() => void) | null = null;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  const startCoordinator = (
    initialState?: Pick<LocalCoordinationStatus, 'revision' | 'stale'>,
  ) => {
    const nextCoordinator = new LocalDataCoordinator({
      initialState,
      readRevision: readBrowserRevision,
      tabId:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      transport: createBrowserTransport(),
      writeOwnership: createBrowserWriteOwnership(),
      writeRevision: writeBrowserRevision,
    });

    coordinator = nextCoordinator;
    retainedGuard = null;
    activeCoordinator = nextCoordinator;
    const nextUnsubscribe = nextCoordinator.subscribe(listener);

    if (sessionStopped) {
      nextUnsubscribe();
      nextCoordinator.stop();
      return Promise.resolve();
    }

    unsubscribe = nextUnsubscribe;
    const coordinatorReady = nextCoordinator.start();
    void coordinatorReady.then(resolveReady);
    return coordinatorReady;
  };

  const stopCoordinator = (retainWriteGuard = false) => {
    const currentCoordinator = coordinator;

    unsubscribe?.();
    unsubscribe = null;
    currentCoordinator?.stop();
    coordinator = null;

    if (retainWriteGuard) {
      retainedGuard = currentCoordinator;
    } else {
      if (
        activeCoordinator === currentCoordinator ||
        activeCoordinator === retainedGuard
      ) {
        activeCoordinator = null;
      }
      retainedGuard = null;
    }
  };

  const handlePageHide = () => {
    stopCoordinator(true);
  };
  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted && !sessionStopped && coordinator === null) {
      const retainedStatus = retainedGuard?.getStatus();

      void startCoordinator({
        revision: retainedStatus?.revision ?? readBrowserRevision(),
        stale: true,
      });
    }
  };
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('pageshow', handlePageShow);

  const stop = () => {
    if (sessionStopped) {
      return;
    }

    sessionStopped = true;
    resolveReady();
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('pageshow', handlePageShow);
    stopCoordinator();

    if (stopActiveSession === stop) {
      stopActiveSession = null;
    }
  };

  // Install ownership before any synchronous listener invocation. A listener
  // may start a replacement session, which must be able to stop this one.
  stopActiveSession = stop;
  void startCoordinator();

  return {
    ready,
    stop,
  };
}

export function getLocalCoordinationStatus() {
  return activeCoordinator?.getStatus() ?? uncoordinatedStatus;
}

export function captureLocalDataRevision(): LocalDataRevisionToken {
  return (
    activeCoordinator?.captureRevision() ?? {
      [localDataRevisionTokenOwner]: null,
      [localDataRevisionTokenWriteEpoch]: 0,
      revision: 0,
    }
  );
}

const uncoordinatedWriteLease: LocalWriteLease = {
  abort: () => undefined,
  complete: () => undefined,
};

export function beginLocalWrite(
  options: { destructive?: boolean } = {},
): LocalWriteLease {
  if (options.destructive === true) {
    throw new Error(
      'Use beginDestructiveLocalWrite() for destructive local writes.',
    );
  }

  if (activeCoordinator !== null) {
    return activeCoordinator.beginWrite(options);
  }

  if (typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
    throw new LocalWriteBlockedError('unavailable');
  }

  return uncoordinatedWriteLease;
}

export async function beginDestructiveLocalWrite(): Promise<LocalWriteLease> {
  if (activeCoordinator !== null) {
    return activeCoordinator.beginDestructiveWrite();
  }

  if (typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
    throw new LocalWriteBlockedError('unavailable', true);
  }

  return uncoordinatedWriteLease;
}

export function markLocalDataSynchronized(token: LocalDataRevisionToken) {
  if (activeCoordinator === null) {
    return token[localDataRevisionTokenOwner] === null;
  }

  return activeCoordinator.markSynchronized(token);
}

export function validateLocalDataRevision(token: LocalDataRevisionToken) {
  if (activeCoordinator === null) {
    return token[localDataRevisionTokenOwner] === null;
  }

  return activeCoordinator.validateRevision(token);
}
