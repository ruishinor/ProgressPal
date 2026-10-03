import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import { expect, test, type Page } from '@playwright/test';

// This file's tsconfig project has no DOM lib (`e2e/**` compiles under
// `lib: ["ES2022"]`); page.evaluate callbacks still run in a real browser, so
// narrow ambient declarations stand in for the DOM globals actually used
// here, the same way e2e/accessibility.spec.ts declares `document`.
type BrowserWorker = {
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
};
declare const Worker: new (
  scriptURL: string,
  options?: { type?: string; name?: string },
) => BrowserWorker;
declare const window: Record<string, unknown>;
declare const fetch: (url: string) => Promise<{ json(): Promise<unknown> }>;
declare function setTimeout(handler: () => void, timeoutMs: number): number;
declare function clearTimeout(id: number): void;
declare const indexedDB: {
  databases(): Promise<{ name?: string }[]>;
};

/**
 * Isolation of the learner Python worker, exercised the way a hostile
 * program would. This loads the exact packaged worker script (the one the
 * build lists in `runtime/offline.json`) under the production
 * Content-Security-Policy, lets it harden itself, and runs probe programs as
 * learner code. Requests are observed from the browser and from a canary
 * server, never inferred from Python exceptions. Set PP_ISOLATION_EVIDENCE_DIR
 * to keep the raw observations.
 *
 * The contract these tests pin, and the reason it holds:
 *
 * - The `sys.modules[name] = None` sentinels refuse a plain `import` and are
 *   NOT the boundary: popping one and importing again returns the bridge.
 * - The boundary is that the bridge reaches nothing. Pyodide is given an empty
 *   `jsglobals` object, so `js` is a proxy of an object with no `fetch`,
 *   `XMLHttpRequest`, `eval`, `indexedDB` or `self`. The Python modules that
 *   would use the network (`pyodide.http`) bind those names with
 *   `from js import ...` at import time, find nothing, and have nothing to
 *   call. The worker also removes the network and storage globals from its
 *   own scope, so Pyodide's JavaScript side (package loader, IDBFS) finds none
 *   either. The production CSP additionally forbids `eval` and off-origin
 *   connections.
 */

test.use({ serviceWorkers: 'block' });

const runtimeFolder = '/runtime/pyodide-314.0.7/';
const canaryFolder = '/__pp_canary__/';
const probeSource = readFileSync(
  join(process.cwd(), 'e2e', 'support', 'python-isolation-probe.py'),
  'utf8',
);
const networkSource = readFileSync(
  join(process.cwd(), 'e2e', 'support', 'python-isolation-network.py'),
  'utf8',
);

type WorkerReply = {
  ok: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  reason?: string;
};

type Step = {
  ok: boolean;
  kind?: string;
  error?: string;
  message?: string;
};

type ProbeReport = Record<string, Step> & {
  sentinels_before: Record<string, string>;
  js_typeof: string;
  js_own_keys: string[];
  js_reachable_globals: string[];
  function_constructor_value?: string;
  idbfs_sync?: { called: boolean; error: string | null };
};

type NetworkReport = {
  phase: string;
  started: boolean;
  done?: boolean;
  results?: Record<
    string,
    { settled: string; error?: string; message?: string }
  >;
  pyfetch_module_binds_fetch?: boolean;
  pyxhr_module_binds_xhr?: boolean;
};

/** Creates the packaged worker from the page, as the app does. */
async function startWorker(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const list = (await (await fetch('/runtime/offline.json')).json()) as {
      assets: string[];
    };
    const script = list.assets.find((asset) =>
      /^\/assets\/pythonWorker-[\w-]+\.js$/.test(asset),
    );

    if (script === undefined) {
      throw new Error('The packaged worker script is not listed.');
    }

    const worker = new Worker(script, {
      type: 'module',
      name: 'progresspal-python',
    });
    const waiting = new Map<number, (reply: unknown) => void>();
    let sequence = 0;

    worker.onmessage = (event: { data: unknown }) => {
      const reply = event.data as { id: number };
      const done = waiting.get(reply.id);

      if (done !== undefined) {
        waiting.delete(reply.id);
        done(reply);
      }
    };
    worker.onerror = () => {
      for (const done of waiting.values()) {
        done({ ok: false, reason: 'worker error' });
      }
      waiting.clear();
    };

    window.__learnerWorker = {
      call: (message: object, limitMs: number) =>
        new Promise((resolve) => {
          sequence += 1;
          const id = sequence;
          const timer = setTimeout(() => {
            waiting.delete(id);
            resolve({ ok: false, reason: 'timeout' });
          }, limitMs);

          waiting.set(id, (reply) => {
            clearTimeout(timer);
            resolve(reply);
          });
          worker.postMessage({ ...message, id });
        }),
      terminate: () => worker.terminate(),
    };
  });
}

