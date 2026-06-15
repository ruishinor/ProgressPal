# Module 14 Plan — Dashboard

> Status: **Module 14 complete and validated** (three consecutive clean
> `npm run validate` passes). This file contains both the original approved
> plan (sections 1–14) and the verified end-of-module handoff (section 15);
> read the handoff for the as-built outcome. The plan sections record intent at
> approval time and may differ from final wording where the phased
> implementation refined details (the vendor split, the derived-slice
> idempotency fix, and the removal of non-dark-theme-safe card variants).

## Summary

- Module 14 replaces the `/dashboard` placeholder with a truthful, read-only,
  derived-only local dashboard built from existing source-of-truth stores and
  existing read models. It answers: where am I in CS50, what to continue next,
  how much progress/XP/achievement status I have, what recent local activity
  exists, and what is blocked or unfinished.
- Dexie schema stays version 2. No schema bump, no new store, no new index, no
  new persistent dashboard state. Opening `/dashboard` must not change any
  IndexedDB store contents.
- All dashboard data comes from existing `@/lib/db` read helpers plus existing
  pure builders (`buildCourseMap`, `buildLongFormProgressMap`,
  `calculateXpSummary`/`getXpSummary`, `getAchievementsView`). No new repository
  surface is added unless the XP read-path proof in section 3 forces a minimal
  read-only helper.
- Dashboard logic lives in a new pure `src/features/dashboard/model.ts`. The
  route component stays presentation plus loading/error/fetch only.
- No charts. No Module 15 Insights (trends, forecasts, streaks, coaching,
  pattern recommendations, recovery analysis, time-series, comparative
  analytics). No backup/import/export/reset. No new XP rules. No new
  achievements. No achievement XP. No cloud/auth/sync/analytics/external APIs.
- The `Dashboard` heading must be preserved: onboarding redirects to
  `/dashboard` and the e2e `completeOnboarding()` helper asserts the heading.

## 1. Step 0 hard gate (verified this session)

- `npm run validate` was run in full against the Module 13 repo state and
  completed with exit code 0. Verified green: `lint`, `format:check`,
  `typecheck`, `build` (599.69 kB, under the configured 600 kB threshold),
  `test` (25 files, 118 tests), `test:e2e` (11 tests), `check:circular` (no
  circular dependencies), `audit` (`--audit-level=moderate`, 0 vulnerabilities).
- Module 13 is confirmed complete and the working tree validates cleanly before
  any Module 14 work begins. Prior-agent claims were not trusted; this was run.
- This is the only validation fact recorded here. No Module 14 validation has
  been run because Module 14 is not implemented.

## 2. Current state audit (after Module 13)

- `/dashboard` is a placeholder: `src/features/dashboard/routes/DashboardPage.tsx`
  renders `PlaceholderPage title="Dashboard"`. The route is already wired in
  `src/app/router/router.tsx` and `src/app/router/routeDefinitions.ts` and is in
  primary navigation. No router or route-definition change is needed.
- Onboarding (`src/features/profile/routes/OnboardingPage.tsx`) navigates to
  `/dashboard` after save; `src/app/shell/AppShell.tsx` redirects a completed
  learner from `/onboarding` to `/dashboard`, and gates all routes behind a
  completed profile. Dashboard tests must seed a completed profile.
- Seed: 14 units, 68 items, `dataVersion` 20260611. Required units are the week
  units (week-0 through week-10) plus `final-project`. `artificial-intelligence`
  and `additional-practice` are special, not required.
- Read helpers (all in `@/lib/db`) cover every metric: `listCourseUnits`,
  `listCourseItems`, `listProgressEntries`, `listContentAssets`,
  `listContentSlices`, `listMediaProgressEvents`, `listResumePoints`,
  `listStudySessions`, `getXpSummary`, `listXpTransactions`,
  `getAchievementsView`, `listAchievementUnlocks`, plus `getDatabaseSnapshot`
  for tests.
- Pure builders to reuse (already tested): `buildCourseMap`
  (`src/features/course/model.ts`), `buildLongFormProgressMap`
  (`src/features/progress/model.ts`), `calculateXpSummary`
  (`src/lib/xp/engine.ts`), session helpers (`src/features/sessions/model.ts`),
  route-path helpers `getCourseItemDetailPath` / `getStudySessionsPath`, and
  `formatMinutes`.
- Read-only behavior of helpers: only `getXpSummary` and `listXpTransactions`
  call `ensureBaseInitialization` (which opens a `rw` transaction but is expected
  to perform no add/put once the DB is initialized at current app/schema
  version). That no-op is likely in the normal post-onboarding `/dashboard` flow
  but is **not assumed** — tests must prove it across realistic render states.
  All other read helpers open read-only. This is the one risk that section 3
  pins down with a proof, not with prose.
