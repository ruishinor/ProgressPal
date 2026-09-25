# Epic A — A2 closure record

Date: 2026-09-21

Story: **A2 — Module read boundary**

Disposition: **ACCEPTED for Epic A integration**

## Accepted candidate identity

- story branch: `postrelease/a2-module-read-boundary`
- commit: `e329950bbcce0bae2faa42496f532af13deb7322`
- tree: `f321357a8f3b087fddc0e25540920d5b3d9c6dc9`
- parent / A2 readiness commit: `31e611dd934ac2456864949bc3e1e6a7f7748189`
- accepted A1 ancestor: `ec651536e61a7e5d939506069887df32b81b5c0f`
- product baseline ancestor: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- authoritative toolchain: Node `v24.19.0`, npm `11.10.1`

The accepted implementation commit must not be amended during closure. This record is a documentation-only integration artifact to be committed after the Epic A integration branch is fast-forwarded to the exact validated A2 commit.

## Accepted scope

A2 replaces only the RPG Module broad-snapshot logical read with a unit-scoped coherent read contract and adds the Module-specific acceptance harness. The exact committed A2 delta contains four files:

- `src/features/rpg/model/readModels.ts`
- `src/lib/db/index.ts`
- `src/lib/db/repositories.ts`
- `tests/features/rpg/moduleReadBoundary.test.ts`

Committed delta: 1,089 insertions, 1 deletion.

`src/lib/db/database.ts` is unchanged. A2 does not change schema/index definitions, migrations, backup/storage format, UI/copy/navigation, reward amounts, achievement rules, service worker, cloud, authentication, persistent shell/Hub behavior, Resource, Focus, Badges, or Hero boundaries.

## Evidence

### Baseline RED

Before production code was changed, the calibrated A1 DBCore access probe was reused against the actual `loadRpgModuleSummary()` production loader. The untouched Module path failed the A2 contract through observed mechanism evidence: one broad readonly transaction spanned all 14 stores, unrelated stores were touched, and append-only media/XP histories were materialized through the generic snapshot path.

Owner-side RED evidence:

`C:\Users\alex_\AppData\Local\ProgressPal\evidence\A2-20260921-003110-RED-module.log`

At that point the story branch still had no production changes and only `tests/features/rpg/moduleReadBoundary.test.ts` was untracked.

### Harness correction and isolated validation

The first GREEN acceptance attempt exposed two harness defects rather than production defects:

1. a test asserted the internal aggregate field `lastEventEndSecond` as though it were part of the published Module output, even though the complete published-value equivalence oracle already passed;
2. a reward-label semantic test unnecessarily installed the access probe and mixed instrumentation with fixture writes, producing a Dexie `PrematureCommitError`.

The corrected harness removed the invalid internal-field assertion, separated reward semantics from DBCore instrumentation, and added representative published-value equivalence for early course, Week 4, and final-project units.

A fresh isolated clone then passed:

- 13/13 A2 Module boundary tests;
- 74/74 A1/repository focused regression tests;
- ESLint;
- repository Prettier check;
- TypeScript typecheck;
- production build;
- bundle budget;
- circular-dependency check.

The corrected Module evidence demonstrated:

- one readonly transaction over exactly eight stores: `content_assets`, `content_slices`, `course_items`, `course_units`, `media_progress_events`, `progress_entries`, `resume_points`, `xp_transactions`;
- one logical query/cursor operation per required store for a normal Module load;
- a keyed requested-unit read and unit-scoped item query;
- zero passive writes;
- zero source-row materialization for `media_progress_events` and `xp_transactions`;
- constant eight-query fan-out at 1× and 10× module catalogue cardinality;
- missing-unit behavior that returns the published `null` result after only the unit lookup;
- actual-loader transaction coherence against a competing media writer;
- reward-label and long-form semantics preserved.

### Full isolated pre-commit validation

The validated candidate ZIP was:

- file: `ProgressPal_A2_GREEN_VALIDATED_harness2_20260921-012836.zip`
- SHA-256: `C2BD020E7A60B96386C902C5D05D6E4C1316310A39F4AA52DBD523E0A4247751`

Before the candidate was committed, a fresh isolated clone passed the complete pre-commit gate:

- ESLint;
- repository Prettier check;
- TypeScript typecheck;
- production build;
- bundle budget;
- 61/61 unit/integration test files;
- 626/626 unit/integration tests;
- 74/74 E2E tests;
- circular-dependency check;
- npm audit with 0 vulnerabilities;
- `git diff --check`.

Pre-commit transcript SHA-256:

`C339D8CEAC642FDA8DEB57664AB5D43FA6CB4099198B2877F16139EE03D9F494`

Pre-commit summary SHA-256:

`2D53B880D0529036304F9804D10C26F036C32E34EF3AD2789B15B9F984058129`

### Real-branch focused gate and implementation commit

The exact validated ZIP was applied to the real A2 story branch after exact baseline/hash checks. Before commit, the real branch passed the six-file focused regression gate:

- 6/6 test files;
- 87/87 tests;
- A2 Module boundary 13/13;
- A1 Map boundary 8/8;
- read-model, repository, probe-calibration and architecture tests all green.

The implementation was then committed once as:

`e329950bbcce0bae2faa42496f532af13deb7322`

The working tree was clean immediately after commit.

