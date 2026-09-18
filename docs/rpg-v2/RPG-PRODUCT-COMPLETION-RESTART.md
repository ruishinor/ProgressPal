# ProgressPal RPG Product-Completion Restart

Status: validated local publish-readiness candidate; owner visual/product review and publication prerequisites pending (2026-09-17)

Historical checkpoint (2026-09-16): the owner authorized commit, tag, freeze, and push of `rpg/product-completion` as `freeze/rpg-product-completion-2026-09-16`. C0-C5 and final owner-review corrections are preserved. Sections 1–10 retain that historical scope, acceptance evidence and freeze boundary. Section 11 records the subsequent authorized local reopening. PR, merge, deployment, version changes, and RPG default promotion remain separate owner decisions.

Date: 2026-08-12

Baseline: `master` at `feafd522ba53db3984790fa56b761586c5d7307a` / `v1.3.0-local-first-proof`

Scope: finish the intended RPG study experience over the released v1.3 local-first engine

## 1. Outcome

v1.3 is frozen. This is not another stabilization, certification, or release-remediation plan.

The next product objective is narrower:

```text
Turn the existing /rpg route set into one coherent, character-led daily study
loop while Classic remains the default/control and the v1.3 engine remains
authoritative.
```

This proposal uses a roadmap acceptance-audit and corrective-course lens. It is
not a claim that formal BMAD governance controls the repository.

## 2. Established baseline

### Repository

- Branch: `master`.
- Commit: `feafd522ba53db3984790fa56b761586c5d7307a`.
- Exact tag: `v1.3.0-local-first-proof`.
- Worktree was clean after the user removed the unrelated archive.
- No release gate was rerun.

### Live application

A fresh synthetic browser profile was checked against
`https://progress-pal-seven.vercel.app` on 2026-08-12.

- First use opened onboarding and then the Classic dashboard.
- Classic remained the default.
- `/rpg`, `/rpg/map`, `/rpg/week/week-4`,
  `/rpg/resource/week-0-lecture`, `/rpg/focus`, `/rpg/hero`,
  `/rpg/badges`, `/rpg/log`, and `/rpg/settings` all rendered their expected
  headings.
- Every RPG route rendered the RPG shell and bottom navigation without the
  Classic shell.
- The Campaign Map rendered 14 real course units.
- The checked desktop routes had zero horizontal overflow.
- No console warning, console error, or page error was observed.

This establishes behavioral continuity with the released baseline. It does not
re-certify v1.3 and is not a new release claim.

### Implementation branch

All C0-C5 work occurs on one branch created directly from the released baseline:

```text
rpg/product-completion
```

Use one concern-scoped commit for each completed module. Do not implement these
modules directly on `master`, and do not create a branch or pull request per
module. The latest owner instructions require separate explicit authorization
for any push, PR, merge, or deployment, even after local checks pass.

### Audit evidence

Current-run screenshots are stored outside the repository at:

```text
C:\Users\alex_\.codex\visualizations\2026\08\12\019ff36b-fca7-7740-a26a-53b0ef9f52d1\rpg-baseline\
```

The set covers the Classic dashboard; RPG Hub; Campaign Map; Week 4; Study
Resource; Focus; Hero; Achievements; Insights; Settings; and representative
390 px mobile states.

## 3. The specific intended RPG working state

The target is not "more RPG styling." It is this observable product state:

1. Classic still opens by default, but a learner can deliberately enter RPG
   mode and can deliberately return to Classic without editing the URL.
2. The same learner portrait, name, level, XP, rank, and current quest remain
   consistent across the HUD, Hub, Hero, and Settings.
3. The RPG Hub puts the current quest and next action first. It does not repeat
   the HUD as a second dashboard.
4. The Campaign Map communicates course position as a path, using the real
   bundled units and one accessible DOM representation rather than two complete
   lists.
5. Hub -> Map -> Week -> Resource -> Focus is one context-preserving workflow.
6. An explicit progress or session save reports only real consequences from the
   existing engine: saved status, XP actually awarded, achievements actually
   unlocked, updated HUD state, and the next real quest.
7. Focus, Achievements, Insights, and Settings reuse Classic behavior but feel
   like coherent parts of the RPG shell. They do not look like unrelated light
   pages pasted onto a dark canvas.
8. The core loop is usable at 390 px, by keyboard, after an offline reload, and
   without hidden content behind navigation.

Reaching this state does not prove RPG is superior to Classic and does not
authorize making RPG the default.

## 4. Evidence-backed delta

| Surface           | What already works                                        | Remaining product gap                                                                                               | Priority |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| Classic entry     | Stable default and control                                | No visible route into RPG mode                                                                                      | Required |
| RPG exit          | Direct URLs work                                          | No visible return to Classic                                                                                        | Required |
| Hero HUD          | Real portrait, XP, level, rank, and quest                 | Mobile HUD is tall; Hub repeats much of it                                                                          | Required |
| Hub               | Real local summaries and current-quest CTA                | Long card stack; current work is diluted by duplicate identity/progress panels                                      | Required |
| Campaign Map      | Real units, status, progress, normal links                | "Map" is a vertical card list followed by a duplicate 14-unit plain list; optional zero-required units read as 100% | Required |
| Week detail       | Real tasks and Focus/Resource links                       | Repeated links need task-specific accessible names; mobile navigation competes with action rows                     | Required |
| Study Resource    | Real official link, local progress form, explicit writes  | Several actions compete; saved feedback omits unlocked achievements and the next quest                              | Required |
| Focus             | Full Classic timer/manual/session behavior is shared      | Light Classic cards conflict with the shell; manual entry and history dominate the RPG task flow                    | Required |
| Hero              | Real derived totals and rank                              | Main Hero shows an initial while the HUD/Settings show the configured portrait; no direct profile-edit path         | Required |
| Achievements      | Real definitions and unlock truth                         | Light Classic grid, repeated `0 XP` noise, weak earned-artifact hierarchy                                           | Required |
| Insights          | Real factual local summaries                              | Light Classic cards and a Classic-route achievement link break shell continuity                                     | Required |
| Settings          | Real controls and the strongest existing RPG token bridge | Long but trustworthy; no redesign is required                                                                       | Preserve |
| Mobile navigation | Semantically valid links and active state                 | Seven text columns visually merge at 390 px and the sticky bar crosses the current viewport's controls/content      | Required |

These are product-completion gaps, not reopened v1.3 release defects.

### Audit flow health

1. Classic Dashboard — **healthy control**: clear next task and stable local
   status, but no deliberate RPG entry.
2. RPG Hub — **functional, structurally weak**: real data and Continue action,
   but duplicated identity and a long dashboard-like panel stack.
3. Campaign Map — **functional, target not met**: all real units are reachable,
   but the visible path is a card list followed by the same list again.
4. Week Detail — **mostly healthy**: real tasks and actions are clear; repeated
   action labels and the mobile navigation need correction.
5. Study Resource — **mostly healthy**: official resource and local write are
   honest; action hierarchy and post-save continuity are incomplete.
6. Focus — **behaviorally healthy, visually broken**: the complete Classic
   capability works, but its light forms do not belong to the surrounding shell
   and secondary work dominates.
7. Hero — **inconsistent**: derived facts work, but the portrait conflicts with
   the HUD and editing is disconnected.