- Design primitives (`src/components/ui`): `PageHeader`, `Card`, `ProgressBar`
  (clamps via `clampNumber`, `role="progressbar"` with aria min/now/max),
  `StatusPill` (dot plus text label, never color alone), `Badge`, `EmptyState`,
  `LoadingState`, `ErrorState`. Reduced motion is handled globally via the
  `data-motion` attribute and CSS; reusing these primitives inherits it.
- `recharts` is an installed dependency but is unused by the app today and will
  remain unimported by Module 14.

## 3. Design decisions (locked at approval, with amendments)

1. Dexie schema stays version 2. No migration, no new store/index, no new
   persistent dashboard state. If a schema change appears necessary: **STOP and
   report**.
2. Dashboard is strictly read-only and derived-only. Opening or reloading
   `/dashboard` must not change any IndexedDB store contents.
3. **XP read path (Amendment 2).** Use the existing XP read path
   (`getXpSummary()`), and prove read-only behavior with full store-content
   equality before/after dashboard render and reload — not a "no visible writes"
   assertion. If the existing initialization path causes any actual store change
   in the dashboard scenario, **STOP and report**, and only then propose a
   minimal read-only XP helper (e.g. a non-initializing transaction read). Do
   not add broad repository surface.
4. Dashboard logic is a pure builder in `src/features/dashboard/model.ts` taking
   already-fetched plain data and returning a fully formatted, link-and-label
   ready `DashboardModel`. The route does fetch plus loading/error/ready only,
   mirroring `CoursePage`.
5. No charts; the existing clamped `ProgressBar` is the only visual. `recharts`
   stays unimported.
6. No new dependencies of any kind (Amendment 3). See section 6.

## 4. Dashboard read model — `src/features/dashboard/model.ts` (new, pure)

Single entry point `buildDashboardModel(input): DashboardModel`, no DB/IO inside
(unit-testable with plain arrays).

Input (assembled by the route from existing helpers):
`courseMap: CourseMapView`, `xpSummary: XpSummary`, `achievements:
AchievementsView`, `studySessions: StudySession[]`, `progressEntries:
ProgressEntry[]`, `mediaProgressEvents: MediaProgressEvent[]`, `xpTransactions:
XpTransaction[]`, `achievementUnlocks: AchievementUnlock[]`, `resumePoints:
ResumePoint[]`, `longFormByItemId: Map<string, LongFormProgressView>`, and
`itemsById` / `unitsById` lookups.

Output `DashboardModel`: one typed sub-object per card (section 5), each
pre-formatted with labels, links, clamped values, and an explicit `isEmpty`
flag so the component stays presentation-only.

## 5. Dashboard sections / cards

1. **Course progress** — overall required completion percent (clamped progress
   bar, never overstated), `completedRequiredItemCount / requiredItemCount`,
   completed-unit count, blocked-item count. Link to `/course`. Source:
   `course_units` + `course_items` + `progress_entries` (+ long-form) via
   `buildCourseMap`.
2. **Continue next (Amendment 4, deterministic)** — selection order:
   (a) prefer an incomplete required item that already has local progress or
   resume state (i.e. status indicates started, or a resume point / media
   history exists for it), choosing the first such item in course order;
   (b) otherwise the first not-started required item in course order;
   exclude blocked and completed items in both steps. If all required items are
   complete, render a truthful "all required items complete" state. Shows item
   title, unit, and link to `/course/:itemId`. No pattern analysis, coaching,
   streaks, or forecasts.
3. **XP summary** — `totalXp`, `level`, `xpToNextLevel`, and an in-level clamped
   progress bar over `currentLevelFloorXp -> nextLevelXp`. Derived only; no
   stored level or total. Source: `xp_transactions` via `getXpSummary`.
4. **Achievements summary** — `unlockedCount / totalCount` (16 definitions),
   most-recent unlock date if any. Link to `/achievements`. Read-only. Source:
   code definitions + `achievement_unlocks` via `getAchievementsView`.
5. **Recent activity (Amendment 5)** — top N (about 6) merged records that came
   only from explicit save / user-action flows already present in the app:
   study sessions (`startedAt`), progress updates (`updatedAt`), media events
   (`createdAt`), XP awards (`awardedAt`), achievement unlocks (`unlockedAt`).
   Never synthesize activity. Never treat app open, reload, route navigation,
   dashboard read, achievements read, or passive route-load as activity. Sort by
   timestamp descending, then a stable id/type tie-break.
6. **Needs attention (blocked)** — items whose progress `status === 'blocked'`,
   with links to `/course/:itemId`. Empty when none. Source: `progress_entries`.
