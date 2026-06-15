Do not use this document as one single prompt input.

That will probably produce something plausible-looking, but incomplete, brittle, and under-tested. The prompt is strong enough as a master project instruction, but the implementation should be driven module by module.

# ProgressPal CS50 Edition - (ASSUMED) WORKFLOW

You are an autonomous systems architect, senior frontend engineer, local-first application engineer, QA engineer, adversarial reviewer, and implementation lead.

You will build ProgressPal CS50 Edition: an offline-only, single-user, gamified learning-progress tracker for one learner progressing through CS50. This is not the old broad ProgressPal concept. Do not build a fitness tracker, thesis tracker, social app, leaderboard, cloud app, AI coach, or external integration product. Build a local-first CS50 progression companion.

Core product definition:
ProgressPal CS50 Edition helps one learner move through CS50 in manageable chunks. It tracks lectures, sections, shorts, readings, problem sets, practice sessions, blockers, confidence, XP, levels, achievements, and recovery-aware streaks. It must especially handle long-form course material correctly: a two-hour lecture is not one checkbox. It is divided into smaller watchable slices, like cutting a cake. The learner may watch 20 minutes, reach their limit, stop cleanly, save the resume point, receive partial credit, and return later.

Primary user persona:
One adult learner taking CS50 while building consistency and technical competence. The learner may have limited focus capacity on a given day. The app must reward honest progress, not unrealistic binge completion. Stopping after a valid effort must be treated as a proper state, not failure.

Hard exclusions:

- No accounts.
- No login.
- No cloud sync.
- No social features.
- No leaderboard.
- No comments, likes, groups, challenges, community goals, or feeds.
- No Google Docs sync.
- No Google Fit, Strava, Garmin, or fitness sync.
- No AI recommendations.
- No external model APIs.
- No CS50 scraping.
- No telemetry or analytics.
- No backend unless strictly required; assume no backend.
- No mobile-native Android implementation for MVP unless explicitly needed later.

Recommended implementation target:
Build a local-first browser app using Vite, React, TypeScript, IndexedDB through Dexie, Vitest, Testing Library, Playwright, ESLint, Prettier, and optional PWA service worker. Use only local browser storage for user data. Production should be deployable as static files. The app must still work when the network is disconnected after initial load.

If this repository already exists, inspect it first. If it does not exist, create it from scratch. Before writing code, create a persistent project-state system so work can resume after interruption.

Create these root files immediately:

- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- SECURITY.md
- DECISIONS.md
- TEST_PLAN.md

Maintain these files throughout the project. Update them after every module. Do not rely on memory.

Execution rule:
Operate under a plan-then-implement framework. For every module:

1. State the module objective in MODULE_CHECKLIST.md.
2. List exact files expected to change.
3. Implement the smallest complete version.
4. Write or update tests.
5. Run validation.
6. Perform adversarial review.
7. Perform retrospective.
8. Fix issues.
9. Repeat validation until Triple-Zero is reached.
10. Update PROJECT_STATE.md and CHANGELOG.md.
11. Proceed to the next module without asking for approval.

Triple-Zero rule:
A module is not complete until the full validation suite passes three consecutive times from a clean working tree with zero errors, zero warnings, and zero ignored failures.

Each pass must include, where applicable:

- npm run lint
- npm run format:check
- npm run typecheck
- npm run build
- npm run test
- npm run test:e2e
- npm audit --audit-level=moderate
- accessibility checks for changed screens
- manual UI smoke test notes in VALIDATION_LOG.md

If any command emits warnings, the pass fails. Fix the cause. Do not suppress warnings unless the suppression is documented in SECURITY.md and DECISIONS.md with a clear reason.

Backwards compatibility rule:
After every persistence or schema change, old local data must still load or migrate safely. Write migration tests. Never delete user progress silently. Never overwrite user progress during seed updates. Never change XP history destructively.

Data integrity rule:
User progress is event-sourced where practical. Do not store only totals when the underlying events matter. XP must be ledger-based and idempotent. Re-running achievement evaluation must not duplicate XP. Watching the same video interval twice must not create duplicate progress credit unless explicitly logged as review, and review XP must be separately capped.

Product scope:
The MVP must include:

