# ProgressPal RPG v2 — Asset Ledger

Status: active asset provenance ledger  
Location in repo: `docs/rpg-v2/ASSETS.md`  
Scope: all RPG v2 visual assets used in source code or public app surfaces

---

## 1. Purpose

This file is the required provenance ledger for RPG v2 visual assets.

No RPG image, emblem, badge, icon, background, card still, avatar, map art, UI ornament, or other visual asset may enter the implementation unless it is recorded here first.

No ledger entry = do not use the asset.

---

## 2. Asset policy summary

RPG v2 assets must be:

- first-party, generated for ProgressPal, or clearly licensed for this use;
- local files, not remote runtime assets;
- optimized before use;
- placed in the correct repo folder;
- named with the required naming convention;
- accessible, with either alt text or decorative-hidden treatment;
- visually distinct from Harvard/CS50 marks;
- free of essential text baked into images;
- justified by the current module.

RPG v2 assets must not include:

- Harvard shield;
- CS50 logo;
- CS50 mark as app identity;
- official-looking CS50 badges;
- screenshots from official course pages or lectures;
- course staff likenesses;
- copied lecture visuals;
- copied course UI;
- copied transcripts or problem content;
- generated text baked into image files;
- remote images;
- unoptimized large files;
- broad asset category imports.

---

## 3. Candidate asset library status

The categorized visual asset library is a candidate source pool only. It is not production content.

Observed category summary:

| Category            | Files | Approx. uncompressed size | Decision                                                                    |
| ------------------- | ----: | ------------------------: | --------------------------------------------------------------------------- |
| achievements        |    51 |                   71.7 MB | Candidate badge art. Curate heavily.                                        |
| banners             |     2 |                    2.2 MB | Candidate banner art. Use sparingly.                                        |
| buttons             |     9 |                    7.8 MB | Avoid by default. Use CSS/HTML buttons.                                     |
| card-backgrounds    |    31 |                   36.7 MB | Candidate module/resource stills. Curate.                                   |
| character-imagery   |     8 |                    5.1 MB | Candidate avatar art. Optional.                                             |
| example-usage       |    38 |                   51.2 MB | Reference only. Do not import.                                              |
| icons               |    65 |                   63.0 MB | Candidate icons, likely oversized. Prefer inline SVG.                       |
| levels              |    20 |                   17.5 MB | Level shields with baked-in numbers, not Rank. Use a live DOM Level marker. |
| lock                |     2 |                    2.6 MB | Candidate generic locked-state art. One is enough.                          |
| maps                |     2 |                    5.1 MB | Candidate map art. Optional after accessible map works.                     |
| numbered-week-icons |    20 |                   19.6 MB | Candidate module icons. Use only for real units.                            |
| paths               |    12 |                    6.4 MB | Mostly defer. v2 has only CS Foundations.                                   |
| progress-bar        |     3 |                    2.0 MB | Avoid by default. Use CSS/HTML progress bars.                               |
| scene-backgrounds   |     9 |                   16.1 MB | Candidate backgrounds. Use at most one subtle optimized background.         |
| shield-badges       |     4 |                    4.6 MB | Candidate Code Knights emblem. Review carefully.                            |

Do not bulk-import the library. Do not import `example-usage/`. Do not import raster buttons or progress bars unless a later decision explicitly justifies it.

---

## 4. Production asset folder structure

Use this structure for approved RPG assets:

```text
src/features/rpg/assets/
  emblems/
  badges/
  ranks/
  map/
  backgrounds/
  modules/
  avatars/
  ui/
  README.md
```

Do not place RPG assets loose in `public/` unless there is a clear build/runtime reason and the decision is documented.

---

## 5. Naming convention

Use lowercase kebab-case.

Pattern:

```text
rpg-<category>-<subject>-<state-or-variant>.<ext>
```

Examples:

```text
rpg-emblem-code-knights-primary.svg
rpg-badge-first-steps-unlocked.svg
rpg-badge-first-steps-locked.svg
rpg-rank-apprentice-medallion.svg
rpg-map-cs-foundations-overview.webp
rpg-module-memory-still.webp
rpg-background-starfield-subtle.svg
rpg-ui-panel-corner-gold.svg
rpg-avatar-generalist-default.webp
```

