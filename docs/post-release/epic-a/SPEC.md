# ProgressPal Epic A — SPEC

> **Historical record.** This describes the state at the time it was written. The live state, baseline and next steps are in [`docs/CURRENT_STATE.md`](../../CURRENT_STATE.md). Retained unchanged as evidence.

## Current local status — 2026-09-25

A1–A6 are accepted locally. A6 implementation is
`d7c591e6c2fc15475f375007705b717b203b00dd`, certified tree
`0d77438da16aaafe75135fe15e892af240356ef2`; see `A6_CLOSURE_RECORD.md`.
The owner's restart objective authorizes fresh A7 readiness only after this
documentation-only A6 closure is committed. A7 must prove the aggregate criteria
below from the integrated source; no production change is presumed necessary.
The A0 observations below describe the historical starting point, not the current
runtime implementation. Frozen acceptance criteria remain in force.

## A0 contract and measurement definition

- Status: **A0 complete — implementation readiness = CONCERNS**
- Date: 2026-09-20
- Scope: Epic A only. No production code was changed by A0.

## 1. Outcome

Epic A replaces broad routine RPG database snapshots with deliberately scoped read/application boundaries while preserving published behavior, persisted schema, reward/achievement semantics, mutation semantics, backup completeness, and UI behavior.

The implementation is successful only when the actual production RPG paths are measurably narrower. Removing the symbol `getDatabaseSnapshot` is not sufficient.

### Non-goals

Epic A does not:

- change Dexie schema version 2, stores, indexes, migrations, retention, or backup format;
- change XP/reward or achievement semantics;
- redesign UI/navigation/HUD;
- introduce programme abstraction, authentication, cloud storage, Firebase, telemetry, or service-worker changes;
- optimize explicit backup/restore/reset operations that require complete data;
- paginate or truncate the currently visible Focus session ledger;
- repair or continue from rejected tree `9babf9c50de4a436fef80fed01628c95ac4113cf`.

## 2. Authority and factual baseline

### Normative authority

For what should change: latest owner direction → Development Operating Model v3 → current handoff/roadmap/backlog/owner decisions → this SPEC/story contract.

### Evidentiary authority

For what exists: exact source/config/tests inspected for A0 → executed/tool evidence → deployment evidence → handoffs/history.

### Accepted publication baseline

- repository: `ruishinor/ProgressPal`
- accepted `master`: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- accepted/published tree: `d4124b4576acf7e6f6ba7ed52f0249b0e9a78a34`
- production deployment: `dpl_H2GkappEu6QPT9w6WYZDw57LdBrr`
- certified source candidate: `534a29332c745d77e5c17e3e6c17c221ab8799e6`, same tree

Observed A0 evidence:

1. Vercel is connected. Its latest deployment for `progress-pal` is the READY production deployment above, with `githubCommitRef=master` and `githubCommitSha=a0581c13...`. No newer deployment was returned.
2. GitHub repository access was not available through the assistant connector during A0: direct repository lookup returned 404 and installed-repository search returned no ProgressPal repository. After A0 handoff, owner-side Git successfully fetched `origin/master`, fast-forwarded local `master`, and proved HEAD `a0581c13...` / tree `d4124b...` with no pre-existing working-tree changes before the A0 artifacts were inserted. This resolves the repository revision/cleanliness uncertainty for A0 integration, but does not prove that the assistant can trigger or inspect GitHub Actions for a future candidate.
3. The supplied source archive was inspected directly. SHA-256: `0d668c136ab194de662bfb3ac154dc673069a313509e896fe61f5bda44e86d6a`. It excludes `.git`; working-tree cleanliness therefore cannot be proven from it.
4. The supplied source contains the final release evidence for `534a293...` / tree `d4124b...`, recorded under Node 24.19.0/npm 11.10.1, and the inspected implementation still contains the published broad-snapshot RPG read path. This is consistent with the stated published baseline.
5. The rejected candidate package SHA-256 is `b52d3a068947a261d5aa92e132a5ab92e0f0d3c8f5505d2ebbf8286b259fdfd0`. Its manifest identifies base tree `d4124b...` and rejected result tree `9babf9c...`. It is forensic evidence only.

### Fresh-baseline requirement before any code

Epic A now has two distinct baseline identities:

- **product baseline:** accepted `master` at `a0581c13...` / tree `d4124b...`, against which production-code behavior and aggregate Epic A changes are measured;
- **Epic A integration baseline:** the current accepted A0 commit on `postrelease/01-read-architecture`, whose only delta from the product baseline is the A0 documentation under `docs/post-release/epic-a/`.

The first implementation story must freshly prove in the real repository:

- accepted `master` still identifies the intended product baseline, unless a newer accepted state is explicitly established and reconciled;
- the Epic A integration branch descends from that product baseline and contains only accepted prior Epic A story/A0 changes;
- the A1 story branch is created from the accepted Epic A integration commit, **not directly from `master` and not from the rejected candidate**;
- worktree is clean before the story branch is created;
- relevant source/config/tests have not materially diverged from this SPEC;
- authoritative Node24/npm11 validation is actually invocable under the readiness rule.

For later stories, create each fresh story branch from the latest accepted Epic A integration commit after the previous story is reviewed and integrated. If a newer accepted `master` changes the read/schema/test surfaces described here, A0 is partially invalidated and the affected contract must be reconciled before edits.

## 3. Observed storage model

Source: `src/lib/db/database.ts`.

Schema version 2 has 14 stores:

| Store                     | Current indexes relevant to A0                                    | Cardinality class                                                         |
| ------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `app_meta`                | `&id`, schemaVersion, seedVersion                                 | singleton                                                                 |
| `learner_profile`         | `&id`, updatedAt, preferredTheme                                  | singleton                                                                 |
| `course_units`            | `&id`, courseId, `[courseId+order]`, type, required               | catalogue                                                                 |
| `course_items`            | `&id`, unitId, `[unitId+order]`, type, required                   | catalogue                                                                 |
| `progress_entries`        | `&id`, `&itemId`, status, completedAt                             | at most one per item                                                      |
| `study_sessions`          | `&id`, unitId, itemId, mode, startedAt, endedAt                   | append-only lifetime history                                              |
| `xp_transactions`         | `&id`, sourceType, sourceId, awardedAt                            | append-only lifetime history                                              |
| `achievement_definitions` | `&id`, category, ruleType                                         | bounded definitions; persisted but RPG read builders use code definitions |
| `achievement_unlocks`     | `&id`, `&achievementId`, unlockedAt, triggerSourceId              | bounded by definitions                                                    |
| `backups`                 | `&id`, type, createdAt                                            | append-only audit history                                                 |
| `content_assets`          | `&id`, itemId, `[itemId+order]`, assetType, required              | catalogue-derived                                                         |
| `content_slices`          | `&id`, assetId, itemId, `[assetId+order]`, status, completedAt    | catalogue/content-derived                                                 |
| `media_progress_events`   | `&id`, itemId, assetId, sliceId, sessionId, `[assetId+createdAt]` | append-only lifetime history                                              |
| `resume_points`           | `&id`, `&assetId`, itemId, nextSliceId                            | at most one per asset                                                     |

The bundled 2026 course catalogue has 14 units and 68 items. This is descriptive baseline data, not a future scaling limit.

## 4. Observed broad snapshot behavior

`getDatabaseSnapshot()` in `src/lib/db/repositories.ts`:

- opens one Dexie read transaction across all 14 stores;
- reads both singletons with `get()`;
- calls `toArray()` on every other store, including all three append-only histories and `backups`;
- parses/sorts all returned records;
- therefore provides a coherent point-in-time view but materializes unrelated data and complete histories.

Every exported RPG loader in `src/features/rpg/model/readModels.ts` currently calls this one snapshot helper:

- `loadRpgHubSummary`
- `loadRpgCourseMapSummary`
- `loadRpgModuleSummary`
- `loadRpgStudyResourceSummary`
- `loadRpgFocusSessionSummary`
- `loadRpgBadgeGallerySummary`
- `loadRpgHeroProfileSummary`

However, the exported Focus and Badge loaders are not the current production route paths. Production Focus and Badges use shared Classic surfaces, described below. Acceptance must test actual route composition, not merely exported symbols.

## 4.1 Observed production `getDatabaseSnapshot()` callers

A source-wide search under `src/` found three production call locations:

- `src/features/rpg/model/readModels.ts`: the shared `readSnapshot()` used by all seven exported RPG loaders;
- `src/features/settings/components/SettingsSurface.tsx`: explicit user-triggered backup export;
- `src/lib/db/repositories.ts`: `restoreDatabaseFromBackup()` reads a final complete snapshot inside the destructive restore transaction for post-restore invariant validation.

