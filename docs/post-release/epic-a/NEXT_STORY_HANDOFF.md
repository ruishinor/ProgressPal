# Next-story handoff — A5 readiness

Next story: **A5 — Focus actual-route read boundary**

Status: **eligible for fresh readiness only after A4 closure is integrated**

Do not start A5 implementation from this document alone.

## Required lineage

A5 readiness must start from the documentation-only A4 closure commit on `postrelease/01-read-architecture`.

That closure commit must directly descend from:

- A4 implementation: `1bcd1e20374d230cf7425aec91f96ad5c960a3b1`
- A4 tree: `a9c25fd7af7020dbb78402d1c699b8800a20b7b7`
- A4 readiness parent: `a54728a8d83d4fb33bffa2d7ee624013e39e7239`

## Purpose

A5 owns the **actual Focus route read boundary**, not merely an exported RPG Focus loader that may be unused.

Fresh readiness must re-inspect the exact current `RpgFocusPage` + shared session surface/ledger composition after A4 integration.

## A4 behavior to preserve

- non-Hub/non-Hero child routes get one narrow A4 HUD read;
- Focus post-save uses one shared A4 HUD refresh result;
- A4 does not materialize a hidden full session history;
- child-owned Focus reads remain separate from A4 HUD reads.

A5 must not reintroduce a second Hub/HUD refresh.

## Visible-ledger exception

If the actual Focus surface intentionally renders the complete study-session ledger, one O(`H_sessions`) materialized ledger is allowed because it is visible product data.

That exception does not permit a second hidden full session array, duplicated complete-history materialization, or shell/HUD session materialization.

## Readiness questions

Before RED or production edits, determine from current source:

1. Which component actually loads the Focus ledger?
2. Does `RpgFocusPage` or a shared `StudySessionsSurface` own it?
3. Is any broad exported Focus loader actually unused?
4. Which fields/order require complete session rows?
5. Which derived values can be bounded/streamed?
6. How many session queries occur on initial load?
7. What does selected `itemId` change?
8. Which reads occur after save: A4 HUD versus A5 ledger?
9. Can retry remain read-only after a committed save?
10. Does the actual Focus path still reach `getDatabaseSnapshot()`?
11. Which indexes support required order/filter semantics?
12. Is any schema/index change truly necessary?

## RED/GREEN principles

RED must exercise the actual route/surface. An unused broad loader alone is not sufficient.

GREEN must preserve complete visible ledger values/order, selected-item context, live timer behavior, explicit save/discard, exactly one committed session per save, XP idempotency, A4 HUD feedback, read-only retry, and zero passive writes.

Scale evidence must report visible ledger rows materialized separately from hidden rows. Visible O(H_sessions) growth is allowed and must be described honestly.

## Scope protection

Do not absorb A6, schema migrations without evidence, UI redesign, XP/achievement rule changes, or A1–A4 rewrites without a proven regression.

Use isolated clones for repository-wide validation while `.kilo/worktrees/nova-carnation` remains.

Do not start A6 during A5 readiness.
