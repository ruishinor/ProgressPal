# Epic C / C1 — evidence coverage and harness plan

Status: **C1 evidence harness (commit H).** This file defines what the C1
harness protects and why. Results that only exist after the retained capture
run (capture hashes, ZIP, identities of H) are bound in
`C1_VISUAL_BASELINE_MANIFEST.md` and `C1_CLOSURE_RECORD.md` in the later
docs-only commit M.

Authority: `NEXT_STORY_HANDOFF_C1.md` §4 items 1–10, evidence families in
`VALIDATION_READINESS.md` §2, ownership in `C0_PROGRAMME_DEFINITION_CONTRACT.md`
§4. Product baseline: accepted C0 `9c6d1b45b5f5b22afa0b8d009101b378c1df363a`
/ `ffd85d6e61c2a8fe11dc5b6dd331b1203b0cf968`; accepted Epic B product
`fd5e2d592bb6f5d1724509119147c48ba3a5df59` /
`bc86fd392a5284d9db8821c31a27b8c95ec82a9a`.

## 1. New tracked files (all ADDED; no existing file outside `docs/post-release/epic-c/**` is modified)

| Path                                                        | Role                                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `tests/preservation/c1Support.ts`                           | test-only helpers: fixed clocks, seeded test database from the real bundled seed |
| `tests/preservation/c1CurriculumIdentity.test.ts`           | area 1 (semantic)                                                                |
| `tests/preservation/c1StatusReachability.test.ts`           | area 2 (semantic)                                                                |
| `tests/preservation/c1XpTable.ts`                           | builder for areas 3–5 (real engine over the real catalogue)                      |
| `tests/preservation/c1XpAwards.test.ts`                     | areas 3 and 5 (semantic) and XP ledger (mutation)                                |
| `tests/preservation/c1PreviewTable.ts`                      | builder for area 4                                                               |
| `tests/preservation/c1PreviewRewards.test.ts`               | area 4 (semantic)                                                                |
| `tests/preservation/c1Achievements.test.ts`                 | area 6 (semantic; rule encoding characterization)                                |
| `tests/preservation/c1BaselineFixtureBuilder.ts`            | builder for area 7 (real repositories + real export path)                        |
| `tests/preservation/c1BaselineFixture.test.ts`              | area 7 (migration)                                                               |
| `tests/preservation/c1LabelsAndCopy.test.tsx`               | area 8 (semantic)                                                                |
| `tests/preservation/c1VisualIdentity.ts`                    | builder for area 9                                                               |
| `tests/preservation/c1VisualIdentity.test.tsx`              | area 9 (visual, identity only)                                                   |
| `tests/fixtures/preservation/c1-xp-awards.json`             | committed XP award table (281 rows, 158 awards)                                  |
| `tests/fixtures/preservation/c1-preview-rewards.json`       | committed preview/label table (68 rows)                                          |
| `tests/fixtures/preservation/c1-links-guides.json`          | committed total link/guide lookup (14 units, 68 items)                           |
| `tests/fixtures/preservation/c1-visual-identity.json`       | committed asset hashes, badge mapping, fallback glyph, CSS custom properties     |
| `tests/fixtures/backups/c1-baseline-envelope1-schema2.json` | baseline schema-2 migration fixture (envelope 1)                                 |
| `e2e/c1-baseline-visual-capture.spec.ts`                    | area 10: the single capture-only spec (no comparison)                            |
| `docs/post-release/epic-c/C1_EVIDENCE_COVERAGE.md`          | this file                                                                        |

Fixture provenance: every committed JSON table was generated once by the C1
builders from the real baseline code, then reviewed against its authority. The
temporary generator was never tracked. Each table is re-derived live on every
`npm test` run and must match exactly, and the semantic tables are also checked
against an independent authority (below).

## 2. Coverage matrix

Families: A semantic, B characterization, M mutation, Mig migration, V visual.

