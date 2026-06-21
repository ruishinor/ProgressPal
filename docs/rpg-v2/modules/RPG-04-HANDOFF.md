# RPG-04 Handoff - Quest Hub

## Module and Goal

RPG-04 - Quest Hub slice.

Goal: build `/rpg` as the main RPG dashboard / quest hub using only real existing ProgressPal data.

Work mode: Mode C - Next-module implementation.

Branch: `rpg/04-rpg-hub`.

## Roadmap Acceptance Criteria

- Every number comes from existing data.
- Opening Hub does not mutate data.
- Continue action opens a real route.
- Empty state is useful.
- Full validation passes once cleanly.

## Files Changed

- `src/features/rpg/model/types.ts`
- `src/features/rpg/model/readModels.ts`
- `src/features/rpg/routes/RpgHomePage.tsx`
- `src/styles/rpg-components.css`
- `tests/features/rpg/readModels.test.ts`
- `tests/app/App.test.tsx`
- `docs/rpg-v2/modules/RPG-04-HANDOFF.md`
- `docs/rpg-v2/VALIDATION_LOG.md`

## Why Each File Changed

- `src/features/rpg/model/types.ts`: adds typed Hub fields for derived identity, current module, weekly progress, and recent saved activity.
- `src/features/rpg/model/readModels.ts`: derives rank, fixed v2 path/class/guild labels, current module, current-week local progress, and recent saved activity from the existing local snapshot.
- `src/features/rpg/routes/RpgHomePage.tsx`: replaces the stub Hub with the RPG-04 dashboard using RPG-03 primitives and the existing Hub read model.
- `src/styles/rpg-components.css`: adds scoped `.rpg-hub*` layout styles under `.rpg-shell`.
- `tests/features/rpg/readModels.test.ts`: verifies real-data Hub derivation and read-only behavior.
- `tests/app/App.test.tsx`: verifies `/rpg` renders required Hub content, useful empty state, real continue routes, forbidden copy absence, and passive no-mutation route behavior.
- `docs/rpg-v2/modules/RPG-04-HANDOFF.md`: records module evidence.
- `docs/rpg-v2/VALIDATION_LOG.md`: records RPG-04 validation and read-only route evidence.

## What the Hub Shows

- Learner name.
- XP total, level, and XP to next level from the existing XP transaction/read-model path.
- Rank derived from required-course completion percentage.
- Path/class as `CS Foundations / Generalist`.
- Guild as `Code Knights`.
- Current module/week derived from the current recommended quest.
- Current recommended item.
- Continue action to the recommended item's real `/rpg/resource/:itemId` route, or a real fallback route.
- This week's local saved progress, required completions, sessions, minutes, and XP.
- Recent saved activity from progress entries, study sessions, and XP transactions.
- Clear new-user empty state.

## Deliberately Not Added

- No fake energy.
- No fake daily reward.
- No unsupported streak.
- No fake locked adventure.
- No official CS50 completion language.
- No user-customizable guild names.
- No future class/path chooser.
- No fake RPG mechanics.
- No new XP formula.
- No new achievement behavior.
- No schema/storage changes.
- No direct database imports in RPG UI components.
- No runtime network behavior.
- No dependencies.
- No assets.
- No broad RPG data service.
- No work on full Map, Week, Study Resource, Focus, Hero, Badges, Log, or Settings screens beyond real links needed by the Hub.

## Tests and Validation

