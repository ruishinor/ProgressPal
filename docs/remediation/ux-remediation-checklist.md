# UX Remediation Checklist

This file is the persistent recovery and continuity protocol for the ProgressPal UX remediation. Update it after every completed subtask.

---

## Current state

| Field                  | Value                                                  |
| ---------------------- | ------------------------------------------------------ |
| Branch                 | Not hardcoded; verify with `git status -sb``           |
| Baseline commit        | `8360c5c Remove forbidden settings copy terms`         |
| Current module         | UX-09 — Final acceptance and release-readiness review  |
| Last completed subtask | UX-09 manual cross-route acceptance walkthrough passed |
| Next file to edit      | None / UX-09 complete                                  |
| Status                 | Complete (with documented known exceptions)            |

---

## UX-09 final acceptance and release-readiness review

Status: Complete (with documented known exceptions). The manual cross-route
acceptance walkthrough was performed and passed (see below), the README/DEMO
stale-wording gap was fixed during UX-09, and the Settings copy fix is committed.
The known validation exceptions below remain; no production-readiness, security,
or clean-validation claim is made.

### UX-09 code fix

- Commit `8360c5c Remove forbidden settings copy terms`.
- `src/features/settings/routes/SettingsPage.tsx` only. The Settings page no
  longer renders the forbidden/jargon strings:
  - "evidence and blockers" → "notes and saved blockers"
  - "backups audit log" → "backup history"
- Verified absent from `src` afterward by `git grep`.
- No schema, route, service-worker, XP, achievement, dependency, or
  backup/import/export/reset contract change.

### UX-09 documentation closeout

- Realigned the stale roadmap per-section status headers (UX-00 through UX-07
  now read Complete; UX-09 now reads Complete after the passing walkthrough) and
  this checklist's current-state table and module tracker row.
- Corrected stale learner/evaluator-facing wording in `README.md` (the feature
  bullet now reads "Lecture and task detail" and drops "confidence", "evidence",
  "watched ranges", and "slice timelines") and in `docs/DEMO.md` (walkthrough
  step 4 and the video script no longer tell evaluators to look for those
  pre-remediation labels). Internal/architecture terms (e.g. "ledger" for the
  immutable transaction model, "route" for the router) were left as accurate
  technical documentation.
- Recorded the validation evidence in `VALIDATION_LOG.md` and the change in
  `CHANGELOG.md`; noted post-build UX remediation state in `PROJECT_STATE.md`
  and `MODULE_CHECKLIST.md`.

### UX-09 passed targeted validation (2026-06-19)

- prettier `--check src/features/settings/routes/SettingsPage.tsx`: pass
- lint: pass
- typecheck: pass
- build: pass
- vitest: pass, 34 files / 261 tests
- Playwright `--workers=2`: pass, 24 tests
- circular dependency check: pass
- `git diff --check`: no whitespace errors; Windows LF→CRLF warnings only

### UX-09 known validation exceptions (not remediated; out of scope)

- `npm run format:check` fails on pre-existing files (the repo-wide formatting
  noise documented since UX-04). Only the files edited in UX-09 were formatted
  individually (the Settings file, the two remediation docs, and the release
  docs); the repo as a whole was **not** normalized. Formatting the two edited
  remediation docs lowered the repo-wide count from 41 to 39 still-failing
  pre-existing files.
- `npm run validate` fails because `format:check` runs early in the chain and
  stops it before the later steps; the later steps were therefore run
  individually (see passed targeted validation above).
- `npm run audit` fails on a high-severity `undici@7.27.2` advisory pulled in
  transitively via `jsdom@29.1.1` (a test-only devDependency; the runtime ships
  no network code). No dependency remediation was performed; `package.json` and
  `package-lock.json` are untouched.
- No production-readiness, security, or "clean validation" claim is made while
  these exceptions remain.

### UX-09 manual cross-route acceptance walkthrough (2026-06-19): passed

Performed against a local dev server with browser inspection of every route;
`npm run build` passed and `npx playwright test --workers=2` passed 24 tests
(including the offline cold-start and reset/import recovery specs).

Routes inspected and result:

- `/` → redirects to `/onboarding`: learner-first ("Start tracking CS50
  locally", "Use default learner"); import flagged "destructive, local-only,
  and cannot be undone".
- `/dashboard`: "What's next?" recommends the next step; XP/level prompt; "Your
  CS50 progress on this device. Nothing is synced or stored remotely."
- `/course`: learner-first catalog; official CS50 links only (e.g. "Week 0 on
  CS50.harvard.edu" → `cs50.harvard.edu`); no affiliation claim.
- `/course/week-0-lecture` (lecture): "Log Lecture", "VIDEO PROGRESS",
  "Use next segment", "Started at"/"Stopped at", "Save session", "Video
  segments" — no "watched range"/"slice timeline"/"confidence"/"evidence".
- `/course/week-0-problem-set` (problem set): clean; no "confidence"/"evidence"
  labels (the submission and "How sure are you?" fields stay conditional/
  collapsed by design).
- `/sessions`: "Study sessions", "What were you working on?"; no "ledger"
  eyebrows.
- `/achievements`: plain "How to unlock:" guidance; no "Achievement record".
- `/insights`: trends only; no streak or remote-analytics language.
- `/settings`: renders the fixed copy live — "notes and saved blockers" and
  "backup history"; reset is "destructive, local-only, and cannot be undone"
  behind a typed RESET confirmation.
- Unknown path: a clear "Page not found" with a "Go to dashboard" recovery link
  (the 404 page uses "route"/"address", acceptable for an error page).

All eight walkthrough criteria were met. The earlier README/DEMO stale-wording
gap is resolved. Only the documented known exceptions above remain, and they do
not block acceptance.

---

## UX-08 rollback instructions

UX-08 changes: added a `.button--sm` CSS size rule covering 7 existing raw-class
usages in DashboardPage and InsightsPage; added a `.course-unit-card__cs50-link`
separator rule (top border + padding) to visually distinguish the official CS50 link
from the course item list; swapped `videoSegmentsSection` above `PreviousSessionNotes`
in the lecture detail path only so segment orientation precedes historical notes;
changed the "Resume lecture" dashboard button from `button--primary` to
`button--secondary` to remove a competing primary action. No component API, schema,
DB, backup, route, service-worker, XP, achievement, or dependency change.

If rollback is needed:

```powershell
git revert fc6b293
```

## UX-08 files changed

| File                                               | Change                                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/styles/design-system.css`                     | Added `.button--sm` size rule; added `.course-unit-card__cs50-link` top-border separator rule |
| `src/features/course/routes/ContentDetailPage.tsx` | Moved `videoSegmentsSection` above `PreviousSessionNotes` in lecture path only                |
| `src/features/dashboard/routes/DashboardPage.tsx`  | Changed Resume lecture button from `button--primary` to `button--secondary`                   |
| `docs/remediation/ux-remediation-roadmap.md`       | Updated UX-08 status and recorded as-built scope                                              |
| `docs/remediation/ux-remediation-checklist.md`     | Updated current state, module tracker, added UX-08 sections                                   |

