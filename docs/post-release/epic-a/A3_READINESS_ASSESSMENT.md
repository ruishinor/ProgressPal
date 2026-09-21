# A3 readiness assessment — Resource read boundary

Result: **PASS — ready for A3 RED/implementation after this readiness record is integrated**

Date: 2026-09-21

## Accepted lineage

Published product baseline remains:

- `master`: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- tree: `d4124b4576acf7e6f6ba7ed52f0249b0e9a78a34`

Accepted Epic A lineage entering A3:

- A1 implementation: `ec651536e61a7e5d939506069887df32b81b5c0f`
- A2 readiness: `31e611dd934ac2456864949bc3e1e6a7f7748189`
- A2 implementation: `e329950bbcce0bae2faa42496f532af13deb7322`
- A2 implementation tree: `f321357a8f3b087fddc0e25540920d5b3d9c6dc9`
- A2 closure/integration HEAD entering this readiness assessment: `d64c135ed41ffda5530516ffa9bad125abd2f82e`

The A2 implementation passed the authoritative exact-candidate Node 24/npm 11.10.1 release gate with 626/626 unit/integration tests, 74/74 E2E tests and zero audit vulnerabilities. A2 closure was documentation-only.

## Readiness checks

| Check                                    | Result | Evidence / disposition                                                                                                                             |
| ---------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2 accepted and closed                   | PASS   | Exact implementation `e329950...`; closure commit `d64c135...` on `postrelease/01-read-architecture`.                                              |
| Worktree clean at closure                | PASS   | Owner closure output ended with clean `postrelease/01-read-architecture`.                                                                          |
| Node/npm validation path                 | PASS   | A2 authoritative validation used Node `v24.19.0`, npm `11.10.1`; clean-clone strategy remains available.                                           |
| Schema/index contract                    | PASS   | A2 changed no `src/lib/db/database.ts` schema/version/index definitions. Existing v2 indexes cover A3 needs.                                       |
| Access probe                             | PASS   | A1/A2 probe calibration passed in focused and authoritative A2 validation.                                                                         |
| Actual Resource broad-read premise       | PASS   | `RpgResourcePage` calls `loadRpgStudyResourceSummary(itemId)`; that loader still calls `getDatabaseSnapshot()` through `readSnapshot()`.           |
| Actual post-save composition understood  | PASS   | After explicit save, the page refreshes Resource + Hub concurrently and triggers HUD refresh. Resource is A3; Hub/HUD remain A4.                   |
| Frozen product behavior can be preserved | PASS   | Current builders separate Resource output from mutation logic; existing indexes support a narrow coherent reader without schema/UI/reward changes. |

Before the readiness docs are committed, the owner-side integration command must re-fetch and re-prove `origin/master` is still the accepted baseline. If it moved, stop and reconcile rather than relying on this assessment.

## Current actual Resource path

The production route is:

```text
RpgResourcePage
  -> loadRpgStudyResourceSummary(itemId)
     -> readSnapshot()
        -> getDatabaseSnapshot()
           -> one broad transaction/materialization across all 14 stores
```

`buildRpgStudyResourceSummary()` then:

1. builds a full course-map context from all units/items/progress;
2. locates the selected item and its unit;
3. derives selected progress and long-form progress;
4. builds the course detail view;
5. builds the detailed reward label.

That broad snapshot is not logically required for Resource output.

## Post-save route composition

`saveRpgStudyResourceProgress()` is an explicit coordinated mutation and is outside the passive-read optimization boundary. After it commits, `RpgResourcePage.refreshSavedProgress()` performs:

```text
refreshHud()                                  -> persistent shell Hub read (A4)
Promise.all([
  loadRpgStudyResourceSummary(resourceId),   -> Resource read (A3)
  loadRpgHubSummary(),                       -> Hub read (A4)
])
```

A3 must therefore prove Resource readback consistency without claiming that the whole route is narrow while A4 is still pending. Route tests must distinguish A3 Resource access from A4 Hub/HUD access.

Existing save-outcome behavior that must remain includes:

- a committed Resource save stays committed if Resource or Hub refresh subsequently fails;
- a read-only retry can recover the summary without repeating the write;
- true write failure preserves the draft and retries exactly once;
- rapid/unchanged submits do not duplicate writes;
- navigation prevents stale save/refresh completion from overwriting the current Resource;
- backwards progress corrections do not replay already-earned XP/achievements.

## Required Resource data

A narrow Resource summary requires only:

- the selected `course_items` row;
- its `course_units` row;
- all items in that unit, because completion-preview XP may depend on required sibling completion;
- progress rows for that unit, including the selected saved progress;
- selected-item `content_assets`;
- selected-item `content_slices`;
- selected-item `media_progress_events`, streamed/aggregated rather than retained as source rows;
- selected-item `resume_points`;
- indexed XP reward-earned state for the selected item preview.

It does not require `app_meta`, `learner_profile`, `study_sessions`, `achievement_definitions`, `achievement_unlocks`, or `backups`.

## Resource-specific reward requirement

A3 cannot reuse A2 Module reward-source filtering unchanged.

Resource calls `buildQuestRewardLabel(..., detailed = true)`. The detailed label can include both:

- task XP; and
- `week_completed` XP when completing the selected task would complete the week.

