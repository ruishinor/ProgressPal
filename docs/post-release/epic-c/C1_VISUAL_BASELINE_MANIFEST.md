# Epic C / C1 — visual baseline manifest

Status: **Accepted retained C1 visual baseline.** The owner accepted this
baseline on 2026-09-27 after independent review. The sealed archive is
committed to the repository under OD-8 (§5).

This manifest binds the corrected capture of the evidence-stabilized candidate
S `69b1db7`, whose product bytes equal R2 `9bdbce8`. It supersedes the earlier
binding of the pre-fix capture from H `b9ae4f3`. That capture was rejected
(§7) and is kept only as comparison evidence.

Contract: `C0_VISUAL_PRESERVATION_PLAN.md` §4–§6.

## 1. Identities

| Identity                                  | Value                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Product baseline — accepted C0 commit     | `9c6d1b45b5f5b22afa0b8d009101b378c1df363a` / tree `ffd85d6e61c2a8fe11dc5b6dd331b1203b0cf968`            |
| Product baseline — accepted Epic B commit | `fd5e2d592bb6f5d1724509119147c48ba3a5df59` / tree `bc86fd392a5284d9db8821c31a27b8c95ec82a9a`            |
| Evidence harness H (ancestor)             | `b9ae4f3f087d106e3e7cb24403e96e1506e98e3d` / tree `4525b3b0fdbe7588ab5255995d20358fcb07bf02`            |
| M (rejected pre-fix binding)              | `e9da87a` — docs binding of the rejected H capture                                                      |
| R (app-wide theme repair)                 | `8e49ee203a2c3c36baba5aad319176261f513d20`                                                              |
| R2 (corrected product candidate)          | `9bdbce8ee6985cc38d11744b0ab203da077c18d6` / tree `93681e276fa6416eabcbcb432fbc4355c21f1fb9`            |
| S (retained-capture candidate)            | `69b1db7db3889af82265d2430e45ff3f074db02d` / tree `7a0a8a0fce695f57302bd80df2679e85e0dc4af0`, parent R2 |
| `src` subtree at R2 and at S              | `a8f717398827f7ae06661414bb5d72d0295869ad` (identical)                                                  |
| Capture spec at S                         | `e2e/c1-baseline-visual-capture.spec.ts`, blob `80eb49ad54a2a33f5f985d57befbff9858b08d52`               |
| Theme/startup spec at S                   | `e2e/rpg-app-theme.spec.ts`, blob `5f97367eb727ba7d825e799698dbb92086c43aeb`                            |
| Branch                                    | `cx/epic-c1-rpg-theme-repair`                                                                           |
| Binding commit D                          | the commit that adds this revision and the archive (parent S); identity reported in the closure report  |

Lineage: H → M → R → R2 → S → D. R and R2 are the owner-authorized C1 theme
repair (`C1_THEME_REPAIR_RECORD.md`). S changes only evidence (the startup
neutrality oracle and a capture-harness comment) and no product bytes.

## 2. Identity proofs (run at S immediately before capture)

1. `git diff 9bdbce8 69b1db7 -- src` is empty, and the `src` subtree is
   identical at R2 and S. **PASS.**
2. `git diff --name-status 9bdbce8 69b1db7` lists exactly
   `M e2e/c1-baseline-visual-capture.spec.ts` and
   `M e2e/rpg-app-theme.spec.ts`. **PASS.**
3. `git status --porcelain` at S was empty. The capture directory had been
   emptied of earlier disposable PNGs, so it held output of this run only.
   **PASS.**

C0 §4a proof 2 (production subset equal to the product baseline) held for H.
For the corrected capture it is superseded by the owner-authorized repair:
`git diff b9ae4f3 69b1db7` touches exactly 6 product files, and
`public/**`, `index.html`, the Vite config and the package files are
unchanged. The 6 files are:

- `src/app/shell/RpgRouteShell.tsx`;
- `src/features/profile/components/ProfileForm.tsx`;
- `src/features/settings/components/SettingsSurface.tsx`;
- `src/styles/rpg-components.css`;
- `src/styles/rpg-shell.css`;
- `src/styles/rpg-tokens.css`.

The rendered effect of those changes is bounded by the comparison in §6.

## 3. Capture environment

| Property           | Value                                                                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run                | `npm run test:e2e` (managed runner: build, preview on 127.0.0.1:42183, `playwright.managed.config.ts`) at S, 2026-09-27 12:25:29–12:31:28 UTC; **90/90 passed**, 0 retries, 0 skips |
| Playwright project | `chromium` (`devices['Desktop Chrome']`)                                                                                                                                            |
| `@playwright/test` | 1.60.0                                                                                                                                                                              |
| Chromium           | revision 1223, Chrome for Testing 148.0.7778.96 (`node_modules/playwright-core/browsers.json`)                                                                                      |
| OS                 | Microsoft Windows 11 Home 10.0.26200 (build 10.0.26200.9457)                                                                                                                        |
| Node / npm         | v24.19.0 / 11.10.1; `package.json` and `package-lock.json` unchanged since H                                                                                                        |
| Fonts              | System fonts only; no bundled webfont. Captures are comparable only on the same OS/font environment                                                                                 |
| Viewports          | 390×844 and 1280×900, `fullPage: true`                                                                                                                                              |
| Determinism        | `page.clock.install` at `2026-09-19T12:00:00.000Z`; `animations: 'disabled'`, `caret: 'hide'`; fonts awaited; no `.loading-state`; `html[data-theme]` and the RPG canvas asserted   |

## 4. States and themes

- **fresh**: onboarded through the real onboarding form ("Customize first",
  display name "Alex", 360 min/week, reduced motion on, theme per test), with
  no progress.
- **progressed**: fresh plus `week-0-lecture` marked complete through the RPG
  "Mark locally complete" control. This uses the real XP and unlock write
  path: +40 XP, First Step earned, 15 badges locked.
- Synthetic data only.
- Every surface is captured in the app-wide light and dark themes. RPG light
  is the owner-accepted cool-neutral palette, and RPG dark is the accepted
  dark identity. In this set, 0 of 22 RPG light/dark pairs and 0 of 10
  Classic pairs are byte-identical.
- The fixed RPG bottom navigation appears mid-image in full-page captures.
  That is how the real page renders when captured full-page.
- The temporary neutral-grey unresolved-theme preparation state is
  owner-accepted as a bounded C1 compromise. It is covered by
  `e2e/rpg-app-theme.spec.ts`, not by these surface captures. No review-only
  screenshot is part of this baseline.

## 5. Accepted archive (OD-8: committed)

| Property           | Value                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repository path    | `artifacts/epic-c1-visual-baseline/c1-visual-baseline-69b1db7.zip` (committed in D with `git add -f`, because `artifacts/` is gitignored)                    |
| SHA-256            | `cb40459103140f0de7de562e7c84d244ab6826d668952e7d06af0dea7c42917c`                                                                                           |
| Size               | 15,176,163 bytes                                                                                                                                             |
| Contents           | 65 entries: `captures/*.png` (64) and `INVENTORY.sha256`                                                                                                     |
| `INVENTORY.sha256` | SHA-256 `2bbb32f69e0d4276b4960084e1762b8bf0be4a18c4beedbbe1adc3a7d5820f34`; `<sha256> *<name>` lines, sorted, LF (the same format as `b9ae4f3`)              |
| Verified           | Sealed immediately after the run and extracted to a fresh directory: no unsafe or extra entries; 64/64 PNGs match the inventory and the pre-archive captures |
| Bytes              | The exact sealed bytes the owner accepted. Committed unmodified; never regenerated or recompressed                                                           |

The ZIP bytes embed file times, so the capture identity is the per-PNG
SHA-256 set in §8 and the inventory, not a rebuilt ZIP.

