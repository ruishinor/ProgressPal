# Epic C / C0 — ProgrammeDefinition ownership proposal

Status: **PROPOSED FOR OWNER REVIEW**. Grounded in
`C0_SEMANTIC_INVENTORY.md` and `C0_PERSISTENCE_OWNERSHIP_ANALYSIS.md`.
Labels: [F] fact, [I] inference, [D] proposed decision, [O] owner decision,
[X] deferred.

## 1. Is the target direction correct?

Target: `active programme → validated ProgrammeDefinition → shared engine →
shared shell`.

[D] **Yes, with three corrections from source evidence.**

1. **Not one monolithic object.** [F] `src/lib/**` may not import features,
   components or app (ESLint). [F] XP, achievement and seed-sync logic live in
   `src/lib`. [F] Badge art is imported with Vite `?inline`
   (`RpgAchievementArt.tsx`) and theme tokens are CSS. A single object holding
   rules, copy, assets and CSS would drag UI assets into the lib graph or force
   the lib engines to import presentation. The definition must be split by
   consumer layer (§3).
2. **The engine must receive programme rules, not import a programme.** [F]
   The engines are pure today (`achievementsFeature.test.ts` enforces no DB
   imports in the achievement engine) and tests inject synthetic seeds
   (`tests/db/testDatabase.ts`). [D] Rules flow in as parameters, exactly as
   `seed` already flows into `initializeDatabase({ seed })`. Only composition
   roots import `@/programmes`.
3. **"Active programme" is resolved once, then passed explicitly.** [F] Epic A
   read-boundary guards forbid `app_meta` (and other stores) inside passive RPG
   read transactions (`tests/features/rpg/mapReadBoundary.test.ts:41-48`,
   exact store allowlists and a single read-only transaction). [D] The active
   programme is resolved at app-state bootstrap and passed as an explicit
   `programmeId`/definition argument to read models and repositories; it is
   never looked up inside a passive read transaction.

## 2. Structural contract

[D] `Programme → Unit → Item`, reusing `CourseSeed` unchanged. The programme
identity is the existing `courseId` (`cs50x-2026`). No new hierarchy level.
"Module"/"task"/"week"/"problem set" are terminology supplied by the
definition, not structure.

## 3. Ownership split

### 3a. `ProgrammeDefinition` core (pure data; consumable by composition roots and passed into lib)

| Concern               | Content                                                                                                                                                       | Source today                                 | Story                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------- |
| Identity              | `programmeId` (= `courseId`), title                                                                                                                           | seed JSON                                    | C1                                  |
| Curriculum            | `CourseSeed` catalogue (`dataVersion` = catalogue version)                                                                                                    | `src/seed/cs50x-2026.json`                   | C1 (referenced in place, not moved) |
| Catalogue rules       | required unit types, e.g. `final_project`                                                                                                                     | `lib/domain/schemas.ts:444`                  | C2                                  |
| XP policy             | item-type completion values; submission-workflow values; unit-type completion bonus; named milestones with **exact** `sourceType`, `sourceId`, `xp`, `reason` | `lib/xp/engine.ts`, `lib/db/repositories.ts` | C2                                  |
| Achievements          | definitions (id, title, description, category, ruleType, ruleConfig)                                                                                          | `lib/achievements/definitions.ts`            | C2                                  |
| Workflow capabilities | item types allowed `submitted`/`accepted` (incl. the correction-path asymmetry)                                                                               | `features/course/detailModel.ts`             | C3                                  |

Validated once at module load with Zod and fail-closed, matching the
existing `achievementDefinitions` pattern.

### 3b. `ProgrammeContent` (feature/UI-consumable data; no assets)

