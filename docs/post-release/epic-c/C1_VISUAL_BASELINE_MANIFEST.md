# Epic C / C1 — visual baseline manifest

Status: **Evidence binding for a CANDIDATE visual baseline. Not accepted.**
The owner has not reviewed these captures. Permanent retention (OD-8) is
unresolved. This manifest binds exactly which bytes were produced, by which
harness, over which product bytes. It does not record visual acceptance.

Contract: `C0_VISUAL_PRESERVATION_PLAN.md` §4–§6.

## 1. Identities

| Identity                                  | Value                                      |
| ----------------------------------------- | ------------------------------------------ |
| Product baseline — accepted C0 commit     | `9c6d1b45b5f5b22afa0b8d009101b378c1df363a` |
| Product baseline — accepted C0 tree       | `ffd85d6e61c2a8fe11dc5b6dd331b1203b0cf968` |
| Product baseline — accepted Epic B commit | `fd5e2d592bb6f5d1724509119147c48ba3a5df59` |
| Product baseline — accepted Epic B tree   | `bc86fd392a5284d9db8821c31a27b8c95ec82a9a` |
| Evidence harness H — commit               | `b9ae4f3f087d106e3e7cb24403e96e1506e98e3d` |
| Evidence harness H — tree                 | `4525b3b0fdbe7588ab5255995d20358fcb07bf02` |
| Evidence harness H — parent               | `9c6d1b45b5f5b22afa0b8d009101b378c1df363a` |
| Capture spec path                         | `e2e/c1-baseline-visual-capture.spec.ts`   |
| Capture spec blob SHA at H                | `4007234f2a83319706f66a89dad5c671ec5bb5fe` |
| Branch                                    | `cx/epic-c1-baseline-evidence`             |

This manifest is committed in the later docs-only commit M. The harness
identity is H, not M.

## 2. Identity proofs (C0 visual plan §4a), run at H before capture

1. `git diff --name-status 9c6d1b45b5f5b22afa0b8d009101b378c1df363a H` lists
   20 entries, all `A` (added): 18 under `tests/**`, the one spec
   `e2e/c1-baseline-visual-capture.spec.ts`, and
   `docs/post-release/epic-c/C1_EVIDENCE_COVERAGE.md`. There are 0 modified
   or deleted entries. **PASS.**
2. `git diff --quiet fd5e2d592bb6f5d1724509119147c48ba3a5df59 H -- .
':(exclude)tests' ':(exclude)e2e' ':(exclude)docs/post-release/epic-c'`
   exits **0**. `git diff --name-status fd5e2d5 H -- tests e2e` has 0 non-added
   entries, so no pre-existing test or spec changed. The production subset of H
   is byte-identical to the product baseline. **PASS.**
3. `git status --porcelain` at H immediately before the retained run: **empty**.
   The gitignored capture directory was deleted first, so it could only contain
   output of this run. **PASS.**

## 3. Capture environment

| Property           | Value                                                                                                                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Run                | `npm run test:e2e` (managed runner: build, preview on 127.0.0.1:42183, `playwright.managed.config.ts`), 2026-09-26 11:16:35–11:21:52 +02:00; **78/78 passed**, 0 retries, 0 skips                                                                     |
| Playwright project | `chromium` (`devices['Desktop Chrome']`)                                                                                                                                                                                                              |
| `@playwright/test` | 1.60.0                                                                                                                                                                                                                                                |
| Chromium           | revision 1223, Chrome for Testing 148.0.7778.96 (`node_modules/playwright-core/browsers.json`)                                                                                                                                                        |
| OS                 | Microsoft Windows 11 Home 10.0.26200 (build 10.0.26200.9457)                                                                                                                                                                                          |
| Node / npm         | v24.19.0 / 11.10.1                                                                                                                                                                                                                                    |
| Fonts              | System fonts only; no bundled webfont (`'Aptos', 'Segoe UI Variable Text', 'Segoe UI', 'Helvetica Neue', sans-serif`). Captures are comparable only on the same OS/font environment                                                                   |
| Viewports          | 390×844 and 1280×900, `fullPage: true`                                                                                                                                                                                                                |
| Determinism        | `page.clock.install` at `2026-09-19T12:00:00.000Z`; `animations: 'disabled'`, `caret: 'hide'`; fonts awaited; no `.loading-state` present; no running Focus timer. Three disposable development runs and this retained run are byte-identical (64/64) |

## 4. States

- **fresh**: onboarded through the real onboarding form ("Customize first",
  display name "Alex", 360 min/week, reduced motion on, theme per test), with
  no progress.
