# RPG-11 Handoff - Badge Gallery

## Module and Goal

RPG-11 - Badge Gallery.

Goal: implement `/rpg/badges` as a read-only RPG Badge Gallery over existing achievement definitions and persisted achievement unlock records.

Branch: `rpg/11-rpg-badge-gallery`.

## Initial Evidence

- `git status -sb`: branch `rpg/11-rpg-badge-gallery`; clean at inspection; emitted the existing global-ignore permission warning.
- `git log --oneline --decorate -5`: `9028900 (HEAD -> rpg/11-rpg-badge-gallery, origin/rpg/v2, rpg/v2) Merge pull request #18 from ruishinor/rpg/10-rpg-journey-log`; `f1024bc rpg-10: build RPG journey log`; `9aa3984 Merge pull request #16 from ruishinor/rpg/09-rpg-week4-vertical-slice`; `cffbe33 rpg-09: validate Week 4 vertical slice`; `ac5c03d Merge pull request #15 from ruishinor/rpg/08-rpg-focus-session`.
- `git diff --name-status`: no output.
- `git diff --stat`: no output.
- `git diff --check`: no output.

## Files Changed

- `src/features/rpg/model/types.ts`
- `src/features/rpg/model/readModels.ts`
- `src/features/rpg/index.ts`
- `src/features/rpg/routes/RpgBadgesPage.tsx`
- `src/styles/rpg-components.css`
- `tests/features/rpg/readModels.test.ts`
- `tests/app/App.test.tsx`
- `docs/rpg-v2/modules/RPG-11-HANDOFF.md`
- `docs/rpg-v2/VALIDATION_LOG.md`

## Why Each File Changed

- `src/features/rpg/model/types.ts`: adds Badge Gallery summary and badge item types.
- `src/features/rpg/model/readModels.ts`: adds a narrow read-only Badge Gallery read model over `getDatabaseSnapshot()`, existing code-defined achievement definitions, and persisted unlock rows.
- `src/features/rpg/index.ts`: exports the new read model and types through the RPG feature boundary.
- `src/features/rpg/routes/RpgBadgesPage.tsx`: replaces the route stub with a functional read-only Badge Gallery page.
- `src/styles/rpg-components.css`: adds scoped `.rpg-badges*` styling only.
- `tests/features/rpg/readModels.test.ts`: adds direct read-model coverage for definitions, persisted unlocks, counts, requirement text, earned dates, and no mutation.
- `tests/app/App.test.tsx`: adds route-level empty/locked and earned badge coverage, updates route readiness, and keeps passive route no-mutation coverage.
- `docs/rpg-v2/modules/RPG-11-HANDOFF.md`: records implementation, validation, warnings, risks, and source-of-truth reconciliation.
- `docs/rpg-v2/VALIDATION_LOG.md`: records RPG-11 evidence and validation status.

## What Badge Gallery Now Does

- Renders `/rpg/badges` as a real RPG route instead of a stub.
- Shows `earned`, `locked`, and `total available` badge counts.
- Renders every existing achievement definition as a visible badge card.
- Shows visible achievement names, category labels, status labels, and requirement text.
- Shows earned date when a persisted achievement unlock has `unlockedAt`.
- Shows a useful new-user state while still listing locked badges and their requirements.
- Links back to Hub and Map.
- Uses a CSS-only badge marker; no new assets were added.
- Reads local data only and does not evaluate or unlock achievements on page render.

## Deliberately Not Added

- No new achievements.
- No new achievement criteria.
- No new XP rules or XP award behavior.
- No passive unlock behavior.
- No hidden or mystery badges.
- No official-looking CS50 or Harvard badge art.
- No Hero/Profile implementation.
- No Journey Log implementation.
- No backend/auth/cloud/network behavior.
- No IndexedDB schema change.
- No new assets.
- No broad visual redesign.
- No classic route behavior change.
- No direct database repository imports into the route component.

## Tests Authored or Updated

- `tests/features/rpg/readModels.test.ts`
  - Added `loads Badge Gallery definitions and persisted unlocks without mutation`.
- `tests/app/App.test.tsx`
  - Added `renders a useful locked Badge Gallery state without mutating local stores`.
  - Added `renders earned Badge Gallery records with earned dates without mutation`.
  - Updated remaining RPG route shell coverage for the real `Badge Gallery` heading.
  - Updated `/rpg/badges` passive route readiness to wait for the loaded badge summary.

## Validation

Current status: implemented locally and validated.

Observed checks:

- Initial targeted test attempt: `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts` failed before tests ran because Vite could not write `node_modules/.vite-temp/...` in the sandbox.
- Escalated targeted test attempt: failed one read-model assertion because the test fixture used the wrong seed item id, `week-0-pset`, instead of `week-0-problem-set`.
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

