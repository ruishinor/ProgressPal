# Epic C / C0 — programme-assumption inventory

Status: **C0 reconciled against Bootstrap v7.0**. Source baseline: `master`
`fd5e2d592bb6f5d1724509119147c48ba3a5df59` / tree
`bc86fd392a5284d9db8821c31a27b8c95ec82a9a`. The C0 reconciliation adds no
production change.

This is the canonical C0 inventory. It consolidates the original Cowork
`C0_SEMANTIC_INVENTORY.md` after every substantive claim was re-verified
against source in the reconciliation run.

## Evidence labels (used in every Epic C record)

| Label | Meaning                                                                  |
| ----- | ------------------------------------------------------------------------ |
| [F]   | Confirmed source or repository fact, re-verified in the reconciliation   |
| [P]   | Confirmed probe result (`C0_EVIDENCE_PROBES.md`)                         |
| [I]   | Inference from facts                                                     |
| [D]   | Architectural proposal for owner acceptance at C0 review                 |
| [O]   | Owner decision (register in `SPEC.md` §6)                                |
| [U]   | Unresolved                                                               |
| [X]   | Deferred concern                                                         |
| [C]   | Original C0 claim corrected by the reconciliation (reason stated inline) |

Classes used for each finding: **shared engine/shell**, **programme
configuration**, **programme-owned persisted learner state**,
**migration/versioning concern**, **intentional shared UI**, **Epic D
visual/navigation concern**, **Epic F/G cloud concern**, **unresolved**.

## 1. Curriculum shape

[F] The curriculum is exactly two levels below the programme:
`CourseSeed (courseId) → units[] → items[]`, persisted as `course_units`
(with `courseId`, index `[courseId+order]`) and `course_items` (with `unitId`,
index `[unitId+order]`) (`src/lib/db/database.ts:29-30`). No consumer walks a
deeper hierarchy.

[F] `content_assets` and `content_slices` are derived per long-form item
(`lecture`, `reading`, `section`, `shorts`) to plan media time. They are a
media-progress mechanism, not a third curriculum level.

[F] Bundled CS50 catalogue: `courseId` `cs50x-2026`, `dataVersion` 20260617,
14 units (11 `week`, 2 optional `special`, 1 `final_project`), 68 items, 26
required items (`src/seed/cs50x-2026.json`). Item types present: lecture 12,
problem_set 10, shorts 9, section 9, reading 1, practice 22, project_task 5.
No `lab`, `notes` or `reflection` item exists in the CS50 seed.

[I] A programme described as `Programme → Modules → Tasks` maps onto
`course → unit → item`. "Module" and "task" are terminology, not structure.
**No deeper hierarchy is justified by current source or by any real programme
requirement known to C0.**

## 2. Programme-specific (CS50) semantics in generic-looking code

### 2a. Catalogue and validation

| Semantic                                                             | Location                                                                                                                                             | Evidence | Class                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------- |
| Generic seed schema requires a `final_project` unit                  | `src/lib/domain/schemas.ts:444-450`                                                                                                                  | [F] [P1] | programme configuration embedded in shared validation |
| Unit-type vocabulary `week`, `special`, `final_project`              | `src/lib/domain/constants.ts:1-5`; persisted `course_units.type`                                                                                     | [F]      | shared persisted enum; shared labels (X-5, X-10)      |
| Item-type vocabulary incl. `problem_set`, `lab`, `shorts`, `section` | `src/lib/domain/constants.ts:7-18`; persisted `course_items.type`                                                                                    | [F]      | shared persisted enum; shared labels (X-5, X-10)      |
| Study-session mode `final_project`                                   | `src/lib/domain/constants.ts:62`; persisted `study_sessions.mode`                                                                                    | [F]      | shared persisted enum; shared label (X-5, X-10)       |
| Achievement category vocabulary `problem_sets`, `final_project`      | `src/lib/domain/constants.ts:89-97`                                                                                                                  | [F]      | shared persisted enum; shared labels (X-5, X-10)      |
| Seed composition roots (only callers pass `bundledCourseSeed`)       | `lib/appState/AppStateProvider.tsx:228`, `features/profile/routes/OnboardingPage.tsx:79`, `features/settings/components/SettingsSurface.tsx:173,198` | [F]      | composition roots                                     |

