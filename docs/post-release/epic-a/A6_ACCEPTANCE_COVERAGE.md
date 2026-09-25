# A6 implementation acceptance coverage

Date: 2026-09-24. State: ACCEPTED; isolated precommit and fresh exact-commit release PASS (2026-09-25).

The owner's restart objective authorizes local A6 implementation and acceptance,
then A7 after A6 closure. Earlier readiness-only authorization remains historical.
The frozen acceptance criteria are unchanged. Baseline RED:
`24b4fe43ddf656febf090eed6fd66eccd5786535`, tree
`793e3a69160f3d5db3a053712126f1ce0930ef21`. The exact baseline rerun failed only
on `A6_BADGES_HIDDEN_XP_SOURCE_MATERIALIZATION`: 7 scanned, 7 materialized,
2 child transactions, one A4 HUD transaction, zero writes.

## Commands and evidence

All commands use Node v24.19.0/npm 11.10.1 in a disposable local clone.
Logs live outside tracked source under
`C:/Users/alex_/AppData/Local/Temp/progresspal-codex-overnight-20260924/`.

- F: `npm test -- tests/features/rpg/a6BadgesReadBoundary.test.tsx tests/db/accessProbe.test.ts tests/architecture/achievementsFeature.test.ts --reporter=verbose`
- R: `npm test -- tests/features/rpg/mapReadBoundary.test.ts tests/features/rpg/moduleReadBoundary.test.ts tests/features/rpg/resourceReadBoundary.test.ts tests/features/rpg/a4HubHeroHudReadBoundary.test.ts tests/features/rpg/a4RouteReadComposition.test.tsx tests/features/rpg/a5FocusReadBoundary.test.tsx tests/features/rpg/saveOutcomes.test.tsx tests/db/repositories.test.ts`
- P: native lint, format:check, typecheck, build, check:bundle, test, test:e2e,
  check:circular, audit, plus release/bundle utility unit tests.
- E: `RELEASE_MODULE=epic-a-a6`, `RELEASE_PASS=1`,
  `RELEASE_REVIEW_FILE=docs/post-release/epic-a/A6_RELEASE_REVIEW.json`,
  `npm run verify:release` in a fresh clone of the implementation commit.

## Frozen criterion to executed evidence

| Contract sections                            | Evidence                                                                                                                                                                                  | Command                                 | Result                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| 1–2, 13: actual runtime path and valid RED   | Baseline real `/rpg/badges` rerun; same test strengthened for one child transaction; classic page plus shared surface                                                                     | Baseline and F                          | PASS for intended mechanism; baseline exit 1 is expected                         |
| 3, 8: A4 shell and separate child            | Actual route: exactly two readonly transactions, exact HUD/child store sets, HUD queries <=10, both XP scans visible, no history materialization                                          | F, R                                    | F PASS; R 107/107 PASS                                                           |
| 4, 6: definition authority, targeted unlocks | Spoofed persisted definition, unknown unlocks, unique code IDs; `achievementId` cursor; 1k/10k unrelated unlocks excluded; matched schemas validated                                      | F                                       | PASS                                                                             |
| 5: coherent child                            | Exactly one two-store transaction and two logical operations; barrier after unlock read blocks competing atomic XP/unlock writer; before/after states never mixed                         | F                                       | PASS                                                                             |
| 7: XP accumulation                           | One XP cursor, exact row counts, zero bulk materialization; inspected scalar total and first-error variable, no retained source array                                                     | F                                       | PASS; retained-state claim includes source inspection                            |
| 9: shared semantic invariants                | Every code definition's title/description/card and status; category/title order, filters, dates, classic Unlocked / RPG Earned, no card XP, unknown IDs absent                            | F; full App suite in P                  | F and P PASS                                                                     |
| 10: XP semantics                             | Empty, mixed/reversed and all-unlocked level-boundary fixtures compared with existing XP engine and legacy achievement projection                                                         | F                                       | PASS                                                                             |
| 11: failure and retry                        | Malformed matching unlock and tail XP rejected; real child DB interruption yields error then one child retry; HUD retry independently leaves ready child intact; no app refresh or writes | F                                       | PASS                                                                             |
| 12: 1k/10k scale                             | Both sizes: one transaction, two queries, H XP scanned, zero XP materialization, two relevant unlocks, 16 output definitions, zero writes                                                 | F                                       | PASS; read durations 16/199 ms, fixture setup 62/387 ms in corrected focused run |
| 14: optional unused loader                   | Existing `loadRpgBadgeGallerySummary` has no runtime route caller; intentionally unchanged                                                                                                | Source reference search; actual route F | PASS for actual-path scope; optional removal deferred                            |
| 15, 17: schema, mutations and scope          | Diff restricted to passive repository boundary/export and surface call, tests/docs; database/domain/XP/achievement definitions, backup, UI markup unchanged                               | Exact diff review; R, P                 | Source, R and P PASS                                                             |
| 16: regressions and certification            | Architecture/probe 4/4, A6 14/14; coupled/full native gates; fresh exact-commit gate and review hash binding                                                                              | F, R, P, E                              | F 18/18, R 107/107, P and E PASS                                                 |
| 18: stop conditions                          | Baseline, integration and fetched origin match; no owner changes; frozen schema supports design                                                                                           | Git and source checks                   | PASS                                                                             |

The access probe counts DBCore bulk materialization, not arrays assembled by
Dexie above the cursor. The indexed unlock `toArray()` deliberately retains only
matched code-definition rows (bounded by the existing unique index and D).
XP uses no collection array. This is O(H_xp) scanning and O(1) aggregate state,
not constant-time access. Two route-level XP scans are expressly allowed.

## Adversarial review and corrections

The first focused run had 15 passing and 3 failing tests. Two retry tests used
text-content assertions for a HUD level rendered via an accessible label:
`semantic-test`, recurrence of weak source-derived expectations. Corrected to
the actual label with the expected level from the XP engine. No UI edit.

The malformed tail-XP test exposed a real candidate defect: Dexie 4.4.3's
`iterate`/`wrap` callback can swallow thrown validation errors. The new A6
boundary now preserves the first validation error in constant state and throws
after the cursor, preventing partial ready results. Corrected focused run:
18/18. The tests and criteria were preserved. Existing A1–A5 cursor error paths
are an A7 readiness concern to investigate, not an A6 rewrite authorization.

One correction round; no generated validation wrapper; no owner debugging
execution. Sandbox permission retries for fetch/local hard links were environment
events, not product failures. Native release/bundle utility tests: 12/12.
The native review schema and runner were read before preparing certification.

R and P passed before authoritative apply: 673/673 unit/integration tests, 74/74 E2E, lint, format, typecheck, build, bundle, circular and audit (zero vulnerabilities). E2E inherited color-variable diagnostics are non-product environment warnings; the native release runner sanitizes those variables and its zero-warning rule remains unchanged. Acceptance additionally
requires E and documentation-only closure/local integration. No remote mutation.

Exact-release acceptance: see A6_CLOSURE_RECORD.md. Native evidence binds implementation d7c591e6c2fc15475f375007705b717b203b00dd / tree 0d77438da16aaafe75135fe15e892af240356ef2, 21 successful commands, 0 warnings/retries/skips. All frozen A6 criteria are covered. Local integration and this documentation-only closure complete the A6 state transition.
