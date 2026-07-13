# ProgressPal RPG v2 Validation Log

Status: active validation and evidence log  
Created: 2026-06-20  
Updated: 2026-06-24
Scope: ProgressPal RPG v2 only  
Recommended repo path: `docs/rpg-v2/VALIDATION_LOG.md`  
Related files: `docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md`, `docs/rpg-v2/DECISIONS-rpg-v2.md`, `docs/rpg-v2/modules/*.md`, `docs/rpg-v2/ASSETS.md`, `docs/rpg-v2/RISK_REGISTER.md`

## 2026-06-23 Phase 0 freeze classification

The current app is being frozen as:

```text
ProgressPal CS50 Edition v1.2 - local-first CS50 tracker proof with gamified elements
```

Recommended tag:

```text
v1.2.0-local-first-proof
```

This validation log contains historical RPG module evidence, including RPG-15 release-candidate validation. That evidence should not be read as proof that the full RPG v2 shell is complete. For this freeze, the current build is the local-first CS50 tracker proof. The future RPG shell transformation sentence was June 23 freeze framing; for current post-2G work, use the June 24 current-state section below.

Release note:

```text
docs/releases/v1.2.0-local-first-proof.md
```

## 2026-06-24 current state after RPG Shell Phase 2G

Audit mode: Mode B - documentation/status audit only.

Current master evidence observed for this audit:

- `git log -1 --oneline`: `e3246e7 Merge pull request #37 from ruishinor/rpg/shell-02g-insights-cleanup`
- Audit branch: `docs/rpg-v2-status-audit`
- `git diff --name-status` before documentation edits: no output

Wrapper remediation evidence from phase handoffs:

| Phase | Route/capability          | Status supported by handoff                                                                                 | Handoff evidence                               |
| ----- | ------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 2C    | `/rpg/focus`              | Complete and merged as a classic-wrapped Focus/session capability.                                          | `docs/rpg-v2/modules/RPG-SHELL-02C-HANDOFF.md` |
| 2D    | `/rpg/badges`             | Complete and merged as a classic-wrapped Achievements capability.                                           | `docs/rpg-v2/modules/RPG-SHELL-02D-HANDOFF.md` |
| 2E    | `/rpg/log`                | Complete and merged as a classic-wrapped Insights capability.                                               | `docs/rpg-v2/modules/RPG-SHELL-02E-HANDOFF.md` |
| 2F    | `/rpg/settings`           | Complete and merged as a classic-wrapped Settings/data-controls capability.                                 | `docs/rpg-v2/modules/RPG-SHELL-02F-HANDOFF.md` |
| 2G    | stale Journey Log cleanup | Complete and merged; no production route/component should consume the removed Journey Log read model/types. | `docs/rpg-v2/modules/RPG-SHELL-02G-HANDOFF.md` |

Validation interpretation:

- The Phase 2C-2G handoffs record targeted validation for each corrective patch. They are accepted as evidence that the wrapper remediation phases were completed and merged.
- The earlier RPG-15 release-candidate evidence predates Phase 2C-2G and must not be treated as final release-candidate evidence for current master `e3246e7`.
- No current source-of-truth status should describe 2C, 2D, 2E, 2F, or 2G as pending.
- The next validation gate is release-candidate validation against the post-2G state. If that gate finds a concrete blocker, the next work should be a narrowly scoped blocker fix.

### Phase 0 freeze validation - 2026-06-23

Branch: `rpg/v2`
Head at inspection: `8254ae2 Merge pull request #24 from ruishinor/rpg/15-release-candidate`

Results:

| Command                           | Status            | Output summary / failure                                                                                                                |
| --------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `git status -sb`                  | pass with warning | Branch `rpg/v2...origin/rpg/v2`; new roadmap doc initially untracked; Git emitted the existing global-ignore permission warning.        |
| `git branch --show-current`       | pass              | `rpg/v2`.                                                                                                                               |
| `git log --oneline --decorate -8` | pass              | Head was RPG-15 merge `8254ae2`; recent history included RPG-14 and RPG-13 merges.                                                      |
| `git diff --check`                | pass after fix    | Initial check flagged trailing whitespace on new `Updated:` metadata lines; after correction, no whitespace errors remained.            |
| `npm run lint`                    | pass              | ESLint completed with `--max-warnings 0`.                                                                                               |
| `npm run typecheck`               | pass after rerun  | Initial sandbox run failed with `EPERM` writing `node_modules/.tmp/tsconfig.node.tsbuildinfo`; rerun with filesystem escalation passed. |
| `npm run build`                   | pass after rerun  | Initial sandbox run failed with `EPERM` writing `node_modules/.vite-temp/...`; rerun with filesystem escalation passed.                 |
| `npm run format:check`            | pass              | Prettier reported all matched files use Prettier code style.                                                                            |
| `npm run check:circular`          | pass              | `dpdm` found no circular dependencies across 161 analyzed files.                                                                        |
| `npm run audit`                   | pass              | Rerun with network escalation; `npm audit --audit-level=moderate` found 0 vulnerabilities.                                              |
| `npm run test`                    | pass              | Rerun with filesystem escalation; 37 test files passed, 311 tests passed.                                                               |

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. Repo-local status and diffs remained readable.
- Git diff/status commands emitted LF/CRLF replacement notices. Classification: environment/line-ending notice. `git diff --check` passed after the metadata whitespace fix.
- Initial sandboxed `npm run typecheck` and `npm run build` attempts failed on writes under `node_modules`. Classification: sandbox filesystem limitation. Action: reran with filesystem escalation; both commands passed.
- `npm run audit` required network escalation. Classification: expected network requirement for npm advisory lookup. Result: 0 vulnerabilities.

Adversarial review:

- The main product risk was false classification: treating the current app as completed RPG v2 would likely drive the next phase toward more tracker-panel expansion instead of the missing shell transformation.
- The freeze docs now identify the current state as `v1.2.0-local-first-proof` and explicitly defer Hero HUD, collapsed panels, quest-first loop, reward feedback, asset foundation, and campaign-map redesign.
- No runtime, package, schema, backend, sync, telemetry, analytics, AI, or asset changes were introduced.

Retrospective:

- RPG-15 evidence is still useful, but its wording could be overread as RPG v2 completion. The correct interpretation is narrower: it validated coexistence and local-first release readiness for the tracker proof.
- The highest-leverage Phase 0 change was not more validation or feature work; it was correcting the source-of-truth framing before the next branch starts.

## 0. Purpose

This file records validation evidence for RPG v2. It is not a place for optimistic summaries. It is where the project records what was actually checked, what passed, what failed, what was not run, and what still blocks implementation.

This file starts before RPG-00 implementation. It must not claim clean validation until commands have been run locally in the repository and the results are recorded.

## 1. Validation status labels

Use these exact labels:

```text
clean       = all required checks for this gate passed with no unresolved warnings, flags, or exceptions
partial     = some checks passed but one or more required checks were not run or could not complete
blocked     = one or more required checks failed or the repo/source-of-truth state prevents safe progress
not-run     = check has not been run
n/a         = check is not applicable to this module, with reason recorded
```

Do not use `clean` if:

```text
working tree is dirty without explanation
required file is missing
npm audit could not run
known warnings are ignored
network failure prevented a required check
only a subset of required tests ran
classic regression was skipped
asset ledger is missing for added assets
module handoff file is missing
```

## 2. Gate standards

### 2.1 RPG-00 baseline gate

RPG-00 is a reconciliation and documentation baseline. It must not change runtime code or package files.

RPG-00 requires:

```text
three consecutive clean full-validation passes, if the environment supports all checks
```

If a network-dependent check such as `npm audit` cannot run, RPG-00 is `partial`, not `clean`, until audit is completed.

RPG-00 must not edit:

```text
src/*
package.json
package-lock.json
vite config
service worker
IndexedDB schema
route definitions
runtime CSS
runtime assets
validation config
```

RPG-00 may create or edit only documentation and evidence files, unless the user explicitly approves otherwise:

```text
docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
docs/rpg-v2/DECISIONS-rpg-v2.md
docs/rpg-v2/VALIDATION_LOG.md
docs/rpg-v2/ASSETS.md
docs/rpg-v2/RISK_REGISTER.md
docs/rpg-v2/modules/RPG-00-HANDOFF.md
```

### 2.2 Validation cadence by work type

Do not use three full validation passes as the default for every module. Validation cadence is proportional to risk.

```text
Normal module:
- targeted tests during development;
- one clean full `npm run validate` after final changes.

Corrective patch after a failed or partial module:
- targeted tests for the corrected gap;
- one clean full `npm run validate` after final changes;
- optionally two additional full validation passes only if the prior failure was flaky, environment-sensitive, or repeatedly reproduced.

Major gates:
- RPG-00 baseline: three consecutive clean full-validation passes, if the environment supports them.
- RPG-09 Week-4 vertical slice: three consecutive clean full-validation passes, if the environment supports them.
- RPG-15 release candidate: three consecutive clean full-validation passes, if the environment supports them.
```

A validation pass only validates the file state that existed when it ran. If files change after validation, rerun the required cadence for the final state.

### 2.3 Normal module gate

Normal implementation modules require:

```text
targeted tests for changed behavior during development
one clean full-validation pass after final changes
no ignored warnings
no unresolved audit issues
no missing handoff file
no missing Scope Discipline Check
source-of-truth reconciliation completed
warnings and anomalies classified
```

Flaky tests are defects. If a test is flaky, record it, investigate it, and rerun only after the cause is understood. Do not treat repeated reruns until green as evidence of correctness.

### 2.4 Corrective patch gate

Corrective patches after a failed, partial, or over-scoped module require:

```text
targeted tests for the corrected acceptance gap
one clean full-validation pass after final changes
updated handoff explaining what was corrected
updated validation log if evidence changed
updated risk register if risk changed
```

Run two additional full validation passes only when there is a concrete reason:

```text
prior failure was flaky
prior failure was environment-sensitive
prior failure was repeatedly reproduced
major gate confidence is being established
project owner explicitly requests extra confirmation
```

Do not use extra validation passes to compensate for unclear acceptance criteria, unclassified warnings, or uncommitted work.

### 2.5 Week-4 vertical slice integration gate

The first vertical slice gate requires:

```text
three consecutive clean full-validation passes
```

Required path:

```text
Hub -> Map -> Week 4 -> Study Resource -> save local progress -> Focus Session -> return to Hub
```

The slice gate must happen before profile, badge gallery, journey log, broad visual polish, or large asset work expands the surface.

### 2.6 Release candidate gate

The release candidate gate requires:

```text
three consecutive clean full-validation passes
```

Release candidate must also include:

```text
classic route regression
RPG route regression
backup/export/import/reset validation
offline cold boot
local-only architecture guard
asset provenance check
brand/copyright boundary review
keyboard navigation review
reduced-motion review
mobile/tablet/desktop layout review
```

## 3. Standard validation command sequence

Run from the repository root unless otherwise noted.

```powershell
git status -sb
git log --oneline --decorate -10
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm run audit
```

If the repo has a combined command such as `npm run validate`, record the exact script contents or cite `package.json` and run:

```powershell
npm run validate
```

A combined command does not replace the need to understand which checks ran.

## 4. `npm audit` rule

If `npm run audit` cannot run because the environment has no network:

