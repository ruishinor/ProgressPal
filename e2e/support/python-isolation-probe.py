"""Isolation probe for the learner Python worker (defensive regression test).

This runs as ordinary learner code inside the production worker. It tries, the
way a program written to get around the worker's boundary would, to win back
the JavaScript bridge and then to use it, and records only what was reachable:
names, types and short error strings, never data. One `PROBE_RESULT` line is
printed for the test to read. Canary values only.

What it establishes (the test asserts each value):

* The `sys.modules[name] = None` sentinels refuse an ordinary `import`, but
  they are not a security boundary: popping one and importing again reaches
  the bridge.
* The reacquired `js` module is a proxy of the empty `jsglobals` object the
  worker passes to Pyodide, not of the worker's real global scope.
* `pyodide.code.run_js` needs `js.eval`, which that object does not have.
* The Emscripten IDBFS backend can be mounted but cannot sync, because the
  worker's own `indexedDB` is gone.
* Pure-Python sockets reach nothing.

Awaited network behaviour is a separate probe (python-isolation-network.py).
"""

import importlib
import json
import socket
import sys
import urllib.request

BRIDGE = ('js', 'pyodide_js', 'pyodide.ffi', 'pyodide.code', 'pyodide.http')
BLOCKED = BRIDGE + ('micropip',)
# Names a real worker global scope has and that would matter if they leaked.
GLOBALS = (
    'self', 'globalThis', 'window', 'fetch', 'XMLHttpRequest', 'WebSocket',
    'EventSource', 'indexedDB', 'caches', 'BroadcastChannel', 'importScripts',
    'postMessage', 'eval', 'Function', 'Worker', 'navigator', 'location',
)
report = {}


def kind(value):
    cls = value if isinstance(value, type) else type(value)
    return cls.__module__ + '.' + cls.__qualname__


def attempt(label, action):
    try:
        value = action()
        report[label] = {'ok': True, 'kind': kind(value)}
        return value
    except BaseException as error:
        report[label] = {
            'ok': False,
            'error': type(error).__name__,
            'message': str(error)[:160],
        }
        return None


def entry(name):
    if name not in sys.modules:
        return 'absent'
    return 'sentinel' if sys.modules[name] is None else 'module'


report['sentinels_before'] = {name: entry(name) for name in BLOCKED}

# What a cooperative program meets: the plain import is refused.
for name in BLOCKED:
    attempt('plain:' + name, lambda n=name: importlib.import_module(n))

# What a hostile program does: remove the sentinel, then import again.
for name in BLOCKED:
    sys.modules.pop(name, None)
    importlib.invalidate_caches()
    attempt('reacquire:' + name, lambda n=name: importlib.import_module(n))

js = sys.modules.get('js')
pyodide_js = sys.modules.get('pyodide_js')

if js is not None:
    report['js_typeof'] = js.typeof
    report['js_own_keys'] = list(js.object_keys())
    report['js_reachable_globals'] = [n for n in GLOBALS if hasattr(js, n)]

# The bridge's own eval helper needs `js.eval`.
code = sys.modules.get('pyodide.code')
if code is not None:
    attempt('run_js', lambda: code.run_js('1 + 1'))

# `Function` is the way to evaluate a string without `js.eval`.
if pyodide_js is not None:
    evaluated = attempt(
        'function_constructor',
        lambda: pyodide_js.constructor.constructor('return typeof fetch')(),
    )

    if report['function_constructor']['ok']:
        report['function_constructor_value'] = str(evaluated)

# The Emscripten filesystem is real; its IndexedDB backend must not be.
if pyodide_js is not None:
    fs = pyodide_js.FS
    idbfs = fs.filesystems.IDBFS
    attempt('idbfs_mkdir', lambda: fs.mkdir('/pp_isolation_canary'))
    mounted = attempt(
        'idbfs_mount', lambda: fs.mount(idbfs, {}, '/pp_isolation_canary')
    )

    if mounted is not None:
        from pyodide.ffi import create_once_callable

        sync = {'called': False, 'error': None}

        def on_sync(error):
            sync['called'] = True
            sync['error'] = None if error is None else str(error)[:160]

        attempt('idbfs_syncfs', lambda: fs.syncfs(False, create_once_callable(on_sync)))
        report['idbfs_sync'] = sync

# A pure-Python route, independent of any JS bridge.
attempt('socket_connect', lambda: socket.create_connection(('93.184.216.34', 80), timeout=2))
attempt('urllib_urlopen', lambda: urllib.request.urlopen('http://example.com', timeout=2))

print('PROBE_RESULT ' + json.dumps(report, sort_keys=True))
