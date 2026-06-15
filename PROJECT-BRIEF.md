# ProgressPal CS50 Edition — Comprehensive Realization Roadmap

Date: 2026-06-11  
Scope: Offline-only, single-user, CS50-focused gamified learning-progress tracker.  
Natural verified endpoint: A local-first web app suitable as a CS50 final-project candidate, with persistent local data, CS50 course progression, XP/level/achievement mechanics, charts, backup/restore, accessibility, security review, README, and demonstration script.

---

## 0. Strategic Reset

### Original concept

ProgressPal began as a broad gamified tracker for thesis writing, training, habits, dashboards, achievements, social features, sync, reminders, and multiple personas.

### Revised concept

ProgressPal CS50 Edition is not a general productivity app. It is a focused local learning companion for one self-directed learner taking CS50x.

It tracks:

- course weeks
- lectures
- sections
- shorts
- notes
- optional practice
- problem sets
- labs if present
- final project milestones
- study sessions
- confidence ratings
- blockers
- XP, levels, and achievements
- local historical progress
- local backup and restore

It explicitly removes:

- social features
- leaderboards
- achievement sharing
- group challenges
- cloud sync
- Google Docs sync
- fitness app sync
- AI recommendations
- multi-persona dashboards
- server accounts
- remote analytics
- external user identity
- mandatory online services

The product principle is: “Make hidden CS50 progress visible without turning learning into social performance.”

---

## 1. Product Definition

### Product name

ProgressPal CS50 Edition

### One persona

Name: The Independent CS50 Learner

Profile:

- Taking CS50x self-paced.
- Has uneven energy and motivation.
- Needs visible structure, not social pressure.
- Benefits from concrete progress markers.
- Wants to see forward motion across videos, exercises, psets, debugging, and final project work.
- Does not want an app that punishes missed days.
- Needs offline use because the tracker should work even when course pages or internet access are unavailable.

### Core job-to-be-done

“When I am working through CS50, help me see exactly where I am, what comes next, what I have already done, and how my effort compounds over time.”

### Non-goals

Do not build:

- generic goal categories
- public profiles
- social feeds
- live CS50 scraping
- CS50 login integration
- score syncing
- AI coaching
- mobile-native Android first version
- notification dependency
- gamification that rewards empty app-opening behavior

### Primary success condition

A learner can install or run the app locally, set up their CS50 track, log progress over multiple sessions, close and reopen the app, and see accurate persistent progress, XP, levels, achievements, charts, and next actions without any network dependency.

---

## 2. Recommended Technical Direction

### Primary stack

Use a local-first browser app:

- Vite
- React
- TypeScript
- IndexedDB through Dexie
- Zod for runtime validation
- Vitest for unit and integration testing
- Playwright for end-to-end testing
- axe-core or Playwright accessibility checks
- Recharts or a lighter chart library for progress charts
- ESLint and Prettier
- No backend for MVP
- No cloud database
- No authentication
- No external APIs
- No CDN assets in production

### Why this stack

This is the least-friction route for a CS50-adjacent final project with a strong interface. It uses HTML, CSS, JavaScript, data modeling, algorithms, local persistence, state management, testing, and product design without adding Android build complexity.

### Acceptable alternatives

Use one of these only if there is a clear reason:

1. Flask + SQLite + vanilla JavaScript
   - More directly aligned with CS50 Week 9.
   - Good if the project must visibly use Python and SQL.
   - Less elegant for true offline browser-only use because it requires a local server process.

2. Svelte + Dexie
   - Simpler state model than React for some developers.
   - Smaller conceptual surface.
   - Less aligned if previous drafts assume React/Recharts.

3. Tauri + local SQLite
   - Best if a desktop app is wanted later.
   - Adds Rust/toolchain complexity.
   - Not necessary for MVP.

4. Android native with Kotlin
   - Useful only if the app must be Android-first.
   - Delays learning value and adds platform-specific friction.
   - Not recommended for the first complete version.

Final recommendation: build a browser-based local-first PWA-style app first. Wrap later only after the product logic is stable.

---

## 3. Core Course Model

The app should ship with a local seed file, not live scraping.

File:
`src/data/cs50x-2026.seed.json`

Suggested structure:

```json
{
  "courseId": "cs50x-2026",
  "title": "CS50x 2026",
  "dataVersion": 1,
  "sourceCheckedDate": "2026-06-11",
  "units": [
    {
      "id": "week-0",
      "order": 0,
      "title": "Scratch",
      "type": "week",
      "items": [
        {
          "id": "week-0-lecture",
          "type": "lecture",
          "title": "Lecture",
          "required": true
        },
        {
          "id": "week-0-section",
          "type": "section",
          "title": "Section",
          "required": false
        },
        {
          "id": "week-0-shorts",
          "type": "shorts",
          "title": "Shorts",
          "required": false
        },
        {
          "id": "pset-0",
          "type": "problem_set",
          "title": "Problem Set 0",
          "required": true
        }
      ]
    }
  ]
}
```

Track these CS50 units:

- Week 0: Scratch
- Week 1: C
- Week 2: Arrays
- Week 3: Algorithms
- Week 4: Memory
- Week 5: Data Structures
- Week 6: Python
- Week 7: SQL
- Artificial Intelligence unit
- Week 8: HTML, CSS, JavaScript
- Week 9: Flask
- Week 10: The End
- Final Project

The app should treat course content as editable local data because CS50 content can change between years.

---

## 4. Data Model

Use versioned local data. Every stored object must include `id`, `createdAt`, and `updatedAt`.

### Tables / stores

#### app_meta

Purpose: app version, data schema version, first-run state.

Fields:

- id
- appVersion
- schemaVersion
- seedVersion
- createdAt
- updatedAt

#### learner_profile