## 6. Comparison with the rejected pre-fix archive

The comparison uses same-name per-PNG SHA-256, not ZIP hashes. The expected
relation is from `C1_THEME_REPAIR_RECORD.md` §5.

| Group                          | Captures | Result                | Reason                                                 |
| ------------------------------ | -------: | --------------------- | ------------------------------------------------------ |
| Classic, except Settings       |       16 | identical             | Classic unchanged by R/R2                              |
| Classic Settings (both themes) |        4 | different             | required theme label/description copy correction       |
| RPG dark, except Settings      |       20 | identical             | accepted RPG dark identity preserved                   |
| RPG dark Settings              |        2 | different             | the same copy correction                               |
| RPG light                      |       22 | different             | the rejected "light" captures rendered the dark RPG UI |
| **Total**                      |   **64** | **36 same / 28 diff** | **0 unexpected**                                       |

- New RPG light vs new RPG dark: **0 of 22 pairs byte-identical.**
- **Intentional cross-name matches:** 20 new captures also equal an old
  capture under a different name. Each is a new RPG dark non-Settings capture
  equal to the old rejected same-surface "light" capture.
  - The rejected archive's RPG "light" captures were byte-identical to its RPG
    dark captures; this was the original defect.
  - R/R2 preserved the accepted dark presentation exactly, so a preserved
    dark capture equals both old files.
  - This supports the defect diagnosis and is not archive contamination.
  - No new RPG light capture equals any old capture.
- **Rendering environment:** no material rendering drift was detected on the
  preserved comparison surfaces. The matched toolchain (§3) and the 36
  byte-identical captures are strong rendering-equivalence evidence. They do
  not prove that every environmental variable was globally identical.

## 7. Rejected pre-fix archive (comparison evidence only)

| Property     | Value                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| File         | `c1-visual-baseline-b9ae4f3.zip` (captured at H, bound in M `e9da87a`)                                                                           |
| SHA-256      | `b87c8f5f93b3b3ee5efda66791c8eaea266f3cdd2d85dfca7c958bb19de9a67a`                                                                               |
| Size / count | 15,251,938 bytes; 65 entries (64 PNGs and `INVENTORY.sha256`)                                                                                    |
| Disposition  | **Rejected** by owner visual review: captures labelled RPG light rendered the RPG UI dark. Not a baseline; not committed; comparison only        |
| Per-file map | the M revision of this manifest (`git show e9da87a:docs/post-release/epic-c/C1_VISUAL_BASELINE_MANIFEST.md`, §6) and the archive's own inventory |

## 8. Accepted captures (64)

S `69b1db7` / tree `7a0a8a0` / capture spec blob `80eb49ad` / project
`chromium` / Playwright 1.60.0 / Chromium 1223 (148.0.7778.96) / Windows 11
10.0.26200 / system fonts apply to every row. "vs b9ae4f3" is the same-name
relation to the rejected archive (§6).

