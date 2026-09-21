# Epic A validation readiness

Result: **PASS**

Latest accepted story: **A2 — Module read boundary**

Updated: 2026-09-21

## Required environment

Repository contract:

- Node `>=24 <25`
- npm `>=11 <12`
- `.nvmrc`: `24`
- `packageManager`: `npm@11.10.1`

Authoritative owner-side validation used Node `v24.19.0` and npm `11.10.1`.

## Authoritative validation path

The repository's exact-candidate path remains `npm run verify:release`. For A2 it was executed from a fresh clone of the exact local implementation commit, avoiding unrelated nested-worktree contamination in the primary working directory.

Accepted A2 exact candidate:

- commit: `e329950bbcce0bae2faa42496f532af13deb7322`
- tree: `f321357a8f3b087fddc0e25540920d5b3d9c6dc9`
- parent: `31e611dd934ac2456864949bc3e1e6a7f7748189`
- release evidence: `artifacts/release-evidence/2026-09-21T00-09-17-766Z-rpg-primary-final-candidate-pass-1.json`
- release evidence SHA-256: `E5264824309E8B10282FA1F06C25F9C31A7B152DC8641E95312541FA70D84533`
- unit/integration: 626/626
- E2E: 74/74
- audit: 0 vulnerabilities

A2 therefore preserves the proven Node24/npm11 validation pathway and extends the accepted Epic A lineage through the exact Module-boundary implementation commit.

## Known local-environment constraint

The primary working tree currently contains a registered nested Git worktree under `.kilo/worktrees/nova-carnation`. Direct repository-wide `eslint .` in that primary directory detects two candidate TypeScript roots and fails parser-root discovery.

This does not invalidate A2: the exact candidate passed lint in clean isolated clones before commit and again in the exact-commit release clone. It is nevertheless a real local tooling constraint and must be accounted for during A3 readiness.

Do not delete or rewrite the Kilo worktree as an incidental validation step. Either deliberately resolve it as separate tooling hygiene, or continue to use clean isolated clones for repository-wide gates.

## Continuing rule for A3 and later stories

`PASS` here does not pre-approve A3.

Every later Epic A story must still:

1. start from the latest accepted Epic A integration closure HEAD;
2. reconcile any change to `origin/master`, schema/index contracts or accepted lineage before code;
3. calibrate the shared access probe and prove the story-specific RED mechanism before production edits where required;
4. keep scale/measurement fixtures separate from semantic/full-snapshot oracles;
5. validate candidate behavior in an uncontaminated environment;
6. run focused real-branch checks appropriate to the story;
7. produce authoritative Node24/npm11 release evidence bound to the exact candidate commit/tree before acceptance.

A3 remains readiness-only until those fresh checks pass.