type Call = (message: object, limitMs: number) => Promise<WorkerReply>;

function callWorker(page: Page, message: object, limitMs: number) {
  return page.evaluate(
    ([payload, limit]) =>
      (window.__learnerWorker as { call: Call }).call(
        payload as object,
        limit as number,
      ),
    [message, limitMs] as const,
  );
}

async function loadRuntime(page: Page) {
  const origin = new URL(page.url()).origin;
  const reply = await callWorker(
    page,
    { op: 'load', indexURL: `${origin}${runtimeFolder}` },
    90_000,
  );

  expect(reply.ok, reply.reason).toBe(true);
}

function runProgram(page: Page, source: string, limitMs = 60_000) {
  return callWorker(
    page,
    { op: 'run', source, file: 'probe.py', stdin: '' },
    limitMs,
  );
}

/** The one tagged report line a probe prints, parsed. */
function readReport<T>(outcome: WorkerReply, tag: string): T {
  expect(outcome.ok, outcome.reason).toBe(true);
  expect(outcome.exitCode, outcome.stderr).toBe(0);

  const line = (outcome.stdout ?? '')
    .split('\n')
    .find((entry) => entry.startsWith(`${tag} `));

  expect(line, `no ${tag} line in: ${outcome.stdout ?? ''}`).toBeDefined();

  return JSON.parse((line as string).slice(tag.length + 1)) as T;
}

function keepEvidence(name: string, value: unknown) {
  const folder = process.env.PP_ISOLATION_EVIDENCE_DIR;

  if (folder !== undefined && folder !== '') {
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, name), `${JSON.stringify(value, null, 2)}\n`);
  }
}

/** A second origin that records every request that reaches it. */
async function startCanaryServer() {
  const hits: string[] = [];
  const server: Server = createServer((request, response) => {
    hits.push(`${request.method ?? ''} ${request.url ?? ''}`);
    response.writeHead(200, { 'access-control-allow-origin': '*' });
    response.end('canary');
  });

  await new Promise<void>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve()),
  );

  const { port } = server.address() as AddressInfo;

  return {
    hits,
    origin: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}

test('the import blocker is not the boundary, and the bridge it fails to hide reaches nothing', async ({
  page,
}, testInfo) => {
  await startWorker(page);
  await loadRuntime(page);

  const outcome = await runProgram(page, probeSource, 30_000);
  const report = readReport<ProbeReport>(outcome, 'PROBE_RESULT');
  const observations = { outcome, report };

  await testInfo.attach('observations.json', {
    body: JSON.stringify(observations, null, 2),
    contentType: 'application/json',
  });
  keepEvidence('probe-observations.json', observations);

  const bridge = [
    'js',
    'pyodide_js',
    'pyodide.ffi',
    'pyodide.code',
    'pyodide.http',
  ];
  const refused = [...bridge, 'micropip'];

  // The sentinels are installed, and refuse an ordinary import.
  expect(report.sentinels_before).toEqual(
    Object.fromEntries(refused.map((name) => [name, 'sentinel'])),
  );

  for (const name of refused) {
    expect(report[`plain:${name}`]).toMatchObject({
      ok: false,
      error: 'ModuleNotFoundError',
    });
  }

  // They are advisory: removing one and importing again returns the bridge.
  // `micropip` is not packaged, so there is nothing behind its sentinel.
  expect(report['reacquire:js']).toMatchObject({
    ok: true,
    kind: 'pyodide.ffi.JsProxy',
  });
  expect(report['reacquire:pyodide_js']).toMatchObject({
    ok: true,
    kind: 'pyodide.ffi.JsProxy',
  });

  for (const name of ['pyodide.ffi', 'pyodide.code', 'pyodide.http']) {
    expect(report[`reacquire:${name}`]).toMatchObject({
      ok: true,
      kind: 'builtins.module',
    });
  }

  expect(report['reacquire:micropip']).toMatchObject({
    ok: false,
    error: 'ModuleNotFoundError',
  });

  // What the reacquired `js` is: a proxy of the empty `jsglobals` object, not
  // of the worker's real global scope.
  expect(report.js_typeof).toBe('object');
  expect(report.js_own_keys).toEqual([]);
  expect(report.js_reachable_globals).toEqual([]);

  // So the bridge's own JavaScript-evaluation helper has no `eval` to call.
  expect(report.run_js).toMatchObject({ ok: false, error: 'ImportError' });

  // Evaluating a string through `Function` is not available either (the
  // production CSP forbids it). If it ever were, it could only see a worker
  // scope with the network removed.
  if (report.function_constructor?.ok === true) {
    expect(report.function_constructor_value).toBe('undefined');
  } else {
    expect(report.function_constructor).toMatchObject({
      ok: false,
      error: 'JsException',
    });
    expect(report.function_constructor?.message).toContain('EvalError');
    expect(report.function_constructor?.message).toContain('unsafe-eval');
  }

  // Emscripten's IndexedDB-backed filesystem can be mounted, but it looks up
  // `indexedDB` in the worker scope when it syncs, and the worker removed it.
  expect(report.idbfs_mount).toMatchObject({ ok: true });
  expect(report.idbfs_sync?.called).toBe(true);
  expect(report.idbfs_sync?.error).toContain("reading 'open'");

  // No pure-Python network route exists.
  expect(report.socket_connect).toMatchObject({ ok: false, error: 'OSError' });
  expect(report.urllib_urlopen).toMatchObject({ ok: false, error: 'URLError' });

  // Independently, from the browser side: nothing was created in this
  // origin's IndexedDB by the mounted filesystem.
  const databases = await page.evaluate(async () => {
    const list = await indexedDB.databases();
    return list.map((entry) => entry.name);
  });

  expect(databases.some((name) => name?.includes('pp_isolation'))).toBe(false);
});

