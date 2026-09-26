# Epic C / C0 — ProgrammeDefinition contract

Status: **C0 reconciled against Bootstrap v7.0. Contract for owner review;
nothing here is implemented.** Grounded in
`C0_PROGRAMME_ASSUMPTION_INVENTORY.md` and
`C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md`. Labels as in the inventory.

This is the canonical C0 record for the programme definition, registry,
identity terms and active-definition boundary. It supersedes the original
Cowork `C0_PROGRAMME_DEFINITION_PROPOSAL.md` ([C] reconciled to the single
story sequence in `stories.yaml`). Corrections after `64462f6` and `ca8fe96`
are listed in `C0_CLOSURE_RECORD.md` §11–§12.

## 1. Does the target principle fit the code?

Target: `active programme → validated definition → shared engine → shared
shell`.

[D] **Yes, with three source-driven refinements.**

1. **Not one monolithic object.** [F] `src/lib/**` may not import features,
   components or app (ESLint). [F] XP, achievement and seed-sync logic live in
   `src/lib`. [F] Badge art is imported with Vite `?inline` and theme tokens
   are CSS. One object holding rules, copy, assets and CSS would pull UI assets
   into the lib graph or force lib engines to import presentation. The
   definition is therefore split by consumer layer (§4c).
2. **Engines receive programme policy; they do not import a programme.** [F]
   The engines are pure today (`tests/architecture/achievementsFeature.test.ts`
   enforces no DB imports in the achievement engine) and tests inject
   synthetic seeds (`tests/db/testDatabase.ts`). [F] The achievement evaluator
   currently imports its definitions statically (`lib/achievements/engine.ts:12`).
   [D] Policy flows in as parameters, exactly as `seed` already flows into
   `initializeDatabase({ seed })`. Only composition roots and features import
   `@/programmes`; `src/lib/**` never does (except the `lib/appState`
   composition root).
3. **The active definition is resolved once and passed explicitly.** [F] Epic
   A read-boundary guards forbid `app_meta` (and other stores) inside passive
   RPG read transactions (`tests/features/rpg/mapReadBoundary.test.ts`, exact
   store allowlists, one read-only transaction). [D] The active definition is
   resolved at app-state bootstrap and passed explicitly (its definition key
   and catalogue identity, §2) to read models and repositories; it is never
   looked up inside a passive read transaction.

Where persisted ownership sits relative to the runtime path: the definition
is immutable configuration; the database holds the learner's **materialized**
catalogue copy, its catalogue sync version and all learner state
(`C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md` §3). Persisted state references a
catalogue (today) and a persisted programme ownership identity (from C6); it is
never embedded in, or regenerated from, a definition.

## 2. Identity terms

[F] The source proves exactly one identity today: the course/catalogue
identity `cs50x-2026` (seed `courseId`, persisted on every `course_units` row
as `courseId`). It does **not** prove what the stable persisted programme
ownership identity should be across editions. That depends on OD-5 (is a
future CS50x edition a new programme or a new catalogue version of the same
programme?), which C0 does not answer.

Epic C therefore uses four distinct terms:

| Term                                       | Meaning                                                                                               | Value / when frozen                                                                                                                                                             | Used by                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Catalogue identity** (`courseId`)        | Identity of one materialized curriculum catalogue                                                     | `cs50x-2026` — source fact; unchanged by Epic C                                                                                                                                 | catalogue rows, C5 read scoping, `course-complete` trigger source |
| **Catalogue version**                      | Version of that catalogue's content                                                                   | `dataVersion` 20260617 (`app_meta.seedVersion` today); becomes per-catalogue state in C6                                                                                        | seed sync, C6                                                     |
| **Definition key**                         | Key of a compiled definition in the registry; runtime and compile-time only, never persisted by C2–C5 | The CS50 definition is keyed by its catalogue identity `cs50x-2026` for compatibility and scoping. This is **not** a claim about the final programme ownership identity         | registry accessor, composition roots, C2–C5                       |
| **Persisted programme ownership identity** | Stable identity stored on enrolment/active state and on any programme-owned learner rows              | **Not frozen by C0.** Chosen in C6 after OD-5; may equal the catalogue identity or be an edition-independent identifier. Epic C does not invent one (in particular not `cs50x`) | C6 enrolment, ownership fields and migration; C7 switching        |

