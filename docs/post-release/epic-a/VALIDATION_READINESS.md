# Epic A validation readiness

Result: **PASS**

Original A0 result: **CONCERNS**

Resolution date: 2026-09-20

## Required environment

Repository contract:

- Node `>=24 <25`
- npm `>=11 <12`
- `.nvmrc`: `24`
- `packageManager`: `npm@11.10.1`

The original A0 execution environment was Node `v22.16.0` / npm `10.9.2`, so A0 correctly did not certify implementation readiness from that environment.

## Authoritative validation path

The repository defines an exact-candidate release path through `.github/workflows/test.yml` and `npm run verify:release`. The gate validates a clean committed SHA/tree and executes the repository's formatter, lint, typecheck, build, bundle, complete unit/integration suite, E2E, circular-dependency check, dependency audit, and final clean-state/evidence checks under the required toolchain.

## Resolution of the A0 concern

Owner-side execution subsequently proved that the authoritative path is actually invocable locally under the repository contract:

- Node `v24.19.0`
- npm `11.10.1`

The amended A0 commit `168ccfbca21dfbc5e66ec953a5dbdd42d47fa97d` / tree `9f6893f26a4a6eedc2ba35e6c46255e9bd511251` passed the complete authoritative release gate before the A1 story branch was created.

A1 then passed the same exact-candidate gate on:

- commit `ec651536e61a7e5d939506069887df32b81b5c0f`
- tree `f401d82dc0d92fea9f3f18a7a1404eca8b3fa5a3`
- release evidence `artifacts/release-evidence/2026-09-20T21-58-30-862Z-rpg-primary-final-candidate-pass-1.json`
- release evidence SHA-256 `3EAF5A72E985565673443150EDA9248797B56B1CD0938F45AEF533C516B27F2A`
- 613/613 unit/integration tests
- 74/74 E2E tests
- 0 audit vulnerabilities

The original A0 uncertainty about whether authoritative Node24/npm11 validation was actually usable is therefore resolved.

## Continuing rule for later stories

`PASS` here means the validation pathway is proven and available. It does **not** pre-approve future code.

Every later Epic A story must still:

1. establish a fresh clean baseline from the latest accepted Epic A integration commit;
2. prove the story-specific RED/measurement contract before production edits where required;
3. run focused validation appropriate to the story;
4. run the full repository validation required by the SPEC;
5. produce authoritative Node24/npm11 evidence bound to the exact candidate commit/tree before the story can be accepted and integrated.

If the authoritative path becomes unavailable or the accepted product/integration baseline changes incompatibly, that story returns to `FAIL / blocked-before-code` or to contract reconciliation rather than being validated later.