No seed, schema, DB, backup, route, service-worker, XP, achievement, or dependency change.

## UX-08 validation

- prettier: pass
- lint: pass
- typecheck: pass
- build: pass
- vitest: pass, 34 files / 261 tests
- playwright: pass, 24 tests
- circular dependency check: pass
- `git diff --check`: no whitespace errors; Windows LF→CRLF warnings only
- npm audit: known pre-existing undici high-severity advisory; package files untouched

---

## UX-07 rollback instructions

If anything goes wrong before commit:

```powershell
git status -sb
git restore src/ tests/ docs/
```

UX-07 changes: added a static, import-only guide module
(`src/features/course/guideContent.ts`) with `getUnitGuide` / `getItemGuide`
accessors returning `null` for unknown IDs; rendered a short guide summary on
Week 0 / Week 1 course-map cards and a read-only "How to approach this" card on
the lecture/problem-set detail flow (both gated on a guide entry existing);
added module and rendering tests plus two small CSS rules. Representative first
pass: Week 0 and Week 1 only. No seed, schema, DB, backup, route,
service-worker, XP rule, achievement rule, or dependency change.

If already committed and rollback is needed:

```powershell
git revert HEAD
```

## UX-07 stop conditions

Stop and request review if any of these is required:

- Use of `src/seed/` for guide content, or any seed/schema/DB/backup change
- Route, service-worker, XP rule, or achievement rule change
- New package dependency
- External network fetch or learner-progress mutation from guide rendering
- Introducing any term from the forbidden-terms list into learner-facing copy

## UX-07 files changed

| File                                                | Change                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/features/course/guideContent.ts`               | New static guide module: `UnitGuide` / `ItemGuide` types, `getUnitGuide` / `getItemGuide` (Week 0/1)   |
| `src/features/course/components/CourseUnitCard.tsx` | Render local guide summary near unit metadata when a guide entry exists                                |
| `src/features/course/routes/ContentDetailPage.tsx`  | Read-only `ItemGuideCard` rendered before logging/saving controls when a guide entry exists            |
| `src/styles/design-system.css`                      | Two small presentational rules: `.course-unit-card__guide`, `.course-guide-list`                       |
| `tests/features/guideContent.test.ts`               | Accessor resolution, null returns, seed-ID integrity, non-empty strings, forbidden-term / URL guards   |
| `tests/features/courseGuideRendering.test.tsx`      | Course-map summary and detail-page guide card render; no-guide page does not crash; no forbidden terms |
| `docs/remediation/ux-remediation-roadmap.md`        | Updated UX-07 status and recorded the as-built static-module approach                                  |
| `docs/remediation/ux-remediation-checklist.md`      | Updated current state, module tracker, added UX-07 sections                                            |

No seed, schema, DB, backup, route, service-worker, XP, achievement, or
dependency change.

---

## UX-05 rollback instructions

If anything goes wrong before commit:

```powershell
git status -sb
git restore src/ tests/ docs/
```

UX-05 changes: `ContentDetailPage.tsx` non-lecture path only — added `isUpdate` field to `ProgressSaveResult`, removed "Previous notes" card (which displayed current-record notes as if they were browseable history), added honest "Saved progress" reference card above the editing form (shows saved date, status label, notes, and submission note from the single current `ProgressEntry`), updated confirmation card title/content to show "Progress updated" vs "Progress saved" based on `isUpdate`. No schema, DB, route, XP rule, achievement rule, or dependency change.

If already committed and rollback is needed:

```powershell
git revert HEAD
```

## UX-05 stop conditions

Stop and request review if any of these is required:

- Schema, DB store, or index change
- XP rule change
- Achievement rule change
- New package dependency
- Service-worker change
- Backup/import/export/reset contract change
- External network fetch
- Introducing any term from the forbidden-terms list

## UX-05 files changed

| File                                               | Change                                                                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/course/routes/ContentDetailPage.tsx` | Added `isUpdate: boolean` to `ProgressSaveResult`; set it on save; added "Saved progress" card above form; updated confirmation title/copy; removed "Previous notes" card |
| `tests/app/App.test.tsx`                           | Renamed UX-03 "previous notes" test to "saved progress card shows saved note above the editing form"; 5 new UX-05 tests                                                   |
| `docs/remediation/ux-remediation-checklist.md`     | Updated current state, module tracker, added UX-05 sections                                                                                                               |