8. Achievements — **behaviorally healthy, visually unfinished**: truth and
   filters work; presentation remains a light Classic grid with `0 XP` noise.
9. Insights — **behaviorally healthy, visually unfinished**: factual summaries
   work; theme and internal route continuity do not.
10. Settings — **healthy reference wrapper**: authoritative controls and the
    current RPG token bridge work; preserve this pattern.

Evidence limits: the audit used synthetic empty-state data and screenshots plus
DOM/runtime observations. It did not execute a save, perform keyboard-only or
screen-reader testing, or measure color contrast. Those are implementation gate
requirements, not claims made by this audit.

## 5. Sequential implementation roadmap

The modules below are the complete core sequence. Do not add parallel polish
streams.

### RPG-C0 - Reconcile the restart authority

Goal: make future implementation start from the released baseline and this
delta, not from the stale June post-2G next action.

Change only material that can still misdirect the next coding session:

1. Mark this restart roadmap accepted.
2. Add one obvious current-next-action pointer at the top of
   `ROADMAP-rpg-v2-source-of-truth.md`; retain RPG-00..15 as historical
   implementation context.
3. Mark obsolete current-state instructions as superseded where they would
   otherwise direct work back to post-2G validation.
4. Add a short historical/superseded notice to
   `docs/ProgressPal CS50 RPG v2 - 26-06-23.md`. Do not execute its
   default-switch, schema/persistent-disclosure, cosmetic-title, or Journey Log
   instructions.
5. Change `ASSETS.md` or `RISK_REGISTER.md` only where a currently active false
   statement is likely to misdirect C1-C5 implementation.

Do not rewrite historical `VALIDATION_LOG.md` entries. If clarification is
required, append one current-state note or add one header. Do not create another
decision unless an implementation module genuinely requires a new product
choice. C0 is a small documentation commit, not a governance phase.

Maximum expected files:

```text
docs/rpg-v2/RPG-PRODUCT-COMPLETION-RESTART.md
docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
docs/ProgressPal CS50 RPG v2 - 26-06-23.md
```

`DECISIONS-rpg-v2.md`, `VALIDATION_LOG.md`, `ASSETS.md`, and
`RISK_REGISTER.md` are not automatic C0 edit targets. Touch one only when the
minimal current-state pointer cannot prevent a concrete implementation misread.

Acceptance:

- no active current-state text says post-2G release validation is next;
- v1.3 remains frozen and Classic-default;
- this six-module product sequence is the only current RPG next action;
- historical evidence remains intact.

### RPG-C1 - Make the shell enterable, escapable, compact, and consistent

Goal: establish one usable mode boundary and one identity across routes.

Implement:

1. Add one secondary `Open RPG` entry on the Classic dashboard. Do not add RPG
   to the Classic primary navigation and do not change the post-onboarding
   destination.
2. Add `Open Classic dashboard` to the RPG utility/overflow navigation.
3. Replace the seven-column mobile bottom navigation with four primary items
   (`Hub`, `Map`, `Focus`, `Hero`) plus an accessible `More` disclosure for
   `Achievements`, `Insights`, `Settings`, and `Classic dashboard`. Desktop may
   continue to show all destinations directly.
4. Keep the active route, focus order, touch target, and screen-reader labels
   explicit. Closing the disclosure must restore focus to `More`.
5. Compress the mobile HUD without removing portrait, level, XP, current quest,
   or the Continue action.
6. Render `ProfileAvatar` from the already-present
   `learnerAvatarConfig` on Hero and add a direct `Edit profile` link to RPG
   Settings. Do not add avatar fields or an editor.

Likely files:

```text
src/features/dashboard/routes/DashboardPage.tsx
src/features/rpg/shell/RpgShell.tsx
src/features/rpg/shell/RpgBottomNav.tsx
src/features/rpg/routes/RpgHeroPage.tsx
src/styles/rpg-shell.css
src/styles/rpg-components.css
tests/app/App.test.tsx
tests/features/rpg/shell.test.tsx
e2e/rpg-mobile-overflow.spec.ts
```

Acceptance:

- onboarding still lands on Classic Dashboard;
- RPG can be entered and exited without URL editing;
- mobile navigation labels do not merge and do not hide the active control;
- HUD and Hero use the same portrait and facts;
- Classic route hierarchy and behavior remain unchanged apart from the one
  explicit secondary entry.

### RPG-C2 - Recompose the Hub around the current quest

Goal: make the Hub a daily starting point instead of a second dashboard.

Implement with the existing `RpgHubSummary` only:

1. Put current quest, current module, status, expected time, and one Continue
   action in the first Hub content block.
2. Remove the duplicate learner-identity panel; the persistent HUD owns that
   information.
3. Merge required progress and weekly activity into one compact secondary
   summary.
4. Move recent activity behind a normal semantic disclosure or below the core
   action. Do not persist disclosure state.
5. For a new profile, show the recommended first quest as the useful empty
   state. Do not place a generic "no RPG activity" panel before it.
6. Keep Campaign Map as the secondary action.

Likely files:

```text
src/features/rpg/routes/RpgHomePage.tsx
src/styles/rpg-components.css
tests/app/App.test.tsx
tests/features/rpg/readModels.test.ts
```

Acceptance:

- the next real task, status, expected time, and Continue action are visible in
  the initial content viewport at 390 px and 1280 px without scrolling;
- learner identity is not duplicated below the HUD;
- all displayed values still come from the existing read model;
- opening the Hub remains read-only.

### RPG-C3 - Turn the course list into an honest campaign path

Goal: communicate position and progression without a canvas, fake locks, or a
second map model.

Implement:

1. Use one ordered list of real course units as both the semantic list and the
   visual path.
2. On desktop/tablet, style that list as a restrained connected route with the
   current module prominent. On mobile, reduce it to a clear vertical timeline.
3. Remove the duplicate full plain list from the default page.
4. Show `Optional` for zero-required optional units instead of presenting
   `0 / 0` as `100% complete`.
5. Preserve not-started, current, in-progress, completed, blocked, and optional
   text states. Do not invent locked future courses.
6. Give Week task actions task-specific accessible names such as
   `Open resource: Lecture 4: Memory`.

Likely files:

```text
src/features/rpg/routes/RpgMapPage.tsx
src/features/rpg/routes/RpgModulePage.tsx
src/styles/rpg-components.css
tests/app/App.test.tsx
tests/features/rpg/readModels.test.ts
e2e/rpg-mobile-overflow.spec.ts
```

Acceptance:

- each Campaign Map unit row appears once in the map's accessibility tree;
- current position and next route are visually clear;
- every unit remains a normal link;
- map -> week -> resource works at 390 px without horizontal overflow or
  obscured actions;
- no course/progress write occurs during navigation.

### RPG-C4 - Complete the explicit work-to-reward loop

Goal: make saved work visibly consequential without adding a reward system.

Implement:

1. Reorder Study Resource so title/status and the appropriate next action are
   first; keep the official resource link explicit and external.
2. Preserve the existing progress form and engine write. Do not duplicate the
   Classic progress command.
3. In RPG Focus, keep the shared Classic behavior but make the selected task and
   live timer the primary surface. Put manual entry and saved-session history
   in accessible RPG-only disclosures. Classic `/sessions` remains unchanged.
