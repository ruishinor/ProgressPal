# RPG Shell Phase 2D Handoff - Achievements as a Classic-Wrapped Capability

## Module

RPG Shell Phase 2D - make `/rpg/badges` ("Awards" in the bottom nav) a visual
wrapper over the classic achievements capability, not a separate RPG badge
system. "Color it and leave it."

## Mode

Mode B - corrective patch.

## Summary

`/rpg/badges` previously rendered a parallel "Badge Gallery" invention with its
own read model surface (`loadRpgBadgeGallerySummary` -> `RpgBadgeGallerySummary`),
its own earned/locked vocabulary, a bespoke summary panel (earned/locked/total),
bespoke badge cards, and a single-letter medallion that printed `E` for earned
and `L` for locked.

This phase replaces that invention with the classic achievements surface,
extracted into one shared component rendered by both routes. The achievement
definitions, earned/locked truth, requirement copy, filters, and the read-only
data path are now the classic ones; only the section wrapper and route header
differ by variant. The `E`/`L` medallion is gone (the classic card conveys state
with a `Unlocked`/`Locked` status pill, not a letter).

## Classic component reused / shared component extracted

Direct reuse was not possible because the classic `AchievementsPage` renders a
fixed classic `PageHeader` with no shell variant. Following the Phase 2C
precedent, the classic page body was extracted into a new shared component:

```text
src/features/achievements/components/AchievementsSurface.tsx
```

It takes a single `variant: 'classic' | 'rpg'` prop. The variant only changes:

- the section wrapper class (`page-section` vs `page-section rpg-badges`);
- the route header (classic `PageHeader` vs the RPG `.rpg-badges__header` with
  eyebrow / "Achievements" title / lede / unlocked-count meta / "Back to Hub" /
  "Open Campaign Map").

Everything else - the read-only `getAchievementsView` + `getXpSummary` load, the
status/category filters, the achievement grid, the per-achievement cards
(`Unlocked`/`Locked` pill, "Earned for:" / "How to unlock:" requirement copy,
category + XP badges, unlock date) - is shared and unchanged.

`AchievementsSurface` lives in `achievements` (not `rpg`) on purpose: it imports
the database layer (`getAchievementsView`, `getXpSummary`), and the RPG-feature
architecture boundary forbids RPG UI files (`components`/`routes`/`shell`) from
importing `@/lib/db`. The RPG route imports only the component, so the boundary
is preserved (verified by `tests/architecture/rpgFeature.test.ts`).

## Files changed

- `src/features/achievements/components/AchievementsSurface.tsx` (new shared surface)
- `src/features/achievements/routes/AchievementsPage.tsx` (now `<AchievementsSurface variant="classic" />`)
- `src/features/achievements/index.ts` (export the shared surface)
- `src/features/rpg/routes/RpgBadgesPage.tsx` (now `<AchievementsSurface variant="rpg" />`)
- `src/styles/rpg-components.css` (removed the dead bespoke badge CSS: `__summary`, `__grid`, `__card`, `__card-header`, `__mark` (the `E`/`L` medallion), `__details`, and the now-unused `__category`/`__note` selectors and their 720px media-query entries; kept the `.rpg-badges` / `.rpg-badges__header` / `__eyebrow` / `__lede` / `__actions` classes used by the RPG header)
- `tests/app/App.test.tsx` (retargeted the `/rpg/badges` tests, the route-heading table, and `waitForRpgRouteReady` to the classic achievements surface)
- `tests/architecture/achievementsFeature.test.ts` (the read-only guard now scans both the route file and the shared surface, since the read logic moved into the surface)
- `docs/rpg-v2/modules/RPG-SHELL-02D-HANDOFF.md`

## What changed visually

- `/rpg/badges` now shows the classic achievements surface (status/category
  filters + the achievement-card grid) inside the RPG shell, under an RPG route
  header titled "Achievements".