Purpose: one local user profile.

Fields:

- id
- displayName
- avatarConfig
- targetStudyDays
- targetMinutesPerWeek
- preferredTheme
- reducedMotion
- createdAt
- updatedAt

#### course_units

Purpose: locally stored CS50 structure.

Fields:

- id
- courseId
- title
- order
- type
- sourceYear
- required
- createdAt
- updatedAt

#### course_items

Purpose: lectures, sections, shorts, psets, labs, final project tasks.

Fields:

- id
- unitId
- type
- title
- required
- estimatedMinutes
- order
- createdAt
- updatedAt

#### progress_entries

Purpose: user progress per course item.

Fields:

- id
- itemId
- status
- startedAt
- completedAt
- confidence

#### content_assets

Purpose: track long-form course material inside an item. A course item is the container; a content asset is the actual lecture, section, shorts group, reading, walkthrough, or problem-set task.

Fields:

- id
- itemId
- assetType: video, shorts_group, reading, problem_set, lab, project_task
- title
- sourceLabel
- sourceUrl, optional; stored as text only, never fetched automatically
- estimatedMinutes
- durationSeconds, optional but required for video assets when known
- defaultSliceMinutes, recommended default: 20
- order
- required
- createdAt
- updatedAt

Rules:

- A lecture item can contain one long video asset.
- A shorts item can contain several short video assets.
- A problem-set item can contain multiple task assets: read specification, set up files, complete problem, test locally, submit, verify accepted.
- The app must never treat a long video as a binary item unless the learner explicitly marks the full asset complete.

#### content_slices

Purpose: divide long-form assets into small, recoverable pieces. This is the “cake slice” model: the learner does not have to consume the whole cake in one sitting.

Fields:

- id
- assetId
- itemId
- order
- label, for example “Slice 1”, “0:00–20:00”, or “Intro and abstraction”
- startSecond
- endSecond
- plannedMinutes
- status: not_started, active, completed, skipped
- completedAt
- createdAt
- updatedAt

Rules:

- Default video slicing should be 20-minute slices.
- The learner can change the slice size to 10, 15, 20, 25, or 30 minutes.
- The app should auto-generate slices when a duration is entered.
- The learner can manually edit slice boundaries if a natural topic break occurs earlier or later than the default.
- Slices are progress units. The lecture is complete only when all required slices are complete or the learner explicitly marks the lecture complete.
- Skipping a slice must require a reason field. It should not count as watched time.

#### media_progress_events

Purpose: immutable log of partial watching or reading work.

Fields:

- id
- itemId
- assetId
- sliceId, optional
- sessionId, optional
- startSecond
- endSecond
- watchedSeconds
- completedSlice
- stoppedBecause: completed_slice, reached_limit, interruption, confusion, fatigue, time_box_finished, other
- energyBefore: 1 to 5
- energyAfter: 1 to 5
- notes
- createdAt
- updatedAt

Rules:

- “Reached limit” is a valid successful stop reason, not a failure state.
- A learner who watches 20 minutes of a 120-minute lecture should see 20 minutes credited immediately.
- Partial progress must survive reloads.
- XP must be based on immutable events, not temporary UI state.
- Duplicate progress events for the same exact asset, start, and end range must be blocked or merged deliberately.

#### resume_points

Purpose: open the next study session exactly where the learner left off.

Fields:

- id
- itemId
- assetId
- lastSecond
- nextSliceId
- updatedFromEventId
- createdAt
- updatedAt

Rules:

- Every media progress event updates the resume point.
- The item detail page must show “Resume at 20:00” rather than only “Lecture started”.
- The dashboard must show the next concrete slice, not just the next broad item.

- notes
- evidenceType
- evidenceText
- createdAt
- updatedAt

Statuses:

- not_started
- started
- blocked
- completed
- submitted
- accepted
- skipped_optional

#### study_sessions

Purpose: logged effort.

Fields:

- id
- unitId
- itemId
- startedAt
- endedAt
- durationMinutes
- mode
- notes
- blockers
- createdAt
- updatedAt

Modes:

- watching
- coding
- debugging
- reading
- note_review
- final_project
- reflection

#### xp_transactions

Purpose: immutable XP ledger.

Fields:

- id
- sourceType
- sourceId
- xp
- reason
- awardedAt
- createdAt

Rules:

- never overwrite transactions
- never delete unless full data reset
- recompute total XP from ledger
- prevent duplicate XP for same source event

#### achievement_definitions

Purpose: static achievement rules.

Fields:

- id
- title
- description
- category
- xpReward
- ruleType
- ruleConfig
- createdAt
- updatedAt

#### achievement_unlocks

Purpose: unlocked achievement history.

Fields:

- id
- achievementId
- unlockedAt
- triggerSourceId
- createdAt

#### backups

Optional local record of export/import events.

Fields:

- id
- type
- fileName
- createdAt
- notes

---

## 5. Gamification Model

### Design rule

Reward real progress, not compulsive checking.

### XP sources

Use transparent XP. Example values:

- Complete lecture: +40 XP
- Complete section: +20 XP
- Complete shorts group: +15 XP
- Complete notes/reflection: +15 XP
- Start problem set: +20 XP
- Submit problem set: +75 XP
- Mark problem set accepted: +125 XP
- Complete optional practice: +30 XP
- Log 25+ minute study session: +10 XP
- Watch/read 10 focused minutes of long-form material: +4 XP
- Complete one long-form content slice: +10 XP
- Stop cleanly after reaching limit, 15+ minutes: +5 XP
- Resume a previous long-form item: +5 XP
- Resolve blocker: +25 XP
- Complete a full week: +150 XP
- Complete final project planning: +100 XP
- Complete final project MVP: +250 XP
- Complete final project README/demo: +200 XP

