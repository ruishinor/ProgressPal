# Epic A — A1 closure record

Date: 2026-09-20

Story: **A1 — Map read boundary + access measurement harness**

Disposition: **ACCEPTED for Epic A integration**

## Accepted candidate identity

- story branch: `postrelease/a1-map-read-boundary`
- commit: `ec651536e61a7e5d939506069887df32b81b5c0f`
- tree: `f401d82dc0d92fea9f3f18a7a1404eca8b3fa5a3`
- parent / accepted A0: `168ccfbca21dfbc5e66ec953a5dbdd42d47fa97d`
- product baseline ancestor: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- authoritative toolchain: Node `v24.19.0`, npm `11.10.1`

The accepted implementation commit is not amended by this closure. This record is a documentation-only integration artifact to be committed after the Epic A integration branch is fast-forwarded to the exact validated A1 commit.

## Accepted scope

A1 replaces only the Campaign Map broad-snapshot read boundary and adds reusable test-only access instrumentation. The committed A1 delta contains exactly 12 files:

- `src/features/progress/model.ts`
- `src/features/rpg/model/questRewards.ts`
- `src/features/rpg/model/readModels.ts`
- `src/lib/db/index.ts`
- `src/lib/db/repositories.ts`
- `src/lib/progress/engine.ts`
- `src/lib/xp/engine.ts`
- `tests/architecture/rpgFeature.test.ts`
- `tests/db/accessProbe.test.ts`
- `tests/db/accessProbe.ts`
- `tests/features/progressModel.test.ts`
- `tests/features/rpg/mapReadBoundary.test.ts`

Committed delta: 1,721 insertions, 50 deletions.

`src/lib/db/database.ts` is unchanged. No schema version, migration, backup format, UI/copy/navigation, XP rule, achievement rule, service-worker, cloud, or authentication contract changed.

## Evidence

### Baseline RED

Before production code was changed, the calibrated access harness failed the published Map path through observed data access rather than symbol matching. The RED run observed the broad path touching unrelated stores and append-only histories, including the all-store/broad-snapshot behavior A0 required A1 to eliminate.

Owner-side RED evidence was captured at:

`C:\Users\alex_\AppData\Local\ProgressPal\evidence\A1-20260920-225049-RED-baseline.log`

The GREEN implementation was not applied until that RED mechanism failure was established.

### Corrected focused validation

After correcting defects in the first acceptance harness, the final A1 candidate passed:

- 8/8 focused test files;
- 92/92 focused tests;
- corrected 1,000-row and 10,000-row all-three-history cases;
- corrected 1×/10× catalogue fan-out case;
- corrected production-loader transaction-coherence barrier case;
- access-probe calibration and architecture guards.

The 10,000-row history test has an explicit 90-second test timeout and completed in approximately 26 seconds on the owner environment. This is fixture/test cost, not an accepted application latency target.

### Full pre-commit validation

Before the A1 commit was created, the complete working-tree candidate passed:

- ESLint;
- repository Prettier check;
- TypeScript typecheck;
- production build;
- bundle budget;
- 60/60 unit/integration test files;
- 613/613 unit/integration tests;
- 74/74 E2E tests;
- circular-dependency check;
- npm audit with 0 vulnerabilities.

### Authoritative exact-candidate validation

The same complete release gate passed after committing the exact A1 candidate.

Release evidence:

- file: `artifacts/release-evidence/2026-09-20T21-58-30-862Z-rpg-primary-final-candidate-pass-1.json`
- evidence SHA-256: `3EAF5A72E985565673443150EDA9248797B56B1CD0938F45AEF533C516B27F2A`
- evidence status: `passed`
- evidence commit: `ec651536e61a7e5d939506069887df32b81b5c0f`
- evidence tree: `f401d82dc0d92fea9f3f18a7a1404eca8b3fa5a3`
- Node: `v24.19.0`
- npm: `11.10.1`
- unit/integration: 613/613
- E2E: 74/74
- audit: 0 vulnerabilities

The working tree was clean after the authoritative gate. No push or merge had occurred when this closure record was prepared.

## A1 acceptance findings

A1 satisfies its story contract as follows:

- **Map unrelated-store exclusion:** PASS. The Map logical loader is no longer implemented through the broad database snapshot path.
- **History source-row materialization:** PASS for the A1 contract. Media history is cursor-scanned without retaining the complete source-row history array; reward-state retention is bounded to exact earned reward keys.
- **Rows scanned are explicit:** PASS. The harness reports cursor/result visits rather than treating cursor use as proof of bounded work.
- **Query fan-out:** PASS for the declared A1 dimensions. The corrected tests cover history scaling and 1×/10× catalogue cardinality without per-item/per-asset query growth.
- **Transaction coherence:** PASS. The corrected barrier test exercises the actual production Map loader and verifies the relevant read transaction against an overlapping writer from a second connection.
- **Value behavior and passive reads:** PASS through focused repository/read-model/progress tests and the complete application suites.
- **Frozen schema:** PASS. `src/lib/db/database.ts` did not change.
- **Authoritative validation:** PASS on the exact A1 commit/tree under Node 24/npm 11.10.1.

## Explicit residual characteristics

These are accepted A1 characteristics, not hidden claims of constant work:

1. `media_progress_events` may still require O(`H_media`) scanning for exact coverage under the frozen schema. Source rows are not bulk-materialized, but derived merged-range state can grow when history contains genuinely disjoint ranges.
2. XP reward-state lookup uses the existing non-unique `sourceId` index. Retained reward state is bounded to the finite exact reward-key set, but pathological duplicate matching `sourceId` rows can require O(`H_matching`) cursor scanning.
3. The synthetic 10,000-row fixture is intentionally expensive. Its wall-clock duration is evidence about the test fixture plus IndexedDB emulation and is not itself an application performance acceptance metric.
4. A1 does not remove the persistent shell/Hub broad read. That belongs to A4. A1 closes only the Campaign Map logical loader contract.

Any future attempt to remove these scans through new persisted aggregates, compaction, or indexes is a schema/data-contract decision outside A1 and remains deferred under the A0 SPEC.

## Retrospective

The first A1 acceptance harness was rejected before commit because three tests were invalid or ambiguous: the 10k semantic test mixed full-snapshot oracle cost with scale measurement, the synthetic course fixture violated the real `final_project` schema requirement, and the first transaction-coherence test did not exercise the production loader and conflated writer success with rejection. The corrected harness fixed those defects and was then run through focused, full pre-commit, and exact-candidate authoritative validation before acceptance.

The rejected intermediate A1 states are forensic only and are not acceptance targets.

## Integration rule

A1 is accepted only through the exact validated implementation commit above. Integrate it into `postrelease/01-read-architecture` by fast-forwarding that integration branch from accepted A0 to `ec651536e61a7e5d939506069887df32b81b5c0f`. Then commit this closure documentation as a separate documentation-only commit.

Do not squash, amend, cherry-pick a rewritten equivalent, or otherwise change the validated A1 implementation bytes during closure.

A2 becomes eligible for a **fresh readiness assessment** only after that documentation-only closure commit is cleanly recorded on the Epic A integration branch.