## Warning and Anomaly Classification

- `git status -sb` emitted `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`.
  - Classification: environment warning.
  - Impact: repo-local status and diffs remained readable.

- Sandboxed targeted Vitest failed at Vite config loading with `EPERM` on `node_modules/.vite-temp`.
  - Classification: environment/sandbox warning.
  - Action: reran the same command with filesystem escalation.

- First escalated targeted test run failed one new Badge Gallery read-model assertion.
  - Classification: test fixture issue.
  - Action: corrected the fixture from `week-0-pset` to the real seed id `week-0-problem-set`; reran targeted tests successfully.

- Git diff commands emitted LF-to-CRLF warnings.
  - Classification: environment/line-ending warning.
  - Impact: `git diff --check` exited with no whitespace errors.

- First `npm run format:check` after implementation flagged RPG-11 files plus two previously committed RPG-10 files.
  - Classification: validation blocker until formatter reconciliation.
  - Action: ran Prettier on the exact flagged files. `docs/rpg-v2/modules/RPG-10-HANDOFF.md` and `src/features/rpg/routes/RpgLogPage.tsx` showed no substantive diff afterward, only line-ending warnings.

## Adversarial Review

- Risk: `/rpg/badges` could passively unlock achievements by calling the achievement evaluator. Mitigation: the route calls only `loadRpgBadgeGallerySummary()`, which reads a snapshot and existing definitions/unlocks.
- Risk: Badge Gallery could invent badge criteria or hidden trophies. Mitigation: requirement text is copied from existing achievement definitions; no definitions were added.
- Risk: route code could bypass the RPG model boundary and import database repositories directly. Mitigation: route imports the RPG read model only; existing architecture test covers RPG UI database imports.
- Risk: visual work could drift into badge art or official-looking assets. Mitigation: CSS-only marker, no new assets, no `ASSETS.md` change required.
- Risk: source-of-truth numbering mismatch could cause accidental Hero/Profile work. Mitigation: this module follows the attached RPG-11 directive; Hero/Profile remains unbuilt/deferred; Journey Log is already complete.

## Retrospective

The useful boundary was a small Badge Gallery read model beside the existing RPG Hub, Map, Focus, Study Resource, and Journey Log summaries. The route handles loading/error/presentation state; the model derives counts and badge fields from existing definitions and unlock records.

The main implementation correction was in the test fixture, not product code: the seed item id is `week-0-problem-set`, not `week-0-pset`.

## Risk Review

1. Work mode: normal feature module.
2. New product risk introduced: low; read-only projection over existing achievement state.
3. Existing risk severity changed: no.
4. Risk mitigated: `/rpg/badges` is no longer a dead stub and has no-mutation tests.
5. Accepted risk: badge visuals are intentionally plain CSS placeholders until an approved asset pass.
6. Source-of-truth inconsistencies: checked-in roadmap still labels RPG-10 as Hero/Profile, RPG-11 as Badge Gallery, and RPG-12 as Journey Log, while merged project history has RPG-10 as Journey Log. This module follows the attached RPG-11 Badge Gallery directive and records the mismatch.
7. Warnings/anomalies: classified above.
8. Implementation/evidence status: implemented locally and validated.
9. Blocking risk for next module: none identified after final validation.

## Source-of-Truth Reconciliation

- Attached module request: RPG-11 is Badge Gallery.
- Current branch: `rpg/11-rpg-badge-gallery`.
- Actual merged history: RPG-10 is Journey Log.
- Roadmap conflict: roadmap still labels RPG-10 as Hero/Profile and RPG-12 as Journey Log.
- Resolution used: branch request and merged history are treated as current module truth; Badge Gallery was implemented as RPG-11.
- Explicit deferrals: Hero/Profile remains unbuilt/deferred; Journey Log is already complete and was not duplicated.
- Decision-log conflict: none blocking.

## Scope Discipline Check

- Intended module: RPG-11 - Badge Gallery.
- Work mode: Next-module implementation.
- Files changed: listed above.
- Why each changed file was necessary: listed above.
- What was deliberately not added: listed above.
- New dependencies: none.
- New assets: none.
- New storage/schema: none.
- Runtime network behavior changed: no.
- Classic route behavior changed: no.
- Source-of-truth reconciliation: completed; numbering mismatch recorded.
- Warnings and anomalies: classified above.
- Validation cadence used: normal module; targeted tests and full validation passed after final evidence update.
- Commit status: uncommitted local work.
- Any deferred tempting work: Hero/Profile, badge filters, search, badge art, asset import, broader visual polish, and roadmap renumbering.

## Commit Status

Not committed. Ready for staged review and user-directed commit.