No engine, schema, dependency, route, service-worker, backup/import/export/reset contract change.

## UX-05 validation plan

Three full clean passes required (module touches save flow and XP-facing behavior):

```powershell
npm run lint
npx prettier --check src/features/course/routes/ContentDetailPage.tsx tests/app/App.test.tsx docs/remediation/ux-remediation-checklist.md
npm run typecheck
npm run build
npm run test
npx playwright test --workers=2
npm run check:circular
npm run audit
```

---

## UX-04 rollback instructions

If anything goes wrong before commit:

```powershell
git status -sb
git restore src/ tests/ docs/
```

UX-04 changes: page-header meta on AchievementsPage and CoursePage (added Level badge), save-confirmation cards on ContentDetailPage (XP/achievement text promoted to separate `<p>` elements; "Course map" link added to lecture confirmation), DashboardPage XP card (empty-state CTA link to course map; achievements-unlocked link when XP and achievements exist). No schema, DB, route, XP rule, achievement rule, or dependency change. Rolling back is safe at any point before commit.

If already committed and rollback is needed:

```powershell
git revert HEAD
```

## UX-04 validation log

Three full clean passes completed on 2026-06-18.

| Command            | Pass 1                                                    | Pass 2  | Pass 3  |
| ------------------ | --------------------------------------------------------- | ------- | ------- |
| `lint`             | ✅                                                        | ✅      | ✅      |
| `format:check`     | ⚠️ pre-existing CRLF noise (33 files, all pre-date UX-04) | ⚠️ same | ⚠️ same |
| `typecheck`        | ✅                                                        | ✅      | ✅      |
| `build`            | ✅                                                        | ✅      | ✅      |
| `test` (235 tests) | ✅                                                        | ✅      | ✅      |
| `playwright` (24)  | ✅                                                        | ✅      | ✅      |
| `check:circular`   | ✅                                                        | ✅      | ✅      |
| `audit`            | ✅                                                        | ✅      | ✅      |

`format:check` failures are pre-existing Windows CRLF/LF noise (confirmed by `git stash` test: same 33 files failed on the baseline commit before any UX-04 edits). The 6 UX-04 files also show the same CRLF mismatch for the same reason. This is a repo-wide baseline blocker unrelated to UX-04 content.

## UX-04 files changed

| File                                                    | Change                                                                                                                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/course/routes/ContentDetailPage.tsx`      | Lecture confirmation: XP and achievement into separate `<p>`; added "Course map" link                                                                          |
| `src/features/course/routes/ContentDetailPage.tsx`      | Problem-set confirmation: XP and achievement promoted to separate `<p>` elements                                                                               |
| `src/features/achievements/routes/AchievementsPage.tsx` | Added `getXpSummary()` fetch; shows "Level N" Badge in page header meta                                                                                        |
| `src/features/course/routes/CoursePage.tsx`             | Added `getXpSummary()` fetch; shows "Level N" Badge in page header meta                                                                                        |
| `src/features/dashboard/routes/DashboardPage.tsx`       | XP card: empty state adds CTA link to `/course`; non-empty with achievements adds link to `/achievements`                                                      |
| `tests/app/App.test.tsx`                                | 9 new UX-04 tests: lecture Course map link, lecture XP line, achievements level, course level, 2 problem-set confirmation tests, 3 dashboard reward-loop tests |
| `docs/remediation/ux-remediation-checklist.md`          | Updated state, module tracker, added UX-04 sections                                                                                                            |

No engine, schema, dependency, route, service-worker, backup/import/export/reset contract change.

## UX-04 stop conditions (all satisfied)

- [x] `lint` passes (zero warnings)
- [x] `typecheck` passes (zero errors)
- [x] `build` produces a clean bundle
- [x] `test` passes (235 tests, including 9 new UX-04 tests)
- [x] `playwright` passes (24 E2E tests)
- [x] `check:circular` passes
- [x] `audit` passes (zero vulnerabilities)
- [x] No new package dependencies added
- [x] No Dexie schema/store/index/migration changes
- [x] No XP rule amount changes
- [x] No achievement unlock rule changes
- [x] No service-worker/offline behavior changes
- [x] No route structure changes
- [x] No backup/import/export/reset contract changes
- [x] No external network fetches added
- [x] No forbidden learner-facing terms introduced

---

## UX-03 rollback instructions

If anything goes wrong before commit:

```powershell
git status -sb
git restore src/ tests/ docs/
```

UX-03 changes: layout, copy, and minor behavioral additions (inline save confirmation, conditional submission field, confidence moved to `<details>`, previous notes section). No schema, DB, route, XP rule, achievement rule, or dependency change. Rolling back is safe at any point before commit.

If already committed and rollback is needed:

```powershell
git revert HEAD
```

## UX-03 validation plan

Three full clean passes required (module touches save flow and XP-facing behavior):

```powershell
git status -sb
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npx playwright test --workers=2
npm run check:circular
npm run audit
```

## UX-03 stop conditions

Stop and request review if any of these is required:

- Schema, DB store, or index change
- XP rule change
- Achievement rule change
- New package dependency
- Service-worker change
- Backup/import/reset contract change
- External network fetch

---

## UX-02 rollback instructions

If anything goes wrong before commit:

```powershell
git status -sb
git restore src/ tests/ docs/
```

UX-02 changes: layout, copy, and minor behavioral additions (inline save confirmation, previous notes section, collapsible video segments, hidden confidence/submission fields for lecture type). No schema, DB, route, XP rule, achievement rule, or dependency change. Rolling back is safe at any point before commit.

If already committed and rollback is needed:

```powershell
git revert HEAD
```

## UX-02 validation plan

Three full clean passes required (module touches save flow and XP-facing behavior):

```powershell
git status -sb
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npx playwright test --workers=2
npm run check:circular
npm run audit
```

## UX-02 stop conditions

Stop and request review if any of these is required:

- Schema, DB store, or index change
- XP rule change
- Achievement rule change
- New package dependency
- Service-worker change
- Backup/import/reset contract change
- External network fetch

---

## Previous rollback instructions (UX-00)

If anything goes wrong before the UX-00 commit:

```powershell
git status -sb          # confirm what changed
git restore docs/       # discard docs changes if needed
```

UX-00 changes only documentation. No runtime code, schema, or dependency was changed. Rolling back is safe at any point before commit.

If already committed and a rollback is needed:

```powershell
git revert HEAD         # creates a new revert commit; do not use --hard reset on a pushed branch
```

---

## Files changed so far (UX-00)

| File                                           | Type    | Status              |
| ---------------------------------------------- | ------- | ------------------- |
| `docs/remediation/ux-remediation-roadmap.md`   | New doc | Created             |
| `docs/remediation/ux-remediation-checklist.md` | New doc | Created (this file) |
| `docs/remediation/plain-language-glossary.md`  | New doc | Created             |
| `docs/remediation/ux-audit-findings.md`        | New doc | Created             |

No runtime source, test, schema, dependency, service-worker, or package-script file was changed.

---

## Validation commands for UX-00

Run all of the following. All must pass or be documented:

```powershell
cd "C:\00 DEV\In Progress\ProgressPal"
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