| Area                        | Existing coverage reused (not duplicated)                                                                                                                       | Gap filled by C1                                                                                                                                                                                   | Family       | Authority for expected values                                                                                       | Owner after C3/C4                                                             |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1 Curriculum identity/order | `tests/seed/bundledCourseSeed.test.ts` (shape, selected titles)                                                                                                 | full ordered 14-unit / 68-item table, asserted through `buildCourseMap` and `loadRpgCourseMapSummary`                                                                                              | A            | `src/seed/cs50x-2026.json`, reviewed row by row                                                                     | CS50-owned catalogue; shape shared                                            |
| 2 Status reachability       | `tests/features/courseDetailModel.test.ts` (selected options)                                                                                                   | offered sequence options per reachable state, RPG correction options, reachable closure (Classic and RPG) for all 8 seed type × required combinations plus `lab` (X-2); partial long-form history  | A            | `getCourseProgressStatusOptions` (the producer both shells call); `getStatusSequence` rules, reviewed               | workflow item types → CS50 configuration (C3); status model and labels shared |
| 3 XP awards                 | `tests/lib/xpEngine.test.ts` (synthetic, incl. `notes`/`reflection`)                                                                                            | every CS50 item × every reachable saved status; unit completion for all 11 required week units; 4 final-project pair states; each award tagged with its policy                                     | A            | committed baseline table plus an independent in-test restatement of the CS50 XP policy (C0 contract §4b)            | all four policies → CS50 XP configuration (C3)                                |
| 3 XP ledger                 | `tests/db/repositories.test.ts` (dedupe)                                                                                                                        | real `upsertProgressAndAwardXp` sequence covering all four policies, exact persisted rows, re-save awards nothing                                                                                  | M            | policy restatement and seed titles                                                                                  | —                                                                             |
| 4 Preview and labels        | none for the whole catalogue                                                                                                                                    | `evaluateCompletionPreviewXp` and `buildQuestRewardLabel` (compact and detailed), fresh and earned, for all 68 items                                                                               | A            | cross-checked against the XP table at each item's terminal status; the pair reward is the one documented difference | CS50 XP configuration (terminal status derives from the workflow)             |
| 5 Reward identity           | `tests/lib/xpEngine.test.ts` (ID derivation)                                                                                                                    | `sourceType`, `sourceId` and transaction ID for every reachable award (no hashed fallback); unlock ID and trigger ID for every unlock case in area 6                                               | A            | `xp-${sourceType}-${sourceId}` and `unlock-${achievementId}` derivation, reviewed                                   | unchanged identity (C0 contract §7)                                           |
| 6 Achievement definitions   | `tests/lib/achievementsEngine.test.ts` (synthetic rule cases)                                                                                                   | ordered 16-row table (id, title, description, category, xpReward, order, owner); RPG gallery and Classic view order and counts                                                                     | A            | `src/lib/achievements/definitions.ts`                                                                               | 6 shared / 10 CS50-owned; order CS50-owned                                    |
| 6 Unlock behaviour          | as above (synthetic)                                                                                                                                            | for all 16: minimal satisfying and nearest non-satisfying state through the real persistence paths over the real catalogue; exact satisfied set, unlock ID, trigger ID; re-evaluation adds nothing | A            | definition authority plus real evaluation path                                                                      | as above                                                                      |
| 6 Rule encoding             | —                                                                                                                                                               | `ruleType`/`ruleConfig` snapshot and definition timestamp                                                                                                                                          | **B**        | current implementation                                                                                              | may be re-encoded in C3                                                       |
| 7 Schema-2 fixture          | two small envelope-1/schema-2 fixtures in `tests/db/backupCompatibility.test.ts`                                                                                | full-catalogue, progressed synthetic fixture built by code; rebuild equality, parse, restore, re-export, synthetic-only check                                                                      | Mig          | the real repositories and export path (deterministic rebuild)                                                       | —                                                                             |
| 8 Links and guides          | `tests/features/cs50Links.test.ts`, `guideContent.test.ts` (shape, keying, selected IDs)                                                                        | total lookup over every seed unit and item ID including nulls                                                                                                                                      | A            | `cs50Links.ts`, `guideContent.ts` (content authority)                                                               | CS50-owned content (C2)                                                       |
| 8 Labels                    | `tests/app/App.test.tsx` ("Log Lecture", "Problem Set Progress", …)                                                                                             | item-type, unit-type, category (and filter order), session-mode, rank at every threshold boundary, item-context titles, asset labels                                                               | A            | label tables in their feature modules and the rendered routes                                                       | shared (canonical vocabulary and rank labels)                                 |
| 8 CS50 copy                 | `App.test.tsx` pins "Start tracking CS50 locally", "RPG week", "Back to week", "Open official CS50x resource"; `readModels.test.ts` pins the RPG identity tuple | map ordinals for all 14 units (rendered); rendered CS50 copy on 7 routes; transient-state CS50 copy verbatim in runtime source                                                                     | A            | rendered routes and runtime source                                                                                  | CS50-owned (C4)                                                               |
| 9 Asset/token identity      | `tests/architecture/rpgFeature.test.ts` (CSS URL rules)                                                                                                         | SHA-256 of all 17 RPG assets; rendered achievement → badge-file mapping; fallback glyph; exact custom properties in 5 token blocks                                                                 | V (identity) | file bytes and CSS source                                                                                           | CS50 badges/emblem → presentation (C8)                                        |
| 10 Rendered baseline        | B2–B4 capture specs (transient, overwritten)                                                                                                                    | 64 retained captures (§4)                                                                                                                                                                          | V            | owner visual review (pending)                                                                                       | —                                                                             |