[F] The type vocabularies are closed Zod enums validated on every stored-row
read and in backups. Renaming or re-meaning a value is a persisted-data change
and is not proposed by Epic C ([X] X-5).

### 2b. XP rules (`src/lib/xp/engine.ts`)

| Rule                                                                                                | Evidence | Programme coupling                                                                                                                 |
| --------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Completion XP by item type: lecture 40, section 20, shorts 15, practice 30, notes 15, reflection 15 | [F]      | Shared policy keyed only on the shared type vocabulary; no CS50 input. `reading`, `lab`, `project_task` earn no completion XP.     |
| Problem-set workflow XP: started 20, submitted 75, accepted 125                                     | [F]      | Shared policy keyed on the shared type `problem_set`                                                                               |
| Unit completion bonus 150 for required units of type `week`                                         | [F] [P4] | Shared policy keyed on the shared unit type `week`; applies to any programme using that type                                       |
| Final-project milestones 250 (build) and 200 (README + demo pair)                                   | [F] [P4] | Hard-coded CS50 item IDs `final-project-build`, `final-project-readme`, `final-project-video-demo` and fixed milestone `sourceId`s |
| Preview completion status (`accepted` for problem sets)                                             | [F]      | Item-type keyed                                                                                                                    |
| Level curve `floor(sqrt(xp/100)) + 1`                                                               | [F]      | Shared engine                                                                                                                      |

[F] The final-project item IDs are repeated in `src/lib/db/repositories.ts`
(`:2678-2683`, `:2928-2933`), which also locates "the" final-project unit with
`.where('type').equals('final_project').first()` — a whole-store,
single-programme lookup.

[F] `src/features/insights/model.ts:42-57` classifies persisted XP
`sourceType` strings (including `problem_set_*`, `final_project_*`,
`week_completed`) into item/unit award counts, with an alignment test
(`tests/features/insightsModel.test.ts`).

[F] `src/features/rpg/model/questRewards.ts:43-72` and the preview in
`src/lib/xp/engine.ts` (`sharedFinalReward`) repeat the final-project pair IDs;
`questRewards.ts` also uses the shared `week_completed` source type for reward
labels.

Classification (reconciled in the ownership split,
`C0_PROGRAMME_DEFINITION_CONTRACT.md` §3): only the final-project milestones
and their pair lookups are CS50-bound. Type amounts, the problem-set workflow
and the `week` bonus are shared policy, and the `sourceType` names are shared
persisted vocabulary.

[F] Activity XP (10-minute media blocks, clean stop, slice, 25-minute session)
lives in repository award paths and is programme-neutral in rule; its source
IDs derive from learner-activity IDs. Class: shared engine.

### 2c. Achievements (`src/lib/achievements/`)

[F] 16 code-only definitions (`definitions.ts`), validated at module load; the
`achievement_definitions` store is never read or written. Ten are
CS50-bound: seven `unit_required_completed` on `week-0/4/5/6/7/8/9` naming CS50
topics, `pset-chain` (CS50 wording and threshold), and two final-project
definitions bound to CS50 item IDs.

[F] Six are platform-neutral in rule and wording: `first-step`,
`first-slice`, `clean-stop`, `three-deep-sessions`, `bug-hunter`, and
`course-complete`, whose rule and copy are generic but whose evaluation
context is whole-catalogue today (scoped by C5). Whether any of them is earned
once per learner or once per programme is [O] OD-2.

[F] Declaration order is user-visible: the RPG badge list iterates
`achievementDefinitions` in order (`features/rpg/model/readModels.ts:496`), and
that order interleaves neutral and CS50-bound definitions.

[C] The 64462f6 reconciliation counted `course-complete` as CS50-bound (eleven)
while listing only five neutral definitions; the ownership split corrects this.