7. **Resume long-form** — the long-form item with the most recently updated
   resume point that is `hasProgress && !isComplete`; shows `resumeLabel` and
   `sliceProgressLabel`, link to `/course/:itemId`. Empty when none. Source:
   assets/slices/media/resume/progress via `buildLongFormProgressMap` ordered by
   resume-point `updatedAt`.
8. **Study sessions summary** — count, total logged minutes (`formatMinutes`),
   last-session date, from saved sessions. Link to `/sessions`. Plain aggregate,
   not streaks/trends. Source: `study_sessions`.
9. **Quick links** — to `/course`, `/sessions`, `/achievements`.

Every card renders a truthful empty state for a fresh user (0 XP, level 1, no
progress/sessions). No fake data. Progress bars never exceed 100% and never
overstate completion.

## 6. Build-size guardrail (Amendment 3)

- Current build is 599.69 kB against a configured 600 kB warning threshold.
- Do not add charting, date, animation, external UI, or other heavy
  dependencies. Reuse existing primitives and existing `date-fns`/time helpers
  only where already used.
- If Module 14 pushes the build over the threshold: reduce implementation
  weight first (smaller model, fewer formatting helpers, no new imports) and
  report exactly what caused the increase (which module/import). Do not raise or
  bypass the threshold. Only propose a threshold change as a separately
  documented decision after explaining precisely what is being measured.

## 7. Public repository / read surfaces to add

- None by default. All required reads already exist in `@/lib/db`.
- A minimal read-only XP helper may be added only if section 3's proof shows the
  existing path mutates a store in the dashboard scenario. Do not add broad
  surface.

## 8. File-level implementation scope

- New: `src/features/dashboard/model.ts` — pure `buildDashboardModel` and types.
- Edit: `src/features/dashboard/routes/DashboardPage.tsx` — replace placeholder
  with the read-only dashboard (loading/error/ready), preserving the
  `title="Dashboard"` heading.
- Edit (only if needed): `src/features/dashboard/index.ts` — export model types.
- Styling: additive dashboard layout rules in `src/styles/design-system.css`,
  reusing existing card/grid/progress classes where possible.
- Copy (Amendment 7): touch `src/app/routes/HomePage.tsx` and/or
  `src/app/shell/AppShell.tsx` only if their current copy becomes false or
  misleading once the dashboard exists (e.g. "Dashboard metrics ... deferred").
  No cosmetic doc expansion.
- No router/route-definition changes. No feature README is added (Amendment 7):
  although some features have a `README.md`, several do not, so it is not a hard
  convention; skip it unless asked.

## 9. Files forbidden to change

- `src/lib/db/database.ts`, `src/lib/db/constants.ts`,
  `src/lib/domain/schemas.ts`, `src/lib/domain/types.ts`.
- `src/seed/cs50x-2026.json`, `tests/db/migrations.test.ts`.
- `src/lib/xp/engine.ts`, `src/lib/achievements/**`, `src/lib/progress/engine.ts`
  (locked engines — reuse, do not modify their behavior).
- `src/features/insights/**`.
- Any code that writes from a dashboard read path, adds XP rules, adds
  achievements, changes achievement definitions, or adds achievement XP.

## 10. Acceptance criteria

- `/dashboard` renders after onboarding with the documented sections and a
  truthful empty state for a fresh learner.
- Opening and reloading `/dashboard` changes no IndexedDB store contents, proven
  by full snapshot equality (section 11), not by row counts alone for unit/app.
- Dashboard reads award no XP and unlock no achievements; they mutate no
  progress, sessions, media events, slices, resume points, XP transactions,
  achievement unlocks, profile, app meta, or seed/catalog data.
- All dashboard numbers are derived from existing stores/read helpers; no stored
  authoritative level, total XP, or dashboard state is introduced.
- Continue-next follows the deterministic rule in section 5; no Insights-style
  recommendation logic appears.
- Recent activity contains only explicit-save/user-action records, ordered
  deterministically; no passive events.
- Dexie schema stays version 2; the migration fixture stays green.
- Build stays under the threshold (or the increase is reported and weight
  reduced); no new dependencies.

## 11. Test plan (with amendments 2 and 6)

- New `tests/features/dashboardModel.test.ts` — pure model: derived course
  percent and clamping (no overstatement), XP summary mapping, achievement
  counts, recent-activity merge/order and identity (assert the actual records
  and order, not just length), blocked items, resume item selection,
  continue-next selection across the prefer-in-progress then first-not-started
  cases, study-session summary, and fresh-user empty states.
- Edit `tests/app/App.test.tsx` — (a) `/dashboard` renders after onboarding with
  key sections; (b) no-mutation regression comparing **full snapshots** (via
  `getDatabaseSnapshot`) before/after render and reload for, at minimum,
  `xp_transactions`, `achievement_unlocks`, `progress_entries`, `study_sessions`,
  `media_progress_events`, `content_slices`, `resume_points`, `learner_profile`,
  `app_meta`, and the seed/catalog stores (`course_units`, `course_items`).
  Full-object comparison so a delete-and-reinsert cannot pass.
