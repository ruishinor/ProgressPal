# RPG-12 Handoff - Hero Profile

## Module and Goal

RPG-12 - Hero/Profile.

Goal: implement `/rpg/hero` as a read-only RPG profile summary over existing local ProgressPal data.

Branch: `rpg/12-rpg-hero-profile`.

Base: `1c1390d Merge pull request #19 from ruishinor/rpg/11-rpg-badge-gallery`.

## Initial Evidence

- `git status -sb`: branch `rpg/12-rpg-hero-profile`; clean at inspection; emitted the existing global-ignore permission warning.
- `git log --oneline --decorate -5`: `1c1390d (HEAD -> rpg/12-rpg-hero-profile, origin/rpg/v2, rpg/v2) Merge pull request #19 from ruishinor/rpg/11-rpg-badge-gallery`; `486b756 rpg-11: build RPG badge gallery`; `9028900 Merge pull request #18 from ruishinor/rpg/10-rpg-journey-log`; `f1024bc rpg-10: build RPG journey log`; `9aa3984 Merge pull request #16 from ruishinor/rpg/09-rpg-week4-vertical-slice`.
- `git diff --name-status`: no output.
- `git diff --stat`: no output.
- `git diff --check`: no output.

## Files Changed

- `src/features/rpg/model/types.ts`
- `src/features/rpg/model/readModels.ts`
- `src/features/rpg/index.ts`
- `src/features/rpg/routes/RpgHeroPage.tsx`
- `src/styles/rpg-components.css`
- `tests/features/rpg/readModels.test.ts`
- `tests/app/App.test.tsx`
- `docs/rpg-v2/modules/RPG-12-HANDOFF.md`
- `docs/rpg-v2/VALIDATION_LOG.md`

## Why Each File Changed

- `src/features/rpg/model/types.ts`: adds Hero/Profile summary type.
- `src/features/rpg/model/readModels.ts`: adds a narrow read-only Hero/Profile read model composed from existing Hub and Badge Gallery projections.
- `src/features/rpg/index.ts`: exports the new read model and type through the RPG feature boundary.
- `src/features/rpg/routes/RpgHeroPage.tsx`: replaces the Hero stub with a functional read-only profile route.
- `src/styles/rpg-components.css`: adds scoped `.rpg-hero*` styling only.
- `tests/features/rpg/readModels.test.ts`: adds Hero/Profile read-model coverage and missing-profile fallback coverage.
- `tests/app/App.test.tsx`: adds route-level Hero/Profile empty and populated coverage and updates passive route readiness.
- `docs/rpg-v2/modules/RPG-12-HANDOFF.md`: records implementation, validation, warnings, risks, and source-of-truth reconciliation.
- `docs/rpg-v2/VALIDATION_LOG.md`: records RPG-12 evidence and validation status.

## What Hero Profile Now Does

- Renders `/rpg/hero` as a real RPG route instead of a stub.
- Shows learner name from the existing local profile with a CSS-only initials marker.
- Shows existing RPG identity labels:
  - rank;
  - path `CS Foundations`;
  - class `Generalist`;
  - guild `Code Knights`.
- Shows XP level, total XP, and XP to next level from existing XP transactions.
- Shows required-course progress from existing progress/course data.
- Shows study session count and total study time from existing sessions.
- Shows earned badge count vs total available badges from the existing Badge Gallery read model.
- Shows recent saved activity from existing Hub read-model behavior.
- Shows a useful new-user empty state.
- Links to Hub, Map, Badge Gallery, and Journey Log.
- Reads local data only and does not evaluate achievements or write to any store on page render.

## Deliberately Not Added

- No new profile fields.
- No avatar editor.
- No new persisted class/path/guild preference.
- No new achievements.
- No new achievement criteria.
- No XP rule changes or XP award behavior.
- No passive achievement unlock behavior.
- No Journey Log implementation or redesign.
- No Badge Gallery implementation or redesign.
- No backend/auth/cloud/network behavior.
- No IndexedDB schema change.
- No new assets.
- No broad RPG shell redesign.
- No classic route behavior change.
- No direct database repository imports into the route component.

## Tests Authored or Updated

- `tests/features/rpg/readModels.test.ts`
  - Added `loads Hero Profile from local progress, XP, sessions, and badges without mutation`.
  - Added `builds Hero Profile with a safe learner fallback when profile is missing`.
- `tests/app/App.test.tsx`
  - Added `renders a useful empty Hero Profile state without mutating local stores`.
  - Added `renders Hero Profile from real local progress, sessions, XP, and badges without mutation`.
  - Updated remaining RPG route shell coverage for the real `Hero Profile` heading.
  - Updated `/rpg/hero` passive route readiness to wait for loaded profile content.

## Validation

Current status: implemented locally and validated.

Observed checks:

- Initial targeted test attempt: `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts` failed before tests ran because Vite could not write `node_modules/.vite-temp/...` in the sandbox.
- Escalated targeted test attempt: failed one route assertion because the test asserted loaded profile content after the always-present page heading while the route was still loading.
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

## Warning and Anomaly Classification

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`.
  - Classification: environment warning.
  - Impact: repo-local status and diffs remained readable.

- Sandboxed targeted Vitest failed at Vite config loading with `EPERM` on `node_modules/.vite-temp`.
  - Classification: environment/sandbox warning.
  - Action: reran the same command with filesystem escalation.

- First escalated targeted test run failed one new Hero/Profile route assertion.
  - Classification: test synchronization issue.
  - Action: changed the assertion to wait for loaded profile content; reran targeted tests successfully.

- Git diff commands emitted LF-to-CRLF warnings.
  - Classification: environment/line-ending warning.
  - Impact: `git diff --check` exited with no whitespace errors.

- First full `npm run validate` failed at `npm audit` with `getaddrinfo ENOTFOUND registry.npmjs.org`.
  - Classification: transient network/DNS warning, validation blocker until rerun.
  - Action: reran `npm run audit` successfully, then reran full `npm run validate` successfully.

- First `npm run format:check` after implementation flagged RPG-12 files plus previously committed RPG-10/RPG-11 files.
  - Classification: validation blocker until formatter reconciliation.
  - Action: ran Prettier on the exact flagged files plus the new RPG-12 handoff. Previously committed RPG-10/RPG-11 files showed no substantive diff afterward, only line-ending warnings.

## Adversarial Review

- Risk: `/rpg/hero` could become a hidden writer by saving profile/avatar choices. Mitigation: no controls or writer APIs were added; the route calls only the RPG Hero/Profile read model.
- Risk: Hero/Profile could invent RPG identity or stats. Mitigation: identity labels reuse existing Hub summary labels, and stats are derived from XP, course progress, sessions, badges, and recent activity.
- Risk: Hero/Profile could duplicate Journey Log or Badge Gallery logic. Mitigation: it displays small summary/link surfaces only; no Journey Log or Badge Gallery behavior was redesigned.
- Risk: profile visuals could imply official CS50/Harvard identity. Mitigation: CSS-only initials marker, no institutional art, no new assets.
- Risk: route code could bypass model boundaries and import database repositories directly. Mitigation: route imports the RPG read model only; existing architecture guard covers RPG UI database imports.

## Retrospective

Composing from existing Hub and Badge Gallery read models was the lowest-risk path. It kept rank, XP, progress, study totals, badge counts, and recent activity consistent with already validated RPG surfaces while avoiding a second formula set.

The main implementation correction was test synchronization: `Hero Profile` appears in both loading and ready states, so route tests must wait for loaded profile content before asserting populated values.

## Risk Review

1. Work mode: normal feature module.
2. New product risk introduced: low; read-only projection over existing stores.
3. Existing risk severity changed: no.
4. Risk mitigated: `/rpg/hero` is no longer a dead stub and has no-mutation tests.
5. Accepted risk: profile marker is a simple CSS initials placeholder until any future approved asset pass.
6. Source-of-truth inconsistencies: checked-in roadmap ordering may be stale; actual merged history is RPG-10 Journey Log, RPG-11 Badge Gallery, RPG-12 Hero/Profile. This module follows merged history.
7. Warnings/anomalies: classified above.
8. Implementation/evidence status: implemented locally and validated, including final evidence-update rerun.
9. Blocking risk for next module: none identified from RPG-12 validation; commit and PR review remain pending.

## Source-of-Truth Reconciliation

- Attached module request: RPG-12 is Hero/Profile.
- Current branch: `rpg/12-rpg-hero-profile`.
- Actual merged history: RPG-10 is Journey Log and RPG-11 is Badge Gallery.
- Roadmap conflict: stale ordering may still exist in checked-in roadmap.
- Resolution used: branch request and merged git history are treated as current module truth.
- Explicit deferrals: Journey Log and Badge Gallery were not reimplemented; no roadmap renumbering was performed.
- Decision-log conflict: none blocking.

## Scope Discipline Check

- Intended module: RPG-12 - Hero/Profile.
- Work mode: Next-module implementation.
- Files changed: listed above.
- Why each changed file was necessary: listed above.
- What was deliberately not added: listed above.
- New dependencies: none.
- New assets: none.
- New storage/schema: none.
- Runtime network behavior changed: no.
- Classic route behavior changed: no.
- Source-of-truth reconciliation: completed; stale roadmap ordering noted.
- Warnings and anomalies: classified above.
- Validation cadence used: normal module plus final evidence-update rerun; targeted tests passed and three consecutive full validation passes completed.
- Commit status: uncommitted local work.
- Any deferred tempting work: avatar editor, stat formulas beyond existing metrics, badge art, profile customization, broader visual polish, and roadmap renumbering.

## Commit Status

Not committed. Awaiting user review.
