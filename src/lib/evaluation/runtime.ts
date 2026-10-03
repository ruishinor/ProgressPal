import { resolveSameOriginAsset } from '@/lib/assets';

/**
 * The Python execution boundary for the 49 runtime-dependent exercises
 * (42 `program`, 7 `testtable`). The owner accepted the runtime spike's
 * outcome on 2026-10-03: a pinned Pyodide build (CPython 3.14) served from
 * this origin under `runtime/`, run in a dedicated worker, with only
 * `'wasm-unsafe-eval'` added to the script policy. Learner code is never
 * sent to a server, and it runs only in that worker (see `pythonWorker.ts`).
 * Where workers or WebAssembly are missing, or the runtime cannot load,
 * executable evaluation is honestly unavailable.
 *
 * A runtime must reproduce the authoring harness: the program is saved as
 * the exercise's file name, run with the test's stdin, and `input()` echoes
 * what it read, so stdout is the interactive transcript the authored
 * expectations were recorded from.
 */

/** The pinned runtime (package `pyodide`, exact version in package.json). */
export const pythonRuntimeVersion = '314.0.7';
export const pythonRuntimePath = `runtime/pyodide-${pythonRuntimeVersion}/`;

export type PythonRunRequest = {
  readonly source: string;
  readonly file: string;
  readonly stdin: string;
  /** The authored `timeout_s`, enforced by the runtime. */
  readonly timeoutMs: number;
};

export type PythonRunResult =
  | {
      readonly kind: 'completed';
      readonly exitCode: number;
      readonly stdout: string;
      readonly stderr: string;
    }
  /** The runtime stopped the program at its time limit. */
  | { readonly kind: 'timeout' }
  /** Initialization failure, worker crash, missing asset or similar. */
  | { readonly kind: 'failed'; readonly reason: string };

/** `loading` is not available: nothing may be submitted until it is ready. */
export type PythonRuntimeStatus = 'available' | 'loading' | 'unavailable';

export type PythonRuntime = {
  /** Whether evaluation can run now. Checked before a submit is accepted. */
  status(): PythonRuntimeStatus;
  run(request: PythonRunRequest): Promise<PythonRunResult>;
  /** Starts loading the runtime, once; a no-op when it cannot exist here. */
  prepare?(): void;
  /** Calls the listener after every status change; returns the unsubscribe. */
  subscribe?(listener: () => void): () => void;
};

/** A runtime for environments without workers or WebAssembly. */
export const unavailablePythonRuntime: PythonRuntime = Object.freeze({
  status: () => 'unavailable' as const,
  run: async (): Promise<PythonRunResult> => ({
    kind: 'failed',
    reason: 'Executable evaluation is not available.',
  }),
});