No implemented production full-diagnostics export was found. Diagnostics export is backlog work, not a current completeness caller. Tests use complete snapshots extensively as fixtures/oracles; those test uses are legitimate and not Epic A production targets.

## 4.2 Current directly relevant test/guard baseline

- `tests/features/rpg/readModels.test.ts` already covers loader values, reward labels, missing IDs, error propagation and passive non-mutation using before/after complete snapshots.
- `tests/architecture/rpgFeature.test.ts` currently guards RPG UI against direct DB imports and guards RPG CSS asset rules. It does **not** observe read stores, row counts, scans, query fan-out or transaction scope.
- repository tests cover persistence, mutation, backup/restore and snapshot behavior.
- the immutable release gate runs lint, format, typecheck, build, bundle, unit/integration, E2E, circular dependency and audit checks under the required toolchain.
- the rejected candidate added a symbol guard and a long-history test, but the scale fixture omitted media history and therefore did not prove the objective.

## 5. Actual production RPG read surfaces

The persistent `RpgShell` independently calls `loadRpgHubSummary()`. Consequently, most RPG pages currently perform a shell-wide full snapshot in addition to the page read.

| Surface                          | Actual current read path                                                                                                                | Current broad/complete work                                                                 | Logical data actually needed by the surface                                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Hub `/rpg`                       | Shell `loadRpgHubSummary` + page `loadRpgHubSummary`                                                                                    | **two** all-14-store snapshots on initial load                                              | whole catalogue/progress/long-form state; learner profile; session lifetime/weekly/recent aggregates; XP lifetime/weekly/recent/reward state |
| Map `/rpg/map`                   | Shell Hub snapshot + `loadRpgCourseMapSummary` snapshot                                                                                 | two all-store snapshots                                                                     | course units/items; item progress; long-form asset/slice/media/resume state; reward-earned XP sources                                        |
| Module `/rpg/week/:unitId`       | Shell Hub snapshot + `loadRpgModuleSummary` snapshot                                                                                    | two all-store snapshots                                                                     | requested unit/items; relevant progress/long-form state; reward-earned XP sources                                                            |
| Resource `/rpg/resource/:itemId` | Shell Hub snapshot + `loadRpgStudyResourceSummary` snapshot                                                                             | two all-store snapshots                                                                     | requested item/unit; unit reward context; selected-item long-form state; relevant progress and reward XP sources                             |
| Focus `/rpg/focus`               | Shell Hub snapshot + shared `StudySessionsSurface`: `listCourseUnits`, `listCourseItems`, `listStudySessions`, optional `getCourseItem` | shell all-store snapshot; shared surface intentionally materializes complete session ledger | whole selectable catalogue + complete visible study-session ledger; page does not use exported `loadRpgFocusSessionSummary`                  |
| Badges `/rpg/badges`             | Shell Hub snapshot + shared `AchievementsSurface`: `getAchievementsView()` and `getXpSummary()`                                         | shell all-store snapshot; achievement unlock array; **full XP transaction array** for level | code achievement definitions; unlocks; lifetime XP total/level                                                                               |
| Hero `/rpg/hero`                 | Shell Hub snapshot + `loadRpgHeroProfileSummary` snapshot                                                                               | two all-store snapshots                                                                     | Hub data plus achievement unlocks                                                                                                            |

After Resource/Focus mutations, route feedback also reloads Hub and triggers shell-HUD refresh, so broad reads can repeat after a single save.

## 6. Surface → store/data-access matrix

Legend: `M` = currently materializes rows; `S` = scans/parses those rows; `I` = indexed/keyed access exists and should be used when scope is narrower; `C` = current single coherent snapshot transaction; `—` = not logically required by the surface. `Visible M` means complete materialization is presently user-visible behavior rather than hidden summary work.