- First-run onboarding.
- One local learner profile.
- Simple avatar builder with limited local options.
- CS50 course map.
- Weekly structure.
- Content asset tracking.
- Long-form video slicing.
- Resume point tracking.
- Study session logging.
- Notes and blockers.
- Confidence rating.
- XP ledger.
- Levels.
- Achievements.
- Recovery-aware streaks.
- Dashboard.
- Course map view.
- Content detail view.
- Focus/session logging view.
- Achievements view.
- Insights view.
- Settings view.
- Export backup.
- Import backup.
- Reset local data with confirmation.
- Offline support.

CS50 structure to seed locally:
Create a seed file for CS50x progression with this high-level sequence:

- Week 0: Scratch
- Week 1: C
- Week 2: Arrays
- Week 3: Algorithms
- Week 4: Memory
- Week 5: Data Structures
- Week 6: Python
- Week 7: SQL
- Artificial Intelligence
- Week 8: HTML, CSS, JavaScript
- Week 9: Flask
- Week 10: The End
- Final Project

For each week, support these content categories even if some start with placeholder data:

- lecture
- section
- shorts
- readings/notes
- problem set
- optional practice
- reflection

Do not scrape CS50. Use local seed data that the user can edit later. Store optional URL fields but do not depend on them. Store estimated durations when known and allow manual editing.

Critical feature: long-form video and reading progression.
A lecture, section, or long reading must be represented as a content asset with total duration or total units. It must be divisible into slices.

Implement this model:

- contentAsset.id
- contentAsset.weekId
- contentAsset.type: lecture | section | short | reading | problem_set | practice | final_project
- contentAsset.title
- contentAsset.description
- contentAsset.estimatedDurationSeconds
- contentAsset.defaultSliceSeconds
- contentAsset.userSliceSeconds
- contentAsset.status: not_started | in_progress | complete | paused | needs_review
- contentAsset.createdAt
- contentAsset.updatedAt

For video/audio-style assets, implement:

- mediaProgressEvent.id
- mediaProgressEvent.assetId
- mediaProgressEvent.startedAt
- mediaProgressEvent.endedAt
- mediaProgressEvent.startSecond
- mediaProgressEvent.endSecond
- mediaProgressEvent.durationSeconds
- mediaProgressEvent.stopReason: completed_slice | reached_limit | interrupted | confused | taking_notes | fatigue | manual_stop | completed_asset
- mediaProgressEvent.energyBefore: 1-5 optional
- mediaProgressEvent.energyAfter: 1-5 optional
- mediaProgressEvent.confidenceAfter: 1-5 optional
- mediaProgressEvent.note optional

Implement interval union logic:

- If the user watches 0:00 to 20:00, watched duration is 20 minutes.
- If the user later logs 10:00 to 30:00, total watched duration is 30 minutes, not 40.
- If the user logs the same interval again as review, it must be recorded as review time but not duplicate first-pass completion.
- Completion percentage = unique first-pass watched seconds / total asset seconds.
- Resume point = highest contiguous watched second from the start, unless user manually overrides.

Implement slice logic:

- Default slice size: 20 minutes.
- User may choose 10, 15, 20, 25, or 30 minutes.
- For a 120-minute lecture and 20-minute slices, show six slices.
- Slices must show: not started, in progress, complete, reviewed.
- The user can log a slice manually without embedding video playback.
- The app should not need to play the video. It tracks progress against the video.

Example required behavior:
User opens Week 0 Lecture, total 120 minutes. User logs 0:00 to 20:00. App records 20 minutes watched, progress 16.7%, resume point 20:00, status in_progress. If stop reason is reached_limit, app displays this as a valid clean stop. It awards partial XP. It does not mark lecture complete.

XP rules:
Use an XP ledger. Never mutate total XP directly except through computed ledger sum.

Initial XP rules:

- +4 XP for each 10 focused minutes logged, capped by first-pass unique progress for that asset.
- +10 XP for completing a full content slice.
- +5 XP for a clean stop after at least 15 minutes with stopReason = reached_limit or completed_slice.
- +15 XP for adding a useful note or blocker on a content asset, capped at once per asset per day.
- +25 XP for completing all required assets in a week except problem set.
- +50 XP for completing a problem set status as submitted.
- +100 XP for marking a week fully complete.
- +150 XP for final project proposal drafted.
- +300 XP for final project completed.

Anti-gaming constraints:

- Do not grant duplicate XP for overlapping watched intervals.
- Do not grant repeated clean-stop XP more than once per asset per day.
- Do not grant infinite note XP.
- XP ledger entries must include source type and source ID.
- XP recalculation must be deterministic.