4. After an explicit resource or session save, show a single inline feedback
   surface containing only:
   - saved status/session;
   - XP actually awarded;
   - achievements actually unlocked;
   - updated level progress;
   - the next real quest/action.
5. If an update awards nothing new, say what was saved and omit invented reward
   language.
6. Refresh the existing HUD from the saved result. Navigation back to Hub/Map
   must then reflect the same local records.

RPG presentation code must not reproduce XP, achievement-unlock, level,
progress, or next-quest calculation logic. Consume the authoritative result of
the existing mutation where it already exposes the required fact. Otherwise,
after the write commits, reread the existing authoritative persisted/read-model
state and render that. Do not change the engine contract unless the existing
write-plus-reread path cannot truthfully express the result.

Likely files:

```text
src/features/rpg/routes/RpgResourcePage.tsx
src/features/rpg/routes/RpgFocusPage.tsx
src/features/sessions/components/StudySessionsSurface.tsx
src/features/rpg/shell/RpgShell.tsx
src/styles/rpg-components.css
tests/app/App.test.tsx
e2e/rpg-product-flow.spec.ts
```

The new E2E file is justified only because no current spec proves the complete
RPG save -> reward -> HUD -> next-quest flow. Reuse existing onboarding and
database helpers.

Acceptance:

- one explicit save creates the same records and XP/unlocks as Classic;
- repeat/update saves do not duplicate rewards;
- feedback appears only after a successful explicit write;
- HUD, Hub, Map, Achievements, and Insights reflect the saved facts;
- Focus retains start/pause/resume/finish/discard and manual-entry behavior;
- Classic resource/session behavior remains unchanged.

### RPG-C5 - Finish secondary-surface coherence and daily-use acceptance

Goal: remove the remaining wrapper seams, then prove the working RPG product
without promoting it.

Implement:

1. Apply the existing Settings token-bridge pattern to RPG Focus,
   Achievements, and Insights so shared Classic components remain behaviorally
   shared but no longer render as bright islands in the RPG shell.
   Prefer shared semantic RPG variant tokens/classes at the wrapper or
   shared-surface level. If multiple surfaces share one semantic role, fix that
   role once. Do not accumulate per-card or per-heading selector patches unless
   their semantics genuinely differ.
2. Measure contrast after the bridge; do not infer accessibility from the dark
   palette.
3. In Achievements, remove meaningless `0 XP` chips and strengthen earned,
   locked, requirement, and earned-date hierarchy using text and existing
   semantic state. Do not add an icon dependency or unapproved asset set.
4. Keep Insights factual. Route its achievement link to `/rpg/badges` in the
   RPG variant. Do not recreate Journey Log or add an event store.
5. Preserve Settings controls and warnings. Do not hide destructive actions or
   turn Settings into an RPG scene.
6. Remove only code made dead by C1-C5. Do not use this as a general cleanup
   phase.

Likely files:

```text
src/features/achievements/components/AchievementsSurface.tsx
src/features/insights/components/InsightsSurface.tsx
src/features/sessions/components/StudySessionsSurface.tsx
src/styles/rpg-components.css
tests/app/App.test.tsx
tests/architecture/achievementsFeature.test.ts
e2e/accessibility.spec.ts
e2e/rpg-mobile-overflow.spec.ts
e2e/rpg-product-flow.spec.ts
```

Acceptance:

- no unthemed light body remains inside the RPG shell;
- Focus, Achievements, Insights, and Settings keep one shared engine/capability;
- internal RPG links remain in the RPG route tree except the explicit Classic
  exit;
- no meaningless reward value is displayed;
- the full target state in section 3 is demonstrable.

## 6. Module gate and stop rules

### Work mode

Each implementation module is Mode C (next-module implementation) until a
failed acceptance criterion is found. A correction then becomes Mode B and may
fix only that module before its gate restarts.

### Required module protocol

For every module:

1. Inspect the exact starting diff and relevant source-of-truth sections.
2. Implement only the module's named concern.
3. Review the final diff once against data safety, local-only boundaries, fake
   mechanics, Classic regression, mobile usability, accessibility, and the
   module exclusions. Correct concrete findings in the same module.
4. After the final change, run the smallest relevant lint/type/unit/browser gate
   once.
5. If and only if a test demonstrates actual timing sensitivity, intermittent
   behavior, process leakage, a lifecycle race, or unexplained flakiness,
   correct the cause and require three consecutive focused passes of only the
   affected test or suite. Do not triple-run deterministic module gates.
6. Update the rolling completion record in this document with module, status,
   commit, scope, observed validation, deferred work, and next concern.
7. Commit implementation, tests, the rolling status update, and any necessary
   risk/asset evidence together before proceeding.

Do not create separate C0-C5 handoff documents. Git records the diff and commit;
this roadmap records current status. Do not run `npm run verify:release` during
normal product modules.

### Exact focused gates

All runtime-module commands run under Node 24 and npm 11.10.1. If that toolchain
is unavailable, stop; do not count Node 22 diagnostics as module evidence.
The managed `test:e2e` runner performs the production build, starts an isolated
preview on the reserved test port, and tears it down after Playwright exits.

Run the named group once after the module's final change. The commands are
newline-separated PowerShell commands; stop on the first failure and do not
claim later commands ran.

**C0 documentation gate**

For `git status --short`, only the accepted C0 document/status paths are
expected. Any unrelated path fails the gate.

```powershell
npx prettier --check docs/rpg-v2/RPG-PRODUCT-COMPLETION-RESTART.md docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md "docs/ProgressPal CS50 RPG v2 - 26-06-23.md"
git diff --check
git status --short
```

**C1 shell/identity gate**

```powershell
npm run lint
npm run format:check
npm run typecheck
npm test -- tests/app/App.test.tsx tests/features/rpg/shell.test.tsx tests/architecture/routeDefinitions.test.ts tests/architecture/rpgFeature.test.ts
npm run test:e2e -- e2e/rpg-mobile-overflow.spec.ts e2e/accessibility.spec.ts --workers=1
git diff --check
```

**C2 Hub gate**

```powershell
npm run lint
npm run format:check
npm run typecheck
npm test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts tests/architecture/rpgFeature.test.ts
npm run test:e2e -- e2e/rpg-mobile-overflow.spec.ts --workers=1
git diff --check
```

**C3 Map/Week gate**

```powershell
npm run lint
npm run format:check
npm run typecheck
npm test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts tests/architecture/routeDefinitions.test.ts tests/architecture/rpgFeature.test.ts
npm run test:e2e -- e2e/rpg-mobile-overflow.spec.ts e2e/release-candidate.spec.ts --workers=1
git diff --check
```

**C4 work/reward gate**

```powershell
npm run lint
npm run format:check
npm run typecheck
npm test -- tests/app/App.test.tsx tests/features/rpg/readModels.test.ts tests/architecture/rpgFeature.test.ts tests/architecture/localOnly.test.ts
npm run test:e2e -- e2e/rpg-product-flow.spec.ts e2e/sessions.spec.ts e2e/xp.spec.ts --workers=1
git diff --check
```

**C5 coherence gate**

```powershell
npm run lint
npm run format:check
npm run typecheck
npm test -- tests/app/App.test.tsx tests/architecture/achievementsFeature.test.ts tests/architecture/rpgFeature.test.ts tests/architecture/localOnly.test.ts
npm run test:e2e -- e2e/rpg-product-flow.spec.ts e2e/rpg-mobile-overflow.spec.ts e2e/accessibility.spec.ts e2e/offline.spec.ts --workers=1
git diff --check
```

