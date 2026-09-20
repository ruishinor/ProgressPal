# Next-story handoff — A2 readiness only

Next story: **A2 — Module read boundary**

Status: **eligible for fresh readiness assessment after A1 closure integration**

Do not begin A3 from this handoff. Do not modify A2 production code until the fresh A2 readiness gate passes.

## Accepted lineage entering A2

Product baseline remains:

- `master`: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- tree: `d4124b4576acf7e6f6ba7ed52f0249b0e9a78a34`

Accepted A1 implementation:

- commit: `ec651536e61a7e5d939506069887df32b81b5c0f`
- tree: `f401d82dc0d92fea9f3f18a7a1404eca8b3fa5a3`
- parent / accepted A0: `168ccfbca21dfbc5e66ec953a5dbdd42d47fa97d`

A2 must branch from the **current accepted `postrelease/01-read-architecture` HEAD after the A1 documentation-only closure commit**, not directly from `master` and not directly from the A1 story branch. The integration HEAD must descend from the exact A1 implementation commit above.

## Objective

Replace only the Module broad-snapshot read boundary with a unit-scoped coherent read contract. Reads must use bulk/indexed operations whose query count does not grow per item or per asset, while preserving the published Module values, long-form state, reward labels, missing-unit behavior, and passive-read semantics.

A2 must reuse the proven A1 measurement approach rather than inventing a second incompatible access probe.

## Required fresh context

Load only what is needed for A2:

1. repository `AGENTS.md`;
2. `docs/post-release/epic-a/SPEC.md`;
3. the updated A2 entry in `stories.yaml`;
4. `A1_CLOSURE_RECORD.md`;
5. actual current:
   - `package.json`, `package-lock.json`, `.nvmrc`, `.github/workflows/test.yml`;
   - `src/lib/db/database.ts`;
   - `src/lib/db/repositories.ts` and `src/lib/db/index.ts`;
   - `src/features/rpg/model/readModels.ts` and `questRewards.ts`;
   - progress/XP helpers actually used by the Module builder;
   - `src/features/rpg/routes/RpgModulePage.tsx`;
   - `src/features/rpg/shell/RpgShell.tsx` only for composition awareness;
   - A1 access-probe files and calibration tests;
   - existing Module/read-model tests and relevant repository tests.

Do not use the rejected pre-A1 Phase 1 candidate or the rejected intermediate A1 harnesses as implementation starting points.

## Fresh A2 pre-code readiness gate

Before creating the A2 story branch or editing production code, prove:

```text
origin/master still identifies the accepted product baseline, or any newer accepted master has been explicitly reconciled
current postrelease/01-read-architecture HEAD descends from accepted A1 commit ec651536...
A1_CLOSURE_RECORD.md and updated stories.yaml are present on that integration HEAD
worktree is clean
Node24/npm11 authoritative validation path remains invocable
src/lib/db/database.ts schema/index/version contract is unchanged
A1 access-probe calibration remains green
current Module production path still matches the A0/A2 assumptions
```

If any condition fails, stop before production code and classify A2 as blocked/reconciliation-required.

## Branch recommendation — only after readiness passes

Create:

`postrelease/a2-module-read-boundary`

from the then-current accepted `postrelease/01-read-architecture` integration HEAD.

Do not implement A2 directly on the integration branch or on `master`.

## A2 RED evidence before implementation

Reuse and calibrate the A1 access probe. On the untouched accepted A2 baseline, invoke the actual production Module loader/path and demonstrate a mechanism-level failure caused by the existing broad read. The RED result must come from observed store/query/materialization/transaction evidence, not from a symbol or regex ban.

At minimum, establish that the published Module logical read accesses stores/history beyond the requested unit's real dependency set and/or materializes forbidden append-only history through the broad snapshot path.

Preserve A1 tests as regression guards while adding Module-specific acceptance tests.

## A2 target contract

The Module logical read represents one requested unit. Its production read must therefore:

- scope catalogue work to the requested unit and its items rather than the whole course where indexes permit;
- use bulk/indexed operations rather than per-item/per-asset N+1 queries;
- preserve long-form progress and reward-label semantics for every item shown by the Module output;
- avoid hidden complete `media_progress_events`, `study_sessions`, or `xp_transactions` source-row arrays;
- report any necessary O(`H`) cursor scan honestly under the A0 definitions;
- execute the logical Module view in one coherent readonly transaction over the exact required stores or an evidenced minimal Dexie-required superset;
- perform zero passive writes;
- leave `src/lib/db/database.ts`, migrations, backup format, XP/achievement rules, UI/copy/navigation, service worker, cloud, and auth untouched.

The likely domain-store family is similar to Map but unit-scoped. Do not freeze an exact A2 store allowlist from this handoff alone; derive and justify the minimal allowlist from the actual current Module output and source during the readiness/design step.

## Required A2 evidence

Before A2 can be accepted:

- corrected/calibrated probe evidence for the actual production Module loader;
- 1×/10× module-cardinality query-count evidence showing no per-item/per-asset fan-out;
- rows returned/materialized/scanned for every append-only store touched;
- semantic equivalence for normal and missing-unit behavior;
- passive before/after database equivalence;
- actual-loader transaction-coherence barrier test;
- preserved A1 access tests;
- focused repository/read-model/architecture tests;
- complete repository validation;
- authoritative Node24/npm11 release evidence bound to the exact A2 candidate SHA/tree.

## Stop rule

This handoff makes A2 eligible for readiness assessment only. It does not pre-approve an implementation design and does not authorize A3.

If A2 readiness passes, implement only A2. After A2 acceptance, close and integrate it before A3 begins.
