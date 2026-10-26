# Shared mobile RPG HUD — local handoff

2026-10-26. Implemented and locally verified; owner visual/functional acceptance is next. No release or independent-review certification is claimed.

## Worktree and source fit

Worktree: `C:\Users\alex_\.codex\worktrees\8939\ProgressPal`. Expected and verified detached HEAD: `c7f04b816cfa8b155df0b4a6986ddac86668ba77`. The 69 pre-existing uncommitted files were fingerprinted before editing in `artifacts/mobile-hud-before.json`; original HUD source copies are in `artifacts/mobile-hud-before/`. Earlier Activity implementation, schema-5 preparation, ACT-01/ACT-02 and both Activity UI corrections remain preserved.

Final Git state: 54 modified tracked files, 21 untracked files and zero staged files, including all earlier work. Of the 69 preflight files, only the four explicitly scoped pre-existing HUD/navigation/status files changed; the other 65 retain identical hashes. Four previously clean tracked files and the two new files listed below complete this pass. Final evidence: `artifacts/mobile-hud-preservation.json`; HEAD remains detached and unchanged.

The controlling source is `src/app/router/router.tsx`, `RpgShell`, `RpgHeroIdentity` and the shared responsive CSS. The change fits these existing components without changing learner-state ownership, queries, calculations or route definitions.

Actual consumers:

- Persistent full HUD: Campaign (`/rpg/map`), week/module (`/rpg/week/:unitId`), Awards (`/rpg/badges`), Insights (`/rpg/log`), Settings (`/rpg/settings`) and Activity (`/rpg/movement`).
- Persistent shorter HUD: Home (`/rpg`), Focus (`/rpg/focus`) and resources (`/rpg/resource/:itemId`). Their existing quest-inclusion rules remain unchanged. Home presents its quest in the page body.
- Hero Profile (`/rpg/hero`) uses the identity and level components in its own panel and intentionally has no persistent HUD. Its presentation is unchanged.
- Immersive microlearning (`/rpg/micro`) and tracks (`/rpg/track/:trackId`) are siblings of `RpgShell`, not consumers. They retain their intentional absence of the HUD and primary navigation.

## Presentation and tradeoffs

At the existing phone breakpoint, 42rem and below, avatar/name, the secondary Activity Level link, educational level/XP, Settings and the existing current-quest title/action stay visible. The Settings strip reserves space only beside identity, freeing the quest row to use the full width. The avatar remains 48px; interactive targets remain at least 44px without shrinking text.

A native **Details** disclosure, named **Character details** for assistive technology, shares a row with XP when space allows. Programme, rank, guild, class, path and the applicable quest reward/unit/duration are available inside it. Those are secondary facts: viewing them now takes one explicit action on a phone, in exchange for substantially earlier access to the page. The quest action itself is always available wherever the original HUD showed it.

The shell follows the repository's existing `matchMedia` pattern to place one copy of each fact in the appropriate presentation. This state is transient presentation state only; the listener cleans up on unmount. The pure identity component still defaults to its original complete presentation, keeping Hero Profile and desktop unchanged. No new dependency, framework, statistic, badge, asset, animation or global navigation destination was added.

Flexible rows stack XP/disclosure and quest text/action when enlarged text requires it. Long expanded values wrap within their available width. The visual review caught a real 200% text-size issue that the page-overflow assertion missed: the initial quest grid forced a letter-by-letter title column and some expanded values clipped. That was corrected with scoped wrapping and direct text-container width/clipping assertions; ordinary phone layout and desktop remain unchanged by that correction.

## Measured result

Same synthetic learner, programme, theme and routes before/after, measured against production artifacts. These values describe the main content container's top, not a browser toolbar or physical-device viewport.

