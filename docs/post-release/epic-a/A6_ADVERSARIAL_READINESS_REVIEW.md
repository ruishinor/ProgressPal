# A6 Adversarial Readiness Review

Date: 2026-09-21
Baseline: `25ed38da54cf719c151165506c2a3391ae8eb88f` / `7b7e381920289515625de8d024dc6d6a0728c2f6`
Disposition: **PASS for RED-only readiness, with one support-tool recurrence recorded**

## Challenge objective

Try to disprove that A6 has a narrow, measurable, schema-frozen story before any production edit.

## Architecture challenge

**Finding:** The runtime owner is not the exported RPG Badge loader. Both classic and RPG routes render the shared `AchievementsSurface`. The RPG shell adds one separate accepted A4 HUD read.

**Disposition:** Contract the shared surface, not `loadRpgBadgeGallerySummary()`.

**False-green prevented:** deleting/narrowing only the unused broad loader while `getXpSummary()` still calls `xp_transactions.toArray()`.

## Data-access challenge

**Finding:** Exact lifetime XP has no persisted aggregate under schema v2. Existing indexes cannot answer `SUM(xp)` without examining all rows.

**Disposition:** Accept O(`H_xp`) scan; prohibit O(`H_xp`) source-array materialization. Use a cursor/stream accumulator and report duration honestly.

**False-green prevented:** replacing `toArray()` with a cursor that still retains every row in another array.

## Coherence challenge

**Finding:** `AchievementsSurface` currently starts unlock and XP reads independently. Existing explicit save paths can update `xp_transactions` and `achievement_unlocks` atomically.

**Disposition:** Freeze one readonly child transaction over both stores so the displayed unlock state and level have an explicit coherent read boundary.

**False-green prevented:** two independently optimized calls that remain separately transactional.

## Achievement-definition challenge

**Finding:** Product definitions are validated code constants. Persisted `achievement_definitions` is not used by the actual display path.

**Disposition:** A6 requires zero persisted definition reads. The child may query unlock state only for current code definition IDs.

**False-green prevented:** reintroducing a persisted definition table merely because the schema contains one.

## Route-composition challenge

**Finding:** `/rpg/badges` already performs one accepted A4 HUD XP scan and the shared child also needs lifetime XP for its header level.

**Disposition:** Measure the two owners separately. A6 does not force a cross-shell state-sharing redesign simply to remove the duplicate scan.

**Residual cost:** RPG Badges may still scan XP twice, both streaming, after A6. This is explicit and not described as constant-time.

## UX/UI challenge

**Finding:** Classic and RPG variants intentionally share data/loading/error/filter logic while differing in wrapper, labels and artwork.

**Disposition:** Preserve current shared error/retry behavior, filter semantics, status labels, unlock date and artwork-only presentation role. No visual redesign.

## QA/harness challenge

Required controls before accepting RED:

- real route/shared surface, not symbol inspection;
- real schema-valid XP/unlock fixtures;
- uninstrumented setup writer;
- measured reader opened after probe installation;
- shell HUD transaction distinguished from child transactions;
- semantic oracle derived from `achievementDefinitions` and `calculateXpSummary`;
- 1k/10k measurements report scanned/materialized separately;
- one primary role per test.

## Support-tool adversarial finding — RECURRENCE

The A6 exporter recorded `trackedFileCount: 432` and called its nested native `git archive` the complete tracked repository. `.gitattributes` has `docs/** export-ignore`, so that nested archive omitted tracked governance docs.

This is a scope/assertion defect in support tooling, not a source/product defect.

Readiness remains valid because exact A6 runtime/source/config/test evidence is present and governance is separately bound to the accepted A5 closure package. No owner rerun is required.

Strengthened control:

- never label `git archive` as complete tracked bytes without checking `.gitattributes`/archive contents;
- future exact-source exporters either package every `git ls-tree` file explicitly or state `export-ignore` exclusions in the manifest;
- compare declared archive scope with actual archived path set before owner handoff.

## Adversarial verdict

A6 is falsifiable and appropriately bounded.

No unresolved readiness blocker requires production work, schema change or A7 work before RED.
