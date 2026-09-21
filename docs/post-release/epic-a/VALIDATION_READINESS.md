# Epic A validation readiness

Result: **PASS — A5 readiness is complete; story is ready for RED only**

Latest accepted story: **A4 — Hub, Hero and persistent HUD read boundaries**  
Next active story: **A5 — Focus actual-route read boundary**  
A5 state: `ready_for_red`  
Updated: 2026-09-21

## Environment

Authoritative repository validation remains Node `v24.19.0` and npm `11.10.1`.

The nested registered worktree `.kilo/worktrees/nova-carnation` remains a known primary-tree repository-wide lint hazard. Do not weaken lint/configuration to compensate. Use clean isolated clones for authoritative whole-repository validation.

## Accepted A4 exact candidate

- implementation commit: `1bcd1e20374d230cf7425aec91f96ad5c960a3b1`
- implementation tree: `a9c25fd7af7020dbb78402d1c699b8800a20b7b7`
- current documentation-only A4 closure/integration HEAD: `4a87e68a7fe043ac394a9a6694cf95058288d055`
- published `master` remains: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- published tree remains: `d4124b4576acf7e6f6ba7ed52f0249b0e9a78a34`
- production deployment remains: `dpl_H2GkappEu6QPT9w6WYZDw57LdBrr`
- no A5 branch existed in the readiness export
- no A5 production code had been modified
- no Epic A push/remote merge/deployment is authorized by this readiness result

## Frozen A4 behavior relevant to A5

On `/rpg/focus`:

- `RpgShell` treats Focus as a child route and performs one narrow HUD read;
- HUD uses one accepted readonly transaction across nine stores and normal budget ≤10 queries;
- HUD does **not** read `study_sessions`;
- Focus post-save uses one shared A4 HUD refresh;
- A4 source-history materialization rules remain unchanged.

A5 must preserve these properties.

## A5 exact-source readiness result

A5 source inspection is complete and passes readiness.

Actual Focus route ownership is:

`RpgShell` → `RpgFocusPage` → shared `StudySessionsSurface`.

`StudySessionsSurface` owns:

- complete selectable unit/item catalogue;
- complete visible saved-session ledger;
- selected `itemId` prefill/lock behavior;
- manual/live save;
- post-save ledger refresh;
- ledger retry and discard behavior.

`RpgFocusPage` owns save-result progression/next-quest feedback through the accepted A4 `refreshHud()`.

The exported `loadRpgFocusSessionSummary()` is not invoked by the actual Focus route. It remains a broad-snapshot helper/export and may be narrowed/removed during A5, but it cannot establish RED by itself.

## A5 defect/mechanism to prove RED

Current actual Focus child initial load calls:

- `listCourseUnits()`;
- `listCourseItems()`;
- `listStudySessions()`;
- optional `getCourseItem(itemId)`.

`listStudySessions()` currently uses `studySessions.toArray()`, after which repository parsing/sorting and `buildSessionLedgerRows()` create additional complete-array representations before the complete visible ledger rows are retained.

The complete visible ledger is allowed O(`H_sessions`) product data. The hidden bulk-materialized complete `StudySession[]` is not.

Valid RED must therefore observe the actual route successfully render the complete ledger while the measured reader reports complete `study_sessions` source materialization. Fixture/setup writes must be excluded from the read probe.

## A5 target read contract

### Initial child read

- allowed child stores: `course_units`, `course_items`, `study_sessions`;
- one coherent readonly child transaction;
- ≤1 query per allowed store, ≤3 child queries total;
- selected `itemId` resolved from the coherent catalogue with no fourth query;
- O(`H_sessions`) scan allowed;
- visible ledger rows = `H_sessions`;
- hidden source session rows materialized = 0;
- passive writes = 0.

### Post-save ledger refresh

- one readonly `study_sessions` query;
- O(`H_sessions`) scan allowed;
- source materialization = 0;
- complete visible ledger retained;
- no catalogue reread in the normal refresh path;
- no writes.

### Post-save A4 composition

- exactly one A4 HUD refresh;
- no Hub read;
- no second HUD refresh;
- committed save survives ledger/HUD refresh failure;
- retries are reads only.

## Schema decision

Readiness finds **no need for schema/index migration**.

The ledger intentionally contains every session. Existing schema can support a full scan and deterministic ordering of retained visible rows. If implementation later appears to require a new index/schema version, A5 must stop for a separate decision.

## Harness readiness

RED is trustworthy only if:

- every synthetic session validates against the real `StudySessionSchema`;
- bundled seed values provide catalogue/product expectations;
- fixture setup uses an uninstrumented writer;
- measured reader is separate;
- DBCore probe is installed before the measured reader opens;
- actual Focus component/repository composition is invoked;
- tests declare one primary role;
- semantic/mutation setup is not contaminated by read instrumentation;
- 1k/10k scale evidence separates fixture construction, focused read duration and UI-render cost;
- baseline failure is the intended access/coherence mechanism.

## Authorization state

This PASS means only:

**A5 readiness documentation may be integrated and A5 may proceed to RED-only harness/test work.**

It does not authorize:

- production implementation;
- GREEN candidate generation;
- A6;
- schema migration;
- push, remote merge or deployment.
