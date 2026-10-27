# Activity — owner-supplied icon integration

27 October 2026. Local implementation and focused verification complete; owner review of the integrated result is next. This record supersedes earlier runner/shoe claims and rejected SVG artwork.

## Identity and preservation

- Worktree: `C:/Users/alex_/.codex/worktrees/activity-visual-refinement/ProgressPal`
- Branch: `feat/activity-visual-refinement`
- Starting/current HEAD: `d14ebf6a508b94d362baf6892627da4895a9a947`
- Version 1.9.0. Existing uncommitted Activity refinement and enlarged-text corrections retained. Exact starting-file copies/hashes: [preflight manifest](../artifacts/activity-approved-integration/preflight/manifest.json).
- Final Git status: 10 modified and 11 untracked files, nothing staged. No commit, push, PR, merge, tag, deployment or Nhost operation.

## Exact artwork mapping

The available archive is `C:/Users/alex_/Downloads/ProgressPal_Activity_7_Approved_Source_Icons.zip` (without the “(1)” suffix in the request). Six PNGs were extracted directly from it. The authoritative heart was read separately from `C:/Users/alex_/Downloads/ProgressPal_Activity_7_Approved_Source_Icons/approved-source-icons/activity-general.png` and visually confirmed. The comparison sheet was not used as source artwork.

| Prepared file under public/assets/activity/ | Destination                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| activity-general.png                        | Supplied gold ECG heart: shared HUD/profile Activity Level link, Activity title and level summary, neutral fallback |
| activity-running.png                        | running — Løping / Running, with the supplied speed lines                                                           |
| activity-walking.png                        | walking — Gåtur / Walking                                                                                           |
| activity-pushups.png                        | pushups — Armhevinger / Push-ups                                                                                    |
| activity-squats.png                         | squats — Knebøy / Squats                                                                                            |
| activity-cycling.png                        | cycling — Sykling / Cycling                                                                                         |
| activity-complete.png                       | Completed daily goals only; separate presentation flag, with visible Fullført / Complete text                       |

Kickbacks and custom activities use the heart fallback. Other unsupported identities, including rucking and strength, are not assigned exercise artwork. No activity/database identifiers were added.

One deterministic gold-chroma alpha matte removed neutral backgrounds, restored gold at partial-alpha edges to avoid black halos, and added transparent padding around native-resolution foreground bounds. No figure was redrawn, traced, distorted or generated. The ECG becomes transparent negative space. Original colors remain in the prepared PNGs; application alpha masks use existing light/dark RPG gold for contrast. [Preparation method, source/output hashes and dimensions](../artifacts/activity-approved-integration/preparation.json).

## Source changes

- Seven transparent PNGs in `public/assets/activity/` (142,155 bytes total).
- `ActivityIcon.tsx`: replaced previous vector paths with decorative PNG-mask mappings and the neutral heart fallback.
- `ActivityPage.tsx`: heart in the main title; supplied completed-goal icon beside existing completion wording. Calculations, writes and logging handlers unchanged.
- `activity.css`: PNG masks, title alignment and completion-icon alignment. Existing tab/name reflow retained.
- `public/sw.js`: seven entries added to the existing static offline list. Cache identity and caching logic unchanged.
- Affected Activity indicator/page tests, Activity E2E and existing service-worker guards/fixtures updated.
- Activity README and CURRENT_STATE entry updated. The unused Material license is a preserved pre-existing file; no Material or rejected SVG geometry supplies the new icons.

## Visual proof and layout

[Actual source / transparent / light-dark native-size comparison](../artifacts/activity-approved-integration/asset-comparison.png) ([100% HTML version](../artifacts/activity-approved-integration/asset-comparison.html)). The actual prepared files are shown at 64, 32, 24 and 16px; no illustrative substitutes.

Actual normal application boxes: title 32px, exercise rows 24px, HUD/profile link 18px, level-summary and completion icons 16px. Heart and ECG cutout were inspected at the smallest 16px presentation. Source silhouettes and aspect ratios remain intact; no dark rectangular backgrounds, visible black halos or clipped shapes were observed in the inspected contexts. Exercise anatomy at 16px is not an application requirement.