Do not use names like:

```text
image-final.png
badge-new.png
CS50-knights.png
progress-pal-visual-asset (47).png
```

---

## 6. Format rules

Prefer:

```text
SVG for icons, emblems, simple badges, simple map nodes.
WebP for illustrated backgrounds, module stills, and avatars.
CSS for gradients, panels, glow, texture, and progress bars.
DOM text for all meaningful labels.
```

Avoid:

```text
Large PNGs unless transparency is required and SVG/WebP is unsuitable.
JPEG unless photographic-style art is genuinely needed.
Remote fonts.
Remote icon libraries.
Raster UI buttons.
Raster progress bars.
Images with essential text.
```

---

## 7. Asset budget

Initial RPG v2 MVP budget:

```text
Total new compressed visual assets: <= 1.5 MB
Single illustrated asset: <= 350 KB unless justified
Single SVG icon/badge: aim <= 50 KB
```

If the budget is exceeded:

1. Record why in this file.
2. Defer nonessential assets.
3. Replace heavy images with CSS/SVG.
4. Keep static boot imports for first-visit offline availability; reduce or omit assets instead of adding lazy route chunks.
5. Revalidate offline behavior.

---

## 8. ELI5 asset gate

For each asset:

1. Pick the asset.
2. Confirm it does not copy Harvard/CS50 marks or official course imagery.
3. Confirm it is first-party, generated for this project, owned, or clearly licensed.
4. Rename it using the naming convention.
5. Place it in the correct `src/features/rpg/assets/` subfolder.
6. Optimize it.
7. Record it in the ledger table below.
8. Decide alt text or decorative treatment.
9. Use it locally in code.
10. Run validation.
11. If uncertain, stop and use CSS/simple SVG until clarified.

---

## 9. Expected asset plan

| Planned asset          | What it should look like                                         | Source library candidate                               | Intended repo path                                                                  | In-app placement                           |           Required for v2? | Notes                                                 |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------: | ----------------------------------------------------- |
| Code Knights emblem    | Navy/gold shield with sword/circuit motif; no CS50/Harvard marks | `shield-badges/`                                       | `src/features/rpg/assets/emblems/rpg-emblem-code-knights-primary.svg` or `.webp`    | Hub, Hero/Profile, optional Settings/About |                        Yes | Must be visually distinct from official marks.        |
| ProgressPal RPG emblem | Small ProgressPal-owned mark; not course-branded                 | `shield-badges/` or `icons/`                           | `src/features/rpg/assets/emblems/rpg-emblem-progresspal-rpg.svg`                    | Header candidate                           |                   Optional | Avoid official-looking course marks.                  |
| Subtle RPG background  | Dark, low-contrast, non-distracting                              | `scene-backgrounds/` or CSS                            | `src/features/rpg/assets/backgrounds/rpg-background-starfield-subtle.svg`           | RPG shell                                  |                   Optional | CSS may be better.                                    |
| CS Foundations map     | Abstract learning path/map; no official course art               | `maps/`                                                | `src/features/rpg/assets/map/rpg-map-cs-foundations-overview.webp`                  | Campaign Map                               |                   Optional | Accessible HTML/SVG/list remains primary.             |
| Week 4 Memory still    | Abstract memory/computer-card visual; not lecture screenshot     | `card-backgrounds/`                                    | `src/features/rpg/assets/modules/rpg-module-memory-still.webp`                      | Study Resource / Module Detail             | Optional before asset pass | Use CSS placeholder first if possible.                |
| Generic module stills  | Abstract visuals for real CS50x weeks                            | `card-backgrounds/`                                    | `src/features/rpg/assets/modules/rpg-module-<slug>-still.webp`                      | Study Resource per module                  |                      Later | Add only as modules need them.                        |
| Achievement badge art  | Medallions mapped to existing achievement IDs                    | `achievements/`                                        | `src/features/rpg/assets/badges/rpg-badge-<achievement-id>-unlocked.svg` or `.webp` | Badge Gallery                              |                      Later | Must match real achievements.                         |
| Generic locked badge   | Muted locked medallion                                           | `lock/` or `achievements/`                             | `src/features/rpg/assets/badges/rpg-badge-locked-generic.svg`                       | Badge Gallery locked state                 |                      Later | One generic asset may be enough.                      |
| Level marker           | Shield outline with the actual engine-derived Level              | `levels/` inspected; project-authored outline selected | `src/features/rpg/components/RpgLevelProgress.tsx`                                  | HUD / Hero                                 |                   Selected | Level stays DOM text; Rank remains a separate status. |
| Generalist avatar      | Civilian/non-military learner avatar                             | `character-imagery/`                                   | `src/features/rpg/assets/avatars/rpg-avatar-generalist-default.webp`                | Hero/Profile                               |                   Optional | Existing profile may be enough.                       |
| Bottom nav icons       | Hub/map/quest/hero/badge symbols                                 | `icons/` or inline SVG                                 | `src/features/rpg/assets/ui/rpg-nav-<name>.svg`                                     | Bottom nav                                 |                   Optional | Prefer inline SVG if possible.                        |
| Panel ornaments        | Small corner/border accents                                      | `icons/` or CSS                                        | `src/features/rpg/assets/ui/rpg-ui-panel-corner-gold.svg`                           | Panels                                     |                   Optional | Avoid overuse.                                        |

