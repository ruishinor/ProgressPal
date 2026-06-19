# ProgressPal UX Remediation Roadmap

## Product goal

ProgressPal CS50 Edition should feel like a friendly CS50 companion for an ordinary student — not a technical logbook or audit system. The learner should understand every screen without decoding internal concepts.

The core loop the UI must support:

> Start → watch/work → save session → earn XP → see progress → unlock achievements → know what is next.

The app remains: offline-first, local-only, single-user, CS50-only, no account, no cloud sync, no analytics, no external APIs, no AI tutor, no social mechanics, no CS50 affiliation claim.

---

## Why this roadmap exists

The technical baseline is solid (Modules 01–20). The learner-facing UX still exposes implementation vocabulary that was appropriate during development but is not appropriate for a non-technical 18-year-old student. Terms like "item," "slice," "watched range," "progress record," "evidence," "confidence," "local derived state," "granular asset timeline," and "mutable surface" appear in visible UI copy. The gamification loop (XP, levels, achievements) is implemented but not prominent enough. There is no clear "what did I just save?" moment. Previous notes cannot be reviewed from the lecture page. There is no repair path.

This roadmap defines how to fix those issues without destabilising the solid technical foundation underneath.

---

## Non-negotiable constraints

Stop immediately and request review if any proposed change would:

- Add a package dependency
- Change a Dexie schema, store, or index
- Change service-worker behavior
- Change XP rules or amounts
- Change achievement unlock rules
- Change backup/import/export/reset contracts
- Introduce an external network fetch
- Copy CS50 page content beyond short names, titles, and static official links
- Introduce any official CS50/Harvard affiliation wording
- Re-add or track `.agent`, `.agents`, `.claude`, `_bmad`, `_bmad-output`, `design-artifacts`, or similar support folders
- Weaken or delete tests to make a validation pass
- Leave a warning unresolved without explicit documentation of why

---

## Global language rules

### Forbidden in user-facing UI

| Term                        | Why it is wrong                                         |
| --------------------------- | ------------------------------------------------------- |
| item                        | Generic internal type label; means nothing to a learner |
| progress record             | Audit/database language                                 |
| watched range               | Engineering terminology, not natural language           |
| slice / slice timeline      | Internal data concept                                   |
| Use next slice              | Internal concept, unexplained                           |
| evidence                    | Legal/audit tone; not how students think                |
| confidence                  | Abstract self-assessment score; not obvious             |
| local derived state         | Developer implementation detail                         |
| schema-backed content layer | Developer implementation detail                         |
| asset tracking              | Implementation concept                                  |
| mutable surface             | Developer terminology                                   |
| granular asset timeline     | Developer terminology                                   |
| route                       | URL routing concept                                     |
| ledger                      | Accounting/audit tone (use "history" instead)           |
| audit                       | Compliance language                                     |

### Preferred in user-facing UI

Use these terms based on context:

| Context                 | Preferred language                             |
| ----------------------- | ---------------------------------------------- |
| Lecture content         | lecture, video segments, lecture segments      |
| Problem set content     | problem set, problem set progress              |
| Short clips             | shorts, video                                  |
| Lab work                | lab                                            |
| Saving lecture progress | Save session, Log Lecture                      |
| What was saved          | Session saved, Progress saved                  |
| Timestamps              | Started at, Stopped at                         |
| Watch tracking          | Watched, Resume from, Video progress           |
| Segment quick-fill      | Use next segment                               |
| Confidence (if kept)    | How sure are you? (hidden under More details)  |
| Evidence (submission)   | Where did you submit it?, Submission note      |
| Progress state          | Your progress, Problem Set Progress            |
| Note during session     | Session Notes                                  |
| Note on a page          | My Notes                                       |
| Saved work list         | Saved sessions, Previous notes                 |
| XP/rewards              | +X XP, Level N, achievement name               |
| What to do next         | What's next?, Resume, Continue                 |
| Study sessions page     | Study sessions (no "ledger" eyebrow)           |
| Dashboard header        | Dashboard (no "Local dashboard" eyebrow)       |
| Achievements page       | Achievements (no "Achievement record" eyebrow) |

---

## Validation philosophy

### Modules touching persistence, schema, XP, achievements, or offline behavior

Run three consecutive full clean passes:

```
git status -sb
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm run audit
```

