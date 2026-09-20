# Next-story handoff — A2 implementation

Next story: **A2 — Module read boundary**

Readiness: **PASS**

A2 implementation may begin only after this readiness package is committed documentation-only on the current Epic A integration lineage.

## Branch base

The integration commit assessed for readiness was:

- `postrelease/01-read-architecture`
- `8a50541c2ad34211c3974714659d016a6e534825`

Commit this readiness package on top of that lineage first. Then create:

`postrelease/a2-module-read-boundary`

from the resulting readiness-documentation commit.

Do not branch from `master`, A0, `ec651536...`, or directly from `8a50541...` after the readiness documentation has been committed.

## First A2 phase — RED harness only

Do not edit production code first.

Reuse the accepted A1 access probe and calibration tests. Add Module-specific tests that invoke the actual `loadRpgModuleSummary()` production loader.

The untouched baseline must fail the A2 access contract because the Module loader still uses the generic 14-store snapshot. The failure must be mechanism evidence from the probe, not a symbol/regex ban.

At minimum, the RED result must observe:

- unrelated store access;
- broad transaction scope;
- complete append-only history materialization through the snapshot path;
- zero production changes before the RED proof.

Preserve A1 Map tests as regression guards.

## Second A2 phase — GREEN Module reader

Only after the RED harness is valid and fails for the intended architecture reason, add a dedicated Module read-data path.

Preferred structure:

```text
loadRpgModuleSummary(unitId)
  -> getModuleReadData(unitId)
       -> one coherent readonly Dexie transaction
       -> keyed unit read
       -> indexed/bulk module-item dependency reads
       -> scoped media cursor aggregation
       -> scoped XP reward-key lookup
  -> Module-specific pure adapter/builder
```

Prefer an explicit `ModuleReadData` contract. Do not fabricate a full `DatabaseSnapshot` with unrelated empty arrays merely to satisfy the legacy builder signature.

## Scope controls

A2 may touch only what is necessary for the Module read boundary and its tests/instrumentation reuse.

Do not change:

- persistent shell/Hub behavior — A4;
- Resource loader — A3;
- Focus/Badges/Hero paths;
- database schema/indexes/migrations;
- reward amounts or achievement rules;
- UI/copy/navigation;
- backup/storage format;
- cloud/auth/service-worker architecture.

## Required evidence before A2 acceptance

- RED access evidence on untouched Module baseline;
- probe calibration still green;
- normal and missing-unit semantic equivalence;
- long-form and reward-label equivalence;
- zero passive writes;
- actual-loader transaction-coherence barrier test;
- 1×/10× module item/asset cardinality with constant query count;
- explicit scanned/materialized rows for append-only stores;
- preserved A1 access-contract tests;
- complete focused and repository validation;
- exact-candidate Node24/npm11 `verify:release` evidence.

## Stop conditions

Stop before production changes if:

- integration lineage changed without reconciliation;
- `origin/master` changed without reconciliation;
- worktree is dirty;
- Node24/npm11 validation is unavailable;
- `src/lib/db/database.ts` changed;
- A1 probe calibration fails;
- Module no longer matches the broad-snapshot premise;
- RED failure is caused by fixture/harness/runtime defects rather than observed access.

Stop before A3. A2 must be accepted, closed and integrated first.
