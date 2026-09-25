# Epic B / B0 — shipped-source dependency inventory

Status: **PASS_READY_FOR_B1**. Verified on clean `master` at
`d4b945ba0b024ceb4fbd29d70bcecc8496b3c6c3`, tree
`434f231404d02fe717a8aae93ceb4d323d845858`, before branching.

`rg -n -P 'from .@/features/(?!rpg/)' src/features/rpg` found **19 import
statements in 13 RPG files, targeting 11 feature module paths**. This matches
the supplied archive inventory. These counts describe the baseline, not a
success metric.

| RPG consumer                     | Target and symbols                                              | Ownership decision                                                                                     |
| -------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `components/RpgHeroIdentity.tsx` | profile: `ProfileAvatar`                                        | Keep shared UI capability.                                                                             |
| `model/readModels.ts`            | course/detailModel: `buildCourseDetailView`, `CourseDetailView` | Keep course-owned application capability; its type labels come from `CourseItemType`.                  |
| `model/readModels.ts`            | achievements/model: `achievementCategoryLabels`                 | Defer to Epic C: `problem_sets` and `final_project` are programme-shaped.                              |
| `model/readModels.ts`            | course/model: `buildCourseMap`, map view types                  | Keep course-owned application capability; the builder embeds `problem_set` and `final_project` labels. |
| `model/readModels.ts`            | course/cs50Links: CS50 link functions/type                      | Defer to Epic C. The IDs and links are CS50-specific.                                                  |
| `model/readModels.ts`            | progress/model: both long-form map builders                     | Move to `lib/progress` in B2.                                                                          |
| `model/types.ts`                 | course/model: `CourseStatusVariant`                             | Move status presentation contract to `lib/progress` in B1.                                             |
| `model/types.ts`                 | progress: `CourseLongFormProgress`                              | Use the existing identical `LongFormProgressView` from `lib/progress` in B2.                           |
| `routes/RpgBadgesPage.tsx`       | achievements: `AchievementsSurface`                             | Keep shared UI capability.                                                                             |
| `routes/RpgFocusPage.tsx`        | sessions: `StudySessionsSurface`, `StudySessionSaveResult`      | Keep the UI; use the existing DB result contract directly in B3.                                       |
| `routes/RpgHeroPage.tsx`         | course/model: `formatMinutes`                                   | Move to `lib/time` in B1.                                                                              |
| `routes/RpgHomePage.tsx`         | course/model: `formatMinutes`                                   | Move to `lib/time` in B1.                                                                              |
| `routes/RpgLogPage.tsx`          | insights: `InsightsSurface`                                     | Keep shared UI capability.                                                                             |
| `routes/RpgMapPage.tsx`          | course/model: `formatMinutes`                                   | Move to `lib/time` in B1.                                                                              |
| `routes/RpgModulePage.tsx`       | course/model: `formatMinutes`                                   | Move to `lib/time` in B1.                                                                              |
| `routes/RpgResourcePage.tsx`     | course/detailModel: form values, options, validation            | Keep course-owned application capability: option/validation rules explicitly branch on `problem_set`.  |
| `routes/RpgResourcePage.tsx`     | course/model: `getItemStatusLabel`                              | Move to `lib/progress` in B1.                                                                          |
| `routes/RpgSettingsPage.tsx`     | settings: `SettingsSurface`                                     | Keep shared UI capability.                                                                             |
| `shell/RpgShell.tsx`             | course/model: `formatMinutes`                                   | Move to `lib/time` in B1.                                                                              |

The 11 targets are `achievements`, `achievements/model`, `course/cs50Links`,
`course/detailModel`, `course/model`, `insights`, `profile`, `progress`,
`progress/model`, `sessions`, and `settings` (all under `@/features/`).

Cross-feature consumers outside RPG were checked with `rg` over `src` and
`tests`: dashboard and insights use course map/status/formatting; course,
dashboard, insights and RPG use the long-form map; Classic and RPG use the same
course-detail view/form rules; both shells render the shared capabilities.
The course map and detail implementations remain at their semantic owner even
though imports remain. Moving them wholesale would mislabel CS50-shaped rules
as feature-neutral. No unresolved ownership choice changes B1.
