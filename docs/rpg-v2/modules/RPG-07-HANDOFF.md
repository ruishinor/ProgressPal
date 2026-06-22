# RPG-07 Handoff - Study Resource

## Module and Goal

RPG-07 - Study Resource slice.

Goal: build `/rpg/resource/:itemId` as an honest Study Resource screen over real existing course/progress data, with explicit local progress controls and outbound-only official resources.

Work mode: Mode C - Next-module implementation.

Branch: `rpg/07-rpg-study-resource`.

## Roadmap Acceptance Criteria

- Resource route renders a real course item.
- Official course resource is an outbound link only.
- No iframe, embedded player, fake timeline, fake transcript, or fake media shell is added.
- Local status and notes render from existing progress when available.
- Progress changes only after explicit user action.
- Partial long-form progress cannot silently flip to complete.
- Start Focus and Back to Week links use real RPG routes.
- Passive rendering does not mutate local stores.
- Full validation passes once cleanly before commit.

## Files Changed

- `src/features/rpg/model/readModels.ts`
- `src/features/rpg/model/types.ts`
- `src/features/rpg/model/progressActions.ts`
- `src/features/rpg/routes/RpgResourcePage.tsx`
- `src/styles/rpg-components.css`
- `tests/features/rpg/readModels.test.ts`
- `tests/app/App.test.tsx`
- `docs/rpg-v2/modules/RPG-07-HANDOFF.md`
- `docs/rpg-v2/VALIDATION_LOG.md`

## Why Each File Changed

- `src/features/rpg/model/readModels.ts`: extends the Study Resource summary with item type and saved progress projection from the existing snapshot/read-model path.
- `src/features/rpg/model/types.ts`: records the new Study Resource summary fields used by the route and tests.
- `src/features/rpg/model/progressActions.ts`: exposes a narrow RPG model action over the existing `upsertProgressAndAwardXp` writer so the route does not import database code directly.
- `src/features/rpg/routes/RpgResourcePage.tsx`: replaces the resource shell with the real Study Resource screen, official outbound link, start focus/back links, saved note display, and explicit local progress controls.
- `src/styles/rpg-components.css`: adds scoped `.rpg-study-resource*` layout and form styles under the RPG component stylesheet.
- `tests/features/rpg/readModels.test.ts`: proves Study Resource summaries load real Week 4 data and saved notes without mutating local stores.
- `tests/app/App.test.tsx`: adds route coverage for real resource render, no embedded content, passive no-mutation, explicit partial save, explicit completion, long-form partial completion guard, links, and not-found state.
- `docs/rpg-v2/modules/RPG-07-HANDOFF.md`: records module evidence, validation results, warning/anomaly classifications, source-of-truth reconciliation, and Scope Discipline Check.
- `docs/rpg-v2/VALIDATION_LOG.md`: records RPG-07 route validation, read-only mutation evidence, module handoff status, and validation results.

## What Study Resource Now Shows

- Real resource title from the seeded course item.
- Resource type and estimated time.
- Owning module/week.
- Local status from existing progress/read-model behavior.
- Saved note when existing progress has notes.
- Existing long-form progress summary when available.
- Official outbound link with exact copy: `Open official CS50x resource`.
- Start Focus link to `/rpg/focus?itemId=<itemId>`.
- Back link to `/rpg/week/:unitId`.
- Manual local progress form with status, notes, conditional submission note, confidence, Save local progress, and Mark locally complete.
- Save confirmation using the existing XP award result.
- Loading and not-found states.

## Deliberately Not Added

- No embedded external content.
- No iframe.
- No player chrome.
- No fake transcript.
- No fake timeline or scrubber.
- No auto-open behavior for official links.
- No speculative resource fallback system.
- No new assets.
- No dependencies.
- No schema/storage changes.
- No runtime external course-data fetching.
- No direct database table imports in RPG UI components.
- No Focus implementation beyond linking to the existing selected-item route.
- No RPG-08 work.

## Tests Authored

- `tests/features/rpg/readModels.test.ts`
  - Study Resource summary for `week-4-problem-set` renders real Week 4 data and does not mutate the snapshot.
  - Study Resource summary for `week-4-lecture` includes saved progress notes and does not mutate the snapshot.
- `tests/app/App.test.tsx`
  - `/rpg/resource/week-4-lecture` renders real Week 4 resource data.
  - Official anchor uses `Open official CS50x resource`, targets `_blank`, and does not call `window.open` during passive render.
  - Route does not render iframe/player/transcript/timeline/fake transcript UI.
  - Editing notes does not mutate stores before Save local progress.
  - Save local progress creates a started progress entry without `completedAt`.
  - Partial Week 0 long-form media progress cannot be forced complete from the Study Resource form.
  - Mark locally complete creates a completed Week 4 problem-set progress entry only after button click.
  - Focus/back links target real RPG routes.
  - Missing item renders the not-found state.

## Validation

