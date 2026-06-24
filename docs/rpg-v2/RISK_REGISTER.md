# ProgressPal RPG v2 — Risk Register

Status: active risk register  
Updated: 2026-06-24
Location in repo: `docs/rpg-v2/RISK_REGISTER.md`  
Scope: ProgressPal RPG v2 same-origin `/rpg/*` implementation

---

## 1. Purpose

This register tracks risks that could damage ProgressPal RPG v2 implementation, user trust, data safety, local-first behavior, maintainability, or release readiness.

Every module handoff should update this file when:

- a new risk is discovered;
- a risk changes status;
- a mitigation is completed;
- a blocker is accepted as deferred;
- a decision changes the risk profile.

---

## 2. Status values

Use these status labels:

```text
Open
Mitigated
Accepted v2 risk
Blocked
Closed
```

Definitions:

- **Open**: risk exists and still needs active mitigation.
- **Mitigated**: mitigation is in place but should remain monitored.
- **Accepted v2 risk**: consciously accepted for v2, not ignored.
- **Blocked**: risk prevents next module or release.
- **Closed**: no longer relevant.

---

## 3. Severity values

Use:

```text
Low
Medium
High
Critical
```

- **Low**: inconvenience or small documentation issue.
- **Medium**: could slow implementation or confuse users.
- **High**: could break trust, validation, accessibility, or classic fallback.
- **Critical**: could corrupt user data, weaken privacy/local-only guarantees, or create serious legal/branding risk.

---

## 4. Starter risk table

