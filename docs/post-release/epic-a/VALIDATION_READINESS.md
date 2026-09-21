# Epic A validation readiness

Result: **PASS — A6 readiness is complete; story is ready for RED only**

Latest accepted story: **A5 — Focus actual-route read boundary**
Next active story: **A6 — Badges actual-route read boundary**
A6 state: `ready_for_red`
Updated: 2026-09-21

## Exact baseline

- integration branch: `postrelease/01-read-architecture`
- post-A5 closure HEAD: `25ed38da54cf719c151165506c2a3391ae8eb88f`
- post-A5 closure tree: `7b7e381920289515625de8d024dc6d6a0728c2f6`
- accepted A5 implementation: `0b03c334f91d9946ddbb9577a5daa9ee0ed16b4b`
- accepted A5 tree: `23cec04b2e92cb110d2c9ce7a40be24f026382a1`
- published `master`: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- published tree: `d4124b4576acf7e6f6ba7ed52f0249b0e9a78a34`
- A6 readiness-context ZIP SHA-256: `4E37F60821000F769CE92BB1216C9237EC5C7CFF85E545F63A9B50D34839A010`
- code/config/test archive SHA-256: `D122D6E0270BD80AC5E6547645A8BD1AD25E65C21C56A7219306446D757D1023`
- Node: `v24.19.0`
- npm: `11.10.1`

No A6 branch or production edit existed at readiness export.

## Source/readiness result

Actual shared runtime owner:

`AchievementsSurface`.

Classic:

`/achievements` → `AchievementsPage` → `AchievementsSurface(classic)`.

RPG:

`/rpg/badges` → `RpgShell` + accepted A4 HUD → `RpgBadgesPage` → `AchievementsSurface(rpg)`.

The child currently runs `getAchievementsView()` and `getXpSummary()` independently.

`getAchievementsView()` uses code-only achievement definitions plus persisted unlocks. It does not read persisted `achievement_definitions`, evaluate rules or create unlocks.

`getXpSummary()` currently bulk-materializes the complete `xp_transactions` history with `toArray()` before reducing it to total XP/level. That hidden source array is the primary A6 RED mechanism.

`loadRpgBadgeGallerySummary()` remains a broad snapshot-based exported helper but is not the actual route owner. It cannot be the sole RED target.

## A6 frozen target

Shared child read:

- stores exactly `achievement_unlocks`, `xp_transactions`;
- one readonly child transaction;
- ≤1 unlock query and exactly one XP scan/query; ≤2 total;
- zero persisted `achievement_definitions` reads;
- unlock source materialization limited to rows affecting current code definitions;
- XP scan remains O(`H_xp`);
- hidden XP source materialization: 0;
- passive writes: 0.

RPG shell A4 HUD remains separate and unchanged.

## Schema decision

A6 remains schema-frozen.

No new index or persisted XP aggregate is needed. Exact lifetime XP can be streamed through the existing store with O(`H_xp`) scan and O(1) derived accumulator.

## RED requirements

Valid RED must:

- invoke the actual shared surface, preferably through `/rpg/badges` for route composition evidence;
- use schema-valid fixtures and an uninstrumented writer;
- install the DBCore probe before the measured reader opens;
- distinguish A4 HUD work from A6 child work;
- observe current hidden XP source materialization on the child;
- preserve successful surface rendering;
- fail for the intended materialization mechanism, not fixture/instrumentation error.

Separate tests should cover coherence, semantics, 1k/10k scale, failure/retry, passive writes and classic/RPG shared behavior.

## Exporter control recurrence

The readiness exporter used native `git archive`, but `.gitattributes` excludes `docs/**`. Its claim of a "complete tracked repository" was therefore inaccurate.

Classification: `RECURRENCE — support-tool scope/assertion`.

No rerun is needed for A6 readiness because exact runtime/source/config/tests are present and governance is separately bound to the accepted A5 closure package. Future exporters must mechanically verify archive scope or state export-ignore exclusions explicitly.

## Authorization state

This PASS authorizes:

- integration of A6 readiness governance only;
- local A6 branch creation from the exact readiness commit;
- RED-only harness/test work.

It does **not** authorize:

- GREEN production implementation before valid RED;
- A7;
- schema migration;
- push;
- remote merge;
- deployment.
