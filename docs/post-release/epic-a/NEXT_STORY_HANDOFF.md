# Next-story handoff — A3 implementation

Next story: **A3 — Resource read boundary**

Status: **ready for RED-first implementation after A3 readiness docs are integrated**

Do not start A4.

## Branch lineage

A3 must branch from the new documentation-only A3 readiness commit created on `postrelease/01-read-architecture`, whose parent must be the accepted A2 closure commit:

- A2 implementation: `e329950bbcce0bae2faa42496f532af13deb7322`
- A2 closure: `d64c135ed41ffda5530516ffa9bad125abd2f82e`

Do not branch directly from `master`, A1, A2 readiness, A2 implementation, or the A2 story branch.

Suggested story branch:

```text
postrelease/a3-resource-read-boundary
```

## First implementation phase: RED harness only

Do not edit production code first.

Add the smallest A3 access-boundary harness that:

1. recalibrates/reuses the accepted A1/A2 DBCore probe;
2. seeds a valid Resource fixture with relevant media and XP history;
3. resets measurement before the operation under test;
4. invokes the real `loadRpgStudyResourceSummary(itemId)`;
5. asserts the future A3 store/query/materialization contract;
6. fails on the untouched accepted A2 baseline for the broad-snapshot mechanism;
7. prints structured A3 Resource access evidence;
8. does not use source regex or `getDatabaseSnapshot()` inside the measured operation.

Keep semantic/full-snapshot oracles outside the measured scale operation.

Expected baseline RED mechanism:

```text
Resource loader
  -> readSnapshot()
  -> getDatabaseSnapshot()
  -> broad 14-store transaction
  -> unrelated stores + hidden media/XP materialization
```

The RED state should remain uncommitted until its evidence is reviewed.

## Preferred GREEN shape

A likely design is:

```text
loadRpgStudyResourceSummary(itemId)
  -> getResourceReadData(itemId)
     -> one coherent readonly Dexie transaction
     -> selected item get
     -> selected unit get
     -> one unit-items bulk query
     -> one unit-progress bulk query
     -> selected-item assets/slices/resume bulk queries
     -> selected-item media cursor aggregation
     -> selected-preview XP reward-key lookup
  -> Resource-specific pure adapter/builder
```

Use an explicit `ResourceReadData`; do not emulate the broad `DatabaseSnapshot` with placeholders.

## Resource-specific warning: detailed reward label

A3 Resource reward lookup differs from A2 Module.

Resource uses `buildQuestRewardLabel(..., true)`, so the finite reward source set must include `week_completed` when completion preview produces it. A2's Module reward-source helper intentionally excluded week-completion sources and therefore must not be copied unchanged.

Also preserve the final README/video shared reward.

## Resource-specific content scope

Reward preview needs the selected unit's items/progress, but long-form content does not.

Do not load content assets, content slices, media history or resume points for every sibling item merely because unit-wide reward context is required. Those content/history reads should remain selected-item scoped.

## Post-save composition

The actual page's post-save refresh is:

```text
refreshHud()                         # A4 shell/HUD
Promise.all([
  loadRpgStudyResourceSummary(id),  # A3
  loadRpgHubSummary(),              # A4
])
```

A3 must preserve the Resource side and existing save-outcome behavior without modifying or claiming ownership over A4 Hub/HUD reads.

Required consistency proof should connect:

```text
saveRpgStudyResourceProgress() mutation result
  -> committed database state
  -> narrow Resource readback
```

A failed refresh must not repeat or undo the committed mutation.

## Query budget

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
total                  <= 9
```

Missing item: one `course_items.get(itemId)` and return `null`.

## Measurement requirements

Record at least:

- transaction identity/mode/table scope;
- query count by store;
- rows returned;
- rows scanned;
- source rows materialized;
- derived media aggregate peak;
- writes observed.

Do not claim media runtime/memory is constant: exact coverage may scan O(H_selected_item), and disjoint merged-range state can grow with history.

## Local environment

Do not silently remove `.kilo/worktrees/nova-carnation`.

Until it is deliberately resolved, use fresh isolated clones for repository-wide lint/full validation. Focused story tests may run in the primary tree when they do not invoke the contaminated repo-wide ESLint discovery path.

## Stop rules

Stop before GREEN implementation if:

- A3 RED does not fail for the expected broad-read mechanism;
- probe calibration fails;
- current actual Resource composition differs materially from the readiness contract;
- schema/index change appears necessary;
- preserving detailed reward/long-form/post-save semantics would require changing frozen behavior;
- `origin/master` or accepted Epic A lineage changes and has not been reconciled.

Do not begin A4 until A3 is accepted, closed and integrated.
