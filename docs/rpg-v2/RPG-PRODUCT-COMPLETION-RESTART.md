# ProgressPal RPG Product-Completion Restart

Status: accepted for implementation with the 2026-08-12 execution-protocol corrections

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
module. After final acceptance and owner visual approval, merge one pull request
from this branch to `master`.

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

### Final visual and production acceptance

After the automated gates pass:

1. Create one preview deployment from `rpg/product-completion`.
2. Capture one review set at 390 px and desktop for Hub, Map, Week, Resource,
   Focus, Hero, Badges, Insights, and Settings.
3. Compare the review set against the observable target state in section 3.
   Record concrete mismatches; do not treat screenshots as functional QA.
4. Obtain one owner visual/product GO. This is the only visual approval
   checkpoint; do not add per-module visual approvals.
5. Merge one pull request to `master`.
6. Allow the existing Git-linked production deployment to complete.
7. Run a short production smoke covering Classic-default, RPG entry/exit, the
   core RPG study/save path with synthetic data, offline reload, console errors,
   and unexpected network requests.
8. Stop.

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
Commit: this status entry's containing C3 commit
Changed: one semantic campaign path, honest optional-unit state, prominent current/next route, task-specific Week action names
Validation: lint, format, typecheck, 120 targeted tests, production build, 13 route/mobile browser tests, and diff checks passed
Deferred: resource/focus save-to-reward feedback remains C4
Next: C4

C4 - PENDING
C5 - PENDING
```

## 10. Completion boundary

When C0-C5, automated acceptance, owner visual review, merge, production
deployment, and production smoke pass, report:

```text
RPG working-state implementation: complete.
Live optional RPG mode: updated.
Classic default/control: unchanged.
RPG superiority: not claimed.
RPG default promotion: separate owner decision.
```

Do not automatically start a comparison study, switch the default, create a
release tag/version, or begin another roadmap.