### Authoritative exact-commit validation

A fresh clone of the exact local implementation commit passed `npm run verify:release` under Node 24/npm 11.10.1.

Release evidence:

- file: `artifacts/release-evidence/2026-09-21T00-09-17-766Z-rpg-primary-final-candidate-pass-1.json`
- evidence SHA-256: `E5264824309E8B10282FA1F06C25F9C31A7B152DC8641E95312541FA70D84533`
- evidence commit: `e329950bbcce0bae2faa42496f532af13deb7322`
- evidence tree: `f321357a8f3b087fddc0e25540920d5b3d9c6dc9`
- unit/integration: 626/626
- E2E: 74/74
- audit: 0 vulnerabilities

Authoritative release transcript SHA-256:

`7BC5346227720803EA838AEEEE137AE2DD50F837F2BEF66F1EEBDC4FA44FF9DA`

The real A2 working tree was clean after the authoritative gate. No push or merge had occurred when this closure record was prepared.

## A2 acceptance findings

A2 satisfies its story contract as follows:

- **Requested unit/item scope:** PASS. The logical Module loader no longer uses the generic all-store snapshot and scopes catalogue work to the requested unit/items.
- **No per-item/per-asset N+1 fan-out:** PASS. Query count remains eight at 1× and 10× catalogue cardinality.
- **Append-only source-row materialization:** PASS for the A2 contract. Media and XP histories are cursor-scanned when needed but their source rows are not bulk-materialized into hidden arrays.
- **Rows scanned are explicit:** PASS. The probe reports actual visited rows, including history-dependent scanning.
- **Published semantics:** PASS. Normal, missing-unit, malformed/missing-looking ID, early/mid/final-project, reward-label, long-form and passive-read behavior are covered.
- **Transaction coherence:** PASS. The actual production Module loader holds one coherent readonly transaction across the declared eight-store scope during a competing writer test.
- **Zero passive writes:** PASS.
- **A1 preservation:** PASS. Map boundary and shared read-model/repository/probe/architecture regressions remain green.
- **Frozen schema:** PASS. `src/lib/db/database.ts` did not change.
- **Authoritative validation:** PASS on the exact A2 commit/tree under Node 24/npm 11.10.1.

## Explicit residual characteristics

These are accepted A2 characteristics, not claims of constant-time work:

1. `media_progress_events` may still require O(`H_media_relevant`) cursor scanning under the frozen schema. The 10,000-row synthetic history case took roughly 30–45 seconds under fake-indexeddb across the validation runs. That is test/emulation cost, not an accepted production latency target.
2. Derived media coverage state can grow with genuinely disjoint ranges even though source history rows are not retained.
3. XP reward-state lookup uses the existing non-unique `sourceId` index. The retained exact reward-key set is bounded, but duplicate matching source IDs can require O(`H_matching`) cursor scanning.
4. A2 does not narrow Resource, persistent shell/Hub/Hero, Focus or Badges paths. Those remain A3–A6 scope.

Any future attempt to eliminate these history scans through new persisted aggregates, compaction, indexes or schema changes is outside A2 and remains subject to the A0 frozen-schema rules.

## Local tooling environment note

The primary working repository currently contains a registered nested Git worktree at:

`.kilo/worktrees/nova-carnation`

Repository-wide `eslint .` executed directly in that primary tree sees both TypeScript project roots and fails parser-root discovery. This is local tooling/worktree contamination rather than an A2 source failure: the exact A2 candidate passed ESLint repeatedly in fresh isolated clones, including the authoritative exact-commit release clone.

Do not silently delete or rewrite that worktree during story closure. Until it is deliberately resolved, future repository-wide authoritative validation should continue in clean isolated clones, while focused real-tree checks should avoid treating this known local lint contamination as product evidence.

## Retrospective

A2 exposed several process weaknesses and corrections:

- the first GREEN package was built from pre-Prettier A1 bytes and was correctly rejected by an exact baseline hash guard;
- the candidate was rebuilt from a Git-archived exact accepted base and subjected to a reverse-diff invariant so removing A2 additions reproduced accepted A1 bytes exactly;
- the first real-tree GREEN validation was blocked by the nested `.kilo` worktree, which led to moving candidate validation into isolated clones;
- the first isolated GREEN run exposed two invalid/contaminated test assertions, which were corrected before acceptance;
- the corrected candidate then passed focused, full isolated pre-commit, real-branch focused, and exact-commit authoritative gates.

The accepted lesson for later stories is to separate four concerns: exact-base reconstruction, harness validity, candidate validation in an uncontaminated environment, and final exact-commit authoritative evidence.

Rejected intermediate A2 packages and harnesses are forensic only and are not acceptance targets.

## Integration rule

A2 is accepted only through the exact validated implementation commit above. Integrate it into `postrelease/01-read-architecture` by fast-forwarding the integration branch from A2 readiness commit `31e611dd934ac2456864949bc3e1e6a7f7748189` to `e329950bbcce0bae2faa42496f532af13deb7322`. Then commit this closure documentation as a separate documentation-only commit.

Do not squash, amend, cherry-pick a rewritten equivalent, or otherwise change the validated A2 implementation bytes during closure.

A3 becomes eligible for a **fresh readiness assessment** only after that documentation-only closure commit is cleanly recorded on the Epic A integration branch.
