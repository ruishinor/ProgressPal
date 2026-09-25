# A6 Readiness Assessment — Badges actual-route read boundary

Date: 2026-09-21
Disposition: **PASS — ready_for_red only**
Implementation authorization: **NO**
A7 authorization: **NO**

## 1. Evidence identity and authority

This assessment uses the exact post-A5 source export and the accepted A5 closure governance as its evidence base.

Exact source identity:

- integration branch: `postrelease/01-read-architecture`
- post-A5 closure HEAD: `25ed38da54cf719c151165506c2a3391ae8eb88f`
- post-A5 closure tree: `7b7e381920289515625de8d024dc6d6a0728c2f6`
- accepted A5 implementation: `0b03c334f91d9946ddbb9577a5daa9ee0ed16b4b`
- accepted A5 implementation tree: `23cec04b2e92cb110d2c9ce7a40be24f026382a1`
- published `master`: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- published tree: `d4124b4576acf7e6f6ba7ed52f0249b0e9a78a34`
- A6 readiness-context ZIP SHA-256: `4E37F60821000F769CE92BB1216C9237EC5C7CFF85E545F63A9B50D34839A010`
- exact code/config/test `git archive` SHA-256: `D122D6E0270BD80AC5E6547645A8BD1AD25E65C21C56A7219306446D757D1023`
- accepted A5 closure package SHA-256: `5A17B681E72F37A4D1C35EBBED75B051C720AB40BC803619F8962D355EF757ED`
- Node: `v24.19.0`
- npm: `11.10.1`
- A6 branch at export time: absent locally and remotely

### Export-scope correction

The readiness exporter described its nested `git archive` as the "complete tracked repository." That description is inaccurate because the repository `.gitattributes` marks `docs/**` and other internal material `export-ignore`; native `git archive` therefore omitted those tracked paths.

Classification: **RECURRENCE — support-tool scope/assertion defect**.

This does **not** invalidate A6 source readiness because:

- the exact code, configuration, tests, schema and runtime paths required for A6 are present in the archive bound to `25ed38da54cf719c151165506c2a3391ae8eb88f`;
- the accepted A5 closure governance was separately available from the exact A5 closure package, whose SHA-256 is recorded above;
- no production/source conclusion below depends on an omitted `docs/**` file.

Future readiness exporters that claim a complete tracked repository must either export every tracked path by a mechanism that ignores `export-ignore`, or label a `git archive` honestly as a distributable/export-filtered archive and package governance separately.

## 2. Readiness verdict

A6 is ready for a RED-only phase.

The actual shared achievement surface, the RPG shell composition, the hidden XP-history materialization mechanism, existing schema support and failure/retry behavior are sufficiently clear to freeze a falsifiable contract without changing production.

The primary A6 defect is narrow and measurable:

`getXpSummary()` calls `calculateStoredXpSummary()`, which bulk-materializes the complete `xp_transactions` source history with `toArray()` before reducing it to total XP and level. The achievements surface only retains the derived XP level, so the complete source array is hidden intermediate data rather than visible product data.

A secondary architecture issue is that the shared surface launches `getAchievementsView()` and `getXpSummary()` independently with `Promise.all()`. They therefore do not form one explicit coherent Achievements child read even though persisted XP and achievement unlocks can be changed atomically by the existing coordinated save paths.

Both mechanisms can be tested without schema migration.

## 3. Actual runtime composition

### Classic achievements

```text
/achievements
└─ AppShell
   └─ AchievementsPage
      └─ AchievementsSurface(variant="classic")
         └─ Promise.all
            ├─ getAchievementsView()
            │  └─ listAchievementUnlocks()
            │     └─ achievement_unlocks.toArray()
            └─ getXpSummary()
               └─ xp_transactions.toArray()
```

### RPG awards/badges

```text
/rpg/badges
└─ RpgRouteShell
   └─ RpgShell
      ├─ accepted A4 HUD read
      │  └─ loadRpgHudSummary() / getRpgHudReadData()
      └─ RpgBadgesPage
         └─ AchievementsSurface(variant="rpg")
            └─ same shared child read as classic
```