[F] The rule evaluator (`engine.ts`) is shared. `problem_set_status_count`
is keyed on the shared type `problem_set` (`engine.ts:289`), which is shared
vocabulary, not a CS50 identifier. `course_required_completed` requires every
required unit in its evaluation context (`engine.ts:233-253`), which is
currently the whole `course_units` store (a read-scope coupling, C5); its
trigger source is the lexicographically smallest `courseId`.

[F] Category labels live in `src/features/achievements/model.ts:7-15`. Badge
artwork is keyed by achievement ID (`src/features/rpg/components/RpgAchievementArt.tsx`).

### 2d. Completion and course-workflow rules

[F] Completion math (required-flag percentages, `completeStatuses`) is shared
engine (`lib/completion.ts`, `features/course/model.ts`).

[F] `canUseSubmittedStatuses` allows `submitted`/`accepted` for item types
`lab` and `problem_set` in the status sequence
(`src/features/course/detailModel.ts:58-65`), while the correction path offers
them only for `problem_set` (`detailModel.ts:141-152`). `skipped_optional` is
offered only for non-required items. The rule is keyed on shared item types,
not CS50 identifiers, so it stays shared and in place; the asymmetry is
frozen as-is ([X] X-2).

[I] Therefore not every item × status combination is a reachable product
state. C1 must derive reachability from the actual status-option producers
(see `NEXT_STORY_HANDOFF_C1.md`).

### 2e. External resources

[F] `src/features/course/cs50Links.ts`: static `https://cs50.harvard.edu/x/…`
anchors keyed by CS50 unit/item IDs. Consumers: `CourseUnitCard.tsx`,
`ContentDetailPage.tsx`, `rpg/model/readModels.ts`. The local-only guard
allowlists exactly the `https://cs50.harvard.edu/` prefix
(`tests/architecture/localOnly.test.ts`). Class: programme configuration.

### 2f. Study-guide content

[F] `src/features/course/guideContent.ts`: locally authored guides for
`week-0`, `week-1` and four items, keyed by CS50 IDs, with authoring rules in
the header. Consumers: `CourseUnitCard.tsx`, `ContentDetailPage.tsx`. Class:
programme configuration.

### 2g. Terminology and copy

[F] CS50 wording in rendered copy, re-verified by search:

- Brand "ProgressPal CS50 Edition": `index.html` `<title>`,
  `components/layout/AppShell.tsx:33`, `app/shell/AppShell.tsx:53,90,195`.
- "CS50" copy: `app/shell/AppShell.tsx:52,193`, `app/routes/HomePage.tsx:47`,
  `profile/routes/OnboardingPage.tsx:95,103`,
  `dashboard/routes/DashboardPage.tsx:181,260`,
  `course/routes/CoursePage.tsx:132-133,161-162,187`,
  `course/components/CourseMapSummary.tsx:40`,
  `insights/components/InsightsSurface.tsx:78,216`,
  `rpg/routes/RpgHeroPage.tsx:189`, `rpg/routes/RpgHomePage.tsx:124`,
  `rpg/routes/RpgResourcePage.tsx:625-626`,
  `settings/components/SettingsSurface.tsx:390`.
- Curriculum "week" wording: `course/components/CourseUnitCard.tsx`,
  `rpg/routes/RpgModulePage.tsx`, `rpg/routes/RpgMapPage.tsx`,
  `rpg/routes/RpgResourcePage.tsx`.
- Type labels: `course/model.ts`, `course/routes/ContentDetailPage.tsx`,
  `sessions/model.ts`, `achievements/model.ts`.
- RPG identity: guild "Code Knights", class "Generalist", path "CS
  Foundations" — **declared as literal TypeScript types** in
  `rpg/model/types.ts:22-24` and assigned in `rpg/model/readModels.ts`
  (four sites); emblem asset `rpg-emblem-code-knights-primary.webp`.
- Map node ordinal parsed from the ID string `module.id.startsWith('week-')`
  (`rpg/routes/RpgMapPage.tsx:276,334`).
- Vestigial `RPG_WEEK_FOUR_UNIT_ID = 'week-4'` (`readModels.ts:61`), exported
  and tested but not rendered ([X] X-3).