### Level curve

Use a predictable formula:
`level = floor(sqrt(totalXp / 100)) + 1`

Do not store level as authoritative. Compute it from XP ledger.

### Achievement categories

- Course progress
- Problem sets
- Debugging
- Consistency
- Recovery
- Final project
- Reflection

### Achievement examples

- First Step: complete first course item.
- Scratch Initiate: complete Week 0.
- First Compile: complete first C item.
- Pointer Survivor: complete Memory week.
- Data Structure Builder: complete Week 5.
- Python Shift: complete Week 6.
- Query Builder: complete Week 7.
- Browser Builder: complete Week 8.
- Flask Route Maker: complete Week 9.
- Final Project Architect: complete final project plan.
- Returned After Gap: log progress after 7+ inactive days.
- Blocker Cleared: resolve a blocker.
- Three Deep Sessions: three sessions of 45+ minutes.
- Pset Chain: submit three problem sets.
- Course Complete: complete all required items.

### Streak policy

Do not use punitive streak loss. Use “continuity streak” and “return bonuses.”
A missed day should not display failure language.

---

## 6. UI Architecture

### Screens

#### Launch / First-run screen

Purpose: create local profile and explain offline-only behavior.

Must include:

- app title
- short product sentence
- “Your data stays on this device”
- create local learner profile
- avatar builder
- study rhythm settings
- start button

#### Dashboard

Purpose: show current state and next action.

Must include:

- current unit
- next recommended item
- total course progress
- current week progress
- XP and level
- recent achievements
- study time this week
- blockers
- quick log buttons
- resume button

#### Course Map

Purpose: show all CS50 units.

Must include:

- week cards
- completion state
- required/optional labels
- item checklist
- pset status
- confidence indicator
- locked/unlocked visual treatment based on sequence, but allow override

#### Item Detail

Purpose: log granular progress.

Must include:

- item title and type
- status controls
- notes
- confidence rating
- blocker field
- study session log
- evidence field for self-accountability

#### Focus Session

Purpose: log study effort.

Must include:

- mode selector
- optional timer
- manual duration entry
- associated unit/item
- notes
- blocker encountered
- blocker resolved

#### Achievements

Purpose: show unlocked and locked achievements.

Must include:

- badge grid
- filters
- locked descriptions
- unlock history
- XP reward display

#### Insights

Purpose: show learning history.

Must include:

- XP over time
- study minutes by week
- progress by CS50 unit
- blockers opened/resolved
- confidence trend

#### Settings

Purpose: local control.

Must include:

- export backup
- import backup
- reset app data
- reduced motion
- theme
- edit profile
- edit course seed data
- privacy statement
- app version and data version

---

## 7. Visual Direction

Use “motivational but controlled.”

Avoid:

- generic neon SaaS look
- excessive gradients
- fake crypto dashboard style
- overdone 3D blobs
- confetti on every action
- low contrast badge art
- color-only state indicators
- cut-off decorative elements
- unreadable cards
- childish mascot overload

Use:

- clean dark/light theme
- one strong accent color
- high-contrast cards
- compact dashboards
- tactile progress bars
- subtle achievement animation
- responsive spacing
- visible hierarchy
- accessible badges with text labels
- reduced-motion mode

Avatar style:

- flat vector
- simple face/head options
- hair options
- clothing color
- no complex character creator in MVP
- store avatar as config, not image upload

---

## 8. Operating Framework for Development

Every module follows the same sequence.

### Step A: Read state

Open:

- `PROJECT_STATE.md`
- `ROADMAP.md`
- `VALIDATION_LOG.md`
- `CHANGELOG.md`

### Step B: Create module plan

Create:

- `docs/modules/module-XX-plan.md`

Include:

- scope
- files expected to change
- files forbidden to change
- acceptance criteria
- tests to add
- data compatibility risk
- rollback plan

### Step C: Implement only the module

Do not refactor unrelated areas.
Do not redesign stable screens.
Do not change previous behavior without adding migration and regression tests.

### Step D: Run verification

Run the full command set.

### Step E: Adversarial review

Try to break the module deliberately.

### Step F: Retrospective

Document what changed, what broke, what was fixed, and what remains risky.

### Step G: Triple-Zero gate

The module is not complete until three consecutive full validation runs pass with:

- zero test failures
- zero lint errors
- zero type errors
- zero build errors
- zero accessibility violations in tested flows
- zero unexpected console errors
- zero external network calls
- zero high/critical dependency vulnerabilities
- zero unhandled warnings controlled by project code

### Step H: Update persistent state

Update:

- `PROJECT_STATE.md`
- `VALIDATION_LOG.md`
- `CHANGELOG.md`
- schema/version notes if needed

---

## 9. Required Repository Files

Create these from the beginning:

```text
progresspal-cs50/
  README.md
  ROADMAP.md
  PROJECT_STATE.md
  VALIDATION_LOG.md
  CHANGELOG.md
  SECURITY.md
  PRIVACY.md
  docs/
    decisions/
    modules/
    testing/
    screenshots/
  src/
    app/
    components/
    data/
    db/
    domain/
    features/
    styles/
    tests/
  e2e/
  package.json
  vite.config.ts
  tsconfig.json
  eslint.config.js
  playwright.config.ts
```

### PROJECT_STATE.md template

```md
# Project State

Current module:
Current branch:
Last verified commit:
Schema version:
Seed data version:
Known blockers:
Known risks:
Last Triple-Zero pass:
Next module:
Do not change:
Backwards compatibility fixtures:
```

### VALIDATION_LOG.md template

```md
# Validation Log

## Module XX

Date:
Commit:
Pass 1:
Pass 2:
Pass 3:
Commands:
Failures:
Fixes:
Adversarial findings:
Retrospective:
Decision:
```

