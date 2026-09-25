# Epic C / C0 — semantic inventory

Status: **VERIFIED against HEAD `fd5e2d5` / tree `bc86fd3`**. Labels: [F] fact,
[I] inference, [D] proposed decision, [O] owner decision, [X] deferred.

The inventory was produced by reading the owning modules and by
`grep -rn -i "cs50|harvard|final[-_ ]project|problem[-_ ]set|pset|week|scratch|code knights"`
over `src/**/*.{ts,tsx}`, then following every hit to its semantic owner. A
symbol search alone was not accepted as ownership evidence.

## 1. Structural model actually in use

[F] The curriculum is exactly two levels below the programme:
`CourseSeed (courseId) → units[] → items[]`, persisted as `course_units`
(with `courseId`) and `course_items` (with `unitId`). Every consumer — course
map, module, resource, Focus, sessions, XP, achievements, insights, backup
relations — keys on unit → item. No consumer walks a deeper hierarchy.

[F] `content_assets` and `content_slices` are derived per long-form item
(`lecture`, `reading`, `section`, `shorts`) to plan media time. They are a
media-progress mechanism, not a third curriculum level.

[D] A programme described as `Programme → Modules → Tasks` maps directly onto
`course → unit → item`. No deeper hierarchy is justified by current source.
"Module" and "task" are terminology, not new structure.

## 2. Programme-specific (CS50) semantics and where they live

### 2a. Curriculum and catalogue

| Semantic                                                                        | Location                                                                                                                                             | Class |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Catalogue: 14 units / 68 items, `courseId` `cs50x-2026`, `dataVersion` 20260617 | `src/seed/cs50x-2026.json`, `src/seed/index.ts`                                                                                                      | [F]   |
| Seed validation requires a `final_project` unit                                 | `src/lib/domain/schemas.ts:444` (generic schema carries a CS50 rule)                                                                                 | [F]   |
| Unit-type vocabulary `week`, `special`, `final_project`                         | `src/lib/domain/constants.ts:1-5`, persisted in `course_units.type`                                                                                  | [F]   |
| Item-type vocabulary incl. `problem_set`, `shorts`, `section`, `lab`            | `src/lib/domain/constants.ts:7-18`, persisted in `course_items.type`                                                                                 | [F]   |
| Study-session mode `final_project`                                              | `src/lib/domain/constants.ts:62`, persisted in `study_sessions.mode`                                                                                 | [F]   |
| Seed consumers (composition roots)                                              | `lib/appState/AppStateProvider.tsx:228`, `features/profile/routes/OnboardingPage.tsx:79`, `features/settings/components/SettingsSurface.tsx:173,198` | [F]   |

[F] Type vocabularies are closed Zod enums validated on every stored-row read
and in backups. Renaming or re-meaning a value is a persisted-data change.

### 2b. XP rules (`src/lib/xp/engine.ts`)

| Rule                                                                                                | Lines   | Programme coupling                                                                                                          |
| --------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| Item completion XP by type: lecture 40, section 20, shorts 15, practice 30, notes 15, reflection 15 | 136-176 | [F] values are programme policy keyed on the closed type vocabulary                                                         |
| Problem-set workflow XP: started 20, submitted 75, accepted 125                                     | 182-217 | [F] keyed on item type `problem_set`                                                                                        |
| Unit completion bonus 150 for `required` units of type `week`                                       | 220-240 | [F] keyed on unit type `week`; applies to any programme using that type (probe P4b)                                         |
| Final-project milestones 250 and 200                                                                | 243-274 | [F] hard-coded CS50 item IDs `final-project-build`, `final-project-readme`, `final-project-video-demo` and fixed source IDs |
| Preview completion status (`accepted` for problem sets)                                             | 293     | [F] item-type keyed                                                                                                         |

[F] The same final-project item IDs are repeated in
`src/lib/db/repositories.ts:2678-2683` and `:2928-2933`, which also locate "the"
final-project unit with `.where('type').equals('final_project').first()` — a
global single-programme lookup.

[F] `src/features/insights/model.ts:42-57` classifies persisted XP
`sourceType` strings (incl. `problem_set_*`, `final_project_*`,
`week_completed`) into item/unit award counts.