| File                                                           | SHA-256                                                            | Route                              | State      | Viewport | Shell   | Theme | vs b9ae4f3 |
| -------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------- | ---------- | -------- | ------- | ----- | ---------- |
| `1280-classic-achievements-progressed-dark.png`                | `5a62ed8e2b74b001e1105c3182e0fa51f2112e6cab46835a4665695cb6566ab2` | `/achievements`                    | progressed | 1280×900 | classic | dark  | identical  |
| `1280-classic-achievements-progressed-light.png`               | `b1d812a55a876cf5ca494df063bd00cf47dbed95c9e1bfcaca4d50be8fd0e204` | `/achievements`                    | progressed | 1280×900 | classic | light | identical  |
| `1280-classic-content-week-0-problem-set-progressed-dark.png`  | `2e09647a7b6f16875d7e5038b76b9117a24dfc436ef35a458dab3466790e2aae` | `/course/week-0-problem-set`       | progressed | 1280×900 | classic | dark  | identical  |
| `1280-classic-content-week-0-problem-set-progressed-light.png` | `8529c57f163b2c41f491ff1764aa1bbf1676776b9343758e8da558d99e3108b8` | `/course/week-0-problem-set`       | progressed | 1280×900 | classic | light | identical  |
| `1280-classic-course-progressed-dark.png`                      | `901410a02184bdf2c73051bf441aed121aeee571ad78f5f6a95efaf28cefa682` | `/course`                          | progressed | 1280×900 | classic | dark  | identical  |
| `1280-classic-course-progressed-light.png`                     | `cfaa2f2367fcb9e4eee0be8ef989171754cf9912adae50d89df5a5f8018b6ab8` | `/course`                          | progressed | 1280×900 | classic | light | identical  |
| `1280-classic-dashboard-progressed-dark.png`                   | `f0c983d5d66c22a6d282be4e21d1cf8faca11f65fee5fcb4604a0b777576aeef` | `/dashboard`                       | progressed | 1280×900 | classic | dark  | identical  |
| `1280-classic-dashboard-progressed-light.png`                  | `1d74c3aee1cc6f048dd7332a810d152f1418b5d65d7631d1b13a77565de8a0a1` | `/dashboard`                       | progressed | 1280×900 | classic | light | identical  |
| `1280-classic-settings-progressed-dark.png`                    | `143215de3385aedba727481078b73c4e922c95799adf856078703103c1f0537a` | `/settings`                        | progressed | 1280×900 | classic | dark  | different  |
| `1280-classic-settings-progressed-light.png`                   | `2a854c05f3d8ccb4f22e2e9c3b4d8f90729d193a004f54aeee297a4b5f72438b` | `/settings`                        | progressed | 1280×900 | classic | light | different  |
| `1280-rpg-badges-progressed-dark.png`                          | `512d78ada1dd951d1cb94318676f1731447e25263c952ad87e4426f840f869da` | `/rpg/badges`                      | progressed | 1280×900 | rpg     | dark  | identical  |
| `1280-rpg-badges-progressed-light.png`                         | `c02542c66f0e884ddc99f18a1b93ee3a3b29b4092d9cd5199a9afcf4236018f7` | `/rpg/badges`                      | progressed | 1280×900 | rpg     | light | different  |
| `1280-rpg-focus-progressed-dark.png`                           | `14d7c501bd47e4d5a9992bb7c9c898f02ef06ac7784f0054b48344a1a8cdcf79` | `/rpg/focus?itemId=week-0-lecture` | progressed | 1280×900 | rpg     | dark  | identical  |
| `1280-rpg-focus-progressed-light.png`                          | `03bb025c502516ded1b7adc758e55b647c1952ead6a254d604af80e082144048` | `/rpg/focus?itemId=week-0-lecture` | progressed | 1280×900 | rpg     | light | different  |
| `1280-rpg-hero-progressed-dark.png`                            | `88debec326079577bc91967f2d6dcbcb9fbe09c7b6dcf52c8b8f2b00e024b25a` | `/rpg/hero`                        | progressed | 1280×900 | rpg     | dark  | identical  |
| `1280-rpg-hero-progressed-light.png`                           | `a454dfc6faab6e95eacb36fd0e604c90dc09be57f6e16da9035a5f5f53e7a7b3` | `/rpg/hero`                        | progressed | 1280×900 | rpg     | light | different  |
| `1280-rpg-hub-fresh-dark.png`                                  | `f887d3aba70abb4fb7274fcaf8d663a4b94688dd8823178a3c1c2bf46d0e22c1` | `/rpg`                             | fresh      | 1280×900 | rpg     | dark  | identical  |
| `1280-rpg-hub-fresh-light.png`                                 | `cbab4a90d14c38bba1e1c7155c9c7f457262dd10e1cd1584334a20e5cc701e5b` | `/rpg`                             | fresh      | 1280×900 | rpg     | light | different  |
| `1280-rpg-hub-progressed-dark.png`                             | `92221f4e57246a41f7e36fb25143c01678baff1c3f073d668a7e236fb9ba593b` | `/rpg`                             | progressed | 1280×900 | rpg     | dark  | identical  |
| `1280-rpg-hub-progressed-light.png`                            | `1770491a435d79754264502226c90ec9b5008cc0141d310702ca83440d718de2` | `/rpg`                             | progressed | 1280×900 | rpg     | light | different  |
| `1280-rpg-log-progressed-dark.png`                             | `0a4eb57ec9860f03febb1a5044a8db5bf0c5e7515a447175fbfd4ab0f29b9f94` | `/rpg/log`                         | progressed | 1280×900 | rpg     | dark  | identical  |
| `1280-rpg-log-progressed-light.png`                            | `9835960e4d40d7f700bc416a714147d446dc98ec0fa9b533bf4bba785db445f8` | `/rpg/log`                         | progressed | 1280×900 | rpg     | light | different  |
| `1280-rpg-map-fresh-dark.png`                                  | `d6308678e8983e8c983f30274917423f070dfdf636abb88bca99d5cbcd7435c3` | `/rpg/map`                         | fresh      | 1280×900 | rpg     | dark  | identical  |
| `1280-rpg-map-fresh-light.png`                                 | `a7cacb1e3e0dfda92da9d7269e893b625c19968aa40b2d18ce06603f01cbc699` | `/rpg/map`                         | fresh      | 1280×900 | rpg     | light | different  |
| `1280-rpg-map-progressed-dark.png`                             | `ed61879fbd3b206c0daa49847f3241fd587436057695c6968d9ad445561e6c81` | `/rpg/map`                         | progressed | 1280×900 | rpg     | dark  | identical  |
| `1280-rpg-map-progressed-light.png`                            | `332936049c0d80d16e2ec8f4d815c9ebee2d4d5606ce97230011849303254bcf` | `/rpg/map`                         | progressed | 1280×900 | rpg     | light | different  |
| `1280-rpg-module-week-0-progressed-dark.png`                   | `32739f532c9bbc8f10dc7bec624f7c92ad8a88efd79cca7101fb2be5d2225ed6` | `/rpg/week/week-0`                 | progressed | 1280×900 | rpg     | dark  | identical  |
| `1280-rpg-module-week-0-progressed-light.png`                  | `7981be5bb4a72c4bb0674d10152b2979416a5adf134fe40e56a61ee187ad0aff` | `/rpg/week/week-0`                 | progressed | 1280×900 | rpg     | light | different  |
| `1280-rpg-resource-week-0-lecture-progressed-dark.png`         | `582d00879332a9d284bb728ddad3a94da5ad984a0725fa273d4d943c24ad302a` | `/rpg/resource/week-0-lecture`     | progressed | 1280×900 | rpg     | dark  | identical  |
| `1280-rpg-resource-week-0-lecture-progressed-light.png`        | `6e8536cfa5fa424b419987e55dc310771685301c22cf7047b87023151c8efe85` | `/rpg/resource/week-0-lecture`     | progressed | 1280×900 | rpg     | light | different  |
| `1280-rpg-settings-progressed-dark.png`                        | `85dc165c1d3070c790c88a55f62a85d993637df539a53ade99218d8f1b8cb34f` | `/rpg/settings`                    | progressed | 1280×900 | rpg     | dark  | different  |
| `1280-rpg-settings-progressed-light.png`                       | `de82c99107699e9cfaca4bc47d50f91eefc2a27f62b32d94cc462ec858af22af` | `/rpg/settings`                    | progressed | 1280×900 | rpg     | light | different  |
| `390-classic-achievements-progressed-dark.png`                 | `b1ed82e8ce00759d81ed3c7c2cffbc340c51d062b3ac486d0a79a749d0aa9a63` | `/achievements`                    | progressed | 390×844  | classic | dark  | identical  |
| `390-classic-achievements-progressed-light.png`                | `fe17cb461218a6f366a610c00cca265250082b135f260088b55409082ce4275b` | `/achievements`                    | progressed | 390×844  | classic | light | identical  |
| `390-classic-content-week-0-problem-set-progressed-dark.png`   | `dc2d2d40903565926d14788b534098ff14dfc802b43f40b4abe95c42c46e44f0` | `/course/week-0-problem-set`       | progressed | 390×844  | classic | dark  | identical  |
| `390-classic-content-week-0-problem-set-progressed-light.png`  | `5c75036f5b9666983ade24aefc0b55ccc7d7b6c6ed425aa4f3f2b0da8956fe59` | `/course/week-0-problem-set`       | progressed | 390×844  | classic | light | identical  |
| `390-classic-course-progressed-dark.png`                       | `0f0efd2cb11438a2b4751cef40718e16e21ba2cca356fc1f371826bbd2e30401` | `/course`                          | progressed | 390×844  | classic | dark  | identical  |
| `390-classic-course-progressed-light.png`                      | `a341015bd9b847c591f03a56549583a88b0df7891e4728e3aaa8a9c4ed6643d8` | `/course`                          | progressed | 390×844  | classic | light | identical  |
| `390-classic-dashboard-progressed-dark.png`                    | `1e4b450dcd60dc514c854964f0e51f577776618b1d94c8f33e9a3914f29d2109` | `/dashboard`                       | progressed | 390×844  | classic | dark  | identical  |
| `390-classic-dashboard-progressed-light.png`                   | `feab57a94cdc5d08068f2e2312c597d3a9786e6c331d207df81253722626abcc` | `/dashboard`                       | progressed | 390×844  | classic | light | identical  |
| `390-classic-settings-progressed-dark.png`                     | `a985cac585b491f6170c2cf9ab149a936ac764e8280011364c0b228e4c3dafd3` | `/settings`                        | progressed | 390×844  | classic | dark  | different  |
| `390-classic-settings-progressed-light.png`                    | `413fc111e49a7c6d277a13216fed97f18b4886532769521748f017cd746bb64c` | `/settings`                        | progressed | 390×844  | classic | light | different  |
| `390-rpg-badges-progressed-dark.png`                           | `d1f43648279747ba96d64572410759f6e15f009fcf0d372f9c0e7cc8a6b4f798` | `/rpg/badges`                      | progressed | 390×844  | rpg     | dark  | identical  |
| `390-rpg-badges-progressed-light.png`                          | `033949e6ad81dd5345a280f6fba66bc65c3267c8177ce443e4a1c24727792790` | `/rpg/badges`                      | progressed | 390×844  | rpg     | light | different  |
| `390-rpg-focus-progressed-dark.png`                            | `2cb8940d28bcfef9cfa5f7d3916ab7840bb4627710b08a7c7208dfa3a1ac70fd` | `/rpg/focus?itemId=week-0-lecture` | progressed | 390×844  | rpg     | dark  | identical  |
| `390-rpg-focus-progressed-light.png`                           | `591676ce7b7d5d9bf99af28c540ce07ca2afe636cc71a785c0b00aa2d97b9070` | `/rpg/focus?itemId=week-0-lecture` | progressed | 390×844  | rpg     | light | different  |
| `390-rpg-hero-progressed-dark.png`                             | `b09b4b8f2f6580f98af9f116b03b86427d1ae8c3494b9f3e46af151813189bd5` | `/rpg/hero`                        | progressed | 390×844  | rpg     | dark  | identical  |
| `390-rpg-hero-progressed-light.png`                            | `7debe19c873a624421ebecb6029d93217e17c63d8c7eb18e6dc4e3f46dad4dd0` | `/rpg/hero`                        | progressed | 390×844  | rpg     | light | different  |
| `390-rpg-hub-fresh-dark.png`                                   | `58f3fa06631c71a729c972c860ef0a9469c2c4f689a55270140d75ac0dbc6537` | `/rpg`                             | fresh      | 390×844  | rpg     | dark  | identical  |
| `390-rpg-hub-fresh-light.png`                                  | `87f8775ce3420b6257169c63bac0667a514273bd32dba7fad1c6b6728bf6f934` | `/rpg`                             | fresh      | 390×844  | rpg     | light | different  |
| `390-rpg-hub-progressed-dark.png`                              | `42adb5ec451a8bcd07a77eeb3ecc55d7ab0633c545746e3754a9f26ad6d19b36` | `/rpg`                             | progressed | 390×844  | rpg     | dark  | identical  |
| `390-rpg-hub-progressed-light.png`                             | `c1540dc92549331188e68fdedfcceb331800dd82ee95f98418eb299099388555` | `/rpg`                             | progressed | 390×844  | rpg     | light | different  |
| `390-rpg-log-progressed-dark.png`                              | `427c00d730b21a03e3209568f2e8f3cea94d3b4cf051d5423795bdeb7d7f39f5` | `/rpg/log`                         | progressed | 390×844  | rpg     | dark  | identical  |
| `390-rpg-log-progressed-light.png`                             | `b3208361935bbb96631b545a554697c4e1444f7deeeadcf4221857788892f7c4` | `/rpg/log`                         | progressed | 390×844  | rpg     | light | different  |
| `390-rpg-map-fresh-dark.png`                                   | `68d4c0d56135479b1ecee72ed21cfb8c04222033c081507db04d1a8e17624918` | `/rpg/map`                         | fresh      | 390×844  | rpg     | dark  | identical  |
| `390-rpg-map-fresh-light.png`                                  | `43358a269b29eec14c12b8e787b3a6740c809efc0438d8f224f805fb63df6951` | `/rpg/map`                         | fresh      | 390×844  | rpg     | light | different  |
| `390-rpg-map-progressed-dark.png`                              | `23579814508fcc483febeea6c14d935e0d8457fe94578c82b98015bd21723228` | `/rpg/map`                         | progressed | 390×844  | rpg     | dark  | identical  |
| `390-rpg-map-progressed-light.png`                             | `42a358cf6b28e859a246a3f286cf89195d57b91a6f05a4db77c09e91c833cbad` | `/rpg/map`                         | progressed | 390×844  | rpg     | light | different  |
| `390-rpg-module-week-0-progressed-dark.png`                    | `820a79a089b2ab335991bb730ba8da88757c27edecbaefa580da663f76aaf375` | `/rpg/week/week-0`                 | progressed | 390×844  | rpg     | dark  | identical  |
| `390-rpg-module-week-0-progressed-light.png`                   | `c034716aa36c477f40a4f337805e73dfbeb3288e4e8d010e8f93d2a931617dda` | `/rpg/week/week-0`                 | progressed | 390×844  | rpg     | light | different  |
| `390-rpg-resource-week-0-lecture-progressed-dark.png`          | `70c3532cbe51875de230c4a63d2b347ce041b490ccd68eca8e631b03d1a2b46d` | `/rpg/resource/week-0-lecture`     | progressed | 390×844  | rpg     | dark  | identical  |
| `390-rpg-resource-week-0-lecture-progressed-light.png`         | `587d12d02a0dfdbff23352b146f92dbaa1598be3a4fb1ba6374c7a946698eb24` | `/rpg/resource/week-0-lecture`     | progressed | 390×844  | rpg     | light | different  |
| `390-rpg-settings-progressed-dark.png`                         | `34d0115e7392bd0e3c308aaeb234e30465122e24ae568f3a20d8278b768bffe2` | `/rpg/settings`                    | progressed | 390×844  | rpg     | dark  | different  |
| `390-rpg-settings-progressed-light.png`                        | `f4ba5d5fc1312a75e3aca9e801b81c422d90d0a924e228d2950d2a2dbabf896e` | `/rpg/settings`                    | progressed | 390×844  | rpg     | light | different  |