- `npm run test -- tests/features/rpg/readModels.test.ts tests/app/App.test.tsx`: pass; 2 files / 75 tests.
- First `npm run validate`: failed at `format:check`; Prettier flagged `docs/rpg-v2/modules/RPG-06-HANDOFF.md`, `src/features/rpg/routes/RpgModulePage.tsx`, and `src/lib/routing/rpgRoutePaths.ts`.
- Formatter reconciliation: ran Prettier on the exact three flagged previously committed RPG-06 files. `git diff --name-status` and `git diff --stat` showed no substantive RPG-06 file changes afterward.
- `npm run validate`: pass.
  - `npm run lint`: pass.
  - `npm run format:check`: pass.
  - `npm run typecheck`: pass.
  - `npm run build`: pass.
  - `npm run test`: pass; 37 files / 292 tests.
  - `npm run test:e2e`: pass; 24 tests.
  - `npm run check:circular`: pass; no circular dependencies.
  - `npm run audit`: pass; 0 vulnerabilities.

## Warning and Anomaly Classification

- Command: targeted and full `npm run test`
  - Warning: recurring Dexie `DatabaseClosedError` stderr during app tests.
  - Classification: test-environment/teardown warning.
  - Action taken: recorded; targeted and full test suites exited green.
  - Clean validation impact: no.

- Command: first `npm run validate`
  - Warning/failure: `format:check` flagged three previously committed RPG-06 files: `docs/rpg-v2/modules/RPG-06-HANDOFF.md`, `src/features/rpg/routes/RpgModulePage.tsx`, and `src/lib/routing/rpgRoutePaths.ts`.
  - Classification: validation blocker until formatter reconciliation.
  - Action taken: ran Prettier on the exact flagged files. `git diff --name-status` and `git diff --stat` showed no substantive RPG-06 file changes afterward.
  - Clean validation impact: no after subsequent full validation passed.

- Command: `git diff --check`
  - Warning: `LF will be replaced by CRLF the next time Git touches it`.
  - Classification: environment/line-ending warning.
  - Action taken: recorded; command exited with no whitespace errors.
  - Clean validation impact: no.

## Risk Review

1. Work mode: Mode C - Next-module implementation.
2. New risk introduced: the Study Resource route now writes progress through an RPG model action; tests and validation confirm passive render does not mutate stores and progress changes only after explicit user action.
3. Existing risk severity changed: no.
4. Risk mitigated: R-018 and R-019 are further mitigated by real route links, explicit controls, no embedded content, authored passive no-mutation coverage, and full validation.
5. Accepted risk: none.
6. Source-of-truth inconsistencies: none found that block RPG-07.
7. Warnings/anomalies: classified above.
8. Implementation/evidence status: ready for commit after final evidence-validation rerun.
9. Blocking risk for next module: none if final evidence-validation rerun passes.

## Source-of-Truth Reconciliation

- Roadmap conflicts found: none.
- Decision-log conflicts found: none.
- Validation-log stale entries found: RPG-07 route validation, read-only route evidence, module handoff index, and module validation block were updated.
- Handoff inconsistencies found: stale blocked/partial validation language was replaced with actual targeted and full validation evidence.
- Risk-register updates needed: none; no new accepted risk.
- Any unresolved inconsistency before commit: none if final evidence-validation rerun passes after these documentation edits.

## Scope Discipline Check

- Intended module: RPG-07 - Study Resource slice.
- Work mode: Next-module implementation.
- Files changed: listed above.
- Why each changed file was necessary: listed above.
- What was deliberately not added: embedded media, fake resource systems, assets, dependencies, schema/storage, runtime network fetching, direct database imports in UI routes, and RPG-08 work.
- New dependencies: none.
- New assets: none.
- New storage/schema: none.
- Runtime network behavior changed: no.
- Classic route behavior changed: no.
- Source-of-truth reconciliation: no blocking content conflicts; RPG-07 evidence updated from blocked/partial to pass.
- Warnings and anomalies: classified above.
- Validation cadence used: normal module cadence.
- Commit status: uncommitted local work; ready to commit after final evidence-validation rerun.
- Any deferred tempting work: Focus implementation, profile/hero, badge gallery, journey log, broader styling, embedded media, resource preview systems, and any speculative fallback system.

Anti-overbuild questions answered:

1. Yes, the Study Resource route is required by RPG-07.
2. Yes, every runtime field supports required Study Resource content or explicit local progress controls.
3. Yes, the work maps to the roadmap and accepted decisions.
4. Yes, the v1 engine contract is preserved by reusing existing read models and the existing progress/XP writer.
5. Yes, same-origin `/rpg/*`, no backend, no schema change, no embedded media, and Level 1 local-first are preserved.
6. No dependency, asset, runtime request, store, preference, or broad abstraction was introduced.
7. Yes, existing course-detail validation, route helpers, read models, snapshot tests, and RPG primitives were reused.
8. Yes, each changed file maps directly to RPG-07 acceptance criteria.

## Suggested Next Module

RPG-08 - Focus Session slice.

Do not start RPG-08 until RPG-07 has been committed and merged into `rpg/v2`.