| ID    | Risk                                                  | Trigger                                                                                       | Impact                                                                                                                                                                | Severity | Mitigation                                                                                                                        | Owner/module          | Status           | Notes                                                                                                                                |
| ----- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| R-001 | Existing IndexedDB data is corrupted by RPG writes    | RPG layer bypasses existing domain commands                                                   | User data loss; trust failure                                                                                                                                         | Critical | No direct DB access; pre/post DB snapshot tests; use existing domain commands only                                                | RPG-01 onward         | Open             | Hard blocker if violated.                                                                                                            |
| R-002 | Classic UI breaks while adding RPG routes             | Shared router/styles accidentally affect classic routes                                       | v1 fallback becomes unreliable                                                                                                                                        | High     | Classic route smoke tests; visual regression pass; scoped RPG styles                                                              | RPG-02 onward         | Open             | Classic must remain fallback.                                                                                                        |
| R-003 | RPG assets bloat bundle                               | Too many large images added eagerly                                                           | Slow load; worse offline behavior                                                                                                                                     | High     | Asset budget; optimize; route-load; ledger gate                                                                                   | RPG-14                | Open             | Candidate library is >300 MB uncompressed.                                                                                           |
| R-004 | CS50/Harvard branding misuse                          | App uses official-looking names, marks, badges, or visual identity                            | Legal/trust risk                                                                                                                                                      | Critical | D-0048; copy review; asset review; no official marks                                                                              | All modules           | Open             | Default guild is Code Knights.                                                                                                       |
| R-005 | Fake RPG mechanics creep in                           | Energy/class/guild/rank added without source data                                             | Product dishonesty                                                                                                                                                    | High     | RPG term map; formula registry; Scope Discipline Check                                                                            | All modules           | Open             | Especially watch Hub/Hero.                                                                                                           |
| R-006 | Local-first boundary is weakened                      | External scripts/assets/background requests introduced                                        | Privacy/offline regression                                                                                                                                            | Critical | Local-only guard remains hard blocker; user-clicked links only                                                                    | All modules           | Open             | No runtime network behavior except links.                                                                                            |
| R-007 | User loses data from browser storage clearing         | Browser clears site data/storage pressure/manual deletion                                     | Local records lost                                                                                                                                                    | High     | Backup UI/FAQ; encourage export; future optional sync decision                                                                    | RPG-13                | Accepted v2 risk | Real concern, not v2 priority.                                                                                                       |
| R-008 | Study Resource looks like fake embedded media         | Still image mimics player UI too closely                                                      | Misleading UX                                                                                                                                                         | Medium   | Resource-card design; no fake play/scrubber/transcript UI                                                                         | RPG-07                | Open             | Keep copy honest.                                                                                                                    |
| R-009 | Route splitting causes offline chunk failure          | RPG route code/assets unavailable after cached load                                           | Broken offline UX                                                                                                                                                     | High     | Offline E2E; conservative code-splitting; verify after build                                                                      | RPG-02 onward         | Open             | Balance bundle size and offline reliability.                                                                                         |
| R-010 | Rank is confused with official course status          | Rank copy omits local-progress framing                                                        | Misleading claim                                                                                                                                                      | High     | “Local ProgressPal progress” copy; FAQ disclaimer                                                                                 | RPG-10/RPG-13         | Open             | Do not use “Master.”                                                                                                                 |
| R-011 | AI/code agent overbuilds beyond the module            | Agent adds unrequested dependencies, abstractions, routes, assets, or refactors               | Scope creep; larger bundle; broken classic UI                                                                                                                         | High     | D-0059; Scope Discipline Check; revert unrelated changes                                                                          | All modules           | Open             | Expected failure mode.                                                                                                               |
| R-012 | Old root docs mislead implementers                    | Older v1 docs remain in root with authoritative names                                         | Wrong plan followed                                                                                                                                                   | High     | Archive stale docs under `docs/archive/engine-v1/` during RPG-00                                                                  | RPG-00                | Open             | Classify by content, not name alone.                                                                                                 |
| R-013 | Asset library is imported wholesale                   | Developer treats ZIP as app-ready production assets                                           | Massive bundle; visual inconsistency                                                                                                                                  | High     | Candidate-only rule; `ASSETS.md`; budget                                                                                          | RPG-14                | Open             | Do not import categories wholesale.                                                                                                  |
| R-014 | BMAD artifact expectations cause false blockers       | Empty BMAD folders treated as required governance                                             | Process confusion                                                                                                                                                     | Medium   | Roadmap is accepted planning artifact unless BMAD governance is explicitly chosen                                                 | RPG-00                | Open             | BMAD useful for review, not required folder system.                                                                                  |
| R-015 | Validation baseline is unclear                        | RPG work starts before clean baseline                                                         | Later bugs cannot be attributed                                                                                                                                       | High     | RPG-00 baseline gate; record exact outputs                                                                                        | RPG-00                | Open             | Stop if validation fails.                                                                                                            |
| R-016 | Root `DECISIONS.md` deletion is mishandled            | Agent restores or depends on deleted file                                                     | Source-of-truth drift                                                                                                                                                 | Medium   | Use `docs/rpg-v2/DECISIONS-rpg-v2.md`; document deletion reconciliation                                                           | RPG-00                | Open             | Deletion was intentional.                                                                                                            |
| R-017 | Study Resource link behavior weakens local-only guard | Link implementation loads external content silently                                           | Privacy/offline regression                                                                                                                                            | Critical | Normal user-clicked links only; no remote embeds/assets/scripts                                                                   | RPG-07                | Open             | External resources open outside app flow.                                                                                            |
| R-018 | Accessibility degrades due to RPG visuals             | Low contrast, glow, tiny text, color-only status                                              | Usability failure                                                                                                                                                     | High     | Axe checks; contrast checks; visible focus; DOM text                                                                              | RPG-03 onward         | Open             | Visual style must not win over readability.                                                                                          |
| R-019 | Read-only routes mutate data                          | Page render triggers XP, achievement, progress, or metadata writes                            | Data trust failure                                                                                                                                                    | Critical | Pre/post DB snapshot tests; explicit-write rule                                                                                   | RPG-01 onward         | Open             | Passive mutation is a blocker.                                                                                                       |
| R-020 | Excessive abstraction before slice proof              | Broad RPG services/models built before Week-4 path                                            | Complexity and drift                                                                                                                                                  | Medium   | Minimum slice read models only; defer broad models                                                                                | RPG-01                | Open             | RPG-01 must stay narrow.                                                                                                             |
| R-021 | Formal workflow is half-invoked                       | Agent starts BMAD or another formal process, then skips required checkpoints                  | False governance evidence; process confusion                                                                                                                          | Medium   | Explicit work mode; formal BMAD only if project owner opts in                                                                     | All modules           | Open             | Use roadmap acceptance audit unless BMAD is chosen.                                                                                  |
| R-022 | Source-of-truth inconsistency is carried forward      | Roadmap, decisions, validation log, or handoff disagree and are not reconciled                | Wrong route/API/workflow followed                                                                                                                                     | High     | Source-of-truth reconciliation gate before commit                                                                                 | All modules           | Open             | Example: route list drift such as missing settings.                                                                                  |
| R-023 | Uncommitted work is reported as complete              | Agent says module is complete while changes remain only in working tree                       | Lost evidence; bad handoff; hard-to-review PR                                                                                                                         | High     | Completion requires committed implementation, handoff, validation, and clean state                                                | All modules           | Open             | `implemented locally` is not `complete`.                                                                                             |
| R-024 | Excess validation becomes default ritual              | Agent runs three full validation passes for every normal module                               | Wasted time; hides real acceptance criteria                                                                                                                           | Medium   | Proportional validation cadence in D-0067 and VALIDATION_LOG                                                                      | All modules           | Open             | Three passes reserved for major gates or flakiness.                                                                                  |
| R-025 | Warnings are seen but not classified                  | Command emits warning and agent calls state clean without triage                              | False clean state; missed environment issue                                                                                                                           | Medium   | Warning/anomaly classification template in VALIDATION_LOG                                                                         | All modules           | Open             | Includes git permission warnings and build warnings.                                                                                 |
| R-026 | Post-2G state is falsely treated as release-ready     | Current-state docs are updated but post-2G release-candidate validation has not been recorded | Premature release or broad feature work before validating classic/RPG regressions, backup/export/import/reset, offline behavior, accessibility/layout, and stale copy | High     | Current-state sections now route agents toward post-2G release-candidate validation; keep monitored until RC evidence is recorded | Post-2G RC validation | Open             | Current-state docs block the most likely misread, but this remains monitored until post-2G release-candidate validation is recorded. |

