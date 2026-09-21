# Epic A — A4 closure record

Date: 2026-09-21

Story: **A4 — Hub, Hero and persistent HUD read boundaries**

Disposition: **ACCEPTED for Epic A integration**

## Accepted candidate identity

- story branch: `postrelease/a4-hub-hero-hud-read-boundaries`
- commit: `1bcd1e20374d230cf7425aec91f96ad5c960a3b1`
- tree: `a9c25fd7af7020dbb78402d1c699b8800a20b7b7`
- parent / A4 readiness commit: `a54728a8d83d4fb33bffa2d7ee624013e39e7239`
- accepted A3 implementation ancestor: `7363ec6d70a89e48373d8be81673b94793598cd8`
- A3 closure/integration ancestor: `bb603331a0aca3edb01b6cfc03e126e75f3041a0`
- product baseline ancestor: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- authoritative toolchain: Node `v24.19.0`, npm `11.10.1`

The accepted implementation commit must not be amended during closure.

## Accepted scope

A4 replaces the remaining broad snapshot reads owned by the persistent RPG shell/HUD, Hub and Hero surfaces with explicit coherent targeted read contracts.

It also removes duplicate A4 reads from actual route composition:

- direct `/rpg`: one A4 Hub read total;
- direct `/rpg/hero`: one Hero read and no hidden shell Hub/HUD read;
- other RPG child routes: one A4 HUD read plus independently owned child reads;
- Resource and Focus post-save: one shared A4 HUD refresh instead of a shell refresh plus a second Hub read.

The exact implementation commit changes 13 files: eight production files and five tests, with 1,614 insertions and 150 deletions.

A4 does not change `src/lib/db/database.ts`, schema/index definitions, migrations, backup/storage format, XP/achievement rules, UI visual design/copy/navigation destinations, service worker, cloud/auth architecture, the Focus visible ledger boundary owned by A5, or the Badges page boundary owned by A6.

## Baseline RED

Readiness commit:

`a54728a8d83d4fb33bffa2d7ee624013e39e7239`

Valid RED proved both required dimensions.

Access:

- Hub and Hero each used one readonly transaction across all 14 stores;
- both touched unrelated stores;
- both materialized media/session/XP source-history rows.

Composition:

- direct Hub: two Hub reads;
- direct Hero: hidden shell Hub read plus Hero read;
- Resource post-save: two A4 refresh requests;
- Focus post-save: two A4 refresh requests.

Valid owner-side RED evidence:

`C:\Users\alex_\AppData\Local\ProgressPal\evidence\A4-20260921-115330-RED-hub-hero-hud-valid.log`

The earlier empty-probe run is not accepted as access evidence. It was corrected by installing DBCore instrumentation before opening a second reader connection.

## GREEN correction

Candidate v1 stopped at ESLint because one unused internal type declaration (`A4HistoryAggregate`) remained in `repositories.ts`.

Candidate v2 deleted exactly that dead declaration. No query, transaction, route, semantic or test logic changed.

## Accepted normalized candidate

- ZIP: `ProgressPal_A4_GREEN_VALIDATED_20260921-123131.zip`
- SHA-256: `B2CB00281B6E7EDDD6A29643B4F03AC67AA32C3A176D1525F6A1A1F49DBE46CB`
- manifest SHA-256: `E5AB403F56873F57276CB48A4894E5EBC8E211A470EEEC06217251C001B6D246`
- focused GREEN transcript SHA-256: `91688ACE7AD9D49AC1A876A0F87866FB153F48E9BA25F6CF85DC37731CD236E4`

Focused GREEN passed 10/10 A4 contract tests and 245/245 focused regressions.

## Accepted logical reads

HUD:

- 9 stores;
- 10 logical queries;
- no session/unlock/definition/app-meta/backup reads.

Hub:

- 10 stores;
- 11 logical queries;
- includes session streaming;
- no achievement-definition/unlock/app-meta/backup reads.

Hero:

- 11 stores;
- 11 logical queries;
- includes `achievement_unlocks`;
- excludes Hub-only recommendation/weekly/reward work;
- no persisted achievement definitions/app-meta/backups.

All are coherent readonly transactions with zero passive writes.

## Lifetime-history behavior

A4 preserves the frozen schema and approved O(history) streaming for media, sessions and XP.

Exact-commit 10,000-row simultaneous evidence:

- media scanned: 10,000;
- sessions scanned: 10,000;
- XP scanned: 10,000;
- source-history rows materialized: 0;
- Hub query count: 11;
- fake-indexeddb focused read duration: about 538 ms.

This is O(history) evidence, not a constant-time or universal production-latency claim.

## Semantic preservation

A4 preserves learner/profile fallback, rank/XP, long-form inferred status, recommendation ordering/reward labels, local-Monday/DST weekly attribution, recent top-five ordering, Hero badge counts, post-save retry semantics, and zero passive writes.

## Full pre-commit validation

- transcript SHA-256: `EE56573C87F76D0CC586E57E4B0E367A55087D54EF8B3EEA7E63E82855B05547`
- summary SHA-256: `9FE33BD1C4C915B2CC903A8F126EB07DCC46BE63D951E465764C1517A1255CD1`
- unit/integration: 654/654
- E2E: 74/74
- lint/format/typecheck/build/bundle/circular/audit/diff: PASS
- audit vulnerabilities: 0

## Exact-commit release validation

Implementation:

- commit: `1bcd1e20374d230cf7425aec91f96ad5c960a3b1`
- tree: `a9c25fd7af7020dbb78402d1c699b8800a20b7b7`
- parent: `a54728a8d83d4fb33bffa2d7ee624013e39e7239`

Fresh exact-commit `npm run verify:release`: PASS.

Release evidence:

`artifacts/release-evidence/2026-09-21T11-10-16-851Z-rpg-primary-final-candidate-pass-1.json`

SHA-256:

`56EE8681237066D9E9A05274DAA40AE91FC565A42A5AF554A25C6389C6B35EA9`

Exact-release transcript SHA-256:

`38F37F6771A1E2CAD4B24F31344AA143761237610A01DA148A439E490C3D8CB1`

Exact-release summary SHA-256:

`B1B5AA714D4FAF278B5AC5BB1CE0257484EC2D24547A9FC8B8104FC3B48FB495`

## Tooling constraint

The registered nested worktree `.kilo/worktrees/nova-carnation` remains. Authoritative repository-wide validation continues in clean isolated clones.

## Closure decision

A4 is accepted for fast-forward integration into `postrelease/01-read-architecture`.

Closure must fast-forward from exact readiness commit `a54728a8...` to exact implementation `1bcd1e2...`, add only governance files, commit a documentation-only closure commit, leave the integration branch clean, perform no push/remote merge, and not start A5.

After closure, A5 becomes eligible for fresh readiness from the resulting integration HEAD.