| Data/store              | Hub                                           | Map                         | Module                | Resource              | Focus actual                                  | Badges actual                                      | Hero                                            | Target rule                                                                                                                                           |
| ----------------------- | --------------------------------------------- | --------------------------- | --------------------- | --------------------- | --------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| course/unit/item        | M/S/C all                                     | M/S/C all                   | M/S/C all             | M/S/C all             | M/S via list; optional keyed item             | shell broad only                                   | M/S/C all                                       | whole catalogue allowed only where whole-course output/selectors require it; Module/Resource must use requested unit/item scope and indexes/bulk keys |
| `progress_entries`      | M/S/C all                                     | M/S/C all                   | M/S/C all             | M/S/C all             | shell broad only                              | shell broad only                                   | M/S/C all                                       | whole course allowed for course-wide summary; module/item reads scoped via `itemId` index/bulk set                                                    |
| `content_assets`        | M/S/C all                                     | M/S/C all                   | M/S/C all             | M/S/C all             | shell broad only                              | shell broad only                                   | M/S/C all                                       | scope by relevant item IDs unless whole-course long-form summary is required                                                                          |
| `content_slices`        | M/S/C all                                     | M/S/C all                   | M/S/C all             | M/S/C all             | shell broad only                              | shell broad only                                   | M/S/C all                                       | scope by relevant asset IDs; no per-asset N+1 query loop                                                                                              |
| `media_progress_events` | M/S/C **all history**                         | M/S/C **all history**       | M/S/C **all history** | M/S/C **all history** | shell broad                                   | shell broad                                        | M/S/C **all history**                           | source-row full-history materialization prohibited for hidden summary reads; scoped/streaming O(n) aggregation permitted as defined in §9             |
| `resume_points`         | M/S/C all                                     | M/S/C all                   | M/S/C all             | M/S/C all             | shell broad                                   | shell broad                                        | M/S/C all                                       | scope by relevant asset IDs; bulk/indexed                                                                                                             |
| `study_sessions`        | M/S/C **all history**                         | unrelated but M/S/C         | unrelated but M/S/C   | unrelated but M/S/C   | **Visible M/S all** plus shell broad          | shell broad                                        | M/S/C all history                               | hidden Hub/Hero/Shell aggregation must stream/aggregate; Focus complete ledger is explicit exception                                                  |
| `xp_transactions`       | M/S/C **all history**                         | M/S/C all for reward labels | M/S/C all             | M/S/C all             | shell broad; mutation result                  | M/S all via `getXpSummary`                         | M/S/C all history                               | lifetime totals may stream; reward checks use indexed/bulk source IDs; no hidden full-history array                                                   |
| achievement definitions | DB M/S/C though builder uses code definitions | unrelated M/S/C             | unrelated M/S/C       | unrelated M/S/C       | shell broad                                   | code definitions; DB table not read by page        | DB M/S/C but hero builder uses code definitions | persisted table is unrelated to routine RPG read output under current semantics; do not read it merely to satisfy snapshot shape                      |
| `achievement_unlocks`   | unrelated M/S/C                               | unrelated M/S/C             | unrelated M/S/C       | unrelated M/S/C       | shell broad                                   | M/S all; bounded by definitions                    | M/S/C                                           | permitted where displayed; bounded by definition count                                                                                                |
| `learner_profile`       | keyed/C                                       | unrelated but read          | unrelated but read    | unrelated but read    | shell requires                                | shell requires                                     | keyed/C                                         | keyed singleton only for Hub/Hero/Shell                                                                                                               |
| `app_meta`              | unrelated keyed/C                             | unrelated                   | unrelated             | unrelated             | unrelated except shell snapshot               | unrelated except shell snapshot                    | unrelated                                       | zero routine RPG reads                                                                                                                                |
| `backups`               | unrelated M/S/C                               | unrelated M/S/C             | unrelated M/S/C       | unrelated M/S/C       | unrelated shell M/S                           | unrelated shell M/S                                | unrelated M/S/C                                 | zero routine RPG reads; complete access reserved for explicit backup/restore/reset/audit surfaces                                                     |
| transaction scope       | all 14                                        | all 14                      | all 14                | all 14                | shell all 14; shared lists are separate reads | shell all 14; page Promise.all uses separate reads | all 14                                          | use the smallest declared multi-store transaction needed to preserve one logical loader's coherent view                                               |

## 7. Directly coupled mutation flows

### Resource save

`RpgResourcePage` → `saveRpgStudyResourceProgress()` → `upsertProgressAndAwardXp()`.

The mutation transaction currently includes progress, XP, catalogue, content slices/media events, sessions, achievement unlocks and singleton stores. It evaluates rewards, evaluates achievements against accumulated source data, then calculates XP summary. Achievement evaluation currently materializes complete media/session source histories; XP summary materializes all XP transactions. These are explicit mutation-time behaviors and are not silently converted into Epic A passive-read requirements.

After success the route reloads Resource + Hub and requests shell-HUD refresh. Epic A must keep returned mutation summaries consistent with the replacement read models.

