# RPG-09 Handoff - Week 4 Vertical Slice Gate

## Module and Goal

RPG-09 - Week 4 vertical-slice gate.

Goal: establish that the existing RPG v2 Week 4 path is coherent end to end:

```text
Hub -> Map -> Week 4 -> Study Resource -> save local progress -> Focus Session -> return to Hub
```

Work mode: integration and acceptance gate.

Branch: `rpg/09-rpg-week4-vertical-slice`.

## Inspection Result

Product-code changes were not required.

The inspection found that RPG-04 through RPG-08 already provide the required runtime surfaces:

- `/rpg` Hub reads progress, study sessions, and XP from existing local stores.
- `/rpg/map` links to seeded CS50x modules, including Week 4.
- `/rpg/week/week-4` renders real Week 4 tasks and links to Study Resource and Focus.
- `/rpg/resource/week-4-lecture` saves local progress through the existing progress/XP engine wrapper.
- `/rpg/focus?itemId=week-4-lecture` saves study sessions through the existing session/XP engine wrapper.
- Returning to `/rpg` reflects the saved progress, study session, total study time, and XP.

The missing RPG-09 artifact was a single acceptance-gate test that walks the full Week 4 path and proves the persisted records are visible when returning to Hub.

## Files Changed

- `tests/app/App.test.tsx`
- `docs/rpg-v2/modules/RPG-09-HANDOFF.md`
- `docs/rpg-v2/VALIDATION_LOG.md`

## Why Each File Changed

- `tests/app/App.test.tsx`: added one dedicated RPG-09 vertical-slice test covering Hub -> Map -> Week 4 -> Study Resource -> progress save -> Focus Session -> Hub reflection.
- `docs/rpg-v2/modules/RPG-09-HANDOFF.md`: records the gate evidence, acceptance mapping, validation, warnings, risk review, and scope discipline.
- `docs/rpg-v2/VALIDATION_LOG.md`: records RPG-09 mutation evidence, handoff status, targeted validation, and the required three full validation passes.

## What Was Verified

- Hub exposes the RPG map link.
- Map exposes the Week 4 route using real seeded CS50x data.
- Week 4 exposes a real Study Resource link for `week-4-lecture`.
- Study Resource saves a local progress record only after explicit user action.
- The saved progress record uses the existing progress writer path.
- Study Resource exposes a Focus Session link with `itemId=week-4-lecture`.
- Focus Session loads the same real Week 4 item context.
- Finishing a 25-minute focus session creates exactly one study-session record.
- The study session awards exactly one `study_session` XP transaction through the existing engine.
- Returning to Hub shows the saved progress, saved study session, total study time, and XP.

## What Was Repaired

No product-code repair was needed.

The new test had two assertion corrections during development:

- A 20-minute focus session was changed to 25 minutes because the existing session XP engine awards study-session XP only at `durationMinutes >= 25`.
- Final Hub assertions now wait for loaded Hub content because the `RPG Hub` heading also exists during the loading state.

## Deliberately Not Added

- No Hero/Profile implementation.
- No Badge Gallery implementation.
- No Journey Log implementation.
- No new scoring rules.
- No bonus XP outside existing engines.
- No fake energy, potion, stamina, cooldown, currency, or streak mechanics.
- No backend/auth/cloud/network behavior.
- No IndexedDB schema change.
- No broad visual redesign.
- No classic route behavior change.
- No dependency or asset addition.
- No direct database imports into RPG route components.

## Tests Authored or Updated

- `tests/app/App.test.tsx`
  - Added `completes the RPG Week 4 vertical slice from Hub to Focus and back to Hub`.
  - Added a small `expectHref` helper used by the new vertical-slice test.

Targeted results so far:

- `npm run test -- tests/app/App.test.tsx`: pass; 1 file, 76 tests.
- `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts`: pass; 2 files, 82 tests.

## Validation

Targeted:

- `npm run test -- tests/app/App.test.tsx`: pass; 1 file, 76 tests.
- `npm run test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts`: pass; 2 files, 82 tests.

Full validation cadence required for RPG-09:

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

After the evidence update, the full three-pass validation cadence was rerun against this documented file state before commit.

## Warning and Anomaly Classification

- Command: `git status -sb`
  - Warning: `unable to access 'C:\Users\alex_/.config/git/ignore': Permission denied`.
  - Classification: environment warning.
  - Action taken: recorded; repo-local status and diff remained readable.
  - Clean validation impact: no.