Level rules:
Start with simple thresholds:

- Level 1: 0 XP
- Level 2: 100 XP
- Level 3: 250 XP
- Level 4: 450 XP
- Level 5: 700 XP
- Level 6: 1000 XP
- Level 7: 1400 XP
- Level 8: 1900 XP
- Level 9: 2500 XP
- Level 10: 3200 XP
  Make thresholds configurable in a constants file. Show current level, total XP, XP toward next level, and progress bar.

Achievement rules:
Implement achievements as deterministic rules evaluated from local data. Achievements must be unlocked once and stored. Re-evaluation must not duplicate unlocks.

Required achievements:

- First Slice: complete one video slice.
- Clean Stop: stop after 15+ minutes because limit was reached.
- Week 0 Started: log any Week 0 progress.
- First Problem Set Started: mark any pset as started.
- First Problem Set Submitted: mark any pset as submitted.
- Three Study Days: log progress on three separate days.
- Seven Study Days: log progress on seven separate days.
- Note Taker: add five notes across assets.
- Blocker Named: add first blocker.
- Blocker Resolved: mark first blocker resolved.
- Lecture Completed: complete any lecture.
- Week Completed: complete any week.
- Halfway Through CS50: complete at least 50% of required course assets.
- Final Project Started.
- Final Project Completed.

Recovery-aware streak rules:
Avoid punishment-oriented streaks. A streak should mean recurring engagement, not daily perfection.
Implement:

- Active study days count.
- Current weekly consistency: number of study days this week.
- Gentle streak: weeks with at least two study days.
- Recovery day: user explicitly records no study due to fatigue/life/admin. Recovery day preserves weekly rhythm but does not award full study XP.
- No shame language. No “you failed.” No “streak broken” as primary message.

Required data models:

- UserProfile
- AvatarConfig
- Course
- CourseWeek
- ContentAsset
- ContentSlice computed or stored safely
- MediaProgressEvent
- StudySession
- Note
- Blocker
- XpLedgerEntry
- AchievementDefinition
- UserAchievement
- AppSettings
- BackupMetadata
- SchemaMigration

Persistence:
Use IndexedDB with Dexie. Create versioned schema. Write migration tests. Provide export/import as JSON. Backups must include schemaVersion and createdAt. Imports must validate shape before applying. Invalid imports must fail safely with a user-readable error.

UI principles:
The app should feel motivating, modern, and lightly gamified, but not generic AI-gradient slop. Do not build a neon SaaS landing page. Do not use fake social proof. Do not overuse glassmorphism. Use a clean, focused study-interface style with a restrained sense of progression.

Visual direction:

- Calm dark/light theme support if feasible; otherwise one accessible theme.
- Clear progress bars.
- Slice timeline for lectures.
- Badges that are readable at small sizes.
- High contrast.
- Large enough touch targets.
- No tiny low-contrast gray text.
- No excessive animations.
- Use motion only for completion feedback and keep reduced-motion support.
- Make partial progress visually satisfying.

Required screens:

1. Onboarding
   Purpose: create local profile, choose avatar, choose default slice length, confirm offline-only mode.
   Must show: “Your data stays on this device unless you export it.”

2. Dashboard
   Purpose: show current course state and next useful action.
   Must show:

- Current week.
- Overall CS50 progress.
- Current level and XP.
- Next recommended slice.
- Resume point for current lecture.
- Weekly consistency.
- Recent achievements.
- Quick log button.

3. Course Map
   Purpose: browse CS50 weeks.
   Must show:

- Week list/cards.
- Completion status.
- Required assets.
- Progress percentage.
- Problem set status.

4. Content Detail
   Purpose: track one lecture/section/short/reading/problem set.
   For long-form assets, must show:

- Duration.
- Slice controls.
- Timeline.
- Watched intervals.
- Resume point.
- Log progress form.
- Stop reason.
- Notes.
- Blockers.
- Confidence.

5. Study Session / Focus Log
   Purpose: log a work session not tied only to video.
   Must support:

- asset selection
- start/end or duration
- session type: watching | coding | reading | debugging | note-taking | review
- confidence before/after
- blocker creation
- clean stop

6. Achievements
   Purpose: show unlocked and locked achievements.
   Must support:

- unlocked list
- locked list
- progress toward locked achievements where reasonable
- no fake social sharing

7. Insights
   Purpose: show local progress patterns.
   Must show:

- study time by week
- assets completed
- slices completed
- problem set statuses
- blocker count and resolved blocker count
- confidence trend if enough data exists

8. Settings
   Purpose: local control.
   Must include:

- edit profile
- edit default slice length
- export backup
- import backup
- reset all data with typed confirmation
- data/storage explanation
- app version/schema version

Routing:
Use client-side routing if needed. Keep routes simple:

- /
- /dashboard
- /course
- /week/:weekId
- /asset/:assetId
- /session/new
- /achievements
- /insights
- /settings

Implementation modules:

Module 00: Repository inspection and state setup

- Inspect existing files.
- Create project-state files.
- Record current state.
- If no app exists, prepare to scaffold.
  Validation: project-state files exist and are coherent.

Module 01: Scaffold

- Create Vite React TypeScript app if needed.
- Add scripts: dev, build, preview, lint, format, format:check, typecheck, test, test:e2e.
- Add ESLint and Prettier.
- Add Vitest and Testing Library.
- Add Playwright.
  Validation: all scripts run cleanly.

Module 02: Architecture and folders
Use this structure:

- src/app
- src/components
- src/features/course
- src/features/progress
- src/features/xp
- src/features/achievements
- src/features/profile
- src/features/settings
- src/features/insights
- src/lib/db
- src/lib/time
- src/lib/validation
- src/lib/testing
- src/styles
- src/seed
- tests
- e2e
  Validation: imports work, no circular dependency warnings.

Module 03: Domain types

- Define TypeScript types for all required models.
- Add runtime validation helpers where imports/backups are parsed.
- Add constants for CS50 weeks, XP, levels, slice lengths.
  Validation: typecheck clean; unit tests for constants and type guards.

Module 04: Local database

- Implement Dexie database.
- Version schema.
- Add migrations.
- Add repository functions.
  Validation: unit tests for create/read/update/delete, migrations, backup-safe data shape.

Module 05: CS50 seed data

- Create seed course data.
- Seed only missing data.
- Never overwrite user-modified data.
- Allow future seed versioning.
  Validation: seeding twice is idempotent; user edits survive reseed.

Module 06: Design system

- Implement base layout, buttons, cards, progress bars, badges, forms, empty states, modal/dialog, toast/notification.
- Implement accessible focus states.
- Implement reduced-motion handling.
  Validation: component tests and visual smoke checks.

Module 07: Onboarding and profile

- Local profile creation.
- Avatar builder with simple local options.
- Default slice length choice.
- Offline-only explanation.
  Validation: Playwright first-run flow creates profile and reaches dashboard.

Module 08: Course map

- Week list.
- Asset list.
- Completion calculations.
- Status indicators.
  Validation: seeded weeks render; progress updates after asset changes.

Module 09: Long-form progression engine

- Implement interval union.
- Implement slice calculation.
- Implement resume point calculation.
- Implement media progress logging.
- Implement clean stop state.
  Validation: heavy unit coverage for overlapping intervals, partial slices, full completion, resume points, review intervals.

Module 10: Content detail screen

- Show asset data.
- Show video slice timeline.
- Log progress form.
- Stop reason.
- Notes and blockers.
  Validation: Playwright logs 20 minutes of Week 0 lecture and shows 16.7% progress for a 120-minute lecture.

Module 11: Study session logging

- General session log.
- Coding/debugging/reading/watching/review types.
- Confidence before/after.
- Optional note/blocker creation.
  Validation: sessions persist and appear in dashboard/insights.

Module 12: XP engine

- Implement XP ledger.
- Award XP from events.
- Prevent duplicates.
- Calculate level.
  Validation: duplicate event evaluation does not duplicate XP; overlapping intervals do not over-award.

Module 13: Achievement engine

- Define achievements.
- Evaluate from local data.
- Unlock once.
- Show progress where possible.
  Validation: repeated evaluation stable; no duplicate unlocks.

Module 14: Dashboard

- Current week.
- Overall progress.
- XP/level.
- Next slice.
- Resume point.
- Weekly consistency.
- Recent achievements.
  Validation: Playwright confirms dashboard updates after logging progress.

Module 15: Insights

- Charts or simple visual summaries.
- Study time by week.
- Slice completion.
- Problem-set statuses.
- Blocker resolution.
  Validation: no chart crashes with empty, partial, or full data.

Module 16: Settings, backup, import, reset

- Export JSON.
- Import JSON with validation.
- Reset with typed confirmation.
  Validation: backup round trip restores data; invalid import fails safely; reset clears local data only after confirmation.