| Surface                         | Width  | HUD before → after                  | Page content top before → after |
| ------------------------------- | ------ | ----------------------------------- | ------------------------------- |
| Full HUD, Campaign and Activity | 320px  | 383.75 → **215.38px** (44% shorter) | 411.75 → **243.38px**           |
| Full HUD, Campaign and Activity | 390px  | 301.16 → **215.38px** (28% shorter) | 329.16 → **243.38px**           |
| Home's shorter HUD              | 320px  | 219.75 → **151.59px** (31% shorter) | 247.75 → **179.59px**           |
| Home's shorter HUD              | 390px  | 200.16 → **151.59px** (24% shorter) | 228.16 → **179.59px**           |
| Full desktop HUD                | 1280px | **113 → 113px**                     | **216.59 → 216.59px**           |
| Home desktop HUD                | 1280px | **82 → 82px**                       | **185.59 → 185.59px**           |

All nine persistent-HUD routes were measured at 320/390/1280px. The sampled desktop Home/Campaign/Activity HUD PNGs are byte-identical before and after. Hero Profile viewport PNGs are byte-identical at all three widths. Exact data and comparisons: `artifacts/mobile-hud-before-measurements.json`, `mobile-hud-after-measurements.json`, `mobile-hud-comparison.json`; capture helper `artifacts/capture-mobile-hud.mjs`.

## Changed files

- `src/features/rpg/components/RpgHeroIdentity.tsx`: optional secondary-detail placement and reuse of the same pure identity facts.
- `src/features/rpg/components/index.ts`: identity-detail export for the shell.
- `src/features/rpg/shell/RpgShell.tsx`: phone presentation, native disclosure and existing programme title from app scope; recommendation logic and read paths are unchanged.
- `src/styles/rpg-shell.css`: scoped phone layout, targets, disclosure and enlarged-text reflow.
- `tests/features/rpg/shell.test.tsx`: single-copy facts, responsive transition, listener cleanup and no additional progress read.
- `e2e/rpg-mobile-hud.spec.ts`: shared consumers/exclusions, navigation, focus, touch targets, both disclosure states/themes, axe and enlarged text.
- `e2e/rpg-hud-quest-metadata.spec.ts`, `e2e/rpg-primary-nav-layout.spec.ts`: existing checks now open the phone disclosure to inspect secondary facts; duration, containment, action and route assertions remain enforced.
- `docs/CURRENT_STATE.md` and this handoff: scoped status and evidence.

No Activity feature/model/domain/repository/style/test file, schema, XP/mastery, achievement, programme content, backup/provider file, dependency manifest, release setting or service worker was changed in this pass. The earlier uncommitted Activity work remains in the same worktree. Nothing was staged, committed, pushed, merged, tagged, deployed or applied to Nhost.

## Verification