- Command: `npm run test -- tests/app/App.test.tsx`
  - Initial failure: new test expected study-session XP from a 20-minute session.
  - Classification: test assumption issue.
  - Action taken: aligned test with existing session engine threshold, `durationMinutes >= 25`.
  - Clean validation impact: no after targeted rerun passed.

- Command: `npm run test -- tests/app/App.test.tsx`
  - Second failure: final Hub assertion read loaded content before the async Hub summary finished.
  - Classification: test synchronization issue.
  - Action taken: waited for loaded activity text.
  - Clean validation impact: no after targeted rerun passed.

- Command: `npm run test -- tests/app/App.test.tsx`
  - Third failure: Hub contained multiple valid `25 min` summaries.
  - Classification: test assertion specificity issue.
  - Action taken: asserted at least one matching summary.
  - Clean validation impact: no after targeted rerun passed.

## Adversarial Review

- Risk: the new test could pass by checking links without proving persistence. Mitigation: it asserts actual database snapshots after progress save and focus finish, then asserts Hub read-model output after remounting `/rpg`.
- Risk: the test could hide duplicate XP/session writes. Mitigation: it compares study-session count before and after Focus and filters the `study_session` XP transaction tied to the saved session id.
- Risk: the gate could accidentally start RPG-10 Journey Log or RPG-11 Badge Gallery. Mitigation: no route code was changed and no stub implementation was expanded.
- Risk: started lecture progress does not award progress XP. This is expected existing-engine behavior; the gate proves progress persistence, and study-session XP proves XP reflection on Hub.

## Retrospective

The main implementation lesson is that RPG-09 is correctly an integration gate, not a feature module. The existing vertical surfaces were already in place after RPG-08. The highest-value work was to encode the exact user path in a single route test and force the persistence/reflection claims into assertions instead of relying on scattered module tests.

The main testing lesson is to avoid inventing expectations around existing engines. The 25-minute study-session XP threshold belongs to the current engine, so the gate test should obey it rather than imply a new scoring rule.

## Risk Review

1. Work mode: integration gate.
2. New risk introduced: low; one test helper and one route test were added.
3. Existing risk severity changed: no.
4. Risk mitigated: the Week 4 slice now has one end-to-end regression test across Hub, Map, Week, Resource, Focus, and Hub reflection.
5. Accepted risk: plain `RpgButton` anchors are verified through hrefs and route remounts in this test. Runtime product behavior is unchanged.
6. Source-of-truth inconsistencies: the validation-log read-only table previously listed RPG-09 as Badge Gallery; corrected to Week 4 vertical slice.
7. Warnings/anomalies: classified above.
8. Implementation/evidence status: committed locally on `rpg/09-rpg-week4-vertical-slice`; see current `HEAD`.
9. Blocking risk for next module: none if the required three full validations remain clean.

## Source-of-Truth Reconciliation

- Roadmap conflicts found: none.
- Decision-log conflicts found: none.
- Validation-log stale entries found: RPG-09 was listed as Badge Gallery in one validation table; corrected to Week 4 vertical slice.
- Handoff inconsistencies found: no RPG-09 handoff existed before this module; created.
- Risk-register updates needed: none; no new accepted product risk.
- Any unresolved inconsistency before commit: none if three full validations pass.

## Scope Discipline Check

- Intended module: RPG-09 - Week 4 vertical-slice gate.
- Work mode: integration and acceptance validation.
- Files changed: listed above.
- Why each changed file was necessary: listed above.
- What was deliberately not added: Hero/Profile, Badge Gallery, Journey Log, new scoring, fake mechanics, schema/storage changes, network behavior, dependencies, assets, visual redesign, and classic route changes.
- New dependencies: none.
- New assets: none.
- New storage/schema: none.
- Runtime network behavior changed: no.
- Classic route behavior changed: no.
- Source-of-truth reconciliation: completed; stale RPG-09 Badge Gallery validation-table entry corrected.
- Warnings and anomalies: classified above.
- Validation cadence used: major gate cadence, three full `npm run validate` passes required.
- Commit status: committed locally on `rpg/09-rpg-week4-vertical-slice`; see current `HEAD`.
- Any deferred tempting work: Journey Log, Badge Gallery, Hero/Profile, broader navigation rewrites, React Router Link conversion, and visual polish.

## Commit Status

Committed after three clean full validation passes against the documented file state.