```text
Status: partial
Action: record the exact command, exact error, date/time, and environment limitation.
Restriction: do not call the gate clean.
Requirement: run audit before Week-4 slice gate and release candidate gate.
```

If audit reports moderate/high/critical:

```text
Status: blocked unless triaged
Required triage:
- package name
- severity
- production or dev/test-only
- direct or transitive
- affected command/runtime
- fix available yes/no
- chosen action
- decision or validation note
```

## 5. Warning and anomaly classification

Warnings must be classified. Do not call a gate clean if a relevant warning is ignored.

Use this template whenever a command emits a warning or non-fatal anomaly:

```text
Warning/anomaly:
- Command:
- Exact warning:
- Classification: code blocker / environment warning / harmless but noted
- Action taken:
- Does it affect clean validation claim: yes/no
- Reason:
```

Examples:

```text
Git global ignore permission warning:
- likely environment warning if repo-local git behavior and validation are unaffected;
- still record it in the validation log or handoff.

Build-size warning:
- not automatically a blocker;
- classify against asset/bundle-size risk and record follow-up if needed.

Network failure during `npm audit`:
- not clean;
- status is partial until audit runs or a decision records accepted deferral.
```

## 6. Source-of-truth reconciliation checklist

RPG-00 must complete this before RPG-01 starts.

| Check                                                                |  Status | Evidence / notes                                                                |
| -------------------------------------------------------------------- | ------: | ------------------------------------------------------------------------------- |
| `docs/rpg-v2/` exists                                                | not-run |                                                                                 |
| Roadmap installed at `docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md` | not-run |                                                                                 |
| RPG v2 decisions installed at `docs/rpg-v2/DECISIONS-rpg-v2.md`      | not-run |                                                                                 |
| Validation log installed at `docs/rpg-v2/VALIDATION_LOG.md`          | not-run |                                                                                 |
| Asset ledger created at `docs/rpg-v2/ASSETS.md`                      | not-run |                                                                                 |
| Risk register created at `docs/rpg-v2/RISK_REGISTER.md`              | not-run |                                                                                 |
| Module handoff directory created at `docs/rpg-v2/modules/`           | not-run |                                                                                 |
| Root `DECISIONS.md` deletion reconciled intentionally                | not-run | Do not restore blindly. Commit deletion or document replacement.                |
| Older roadmap drafts archived or marked superseded                   | not-run |                                                                                 |
| BMAD artifacts role defined                                          | not-run | Decide: formal BMAD folders required, or roadmap is accepted planning artifact. |

## 7. Branch and git baseline checklist

| Check                                               |  Status | Evidence / notes                                                                                    |
| --------------------------------------------------- | ------: | --------------------------------------------------------------------------------------------------- |
| Current branch identified                           | not-run |                                                                                                     |
| Freeze tag `v0.21.0-ux-complete` exists             | not-run |                                                                                                     |
| `HEAD` relation to freeze tag recorded              | not-run |                                                                                                     |
| `rpg/v2` branch exists or creation plan recorded    | not-run |                                                                                                     |
| `v1-maintenance` branch exists or deferral recorded | not-run |                                                                                                     |
| Working tree clean or intentional changes listed    | not-run |                                                                                                     |
| Git permission warnings checked                     | not-run | External audit previously reported warning for `C:\Users\alex_/.config/git/ignore`; verify locally. |

## 8. Baseline validation pass log

Use this section for RPG-00 baseline passes.

### Baseline pass 1

- Date/time:
- Branch:
- Commit:
- Operator/agent:
- Status: not-run

| Command                            |  Status | Output summary / failure |
| ---------------------------------- | ------: | ------------------------ |
| `git status -sb`                   | not-run |                          |
| `git log --oneline --decorate -10` | not-run |                          |
| `npm run lint`                     | not-run |                          |
| `npm run format:check`             | not-run |                          |
| `npm run typecheck`                | not-run |                          |
| `npm run build`                    | not-run |                          |
| `npm run test`                     | not-run |                          |
| `npm run test:e2e`                 | not-run |                          |
| `npm run check:circular`           | not-run |                          |
| `npm run audit`                    | not-run |                          |

Notes:

```text

```

### Baseline pass 2

- Date/time:
- Branch:
- Commit:
- Operator/agent:
- Status: not-run

| Command                            |  Status | Output summary / failure |
| ---------------------------------- | ------: | ------------------------ |
| `git status -sb`                   | not-run |                          |
| `git log --oneline --decorate -10` | not-run |                          |
| `npm run lint`                     | not-run |                          |
| `npm run format:check`             | not-run |                          |
| `npm run typecheck`                | not-run |                          |
| `npm run build`                    | not-run |                          |
| `npm run test`                     | not-run |                          |
| `npm run test:e2e`                 | not-run |                          |
| `npm run check:circular`           | not-run |                          |
| `npm run audit`                    | not-run |                          |

Notes:

```text

```

### Baseline pass 3

- Date/time:
- Branch:
- Commit:
- Operator/agent:
- Status: not-run

| Command                            |  Status | Output summary / failure |
| ---------------------------------- | ------: | ------------------------ |
| `git status -sb`                   | not-run |                          |
| `git log --oneline --decorate -10` | not-run |                          |
| `npm run lint`                     | not-run |                          |
| `npm run format:check`             | not-run |                          |
| `npm run typecheck`                | not-run |                          |
| `npm run build`                    | not-run |                          |
| `npm run test`                     | not-run |                          |
| `npm run test:e2e`                 | not-run |                          |
| `npm run check:circular`           | not-run |                          |
| `npm run audit`                    | not-run |                          |

Notes:

```text

```

## 9. IndexedDB and backup evidence

Because RPG v2 shares the same origin and database as v1, read-only screens must prove they do not mutate data.

### 8.1 Manual v1 backup evidence

- Date/time:
- Branch:
- Commit:
- Backup filename:
- Backup created through app UI: not-run
- Backup import tested: not-run
- Notes:

```text

```

### 8.2 Deterministic test fixture evidence

- Fixture name/path:
- Created in module:
- Covers:
  - learner profile: not-run
  - course units/items: not-run
  - progress entries: not-run
  - study sessions: not-run
  - XP transactions: not-run
  - achievement unlocks: not-run
  - backups: not-run
- Notes:

```text

```

### 8.3 Read-only mutation assertion template

Use for read-only routes.

| Module               | Route/screen                                                                                                                                        | Pre-state method                                                            | Post-state method                                                               |                          Mutation expected | Result | Notes                                                                                                                                                                                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -----------------------------------------: | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RPG-02               | `/rpg` shell routes                                                                                                                                 | `getDatabaseSnapshot()` before route render loop                            | `getDatabaseSnapshot()` after each passive route render                         |                                         no |   pass | `tests/app/App.test.tsx` covers `/rpg`, `/rpg/map`, `/rpg/week/week-4`, `/rpg/resource/week-0-lecture`, `/rpg/focus`, `/rpg/hero`, `/rpg/badges`, `/rpg/log`, `/rpg/settings`.                                                                                            |
| RPG-04               | `/rpg` Quest Hub                                                                                                                                    | `getDatabaseSnapshot()` before route render                                 | `getDatabaseSnapshot()` after passive route render                              |                                         no |   pass | `tests/app/App.test.tsx` covers Hub render from real local data, new-user empty state, and passive route no-mutation.                                                                                                                                                     |
| RPG-05               | `/rpg/map` Campaign Map                                                                                                                             | `getDatabaseSnapshot()` before passive route render                         | `getDatabaseSnapshot()` after passive route render                              |                                         no |   pass | `tests/app/App.test.tsx` covers all seed units, semantic map links, readable status/progress text, plain list fallback, forbidden fake course copy absence, and passive no-mutation.                                                                                      |
| RPG-06               | `/rpg/week/week-4` Week Detail                                                                                                                      | `getDatabaseSnapshot()` before passive route render                         | `getDatabaseSnapshot()` after passive route render                              |                                         no |   pass | `tests/app/App.test.tsx` covers Week 4 detail rendering from real seed data, real resource/focus links, visible status/requirement text, and passive no-mutation.                                                                                                         |
| RPG-07               | `/rpg/resource/week-4-lecture` Study Resource                                                                                                       | `getDatabaseSnapshot()` before passive route render                         | `getDatabaseSnapshot()` after passive route render                              |                                         no |   pass | `tests/app/App.test.tsx` covers real resource render, official outbound link, forbidden embedded/player UI absence, explicit progress save behavior, and passive no-mutation.                                                                                             |
| RPG-08               | `/rpg/focus` and `/rpg/focus?itemId=week-4-lecture` Focus Session                                                                                   | `getDatabaseSnapshot()` before passive route render and timer-control tests | `getDatabaseSnapshot()` after passive render/start/pause/resume/unmount/discard |                                         no |   pass | `tests/app/App.test.tsx` covers selected-item render, manual empty state, passive no-mutation, start/pause/resume no-write behavior, unmount no-write behavior, discard no-write behavior, finish once, XP once, and duplicate-finish protection.                         |
| RPG-09               | Week 4 vertical slice: `/rpg` -> `/rpg/map` -> `/rpg/week/week-4` -> `/rpg/resource/week-4-lecture` -> `/rpg/focus?itemId=week-4-lecture` -> `/rpg` | `getDatabaseSnapshot()` before explicit Study Resource and Focus actions    | `getDatabaseSnapshot()` after progress save, Focus finish, and Hub return       | yes, explicit progress/session writes only |   pass | `tests/app/App.test.tsx` covers the full Week 4 gate path. Passive navigation remains covered by the RPG-08 no-mutation route loop; RPG-09 explicit writes are progress save and finished focus session only.                                                             |
| RPG-10 / Shell 2E-2G | `/rpg/log` Insights                                                                                                                                 | `getDatabaseSnapshot()` before route render                                 | `getDatabaseSnapshot()` after loaded empty/populated route render               |                                         no |   pass | Historical RPG-10 evidence covered the earlier Journey Log route. Shell 2E replaced `/rpg/log` with the classic-wrapped Insights surface; Shell 2G removed stale production Journey Log model/types and relabeled the remaining user-facing Hero link to "Open Insights". |
| RPG-13 / Shell 2F    | `/rpg/settings` Settings                                                                                                                            | `getDatabaseSnapshot()` before route render                                 | `getDatabaseSnapshot()` after Settings route render                             |                                         no |   pass | Historical RPG-13 evidence covered the earlier Settings/FAQ trust surface. Shell 2F replaced it with the classic-wrapped Settings/data-controls surface while preserving no-passive-write behavior and existing export/import/reset safeguards.                           |

## 10. Classic route regression evidence

Classic routes must remain behaviorally and visually stable while RPG routes are added.

Required viewports:

```text
390px mobile
768px tablet
1280px desktop
```

Required routes:

```text
/dashboard
/course
/course/:itemId with known fixture
/sessions
/achievements
/insights
/settings
```

Pass standard:

```text
no missing content
no changed destructive-action wording
no altered classic navigation hierarchy
no visual breakage introduced by RPG CSS
no RPG styling leaking into classic routes
backup/import/reset semantics unchanged
offline cold boot unchanged
```

