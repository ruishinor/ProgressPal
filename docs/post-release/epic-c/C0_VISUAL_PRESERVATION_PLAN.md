# Epic C / C0 — visual preservation plan

Status: **C0 reconciled against Bootstrap v7.0. Plan only; no capture,
comparison test, UI, CSS or asset change is made by C0.** Labels as in
`C0_PROGRAMME_ASSUMPTION_INVENTORY.md`.

This is the canonical C0 record for visual preservation. It supersedes the
original Cowork `C0_VISUAL_PRESERVATION.md`. [C] The original plan stored the
owner-review captures only in a gitignored `artifacts/` directory; a local
directory that later runs overwrite is not a durable accepted baseline. §4
replaces that with a hash-bound, retained baseline contract.

## 1. What visual protection exists today

[F] `e2e/b2-shell-visual-review.spec.ts`, `e2e/b3-hub-map-visual-review.spec.ts`
and `e2e/b4-shell-coherence-visual-review.spec.ts` **capture** full-page or
element screenshots into gitignored `artifacts/b{2,3,4}-*` directories for
owner review. They run inside the managed E2E suite, so every later E2E run
**overwrites** those files.

[F] No spec uses `toHaveScreenshot`, `toMatchSnapshot` or any pixel
comparison; no baseline image is committed; no capture is hash-bound. The
Playwright config retains automatic screenshots only on failure
(`playwright.config.ts`).

[F] Determinism differs by spec: B4 installs a fixed clock
(`page.clock.install`, 2026-09-19T12:00:00Z); B2 and B3 do not. All three use
the synthetic `completeOnboarding` helper and fixed viewports 390×844 and
1280×900.

[F] Structural protection that does exist: `tests/features/rpg/*`
(read-model values, presentation, shell), `tests/app/App.test.tsx` (rendered
text across routes), `e2e/accessibility.spec.ts` (axe),
`e2e/rpg-mobile-overflow.spec.ts` (layout overflow at mobile widths) and
`tests/architecture/rpgFeature.test.ts` (no remote/`data:` URLs or `@import`
in `rpg-*.css`).

Therefore: **screenshot capture exists; screenshot comparison, visual baseline
retention and hash binding do not.** Text and structure are protected;
rendered appearance is protected only by owner review of transient captures.
C0 does not claim visual regression protection exists.

## 2. Surfaces that carry programme identity

| Surface                   | Programme-specific visual element                                                                 | Source                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| RPG Hub, Hero, HUD        | guild emblem, guild/class/path labels, rank label                                                 | `RpgHeroIdentity.tsx`, `rpg-emblem-code-knights-primary.webp`, `readModels.ts` |
| RPG Badges / Achievements | 16 badge images keyed by achievement ID (12 WebP, 4 SVG, inlined as `data:` URIs), fallback glyph | `RpgAchievementArt.tsx`, `src/features/rpg/assets/badges/`                     |
| RPG Map                   | node ordinal from `week-N` IDs, fallbacks, progress track                                         | `RpgMapPage.tsx`                                                               |
| RPG shell palette         | `--rpg-*` tokens on `body.rpg-route-active`                                                       | `src/styles/rpg-tokens.css`, `rpg-shell.css`, `rpg-components.css`             |
| Classic shell palette     | `--color-*` tokens, light and `:root[data-theme='dark']`                                          | `src/styles/tokens.css`, `design-system.css`                                   |
| Brand                     | "ProgressPal CS50 Edition" in document title and shell headers                                    | `index.html`, `AppShell.tsx` ×2                                                |
| Course map / unit cards   | CS50 link block, unit guide, "Week progress"                                                      | `CourseUnitCard.tsx`                                                           |
| Learner avatar            | `public/assets/character-profile.png` — shared, learner-owned, **not** programme-owned            | `ProfileAvatar`                                                                |

## 3. When visual evidence is required

- Visual evidence must be **captured at the unchanged accepted baseline**
  before any Epic C production change, so the reference is pristine: C1.
- It must be **accepted and retained** before any theme/asset abstraction:
  C8 may not start without it.
- Text-only terminology work (C4) is protected by text oracles and existing
  rendered-text tests; C4 re-runs the capture set as a supplementary check but
  does not require pixel review unless its captures differ.
- Epic D navigation/HUD redesign is separate. Its visual contract is not
  defined here, and this plan must not be used to approve layout changes.

## 4. Baseline evidence contract (implemented by C1)

A capture is accepted visual baseline evidence only when all of the following
are recorded and bound:

| Element           | Requirement                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Baseline identity | Git commit and tree of the capture run (the owner-accepted C0 commit, before any C1+ production change); clean worktree proved at capture time                                       |
| Surface / route   | Exact route path for each capture (§5)                                                                                                                                               |
| State / fixture   | Named synthetic state (`fresh` = onboarded, no progress; `progressed` = defined synthetic actions) produced by code in the capture spec; no real learner data                        |
| Viewport          | 390×844 and 1280×900 (existing B2–B4 convention); `fullPage` capture                                                                                                                 |
| Theme             | Classic surfaces in light and dark; RPG surfaces under the default preference. If RPG rendering is found to vary with theme preference, C1 records that and captures both            |
| Browser / project | Playwright project name, `@playwright/test` version, Chromium revision and version as installed (at C0: Playwright 1.60.0, Chromium revision 1223 / 148.0.7778.96)                   |
| Environment       | OS name/version and the fact that fonts are system fonts (no bundled webfont); captures are comparable only within the same environment                                              |
| Determinism       | Fixed clock via `page.clock.install`; no running timers or time-relative copy on captured surfaces (or the state is recorded); animations disabled where practicable                 |
| Filenames         | `<viewport>-<shell>-<surface>-<state>[-<theme>].png`, e.g. `390-rpg-hub-progressed.png`, `1280-classic-dashboard-progressed-dark.png`                                                |
| Manifest          | A committed manifest under `docs/post-release/epic-c/` listing every file with SHA-256, route, state, viewport, theme, browser, environment, baseline commit/tree                    |
| Archive           | All captures sealed into one ZIP **immediately after** the baseline run, before any later E2E run can overwrite the working directory; the ZIP's SHA-256 is in the manifest          |
| Retention         | The ZIP is retained at a location the owner selects ([O] OD-8): committed to the repository, or held outside the working tree. A gitignored working directory alone is not retention |
| Owner review      | The owner reviews the capture set and records acceptance in the C1 closure record; acceptance binds the ZIP SHA-256                                                                  |

What each layer proves:

- The manifest proves **which** bytes were accepted and at which baseline. It
  makes the baseline tamper-evident; it does not by itself make it durable.
- Identical capture SHA-256 between baseline and a later candidate, **on the
  same environment**, is strong evidence that that capture rendered
  identically. Differing hashes do not by themselves prove a regression
  (anti-aliasing, font hinting, environment drift) and require owner
  side-by-side review.
- Source asset hashes and token-value oracles prove that CS50 asset bytes and
  token values are unchanged. They do **not** prove rendered visual parity.
- Automated pixel comparison is not adopted in Epic C: rendering uses system
  fonts, and CI (Ubuntu) and the owner machine (Windows) differ, so committed
  pixel snapshots would fail for environment reasons. If a later story needs
  automated comparison, it needs its own environment-pinned contract.

## 5. Minimum capture set

Captured at both viewports:

- RPG (default preference): Hub (`/rpg`, fresh and progressed), Map
  (`/rpg/map`, fresh and progressed), Module (`/rpg/week/week-0`), Resource
  (`/rpg/resource/week-0-lecture`), Focus (`/rpg/focus?itemId=week-0-lecture`,
  no running timer), Hero (`/rpg/hero`), Badges (`/rpg/badges`, with at least
  one earned and one locked badge), Log (`/rpg/log`), Settings
  (`/rpg/settings`).
- Classic (light and dark): Dashboard (`/dashboard`), Course map (`/course`),
  one content detail with a CS50 link and guide (`/course/week-0-problem-set`),
  Achievements (`/achievements`), Settings (`/settings`).

C1 may add a surface only if it carries programme identity not listed in §2.

## 6. Comparison procedure for later stories

1. Re-run the same C1 capture spec at the candidate commit, in the same
   environment recorded in the manifest, into a **different** output
   directory (never overwriting the retained baseline).
2. Hash every candidate capture and diff against the manifest.
3. Identical hashes: record as identical. Differing hashes: owner side-by-side
   review against the retained baseline archive; record the owner's verdict
   per capture in the story closure record.
4. If the environment differs from the manifest, record that, and rely on
   owner review rather than hash equality.

## 7. Assumptions later stories must preserve

- [F] RPG tokens apply only while `body.rpg-route-active` is set by
  `RpgRouteShell`; Classic tokens follow the learner's theme preference.
- [F] Badge art is inlined (`?inline`); moving it must keep chunks under the
  500 kB budget and must not introduce remote or `data:` CSS URLs.
- [F] All boot assets are statically imported so the service worker can
  precache them; no lazy programme asset chunks.
- [F] `AGENTS.md` forbids adding CS50/Harvard branding; any programme brand
  field must not increase it.
- [D] A new programme must not need copied frames or components to obtain a
  different appearance (C8 contract); C8 is not Epic D redesign.
