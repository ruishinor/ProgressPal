import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createWorkerPythonRuntime,
  getPythonRuntime,
  pythonRuntimeVersion,
  type RuntimeWorker,
} from '@/lib/evaluation';

import packageJson from '../../../package.json';

/**
 * The worker-backed Python runtime (owner decision 2026-10-03, runtime
 * spike): one dedicated worker, one program at a time, a timed-out or
 * crashed worker is terminated and replaced, and a runtime that cannot load
 * is honestly unavailable. A scripted fake stands in for the worker; the
 * real worker runs in the browser E2E.
 */

type Posted = { id: number; op: 'load' | 'run'; [key: string]: unknown };

class FakeWorker implements RuntimeWorker {
  onmessage: RuntimeWorker['onmessage'] = null;
  onerror: RuntimeWorker['onerror'] = null;
  readonly posted: Posted[] = [];
  terminated = false;

  postMessage(message: unknown) {
    this.posted.push(message as Posted);
  }

  terminate() {
    this.terminated = true;
  }

  reply(data: object) {
    this.onmessage?.({ data } as MessageEvent);
  }

  last() {
    return this.posted.at(-1)!;
  }
}

let workers: FakeWorker[];

function runtime(loadTimeoutMs = 60_000) {
  return createWorkerPythonRuntime({
    indexURL: 'https://progresspal.example/runtime/pyodide-314.0.7/',
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    loadTimeoutMs,
  });
}

const request = {
  source: 'print(1)',
  file: 'a.py',
  stdin: '',
  timeoutMs: 2000,
};

beforeEach(() => {
  workers = [];
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the worker-backed Python runtime', () => {
  it('pins the runtime version to the exact package version', () => {
    expect(packageJson.devDependencies.pyodide).toBe(pythonRuntimeVersion);
  });

  it('is unavailable where there are no workers (this test environment)', () => {
    expect(getPythonRuntime().status()).toBe('unavailable');
  });

  it('loads only when prepared, once, and is available after the load succeeds', () => {
    const python = runtime();
    const changes = vi.fn();
    python.subscribe!(changes);

    expect(workers).toHaveLength(0);
    python.prepare!();
    python.prepare!();
    expect(workers).toHaveLength(1);
    expect(python.status()).toBe('loading');
    expect(workers[0]!.last()).toMatchObject({
      op: 'load',
      indexURL: 'https://progresspal.example/runtime/pyodide-314.0.7/',
    });

    workers[0]!.reply({ id: workers[0]!.last().id, ok: true });
    return vi.waitFor(() => {
      expect(python.status()).toBe('available');
      expect(changes).toHaveBeenCalled();
    });
  });

  it('is unavailable after a failed or timed-out load, and refuses to run', async () => {
    const failed = runtime();
    failed.prepare!();
    workers[0]!.reply({ id: workers[0]!.last().id, ok: false, reason: 'x' });
    await vi.waitFor(() => expect(failed.status()).toBe('unavailable'));
    expect(workers[0]!.terminated).toBe(true);
    expect(await failed.run(request)).toMatchObject({ kind: 'failed' });

    const slow = runtime(1000);
    slow.prepare!();
    await vi.advanceTimersByTimeAsync(1001);
    expect(slow.status()).toBe('unavailable');
  });

  async function ready() {
    const python = runtime();
    python.prepare!();
    workers.at(-1)!.reply({ id: workers.at(-1)!.last().id, ok: true });
    await vi.waitFor(() => expect(python.status()).toBe('available'));
    return python;
  }

  it('returns the completed run the worker reports', async () => {
    const python = await ready();
    const run = python.run(request);
    await vi.waitFor(() => expect(workers[0]!.last().op).toBe('run'));
    expect(workers[0]!.last()).toMatchObject({
      source: 'print(1)',
      file: 'a.py',
      stdin: '',
    });
    workers[0]!.reply({
      id: workers[0]!.last().id,
      ok: true,
      exitCode: 0,
      stdout: '1\n',
      stderr: '',
    });

    expect(await run).toEqual({
      kind: 'completed',
      exitCode: 0,
      stdout: '1\n',
      stderr: '',
    });
  });

  it('terminates a program at its time limit and loads a fresh worker', async () => {
    const python = await ready();
    const run = python.run(request);
    await vi.waitFor(() => expect(workers[0]!.last().op).toBe('run'));

    await vi.advanceTimersByTimeAsync(2001);

    expect(await run).toEqual({ kind: 'timeout' });
    expect(workers[0]!.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(python.status()).toBe('loading');
    workers[1]!.reply({ id: workers[1]!.last().id, ok: true });
    await vi.waitFor(() => expect(python.status()).toBe('available'));
  });

  it('reports a crashed worker as a failure, not a timeout, and replaces it', async () => {
    const python = await ready();
    const run = python.run(request);
    await vi.waitFor(() => expect(workers[0]!.last().op).toBe('run'));

    workers[0]!.onerror?.(new Event('error'));

    expect(await run).toMatchObject({ kind: 'failed' });
    expect(workers[0]!.terminated).toBe(true);
    expect(workers).toHaveLength(2);
  });

  it('runs one program at a time, in order', async () => {
    const python = await ready();
    const first = python.run({ ...request, source: 'first' });
    const second = python.run({ ...request, source: 'second' });
    await vi.waitFor(() => expect(workers[0]!.last().op).toBe('run'));

    expect(
      workers[0]!.posted.filter((message) => message.op === 'run'),
    ).toHaveLength(1);
    workers[0]!.reply({ id: workers[0]!.last().id, ok: true, exitCode: 0 });
    await first;
    await vi.waitFor(() =>
      expect(workers[0]!.last()).toMatchObject({ source: 'second' }),
    );
    workers[0]!.reply({ id: workers[0]!.last().id, ok: true, exitCode: 0 });
    expect(await second).toMatchObject({ kind: 'completed' });
  });
});