/** The part of a dedicated worker the runtime uses. */
export type RuntimeWorker = {
  onmessage: ((event: MessageEvent<WorkerReply>) => void) | null;
  onerror: ((event: Event) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
};

type WorkerReply =
  | {
      readonly id: number;
      readonly ok: true;
      readonly exitCode?: number;
      readonly stdout?: string;
      readonly stderr?: string;
    }
  | { readonly id: number; readonly ok: false; readonly reason?: string };

type CallOutcome = WorkerReply | 'timeout' | 'stopped';

export type WorkerRuntimeOptions = {
  /** Absolute same-origin URL of the runtime folder, ending in `/`. */
  readonly indexURL: string;
  readonly createWorker: () => RuntimeWorker;
  /** Time allowed for loading the runtime (default 60 s). */
  readonly loadTimeoutMs?: number;
};

/**
 * Runs Python in one dedicated worker at a time, one program at a time. A
 * program that exceeds its time limit, or a worker that crashes, is stopped
 * by terminating the worker; a fresh worker then loads in the background.
 * A runtime that fails to load stays unavailable for this page.
 */
export function createWorkerPythonRuntime(
  options: WorkerRuntimeOptions,
): PythonRuntime {
  const loadTimeoutMs = options.loadTimeoutMs ?? 60_000;
  const listeners = new Set<() => void>();
  const pending = new Map<number, (outcome: CallOutcome) => void>();
  let state: 'idle' | 'loading' | 'ready' | 'failed' = 'idle';
  let worker: RuntimeWorker | null = null;
  let sequence = 0;
  let queue: Promise<unknown> = Promise.resolve();

  function setState(next: typeof state) {
    if (state !== next) {
      state = next;
      for (const listener of [...listeners]) {
        listener();
      }
    }
  }

  function settleAll() {
    for (const done of [...pending.values()]) {
      done('stopped');
    }
    pending.clear();
  }

  function stop() {
    worker?.terminate();
    worker = null;
    settleAll();
  }

  /** Posts one message and resolves with its reply, or why there is none. */
  function call(message: object, timeoutMs: number) {
    const target = worker;
    const id = (sequence += 1);

    return new Promise<CallOutcome>((resolve) => {
      if (target === null) {
        resolve('stopped');
        return;
      }

      const timer = setTimeout(() => {
        pending.delete(id);
        resolve('timeout');
      }, timeoutMs);

      pending.set(id, (outcome) => {
        clearTimeout(timer);
        resolve(outcome);
      });
      target.postMessage({ ...message, id });
    });
  }

  function start() {
    const created = options.createWorker();

    worker = created;
    created.onmessage = (event) => {
      const done = pending.get(event.data.id);

      if (done !== undefined) {
        pending.delete(event.data.id);
        done(event.data);
      }
    };
    created.onerror = () => {
      if (worker === created) {
        settleAll();
      }
    };
    setState('loading');

    void call({ op: 'load', indexURL: options.indexURL }, loadTimeoutMs).then(
      (reply) => {
        if (worker !== created) {
          return;
        }

        if (typeof reply === 'object' && reply.ok) {
          setState('ready');
        } else {
          stop();
          setState('failed');
        }
      },
    );
  }

  async function runOne(request: PythonRunRequest): Promise<PythonRunResult> {
    if (state !== 'ready') {
      return { kind: 'failed', reason: 'The Python runtime is not ready.' };
    }

    const reply = await call(
      {
        op: 'run',
        source: request.source,
        file: request.file,
        stdin: request.stdin,
      },
      request.timeoutMs,
    );

    if (typeof reply === 'string') {
      // Over its time limit, or crashed: stop it and load a fresh worker.
      stop();
      start();
      return reply === 'timeout'
        ? { kind: 'timeout' }
        : { kind: 'failed', reason: 'The Python worker stopped.' };
    }

    if (!reply.ok) {
      return { kind: 'failed', reason: reply.reason ?? 'runtime failure' };
    }

    return {
      kind: 'completed',
      exitCode: reply.exitCode ?? 1,
      stdout: reply.stdout ?? '',
      stderr: reply.stderr ?? '',
    };
  }

  return {
    status: () =>
      state === 'ready'
        ? 'available'
        : state === 'failed'
          ? 'unavailable'
          : 'loading',
    prepare: () => {
      if (state === 'idle') {
        start();
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    run: (request) => {
      const next = queue.then(() => runOne(request));
      queue = next.catch(() => undefined);
      return next;
    },
  };
}

let sharedRuntime: PythonRuntime | null = null;

/** The page's one Python runtime. */
export function getPythonRuntime(): PythonRuntime {
  if (sharedRuntime === null) {
    sharedRuntime =
      typeof Worker === 'undefined' ||
      typeof WebAssembly === 'undefined' ||
      typeof globalThis.location === 'undefined'
        ? unavailablePythonRuntime
        : createWorkerPythonRuntime({
            indexURL: resolveSameOriginAsset(
              pythonRuntimePath,
              new URL('/', globalThis.location.href).href,
            ).href,
            createWorker: () =>
              new Worker(new URL('./pythonWorker.ts', import.meta.url), {
                type: 'module',
                name: 'progresspal-python',
              }) as unknown as RuntimeWorker,
          });
  }

  return sharedRuntime;
}