Representative screenshots:

- [Desktop light](../artifacts/activity-approved-integration/integrated-nb/1280-100-light.png), [desktop dark](../artifacts/activity-approved-integration/integrated-nb/1280-100-dark.png)
- [Desktop HUD dark](../artifacts/activity-approved-integration/integrated-nb/hud-1280-100-dark.png), [320px HUD light](../artifacts/activity-approved-integration/integrated-nb/hud-320-100-light.png)
- [320px light](../artifacts/activity-approved-integration/integrated-nb/320-100-light.png), [390px dark](../artifacts/activity-approved-integration/integrated-nb/390-100-dark.png)
- [320px / 200% tabs](../artifacts/activity-approved-integration/integrated-nb/tabs-320-200-light.png), [320px / 200% long name](../artifacts/activity-approved-integration/integrated-nb/custom-320-200-light.png)

The Norwegian production-preview matrix covered 320/390px at 100% and 200% text, and 1280px at 100%, in both themes. English E2E covered narrow/desktop, both themes and 320px/200%. No document overflow was measured. At 320px/200%, all three tab labels occupy one line each; “bevegelser” remains a whole word in the long custom name. Quantities and percentages remain readable. The mobile navigation retains five accessible destinations and keyboard focus remains visible.

[Rendered mappings](../artifacts/activity-approved-integration/integrated-nb/mapping.json), [layout measurements](../artifacts/activity-approved-integration/integrated-nb/metrics.json), [HUD height comparison](../artifacts/activity-approved-integration/hud-height-comparison.json). HUD height delta is **0px** in every captured size/theme/text-scale condition against the retained earlier measurements.

## Executed checks

- Focused Vitest: **53/53 passed**, four files: Activity page, Activity indicator, service-worker source contract and service-worker cache behavior. [Log](../artifacts/activity-approved-integration/focused-tests.log).
- Existing Activity browser suite: **9/9 passed**, Chromium, no skips/retries. Includes Save/Cancel and validation, multiple entries, progress/streak/level, draft protection, historical correction/deletion, custom rename/archive, navigation, backup restore, read-only behavior, accessibility and offline retrieval of all seven PNGs. Added only the demonstrated enlarged-text word/tab regressions and offline-asset checks. [Log](../artifacts/activity-approved-integration/e2e.log).
- TypeScript, lint, affected-file formatting, production build and unchanged bundle budgets passed. Logs are in `artifacts/activity-approved-integration/`.
- JS gzip: **447,525 / 448,000 B** (475 B headroom); CSS gzip: **15,789 / 40,000 B**; largest JS chunk: **495,885 / 500,000 B** raw. [Budget report](../artifacts/activity-approved-integration/bundle.json). No wording/functionality/budget was changed to reduce size.
- Initial lint findings were confined to preparation browser globals and an old rejected test snapshot; globals were declared and rejected bytes preserved under a non-source snapshot extension. Final application/source checks pass. Browser logs contain only a non-blocking NO_COLOR/FORCE_COLOR harness warning.

Product/UX/UI/engineering/adversarial review found the requested identity and mappings present, source artwork preserved, completion still textual, unsupported exercises neutral, mobile HUD unchanged, and the demonstrated text-fragmentation regressions protected. No additional corrections were warranted.

## Limits and next action

Chromium was exercised; other browser engines and physical-device rendering were not tested. The supplied low-resolution source detail is preserved rather than artistically altered. This work does not establish third-party ownership/licensing of owner-supplied images. No full application suite or clean-tree independent release certification was run for this bounded local change.

Activity data, progression, educational XP/mastery, backup and persistence contracts remain unchanged. Owner action: review the comparison and representative application screenshots, then accept or identify a concrete remaining defect in this uncommitted candidate. Any commit/release/deployment remains a separate owner instruction.