- The `E`/`L` single-letter medallion is removed. Earned/locked state reads from
  the classic `Unlocked` / `Locked` status pill and the card accent, exactly as
  the classic route.
- The bespoke "Badge summary" (earned/locked/total) panel is replaced by the
  classic unlocked-count meta ("N of M unlocked") in the header plus the classic
  per-card state.
- The classic inner controls (filter card, achievement cards) keep their classic
  styling; the RPG "coloring" is the surrounding shell, dark canvas, Hero HUD,
  bottom nav, and route header. Deeper visual theming of the inner surface
  (e.g. a neutral earned/locked medallion) is intentionally deferred - no
  redesign, no fake badge art, and no asset import in this phase.

## What engine/behavior did NOT change

- Achievement definitions are untouched (`src/lib/achievements/definitions.ts`).
- Earned/locked truth still comes from `getAchievementsView`, which merges the
  code-only definitions with the persisted `achievement_unlocks` store. It
  evaluates no rules and writes nothing.
- Requirement copy is the definition `description`, shown verbatim.
- No achievement unlocks on page load: opening either route mutates no local
  store. This is enforced for the moved logic by the extended
  `tests/architecture/achievementsFeature.test.ts` (read-only guard now covers
  the shared surface) and by the App-level "without mutation" snapshot tests.
- No second achievement model, no fake badge progress, no schema/dependency/
  backend/auth/sync/analytics/AI changes.
- Classic `/achievements` intentionally preserves the same behavior and
  user-facing achievement truth; existing classic achievements tests still pass.

## Placeholder / asset note

No assets were imported and no `ASSETS.md` entry was added. The surface uses no
badge artwork at all: earned/locked is conveyed by the existing classic status
pill (text), which satisfies "no learner initials / no fake specific badge art".
A neutral CSS/SVG medallion remains an allowed future enhancement once approved
assets exist.

## Follow-up (not done here, out of scope)

- `loadRpgBadgeGallerySummary` in `src/features/rpg/model/readModels.ts` is no
  longer used by the page but is retained because
  `tests/features/rpg/readModels.test.ts` still covers it and
  `buildRpgBadgeGallerySummary` is still used by the Hero profile read model.
  It is a candidate for later cleanup once its removal is explicitly approved.
- The Hero route (`/rpg/hero`) still links to this route with the label "Open
  Badge Gallery". That copy was left untouched because Hero/Profile work is
  out of scope for this phase.

## Scope Discipline Check

- Intended module: RPG Shell Phase 2D - Achievements classic wrapper.
- Work mode: corrective patch.
- Classic achievements behavior changed: no; classic /achievements intentionally preserves the same behavior and user-facing achievement truth, with existing classic achievements tests still passing.
- Second achievement model / new achievement logic added: no.
- Fake badge progress added: no.
- Achievement unlocks on page load: no (read-only; guarded by tests).
- Learner "L"/initial as badge art: removed.
- Unapproved visual assets added: no.
- Engine/data/schema/backend/auth/sync/analytics/AI/dependencies changed: no.
- Router/route table changed: no.
- Insights / Settings / Hero-Profile / Resource work started: no.

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run format:check`
- `git diff --check`
- `npm run test -- tests/app/App.test.tsx`
- Also run for boundary/read-model safety:
  `npm run test -- tests/architecture/achievementsFeature.test.ts tests/architecture/rpgFeature.test.ts tests/features/rpg/readModels.test.ts tests/architecture/localOnly.test.ts`

## Manual QA

- Open classic `/achievements`: unchanged (same header, filters, cards).
- Open `/rpg/badges`: the same achievement set and unlock state inside the RPG
  shell, under an "Achievements" header.
- Confirm locked/earned states are readable (status pill + requirement copy).
- Confirm no learner "L" (or any single-letter medallion) appears as badge art.
- Confirm a passive route load writes nothing (App-level snapshot tests cover
  this; the locked + earned `/rpg/badges` tests assert snapshot equality).