### Focus save

Shared `StudySessionsSurface` → `addStudySessionAndAwardXp()` in an explicit coordinated write transaction. It may award session XP, evaluate achievements against accumulated source data, and calculate XP summary. It then refreshes the complete visible session ledger. `RpgFocusPage` also reloads Hub feedback and refreshes the shell HUD.

### Long-form media mutation

`logMediaProgressAndAwardXp()` is not directly invoked by the current RPG routes inspected, but its persisted media/slice/resume state is consumed by RPG summaries. Its semantics and transaction behavior remain frozen.

### Mutation rule for Epic A

Do not rewrite these mutation algorithms merely to optimize passive reads. Mutation-side whole-history work may remain temporarily under the frozen schema. Every story touching a read that presents post-save XP/progress must prove mutation-result/read-result consistency.

## 8. Operational definitions

### Targeted read

A routine read is **targeted** only when all are true:

1. Its store allowlist is declared and contains no store unrelated to the returned surface/required consistency.
2. Catalogue/state rows are restricted by primary key/index/bulk key set when the surface does not require the whole catalogue.
3. Append-only history is not bulk-materialized merely to compute totals/status/recent activity.
4. Query count conforms to the fan-out contract below.
5. Multi-store values that were previously derived from one snapshot retain the required coherent-view semantics.
6. The read is passive: no persistent writes, initialization side effects, unlock evaluation, or backup audit writes.

A helper that constructs a snapshot-shaped object with empty/unrelated fields is not by itself a targeted-read contract. The application-facing data type must describe the data actually required or the compatibility adapter must be private, explicitly temporary, and unable to trigger extra I/O.

### Unrelated data

A store/row is **unrelated** when changing it cannot change the logical returned value for that read under frozen semantics and it is not required to provide the loader's declared transaction coherence. Data read only because a generic snapshot/type/helper expects it is unrelated.

### Materialized

A persisted row is **materialized** when the read retains that row, or a row-equivalent transformed representation containing per-row data, in an in-memory collection whose size grows with matching row count. Examples:

- `table.toArray()` → every returned row is materialized;
- `where(...).toArray()` → every matching row is materialized;
- cursor `.each()` that pushes one object/range/tuple per source row into an array is still row-equivalent materialization;
- `get()`/`first()` materializes at most one row.

A streaming aggregate that retains only aggregate scalars/top-K output/merged state is not source-row materialization, but its **derived aggregate-state peak** must be recorded if that state can itself grow with history.

### Scanned

A row is **scanned** when its persisted record is decoded/parsed/visited to answer the read, whether or not retained. A cursor over every XP row therefore has `rows_scanned = H_xp` even if `rows_materialized_history = 0`.

Index/range queries count only rows actually visited by the query. Tests must not claim a scan is bounded merely because it does not call `toArray()`.

### Query count

One IndexedDB/Dexie request or cursor opening that performs a logical store query counts as one query. `N` per-item/per-asset requests count as `N`, including requests launched in `Promise.all`.

Instrumentation may operate at a test adapter/repository boundary if it faithfully records store, operation, result-row count, scanned-row count/cursor visits, transaction identity, and transaction table scope.

The measurement probe must have its own calibration tests against known `get`, indexed `toArray`, full-table `toArray`, cursor scan, and intentional N-query fixtures. A production implementation cannot earn a green result by bypassing the probe through raw IndexedDB or an unobserved alternative access path; such access is itself an architecture failure.

### Bounded

The word **bounded** must always name its dimension:

- **history-materialization-bounded:** retained source-row/row-equivalent history does not grow with lifetime history `H`;
- **query-count-bounded:** query count does not grow with `H` and, for the specified loader, does not grow per catalogue item/asset unless explicitly allowed;
- **result-bounded:** returned recent/top-K rows are capped by an explicit constant;
- **catalogue-bounded:** work may grow with required catalogue size `C` because the output itself represents the catalogue;
- **scan-unbounded:** an approved O(`H`) streaming lifetime scan remains and is explicitly measured.

“Bounded” without one of these dimensions is not an acceptance claim.

### Acceptable O(n) lifetime aggregation

Under schema v2, an O(`H`) scan is temporarily acceptable only when:

- the output requires a lifetime aggregate or exact history-derived state;
- no existing persisted aggregate/index can produce the same frozen result without changing the data contract;
- complete source rows are not retained as a hidden result array;
- scanned rows are measured;
- query count remains constant with history size;
- the scan is listed in §9 rather than introduced ad hoc.

