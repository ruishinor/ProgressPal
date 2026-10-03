/**
 * The dedicated worker that runs learner Python for the evaluators (owner
 * decision 2026-10-03, runtime spike). It loads the pinned Pyodide runtime
 * from the app's own origin, installs the authoring harness, then removes
 * every network and storage capability from its own global scope before any
 * learner code can run. Learner code never reaches the page, IndexedDB, the
 * network or another tab; a run that exceeds its time limit is stopped by
 * the page terminating this worker.
 *
 * Messages: `{ id, op: 'load', indexURL }` and
 * `{ id, op: 'run', source, file, stdin }`; every reply carries its `id`.
 */

type LoadMessage = { id: number; op: 'load'; indexURL: string };
type RunMessage = {
  id: number;
  op: 'run';
  source: string;
  file: string;
  stdin: string;
};

type PyProxy = { toJs(): unknown; destroy(): void };
type PyodideApi = {
  runPython(code: string): unknown;
  globals: {
    get(name: string): (...args: string[]) => PyProxy;
  };
};
type PyodideModule = {
  loadPyodide(options: {
    indexURL: string;
    jsglobals: object;
    stdout: (text: string) => void;
    stderr: (text: string) => void;
  }): Promise<PyodideApi>;
};

type WorkerScope = {
  onmessage: ((event: MessageEvent<LoadMessage | RunMessage>) => void) | null;
  postMessage(message: unknown): void;
};

/**
 * The authoring harness (the spike's parity harness, 162 of 162 authored
 * vectors): the program is saved under the exercise's file name and run as
 * `__main__` with the test's stdin; `input()` echoes what it read, so stdout
 * is the interactive transcript the expectations were recorded from; a
 * traceback starts at the learner's file. Modules that bridge to JavaScript
 * are blocked.
 */
const harness = String.raw`
import builtins, sys, io, os, runpy, traceback
for blocked in ('js', 'pyodide_js', 'pyodide.ffi', 'pyodide.http', 'pyodide.code', 'micropip'):
    sys.modules[blocked] = None
def __pp_run(code, file, stdin):
    os.makedirs('/tmp/pp_run', exist_ok=True)
    os.chdir('/tmp/pp_run')
    path = os.path.abspath(file)
    with open(path, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(code if code.endswith('\n') else code + '\n')
    out, err = io.StringIO(), io.StringIO()
    old = (sys.stdin, sys.stdout, sys.stderr, builtins.input, sys.argv)
    sys.stdin, sys.stdout, sys.stderr = io.StringIO(stdin), out, err
    def _input(prompt=''):
        sys.stdout.write(str(prompt))
        sys.stdout.flush()
        line = sys.stdin.readline()
        if line == '':
            raise EOFError('EOF when reading a line')
        text = line.rstrip('\r\n')
        sys.stdout.write(text + '\n')
        return text
    builtins.input = _input
    sys.argv = [file]
    code_exit = 0
    try:
        runpy.run_path(path, run_name='__main__')
    except SystemExit as stop:
        code_exit = stop.code if isinstance(stop.code, int) else (0 if stop.code is None else 1)
    except BaseException as error:
        tb = error.__traceback__
        while tb is not None and os.path.abspath(tb.tb_frame.f_code.co_filename) != path:
            tb = tb.tb_next
        sys.stdout.flush()
        traceback.print_exception(type(error), error, tb)
        code_exit = 1
    finally:
        sys.stdin, sys.stdout, sys.stderr, builtins.input, sys.argv = old
    return [code_exit, out.getvalue(), err.getvalue()]
`;

/** Capabilities removed from this worker once the runtime has loaded. */
const removedCapabilities = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'indexedDB',
  'caches',
  'BroadcastChannel',
  'importScripts',
] as const;

const scope = self as unknown as WorkerScope;
let run: ((...args: string[]) => PyProxy) | null = null;

function harden() {
  for (const name of removedCapabilities) {
    Object.defineProperty(self, name, {
      value: undefined,
      configurable: false,
      writable: false,
    });
  }

  for (const name of removedCapabilities) {
    if ((self as unknown as Record<string, unknown>)[name] !== undefined) {
      throw new Error(`Worker capability "${name}" could not be removed.`);
    }
  }
}

scope.onmessage = (event) => {
  const message = event.data;

  void (async () => {
    try {
      if (message.op === 'load') {
        if (run !== null) {
          throw new Error('The runtime is already loaded.');
        }

        const pyodideModule = (await import(
          /* @vite-ignore */ `${message.indexURL}pyodide.mjs`
        )) as PyodideModule;
        const pyodide = await pyodideModule.loadPyodide({
          indexURL: message.indexURL,
          jsglobals: Object.create(null) as object,
          stdout: () => undefined,
          stderr: () => undefined,
        });

        pyodide.runPython(harness);
        run = pyodide.globals.get('__pp_run');
        harden();
        scope.postMessage({ id: message.id, ok: true });
        return;
      }

      if (run === null) {
        throw new Error('The runtime is not loaded.');
      }

      const result = run(message.source, message.file, message.stdin);
      const [exitCode, stdout, stderr] = result.toJs() as [
        number,
        string,
        string,
      ];
      result.destroy();

      scope.postMessage({ id: message.id, ok: true, exitCode, stdout, stderr });
    } catch (error) {
      scope.postMessage({
        id: message.id,
        ok: false,
        reason: String(error instanceof Error ? error.message : error).slice(
          0,
          300,
        ),
      });
    }
  })();
};
