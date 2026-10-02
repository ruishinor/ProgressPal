# ProgressPal current state

This is the single live execution-authority file for ProgressPal. Other status prose in older records is historical and carries a pointer back here. Authority order when sources conflict: latest explicit owner instruction, exact live Git/deployment state, later owner decisions in the repository, candidate-bound evidence, this file, then older records.

**Live identity is Git, not this file.** A file cannot name the commit that contains it. Read `git rev-parse HEAD`, `git rev-parse HEAD^{tree}` and the release manifest for the exact candidate. This file records the last independently accepted baseline, what has been added since and what is pending.

Last reconciled: 2026-10-02, on branch `maintenance/pre-e-hardening-source-fit`.

## Accepted baseline

| Item                      | Value                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------- |
| Last accepted `master`    | `95489ea0e08909054a4fa82120b28b131873d40c` (`feat: add reward moment notifications`)    |
| Root tree / `src` tree    | `5a100a524e5436458afef0ddb69eb975153ffb3f` / `67a3bc74a812fd9ff194bc8afdd0bdb75c32ae8e` |
| `origin/master`           | same commit when last read                                                              |
| GitHub Release validation | succeeded for that commit (run `36980240454`)                                           |
| Production (observed)     | Vercel `dpl_9iRR6M9WdKJruKhWDj8ftULvuGCn`, built from that commit, READY and aliased    |

Closed work, preserved and not to be reopened without a reproduced defect or a new owner instruction:

- Epic A (read safety), Epic B (shared contracts), Epic C C0–C7 (programme platform, ownership migration, multi-programme enrolment and switching; C7 merged as PR #42, `5cd1e8d`), Epic D (navigation and compact HUD; merged `f153f19`), and the CI timeout-budget repair (merged `5ffe8f5`).
- The reward-moment notification feature (`95489ea`) is accepted. The owner states it was independently reviewed extensively. The repository holds no review evidence bound to it; that gap was in the release gate, not in the review, and is repaired below.
- C8 (reusable presentation abstraction) is **conditional and not activated**. Epic F and Epic G have not started.

## Product facts

- Application version: `1.4.0` on the Pre-E candidate (`package.json` is authoritative; `1.3.0` on accepted `master` until the candidate is merged). It moves with application behaviour and is independent of the database.
- Database: IndexedDB `progresspal-cs50-edition`, **schema v3**. Neither value changes with the application version. No schema v4 is authorized.
- Offline cache identity moves with the package version by contract (`CACHE_VERSION` in `public/sw.js`, pinned by `tests/architecture/serviceWorker.test.ts`); its `progresspal-cache-` prefix is stable.
- Production programme registry: **`cs50x` only**, which is also the explicit default/bootstrap programme. Programvareutvikling is **not** registered and not integrated.
- Frozen product decisions: registration is not enrolment; enrolment and switching are explicit actions in Settings → Programme; XP, level, shared achievements, study sessions, Insights, profile and weekly target are learner-global; RPG is the primary experience and Classic is secondary.
- Product boundary: learner state stays in the browser's IndexedDB and is never transmitted. The app shell and official links use the network, so the app is local-first and offline-capable once loaded, not offline-only.

## Active work

1. **Pre-E hardening and source fit** (this branch): candidate-bound review evidence, validated-before-production release model, version identity, document reconciliation and a source-to-platform fit analysis of Programvareutvikling. Outputs are in `docs/post-release/pre-e/`. The candidate is **awaiting independent review**; nothing here has been merged, tagged, pushed to `master` or deployed.
2. **Epic E** (next): first real additional programme. Its refreshed autonomous prompt is `docs/post-release/pre-e/EPIC_E_AUTONOMOUS_PROMPT.md`. It starts only after the Pre-E candidate is independently reviewed and accepted, and it requires a separate owner instruction.

## Release model

Validated before production (`docs/ci.md`).

- **Repository side (done on the candidate):** the release gate resolves review evidence by its binding to the candidate's payload tree and fails closed otherwise; the workflow and the `Final candidate` check name are pinned by tests.
- **Platform side (not active):** Vercel Deployment Checks must require the `Final candidate` check. Until the owner performs that one dashboard step, Vercel still promotes every `master` push to Production without waiting for validation. Observed 2026-10-02: no checks configured. Record the activation date here when done.
- Without the platform step the state is `READY_FOR_RELEASE_GATE_ACTIVATION`, not "Production gated".

## STOP conditions and next actions

- Independent review of the Pre-E candidate, then owner acceptance. Do not merge, push to `master`, tag, promote or deploy before both.
- Activate Vercel Deployment Checks before the Pre-E candidate (or anything after it) is pushed to `master`, otherwise the new gate does not protect Production. Then follow the release sequence in `docs/ci.md`: independent review, an evidence-only commit, then promotion of that commit.
- Do not begin Epic E, C8, Epic F or Epic G without a new owner instruction.
- Epic E must stop at the gates in the refreshed prompt: schema v4, ownership change, backup-format change, cloud/auth, new conflict semantics, historical-state reinterpretation, a demonstrated C8 trigger, or missing authoritative source.
- Open owner decisions that Epic E must not invent: shell brand (OD-6), content licence and link hosts (OD-7), learner-facing language of the shared shell, and whether the instructional content layer is in Epic E.

## Document map

Current: this file, `AGENTS.md` (agent operating rules), `README.md`, `SECURITY.md`, `PRIVACY.md`, `docs/ci.md`, `docs/storage-safety.md`, `docs/post-release/pre-e/`.

Historical evidence, retained unchanged: `docs/post-release/epic-a|b|c/`, `docs/rpg-v2/`, `docs/remediation/`, `docs/releases/`, `docs/audits/`, `docs/archive/`, `docs/modules/`. Their "current state" lines describe the date they were written. The status-bearing files among them (readiness, handoff, spec, restart, roadmap, register and log files, and the three `stories.yaml`) carry an insert-only banner pointing here; the rest are dated records and do not.
