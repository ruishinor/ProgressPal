# Next-story handoff — A3 readiness only

Next story: **A3 — Resource read boundary**

Status: **eligible for fresh readiness assessment after A2 closure integration**

Do not modify A3 production code from this handoff. Do not create the A3 story branch until the fresh A3 readiness gate passes.

## Accepted lineage entering A3

Product baseline remains:

- `master`: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- tree: `d4124b4576acf7e6f6ba7ed52f0249b0e9a78a34`

Accepted A2 implementation:

- commit: `e329950bbcce0bae2faa42496f532af13deb7322`
- tree: `f321357a8f3b087fddc0e25540920d5b3d9c6dc9`
- parent / A2 readiness commit: `31e611dd934ac2456864949bc3e1e6a7f7748189`

A3 must branch from the **current accepted `postrelease/01-read-architecture` HEAD after the A2 documentation-only closure commit**, not directly from `master`, A1, the A2 readiness commit, or the A2 story branch. The integration HEAD must descend from the exact A2 implementation commit above.

## A3 objective

Replace only the Resource broad-snapshot logical read with an item/unit-scoped coherent read contract, preserving reward and long-form behavior and post-save reload semantics.

The A0 story ledger requires A3 to prove:

- selected item/unit/reward context only;
- no N+1 progress/slice/event/resume queries;
- no hidden full media/XP history arrays;
- value equivalence and mutation-summary consistency;
- access metrics at 1×/10× unit/content cardinality;
- reward/long-form fixtures and post-save assertions.

## Required fresh A3 context

Load only what is needed to establish the actual current Resource composition after A2:

1. repository `AGENTS.md`;
2. `docs/post-release/epic-a/SPEC.md`;
3. updated `stories.yaml`;
4. `A2_CLOSURE_RECORD.md`;
5. actual current:
   - `src/features/rpg/model/readModels.ts`;
   - Resource route/component and save/reload composition;
   - `src/lib/db/repositories.ts` and `src/lib/db/index.ts`;
   - `src/lib/db/database.ts` only to confirm frozen schema/index contract;
   - reward/progress/long-form helpers actually used by Resource;
   - A1/A2 access probe and calibration tests;
   - Resource/read-model/save-outcome/repository tests relevant to post-save consistency.

Do not reuse rejected intermediate A2 packages or infer the A3 contract from A2 alone.

## Fresh A3 pre-code readiness gate

Before creating an A3 story branch or editing production code, prove:

```text
origin/master still identifies the accepted product baseline, or any newer accepted master has been explicitly reconciled
current postrelease/01-read-architecture HEAD descends from exact accepted A2 commit e329950...
A2_CLOSURE_RECORD.md and updated stories.yaml are present on that integration HEAD
worktree is clean
Node24/npm11 authoritative validation remains invocable in a clean environment
src/lib/db/database.ts schema/index/version contract is unchanged
A1/A2 access-probe calibration remains green
current actual Resource production path still matches the A0/A3 broad-read premise
post-save Resource reload/composition is understood before the read contract is frozen
```

If any condition fails, stop before production code and classify A3 as blocked or reconciliation-required.

## Local tooling constraint entering A3

The primary working tree contains the registered nested worktree `.kilo/worktrees/nova-carnation`, which currently contaminates direct repo-wide ESLint root discovery.

A3 readiness must explicitly choose one of two safe paths:

- deliberately resolve/remove that worktree outside the story if it is genuinely stale; or
- preserve it and use clean isolated clones for repository-wide gates.

Do not silently delete it as part of A3 setup.

## A3 RED evidence before implementation

Reuse and calibrate the accepted access probe. Invoke the **actual Resource production path**, including the composition that is used after explicit save/reload. The untouched accepted A3 baseline must fail the proposed Resource access contract for an observed mechanism reason before production code is changed.

The RED proof must distinguish:

- logical Resource read access;
- any shell/Hub work that belongs to A4 rather than A3;
- explicit mutation work during save from passive reload/read work after the save;
- source-row scanning from materialization.

Do not use regex/symbol bans as the acceptance oracle.

## Scope controls

A3 must not change:

- persistent shell/Hub/Hero behavior — A4;
- Focus or Badges paths;
- database schema/indexes/migrations;
- backup/storage format;
- reward amounts or achievement rules;
- UI/copy/navigation;
- service worker, cloud or authentication architecture.

## Required A3 evidence before acceptance

At minimum:

- calibrated RED mechanism evidence from the actual Resource production path;
- 1×/10× unit/content-cardinality access metrics with no per-slice/event/resume N+1 growth;
- explicit rows returned/scanned/materialized for append-only histories;
- normal/missing-resource and long-form/reward semantic equivalence;
- zero passive writes;
- post-save mutation-summary/readback consistency;
- actual-loader transaction-coherence evidence where the Resource read spans multiple stores;
- preserved A1 Map and A2 Module boundary tests;
- focused repository/read-model/save-outcome/architecture tests;
- complete clean-environment repository validation;
- exact-candidate Node24/npm11 `verify:release` evidence.

## Stop rule

This handoff makes A3 eligible for **fresh readiness assessment only**. It does not pre-approve an A3 implementation design.

After A3 acceptance, close and integrate it before A4 begins.
