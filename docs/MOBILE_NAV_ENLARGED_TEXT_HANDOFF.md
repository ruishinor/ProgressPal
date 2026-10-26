# Mobile navigation enlarged-text correction

Local implementation and verification, 2026-10-26. Owner acceptance and consolidated exact-candidate review remain pending.

Worktree: `C:\Users\alex_\.codex\worktrees\8939\ProgressPal`, detached HEAD `c7f04b816cfa8b155df0b4a6986ddac86668ba77`. Existing uncommitted Activity and compact HUD work was preserved. No commit, push, PR, merge, deployment, provider operation or learner-data operation was performed.

## Confirmed cause and correction

Rendered Chromium reproduction confirmed a real label collision: at 320px and 200% root text, Campaign's label measured 101.125px inside a 59.125px link. Five equal columns, non-wrapping text and visible label overflow allowed it to cross neighbouring targets. Page overflow alone did not detect the collision.

The sole production change is in `src/styles/rpg-shell.css`: the existing mobile navigation becomes a named inline-size container. Below 18em of available inline space, relative to its text size, its five existing icons remain visible and labels use the existing screen-reader-only clipping pattern. The labels remain the links' accessible names. Links are centred, retain their original routes/order, focus styling and `aria-current` selection indicator, and remain at least 44px in both dimensions. At 320px/200%, targets measure approximately 59 × 88px. No new component state, measurement observer or dependency is needed.

Normal 320px/390px navigation retains icons and labels. Desktop retains icons and labels at both tested text sizes. Fixed positioning, safe-area expressions and the existing clearance variable are unchanged; the enlarged navigation remains shorter than its reserved space. This uses CSS container queries; browser verification covers the installed Chromium, not legacy engines without container-query support.

## Files touched in this correction

- `src/styles/rpg-shell.css`: navigation rules only; all HUD rules byte-preserved.
- `e2e/rpg-primary-nav-layout.spec.ts`: three focused viewport cases, each exercising normal and 200% root text.
- `docs/CURRENT_STATE.md`: bounded status note.
- `docs/MOBILE_NAV_ENLARGED_TEXT_HANDOFF.md`: this handoff.

`RpgPrimaryNav.tsx`, `e2e/rpg-mobile-hud.spec.ts`, all HUD components and all Activity files are unchanged. A pre-edit SHA-256 inventory and recovery copies are under gitignored `artifacts/nav-enlarged-before*`; before/after geometry is in `artifacts/nav-enlarged-{before,after}-measurements.json`.

## Verification

- **PASS:** existing navigation component suite, 1 file / 14 tests: `npm test -- tests/features/rpg/navigationConsolidation.test.tsx`.
- **PASS:** 8 existing browser cases covering mobile fixed clearance/content/toasts at 320/390/430px, selection in both themes at 390/1280px, and desktop keyboard order.
- **PASS:** 3 new browser cases at 320/390/1280px, each with 100% and 200% root text. They check each visible label fits its own target or is intentionally screen-reader-only, icons stay in separate targets, all five names/hrefs remain correct, centre hit testing, uninterrupted Tab order, visible keyboard focus, Enter activation for every destination, pointer activation, selected state, no page overflow and mobile clearance. Navigation-scoped axe checks passed in dark and light themes.
- **PASS:** TypeScript, lint, formatting, production build, bundle check and `git diff --check`. One production build was used; corrected test reruns reused it.
- Bundle: JavaScript gzip **439,727 / 445,000 bytes**, unchanged; CSS gzip **15,107 bytes**, up 64 bytes; largest JavaScript chunk **494,636 / 500,000 bytes**. No limit changed; bundle report has no warnings or violations.
- **OBSERVED:** actual rendered crops inspected at normal/enlarged mobile sizes, light/dark enlarged themes and enlarged desktop. Normal 320/390px and desktop 1280px at both text sizes produce byte-identical before/after navigation PNGs.

Initial new-test failures were test setup errors, not new product failures: route activation deliberately moves focus into main content, so Tab-order testing must precede route activation; programmatic focus after pointer use does not establish keyboard `:focus-visible` modality. The corrected tests retain the same focus/activation assertions and now explicitly enter keyboard modality and separate these two journeys. Initial static errors were confined to new test/capture-helper typing and globals and were corrected. Existing product code was not changed in response to these test errors. Playwright emitted the environment's NO_COLOR/FORCE_COLOR warning.

No full-repository test run or release certification was performed. Native device/browser font settings, other browser engines, physical safe-area devices and actual screen-reader speech were not tested; this verification uses Chromium with 200% root text, semantic accessible names and real keyboard input. Icons-only presentation at extreme enlargement is the owner-permitted tradeoff; visible text labels remain at normal sizes.

## Screenshots

Paths are relative to the worktree; all are synthetic data.

| View                          | Screenshot                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| Reproduced defect, 320px/200% | `artifacts/nav-enlarged-before-320-200.png`                                              |
| Normal 320px                  | `artifacts/nav-enlarged-after-320-100.png`                                               |
| Corrected 320px/200%, dark    | `artifacts/nav-final-320-200-dark.png`                                                   |
| Corrected 320px/200%, light   | `artifacts/nav-final-320-200-light.png`                                                  |
| Normal 390px                  | `artifacts/nav-enlarged-after-390-100.png`                                               |
| Corrected 390px/200%, dark    | `artifacts/nav-final-390-200-dark.png`                                                   |
| Desktop normal / enlarged     | `artifacts/nav-enlarged-after-1280-100.png`, `artifacts/nav-enlarged-after-1280-200.png` |

## Next owner action

Inspect the fixed navigation once at 320px and 390px with normal and 200% root text, then proceed to consolidated exact-candidate review. This handoff is implementation evidence, not an independent review or release authorization. Do not start another general UI iteration or provider rollout from this correction.
