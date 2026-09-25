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

Bootstrap v7 listed ten concerns to validate. Each is classified below. The
"Story" column uses the frozen sequence in `stories.yaml`.

| Concern                    | Programme-owned configuration                                                                                                                                              | Stays shared engine / shell                                         | Runtime / persisted state                                | Story                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| Identity                   | `programmeId` (= existing `courseId` `cs50x-2026`), title                                                                                                                  | —                                                                   | active programme (runtime); enrolment (persisted, C6/C7) | C2                           |
| Curriculum tree            | reference to the existing `CourseSeed` (`dataVersion` = catalogue version); seed referenced in place                                                                       | `Programme → Unit → Item` schema, seed parser                       | materialized catalogue + per-programme sync version (C6) | C2 (reference), C6 (version) |
| Catalogue rules            | required unit types (CS50: must contain a `final_project` unit)                                                                                                            | generic seed validation without CS50 rules                          | —                                                        | C3                           |
| Terminology                | unit/item type labels, achievement category labels, session-mode labels, curriculum copy, official-completion disclaimers, RPG guild/class/path labels, unit ordinal label | type vocabularies (persisted enums, X-5)                            | —                                                        | C4                           |
| External resources         | unit/item link maps; declared allowed URL prefixes                                                                                                                         | local-only guard                                                    | —                                                        | C2                           |
| Progress/completion config | submission-workflow capability (item types allowed `submitted`/`accepted`, including the correction-path asymmetry X-2)                                                    | status model, completion math, long-form slicing/resume             | progress entries (persisted)                             | C4                           |
| XP configuration           | item-type completion amounts; problem-set workflow amounts; unit-type completion bonus; named milestones with **exact** `sourceType`, `sourceId`, `xp`, `reason`           | level curve; activity XP; award dedupe by source key; ID derivation | XP ledger (persisted; scope OD-1)                        | C3                           |
| Achievement definitions    | definitions (id, title, description, category, ruleType, ruleConfig)                                                                                                       | rule evaluator (10 rule types)                                      | unlocks (persisted; scope OD-2)                          | C3                           |
| Study-guide content        | unit/item guides with authoring rules                                                                                                                                      | guide rendering                                                     | —                                                        | C2                           |
| Theme/assets               | badge art map, emblem, optional token overrides (UI layer only)                                                                                                            | shell/frame components, CSS structure                               | learner theme preference (persisted, learner-global)     | C8                           |
| Feature flags              | none today ([F] no mechanism exists)                                                                                                                                       | —                                                                   | —                                                        | none ([X])                   |

The definition must represent current CS50 **exactly**: every amount,
`sourceType`, `sourceId`, `reason` string, achievement field, label, link and
guide string is byte-identical after extraction, proven by the C1 oracles.
Nothing is designed for hypothetical programmes beyond removing the proven
CS50 assumptions.

### 3a. Layer split

- **Core** (pure data; consumable by composition roots and passed into lib):
  identity, curriculum reference, catalogue rules, XP configuration,
  achievement definitions. Validated once at module load with Zod, fail
  closed, matching the existing `achievementDefinitions` pattern.
- **Content** (feature/UI-consumable data; no assets): external resources,
  study guides, terminology, workflow capability.
- **Presentation** (UI layer only): badge art, emblem, token overrides.

### 3b. Not configuration

[F] Progress entries, study sessions, media events, resume points, slice
status, XP ledger, achievement unlocks, learner profile, onboarding flag and
catalogue sync version are learner/device data that reference a programme.
[D] The definition owns the source catalogue; the database owns the learner's
materialized copy and its sync version.

## 4. Layer placement and dependency direction

[D] New top-level `src/programmes/` with a public entrypoint `@/programmes`
(initially one programme, `cs50x`), created by C2.

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
  (`VALIDATION_READINESS.md` §3 defines semantic oracle vs characterization).
- [D] If an extraction requires changing a C1 oracle, the story stops. A
  characterization fixture may be updated only with an explicit owner-reviewed
  reason recorded in the story's closure record; a semantic oracle may not be
  updated by an extraction story at all.

## 6. Owner decisions this contract does not make

The contract is valid for one registered programme regardless of the answers.
OD-1 to OD-5 (`SPEC.md` §6) decide persisted ownership and gate C6; OD-3 and
OD-10 gate C7; OD-7 and the retained visual baseline gate C8. None gates C1–C5.
