# Epic A validation readiness

Result: **PASS**

Latest accepted story: **A4 — Hub, Hero and persistent HUD read boundaries**

Updated: 2026-09-21

## Environment

Authoritative A4 validation used Node `v24.19.0` and npm `11.10.1`.

## Accepted A4 exact candidate

- commit: `1bcd1e20374d230cf7425aec91f96ad5c960a3b1`
- tree: `a9c25fd7af7020dbb78402d1c699b8800a20b7b7`
- parent/readiness: `a54728a8d83d4fb33bffa2d7ee624013e39e7239`
- validated ZIP SHA-256: `B2CB00281B6E7EDDD6A29643B4F03AC67AA32C3A176D1525F6A1A1F49DBE46CB`
- full pre-commit transcript SHA-256: `EE56573C87F76D0CC586E57E4B0E367A55087D54EF8B3EEA7E63E82855B05547`
- release evidence SHA-256: `56EE8681237066D9E9A05274DAA40AE91FC565A42A5AF554A25C6389C6B35EA9`
- exact release transcript SHA-256: `38F37F6771A1E2CAD4B24F31344AA143761237610A01DA148A439E490C3D8CB1`
- unit/integration: 654/654
- E2E: 74/74
- vulnerabilities: 0

## Accepted A4 behavior

HUD: 9-store readonly transaction, 10 queries.

Hub: 10-store readonly transaction, 11 queries.

Hero: 11-store readonly transaction, 11 queries.

Direct Hub and Hero each use one A4 logical read. Other RPG children use one HUD read plus child-owned reads. Resource/Focus post-save use one A4 refresh.

No media/session/XP source histories are bulk-materialized.

## Scaling characteristic

The frozen schema still requires approved O(history) streaming.

The exact-commit 10,000-row simultaneous fixture scanned 10,000 media + 10,000 sessions + 10,000 XP rows, materialized zero source-history rows, and observed about 538 ms focused Hub read time under fake-indexeddb.

This is measured evidence, not a constant-time claim.

## Tooling constraint

The nested registered worktree `.kilo/worktrees/nova-carnation` remains. Use clean isolated clones for authoritative repository-wide validation.

## A5 rule

A5 is not pre-approved.

Only after A4 closure on `postrelease/01-read-architecture`, A5 may receive a fresh readiness assessment.

A5 must inspect the actual Focus route/`StudySessionsSurface`, preserve the complete visible session ledger as an explicit O(H_sessions) exception, preserve the accepted A4 one-HUD-read composition, prevent a second hidden full session history, and preserve save/XP/retry semantics.

Do not start A6 during A5.
