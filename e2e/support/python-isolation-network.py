"""Awaited network probe for the learner Python worker (defensive regression test).

Runs as learner code in the production worker, after the worker's hardening.
Pyodide's network routes are asynchronous, so this program cannot finish them
within one run: the `start` phase reacquires the bridge and starts one task
that awaits every route to completion or failure against two canary URLs, and
the `collect` phase (a later run in the same worker) reports how each route
settled. The test substitutes the three placeholders below.

The routes: `pyodide.http.pyfetch`, `pyodide.http.open_url` (synchronous XHR),
the loader's own download primitive `pyodide_js._api.loadBinaryFile`, and the
package loader `pyodide_js.loadPackage` with a direct wheel URL (which reports
a failed download through callbacks, so it settles without raising). What
Python reports is recorded, but the test never trusts it for safety: it checks
the browser's own view of which requests were dispatched.

Prints one `NETWORK_RESULT` line.
"""

import asyncio
import importlib
import json
import sys

PHASE = '__PHASE__'
SAME = '__SAME_ORIGIN_URL__'
CROSS = '__CROSS_ORIGIN_URL__'
WHEEL = '/pp_canary-1.0-py3-none-any.whl'

if PHASE == 'start':
    # Reacquire the bridge, and re-execute the modules that bind `fetch` and
    # `XMLHttpRequest` from `js` at import time.
    for name in (
        'js', 'pyodide_js', 'pyodide.ffi', 'pyodide.code', 'pyodide.http',
        'pyodide.http._pyfetch', 'pyodide.http.pyxhr',
    ):
        sys.modules.pop(name, None)

    http = importlib.import_module('pyodide.http')
    pyodide_js = importlib.import_module('pyodide_js')
    state = {'done': False, 'results': {}}
    sys._pp_network = state

    def settle(label, outcome):
        state['results'][label] = outcome

    def raised(error):
        return {'settled': 'raised', 'error': type(error).__name__, 'message': str(error)[:160]}

    async def drive():
        for label, url in (('same', SAME), ('cross', CROSS)):
            try:
                response = await http.pyfetch(url)
                settle('pyfetch:' + label, {'settled': 'returned', 'status': response.status})
            except BaseException as error:
                settle('pyfetch:' + label, raised(error))

            try:
                body = http.open_url(url)
                settle('open_url:' + label, {'settled': 'returned', 'length': len(body.read())})
            except BaseException as error:
                settle('open_url:' + label, raised(error))

            try:
                binary = await pyodide_js._api.loadBinaryFile(url)
                settle('loadBinaryFile:' + label, {'settled': 'returned', 'length': len(binary.to_py())})
            except BaseException as error:
                settle('loadBinaryFile:' + label, raised(error))

            try:
                await pyodide_js.loadPackage(url + WHEEL)
                settle('loadPackage:' + label, {'settled': 'returned'})
            except BaseException as error:
                settle('loadPackage:' + label, raised(error))

        state['done'] = True

    state['task'] = asyncio.ensure_future(drive())
    print('NETWORK_RESULT ' + json.dumps({'phase': 'start', 'started': True}))
else:
    state = getattr(sys, '_pp_network', None)
    pyfetch_module = sys.modules.get('pyodide.http._pyfetch')
    pyxhr_module = sys.modules.get('pyodide.http.pyxhr')
    print(
        'NETWORK_RESULT '
        + json.dumps(
            {
                'phase': 'collect',
                'started': state is not None,
                'done': state is not None and state['done'],
                'results': {} if state is None else state['results'],
                # Why the Python routes fail, when they do: the module-level
                # `from js import fetch` found nothing to bind.
                'pyfetch_module_binds_fetch': hasattr(pyfetch_module, '_jsfetch'),
                'pyxhr_module_binds_xhr': hasattr(pyxhr_module, 'XMLHttpRequest'),
            },
            sort_keys=True,
        )
    )
