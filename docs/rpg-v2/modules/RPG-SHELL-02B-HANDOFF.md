# RPG Shell Phase 2B Handoff - Navigation and Shell Hygiene

## Module

RPG Shell Phase 2B - corrective patch for RPG shell navigation hygiene only.
No page content logic, focus/session, achievements, insights, settings, profile,
or engine behavior was changed.

## Mode

Mode B - corrective patch.

## Purpose

Fix shell-level navigation defects called out in the Phase 2A wrapper contract:
scroll position on route change, white flash on internal navigation, the mobile
blue tap flash, "RPG Map" copy, bottom-nav label clarity, and an imbalanced HUD
Level display - without touching any wrapped capability behavior.

## Files changed

- `src/features/rpg/shell/RpgShell.tsx`
- `src/features/rpg/shell/RpgBottomNav.tsx`
- `src/styles/rpg-shell.css`
- `src/features/rpg/routes/RpgHomePage.tsx`
- `src/features/rpg/routes/RpgModulePage.tsx`
- `src/features/rpg/routes/RpgBadgesPage.tsx`
- `src/features/rpg/routes/RpgHeroPage.tsx`
- `src/features/rpg/routes/RpgLogPage.tsx`
- `vitest.setup.ts`
- `tests/app/App.test.tsx`
- `docs/rpg-v2/modules/RPG-SHELL-02B-HANDOFF.md`

## What changed and why

### 1. Scroll to top on route change

`RpgShell` now reads the React Router location and calls
`window.scrollTo({ left: 0, top: 0 })` whenever `location.pathname` changes.
`RpgShell` is the persistent layout for every `/rpg/*` child route, so this fires
on each internal RPG navigation. Scroll is instant, which respects reduced-motion
(no smooth scroll is introduced).

### 2. White flash on internal navigation

The RPG routes render on a separate router branch from the classic `AppShell`,
but `.rpg-shell` had no background of its own, so the dark RPG panels floated on
the light app `<body>` canvas. During route swaps the light canvas showed
through as a white flash. `RpgShell` now adds a `rpg-route-active` class to
`<body>` while mounted (mirroring the existing `body.dialog-open` pattern), and
`body.rpg-route-active` paints the full-viewport dark RPG canvas. The class is
removed on unmount, so classic routes are unaffected.

### 3. Mobile blue tap flash

Added `-webkit-tap-highlight-color: transparent` to RPG links and buttons inside
`.rpg-shell`. This removes the mobile tap-highlight flash. Keyboard focus is not
affected: the global `:focus-visible` outline in `base.css` still applies to all
links/buttons, including the bottom-nav and HUD quest links.

### 4. "RPG Map" copy removed

The map page heading was already "Campaign Map". The remaining visible "RPG map"
copy was in cross-link button labels only. These label strings were changed
(no logic, structure, or routing change):

- "Open RPG map" -> "Open Campaign Map" (Home, Hero, Badges, Log pages)
- "Back to RPG map" -> "Back to Campaign Map" (Module/week page)

The bottom-nav label for `/rpg/map` remains "Map" (the contract sanctions
"Map or Campaign"; "Map" fits the seven-column mobile nav and the page heading
already reads "Campaign Map").

### 5. Bottom-nav label clarity

- "Log" -> "Insights" (matches the Phase 2A contract; fits the existing nav
  footprint, same width as "Settings").
- "Badges" -> "Awards". "Achievements" is the preferred plain term but does not
  fit the seven-column mobile bottom nav; "Awards" is the contract-sanctioned
  short equivalent and matches the previous "Badges" footprint.

The page headings ("Badge Gallery", "Journey Log") are page content and were
left unchanged; they are addressed when those surfaces are wrapped in Phases 2D
and 2E.

### 6. HUD Level display

`.rpg-hero-hud__level` changed from a large stacked, padded box to a compact
inline "Level 1" pill (baseline-aligned label + value, pill radius, tighter
padding, sized to content). The value dropped from `--text-xl` to `--text-lg`.
On mobile the level no longer stretches to fill its row; it stays a compact,
vertically centered pill. Markup and the `aria-label="Hero level"` are unchanged.

### 7. Test support

`vitest.setup.ts` stubs `window.scrollTo` (jsdom does not implement it), matching
the existing `matchMedia` stub. `tests/app/App.test.tsx` assertions were updated
for the new nav labels ("Awards", "Insights") and the new cross-link copy
("Open Campaign Map", "Back to Campaign Map"). No new tests were added; existing
route/nav assertions were kept and re-pointed.

## Scope Discipline Check

- Intended module: RPG Shell Phase 2B - navigation/shell hygiene.
- Work mode: corrective patch.
- Focus/session behavior changed: no.
- Achievements behavior changed: no.
- Insights behavior changed: no.
- Settings behavior changed: no.
- Profile behavior changed: no.
- Engine/data/schema changed: no.
- Router/route table changed: no.
- Page content logic changed: no (only cross-link label strings and CSS).
- Backend/auth/sync/analytics/telemetry/AI changed: no.
- Dependencies changed: no.
- Assets added: no.
- Campaign map redesigned: no.
- Reward feedback added: no.
- Phase 2C started: no.
- Keyboard focus preserved: yes (global `:focus-visible` outline intact).
- Bottom nav preserved (still seven stable items): yes.

## Validation

- `npm run build`
- `npm run format:check`
- `git diff --check`
- `npm run lint`
- `npm run typecheck`
- `npm run test -- tests/app/App.test.tsx tests/architecture/routeDefinitions.test.ts`

## Manual QA

### Code-supported / test-supported (verified in this change)

These are covered by source review and the passing `tests/app/App.test.tsx`
suite; no browser was required to confirm them:

- Bottom nav reads: Hub, Map, Focus, Hero, Awards, Insights, Settings (asserted
  in the bottom-nav test).
- No visible copy says "RPG Map"; cross-links say "Open/Back to Campaign Map"
  (asserted by the updated link-name queries).
- A scroll-to-top effect runs on every `/rpg/*` route change (present in
  `RpgShell`; `window.scrollTo` is stubbed in tests, so the effect is exercised
  but the resulting scroll position is not asserted).
- Keyboard focus styling is preserved: the change adds no outline override and
  leaves the global `:focus-visible` rule in `base.css` intact.

### Requires real browser / mobile verification (NOT yet observed)

These are visual/interaction outcomes that were not run in a browser or on a
device and still need manual confirmation before sign-off:

- `/rpg` to `/rpg/map` and `/rpg/map` to `/rpg/focus` actually scroll to the top
  in the browser.
- Internal button navigation does not flash white (dark RPG canvas persists
  through the transition).
- Mobile nav/button taps do not produce the blue tap-highlight flash.
- Keyboard focus remains visibly outlined on the bottom-nav and in-page controls.
- HUD "Level 1" reads as one balanced, compact unit on mobile and desktop.