All three passes must be warning-free. If `npm run test:e2e` hangs on teardown (a known environment limitation), use managed-server method and document it explicitly.

### Modules that are copy/content/layout only

Run one full technical pass, then three content/UX review passes:

```
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm run audit
```

Content/UX review pass checklist (run three times):

- No forbidden UI terms in learner-facing strings
- No mojibake in any new copy
- No spelling mistakes in new docs or UI strings
- No overclaims (no affiliation claim, no cloud sync claim, no encryption claim)
- No CS50 page text copied wholesale
- Five-second test: can the learner tell what to do next within five seconds?
- Plain-language test: would an 18-year-old understand this without technical background?

---

## Module sequence

### UX-00 — Adversarial UX audit and baseline lock (documentation only)

**Status:** In progress on branch `ux/00-remediation-roadmap`

Goal: Create a clear baseline of what is wrong before changing anything. No runtime code changes.

Outputs:

- `docs/remediation/ux-remediation-roadmap.md` (this file)
- `docs/remediation/ux-remediation-checklist.md`
- `docs/remediation/plain-language-glossary.md`
- `docs/remediation/ux-audit-findings.md`

Validation: One full technical pass. Three content review passes.

Proposed commit: `Document ProgressPal UX remediation roadmap`

---

### UX-01 — Plain-language terminology cleanup

**Status:** Pending

Goal: Remove the most visible learner-facing technical language. Copy and labels only. No persistence, schema, route, or service-worker changes.

Primary targets:

- `src/features/course/routes/ContentDetailPage.tsx`
- `src/features/course/components/CourseUnitCard.tsx`
- `src/features/course/components/CourseMapSummary.tsx`
- `src/features/sessions/routes/SessionsPage.tsx`
- `src/features/dashboard/routes/DashboardPage.tsx`
- `src/features/insights/routes/InsightsPage.tsx`
- `src/features/achievements/routes/AchievementsPage.tsx`
- `src/components/layout/AppShell.tsx`
- E2E tests asserting old labels
- Unit tests asserting old labels

Key changes:

- `eyebrow="Course item"` → `eyebrow` matching item type (e.g., `"Lecture"`, `"Problem set"`)
- `title="Content detail"` → type-specific title (e.g., `"Lecture"` or `"Problem set"`)
- `title="Progress record"` → `title="Your progress"` (or type-specific variant)
- `title="Item context"` → `title="About this lecture"` or type-specific
- `"Asset tracking"` dt → `"Content type"` or remove
- `title="Slice timeline"` → `title="Video segments"`
- `label="Saved slice progress"` → `label="Video progress"`
- `"Use next slice"` button → `"Use next segment"`
- `label="Start timestamp"` → `label="Started at"`
- `label="End timestamp"` → `label="Stopped at"`
- `label="Logging note"` → `label="Session Notes"`
- `"Watched range preview"` → `"Watched"`
- `"Save watched range"` button → `"Save session"`
- `'Watched range saved'` toast title → `'Session saved'`
- `"The watched range, stop reason, and resume point were saved locally."` → plain description with minutes and XP
- `label="Evidence"` → `label="Where did you submit it?"` or `label="Submission note"`
- `label="Confidence"` → move to "More details" collapse, rename `"How sure are you?"`
- `"What proves this is done?"` placeholder → `"Example: submitted with submit50, or completed in the gradebook."`
- `"Log watched range"` card title → `"Log Lecture"` or `"Log Session"`
- `eyebrow="Study ledger"` → `eyebrow="Study sessions"` or remove eyebrow
- `title="Saved session ledger"` → `title="Your saved sessions"`
- `eyebrow="Local ledger"` in EmptyState → remove or use `eyebrow="Sessions"`
- `"Storage rule"` labels → plain explanations without heading
- `"Derived duration"` → `"Time logged"`
- `label="Item"` in session forms → `label="Lecture or task"` or `label="What were you working on?"`
- `"Choose a course item"` → `"Choose what you were working on"`
- `eyebrow="Local dashboard"` → `eyebrow="Dashboard"` or remove
- `eyebrow="Achievement record"` → remove or `eyebrow="Your achievements"`
- `"Continue next"` card → `"What's next?"`
- `"Open item"` button → `"Start"` or `"Open"`
- `"Resume item"` → `"Resume"`
- `title="Resume long-form"` → `title="Resume lecture"`
- `"No items are marked blocked."` → `"Nothing is blocked right now."`
- `"watched ranges"` in activity description → `"lecture sessions"`
- `"assembling your derived dashboard"` → `"building your dashboard"`
- `"developer speak" page descriptions` → plain summaries