- `npm run test -- tests/features/rpg/readModels.test.ts tests/app/App.test.tsx`: pass; 2 files / 69 tests.
- `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files / 286 tests.
  - `npm run test:e2e`: pass; 24 tests.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.

## Warning and Anomaly Classification

- Command: `git status -sb`
  - Warning: `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`
  - Classification: environment warning.
  - Action taken: recorded; repo-local status and diff remained readable.
  - Clean validation impact: no.

- Command: initial targeted `npm run test -- tests/features/rpg/readModels.test.ts tests/app/App.test.tsx`
  - Warning/failure: sandbox blocked Vite temp config write under `node_modules/.vite-temp`.
  - Classification: environment/sandbox warning.
  - Action taken: reran with elevated filesystem access; targeted tests passed.
  - Clean validation impact: no after elevated rerun passed.

- Command: first targeted test rerun
  - Failure: test fixture omitted `startedAt` for `addStudySessionAndAwardXp`.
  - Classification: test fixture bug.
  - Action taken: fixed the fixture; targeted tests passed after rerun.
  - Clean validation impact: no after fix and rerun.

- Command: targeted route test after fixture fix
  - Failure: recent-activity cap hid the saved study session row behind newer XP/progress rows.
  - Classification: implementation/test expectation mismatch.
  - Action taken: widened the Hub recent-activity cap from 3 to 5 so the Hub shows a more useful recent activity mix; targeted tests passed.
  - Clean validation impact: no after fix and rerun.

- Command: final `npm run validate`
  - Failure: `format:check` flagged existing RPG-03 primitive/docs files after unrelated line-ending-only touches were restored.
  - Classification: validation blocker until formatter reconciliation.
  - Action taken: ran Prettier on the exact flagged files. `git diff --stat` did not show substantive changes for those files; Git status still reports line-ending normalization.
  - Clean validation impact: no if final validation passes after formatter reconciliation.

- Command: `git diff --stat`, `git diff --name-status`, `git diff`
  - Warning: `LF will be replaced by CRLF the next time Git touches it`.
  - Classification: environment/line-ending warning.
  - Action taken: recorded; `git diff --check` remains required before commit.
  - Clean validation impact: no if `git diff --check` passes.

## Risk Review

1. Work mode: Mode C - Next-module implementation.
2. New risk introduced: no new storage, network, dependency, asset, or schema risk. Main residual risk is week-boundary interpretation using UTC week dates for the Hub summary.
3. Existing risk severity changed: no.
4. Risk mitigated: R-005 and R-019 are partially mitigated by real-data Hub tests, forbidden-copy assertions, and passive no-mutation coverage.
5. Accepted risk: none newly accepted.
6. Source-of-truth inconsistencies: none found that block RPG-04. Validation log still contains historical baseline placeholders from earlier modules.
7. Warnings/anomalies: classified above.
8. Implementation/evidence status: Committed with this handoff.
9. Blocking risk for next module: none if final validation and commit complete.

## Source-of-Truth Reconciliation

- Roadmap conflicts found: none.
- Decision-log conflicts found: none.
- Validation-log stale entries found: RPG-04 Hub read-only evidence and handoff status needed updating.
- Handoff inconsistencies found: none.
- Risk-register updates needed: none; no severity/status change.
- Any unresolved inconsistency before commit: none.

## Scope Discipline Check

- Intended module: RPG-04 - Quest Hub slice.
- Work mode: Next-module implementation.
- Files changed: listed above.
- Why each changed file was necessary: listed above.
- What was deliberately not added: fake mechanics, new storage/schema, assets, dependencies, broad services, future route work, and full non-Hub screen work.
- New dependencies: none.
- New assets: none.
- New storage/schema: none.
- Runtime network behavior changed: no.
- Classic route behavior changed: no.
- Source-of-truth reconciliation: no blocking conflicts.
- Warnings and anomalies: classified above.
- Validation cadence used: normal module cadence.
- Commit status: Committed with message `rpg-04: build RPG quest hub`.
- Any deferred tempting work: RPG Map redesign, Focus screen behavior, Hero/Profile expansion, Badge Gallery, Journey Log, Settings, assets, path chooser, guild customization, and richer activity filtering.

Anti-overbuild questions answered:

1. Yes, the Hub is required by RPG-04.
2. Yes, each runtime field supports required Hub content.
3. Yes, the work maps to the roadmap and accepted decisions.
4. Yes, the v1 engine contract is preserved.
5. Yes, same-origin `/rpg/*`, no backend, no schema change, no embedded video, and Level 1 local-first are preserved.
6. No dependency, asset, runtime request, store, preference, or broad abstraction was introduced.
7. Yes, existing read-model patterns, route helpers, database snapshots, and RPG-03 primitives were reused.
8. Yes, each changed file maps directly to RPG-04 acceptance criteria.

## Suggested Next Module

RPG-05 - Campaign Map slice.