### Prohibited full-history materialization

On passive RPG summary reads, do not materialize a complete append-only `media_progress_events`, `study_sessions`, or `xp_transactions` store (or equivalent per-row projection) solely to calculate aggregate/status/recent/reward information.

Exception: Focus's complete visible session ledger may materialize `study_sessions` because the published UI intentionally renders that history. This exception does not authorize the shell/Hub to materialize it again.

### Acceptable query fan-out

For new Epic A read contracts:

- query count must be independent of lifetime history size;
- Map/Hub/Hero course-wide reads: constant queries per required store; no per-item/per-asset N+1 loops;
- Module: constant queries per required store, independent of number of items in the module;
- Resource: constant queries per required store, independent of number of unit items/content slices/media events;
- reward-state lookup must use indexed/bulk source IDs rather than scan all XP rows;
- any exception must be named, measured at 1× and 10× catalogue size, and approved in the story contract before implementation.

A useful default budget is **one logical query/cursor per required store**, with a second query to the same append-only store allowed only when a distinct indexed range and a lifetime scan are demonstrably simpler and query count remains constant. The story must record its exact observed count; this default is not permission to hide repeated queries behind helpers.

### Transaction/coherence requirement

For Map, Hub, Module, Resource and Hero, the published loader derives multiple stores from one `getDatabaseSnapshot()` read transaction. Replacement loaders must retain a single coherent read transaction over their declared required stores. Narrow the table scope; do not split one logical view into unrelated autocommit reads that can mix pre-/post-mutation state.

Separate shell and page reads are separate logical views today; Epic A does not require cross-component atomicity.

Focus/Badges shared surfaces did not previously guarantee one transaction across their independent repository calls. Preserve their existing semantics unless a story deliberately introduces one narrow read contract. Do not weaken mutation transactionality.

## 9. Frozen-schema performance contract

Schema/version/index definitions remain unchanged throughout Epic A unless a story proves the required outcome impossible. A0 found no such blocker.

### Whole-history work temporarily allowed

1. `xp_transactions`: streaming lifetime scan for total XP/level on Hub/Hero/Shell/Badges, because no persisted XP total exists. Reward-earned checks should instead use the existing `sourceId` index/bulk source set.
2. `study_sessions`: streaming lifetime scan for Hub/Hero/Shell lifetime session count/total minutes if needed. Weekly/recent data may use the existing time index or be accumulated during the same scan. Focus may materialize the complete ledger because it is directly rendered.
3. `media_progress_events`: scoped streaming/history aggregation where exact long-form coverage cannot be reproduced from current schema state without semantic change. Source-row arrays for hidden course/module/resource summaries are prohibited. If exact coverage needs derived merged intervals whose peak grows with disjoint history, record that peak honestly; do not call the memory constant.
4. Mutation-time achievement evaluation and XP summary scans may remain. They occur only on explicit saves and are outside the passive-read optimization boundary.

### Work that cannot remain on routine passive RPG reads

- all-14-store `getDatabaseSnapshot()` use;
- any read of `backups` or `app_meta` for Map/Hub/Module/Resource/Focus/Badges/Hero output;
- persisted `achievement_definitions` reads when current output uses code definitions;
- hidden full arrays of all media events, sessions, or XP transactions for aggregate-only views;
- per-item/per-asset query fan-out whose count grows with catalogue cardinality when current indexes support bulk/range access;
- broad transaction scopes added merely because a shared constant lists more tables than the loader uses.

### Deferred deliberate data-contract work

Not in Epic A:

- persisted XP/session/media aggregate tables;
- new indexes supporting aggregate/coverage summaries;
- history compaction/pruning/retention;
- pagination/truncation of Focus history;
- programme/enrollment scoping;
- cloud sync/cache model.

If measured O(`H`) scans later become unacceptable, address them through an explicit schema/data-contract/migration story rather than smuggling state changes into this refactor.

## 10. Acceptance criteria

### AC-01 — Published value/behavior equivalence

For the same database state/time, replacement Map/Hub/Module/Resource/Hero reads return values equivalent to the published builders/loaders, including missing IDs, long-form state, reward labels, recent activity ordering, weekly totals, badges, learner fallback, and error propagation. Actual Focus/Badges route output remains equivalent.