Rules:

- The name `programmeId` is reserved for the persisted programme ownership
  identity. C2–C5 must not introduce a persisted field, stored key or backup
  field with that meaning; they use the definition key and the catalogue
  identity only.
- C2–C5 need no OD-5 answer: C2 registers the CS50 definition under definition
  key `cs50x-2026`; C5 scopes reads by catalogue identity `cs50x-2026`, which is
  already persisted on `course_units`.
- Enrolment identity (C6/C7) references the persisted programme ownership
  identity, never the definition key directly, unless OD-5 makes them equal.
- A module or folder name chosen by C2 is an implementation name only and is
  never used where any of these identities is meant.

## 3. Registry and active-definition boundary

- [D] A registry lists the validated definitions compiled into the app. In
  Epic C it contains exactly one production entry, definition key
  `cs50x-2026`.
- [D] One accessor returns the active definition. Until C6/C7 introduce
  persisted enrolment, "active" is the single registered definition, selected
  at the composition root. No passive read resolves it.
- [D] Multi-definition validation (fail-closed rejection of any colliding unit,
  item, derived, achievement or milestone ID across definitions) is required
  before a second definition can be registered in production (C7). Catalogue
  sync independently rejects cross-catalogue collisions (C6, MR-3). Test-only
  second definitions may be used earlier to prove isolation.
- [D] Switching writes only enrolment/active state (C7) and requires OD-3.
- [D] An unregistered or malformed definition key, or an unmaterialized
  catalogue, fails closed with the existing error state. Scoped reads must never
  return an empty-but-plausible course for a wrong key (Lessons Learned A7: no
  plausible partial truth).

## 4. Concern-by-concern ownership

### 4a. Classification rule

Every rule is classified on three independent axes:

- **A. Shared storage vocabulary**: persisted enum values and persisted
  identity formats (`courseUnitTypeValues`, `courseItemTypeValues`,
  `progressStatusValues`, `studySessionModeValues`,
  `achievementCategoryValues`, XP `sourceType` values, `sourceId`/`reason`
  formats). Kept backward-compatible. Epic C renames or re-keys none of them
  (X-5).
- **B. Shared engine mechanism**: the code that evaluates a rule shape (award
  on completion, award on status milestone, unit-completion bonus, status
  options, status-count achievement, ID derivation, dedupe).
- **C. Programme-specific policy**: which types, statuses, units and amounts a
  rule applies to, and every value that expresses a curriculum's design.

