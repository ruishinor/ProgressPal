# Epic A — A3 closure record

Date: 2026-09-21

Story: **A3 — Resource read boundary**

Disposition: **ACCEPTED for Epic A integration**

## Accepted candidate identity

- story branch: `postrelease/a3-resource-read-boundary`
- commit: `7363ec6d70a89e48373d8be81673b94793598cd8`
- tree: `ba504b77dd98dc3472699631db0a56e82ea0c9f6`
- parent / A3 readiness commit: `6b5e0d65d5736f8f5c4bb033aee1ea24735d1d83`
- accepted A2 implementation ancestor: `e329950bbcce0bae2faa42496f532af13deb7322`
- accepted A2 closure ancestor: `d64c135ed41ffda5530516ffa9bad125abd2f82e`
- product baseline ancestor: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- authoritative toolchain: Node `v24.19.0`, npm `11.10.1`

The accepted implementation commit must not be amended during closure. This record is a documentation-only integration artifact to be committed after the Epic A integration branch is fast-forwarded to the exact validated A3 implementation commit.

## Accepted scope

A3 replaces only the RPG Study Resource broad-snapshot logical read with a selected-item/unit-scoped coherent read contract and adds the Resource-specific acceptance harness.

The exact committed A3 delta contains four files:

- `src/features/rpg/model/readModels.ts`
- `src/lib/db/index.ts`
- `src/lib/db/repositories.ts`
- `tests/features/rpg/resourceReadBoundary.test.ts`

Committed delta: 1,365 insertions, 1 deletion.

A3 does not change `src/lib/db/database.ts`, schema/index definitions, migrations, backup/storage format, XP amounts/rules, achievement rules, UI/copy/navigation, service worker, cloud/auth architecture, Focus/Badges, or A4 shell/Hub/Hero behavior.

## Baseline RED evidence

A3 started from the accepted A2 lineage at A3 readiness commit:

`6b5e0d65d5736f8f5c4bb033aee1ea24735d1d83`

Before production changes, the calibrated shared DBCore probe was run against the actual `loadRpgStudyResourceSummary(itemId)` production loader. The untouched Resource path failed the future A3 contract because it still used the generic broad snapshot.

Owner-side RED evidence:

`C:\Users\alex_\AppData\Local\ProgressPal\evidence\A3-20260921-024334-RED-resource.log`

The story branch remained production-clean with only:

`tests/features/rpg/resourceReadBoundary.test.ts`

untracked.

## Exact-base provenance

To avoid repeating the stale-byte problem previously encountered during A2, GREEN was built only from an owner-exported exact A3 base archive.

Exact base:

- file: `ProgressPal_A3_exact_base_6b5e0d65.zip`
- SHA-256: `CD6BBE54D1A288A9CA103042FD33255879214D29B1D58DCD28EDC9BF22C4333F`

Accepted base production hashes:

- `src/features/rpg/model/readModels.ts`: `80A6C22CCED0E7CA7C265D0BC8E6141A1E98464AEF28F779D53C4A38594FA626`
- `src/lib/db/index.ts`: `D7C59C83C3C2B6BF8676323BBE6E9470E8D5DB281214F5D21C21071E6A568AB9`
- `src/lib/db/repositories.ts`: `3163C77812C38B2C06BDA5BC08ED957AAD40F556EAEC6CEE2DCF83D43C0706BF`

The real repository remained RED-only while candidates were built and validated.

## GREEN harness correction

The first isolated GREEN attempt passed the core Resource loader-equivalence evidence but exposed four test-harness problems:

1. the 10,000-row history test used Vitest's default five-second timeout despite already-known fake-indexeddb scale cost;
2. the XP collision fixture was written while the DBCore probe was active, contaminating fixture setup cost;
3. a reward assertion hard-coded an invented shortened Week 0 title instead of using the unchanged published builder/real unit title;
4. the mutation-readback test mixed probe instrumentation with the write transaction and reproduced a Dexie `PrematureCommitError`.

The three production candidate files were frozen unchanged. Only `tests/features/rpg/resourceReadBoundary.test.ts` was corrected.

The corrected harness:

- performs large fixture writes before measurement;
- uses deliberate timeouts for expensive scale tests;
- compares reward semantics to the unchanged published builder and actual unit title;
- performs the mutation on an uninstrumented writer and installs the read probe only for passive readback;
- includes backward correction after earning the Week 0 completion reward to prove `week_completed` remains recognized as already earned.

This correction is part of the accepted A3 evidence and should be retained as a process lesson for later stories.

## Accepted Resource boundary

For an existing Resource, the accepted logical read uses one readonly transaction over exactly these eight stores:

1. `content_assets`
2. `content_slices`
3. `course_items`
4. `course_units`
5. `media_progress_events`
6. `progress_entries`
7. `resume_points`
8. `xp_transactions`

Normal logical-query budget:

- `course_items`: 2
- every other required store: 1
- total: 9

Observed normal loader evidence showed:

- one selected-item `course_items.get(itemId)`;
- one selected-unit `course_units.get(unitId)`;
- one unit-items query;
- one unit-progress cursor/query;
- selected-item-only assets/slices/resume queries;
- one selected-item media cursor;
- one finite-source-ID XP cursor;
- zero passive writes.

Missing/unknown item behavior returns `null` after only the selected-item lookup.

## Semantics preserved

The corrected 18-test A3 Resource suite proved:

- published Resource value equivalence;
- representative early-course, Week 4 and final-project equivalence;
- missing valid-looking and invalid-looking item IDs;
- missing referenced unit;
- long-form progress/resume behavior;
- detailed task reward behavior;
- `week_completed` earned-state behavior;
- shared final-project reward behavior;
- post-save mutation-result -> Resource readback consistency;
- read-failure propagation without writes;
- actual-loader transaction coherence against a competing media writer;
- zero passive writes.

A3 does not change mutation rules or award amounts.

## Access scaling evidence

The accepted Resource reader keeps query fan-out constant while:

- unit-item cardinality grows 1× -> 10×;
- selected-item asset/slice cardinality grows 1× -> 10×;
- relevant media/XP history grows.

Append-only source rows are not bulk-materialized into hidden arrays.

Observed examples:

- 1,000 relevant media rows: 1 media query/cursor, 1,000 rows scanned, 0 source rows materialized;
- 10,000 relevant media rows: 1 media query/cursor, 10,000 rows scanned, 0 source rows materialized;
- XP collision case: 101 matching `sourceId` rows scanned, 0 XP source rows materialized, exact `(sourceType, sourceId)` reward keys retained;
- disjoint-media case: 100 media rows scanned, 0 source rows materialized, derived aggregate peak 100.

These observations satisfy the current A3 contract but do not establish constant-time history processing.

## Focused isolated GREEN validation

Corrected harness2 isolated GREEN validation passed:

- 18/18 A3 Resource boundary tests;
- 103/103 A1/A2/RPG focused regression tests;
- repository-wide ESLint;
- repository Prettier check;
- TypeScript typecheck;
- production build;
- bundle budget;
- circular-dependency check.

Validated normalized candidate:

- file: `ProgressPal_A3_GREEN_VALIDATED_harness2_20260921-032756.zip`
- SHA-256: `501E15E4F231384DD3148900092921883793A71B395CE592E33553C5ED835F4B`
- manifest SHA-256: `97CD898A54C2992D73FAB7B5AA4E0209164C006766348070C9CEF788275AE66D`

The real A3 repository remained RED-only and unmodified during this validation.

## Full isolated pre-commit validation

The exact normalized candidate then passed the complete isolated pre-commit gate:

- ESLint;
- repository Prettier check;
- TypeScript typecheck;
- production build;
- bundle budget;
- 62/62 unit/integration test files;
- 644/644 unit/integration tests;
- 74/74 E2E tests;
- circular-dependency check;
- npm audit with 0 vulnerabilities;
- `git diff --check`.

Pre-commit evidence:

- transcript: `C:\Users\alex_\AppData\Local\ProgressPal\evidence\A3-20260921-034751-full-isolated-precommit-validation.log`
- transcript SHA-256: `45CB9B5944332FA06FB51AB4C9C054062C74A35DCE7C6597C6B7E9E6822E4732`
- summary: `C:\Users\alex_\AppData\Local\ProgressPal\evidence\A3-20260921-034751-full-isolated-precommit-validation.json`
- summary SHA-256: `09749D2DBECD4A632ACCB49425BFD44B67259F4AEFAAB66403E0192AC044F3EF`

## Real-branch focused gate and implementation commit

The exact validated ZIP was applied to the real A3 story branch only after baseline, ancestry, hash, branch and remote-master checks.

Before commit the real branch passed:

- 8/8 focused test files;
- 121/121 focused tests;
- A3 Resource boundary 18/18;
- A2 Module boundary 13/13;
- A1 Map boundary 8/8;
- save-outcome, read-model, repository, probe and architecture regressions.

The implementation was committed once as:

`7363ec6d70a89e48373d8be81673b94793598cd8`

The working tree was clean immediately after commit.

## Authoritative exact-commit validation

A fresh clone of exact commit `7363ec6d70a89e48373d8be81673b94793598cd8` passed `npm run verify:release` under Node 24/npm 11.10.1.

Authoritative release identity:

- commit: `7363ec6d70a89e48373d8be81673b94793598cd8`
- tree: `ba504b77dd98dc3472699631db0a56e82ea0c9f6`
- parent: `6b5e0d65d5736f8f5c4bb033aee1ea24735d1d83`
- release evidence: `artifacts/release-evidence/2026-09-21T02-08-39-892Z-rpg-primary-final-candidate-pass-1.json`
- copied evidence SHA-256: `A706CC38677B564D685A67396637E99736E9C7696589E89CD8CE051F28D9509D`
- authoritative release transcript SHA-256: `B69614222CB782CB99DC52C7651DDE7B8BCB2929EEE70E2A5B246ABADF550771`
- unit/integration: 644/644
- E2E: 74/74
- audit vulnerabilities: 0

The real A3 working tree remained clean after the authoritative gate. No push or merge had occurred when this closure record was prepared.

## A3 acceptance findings

- **Selected Resource scope:** PASS.
- **Eight-store coherent transaction:** PASS.
- **Nine-query normal budget:** PASS.
- **No per-item/per-asset N+1 query growth:** PASS.
- **Selected-item long-form scope:** PASS.
- **No hidden media/XP source-row arrays:** PASS.
- **Detailed reward semantics including `week_completed`:** PASS.
- **Shared final-project reward semantics:** PASS.
- **Missing item/unit behavior:** PASS.
- **Post-save Resource readback:** PASS.
- **Transaction coherence:** PASS.
- **Zero passive writes:** PASS.
- **A1/A2 preservation:** PASS.
- **Frozen schema/product scope:** PASS.
- **Authoritative Node24/npm11 exact-commit validation:** PASS.

## Explicit residual characteristics

These are accepted A3 characteristics and must remain visible in later work:

1. `media_progress_events` remains an approved O(`H_selected_item`) cursor scan under the frozen schema.
2. The synthetic 10,000-row Resource media-history case took approximately 30–49 seconds under fake-indexeddb across focused, pre-commit and authoritative runs. This is test/emulation cost and a scaling warning, not an accepted production latency target.
3. Derived exact media coverage state may grow with genuinely disjoint watched ranges even though source history rows are not retained.
4. XP reward lookup uses the existing non-unique `sourceId` index. Exact reward-key retention is bounded, but duplicate relevant source IDs may require scanning all matching rows.
5. A3 does not narrow persistent shell/Hub/Hero reads. Those remain A4 scope and may still cause broad reads during actual Resource route composition after a save.

Any future schema/index/aggregate/compaction change intended to remove these scan costs remains outside A3 and must be justified under the Epic A frozen-schema rules.

## Local tooling environment note

The primary repository still contains the registered nested worktree:

`.kilo/worktrees/nova-carnation`

Direct repository-wide `eslint .` in the primary working directory can detect multiple TypeScript roots and fail parser-root discovery. This is local tooling/worktree contamination, not an A3 product failure.

The exact A3 candidate passed repository-wide lint in clean isolated clones, including the authoritative exact-commit release clone.

Do not silently remove or rewrite the Kilo worktree as part of A3 closure. Continue isolated repository-wide validation until that tooling state is deliberately resolved.

## Retrospective

A3 preserved the stronger A2 provenance/containment model:

- RED was proved before production edits;
- GREEN was built only from exact owner-exported accepted bytes;
- the real branch remained RED-only during candidate development and isolated validation;
- normalized candidate bytes were exported only after focused GREEN passed;
- the full pre-commit gate ran before real-branch application;
- authoritative release evidence was generated from a fresh clone of the exact implementation commit.

A3 also exposed a repeated test-design weakness: the first GREEN harness mixed expensive fixture setup with instrumentation, used inappropriate default timeouts, hard-coded non-authoritative product copy, and mixed read instrumentation with mutation. These were harness defects, not grounds to rewrite production code. The production candidate was frozen while only the harness was corrected.

The accepted process lesson is stricter separation between:

1. fixture construction;
2. access instrumentation;
3. semantic oracle assertions;
4. mutation tests;
5. scale/performance measurement.

## Integration rule

A3 is accepted only through exact implementation commit:

`7363ec6d70a89e48373d8be81673b94793598cd8`

Integrate it into `postrelease/01-read-architecture` by fast-forwarding that branch from A3 readiness commit:

`6b5e0d65d5736f8f5c4bb033aee1ea24735d1d83`

to the exact accepted A3 implementation commit.

Then commit this closure documentation as a separate documentation-only commit.

Do not squash, amend, cherry-pick a rewritten equivalent, or otherwise change the validated A3 implementation bytes during closure.

A4 becomes eligible for a **fresh readiness assessment only** after the documentation-only A3 closure commit is cleanly recorded on the Epic A integration branch.
