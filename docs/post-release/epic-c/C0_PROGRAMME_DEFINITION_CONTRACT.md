# Epic C / C0 — ProgrammeDefinition contract

Status: **C0 reconciled against Bootstrap v7.0. Contract for owner review;
nothing here is implemented.** Grounded in
`C0_PROGRAMME_ASSUMPTION_INVENTORY.md` and
`C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md`. Labels as in the inventory.

This is the canonical C0 record for the programme definition, registry and
active-programme boundary. It supersedes the original Cowork
`C0_PROGRAMME_DEFINITION_PROPOSAL.md`, whose story assignments used an older,
contradictory numbering ([C] reconciled to the single sequence in
`stories.yaml`).

## 1. Does the target principle fit the code?

Target: `active programme → validated definition → shared engine → shared
shell`.

[D] **Yes, with three source-driven refinements.**

1. **Not one monolithic object.** [F] `src/lib/**` may not import features,
   components or app (ESLint). [F] XP, achievement and seed-sync logic live in
   `src/lib`. [F] Badge art is imported with Vite `?inline` and theme tokens
   are CSS. One object holding rules, copy, assets and CSS would pull UI assets
   into the lib graph or force lib engines to import presentation. The
   definition is therefore split by consumer layer (§3).
2. **Engines receive programme rules; they do not import a programme.** [F]
   The engines are pure today (`tests/architecture/achievementsFeature.test.ts`
   enforces no DB imports in the achievement engine) and tests inject
   synthetic seeds (`tests/db/testDatabase.ts`). [D] Rules flow in as
   parameters, exactly as `seed` already flows into
   `initializeDatabase({ seed })`. Only composition roots and features import
   `@/programmes`.
3. **The active programme is resolved once and passed explicitly.** [F] Epic A
   read-boundary guards forbid `app_meta` (and other stores) inside passive RPG
   read transactions (`tests/features/rpg/mapReadBoundary.test.ts`, exact store
   allowlists, one read-only transaction). [D] The active programme is resolved
   at app-state bootstrap and passed as an explicit `programmeId`/definition
   argument to read models and repositories; it is never looked up inside a
   passive read transaction.

Where persisted ownership sits relative to the runtime path: the definition
is immutable configuration; the database holds the learner's **materialized**
catalogue copy, its per-programme sync version and all learner state
(`C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md` §3). Persisted state references a
programme; it is never embedded in, or regenerated from, a definition.

## 2. Registry and active-programme boundary

- [D] A registry lists the validated definitions compiled into the app. In
  Epic C it contains exactly one production entry, `cs50x-2026`.
- [D] One accessor returns the active definition. Until C6/C7 introduce
  persisted enrolment, "active" is the single registered programme, selected
  at the composition root. No passive read resolves it.
- [D] Multi-definition validation (fail-closed rejection of any colliding unit,
  item, derived, achievement or milestone ID across definitions) is required
  before a second definition can be registered in production (C7), and
  catalogue sync independently rejects cross-programme collisions (C6, MR-3).
  Test-only second definitions may be used earlier to prove isolation.
- [D] Switching the active programme writes only enrolment/active state (C7)
  and requires OD-3.
- [D] An unregistered, malformed or unmaterialized active programme ID fails
  closed with the existing error state. Scoped reads must never return an
  empty-but-plausible course for a wrong programme ID (Lessons Learned A7:
  no plausible partial truth).

## 3. Concern-by-concern ownership

Bootstrap v7 listed ten concerns to validate. The rule applied is the
**smallest definition that removes proven CS50 assumptions**: a value becomes
programme-owned only when it depends on CS50 identifiers, CS50 topics or CS50
wording. Values keyed only on the shared persisted vocabularies
(`courseUnitTypeValues`, `courseItemTypeValues`, `studySessionModeValues`,
`achievementCategoryValues`) or on generic learner activity stay shared. No
general programme-override mechanism is created in Epic C; one is justified
only when a registered programme needs different wording or policy for a
shared value ([X] X-10). The "Story" column uses the frozen sequence in
`stories.yaml`.