test('awaited network routes dispatch no same-origin or cross-origin request', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);

  const canary = await startCanaryServer();
  const requests: string[] = [];

  page.context().on('request', (request) => requests.push(request.url()));

  try {
    // A script a worker can load under the production CSP, used only as a
    // positive control: an unhardened worker.
    await page.context().route(`**${canaryFolder}control-worker.js`, (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: `self.onmessage = async (event) => {
          const outcome = {};
          for (const [label, url] of Object.entries(event.data)) {
            try {
              const response = await fetch(url, { mode: 'no-cors' });
              outcome[label] = 'dispatched:' + response.type;
            } catch (error) {
              outcome[label] = 'threw:' + error.name;
            }
          }
          self.postMessage(outcome);
        };`,
      }),
    );

    // The same runtime, loaded the way the packaged worker loads it but never
    // hardened: it shows that the loader's download primitive does dispatch a
    // same-origin request when `fetch` exists.
    await page.context().route(`**${canaryFolder}control-runtime.js`, (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: `self.onmessage = async (event) => {
          const { indexURL, urls } = event.data;
          const outcome = {};
          try {
            const { loadPyodide } = await import(indexURL + 'pyodide.mjs');
            const pyodide = await loadPyodide({
              indexURL,
              jsglobals: Object.create(null),
              stdout: () => undefined,
              stderr: () => undefined,
            });
            for (const [label, url] of Object.entries(urls)) {
              try {
                await pyodide._api.loadBinaryFile(url);
                outcome[label] = 'dispatched';
              } catch (error) {
                outcome[label] = 'threw:' + error.name;
              }
            }
          } catch (error) {
            outcome.error = String(error);
          }
          self.postMessage(outcome);
        };`,
      }),
    );

    await startWorker(page);
    await loadRuntime(page);

    const origin = new URL(page.url()).origin;
    const sameUrl = `${origin}${canaryFolder}same-origin`;
    const crossUrl = `${canary.origin}${canaryFolder}cross-origin`;

    // Positive control for the observation channel: the learner worker's own
    // load was seen, so a request it makes would be seen too.
    expect(
      requests.some((url) => url.endsWith(`${runtimeFolder}pyodide.asm.wasm`)),
    ).toBe(true);

    // Positive control for the canary server: a request that reaches it is
    // recorded.
    await globalThis.fetch(`${canary.origin}${canaryFolder}server-control`);
    expect(canary.hits).toEqual([`GET ${canaryFolder}server-control`]);
    canary.hits.length = 0;

    // Positive control for the page and for an unhardened worker under this
    // CSP: a same-origin request is dispatched and observed, and the
    // cross-origin one is stopped by the CSP before it leaves the browser.
    const control = await page.evaluate(
      ([script, urls]) =>
        new Promise<Record<string, string>>((resolve) => {
          const worker = new Worker(script as string);

          worker.onmessage = (event: { data: unknown }) => {
            worker.terminate();
            resolve(event.data as Record<string, string>);
          };
          worker.postMessage(urls);
        }),
      [
        `${canaryFolder}control-worker.js`,
        {
          same: `${origin}${canaryFolder}control-same`,
          cross: `${canary.origin}${canaryFolder}control-cross`,
        },
      ] as const,
    );

    expect(control.same).toMatch(/^dispatched:/);
    expect(requests).toContain(`${origin}${canaryFolder}control-same`);
    expect(control.cross).toBe('threw:TypeError');
    expect(canary.hits).toEqual([]);

    const runtimeControl = await page.evaluate(
      ([script, indexURL, urls]) =>
        new Promise<Record<string, string>>((resolve) => {
          const worker = new Worker(script as string, { type: 'module' });

          worker.onmessage = (event: { data: unknown }) => {
            worker.terminate();
            resolve(event.data as Record<string, string>);
          };
          worker.onerror = (event: unknown) => {
            worker.terminate();
            resolve({ error: String((event as { message?: string }).message) });
          };
          worker.postMessage({ indexURL, urls });
        }),
      [
        `${canaryFolder}control-runtime.js`,
        `${origin}${runtimeFolder}`,
        {
          same: `${origin}${canaryFolder}control-runtime-same`,
          cross: `${canary.origin}${canaryFolder}control-runtime-cross`,
        },
      ] as const,
    );

    expect(runtimeControl).toMatchObject({ same: 'dispatched' });
    expect(requests).toContain(`${origin}${canaryFolder}control-runtime-same`);
    expect(runtimeControl.cross).toMatch(/^threw:/);
    expect(canary.hits).toEqual([]);

    // Everything seen from here on belongs to the probe. (A request the CSP
    // stops still shows up as a request here, so this also catches attempts.)
    const controlRequests = requests.length;

    // The probe: start every route against both canaries, then keep running
    // collect programs in the same worker until the task has settled.
    const prepare = (phase: string) =>
      networkSource
        .replace('__PHASE__', phase)
        .replace('__SAME_ORIGIN_URL__', sameUrl)
        .replace('__CROSS_ORIGIN_URL__', crossUrl);

    const started = readReport<NetworkReport>(
      await runProgram(page, prepare('start'), 30_000),
      'NETWORK_RESULT',
    );

    expect(started.started).toBe(true);

    let report: NetworkReport = started;
    const deadline = Date.now() + 30_000;

    while (report.done !== true && Date.now() < deadline) {
      await page.waitForTimeout(250);
      report = readReport<NetworkReport>(
        await runProgram(page, prepare('collect'), 30_000),
        'NETWORK_RESULT',
      );
    }

    // Let any request still in flight reach the observers.
    await page.waitForTimeout(1_500);

    const observations = {
      report,
      requests: requests.filter((url) => url.includes(canaryFolder)),
      probeRequests: requests.slice(controlRequests),
      crossOriginServerHits: canary.hits,
      control,
      runtimeControl,
    };

    await testInfo.attach('network-observations.json', {
      body: JSON.stringify(observations, null, 2),
      contentType: 'application/json',
    });
    keepEvidence('network-observations.json', observations);

    // The result that matters, from outside the worker: no request reached
    // the network, same-origin or cross-origin, and none left this origin.
    const probeRequests = requests.slice(controlRequests);

    expect(probeRequests.filter((url) => url.startsWith(sameUrl))).toEqual([]);
    expect(probeRequests.filter((url) => url.startsWith(crossUrl))).toEqual([]);
    expect(canary.hits).toEqual([]);
    expect(
      probeRequests.filter(
        (url) =>
          !url.startsWith(origin) &&
          !url.startsWith('data:') &&
          !url.startsWith('blob:'),
      ),
    ).toEqual([]);

    // Every route was driven to a settled result, not abandoned.
    expect(report.done).toBe(true);
    const routes = ['loadBinaryFile', 'loadPackage', 'open_url', 'pyfetch'];

    expect(Object.keys(report.results ?? {}).sort()).toEqual(
      routes.flatMap((route) => [`${route}:cross`, `${route}:same`]).sort(),
    );

    // Three routes fail with an error. The package loader reports a failed
    // download through its callbacks and settles without one, so it is held
    // to the external check above like the rest.
    for (const [route, outcome] of Object.entries(report.results ?? {})) {
      if (!route.startsWith('loadPackage:')) {
        expect(outcome.settled, route).toBe('raised');
      }
    }

    // The architectural reason the Python routes cannot work: `pyodide.http`
    // bound nothing from the empty `js`.
    expect(report.pyfetch_module_binds_fetch).toBe(false);
    expect(report.pyxhr_module_binds_xhr).toBe(false);
  } finally {
    await canary.close();
  }
});
