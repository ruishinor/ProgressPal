# RPG Shell Phase 2E Handoff - Insights as a Classic-Wrapped Capability

## Module

RPG Shell Phase 2E - make `/rpg/log` ("Insights" in the bottom nav) a visual
wrapper over the classic Insights capability, not a separate RPG journey-log
system. "Color it and leave it."

## Mode

Mode B - corrective patch.

## Summary

`/rpg/log` previously rendered a parallel "Journey Log" invention with its own
read model (`loadRpgJourneyLogSummary` -> `RpgJourneyLogSummary`), its own
"local activity totals" panel, and a bespoke per-event activity list (progress /
study-session / XP entries with type pills, timestamps, context labels, notes,
and per-entry action buttons).

This phase replaces that invention with the classic Insights surface, extracted
into one shared component rendered by both routes. The data sources, derived
metrics, empty states, and the read-only data path are now the classic ones;
only the section wrapper and route header differ by variant. The bespoke Journey
Log activity list is gone, and the visible heading is now "Insights" (the
product concept), not "Journey Log".

## Classic component reused / shared component extracted

Direct reuse was not possible because the classic `InsightsPage` rendered a
fixed classic `PageHeader` with no shell variant. Following the Phase 2C/2D
precedent, the classic page body was extracted into a new shared component:

```text
src/features/insights/components/InsightsSurface.tsx
```

It takes a single `variant: 'classic' | 'rpg'` prop. The variant only changes:

- the section wrapper class (`page-section` vs `page-section rpg-log`);
- the route header (classic `PageHeader` vs the RPG `.rpg-log__header` with
  eyebrow / "Insights" title / lede / "Back to Hub" / "Open Campaign Map").

Everything else - the read-only multi-store load, `buildLongFormProgressMap`,
`buildCourseMap`, `buildInsightsModel`, and the seven derived cards (Course
progress, Effort over time, XP over time, Study mode breakdown, Active days,
Recorded completion awards, Achievement timeline) with their captions, tables,
and per-card empty states - is shared and unchanged.

`InsightsSurface` lives in `insights` (not `rpg`) on purpose: it imports the
database layer (`getAchievementsView`, `listStudySessions`, etc.), and the
RPG-feature architecture boundary forbids RPG UI files
(`components`/`routes`/`shell`) from importing `@/lib/db`. The RPG route imports
only the component, so the boundary is preserved (verified by
`tests/architecture/rpgFeature.test.ts`).

## Files changed

- `src/features/insights/components/InsightsSurface.tsx` (new shared surface)
- `src/features/insights/routes/InsightsPage.tsx` (now `<InsightsSurface variant="classic" />`)
- `src/features/insights/index.ts` (export the shared surface)
- `src/features/rpg/routes/RpgLogPage.tsx` (now `<InsightsSurface variant="rpg" />`; no longer imports `loadRpgJourneyLogSummary` or any `RpgJourneyLog*` type)
- `src/styles/rpg-components.css` (removed the dead bespoke Journey Log CSS: `__totals`, `__totals div`, `__totals dt`/`__timestamp`, `__totals dd`, `__activity-list`, `__activity-item`, `__activity-header`, `__activity-detail`, `__context`, `__note`, `__entry-actions`; kept the `.rpg-log` / `.rpg-log__header` / `__eyebrow` / `__lede` / `__actions` classes used by the RPG header)
- `tests/app/App.test.tsx` (retargeted the `/rpg/log` tests, the route-heading table, and `waitForRpgRouteReady` to the classic Insights surface; renamed the seed helper to `seedOnboardedLearnerWithInsightsActivity`)
- `e2e/release-candidate.spec.ts` (`/rpg/log` heading `Journey Log` -> `Insights`)
- `e2e/rpg-mobile-overflow.spec.ts` (`/rpg/log` heading `Journey Log` -> `Insights`; `headerSelector` `.rpg-log__header` and path unchanged)
- `docs/rpg-v2/modules/RPG-SHELL-02E-HANDOFF.md`

## What changed visually

- `/rpg/log` now shows the classic Insights surface (the seven derived cards)
  inside the RPG shell, under an RPG route header titled "Insights".
- The bespoke "Local activity totals" panel and the per-event "Saved local
  activity" list are removed. The same effort, XP, mode, active-days, completion,
  and achievement-timeline truth is now read from the classic Insights model.
