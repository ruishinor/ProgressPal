# Epic C / C1 — RPG app-wide theme repair record

Status: **Repair history. R2 was owner-accepted, and C1 is accepted and
closed** (`C1_CLOSURE_RECORD.md`). Sections 1–5 record repair R, and section
6 records R2.

- The corrected retained capture was taken at S `69b1db7`, whose product
  bytes equal R2.
- Its archive `c1-visual-baseline-69b1db7.zip` is bound in
  `C1_VISUAL_BASELINE_MANIFEST.md`.
- The archive is committed in the docs/evidence-binding closure commit D.
- C2 is not authorized; it is blocked on OD-9.

## 1. Owner decision

Owner visual review of the first C1 capture candidate (M `e9da87a`) found that
captures labelled RPG light render the RPG UI dark. The owner established:

- **Theme is app-wide.** The one learner preference `preferredTheme`
  (`system` | `light` | `dark`) applies to Classic and RPG alike.
- RPG keeps its own identity in both themes. RPG light is a genuine RPG light
  presentation, not Classic styling.
- There is no separate RPG theme preference, no new persisted field and no
  schema change.
- RPG dark-only was **never owner-authorized**.
- The earlier capture candidate is invalidated. Its archive
  `c1-visual-baseline-b9ae4f3.zip` (SHA-256
  `b87c8f5f93b3b3ee5efda66791c8eaea266f3cdd2d85dfca7c958bb19de9a67a`) is
  **pre-fix / rejected visual evidence**. It is kept only as a comparison
  reference.
- **OD-8 policy:** the eventual owner-accepted corrected sealed ZIP will be
  committed to the repository. No new ZIP is committed before owner visual
  acceptance.

## 2. Root cause (verified from source and history)

- [F] `preferredTheme` is one learner-global persisted enum
  (`src/lib/domain/constants.ts`, `LearnerProfileSchema`).
  `AppStateProvider` resolves it (`system` follows `prefers-color-scheme` and
  its change events) and applies `html[data-theme]` and `color-scheme`.
- [F] RPG had a single dark `--rpg-*` palette scoped to
  `body.rpg-route-active` (`src/styles/rpg-tokens.css`, created in `42f250f`
  on 2026-06-21). It never read `data-theme`. `rpg-shell.css` and
  `rpg-components.css` also hard-coded dark-canvas values (`#17202b`
  on-accent text, `#080c11`/`#090d12` navigation mixes, the `rgb(9 13 18 /
0.72)` ring, the `rgba(244, 241, 232, 0.1)` track, the `rgba(5, 9, 14,
0.72)` overlay).
- [F] Later copy and tests codified the dark-only behaviour:
  - "RPG keeps its dark study theme" (`bf862a9`, 2026-09-16);
  - the "Classic appearance" label (`8ae0d40`, 2026-09-19);
  - the E2E oracle "shared RPG capability surfaces keep measured dark
    contrast under a light profile preference" (`8dce7f1`, 2026-08-12 — older
    than the brief assumed).

  None is an owner product decision. A test or a commit message is not owner
  authority, and these oracles encoded the defect.

- [F] The C1 capture candidate showed 20 of 22 RPG light/dark pairs
  byte-identical.
- [F] **RED on the unchanged product** (new `e2e/rpg-app-theme.spec.ts`,
  2026-09-26):
  - with `preferredTheme = light`, `html[data-theme]` was `light`, but the
    computed `--rpg-bg` was `#111923` (luminance 0.0094), so the RPG canvas
    stayed dark;
  - the four light, switch and system tests failed, and the dark test passed;
  - the old dark-contrast oracle passed, confirming it encoded the defect.
- [F] **Measurement defect found while repairing:** the contrast helper in
  `e2e/accessibility.spec.ts` parsed Chrome's `color(srgb r g b)`
  serialization of `color-mix()` backgrounds as near-black 0–255 channels. That
  misread accent/mix card backgrounds in every theme; on the dark path it read
  a darker-than-real background, so the measurement was not truthful. The
  parser now scales `color(srgb …)` channels. No threshold changed
  (`MIN_CONTRAST` stays 4.5).

## 3. Implementation

- **Tokens** (`src/styles/rpg-tokens.css`):
  - the RPG light palette is the default on `body.rpg-route-active`;
  - the accepted dark palette applies under
    `:root[data-theme='dark'] body.rpg-route-active`;
  - the 14 pre-repair dark values are unchanged;
  - seven semantic tokens replace the hard-coded dark-canvas values:
    `--rpg-on-accent`, `--rpg-on-success`, `--rpg-nav-shade`,
    `--rpg-nav-hub-shade`, `--rpg-nav-ring`, `--rpg-track` and
    `--rpg-overlay`. Each one's dark value is the exact literal it replaced.
