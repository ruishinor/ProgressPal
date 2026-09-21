# Next-story handoff — A4 RED

Story: **A4 — Hub, Hero and persistent HUD read boundaries**

Status: **readiness PASS; create RED-first story branch only after readiness docs are committed**

## Required starting state

Create the A4 story branch only from the documentation-only A4 readiness commit whose parent is:

`bb603331a0aca3edb01b6cfc03e126e75f3041a0`

Accepted A3 implementation ancestor:

`7363ec6d70a89e48373d8be81673b94793598cd8`

Do not branch A4 from `master`, the A3 story branch or pre-closure A3 commits.

## Story branch

Use:

`postrelease/a4-hub-hero-hud-read-boundaries`

Do not push it unless explicitly authorized.

## First implementation step: RED only

Before changing production code, add the A4 acceptance harness and prove the current production mechanism fails.

The RED harness must cover both dimensions of A4:

1. **data-access mechanism** — Hub/Hero/HUD still use broad snapshot access;
2. **route composition** — the same A4 state is redundantly read in Hub/Hero/post-save compositions.

A loader-only RED is incomplete.

## Actual current mechanisms to target

### Shell

`RpgShell` always starts `loadRpgHubSummary()` in its HUD effect.

Direct `/rpg/hero` still starts that read even though Hero hides the HUD.

### Hub

`RpgHomePage` independently starts another `loadRpgHubSummary()`.

Direct `/rpg` therefore performs two A4 Hub reads.

### Hero

`RpgHeroPage` starts `loadRpgHeroProfileSummary()`, which still reads a full snapshot and internally builds a full Hub summary before projecting Hero fields.

### Resource save

After the explicit A3 mutation:

- `refreshHud()` starts one shell Hub read;
- `loadRpgHubSummary()` starts another A4 read;
- `loadRpgStudyResourceSummary()` is a separate accepted A3 read.

### Focus save

After the explicit session mutation:

- `refreshHud()` starts one shell Hub read;
- `loadRpgHubSummary()` starts another A4 read.

Focus's visible session ledger itself remains A5.

## RED harness structure

Recommended separation:

### A. Loader access boundary tests

Use the calibrated DBCore probe against actual production loaders.

Prove untouched baseline Hub/Hero fail because they:

- declare all 14 stores;
- touch forbidden stores;
- materialize media/session/XP histories.

The future HUD contract may be exercised through the shell production path or a new loader only after implementation. For RED, the shell's actual Hub call is sufficient mechanism evidence.

### B. Route-composition tests

Exercise actual `RpgShell` + page components.

Prove untouched baseline:

- direct Hub calls `loadRpgHubSummary()` twice;
- direct Hero calls shell Hub + Hero;
- post-save Resource/Focus request both `refreshHud()` and a direct Hub refresh.

Invocation instrumentation is acceptable for duplication evidence. Do not replace loader/store evidence with mocks alone.

### C. Scale fixture discipline

Seed large history before installing DBCore instrumentation.

Do not include probe overhead in fixture writes.

Do not run explicit mutation transactions through the read probe.

## Future GREEN contracts

### HUD

Store family max 9; query max 10.

No `study_sessions`, unlocks, definitions, app metadata or backups.

### Hub

Store family max 10; query max 11.

One lifetime session cursor and one lifetime XP cursor; at most one additional indexed XP reward query.

### Hero

Store family max 11; query max 11.

No reward lookup, weekly fields, recommendation or persisted achievement definitions.

## Route composition GREEN

Required:

```text
direct /rpg
  -> one A4 Hub read total

direct /rpg/hero
  -> one A4 Hero read total

direct other RPG child
  -> one A4 HUD read
  -> plus child-owned read(s)

Resource/Focus successful save refresh
  -> one A4 refresh read per attempt
```

Implementation mechanism is open. Do not optimize by moving DB access into route components.

## Semantics that must not drift

Preserve:

- learner fallback/name/avatar;
- rank labels;
- long-form inferred started/completed status;
- recommendation ordering;
- blocked/actionable behavior;
- course progress;
- XP level calculations;
- Hub local-Monday weekly attribution;
- recent activity top five with timestamp-desc / ID-asc tie-break;
- Hero badge earned/total counts;
- passive error/retry behavior;
- post-save commit/result semantics.

Do not add achievement unlocks to recent activity.

## O(H) scans that remain allowed

Under frozen schema:

- course-wide media streaming for exact long-form status;
- session lifetime streaming for Hub/Hero totals/recent/weekly;
- XP lifetime streaming for XP totals/recent/weekly.

These are **scan-unbounded** and must be measured.

Source history arrays remain prohibited.

## Required scale evidence

At 1k and 10k history sizes, include all three relevant append-only histories:

- media events;
- study sessions;
- XP transactions.

Record:

- queries;
- rows scanned;
- source rows materialized;
- retained recent/top-K size;
- derived aggregate peak;
- read duration.

Use deliberate test timeouts. Fixture construction time is not the read metric.

## Regression protection

A4 GREEN must keep green:

- A1 `mapReadBoundary.test.ts`;
- A2 `moduleReadBoundary.test.ts`;
- A3 `resourceReadBoundary.test.ts`;
- `readModels.test.ts`;
- `readModels.calendar.test.ts`;
- `saveOutcomes.test.tsx`;
- shell route tests;
- App route/product-flow tests;
- repository/access-probe/architecture tests.

## Frozen scope reminders

Do not change:

- schema/index/migrations;
- UI design/copy/navigation;
- XP or achievement rules;
- backup/storage format;
- Focus visible ledger/A5 boundary;
- Badges page/A6 boundary;
- service worker/cloud/auth.

## Stop rules

Stop and reassess before GREEN implementation if RED shows any of these:

- actual current route composition differs materially from the readiness assessment;
- Hero cannot preserve course/rank semantics without a store not listed in its contract;
- one-read-per-trigger sharing would require changing visible lifecycle behavior;
- a schema/index migration appears necessary;
- accepted A1–A3 boundaries need to be rewritten;
- instrumentation itself causes fixture or mutation failures.

A4 cannot claim GREEN until both access and composition dimensions pass.