`RpgShell` treats `/rpg/badges` as an ordinary RPG child route, so it performs one accepted A4 HUD read. A6 does not transfer Badge/Achievement ownership into the shell.

## 4. Current child-read behavior

### Achievement definitions

Display definitions are code-only `achievementDefinitions`. The exact source contains 16 current definitions.

The actual shared surface does **not** read persisted `achievement_definitions` for display.

This is intentional architecture: code definitions are authoritative product definitions; persisted `achievement_unlocks` are learner state.

### Persisted unlocks

`getAchievementsView()` reads all `achievement_unlocks` with `toArray()`, parses/sorts them, maps by `achievementId`, and projects the code definitions into locked/unlocked display rows.

No achievement rules are evaluated and no unlocks are created by this read.

The schema already provides a unique `achievementId` index, so A6 can limit the display read to unlocks whose IDs correspond to current code definitions without migration if implementation chooses that route.

### XP lifetime summary

`getXpSummary()` reads every `xp_transactions` row with `toArray()`, parses the complete array, reduces it to total XP, then calls the existing `calculateXpSummary(totalXp)` formula.

The current indexes are:

- primary `id`;
- `sourceType`;
- `sourceId`;
- `awardedAt`.

There is no persisted total-XP aggregate. Under the frozen schema, exact lifetime XP therefore remains O(`H_xp`) source scanning. A6 may remove hidden source-array materialization, but must **not** claim constant-time lifetime aggregation.

## 5. Accepted A4 shell composition to preserve

On `/rpg/badges`, A4 owns one separate HUD read:

- one readonly HUD transaction;
- accepted nine-store HUD contract;
- normal logical-query budget ≤10;
- HUD streams XP history rather than bulk-materializing it;
- HUD does not own `achievement_unlocks`;
- passive HUD reads perform zero writes.

A6 must measure shell and child work separately.

The RPG route currently scans XP once for the accepted A4 HUD and once for the child-level display. A6 does not require collapsing those two semantically distinct read owners. Any attempt to share HUD state into the shared classic/RPG surface would be a separate composition decision unless independently justified.

## 6. A6 target child contract

The shared achievements surface needs only:

- code-only achievement definitions;
- persisted unlock state for those definitions;
- exact lifetime XP summary/level.

Frozen target:

- persisted child stores: exactly `achievement_unlocks`, `xp_transactions`;
- persisted `achievement_definitions` reads: **0**;
- one explicit readonly child transaction over the two allowed stores;
- logical queries: ≤1 for unlocks, exactly 1 XP-history cursor/query; ≤2 total child queries;
- passive writes: 0;
- code definitions are never reconstructed from persisted definition rows.

For `D = achievementDefinitions.length` and `H_xp = xp_transactions` rows:

- visible achievement rows retained: exactly `D`;
- matched unlock rows retained/materialized: ≤`D` and only insofar as they affect those visible definitions;
- XP source rows scanned: `H_xp` is allowed and expected;
- XP source rows bulk-materialized as a hidden complete array: **0**;
- hidden complete XP array retained after aggregation: **0**;
- lifetime XP derived state: O(1) accumulator plus the final `XpSummary`;
- XP logical query count: 1.

## 7. Semantic invariants

A6 must preserve the current shared product behavior:

- every code-defined achievement appears once;
- `totalCount` equals the code-definition count;
- `unlockedCount` reflects matching persisted unlocks;
- an unknown persisted unlock must not create a new visible achievement definition;
- titles, descriptions, categories, requirement copy and category options remain code-defined;
- achievement filtering and category/title ordering remain unchanged;
- classic status labels remain `Unlocked` / `Locked`;
- RPG status labels remain `Earned` / `Locked`;
- unlock date display remains the existing stable `YYYY-MM-DD` projection;
- XP level remains the existing `calculateXpSummary(totalXp)` result;
- achievement `xpReward`/rules are unchanged;
- passive page loads and retries never evaluate rules or create unlocks.