| Concern            | Content                                                                                                                                                                    | Source today                                                  | Story |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----- |
| External resources | unit/item link maps; declared allowed URL prefixes                                                                                                                         | `features/course/cs50Links.ts`, `localOnly.test.ts` allowlist | C1    |
| Study guide        | unit/item guides with authoring rules                                                                                                                                      | `features/course/guideContent.ts`                             | C1    |
| Terminology        | unit/item type labels, achievement category labels, session-mode labels, curriculum copy ("CS50 course map", "Week progress", "RPG week"), official-completion disclaimers | see inventory §2g                                             | C3    |
| RPG identity       | guild/class/path labels, unit ordinal label (replaces `id.startsWith('week-')` parsing)                                                                                    | `rpg/model/*`, `RpgMapPage.tsx`                               | C3    |

### 3c. `ProgrammePresentation` (assets and theme; UI layer only)

| Concern      | Content                                     | Source today            | Story                                                     |
| ------------ | ------------------------------------------- | ----------------------- | --------------------------------------------------------- |
| Badge art    | achievement id → asset                      | `RpgAchievementArt.tsx` | C7, after visual baseline V0                              |
| Emblem       | guild emblem asset                          | `RpgHeroIdentity.tsx`   | C7                                                        |
| Theme tokens | optional overrides of `--rpg-*`/`--color-*` | `src/styles/*.css`      | C7; [X] only if a second programme needs a different look |

### 3d. Stays in the shared engine (not programme config)

[F]/[D] Status model and labels; completion math; long-form slicing and
resume; XP level curve; activity XP (media blocks, clean stop, slice,
25-minute session); achievement rule evaluator; calendar-week bucketing;
sessions/insights/settings surfaces; backup/restore/reset; cross-tab
coordination; routes.

### 3e. Not configuration: learner / programme-owned persisted state

[F] Progress entries, study sessions, media events, resume points, slice
status, XP ledger, achievement unlocks, learner profile, onboarding flag,
catalogue sync version. These are learner data that **reference** a
programme; they must never be embedded in or regenerated from a definition.
See `C0_PERSISTENCE_OWNERSHIP_ANALYSIS.md`.

[F] The catalogue is both: defined by the programme and **materialized** into
`course_units`/`course_items`, never deleted by sync, and exported in backups.
[D] The definition owns the source catalogue; the database owns the learner's
materialized copy and its sync version.

## 4. Layer placement

[D] New top-level `src/programmes/` with a public entrypoint
`@/programmes` (initially one programme, `cs50x`) and a single accessor for the
active definition.

Import rules to be enforced by ESLint **in the same story that creates the
directory** (probe P7 proved a new directory inherits no restriction and
opens a lib → programmes → features path):

- `src/programmes/**` may import `@/lib/domain`, `@/lib/validation` and
  `@/seed`; must not import `@/app/*`, `@/components/*`, `@/features/*`,
  `@/lib/db`, `@/lib/storage`, `@/lib/appState`, or asset files.
- `src/lib/**` must not import `@/programmes/*`, except the existing
  composition root `src/lib/appState/**`, which already imports `@/seed`.
- `src/components/**` must not import `@/programmes/*`.
- Features and app import only `@/programmes` (entrypoint), never deep paths.

## 5. Compatibility rules for every extraction story

- [D] No persisted value may change: IDs, `sourceType`, `sourceId`, `reason`
  strings, XP amounts, unlock IDs, trigger source IDs, catalogue rows,
  `seedVersion`. A changed XP `sourceId` would silently re-award XP on the next
  save (dedupe is by `sourceType` + `sourceId`).
- [D] Existing entrypoints keep compatibility re-exports (`@/seed`
  `bundledCourseSeed`; `features/course` link/guide functions) exactly as Epic B
  did, so ~20 test files and frozen consumers do not churn.
- [D] Behavior oracles are golden tables captured **before** the move
  (all potential awards for every CS50 item × status; achievement satisfaction
  over existing fixtures; every link/guide lookup), not symbol searches.

## 6. Owner decisions this proposal does not make

The proposal is valid for one programme regardless of the answers. OD-1 to
OD-5 in `C0_DECISIONS_AND_DEFERRALS.md` (XP/level scope, shared achievements,
enrolment/switching, session/insight scope, edition rollover) decide the
persistence shape and gate C4 onward, not C1–C3.