- Route segment `week` in `/rpg/week/:unitId` inside the frozen route
  contract (`tests/architecture/routeDefinitions.test.ts`) ([X] X-4).

Class, per item: CS50 copy, unit-noun "week" copy, the RPG identity tuple
and the ID-parsed map ordinal are programme configuration (terminology, C4).
Type, asset-type, category and session-mode labels translate shared persisted
enum values and stay shared; rank labels are generic thresholds
(`readModels.ts:275-305`) and stay shared. The brand is [O] OD-6 and is not
changed by any frozen Epic C story.

### 2h. Theme and assets

[F] 16 badge files (12 WebP, 4 SVG) in `src/features/rpg/assets/badges/` keyed
by achievement ID and inlined with `?inline`; one emblem in
`src/features/rpg/assets/emblems/`. RPG tokens (`src/styles/rpg-tokens.css`)
apply under `body.rpg-route-active`; Classic tokens (`src/styles/tokens.css`)
have light and `:root[data-theme='dark']` blocks. Fonts are system fonts
(`'Aptos', 'Segoe UI Variable Text', 'Segoe UI', 'Helvetica Neue',
sans-serif`); no webfont is bundled. Learner avatar
`public/assets/character-profile.png` is shared, not programme-owned. Class:
programme presentation (badges, emblem, token values) — see
`C0_VISUAL_PRESERVATION_PLAN.md`.

### 2i. Feature flags

[F] No feature-flag mechanism exists in `src/` (search for flag/featureFlag
constructs returned no runtime mechanism). The Classic/RPG interface choice is
a learner preference, not a programme flag. [X] No ProgrammeDefinition
feature-flag concern is created by Epic C; add one only when a real programme
needs a capability toggle.

### 2j. Persistence identifiers

[F] Database name `progresspal-cs50-edition` (`src/lib/db/constants.ts:9`).
Identifier and ownership analysis: `C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md`.

## 3. Single-catalogue assumptions (whole-store reads)

[F] Every catalogue read used by product routes is whole-store
(`courseUnits.toArray()`, `courseItems.toArray()`, `progressEntries.toArray()`
at `repositories.ts:1586,1630,1794,1875-1876,2546-2548,3269-3271,3619-3621,4156-4158`),
covering map, module, resource, hub, hero, HUD, dashboard, insights and
achievement evaluation.

[P] P3: with a second, non-colliding catalogue synced, RPG map output and
course-map read data merge both catalogues (14 → 16 units, 26 → 28 required
items). Numbers are consistent with the seed counts in §1.

[I] Classification: **latent** single-programme assumption. It is not a
current product defect, because every production caller syncs only
`bundledCourseSeed` (§2a). It becomes a defect the moment a second catalogue
is materialized.

## 4. Legitimate shared engine and shell semantics

| Semantic                                                                                                  | Owner                                                                   | Class                                                                      |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Progress status set, `completeStatuses`, status labels and variants                                       | `lib/domain`, `lib/completion.ts`, `lib/progress/statusPresentation.ts` | shared engine                                                              |
| Unit/course completion percentages from `required` flags                                                  | `features/course/model.ts`                                              | shared engine                                                              |
| Long-form asset derivation, slice plan, coverage union, resume                                            | `lib/progress/engine.ts`, `map.ts`                                      | shared engine; [X] X-1 eligibility map                                     |
| XP level curve; activity XP rules                                                                         | `lib/xp/engine.ts`, repository award paths                              | shared engine                                                              |
| Deterministic ID derivation (XP tx, unlock, asset, slice, resume)                                         | `lib/xp`, `lib/achievements`, `lib/progress`                            | shared mechanism; programme dimension: see data map                        |
| Achievement rule evaluator (10 rule types)                                                                | `lib/achievements/engine.ts`                                            | shared engine; `course_required_completed` context is whole-catalogue (C5) |
| Calendar-week bucketing (insights, hub weekly progress)                                                   | `lib/time`, `features/insights/model.ts`                                | shared — calendar week, unrelated to curriculum `week`                     |
| Backup/restore/reset, cross-tab coordination                                                              | `lib/backup`, `lib/storage`, `lib/db`                                   | shared engine                                                              |
| Classic/RPG shared capabilities (ProfileAvatar, Achievements, StudySessions, Insights, Settings surfaces) | features, rendered by both shells                                       | intentional shared UI (Epic B ownership retained)                          |
| Routes and shells                                                                                         | `src/app/**`, `routeDefinitions.ts`                                     | shared shell; route vocabulary frozen                                      |

