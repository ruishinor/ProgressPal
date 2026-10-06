# ProgressPal current state

This is the single live execution-authority file for ProgressPal. Other status prose in older records is historical and carries a pointer back here. Authority order when sources conflict: latest explicit owner instruction, exact live Git/deployment state, later owner decisions in the repository, candidate-bound evidence, this file, then older records. For Programme #2 content and scope, the protected Programvareutvikling workspace authority (`00_CONTROL`, OD-P2-32, and `05_OUTPUT/21_PRODUCT_SCOPE_RECOVERY_AND_INTEGRATION_READINESS/`) ranks above the derived Pre-E reports in `docs/post-release/pre-e/`, which interpret it and never override it.

**Live identity is Git, not this file.** A file cannot name the commit that contains it. Read `git rev-parse HEAD`, `git rev-parse HEAD^{tree}` and the release manifest for the exact candidate. This file records the last released baseline, what has been added since and what is pending.

Last reconciled: 2026-10-06 (learner-feedback successor). Production is v1.7.0 at `3241c741b7a29131e3433dcf9e743d93f3f8ff38`, tree `73c9402d774a37a0fe3c0797b79fc1d894e4b7b8`. The local v1.7.1 successor is not published; publication is authorized by the current owner instruction only after exact-candidate independent review, source reproduction and the authoritative release gate pass.

## Historical release closure: v1.5.1

| Item                      | Value                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `master`                  | `5cc4c85187ab0dd597d8ad5941d76a5e7162027f` (`docs: correct v1.5.1 review payload reference`), equal to `origin/master` on 2026-10-04                                |
| Root tree / `src` tree    | `ef80b15087d116eacde5a99cb2b3372ab7b29d6a` / `2e2401a5a79d068e7e46e1e81b526987e2f5b98e`                                                                             |
| Review binding            | payload tree `6934232c6f00f3a1264077baf0ca5c0dbd152f0f`, bound by `docs/release-reviews/epic-e-v1-5-1-hotfix.json`                                                  |
| GitHub Release validation | run `37205764872`, job `111446507065` (`Final candidate`), succeeded. Job 27 m 42 s of its 30-minute ceiling: unit and integration 9 m 52 s, end-to-end 15 m 48 s   |
| Production                | Vercel `dpl_857MQtJ26ppSRVZZ5jays5nQ1kSo` from that commit, alias `progress-pal-seven.vercel.app` (owner-confirmed and independently platform-verified, 2026-10-04) |
| Release                   | annotated tag `v1.5.1` (tag object `1c3a3f56e4cdf8bec6d4e35e625d9b81f1927b17`) on that commit, and GitHub Release "ProgressPal v1.5.1" (Latest)                     |

`v1.5.0` (`ac0d7c8`) is immutable historical release-candidate evidence: its hosted release validation failed, and v1.5.1 supersedes it. Never move, recreate or delete that tag or its release.

Closed work, preserved and not to be reopened without a reproduced defect or a new owner instruction:

- Epic A (read safety), Epic B (shared contracts), Epic C C0–C7 (programme platform, ownership migration, multi-programme enrolment and switching), Epic D (navigation and compact HUD), the CI timeout-budget repairs, the reward-moment notification feature and **Pre-E** (hardening, source fit, E-SCHEMA-1 acceptance).
- **Epic E** (Programvareutvikling, schema v4, programme-scoped XP, packaged content and Python runtime), released as v1.5.1 together with the lesson-code keyboard fix, the release-version and cache-identity coherence fix, and the hosted timeout hierarchy of 20/21/22 minutes (Playwright global, managed end-to-end wrapper, release command). Prose in `docs/post-release/` that describes a branch, a candidate or "not promoted" describes the time it was written.
- C8 (reusable presentation abstraction) is **conditional and not activated**. Epic F and Epic G have not started.

## Product facts (Production v1.7.0 and local successor)