---

## 10. Standard Validation Commands

Create package scripts equivalent to:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint . --max-warnings=0",
    "format:check": "prettier . --check",
    "test:unit": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:a11y": "playwright test e2e/accessibility.spec.ts",
    "test:offline": "playwright test e2e/offline.spec.ts",
    "audit:deps": "npm audit --audit-level=moderate",
    "validate": "npm run lint && npm run format:check && npm run build && npm run test:unit && npm run test:e2e && npm run test:a11y && npm run test:offline && npm run audit:deps"
  }
}
```

Triple-Zero means:
Run `npm run validate` three times in a row from a clean working tree.

Before each pass:

```bash
rm -rf node_modules/.vite dist coverage test-results playwright-report
npm run validate
```

If any pass fails, fix the issue and restart at Pass 1.

---

## 11. Module Roadmap

## Module 00 — Scope Lock and Source Translation

### Goal

Convert the old broad concept into the new CS50-only product spec.

### Build tasks

1. Create `ROADMAP.md`.
2. Create `PROJECT_STATE.md`.
3. Create `docs/decisions/000-scope-reset.md`.
4. Document removed features:
   - social
   - sync
   - three personas
   - fitness
   - writing/thesis
   - financial/health/habit categories
   - Android-first target
   - external integrations
5. Document retained features:
   - progress bars
   - XP
   - levels
   - achievements
   - dashboard
   - charts
   - settings
   - avatar
   - responsive UI
6. Define the natural endpoint as “offline CS50 MVP.”

### Verification

- Check that every removed feature is explicitly listed.
- Check that no module depends on cloud, social, or external APIs.
- Check that the word “leaderboard” appears only in removed/deferred sections.
- Check that the app can be explained in one sentence.

### Adversarial review

Ask:

- Is this still too broad?
- Can the MVP be completed by one person?
- Is any removed feature sneaking back through “future expansion”?
- Does the app solve CS50 progression specifically, not generic motivation?

### Triple-Zero

Manual document validation only for this module:

- no unresolved TODOs
- no contradictory scope statements
- all removed features listed
- all retained MVP features listed
- three manual review passes logged

---

## Module 01 — Project Scaffold

### Goal

Create the app shell and tooling.

### Build tasks

1. Create Vite React TypeScript project.
2. Install runtime dependencies:
   - dexie
   - zod
   - date-fns
   - recharts or chosen chart library
3. Install dev dependencies:
   - vitest
   - @testing-library/react
   - @testing-library/jest-dom
   - playwright
   - eslint
   - prettier
   - axe accessibility tooling
4. Create folder structure.
5. Add baseline routes:
   - `/`
   - `/dashboard`
   - `/course`
   - `/achievements`
   - `/insights`
   - `/settings`
6. Add a simple navigation layout.
7. Add empty placeholder pages.
8. Add scripts from validation section.
9. Add first unit test: app renders.
10. Add first E2E test: app opens dashboard placeholder.

### Verification

Run:

- install
- lint
- format check
- typecheck/build
- unit test
- E2E test
- dependency audit

### Adversarial review

Try:

- delete local storage and reload
- open unknown route
- use keyboard only
- run app without network after installation
- inspect console for warnings

### Triple-Zero

Three clean `npm run validate` passes.

---

## Module 02 — Course Seed and Domain Types

### Goal

Define CS50 course structure locally.

### Build tasks

1. Create `src/data/cs50x-2026.seed.json`.
2. Create TypeScript types:
   - Course
   - CourseUnit
   - CourseItem
   - CourseItemType
   - ProgressStatus
3. Create Zod schemas matching types.
4. Add parser that loads and validates seed.
5. Add domain functions:
   - getRequiredItems()
   - getOptionalItems()
   - getItemsByUnit()
   - calculateUnitCompletion()
   - calculateCourseCompletion()
   - getNextRecommendedItem()
6. Add tests for all functions.
7. Add fixture with incomplete course.
8. Add fixture with completed course.
9. Add fixture with malformed seed.

### Verification

- Valid seed loads.
- Malformed seed fails with readable error.
- Course completion ignores optional skipped items.
- Required items control completion.
- Next action follows unit order.

### Adversarial review

Try:

- duplicate IDs
- missing week
- item without unit
- invalid item type
- course with all optional items
- course with no final project

### Triple-Zero

Three clean validation passes. Include malformed-seed tests.

---

## Module 03 — IndexedDB Persistence and Migrations

### Goal

Persist all local data safely.

### Build tasks

1. Create Dexie database wrapper.
2. Create stores:
   - app_meta
   - learner_profile
   - course_units
   - course_items
   - progress_entries
   - study_sessions
   - xp_transactions
   - achievement_definitions
   - achievement_unlocks
   - backups
3. Add schema version 1.
4. Add initialization function:
   - creates app metadata
   - imports seed course if missing
   - creates default profile if missing
5. Add repository functions:
   - getProfile()
   - updateProfile()
   - listCourseUnits()
   - listCourseItems()
   - getProgress()
   - upsertProgress()
   - addStudySession()
   - addXpTransaction()
6. Add migration test fixture.
7. Add reset test database helper.

### Verification

- Fresh database initializes correctly.
- Reload preserves data.
- Duplicate seed import does not duplicate course items.
- Schema version stored.
- Repository functions reject invalid data.
- Tests run against isolated test DB.

### Adversarial review

Try:

- interrupted initialization
- duplicate IDs
- invalid status
- schema version mismatch
- corrupted object shape
- reload after every write

### Triple-Zero

Three validation passes, including reload persistence E2E.

---

## Module 04 — Design System and Layout

### Goal

Build a stable visual foundation before feature UI.

### Build tasks

1. Define CSS tokens:
   - color
   - spacing
   - typography
   - radius
   - shadows
   - motion
   - z-index
2. Create components:
   - AppShell
   - PageHeader
   - Card
   - Button
   - Badge
   - ProgressBar
   - ProgressRing
   - StatCard
   - EmptyState
   - Modal
   - FormField
   - Select
   - Toggle
   - Toast
3. Add dark and light theme.
4. Add reduced-motion support.
5. Add responsive layout breakpoints.
6. Add component tests for render states.
7. Add visual smoke route `/dev/components` hidden from normal navigation.

### Verification

- Components render with accessible labels.
- Buttons have focus states.
- Progress bars have text equivalents.
- Layout works at 360px, 768px, 1024px, 1440px.
- Reduced motion disables non-essential animation.
- No color-only state.

### Adversarial review

Try:

- keyboard-only navigation
- Windows high contrast mode approximation
- zoom to 200%
- reduced motion enabled
- long labels
- empty data states

### Triple-Zero

Three validation passes, including accessibility checks.

---

## Module 05 — First-Run Onboarding and Local Profile

### Goal

Allow the learner to create a local profile and avatar.

### Build tasks

1. Build onboarding route.
2. Detect first run from app metadata.
3. Profile fields:
   - display name
   - avatar face option
   - hair option
   - top color
   - preferred study days
   - weekly minute target
   - theme
   - reduced motion
4. Store avatar as JSON config.
5. Add edit profile in settings.
6. Add skip-safe defaults.
7. Add tests for profile creation.
8. Add E2E:
   - first run
   - create profile
   - reload
   - dashboard appears

### Verification

- No network calls.
- Profile persists.
- Invalid empty profile cannot break app.
- Avatar renders from config.
- Reload does not show onboarding again unless reset.

### Adversarial review

Try:

- empty name
- extremely long name
- invalid avatar config
- reload mid-onboarding
- browser back button
- reset data and start again

### Triple-Zero

Three validation passes.

---

## Module 06 — Course Map

### Goal

Display complete CS50 progression.

### Build tasks

1. Build course map page.
2. Show all units in sequence.
3. Show each unit’s items.
4. Show item status.
5. Show required/optional label.
6. Show completion percentage per unit.
7. Show current recommended item.
8. Add filters:
   - all
   - required
   - incomplete
   - blocked
   - completed
9. Add ability to open item detail page.
10. Add tests for course rendering.

### Verification

- All seeded units appear.
- Required items are visually distinct.
- Optional skipped items do not block progress.
- Current recommended item is correct.
- Empty/corrupt seed states are handled gracefully.

### Adversarial review

Try:

- 0 completed items
- all completed items
- blocked item in week 1
- optional items skipped
- many notes in item labels
- mobile viewport

### Triple-Zero

Three validation passes.

---

## Module 07 — Item Detail and Progress Logging

### Goal

Let the learner update status and notes for every course item.

### Build tasks

1. Build item detail page.
2. Add status selector.
3. Add confidence rating 1–5.
4. Add notes field.
5. Add blocker field.
6. Add evidence field:
   - “What proves this is done?”
7. Add save function.
8. Add unsaved changes warning.
9. Add status transition rules:
   - not_started → started
   - started → blocked
   - started → completed
   - completed → submitted for psets
   - submitted → accepted for psets
   - blocked → started or completed
10. Add tests for status transitions.
11. Add E2E for marking lecture complete and pset submitted.

### Verification

- Progress persists.
- Notes persist.
- Confidence persists.
- Invalid transitions are blocked or confirmed.
- Progress updates course map and dashboard.

### Adversarial review

Try:

- marking future weeks complete
- downgrading accepted pset
- saving empty evidence for accepted pset
- large notes
- reload before save
- duplicate saves

### Triple-Zero

Three validation passes.

---

## Module 07A — Long-Form Video and Reading Progression

### Goal

Make CS50 lectures, sections, shorts, readings, and problem-set instructions trackable in small pieces. A two-hour lecture must be visible as progress through slices, not as one all-or-nothing checkbox.

### Product rule

The app must treat long-form material as a finite sequence of small wins. Watching 20 minutes of a 120-minute lecture is real progress: 16.7% of the lecture, one completed 20-minute slice, a saved resume point, and a valid study session.

### User example

Current state:

- Week 0 lecture duration: 120 minutes, if entered by the learner.
- Learner watches 20 minutes.
- Learner reaches cognitive limit and stops.

Expected app result:

- Week 0 lecture shows 20 / 120 minutes watched.
- Progress bar shows 16.7% for the lecture.
- Slice 1 is complete.
- Resume point is 20:00.
- Dashboard says: “Next: Week 0 Lecture, Slice 2, 20:00–40:00.”
- The stop reason says: “Reached limit.”
- No streak penalty.
- XP awarded for honest partial work.
- The lecture itself remains incomplete.

### Build tasks

1. Create `content_assets` store.
2. Create `content_slices` store.
3. Create `media_progress_events` store.
4. Create `resume_points` store.
5. Add `durationSeconds` and `estimatedMinutes` to video/reading assets.
6. Add a slice generator utility:
   - input: durationSeconds and sliceMinutes
   - output: ordered slices with start/end timestamps
7. Add tests for slice generation:
   - 120 minutes divided into 20-minute slices produces 6 slices
   - 125 minutes divided into 20-minute slices produces 7 slices, with the last slice 5 minutes long
   - 0 minutes is rejected
   - negative duration is rejected
8. Add item-detail UI section called “Material slices”.
9. Show each slice as a segment in a horizontal “cake bar”.
10. Add controls:
    - “Start slice”
    - “Log watched minutes”
    - “Mark slice complete”
    - “Stop here”
    - “Reached my limit”
11. Add a manual timestamp input:
    - start timestamp
    - end timestamp
    - watched minutes auto-calculated
12. Add validation:
    - end timestamp cannot be before start timestamp
    - watched minutes cannot exceed slice length unless explicitly confirmed
    - duplicate time ranges are rejected
13. Add resume logic:
    - after logging 0:00–20:00, next resume is 20:00
    - after logging partial slice 20:00–32:00, next resume is 32:00
14. Add dashboard logic:
    - show next slice, not only next item
    - show “20 minutes done today” as meaningful progress
15. Add XP rules:
    - Complete 10 minutes of focused watching or reading: +4 XP
    - Complete one full slice: +10 XP
    - Stop cleanly with a reason after 15+ minutes: +5 XP
    - Complete full lecture: +40 XP
    - Complete full section: +20 XP
    - Complete all shorts for a week: +15 XP
16. Add achievement rules:
    - “First Slice”: first completed content slice
    - “Clean Stop”: stopped because reached_limit after at least 15 minutes
    - “Back to the Thread”: resumed a previous long-form item
    - “Lecture Broken Down”: completed all slices of one lecture
    - “No All-or-Nothing”: logged three separate partial sessions on one long asset
17. Add visual states:
    - not started: empty segment
    - active/partial: partially filled segment
    - completed: filled segment
    - skipped: outlined segment with warning mark
18. Add reduced-motion support for slice completion animation.
19. Add import/export support for all new stores.
20. Add migration from old binary-only progress entries.

### Verification

- A 120-minute lecture can be divided into six 20-minute slices.
- Watching 20 minutes creates one media progress event.
- The lecture remains incomplete after 20 minutes.
- The lecture progress reads exactly 16.7% or 20 / 120 minutes.
- Resume point reads 20:00.
- Refreshing the browser preserves the slice completion state.
- XP is awarded once and only once for the same slice.
- “Reached my limit” produces a valid saved stop state.
- Dashboard shows the next concrete slice.
- Export/import preserves all media progress and resume points.

### Adversarial review

Try:

- entering 20 minutes twice for the same exact range
- entering 0 minutes
- entering 200 minutes on a 120-minute asset
- completing slice 3 before slice 1
- marking lecture complete after one slice
- deleting a content asset after progress exists
- importing progress where resume point exceeds duration
- switching slice size after progress already exists
- closing tab after starting a slice but before saving
- marking “reached limit” after only 30 seconds

Expected behavior:

- Duplicate ranges are blocked.
- Invalid duration is rejected.
- Out-of-order completion is allowed only after confirmation.
- Full lecture completion after one slice requires explicit override.
- Existing progress survives slice-size changes by preserving original media events.
- “Reached limit” under 5 minutes is saved as a note, but does not award Clean Stop XP.

### Retrospective questions

- Did the feature reward real effort without pretending partial watching equals full understanding?
- Did the UI reduce all-or-nothing pressure?
- Did the app make stopping intelligently feel legitimate?
- Did the data model preserve enough detail to reconstruct progress accurately?
- Did the XP system avoid rewarding meaningless button clicking?

### Triple-Zero

Three full validation passes, including:

- unit tests for slice generation
- integration tests for progress events and resume points
- E2E test for watching 20 minutes, stopping, refreshing, and resuming
- accessibility check for keyboard navigation through slices
- import/export compatibility check
- migration check from binary-only lecture progress

---

## Module 08 — Study Sessions and Focus Logging

### Goal

Track actual work effort.

### Build tasks

1. Create focus session page/modal.
2. Allow manual logging:
   - duration
   - mode
   - unit/item
   - notes
   - blockers
3. Add optional timer.
4. Add pause/resume.
5. Add “finish session” summary.
6. Store session.
7. Link session to XP transaction if qualifying.
8. Add tests:
   - manual duration
   - timer duration
   - session linked to item
   - invalid duration rejected

### Verification

- Sessions persist.
- Duration cannot be negative.
- Session can exist without item but should prefer item.
- Study time totals calculate correctly.
- XP not duplicated on reload.

### Adversarial review

Try:

- zero-minute session
- 9999-minute session
- closing tab mid-session
- two sessions at once
- session for deleted/missing item

### Triple-Zero

Three validation passes.

---

## Module 09 — XP Ledger and Level Engine

### Goal

Make gamification deterministic and testable.

### Build tasks

1. Create XP rules file.
2. Create `awardXpForEvent()`.
3. Create duplicate-prevention logic.
4. Create `calculateTotalXp()`.
5. Create `calculateLevel()`.
6. Create `calculateXpToNextLevel()`.
7. Create transaction viewer for debugging.
8. Connect XP to:
   - item completion
   - pset submission
   - pset acceptance
   - study sessions
   - blockers resolved
   - full week completion
9. Add unit tests for every XP rule.
10. Add E2E that completes item and sees XP increase.

### Verification

- XP is reproducible from transaction ledger.
- Reload does not double-award.
- Reverting status does not create exploit loop.
- Level updates after XP changes.
- XP rules are documented.

### Adversarial review

Try:

- spam save button
- complete/uncomplete/recomplete
- import duplicate backup
- manually corrupt XP transaction
- complete all items rapidly

### Triple-Zero

Three validation passes.

---

## Module 10 — Achievement Engine

### Goal

Unlock meaningful achievements from real progress.

### Build tasks

1. Create achievement definitions.
2. Create rule evaluator.
3. Evaluate rules after progress/session changes.
4. Store unlocks.
5. Prevent duplicate unlocks.
6. Award achievement XP if configured.
7. Add Achievements page.
8. Add filters:
   - all
   - unlocked
   - locked
   - course
   - pset
   - consistency
   - recovery
   - final project
9. Add badge component.
10. Add tests for every rule.

### Verification

- Locked achievements show criteria.
- Unlocked achievements show date.
- Duplicate unlocks impossible.
- Achievement XP not duplicated.
- Achievement list works offline.

### Adversarial review

Try:

- import progress that should unlock multiple achievements
- corrupt achievement definitions
- unlock before prerequisite
- change system date
- delete progress entry after unlock

### Triple-Zero

Three validation passes.

---

## Module 11 — Dashboard

### Goal

Create the main operational surface.

### Build tasks

1. Build dashboard layout.
2. Show:
   - learner avatar
   - XP and level
   - total course progress
   - current unit
   - next recommended action
   - study time this week
   - active blockers
   - latest achievements
   - quick log controls
3. Add “resume next item.”
4. Add “start focus session.”
5. Add “mark current item started/completed.”
6. Add empty state for new user.
7. Add completed course state.

### Verification

- Dashboard updates after every progress action.
- Next action is correct.
- Active blockers list correct.
- New user state is clear.
- Completed course state does not break recommendations.

### Adversarial review

Try:

- no profile
- no course data
- all tasks blocked
- all course complete
- very small screen
- no achievements yet

### Triple-Zero

Three validation passes.

---

## Module 12 — Insights and Charts

### Goal

Show progress over time without overcomplication.

### Build tasks

1. Add charts:
   - study minutes by day/week
   - XP over time
   - completion by unit
   - confidence trend
   - blocker count
2. Add date range filters:
   - 7 days
   - 30 days
   - all
3. Add accessible chart summaries.
4. Add no-data states.
5. Add tests for chart data transformations.

### Verification

- Charts do not crash with no data.
- Chart data matches raw records.
- Date filters work.
- Text summaries exist.
- Reduced motion respected.

### Adversarial review

Try:

- 1000 sessions
- missing dates
- future dates
- imported backup with old dates
- all zero values

### Triple-Zero

Three validation passes.

---

## Module 13 — Settings, Backup, Import, Reset

### Goal

Give the user control over local data.

### Build tasks

1. Add settings page.
2. Add export JSON backup.
3. Add import JSON backup.
4. Validate backup with Zod before import.
5. Add import preview:
   - profile count
   - course version
   - progress entries
   - sessions
   - achievements
6. Add conflict handling:
   - replace all
   - merge safe records
7. Add full reset with confirmation phrase.
8. Add theme and reduced-motion controls.
9. Add privacy page.
10. Add tests for backup/export/import/reset.

### Verification

- Exported backup imports into clean app.
- Invalid backup rejected.
- Reset clears all data.
- Theme persists.
- Imported data does not duplicate XP or achievements.

### Adversarial review

Try:

- malformed JSON
- huge file
- wrong schema version
- duplicate IDs
- missing profile
- malicious strings in notes
- import over existing data

### Triple-Zero

Three validation passes.

---

## Module 14 — Offline Hardening

### Goal

Guarantee offline-only behavior.

### Build tasks

1. Ensure all assets are local.
2. Remove external fonts/CDNs.
3. Add service worker only if necessary.
4. Add E2E network-blocking test.
5. Add app banner:
   - “Offline local data”
6. Add production CSP.
7. Add test that fails on unexpected external request.
8. Add build inspection step for remote URLs.

### Verification

- App works after network disabled.
- No request to analytics.
- No remote images.
- No remote fonts.
- No external API calls.
- Reload works offline after first load/build preview.

### Adversarial review

Try:

- disconnect network
- block all requests except localhost
- inspect DevTools network
- search built files for `http://` and `https://`
- open app with empty cache after install expectations documented

