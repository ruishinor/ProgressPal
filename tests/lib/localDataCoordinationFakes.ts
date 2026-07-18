type FakeLockCallback<T> = (lock: Lock | null) => T | PromiseLike<T>;

type FakeLockRequest = {
  abortListener: (() => void) | null;
  callback: FakeLockCallback<unknown>;
  mode: LockMode;
  name: string;
  reject: (reason?: unknown) => void;
  resolve: (value: unknown) => void;
  signal: AbortSignal | undefined;
  state: 'held' | 'pending' | 'settled';
};

export class FakeLockManager {
  readonly grantHistory: ReadonlyArray<{ mode: LockMode; name: string }>;
  private readonly grants: Array<{ mode: LockMode; name: string }> = [];
  private readonly held = new Map<string, Set<FakeLockRequest>>();
  private readonly queues = new Map<string, FakeLockRequest[]>();
  private readonly rejectedNames = new Map<string, Error>();
  private readonly scheduledNames = new Set<string>();

  constructor() {
    this.grantHistory = this.grants;
  }

  heldCount(name: string, mode?: LockMode) {
    const held = this.held.get(name) ?? new Set<FakeLockRequest>();
    return [...held].filter(
      (request) => mode === undefined || request.mode === mode,
    ).length;
  }

  pendingCount(name: string) {
    return this.queues.get(name)?.length ?? 0;
  }

  async hold(name: string, mode: LockMode = 'exclusive') {
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

  rejectRequestsFor(
    name: string,
    error = new Error(`Injected Web Lock rejection for ${name}.`),
  ) {
    this.rejectedNames.set(name, error);
  }

  request<T>(name: string, callback: FakeLockCallback<T>): Promise<T>;
  request<T>(
    name: string,
    options: LockOptions,
    callback: FakeLockCallback<T>,
  ): Promise<T>;
  request<T>(
    name: string,
    optionsOrCallback: LockOptions | FakeLockCallback<T>,
    callbackArgument?: FakeLockCallback<T>,
  ): Promise<T> {
    const options =
      typeof optionsOrCallback === 'function' ? {} : optionsOrCallback;
    const callback =
      typeof optionsOrCallback === 'function'
        ? optionsOrCallback
        : callbackArgument;

    if (callback === undefined) {
      return Promise.reject(new TypeError('A lock callback is required.'));
    }

    const injectedRejection = this.rejectedNames.get(name);
    if (injectedRejection !== undefined) {
      return Promise.reject(injectedRejection);
    }

    if (options.signal?.aborted === true) {
      return Promise.reject(
        new DOMException('The lock request was aborted.', 'AbortError'),
      );
    }

    return new Promise<T>((resolve, reject) => {
      const request: FakeLockRequest = {
        abortListener: null,
        callback: callback as FakeLockCallback<unknown>,
        mode: options.mode ?? 'exclusive',
        name,
        reject,
        resolve: (value) => resolve(value as T),
        signal: options.signal,
        state: 'pending',
      };

      this.attachAbortListener(request);

      if (options.ifAvailable === true) {
        void Promise.resolve().then(() => {
          if (request.state !== 'pending') {
            return;
          }

          if (this.canGrantImmediately(request)) {
            this.grant(request);
          } else {
            this.invokeWithoutLock(request);
          }
        });
        return;
      }

      const queue = this.queues.get(name) ?? [];
      queue.push(request);
      this.queues.set(name, queue);
      this.schedule(name);
    });
  }

  private attachAbortListener(request: FakeLockRequest) {
    if (request.signal === undefined) {
      return;
    }

    const abort = () => {
      if (request.state !== 'pending') {
        return;
      }

      const queue = this.queues.get(request.name);
      const index = queue?.indexOf(request) ?? -1;
      if (index >= 0) {
        queue?.splice(index, 1);
      }
      request.state = 'settled';
      request.reject(
        new DOMException('The lock request was aborted.', 'AbortError'),
      );
      this.schedule(request.name);
    };

    request.abortListener = abort;
    request.signal.addEventListener('abort', abort, { once: true });
  }

  private canGrantImmediately(request: FakeLockRequest) {
    if ((this.queues.get(request.name)?.length ?? 0) > 0) {
      return false;
    }

    const held = this.held.get(request.name);
    if (held === undefined || held.size === 0) {
      return true;
    }

    return (
      request.mode === 'shared' &&
      [...held].every((candidate) => candidate.mode === 'shared')
    );
  }

  private detachAbortListener(request: FakeLockRequest) {
    if (request.abortListener !== null) {
      request.signal?.removeEventListener('abort', request.abortListener);
      request.abortListener = null;
    }
  }

  private grant(request: FakeLockRequest) {
    if (request.state !== 'pending') {
      return;
    }

    request.state = 'held';
    this.detachAbortListener(request);
    const held = this.held.get(request.name) ?? new Set<FakeLockRequest>();
    held.add(request);
    this.held.set(request.name, held);
    this.grants.push({ mode: request.mode, name: request.name });
    const lock: Lock = { mode: request.mode, name: request.name };

    void Promise.resolve()
      .then(() => request.callback(lock))
      .then(
        (value) => this.settleHeldRequest(request, value),
        (error: unknown) => this.settleHeldRequest(request, undefined, error),
      );
  }

  private invokeWithoutLock(request: FakeLockRequest) {
    request.state = 'settled';
    this.detachAbortListener(request);

    void Promise.resolve()
      .then(() => request.callback(null))
      .then(request.resolve, request.reject);
  }

  private settleHeldRequest(
    request: FakeLockRequest,
    value: unknown,
    error?: unknown,
  ) {
    if (request.state !== 'held') {
      return;
    }

    request.state = 'settled';
    const held = this.held.get(request.name);
    held?.delete(request);
    if (held?.size === 0) {
      this.held.delete(request.name);
    }

    if (error === undefined) {
      request.resolve(value);
    } else {
      request.reject(error);
    }
    this.schedule(request.name);
  }

  private schedule(name: string) {
    if (this.scheduledNames.has(name)) {
      return;
    }

    this.scheduledNames.add(name);
    void Promise.resolve().then(() => {
      this.scheduledNames.delete(name);
      this.processQueue(name);
    });
  }

  private processQueue(name: string) {
    const queue = this.queues.get(name);
    if (queue === undefined || queue.length === 0) {
      this.queues.delete(name);
      return;
    }

    const held = this.held.get(name);
    if ([...(held ?? [])].some((request) => request.mode === 'exclusive')) {
      return;
    }

    const first = queue[0];
    if (first === undefined) {
      return;
    }

    if (first.mode === 'exclusive') {
      if ((held?.size ?? 0) === 0) {
        queue.shift();
        this.grant(first);
      }
      return;
    }

    while (queue[0]?.mode === 'shared') {
      const next = queue.shift();
      if (next !== undefined) {
        this.grant(next);
      }
    }
  }
}

export type BroadcastDeliveryMode = 'delay' | 'deliver' | 'drop';

export class ControlledBroadcastChannel {
  static deliveryMode: BroadcastDeliveryMode = 'deliver';
  private static readonly channels = new Map<
    string,
    Set<ControlledBroadcastChannel>
  >();
  private static delayedDeliveries: Array<() => void> = [];
  private closed = false;
  private readonly listeners = new Set<(event: MessageEvent) => void>();