### Backwards-compatibility minimum in every runtime module

- Classic default remains `/dashboard` after onboarding.
- Existing Classic routes remain functional.
- IndexedDB schema remains 2.
- Backup envelope remains 1.
- No passive route-load writes.
- No new XP, progress, session, or achievement rules.
- No external runtime asset/script/data request.
- No dependency or package change.

### Final RPG acceptance gate

After C5, run one focused RPG acceptance pass on the final unchanged tree,
covering:

```text
Classic first use -> Dashboard remains default
Classic Dashboard -> explicit RPG entry -> RPG Hub
Hub -> current quest -> Resource -> save progress -> truthful feedback
Resource -> Focus -> save session -> truthful feedback
HUD/Hub/Map/Achievements/Insights reflect the saved records
Hero portrait and facts match HUD/Settings
RPG -> explicit Classic exit
390 px / 768 px / 1280 px critical layouts
keyboard navigation and focus return for More/disclosures
axe on representative changed surfaces
offline reload on Hub, Resource, and Focus
no console warnings/errors, retries, skips, or unexpected network requests
```

Then run the ordinary whole-repository validation sequence once. That validates
the changed product; it does not reopen or rewrite the historical v1.3
certification.

### Final visual acceptance — current local checkpoint

After the automated gates pass:

1. Serve the production build locally from `rpg/product-completion` with isolated synthetic browser data.
2. Capture one review set at 390 px, 768 px, and desktop for Hub, Map, Week, Resource,
   Focus, Hero, Badges, Insights, and Settings.
3. Compare the review set against the observable target state in section 3.
   Record concrete mismatches; do not treat screenshots as functional QA.
4. Obtain one owner visual/product GO. This is the only visual approval
   checkpoint; do not add per-module visual approvals.
5. Stop at the owner checkpoint. Remote preview, push, PR, merge, deployment,
   production smoke, tags, and version changes need a later explicit owner decision.

Classic remains default throughout. Shipping the completed optional RPG mode is
not an RPG-default promotion. A release tag or version change remains a separate
owner decision.

## 7. Explicit exclusions

Do not add during this sequence:

- backend, account, auth, sync, cloud backup, analytics, telemetry, or AI;
- schema changes, a persistent collapsed-panel preference, or new stores;
- new XP, rank, class, title, guild, badge, inventory, currency, or cosmetic
  mechanics;
- a separate Journey Log engine or event table;
- embedded media, runtime course fetching, remote assets, or CS50/Harvard
  branding;
- a UI framework, state manager, icon package, animation package, or
  convenience dependency;
- a tactical HUD, cyberpunk dashboard, fantasy-metal skin, generic SaaS card
  grid, decorative asset dump, or military/operator styling;
- automatic RPG default promotion, v2 tag, deployment, or superiority claim;
- broad v1.3 re-audit, Module-3 reconstruction, P2 cleanup sweep, or repository
  governance project.

## 8. Change impact and recommendation

### Artifact impact

- The released v1.3 source and tags remain unchanged.
- The old RPG-00..15 and Shell 1..2G records remain historical evidence.
- The operative RPG sequence is the accepted C0-C5 sequence in this document.
- No separate PRD or epics file is required: the accepted RPG roadmap,
  migration contract, decisions, visual target, and this delta jointly provide
  the brownfield product contract.

### Technical impact

- Expected changes are concentrated in RPG routes/shell/CSS, variant-aware
  shared surfaces, tests, and narrow current-state documentation.
- Highest risk: visual changes to shared surfaces leaking into Classic.
- Highest-value regression protection: variant-scoped CSS, passive-read
  snapshots, one real RPG save-flow E2E, and Classic route checks.
- No rollback or engine rewrite is recommended.

### Recommendation

Approve direct adjustment through C0..C5. This is the smallest sequence that
closes the demonstrated gap between the released tracker proof and the intended
RPG working loop. A smaller sequence would leave either navigation,
course-position comprehension, or reward continuity materially unfinished. A
larger sequence would add mechanics or visual production that the product has
not justified.

### Proposal review record

The proposal and the owner-supplied execution correction were reviewed through
three lenses:

1. **Evidence and scope:** every required module maps to an observed route,
   source, or active-document gap; no new release claim or speculative mechanic
   is included.
2. **Implementation feasibility and compatibility:** named source/test paths,
   existing variant seams, read-model fields, mutation results, and managed E2E
   argument forwarding were checked against the repository. Classic, schema,
   backup, local-only, and dependency boundaries remain explicit.
3. **Execution value:** universal triple-pass gates, six handoff reports, and a
   documentation-heavy C0 were rejected because they add cost without
   proportional confidence. The accepted protocol uses one deterministic gate,
   focused repetition only for demonstrated flakiness, one rolling status, and
   one final preview-based visual checkpoint.

This is proposal-quality reasoning only, not runtime or release evidence.

## 9. Rolling completion status

### 2026-09-15–16 final owner-review corrections

C0-C5 are preserved. The owner review requested further identity/HUD, curated
asset, responsive, copy, and acceptance work; it was not a final product GO.
All review work stays local on `rpg/product-completion`. Remote preview, push,
PR, merge, deployment, tags, and version changes require a later owner decision.

- **Hero identity/HUD:** Identity | Progression | Current Quest. Shared portrait,
  prominent name/Rank/Guild, quieter Class/Path, live Level/XP object, and complete
  quest text are reused in the HUD and Hero. Mobile recomposes these groups and
  retains every identity field. The ordinary 390 px HUD is 277 px tall; tablet is
  237 px and desktop 163 px. Profile saves now refresh the HUD immediately through
  the existing app-state profile timestamp and authoritative read model.
- **Assets/campaign:** all 276 candidates in 16 categories were inspected using
  21 contact sheets, with individual inspection of selections. Seven optimized
  local WebP images total 37,762 B: one shared Guild emblem and six illustrations
  mapped to existing achievements. Level is a project-authored SVG outline with
  DOM text. Real week numbers, optional/final-project markers, path connectors,
  and progress tracks preserve the actual 14-unit course. See `ASSETS.md` for
  sources, sizes, rejected candidates, and owner-supplied usage basis.
- **Daily use:** removed redundant Hub introduction and Resource metadata card;
  saved notes/resume information remain available. RPG settings explain that
  the theme preference applies to Classic. Focus and coordination messages use
  learner-facing language. Fixed the light-profile bottom-nav palette and browser
  scrolling of keyboard focus behind the fixed navigation.
- **CSS budget:** the first final build exceeded the unchanged 10,000 B gzip
  limit (10,673 B). Shared RPG header classes, consolidated repeated rules, removal
  of unused selectors, and reduced decorative shadows/gradients brought it to
  **9,985 B**. Classic selectors and the variant token bridge remain intact.
  Visual review caught and corrected a Resource status selector accidentally
  renamed during consolidation; the final captures include that correction.