| Concern                    | Programme-owned (CS50, `cs50x-2026`)                                                                                                                                                                                                                                                                                                           | Stays shared engine / shell                                                                                                                                                                                                                             | Runtime / persisted state                                | Story                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| Identity                   | `programmeId` `cs50x-2026` (= existing `courseId`), title                                                                                                                                                                                                                                                                                      | —                                                                                                                                                                                                                                                       | active programme (runtime); enrolment (persisted, C6/C7) | C2                           |
| Curriculum tree            | reference to the existing `CourseSeed` (`dataVersion` = catalogue version); seed referenced in place                                                                                                                                                                                                                                           | `Programme → Unit → Item` schema, seed parser                                                                                                                                                                                                           | materialized catalogue + per-programme sync version (C6) | C2 (reference), C6 (version) |
| Catalogue rules            | required unit types (CS50: must contain a `final_project` unit)                                                                                                                                                                                                                                                                                | generic seed validation without CS50 rules                                                                                                                                                                                                              | —                                                        | C3                           |
| XP configuration           | the two final-project milestones: item IDs and **exact** `sourceType`, `sourceId`, `xp`, `reason`                                                                                                                                                                                                                                              | item-type completion amounts, problem-set workflow amounts and the required-`week`-unit bonus (keyed only on shared type vocabulary); milestone rule shapes (single item, all-of-items); level curve; activity XP; dedupe by source key; ID derivation  | XP ledger (persisted; scope OD-1)                        | C3                           |
| Achievement definitions    | the 10 CS50-bound definitions (`scratch-initiate`, `pointer-survivor`, `data-structure-builder`, `python-shift`, `query-builder`, `browser-builder`, `flask-route-maker`, `pset-chain`, `final-project-mvp`, `final-project-shipped`) and the programme's display order of all its achievements (§3a)                                          | the 6 platform-neutral definitions (`first-step`, `first-slice`, `course-complete`, `clean-stop`, `three-deep-sessions`, `bug-hunter`); the rule evaluator (10 rule types, including `problem_set_status_count` keyed on the shared `problem_set` type) | unlocks (persisted; scope OD-2)                          | C3                           |
| Terminology                | CS50 copy ("CS50" strings, official-completion disclaimers, bundled-catalogue copy); the curriculum-unit noun in unit-level copy ("Week progress", "RPG week", "open any week", "Back to week"); the RPG identity tuple (guild, class, path) and its literal types; the per-unit map ordinal label (replaces `id.startsWith('week-')` parsing) | item/unit type labels, asset-type labels, item-context titles, achievement category labels and order, session-mode labels, rank labels and thresholds                                                                                                   | —                                                        | C4                           |
| External resources         | unit/item link maps; declared allowed URL prefixes                                                                                                                                                                                                                                                                                             | local-only guard                                                                                                                                                                                                                                        | —                                                        | C2                           |
| Progress/completion config | none                                                                                                                                                                                                                                                                                                                                           | status model, completion math, long-form slicing/resume, `submitted`/`accepted` availability for `lab`/`problem_set` including the correction-path asymmetry (X-2)                                                                                      | progress entries (persisted)                             | none (stays in place)        |
| Study-guide content        | unit/item guides with authoring rules                                                                                                                                                                                                                                                                                                          | guide rendering                                                                                                                                                                                                                                         | —                                                        | C2                           |
| Theme/assets               | badge art for the CS50-bound achievements, emblem, optional token overrides (UI layer only)                                                                                                                                                                                                                                                    | badge art for the shared achievements, shell/frame components, CSS structure                                                                                                                                                                            | learner theme preference (persisted, learner-global)     | C8                           |
| Feature flags              | none today ([F] no mechanism exists)                                                                                                                                                                                                                                                                                                           | —                                                                                                                                                                                                                                                       | —                                                        | none ([X])                   |

### 3a. Evidence for the split

- [F] **Shared achievements.** `first-step` (any task), `first-slice` (first
  long-form slice), `clean-stop` (media stop reason), `three-deep-sessions`
  (session duration) and `bug-hunter` (shared session mode `debugging`) use no
  CS50 ID, topic or wording, and their categories (`course_progress`,
  `consistency`, `debugging`) are neutral.