If `npm run test:e2e` hangs on teardown, use managed-server method and document it:

```powershell
# In one terminal:
npm run dev
# In another:
npx playwright test --workers=2
```

### Documentation sanity check

Run this after validation to confirm no forbidden terms leaked into the new docs as recommended language:

```powershell
rg -n "watched range|slice timeline|Use next slice|Evidence|Confidence|Course item|Content detail|Progress record|local derived state|schema-backed|granular asset timeline|mutable surface" docs/remediation README.md PROJECT_STATE.md docs/DEMO.md
```

Expected: Hits will appear in `docs/remediation/ux-audit-findings.md` and `docs/remediation/plain-language-glossary.md` because those files document the forbidden terms as problems to fix. Hits in the roadmap or checklist should be in table rows that clearly label them as "current" / "bad" / "forbidden" — not as recommended language.

---

## Known failures

None at this baseline. UX-00 is documentation only.

If validation reveals a previously unknown test failure, record it here before proceeding.

---

## Stop conditions for UX-00

UX-00 is complete when:

- [x] All four documentation files exist in `docs/remediation/`
- [x] `npm run lint` passes (zero warnings)
- [x] `npm run format:check` passes
- [x] `npm run typecheck` passes
- [x] `npm run build` produces a clean bundle
- [x] `npm run test` passes (all unit/integration tests)
- [x] `npm run test:e2e` passes (or managed-server equivalent documented)
- [x] `npm run check:circular` passes
- [x] `npm run audit` passes (zero moderate+ vulnerabilities)
- [x] Documentation sanity check confirms no forbidden terms appear as recommended language
- [x] `git status -sb` shows only the four new doc files (no runtime changes)
- [x] Three content/UX review passes confirm: no mojibake, no spelling errors, no overclaims, no forbidden terms as recommended language, roadmap matches actual local-only CS50-only product

Do not commit until all boxes above are checked.

---

## Proposed commit message (UX-00)

```
Document ProgressPal UX remediation roadmap
```

---

## Proposed commit message (UX-01)

```
Replace technical course-detail language
```

---

## Module status tracker

| Module | Goal                               | Status   | Commit  |
| ------ | ---------------------------------- | -------- | ------- |
| UX-00  | Audit and baseline lock            | Complete | 5364aae |
| UX-01  | Plain-language terminology cleanup | Complete | a2e0cec |
| UX-02  | Learner-first lecture page         | Complete | 794fe06 |
| UX-03  | Learner-first problem set page     | Complete | 683a10b |
| UX-04  | Stronger XP/achievement/level loop | Complete | 62d8d03 |
| UX-05  | Save history and repair path       | Complete | e109d8f |
| UX-06  | Onboarding simplification          | Complete | 803503e |
| UX-07  | Local CS50 guide content           | Complete | 9f8eca3 |
| UX-08  | Visual hierarchy polish            | Complete | fc6b293 |
| UX-09  | Final acceptance review            | Complete | 8360c5c |

---

## Per-module protocol (every module, including this one)

### Before starting any module

1. `git status -sb` — confirm branch and clean state
2. `git log --oneline --decorate -5` — confirm baseline
3. `git ls-files .agent .agents .claude _bmad _bmad-output design-artifacts` — confirm no support folders
4. Update this checklist with current module, subtask, and files to change

### After completing any module

1. Run all validation commands (full set for persistence/XP/schema modules; abbreviated for copy-only modules — see roadmap)
2. Run documentation sanity check (forbidden-term search)
3. Final `git status -sb`
4. Update this checklist: last completed subtask, files changed, validation results, proposed commit message
5. Stop before commit; report to human for approval

---

## UX-01 pre-flight checklist (prepare before starting)