- **Light palette:**
  - parchment canvas `#f3eee2`, surface `#fffbf3`, raised `#f0e7d4`;
  - ink text `#1b2430` / muted `#4a5260`;
  - amber-gold accent `#855510` / strong `#663f05`;
  - success `#286640`, warning `#835a0c`, danger `#a33c2c`;
  - on-accent `#fffaf0`.

  Every text pairing was computed at ≥ 4.5:1 on each RPG surface and mix
  before implementation.

- **No markup branching and no duplicate components.** RPG components, layout
  and the shared-capability token bridge are unchanged; only token values
  resolve per theme.
- **Startup:** `RpgRouteShell` still owns `body.rpg-route-active` in the
  loading, error and loaded states, so its tokens follow the theme in every
  route-shell state. Before a profile exists, `data-theme` is absent and RPG
  uses its light default, matching Classic's existing light default. Only a
  stale comment changed.
- **Copy:**
  - the settings theme field is labelled "Theme" in every mode, as in
    onboarding;
  - the settings description reads "Applies to both the Classic and RPG
    interfaces. System follows your device. Light and dark stay local to this
    app.";
  - the unused `ProfileForm` `variant` prop, which existed only to select the
    removed RPG-only copy, is removed, together with its pass-through in
    `SettingsSurface`.

## 4. Evidence changes in R

| Evidence                                                                     | Change                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New `e2e/rpg-app-theme.spec.ts`                                              | Discriminating computed-palette tests: light is genuinely light; dark equals the accepted palette exactly; saving from either Settings surface switches both interfaces; Classic ↔ RPG keeps the one preference; `system` drives both and follows device changes |
| `e2e/accessibility.spec.ts`                                                  | The dark-only oracle is replaced by measured contrast on RPG capability surfaces in light **and** dark, with a guard that the canvas matches the theme; RPG axe runs in both themes; the helper parses `color(srgb …)`                                           |
| `e2e/rpg-product-flow.spec.ts`                                               | Title, copy and label now express the app-wide theme                                                                                                                                                                                                             |
| Label oracles                                                                | "Classic appearance" → "Theme" in `tests/app/App.test.tsx`, `e2e/dashboard.spec.ts`, `e2e/rpg-mobile-overflow.spec.ts`, `e2e/b2-shell-visual-review.spec.ts`                                                                                                     |
| `e2e/c1-baseline-visual-capture.spec.ts`                                     | Before every RPG capture, asserts the computed `--rpg-bg` and body background for the theme (light `#f3eee2` / `rgb(243, 238, 226)`, dark `#111923` / `rgb(17, 25, 35)`)                                                                                         |
| `tests/preservation/c1TransientCopy.test.tsx` (new)                          | The 7 transient-state CS50 strings are asserted in their real rendered states (see `C1_EVIDENCE_COVERAGE.md` §2); the source scan is relabelled secondary characterization                                                                                       |
| `tests/preservation/c1VisualIdentity.test.tsx` and `c1-visual-identity.json` | The token section is regenerated (two RPG blocks); an explicit test pins the dark block. Asset hashes and the badge mapping are unchanged                                                                                                                        |

Unaffected C1 evidence was not regenerated: curriculum, reachability, XP
tables and ledger, preview, reward identities, achievements, the schema-2
fixture, links, guides and non-theme labels.

## 5. Expected visual comparison

The expectations below were verified at S with 0 unexpected rows: 36
identical and 28 expected-different captures. Details are in
`C1_VISUAL_BASELINE_MANIFEST.md` §6.

- Classic: identical to the pre-fix archive, except Settings (the theme field
  label and description changed; this is a required copy correction).
- RPG dark: identical, except RPG Settings (the same copy change).
- RPG light: every capture differs from the pre-fix "light" capture.
- New RPG light vs new RPG dark: no identical pair.

## 6. Repair iteration R2 (palette correction and startup theme truth)

R2 builds on R (`8e49ee2`). Sections 1–5 stay the record of R; where they name
R's light values, those values are superseded here.

### 6.1 Pre-mutation gate

The retained-run timeout of `RPG routes pass axe in the dark theme` (about
45.4 s) was rerun on unchanged R in a verified-stable environment with the
unchanged 30 s timeout: it passed in 13.1 s with no axe violations. The
earlier timeout is classified as environment-layer; the timeout is unchanged.

### 6.2 Startup wrong-theme preparation state

- [F] On a hard refresh the saved preference is known only after the verified
  local snapshot is read (after the 250 ms coordination discovery window,
  database initialization and revision verification). Until then
  `html[data-theme]` is absent.
- [F] **RED on R** (`e2e/rpg-app-theme.spec.ts`, "hard refresh (…)"): every
  animation frame of a real reload is sampled. For saved dark and for
  `system` with a dark device, the RPG preparation screen ("Preparing RPG")
  painted the light canvas (luminance 0.88) for about 17 frames (~290 ms)
  before the dark page loaded. The loaded page was already correct. Saved
  light and `system` with a light device passed.
