# Epic A validation readiness

Result: **CONCERNS**

## Required environment

Repository contract:

- Node `>=24 <25`
- npm `>=11 <12`
- `.nvmrc`: `24`
- `packageManager`: `npm@11.10.1`

Observed A0 execution environment:

- Node `v22.16.0`
- npm `10.9.2`

This local environment is **not authoritative** and must not be used to certify formatter/lint/typecheck/tests/build.

## Explicit authoritative remote path

The inspected repository contains `.github/workflows/test.yml`, job `Final candidate`:

1. `actions/checkout@v5` at exact `${{ github.sha }}`;
2. `actions/setup-node@v6` using `.nvmrc` (Node 24);
3. global pin `npm@11.10.1`;
4. `npm ci`;
5. Playwright Chromium install;
6. `npm run verify:release`.

The release gate itself hard-checks Node 24 and npm 11 and executes:

- clean status / `git diff --check`;
- clean dependency install;
- lint;
- format check;
- typecheck;
- production build;
- bundle checks;
- complete unit/integration tests (therefore architecture/focused tests are included);
- E2E;
- circular-dependency check;
- dependency audit;
- final clean status;
- exact commit/tree evidence manifest.

Historical release evidence in the source proves this class of gate previously ran successfully under Node 24.19.0/npm 11.10.1 for the certified source tree.

## Why not PASS

The GitHub repository was not accessible through the assistant connector during A0 (repository lookup returned 404; installed repository search returned no ProgressPal repository). Owner-side Git subsequently proved that `origin/master` is reachable and still identifies the expected published baseline, but ordinary Git fetch/pull access does **not** prove that the Node24/npm11 Actions workflow can be triggered and its exact-candidate evidence inspected.

## Why not FAIL

An explicit repository-defined authoritative CI path exists and has prior successful evidence. Implementation may proceed only under the following hard closure rule:

> Every Epic A story may be developed/reviewed provisionally, but no story becomes `done`, no Epic A candidate is accepted, and no merge occurs unless authoritative Node24/npm11 evidence is produced for the exact candidate bytes through the repository CI/release path (or an equally authoritative owner-controlled Node24/npm11 local run).

If that path cannot be invoked when A1 begins, readiness becomes **FAIL / blocked-before-code** rather than “validate later.”
