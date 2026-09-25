# A3 acceptance contract — Resource read boundary

Story: **A3 — Resource read boundary**

Status: **readiness PASS; implementation not yet started**

## Objective

Replace only the broad snapshot used by `loadRpgStudyResourceSummary(itemId)` with a selected-item/unit-scoped coherent read contract while preserving published Resource values, detailed reward semantics, long-form state and post-save readback behavior.

## Actual production boundary

A3 owns the logical Resource loader:

```text
RpgResourcePage
  -> loadRpgStudyResourceSummary(itemId)
```

The persistent shell and the explicit post-save `loadRpgHubSummary()` call remain A4. A3 tests must not count those Hub/HUD reads as Resource-store violations.

## Declared persisted-store family

The Resource logical read may use only:

1. `course_items`
2. `course_units`
3. `progress_entries`
4. `content_assets`
5. `content_slices`
6. `media_progress_events`
7. `resume_points`
8. `xp_transactions`

The following are unrelated and must have zero Resource logical-read access:

- `app_meta`
- `learner_profile`
- `study_sessions`
- `achievement_definitions`
- `achievement_unlocks`
- `backups`

## Required scope

The returned data may contain only what is logically required to derive the selected Resource:

- selected item;
- selected unit;
- unit items needed for reward preview;
- unit progress needed for reward preview and selected saved progress;
- selected-item content assets/slices/resume state;
- streamed selected-item media aggregate state;
- selected-item detailed reward-earned keys.

Do not return a fake `DatabaseSnapshot` populated with unrelated empty arrays merely to reuse the old builder.

Prefer an explicit `ResourceReadData` contract and a pure Resource adapter/builder.

## Query-count contract

Default maximum for an existing item:

```text
course_items           <= 2
course_units           <= 1
progress_entries       <= 1
content_assets         <= 1
content_slices         <= 1
media_progress_events  <= 1
resume_points          <= 1
xp_transactions        <= 1
--------------------------------
total                  <= 9
```

Query count must remain constant when:

- unit item count grows 1× -> 10×;
- selected-item asset/slice count grows 1× -> 10×;
- relevant media/XP history grows.

No per-item/per-asset/per-slice/per-event/per-resume N+1 loops are permitted, including requests hidden in `Promise.all`.

For a missing selected item, only the selected-item lookup should be required before returning `null`.

## Detailed reward contract

Resource uses the detailed reward label. The narrow reader must preserve earned-state semantics for all completion-preview awards for the selected item, including:

- task completion awards;
- problem-set submitted/accepted awards;
- final-project shared README/video award;
- `week_completed` when the selected task would complete a required week.

Reward-earned lookup must be indexed by finite `sourceId` values and must retain only exact `(sourceType, sourceId)` keys.

A3 must not change XP amounts, reasons, award rules or mutation behavior.

## Long-form contract

For the selected item only:

- content assets/slices/resume state may be materialized as bounded catalogue/current-state data;
- relevant media source rows must be streamed/visited without hidden source-row arrays;
- createdAt/id last-event ordering must remain equivalent;
- coverage and resume output must match the published builder;
- derived merged-range peak must be measured when it can grow with disjoint history.

An O(H_selected_item) media scan remains permitted under the frozen schema and must be reported as such.

## Transaction contract

The Resource logical read must use one coherent readonly transaction across its declared required stores. The transaction may declare the fixed eight-store family even when an early missing-item return means only one store is actually queried.

No passive writes are permitted.

## Missing/corrupt-reference behavior

Preserve published behavior:

- missing/unknown item -> `null`;
- item whose unit cannot be resolved -> `null`;
- invalid-looking arbitrary string IDs must not be converted into a new validation exception if the published loader returned `null`;
- stored-row schema corruption continues to propagate as an error rather than being silently ignored.

## Post-save consistency contract

`saveRpgStudyResourceProgress()` remains a separate explicit mutation.

After a successful save:

- Resource readback must reflect the mutation result's `progressEntry`;
- the detailed reward label must reflect newly awarded/previously earned reward sources without inventing a second award;
- a failed Resource or Hub refresh must not relabel the committed write as failed or repeat it;
- read-only refresh retry must not write;
- shell/Hub/HUD refresh behavior remains A4 and is not modified by A3.

## RED evidence

On the accepted A2 baseline, the A3 RED test must invoke the real `loadRpgStudyResourceSummary()` and fail the future contract because the current loader uses `getDatabaseSnapshot()`.

Required RED evidence must show actual observed:

- broad transaction store scope;
- forbidden-store access;
- hidden append-only history materialization where fixtures contain rows;
- query/store contract violations;
- zero writes despite the broad read.

The accepted A1/A2 DBCore probe must be recalibrated before interpreting RED evidence.

## GREEN evidence

Required GREEN coverage:

- published-builder equivalence for representative early, mid-course and final-project resources;
- missing item/unit behavior;
- long-form progress and resume semantics;
- detailed task/week/final-project reward labels;
- zero passive writes;
- 1×/10× unit-item cardinality;
- 1×/10× selected-item asset/slice cardinality;
- 1k/10k media history;
- XP index scope with irrelevant history and duplicate relevant source IDs;
- transaction-coherence barrier on the actual Resource loader;
- mutation-result -> Resource-readback consistency;
- existing Resource save/retry/navigation outcome tests;
- A1 Map and A2 Module regression tests;
- full clean-environment project gate;
- authoritative exact-commit Node24/npm11 `verify:release` evidence.

## Frozen scope

No A3 implementation may alter:

- A4 shell/Hub/Hero behavior;
- Focus or Badges;
- schema/indexes/migrations;
- backup/storage format;
- XP/achievement rules;
- UI/copy/navigation;
- service worker/cloud/auth architecture.

## Acceptance decision rule

A3 is accepted only when the exact implementation commit satisfies this contract and the authoritative release evidence is bound to that exact commit/tree. Passing a source inspection, an indirect route, or only the pure builder is insufficient.