- [F] **`course-complete`** has a generic rule and generic copy ("every
  required item of every required unit in the course"). Its only coupling is
  the evaluation context, which is whole-catalogue today; C5 scopes that
  context to the active programme. For CS50 its trigger source stays
  `cs50x-2026`. Whether it can be earned once per programme is part of OD-2
  (unique `achievementId` index) and is not decided here.
- [F] **CS50-bound achievements.** Seven reference CS50 unit IDs
  `week-0/4/5/6/7/8/9` and name CS50 topics; two reference CS50 final-project
  item IDs; `pset-chain` uses CS50 slang ("Pset Chain") with a CS50-chosen
  threshold. The evaluator rule behind `pset-chain` is keyed on the shared
  `problem_set` type and stays shared; parameterising its item type is not
  justified ([X] X-10).
- [F] **Display order is user-visible and interleaved.** The RPG badge list
  iterates `achievementDefinitions` in declaration order
  (`features/rpg/model/readModels.ts:496`), and that order interleaves shared
  and CS50 definitions (`first-step`, `first-slice`, seven week achievements,
  `course-complete`, `pset-chain`, `clean-stop`, `three-deep-sessions`,
  `bug-hunter`, two final-project achievements). The programme therefore owns
  an explicit ordered list of its achievement IDs, shared ones included. This
  list is the only programme-specific override Epic C needs: it references
  shared definitions and never redefines them.
- [F] **XP.** The only CS50-ID coupling in XP is the pair of final-project
  milestones (item IDs and fixed `sourceId`s), repeated in `repositories.ts`,
  `questRewards.ts` and the preview's shared-reward check. Type amounts, the
  problem-set workflow and the `week` bonus are keyed only on shared
  vocabulary. P4 showed another programme's `week` unit earns the bonus, which
  is consistent shared semantics, not a CS50 leak. Moving those amounts into
  configuration would be speculative configurability.
- [F] **Labels.** Type, asset-type, category and session-mode labels translate
  shared persisted enum values (`course/model.ts`, `ContentDetailPage.tsx`,
  `achievements/model.ts`, `sessions/model.ts`). The CS50 shape of some
  values (`problem_sets`, `final_project`) lives in the shared enums
  themselves (X-5), not in their labels. Rank labels are generic thresholds
  over required-item completion (`readModels.ts:275-305`). All stay shared.
- [F] **Programme terminology.** These move because they depend on CS50: the
  "CS50" copy; the curriculum-unit noun "week" in unit-level copy, which is
  rendered for every unit including `special` and `final_project` units; and
  the ordinal parsed from CS50 ID strings. The RPG identity tuple also moves.
  It is declared as literal types in `rpg/model/types.ts:22-24`; "Code
  Knights" and "CS Foundations" are coding/CS-specific and pair with the Code
  Knights emblem, so the tuple is owned as one identity rather than split.
- [F] **Workflow.** `submitted`/`accepted` availability is keyed on the shared
  `lab`/`problem_set` types (`detailModel.ts:58-65`, `141-152`). No CS50
  identifier is involved, so it stays shared and in place.

The CS50 definition together with the shared values must reproduce current
CS50 output **exactly**: every amount, `sourceType`, `sourceId`, `reason`,
achievement field and order, label, link and guide string is byte-identical
after extraction, whichever layer owns it. The C1 semantic oracles prove this.
Nothing is designed for hypothetical programmes beyond removing the proven
CS50 assumptions.

### 3b. Layer split

- **Core** (pure data; consumable by composition roots and passed into lib):
  identity, curriculum reference, catalogue rules, final-project XP
  milestones, CS50 achievement definitions and the achievement display order.
  Validated once at module load with Zod, fail closed, matching the existing
  `achievementDefinitions` pattern. Validation rejects an order list that
  omits, duplicates or references an unknown achievement ID.
- **Content** (feature/UI-consumable data; no assets): external resources,
  study guides, CS50 terminology.
- **Presentation** (UI layer only): CS50 badge art, emblem, token overrides.
- **Shared, location unchanged**: the six shared achievement definitions in
  `src/lib/achievements`, shared XP policy in `src/lib/xp`, shared labels in
  their current feature modules.

### 3c. Not configuration

[F] Progress entries, study sessions, media events, resume points, slice
status, XP ledger, achievement unlocks, learner profile, onboarding flag and
catalogue sync version are learner/device data that reference a programme.
[D] The definition owns the source catalogue; the database owns the learner's
materialized copy and its sync version.

## 4. Layer placement and dependency direction

[D] New top-level `src/programmes/` with a public entrypoint `@/programmes`
(initially one programme, `cs50x-2026`), created by C2. The programme ID is
always `cs50x-2026`. Any module or folder name C2 chooses is an
implementation name only and is never used where a programme ID is meant.

[F] [P7] ESLint layer rules name only `src/app`, `src/components`,
`src/features` and `src/lib`. A new top-level directory inherits no
restriction, and `src/lib/** → @/programmes/**` is not forbidden, so
`src/lib → src/programmes → src/features` passes lint while a direct
`src/lib → @/features` import is rejected. [F] `src/seed/**` also carries no
ESLint rule today (it imports only `@/lib/domain`).

Rules C2 must add **in the same commit that creates the directory**, each
with a negative probe proving it fires (the probe files are disposable and not
committed):

- `src/programmes/**` may import `@/lib/domain`, `@/lib/validation` and
  `@/seed`; must not import `@/app/*`, `@/components/*`, `@/features/*`,
  `@/lib/db`, `@/lib/storage`, `@/lib/appState` or asset files.
- `src/lib/**` must not import `@/programmes/*`, except the existing
  composition root `src/lib/appState/**`, which already imports `@/seed`.
- `src/components/**` must not import `@/programmes/*`.
- `src/app/**` and `src/features/**` import only `@/programmes` (entrypoint),
  never deep paths.
- Type-only imports must be covered by the same rules. C0 did not probe
  `import type` against `no-restricted-imports`; C2's negative probes must
  include a type-only case for each rule and prove it fires (Epic B B3
  lesson).

Presentation assets stay under the UI layer (a `features/rpg` or programme
presentation module consumed only by UI); `src/programmes/**` core and content
never import asset files.

## 5. Compatibility rules for every extraction story (C2–C5)

- [D] No persisted value changes: IDs, `sourceType`, `sourceId`, `reason`
  strings, XP amounts, unlock IDs, trigger source IDs, catalogue rows,
  `seedVersion`. A changed XP `sourceId` would silently re-award XP on the next
  save (dedupe is by `sourceType` + `sourceId`).
- [D] Existing entrypoints keep compatibility re-exports (`@/seed`
  `bundledCourseSeed`; `features/course` link/guide functions), as Epic B did,
  so existing tests and frozen consumers do not churn.
- [D] Behaviour is judged against the C1 evidence, captured before any move
  (`VALIDATION_READINESS.md` §2 defines the evidence families).
- [D] **Frozen semantic oracles** (family A) cannot be changed by an extraction
  story, with or without a recorded reason. If an extraction would change one,
  the story stops. Only a later story whose accepted contract explicitly
  authorizes that product-semantic change may update it.
- [D] **Characterization** (family B: implementation-derived internal outputs
  and deliberately retained unreachable inputs only) may be updated only by a
  story whose contract names the implementation change, with an owner-reviewed
  reason in its closure record, and never to absorb a change in a family-A
  value.
- [D] Shared values stay shared: no story in C2–C5 moves a shared achievement
  definition, shared XP policy or shared label into programme configuration.

## 6. Owner decisions this contract does not make

The contract is valid for one registered programme regardless of the answers.
OD-1 to OD-5 (`SPEC.md` §6) decide persisted ownership and gate C6; OD-3 and
OD-10 gate C7; OD-7 and OD-8 (retained visual baseline) gate C8. None gates
C1–C5. Shared ownership of an achievement definition does not decide whether
it is unlocked once per learner or once per programme (OD-2).