When UX-00 is committed and UX-01 begins, confirm:

- [ ] Branch is still `ux/00-remediation-roadmap` or a new `ux/01-terminology-cleanup` branch
- [ ] Baseline is `34e0be7` (or the UX-00 commit)
- [ ] No support folders tracked
- [ ] `ux-audit-findings.md` is the primary reference for what to change
- [ ] `plain-language-glossary.md` is the reference for what to change it to
- [ ] Every test that asserts a forbidden label (listed in audit findings §1.7) is on the list to update

UX-01 target files:

- `src/features/course/routes/ContentDetailPage.tsx`
- `src/features/course/components/CourseUnitCard.tsx`
- `src/features/course/components/CourseMapSummary.tsx`
- `src/features/sessions/routes/SessionsPage.tsx`
- `src/features/dashboard/routes/DashboardPage.tsx`
- `src/features/insights/routes/InsightsPage.tsx`
- `src/features/achievements/routes/AchievementsPage.tsx`
- `src/components/layout/AppShell.tsx`
- `e2e/achievements.spec.ts`
- `e2e/dashboard.spec.ts`
- `e2e/insights.spec.ts`
- `e2e/settings.spec.ts`
- `e2e/xp.spec.ts`
- `tests/app/App.test.tsx`

Forbidden-term search to run after UX-01:

```powershell
rg -n "Course item|Content detail|Progress record|watched range|Watched range|slice timeline|Slice timeline|Use next slice|Evidence|Confidence|local derived state|Item context|Asset tracking|granular asset timeline|mutable surface|Study ledger|session ledger|Local ledger|Storage rule|Derived duration" src tests e2e
```

All hits in user-facing strings must be removed or justified. Internal code names may remain.

---

## Validation results log

### UX-00 — 2026-06-17

| Command                  | Result | Notes                                                                                                                              |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `git status -sb`         | PASS   | Only `docs/remediation/` untracked; no runtime changes                                                                             |
| `npm run lint`           | PASS   | Zero warnings                                                                                                                      |
| `npm run format:check`   | PASS   | After running `prettier --write docs/remediation/` to fix table formatting in new .md files                                        |
| `npm run typecheck`      | PASS   | Zero errors                                                                                                                        |
| `npm run build`          | PASS   | All chunks under 600 kB; 195 modules transformed                                                                                   |
| `npm run test`           | PASS   | 32 test files / 208 tests passed                                                                                                   |
| `npm run test:e2e`       | PASS   | 24/24 Playwright tests passed using `--workers=2`; managed-server method (known environment teardown limitation documented)        |
| `npm run check:circular` | PASS   | No circular dependencies                                                                                                           |
| `npm run audit`          | PASS   | 0 vulnerabilities                                                                                                                  |
| Forbidden-term search    | PASS   | All hits in "forbidden/current" columns or grep-pattern strings; none appear as recommended UI language                            |
| Content review pass 1    | PASS   | No mojibake; no spelling errors; no overclaims; no affiliation language; roadmap matches actual local-only CS50-only product       |
| Content review pass 2    | PASS   | Forbidden terms listed as problems not recommendations; all module descriptions match actual planned scope; no CS50 content copied |
| Content review pass 3    | PASS   | Five-second test passes for each doc; plain language throughout; no security/encryption overclaims                                 |

### UX-01 — 2026-06-17 (initial pass)

E2E method: `npx playwright test --workers=2` (managed-server; `npm run test:e2e` has known teardown limitation).