- Edit `e2e/dashboard.spec.ts` — after seeded onboarding and at least one saved
  progress/session event, `/dashboard` shows real sections; axe accessibility
  scan reports zero violations; reload leaves `xp_transactions` and
  `achievement_unlocks` unchanged. E2E may use row counts where full IndexedDB
  object comparison is impractical; unit/app coverage is the strict layer.
- Validation commands: `npm run lint`, `npm run format:check`,
  `npm run typecheck`, `npm run build`, `npm run test`, `npm run test:e2e`,
  `npm run check:circular`, `npm audit --audit-level=moderate`.
- Triple-Zero requirement: three consecutive clean full-suite passes after the
  final Module 14 code and docs are in place. `VALIDATION_LOG.md` is updated only
  with actual results; it must not state triple validation passed unless it
  passed three consecutive times.

## 12. Accessibility and reduced-motion

- Semantic headings (PageHeader `h2`, card `h3`); status conveyed by text plus
  `StatusPill` label, never color alone.
- `ProgressBar` keeps `role="progressbar"` with aria min/now/max and clamps.
- Links are real router links with discernible names.
- Reduced motion inherited from the global `data-motion` CSS; no new animations
  or transitions are introduced. Axe must report zero violations on `/dashboard`.

## 13. Stop conditions

Halt and report immediately if: a schema change appears necessary; dashboard
logic needs persistent state; opening `/dashboard` would need to write to
IndexedDB or the XP read path actually mutates a store; the build exceeds the
threshold and cannot be reduced without scope cuts; implementation drifts into
Module 15 Insights, charts, forecasts, streak analytics, coaching,
backup/import/export/reset, new achievements, new XP rules, or external
services; or full validation cannot be completed.

## 14. Phased execution (planned, not started)

Implementation will proceed in small phases, stopping after any phase if
validation fails or scope pressure appears:

1. Pure `model.ts` + `dashboardModel.test.ts` (no UI).
2. Route component + styling, reusing existing primitives.
3. App/route render + full-snapshot no-mutation tests.
4. E2E + accessibility scan.
5. Docs + triple-Zero validation + handoff (section 15).

## 15. End-of-module handoff (verified)

- Current module complete/incomplete: **complete.**
- Changed files (across the Module 14 commits):
  - `src/features/dashboard/model.ts` (new), `src/features/dashboard/routes/DashboardPage.tsx`
  - `src/styles/design-system.css`, `vite.config.ts`, `src/lib/db/repositories.ts`
  - `tests/features/dashboardModel.test.ts` (new), `tests/app/App.test.tsx`,
    `tests/db/repositories.test.ts`, `e2e/dashboard.spec.ts`
  - Docs: `PROJECT_STATE.md`, `DECISIONS.md` (D-0036), `docs/modules/module-14-plan.md`,
    `MODULE_CHECKLIST.md`, `CHANGELOG.md`, `TEST_PLAN.md`, `VALIDATION_LOG.md`
- Validation status: **three consecutive clean `npm run validate` passes**
  (each: lint, format:check, typecheck, build with all chunks under the 600 kB
  warning budget, 145 unit tests across 26 files, 13 E2E tests, no circular
  dependencies, 0 audit vulnerabilities).
- Confirmations: Dexie schema stayed version 2; dashboard values are derived
  only; opening and reloading `/dashboard` mutates no store (full-snapshot
  equality across all twelve stores); no XP awarded from dashboard reads; no
  achievements unlocked from dashboard reads; no Module 15 Insights, charts,
  backup/import/export/reset, sync, auth, analytics, external APIs, new XP
  rules, or new achievements were implemented.
- Known risks (deferred): the global dark-theme hardening of `.card--subtle`,
  `.card--accent`, and `.card--danger` (the dashboard avoids them, but the
  design-system surfaces still need a contrast fix; axe cannot evaluate their
  gradient backgrounds); Module 15 Insights and backup/import/export/reset
  remain unbuilt.
- Next module: **Module 15 - Insights (not started).**
- Exact next prompt: "Begin Module 15 (Insights) planning only. Do not
  implement. Re-read PROJECT_STATE.md and docs/modules, confirm Module 14 is
  complete with three Triple-Zero passes, then produce a Module 15 plan covering
  scope (trends/charts/forecasts/streaks deferred from Module 14), the
  read-only/derived-only and offline constraints, the design-system dark-theme
  card-variant hardening that Insights charts will depend on, proposed files,
  tests, and validation, and stop for approval before any code."