Observation: focused fixture comparison against published pure builders plus route/shared-surface tests. Builder equivalence is behavior evidence only, not architecture evidence.

### AC-02 — Passive reads remain non-mutating

Every routine RPG read leaves all 14 stores byte/value-equivalent before vs after. No achievement evaluation, initialization write, backup audit write, or coordination write is triggered.

Observation: before/after full snapshots in tests are legitimate test-only completeness reads.

### AC-03 — Actual production path coverage

Instrumentation covers shell + actual route composition for Hub, Map, Module, Resource, Focus, Badges and Hero. Passing tests for unused exported loaders alone is insufficient.

### AC-04 — Store allowlists and unrelated-store exclusion

Each logical read records its accessed stores. No undeclared store access is permitted. `backups`, `app_meta`, and persisted achievement definitions have zero accesses on the covered routine RPG paths unless a future story changes the declared semantics.

### AC-05 — History materialization contract

For Map/Hub/Module/Resource/Hero/Shell hidden summaries:

- complete `media_progress_events`, `study_sessions`, and `xp_transactions` arrays are not materialized;
- materialized history-row/row-equivalent counts stay independent of synthetic history size except explicitly returned top-K/matched reward records;
- Focus's complete `study_sessions` ledger is the only approved route exception.

### AC-06 — Rows scanned are measured, not disguised

For every append-only store touched by a routine RPG path, evidence reports rows scanned at both fixture sizes. Any O(`H`) scan must be one of the approved §9 scans. A cursor replacing `toArray()` is not sufficient evidence by itself.

### AC-07 — Query fan-out is constant in the declared dimensions

At 1× and 10× history, query count is unchanged. At 1× and 10× catalogue cardinality, Map/Hub/Hero, Module and Resource query counts remain within their story-declared constant budgets; no per-item/per-asset N+1 pattern is permitted.

### AC-08 — Coherent transaction scope

Map/Hub/Module/Resource/Hero each execute within one read transaction containing exactly the stores needed by that logical loader (or an evidenced minimal superset required by Dexie mechanics). Evidence records transaction ID/mode/table scope. A concurrency/barrier test must demonstrate the loader cannot return a hybrid view across a concurrent committed mutation.

### AC-09 — Large-history red→green evidence includes all three histories

Synthetic scale fixture contains, at minimum, the same order of history in **all three** append-only stores:

- 1×: 1,000 `study_sessions`, 1,000 `xp_transactions`, 1,000 `media_progress_events`;
- 10×: 10,000 of each.

Exact counts may be lowered only if authoritative CI demonstrates a hard test-runtime/resource problem and the replacement still preserves a 10× ratio and exposes the same access pattern.

At least one access-contract test must be demonstrated red on the published broad path and green on the candidate. The primary red test should assert both unrelated-store access and forbidden history materialization, not a symbol/regex ban.

### AC-10 — Backup/export/restore completeness remains deliberate

`SettingsSurface` export may continue to call `getDatabaseSnapshot()`; backup envelope/restore/reset paths continue to include all 14 stores and retain their atomicity/validation behavior. Existing backup/restore tests remain green. Epic A must not globally ban the snapshot helper.

### AC-11 — Mutation-summary consistency

After Resource progress save and Focus session save:

- returned XP summary equals the subsequent targeted Hub/Badge level view;
- newly awarded XP/unlocks remain once-only;
- recommendation/progress state reflects the committed mutation;
- no passive read writes compensating state.

Use existing save/repository tests plus focused post-mutation read assertions.

### AC-12 — Frozen contracts

No changes to:

- `src/lib/db/database.ts` store/index/version definitions;
- schema migration behavior;
- backup format/version;
- XP/reward rules;
- achievement rules;
- user-facing UI/copy/navigation;
- service worker/cloud/auth.

Any discovered necessity invalidates the active story and returns to A0/owner decision rather than silently widening scope.

### AC-13 — Authoritative project validation

On exact candidate bytes under Node `>=24 <25`, npm `>=11 <12`:

- formatter check;
- lint;
- typecheck;
- focused access/read tests;
- complete unit/integration suite including architecture tests;
- production build;
- bundle/circular checks proportional to touched imports;
- final required release/CI gate before merge.

No Node 22/npm 10 result substitutes for this evidence.

## 11. Acceptance → evidence map

