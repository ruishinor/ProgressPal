# Module 15 Plan — Insights

> Status: **Module 15 complete and validated** (three consecutive clean
> `npm run validate` passes). Sections 1–13 record the approved plan; section 14
> is the verified end-of-module handoff. Read the handoff for the as-built
> outcome.

## Summary

- Module 15 replaces the `/insights` placeholder with a truthful, read-only,
  derived-only local insights surface: the over-time counterpart to the
  dashboard. It describes how locally recorded effort has accumulated, derived
  only from existing stores and read models.
- Dexie schema stays version 2. No schema/store/index change, no new persistent
  insights state, no cache, no new repository surface. Opening or reloading
  `/insights` mutates no IndexedDB store, awards no XP, and unlocks no
  achievement.
- Visualization is semantic tables with token-based, decorative `aria-hidden`
  CSS bars; exact values stay visible as text. No charts (no Recharts, no
  first-party SVG), no new dependencies.
- No forecasts, coaching, recommendations, motivational interpretation, or
  gamified streak branding. No backup/import/export/reset, settings,
  cloud/auth/sync/analytics, or external APIs.

## 1. Truthfulness model — which data can be trended

- Immutable, event-sourced ledgers (safe to trend over time): `study_sessions`
  (`startedAt`, `durationMinutes`, `mode`), `media_progress_events` (`createdAt`,
  `watchedSeconds`), `xp_transactions` (`awardedAt`, `xp`, `sourceType`),
  `achievement_unlocks` (`unlockedAt`).
- Current-state, mutable rows (snapshot only, NOT a history): `progress_entries`
  (last-write-wins, no status-change history) and the derived course map. These
  back a current completion snapshot only.
- Consequence: confidence trends, per-status progress history, and
  recovery/blocked-resolution views are not derivable honestly and are deferred.

## 2. Read model — `src/features/insights/model.ts` (new, pure)

Single entry point `buildInsightsModel(input, options): InsightsModel`. No Dexie,
no IO, no route logic, no mutation; unit-testable with plain arrays. Input is
assembled by the route from existing read helpers. Bucketing is device-local
(Monday week start); a session/event is attributed whole to the local day/week of
its `startedAt`/`createdAt` and never split. The model does not claim universal
timezone correctness because stored timestamps are absolute UTC instants.

## 3. Sections (all read-only, derived, with truthful empty states)

1. Course progress — current required-completion snapshot (clamped `ProgressBar`),
   labeled as a snapshot, not a trend.
2. Effort over time — weekly table: study minutes and watched minutes logged.
3. XP over time — weekly XP earned and running cumulative XP.
4. Study mode breakdown — logged minutes and session counts by mode, with share.
5. Active days — active days in the last 30 and consecutive active days (factual,
   neutral wording, no streak branding).
6. Recorded completion awards — counts of completion XP awards per week, item vs
   `week_completed` (unit) separated; labeled as recorded awards, not a
   reconstructed item-completion history.
7. Achievement timeline — unlocks newest-first, with a link to `/achievements`.

## 4. Metric semantics (honesty boundaries)

- "Watched minutes logged" sums `media_progress_events.watchedSeconds` as logged
  effort over time (overlaps included) and floors partial minutes; labeled
  "logged", never presented as unique watched coverage.
- "Recorded completion awards" use exact XP-engine `sourceType` values. Item
  awards: `lecture_completed`, `section_completed`, `shorts_completed`,
  `practice_completed`, `notes_completed`, `reflection_completed`,
  `problem_set_submitted`, `problem_set_accepted`,
  `final_project_build_completed`, `final_project_readme_demo_completed`. Unit
  award: `week_completed`. `problem_set_started` is intentionally excluded.
- A bidirectional unit test drives the real XP engine and fails loudly if it
  emits a completion `sourceType` the model does not classify, or if the model
  lists a type the engine no longer emits. Divergence is a STOP-and-report
  condition; the XP engine is never edited to make Insights pass.

## 5. Deferred (insufficient data or would mislead)

- Charts (Recharts and first-party SVG), forecasts/pace extrapolation, coaching,
  recommendations, confidence trends (no confidence history), historical progress
  trends from mutable `progress_entries`, recovery/blocked-resolution views,
  energy trends, and gamified streaks. First-party SVG charts may be reconsidered
  as a separate follow-up after the table model is proven.

## 6. Files

