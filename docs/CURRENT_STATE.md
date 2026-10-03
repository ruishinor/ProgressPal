# ProgressPal current state

This is the single live execution-authority file for ProgressPal. Other status prose in older records is historical and carries a pointer back here. Authority order when sources conflict: latest explicit owner instruction, exact live Git/deployment state, later owner decisions in the repository, candidate-bound evidence, this file, then older records. For Programme #2 content and scope, the protected Programvareutvikling workspace authority (`00_CONTROL`, OD-P2-32, and `05_OUTPUT/21_PRODUCT_SCOPE_RECOVERY_AND_INTEGRATION_READINESS/`) ranks above the derived Pre-E reports in `docs/post-release/pre-e/`, which interpret it and never override it.

**Live identity is Git, not this file.** A file cannot name the commit that contains it. Read `git rev-parse HEAD`, `git rev-parse HEAD^{tree}` and the release manifest for the exact candidate. This file records the last independently accepted baseline, what has been added since and what is pending.

Last reconciled: 2026-10-03 (Epic E continuation under the owner decisions of 2026-10-03), on branch `programme/epic-e-programvareutvikling`. Nothing on this branch is merged, pushed or deployed.

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

- Application version: `1.5.0` on the Epic E branch (owner-authorized final Epic E version; `package.json` is authoritative); accepted `master` and Production are `1.4.0`. The version moves with application behaviour and is independent of the database.
- Database: IndexedDB `progresspal-cs50-edition`. **Accepted `master` and Production are schema v3. The Epic E branch implements schema v4** exactly as the accepted record `docs/post-release/epic-e/E_SCHEMA_CHANGE_DECISION_RECORD.md` (E-SCHEMA-1, amended by E-SCHEMA-1A in section 13) specifies: Dexie native version 40, the append-only `learner_evidence` store and the mutable `lesson_positions` store, every XP row owned by exactly one programme (`programmeId`, validated, no index), an additive live v3 → v4 upgrade that gives historical XP rows the accepted CS50 identity (v2 devices upgrade through v3), the database name unchanged, and mastery derived, never stored.
- Offline cache identity moves with the package version by contract (`CACHE_VERSION` in `public/sw.js`, pinned by `tests/architecture/serviceWorker.test.ts`); its `progresspal-cache-` prefix is stable. The service worker caches the boot set and the listed programme content at install, and each listed Python runtime file the first time it is used online.
- Production programme registry on `master`: **`cs50x` only**. **On the Epic E branch the registry holds `cs50x` (the explicit default) and `programvareutvikling`.** A fresh learner explicitly chooses the starting programme during onboarding (nothing preselected); existing and restored learners are never re-prompted. Enrolling in or switching to the other programme stays in Settings → Programme.
- Programme content language: CS50x stays English. Programvareutvikling ships its authored Bokmål (content v2, source SHA-256 `8693b7ba…`, 1,121,712 bytes, corrected at the source for the D-2 sentence and the interleaved mission order); its learner copy avoids internal assessment and research terms. Code, commands, identifiers and technical terms stay English. The remaining English shell text on Programvareutvikling-active surfaces is a recorded learner-facing release-quality gap; no localisation work is planned.
- Shell brand: CS50 shows "ProgressPal CS50 Edition"; Programvareutvikling and the first run before a programme is chosen show "ProgressPal" (OD-6).
- Programme content storage: lesson bodies, the programme index and evaluator data are versioned, content-addressed same-origin assets under `public/content/`, verified by SHA-256 against a small bundled catalogue; they ship with the build and are not remote course data.
- Executable evaluation: a pinned Pyodide 314.0.7 runtime (CPython 3.14) is packaged under `runtime/pyodide-314.0.7/` and runs learner programs in a dedicated worker without network or storage access; the production CSP adds only `'wasm-unsafe-eval'` to `script-src`. Learner code never leaves the browser.
- Backup baseline: on the Epic E branch the supported baseline is the **native schema-4 export**, which carries XP ownership. Exported backups from schema 3 or earlier are refused clearly before any write (schema record section 7; `docs/releases/backup-compatibility-matrix.md`). Live databases upgrade in place.
- Frozen product decisions: registration is not enrolment; RPG is the primary experience and Classic is secondary. **XP and level are per programme** (E-SCHEMA-1A): each programme has its own ledger and level, and switching never moves XP. Shared achievements, study sessions, Insights, profile and weekly target stay learner-global. Programvareutvikling earns XP for correct work only, with the measured calibration; it has no programme-bound achievements.
- Programvareutvikling checkpoints and retries follow the owner rules its content carries: K-4 (a module checkpoint clears, at level D and never S, only when every gating checkpoint task has a correct, unsupported, counting result; no averaging) and K-3 (a retry is a new attempt on the same task; success after failure reaches at most Practised from that task).
- Product boundary: learner state stays in the browser's IndexedDB and is never transmitted. No learner code is sent anywhere.

