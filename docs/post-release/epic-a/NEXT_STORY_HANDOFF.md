# Next-story handoff — A6 RED gate

Next story: **A6 — Badges actual-route read boundary**
Status: **readiness PASS; ready_for_red only**
Readiness source baseline: `25ed38da54cf719c151165506c2a3391ae8eb88f`
Accepted A5 implementation: `0b03c334f91d9946ddbb9577a5daa9ee0ed16b4b`

Do not write A6 production code until the baseline RED below has been executed and classified as valid.

## Governing runtime path

Classic:

```text
/achievements
└─ AchievementsPage
   └─ AchievementsSurface(classic)
```

RPG:

```text
/rpg/badges
└─ RpgRouteShell
   └─ RpgShell
      ├─ accepted A4 HUD read
      └─ RpgBadgesPage
         └─ AchievementsSurface(rpg)
```

The shared surface currently calls in parallel:

- `getAchievementsView()` → persisted `achievement_unlocks` + code definitions;
- `getXpSummary()` → complete `xp_transactions.toArray()` → total XP/level.

The exported `loadRpgBadgeGallerySummary()` is not the runtime owner.

## Primary RED

Create the A6 story branch only after the readiness documentation commit is integrated.

Suggested branch:

`postrelease/a6-badges-read-boundary`

The first production-facing evidence is RED-only.

Primary test role: **actual-route access/materialization mechanism**.

Required baseline observation:

- actual `/rpg/badges` renders the expected achievement surface;
- accepted A4 HUD transaction is identifiable separately;
- A6 child XP read scans `H_xp` rows;
- baseline child XP source materialization = `H_xp` because current `toArray()` is used;
- writes observed = 0;
- future assertion requires XP source materialization = 0.

If that failure is not observed, do not implement GREEN.

## Separate RED/evidence roles

Do not overload one test with every claim.

Use separate tests for:

- child transaction coherence: baseline unlock and XP reads are separate; target one two-store readonly child transaction;
- semantics: code definitions, locked/unlocked projection, counts, labels, unlock dates, XP level;
- scale: 1k/10k XP rows, constant child query count, O(H) scan, hidden materialization 0 target;
- failure/retry: `Try again` repeats child read only and writes zero rows;
- passive-write: initial/retry/filter interactions never evaluate achievements;
- shared composition: classic and RPG variants use the same child data semantics;
- unused broad loader: prove non-runtime status before removing/narrowing it.

## Fixture/instrumentation procedure

1. Start from the exact A6 readiness commit.
2. Use an uninstrumented writer for fixtures.
3. Validate every synthetic XP row with `XpTransactionSchema` and unlock row with `AchievementUnlockSchema` before insertion.
4. Keep code definitions from the real `achievementDefinitions` module.
5. Close/separate the fixture writer before measurement where needed.
6. Install the DBCore probe before the measured database reader opens.
7. Render the actual route/shared surface; do not mock repository access for the primary RED.
8. Keep broad `getDatabaseSnapshot()` or fixture verification outside the measured access window.
9. Record transactions, stores, queries, scanned rows, source materialization, visible rows, writes and read duration.
10. Treat the A4 HUD and A6 child as distinct owners in RPG route evidence.

## Target GREEN contract after valid RED

- code definitions remain authoritative and DB-independent;
- child persisted stores exactly `achievement_unlocks` + `xp_transactions`;
- one readonly child transaction;
- ≤2 child logical queries;
- zero persisted definition reads;
- matched unlock source rows ≤ definition count;
- exact XP total scans all XP rows once but bulk-materializes none;
- O(1) XP derived accumulator;
- existing `calculateXpSummary` semantics;
- zero passive writes;
- classic/RPG labels, filters, dates and artwork behavior unchanged;
- A4 HUD unchanged;
- schema/indexes unchanged.

## Stop conditions

Stop before GREEN if:

- the primary RED targets only the unused broad loader;
- route ownership differs from the frozen contract;
- instrumentation/setup contaminates evidence;
- a new schema/index appears necessary;
- a proposed change alters achievement rules, XP rules or unlock creation timing;
- A4 HUD behavior would need redesign;
- the support-tool recurrence class repeats without strengthened mechanical control.

Do not start A7.
Do not push, remotely merge or deploy.