| Module   | Route             |   390px |   768px |  1280px |  Result | Notes |
| -------- | ----------------- | ------: | ------: | ------: | ------: | ----- |
| Baseline | `/dashboard`      | not-run | not-run | not-run | not-run |       |
| Baseline | `/course`         | not-run | not-run | not-run | not-run |       |
| Baseline | `/course/:itemId` | not-run | not-run | not-run | not-run |       |
| Baseline | `/sessions`       | not-run | not-run | not-run | not-run |       |
| Baseline | `/achievements`   | not-run | not-run | not-run | not-run |       |
| Baseline | `/insights`       | not-run | not-run | not-run | not-run |       |
| Baseline | `/settings`       | not-run | not-run | not-run | not-run |       |

## 11. RPG route validation evidence

| Module | Route                          | Expected status                    | Result | Notes                                                                                                                                                                                                                                                                                                                                                                      |
| ------ | ------------------------------ | ---------------------------------- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RPG-02 | `/rpg`                         | shell renders                      |   pass | Covered by `tests/app/App.test.tsx`; renders in `RpgShell` with bottom nav.                                                                                                                                                                                                                                                                                                |
| RPG-02 | `/rpg/map`                     | shell renders                      |   pass | Covered by `tests/app/App.test.tsx`; renders in `RpgShell` with bottom nav.                                                                                                                                                                                                                                                                                                |
| RPG-02 | `/rpg/week/:unitId`            | shell renders or valid empty state |   pass | Covered by `tests/app/App.test.tsx` with `/rpg/week/week-4` and not-found state.                                                                                                                                                                                                                                                                                           |
| RPG-02 | `/rpg/resource/:itemId`        | shell renders or valid empty state |   pass | Covered by `tests/app/App.test.tsx` with `/rpg/resource/week-0-lecture` and not-found state.                                                                                                                                                                                                                                                                               |
| RPG-02 | `/rpg/focus`                   | shell renders                      |   pass | Stub shell route only.                                                                                                                                                                                                                                                                                                                                                     |
| RPG-02 | `/rpg/hero`                    | shell renders                      |   pass | Stub shell route only.                                                                                                                                                                                                                                                                                                                                                     |
| RPG-02 | `/rpg/badges`                  | shell renders                      |   pass | Stub shell route only.                                                                                                                                                                                                                                                                                                                                                     |
| RPG-02 | `/rpg/log`                     | shell renders                      |   pass | Stub shell route only.                                                                                                                                                                                                                                                                                                                                                     |
| RPG-02 | `/rpg/settings`                | shell renders                      |   pass | Stub shell route only.                                                                                                                                                                                                                                                                                                                                                     |
| RPG-04 | `/rpg`                         | real Quest Hub renders             |   pass | Covered by `tests/app/App.test.tsx`; renders learner identity, XP/level, rank/path/guild, current module, recommended item, weekly progress, recent activity, empty state, real continue route, and forbidden-copy absence.                                                                                                                                                |
| RPG-05 | `/rpg/map`                     | real Campaign Map renders          |   pass | Covered by `tests/app/App.test.tsx`; renders all current CS50x seed units, links every map node to `/rpg/week/:unitId`, exposes readable accessible names/status/progress text, includes a plain list fallback, and omits fake future course support.                                                                                                                      |
| RPG-06 | `/rpg/week/week-4`             | real Week 4 detail renders         |   pass | Covered by `tests/app/App.test.tsx`; renders real Week 4 seed task rows, required/optional labels, saved-progress-derived status text, module progress rollup, resource links, selected focus links, not-found state, and passive no-mutation.                                                                                                                             |
| RPG-07 | `/rpg/resource/week-4-lecture` | real Study Resource renders        |   pass | Covered by `tests/app/App.test.tsx`; renders real Week 4 resource data, required outbound official link, local status/notes, Start Focus and Back to Week links, explicit progress controls, forbidden embedded/player UI absence, not-found state, and passive no-mutation.                                                                                               |
| RPG-08 | `/rpg/focus`                   | real Focus Session renders         |   pass | Covered by `tests/app/App.test.tsx` and `tests/features/rpg/readModels.test.ts`; renders selected real task context from `itemId`, useful manual focus state without `itemId`, in-memory timer controls, discard/cancel no-write behavior, finish once, XP once through the existing engine, duplicate-finish protection, post-session summary, and real RPG return links. |

## 12. Week-4 vertical slice gate

Do not expand into profile, badge gallery, journey log, broad visual polish, or large asset work before this gate passes.

Required path:

```text
Hub -> Map -> Week 4 -> Study Resource -> save local progress -> Focus Session -> return to Hub
```

### Slice pass 1

- Date/time:
- Branch:
- Commit:
- Status: not-run
- Result summary:

```text

```

### Slice pass 2

- Date/time:
- Branch:
- Commit:
- Status: not-run
- Result summary:

```text

```

### Slice pass 3

- Date/time:
- Branch:
- Commit:
- Status: not-run
- Result summary:

```text

```

## 13. Module handoff index

Every module must create a durable handoff file in `docs/rpg-v2/modules/`.

| Module | Handoff path                            |  Status | Notes                                                                                               |
| ------ | --------------------------------------- | ------: | --------------------------------------------------------------------------------------------------- |
| RPG-00 | `docs/rpg-v2/modules/RPG-00-HANDOFF.md` | not-run |                                                                                                     |
| RPG-01 | `docs/rpg-v2/modules/RPG-01-HANDOFF.md` | not-run |                                                                                                     |
| RPG-02 | `docs/rpg-v2/modules/RPG-02-HANDOFF.md` |    pass | Includes Scope Discipline Check.                                                                    |
| RPG-03 | `docs/rpg-v2/modules/RPG-03-HANDOFF.md` |    pass | Includes Scope Discipline Check.                                                                    |
| RPG-04 | `docs/rpg-v2/modules/RPG-04-HANDOFF.md` |    pass | Includes Scope Discipline Check.                                                                    |
| RPG-05 | `docs/rpg-v2/modules/RPG-05-HANDOFF.md` |    pass | Includes Scope Discipline Check.                                                                    |
| RPG-06 | `docs/rpg-v2/modules/RPG-06-HANDOFF.md` |    pass | Includes Scope Discipline Check.                                                                    |
| RPG-07 | `docs/rpg-v2/modules/RPG-07-HANDOFF.md` |    pass | Includes Scope Discipline Check.                                                                    |
| RPG-08 | `docs/rpg-v2/modules/RPG-08-HANDOFF.md` |    pass | Includes Scope Discipline Check.                                                                    |
| RPG-09 | `docs/rpg-v2/modules/RPG-09-HANDOFF.md` |    pass | Includes Scope Discipline Check.                                                                    |
| RPG-10 | `docs/rpg-v2/modules/RPG-10-HANDOFF.md` |    pass | Includes Scope Discipline Check.                                                                    |
| RPG-11 | `docs/rpg-v2/modules/RPG-11-HANDOFF.md` |    pass | Includes Scope Discipline Check.                                                                    |
| RPG-12 | `docs/rpg-v2/modules/RPG-12-HANDOFF.md` |    pass | Includes Scope Discipline Check.                                                                    |
| RPG-13 | `docs/rpg-v2/modules/RPG-13-HANDOFF.md` |    pass | Includes Scope Discipline Check.                                                                    |
| RPG-14 | `docs/rpg-v2/modules/RPG-14-HANDOFF.md` |    pass | Includes Scope Discipline Check.                                                                    |
| RPG-15 | `docs/rpg-v2/modules/RPG-15-HANDOFF.md` |    pass | Includes Scope Discipline Check; historical release-candidate gate passed before 2C–2G remediation. |

### RPG Shell Phase 2 remediation handoff index

| Phase | Handoff path                                            | Status | Notes                                                                                         |
| ----- | ------------------------------------------------------- | -----: | --------------------------------------------------------------------------------------------- |
| 2A    | `docs/rpg-v2/modules/RPG-SHELL-02A-WRAPPER-CONTRACT.md` |   pass | Wrapper contract and page parity audit; documentation only.                                   |
| 2B    | `docs/rpg-v2/modules/RPG-SHELL-02B-HANDOFF.md`          |   pass | Navigation and shell hygiene corrective patch.                                                |
| 2C    | `docs/rpg-v2/modules/RPG-SHELL-02C-HANDOFF.md`          |   pass | Focus/session classic wrapper complete.                                                       |
| 2D    | `docs/rpg-v2/modules/RPG-SHELL-02D-HANDOFF.md`          |   pass | Achievements classic wrapper complete.                                                        |
| 2E    | `docs/rpg-v2/modules/RPG-SHELL-02E-HANDOFF.md`          |   pass | Insights classic wrapper complete.                                                            |
| 2F    | `docs/rpg-v2/modules/RPG-SHELL-02F-HANDOFF.md`          |   pass | Settings/data-controls classic wrapper complete.                                              |
| 2G    | `docs/rpg-v2/modules/RPG-SHELL-02G-HANDOFF.md`          |   pass | Stale Journey Log production remnants removed; remaining references are historical docs only. |

## 14. Scope Discipline Check template

Every module handoff must include this.

```text
Scope Discipline Check
- Intended module:
- Work mode: Acceptance audit only / Corrective patch / Next-module implementation:
- Files changed:
- Why each changed file was necessary:
- What was deliberately not added:
- New dependencies: none / list and justify:
- New assets: none / list asset IDs from ASSETS.md:
- New storage/schema: none / decision ID:
- Runtime network behavior changed: no / decision ID:
- Classic route behavior changed: no / explain and cite decision:
- Source-of-truth reconciliation: no conflicts / list resolved conflicts:
- Warnings and anomalies: none / list classifications:
- Validation cadence used: normal / corrective / major gate:
- Commit status: committed / uncommitted local work:
- Any deferred tempting work:

Anti-overbuild questions answered:
1. Does this need to be here?
2. Is this required to reach the intended endstate for this module?
3. Is this required by the roadmap, an accepted decision, or a failing test?
4. Does this preserve the v1 engine contract?
5. Does this preserve same-origin /rpg/*, no backend, no schema change, no embedded video, and Level 1 local-first?
6. Does this introduce a dependency, asset, runtime request, store, preference, or abstraction the current module did not ask for?
7. Can this be done with existing code, existing styles, existing data, or a smaller local component?
8. Would a future maintainer understand why this was necessary from the module acceptance criteria alone?
```

## 15. Known external audit observations to verify locally

These are not accepted facts until verified in the repo. They come from an external AI audit and must be checked during RPG-00.

| Observation                                                                |  Status | Required action                                                                    |
| -------------------------------------------------------------------------- | ------: | ---------------------------------------------------------------------------------- |
| Canonical roadmap was outside repo in Downloads                            | not-run | Install roadmap at `docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md`.                |
| `docs/rpg-v2/` reportedly did not exist                                    | not-run | Create and verify.                                                                 |
| `git status -sb` reportedly showed `D DECISIONS.md`                        | not-run | Confirm deletion is intentional and reconcile git state.                           |
| Git emitted permission warning for user git ignore                         | not-run | Verify whether still present and whether it affects validation.                    |
| `_bmad-output/planning-artifacts` reportedly empty                         | not-run | Decide whether BMAD folders are required or roadmap is accepted planning artifact. |
| `_bmad-output/implementation-artifacts` reportedly empty                   | not-run | Not blocker unless formal BMAD governance is chosen.                               |
| `package.json` reportedly contains validation scripts including `validate` | not-run | Verify exact scripts.                                                              |

## 16. RPG-00 readiness verdict

Current status: not-run

RPG-01 may not begin until:

```text
1. Source-of-truth files exist in docs/rpg-v2/.
2. Root DECISIONS.md deletion is reconciled intentionally.
3. Branch/freeze/tag state is recorded.
4. Validation gate standard is recorded.
5. Baseline validation has been run and recorded.
6. Asset ledger and risk register exist.
7. Module handoff directory exists.
8. RPG-00-HANDOFF.md exists.
```

## 17. RPG-00 handoff starter

Create this file after RPG-00 work:

```text
docs/rpg-v2/modules/RPG-00-HANDOFF.md
```

Suggested content:

```markdown
# RPG-00 Handoff â€” Baseline Reconciliation

## Goal

Establish the source-of-truth files, reconcile repo state, and validate the baseline without runtime/package changes.

## Files changed

- docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
- docs/rpg-v2/DECISIONS-rpg-v2.md
- docs/rpg-v2/VALIDATION_LOG.md
- docs/rpg-v2/ASSETS.md
- docs/rpg-v2/RISK_REGISTER.md
- docs/rpg-v2/modules/RPG-00-HANDOFF.md

## Runtime/package changes

None.

## Git state

- Branch:
- Commit:
- Freeze tag:
- Root DECISIONS.md deletion reconciled:

## Validation

Paste command summaries from VALIDATION_LOG.md.

## Scope Discipline Check

Paste completed check.

## Next module readiness

RPG-01 may begin: yes/no
Reason:
```

## RPG-01b avatar asset patch validation

Branch: `rpg/01b-character-avatar-asset`

Summary:

- Replaced generated SVG learner avatar preview with bundled RPG-style profile portrait.
- Added resized local PNG.
- Added generated inline data URL module to avoid offline image-request failures.
- Rounded the avatar frame so the portrait behaves like a profile medallion.

Validation:

- `npm run build`: pass.
- Targeted offline E2E: `npx playwright test e2e/dashboard.spec.ts -g "survives local storage reset"`: pass.
- `npm run validate`: pass.
- Unit/integration tests: 36 files, 266 tests passed.
- E2E tests: 24 passed.
- Circular dependency check: pass.
- Audit: 0 vulnerabilities.

Warnings and anomalies:

- `git diff --check` emitted LF-to-CRLF normalization warnings on Windows. Classification: environment/line-ending warning, non-blocking. No whitespace errors after Prettier.
- `npm run test` emitted transient Dexie `DatabaseClosedError` stderr during `tests/app/App.test.tsx`, while all tests passed. Classification: test-environment/teardown warning, non-blocking for RPG-02. Monitor if it becomes reproducible failure or affects new RPG route tests.

Notes:

- The public image-path version failed offline navigation with `net::ERR_INTERNET_DISCONNECTED` for `/assets/character-profile.png`.
- Final implementation avoids that runtime request by importing `CHARACTER_PROFILE_ASSET` from `characterProfileAsset.ts`.

## RPG-03 visual primitives validation

Branch: `rpg/03-rpg-visual-primitives`

Summary:

- Added `.rpg-shell`-scoped RPG visual tokens.
- Added scoped RPG primitive CSS.
- Added presentation-only RPG primitives for the near-term Week-4 slice.
- Added tests for semantic rendering, progress ARIA, DOM text, no image dependency, scoped token definitions, and no CSS remote/image asset references.

Validation:

- `npm run lint`: pass.
- `npm run typecheck`: pass after elevated rerun for TypeScript tsbuildinfo write access.
- `npm run test -- tests/features/rpg/components.test.tsx`: pass; 1 file, 7 tests.
- `npm run test -- tests/features/rpg/components.test.tsx tests/app/App.test.tsx tests/architecture/routeDefinitions.test.ts`: pass; 3 files, 75 tests.
- `npm run format:check`: pass after formatting Prettier-flagged committed RPG v2 files.
- `git diff --check`: pass; emitted LF-to-CRLF environment warnings only.
- `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files, 284 tests.
  - `npm run test:e2e`: pass; 24 tests.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.
  - `npm run validate`: pass; 24 files, 161 tests,

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. It does not affect repo-local diff/status readability.
- Initial `npm run typecheck` could not write `node_modules/.tmp/tsconfig.app.tsbuildinfo` in sandbox. Classification: environment/sandbox warning. Reran with elevated filesystem access and passed.
- Initial targeted Vitest run could not write Vite temp config under `node_modules/.vite-temp` in sandbox. Classification: environment/sandbox warning. Reran with elevated filesystem access and passed.
- First `npm run format:check` found existing Prettier failures in committed RPG v2 docs/route-shell files. Classification: validation blocker until reconciled. Formatted the exact flagged files; subsequent `npm run format:check` passed.
- Final `git diff --check` emitted LF-to-CRLF warnings. Classification: environment/line-ending warning. The command exited 0 with no whitespace errors.
- Dexie DatabaseClosedError stderr during App tests: non-fatal test-environment teardown warning; tests passed.
- App metadata has not been initialized stderr during App tests: non-fatal test-environment/race warning; tests passed.

Notes:

- No new dependencies.
- No new assets.
- No schema/storage changes.
- No runtime network behavior.
- No direct Dexie/database access from RPG UI components.

## RPG-04 Quest Hub validation

Branch: `rpg/04-rpg-hub`

Summary:

- Replaced the `/rpg` stub with a real Quest Hub.
- Extended the Hub read model with derived identity, current module, weekly progress, and recent activity from existing local data.
- Added scoped `.rpg-hub*` layout styles under `.rpg-shell`.
- Added tests for real-data rendering, useful empty state, real continue route, passive no-mutation, and forbidden fake RPG copy.

Validation:

- `npm run test -- tests/features/rpg/readModels.test.ts tests/app/App.test.tsx`: pass; 2 files, 69 tests.
- `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files, 286 tests.
  - `npm run test:e2e`: pass; 24 tests.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. Repo-local status and diff remained readable.
- Initial targeted Vitest run could not write Vite temp config under `node_modules/.vite-temp`. Classification: environment/sandbox warning. Reran with elevated filesystem access and passed.
- First targeted route test found a fixture bug: the test session omitted `startedAt`. Classification: test fixture bug. Fixed the fixture and reran targeted tests.
- Second targeted route test showed the recent-activity cap hid the saved study session. Classification: implementation/test expectation mismatch. Widened the Hub recent-activity cap to 5 and reran targeted tests.
- Final `npm run validate` initially failed at `format:check` after unrelated line-ending-only touches were restored. Classification: validation blocker until formatter reconciliation. Ran Prettier on the exact RPG-03 primitive/docs files flagged by the formatter; `git diff --stat` showed no substantive changes for those files.
- Git diff commands emitted LF-to-CRLF warnings. Classification: environment/line-ending warning. `git diff --check` remains required before commit.

Notes:

- No new dependencies.
- No new assets.
- No schema/storage changes.
- No runtime network behavior.
- No direct database table imports in RPG UI components.

## RPG-05 Campaign Map validation

Branch: `rpg/05-rpg-campaign-map`

Summary:

- Replaced `/rpg/map` with a real Campaign Map built from current local CS50x seed/course data.
- Extended the map read model with a derived `currentModule` field using existing recommended-quest/current-module logic.
- Added scoped `.rpg-map*` styles under `.rpg-shell`.
- Added tests for all seed units, semantic map links, readable accessible names, saved-progress-derived status text, completed/current/available module states, plain list fallback, forbidden fake course copy absence, and passive no-mutation.
- Reconciled a Prettier validation blocker in two previously committed RPG-04 files; `git diff` showed no substantive content changes for those files, only line-ending warnings.

Validation:

- `npm run test -- tests/features/rpg/readModels.test.ts tests/app/App.test.tsx`: pass; 2 files, 71 tests.
- First `npm run validate`: failed at `format:check`; Prettier flagged `docs/rpg-v2/modules/RPG-04-HANDOFF.md` and `src/features/rpg/routes/RpgHomePage.tsx`.
- `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files, 288 tests.
  - `npm run test:e2e`: pass; 24 tests.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. Repo-local status and diff remained readable.
- Initial targeted Vitest run could not write Vite temp config under `node_modules/.vite-temp`. Classification: environment/sandbox warning. Reran with elevated filesystem access and passed.
- Git diff commands emitted LF-to-CRLF warnings. Classification: environment/line-ending warning. `git diff --check` passed with the same line-ending warnings and no whitespace errors.
- First full `npm run validate` failed at `format:check` because Prettier flagged `docs/rpg-v2/modules/RPG-04-HANDOFF.md` and `src/features/rpg/routes/RpgHomePage.tsx`. Classification: validation blocker until formatter reconciliation. Ran Prettier on the exact flagged files; subsequent full validation passed.

Notes:

- No new dependencies.
- No new assets.
- No schema/storage changes.
- No runtime network behavior.
- No direct database table imports in RPG UI components.

## RPG-06 Week 4 Module Detail validation

Branch: `rpg/06-rpg-week-detail`

Summary:

- Replaced `/rpg/week/:unitId` presentation with a focused RPG Week detail screen.
- Kept data access through `loadRpgModuleSummary`; no direct database or repository imports were added to the route component.
- Added `getRpgFocusPath(itemId)` for selected-item focus links with URL encoding.
- Added scoped `.rpg-week*` styles under `.rpg-shell`.
- Added tests for Week 4 real seed rows, required/optional labels, saved-progress-derived status text, module progress rollup, resource links, selected focus links, not-found state, and passive no-mutation including `/rpg/focus?itemId=week-4-lecture`.
- Reconciled a Prettier validation blocker in five previously committed RPG-05 files; `git diff --name-status` showed no substantive changes for those files after reconciliation, only line-ending warnings.

Validation:

- `npm run test -- tests/features/rpg/readModels.test.ts tests/app/App.test.tsx`: pass; 2 files, 71 tests.
- First `npm run validate`: failed at `format:check`; Prettier flagged `docs/rpg-v2/modules/RPG-05-HANDOFF.md`, `src/features/rpg/model/readModels.ts`, `src/features/rpg/model/types.ts`, `src/features/rpg/routes/RpgMapPage.tsx`, and `tests/features/rpg/readModels.test.ts`.
- `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files, 288 tests.
  - `npm run test:e2e`: pass; 24 tests.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. Repo-local status and diff remained readable.
- Previous sandboxed targeted Vitest attempt could not write Vite temp config under `node_modules/.vite-temp`. Classification: environment/sandbox warning. Reran with elevated filesystem access and passed.
- Git diff commands emitted LF-to-CRLF warnings. Classification: environment/line-ending warning. `git diff --check` passed with the same line-ending warnings and no whitespace errors.
- First full `npm run validate` failed at `format:check` because Prettier flagged five previously committed RPG-05 files. Classification: validation blocker until formatter reconciliation. Ran Prettier on the exact flagged files; `git diff --name-status` showed no substantive RPG-05 file changes after reconciliation.

Notes:

- No new dependencies.
- No new assets.
- No schema/storage changes.
- No runtime network behavior.
- No direct database table imports in RPG UI components.

## RPG-07 Study Resource validation

Branch: `rpg/07-rpg-study-resource`

Summary:

- Replaced `/rpg/resource/:itemId` with a real Study Resource screen backed by existing course/progress data.
- Extended the RPG Study Resource read model with item type and saved progress fields needed by the route.
- Added `src/features/rpg/model/progressActions.ts` as a narrow RPG model action over the existing `upsertProgressAndAwardXp` writer so the route does not import database code directly.
- Added explicit local progress controls for saving local progress and marking a resource locally complete.
- Kept official CS50x resources as outbound user-clicked links only.
- Added scoped `.rpg-study-resource*` styles.
- Added tests for real Week 4 rendering, official outbound link copy, no embedded/fake media UI, explicit partial save, explicit complete save, long-form partial-completion guard, Start Focus and Back to Week links, not-found state, and passive no-mutation.

Validation:

- `npm run test -- tests/features/rpg/readModels.test.ts tests/app/App.test.tsx`: pass; 2 files, 75 tests.
- First `npm run validate`: failed at `format:check`; Prettier flagged `docs/rpg-v2/modules/RPG-06-HANDOFF.md`, `src/features/rpg/routes/RpgModulePage.tsx`, and `src/lib/routing/rpgRoutePaths.ts`.
- Formatter reconciliation: ran Prettier on the exact three flagged previously committed RPG-06 files. `git diff --name-status` and `git diff --stat` showed no substantive RPG-06 file changes afterward.
- `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files, 292 tests.
  - `npm run test:e2e`: pass; 24 tests.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.

Warnings and anomalies:

- Targeted and full app tests emitted recurring Dexie `DatabaseClosedError` stderr while all tests passed. Classification: test-environment/teardown warning, non-blocking.
- First full `npm run validate` failed at `format:check` because Prettier flagged three previously committed RPG-06 files. Classification: validation blocker until formatter reconciliation. Ran Prettier on the exact flagged files; no substantive RPG-06 diffs remained afterward.
- Git diff commands emitted LF-to-CRLF warnings. Classification: environment/line-ending warning. `git diff --check` exited with no whitespace errors.

Notes:

- No new dependencies.
- No new assets.
- No schema/storage changes.
- No runtime network behavior.
- No embedded external content.
- No direct database table imports in RPG UI components.
- Official resources remain user-clicked outbound links only.
- Progress changes only through explicit user action.

## RPG-08 Focus Session validation

Branch: `rpg/08-rpg-focus-session`

Summary:

- Replaced `/rpg/focus` placeholder with a real Focus Session route over the existing session engine.
- Added selected-item loading from `itemId` and a useful manual focus state without `itemId`.
- Added in-memory timer controls for start, pause, resume, finish, and discard.
- Kept unfinished timers non-persistent; start, pause, resume, unmount, and discard write nothing.
- Added optional local note/blocker drafts because the existing study-session schema supports both fields.
- Added explicit Finish behavior that saves exactly one study-session record through `addStudySessionAndAwardXp`.
- Passed a stable client session id into the existing writer to prevent duplicate Finish interactions from duplicating session/XP records.
- Added a post-session summary with task, module, duration, mode, saved session id, XP awarded by the existing engine, and real RPG return links.
- Added `src/features/rpg/model/focusActions.ts` as a narrow RPG model action so the route does not import database writers directly.
- Added scoped `.rpg-focus*` styles under `.rpg-shell`.
- Did not implement Journey Log, Badge Gallery, Hero/Profile, or RPG-09 vertical-slice work.

Validation:

- Initial targeted test attempt: `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts` failed before tests ran because Vite could not write `node_modules/.vite-temp` in the sandbox.
- Rerun with filesystem escalation: failed 2 route assertions; implementation was rendering correctly, but the tests waited for the page H1 instead of loaded selected-task content and assumed one `Back to week` link after summary.
- Targeted tests after assertion fixes: `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts` passed; 2 files, 80 tests.
- Targeted tests after direct Focus read-model coverage: `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts` passed; 2 files, 81 tests.
- Targeted test after route-test repair: `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts`passed; 2 files passed, 85 tests passed

- `npm run typecheck`: pass.
- `npm run lint`: pass.
- First `npm run format:check`: failed; Prettier flagged RPG-08 files plus `docs/rpg-v2/modules/RPG-07-HANDOFF.md`, `src/features/rpg/model/progressActions.ts`, and `src/features/rpg/routes/RpgResourcePage.tsx`.
- Formatter reconciliation: ran Prettier on the exact flagged files. RPG-07 touches are formatting/line-ending normalization only.
- `npm run format:check`: pass.
- `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass.
  - `npm run test:e2e`: pass.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. Repo-local status and diff remained readable.
- Initial targeted Vitest run could not write Vite temp config under `node_modules/.vite-temp`. Classification: environment/sandbox warning. Reran with filesystem escalation and passed.
- First escalated targeted test run failed two assertions. Classification: test assertion issue. Fixed the assertions and reran targeted tests successfully.
- First `npm run format:check` failed on RPG-08 files and three previously committed RPG-07 files. Classification: validation blocker until formatter reconciliation. Ran Prettier on the exact files and reran `format:check` successfully.
- Git diff commands emitted LF-to-CRLF warnings. Classification: environment/line-ending warning. `git diff --check` exited with no whitespace errors.

Notes:

- No new dependencies.
- No new assets.
- No schema/storage changes.
- No runtime network behavior.
- No direct database table imports in RPG UI components.
- No XP preview was added.
- No RPG-09 vertical-slice gate work was started.

## RPG-09 Week 4 Vertical Slice Gate validation

Branch: `rpg/09-rpg-week4-vertical-slice`

Summary:

- Inspected the existing RPG route definitions, RPG read models, RPG resource/focus routes, classic progress/session engines, and route tests.
- Determined no product-code repair was required for the Week 4 vertical-slice path.
- Added one dedicated route-level gate test for:
  - Hub -> Map.
  - Map -> Week 4.
  - Week 4 -> Study Resource for `week-4-lecture`.
  - Study Resource explicit local progress save through the existing progress engine wrapper.
  - Study Resource -> Focus Session with `itemId=week-4-lecture`.
  - Focus Session finish through the existing session/XP engine wrapper.
  - Return to Hub with saved progress, saved study session, study time, and XP reflected.
- Created `docs/rpg-v2/modules/RPG-09-HANDOFF.md`.
- Corrected the validation-log RPG-09 read-only table row from the stale Badge Gallery label to the Week 4 vertical-slice gate.

Validation:

- Required initial evidence:
  - `git status -sb`: branch `rpg/09-rpg-week4-vertical-slice`; clean at inspection; emitted global-ignore permission warning.
  - `git log --oneline --decorate -5`: `ac5c03d (HEAD -> rpg/09-rpg-week4-vertical-slice, origin/rpg/v2, rpg/v2) Merge pull request #15 from ruishinor/rpg/08-rpg-focus-session`; `c43edc6 rpg-08: build RPG focus session`; `65d55e6 Merge pull request #14 from ruishinor/rpg/07-rpg-study-resource`; `9621724 rpg-07: build RPG study resource screen`; `61c1a84 Merge pull request #13 from ruishinor/rpg/06-rpg-week-detail`.
  - `git diff --name-status`: no output.
  - `git diff --stat`: no output.
  - `git diff --check`: no output.
- Initial targeted run after adding the RPG-09 test: `npm run test -- tests/app/App.test.tsx` failed; the test assumed a 20-minute session awards XP, but the existing engine threshold is 25 minutes.
- Second targeted run: failed; the test asserted Hub content before the async Hub summary finished loading.
- Third targeted run: failed; the test used `getByText('25 min')` when two valid Hub summaries displayed the same value.
- Targeted after assertion fixes: `npm run test -- tests/app/App.test.tsx` passed; 1 file, 76 tests.
- Broader targeted check: `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts` passed; 2 files, 82 tests.
- First `npm run validate` attempt: failed at `format:check`; Prettier flagged RPG-08 files plus the RPG-09 validation log and app test. Ran Prettier on exactly the flagged files; tracked diff remained limited to RPG-09 evidence files and the app test.
- `npm run validate` pass 1: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files, 299 tests.
  - `npm run test:e2e`: pass; 24 tests.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.
- `npm run validate` pass 2: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files, 299 tests.
  - `npm run test:e2e`: pass; 24 tests.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.
- `npm run validate` pass 3: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files, 299 tests.
  - `npm run test:e2e`: pass; 24 tests.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.
- Evidence update note: after recording pass results, the full three-pass cadence was rerun against the documented file state before commit.

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. Repo-local status and diff remained readable. Clean validation impact: no.
- Targeted Vitest required filesystem escalation because Vite writes temp/cache files under `node_modules`. Classification: environment/sandbox warning. Clean validation impact: no after escalated run passed.
- First targeted RPG-09 test failure was a test assumption issue against the existing session XP threshold. Action: changed the test duration to 25 minutes to use the existing engine. Clean validation impact: no after rerun passed.
- Second targeted RPG-09 test failure was test synchronization against an async Hub read model. Action: waited for loaded activity text. Clean validation impact: no after rerun passed.
- Third targeted RPG-09 test failure was duplicate visible summary text. Action: asserted one or more matching summaries. Clean validation impact: no after rerun passed.
- First full `npm run validate` attempt failed at `format:check`. Classification: validation blocker until formatter reconciliation. Action: ran Prettier on the exact flagged files. Clean validation impact: no; three-pass full validation cadence restarts after formatting.
- Documentation evidence update after the first three observed passes changed the file state. Classification: validation cadence issue. Action: reran three full `npm run validate` passes against the updated docs before commit.

Notes:

- No product-code files changed.
- No new dependencies.
- No new assets.
- No schema/storage changes.
- No runtime network behavior.
- No direct database table imports in RPG UI components.
- No Hero/Profile, Badge Gallery, or Journey Log implementation was started.
- No scoring behavior was added or changed.

## RPG-10 Journey Log validation

Branch: `rpg/10-rpg-journey-log`

Summary:

- Replaced the `/rpg/log` stub with a real read-only Journey Log route.
- Added a narrow RPG Journey Log read model over `getDatabaseSnapshot()`.
- Aggregates real local records only:
  - progress entries;
  - study sessions;
  - XP transactions.
- Shows activity types as `Progress saved`, `Study session finished`, and `XP awarded`.
- Resolves course/task context from seeded course units/items where possible.
- Links activity entries to real RPG Study Resource, Focus, and Week routes where context can be resolved.
- Keeps unresolved XP transactions visible from stored XP reason/timestamp instead of inventing context.
- Added route and read-model tests for empty state, real persisted activity, links, XP visibility, and no mutation.
- Did not add new scoring, XP behavior, fake mechanics, Badge Gallery, Hero/Profile, achievements, network behavior, or schema changes.

Validation:

- Required initial evidence:
  - `git status -sb`: branch `rpg/10-rpg-journey-log`; clean at inspection; emitted global-ignore permission warning.
  - `git log --oneline --decorate -5`: `9aa3984 (HEAD -> rpg/10-rpg-journey-log, origin/rpg/v2, rpg/v2) Merge pull request #16 from ruishinor/rpg/09-rpg-week4-vertical-slice`; `cffbe33 rpg-09: validate Week 4 vertical slice`; `ac5c03d Merge pull request #15 from ruishinor/rpg/08-rpg-focus-session`; `c43edc6 rpg-08: build RPG focus session`; `65d55e6 Merge pull request #14 from ruishinor/rpg/07-rpg-study-resource`.
  - `git diff --name-status`: no output.
  - `git diff --stat`: no output.
  - `git diff --check`: no output.
