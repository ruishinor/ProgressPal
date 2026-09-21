# Epic A validation readiness

Result: **PASS**

Latest accepted story: **A3 — Resource read boundary**

Updated: 2026-09-21

## Required environment

Repository contract:

- Node `>=24 <25`
- npm `>=11 <12`
- `.nvmrc`: `24`
- `packageManager`: `npm@11.10.1`

Authoritative owner-side A3 validation used Node `v24.19.0` and npm `11.10.1`.

## Accepted A3 exact candidate

- commit: `7363ec6d70a89e48373d8be81673b94793598cd8`
- tree: `ba504b77dd98dc3472699631db0a56e82ea0c9f6`
- parent / readiness commit: `6b5e0d65d5736f8f5c4bb033aee1ea24735d1d83`
- normalized validated ZIP: `ProgressPal_A3_GREEN_VALIDATED_harness2_20260921-032756.zip`
- ZIP SHA-256: `501E15E4F231384DD3148900092921883793A71B395CE592E33553C5ED835F4B`
- release evidence: `artifacts/release-evidence/2026-09-21T02-08-39-892Z-rpg-primary-final-candidate-pass-1.json`
- release evidence SHA-256: `A706CC38677B564D685A67396637E99736E9C7696589E89CD8CE051F28D9509D`
- authoritative transcript SHA-256: `B69614222CB782CB99DC52C7651DDE7B8BCB2929EEE70E2A5B246ABADF550771`
- unit/integration: 644/644
- E2E: 74/74
- audit vulnerabilities: 0

A3 therefore extends the accepted Epic A lineage through the exact Resource-boundary implementation commit without changing schema, UI, reward rules, achievements, backup format or service-worker/cloud/auth architecture.

## Accepted Resource contract

The logical Resource read now uses one coherent readonly transaction over exactly eight stores:

- `content_assets`
- `content_slices`
- `course_items`
- `course_units`
- `media_progress_events`
- `progress_entries`
- `resume_points`
- `xp_transactions`

Normal existing-item budget is nine logical queries, with two on `course_items` and one on each other required store.

Missing item behavior returns `null` after one selected-item lookup.

The accepted implementation preserves detailed task, `week_completed` and shared final-project reward semantics, long-form state, mutation-result readback and zero passive writes.

## Explicit scaling characteristic

A3 does not establish constant-time history processing.

Selected-item media progress remains an approved O(`H_selected_item`) cursor scan under the frozen schema.

Across A3 validation runs, the synthetic 10,000-row Resource media-history case took approximately 30–49 seconds under fake-indexeddb while scanning 10,000 relevant media rows and materializing zero source rows.

This remains a tracked scaling risk and must not be silently re-described as constant-time or production-latency evidence.

Derived exact coverage state may also grow with genuinely disjoint watched ranges.

XP reward lookup uses the existing non-unique `sourceId` index. Exact reward-key retention is bounded, but duplicate relevant source IDs can require scanning all matching rows.

## Known local-environment constraint

The primary working repository still contains the registered nested Git worktree:

`.kilo/worktrees/nova-carnation`

Direct repository-wide `eslint .` in the primary directory can detect multiple TypeScript roots and fail parser-root discovery.

This does not invalidate A3: exact candidate bytes passed repository-wide lint in clean isolated clones before commit and again in the exact-commit release clone.

Do not remove or rewrite the Kilo worktree as incidental validation work. Either resolve it deliberately as separate tooling hygiene or continue repository-wide authoritative validation in fresh isolated clones.

## Continuing rule for A4 and later stories

`PASS` here does not pre-approve A4.

A4 becomes eligible for a fresh readiness assessment only after A3 closure is committed on `postrelease/01-read-architecture`.

Before any A4 implementation work:

1. start from the exact A3 closure/integration HEAD;
2. re-fetch and reconcile any change to `origin/master`;
3. re-inspect actual shell/Hub/Hero route composition rather than assuming readiness text remains current;
4. distinguish persistent shell HUD, Hub page and Hero page logical reads;
5. preserve A1–A3 accepted boundaries;
6. measure approved lifetime XP/session/media scans honestly at 1k/10k history;
7. prohibit hidden full-history materialization even when O(n) streaming scans are allowed;
8. prove transaction coherence on the actual production path;
9. use fresh isolated clones for repository-wide validation while `.kilo` remains registered;
10. bind final acceptance to authoritative Node24/npm11 `verify:release` evidence for the exact A4 implementation commit/tree.

Do not begin A5 or A6 merely because A4 readiness starts.