| Acceptance property          | Required evidence                                                             | Cannot be substituted by                          |
| ---------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| value equivalence            | targeted-vs-published builder fixtures + actual route/shared-surface tests    | store/query metrics                               |
| passive non-mutation         | full before/after snapshot equality around reads                              | absence of write calls in source only             |
| table/store access           | test access log by actual store/operation                                     | regex banning `getDatabaseSnapshot`               |
| measurement-probe validity   | calibration tests with known row/query/scan counts and bypass guard           | trusting the probe because it compiles            |
| rows materialized            | per-store returned/retained row counts, including transformed row-equivalents | query count alone                                 |
| rows scanned                 | cursor/result visit counters per append-only store at 1×/10×                  | `toArray()` absence                               |
| query count                  | operation log at 1×/10× history and catalogue                                 | wall-clock timing                                 |
| transaction/table scope      | transaction ID/mode/table allowlist log + concurrency barrier test            | value equivalence alone                           |
| all three histories          | 1k/10k fixtures for media/session/XP                                          | session+XP-only fixture                           |
| backup completeness          | existing export/restore round-trip/store-count tests                          | RPG read tests                                    |
| mutation-summary consistency | post-save result vs targeted read assertions                                  | mutation unit test alone                          |
| type/lint/build/test env     | exact CI/release evidence with Node24/npm11 and candidate SHA/tree            | TS transpile/parser success under another runtime |

### Measurement record shape

Each instrumented read should be able to emit conceptually:

```text
surface
transaction(s): [{id, mode, stores[]}]
queries: [{store, operation, predicate/scope, rowsReturned, rowsScanned}]
materializedRowsByStore
scannedRowsByStore
derivedAggregatePeakByStore (when history-dependent)
queryCountByStore
totalQueryCount
writesObserved
```

The implementation may choose a different test-internal representation, but every field above must be recoverable from evidence.

## 12. Meaningful baseline red signal

The published path is expected to fail the first Epic A access test without changing production source:

- invoke actual Map (or its production loader plus shell separately) against an instrumented synthetic DB;
- assert Map logical read does **not** access `backups`, `app_meta`, `study_sessions`, achievement definition/unlock stores;
- assert no complete `media_progress_events` history array is materialized;
- assert transaction scope is the Map allowlist rather than all 14 stores.

Published `loadRpgCourseMapSummary()` calls `getDatabaseSnapshot()`, which unconditionally opens all 14 stores and `toArray()`s media events, sessions, XP, achievements and backups. Therefore this is a mechanism-level red test, not a proxy regex test.

The 10× fixture provides the second signal: published Map materialized history grows with all histories even though sessions/backups/achievement rows cannot affect Map output.

## 13. Risks and deferred decisions

1. **Media coverage aggregation memory:** exact union-of-range semantics can require history-dependent derived interval state even after source-row arrays disappear. Record peak derived state. If it becomes unacceptable, a schema/state change is required later.
2. **Focus visible history:** the complete ledger intentionally remains O(`H_session`) materialized. This is a frozen-UI exception, not a claim that the route is history-bounded.
3. **Current single-programme schema:** some course-wide queries can coincide with whole-store queries today. Epic A must still express scope through course/item/asset identities where practical so later programme work is not forced back to broad-store semantics.
4. **Reward adapter:** reward labels currently infer possible awards through existing reward rules and XP ledger state. Avoid coupling persistence query shape to fabricated progress more than necessary; preserve exact reward behavior.
5. **Test oracle independence:** published pure builders are appropriate behavior oracles but share domain assumptions. Architecture acceptance therefore uses independent store/query/transaction instrumentation and red baseline proof.
6. **Remote baseline uncertainty:** GitHub was unavailable to this A0 session. Fresh implementation context must re-prove accepted HEAD/tree and clean state.
7. **Remote validation access:** authoritative Node24/npm11 CI exists in source but was not executable/inspectable through the connected GitHub tool in this session. This is the sole A0 readiness concern; see `VALIDATION_READINESS.md`.

## 14. Epic A exit

Epic A closes only after all planned stories are accepted and an aggregate review confirms:

- actual RPG routes no longer depend on broad snapshots for passive summary reads;
- allowed O(`H`) scans are explicit and measured;
- hidden append-only history is not bulk-materialized;
- query fan-out is constant in declared dimensions;
- transaction coherence is preserved;
- backups remain complete;
- mutations/read summaries remain consistent;
- schema and frozen product behavior did not change;
- authoritative Node24/npm11 evidence is bound to the exact accepted candidate.