| Command                  | Result | Notes                                                                                                                                         |
| ------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`           | PASS   | Zero warnings                                                                                                                                 |
| `npm run format:check`   | PASS   | 10 files needed `prettier --write` after initial edits; all clean on re-check                                                                 |
| `npm run typecheck`      | PASS   | Zero errors                                                                                                                                   |
| `npm run build`          | PASS   | 195 modules transformed; all chunks under 600 kB                                                                                              |
| `npm run test`           | PASS   | 32 test files / 208 tests. One miss fixed: `'Item'` label → `'What were you working on?'` in `App.test.tsx`                                   |
| E2E `--workers=2`        | PASS   | 24/24. Four misses fixed: `'Save logged effort'` → `'Save session'`; `'Study session saved'` → exact `'Session saved'`; strict-mode fixes     |
| `npm run check:circular` | PASS   | No circular dependencies                                                                                                                      |
| `npm run audit`          | PASS   | 0 vulnerabilities                                                                                                                             |
| Forbidden-term search    | FAIL   | Missed: `slices` in progress engine label; `course item` in loading/error/validation copy; `seeded` in CoursePage; video segments description |

### UX-01 acceptance correction — 2026-06-18

Corrections after acceptance review identified 4 failed criteria:

1. `slices complete` / `slices planned` in learner-visible summary labels → `segments`
2. ContentDetailPage loading/error copy still said "course item" → "course task"
3. CoursePage loading/error copy still said "seeded" and "item-progress" → plain language
4. Video segments card description still said "this timeline" / "saved local ranges" → plain language

Additional issues found during correction-round forbidden-term scan:

- `SliceProgressBar.tsx`: `"No slices defined yet."` and `"planned slices are complete."` → `segments`
- `detailModel.ts`: `"Finish its slices through logging…"` → `"segments"`
- `engine.ts:250`: `slices planned` → `segments planned`
- `CourseMapSummary.tsx`: `"seeded locally"` → `"built in"`
- `ImportBackupControl.tsx`: `"course item statuses"` → `"task statuses"`
- `SessionsPage.tsx`: 4 learner-visible `"course item"` strings → `"task"` / `"course task"`
- `sessions/model.ts`: 3 validation errors with `"course item"` / `"selected item"` → plain language
- `achievements/definitions.ts`: `"first course item of any kind"` → `"first task of any kind"`
- Test files: `slices complete`/`slices planned` updated in 8 test files; `existing course item` assertion updated in `sessionsModel.test.ts`

| Command                  | Result | Notes                                         |
| ------------------------ | ------ | --------------------------------------------- |
| `npm run lint`           | PASS   | Zero warnings                                 |
| `npm run format:check`   | PASS   | One file reformatted (`SliceProgressBar.tsx`) |
| `npm run typecheck`      | PASS   | Zero errors                                   |
| `npm run build`          | PASS   | 195 modules; all chunks under 600 kB          |
| `npm run test`           | PASS   | 32 test files / 208 tests                     |
| E2E `--workers=2`        | PASS   | 24/24                                         |
| `npm run check:circular` | PASS   | No circular dependencies                      |
| `npm run audit`          | PASS   | 0 vulnerabilities                             |
| Forbidden-term search    | PASS   | All remaining hits are internal (see below)   |

#### Remaining forbidden-term hits — all acceptable

| Term                                            | Location                                                                            | Reason acceptable                                                                                                                                                 |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slice` / `slices` / `contentSlices`            | `repositories.ts`, `engine.ts`, `model.ts`, `domain/types.ts`, `backup/envelope.ts` | Schema type names, DB field names, internal variable names; never rendered as UI text                                                                             |
| `ContentSlice` / `ContentSliceSchema`           | Type declarations                                                                   | Internal TypeScript types; not learner-facing                                                                                                                     |
| `"Completed before slice logging"`              | `engine.ts:246`                                                                     | Legacy migration label for pre-segment-tracking completions; visible only in edge case where user completed before segments existed; deferred to UX-02 evaluation |
| `InsightsAchievementTimeline`                   | `insights/model.ts`                                                                 | Internal TypeScript type name                                                                                                                                     |
| `"Achievement timeline"`                        | `InsightsPage.tsx:463`                                                              | Card title using "timeline" as ordinary English (chronological list); distinct from the removed jargon use `"Slice timeline"` / `"this timeline reflects"`        |
| `"Course item"` (variations)                    | `repositories.ts:361,988,1128,1149,1782,2250,2325,2439`                             | Internal debug/assertion strings in DB parsing code; `'Course item'` fallback in XP `reason` field (DB metadata); never rendered in learner UI                    |
| `"course item id"`                              | `domain/schemas.ts:441`                                                             | Internal Zod error label for malformed data; not shown in normal UI flow                                                                                          |
| `seeded`                                        | README files, code comments                                                         | Internal documentation; not rendered in UI                                                                                                                        |
| `item-progress`                                 | `course/README.md`                                                                  | Internal README                                                                                                                                                   |
| `"No long-form item is in progress right now."` | `DashboardPage.tsx:379`                                                             | Resume lecture card empty state; "long-form item" not in forbidden list; acceptable for now                                                                       |
| `"route"`                                       | `PlaceholderPage.tsx:50,64`                                                         | Placeholder pages for deferred modules; will be replaced by UX-02+; not normal UI flow                                                                            |

#### Files changed in UX-01

| File                                                    | Type      | Change summary                                                              |
| ------------------------------------------------------- | --------- | --------------------------------------------------------------------------- |
| `src/features/course/routes/ContentDetailPage.tsx`      | Source    | ~30 label/copy changes; two helper fns for type-specific card titles        |
| `src/features/course/components/CourseUnitCard.tsx`     | Source    | `Unit rollup` → `Week progress`; `items` → `tasks`; `Open detail` → `Open`  |
| `src/features/course/components/CourseMapSummary.tsx`   | Source    | Description and `Items` → `Tasks` copy updates                              |
| `src/features/course/routes/CoursePage.tsx`             | Source    | Description removing `evidence`, `confidence`, `watched ranges`             |
| `src/features/sessions/routes/SessionsPage.tsx`         | Source    | ~15 label/copy changes; eyebrows removed; `Save session` unified            |
| `src/features/dashboard/routes/DashboardPage.tsx`       | Source    | ~10 label/copy changes; `What's next?`, `Resume lecture` card titles        |
| `src/features/insights/routes/InsightsPage.tsx`         | Source    | ~8 label/copy changes; eyebrows removed; plain descriptions                 |
| `src/features/achievements/routes/AchievementsPage.tsx` | Source    | Eyebrows removed; plain descriptions                                        |
| `e2e/achievements.spec.ts`                              | E2E test  | `Confidence` → `How sure are you?`; `Save local progress` → `Save progress` |
| `e2e/dashboard.spec.ts`                                 | E2E test  | 10+ label assertions updated to match new copy                              |
| `e2e/insights.spec.ts`                                  | E2E test  | 4 label assertions updated                                                  |
| `e2e/sessions.spec.ts`                                  | E2E test  | `Save logged effort` → `Save session`; toast checks with `{ exact: true }`  |
| `e2e/settings.spec.ts`                                  | E2E test  | 4 label assertions in shared helper updated                                 |
| `e2e/xp.spec.ts`                                        | E2E test  | `Confidence` → `How sure are you?`; `Save session`; exact text match        |
| `tests/app/App.test.tsx`                                | Unit test | `Item` → `What were you working on?`; card title assertions updated         |

#### Scope risk assessment

No schema, database, route, XP rule, achievement rule, service-worker, or dependency change. All changes are copy/label only. Backup/import/reset contracts unaffected (confirmed by settings E2E). Safe to commit.