[F] `src/features/rpg/model/questRewards.ts:43-72` repeats the final-project
IDs and the `week_completed` classification for reward labels.

### 2c. Achievements (`src/lib/achievements/definitions.ts`)

[F] 16 code-only definitions. Eleven are CS50-bound: seven
`unit_required_completed` with `unitId` `week-0/4/5/6/7/8/9`, one
`course_required_completed`, `pset-chain` (`problem_set_status_count`), and two
final-project definitions bound to CS50 item IDs. Titles and descriptions name
Scratch, Memory, SQL, Flask, etc.

[F] Five are programme-neutral in rule and wording: `first-step`,
`first-slice`, `clean-stop`, `three-deep-sessions`, `bug-hunter`.

[F] The engine (`engine.ts`) is a generic rule evaluator except
`problem_set_status_count`, which hard-codes item type `problem_set`
(`engine.ts:289`), and `course_required_completed`, which requires every
required unit in the evaluation context (`engine.ts:233-253`) — today the
whole `course_units` store.

[F] Category vocabulary `problem_sets`, `final_project` is programme-shaped
(`src/lib/domain/constants.ts:89-97`; labels in
`src/features/achievements/model.ts:7-15`). Deferred to Epic C by B0.

[F] Badge artwork is keyed by achievement ID
(`src/features/rpg/components/RpgAchievementArt.tsx:20-38`).

### 2d. Completion and workflow rules

[F] `canUseSubmittedStatuses` allows `submitted`/`accepted` for item types
`lab` and `problem_set` (`src/features/course/detailModel.ts:58-65`), but the
correction path offers them only for `problem_set` (`:149`). Frozen as-is;
recorded because a programme "submission workflow" capability would have to
reproduce this asymmetry exactly.

[F] Generic completion math (below) is not CS50-specific.

### 2e. External links

[F] `src/features/course/cs50Links.ts`: 14 unit links and 15 item links to
`https://cs50.harvard.edu/x/…`, keyed by CS50 unit/item IDs. Consumers:
`CourseUnitCard.tsx`, `ContentDetailPage.tsx`, `rpg/model/readModels.ts`.
[F] `tests/architecture/localOnly.test.ts` allowlists exactly the
`https://cs50.harvard.edu/` prefix for this file.

### 2f. Study-guide content

[F] `src/features/course/guideContent.ts`: locally authored guides for
`week-0`, `week-1` and four items, keyed by CS50 IDs, with authoring rules in
the header. Consumers: `CourseUnitCard.tsx`, `ContentDetailPage.tsx`.

### 2g. Terminology and copy

[F] CS50/curriculum wording in rendered copy:

- Brand "ProgressPal CS50 Edition": `index.html` `<title>`,
  `components/layout/AppShell.tsx:33`, `app/shell/AppShell.tsx:52-53,90,195`.
- "CS50" copy: `app/shell/AppShell.tsx:193`, `app/routes/HomePage.tsx:47`,
  `profile/routes/OnboardingPage.tsx:95,103`,
  `dashboard/routes/DashboardPage.tsx:181,260`,
  `course/routes/CoursePage.tsx:132-133,161-162,187`,
  `course/components/CourseMapSummary.tsx:40`,
  `insights/components/InsightsSurface.tsx:78,216`,
  `rpg/routes/RpgHeroPage.tsx:189`, `rpg/routes/RpgHomePage.tsx:124`,
  `rpg/routes/RpgResourcePage.tsx:625-626`,
  `settings/components/SettingsSurface.tsx:390`.
- Curriculum "week" wording: `course/components/CourseUnitCard.tsx:32`
  ("Week progress"), `rpg/routes/RpgModulePage.tsx:80-213` ("RPG week"),
  `rpg/routes/RpgMapPage.tsx:206`, `rpg/routes/RpgResourcePage.tsx:633`.
- Type labels: `course/model.ts:73-90`, `course/routes/ContentDetailPage.tsx:158-179`,
  `sessions/model.ts:110-118`, `achievements/model.ts:7-15`.