Module 17: Offline hardening

- Add PWA/service worker if feasible.
- Ensure app works after initial load offline.
- Ensure no runtime calls to external services.
  Validation: Playwright offline mode renders dashboard and allows local progress logging.

Module 18: Accessibility and UX hardening

- Keyboard navigation.
- Focus management.
- Accessible forms.
- Color contrast.
- Reduced motion.
- Plain-language copy.
  Validation: accessibility check has zero serious/critical issues; manual keyboard smoke test documented.

Module 19: Security and privacy review

- No secrets.
- No tracking.
- No external requests except user-clicked course links if any.
- Backup import validation.
- XSS-safe rendering of notes.
- Dependency audit.
  Validation: npm audit clean at moderate level; notes render escaped; no dangerous HTML injection.

Module 20: Final CS50 project packaging

- Add README.
- Add screenshots if possible.
- Add feature list.
- Add technical explanation.
- Add how to run locally.
- Add limitations.
- Add future work.
- Add final validation log.
  Validation: fresh clone/install/build/test succeeds.

Adversarial review template for every module:
Add this to VALIDATION_LOG.md:

- What could break?
- What user data could be lost?
- What edge case would make this lie about progress?
- What could duplicate XP?
- What could block offline use?
- What could confuse a tired learner?
- What accessibility issue might exist?
- What security issue might exist?
- What did I test?
- What did I not test?
- What did I fix?

Retrospective template for every module:
Add this to VALIDATION_LOG.md:

- What was intended?
- What was actually built?
- What changed from the plan?
- Why did it change?
- What debt remains?
- What must be watched in later modules?
- Is backwards compatibility preserved?
- Is Triple-Zero achieved?

Required acceptance test scenario:
Create an E2E test for this exact flow:

1. Fresh user opens app.
2. Creates profile.
3. Chooses 20-minute default slice.
4. Opens CS50 Week 0 Lecture.
5. Confirms lecture duration is 120 minutes or sets it to 120 minutes.
6. Logs watched interval 0:00 to 20:00.
7. Selects stop reason: reached limit.
8. Adds note: “Reached my limit after 20 minutes.”
9. Saves.
10. App shows progress as 20 / 120 minutes and approximately 16.7%.
11. App shows resume point 20:00.
12. App does not mark lecture complete.
13. App awards partial XP.
14. App unlocks First Slice if criteria are met.
15. Dashboard recommends continuing from 20:00.
16. App still shows the same data after reload.
17. App still works in offline mode.

Definition of done for MVP:
The MVP is done only when:

- All modules 00-20 are complete.
- Triple-Zero is achieved for final full-suite validation.
- Fresh install works.
- Offline mode works.
- Backup/export/import works.
- Week 0 20-minute partial lecture scenario works exactly.
- XP does not duplicate.
- Achievements do not duplicate.
- Seed data does not overwrite user progress.
- README explains how to run and test.
- PROJECT_STATE.md says “MVP VERIFIED”.

Do not ask for approval between modules. Make reasonable local-first engineering decisions. If ambiguity exists, choose the simpler, safer, offline-compatible option and document it in DECISIONS.md. If a requested feature conflicts with offline-only, privacy, or data integrity, do not implement it; document the exclusion.

---

Update:
Use this first command to Codex:
Read PROJECT_BRIEF.md fully.

Begin with Module 00 only.

Create or update:

- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- SECURITY.md
- DECISIONS.md
- TEST_PLAN.md

Do not scaffold the app yet unless Module 00 explicitly requires it.
Do not proceed to Module 01.
After completing Module 00, print:

1. files created or changed
2. current repo state
3. risks found
4. exact next command I should give you

---

Then:
Proceed with Module 01 only.

Follow PROJECT_BRIEF.md exactly.
Run the required validation commands.
If a command cannot run because the project is not yet scaffolded, explain why and create the missing script/configuration.
Do not proceed to Module 02.
Update all project-state files.

---

Once the scaffold is stable, switch to:
Proceed with the next incomplete module in MODULE_CHECKLIST.md.

Before coding, restate:

- module objective
- files expected to change
- tests expected
- validation commands

After coding, run validation.
Fix all errors and warnings.
Update PROJECT_STATE.md, VALIDATION_LOG.md, CHANGELOG.md, DECISIONS.md, and SECURITY.md if relevant.
Stop after this module.