## Active work

**Epic E** (owner-authorized 2026-10-03; prompt `docs/post-release/pre-e/EPIC_E_AUTONOMOUS_PROMPT.md`, continued under the owner's continuation prompt of 2026-10-03), branch `programme/epic-e-programvareutvikling` from `34689e0`.

The non-final candidate `f33407f` (RED ancestor `98de895`) is historical. After it the branch adds the E-SCHEMA-1A record amendment (`31a87f0`), a second RED checkpoint (`12a1c45`) and the implementation of every owner decision of 2026-10-03: programme-scoped XP, Programvareutvikling lesson XP, content v2 as same-origin assets, interleaved lessons, contextual RPG lesson and checkpoint presentation, plain learner copy and the D-2 sentence, K-3 and K-4, the explicit first-run programme choice, the ProgressPal brand (OD-6), the packaged Python runtime, version 1.5.0, and a service-worker repair found by the offline end-to-end tests. The final candidate's identity, measurements and evidence are in its review package outside the tracked tree; Git is the identity authority.

No Epic E owner-decision pause remains open. The candidate awaits independent review and owner acceptance; `npm run verify:release` fails closed at the review binding until independent evidence exists, by design.

Backlog (recorded, not part of Epic E closure):

- **FAQ / help.** One shared FAQ source reachable from Settings and the relevant menu, covering: choosing and changing programme, XP and programme-specific levels, where progress is stored, offline behaviour, backup and restore, hints and retry, what ProgressPal can and cannot check outside the browser, reset and recovery, privacy and local storage, and reporting a problem. Deferred.
- **Report a problem.** A menu, Settings or help action that opens email through `mailto:`. **Destination address: TBD** (the owner has not supplied one; none is invented). Deferred.
- Programme-specific achievements for Programvareutvikling: none exist; any future work needs an owner decision.

## Release model

Validated before production (`docs/ci.md`).

- **Repository side:** the release gate resolves review evidence by its binding to the candidate's payload tree and fails closed otherwise; the workflow and the `Final candidate` check name are pinned by tests.
- **Platform side (active):** Vercel Deployment Check `Final candidate` (`chk_405a1c74-57c8-4f43-b2d8-ac38d03de6e7`) blocks `deployment-alias` for target `production`. The Pre-E promotion of `34689e0` passed through it (owner-reported).

## STOP conditions and next actions

- Epic E never pushes, merges, tags, deploys or writes review evidence for its own candidate. Its candidate is handed to independent and owner review with an evidence package outside the tracked tree.
- Next: independent review of the final Epic E candidate, then owner acceptance and an explicit release instruction. Push, merge, tag, release and deployment each need that instruction; any push to `master` is promoted to Production by Vercel.
- Do not begin C8, Epic F, Epic G or S1-M03+ without a new owner instruction.

## Document map

Current: this file, `AGENTS.md` (agent operating rules), `README.md`, `SECURITY.md`, `PRIVACY.md`, `docs/ci.md`, `docs/storage-safety.md`, `docs/post-release/pre-e/` (the live Epic E prompt and the Pre-E reports), the accepted schema contract `docs/post-release/epic-e/E_SCHEMA_CHANGE_DECISION_RECORD.md` (E-SCHEMA-1, implemented on the Epic E branch) and `docs/releases/backup-compatibility-matrix.md` (current-state note).

Historical evidence, retained unchanged: `docs/post-release/epic-a|b|c/`, `docs/rpg-v2/`, `docs/remediation/`, `docs/releases/` (apart from the compatibility matrix's current-state note), `docs/audits/`, `docs/archive/`, `docs/modules/`. Their "current state" lines describe the date they were written. The status-bearing files among them carry an insert-only banner pointing here; the rest are dated records and do not.