Validation: One full technical pass. Three content/UX review passes. Run forbidden-term search.

Proposed commit: `Replace technical course-detail language`

---

### UX-02 — Rebuild lecture page around the learner's next action

**Status:** Pending

Goal: Make `/course/week-0-lecture` feel like a lecture companion, not a database form.

Desired page order:

1. Header: title, status badges, XP hint, primary action (Resume / Log Lecture)
2. Log Lecture card: summary, resume line, quick segment fill, Started at, Stopped at, Session Notes, Save session
3. Save confirmation: Session saved · N min added · +X XP · achievement unlocks · next step
4. Previous notes: notes from this lecture, newest first
5. Video segments: collapsed by default, summary first
6. Your progress: status selector (Not started / Started / Done / Blocked)
7. About: official link, planned time, hidden behind "More about this lecture" if crowded

New components to extract:

- `LectureDetailPageContent`
- `LectureSessionForm`
- `PreviousSessionNotes`
- `VideoSegmentsSummary`
- `SaveConfirmation`

Key rules:

- Do not change existing data model
- Do not change completion semantics
- Do not mark a lecture complete merely from a session save
- Previous notes appear below form, do not auto-fill into new note field

Validation: Three full clean passes (touches save flow and XP-facing behavior).

Proposed commit: `Make lecture logging learner-first`

---

### UX-03 — Rebuild problem set pages around work, notes, and submission

**Status:** Pending

Goal: Make problem set pages feel like a coding/work companion.

Desired page order:

1. Header: title, progress badge, XP/level/achievement hint, official CS50 link
2. Problem Set Progress card: status selector, Notes adjacent to status, Save progress
3. Submission card: appears only when status is Submitted or Accepted; label "Where did you submit it?"
4. Save confirmation: Progress saved · +X XP · achievement unlocks · What's next?
5. Previous notes: previous saves for this problem set
6. More details: planned time, type, local-only note

Validation: Three full clean passes.

Proposed commit: `Make problem set progress learner-first`

---

### UX-04 — Strengthen the gamified progress loop

**Status:** Pending

Goal: Make XP, levels, achievements, and next-step visible as driving forces throughout the app.

Target surfaces: App shell, Dashboard, Course Map, Lecture page, Problem set page, Achievements page, save confirmations.

Key changes:

- App shell: show level and XP progress more prominently; show next XP target
- Dashboard first card: answer "What's next?"
- Save confirmations everywhere: what was saved, XP earned, achievements unlocked, next suggested action
- Achievements: group by learner motivation; locked achievements state what to do next plainly

Rules:

- No passive XP
- No shame/guilt/streak-pressure language
- No "failure" framing for optional content

Validation: One full technical pass + three UX review passes (display/copy only). Three full clean passes if reward logic changes.

Proposed commit: `Strengthen XP and achievement feedback`

---

### UX-05 — Add visible save history and repair path

**Status:** Pending

Goal: Give the learner confidence that saved actions can be reviewed and corrected.

Minimum viable repair path:

1. "Recently saved" panel after each save
2. Allow editing current progress notes (progress_entries represents current state)
3. For sessions: add "Add correction note" OR explicit edit flow — choose one deliberately
4. For lecture watch saves: show saved sessions; if edit/delete deferred, show "Need to fix this? Add a correction note."

Architecture rules:

- Do not break local data integrity
- XP cannot be double-awarded through edit/repair
- Achievements cannot be duplicated through edit/repair
- Backup/export must include repair data if a new store is added

Validation: Three full clean passes (touches saved data and XP/achievement side effects).

Proposed commit: `Add saved-work review and repair path`

---

### UX-06 — Improve onboarding and evaluator first-run path

**Status:** In progress

Goal: Let a new user or evaluator reach the product in one click.

Changes:

- Headline: "Start tracking CS50 locally"
- Primary action: "Use default learner"
- Secondary: "Customize first"
- Explanation: "Everything stays in this browser. You can export or reset it later."
- Optional demo path: "Just show me the app"

Validation: One full technical pass + three UX review passes.

Proposed commit: `Simplify first-run onboarding`

---

### UX-07 — Add local CS50 guide content

**Status:** In progress — representative first pass (Week 0 and Week 1 only)