- Application version: `1.7.0` in Production; `1.7.1` on the local learner-feedback successor candidate (`package.json` is authoritative). The version moves with application behaviour and is independent of the database.
- Database: IndexedDB `progresspal-cs50-edition`, **schema v4**, exactly as the accepted record `docs/post-release/epic-e/E_SCHEMA_CHANGE_DECISION_RECORD.md` (E-SCHEMA-1, amended by E-SCHEMA-1A in section 13) specifies: Dexie native version 40, the append-only `learner_evidence` store and the mutable `lesson_positions` store, every XP row owned by exactly one programme, an additive live v3 → v4 upgrade (v2 devices upgrade through v3), the database name unchanged, and mastery derived, never stored.
- Offline cache identity moves with the package version by contract (`CACHE_VERSION` in `public/sw.js`, pinned by `tests/architecture/serviceWorker.test.ts`); its `progresspal-cache-` prefix is stable. The service worker caches the boot set, the fixed static files and the listed programme content at install, and each listed Python runtime file the first time it is used online.
- Programme registry: **`cs50x`** (the explicit default) and **`programvareutvikling`**. A fresh learner explicitly chooses the starting programme during onboarding (nothing preselected); existing and restored learners are never re-prompted. Enrolling in or switching to the other programme stays in Settings → Programme.
- Programme content language: CS50x stays English. Programvareutvikling ships its authored BokmÃ¥l; the local successor uses content v3 from source SHA-256 `4334588câ€¦`. The v3 change is the bounded learner-feedback correction tranche: filename-extension/type wording, `ls`/`dir`, text-frame explanation, exact-output presentation, command near-miss feedback, and duplicated answer-format cleanup. Code, commands, identifiers and technical terms stay English.
- Shell brand: CS50 shows "ProgressPal CS50 Edition"; Programvareutvikling and the first run before a programme is chosen show "ProgressPal" (OD-6).
- Programme content storage: lesson bodies, the programme index and evaluator data are versioned, content-addressed same-origin assets under `public/content/`, verified by SHA-256 against a small bundled catalogue; they ship with the build and are not remote course data.
- Executable evaluation: a pinned Pyodide 314.0.7 runtime (CPython 3.14) is packaged under `runtime/pyodide-314.0.7/` and runs learner programs in a dedicated worker without network or storage access; the production CSP adds only `'wasm-unsafe-eval'` to `script-src`. Learner code never leaves the browser. The boundary is the empty `jsglobals` object plus the capabilities the worker removes after loading, not the `sys.modules` import sentinels; `e2e/python-worker-isolation.spec.ts` proves it against the packaged worker under the production CSP.
- Backup baseline: the supported baseline is the **native schema-4 export**, which carries XP ownership. Exported backups from schema 3 or earlier are refused clearly before any write (schema record section 7; `docs/releases/backup-compatibility-matrix.md`). Live databases upgrade in place.
- Frozen product decisions: registration is not enrolment; RPG is the primary experience and Classic is secondary. **XP and level are per programme** (E-SCHEMA-1A): switching never moves XP. Shared achievements, study sessions, Insights, profile and weekly target stay learner-global. Production v1.7.0 includes the seven Programvareutvikling programme-bound achievements; the local v1.7.1 candidate rebinds those unchanged achievement rules to content version 3.
- Programvareutvikling checkpoints and retries follow the owner rules its content carries: K-4 (a module checkpoint clears, at level D and never S, only when every gating checkpoint task has a correct, unsupported, counting result; no averaging) and K-3 (a retry is a new attempt on the same task; success after failure reaches at most Practised from that task).
- Product boundary: learner state stays in the browser's IndexedDB and is never transmitted. No learner code is sent anywhere.

## Historical PWA implementation record (now released)

The following candidate-lineage record describes the earlier PWA tranche, already included in the v1.7.0 production baseline. Its branch-specific pending actions are historical.

**Installable PWA** (owner instruction 2026-10-04, roadmap: v1.5.1 closure → PWA installability → Epic F data-lifecycle/cloud architecture → Epic G cloud implementation), branch `feat/pwa-installability` from `5cc4c85`, application version `1.6.0`.

Scope: installability and offline-client hardening only. A web app manifest with a stable root identity, standalone display and install icons generated from the existing character artwork; iOS touch icon and title; the install files in the existing service worker's explicit precache. No new dependency or service-worker framework, no schema or learner-data change, and no viewport, layout or browser-mode change. Out of scope: notifications, background sync, cloud, auth, native wrappers or stores, install-promotion UI. Design, decisions, platform caveats and evidence: `docs/pwa.md`.

Status and candidate lineage (owner sequencing, 2026-10-04):

1. `86aebad` is the **product-bearing parent**: version identity (`2fa591d`), the PWA implementation (`0cfe4a6`) and this file's first reconciliation. The complete local product regression ran on that exact commit (tree `546c9f33c6d3fdecc3ef9fcff46b1cf2ed13b7cd`, clean before and after): `npm ci`, release-gate unit tests, lint, format check, typecheck, build, bundle budget, 132/132 unit and integration files with 1997/1997 tests, 146/146 end-to-end tests, circular check and audit (0 vulnerabilities), all exit 0 with no skip, retry or warning. `verify:release` was not run, because it fails closed without independent review evidence, by design. The implementer never writes that evidence.
2. `86aebad` is not the final candidate. Two non-product deltas follow it: `0b4d1c4` raises only the GitHub `Final candidate` job ceiling from 30 to 40 minutes (owner decision; the 20/21/22-minute inner hierarchy is unchanged), and the commit containing this text corrects documentation (`docs/ci.md` timeout ladder, this file). Each had only directly invalidated cheap validation, not a repeat of the product regression.
3. Candidate and release identity are established by Git plus candidate-bound review evidence. This file does not claim hosted results for unpublished work.

Open owner decision carried by the tranche: ProgressPal has no logo, so the install icons reuse the shipped character artwork. A dedicated product mark is a branding decision; replacing the icon is a one-input change to `scripts/generate-pwa-icons.mjs`.

## Active work