- The classic inner cards/tables keep their classic styling; the RPG "coloring"
  is the surrounding shell, dark canvas, Hero HUD, bottom nav, and route header.
- The bottom-nav label was already "Insights"; the page heading now matches it.

## What engine/data behavior did NOT change

- No new insights model. `/rpg/log` and `/insights` both call the existing pure
  `buildInsightsModel` over the existing immutable ledgers (`study_sessions`,
  `media_progress_events`, `xp_transactions`, `achievement_unlocks`) plus the
  current course snapshot.
- No fake timeline/journey entries. Every value is derived from real saved
  records; with no records, the classic per-card empty states render.
- No passive writes: opening either route mutates no local store. The App-level
  "without mutation" snapshot tests assert full-store equality for `/rpg/log`
  (empty and seeded) and for `/insights`.
- Classic `/insights` preserves the same underlying insight truth and behavior;
  existing classic Insights tests still pass. (This is not a byte-identical
  claim - the RPG variant differs in shell/header styling.)
- No schema / dependency / backend / auth / sync / analytics / AI changes.
- Route table unchanged: `/rpg/log` remains the route path.

## Acceptance

- Classic `/insights` still works.
- RPG `/rpg/log` displays the same underlying insight truth as classic Insights.
- RPG `/rpg/log` is visually wrapped, not a second insights engine.
- No fake journey-log entries remain.
- No passive route-load writes are introduced.
- Route remains `/rpg/log`.
- Heading is "Insights".
- Validation is targeted and proportional.

## Follow-up (not done here, out of scope)

- `loadRpgJourneyLogSummary` / `buildRpgJourneyLogSummary` and the
  `RpgJourneyLog*` types in `src/features/rpg/model/readModels.ts`,
  `src/features/rpg/model/types.ts`, and `src/features/rpg/index.ts` are no
  longer used by any route. They are retained only because
  `tests/features/rpg/readModels.test.ts` still covers them, so they are not yet
  "unused" per the removal rule. They are a candidate for later removal once
  that test is also retired and removal is explicitly approved.
- The Hero route (`/rpg/hero`) still links to this route with the label "Open
  Journey Log". That copy was left untouched because Hero/Profile work is out of
  scope for this phase; it is a candidate for relabel to "Open Insights".
- The shared Insights body's "View achievements" link targets classic
  `/achievements` in both variants (the body is rendered identically). Making it
  shell-aware (`/rpg/badges` in the RPG shell) is a later enhancement; it was
  left identical to avoid a second body and to keep achievement-route linking out
  of scope.

## Scope Discipline Check

- Intended module: RPG Shell Phase 2E - Insights classic wrapper.
- Work mode: corrective patch.
- Classic Insights behavior changed: no; classic `/insights` preserves the same
  underlying insight truth and behavior, with existing classic Insights tests
  still passing.
- Second insights model / new insights logic added: no.
- Fake timeline/journey entries added: no (the bespoke list was removed).
- Passive writes on route load: no (read-only; snapshot tests guard it).
- Route/route table changed: no (`/rpg/log` retained).
- Engine/data/schema/backend/auth/sync/analytics/AI/dependencies changed: no.
- Achievement / Focus / Settings / Hero-Profile / Resource / Campaign-Map / asset
  work started: no.

## Validation

- `npm run lint` - clean.
- `npm run typecheck` - clean.
- `npm run build` - succeeds.
- `npm run format:check` - all files match Prettier.
- `git diff --check` - clean (only benign LF->CRLF advisories).
- `npm run test -- tests/app/App.test.tsx` - passes.
- Also run for boundary / model / read-model safety:
  `npm run test -- tests/architecture/rpgFeature.test.ts tests/architecture/achievementsFeature.test.ts tests/features/insightsModel.test.ts tests/features/rpg/readModels.test.ts`
  (5 files, 111 tests, all passing alongside `App.test.tsx`).

## Manual QA

No live browser/manual visual QA was performed in this phase.

Code-supported checks covered:

- `/insights` renders the shared Insights surface with the classic header and seven derived cards.
- `/rpg/log` renders the same derived insight truth inside the RPG shell, under an "Insights" header.
- The empty state uses the classic per-card copy, not a fake journey entry.
- Passive route load writes nothing; App-level snapshot tests cover this for both empty and seeded `/rpg/log` cases.

Manual browser QA remains optional before merge if visual confidence is needed.