  constructor(readonly name: string) {
    const channels = ControlledBroadcastChannel.channels.get(name) ?? new Set();
    channels.add(this);
    ControlledBroadcastChannel.channels.set(name, channels);
  }

  static flushDelayed() {
    const deliveries = ControlledBroadcastChannel.delayedDeliveries;
    ControlledBroadcastChannel.delayedDeliveries = [];
    deliveries.forEach((deliver) => deliver());
  }

  static reset() {
    for (const channels of ControlledBroadcastChannel.channels.values()) {
      for (const channel of channels) {
        channel.closed = true;
        channel.listeners.clear();
      }
    }
    ControlledBroadcastChannel.channels.clear();
    ControlledBroadcastChannel.delayedDeliveries = [];
    ControlledBroadcastChannel.deliveryMode = 'deliver';
  }

  addEventListener(type: 'message', listener: (event: MessageEvent) => void) {
    if (type === 'message' && !this.closed) {
      this.listeners.add(listener);
    }
  }

  close() {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.listeners.clear();
    const channels = ControlledBroadcastChannel.channels.get(this.name);
    channels?.delete(this);
    if (channels?.size === 0) {
      ControlledBroadcastChannel.channels.delete(this.name);
    }
  }

  postMessage(data: unknown) {
    if (this.closed || ControlledBroadcastChannel.deliveryMode === 'drop') {
      return;
    }

    const peers = ControlledBroadcastChannel.channels.get(this.name) ?? [];
    for (const peer of peers) {
      if (peer === this || peer.closed) {
        continue;
      }

      const deliver = () => peer.deliver(data);
      if (ControlledBroadcastChannel.deliveryMode === 'delay') {
        ControlledBroadcastChannel.delayedDeliveries.push(deliver);
      } else {
        void Promise.resolve().then(deliver);
      }
    }
  }

  private deliver(data: unknown) {
    const event = new MessageEvent('message', { data });
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export function installNavigatorLocks(lockManager: unknown) {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    navigator,
    'locks',
  );
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: lockManager,
  });

  return () => {
    if (originalDescriptor === undefined) {
      Reflect.deleteProperty(navigator, 'locks');
    } else {
      Object.defineProperty(navigator, 'locks', originalDescriptor);
    }
  };
}

export async function flushCoordinationMicrotasks(iterations = 20) {
  for (let index = 0; index < iterations; index += 1) {
    await Promise.resolve();
  }
}
