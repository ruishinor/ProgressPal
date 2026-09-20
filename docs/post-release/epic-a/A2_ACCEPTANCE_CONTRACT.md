# A2 acceptance contract — Module read boundary

Story: **A2 — Module read boundary**

Status: **readiness PASS; implementation not yet accepted**

This contract supplements the governing Epic A `SPEC.md`. If there is a conflict, `SPEC.md` governs.

## Objective

Replace only the Module broad-snapshot access with a unit-scoped coherent read contract while preserving the published `RpgModuleSummary` values, reward labels, long-form progress, missing-unit behavior, error propagation, and passive-read semantics.

## Production surface in scope

Primary production path:

```text
RpgModulePage
  -> loadRpgModuleSummary(unitId)
  -> current broad snapshot path
```

A2 may add a dedicated repository read model/helper and a Module-specific read-data adapter.

A2 must not narrow the persistent shell/Hub loader; that remains A4.

## Required store contract

The currently justified Module logical-read store family is:

1. `course_units`
2. `course_items`
3. `progress_entries`
4. `content_assets`
5. `content_slices`
6. `media_progress_events`
7. `resume_points`
8. `xp_transactions`

No other store is presently justified.

If implementation discovers a genuine dependency on another store, stop and update the contract with evidence before adding that store.

## Expected scoped access shape

The preferred query shape is one logical query/cursor per required store:

| Store                   | Intended scope                                     | Query-count target | Materialization rule                                |
| ----------------------- | -------------------------------------------------- | -----------------: | --------------------------------------------------- |
| `course_units`          | `get(unitId)`                                      |                  1 | at most one unit                                    |
| `course_items`          | indexed `unitId == requestedUnit`                  |                  1 | module items only                                   |
| `progress_entries`      | bulk/indexed requested item IDs                    |                  1 | module-item progress only                           |
| `content_assets`        | bulk/indexed requested item IDs                    |                  1 | assets for module items only                        |
| `content_slices`        | bulk/indexed requested item/asset IDs              |                  1 | slices for relevant assets/items only               |
| `media_progress_events` | indexed cursor over requested item/asset IDs       |             0 or 1 | source rows must not be retained as a history array |
| `resume_points`         | bulk/indexed requested item/asset IDs              |             0 or 1 | relevant resume rows only                           |
| `xp_transactions`       | indexed cursor/query over finite reward source IDs |             0 or 1 | retain only exact earned reward keys, not XP rows   |

A missing unit should return `null` without querying unrelated stores. The implementation must still preserve a coherent logical read and must not return a hybrid view.

## Query-count budget

For a normal existing module, target:

```text
course_units           <= 1
course_items           <= 1
progress_entries       <= 1
content_assets         <= 1
content_slices         <= 1
media_progress_events  <= 1
resume_points          <= 1
xp_transactions        <= 1
--------------------------------
total                  <= 8
```

The count must stay constant when the module grows from 1× to 10× items/assets.

A2 must not implement:

- one `getProgress()` call per item;
- one `listContentAssets(itemId)` call per item;
- one `listContentSlices(assetId)` call per asset;
- one media-event query per item/asset;
- one XP lookup per quest/reward.

Those are N+1 patterns even if launched in `Promise.all`.

## History rules

### `media_progress_events`

A scoped cursor scan is allowed when needed to reconstruct long-form state. Evidence must report rows scanned and retained derived aggregate peak.

The loader must not materialize a complete source-row array or row-equivalent per-event projection.

### `xp_transactions`

Reward labels should use the existing `sourceId` index and a finite reward-source set derived from the requested unit/items.

Retained state must be bounded to exact earned reward keys. Because `sourceId` is non-unique, matching duplicate rows may still require O(matching rows) cursor visits; evidence must describe this honestly rather than call the scan globally constant.

### `study_sessions`

Module output does not depend on study sessions. Module must perform zero `study_sessions` reads.

## Reward semantics

A2 must preserve `buildQuestRewardLabel()` behavior exactly.

For ordinary weeks, week-completion preview depends on all required items and progress **inside the requested unit**, not the whole course.

For final-project README/video shared reward behavior, preserve the existing pure preview semantics exactly. Do not introduce new persistence dependencies to “improve” the rule.

No reward amount, award source, achievement behavior or mutation rule may change in A2.

## Long-form semantics

A2 must preserve:

- item long-form progress values;
- event count;
- coverage/completion state;
- last event end position behavior;
- resume-point behavior;
- content slice ordering;
- interaction with saved `progress_entries`.

The candidate may reuse A1's aggregate-based long-form helpers. It must not reintroduce full media-event arrays to feed the legacy builder.

## Transaction coherence

The actual production `loadRpgModuleSummary()` path must execute as one coherent readonly logical transaction over its declared Module stores, or an evidenced minimal Dexie-required superset.

Acceptance must include a barrier test that pauses a real production-loader operation, races a committed writer from another connection, and proves the loader cannot return a mixed pre/post-write view.

A hand-written synthetic transaction is not acceptable evidence.

## Passive-read rule

Calling the Module loader must perform zero writes.

At least one semantic fixture must compare complete database state before/after a normal Module load. Scale/access tests do not need to duplicate expensive full-snapshot oracles when doing so would contaminate the measurement.

## Required RED evidence

Before production changes, on the accepted A1/integration baseline:

- run the actual `loadRpgModuleSummary()`;
- observe its access through the existing A1 DBCore probe;
- prove unrelated-store access from the 14-store snapshot;
- prove forbidden append-only history materialization from the broad snapshot;
- record transaction ID/mode/store scope;
- do not use symbol/regex-only assertions.

The RED test must fail for the intended architecture reason, not because of invalid fixture data, timeout contamination, or harness error.

## Required GREEN evidence

A2 acceptance requires all of the following:

- normal Module semantic equivalence against the published pure builder;
- missing-unit `null` equivalence;
- reward labels for ordinary week rewards and final-project shared rewards;
- long-form state equivalence;
- zero passive writes;
- one coherent production-loader transaction;
- no unrelated stores;
- no complete append-only history arrays;
- 1×/10× item/asset cardinality with constant query count;
- append-only rows returned/scanned/materialized reported for all histories touched;
- preserved A1 Map access-contract tests;
- focused repository/read-model/architecture tests;
- complete repository validation;
- authoritative Node24/npm11 release evidence bound to the exact A2 candidate SHA/tree.

## Frozen scope

A2 must not change:

- `src/lib/db/database.ts` or migrations/index definitions;
- backup/export/import/reset format or behavior;
- XP award amounts/sources;
- achievement definitions/unlock rules;
- UI layout/copy/navigation;
- service worker/cache behavior;
- cloud/auth/database-provider architecture;
- A3+ production paths except shared helper refactors that are strictly behavior-preserving and demonstrably necessary for A2.