---

## 5. Module risk review checklist

At the end of each module, answer:

```text
1. What work mode was used: acceptance audit, corrective patch, or next-module implementation?
2. Did this module introduce any new risk?
3. Did this module change severity of an existing risk?
4. Did this module mitigate any risk?
5. Did this module accept any risk for v2?
6. Were roadmap/decision/validation/handoff inconsistencies found and reconciled?
7. Were warnings or anomalies emitted, and how were they classified?
8. Is the implementation and evidence committed, or only implemented locally?
9. Does any open risk block the next module?
```

Record the answer in the module handoff and update this file if needed.

---

## 6. Blocker rules

A risk becomes a blocker if it involves:

- possible user data corruption;
- schema change without decision;
- weakened local-first guard;
- runtime network behavior beyond user-clicked links;
- CS50/Harvard branding misuse;
- broken backup/import/reset;
- classic fallback route regression;
- unledgered asset use;
- validation failure not understood;
- source-of-truth inconsistency not reconciled;
- uncommitted work reported as complete;
- formal workflow falsely claimed complete;
- warning or anomaly ignored while claiming clean state;
- hidden overbuild in the diff.

Do not proceed to the next module until blockers are resolved or explicitly accepted by the project owner.

---

## 7. Accepted v2 risks

### R-007 — IndexedDB data loss from browser clearing

Accepted for v2 because ProgressPal remains local-first and account-free. Browser site data can be cleared by user action, browser settings, storage pressure, or system cleanup.

v2 mitigation:

- keep backup/export visible;
- explain risk in Settings/FAQ;
- encourage periodic export;
- do not add cloud sync in v2.

Future consideration:

- optional encrypted backup/sync may be valuable later, but that requires a separate privacy, security, sync, and product decision.

---

## 8. Risk update log

| Date       | Module                | Update                                                                                                             |
| ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 2026-06-20 | RPG-00 planning       | Initial risk register created.                                                                                     |
| 2026-06-21 | Process hardening     | Added workflow-mode, source-reconciliation, commit-evidence, validation-cadence, and warning-classification risks. |
| 2026-06-23 | Phase 0 freeze        | Added R-026 to prevent the tracker proof from being treated as completed RPG v2.                                   |
| 2026-06-24 | Shell 2G status audit | Updated R-026 after Phase 2C-2G merged; next step is post-2G release-candidate validation.                         |

## Risk: avatar preview controls no longer affect visual output

Status: Accepted temporary debt.

Context:

RPG-01b replaced the generated SVG avatar with a bundled character portrait. The existing profile form still exposes face shape, hair, and top color controls, but those controls no longer change the visible avatar preview.

Risk:

Users may assume those controls customize the character portrait when they currently only persist local profile configuration.

Mitigation:

- Copy now says the character preview uses a bundled local asset.
- No schema/storage changes were made.
- A later profile/character module should either remove these controls, relabel them as saved character preferences, or reintroduce real character customization.

Owner/follow-up:

RPG profile/character customization module, not RPG-02 route shell.

## Risk: inline avatar asset increases main bundle size

Status: Mitigated for now.

Context:

The avatar is embedded as a generated data URL to preserve offline navigation without adding service-worker complexity.

Mitigation:

- Source PNG was resized before generating `characterProfileAsset.ts`.
- Full validation passed after the change.
- Build output should be monitored if additional inline assets are introduced.

Rule:

Do not inline additional large visual assets without explicit size review.
