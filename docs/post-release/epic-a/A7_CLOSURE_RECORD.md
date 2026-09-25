# A7 Closure Record — Epic A integration and preservation gate

Date: 2026-09-25
Status: **ACCEPTED — EPIC A LOCALLY CLOSED**

## Accepted implementation identity

- Story branch: `cx/a7-aggregate-acceptance`
- Integration branch: `postrelease/01-read-architecture`
- Accepted implementation commit:
  `5068bb6b6cfd30407a003f2856a3ee00b0f0819a`
- Certified tree:
  `084e4a4345431bdad0832184d6712c41be884731`
- Parent / accepted A6 closure integration state:
  `bb6c3e052bdeeba3734e96dfc2f657e26c0b2e7e`
- Local integration method: `git merge --ff-only`
- Remote publication: none

The integration branch was proved to be an ancestor of the A7 story branch before
the fast-forward. After fast-forward it pointed at the exact accepted A7
implementation with a clean working tree.

## Defect and repair boundary

A7 readiness identified a risk in existing passive Dexie cursor callbacks:
stored-row validation or projection errors could fail to propagate from the
callback and allow a partial summary/ledger to be returned.

A probe-free discriminating RED used normal test databases, directly corrupted
persisted rows and invoked the actual scoped production readers. Seventeen
affected reader/history cases returned partial data under the pre-repair behavior;
the accepted A6 Badges reader remained the passing control.

The accepted repair is deliberately narrow:

- retain Dexie's transaction-aware promise chain;
- retain the first cursor/projection error;
- reject after cursor completion instead of publishing partial data;
- preserve queries, transactions, valid-row calculations and retention behavior;
- preserve schema/indexes, backup formats, rules, UI/copy/navigation and reward
  semantics.

The first repair attempt exposed a transaction-lifetime regression in actual-route
tests; it was corrected before acceptance. No acceptance claim relies on the
invalid first repair.

## Aggregate acceptance evidence

A7 criterion coverage is recorded in `A7_ACCEPTANCE_COVERAGE.md`.

Executed evidence includes:

- probe-free malformed-row/projection error coverage across the affected scoped
  readers;
- all seven required RPG routes through their real shell/page composition;
- exact route access budgets, forbidden-store checks and zero passive writes;
- all-14-store before/after nonmutation checks;
- Hub/HUD/Hero coherence barriers against competing committed writes;
- 1x/10x catalogue and append-only history measurements;
- fixed query counts with zero hidden source-history materialization;
- Resource and Focus mutation/read consistency against subsequent Hub/Badges
  reads;
- once-only XP/unlock behavior on repeated saves;
- backup/export/restore/reset compatibility and rollback coverage through the
  existing repository/E2E suites;
- A1–A6 regression coverage;
- frozen schema/index/rule/UI/publication boundaries.

Candidate/focused evidence:

- focused authoritative A7/A4 tests: 38/38 PASS
- coupled candidate validation: 209/209 PASS
- isolated candidate unit/integration: 706/706 PASS
- isolated candidate browser validation: 74/74 PASS

## Exact-commit release certification

Toolchain:

- Node: `v24.19.0`
- npm: `11.10.1`

Fresh exact-commit release clone:

- commit:
  `5068bb6b6cfd30407a003f2856a3ee00b0f0819a`
- tree:
  `084e4a4345431bdad0832184d6712c41be884731`
- module: `epic-a-a7`
- native release commands: 21
- warnings: 0
- retries: 0
- skips: 0
- unit/integration: 706/706 PASS
- E2E: 74/74 PASS
- circular dependency analysis: PASS
- dependency audit: 0 vulnerabilities

Release evidence:

`artifacts/release-evidence/2026-09-25T13-34-18-555Z-epic-a-a7-pass-1.json`

Release evidence SHA-256:

`E51913F90ED401C41C98DD3A46CA7302CC50A16E0349500BE8D1ADF831C2AFE2`

Release review:

`docs/post-release/epic-a/A7_RELEASE_REVIEW.json`

Release review SHA-256:

`5A57CB76B38DABA4415F4EE5636542AA37F3992D763B063BD8C2521A8C51661A`

The release manifest recorded status `passed`, module `epic-a-a7`, the exact
commit/tree above, 21 command records with zero warning/retry/skip debt, and a
review SHA matching the exact review file bytes.

## Environment failure disposition

The first exact-release attempt was invalidated by `ENOSPC` during dependency
installation and later evidence writing. It is classified as an environment
failure, not a product or semantic-test failure.

No product code was changed in response to that attempt. Valid prior evidence was
preserved. The failed disposable clone was removed, disk headroom was restored,
and the complete native release gate was rerun in a new fresh exact-commit clone
against the same immutable implementation commit/tree. That second run passed.

## Support-tool/process disposition

The earlier A7 audit-collector attempts are not part of the acceptance trust path.
After repeated preventable support-tool failures, recovery switched to direct
repository-native/read-only commands and exact file inspection. No replacement
collector or new wrapper was introduced into the release path.

The release gate itself was the repository-native gate. Closure therefore relies
on native release evidence, exact Git identity and byte-bound review evidence,
not on the failed collector artifacts.

## Closure decision

AC-01 through AC-13 are satisfied.

A7 is accepted locally. Epic A's deliberate read/application-boundary programme is
locally closed at the accepted A7 implementation. This closure does not claim or
perform remote CI publication, push, remote merge, deployment, tag, version
change, cloud work or Epic B execution.

After this documentation-only closure commit is created, record its resulting
HEAD/tree and clean status externally as the final post-closure state. Do not
amend product code or rerun release validation solely because documentation was
added.