---

## 10. Ledger table

Fill this table before any asset is used in code.

### 2026-09-15 owner-review selection

The owner supplied the 276-file categorized library (326,845,569 source bytes)
for ProgressPal use. All 16 categories were visually inspected using 21 contact
sheets; selected files were also inspected individually. The owner authorizes
optimization and integration of project-generated, unbranded candidates. This
is the usage basis for the selections below, not a third-party license claim.

| ID        | Production file / primitive                    | Source                                                          | Purpose and use                                                                            | Treatment                                                                                                  | Status                                                              |
| --------- | ---------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| asset-005 | `emblems/rpg-emblem-code-knights-primary.webp` | `shield-badges/progress-pal-visual-asset-shield-badges (1).png` | Guild identity shared by HUD and Hero; unbranded gold sword/shield                         | Resize to 128 px WebP; decorative `alt=""` beside the Guild name; static inline import for offline boot    | Selected 2026-09-15; size and validation recorded below after build |
| asset-006 | `RpgLevelProgress` shield outline              | Project-authored SVG geometry, informed by `levels/`            | One Level marker with live DOM number beside authoritative XP progress, reused in HUD/Hero | No baked-in number, no rank meaning; SVG hidden from assistive technology; DOM Level label remains visible | Selected 2026-09-15                                                 |

The numbered `levels/` candidates represent **Level**, not Rank. They are not
shipped because their numbers are baked into the artwork. The reusable outline
works for every engine-derived level. `numbered-week-icons/` is rejected because
its baked-in week names/numbers disagree with the actual course (Scratch is
Week 0). Module markers use real course labels in DOM text.

No source archive or candidate directory is copied into the repository.
Production sizes and final offline checks are recorded with the completed
selection below.

`asset-005`: 128 × 128, **2,440 bytes**, WebP quality 85. Inspected at source
resolution and in the desktop/mobile HUD and Hero. Build uses `?inline` so the
existing service worker caches it with the boot JavaScript. Final offline
acceptance verified the decoded image after network disconnection.

### Achievement selection (2026-09-15)

These six unbranded, text-free project-library illustrations map only to existing
achievement IDs. The source is `achievements/progress-pal-visual-asset-achievements
(N).png`, using the numbers below. They are resized to 192 px WebP, quality 85;
exact output sizes are recorded after optimization. They use static `?inline`
imports so every image is available with the existing offline boot bundle.
All use decorative `alt=""` beside the real name, requirement, and earned/locked
state. Locked art is muted by CSS without removing readable requirements.