- **progressed**: fresh plus `week-0-lecture` marked complete through the RPG
  resource control "Mark locally complete". This uses the real XP and unlock
  write path: +40 XP, First Step earned, 15 badges locked.
- Synthetic data only. No real learner data.

Theme: every surface is captured in light and dark. For RPG this is required
because `rpg-components.css` and `rpg-shell.css` consume Classic `--color-*`
tokens that change under `data-theme='dark'`. Observed: 20 of 22 RPG
light/dark pairs are byte-identical; RPG Settings differs at both viewports.

Rendering note: the fixed RPG bottom navigation appears mid-image in
full-page captures. That is how the real page renders when captured full-page.

## 5. Archive

| Property   | Value                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------- |
| Local path | `artifacts/epic-c1-visual-baseline/c1-visual-baseline-b9ae4f3.zip` (gitignored, temporary)    |
| SHA-256    | `b87c8f5f93b3b3ee5efda66791c8eaea266f3cdd2d85dfca7c958bb19de9a67a`                            |
| Size       | 15,251,938 bytes                                                                              |
| Contents   | 65 entries: `captures/*.png` (64) and `INVENTORY.sha256`                                      |
| Verified   | extracted to a temporary directory; all 64 PNG hashes match the inventory and the table below |
| Retention  | **OD-8 unresolved.** The gitignored working directory is not retention                        |

## 6. Captures (64)

H `b9ae4f3f087d106e3e7cb24403e96e1506e98e3d` / tree
`4525b3b0fdbe7588ab5255995d20358fcb07bf02` / spec blob
`4007234f2a83319706f66a89dad5c671ec5bb5fe` / project `chromium` /
Playwright 1.60.0 / Chromium 1223 (148.0.7778.96) / Windows 11 10.0.26200 /
system fonts apply to every row.