- New: `src/features/insights/model.ts` (pure builder + local day/week helpers).
- Edit: `src/features/insights/routes/InsightsPage.tsx` (read-only fetch +
  loading/error/ready; reuses existing primitives; honest copy).
- Edit: `src/styles/design-system.css` (additive `insights-grid`,
  `insights-table`, decorative `insights-bar` rules; no gradients).
- No router/route-definition change; no new dependency; no repository change.

## 7. Tests

- New `tests/features/insightsModel.test.ts` (pure model + XP-engine divergence
  guard).
- Edit `tests/app/App.test.tsx` (insights render + full-snapshot no-mutation
  across every store `getDatabaseSnapshot()` returns).
- New `e2e/insights.spec.ts` (insights + axe in dark theme, real saved-activity
  flow, reload leaves ledgers unchanged, unsafe-card-variant guard).

## 8. Accessibility, contrast, keyboard, reduced motion

- Semantic headings; real `<table>` with `<caption>` and `<th scope>`; exact
  values as text. CSS bars are decorative, `aria-hidden`, token-colored, no
  gradients. Status by text, never color alone. Links are real router links.
  Reduced motion inherited from global `data-motion`; no new animation. axe runs
  in dark theme and reports zero violations.

## 9. Bundle and dependencies

- No new dependency. Recharts and date-fns stay unimported. Local day/week
  bucketing uses first-party helpers. The build keeps every chunk under the
  600 kB warning budget without raising the threshold.

## 10. Validation commands

- `npm run validate` = lint, format:check, typecheck, build, test, test:e2e,
  check:circular, audit. Three consecutive clean passes required.

## 11. Stop conditions

- A schema/index/store change appears necessary; insights need persistent or
  cached state or any IndexedDB write; render/reload mutates any store; an insight
  can only be shown by inventing data or presenting weak extrapolation as fact;
  drift into forecasts/coaching/recommendations/streak-pressure, new XP rules,
  new/changed achievements, backup/import/export/reset, settings, or external
  services; the build exceeds the 600 kB per-chunk budget; the XP-engine
  completion `sourceType` set and the Insights classification diverge; or full
  validation cannot reach three clean passes.

## 12. Phased execution (as built)

1. Pure model + unit tests.
2. Route + additive styling.
3. App render + full-snapshot no-mutation test.
4. E2E + axe (dark theme) + unsafe-variant guard.
5. Docs + three clean `npm run validate` passes + handoff. Hard stop after
   Module 15; do not begin Module 16.

## 13. Files forbidden to change

- `src/lib/db/**` schema/store/index surfaces, `src/lib/domain/**`,
  `src/seed/**`, the locked engines (`src/lib/xp/engine.ts`,
  `src/lib/achievements/**`, `src/lib/progress/engine.ts`), and any code that
  would write from an insights read path, add XP rules, add or change
  achievements, or add a dependency.

## 14. End-of-module handoff (verified)

- Current module complete/incomplete: **complete.**
- Changed files:
  - `src/features/insights/model.ts` (new),
    `src/features/insights/routes/InsightsPage.tsx`, `src/styles/design-system.css`
  - `tests/features/insightsModel.test.ts` (new), `tests/app/App.test.tsx`,
    `e2e/insights.spec.ts` (new)
  - Docs: `PROJECT_STATE.md`, `DECISIONS.md` (D-0037), `MODULE_CHECKLIST.md`,
    `CHANGELOG.md`, `TEST_PLAN.md`, `VALIDATION_LOG.md`, this plan.
- Validation status: **three consecutive clean `npm run validate` passes** (each:
  lint, format:check, typecheck, build with all chunks under the 600 kB warning
  budget, 160 unit tests across 27 files, 14 E2E tests, no circular dependencies,
  0 audit vulnerabilities).
- Confirmations: Dexie schema stayed version 2; insights values are derived only;
  opening and reloading `/insights` mutates no store (full-snapshot equality
  across every store); no XP awarded and no achievements unlocked from insights
  reads; no charts, no new dependencies, no new repository surface, no schema
  change, and no forecasts/coaching/streak branding were implemented.
- Known risks (deferred): the global dark-theme hardening of `.card--subtle`,
  `.card--accent`, and `.card--danger` remains deferred to Module 18 (Insights
  avoids them); charts and the deferred insight categories in section 5 remain
  unbuilt.
- Next module: **Module 16 - Settings, backup, import, reset (not started).**
