# Epic A / A5 Closure Record

Date: 2026-09-21
Story: **A5 — Focus actual-route read boundary**
Disposition: **ACCEPTED — eligible for local integration and A6 readiness only**

## Exact accepted implementation

- story branch: `postrelease/a5-focus-read-boundary`
- implementation commit: `0b03c334f91d9946ddbb9577a5daa9ee0ed16b4b`
- implementation tree: `23cec04b2e92cb110d2c9ce7a40be24f026382a1`
- valid RED parent: `99ae07e031144ed2a9d29d5c1055040349f3f4d3`
- pre-A5 integration HEAD: `4e7a5f4821940c527d51e760c891b6558d25d8c9`
- published `master`: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- published tree: `d4124b4576acf7e6f6ba7ed52f0249b0e9a78a34`
- production deployment: `dpl_H2GkappEu6QPT9w6WYZDw57LdBrr`
- validated GREEN ZIP SHA-256: `8D4EF226E39A507CB6BE1C2D3B8199842D3F4440A918AB4AD1318FC907A4F6B9`
- exact closure-source ZIP SHA-256: `E65CDA8004F8E6704B905809CBDFCEF23B1406DC08AA84B2D47BBDBC96EE1761`
- Node: `v24.19.0`
- npm: `11.10.1`

No Epic A push, remote merge, `master` update or deployment is part of this acceptance.

## Accepted mechanism

A5 targeted the actual runtime path:

`/rpg/focus` → `RpgShell` → `RpgFocusPage` → shared `StudySessionsSurface`.

The accepted implementation removes the hidden complete study-session source-array materialization from the Focus child read while preserving the complete visible ledger as legitimate O(`H_sessions`) product data.

Initial Focus child read evidence proves:

- exactly one readonly child transaction;
- stores exactly `course_units`, `course_items`, `study_sessions`;
- exactly three logical child queries, at most one per store;
- selected `itemId` is resolved from the already-read catalogue with no fourth item query;
- the complete visible session ledger is retained;
- `study_sessions` is traversed with the existing `startedAt` cursor;
- hidden study-session source rows materialized: `0`;
- passive writes: `0`;
- the accepted A4 HUD remains a separate single read and does not read `study_sessions`.

Ledger semantics remain newest `startedAt` first with `id` descending for ties. The explicit tie fixture produced `a5-tie-c`, `a5-tie-b`, `a5-tie-a`, `a5-older-z`.

At 1,000 and 10,000 session rows the child contract remained one transaction / three queries, scanned the full visible history as required, materialized zero hidden source rows and performed zero writes. This is linear scanning of visible product data, not a constant-time claim.

## Save, refresh and failure preservation

Accepted post-save behavior preserves the existing mutation contract:

- one study-session save through the existing coordinated mutation path;
- existing XP and achievement semantics remain unchanged;
- exactly one shared A4 HUD refresh;
- exactly one Focus ledger refresh;
- normal post-save ledger refresh reads `study_sessions` only;
- no catalogue reread after save;
- ledger/HUD read failure after a successful save does not roll back or repeat the committed save;
- retry remains read-only;
- discard remains memory-only;
- draft preservation behavior remains unchanged.

No schema version, store definition or index change was required.

## Validation and release provenance

Pre-commit and authoritative evidence established:

- focused A5 GREEN: `6/6`;
- focused/coupled isolated regression: `207/207`;
- authoritative A5/A4/coupled regression after exact byte application: `97/97`;
- full unit/integration suite: `659/659`;
- full E2E suite: `74/74`;
- circular dependency analysis: PASS;
- dependency audit: `0 vulnerabilities`.

Fresh exact-commit release certification was run against commit `0b03c334f91d9946ddbb9577a5daa9ee0ed16b4b` / tree `23cec04b2e92cb110d2c9ce7a40be24f026382a1` using the repository-native `RELEASE_REVIEW_FILE` interface. Structured release evidence records:

- status: `passed`;
- command count: `21`;
- warning count: `0`;
- retry count: `0`;
- skip count: `0`;
- review path: `.git/A5_release_review.json`;
- review SHA-256: `28894F15492F2A279E42A53005EE831A07C0FCDA5BF99C74055718AE11478019`;
- A5 review byte binding: PASS;
- release evidence: `artifacts/release-evidence/2026-09-21T19-02-53-138Z-rpg-primary-final-candidate-pass-1.json`.

The corrected run transcript did not print the release-evidence file SHA-256. The closure gate therefore computes and emits that SHA-256 at closure time instead of fabricating a static value here.

## Adversarial disposition

No unresolved product, architecture, access, composition, mutation, schema or release defect remains in A5 evidence. The material failures encountered during the story were predominantly support-tool/orchestration failures and one storage interruption; the isolation model prevented those failures from contaminating the authoritative branch.

The accepted production result is therefore distinct from the process quality: **implementation accepted; tooling process requires corrective controls.**

## A5 process retrospective and owner-effort lower bound

The operating model requires owner-effort accounting from A5 onward. Exact telemetry was not captured at story start, so the following values are explicitly lower bounds from retained chat/transcript evidence rather than invented exact totals:

- consequential owner gate/diagnostic executions: **≥11**;
- failed owner executions: **≥7**;
- preventable assistant-generated artifact/tooling failures reaching owner execution: **≥6**;
- environment interruptions: **1** (`ENOSPC` during an otherwise progressing E2E run);
- GREEN candidate regenerations: **1** (v1 → v2);
- owner returns with runtime/debug output: **repeated; ≥6 observed**.

The recurring support-tool defects included an API/type misuse in the first GREEN fixture, PowerShell wildcard misclassification of Git status, buffered long-running output, ANSI-sensitive evidence parsing, incorrect inference of release-runner CLI arguments instead of its environment-variable interface, and an unsupported assumption about structured evidence `testCount` fields.

Classification: **RECURRENCE — support-tool lifecycle/preflight failure.**

Mandatory carry-forward controls for A6 onward:

1. inspect the repository-native command/interface and evidence schema before generating wrappers;
2. do not impose wrapper assertions that are stronger than or structurally different from native evidence without first proving the schema;
3. stream long-running owner-visible commands;
4. use literal Git-status prefix checks rather than wildcard patterns;
5. preflight generated scripts in disposable state where the environment permits it;
6. validate generated fixtures against real TypeScript/API signatures before owner handoff;
7. check storage headroom before artifact-heavy E2E runs;
8. rerun only evidence invalidated by the failed layer.

## Closure authorization

A5 is accepted and may be fast-forwarded locally into `postrelease/01-read-architecture`, followed by one documentation-only closure commit.

After that commit, **A6 — Badges actual-route read boundary is eligible for fresh readiness only**. A6 production code, RED, branch creation, push, remote merge and deployment are not authorized by this record.