- Initial local targeted test attempt: `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts` failed two Journey Log route assertions in `tests/app/App.test.tsx`.
  - Empty-state test queried a single `Open RPG map` link while the route intentionally rendered both header and empty-state links.
  - Populated-state test waited only for the always-present `Journey Log` heading and asserted loaded content before the async summary resolved.
  - Classification: test assertion issue.
  - Action: repaired the assertions in `tests/app/App.test.tsx`.
- Targeted validation after route-test repair:
  - `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts`: pass.
  - Result: 2 files passed, 85 tests passed.
- Full validation after route-test repair:
  - `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files passed, 302 tests passed.
  - `npm run test:e2e`: pass; 24 tests passed.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. Repo-local status and diff remained readable.
- Earlier Codex-side targeted Vitest attempts were blocked by environment/tooling limitations: one escalated attempt was rejected by a usage-limit gate, and one sandboxed attempt failed at Vite temp config loading with `EPERM` on `node_modules/.vite-temp`. Classification: historical environment/tooling warning. Final local targeted tests passed.
- Earlier Codex-side `npm run typecheck` attempts were blocked by `EPERM` writing `node_modules/.tmp/tsconfig.app.tsbuildinfo`; those attempts also exposed a real activity-type narrowing issue in the Journey Log read model. Classification: historical environment/tooling warning plus resolved code issue. Final local `npm run validate` completed `typecheck` successfully.
- First local targeted and full validation attempts failed two `tests/app/App.test.tsx` Journey Log route assertions. Classification: test assertion issue. Action: repaired the assertions and reran targeted tests and full validation successfully.
- `npm run format:check` initially found formatting issues. Classification: validation blocker until cleanup. Action: ran Prettier and reran validation; final `format:check` passed.
- Dexie `DatabaseClosedError` stderr appeared during App tests while all tests passed. Classification: non-fatal test-environment teardown warning.
- `App metadata has not been initialized` stderr appeared during App tests while all tests passed. Classification: non-fatal test-environment/race warning.
- Source-of-truth mismatch: attached branch request defines RPG-10 as Journey Log, but the checked-in roadmap still labels RPG-10 as Hero/Profile and Journey Log as RPG-12. Classification: documentation/source-of-truth mismatch. Resolution: followed the attached RPG-10 branch request and recorded the mismatch in the handoff.

Notes:

- No new dependencies.
- No new assets.
- No schema/storage changes.
- No runtime network behavior.
- No direct database table imports in RPG route components.
- No Hero/Profile or Badge Gallery implementation was started.
- No scoring behavior was added or changed.
- Historical note: this entry was written before the RPG-10 work was merged. It is not a current pending-commit status.

## RPG-11 Badge Gallery validation

Branch: `rpg/11-rpg-badge-gallery`

Summary:

- Replaced the `/rpg/badges` stub with a real read-only Badge Gallery route.
- Added a narrow RPG Badge Gallery read model over `getDatabaseSnapshot()`, existing achievement definitions, and persisted achievement unlock records.
- Shows earned, locked, and total badge counts.
- Shows all existing achievement names, category labels, status labels, requirement text, and earned dates when unlock records provide them.
- Provides a useful new-user state while still rendering locked badges and visible requirements.
- Links back to Hub and Map.
- Uses CSS-only placeholder markers; no new assets were added.
- Did not add achievements, criteria, XP rules, passive unlock behavior, Hero/Profile, Journey Log, network behavior, schema changes, or classic route changes.

Validation:

- Required initial evidence:
  - `git status -sb`: branch `rpg/11-rpg-badge-gallery`; clean at inspection; emitted global-ignore permission warning.
  - `git log --oneline --decorate -5`: `9028900 (HEAD -> rpg/11-rpg-badge-gallery, origin/rpg/v2, rpg/v2) Merge pull request #18 from ruishinor/rpg/10-rpg-journey-log`; `f1024bc rpg-10: build RPG journey log`; `9aa3984 Merge pull request #16 from ruishinor/rpg/09-rpg-week4-vertical-slice`; `cffbe33 rpg-09: validate Week 4 vertical slice`; `ac5c03d Merge pull request #15 from ruishinor/rpg/08-rpg-focus-session`.
  - `git diff --name-status`: no output.
  - `git diff --stat`: no output.
  - `git diff --check`: no output.
- Initial targeted test attempt: `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts` failed before tests ran because Vite could not write `node_modules/.vite-temp/...` in the sandbox.
- Escalated targeted test attempt: failed one new read-model assertion because the fixture used `week-0-pset`; the actual seed id is `week-0-problem-set`.
- Targeted validation after fixture repair:
  - `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts`: pass.
  - Result: 2 files passed, 88 tests passed.
- `npm run format:check`: pass after running Prettier on the exact flagged files.
- `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files passed, 305 tests passed.
  - `npm run test:e2e`: pass; 24 tests passed.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.
- Final evidence-update rerun:
  - `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts`: pass; 2 files passed, 88 tests passed.
  - `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files passed, 305 tests passed.
  - `npm run test:e2e`: pass; 24 tests passed.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. Repo-local status and diff remained readable.
- Sandboxed targeted Vitest failed at Vite config loading with `EPERM` on `node_modules/.vite-temp`. Classification: environment/sandbox warning. Action: reran with filesystem escalation and reached tests.
- First escalated targeted test run failed one new Badge Gallery read-model assertion. Classification: test fixture issue. Action: corrected the fixture seed id and reran targeted tests successfully.
- Git diff commands emitted LF-to-CRLF warnings. Classification: environment/line-ending warning. `git diff --check` exited with no whitespace errors.
- First `npm run format:check` after implementation flagged RPG-11 files plus two previously committed RPG-10 files. Classification: validation blocker until formatter reconciliation. Action: ran Prettier on the exact flagged files; `docs/rpg-v2/modules/RPG-10-HANDOFF.md` and `src/features/rpg/routes/RpgLogPage.tsx` showed no substantive diff afterward, only line-ending warnings.
- Source-of-truth mismatch: checked-in roadmap still labels RPG-10 as Hero/Profile and RPG-12 as Journey Log, while merged project history has RPG-10 as Journey Log. Classification: documentation/source-of-truth mismatch. Resolution: followed the attached RPG-11 Badge Gallery directive; Hero/Profile remains unbuilt/deferred and Journey Log was not duplicated.

Notes:

- No new dependencies.
- No new assets.
- No schema/storage changes.
- No runtime network behavior.
- No direct database table imports in RPG route components.
- No Hero/Profile implementation was started.
- No Journey Log implementation was duplicated.
- No scoring behavior was added or changed.

## RPG-12 Hero Profile validation

Branch: `rpg/12-rpg-hero-profile`

Summary:

- Replaced the `/rpg/hero` stub with a real read-only Hero/Profile route.
- Added a narrow RPG Hero/Profile read model composed from existing Hub and Badge Gallery projections over one database snapshot.
- Shows learner name, rank, path, class, guild, XP, required progress, study totals, badge count, and recent saved activity.
- Provides a useful new-user state.
- Links to Hub, Map, Badge Gallery, and Journey Log.
- Uses a CSS-only initials marker; no new assets were added.
- Did not add profile storage, avatar editor, XP behavior, achievements, passive unlock behavior, Journey Log redesign, Badge Gallery redesign, network behavior, schema changes, or classic route changes.

Validation:

- Required initial evidence:
  - `git status -sb`: branch `rpg/12-rpg-hero-profile`; clean at inspection; emitted global-ignore permission warning.
  - `git log --oneline --decorate -5`: `1c1390d (HEAD -> rpg/12-rpg-hero-profile, origin/rpg/v2, rpg/v2) Merge pull request #19 from ruishinor/rpg/11-rpg-badge-gallery`; `486b756 rpg-11: build RPG badge gallery`; `9028900 Merge pull request #18 from ruishinor/rpg/10-rpg-journey-log`; `f1024bc rpg-10: build RPG journey log`; `9aa3984 Merge pull request #16 from ruishinor/rpg/09-rpg-week4-vertical-slice`.
  - `git diff --name-status`: no output.
  - `git diff --stat`: no output.
  - `git diff --check`: no output.
- Initial targeted test attempt: `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts` failed before tests ran because Vite could not write `node_modules/.vite-temp/...` in the sandbox.
- Escalated targeted test attempt: failed one new Hero/Profile route assertion because the test asserted loaded content after the always-present page heading while the route was still loading.
- Targeted validation after assertion repair:
  - `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts`: pass.
  - Result: 2 files passed, 92 tests passed.
- First `npm run validate`: failed only at `npm audit` after lint, format, typecheck, build, Vitest, E2E, and circular checks passed.
  - `npm run test`: pass; 37 files passed, 309 tests passed.
  - `npm run test:e2e`: pass; 24 tests passed.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: failed with `getaddrinfo ENOTFOUND registry.npmjs.org`.
- Audit retry:
  - `npm run audit`: pass; 0 vulnerabilities.