[I] The shared engine is sound. Epic C's work is to stop programme policy
leaking into it (XP IDs, achievement IDs, seed rule, final-project lookup,
terminology) and to scope catalogue reads to one programme — not to redesign
the engine.

## 5. Summary by concern

| Concern             | CS50-bound today                                                                            | Target owner (see definition contract) |
| ------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------- |
| Identity            | `courseId` `cs50x-2026`; brand copy                                                         | programme definition (brand: OD-6)     |
| Curriculum          | seed JSON; `final_project` seed rule                                                        | programme definition                   |
| XP                  | final-project milestones and pair lookups (type amounts, workflow, `week` bonus are shared) | programme definition, passed into lib  |
| Achievements        | 10 of 16 definitions; display order (6 shared definitions and all category labels shared)   | programme definition, passed into lib  |
| Completion/workflow | `course_required_completed` over all stored units (workflow statuses are shared)            | scoped reads (C5)                      |
| External resources  | `cs50Links.ts` + local-only allowlist                                                       | programme definition content           |
| Study guide         | `guideContent.ts`                                                                           | programme definition content           |
| Terminology         | CS50 copy, unit-noun week wording, RPG identity literals, ID-string ordinal parsing         | programme definition content           |
| Theme/assets        | CS50 badge art, emblem, token values                                                        | programme presentation (UI layer only) |
| Feature flags       | none                                                                                        | none                                   |
| Active programme    | implicit: one bundled seed, whole-store reads                                               | registry accessor, passed explicitly   |

## 6. Deferred concerns

| ID   | Concern                                                                                                                                                                                      | Deferred to                                                                                              |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| X-1  | Long-form eligibility map (lecture/reading/section/shorts) may need to become programme policy                                                                                               | Only if a registered programme needs a different mapping                                                 |
| X-2  | `lab` vs `problem_set` asymmetry between status sequence and correction path                                                                                                                 | Frozen in place (shared); protected by C1 reachability                                                   |
| X-3  | Vestigial `weekFour` / `RPG_WEEK_FOUR_UNIT_ID` (exported, tested, not rendered)                                                                                                              | Owner-approved cleanup; not Epic C by default                                                            |
| X-4  | Route segment `week` in `/rpg/week/:unitId`                                                                                                                                                  | Kept; any rename needs a route decision                                                                  |
| X-5  | Closed persisted type vocabularies (`week`, `final_project`, `problem_set`, session mode `final_project`)                                                                                    | Kept; labels stay shared                                                                                 |
| X-6  | Multi-tab upgrade behaviour (no explicit `versionchange`/`blocked` handling)                                                                                                                 | C6 (migration contract MR-13)                                                                            |
| X-7  | Firebase/cloud persistence                                                                                                                                                                   | Epic F/G                                                                                                 |
| X-8  | Repository hygiene: `git count-objects -vH` reports ≈831 MiB loose objects and ≈166 MiB garbage (one temp object); unrelated to Epic C                                                       | Owner housekeeping                                                                                       |
| X-9  | Seed sync never deletes removed catalogue rows; per-programme sync must decide orphan handling                                                                                               | C6                                                                                                       |
| X-10 | Programme-specific overrides of shared values (labels of shared enum values, type-keyed XP amounts, the item type behind `problem_set_status_count`, which session modes a programme offers) | Only when a registered programme needs different wording or policy (Epic E trigger); not built in Epic C |

Known unrelated issues (not reopened by C0): KI-01 `Preparing RPG`
hard-refresh flash, KI-02 service-worker fetch rejection, KI-03 CI Node
runtime warning. None affects C0 evidence.