| File                                                           | SHA-256                                                            | Route                              | State      | Viewport | Shell   | Theme |
| -------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------- | ---------- | -------- | ------- | ----- |
| `1280-classic-achievements-progressed-dark.png`                | `5a62ed8e2b74b001e1105c3182e0fa51f2112e6cab46835a4665695cb6566ab2` | `/achievements`                    | progressed | 1280×900 | classic | dark  |
| `1280-classic-achievements-progressed-light.png`               | `b1d812a55a876cf5ca494df063bd00cf47dbed95c9e1bfcaca4d50be8fd0e204` | `/achievements`                    | progressed | 1280×900 | classic | light |
| `1280-classic-content-week-0-problem-set-progressed-dark.png`  | `2e09647a7b6f16875d7e5038b76b9117a24dfc436ef35a458dab3466790e2aae` | `/course/week-0-problem-set`       | progressed | 1280×900 | classic | dark  |
| `1280-classic-content-week-0-problem-set-progressed-light.png` | `8529c57f163b2c41f491ff1764aa1bbf1676776b9343758e8da558d99e3108b8` | `/course/week-0-problem-set`       | progressed | 1280×900 | classic | light |
| `1280-classic-course-progressed-dark.png`                      | `901410a02184bdf2c73051bf441aed121aeee571ad78f5f6a95efaf28cefa682` | `/course`                          | progressed | 1280×900 | classic | dark  |
| `1280-classic-course-progressed-light.png`                     | `cfaa2f2367fcb9e4eee0be8ef989171754cf9912adae50d89df5a5f8018b6ab8` | `/course`                          | progressed | 1280×900 | classic | light |
| `1280-classic-dashboard-progressed-dark.png`                   | `f0c983d5d66c22a6d282be4e21d1cf8faca11f65fee5fcb4604a0b777576aeef` | `/dashboard`                       | progressed | 1280×900 | classic | dark  |
| `1280-classic-dashboard-progressed-light.png`                  | `1d74c3aee1cc6f048dd7332a810d152f1418b5d65d7631d1b13a77565de8a0a1` | `/dashboard`                       | progressed | 1280×900 | classic | light |
| `1280-classic-settings-progressed-dark.png`                    | `1950b7ba0899bfbcd2aa93a9553488a8a1ed9564b18d4d2e873eee5f9563e0ca` | `/settings`                        | progressed | 1280×900 | classic | dark  |
| `1280-classic-settings-progressed-light.png`                   | `34a0167f012684191e69c622943d4ba7eff96d006421fad1e8a75fb29cdafa20` | `/settings`                        | progressed | 1280×900 | classic | light |
| `1280-rpg-badges-progressed-dark.png`                          | `512d78ada1dd951d1cb94318676f1731447e25263c952ad87e4426f840f869da` | `/rpg/badges`                      | progressed | 1280×900 | rpg     | dark  |
| `1280-rpg-badges-progressed-light.png`                         | `512d78ada1dd951d1cb94318676f1731447e25263c952ad87e4426f840f869da` | `/rpg/badges`                      | progressed | 1280×900 | rpg     | light |
| `1280-rpg-focus-progressed-dark.png`                           | `14d7c501bd47e4d5a9992bb7c9c898f02ef06ac7784f0054b48344a1a8cdcf79` | `/rpg/focus?itemId=week-0-lecture` | progressed | 1280×900 | rpg     | dark  |
| `1280-rpg-focus-progressed-light.png`                          | `14d7c501bd47e4d5a9992bb7c9c898f02ef06ac7784f0054b48344a1a8cdcf79` | `/rpg/focus?itemId=week-0-lecture` | progressed | 1280×900 | rpg     | light |
| `1280-rpg-hero-progressed-dark.png`                            | `88debec326079577bc91967f2d6dcbcb9fbe09c7b6dcf52c8b8f2b00e024b25a` | `/rpg/hero`                        | progressed | 1280×900 | rpg     | dark  |
| `1280-rpg-hero-progressed-light.png`                           | `88debec326079577bc91967f2d6dcbcb9fbe09c7b6dcf52c8b8f2b00e024b25a` | `/rpg/hero`                        | progressed | 1280×900 | rpg     | light |
| `1280-rpg-hub-fresh-dark.png`                                  | `f887d3aba70abb4fb7274fcaf8d663a4b94688dd8823178a3c1c2bf46d0e22c1` | `/rpg`                             | fresh      | 1280×900 | rpg     | dark  |
| `1280-rpg-hub-fresh-light.png`                                 | `f887d3aba70abb4fb7274fcaf8d663a4b94688dd8823178a3c1c2bf46d0e22c1` | `/rpg`                             | fresh      | 1280×900 | rpg     | light |
| `1280-rpg-hub-progressed-dark.png`                             | `92221f4e57246a41f7e36fb25143c01678baff1c3f073d668a7e236fb9ba593b` | `/rpg`                             | progressed | 1280×900 | rpg     | dark  |
| `1280-rpg-hub-progressed-light.png`                            | `92221f4e57246a41f7e36fb25143c01678baff1c3f073d668a7e236fb9ba593b` | `/rpg`                             | progressed | 1280×900 | rpg     | light |
| `1280-rpg-log-progressed-dark.png`                             | `0a4eb57ec9860f03febb1a5044a8db5bf0c5e7515a447175fbfd4ab0f29b9f94` | `/rpg/log`                         | progressed | 1280×900 | rpg     | dark  |
| `1280-rpg-log-progressed-light.png`                            | `0a4eb57ec9860f03febb1a5044a8db5bf0c5e7515a447175fbfd4ab0f29b9f94` | `/rpg/log`                         | progressed | 1280×900 | rpg     | light |
| `1280-rpg-map-fresh-dark.png`                                  | `d6308678e8983e8c983f30274917423f070dfdf636abb88bca99d5cbcd7435c3` | `/rpg/map`                         | fresh      | 1280×900 | rpg     | dark  |
| `1280-rpg-map-fresh-light.png`                                 | `d6308678e8983e8c983f30274917423f070dfdf636abb88bca99d5cbcd7435c3` | `/rpg/map`                         | fresh      | 1280×900 | rpg     | light |
| `1280-rpg-map-progressed-dark.png`                             | `ed61879fbd3b206c0daa49847f3241fd587436057695c6968d9ad445561e6c81` | `/rpg/map`                         | progressed | 1280×900 | rpg     | dark  |
| `1280-rpg-map-progressed-light.png`                            | `ed61879fbd3b206c0daa49847f3241fd587436057695c6968d9ad445561e6c81` | `/rpg/map`                         | progressed | 1280×900 | rpg     | light |
| `1280-rpg-module-week-0-progressed-dark.png`                   | `32739f532c9bbc8f10dc7bec624f7c92ad8a88efd79cca7101fb2be5d2225ed6` | `/rpg/week/week-0`                 | progressed | 1280×900 | rpg     | dark  |
| `1280-rpg-module-week-0-progressed-light.png`                  | `32739f532c9bbc8f10dc7bec624f7c92ad8a88efd79cca7101fb2be5d2225ed6` | `/rpg/week/week-0`                 | progressed | 1280×900 | rpg     | light |
| `1280-rpg-resource-week-0-lecture-progressed-dark.png`         | `582d00879332a9d284bb728ddad3a94da5ad984a0725fa273d4d943c24ad302a` | `/rpg/resource/week-0-lecture`     | progressed | 1280×900 | rpg     | dark  |
| `1280-rpg-resource-week-0-lecture-progressed-light.png`        | `582d00879332a9d284bb728ddad3a94da5ad984a0725fa273d4d943c24ad302a` | `/rpg/resource/week-0-lecture`     | progressed | 1280×900 | rpg     | light |
| `1280-rpg-settings-progressed-dark.png`                        | `24eff23377efa81818e5aa27cfd5aa8dd145a4a6ffe4ceaace82731ea993ad55` | `/rpg/settings`                    | progressed | 1280×900 | rpg     | dark  |
| `1280-rpg-settings-progressed-light.png`                       | `7c2af4d3829b9c1cc83131681438327ea728a8dea614add334eb4f92cecf8a95` | `/rpg/settings`                    | progressed | 1280×900 | rpg     | light |
| `390-classic-achievements-progressed-dark.png`                 | `b1ed82e8ce00759d81ed3c7c2cffbc340c51d062b3ac486d0a79a749d0aa9a63` | `/achievements`                    | progressed | 390×844  | classic | dark  |
| `390-classic-achievements-progressed-light.png`                | `fe17cb461218a6f366a610c00cca265250082b135f260088b55409082ce4275b` | `/achievements`                    | progressed | 390×844  | classic | light |
| `390-classic-content-week-0-problem-set-progressed-dark.png`   | `dc2d2d40903565926d14788b534098ff14dfc802b43f40b4abe95c42c46e44f0` | `/course/week-0-problem-set`       | progressed | 390×844  | classic | dark  |
| `390-classic-content-week-0-problem-set-progressed-light.png`  | `5c75036f5b9666983ade24aefc0b55ccc7d7b6c6ed425aa4f3f2b0da8956fe59` | `/course/week-0-problem-set`       | progressed | 390×844  | classic | light |
| `390-classic-course-progressed-dark.png`                       | `0f0efd2cb11438a2b4751cef40718e16e21ba2cca356fc1f371826bbd2e30401` | `/course`                          | progressed | 390×844  | classic | dark  |
| `390-classic-course-progressed-light.png`                      | `a341015bd9b847c591f03a56549583a88b0df7891e4728e3aaa8a9c4ed6643d8` | `/course`                          | progressed | 390×844  | classic | light |
| `390-classic-dashboard-progressed-dark.png`                    | `1e4b450dcd60dc514c854964f0e51f577776618b1d94c8f33e9a3914f29d2109` | `/dashboard`                       | progressed | 390×844  | classic | dark  |
| `390-classic-dashboard-progressed-light.png`                   | `feab57a94cdc5d08068f2e2312c597d3a9786e6c331d207df81253722626abcc` | `/dashboard`                       | progressed | 390×844  | classic | light |
| `390-classic-settings-progressed-dark.png`                     | `0388ad9dbb411bf61e100f84b2664ba03f9d3ef6ecf63b0a873fac38f4bdbd23` | `/settings`                        | progressed | 390×844  | classic | dark  |
| `390-classic-settings-progressed-light.png`                    | `491eca4c586668d1dc3537413960d014010972a6b6ff19d763680a0dedd9c8a4` | `/settings`                        | progressed | 390×844  | classic | light |
| `390-rpg-badges-progressed-dark.png`                           | `d1f43648279747ba96d64572410759f6e15f009fcf0d372f9c0e7cc8a6b4f798` | `/rpg/badges`                      | progressed | 390×844  | rpg     | dark  |
| `390-rpg-badges-progressed-light.png`                          | `d1f43648279747ba96d64572410759f6e15f009fcf0d372f9c0e7cc8a6b4f798` | `/rpg/badges`                      | progressed | 390×844  | rpg     | light |
| `390-rpg-focus-progressed-dark.png`                            | `2cb8940d28bcfef9cfa5f7d3916ab7840bb4627710b08a7c7208dfa3a1ac70fd` | `/rpg/focus?itemId=week-0-lecture` | progressed | 390×844  | rpg     | dark  |
| `390-rpg-focus-progressed-light.png`                           | `2cb8940d28bcfef9cfa5f7d3916ab7840bb4627710b08a7c7208dfa3a1ac70fd` | `/rpg/focus?itemId=week-0-lecture` | progressed | 390×844  | rpg     | light |
| `390-rpg-hero-progressed-dark.png`                             | `b09b4b8f2f6580f98af9f116b03b86427d1ae8c3494b9f3e46af151813189bd5` | `/rpg/hero`                        | progressed | 390×844  | rpg     | dark  |
| `390-rpg-hero-progressed-light.png`                            | `b09b4b8f2f6580f98af9f116b03b86427d1ae8c3494b9f3e46af151813189bd5` | `/rpg/hero`                        | progressed | 390×844  | rpg     | light |
| `390-rpg-hub-fresh-dark.png`                                   | `58f3fa06631c71a729c972c860ef0a9469c2c4f689a55270140d75ac0dbc6537` | `/rpg`                             | fresh      | 390×844  | rpg     | dark  |
| `390-rpg-hub-fresh-light.png`                                  | `58f3fa06631c71a729c972c860ef0a9469c2c4f689a55270140d75ac0dbc6537` | `/rpg`                             | fresh      | 390×844  | rpg     | light |
| `390-rpg-hub-progressed-dark.png`                              | `42adb5ec451a8bcd07a77eeb3ecc55d7ab0633c545746e3754a9f26ad6d19b36` | `/rpg`                             | progressed | 390×844  | rpg     | dark  |
| `390-rpg-hub-progressed-light.png`                             | `42adb5ec451a8bcd07a77eeb3ecc55d7ab0633c545746e3754a9f26ad6d19b36` | `/rpg`                             | progressed | 390×844  | rpg     | light |
| `390-rpg-log-progressed-dark.png`                              | `427c00d730b21a03e3209568f2e8f3cea94d3b4cf051d5423795bdeb7d7f39f5` | `/rpg/log`                         | progressed | 390×844  | rpg     | dark  |
| `390-rpg-log-progressed-light.png`                             | `427c00d730b21a03e3209568f2e8f3cea94d3b4cf051d5423795bdeb7d7f39f5` | `/rpg/log`                         | progressed | 390×844  | rpg     | light |
| `390-rpg-map-fresh-dark.png`                                   | `68d4c0d56135479b1ecee72ed21cfb8c04222033c081507db04d1a8e17624918` | `/rpg/map`                         | fresh      | 390×844  | rpg     | dark  |
| `390-rpg-map-fresh-light.png`                                  | `68d4c0d56135479b1ecee72ed21cfb8c04222033c081507db04d1a8e17624918` | `/rpg/map`                         | fresh      | 390×844  | rpg     | light |
| `390-rpg-map-progressed-dark.png`                              | `23579814508fcc483febeea6c14d935e0d8457fe94578c82b98015bd21723228` | `/rpg/map`                         | progressed | 390×844  | rpg     | dark  |
| `390-rpg-map-progressed-light.png`                             | `23579814508fcc483febeea6c14d935e0d8457fe94578c82b98015bd21723228` | `/rpg/map`                         | progressed | 390×844  | rpg     | light |
| `390-rpg-module-week-0-progressed-dark.png`                    | `820a79a089b2ab335991bb730ba8da88757c27edecbaefa580da663f76aaf375` | `/rpg/week/week-0`                 | progressed | 390×844  | rpg     | dark  |
| `390-rpg-module-week-0-progressed-light.png`                   | `820a79a089b2ab335991bb730ba8da88757c27edecbaefa580da663f76aaf375` | `/rpg/week/week-0`                 | progressed | 390×844  | rpg     | light |
| `390-rpg-resource-week-0-lecture-progressed-dark.png`          | `70c3532cbe51875de230c4a63d2b347ce041b490ccd68eca8e631b03d1a2b46d` | `/rpg/resource/week-0-lecture`     | progressed | 390×844  | rpg     | dark  |
| `390-rpg-resource-week-0-lecture-progressed-light.png`         | `70c3532cbe51875de230c4a63d2b347ce041b490ccd68eca8e631b03d1a2b46d` | `/rpg/resource/week-0-lecture`     | progressed | 390×844  | rpg     | light |
| `390-rpg-settings-progressed-dark.png`                         | `2b1f86c86f97b38742a60fd86c5782ffb91a20b3f8ef28763a78c7dbefc40e3a` | `/rpg/settings`                    | progressed | 390×844  | rpg     | dark  |
| `390-rpg-settings-progressed-light.png`                        | `4a53fda07bbfcfe580f37ce4a744cf477d5036937dc0699b0194f6af0f5ea976` | `/rpg/settings`                    | progressed | 390×844  | rpg     | light |