### Triple-Zero

Three validation passes.

---

## Module 15 — Accessibility and UX Hardening

### Goal

Make the app usable, legible, and not visually sloppy.

### Build tasks

1. Add keyboard navigation pass.
2. Add semantic landmarks.
3. Add aria labels only where needed.
4. Ensure forms have labels.
5. Ensure status changes are announced.
6. Ensure color contrast.
7. Add reduced-motion implementation.
8. Add responsive testing.
9. Add empty/error states.
10. Add final UI copy pass.

### Verification

- No automated accessibility violations in tested flows.
- Keyboard can complete onboarding and log progress.
- 200% zoom works.
- Color is not the only signal.
- Reduced motion disables achievement animation.
- All major flows work on mobile viewport.

### Adversarial review

Try:

- keyboard only
- screen reader approximation
- mobile landscape
- long profile name
- long notes
- color blindness simulation if available

### Triple-Zero

Three validation passes.

---

## Module 16 — Security Review

### Goal

Remove avoidable risk even though the app is offline.

### Build tasks

1. Add SECURITY.md.
2. Add threat model.
3. Confirm no authentication.
4. Confirm no secrets.
5. Confirm no external API keys.
6. Confirm no dangerous HTML rendering.
7. Sanitize or safely render all user content.
8. Add dependency audit.
9. Add static search for:
   - `dangerouslySetInnerHTML`
   - remote URLs
   - eval
   - Function constructor
   - localStorage secrets
