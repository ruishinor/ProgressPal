# ProgressPal current state

This is the single live execution-authority file for ProgressPal. Other status prose in older records is historical and carries a pointer back here. Authority order when sources conflict: latest explicit owner instruction, exact live Git/deployment state, later owner decisions in the repository, candidate-bound evidence, this file, then older records. For Programme #2 content and scope, the protected Programvareutvikling workspace authority (`00_CONTROL`, OD-P2-32, and `05_OUTPUT/21_PRODUCT_SCOPE_RECOVERY_AND_INTEGRATION_READINESS/`) ranks above the derived Pre-E reports in `docs/post-release/pre-e/`, which interpret it and never override it.

**Live identity is Git, not this file.** A file cannot name the commit that contains it. Read `git rev-parse HEAD`, `git rev-parse HEAD^{tree}` and the release manifest for the exact candidate. This file records the last independently accepted baseline, what has been added since and what is pending.

Last reconciled: 2026-10-03 (Epic E implementation), on branch `programme/epic-e-programvareutvikling`. Nothing on this branch is merged, pushed or deployed.

## Accepted baseline

| Item                      | Value                                                                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Last accepted `master`    | `34689e0ad0ce73d66e51dc1d140a67d1f334f34d` (`docs(pre-e): bind independent review`), equal to `origin/master` when last read (2026-10-03)                                          |
| Root tree / `src` tree    | `40cc1e993692309f88312e9541ac7befa09584dd` / `7c5d28a4f9cc0c653b59b25eff7913de68bad1cd`                                                                                            |
| Review binding            | payload tree `fa0ba257d76c69d47cf4d4d5fc0ff3df97534052`, equal to `binding.payloadTree` in `docs/release-reviews/pre-e.json`                                                       |
| GitHub Release validation | run `37067447813`, job `111038697980`, succeeded (owner-reported, 2026-10-03)                                                                                                      |
| Production (observed)     | Vercel `dpl_2MqQts2WVQ8rp36qemSHk88a2mXp` from that commit; check `Final candidate` succeeded and blocks `deployment-alias`; the alias serves `index-BhBL9zg2.js` (owner-reported) |

A local rebuild of `34689e0` reproduces that entry chunk name (`index-BhBL9zg2.js`) exactly.

Closed work, preserved and not to be reopened without a reproduced defect or a new owner instruction:

- Epic A (read safety), Epic B (shared contracts), Epic C C0–C7 (programme platform, ownership migration, multi-programme enrolment and switching; C7 merged as PR #42, `5cd1e8d`), Epic D (navigation and compact HUD; merged `f153f19`), the CI timeout-budget repair (merged `5ffe8f5`) and the reward-moment notification feature (`95489ea`).
- **Pre-E** (hardening, source fit, E-SCHEMA-1 acceptance) is closed: independently reviewed, bound by `docs/release-reviews/pre-e.json`, promoted through the validated release sequence and serving in Production. Its prose in `docs/post-release/pre-e/` that still says "not promoted" or "Epic E has not started" describes the time it was written.
- C8 (reusable presentation abstraction) is **conditional and not activated**. Epic F and Epic G have not started.

## Product facts

- Application version: `1.4.0` (`package.json` is authoritative). It moves with application behaviour and is independent of the database. Whether Epic E ships under a new version is an owner release decision; the candidate does not change it.
- Database: IndexedDB `progresspal-cs50-edition`. **Accepted `master` and Production are schema v3. The Epic E branch implements schema v4** exactly as the accepted record `docs/post-release/epic-e/E_SCHEMA_CHANGE_DECISION_RECORD.md` (E-SCHEMA-1) specifies: Dexie native version 40, the append-only `learner_evidence` store and the mutable `lesson_positions` store, an additive live v3 → v4 upgrade (v2 devices upgrade through v3), the database name unchanged, and mastery derived, never stored.
- Offline cache identity moves with the package version by contract (`CACHE_VERSION` in `public/sw.js`, pinned by `tests/architecture/serviceWorker.test.ts`); its `progresspal-cache-` prefix is stable.
- Production programme registry on `master`: **`cs50x` only**. **On the Epic E branch the registry holds `cs50x` (the explicit default) and `programvareutvikling`**, registered but not enrolled until the learner enrols in Settings → Programme.
- Programme content language: CS50x stays English. Programvareutvikling ships its authored Bokmål unchanged (the snapshot keeps every authored learner-facing string; the authoring workspace's own learner-render wording rules are applied only at display, as programme copy). Code, commands, identifiers and technical terms stay English and carry `lang` from content metadata. No translation or localisation work exists or is planned in Epic E; the remaining English shell text on Programvareutvikling-active surfaces is a recorded learner-facing release-quality gap.
- Backup baseline: on the Epic E branch the supported baseline is the **native schema-4 export**. Exported backups from schema 3 or earlier are refused clearly before any write (schema record section 7; `docs/releases/backup-compatibility-matrix.md`). Live databases upgrade in place.
- Frozen product decisions: registration is not enrolment; enrolment and switching are explicit actions in Settings → Programme; XP, level, shared achievements, study sessions, Insights, profile and weekly target are learner-global; RPG is the primary experience and Classic is secondary. Programvareutvikling awards no XP and has no programme-bound achievements in Epic E.
- Product boundary: learner state stays in the browser's IndexedDB and is never transmitted. No learner code is sent anywhere.

## Active work

**Epic E** (owner-authorized 2026-10-03; prompt `docs/post-release/pre-e/EPIC_E_AUTONOMOUS_PROMPT.md`), branch `programme/epic-e-programvareutvikling` from `34689e0`.

Implemented on the branch, after the immutable RED checkpoint `98de895`: schema v4 and the learner-evidence repository (two-stage attempt → result persistence in one logical write scope, idempotent, conflict-fail-closed, recovery of interrupted evaluations); the content export pipeline (`scripts/programvareutvikling-content.mjs`, source SHA-256 `577cd120…`, 2 modules, 25 missions, 47 units, 291 exercises, `--check` reproducible) and the committed snapshot; the asynchronous lesson content provider with version and hash checks; the 15 authored evaluator modes in TypeScript for the 227 runtime-free evaluable exercises, with parity against the authored vectors and seeded mutation tests; derived mastery; the lesson surface in Classic and RPG; the programme-owned unit-length rule; the shell-brand mechanism; native schema-4 backup with evidence invariants.

Open dispositions (each pauses only what depends on it; everything else is delivered):

- `EPIC_E_PAUSED_RUNTIME_DECISION_REQUIRED`. No network permission was given for the runtime spike, so no runtime was fetched. Measured offline: the production CSP blocks WebAssembly compilation in a same-origin worker, and adding `'wasm-unsafe-eval'` to `script-src` permits it, so any client-side WASM runtime needs an owner-accepted CSP change. The 49 runtime-dependent exercises show an honest unavailable state before submit and create no attempt; M02 clearance stays blocked as "executable evaluation unavailable" and its denominator is intact.
- `EPIC_E_PAUSED_BUDGET_DECISION_REQUIRED`. Measured on the real build with the real `check:bundle`: total JS gzip **450,567 B against the 400,000 B budget** (baseline `34689e0`: 299,912 B; the committed content alone is 122,165 B gzip in three static chunks); CSS gzip 11,998 / 12,000 B; largest raw chunk 474,641 / 500,000 B. The gate is unchanged; the candidate does not pass it. The owner chooses between a bounded budget adjustment, lazy or dynamic content backing (needs a service-worker and `AGENTS.md` change, and the gate today sums every built JS file), counted static content assets, or another measured alternative.
- `EPIC_E_PAUSED_BRAND_DECISION_REQUIRED` (OD-6). The shell brand reads the active programme's terminology; Programvareutvikling supplies none, so "ProgressPal CS50 Edition" is still shown on its surfaces. No brand is invented.
- `EPIC_E_PAUSED_CHECKPOINT_RULE_DECISION_REQUIRED` (K-4). Checkpoint answers are recorded; no pass or fail is shown and no skill reaches `Demonstrated`.
- `EPIC_E_PAUSED_GATE_RETRY_RULE_DECISION_REQUIRED` (K-3). Gate items cannot be retried; the learner is told why.
- `EPIC_E_STOP_MISSING_AUTHORITATIVE_PROGRAMME_SOURCE` for one sentence only: the known observer-instruction sentence in `S1-M01-CHK-E05` (D-2) ships unchanged and pinned, because removing authored text needs an authoring decision.
- C8 not triggered; no domain-model replan; no L3 scope issue; no third store and no persisted mastery.

## Release model

Validated before production (`docs/ci.md`).

- **Repository side:** the release gate resolves review evidence by its binding to the candidate's payload tree and fails closed otherwise; the workflow and the `Final candidate` check name are pinned by tests.
- **Platform side (active):** Vercel Deployment Check `Final candidate` (`chk_405a1c74-57c8-4f43-b2d8-ac38d03de6e7`) blocks `deployment-alias` for target `production`. The Pre-E promotion of `34689e0` passed through it (owner-reported).

## STOP conditions and next actions

- Epic E never pushes, merges, tags, deploys or writes review evidence for its own candidate. Its candidate is handed to independent and owner review with an evidence package outside the tracked tree.
- Owner decisions now required, in any order: the runtime (permission to fetch candidates for the spike, then the runtime, its CSP and service-worker changes and how its assets count); the bundle budget; the shell brand (OD-6); the checkpoint pass rule (K-4); the gate retry rule (K-3); and the authoring fix for the `S1-M01-CHK-E05` observer sentence. A version decision belongs to the release.
- After those decisions, Epic E continues on the same branch within what they accept; a final Programvareutvikling-active candidate is not claimed while the brand string is wrong or the budget gate fails.
- Do not begin C8, Epic F, Epic G or S1-M03+ without a new owner instruction.

## Document map

Current: this file, `AGENTS.md` (agent operating rules), `README.md`, `SECURITY.md`, `PRIVACY.md`, `docs/ci.md`, `docs/storage-safety.md`, `docs/post-release/pre-e/` (the live Epic E prompt and the Pre-E reports), the accepted schema contract `docs/post-release/epic-e/E_SCHEMA_CHANGE_DECISION_RECORD.md` (E-SCHEMA-1, implemented on the Epic E branch) and `docs/releases/backup-compatibility-matrix.md` (current-state note).

Historical evidence, retained unchanged: `docs/post-release/epic-a|b|c/`, `docs/rpg-v2/`, `docs/remediation/`, `docs/releases/` (apart from the compatibility matrix's current-state note), `docs/audits/`, `docs/archive/`, `docs/modules/`. Their "current state" lines describe the date they were written. The status-bearing files among them carry an insert-only banner pointing here; the rest are dated records and do not.
