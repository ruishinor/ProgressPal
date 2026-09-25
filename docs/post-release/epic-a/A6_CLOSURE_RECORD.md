# Epic A / A6 closure record

Date: 2026-09-25. Disposition: **ACCEPTED locally**.

The owner's 2026-09-24 restart objective authorizes local A6 acceptance and
closure, followed by fresh A7 readiness and local aggregate acceptance.
Historical readiness-only restrictions are superseded within that envelope.

## Exact accepted implementation

- Branch: `postrelease/a6-badges-read-boundary`.
- Commit: `d7c591e6c2fc15475f375007705b717b203b00dd`.
- Tree: `0d77438da16aaafe75135fe15e892af240356ef2`.
- Parent / valid RED: `24b4fe43ddf656febf090eed6fd66eccd5786535`.
- Previous integration: `baea86adf9da350fb92c659f0e1047386bef18e9`.
- Fetched `origin/master`: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`.

The seven declared files were implemented and validated in a disposable clone,
copied byte for byte to the clean authoritative story branch, SHA-256 compared,
and committed. A second fresh clone checked out the exact commit and verified
the same file hashes before native release certification.

## Accepted behavior

The shared classic/RPG achievements surface now reads code-defined achievement
projections and lifetime XP through `readAchievementsSurfaceData`:

- one readonly transaction across exactly `achievement_unlocks` and
  `xp_transactions`, two logical operations;
- one indexed unlock operation restricted to code-definition IDs;
- one XP cursor validating every row, a scalar sum and constant error state;
- zero complete XP source-array materialization and zero passive writes;
- existing `calculateXpSummary` semantics and achievement projection;
- unchanged UI markup, filtering, labels, dates and presentation-only artwork;
- separate A4 HUD transaction, including its allowed second route-level XP scan;
- independent child/HUD failure and retry, with no app refresh or evaluation.

Coherence evidence blocks a competing atomic unlock/XP writer until the child
read finishes and then verifies consistent before/after views. At 1k/10k XP
rows and 1k/10k unrelated unlocks, access remains one transaction/two queries,
H XP rows scanned, no XP bulk materialization, two matched unlocks and 16
visible definitions. This is linear scanning, not constant-time access.

## Executed acceptance and certification

Coverage: `A6_ACCEPTANCE_COVERAGE.md`, all frozen sections accounted for.

- Baseline: valid expected RED (7 XP source rows materialized).
- A6/probe/architecture: 18/18.
- A1–A5 coupled repository/save regressions: 107/107.
- Full isolated unit/integration: 673/673; E2E: 74/74.
- Fresh exact-commit native release: **PASS**, 21 commands, 0 warnings,
  0 retries, 0 skips; unit/integration 673/673, E2E 74/74.
- Formatting, lint, typecheck, build, bundle, circular and audit passed;
  audit found 0 vulnerabilities.
- Node v24.19.0, npm 11.10.1, Playwright 1.60.0, Chromium 148.0.7778.96.

Retained native evidence:
`artifacts/release-evidence/2026-09-25T06-33-49-570Z-epic-a-a6-pass-1.json`.

Evidence SHA-256:
`A3331F7C67F4F4C1B151A61EDDA05D72A773E9BADC6CC7A6070EAE8BA9D68455`.

Review: `docs/post-release/epic-a/A6_RELEASE_REVIEW.json`.
Review SHA-256:
`6ADE8195311CAD7E361806B5AB98C7D1647583016A07B4424354C0077A6EF73A`.
Both the exact commit/tree and review bytes match the native manifest.
Eleven build artifacts have checksums in that manifest.

## Failure disposition and retrospective

One correction round before apply: two incorrect HUD text selectors were a
`semantic-test` recurrence; actual accessible labels and engine-derived levels
now control those assertions. A malformed XP test exposed a real candidate
defect: Dexie 4.4.3 can swallow errors thrown inside cursor callbacks. A6 now
retains the first validation error and rejects outside that callback, preventing
a partial result. No test or criterion was weakened. Existing A1–A5 callbacks
are an explicitly unverified A7 readiness concern.

Permission failures for local Git hard links, audit networking and retained
evidence were `environment` events resolved through tool escalation. The
precommit browser color-variable warnings were absent from native certification.
No generated validation wrapper or owner debugging run was needed.
The valid precommit evidence was preserved; only invalidated focused tests were
rerun before the required full/exact gates.

## Scope and next transition

Three production files change the read boundary/export/call. Two test files
establish coverage; two implementation-governance files record it. No schema,
index, database version, mutation rules, XP/achievement definitions, backup
format, UI markup, dependency, service worker or remote behavior changed.
The unused broad Badge loader remains outside runtime ownership and unchanged.

The integration branch was fast-forwarded locally to the accepted implementation.
This documentation-only closure commit completes A6 integration. Fresh A7
readiness must verify its exact HEAD/tree and freeze aggregate acceptance before
any A7 production change. No push, remote merge, deployment, tags or Epic B work.