- **Dependency audit:** the reachable audit initially reported four affected
  development packages. Patched Vitest and its packages to 4.1.11, Browserslist
  to 4.29.0, baseline-browser-mapping to 2.11.23, and their required transitive
  dependencies. No dependency was added and production dependency versions did
  not change. Installed the updated lockfile with `npm ci`; the subsequent audit
  reported zero vulnerabilities. Relevant advisories:
  [Vitest](https://github.com/advisories/GHSA-82fw-gwwq-j7x9),
  [Browserslist](https://github.com/advisories/GHSA-c83g-rgw3-j3cx),
  [baseline-browser-mapping](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv).
- **Documentation:** narrowly reconciled current authority in AGENTS, README,
  CONTRIBUTING, roadmap, asset ledger, risk register, and the session boundary
  README. Historical release and C0-C5 records remain historical.

#### Acceptance evidence

Environment: Windows, Node 24.19.0, npm 11.10.1, production Vite build,
Playwright Chromium, synthetic data only. No certification gate was run.
Runtime candidate: `bf862a9` (including identity `db736f4`, assets `6e25cdd`, and
development dependency fixes `b266472`); subsequent completion edits are docs only.

| Command                                                                                                      | Result                                                                              |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `npm ci`                                                                                                     | PASS: exact updated lockfile installed                                              |
| `npm run lint`                                                                                               | PASS: zero lint warnings                                                            |
| `npm run format:check`                                                                                       | PASS: all matched files formatted                                                   |
| `npm run typecheck`                                                                                          | PASS                                                                                |
| `npm run build`                                                                                              | PASS                                                                                |
| `npm test`                                                                                                   | PASS: 50 files, 515 tests on patched Vitest                                         |
| `npm run test:e2e`                                                                                           | PASS: 59 tests, including Classic, RPG, recovery and offline                        |
| `npm run test:e2e -- e2e/rpg-product-flow.spec.ts e2e/rpg-mobile-overflow.spec.ts e2e/accessibility.spec.ts` | PASS: 24 tests after the final Resource selector repair                             |
| `npm run check:circular`                                                                                     | PASS: 188 files, no cycles                                                          |
| `npm run check:bundle`                                                                                       | PASS: CSS gzip 9,985 B; JS gzip 254,091 B; largest JS raw 318,646 B; no source maps |
| `npm run audit`                                                                                              | PASS: zero reported vulnerabilities after security patches                          |

The full suites passed after dependency/CSS consolidation. The final two-selector
Resource spacing repair was followed by build/budget checks, fresh/populated
visual tours, and the focused browser command above. No business logic changed
after the full unit run.

- **VERIFIED:** Classic default and deliberate RPG entry/exit; explicit progress
  save updates HUD/quest/Map; Focus pause/resume excludes paused time, saves one
  session and awards one XP transaction/achievement without completing its task;
  reload and passive navigation preserve the saved reward stores. Full fresh and
  populated tours also compare every IndexedDB table before and after navigation.
- **VERIFIED:** existing backup/export/import/reset and cross-tab protections
  pass. Offline cold starts cover Hub/Resource/Focus. After only an online Classic
  boot, the first offline RPG visit decodes the Guild image and all six previously
  unvisited achievement images. Schema, backup envelope, engine rules and service
  worker are unchanged by these review corrections.
- **VERIFIED:** axe checks on RPG and Classic routes, measured contrast with
  light/dark profile preferences, focus movement, reduced motion, form errors,
  More-menu keyboard behavior, and 24-Tab traversals across Resource/Focus/Settings
  at 390/1280 px pass in the exercised browser.
- **OBSERVED:** all nine RPG surfaces inspected at 1280 and 390 px; Hub, Map,
  Resource and Hero at 768 px. Fresh/populated tours plus long-name/quest stress
  at 320/390/768/1024/1280 give 49 layout cases: no horizontal overflow, broken
  images, console errors/warnings or unexpected external runtime requests.
  Populated records: 4/26 required tasks (15%), 320 XP/Level 2/Initiate, three
  sessions totaling 135 minutes, four achievements, and three active days.
- **Limitations:** no physical-device, Firefox/WebKit, or manual screen-reader
  testing; no new deployment/CI certification or production smoke. Extreme valid
  names and long quest text increase HUD height (418 px at 390 px) without hiding
  information. CSS budget has only 15 B remaining; subsequent CSS changes must
  recheck it. A clean audit is dependency evidence, not a claim of total security.
  The runner's NO_COLOR/FORCE_COLOR notice affects terminal coloring only; browser
  console checks are clean.

Local screenshots and logs are outside the repository:

```text
C:\Users\alex_\.codex\visualizations\2026\09\15\01a0a38c-2cfe-75b0-b476-6305f2cc58ed\
  review.html                         # selector-based screenshot gallery
  acceptance-fresh\                   # desktop/mobile/tablet + observations.json
  acceptance-populated\               # same routes + long-content stress
  final-unit-patched.log               # 515 passing tests
  final-e2e-patched.log                # 59 passing tests
  acceptance-focused-e2e.log           # final Resource/CSS regression checks
```

Retrospective: screenshots and axe alone did not detect keyboard controls being
scrolled behind navigation; direct Tab geometry isolated the fix to root scroll
padding. CSS consolidation required visual inspection as well as a size check;
the selector repair demonstrates why a passing build is not visual acceptance.

### 2026-09-16 preview follow-up — latest checkpoint

The owner subsequently reported a misaligned Guild value, missing quest XP
incentives, and a localhost startup failure. The earlier screenshot checkpoint
was not successful owner preview acceptance.

- **Guild:** vertically center the existing trait rows so the Guild emblem/label
  and name align in both shared HUD and Hero identity instances.
- **Quest incentive:** show remaining task XP in the HUD, Hub, Week task list and
  Resource header. A pure read model calls the existing reward evaluator and
  excludes ledger entries by the same source type/id pair used by the save path.
  Problem-set totals explicitly say "through acceptance"; the README/demo reward
  states its shared condition. A currently available week bonus is separate.
  Already-earned rewards are not offered again after a progress reversal. No XP
  rules, schema, writes, or dependency changes were introduced.
- **Custom name:** onboarding and Settings already expose Display name. Added
  browser coverage for saving a custom name, reloading, revisiting Settings and
  Hero, and preserving the reward stores.
- **Startup:** reproduced the exact stale-startup message under React StrictMode.
  A stopped effect's ready callback could resume under its replacement's active
  flag. The replacement could also inherit stale writer status before a database
  existed; the attempted freshness read then required a guarded database-creation
  write. Cancel callbacks per effect session and prove database absence using
  IndexedDB's database listing before opening it. Revision validation and Web
  Locks remain authoritative; no data clearing or lock bypass is involved.
  Startup correction and lifecycle tests are committed as `493c363`.
- **Regression evidence:** the new StrictMode test failed before the fix and now
  passes for fresh and existing closed databases, including a subsequent profile
  save. Full unit/integration run: **520 tests / 50 files passed**. Lint, format,
  typecheck, production build, circular-dependency check and audit passed (zero
  reported vulnerabilities). Bundle check passed: CSS **9,994 B gzip**, JavaScript
  **254,482 B gzip**, largest JavaScript chunk **320,329 B raw**, no source maps.
  Full managed production browser suite: **59 passed**, including accessibility,
  cross-tab ownership/recovery, backup/import/reset, XP and offline scenarios;
  no skipped or retried tests. Terminal color-environment notices are unchanged
  and do not affect browser results.
- **Live development preview:** synthetic Chromium checks at `localhost:5173`
  passed startup, onboarding-name persistence and Settings-name persistence after
  reload. Twelve Hub/Week/Resource/Hero layout cases at 320/390/1280 px have no
  horizontal overflow; Guild label/value centers differ by less than one pixel.
  No browser console errors were observed. The existing in-app browser profile
  also reopened successfully and displays the RPG Hub with the new quest reward.

Evidence remains outside the repository in the same visualization directory:
`owner-followup-unit.log`, `owner-followup-e2e.log`, and
`owner-followup/` (synthetic screenshots and `results.json`). The dev server is
left available for local owner review. This does not update production.

Retrospective: production-only browser tests do not exercise StrictMode's effect
restart. The permanent app regression now covers that lifecycle; live development
startup was checked separately. A successful screenshot capture does not establish
that the owner's preview session can open the app.

No physical-device, Firefox/WebKit, or manual screen-reader verification was added.
CSS has 6 B remaining under its fixed budget.

### 2026-09-16 owner-authorized repository freeze

Owner instruction: "Commit, tag, freeze and push accordingly."

- Freeze branch: `rpg/product-completion`.
- Immutable annotated tag: `freeze/rpg-product-completion-2026-09-16`.
- Validated runtime: `5610da1eee027055317ca9ce12c470d1e0368f44`, including startup
  correction `493c363`. The freeze commit adds documentation only; the tag identifies
  that complete checkpoint.
- Acceptance: the 520 unit/integration tests, 59 browser tests, static/build/audit
  checks and live preview observations above remain the evidence for this runtime.
  The freeze documentation receives formatting and whitespace validation; repeated
  runtime tests provide no additional evidence for this documentation-only commit.
- Package version stays `1.3.0`. Existing engine release tags stay immutable.
- Publish only the completion branch and this freeze tag to `origin`, together.
  This is a repository freeze, with no new production or release-certification claim.
- Stop implementation here. Further changes need a new owner instruction. PR,
  merge to `master`, deployment, version changes, and RPG default promotion remain
  separate decisions.

**Next:** verify the pushed branch and annotated tag resolve to the same freeze
commit. Preserve this checkpoint without further implementation.

Update this section in the same concern-scoped commit that completes each
module. Keep entries short.

```text
C0 - COMPLETE
Commit: e078850
Changed: accepted restart authority, one current roadmap pointer, one historical-input notice
Validation: targeted C0 formatting and diff checks passed
Deferred: none
Next: C1

C1 - COMPLETE
Commit: b8ac7c9
Changed: Classic/RPG entry and exit, responsive 4+More navigation, compact HUD, Hero portrait/edit path
Validation: lint, format, typecheck, 112 targeted tests, production build, and 17 browser/accessibility tests passed
Deferred: Hub composition remains C2
Next: C2

C2 - COMPLETE
Commit: 50b4f5f
Changed: task-first Hub, real recommended quest, compact progress snapshot, returning-user activity disclosure
Validation: lint, format, typecheck, 115 targeted tests, production build, 7 mobile browser tests, and diff checks passed
Deferred: Campaign Map and Week structure remain C3
Next: C3

C3 - COMPLETE
Commit: 7fe764d
Changed: one semantic campaign path, honest optional-unit state, prominent current/next route, task-specific Week action names
Validation: lint, format, typecheck, 120 targeted tests, production build, 13 route/mobile browser tests, and diff checks passed
Deferred: resource/focus save-to-reward feedback remains C4
Next: C4

C4 - COMPLETE
Commit: 51bd668
Changed: task-first Resource actions, RPG Focus disclosures, authoritative save/reward/level/next-quest feedback, HUD refresh
Validation: lint, format, typecheck, 117 suite tests plus 3 clean focused passes for one unrelated 5 s keyboard timeout, production build, 5 product/session/XP browser tests, and diff checks passed
Deferred: cross-surface semantic styling and final cleanup remain C5
Next: C5

C5 - COMPLETE
Commit: this status entry's containing C5 commit
Changed: variant-scoped secondary-surface tokens, factual achievement states, RPG-local insight links, measured contrast coverage
Validation: lint, format, typecheck, 111 targeted tests, production build, 25 product/mobile/accessibility/offline browser tests, and diff checks passed
Deferred: final unchanged-tree acceptance and owner preview review
Next: final acceptance
```

## 10. Completion boundary

The owner authorized the completed branch to be committed, tagged, frozen, and
pushed on 2026-09-16. The current task ends after the freeze commit and annotated
tag are verified on `origin`. Preserve C0-C5, final review corrections, evidence,
and limitations. Do not claim that live production has been updated.

After a separately authorized future shipping step and production smoke, the
shipping report may state:

```text
RPG working-state implementation: complete.
Live optional RPG mode: updated.
Classic default/control: unchanged.
RPG superiority: not claimed.
RPG default promotion: separate owner decision.
```

Do not automatically start a comparison study, switch the default, create a
release tag/version, or begin another roadmap.

## 11. Local publish-readiness reopening

The owner authorized the bounded implementation and validation described in the
ProgressPal Autonomous Publish-Readiness Execution Prompt, resumed on 2026-09-17.
Work is local on `rpg/publish-readiness`, based on the verified clean freeze commit
`56a8b5ced15fb580a737e7dd6f36fcc74f08ceca` (runtime `5610da1`). No historical branch
or tag has moved. This instruction supersedes the earlier implementation stop only
for this scope; it does not authorize publication.

**Local candidate ready. Owner review pending. Publication prerequisites pending.**
No required local check or material known local defect remains unresolved within
the tested scope. This is not a release certificate or a production verification.

Tested code: `bef04111056e03beabeb9311451532f457c4ff1f`. The ordinary gate ran with
only this completion record, README and AGENTS documentation changes uncommitted.
The commit containing this final section is a documentation-only successor;
it does not change the tested runtime or tests. Its resolved SHA and clean final
status are recorded in the ignored evidence index, avoiding a self-referential
commit claim here.

### Implemented and verified concerns

- **Recommendation truth:** explicit actionable, needs-attention,
  required-complete and unavailable states. Catalog-derived cases cover all
  blocked, last required task blocked, blocked long-form progress, ordinary
  ordering, optional remainder, missing catalog and read errors. Blocked tasks
  remain inspectable; local completion never implies official CS50 completion.
- **Calendar consistency:** shared device-local Monday-week primitives, with
  half-open bounds ending at the next local Monday. Deterministic isolated
  timezone tests cover the reviewed Oslo session, exact boundaries, negative
  offsets and DST. Session-start, XP-award and latest-progress-update attribution
  remain distinct. Hub and Insights agree for comparable records.
- **Save outcomes:** failure injection confirmed the successful-write/failed-read
  misreport. Resource and shared session handling now preserve committed results,
  distinguish failed refreshes from write failures, retry reads without rewriting,
  preserve unsaved input and guard rapid/unchanged submissions. Deferred-operation
  regressions cover old route continuations overwriting a newer task or draft.
  Operation calls and XP/unlock ledgers are checked, including Classic sessions.
- **Hierarchy and copy:** Hub, Resource and Focus retain identity/progression
  without a competing HUD quest; Hero has one expanded identity and a direct edit
  action. Rank, Guild, Class, Path, Level and XP remain visible on mobile. The
  weekly metric says “Tasks last updated,” reflecting distinct current records.
  Existing theme wording correctly limits the preference to Classic.
- **Keyboard visibility:** expanded manual Focus coverage reproduced a textarea
  partly hidden behind fixed navigation. Scoped focus scrolling exposes the whole
  field using existing scroll padding. The regression now traverses every visible
  enabled control, including expanded Resource/Focus forms, instead of counting
  repeated Tab cycles. No layout, storage or CSS-budget change was needed.
- **Offline upgrades:** stopping the owned server reproduced a broader failure
  than the old cache comment described: changed shell HTML lacked its boot assets,
  and the documented ordinary online recovery did not repair it. The worker now
  validates and caches the exact navigation's same-origin JS/CSS before publishing
  its shell, serializes updates, and retains the previous shell on failure. Tests
  cover incomplete assets, wrong MIME/HTML rewrites, redirects, quota/network
  failures and navigation races. The manual package/cache-version contract stays
  unchanged; the worker never accesses IndexedDB.
- **CSP:** Firefox exposed Zod's dynamic-code capability probe as console CSP
  violations. The existing validation boundary enables Zod's supported jitless
  mode. Schema/backup tests and all three browser engines pass without weakening
  CSP or adding a dependency.

Local concern commits: `67765ce` (calendar), `1ecf5e6` (study loop/save outcomes),
`cb08556` (offline cache), `0f6f667` (CSP), `7debedd` (ignore generated evidence in
source checks), `10b32d6` (singular blocked-task copy), `bef0411` (keyboard).

### Final evidence

The portable [review index](../../artifacts/publish-readiness/review.html) uses
relative links to screenshots, logs and JSON reports under ignored
`artifacts/publish-readiness/`. Its [manifest](../../artifacts/publish-readiness/evidence.json)
records code/handoff SHAs, build checksums, environment, fixture conditions and
Git status. These synthetic artifacts are local review material, not tracked
release evidence. Historical 520/59 results are not used for this candidate.

Environment: Windows, Node **24.19.0**, npm **11.10.1**, locked dependencies unchanged.
The final ordinary gate completed on 2026-09-17 with these exact commands:

| Command                  | Result                                           |
| ------------------------ | ------------------------------------------------ |
| `npm run lint`           | Passed, zero lint warnings                       |
| `npm run format:check`   | Passed                                           |
| `npm run typecheck`      | Passed                                           |
| `npm run build`          | Passed                                           |
| `npm test`               | 55 files, **577 tests passed**, no skips         |
| `npm run test:e2e`       | **59 passed**, no retries or skips               |
| `npm run check:circular` | No cycles                                        |
| `npm run check:bundle`   | Passed; no production source maps                |
| `npm run audit`          | Endpoint reached; **0 vulnerabilities reported** |
| `git diff --check`       | Passed                                           |

Node's inherited `NO_COLOR`/`FORCE_COLOR` conflict warning remains visible in E2E
logs. It affects terminal formatting only and is classified as non-blocking for
this ordinary gate. Browser console checks contain no unexplained warnings or
errors. Later warning-strict certification needs an unambiguous color environment.

Measured bundle totals use the gate's gzip calculation, including `sw.js`:

| Measure              | Actual bytes |   Limit | Headroom |
| -------------------- | -----------: | ------: | -------: |
| CSS gzip             |        9,984 |  10,000 |       16 |
| Total JS gzip        |      256,658 | 400,000 |  143,342 |
| Largest JS chunk raw |      325,698 | 500,000 |  174,302 |

No production asset was added or changed. The seven existing WebPs remain
**37,762 bytes**; the existing portrait is **174,088 bytes**, separately counted.
Their recorded provenance is preserved; no new independent rights claim is made.
Selected visuals decode in production/offline checks.

The final browser evidence covers:

- **34 matched before/after pairs:** all nine surfaces at 390×844 and 1280×900;
  shell/Hub/Map/Resource/Hero at 768×900; representative populated surfaces.
  Same Alex profile, Oslo timezone, fixed 2026-09-16 clock and scrollY=0. Passive
  tours preserve every IndexedDB table; images decode; no horizontal overflow.
- **18 edge captures:** UI-generated all-blocked, last-blocked, required-complete
  with optional remainder, legitimate Level 1→2 and long-name/title states down
  to 320px. A synthetic catalog title is explicitly limited to layout testing.
  200% root-text reflow at 640×900 has no horizontal overflow and eight traversed
  controls clear fixed navigation.
- **Core flow:** Chromium **148.0.7778.96** in development/StrictMode, Firefox
  **150.0.2** and WebKit **26.4** in production. Classic onboarding → deliberate
  RPG entry → Resource save → Focus start/pause/resume/finish/save → progression,
  achievements, Hero/Insights → reload and Classic exit. Authoritative ledgers
  show one logical set of effects; More closes/restores focus and marks its route.
  Console and unexpected external request collections are empty.
- **Keyboard:** managed full-control traversal on Resource, expanded Focus and
  Settings at 390/1280px; six supplemental browser/viewport checks prove both
  manual Focus textareas remain fully above navigation. Captures were inspected.
- **Recovery and accessibility:** managed tests retain export/import/reset,
  rejected-import integrity, corrupt-metadata recovery, secondary read-only tabs,
  responsive layouts, axe, measured contrast, reduced motion and focus behavior.
- **Production offline:** fresh and previously unvisited routes, plus a frozen →
  candidate upgrade on one isolated origin. The owned HTTP server is fully stopped
  for offline checks. Nine offline conditions and online recovery pass; all-table
  hashes remain identical across 14 snapshots. A second phase tests changed boot
  assets with byte-identical worker source, so success does not depend on install.
  See `upgrade/2026-09-17T17-19-08-207Z/evidence.json` in the index.

Matched 390px measurements demonstrate the hierarchy change, without treating
above-the-fold placement as a universal requirement:

| Fixture/control                     |      Before |       After |
| ----------------------------------- | ----------: | ----------: |
| Fresh Hub/Resource/Focus HUD height |       298px |       181px |
| Populated Hub/Focus HUD height      |       340px |       181px |
| Fresh Hub heading / Continue top    | 343 / 736px | 226 / 553px |
| Populated Hub Continue top          |       799px |       574px |
| Fresh Focus Start control top       |     1,177px |       915px |
| Hero heading / Edit profile top     | 364 / 916px |  50 / 162px |

Hero removes the duplicate HUD identity. Focus's complete Start control needs
approximately 190px of scrolling to clear the fixed nav, versus 452px before.
These are geometry measurements, not a human usability/effectiveness claim.

### Limits, review and later publication

Classic remains default; schema 2, backup envelope 1, package/cache version 1.3.0,
same-origin storage, engine-owned reward/session rules, static imports and local
assets remain intact. No push, PR, merge, tag change, workflow dispatch or deployment
was performed. The frozen branch/tag still resolve to `56a8b5c`.

Not tested: physical iOS/Android devices, manual screen-reader operation or the
eventual hosted origin/CDN. Browser automation is not a physical Safari/mobile
certificate. Engineering and visual review here are agent self-review, not
independent human or owner acceptance. Human comprehension, motivation and learning effectiveness remain
unestablished. A never-visited installation cannot bootstrap offline. Same-version
old hashed assets remain cached until the normal version cleanup; simulated quota
failure preserves the previous complete offline shell rather than learner-data
deletion. No blanket security/accessibility/all-browser claim is made.

The checked-in static configuration retains SPA rewrites, self-only script,
connect and worker CSP, `nosniff`, frame restrictions and `/sw.js` no-cache. Local
preview does not prove hosted header/MIME/cache behavior; the upgrade fixture
applies these headers locally without claiming CDN equivalence.

Later operator checklist, **not executed**:

1. Obtain owner visual/product GO for this candidate. Record the exact chosen
   source/handoff commit and the currently serving deployment for rollback.
2. Prepare genuine candidate-specific review evidence and a corresponding module.
   CI currently uses `v1.3-final-candidate` and its historical review of `c572764`;
   that file is not applicable evidence for this new work. After separately
   authorized configuration/remote work, run one clean local `verify:release`
   and the D-0075 CI job on the chosen candidate. Do not fabricate approvals or
   reuse a historical certificate. Normalize conflicting terminal-color variables
   before the warning-strict gate; never suppress product warnings.
3. Confirm the actual target origin and preserve its backup/export path. A new
   origin or browser profile has different IndexedDB storage; moving the site
   does not transfer data. Import only a deliberately selected backup with consent.
   For later authorized Vercel operations, installing the missing CLI with
   `npm i -g vercel` is strongly recommended. No CLI installation is required for
   this completed local review and none was performed.
4. Obtain explicit authorization for the intended push/PR/merge/deployment actions.
   Publish only the exact reviewed artifact. Verify hosted Classic/RPG deep links,
   real JS/CSS MIME types, CSP/other headers, worker root scope and no-cache policy,
   decoded assets, no source maps, console/network, the save/reload loop and the
   same-origin online-update → offline path using synthetic data.
5. If hosted smoke fails materially, restore the recorded previous deployment and
   recheck it. A code rollback neither restores nor erases learner data. Do not
   clear IndexedDB or import a backup as an automatic rollback action.

Owner checkpoint: find the next task, save work, explain what changed and remains,
use Focus, inspect the blocked/completed examples, and return to Classic. The
review index supplies the examples; the local production preview supplies the
interactive flow. Request one visual/product GO after reviewing, with publication
still a separate decision.

Retrospective: browser offline emulation alone left worker network access, so the
first nominal upgrade result was invalidated and replaced with server-stopped
evidence. Fixture construction must respect existing blocked-state XP and seed
reconciliation. Generated evidence needed a narrow lint/format exclusion. A fixed
Tab count both broke after redundant links were removed and missed expanded-form
coverage; enumerating unique controls revealed the actual textarea overlap.
Future validation should establish these fixture/coverage boundaries first.

## 12. RPG-primary final candidate

This section supersedes section 11's current-work/default-mode restrictions under
new owner instruction dated 2026-09-18. Sections 1–11 and the immutable freeze
remain historical evidence. RPG is the primary/default experience; Tracker is
secondary. The bounded product correction pass is implemented on
`rpg/publish-readiness`, starting from `aa705bcd2b257ea0128b355a6c68d7c7b6edc9b5`.

Implemented concerns:

- Root, quick/custom onboarding and default backup restore enter `/rpg`.
  Explicit RPG/Tracker deep links survive onboarding. Tracker Profile is now
  `/profile`; its other routes retain their paths. User-facing mode copy says Tracker.
- One presentation helper supplies Start / Continue / Review blocked quest.
  Current-level XP derives from existing engine thresholds, including 210 lifetime
  XP rendered as `110 / 300 XP to Level 3`. Compact/detailed reward copy uses the
  existing evaluator and earned-source ledger without changing rules.
- Session assignment correction is an atomic coordinated repository mutation:
  task determines unit; only attribution, updatedAt and existing XP reason change.
  Source facts, award identifiers/amounts/dates and unlocks remain intact.
- Deliberate saved-status correction offers legal earlier states without changing
  the ordinary forward selector. Historical XP/unlocks persist and replay does not
  duplicate them. Blocked has a keyboard-operable explanation.
- All 16 achievement IDs have distinct local artwork, with fallback only for
  unknown IDs or failed images. RPG Insights starts with Course progress open and
  six sections closed; closed section bodies are unmounted. Tracker retains cards.
- A narrow density pass removes duplicate Hub counts and achievement labels,
  shortens Insights copy, uses amber for blocked states, and repairs save-heading
  contrast under the default light Tracker theme. HUD architecture, Focus,
  Settings and Map structure are retained.

No database/backup schema, XP curve, achievement rule, dependency, package version,
course catalog or service-worker implementation changed. Asset provenance and
exact file sizes are in ASSETS.md. CSS gzip measured 10,112 B before certification,
so its authorized ceiling is 12,000 B; JS ceilings remain unchanged (largest raw
chunk 368,186 B, total JS gzip 285,666 B in the focused production build).

Focused evidence uses synthetic data only:

- Route/onboarding/default restore and preserved explicit deep-link integration.
- CTA/level/reward models; backward accepted/completed progress corrections and
  reward replay; session preservation, invalid-target rollback and transaction
  failure rollback; peer-active rejection and exactly one coordinated revision.
- Production browser flows for correction, focus return, keyboard explanation,
  Insights disclosures/axe, and 320–430 px fixed-navigation obstruction checks.
- Targeted offline cold start decoded all 16 achievement images. The initial
  focused browser run passed 15/17; two stale expectations (six images and an
  already-open timeline) were repaired and both targeted reruns passed.
- Visual inspection at 390 and 1280 px: Hub, Resource, Awards and Insights; mobile
  session correction dialog/confirmation, saved status correction, More/Tracker.
  Fresh, started and all-required-blocked Hub states were separately inspected;
  the progressed fixture demonstrated 210 lifetime XP. Evidence is under ignored
  `artifacts/rpg-primary/` and is not a substitute for the release manifest.
- Changed routing and native keyboard disclosures passed isolated Chromium
  148.0.7778.96, Firefox 150.0.2 and WebKit 26.4 spot checks without page errors.

Candidate review: `docs/remediation/rpg-primary-final-release-review.json`.
Certification module: **rpg-primary-final-candidate**, pass 1. The tracked review
binds the corrected source commit; this documentation/workflow commit supplies
its review metadata. The immutable gate records the exact final commit, review
checksum, test counts and build checksums in ignored `artifacts/release-evidence/`.
A successful manifest for that exact HEAD is the certification result; this
pre-gate record does not predeclare a pass. Do not rerun an unchanged passing gate.

Remaining publication prerequisites: owner visual/product GO, real iPhone/Safari
and Android/Chrome checks, manual human screen-reader review, independently
triggered remote CI and hosted-origin smoke/rollback checks. These are NOT TESTED
by local emulation. No push, PR, merge, tag, version bump, remote workflow dispatch,
or deployment is authorized or performed. For later authorized Vercel work,
installing the missing CLI with `npm i -g vercel` is strongly recommended.

Retrospective: preserve proven baseline evidence and test changed contracts.
Fix stale UI assertions rather than weaken checks. Browser QA must focus native
summary controls, not their child headings, and synthetic repository writes must
respect the existing stale-revision guard. The final gate is the sole complete
candidate sweep; targeted development checks are not claimed as independent full
certification runs.