- RPG identity: guild "Code Knights", class "Generalist", path
  "CS Foundations" (`rpg/model/types.ts:21-25`, `readModels.ts:663-781`),
  emblem asset `rpg-emblem-code-knights-primary.webp`.
- Map node ordinal parsed from the ID string `module.id.startsWith('week-')`
  (`rpg/routes/RpgMapPage.tsx:276,334`).
- Vestigial `RPG_WEEK_FOUR_UNIT_ID = 'week-4'` exposed as `weekFour` in RPG
  summaries (`readModels.ts:61,569,589`), exported and tested but not
  rendered by any route.

[F] Route segment `week` in `/rpg/week/:unitId` is CS50 vocabulary inside a
frozen route contract (`tests/architecture/routeDefinitions.test.ts`).

### 2h. Persistence identifiers

[F] Database name `progresspal-cs50-edition` (`src/lib/db/constants.ts:9`) and
package name. Detailed ID analysis is in
`C0_PERSISTENCE_OWNERSHIP_ANALYSIS.md`.

## 3. Legitimate generic / shared engine semantics

| Semantic                                                                                                                     | Owner                                                                   | Class                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Progress status set, `completeStatuses`, status labels and variants                                                          | `lib/domain`, `lib/completion.ts`, `lib/progress/statusPresentation.ts` | [F]                                                                                               |
| Unit/course completion percentages from `required` flags                                                                     | `features/course/model.ts` `buildCourseMap`                             | [F]                                                                                               |
| Long-form asset derivation, slice plan, coverage union, resume                                                               | `lib/progress/engine.ts`, `map.ts`                                      | [F]                                                                                               |
| Long-form eligibility map lecture/reading/section/shorts → asset type                                                        | `lib/progress/engine.ts:14-21`                                          | [F] generic over the closed vocabulary; [X] revisit only if a programme needs a different mapping |
| XP level curve `floor(sqrt(xp/100))+1`                                                                                       | `lib/xp/engine.ts:17-30`                                                | [F]                                                                                               |
| Activity XP: media 10-minute blocks 4, clean stop 5, slice 10, 25-min session 10                                             | `lib/db/repositories.ts` media/session award paths                      | [F] programme-neutral rules over learner activity                                                 |
| Deterministic ID derivation (XP tx, unlock, asset, slice, resume)                                                            | `lib/xp`, `lib/achievements`, `lib/progress`                            | [F] generic mechanism; see persistence analysis for its missing programme dimension               |
| Achievement rule evaluator (10 rule types)                                                                                   | `lib/achievements/engine.ts`                                            | [F] generic except the two couplings in §2c                                                       |
| Calendar-week bucketing (insights, hub weekly progress)                                                                      | `lib/time`, `features/insights/model.ts`                                | [F] **calendar** week, unrelated to curriculum `week` units                                       |
| Sessions, insights, settings, backup/restore/reset, cross-tab coordination                                                   | `features/*`, `lib/backup`, `lib/storage`                               | [F]                                                                                               |
| Classic/RPG shared capabilities (ProfileAvatar, AchievementsSurface, StudySessionsSurface, InsightsSurface, SettingsSurface) | features, rendered by both shells                                       | [F] B0/B4 ownership retained                                                                      |

[I] The generic engine is sound; Epic C's work is to stop programme policy
leaking into it (XP IDs, achievement IDs, seed rule, final-project lookup) and
to scope its reads to one programme, not to redesign it.

## 4. Summary of CS50 assumptions by concern

| Concern      | CS50-bound today                                                                           |
| ------------ | ------------------------------------------------------------------------------------------ |
| Achievements | 11 of 16 definitions; category vocabulary; badge art map                                   |
| XP           | item-type values, problem-set workflow, `week` unit bonus, final-project milestones        |
| Completion   | `course_required_completed` over all stored units; submission workflow for lab/problem_set |
| Links        | `cs50Links.ts` + local-only URL allowlist                                                  |
| Terminology  | brand, CS50 copy, week wording, type labels, RPG identity, ID-string parsing               |
| Curriculum   | seed JSON, `final_project` seed rule, unit/item type vocabulary                            |
| Study guide  | `guideContent.ts`                                                                          |