## 3. Findings recorded while building the evidence

- **Persisted unlock triggers are fixed at first satisfaction.** `first-step`
  keeps the trigger of the first item completed. A later state in which another
  item sorts first does not change it. The C1 tables freeze this persisted
  identity.
- **No production write path creates a skipped slice.** The schema allows
  `content_slices.status = 'skipped'`, but the slice planner only preserves an
  existing `skipped` status (`src/lib/db/repositories.ts` slice planning). The
  C0 data map's fixture list names skipped slices; the C1 fixture cannot
  contain one without hand-authoring, which C1 forbids. **C6 needs a separate
  legacy/adversarial fixture for skipped slices.** This is not a C1 stop
  condition: every other listed element is produced by real code.
- **RPG rendering varies with the theme preference only where shared Classic
  primitives are used.** At the captured states, 20 of 22 RPG surface pairs are
  byte-identical in light and dark. RPG Settings differs at both viewports
  (shared card primitives under `.rpg-settings`). Both themes are retained for
  every RPG surface, as the plan requires.
- **The fixed RPG bottom navigation appears mid-image** in full-page captures.
  That is how the page renders when captured full-page, not a capture defect.
- **The RPG settings route carries the "not CS50, Harvard, edX, or
  OpenCourseWare status" boundary copy**; the Classic settings route does not.

## 4. Retained visual baseline plan (executed after H)

- **Spec:** `e2e/c1-baseline-visual-capture.spec.ts`. It has four tests (light
  and dark theme × 390×844 and 1280×900) and produces 64 full-page PNGs in
  `artifacts/epic-c1-visual-baseline/captures/` (gitignored).
- **Surfaces:** RPG hub and map (fresh and progressed); RPG module
  `week-0`, resource `week-0-lecture`, focus (no running timer), hero, badges
  (1 earned / 15 locked), log and settings (progressed); Classic dashboard,
  course, content `week-0-problem-set` (CS50 link and guide visible),
  achievements and settings (progressed). Every surface is captured in both
  themes.
- **Determinism:**
  - fixed clock `2026-09-19T12:00:00.000Z` via `page.clock.install`;
  - synthetic onboarding through the real form;
  - progress through the real RPG "Mark locally complete" control;
  - `animations: 'disabled'`, hidden caret, fonts awaited;
  - loading states must be gone before each capture.
- **Development evidence:** three disposable runs on this machine produced
  byte-identical PNGs (64/64). Those runs are not the baseline.
- **Retained run:** `npm run test:e2e` from clean H only. It is sealed
  immediately into one ZIP and bound in `C1_VISUAL_BASELINE_MANIFEST.md`.
  Permanent retention is OD-8 and is unresolved.