| ID        |     Source N | Production file under `assets/badges/`  | Existing achievement / visual meaning                                                        |
| --------- | -----------: | --------------------------------------- | -------------------------------------------------------------------------------------------- |
| asset-007 |           15 | `rpg-badge-first-step.webp`             | First Step: walking boot                                                                     |
| asset-008 |           20 | `rpg-badge-data-structure-builder.webp` | Data Structure Builder: branching structure                                                  |
| asset-009 |           25 | `rpg-badge-query-builder.webp`          | Query Builder: database and chart                                                            |
| asset-010 |           22 | `rpg-badge-bug-hunter.webp`             | Bug Hunter: beetle                                                                           |
| asset-011 |           16 | `rpg-badge-final-project-mvp.webp`      | Final Project MVP: construction tools                                                        |
| asset-012 |           45 | `rpg-badge-final-project-shipped.webp`  | Final Project Shipped: code/document scroll                                                  |
| asset-013 | original CSS | `RpgAchievementArt` fallback            | Neutral medal outline for existing achievements without selected artwork; no invented reward |

Other illustrations are omitted where they suggest combat, currencies, extra
classes, unsupported rewards, official course identity, or add decorative weight.
Navigation stays text-first. Map/path and numbered-module candidates serve as
composition references only; accessible CSS connectors and DOM unit labels
represent the real 14-unit course. Backgrounds, banners, raster controls, and
example screenshots are not shipped.

Optimized sizes, visually checked in the actual gallery: First Step 6,674 B;
Data Structure Builder 6,952 B; Query Builder 4,804 B; Bug Hunter 6,334 B;
Final Project MVP 5,052 B; Final Project Shipped 5,506 B. Together with the Guild
emblem, **seven images total 37,762 B** (36.9 KiB). No budget exception is needed.
Original Level SVG and fallback CSS are small source primitives, included in
the checked JS/CSS bundle. The main JS chunk is 318,646 B raw.

Offline acceptance passed: after one online Classic load, a fresh offline RPG
Hub decoded the Guild image and the never-visited gallery decoded all six
192 px achievement images. The existing service worker required no changes.

The following four entries are historical candidates, not a production queue.
`asset-001` is superseded by selected `asset-005`. `asset-002` and `asset-003`
are omitted as unnecessary decoration; `asset-004` uses existing status text
and muted artwork/CSS instead of another image.

| ID        | File                                | Repo path                            | In-app use                                 | Source/origin                                                        | Rights/usage basis                               | Contains text? | Decorative? | Alt text / aria decision                                     | Size | Optimized? | Reviewer/date | Status           | Notes                                     |
| --------- | ----------------------------------- | ------------------------------------ | ------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------ | -------------: | ----------: | ------------------------------------------------------------ | ---: | ---------: | ------------- | ---------------- | ----------------------------------------- |
| asset-001 | rpg-emblem-code-knights-primary.svg | src/features/rpg/assets/emblems/     | Hub, Hero/Profile, optional Settings/About | Candidate from shield-badges or first-party generated replacement    | Must be first-party/owned; no CS50/Harvard marks |             No |          No | alt="Code Knights emblem"                                    |  TBD |        TBD | TBD           | Planned          | Sword/circuit/shield motif.               |
| asset-002 | rpg-background-starfield-subtle.svg | src/features/rpg/assets/backgrounds/ | RPG shell background                       | Candidate from scene-backgrounds or CSS-created replacement          | Must be first-party/owned                        |             No |         Yes | aria-hidden="true"                                           |  TBD |        TBD | TBD           | Planned optional | Use only if it does not hurt readability. |
| asset-003 | rpg-module-memory-still.webp        | src/features/rpg/assets/modules/     | Week 4 Study Resource / Module Detail      | Candidate from card-backgrounds or first-party generated replacement | Must be first-party/owned; no lecture screenshot |             No | Usually yes | aria-hidden="true" unless meaningful                         |  TBD |        TBD | TBD           | Planned optional | Must not look like fake embedded media.   |
| asset-004 | rpg-badge-locked-generic.svg        | src/features/rpg/assets/badges/      | Locked badge state                         | Candidate from lock or generated replacement                         | Must be first-party/owned                        |             No |          No | alt="Locked badge" or hidden if adjacent text explains state |  TBD |        TBD | TBD           | Planned optional | One generic locked asset preferred.       |

---

## 11. Rejection log

Use this section to record assets that were reviewed and rejected.

| Candidate                | Source category  | Reason rejected                                  | Reviewer/date |
| ------------------------ | ---------------- | ------------------------------------------------ | ------------- |
| Example usage composites | `example-usage/` | Reference only; not app assets                   | TBD           |
| Raster progress bars     | `progress-bar/`  | CSS/HTML progress bars are better and accessible | TBD           |
| Raster buttons           | `buttons/`       | CSS/HTML buttons are better and accessible       | TBD           |