10. Add tests for malicious notes input.

### Verification

- User notes render as text, not HTML.
- No secrets in repo.
- No remote calls.
- npm audit passes threshold.
- CSP does not break app.
- Backup import cannot execute scripts.

### Adversarial review

Try:

- `<script>alert(1)</script>` in notes
- SVG payload in avatar config
- malicious backup strings
- console inspection
- dependency audit
- build artifact inspection

### Triple-Zero

Three validation passes.

---

## Module 17 — Final Project Packaging

### Goal

Prepare for CS50 final project submission and external review.

### Build tasks

1. Write README.md.
2. Include:
   - project title
   - description
   - how to run
   - how to test
   - file overview
   - design decisions
   - offline-only explanation
   - data model explanation
   - limitations
   - future work
   - AI/tool use disclosure if applicable
3. Add screenshots.
4. Add demo script.
5. Add final validation log.
6. Add video outline under `docs/demo-script.md`.
7. Confirm project folder size.
8. Confirm no unnecessary files in submission.

### Verification

- README explains every major file/folder.
- New person can run app from README.
- Test commands work.
- Demo script covers core flow.
- Submission folder does not include huge generated artifacts.

### Adversarial review

Ask:

- Would CS50 staff understand what was built?
- Is the project complex enough?
- Is the README honest about limitations?
- Are AI/tool uses cited?
- Can the demo be completed in under 3 minutes?