- `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files passed, 309 tests passed.
  - `npm run test:e2e`: pass; 24 tests passed.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.
- Final evidence-update validation:
  - `npx prettier --write docs/rpg-v2/modules/RPG-12-HANDOFF.md docs/rpg-v2/VALIDATION_LOG.md`: pass; files unchanged.
  - `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts`: pass; 2 files passed, 92 tests passed.
  - `npm run validate` pass 1: pass.
    - `npm run lint`: pass.
    - `npm run format:check`: pass.
    - `npm run typecheck`: pass.
    - `npm run build`: pass.
    - `npm run test`: pass; 37 files passed, 309 tests passed.
    - `npm run test:e2e`: pass; 24 tests passed.
    - `npm run check:circular`: pass; no circular dependencies.
    - `npm run audit`: pass; 0 vulnerabilities.
  - `npm run validate` pass 2: pass.
    - `npm run lint`: pass.
    - `npm run format:check`: pass.
    - `npm run typecheck`: pass.
    - `npm run build`: pass.
    - `npm run test`: pass; 37 files passed, 309 tests passed.
    - `npm run test:e2e`: pass; 24 tests passed.
    - `npm run check:circular`: pass; no circular dependencies.
    - `npm run audit`: pass; 0 vulnerabilities.
  - `npm run validate` pass 3: pass.
    - `npm run lint`: pass.
    - `npm run format:check`: pass.
    - `npm run typecheck`: pass.
    - `npm run build`: pass.
    - `npm run test`: pass; 37 files passed, 309 tests passed.
    - `npm run test:e2e`: pass; 24 tests passed.
    - `npm run check:circular`: pass; no circular dependencies.
    - `npm run audit`: pass; 0 vulnerabilities.

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. Repo-local status and diff remained readable.
- Sandboxed targeted Vitest failed at Vite config loading with `EPERM` on `node_modules/.vite-temp`. Classification: environment/sandbox warning. Action: reran with filesystem escalation and reached tests.
- First escalated targeted test run failed one new Hero/Profile route assertion. Classification: test synchronization issue. Action: waited for loaded profile content and reran targeted tests successfully.
- Git diff commands emitted LF-to-CRLF warnings. Classification: environment/line-ending warning. `git diff --check` exited with no whitespace errors.
- First full `npm run validate` failed at `npm audit` with `getaddrinfo ENOTFOUND registry.npmjs.org`. Classification: transient network/DNS warning, validation blocker until rerun. Action: reran `npm run audit` successfully, then reran full `npm run validate` successfully.
- First `npm run format:check` after implementation flagged RPG-12 files plus previously committed RPG-10/RPG-11 files. Classification: validation blocker until formatter reconciliation. Action: ran Prettier on the exact flagged files plus the new RPG-12 handoff. Previously committed RPG-10/RPG-11 files showed no substantive diff afterward, only line-ending warnings.
- Source-of-truth mismatch: checked-in roadmap ordering may still be stale, while merged project history has RPG-10 as Journey Log, RPG-11 as Badge Gallery, and RPG-12 as Hero/Profile. Classification: documentation/source-of-truth mismatch. Resolution: followed the attached RPG-12 directive and merged history; Journey Log and Badge Gallery were not reimplemented.

Notes:

- No new dependencies.
- No new assets.
- No schema/storage changes.
- No runtime network behavior.
- No direct database table imports in RPG route components.
- No Journey Log implementation or redesign was started.
- No Badge Gallery implementation or redesign was started.
- No scoring behavior was added or changed.
- Historical note: this entry was written before the RPG-12 work was merged. It is not a current pending-commit status.

## RPG-13 Settings/FAQ/Backup Trust validation

Branch: `rpg/13-rpg-settings-faq-backup-trust`

Summary:

- Replaced the `/rpg/settings` stub with a real read-only Settings/FAQ/trust route.
- Explains local browser/device storage, no ProgressPal account, no cloud sync, no hidden analytics, and browser-storage loss risk.
- Links to classic `/settings` for existing export/import/reset controls instead of duplicating write behavior.
- Explains backups are the user's responsibility and export/import is the recovery path.
- Explains reset local data as destructive and local-only.
- Explains RPG routes are an alternate interface over the same local ProgressPal records.
- Explains RPG rank, badges, profile, and activity summaries are local ProgressPal interpretations, not official CS50/Harvard/edX/OpenCourseWare status.
- Did not add dependencies, assets, storage, schema, network behavior, XP behavior, achievements, or backup/import/reset behavior changes.

Validation:

- Required initial evidence:
  - `git status -sb`: branch `rpg/13-rpg-settings-faq-backup-trust`; clean at inspection; emitted global-ignore permission warning.
  - `git log --oneline --decorate -5`: `1d082ce (HEAD -> rpg/13-rpg-settings-faq-backup-trust, origin/rpg/v2, rpg/v2) Merge pull request #20 from ruishinor/rpg/12-rpg-hero-profile`; `2d603cd rpg-12: build RPG hero profile`; `1c1390d Merge pull request #19 from ruishinor/rpg/11-rpg-badge-gallery`; `486b756 rpg-11: build RPG badge gallery`; `9028900 Merge pull request #18 from ruishinor/rpg/10-rpg-journey-log`.
  - `git diff --name-status`: no output.
  - `git diff --stat`: no output.
  - `git diff --check`: no output.
- Formatting before targeted test:
  - `npx prettier --write src/features/rpg/routes/RpgSettingsPage.tsx src/styles/rpg-components.css tests/app/App.test.tsx`: pass.
- Sandboxed targeted test attempt:
  - `npm run test -- tests/app/App.test.tsx`: failed before tests ran because Vite could not write `node_modules/.vite-temp/...`.
- Escalated targeted validation:
  - `npm run test -- tests/app/App.test.tsx`: pass.
  - Result: 1 file passed, 83 tests passed.
- First full `npm run validate` attempt: failed at `format:check`.
  - `npm run lint`: pass.
  - `npm run format:check`: failed; Prettier flagged previously committed RPG-10/RPG-12 files plus `docs/rpg-v2/VALIDATION_LOG.md`.
- Formatter reconciliation:
  - `npx prettier --write` on the exact flagged files: pass.
  - The previously committed flagged files produced no substantive tracked diff after index refresh; only LF-to-CRLF warnings remained.
- Full validation after formatter reconciliation:
  - `npm run validate` pass 1: pass.
    - `npm run lint`: pass.
    - `npm run format:check`: pass.
    - `npm run typecheck`: pass.
    - `npm run build`: pass.
    - `npm run test`: pass; 37 files passed, 310 tests passed.
    - `npm run test:e2e`: pass; 24 tests passed.
    - `npm run check:circular`: pass; no circular dependencies.
    - `npm run audit`: pass; 0 vulnerabilities.
  - `npm run validate` pass 2: pass.
    - `npm run lint`: pass.
    - `npm run format:check`: pass.
    - `npm run typecheck`: pass.
    - `npm run build`: pass.
    - `npm run test`: pass; 37 files passed, 310 tests passed.
    - `npm run test:e2e`: pass; 24 tests passed.
    - `npm run check:circular`: pass; no circular dependencies.
    - `npm run audit`: pass; 0 vulnerabilities.
  - `npm run validate` pass 3: failed during `npm run test`.
    - `npm run lint`: pass.
    - `npm run format:check`: pass.
    - `npm run typecheck`: pass.
    - `npm run build`: pass.
    - `npm run test`: failed; `tests/app/App.test.tsx > App > redirects a fresh run to onboarding` stayed on the loading shell until timeout.
  - Targeted reproducibility check after failed full pass:
    - `npm run test -- tests/app/App.test.tsx`: pass; 1 file passed, 83 tests passed.
- Restarted three-pass full validation cadence after the non-reproducible full-suite failure:
  - `npm run validate` restarted pass 1: pass.
    - `npm run lint`: pass.
    - `npm run format:check`: pass.
    - `npm run typecheck`: pass.
    - `npm run build`: pass.
    - `npm run test`: pass; 37 files passed, 310 tests passed.
    - `npm run test:e2e`: pass; 24 tests passed.
    - `npm run check:circular`: pass; no circular dependencies.
    - `npm run audit`: pass; 0 vulnerabilities.
  - `npm run validate` restarted pass 2: pass.
    - `npm run lint`: pass.
    - `npm run format:check`: pass.
    - `npm run typecheck`: pass.
    - `npm run build`: pass.
    - `npm run test`: pass; 37 files passed, 310 tests passed.
    - `npm run test:e2e`: pass; 24 tests passed.
    - `npm run check:circular`: pass; no circular dependencies.
    - `npm run audit`: pass; 0 vulnerabilities.
  - `npm run validate` restarted pass 3: pass.
    - `npm run lint`: pass.
    - `npm run format:check`: pass.
    - `npm run typecheck`: pass.
    - `npm run build`: pass.
    - `npm run test`: pass; 37 files passed, 310 tests passed.
    - `npm run test:e2e`: pass; 24 tests passed.
    - `npm run check:circular`: pass; no circular dependencies.
    - `npm run audit`: pass; 0 vulnerabilities.

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. Repo-local status and diff remained readable.
- Sandboxed targeted Vitest failed at Vite config loading with `EPERM` on `node_modules/.vite-temp`. Classification: environment/sandbox warning. Action: reran with filesystem escalation and reached tests.
- Git diff commands emitted LF-to-CRLF warnings. Classification: environment/line-ending warning. `git diff --check` exited with no whitespace errors.
- First full `npm run validate` failed at `format:check` because Prettier flagged existing files from earlier RPG modules. Classification: validation blocker until formatter reconciliation. Action: ran Prettier on the exact flagged files and refreshed the git index for no-content-diff files; unrelated files were not left in `git diff --name-status`.
- Third full `npm run validate` attempt after two clean passes failed one existing App onboarding test because the app stayed on the loading shell until the test timeout. Classification: non-reproducible full-suite initialization race. Action: reran `npm run test -- tests/app/App.test.tsx` successfully, then restarted the full validation cadence. Clean validation impact: no clean validation claim was made from the interrupted streak; three subsequent consecutive full validation passes completed cleanly.

Notes:

- No new dependencies.
- No new assets.
- No schema/storage changes.
- No runtime network behavior.
- No backup/export/import/reset behavior changes.
- No XP, achievement, Journey Log, Badge Gallery, or Hero/Profile behavior changes.
- No direct database table imports in the RPG Settings route.
- Source-of-truth mismatch: checked-in roadmap ordering may still be stale, while merged project history has RPG-10 Journey Log, RPG-11 Badge Gallery, RPG-12 Hero/Profile, and RPG-13 Settings/FAQ. Resolution: followed the attached RPG-13 directive and merged history.

## RPG-14 Asset Pass and Visual Polish validation

Branch: `rpg/14-asset-pass-visual-polish`

Summary:

- Performed a CSS-only RPG visual polish pass because the RPG asset ledger contained planned assets but no approved production RPG assets.
- Added scoped RPG panel, map node, resource placeholder, status pill, progress bar, button, bottom-nav, and reduced-motion polish in `src/styles/rpg-components.css`.
- Added an architecture guard that scans `src/styles/rpg-*.css` for CSS imports, remote CSS asset URLs, and inline data-URL blobs.
- Did not add asset files, dependencies, route component changes, storage/schema changes, network behavior, XP behavior, rank changes, achievement changes, backup behavior, or classic route changes.

Validation:

- Required initial evidence:
  - `git status -sb`: branch `rpg/14-asset-pass-visual-polish`; clean at inspection; emitted global-ignore permission warning.
  - `git log --oneline --decorate -5`: `62fcd02 (HEAD -> rpg/14-asset-pass-visual-polish, origin/rpg/v2, rpg/v2) Merge pull request #21 from ruishinor/rpg/13-rpg-settings-faq-backup-trust`; `d8319f5 rpg-13: add RPG settings FAQ and backup trust copy`; `1d082ce Merge pull request #20 from ruishinor/rpg/12-rpg-hero-profile`; `2d603cd rpg-12: build RPG hero profile`; `1c1390d Merge pull request #19 from ruishinor/rpg/11-rpg-badge-gallery`.
  - `git diff --name-status`: no output.
  - `git diff --stat`: no output.
  - `git diff --check`: no output.
- Asset-ledger inspection:
  - `docs/rpg-v2/ASSETS.md`: RPG-14 is listed as the main asset pass, but concrete production asset rows remained `Planned`.
  - `src/features/rpg/assets/`: directory absent at inspection.
  - Decision: no assets were imported, created, or referenced.
- Formatting before targeted tests:
  - `npx prettier --write src/styles/rpg-components.css tests/architecture/rpgFeature.test.ts docs/rpg-v2/modules/RPG-14-HANDOFF.md`: pass.
- Targeted validation:
  - `npm run test -- tests/app/App.test.tsx tests/architecture/rpgFeature.test.ts`: pass.
  - Result: 2 files passed, 85 tests passed.
- First full `npm run validate` attempt: failed at `format:check`.
  - `npm run lint`: pass.
  - `npm run format:check`: failed; Prettier flagged previously committed RPG-13/App files plus `docs/rpg-v2/VALIDATION_LOG.md`.
- Formatter reconciliation:
  - `npx prettier --write docs/rpg-v2/modules/RPG-13-HANDOFF.md docs/rpg-v2/VALIDATION_LOG.md src/features/rpg/routes/RpgSettingsPage.tsx tests/app/App.test.tsx`: pass.
  - The previously committed flagged files produced no substantive tracked diff after index refresh; only LF-to-CRLF warnings remained.