---

## 12. Module rules

RPG-00:

```text
No assets added.
```

RPG-01 through RPG-08:

```text
Use CSS/inline SVG placeholders unless the module truly requires an asset.
Any early asset requires a ledger entry and module justification.
```

RPG-14:

```text
Main asset pass and visual polish.
Add only approved, optimized, ledgered assets.
```

---

## 13. Final asset standard

A good RPG asset:

```text
Supports comprehension, status, identity, or navigation.
Does not pretend to be official CS50/Harvard material.
Does not carry essential text.
Does not bloat the app.
Does not make the interface harder to read.
```

A bad RPG asset:

```text
Looks cool but has no purpose.
Copies course branding.
Bloats the bundle.
Makes text harder to read.
Creates fake mechanics.
Requires explanation to justify why it exists.
```

## Profile character preview asset

Status: Introduced in RPG-01b.

Files:

- `public/assets/character-profile.png`
- `src/features/profile/components/ProfileAvatar.tsx`

Purpose:

- Replaces the v1 generated SVG learner avatar preview with a bundled RPG-style character portrait.
- Used in the existing profile/settings avatar preview.

Implementation notes:

- The source PNG is stored under `public/assets/character-profile.png`.
- `ProfileAvatar.tsx` references that local URL directly. The existing service worker includes it in its static asset list, so it remains available on first offline route visits.
- HUD, Hero, and Settings share this portrait. The current completion adds no second portrait or avatar customization controls.

Constraints:

- No remote image loading.
- No user-uploaded avatar support.
- No schema change.
- No IndexedDB storage change.
- No service worker change.

### Final candidate achievement coverage (2026-09-18)

The latest owner instruction completes artwork for **16/16 existing achievements**.
The six illustrations above remain unchanged. The following six use the same
owner-supplied project library and provenance recorded above, optimized to 192 px
WebP at quality 85. Four small original SVG medallions complete the distinct set.
All are static inline imports, decorative beside the achievement name and actual
requirement. Generic artwork is now only an unknown-ID/image-failure fallback.

| Achievement         | Source / visual meaning         | Production filename               | Bytes |
| ------------------- | ------------------------------- | --------------------------------- | ----: |
| Scratch Initiate    | Library 12; puzzle              | rpg-badge-scratch-initiate.webp   |  3554 |
| Pointer Survivor    | Library 10; pointer/tree shield | rpg-badge-pointer-survivor.webp   |  2734 |
| Python Shift        | Library 1; snake/scroll         | rpg-badge-python-shift.webp       |  5622 |
| Browser Builder     | Library 41; browser/server      | rpg-badge-browser-builder.webp    |  3886 |
| Flask Route Maker   | Library 33; routing/server      | rpg-badge-flask-route-maker.webp  |  5534 |
| Course Complete     | Library 50; check shield        | rpg-badge-course-complete.webp    |  5110 |
| First Slice         | Original SVG; film/play         | rpg-badge-first-slice.svg         |   475 |
| Pset Chain          | Original SVG; linked checks     | rpg-badge-pset-chain.svg          |   463 |
| Clean Stop          | Original SVG; pause/bookmark    | rpg-badge-clean-stop.svg          |   395 |
| Three Deep Sessions | Original SVG; three clocks      | rpg-badge-three-deep-sessions.svg |   458 |

Added artwork totals **28,231 B**. All 16 achievement files total **63,553 B**;
with the unchanged Guild emblem, **65,993 B**. The unchanged shared character
portrait is separate (174,088 B). No source ZIP or candidate library is copied
into Git. No remote asset, font, script, achievement rule, or worker change.
The selected set was inspected in the 390 px and 1280 px gallery; a targeted
production offline test decoded all 16 images on a never-visited gallery.

CSS gzip is slightly above the previous 10,000 B limit after the bounded recovery
and disclosure controls. The owner-authorized hard ceiling is now 12,000 B.
JavaScript limits remain 500,000 B per raw chunk and 400,000 B total gzip. Exact
candidate measurements and checksums belong to its release-gate evidence.
