# Epic C / C0 — visual-preservation prerequisites

Status: **PREREQUISITES DEFINED**. No UI, CSS or asset was changed. Labels:
[F] fact, [I] inference, [D] proposed decision, [O] owner decision,
[X] deferred.

## 1. What visual protection exists today

[F] `e2e/b2-shell-visual-review.spec.ts`, `b3-hub-map-visual-review.spec.ts`
and `b4-shell-coherence-visual-review.spec.ts` **capture** screenshots into
gitignored `artifacts/` folders for owner review. No spec uses
`toHaveScreenshot` or any pixel comparison; no baseline image is committed.
Playwright keeps screenshots only on failure.

[F] Structural protection that does exist: `tests/features/rpg/*` (read-model
values, presentation, shell), `tests/app/App.test.tsx` (rendered text across
routes), `e2e/accessibility.spec.ts` (axe), `e2e/rpg-mobile-overflow.spec.ts`
(layout overflow at mobile widths), and `tests/architecture/rpgFeature.test.ts`
(no remote/`data:` URLs or `@import` in `rpg-*.css`).

[I] Therefore a theme/asset abstraction would currently have **no automated
oracle for pixels, tokens or asset identity**. Text and structure are covered;
appearance is not.

## 2. Visual surfaces that carry programme identity

| Surface                   | Programme-specific visual element                                                                     | Source                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| RPG Hub, Hero, HUD        | guild emblem, guild/class/path labels, rank label                                                     | `RpgHeroIdentity.tsx`, `rpg-emblem-code-knights-primary.webp`, `readModels.ts` |
| RPG Badges / Achievements | 16 badge images keyed by achievement ID (12 WebP, 4 SVG, inlined as `data:` URIs), fallback glyph `◇` | `RpgAchievementArt.tsx`, `src/features/rpg/assets/badges/`                     |
| RPG Map                   | node ordinal from `week-N` IDs, `+`/`◆` fallbacks, progress track                                     | `RpgMapPage.tsx`                                                               |
| RPG shell palette         | `--rpg-*` tokens on `body.rpg-route-active`                                                           | `src/styles/rpg-tokens.css`, `rpg-shell.css`, `rpg-components.css`             |
| Classic shell palette     | `--color-*` tokens, light and `:root[data-theme='dark']`                                              | `src/styles/tokens.css`, `design-system.css`                                   |
| Brand                     | "ProgressPal CS50 Edition" in document title and shell headers                                        | `index.html`, `AppShell.tsx` ×2                                                |
| Learner avatar            | `public/assets/character-profile.png`, `ProfileAvatar`                                                | shared, learner-owned, not programme-owned                                     |
| Course map / unit cards   | CS50 link block, unit guide, "Week progress"                                                          | `CourseUnitCard.tsx`                                                           |

## 3. Minimum targeted baseline before the theme/asset story (V0)

[D] V0 is captured **at the accepted baseline, before any Epic C production
change**, inside C1 (the oracle story), so the reference is pristine. It has
two parts:

1. **Committed deterministic oracles (fail closed in `npm test`):**
   - SHA-256 of every file in `src/features/rpg/assets/**` and
     `public/assets/character-profile.png`;
   - the achievement-ID → asset-file mapping and the fallback glyph;
   - the exact custom-property sets and values of `tokens.css` (light and
     dark blocks) and `rpg-tokens.css`, parsed from the files;
   - the guild/class/path labels and the map ordinal label for every unit.
2. **Owner-review capture set (not committed; same pattern as B2–B4):** RPG
   Hub, Map, one Module, one Resource, Focus, Hero, Badges (earned and locked),
   Log and Settings; Classic Dashboard, Course map, one content detail,
   Achievements and Settings in light and dark — at 390×844 and 1280×900, with
   a fixed clock and synthetic progressed state. Captured once at baseline and
   again after the theme story on the same machine, then compared.

[D] Pixel baselines are not committed: fonts are platform-dependent (`Aptos`,
Segoe) and CI runs on Ubuntu while the owner runs Windows, so committed pixel
snapshots would fail for environment reasons rather than regressions.

## 4. Assumptions that must be preserved

- [F] RPG tokens apply only while `body.rpg-route-active` is set by
  `RpgRouteShell`; Classic tokens follow the learner's theme preference.
- [F] Badge art is inlined (`?inline`); moving it must keep bundle chunks
  under the 500 kB budget and must not introduce remote or `data:` CSS URLs.
- [F] All boot assets are statically imported so the service worker can
  precache them; no lazy programme asset chunks.
- [F] `AGENTS.md` forbids adding CS50/Harvard branding; any programme brand
  field must not increase it.
- [D] Text-only programme-terminology changes (C4) use the text oracles and
  existing rendered-text tests; pixel review is required only for C8.