- **PASS, 5 files / 30 tests:** `npm test -- tests/features/rpg/shell.test.tsx tests/features/rpg/components.test.tsx tests/features/rpg/recommendationViews.test.tsx tests/features/rpg/a4RouteReadComposition.test.tsx tests/features/rpg/heroRecentBadges.test.tsx`. This covers responsive lifecycle/cleanup, existing identity and profile primitives, actionable/blocked/completed/unavailable quest behavior, shared read composition and badges.
- **PASS, 13/13 browser checks on the final product source:** `npm run test:e2e -- e2e/rpg-mobile-hud.spec.ts e2e/rpg-hud-quest-metadata.spec.ts e2e/rpg-primary-nav-layout.spec.ts --grep "shared mobile HUD|mobile HUD reflows|HUD Current quest metadata|compact HUD keeps every|logical keyboard path"`. The managed command includes the production build and owns/tears down its preview. New cases check 320/390/1280px, all shared consumers, immersive/Profile exclusions, quest/Settings/Activity/Profile navigation, five unchanged destinations, single-copy secondary facts, 44px targets, Enter/Space/focus, reduced-motion context, light/dark axe and 200% text. Existing metadata tests retain real long quest titles, compound-duration line-box checks and action containment at 320–1280px; existing HUD route checks also cover 360/430/768px.
- Initial new-test failures were test-authoring errors: treating the intentionally immersive micro route as a HUD consumer, and matching a programme/path value that legitimately occurs under two different labels. Source inspection corrected the consumer set and a semantic path selector; production code was not changed to satisfy those test mistakes.
- The first visual review found the enlarged-text product defect described above. A narrow CSS correction, stronger readable-width/clipping assertions and an appropriate final production rebuild resolved it. The final 13-test run passed without retry or skip. Earlier targeted runs are diagnostic evidence, not claimed as additional independent clean passes.
- Before/after captures: `node artifacts/capture-mobile-hud.mjs before` and `node artifacts/capture-mobile-hud.mjs after`, with the relevant built artifact in `dist/`. Each uses its own synthetic browser context and closes its browser/preview. The final after captures were refreshed after the CSS correction.
- **PASS, bundle:** `npm run check:bundle`. JavaScript gzip **439,727 B / 445,000 B**; largest JS raw **494,636 B / 500,000 B**; CSS gzip **15,043 B**. Curriculum/runtime gzip remain **126,984 / 6,398,912 B**. No warnings or violations; no limit changed. Report: `artifacts/mobile-hud-bundle-budget.json`.
- **PASS — final checks:** `npm run typecheck`, `npm run lint` (zero warnings), `npm run format:check`, `git diff --check`, unchanged detached HEAD and the preservation comparison above. No full repository regression universe, dependency upgrade or release-certification pipeline was run for this bounded presentation change.

## Rendered review

Actual screenshots inspected, including closed/open, light/dark, enlarged text and desktop:

- 320px HUD: [before](../artifacts/mobile-hud-before-strip-map-320.png), [after](../artifacts/mobile-hud-after-strip-map-320.png).
- 390px Campaign: [before](../artifacts/mobile-hud-before-map-390.png), [after](../artifacts/mobile-hud-after-map-390.png).
- [320px Home after](../artifacts/mobile-hud-after-home-320.png).
- [320px expanded, light](../artifacts/mobile-hud-expanded-320-light.png), [390px expanded, dark](../artifacts/mobile-hud-expanded-390-dark.png).
- [200% text, closed](../artifacts/mobile-hud-closed-320-enlarged.png), [expanded details close-up](../artifacts/mobile-hud-details-320-enlarged.png).
- [Desktop after](../artifacts/mobile-hud-after-map-1280.png); sampled desktop and Profile images are byte-identical to their before counterparts.

Screenshots and measurements are local, gitignored evidence. A viewport-fixed navigation bar can overlap a portion of an element capture taller than the viewport; the actual layout assertions and rendered review were assessed together.

## Requirement audit and remaining limits

The objective's compact shared presentation, earlier page content, retained essential facts/actions, accessible secondary details, touch/keyboard operation, enlarged-text reflow, unchanged desktop/Profile, preservation boundaries and named verification/deliverables are supported by the source, final tests, measurements, images and preservation report above. No Activity-specific workaround or new HUD data owner was introduced.

Physical touch keyboards, other browser/OS rendering and actual screen-reader speech are **not tested**. Native disclosure semantics, DOM labels, keyboard behavior and Chromium axe results are verified within the stated scope. Expanded details intentionally increase height, and very long names/large text may wrap. At 200% text on a 320px viewport, the existing fixed primary-navigation labels can crowd; that separate navigation styling is unchanged. No application-wide localization was added: the existing shell terminology remains English, while the Activity link retains its existing programme-language behavior.

## Next owner action

From this worktree, use the existing local server or run `npm run dev -- --host 127.0.0.1`, then open `/rpg/map` at Vite's printed address. Review the closed and expanded HUD at 320px and 390px, then Home, Focus, a resource, Settings and Activity. Try the avatar, Activity Level, Settings and quest action with keyboard/touch; compare desktop and Hero Profile. Owner visual/functional acceptance is pending. No preview is intentionally left running, and no release integration or provider action follows automatically.
