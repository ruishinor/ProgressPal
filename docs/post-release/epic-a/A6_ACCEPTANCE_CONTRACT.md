# A6 Acceptance Contract — Badges actual-route read boundary

Date: 2026-09-21
Status: **frozen for RED**
Source baseline: post-A5 closure `25ed38da54cf719c151165506c2a3391ae8eb88f`
Source tree: `7b7e381920289515625de8d024dc6d6a0728c2f6`
Story state: `ready_for_red`

This contract governs A6 only. It does not authorize production edits until valid RED is proved.

## 1. Production paths under contract

Classic runtime path:

`/achievements` → `AppShell` → `AchievementsPage` → shared `AchievementsSurface(variant="classic")`.

RPG runtime path:

`/rpg/badges` → `RpgRouteShell` → `RpgShell` → `RpgBadgesPage` → shared `AchievementsSurface(variant="rpg")`.

The shared `AchievementsSurface` is the A6 child read owner. The RPG shell separately owns the accepted A4 HUD read.

The exported `loadRpgBadgeGallerySummary()` is not the runtime owner and cannot serve as the sole RED target.

## 2. Scope

A6 may change only what is necessary to establish the shared Achievements/Badges read boundary and remove hidden complete XP source materialization.

In scope:

- shared Achievements child read;
- code-definition + persisted-unlock projection;
- lifetime XP/level read;
- coherent child transaction ownership;
- classic/RPG shared-surface semantics;
- load/error/retry behavior;
- access/scale/coherence/passive-write tests;
- deliberate narrowing/removal of the unused broad RPG Badge loader/export/tests if still unused.

Out of scope:

- A7 aggregate integration;
- achievement rule changes;
- XP/reward rule changes;
- creation/evaluation timing changes;
- UI redesign or new badge mechanics;
- changes to artwork meaning or reward semantics;
- schema/database-version migration;
- cloud/auth/programme abstraction;
- A1–A5 rewrites without a proved regression;
- push, remote merge or deployment.

## 3. Frozen A4 shell contract on `/rpg/badges`

The RPG route remains an ordinary A4 child route.

The shell may perform exactly one accepted HUD read with the frozen A4 contract:

- one readonly HUD transaction;
- allowed stores exactly `learner_profile`, `course_units`, `course_items`, `progress_entries`, `content_assets`, `content_slices`, `media_progress_events`, `resume_points`, `xp_transactions`;
- `achievement_unlocks` and `achievement_definitions` are not HUD-owned stores;
- accepted normal HUD logical-query budget remains ≤10;
- A4 XP/source-history materialization remains 0;
- passive HUD writes remain 0.

A6 must not replace this with a Hub/Hero read or add a second HUD read.

The A4 HUD transaction remains separate from the A6 child transaction.

## 4. Code-definition authority

`achievementDefinitions` in `src/lib/achievements/definitions.ts` remains the product-definition authority.

For `D = achievementDefinitions.length`:

- visible achievements: exactly `D`;
- persisted `achievement_definitions` display reads: **0**;
- persisted definition rows must not override code title, description, category, rules or copy;
- unknown persisted unlocks must not create visible definitions.

A6 does not redesign achievement definitions or move them into persistence.

## 5. Shared child initial-read contract

Persisted child stores allowed:

- `achievement_unlocks`;
- `xp_transactions`.

Every other persisted store is forbidden to the A6 child read.

Target:

- exactly one A6 child readonly transaction across the two allowed stores;
- unlock logical queries: ≤1;
- XP logical queries: exactly 1;
- total child logical queries: ≤2;
- passive writes: 0.

The child result must represent one coherent IndexedDB snapshot for persisted unlock state and lifetime XP summary.

## 6. Unlock access/materialization contract

Only persisted unlocks that can affect current code-defined achievements are needed.

For `D = achievementDefinitions.length`:

- match/query by current code-definition IDs using the existing `achievementId` index or an equivalent single logical operation;
- returned/materialized unlock source rows: ≤`D`;
- duplicate unlocks per achievement remain prevented by the existing unique index;
- all matched unlocks must be validated with `AchievementUnlockSchema`;
- sort/display semantics remain unchanged after projection;
- no achievement evaluation is performed.

A full scan/materialization of unrelated unknown unlock IDs is not required product work and should not be introduced as the target design.

## 7. XP lifetime aggregation contract

Let `H_xp` be the number of valid `xp_transactions` rows.

Under the frozen schema:

- source XP rows scanned: exactly `H_xp` is allowed and expected for exact lifetime total;
- source XP rows bulk-materialized as a complete array: **0**;
- hidden complete XP arrays retained: **0**;
- retained source XP rows after aggregation: **0**;
- derived accumulator state: O(1);
- logical XP query/cursor count: **1**;
- passive writes: 0.

Every scanned row must preserve existing stored-schema validation before contributing XP.

The final XP summary must be produced by the existing `calculateXpSummary(totalXp)` semantics.

This is O(`H_xp`) scanning. Do not describe it as constant-time, bounded-history or O(1) data access.

## 8. RPG route composition

Route evidence must distinguish:

1. the accepted A4 HUD transaction; and
2. the A6 child transaction.

A6 does not require the child to consume shell HUD state. Therefore two route-level XP scans may remain on `/rpg/badges`: the accepted A4 HUD scan and the A6 child lifetime scan.

