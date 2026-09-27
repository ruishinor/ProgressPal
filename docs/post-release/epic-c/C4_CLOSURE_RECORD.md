# Epic C / C4 — closure record (CS50 programme terminology)

## 1. State

**`C4_IMPLEMENTED_AND_VALIDATED_LOCALLY_READY_FOR_OWNER_REVIEW`**

- C4 was implemented on 2026-09-27 under a direct owner instruction: C4 from
  the C3 acceptance tip `663796e5`, local commits only.
- The implementation candidate is `80c97e86` (§2). Every required final gate
  passed on that exact commit (§7).
- **C4 is not accepted.** The owner decides whether to accept or reject the
  candidate.
- C5 has not started and is not authorized. Its prerequisite (C4 accepted) is
  not met.
- Publication is deferred. Nothing was pushed, merged, tagged or deployed, and
  `origin/master` and Production are unchanged.

## 2. Identities

| Item                     | Value                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| Owner authorization      | direct owner instruction, 2026-09-27: C4 from `663796e5`, local commits only                      |
| Branch                   | `cx/epic-c4-programme-terminology`                                                                |
| Branch point             | `663796e5097a0210c62b50639aa88faf5c3b2496` (C3 acceptance tip; tree `6d2930d4`, `src` `5ee5559a`) |
| Implementation candidate | `80c97e861a1c71d5f624bb144fa2e7082fface21` (tree `69922bbd`, parent `663796e5`)                   |
| Candidate `src` subtree  | `4eac5095d9003cd2aba193344cda725cd331d2ca`                                                        |
| Readiness record         | the documentation-only commit that adds this file (parent `80c97e86`)                             |

## 3. What C4 implements

The `cs50x-2026` definition owns its terminology as validated content
(`src/programmes/cs50x-2026/terminology.ts`, `content.terminology`). App and
feature consumers read it through the `@/programmes` entrypoint.

| Terminology                                  | Source before C4                                                        | Owner after C4                                  |
| -------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- |
| 19 CS50 copy strings                         | literals in 12 app/feature files (§3a)                                  | `terminology.copy`                              |
| Curriculum-unit noun (`week` / `Week`)       | literals in unit-level copy (§3b)                                       | `terminology.unitNoun`                          |
| RPG identity tuple and its literal types     | `rpg/model/types.ts` literal types; four assignments in `readModels.ts` | `terminology.rpgIdentity`; the type is `string` |
| Campaign-map ordinal of every catalogue unit | `module.id.startsWith('week-')` parsing in `RpgMapPage.tsx` (two sites) | `terminology.unitMapOrdinals`                   |

### 3a. CS50 copy

Startup loading summary and active-shell summary (`app/shell/AppShell.tsx`),
profile description (`app/routes/HomePage.tsx`), onboarding title and
description, dashboard description and error description, the course-map
eyebrow (three states), loading and error descriptions, the catalogue
description, the Insights description and error description, the RPG
required-complete note, the RPG hero progress note, the RPG settings course
boundary, the official-resource link labels (open and review) and the
`shared with README + demo` reward note. Wording is unchanged.

### 3b. Unit-level copy composed with the unit noun

`Week progress` (Classic course map); `open any week` (RPG map); `RPG week`,
`RPG Week`, `Loading RPG week`, `Building the RPG week from local progress.`,
`RPG week not found` and the three RPG module error messages (RPG module);
`Back to week` (RPG resource); and the rendered Classic content-detail load
error `The week for this course task could not be found.`

### 3c. Map ordinal

`getMapNodeOrdinal` (`rpg/model/presentation.ts`) returns the programme's
label for the unit. No unit ID is parsed. The CS50 map labels all 14
catalogue units with the pre-C4 values (`week-0`…`week-10` → `0`…`10`,
`artificial-intelligence` and `additional-practice` → `+`, `final-project` →
`◆`). A stored unit outside the programme's catalogue keeps the shared
unnumbered marker (`+` without required tasks, `◆` with them); see §9.

### 3d. Validation (fails closed at definition load)

- Every terminology value is a required, non-empty string in a strict
  schema; a missing, empty or unknown key rejects the definition.
- The ordinal map must label every catalogue unit and nothing else.
- No consumer carries a CS50 fallback string.

### 3e. Stays shared or unchanged

- Canonical vocabulary labels (item, unit and asset types, item-context
  titles, achievement category labels and order, session-mode labels), and
  rank labels and thresholds, stay in their feature modules.
- The brand `ProgressPal CS50 Edition` is unchanged and outside Epic C (OD-6).
- Routes and route segments (including `/rpg/week/:unitId`), unit IDs, CSS
  class names, layout, rules, rewards and read scope are unchanged.
- `RPG_WEEK_FOUR_UNIT_ID` (X-3) is a CS50 identifier, not rendered
  terminology, and is unchanged.

## 4. Discriminating evidence

- **Test-only terminology** (`tests/programmes/terminology.test.tsx`). A
  terminology injected with `vi.mock('@/programmes')`, never registered,
  changes only the programme-owned output on real routes: map ordinals
  (`week-3` → `III`, `final-project` → `FP`) and the unit noun on
  `/rpg/map`; the identity tuple on `/rpg/hero`; the resource label and
  `Back to module` on `/rpg/resource/week-0-lecture`; `RPG module` on
  `/rpg/week/week-0`; `Module progress` and the eyebrow on `/course`. The
  canonical unit-type label `Week` and the shared rank label `New Learner`
  stay unchanged. Without injection, the same file renders the CS50 values.
- **No ID parsing.** `getMapNodeOrdinal` is tested directly: a `week-9` unit
  the programme does not label gets the shared marker, not `9`.