Being keyed on a shared enum value **does not** make a rule shared policy.
Programme policy can be encoded as a generic-looking type branch. The
authoritative control (Lessons Learned register, "CS50 semantics embedded in
generic-looking seed types") requires moving
"week/final-project/problem-set/specific-ID semantics into validated programme
configuration". The Bootstrap definition concerns "progress/completion
configuration", "XP configuration" and "achievement definitions" apply. A rule
stays global platform policy only where evidence other than its code location
or enum key shows it is platform-level; that evidence is stated in §4d.

### 4b. Rule-by-rule classification

| Rule                                                                                             | A. shared vocabulary                                                                           | B. shared mechanism                                                                             | C. CS50 policy (`cs50x-2026` definition)                                                                                                                                                                   | Story |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Completion XP by item type                                                                       | item types; `sourceType` `<type>_completed`; `sourceId` `${itemId}-completed`; `reason` format | award a configured amount when an item of a configured type is complete                         | the type → amount table: lecture 40, section 20, shorts 15, practice 30, notes 15, reflection 15; reading, lab and project_task award nothing                                                              | C3    |
| Problem-set started/submitted/accepted XP                                                        | `problem_set`; statuses; `problem_set_started/submitted/accepted`; `sourceId` suffixes         | status-milestone awards for an item type                                                        | that `problem_set` has this workflow; which statuses count as started/submitted/accepted; amounts 20/75/125                                                                                                | C3    |
| Required `week` unit completion bonus                                                            | unit type `week`; `week_completed`; `sourceId` = unit ID                                       | bonus when every required item of a qualifying unit is complete                                 | qualifying unit type `week` and `required`; amount 150                                                                                                                                                     | C3    |
| Final-project milestones                                                                         | `final_project_build_completed`, `final_project_readme_demo_completed`; fixed `sourceId`s      | single-item and all-of-items milestone shapes                                                   | item IDs `final-project-build`, `final-project-readme`, `final-project-video-demo`; amounts 250/200; exact `sourceId`/`reason`; the pair lookup                                                            | C3    |
| Completion-preview status (`accepted` for `problem_set`)                                         | statuses                                                                                       | evaluate a preview at an item type's terminal status                                            | terminal status per item type, derived from the programme's workflow configuration (row below) rather than configured separately                                                                           | C3    |
| `submitted`/`accepted` workflow for `lab`/`problem_set`, including the correction-path asymmetry | statuses; item types                                                                           | status-option producers (sequence and correction paths, Classic and RPG)                        | which item types have a submission workflow in the status sequence (`lab`, `problem_set`) and in the correction path (`problem_set` only) — preserved exactly ([U] whether the asymmetry is intended; X-2) | C3    |
| `problem_set_status_count` achievement evaluator                                                 | `problem_set`; statuses                                                                        | count items of a configured type whose status is in a set; trigger = sorted qualifying item IDs | the counted item type (`problem_set`), statuses, threshold 3 — carried in the `pset-chain` definition                                                                                                      | C3    |
| Seed must contain a `final_project` unit                                                         | unit type `final_project`                                                                      | seed validation                                                                                 | CS50 required unit types                                                                                                                                                                                   | C3    |

For the `problem_set_status_count` row, C3 may replace the hard-coded
`item.type === 'problem_set'` with a programme-neutral evaluator shape (for
example an item-type/status-count rule whose item type comes from the
definition). The constraint is that CS50 unlock behaviour and trigger identity
stay exactly the same. Rule encoding is not frozen (§6).

[C] P4 showed that a synthetic second programme receives the `week` bonus. That
proves the current engine applies CS50 policy to every catalogue using the
`week` type. It is **not** evidence that the bonus is platform-neutral; the
`ca8fe96` contract drew the wrong conclusion from it.

### 4c. Concern ownership and layer split

| Concern                    | Programme-owned (`cs50x-2026` definition)                                                                                                                                                   | Stays shared                                                                                                                                                                     | Runtime / persisted state                               | Story                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------- |
| Identity                   | definition key and catalogue identity `cs50x-2026`, title (§2)                                                                                                                              | —                                                                                                                                                                                | persisted programme ownership identity (C6, after OD-5) | C2                           |
| Curriculum tree            | reference to the existing `CourseSeed` (catalogue version = `dataVersion`); seed referenced in place                                                                                        | `Programme → Unit → Item` schema, seed parser                                                                                                                                    | materialized catalogue + catalogue sync version (C6)    | C2 (reference), C6 (version) |
| Catalogue rules            | required unit types                                                                                                                                                                         | generic seed validation                                                                                                                                                          | —                                                       | C3                           |
| XP configuration           | all four CS50 XP policies in §4b                                                                                                                                                            | award mechanisms, level curve, activity XP, dedupe by source key, ID derivation, persisted formats                                                                               | XP ledger (persisted; scope OD-1)                       | C3                           |
| Progress/completion config | submission-workflow configuration (§4b); preview terminal status derived from it                                                                                                            | status model and status meanings, completion math, long-form slicing/resume (X-1)                                                                                                | progress entries (persisted)                            | C3                           |
| Achievement definitions    | the 10 CS50-bound definitions and the achievement display order (§5)                                                                                                                        | the 6 platform-neutral definitions (`first-step`, `first-slice`, `course-complete`, `clean-stop`, `three-deep-sessions`, `bug-hunter`); the evaluator and its rule shapes        | unlocks (persisted; scope OD-2)                         | C3                           |
| Terminology                | CS50 copy; the curriculum-unit noun in unit-level copy ("Week progress", "RPG week", "open any week", "Back to week"); RPG identity tuple and its literal types; per-unit map ordinal label | canonical labels of stored vocabulary values (item/unit/asset type, item-context titles, achievement category labels and order, session-mode labels); rank labels and thresholds | —                                                       | C4                           |
| External resources         | unit/item link maps; declared allowed URL prefixes                                                                                                                                          | local-only guard                                                                                                                                                                 | —                                                       | C2                           |
| Study-guide content        | unit/item guides with authoring rules                                                                                                                                                       | guide rendering                                                                                                                                                                  | —                                                       | C2                           |
| Theme/assets               | badge art for the CS50-bound achievements, emblem, optional token overrides (UI layer only)                                                                                                 | badge art for the shared achievements, shell/frame components, CSS structure                                                                                                     | learner theme preference (persisted, learner-global)    | C8                           |
| Feature flags              | none today ([F] no mechanism exists)                                                                                                                                                        | —                                                                                                                                                                                | —                                                       | none ([X])                   |

Layer split:

- **Core** (pure data; consumed by composition roots and passed into lib):
  identity, curriculum reference, catalogue rules, XP configuration,
  submission-workflow configuration, CS50 achievement definitions and the
  achievement display order. Validated once at module load with Zod, fail
  closed.
- **Content** (feature/UI-consumable data; no assets): external resources,
  study guides, CS50 terminology.
- **Presentation** (UI layer only): CS50 badge art, emblem, token overrides.
- **Shared, location unchanged**: the six shared achievement definitions and
  the evaluator in `src/lib/achievements`; XP mechanisms, level curve and
  activity XP in `src/lib/xp` and repository award paths; status model in
  `lib/domain`/`lib/completion`/`lib/progress`; canonical vocabulary labels and
  rank labels in their current feature modules.

### 4d. What stays global platform policy, and why

- **Level curve** `floor(sqrt(xp/100)) + 1`: takes only total XP, no
  curriculum input. OD-1 decides the ledger's scope, not the formula.
- **Activity XP** (10-minute media blocks, clean stop, completed slice,
  25-minute session): consumes only learner time and activity measures
  (watched seconds, session minutes, slice completion, stop reason), never a
  unit, item type or item ID. [I] The archived CS50-era brief listed these
  values next to the curriculum values; they are kept shared because nothing in
  them expresses curriculum design. They are revisitable in Epic E if a
  programme needs a different activity economy.
- **Status model, status meanings and completion math**: Epic B's accepted
  outcome made progress-status presentation a neutral `lib/progress` contract
  (Bootstrap `18_EPIC_B_ACCEPTANCE_AND_LOCAL_INTEGRATION.md`). Required-flag
  completion percentages take no type input.
- **Six neutral achievements**: `first-step`, `first-slice`, `clean-stop`,
  `three-deep-sessions` and `bug-hunter` reference no curriculum unit, item,
  type or topic; `course-complete` has generic rule and copy, and its only
  coupling is its whole-catalogue evaluation context (C5 scopes it by
  catalogue identity). Whether any of them is earned once per learner or once
  per programme is OD-2, not decided here.
- **Canonical vocabulary labels**: they name the stored values and are
  rendered by Epic B-accepted intentional shared UI (Achievements, Study
  Sessions surfaces) in both shells. Changing a label changes no rule. CS50
  wording equals the canonical label today; a programme-specific label override
  is deferred ([X] X-10).
- **Rank labels**: generic percentage thresholds over required-item
  completion (`readModels.ts:275-305`).
- **Long-form eligibility map** (lecture/reading/section/shorts → asset type) is
  **not** claimed to be platform policy. It is type-keyed and may be
  programme-shaped, but it drives derived persisted rows
  (`content_assets` IDs `${itemId}-asset`) that Epic B accepted as a neutral
  long-form contract. Moving it is a migration concern: [X] X-1, revisit in C6
  or Epic E.

### 4e. Evidence for achievement ownership

- [F] Seven CS50 definitions reference unit IDs `week-0/4/5/6/7/8/9` and name
  CS50 topics; two reference CS50 final-project item IDs; `pset-chain` carries
  CS50 wording, the `problem_set` workflow concept and a CS50 threshold.
- [F] Display order is user-visible in RPG only: the RPG badge list iterates
  definitions in declaration order (`features/rpg/model/readModels.ts:496`),
  while the Classic Achievements page sorts by category and then title
  (`features/achievements/model.ts:72-76`). The declaration order interleaves
  shared and CS50 definitions, so the programme owns an explicit ordered list
  of its achievement IDs, shared ones included (§5).

### 4f. Not configuration

[F] Progress entries, study sessions, media events, resume points, slice
status, XP ledger, achievement unlocks, learner profile, onboarding flag and
catalogue sync version are learner/device data. [D] The definition owns the
source catalogue; the database owns the learner's materialized copy and its
sync version.

## 5. Achievement catalogue composition and validation boundary

The programme's ordered list contains programme-owned and shared achievement
IDs. Complete cross-reference validation needs both, without a dependency
cycle.

[D] Chosen approach, the smallest one supported by current architecture:
**the programme layer consumes the shared achievements module as a neutral
lower-layer contract.**

- [F] `src/lib/achievements` imports only `@/lib/domain`, `@/lib/validation`
  and `@/lib/completion`, and is guarded DB-free by
  `tests/architecture/achievementsFeature.test.ts`.
- C2's dependency rules (§6) allow `src/programmes/**` to import the
  `@/lib/achievements` **public entrypoint**. This is a downward dependency,
  like `@/lib/domain`. A cycle is impossible because `src/lib/**` may not
  import `@/programmes/*` (ESLint rule, negative probe) and
  `npm run check:circular` fails on any cycle.
- The CS50 definition module validates, at module load and fail closed:
  - structurally: its own definitions against `AchievementDefinitionSchema`,
    with unique IDs;
  - by cross-reference, against the shared definitions imported from
    `@/lib/achievements`:
    - programme-owned IDs are disjoint from shared IDs;
    - the order list is an exact permutation of programme-owned ∪ shared IDs,
      rejecting omitted, duplicated and unknown IDs.

  It exposes one validated, ordered achievement catalogue. Requiring every
  shared ID matches current CS50, which shows all 16. Whether a future
  programme may omit a shared achievement is not decided (Epic E).

- The registry (C2: one entry; C7: many) re-asserts each registered
  definition's composed catalogue. C7 adds cross-definition collision
  validation.
- Consumers obtain the composed catalogue from the registry accessor
  (features, app and the `lib/appState` composition root) and pass it into lib
  engines and repositories as a parameter. `src/lib/**` never imports the
  programme layer to obtain it.
- The shared module keeps exporting the six shared definitions. During C3, a
  compatibility export of the full composed CS50 list may exist only at a layer
  permitted to see both, so existing consumers do not churn.

## 6. Layer placement and dependency direction

[D] New top-level `src/programmes/` with a public entrypoint `@/programmes`,
created by C2, initially containing one definition (definition key
`cs50x-2026`).

[F] [P7] ESLint layer rules name only `src/app`, `src/components`,
`src/features` and `src/lib`. A new top-level directory inherits no
restriction, and `src/lib/** → @/programmes/**` is not forbidden, so
`src/lib → src/programmes → src/features` passes lint while a direct
`src/lib → @/features` import is rejected. [F] `src/seed/**` also carries no
ESLint rule today (it imports only `@/lib/domain`).

Rules C2 must add **in the same commit that creates the directory**, each
with a negative probe proving it fires (the probe files are disposable and not
committed):

- `src/programmes/**` may import `@/lib/domain`, `@/lib/validation`, `@/seed`
  and the `@/lib/achievements` public entrypoint (§5); must not import
  `@/app/*`, `@/components/*`, `@/features/*`, `@/lib/db`, `@/lib/storage`,
  `@/lib/appState`, deep `@/lib/achievements/*` paths or asset files.
- `src/lib/**` must not import `@/programmes/*`, except the existing
  composition root `src/lib/appState/**`, which already imports `@/seed`.
- `src/components/**` must not import `@/programmes/*`.
- `src/app/**` and `src/features/**` import only `@/programmes` (entrypoint),
  never deep paths.
- Type-only imports must be covered by the same rules. C0 did not probe
  `import type` against `no-restricted-imports`; C2's negative probes must
  include a type-only case for each rule and prove it fires (Epic B B3
  lesson).
- `npm run check:circular` must pass with a disposable probe proving that a
  `lib/achievements → programmes` import is rejected by lint before it can form
  a cycle.

Presentation assets stay under the UI layer (a `features/rpg` or programme
presentation module consumed only by UI); `src/programmes/**` core and content
never import asset files.

## 7. Compatibility rules for every extraction story (C2–C5)

- [D] No persisted value changes: IDs, `sourceType`, `sourceId`, `reason`
  strings, XP amounts, unlock IDs, trigger source IDs, catalogue rows,
  catalogue identity, `seedVersion`, persisted enum values. A changed XP
  `sourceId` would silently re-award XP on the next save (dedupe is by
  `sourceType` + `sourceId`).
- [D] Existing entrypoints keep compatibility re-exports (`@/seed`
  `bundledCourseSeed`; `features/course` link/guide functions), as Epic B did,
  so existing tests and frozen consumers do not churn.
- [D] Behaviour is judged against the C1 evidence, captured before any move
  (`VALIDATION_READINESS.md` §2 defines the evidence families).
- [D] **Frozen semantic oracles** (family A) cannot be changed by an extraction
  story, with or without a recorded reason. If an extraction would change one,
  the story stops. Only a later story whose accepted contract explicitly
  authorizes that product-semantic change may update it.
- [D] **Internal rule encoding is not frozen.** Achievement `ruleType`/
  `ruleConfig` values and the shape of XP/workflow configuration are
  characterization and architecture evidence (families B/C). [F] `ruleType`/
  `ruleConfig` are carried in the internal `AchievementView` read-model type
  but rendered by no feature or app code. The `achievement_definitions` store
  is never written, and backups type them only as generic strings/objects, so
  they are not a public or persisted contract. C3 may change the encoding (for
  example generalising `problem_set_status_count`) provided every family-A
  unlock, reward and label oracle stays identical.
- [D] **Characterization** (family B) may be updated only by a story whose
  contract names the implementation change, with an owner-reviewed reason in
  its closure record, and never to absorb a change in a family-A value.
- [D] Shared values stay shared: no story in C2–C5 moves a §4d shared rule,
  shared achievement definition or canonical label into programme
  configuration. CS50 policy (§4b) moves only in C3.

## 8. Owner decisions this contract does not make

The contract is valid for one registered definition regardless of the
answers. OD-1 to OD-5 (`SPEC.md` §6) decide persisted ownership and gate C6;
OD-5 in particular decides the persisted programme ownership identity (§2).
OD-3 and OD-10 gate C7; OD-7 and OD-8 (retained visual baseline) gate C8. None
gates C1–C5. Shared ownership of an achievement definition does not decide
whether it is unlocked once per learner or once per programme (OD-2).