Goal: Add plain-language week summaries, "what to do," "done looks like," checklists, and reflection prompts to make the app feel like a CS50 companion.

Content rules:

- No copied CS50 page text
- No solutions
- No affiliation claim
- Locally authored summaries only
- Official CS50 links continue to use existing `cs50Links` handling
- App remains useful offline after first load

Data approach (as built):

- Static, import-only module: `src/features/course/guideContent.ts`
  (not under `src/seed/`; no JSON data file, parser, schema, or persistence).
- Read-only `UnitGuide` / `ItemGuide` data keyed to existing stable unit/item
  IDs, with `getUnitGuide(unitId)` / `getItemGuide(itemId)` accessors that
  return `null` for unknown or not-yet-authored IDs.
- This pass covers Week 0 and Week 1 only (their unit, lecture, and
  problem-set entries). Later weeks/items are intentionally absent and resolve
  to `null` gracefully; the guide-content architecture is ready to expand.
- No learner progress mutation from guide-content rendering.

Final commits: `f934ef5 Add local CS50 guide content foundation`, `86c055e Stabilize XP milestone E2E flow`, `9f8eca3 Stabilize achievement confirmation test`

- Status: Complete.
- Implementation: f934ef5 introduced the local guide foundation. 86c055e and 9f8eca3 stabilized the XP and achievement confirmation flows exposed during validation.
- Validation: npm run test passed 261/261; Playwright passed 24/24 with workers=2. npm audit remains blocked by the documented pre-existing undici/jsdom issue.
- Final module head: 9f8eca3.

---

### UX-08 — Visual hierarchy and interaction polish

**Status:** Pending

Goal: Make the app visually guide the student through primary actions.

Key changes:

- Define card roles: primary action / progress-reward / notes / details / history / optional-collapsed
- Primary card has clearer heading and action area
- Secondary cards are quieter
- Optional details are collapsed
- Reward feedback has distinct success treatment
- Mobile: lecture page usable at phone width; primary action before diagnostic content

Accessibility rules:

- Contrast safe in dark theme
- Keyboard focus visible
- Reduced motion respected
- No color-only meaning

Validation: One full technical pass + Playwright screenshots + axe checks.

Proposed commit: `Improve learner-facing visual hierarchy`

---

### UX-09 — Final acceptance and release-readiness review

**Status:** Pending

Goal: Confirm the full remediation is complete and the app matches the CS50 companion standard.

Full acceptance test:

- Non-technical 18-year-old can enter, navigate, save, earn XP, understand level, view achievements, write notes, find previous notes, correct a mistake, find problem set progress, open official links, export/reset data, use offline, understand data is local.

Final validation: Three full clean passes. Manual UX review across all routes. Update README, DEMO.md, PROJECT_STATE.md, CHANGELOG.md, VALIDATION_LOG.md, MODULE_CHECKLIST.md.

Proposed commit: `Finalize CS50 companion UX remediation`

---

## Implementation order rationale

1. UX-00 first — establish the baseline before touching code.
2. UX-01 second — stop the most visible technical language from appearing before deeper page rebuilds.
3. UX-02 and UX-03 — fix the two main learning flows while the copy is already clean.
4. UX-04 — amplify rewards after the pages are readable.
5. UX-05 — add repair/history after save flow is reliable.
6. UX-06 — simplify onboarding after the destination (the app) is ready to receive a new user.
7. UX-07 — add guide content only after the interface that will present it is correct.
8. UX-08 — polish visuals once all content and behavior is in place.
9. UX-09 — validate the whole.

Do not skip ahead to UX-07 content before UX-01–UX-03 are complete. Content placed into the wrong interface is wasted effort.

---

## Stop conditions (any module)

Stop immediately and request human review if:

- A package dependency would be added
- A Dexie schema/store/index change is required
- The service worker would be modified
- XP rules would change
- Achievement rules would change
- The backup/import/reset contract would change
- An external network fetch would be introduced
- CS50 content would be copied beyond short names/titles
- Official affiliation wording would be introduced
- Support folders (`.agent`, `.agents`, `.claude`, `_bmad`, etc.) would be tracked
- A test would be weakened or deleted to make a pass succeed
- A warning would be ignored without documentation
- User-facing "item," "slice," "watched range," "evidence," or "confidence" remain in a primary learner flow after the module that was supposed to remove them