That duplicate source scanning must be visible in route evidence, but it is not equivalent to hidden bulk materialization and is not by itself an A6 failure.

The child may not trigger a Hub/Hero read or a second HUD read.

## 9. Shared semantic invariants

Across classic and RPG variants:

- the same code-defined achievement set is used;
- each definition appears once;
- locked/unlocked truth derives only from matching persisted unlock state;
- `totalCount = D`;
- `unlockedCount` equals the number of code definitions with matching persisted unlocks;
- category filter options remain derived from present code-defined categories;
- filtering remains status then category;
- visible list ordering remains category then title;
- description/requirement copy remains code-defined;
- unlock date formatting remains `unlockedAt.slice(0, 10)`;
- no XP value is newly displayed on achievement cards;
- no passive read evaluates or writes achievements.

Variant-specific labels remain:

- classic unlocked: `Unlocked`;
- RPG unlocked: `Earned`;
- locked: `Locked`.

RPG artwork remains presentation-only and never creates a reward.

## 10. XP semantic invariants

For any valid transaction fixture:

- `totalXp` equals the exact sum of all transaction `xp` values;
- `level`, `currentLevelFloorXp`, `nextLevelXp`, `xpToNextLevel` remain the existing `calculateXpSummary` values;
- ordering of XP rows is irrelevant to the total;
- duplicate/award prevention semantics remain owned by mutation paths and are not changed by A6.

Semantic tests must derive expected summaries from the XP engine rather than reimplementing its formula in the test.

## 11. Failure/retry contract

If the A6 child read fails:

- the existing achievements error state is shown;
- no partial child result is presented as ready;
- `Try again` performs one new child read;
- retry performs zero writes;
- retry does not evaluate achievements or create unlocks;
- a successful retry produces the normal semantic view.

On `/rpg/badges`, A4 HUD failure/retry remains independent from A6 child failure/retry.

A6 must not turn child retry into `useAppState().refresh()` or otherwise broaden it into a full-app read/mutation path.

## 12. Scale contract

Use valid fixtures at minimum:

- `H_xp = 1,000`;
- `H_xp = 10,000`;
- fixed code-definition cardinality;
- representative locked and unlocked states.

For both scales:

- A6 child transaction count remains 1;
- child logical query count remains ≤2;
- XP logical query count remains 1;
- XP rows scanned = `H_xp`;
- XP source rows bulk-materialized = 0;
- unlock rows returned/materialized remain ≤`D`;
- visible achievement rows remain `D`;
- writes observed = 0;
- child read duration is recorded.

Fixture construction and UI rendering duration must be separated from the measured child read where performance evidence is claimed.

## 13. RED acceptance

A6 RED is valid only if all of the following hold:

- the exact post-A5 readiness baseline is used;
- the actual shared surface path is invoked;
- DBCore access instrumentation is installed before the measured reader opens;
- fixture setup uses an uninstrumented writer or otherwise lies outside the measured read window;
- the page reaches the expected semantic state;
- the baseline measured A6 child XP read reports hidden source materialization >0 because of current `toArray()`;
- the failure is not caused by fixture/schema/instrumentation error.

Primary RED role: **actual-route access/materialization mechanism**.

Separate tests may establish child transaction coherence and RPG/classic composition. Do not make an unused exported loader the primary RED.

Production edits are prohibited until this RED is executed and classified valid.

## 14. Unused broad Badge loader

`loadRpgBadgeGallerySummary()` currently depends on the broad snapshot helper but is not used by the real Badge/Achievements route.

A6 may remove or narrow it if exact source still proves it unused.

Acceptance is not satisfied merely by removing this symbol. The actual shared `AchievementsSurface` child read must satisfy Sections 4–13.

## 15. Schema and mutation freeze

A6 keeps database schema version/stores/indexes unchanged.

A6 must not change:

- XP award rules or transaction identity;
- achievement definitions/rules;
- unlock uniqueness or trigger semantics;
- coordinated write transaction composition except where a separately reproduced regression requires it;
- backup/export format.

Mutation-side use of XP summaries must preserve exact outputs. A6 access optimization must not change save results.

## 16. Required regression evidence before acceptance

At minimum:

- actual `/rpg/badges` access/materialization GREEN;
- classic `/achievements` shared-surface semantic GREEN;
- one-child-transaction coherence GREEN;
- 1k/10k XP scale GREEN;
- locked/unlocked + level semantic equivalence;
- failure/retry read-only behavior;
- architecture test proving code definitions remain DB-independent and passive surface has no write/evaluation API;
- A1–A5 focused regressions;
- full unit/integration + E2E + circular/audit gates;
- fresh exact-commit `npm run verify:release` with correctly byte-bound A6 review evidence.

## 17. Explicit non-goals

A6 is not the place to:

- persist an XP aggregate;
- migrate schema;
- paginate achievement definitions;
- redesign Badges/Achievements UI;
- add achievement rewards;
- merge classic and RPG shells;
- redesign the HUD;
- start A7.

## 18. Stop conditions

Stop and reassess if:

- exact runtime ownership differs from this contract;
- valid RED cannot observe current hidden XP materialization;
- schema migration appears necessary;
- coherent child read cannot be established without changing mutation semantics;
- a support-tool recurrence reaches owner execution without a strengthened control;
- published baseline or local integration lineage changes unexpectedly.

No push, remote merge or deployment is authorized by A6.
