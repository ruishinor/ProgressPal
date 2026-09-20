# Next-story handoff — A1 only

Next story: **A1 — Map read boundary + access measurement harness**

Do not begin A2 from this handoff.

## Objective

On a fresh A1 story branch from the current accepted Epic A integration commit, build test-only mechanism instrumentation and replace only the Campaign Map broad-snapshot read with a narrow coherent Map read contract. The Epic A integration branch must itself descend from the real accepted `master`; production behavior remains measured against that product baseline.

This story establishes the pattern later stories will copy. It must prove the new architecture test fails on the untouched published path before production implementation makes it pass.

## Required fresh context

Load only:

1. repository `AGENTS.md`;
2. `SPEC.md` from A0;
3. A1 entry from `stories.yaml`;
4. actual current:
   - `package.json`, `package-lock.json`, `.nvmrc`, `.github/workflows/test.yml`;
   - `src/lib/db/database.ts`;
   - `src/lib/db/repositories.ts` and `src/lib/db/index.ts`;
   - `src/features/rpg/model/readModels.ts` and `questRewards.ts`;
   - `src/features/progress/model.ts` / `src/lib/progress/engine.ts` as required by Map semantics;
   - `src/features/rpg/routes/RpgMapPage.tsx` and `src/features/rpg/shell/RpgShell.tsx` for actual composition awareness;
   - `tests/features/rpg/readModels.test.ts`;
   - `tests/architecture/rpgFeature.test.ts` and relevant DB test utilities.

Do **not** load the rejected Phase 1 patch as a starting point. Inspect it only if a specific implementation question requires forensic comparison after the baseline design is understood.

## Pre-code readiness gate

Before creating the A1 story branch or editing:

```text
prove current accepted master HEAD/tree (product baseline)
prove current Epic A integration HEAD descends from that master and contains only accepted Epic A/A0 changes
prove clean worktree
prove Node24/npm11 authoritative validation path is actually invocable
confirm current schema/read paths still match A0 assumptions
```

If authoritative validation cannot be invoked locally or through the defined CI path, A1 state becomes `blocked` and no production code should be written.

## Branch recommendation — only after the gate above passes

Create `postrelease/a1-map-read-boundary` **from the current accepted `postrelease/01-read-architecture` integration commit**, not directly from `master`. This keeps the A0 SPEC/story ledger available on the story branch while preserving `master` as the product baseline.

Do not branch from the rejected candidate or its synthetic commit. Do not implement A1 directly on `master`.

## A1 red evidence before implementation

Create/validate a test access probe capable of recording:

- store + operation;
- rows returned/materialized;
- rows scanned/cursor visits;
- query count;
- transaction ID/mode/table scope;
- writes.

Calibrate the probe first with small known fixtures for keyed reads, indexed/full `toArray`, cursor scans and deliberate N+1 queries. The probe must fail if production code bypasses the observed repository/Dexie access path.

On the untouched accepted baseline, demonstrate a failing Map contract that observes at least:

- access to an unrelated store such as `backups` or `study_sessions`;
- full `media_progress_events` materialization;
- all-14-store transaction scope.

The failure must arise from observed data access, not from finding the string `getDatabaseSnapshot`.

## A1 target contract

Map output may read the whole course catalogue/progress/long-form state because Map represents the whole course. It may read only XP records required to establish existing reward state. It may not read profile, app metadata, sessions, achievement definitions/unlocks, or backups.

Requirements:

- one coherent Map read transaction over its declared stores;
- constant query count per required store;
- no per-item/per-asset N+1 loop;
- no hidden complete append-only row arrays;
- exact published Map values/statuses/reward labels/long-form summaries;
- no writes;
- schema/index definitions untouched.

Run the A0 1,000/10,000 all-three-history fixtures even though Map should not touch sessions; that is deliberate proof that unrelated history does not leak into Map work.

## Required A1 evidence before `done`

- exact base/candidate HEAD/tree + clean state;
- red published-baseline access test;
- green candidate access log at 1× and 10× history;
- green 1×/10× catalogue query-count check;
- value-equivalence and non-mutation tests;
- transaction coherence/barrier evidence;
- formatter/lint/typecheck/focused tests/build/architecture checks under Node24/npm11;
- independent adversarial check against SPEC bypasses.

No patch/package for owner application is part of A0. A1 should produce its own candidate only after its evidence is green.