### Triple-Zero

Three validation passes plus README manual review.

---

## 12. CS50-Aligned Development Path

Do not try to build the full app before the relevant course material exists in your head.

### During Week 0

Create a Scratch prototype of the gamification loop:

- course item
- progress bar
- XP gain
- badge unlock

Do not build production code yet.

### During Weeks 1–5

Use CS50 problem sets as training. Do not let ProgressPal become avoidance behavior.
Maintain only:

- notes
- data model ideas
- UI sketches
- achievement list

### During Week 6

Prototype domain logic in Python:

- XP calculation
- level calculation
- course completion calculation
- next item recommendation

### During Week 7

Design the schema:

- course units
- course items
- progress entries
- XP transactions
- achievements
- sessions

Even if the final app uses IndexedDB, model it relationally first.

### During Week 8

Build the first static frontend:

- dashboard shell
- course map
- item cards
- fake data

### During Week 9

Decide final implementation route:

- keep local-first Vite app
- or build Flask + SQLite version

The local-first Vite route is recommended unless CS50 submission strategy requires Python/SQL visibility.

### Final project period

Implement Modules 00–17 sequentially.

---

## 13. Minimum Viable Product Boundary

MVP must include:

- first-run profile
- CS50 course map
- progress logging
- local persistence
- XP and levels
- achievements
- dashboard
- basic insights
- backup/export/import
- settings
- offline verification
- README
- demo script

