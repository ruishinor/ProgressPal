# Epic A / A0 review record

- Date: 2026-09-20
- Disposition: **A0 contract complete for planning; implementation readiness CONCERNS**

## Adversarial findings and dispositions

### R-01 — Symbol removal can preserve broad work

Attack: replace `getDatabaseSnapshot()` with manual `toArray()` calls or a snapshot-shaped adapter.

Finding: verified material bypass; rejected candidate demonstrated this class.

Disposition: contract patched. Acceptance observes stores, rows materialized/scanned, query count and transaction scope. Regex/symbol checks are secondary only.

### R-02 — Media history can be omitted from scale evidence

Attack: grow only sessions/XP so tests pass while full `media_progress_events` still materializes.

Finding: verified; rejected candidate's 1,500-row scale test covered sessions and XP but not media.

Disposition: contract patched. Both 1× and 10× fixtures require all three append-only histories.

### R-03 — `.each()` can disguise O(n) work

Attack: replace `toArray()` with cursor scans and call the read “bounded.”

Finding: material. Cursor scans remove bulk row retention but not lifetime work.

Disposition: `rows_scanned` is a first-class metric. Approved O(n) scans are listed explicitly. “Bounded” must name materialization/query/result/catalogue dimension.

### R-04 — Streaming can still retain one transformed object per row

Attack: cursor over history but push ranges/DTOs into an array, technically avoiding source rows.

Finding: material.

Disposition: row-equivalent transformed collections count as materialization. History-dependent derived aggregate peak is separately recorded.

### R-05 — N+1 can hide behind small CS50 cardinality

Attack: per-item `getProgress` and per-asset slices/events/resume queries; current 68-item catalogue looks fast.

Finding: verified in rejected candidate design.

Disposition: query count must remain constant at 1×/10× catalogue cardinality for Map/Hub/Hero/Module/Resource. Bulk/index/range queries are required where available.

### R-06 — Value equivalence can pass after transaction coherence is lost

Attack: perform independent reads from multiple stores; ordinary fixtures have no concurrent write and values match.

Finding: material because published snapshot loaders read one transaction.

Disposition: Map/Hub/Module/Resource/Hero require one coherent narrow read transaction and a concurrency/barrier test capable of detecting a hybrid view.

### R-07 — Actual Focus/Badges routes can be omitted

Attack: refactor exported `loadRpgFocusSessionSummary` / `loadRpgBadgeGallerySummary` and declare route coverage, although production routes use shared Classic surfaces.

Finding: verified from route source.

Disposition: contract requires actual route composition. Focus uses `StudySessionsSurface`; Badges uses `AchievementsSurface`. Unused broad exported loaders must be narrowed or deliberately removed before Epic exit.

### R-08 — Persistent shell can preserve the original failure on every route

Attack: page loader becomes targeted while `RpgShell` still calls broad `loadRpgHubSummary()`.

Finding: verified. Shell independently loads Hub summary.

Disposition: actual route tests include shell. Hub/Hero/HUD work is its own story.

### R-09 — Focus makes a universal “no full history materialization” rule impossible without UI change

Attack on spec: require zero complete routine-route history arrays while published Focus displays the complete session ledger.

Finding: verified conflict with frozen UI behavior.

Disposition: one explicit exception: Focus may materialize the user-visible complete `study_sessions` ledger. The exception does not extend to shell/Hub hidden aggregation. Pagination is deferred.

### R-10 — Media exactness may require history-dependent aggregate memory even without row arrays

Attack: claim constant memory because media event rows are streamed, while exact union-of-ranges retains a growing set of disjoint intervals.

Finding: plausible and supported by current long-form semantics (`mergeCoveredRanges`).

Disposition: materialization and derived aggregate-state peak are separate metrics. Epic A does not claim constant memory for exact media aggregation if evidence does not support it. Schema-level summaries are deferred.

### R-11 — Reward lookups can reintroduce full XP scans

Attack: preserve reward labels by reading every XP transaction and filtering in memory.

Finding: baseline does this; rejected candidate attempted indexed source-ID reads but coupled source-ID discovery to simulated reward evaluation.

Disposition: reward-earned reads use indexed/bulk source IDs. Behavior stays frozen. Any reward-source identity adapter must be tested as a domain coupling, not assumed stable.

### R-12 — Backup optimization could corrupt completeness

Attack: globally ban `getDatabaseSnapshot()` or narrow it, breaking export/restore/reset.

Finding: material. Settings export and restore legitimately depend on all stores.

Disposition: snapshot helper remains valid for explicit complete-data operations and test oracles. Epic A bans it only from routine RPG summary reads.

### R-13 — Mutation optimization can silently widen scope and risk rewards

Attack: while changing read APIs, “fix” mutation-side full scans in XP/achievement evaluation.

Finding: unnecessary coupling and rollback risk.

Disposition: mutation algorithms are frozen in Epic A. Only read/result consistency is tested. Mutation performance is deferred unless it blocks correctness.

### R-14 — Test oracle can share the implementation's assumptions

Attack: compare targeted loader to a builder fed by the same narrowed data shape; both omit the same required data.

Finding: plausible.

Disposition: behavior oracle remains the published pure builder/full snapshot fixture; architecture oracle is independent access instrumentation; actual route tests provide a third layer.

### R-15 — 10× tests can still be gamed with low absolute volume

Attack: use 1 row vs 10 rows and satisfy “10×.”

Finding: material.

Disposition: default history fixtures are 1,000 vs 10,000 rows in each append-only store. Reductions require evidence of CI resource constraints and must preserve the same access failure signal.

### R-16 — Readiness can be falsely marked PASS from historical CI

Attack: point to old Node24 release evidence while current candidate cannot execute authoritative checks.

Finding: verified environment gap in this A0 session: local runtime is Node 22.16.0/npm 10.9.2 and GitHub repository connector is unavailable.

Disposition: readiness is **CONCERNS**, not PASS. The source-defined GitHub Actions Node24/npm11 path is the explicit closure path; no story may be accepted/merged if exact-candidate authoritative evidence does not arrive.

## Omitted-history/path challenge

Checked explicitly:

- `media_progress_events` — included;
- `study_sessions` — included;
- `xp_transactions` — included;
- Focus actual shared session surface — included;
- Badges actual shared achievement surface — included;
- persistent `RpgShell` Hub read — included;
- `backups`/app metadata/achievement definitions — included as unrelated-store guards;
- explicit backup/export/restore/reset completeness — preserved;
- Resource and Focus save flows — included in consistency evidence.

No additional material routine RPG path required by the A0 mission was found.

## 10× failure expectations

At 10× history, an acceptable schema-frozen candidate may show approximately 10× scanned rows for approved lifetime aggregates. It must **not** show:

- 10× retained hidden history rows;
- 10× query count;
- new unrelated-store reads;
- loss of transaction coherence.

At 10× catalogue, catalogue-wide output may process approximately 10× catalogue rows, but query count must remain constant; Module/Resource must not expand to one query per item/asset.

## False-readiness triggers

A story is not ready/accepted if any of these occur:

- exact real-repository baseline cannot be established;
- Node24/npm11 evidence path cannot be invoked;
- access probe cannot measure scanned rows credibly;
- transaction-coherence test is replaced with source inspection only;
- test fixture omits any append-only store relevant to the claim;
- route test excludes shell or shared Focus/Badges composition;
- implementation requires a schema/index/migration change not approved by this SPEC.