**Production baseline v1.7.0.** Production is commit `3241c741b7a29131e3433dcf9e743d93f3f8ff38`. It includes the navigation/IA consolidation, selectable avatars and the seven evidence-backed Programvareutvikling achievements. Exact Git/deployment identity outranks older candidate prose.

**Learner-feedback successor v1.7.1 (local candidate, not published).** Bounded corrections only: shared lesson readability/semantics, copy affordances, `Fortsett` continuation behavior, completion/XP clarification, the Home glyph, and Programvareutvikling content v3. No database schema, cloud, CSP, service-worker fetch-policy or broad lesson-flow redesign is included.

Backlog (recorded, not part of this tranche):

- **FAQ / help.** One shared FAQ source reachable from Settings and the relevant menu, covering: choosing and changing programme, XP and programme-specific levels, where progress is stored, offline behaviour and installation, backup and restore, hints and retry, what ProgressPal can and cannot check outside the browser, reset and recovery, privacy and local storage, and reporting a problem. Deferred.
- **Report a problem.** A menu, Settings or help action that opens email through `mailto:`. **Destination address: TBD** (the owner has not supplied one; none is invented). Deferred.
- Further programme-specific achievements for Programvareutvikling beyond the seven already in production still need an owner decision.
- **Shell/UI localization and a language selector; translated curriculum variants.** Deferred. Invariant for any future language work: changing the UI language must not reset or alter learner progress, XP, evidence, attempts, lesson position, enrolment or programme state. A translated curriculum variant is a different content identity and needs a separate, explicit decision on identity and on whether evidence is shared between variants.
- **Programme-owned or localized rank vocabulary** (for example a future "Lærling"). Deferred; the shared rank engine stays as is until then.
- **Avatar customization beyond the fixed choices.** Deferred. Selecting one of the four fixed avatars is already in production; free-form customization is not.
- **Drag-and-drop sorting.** Deferred. Prefer a live "Din rekkefølge" preview or an accessible reorder interaction before adopting drag and drop.
- **Programme-selective reset.** Desired concept: reset one programme's progress without touching another's. Not implemented until the ownership of programme-owned versus learner-global data (sessions, achievements, Insights, profile) is explicitly defined.
- **Neutral or RPG-styled onboarding shell.** Deferred redesign of the first run.
- **Programme-specific Focus mechanics.** Deferred. The shared study-session engine stays; only programme and contextual presentation may differ unless future evidence establishes a separate mechanic.

## Release model

Validated before production (`docs/ci.md`).

- **Repository side:** the release gate resolves review evidence by its binding to the candidate's payload tree and fails closed otherwise; the workflow and the `Final candidate` check name are pinned by tests.
- **Platform side (active):** Vercel Deployment Check `Final candidate` (`chk_405a1c74-57c8-4f43-b2d8-ac38d03de6e7`) blocks `deployment-alias` for target `production`. The v1.5.1 promotion of `5cc4c85` passed through it.
- **Hosted headroom:** the v1.5.1 hosted release passed in 27 m 42 s against its 30-minute GitHub job ceiling, leaving only 2 m 18 s (about 7.7 %) of headroom. Owner decision 2026-10-04: the `Final candidate` job ceiling is 40 minutes from `feat/pwa-installability` onwards (now included in `master`), as an outer safety envelope, not a runtime target. The nested limits stay at 20 / 21 / 22 minutes (Playwright global, managed end-to-end wrapper, release command). CI performance work (duplicate installs, serialisation, sharding) is separate maintenance, not part of this tranche.

## STOP conditions and next actions

- The implementation context must not author its own independent-review verdict. The current owner instruction authorizes this v1.7.1 publication only after the frozen candidate passes independent review, candidate-bound review evidence is valid, canonical authoring source reproduces the reviewed pilot and the authoritative release gate passes. No force push, forced promotion or weakened gate is authorized.
- Next: independent review of the exact frozen v1.7.1 learner-feedback candidate before any push, merge, tag or production promotion.
- Do not begin C8, Epic F, Epic G or S1-M03+ without a new owner instruction. Installation must not be described as cloud-backed or as protection against storage clearing.

## Document map

Current: this file, `AGENTS.md` (agent operating rules), `README.md`, `SECURITY.md`, `PRIVACY.md`, `docs/ci.md`, `docs/storage-safety.md`, `docs/pwa.md` (installable PWA), `docs/post-release/pre-e/` (the Pre-E reports), the accepted schema contract `docs/post-release/epic-e/E_SCHEMA_CHANGE_DECISION_RECORD.md` (E-SCHEMA-1) and `docs/releases/backup-compatibility-matrix.md` (current-state note).

Historical evidence, retained unchanged: `docs/post-release/epic-a|b|c/`, `docs/rpg-v2/`, `docs/remediation/`, `docs/releases/` (apart from the compatibility matrix's current-state note), `docs/audits/`, `docs/archive/`, `docs/modules/`. Their "current state" lines describe the date they were written. The status-bearing files among them carry an insert-only banner pointing here; the rest are dated records and do not.