MVP must not include:

- login
- cloud sync
- leaderboards
- AI
- CS50 scraping
- mobile app wrapper
- notifications
- custom user-created goal categories
- multi-course tracking

---

## 14. Backwards Compatibility Rules

1. Every persisted object must carry schema assumptions.
2. Increment schema version for breaking changes.
3. Add migration before changing existing data shape.
4. Keep backup fixtures from every completed module.
5. Test import of old fixture after every future module.
6. Never remove fields without migration.
7. Never rename status values without migration.
8. Never change XP history semantics silently.
9. XP ledger is immutable.
10. Derived values should be recalculated, not stored as truth.

Required fixtures:

```text
tests/fixtures/module-03-fresh-backup.json
tests/fixtures/module-07-progress-backup.json
tests/fixtures/module-10-achievements-backup.json
tests/fixtures/module-13-full-backup.json
```

Every module after Module 03 must test:

- old backup imports
- data displays correctly
- no duplicate XP
- no duplicate achievements
- schema version handled

---

## 15. Coding-Agent Prompt Template Per Module

Use this for each module:

```text
You are implementing ProgressPal CS50 Edition.

Read these files first:
- ROADMAP.md
- PROJECT_STATE.md
- VALIDATION_LOG.md
- CHANGELOG.md
- docs/modules/module-XX-plan.md

Implement only Module XX: [module name].

Hard constraints:
- Offline-only.
- No external APIs.
- No social features.
- No cloud sync.
- No analytics.
- No authentication.
- Preserve backwards compatibility.
- Do not modify unrelated modules.
- Add or update tests for every changed behavior.
- Update documentation and state files.
- Run the full validation command.
- Do not mark the module complete unless three consecutive full validation passes succeed.

Required output:
1. Summary of changed files.
2. Tests added.
3. Validation results.
4. Backwards compatibility status.
5. Adversarial review findings.
6. Retrospective.
7. Updated PROJECT_STATE.md.
```

---

## 16. Definition of Done

The project is done when:

- A clean install works.
- The app runs locally.
- First-run onboarding works.
- CS50 course map displays.
- Progress can be logged.
- Study sessions can be logged.
- XP updates correctly.
- Levels update correctly.
- Achievements unlock correctly.
- Dashboard reflects state.
- Charts reflect history.
- Data persists after reload.
- Backup exports.
- Backup imports.
- Reset works.
- App works offline.
- No external calls occur.
- No test failures.
- No lint warnings.
- No type errors.
- No build warnings under project control.
- No accessibility violations in tested flows.
- No high/critical dependency vulnerabilities.
- README is complete.
- Demo script is complete.
- Three consecutive full validation passes are logged.

---

## 17. Deferred Features

These are not part of the verified endpoint:

- Android app
- iOS app
- desktop wrapper
- multiple courses
- custom goal categories
- reminders
- notifications
- CS50 gradebook sync
- edX integration
- social sharing
- leaderboards
- group challenges
- AI tutor
- AI recommendations
- cloud backup

They can be considered only after the offline CS50 MVP is stable.

---

## 18. Final Practical Build Order

Build in this order:

1. Scope lock.
2. Project scaffold.
3. Course seed.
4. Database.
5. Design system.
6. Onboarding.
7. Course map.
8. Progress logging.
9. Study sessions.
10. XP.
11. Achievements.
12. Dashboard.
13. Insights.
14. Backup/import/reset.
15. Offline hardening.
16. Accessibility.
17. Security review.
18. README and demo.

Do not skip validation gates.
Do not add new features while fixing validation failures.
Do not merge a module with known broken behavior.
Do not trust visual success without persistence tests.
Do not trust persistence without import/export tests.
Do not trust tests unless E2E covers the actual user flow.