Therefore the Resource read contract must include earned-state lookup for every reward source returned by the selected item's completion preview, **including `week_completed`**. Otherwise an already-earned week reward could be shown as remaining.

The final-project README/video shared reward must remain equivalent as well.

## Existing schema/index suitability

Schema v2 already provides the required access paths:

- `course_units`: primary key `&id`;
- `course_items`: primary key `&id`, index `unitId`;
- `progress_entries`: unique `&itemId`;
- `content_assets`: index `itemId`;
- `content_slices`: index `itemId`;
- `media_progress_events`: index `itemId` and `[assetId+createdAt]`;
- `resume_points`: index `itemId`, unique `&assetId`;
- `xp_transactions`: index `sourceId`.

No A3 schema/index/migration change is justified.

## Proposed A3 query budget

For an existing selected item, the default maximum logical-query budget is **9**:

| Store                   | Max queries | Intended scope                                     |
| ----------------------- | ----------: | -------------------------------------------------- |
| `course_items`          |           2 | selected item `get(itemId)` + one unit-items query |
| `course_units`          |           1 | selected unit `get(unitId)`                        |
| `progress_entries`      |           1 | bulk/indexed progress for unit item IDs            |
| `content_assets`        |           1 | selected item only                                 |
| `content_slices`        |           1 | selected item only                                 |
| `media_progress_events` |           1 | selected-item cursor/stream                        |
| `resume_points`         |           1 | selected item only                                 |
| `xp_transactions`       |           1 | indexed selected-preview reward source IDs         |
| **Total**               |       **9** | constant in unit/content/history cardinality       |

A missing item should perform only the selected-item lookup and return `null`; dependent stores must not be queried.

This budget is a readiness contract, not an implementation mandate to perform empty no-op queries. Fewer queries are acceptable if semantics and coherence are preserved.

## History/materialization rules

- Relevant media history may remain an approved O(H_selected_item) scan under the frozen schema.
- Media source rows must not be accumulated as an array or row-equivalent hidden collection.
- Derived merged coverage state may grow with disjoint history; its peak must be measured honestly.
- XP lookup must use the `sourceId` index and retain only exact earned reward keys.
- Duplicate rows sharing a relevant `sourceId` can make XP rows scanned grow with matching rows; do not describe XP scan work as globally constant.
- `study_sessions` must not be read by the Resource logical loader.

## Transaction/coherence requirement

The Resource summary must be produced from one coherent readonly logical transaction over its declared required stores. Do not replace the broad snapshot with unrelated autocommit reads.

A coherence barrier test must pause the **actual Resource loader** during a scoped read and use a second database connection to attempt a competing write, proving the summary does not mix pre/post-write state.

## A3 RED requirement

Before production code changes, add only the A3 RED harness and prove the accepted A2 baseline fails for an observed mechanism reason.

The RED harness must invoke the actual `loadRpgStudyResourceSummary()` production loader and use the calibrated DBCore probe. It must fail because the current loader:

- declares/accesses the broad 14-store snapshot;
- touches unrelated stores;
- materializes hidden media/XP history rows when present;
- exceeds the A3 Resource store/query contract.

Do not use source-text regex checks as the architecture oracle.

## A3 GREEN evidence required

At minimum:

1. normal selected-item value equivalence against the published builder;
2. representative equivalence for early/mid/final-project resources;
3. missing-item and item-with-missing-unit behavior;
4. detailed reward labels, including already-earned task, week-completion and shared final-project sources;
5. long-form progress/resume equivalence;
6. zero passive writes;
7. 1×/10× unit-item cardinality with constant query count;
8. 1×/10× selected-item asset/slice cardinality with no N+1 query growth;
9. 1k/10k relevant media-history evidence with rows scanned/materialized/derived peak reported;
10. indexed XP lookup evidence, including many irrelevant XP rows and duplicate relevant source IDs;
11. actual-loader transaction-coherence barrier evidence;
12. explicit post-save mutation-result -> Resource-readback consistency;
13. existing save-outcome tests showing failed refresh does not repeat/undo a committed write;
14. preserved A1 Map and A2 Module access-boundary tests;
15. focused repository/read-model/save-outcome/architecture tests;
16. full clean-environment validation and exact-candidate Node24/npm11 `verify:release` evidence.

Scale/measurement tests must isolate the operation under measurement from full-snapshot semantic oracles.

## Local tooling constraint

The registered `.kilo/worktrees/nova-carnation` worktree currently contaminates repo-wide ESLint root discovery in the primary directory. This is not an Epic A product defect.

A3 should preserve that worktree unless it is deliberately resolved as separate tooling hygiene. Repository-wide validation should continue in fresh isolated clones while it remains registered.

## Frozen scope

A3 must not change:

- shell/Hub/Hero read behavior (A4);
- Focus/Badges paths;
- database schema, version, indexes or migrations;
- backup/storage format;
- XP award amounts or achievement rules;
- UI, copy, navigation or route structure;
- service worker, cloud or authentication architecture.

Behavior-preserving shared helper extraction is allowed only when required for the Resource read boundary and must not silently broaden the story.

## Disposition

**PASS.**

A3 is ready for a RED-first implementation branch only after these readiness artifacts are committed to the accepted Epic A integration branch. The A3 branch must then be created from that new readiness-doc commit.