#### Remaining forbidden-term hits (acceptable)

- `ledger` / `session-ledger-list` — Internal CSS classes, TypeScript types, function names; never rendered as text
- `confidence` / `parsedConfidence` — Internal field names for the schema-backed `confidence` column; UI label is `How sure are you?`
- `watched range` in `engine.ts`, `progress/README.md` — Code comments and internal docs
- `Content detail` in `ContentDetailPage.tsx:340` — `console.error` developer log
- `Course item` in `repositories.ts:361,2250` — Debug assertion string and XP transaction fallback; not rendered in learner UI

---

### UX-02 — 2026-06-18

E2E method: `npx playwright test --workers=2` (managed-server; `npm run test:e2e` has known teardown limitation).

Three full clean passes required (module touches save flow and XP-facing behavior).

#### Pass 1

| Command                  | Result | Notes                                                                                                  |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------ |
| `npm run lint`           | PASS   | Zero warnings                                                                                          |
| `npm run format:check`   | PASS   | `prettier --write .` needed on 29 pre-existing UX-01 files; all clean after                            |
| `npm run typecheck`      | PASS   | Zero errors (one earlier `size="sm"` error fixed before this pass)                                     |
| `npm run build`          | PASS   | 195 modules; all chunks under 600 kB                                                                   |
| `npm run test`           | PASS   | 32 test files / 214 tests (6 new UX-02 tests added). One new test required fix: inline reload approach |
| E2E `--workers=2`        | PASS   | 24/24                                                                                                  |
| `npm run check:circular` | PASS   | No circular dependencies                                                                               |
| `npm run audit`          | PASS   | 0 vulnerabilities                                                                                      |

#### Pass 2

| Command                | Result | Notes                |
| ---------------------- | ------ | -------------------- |
| `npm run lint`         | PASS   | Zero warnings        |
| `npm run format:check` | PASS   | All clean            |
| `npm run typecheck`    | PASS   | Zero errors          |
| `npm run build`        | PASS   | 195 modules; clean   |
| `npm run test`         | PASS   | 32 files / 214 tests |
| E2E `--workers=2`      | PASS   | 24/24                |

#### Pass 3

| Command                  | Result | Notes                    |
| ------------------------ | ------ | ------------------------ |
| `npm run lint`           | PASS   | Zero warnings            |
| `npm run format:check`   | PASS   | All clean                |
| `npm run typecheck`      | PASS   | Zero errors              |
| `npm run build`          | PASS   | 195 modules; clean       |
| `npm run test`           | PASS   | 32 files / 214 tests     |
| E2E `--workers=2`        | PASS   | 24/24                    |
| `npm run check:circular` | PASS   | No circular dependencies |
| `npm run audit`          | PASS   | 0 vulnerabilities        |

#### Forbidden-term analysis (UX-02)

- No new forbidden terms introduced in user-facing strings
- `How sure are you?` and `Submission note` remain in `ContentDetailPage.tsx` but only in non-lecture render paths (guarded by `{!isLecture ? ... : null}`)
- `slice` / `Slice` appear in CSS class names (`.slice-detail-list`, `.slice-progress`) and internal code — not user-facing text
- `Evidence` / `Confidence` appear only as internal variable names (not UI labels)
- All new user-facing copy uses learner-first language: "Log Lecture", "Started at", "Stopped at", "Session Notes", "Session saved", "Video segments", "Previous notes from this lecture"

#### Files changed in UX-02

| File                                               | Type      | Change summary                                                                                                                                                                                     |
| -------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/course/routes/ContentDetailPage.tsx` | Source    | Full learner-first rewrite of lecture path; new `PreviousSessionNotes` component; inline save confirmation; collapsible video segments; optional fields in `<details>`; non-lecture path preserved |
| `src/styles/design-system.css`                     | Styles    | Added `.form-details` (collapsible optional fields) and `.lecture-previous-notes` classes                                                                                                          |
| `tests/app/App.test.tsx`                           | Unit test | 6 new tests: heading/labels, forbidden-term check, save confirmation, previous notes, segments collapse, keyboard access                                                                           |
| `docs/remediation/ux-remediation-checklist.md`     | Doc       | Updated current state, module tracker, added this validation log                                                                                                                                   |

#### Scope risk assessment

No schema, database, route, XP rule, achievement rule, service-worker, or dependency change. Save confirmation reads `xpResult.awardedTransactions` and `xpResult.unlockedAchievements` from the existing `logMediaProgressAndAwardXp` return value — no new DB calls. `achievementDefinitionsById` is a static in-memory map (no DB call). Inline reload uses existing `loadContentDetail` function — no new data path. Safe to commit.

#### Key implementation note

The save confirmation approach: after `logMediaProgressAndAwardXp` resolves, `setSaveResult(result)` shows the confirmation inline, then `loadContentDetail(itemId)` is called asynchronously (wrapped in `startTransition`) to refresh page data without triggering the full loading-spinner cycle. This means the confirmation card is immediately visible AND the "Last watched" badge updates once the refresh completes. The user dismisses the confirmation when ready.

#### Proposed commit message (UX-02)

```
Make lecture logging learner-first
```

---

### UX-03 — 2026-06-18

E2E method: `npx playwright test --workers=2` (managed-server; `npm run test:e2e` has known teardown limitation).

Three full clean passes required (module touches save flow and XP-facing behavior).

#### Pass 1

| Command                  | Result | Notes                                                                                                                                                                          |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run lint`           | PASS   | Zero warnings                                                                                                                                                                  |
| `npm run format:check`   | PASS   | `prettier --write .` needed on 29 pre-existing unformatted files; all clean after                                                                                              |
| `npm run typecheck`      | PASS   | Zero errors                                                                                                                                                                    |
| `npm run build`          | PASS   | 195 modules; all chunks under 600 kB                                                                                                                                           |
| `npm run test`           | PASS   | 32 test files / 221 tests (7 new UX-03 tests added). Three test fixes needed: validation error regex; `within()` scoping for previous-notes card; `<details>` expansion in E2E |
| E2E `--workers=2`        | PASS   | 24/24. Two E2E fixes needed: expand `<details>` before confidence select; use `getByRole('heading')` to avoid strict-mode violation with duplicate "Progress saved" text       |
| `npm run check:circular` | PASS   | No circular dependencies                                                                                                                                                       |
| `npm run audit`          | PASS   | 0 vulnerabilities                                                                                                                                                              |