- **Correction (RPG-local, presentation only):** the RPG loading section
  carries `rpg-shell--preparing`. While `html[data-theme]` is absent, that
  preparation screen is theme-neutral (`rpg-shell.css`): a neutral slate
  canvas `#6a6f76`, between both canvases in lightness, with its text at
  4.93:1. It asserts neither palette. The themed palette takes over as soon
  as the resolved preference applies `html[data-theme]`; loading states after
  that keep their resolved theme.
- No new persisted field, web storage, resolver, React state, schema change
  or change to the coordination/verified-snapshot startup path. The startup
  never guesses the saved choice from the device theme and never forces a
  theme.
- **Scenarios** (device theme set opposite to the saved choice, so a device
  guess or a forced theme would fail): saved light, saved dark, `system` +
  light device and `system` + dark device all pass. No preparation frame
  paints the opposite theme class, the preparation text stays ≥ 4.5:1 and
  the loaded state is the resolved theme.
- **Not changed, reported:** the static document before any application code
  runs (typically 2–5 frames) shows the Classic default canvas on every
  route; it has no theme source. Classic's own loading shell still renders
  its light default before the preference resolves, as it has since v1;
  neutralizing it would change the Classic shell and is outside C1.
- Live `system` behaviour is verified on computed colours in both directions
  for RPG and Classic.

### 6.3 RPG light palette

R's warm/parchment neutrals were rejected by the owner. Only the warm
neutrals and the tokens derived from them change. Text, muted text, the
amber/gold accents, progress, status colours, focus, the bronze strong
border, track, overlay and the entire dark palette are unchanged.

| Token                                     | R                         | R2 candidate              |
| ----------------------------------------- | ------------------------- | ------------------------- |
| `--rpg-bg`                                | `#f3eee2`                 | `#ecf1f5`                 |
| `--rpg-surface`                           | `#fffbf3`                 | `#fbfcfe`                 |
| `--rpg-surface-raised`                    | `#f0e7d4`                 | `#e5eaf0`                 |
| `--rpg-border`                            | `#c9b995`                 | `#b6c0cc`                 |
| `--rpg-nav-shade` / `--rpg-nav-hub-shade` | `#d9ccb0`                 | `#ced5dd`                 |
| `--rpg-nav-ring`                          | `rgb(243 238 226 / 0.72)` | `rgb(236 241 245 / 0.72)` |
| `--rpg-on-accent` / `--rpg-on-success`    | `#fffaf0`                 | `#fbfcfe`                 |

- **Method:** the accepted dark neutrals sit at OKLCH hue ≈ 252 (slate) with
  chroma 0.023–0.039 under a gold/bronze accent family (hue ≈ 83–87). The
  light neutrals keep that slate hue family at much lower chroma
  (0.003–0.021), so the gold hierarchy still reads as RPG and the canvas is
  neither warm (as R) nor Classic's cream. The surface/raised hierarchy and
  component geometry are unchanged. The border keeps panel separation close
  to R's (1.79:1 on surface vs 1.87:1).
- **Contrast:** every text pairing is equal to or better than R's; the real
  rendered soft-fill pairings stay ≥ 4.5:1 (lowest 4.63, danger on its soft
  fill).
- **Warmth guard:** each light neutral must have OKLab `b ≤ 0` (not leaning
  yellow) and chroma ≤ 0.025 (low colour intensity). R's values fail it
  (`b` +0.011 to +0.052); the candidate passes. It runs on the source tokens
  (`tests/preservation/c1VisualIdentity.test.tsx`) and on the computed tokens
  and painted canvas (`e2e/rpg-app-theme.spec.ts`).
- **Owner-accepted:** the owner accepted these light values at C1 closure.
  Their rendered appearance is bound by the retained baseline
  (`C1_VISUAL_BASELINE_MANIFEST.md`). The test oracles below were not changed
  at closure. The identity test pins the light token names and checks
  lightness, text contrast and neutrality; the dark block and every Classic
  block stay value-exact. The capture spec keeps the exact dark canvas and
  checks the light canvas structurally.
- **Guild emblem (found in the R2 visual review):** the emblem is opaque art
  on black, blended with `mix-blend-mode: screen`. That drops the black on
  the night canvas but washed the emblem out on the light canvas (also true
  of R's light candidate). A new semantic token `--rpg-emblem-blend` is
  `screen` in dark (the exact former literal, so dark is unchanged) and
  `normal` in light, where the emblem shows on its black roundel like the
  portrait beside it.

### 6.4 R2 evidence changes

| Evidence                                       | Change                                                                                                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/rpg-app-theme.spec.ts`                    | Startup scenarios (per-frame preparation/loaded sampling); light neutrality guard; rendered emblem blend per theme; `system` changes in both directions for RPG and Classic |
| `e2e/c1-baseline-visual-capture.spec.ts`       | Exact dark canvas; structural light canvas                                                                                                                                  |
| `tests/preservation/c1VisualIdentity.test.tsx` | Light block pinned by names plus a lightness/contrast/neutrality check; the fixture snapshot holds the current candidate values                                             |

Not run in R2: the retained C1 capture baseline. No review screenshots are
committed.
