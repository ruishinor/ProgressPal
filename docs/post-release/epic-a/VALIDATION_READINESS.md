# Epic A validation readiness

Result: **PASS — A5 accepted; A6 is eligible for fresh readiness only**

Latest accepted story: **A5 — Focus actual-route read boundary**
Next active story: **A6 — Badges actual-route read boundary**
A6 state: `ready_for_readiness`
Updated: 2026-09-21

## Environment

Authoritative repository validation remains Node `v24.19.0` and npm `11.10.1`.

The nested registered worktree `.kilo/worktrees/nova-carnation` remains a known primary-tree repository-wide lint hazard. Do not weaken lint/configuration to compensate. Use clean isolated clones for authoritative whole-repository validation.

## Accepted A5 exact candidate

- implementation commit: `0b03c334f91d9946ddbb9577a5daa9ee0ed16b4b`
- implementation tree: `23cec04b2e92cb110d2c9ce7a40be24f026382a1`
- valid RED parent: `99ae07e031144ed2a9d29d5c1055040349f3f4d3`
- pre-A5 integration HEAD: `4e7a5f4821940c527d51e760c891b6558d25d8c9`
- validated GREEN ZIP SHA-256: `8D4EF226E39A507CB6BE1C2D3B8199842D3F4440A918AB4AD1318FC907A4F6B9`
- closure-source ZIP SHA-256: `E65CDA8004F8E6704B905809CBDFCEF23B1406DC08AA84B2D47BBDBC96EE1761`
- full unit/integration: `659/659`
- full E2E: `74/74`
- audit: `0 vulnerabilities`
- exact-commit release evidence: `artifacts/release-evidence/2026-09-21T19-02-53-138Z-rpg-primary-final-candidate-pass-1.json`
- release status: `passed`
- release commands: `21`
- release warnings/retries/skips: `0 / 0 / 0`
- A5 release-review SHA-256: `28894F15492F2A279E42A53005EE831A07C0FCDA5BF99C74055718AE11478019`
- A5 review byte binding: PASS
- published `master` remains `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- published tree remains `d4124b4576acf7e6f6ba7ed52f0249b0e9a78a34`
- production deployment remains `dpl_H2GkappEu6QPT9w6WYZDw57LdBrr`

The closure gate computes the corrected release-evidence file SHA-256 at runtime because that hash was not printed by the corrected native release run. No static hash is inferred.

## Frozen A5 behavior

On `/rpg/focus`:

- `RpgShell` performs the accepted A4 HUD read without `study_sessions`;
- `StudySessionsSurface` owns the child catalogue and complete visible session ledger;
- initial child access is one readonly transaction across `course_units`, `course_items`, `study_sessions`;
- initial child query count is three total and at most one per store;
- selected item context comes from the coherent catalogue without an additional item query;
- the complete visible ledger remains allowed O(`H_sessions`) product data;
- hidden complete study-session source materialization is zero;
- post-save ledger refresh is one readonly `study_sessions` cursor read with zero source materialization;
- post-save catalogue rereads are zero;
- Focus requests exactly one accepted A4 HUD refresh after a successful save;
- save/XP/achievement/discard/draft/failure semantics remain unchanged;
- schema and indexes remain unchanged.

## A6 exact-source readiness question

A6 is **not** ready for RED or implementation yet. Fresh readiness must start from the exact clean post-A5 integration/closure state and re-prove actual route ownership.

The exact A5 implementation source currently shows this route composition:

`/rpg/badges` → `RpgBadgesPage` → shared `AchievementsSurface`.

The shared surface currently performs, in parallel:

- `getAchievementsView()` — merges code-only achievement definitions with persisted `achievement_unlocks` and performs no rule evaluation or writes;
- `getXpSummary()` — currently reaches `xp_transactions.toArray()` before calculating lifetime XP/level.

That is evidence for what A6 readiness must inspect, not a frozen A6 acceptance contract. A6 readiness must determine:

- exact shell/HUD + child read composition for both RPG and classic use of the shared surface;
- whether achievement definitions are read from persistence anywhere in the actual display path;
- exact unlock-store read shape and visible semantics;
- exact XP-history scan/materialization behavior at 1k/10k;
- whether a narrow lifetime XP projection can preserve level semantics without schema/index migration;
- error/retry/loading behavior shared by classic and RPG routes;
- whether any broad exported Badge loader is unused and can be narrowed/removed;
- the regression set required to protect achievement unlock semantics and A1–A5 boundaries.

## A6 authorization state

After A5 closure is committed, A6 may proceed to **readiness assessment only**.

Do not yet:

- create an A6 RED or GREEN implementation candidate;
- change production code;
- alter schema/indexes;
- change achievement definitions/rules/rewards;
- redesign the shared achievements UI;
- push, remotely merge or deploy.

A6 readiness must freeze its own acceptance contract before any RED-only story branch work.