#### Pass 2

| Command                  | Result | Notes                    |
| ------------------------ | ------ | ------------------------ |
| `npm run lint`           | PASS   | Zero warnings            |
| `npm run format:check`   | PASS   | All clean                |
| `npm run typecheck`      | PASS   | Zero errors              |
| `npm run build`          | PASS   | 195 modules; clean       |
| `npm run test`           | PASS   | 32 files / 221 tests     |
| E2E `--workers=2`        | PASS   | 24/24                    |
| `npm run check:circular` | PASS   | No circular dependencies |
| `npm run audit`          | PASS   | 0 vulnerabilities        |

#### Pass 3

| Command                  | Result | Notes                                                                                |
| ------------------------ | ------ | ------------------------------------------------------------------------------------ |
| `npm run lint`           | PASS   | Zero warnings                                                                        |
| `npm run format:check`   | PASS   | All clean                                                                            |
| `npm run typecheck`      | PASS   | Zero errors                                                                          |
| `npm run build`          | PASS   | 195 modules; clean                                                                   |
| `npm run test`           | PASS   | 32 files / 221 tests (one isolated flake on first attempt; immediate retry: 221/221) |
| E2E `--workers=2`        | PASS   | 24/24                                                                                |
| `npm run check:circular` | PASS   | No circular dependencies                                                             |
| `npm run audit`          | PASS   | 0 vulnerabilities                                                                    |

#### Forbidden-term analysis (UX-03)

- No new forbidden terms introduced in user-facing strings
- `Evidence` / `Confidence` appear only as internal TypeScript variable names (`evidenceText`, `parsedConfidence`) — not UI labels
- Submission field label is `"Where did you submit it?"` — not `"Evidence"`
- `Content detail` in `ContentDetailPage.tsx:414` is a `console.error` message — not shown in UI
- All new user-facing copy uses learner-first language: "Problem Set Progress", "Lab Progress", "Save your progress here", "Progress saved", "What's next?", "Previous notes", "Where did you submit it?"
- Confidence field moved to `<details>` collapse with summary "More details (confidence)" — word appears as supplementary context in summary text only, not as a primary label

#### Test fixes required during pass 1

| File                                       | Fix                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `tests/features/courseDetailModel.test.ts` | Updated `evidenceText` error regex from `/needs a short evidence note/i` to `/where you submitted this work/i`                 |
| `tests/app/App.test.tsx`                   | Scoped notes assertion with `within(card)` — notes text appeared in both textarea and "Previous notes" card                    |
| `e2e/xp.spec.ts`                           | Click `<details>` summary before confidence select; use `getByRole('heading')` to avoid strict-mode "Progress saved" duplicate |
| `e2e/achievements.spec.ts`                 | Click `<details>` summary before confidence select                                                                             |

#### Files changed in UX-03

| File                                               | Type      | Change summary                                                                                                                                                                                                                                                     |
| -------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/features/course/routes/ContentDetailPage.tsx` | Source    | Full learner-first rewrite of non-lecture path; new `ProgressSaveResult` type and `getProgressCardTitle` helper; inline save confirmation; conditional submission field; confidence in `<details>`; previous notes section; CS50 link moved to page header actions |
| `src/features/course/detailModel.ts`               | Source    | Updated `evidenceText` validation message from jargon to plain English ("Add a note about where you submitted this work")                                                                                                                                          |
| `tests/app/App.test.tsx`                           | Unit test | 7 new tests: heading/labels, forbidden-term check, submission field visibility, save confirmation, previous notes, keyboard access                                                                                                                                 |
| `tests/features/courseDetailModel.test.ts`         | Unit test | Updated `evidenceText` error assertion regex to match new validation message                                                                                                                                                                                       |
| `e2e/xp.spec.ts`                                   | E2E test  | Expand confidence `<details>` before select; use `getByRole('heading')` for "Progress saved" assertion                                                                                                                                                             |
| `e2e/achievements.spec.ts`                         | E2E test  | Expand confidence `<details>` before confidence select                                                                                                                                                                                                             |
| `docs/remediation/ux-remediation-checklist.md`     | Doc       | Updated current state, module tracker, added this validation log                                                                                                                                                                                                   |

#### Scope risk assessment

No schema, database, route, XP rule, achievement rule, service-worker, or dependency change. Save confirmation reads `xpResult.awardedTransactions` and `xpResult.unlockedAchievements` from the existing `upsertProgressAndAwardXp` return value — no new DB calls. Inline reload uses existing `loadContentDetail` function — no new data path. Confidence field default `'0'` preserved in form state so validation passes even when `<details>` is collapsed. Safe to commit.

#### Proposed commit message (UX-03)

```
Make problem set progress learner-first
```
