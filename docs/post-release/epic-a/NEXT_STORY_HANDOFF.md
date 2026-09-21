# Next-story handoff — A6 readiness only

Next story: **A6 — Badges actual-route read boundary**
Status: **eligible for fresh readiness only after A5 closure**
Accepted A5 implementation: `0b03c334f91d9946ddbb9577a5daa9ee0ed16b4b`
Accepted A5 tree: `23cec04b2e92cb110d2c9ce7a40be24f026382a1`

Do not create an A6 implementation or RED commit from this handoff alone. The first A6 action after the A5 documentation-only closure commit is an exact-source readiness assessment.

## Accepted A5 boundary to preserve

A5 is accepted with:

- one A4 HUD read on Focus with no `study_sessions` HUD ownership;
- one coherent three-store Focus child read;
- zero hidden full study-session source materialization;
- complete visible session ledger retained;
- one session-only post-save ledger refresh;
- one shared A4 post-save HUD refresh;
- unchanged save/XP/achievement/discard/failure semantics;
- unchanged schema/indexes.

A6 must not regress A1–A5 while changing the Achievements/Badges read path.

## Known current route composition to re-prove

The exact accepted A5 source currently shows:

```text
/rpg/badges
└─ RpgBadgesPage
   └─ shared AchievementsSurface(variant="rpg")
      └─ Promise.all
         ├─ getAchievementsView()
         │  └─ persisted achievement_unlocks + code-only definitions
         └─ getXpSummary()
            └─ current xp_transactions lifetime read
```

The same `AchievementsSurface` is also used by the classic achievements route. Its loading/error/retry semantics and read ownership are therefore shared product behavior, not RPG-only behavior.

Current source comments and repository code establish that `getAchievementsView()` merges code-only definitions with persisted unlocks, does not evaluate rules and does not create unlocks. Current `getXpSummary()` bulk-materializes `xp_transactions` with `toArray()` before calculating total XP/level.

These are readiness observations only. Do not treat the prospective fix as pre-approved before measurement.

## Required A6 readiness work

1. Export/inspect the exact clean post-A5 closure source and configuration.
2. Draw the actual route call graph for RPG and classic achievement surfaces, including shell/HUD ownership.
3. Measure current stores, transactions, queries, rows scanned/materialized and passive writes.
4. Separate visible achievement rows from hidden XP-history materialization.
5. Prove whether persisted `achievement_definitions` participates in the actual display path.
6. Prove existing unlock ordering/content and XP level semantics from product/source oracles.
7. Inspect error/retry and shared-surface behavior before designing RED.
8. Check current indexes/schema and explicitly decide whether A6 can remain schema-frozen.
9. Define separate semantic, access, composition, scale and passive-write evidence roles.
10. Freeze an A6 acceptance contract before creating an A6 RED-only story branch.

## Likely mechanism requiring investigation

The current source contains a concrete candidate mechanism: `getXpSummary()` calls `xp_transactions.toArray()` before reducing lifetime XP. A6 readiness should determine whether this creates a hidden full XP source array in the actual shared surface and whether a streaming lifetime aggregate can preserve published level semantics.

This is a readiness hypothesis, **not** permission to implement it immediately.

## Mandatory A5 process lessons

A6 support tooling must apply the strengthened controls from A5:

- inspect repository-native interfaces and evidence schemas before wrapping them;
- generated scripts must not guess unsupported CLI arguments;
- machine evidence should be structural/native before regex parsing;
- literal Git status checks must be literal;
- long-running commands must stream output;
- fixture/API/type consistency must be preflighted before owner execution;
- storage headroom must be checked before artifact-heavy E2E;
- only invalidated evidence is rerun after a support-tool or environment failure.

## Stop conditions

Stop before RED or production implementation if:

- the exact post-A5 closure source differs materially from the route composition above;
- the shared classic/RPG surface cannot be tested without substituting a synthetic path;
- achievement definitions/rules/rewards would need to change;
- a schema/index migration appears necessary rather than merely convenient;
- the intended RED depends only on an unused broad helper;
- A1–A5 accepted read/composition behavior cannot be preserved;
- integration or published baseline lineage changed unexpectedly.

No push, remote merge or deployment is authorized. A7 remains blocked until A6 is accepted and closed.