- Restarted three-pass full validation cadence after formatter reconciliation:
  - `npm run validate` pass 1: pass.
    - `npm run lint`: pass.
    - `npm run format:check`: pass.
    - `npm run typecheck`: pass.
    - `npm run build`: pass; production CSS bundle `dist/assets/index-D3nZquNS.css` was 57.29 kB / 9.30 kB gzip.
    - `npm run test`: pass; 37 files passed, 311 tests passed.
    - `npm run test:e2e`: pass; 24 tests passed.
    - `npm run check:circular`: pass; no circular dependencies.
    - `npm run audit`: pass; 0 vulnerabilities.
  - `npm run validate` pass 2: pass.
    - `npm run lint`: pass.
    - `npm run format:check`: pass.
    - `npm run typecheck`: pass.
    - `npm run build`: pass; production CSS bundle `dist/assets/index-D3nZquNS.css` was 57.29 kB / 9.30 kB gzip.
    - `npm run test`: pass; 37 files passed, 311 tests passed.
    - `npm run test:e2e`: pass; 24 tests passed.
    - `npm run check:circular`: pass; no circular dependencies.
    - `npm run audit`: pass; 0 vulnerabilities.
  - `npm run validate` pass 3: pass.
    - `npm run lint`: pass.
    - `npm run format:check`: pass.
    - `npm run typecheck`: pass.
    - `npm run build`: pass; production CSS bundle `dist/assets/index-D3nZquNS.css` was 57.29 kB / 9.30 kB gzip.
    - `npm run test`: pass; 37 files passed, 311 tests passed.
    - `npm run test:e2e`: pass; 24 tests passed.
    - `npm run check:circular`: pass; no circular dependencies.
    - `npm run audit`: pass; 0 vulnerabilities.
- Final evidence-update validation:
  - `npx prettier --write docs/rpg-v2/modules/RPG-14-HANDOFF.md docs/rpg-v2/VALIDATION_LOG.md`: pass.
  - `npm run test -- tests/app/App.test.tsx tests/architecture/rpgFeature.test.ts`: pass; 2 files passed, 85 tests passed.
  - `npm run validate` final pass 1: pass; lint, format, typecheck, build, 37 files / 311 unit tests, 24 E2E tests, circular check, and audit all passed.
  - `npm run validate` final pass 2: pass; lint, format, typecheck, build, 37 files / 311 unit tests, 24 E2E tests, circular check, and audit all passed.
  - `npm run validate` final pass 3: pass; lint, format, typecheck, build, 37 files / 311 unit tests, 24 E2E tests, circular check, and audit all passed.

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. Repo-local status and diff remained readable.
- Git diff commands emitted LF-to-CRLF warnings. Classification: environment/line-ending warning. `git diff --check` exited with no whitespace errors.
- First full `npm run validate` failed at `format:check` because Prettier flagged existing RPG-13/App files plus the validation log. Classification: validation blocker until formatter reconciliation. Action: ran Prettier on the exact flagged files and refreshed the git index for no-content-diff files; no unrelated substantive diff was retained.

Notes:

- No package or dependency changes.
- No new assets and no `docs/rpg-v2/ASSETS.md` change.
- No schema/storage changes.
- No runtime network behavior or external CSS asset behavior.
- No backup/export/import/reset behavior changes.
- No XP, rank, achievement, Journey Log, Badge Gallery, Hero/Profile, Settings, or classic route behavior changes.
- No direct database table imports in RPG UI files.
- Source-of-truth mismatch: checked-in roadmap ordering may still be stale, while merged project history has RPG-10 Journey Log, RPG-11 Badge Gallery, RPG-12 Hero/Profile, RPG-13 Settings/FAQ, and RPG-14 Asset pass. Resolution: followed the attached RPG-14 directive and merged history.

## RPG-15 Release Candidate validation

Branch: `rpg/15-release-candidate`

Summary:

- Ran release-candidate validation for classic/RPG coexistence.
- Found one real layout blocker: `/rpg` overflowed by 4px at a 390px mobile viewport.
- Corrected the mobile RPG bottom-nav margin in `src/styles/rpg-shell.css`.
- Added `e2e/release-candidate.spec.ts` to check required classic and RPG routes across mobile, tablet, and desktop viewports.
- Did not change package files, dependencies, schema/storage, XP/rank/achievement behavior, backup/export/import/reset behavior, routes, assets, network behavior, or classic route behavior.

Required initial evidence:

- `git status -sb`: branch `rpg/15-release-candidate`; clean at inspection; emitted global-ignore permission warning.
- `git log --oneline --decorate -5`: `f6552fc (HEAD -> rpg/15-release-candidate, origin/rpg/v2, rpg/v2) Merge pull request #22 from ruishinor/rpg/14-asset-pass-visual-polish`; `cfe4ee2 rpg-14: polish RPG visuals and approved assets`; `62fcd02 Merge pull request #21 from ruishinor/rpg/13-rpg-settings-faq-backup-trust`; `d8319f5 rpg-13: add RPG settings FAQ and backup trust copy`; `1d082ce Merge pull request #20 from ruishinor/rpg/12-rpg-hero-profile`.
- `git diff --name-status`: no output.
- `git diff --stat`: no output.
- `git diff --check`: no output.

Release-candidate checks:

- Classic route regression:
  - Routes checked: `/`, `/dashboard`, `/course`, `/course/week-0-lecture`, `/sessions`, `/achievements`, `/insights`, `/settings`.
  - Evidence: App tests, route-definition tests, and new RC viewport Playwright spec passed after the corrective patch.
- RPG route regression:
  - Routes checked: `/rpg`, `/rpg/map`, `/rpg/week/week-4`, `/rpg/resource/week-0-lecture`, `/rpg/focus`, `/rpg/hero`, `/rpg/badges`, `/rpg/log`, `/rpg/settings`.
  - Evidence: App tests cover route rendering/passive no-mutation; new RC viewport Playwright spec passed after the corrective patch.
- Data checks:
  - Evidence: backup unit tests passed; settings E2E passed export/reset/onboarding restore/settings import/invalid import; offline E2E passed backup export/reset/import with service worker active.
  - Backup/export/import/reset semantics were unchanged.
- Local-first/privacy checks:
  - Evidence: `tests/architecture/localOnly.test.ts`, `tests/architecture/rpgFeature.test.ts`, source inspection, offline E2E, and full validation passed.
  - No backend, account/auth, cloud sync, analytics/telemetry, runtime external assets, embedded external media, or non-click network behavior found.
- Asset/brand checks:
  - Evidence: `docs/rpg-v2/ASSETS.md`, `tests/architecture/rpgFeature.test.ts`, source inspection, and full validation.
  - No new assets; no wholesale asset import; no official-looking CS50/Harvard/edX/OpenCourseWare/shield/trophy/institutional marks added.
- Accessibility/layout checks:
  - Evidence: `e2e/accessibility.spec.ts` and `e2e/release-candidate.spec.ts`.
  - Keyboard focus, reduced motion, and mobile/tablet/desktop layout checks passed after correction.

Validation:

- Initial targeted Vitest release set:
  - `npm run test -- tests/app/App.test.tsx tests/architecture/routeDefinitions.test.ts tests/architecture/localOnly.test.ts tests/architecture/rpgFeature.test.ts tests/lib/backup.test.ts`: pass; 5 files passed, 111 tests passed.
- Initial targeted Playwright release set:
  - `npx playwright test e2e/settings.spec.ts e2e/accessibility.spec.ts e2e/offline.spec.ts`: pass; 10 tests passed.
- Corrective layout validation:
  - `npx prettier --write src/styles/rpg-shell.css e2e/release-candidate.spec.ts`: pass.
  - `npx playwright test e2e/release-candidate.spec.ts`: pass; 1 test passed.
- Post-fix targeted release validation:
  - `npm run test -- tests/app/App.test.tsx tests/architecture/routeDefinitions.test.ts tests/architecture/localOnly.test.ts tests/architecture/rpgFeature.test.ts tests/lib/backup.test.ts`: pass; 5 files passed, 111 tests passed.
  - `npx playwright test e2e/release-candidate.spec.ts e2e/settings.spec.ts e2e/accessibility.spec.ts e2e/offline.spec.ts`: pass; 11 tests passed.
- Final documentation/update validation:
- Initial validation blocked by Prettier on committed RPG-14 files.
- Formatter reconciliation was performed on the exact flagged files.
- One later full validation passed, then a subsequent run failed in Playwright.
- Failure was traced to the new RC test being too broad as one 51-route-navigation test.
- RC test was split into one test per viewport.
- Targeted RC/settings/XP tests passed.
- Full E2E passed with 27 tests.
- Three consecutive full npm run validate passes then passed.

Warnings and anomalies:

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`. Classification: environment warning. Repo-local status and diffs remained readable.
- First ad hoc viewport smoke failed with `spawn EINVAL`. Classification: tooling command-launch issue. Action: retried with Windows shell invocation. No product conclusion drawn.
- Second ad hoc viewport smoke timed out during onboarding setup. Classification: test-script synchronization issue. Action: retried with explicit onboarding navigation/waiting. No product conclusion drawn.
- Adjusted viewport smoke found `mobile horizontal overflow 4 at /rpg`. Classification: real release-candidate layout blocker. Action: corrected mobile RPG bottom-nav margin and added an automated RC route/layout guard.
- One diagnostic smoke timed out before printing overflow details. Classification: tooling/server lifecycle issue in the one-off script. Action: replaced ad hoc smoke with normal Playwright spec.
- Combined `npx prettier ... && npx playwright ...` command failed because this PowerShell version does not support `&&`. Classification: shell syntax issue. Action: reran commands separately.
- Early versions of `e2e/release-candidate.spec.ts` failed due route-readiness selector issues and parallel memory pressure. Classification: new-test implementation issues. Action: exact heading matching, corrected `/rpg/focus` ready state, longer async wait, and sequential viewport checks.

Notes:

- `docs/rpg-v2/RISK_REGISTER.md` was inspected and not changed. No standing risk status changed; the discovered layout blocker was corrected inside RPG-15.
- Release decision: pass after targeted checks, full E2E, and three consecutive local full `npm run validate` passes completed.
- Scope discipline: see `docs/rpg-v2/modules/RPG-15-HANDOFF.md`.

## v1.3 remediation foundation — 2026-07-13

Branch: `cx/release-1.3.0-remediation`

Baseline: `67ed6af836ec46f136bc5622aa68c8745c8bcf40`

Current status: implementation in progress; no module or release certification claimed.

Evidence:

- Existing dirty stabilization work was preserved and inventoried in `docs/audits/progresspal-1.3.0-remediation-inventory.md`.
- Historical tags `v1.2.0-local-first-proof` and `v1.2.1-local-first-proof` remain unchanged; the next candidate identity is `1.3.0`.
- Default `npm test` timed out after 120 seconds before a test result and leaked 187 Codex-launched cmd/Node test trees. The leaked trees were contained without terminating direct Codex or unrelated user processes.
- A single-worker targeted Vitest run passed 10/10 tests.
- A single-worker full Vitest baseline passed 39/39 files and 367/367 tests.
- The managed production Playwright baseline passed 31/31 cases.

Interpretation:

- Earlier three-pass results remain historical evidence for their exact prior byte state. They do not certify the current remediation state.
- Process termination and cleanup are part of release correctness. The unconstrained Vitest command is not an acceptable gate even when assertions previously passed.
- Final counted passes require Node 24/npm 11, repository LF policy, an immutable commit/tree/lockfile, `npm ci`, the canonical gate, and zero errors, warnings, flags, retries, or skips.