Expected semantic values must come from `achievementDefinitions`, existing model helpers and the XP engine, not duplicated invented literals.

## 8. Failure and retry behavior

The shared surface currently owns a single loading/error state for its child read.

A6 must preserve:

- initial child failure renders the existing achievements error state;
- `Try again` repeats the child read only;
- retry performs zero writes and does not evaluate achievements;
- successful retry restores the same semantic view;
- classic and RPG variants retain the same shared data/failure path;
- on RPG, HUD failure/retry remains a separate A4 failure domain from the Achievements child read.

A6 must not turn a read retry into a mutation or a full AppState reload.

## 9. Unused broad RPG Badge loader

`loadRpgBadgeGallerySummary()` remains exported and tested, but exact runtime routing does not call it for `/rpg/badges`.

It currently builds from the broad snapshot path and may be narrowed or removed if its non-runtime status remains proved.

It **cannot** establish A6 RED by itself. A candidate that only deletes/narrows this unused helper while the shared surface still bulk-materializes `xp_transactions` is not GREEN.

## 10. Schema decision

**No schema/index migration is required or authorized.**

Reasons:

- exact total XP can be accumulated during one cursor/stream scan using the existing store;
- `achievement_unlocks` already has unique `achievementId` indexing;
- code definitions require no persisted definition lookup;
- A6 does not need persisted aggregate state.

If implementation later appears to require a schema change, A6 stops for a separate data-contract decision rather than expanding scope.

## 11. RED design

Valid RED must invoke the actual shared surface/runtime path and fail for the intended access mechanism while the page otherwise renders correctly.

Primary access RED on `/rpg/badges`:

- use a real test database and already-ready AppState boundary;
- install the existing DBCore access probe before the measured reader opens;
- seed with an uninstrumented writer;
- render actual `RpgRouteShell` → `RpgShell` → `RpgBadgesPage` → `AchievementsSurface`;
- identify the separate accepted A4 HUD transaction and the Achievements child operations;
- prove the baseline child XP operation bulk-materializes all `H_xp` source rows;
- assert future hidden XP source materialization = 0.

Separate coherence RED:

- prove current child unlock and XP reads occur in separate child transactions;
- future target is one readonly child transaction over `achievement_unlocks` and `xp_transactions`.

The materialization RED is the primary production authorization mechanism. Coherence is a separate evidence role.

## 12. Scale and test taxonomy

Required scale fixtures:

- fixed achievement definitions/unlocks;
- `H_xp = 1,000`;
- `H_xp = 10,000`.

Record separately:

- fixture construction duration;
- child read duration;
- XP rows scanned;
- XP source rows materialized;
- matched unlock rows returned/materialized;
- visible achievement rows;
- child transaction count;
- child logical query count;
- writes observed.

No constant-time claim is permitted.

Tests should have one primary role each:

1. actual-route access mechanism;
2. child transaction coherence;
3. semantic equivalence across locked/unlocked and XP levels;
4. scale/fan-out at 1k/10k XP history;
5. failure/retry propagation;
6. passive-write verification;
7. classic/RPG shared-surface composition;
8. unused broad-loader non-runtime proof/removal where relevant.

## 13. Stop conditions

Stop before production implementation if:

- RED does not invoke the actual shared surface;
- baseline materialization evidence is not observed on the measured reader;
- setup writes contaminate the read probe;
- code definitions are accidentally replaced with persisted definitions;
- achievement evaluation/unlock creation occurs during passive read;
- a schema/index migration appears necessary;
- A4 HUD composition would need to be broken;
- the only failing target is the unused broad RPG Badge loader;
- the registered support-tool failure class recurs without a strengthened control.

## 14. Authorization

This PASS authorizes only:

1. documentation-only readiness integration;
2. creation of the local A6 story branch from the exact readiness commit;
3. RED-only A6 harness/tests;
4. execution and classification of RED evidence.

It does not authorize GREEN production edits until RED is valid.

It does not authorize A7, push, remote merge or deployment.