- **Fail-closed validation** (`tests/programmes/registry.test.ts`): a
  catalogue unit without an ordinal, an ordinal for a non-catalogue unit, a
  missing copy string and an empty unit noun are each rejected.
- **Disposable mutation probes (not committed).** Reinstating `week-*`
  parsing in `RpgMapPage.tsx`, hard-coding the identity tuple in
  `readModels.ts`, and hard-coding `Back to week` in `RpgResourcePage.tsx`
  each failed the matching test (3 of 8 failed). All three files were then
  restored and checked byte-identical by SHA-256.

## 5. Rendered-output preservation

- Every C1 suite passes unchanged on the candidate, including
  `c1LabelsAndCopy.test.tsx` (map ordinals for all 14 units, the rendered
  CS50 copy on 7 routes, the shared label tables, the identity tuple at every
  rank threshold) and `c1TransientCopy.test.tsx` (the 7 transient-state
  strings in their real rendered states). No C1 test or fixture changed
  (`git diff 663796e5 80c97e86 -- tests/preservation tests/fixtures` is
  empty).
- `App.test.tsx`, `readModels.test.ts`, `resourceReadBoundary.test.ts`,
  `c1PreviewRewards.test.ts` and `courseDetailModel.test.ts` pass unchanged
  (lab/problem-set status asymmetry, the reward label, the identity tuple).
- **Rendered DOM comparison (disposable, not committed).** A probe rendered
  26 route states before and after the change through the real app, including
  ready, loading, error, onboarding, required-complete and completed-resource
  states, the RPG module not-found state and the content-detail missing-unit
  error. The serialized `document.body.innerHTML` was byte-identical
  (SHA-256 `8410f348…bb97` for both).
- The 64 C1 captures are byte-identical (§7).

## 6. Architecture

- Consumers import only the `@/programmes` entrypoint; `src/lib/**` and
  `src/components/**` do not change and do not import programmes
  (`programmesLayer.test.ts`, ESLint).
- The programme layer adds no import (`terminology.ts` imports a type from
  `../definition` only).
- `rpgFeature`, `routeDefinitions`, `programmePolicyOwnership` (G-7) and
  `check:circular` pass.

## 7. Final validation (implementation candidate `80c97e86`)

| Check                    | Result                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `npm run lint`           | exit 0, 0 warnings                                                                        |
| `npm run format:check`   | exit 0                                                                                    |
| `npm run typecheck`      | exit 0                                                                                    |
| `npm test`               | exit 0; 85 files / 875 tests passed, 0 skipped (C3: 84 / 863)                             |
| `npm run check:circular` | exit 0, no cycle                                                                          |
| `npm run build`          | exit 0                                                                                    |
| `npm run check:bundle`   | exit 0, 0 violations; largest JS chunk 393,987 bytes (C3: 391,144)                        |
| `npm run test:e2e`       | exit 0; 90/90 passed, 0 skipped, 0 retries, 7.4 min; includes the axe accessibility specs |
| `git diff --check`       | exit 0                                                                                    |

- No test was skipped, retried or weakened, and no timeout changed.
- `verify:release` was not run, because publication is a separate decision.
- The bundle grew about 2.8 kB, from the terminology schema and the CS50
  terminology data. No chunk and no lazy import were added.
- The E2E aggregate regenerated the 64 disposable C1 captures. All 64 are
  byte-identical (same-name per-PNG SHA-256) to the accepted inventory in
  `c1-visual-baseline-69b1db7.zip`. The ZIP was not regenerated and is
  unchanged (SHA-256 `cb404591…917c`).

## 8. Scope proof

`git diff 663796e5 80c97e86` changes only `src/app/routes/HomePage.tsx`,
`src/app/shell/AppShell.tsx`, 17 files under `src/features/{course,dashboard,insights,profile,rpg,settings}`,
`src/programmes/**` and `tests/programmes/**`. It is empty for all of:

- `src/lib`, `src/components`, `src/app/router`, `src/styles`, `src/seed`,
  `src/features/rpg/assets`;
- `tests/preservation`, `tests/fixtures`, `e2e`, `public`, `scripts`, `docs`;
- `package.json`, `package-lock.json`, `eslint.config.js`, `vite.config.ts`,
  `tsconfig*.json`, `playwright*.ts`, `vercel.json`, `index.html`.

Therefore there is no route, CSS, asset, schema, Dexie version, backup-format,
dependency, XP, achievement, workflow or read-scope change. No `className`
changed. `programmeId` does not appear in source, and no enrolment or
active-key state exists. No C5–C8 work was done.

## 9. Residual limits

- **Stored units outside the catalogue.** Seed sync is additive, and a
  restore adds backup units before syncing. A stored unit that is not in the
  active catalogue therefore shows the shared marker. If such a unit had a
  `week-N` ID, it showed `N` before C4. Every bundled catalogue in history has
  the same 14 units, so only a hand-edited backup can create one. C5 scopes
  reads to the active catalogue. This follows the contract ("replacing week-
  ID parsing") and changes no catalogue unit.
- Diagnostic text that is never rendered keeps its wording:
  `console.error('RPG week loading failed.')` and the route-configuration
  error in `routeDefinitions.ts` (route contract, unchanged).
- The test-only terminology is injected by module mock. Production has one
  registered definition, and the registry is unchanged.
- `features/insights` still classifies CS50 `sourceType` vocabulary (C3
  residual). Insights "Week" columns are calendar weeks, not the curriculum
  unit noun.

## 10. Disposition

- **C4:** implemented and validated locally; ready for owner review; **not
  accepted**.
- **C5:** not started and not authorized. Its prerequisite (C4 accepted) is
  not met.
- **Publication:** deferred; `origin/master` and Production are unchanged.
