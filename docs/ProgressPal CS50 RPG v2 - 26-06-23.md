> **Historical product input — superseded for execution.** This June 2026
> document explains the original RPG intention, but it is not a current build
> plan. Use `docs/rpg-v2/RPG-PRODUCT-COMPLETION-RESTART.md` for the accepted
> C0-C5 sequence. Do not execute this document's old branch, release,
> default-switch, schema/persistent-disclosure, cosmetic-title, or Journey Log
> instructions.

**Freeze the current app as the new live proof of the local-first CS50 tracker. Then start a narrower RPG-shell transformation phase from that frozen state.**

Do not treat the current build as failed RPG v2. Treat it as the engine finally reaching the maturity it should have had before the RPG wrapper began.

## 1. Product classification

Current state:

**ProgressPal CS50 Edition v1.2 — local-first CS50 tracker with gamified elements.**

Target state:

**ProgressPal RPG v2 — character-led CS50 campaign shell powered by the same local-first engine.**

That distinction should be made explicit in docs, branch names, tags, deployment labels, and AI prompts. Otherwise the next rounds will keep adding “RPG-ish panels” instead of actually changing the user experience.

The core aim is not to add more features. It is to change the main loop:

Current loop:

`Dashboard → Course Map → Task → Log Progress → View Stats`

Target RPG loop:

`Hero HUD → Current Quest → Focus / Log Work → Reward Feedback → Campaign Map / Journey Log`

The same engine can power both. The shell must change.

---

# 2. Immediate freeze plan: make the current state the live working proof

This should be done before any new RPG work.

## Step 0.1 — Start from the current RPG branch

From your repo:

```powershell
cd "C:\00 DEV\In Progress\ProgressPal"
git fetch --prune
git checkout rpg/v2
git status -sb
git log --oneline --decorate -5
```

Expected situation: current state is around the RPG-15 release-candidate commit.

## Step 0.2 — Fix reproducibility noise

Your previous ZIP had formatting/line-ending churn in four files. Fix that before freezing.

```powershell
npx prettier --write docs/rpg-v2/VALIDATION_LOG.md docs/rpg-v2/modules/RPG-15-HANDOFF.md e2e/release-candidate.spec.ts src/styles/rpg-shell.css
git diff --check
git status -sb
```

Then run the practical validation set:

```powershell
npm ci
npm run lint
npm run typecheck
npm run build
npm run format:check
npm run check:circular
npm run audit
```

For the freeze, do **not** get stuck trying to prove every non-critical E2E path three times. The freeze target is a working proof, not a formally certified release.

Minimum acceptable freeze evidence:

```powershell
npm run lint
npm run typecheck
npm run build
npm run format:check
npm run audit
```

Run unit tests if they are stable:

```powershell
npm run test
```

If Vitest still hangs because of fake-indexeddb/Dexie cleanup, document it as a known test-harness issue and do not block the visual proof release unless app build/runtime behavior is broken.

## Step 0.3 — Create a freeze branch

```powershell
git checkout -b release/v1.2-local-first-proof
git add .
git commit -m "release: freeze local-first CS50 tracker proof"
git push -u origin release/v1.2-local-first-proof
```

Open a PR into `master`.

PR title:

```text
Release v1.2 local-first CS50 tracker proof
```

PR description should say plainly:

```text
This release freezes the current local-first CS50 tracker as the new live working proof.

It is not the completed RPG v2 shell. It preserves the engine, course tracking, sessions, XP, achievements, profile setup, privacy/data controls, backup/restore, and early gamification surfaces.

RPG shell transformation continues separately from this frozen proof.
```

## Step 0.4 — Merge and tag

After PR review:

```powershell
git checkout master
git pull
git tag -a v1.2.0-local-first-proof -m "ProgressPal CS50 local-first tracker proof"
git push origin v1.2.0-local-first-proof
```

If Vercel production deploys from `master`, this should replace the previous engine deployment automatically. If Vercel is tied to another branch, update the project’s production branch to `master` or manually promote the deployment from this commit.

## Step 0.5 — Create the real RPG shell branch

```powershell
git checkout -b rpg/real-shell-v2
git push -u origin rpg/real-shell-v2
```

From this point onward, the goal is not “more modules.” The goal is shell transformation.

---

# 3. Recommended architecture

## Frontend

Keep the current stack.

Recommended:

```text
Vite
React
TypeScript
React Router
Dexie / IndexedDB
Zod
Vitest
Playwright for a few critical flows only
Plain CSS with tokens/components
```

Do **not** migrate to Next.js. Do **not** add Redux. Do **not** add a game engine. Do **not** add a gamification SaaS. Do **not** add a backend just because the architecture section asks for one.

The current project is strongest because it is local-first, inspectable, and small enough to understand.

## Backend

Recommended backend for the intended v2:

```text
No runtime backend.
Static deployment only.
All personal data remains in browser IndexedDB.
```

Use Vercel only as static hosting.

The only “backend structure” you should define now is an interface boundary for a possible future sync/export service. Do not implement it yet.

Future optional backend boundary:

```text
src/lib/sync/
  syncAdapter.ts
  localBackupAdapter.ts
  remoteSyncAdapter.stub.ts
```

The app should depend on an interface like:

```ts
export interface BackupAdapter {
  exportBackup(): Promise<BackupFile>;
  importBackup(file: BackupFile): Promise<void>;
}
```

Current implementation:

```text
LocalBackupAdapter only.
```

Future implementation, if ever needed:

```text
Encrypted remote blob sync.
No analytics.
No server-side course progress logic.
No RPG rules on the server.
```

## Database

Keep IndexedDB through Dexie.

The core rule:

**Persist facts. Derive game state.**

Do not store level, percentage complete, current rank, badge progress, or campaign status as primary truth unless they are cache-only. Those should be derived from saved progress, sessions, XP ledger, and achievement unlocks.

Recommended local schema:

```text
learnerProfile
  id
  displayName
  studyDays
  weeklyTargetMinutes
  theme
  motionPreference
  avatarConfig
  createdAt
  updatedAt
  onboardingCompletedAt

progressRecords
  itemId
  unitId
  status
  notes
  blockerReason
  startedAt
  completedAt
  updatedAt

studySessions
  id
  itemId
  unitId
  mode
  startedAt
  endedAt
  durationMinutes
  notes
  energyLevel
  stopReason
  createdAt

videoEvents
  id
  itemId
  sessionId
  startSecond
  endSecond
  createdAt

xpLedger
  id
  sourceType
  sourceId
  itemId
  unitId
  amount
  reason
  createdAt

achievementUnlocks
  achievementId
  unlockedAt
  sourceId
  xpAwarded

rpgPreferences
  id
  selectedTitle
  selectedAvatarId
  reducedMotion
  collapsedPanelState
  lastVisitedRoute
  updatedAt

appSettings
  id
  schemaVersion
  backupReminderDismissedAt
  lastExportedAt
```

Static definitions should stay in code or static JSON:

```text
courseCatalog
achievementDefinitions
levelCurve
badgeDefinitions
questTypeDefinitions
visualAssetManifest
```

Important: XP should be ledger-based. Badges should be unlock-based. Progress should be item-based. Level should be derived from total XP.

---

# 4. Directory structure for the fully realized RPG shell

The current project should move toward this shape without a full rewrite:

```text
src/
  app/
    router/
      router.tsx
      routes.ts
    shells/
      ClassicShell.tsx
      RpgShell.tsx
      SetupShell.tsx

  components/
    ui/
      Button.tsx
      Card.tsx
      DisclosureCard.tsx
      ProgressBar.tsx
      StatusPill.tsx
      EmptyState.tsx
      ConfirmDialog.tsx

  features/
    engine/
      course/
        courseCatalog.ts
        courseTypes.ts
      progress/
        progressActions.ts
        progressSelectors.ts
        progressTypes.ts
      sessions/
        sessionActions.ts
        sessionTypes.ts
      xp/
        xpLedger.ts
        levelCurve.ts
        xpSelectors.ts
      achievements/
        achievementDefinitions.ts
        achievementActions.ts
        achievementSelectors.ts
      backup/
        backupActions.ts
        backupSchemas.ts

    rpg/
      components/
        shell/
          HeroHud.tsx
          RpgTopBar.tsx
          RpgBottomNav.tsx
          CurrentQuestStrip.tsx
        quest/
          QuestCard.tsx
          QuestDetail.tsx
          QuestActionPanel.tsx
          QuestRewardPreview.tsx
        map/
          CampaignMap.tsx
          CampaignNode.tsx
          UnitRegion.tsx
        focus/
          FocusLauncher.tsx
          FocusTimer.tsx
          FocusCompletePanel.tsx
        hero/
          HeroCard.tsx
          HeroStats.tsx
          HeroLoadout.tsx
        badges/
          BadgeGrid.tsx
          BadgeCard.tsx
          BadgeIcon.tsx
        log/
          JourneyLog.tsx
          JourneyLogEntry.tsx
        settings/
          RpgSettings.tsx
          DataControls.tsx
      model/
        hubReadModel.ts
        mapReadModel.ts
        questReadModel.ts
        focusReadModel.ts
        heroReadModel.ts
        badgeReadModel.ts
        logReadModel.ts
        rpgTypes.ts
      assets/
        assetManifest.ts
        badges/
        quests/
        map/
        hero/
      styles/
        rpg-tokens.css
        rpg-shell.css
        rpg-components.css

  lib/
    db/
      database.ts
      schemas.ts
      migrations.ts
    sync/
      backupAdapter.ts
      localBackupAdapter.ts
    testing/
      renderWithDb.tsx
      testDatabase.ts

  styles/
    base.css
    tokens.css
```

The main architectural shift is this:

```text
features/engine = truth and rules
features/rpg = presentation, read models, shell behavior
```

The RPG shell may derive and display game state, but it should not own the engine rules.

---

# 5. Component hierarchy for intended UI/UX

The fully realized RPG app should feel like this:

```text
RpgShell
  HeroHud
    HeroPortrait
    HeroIdentity
    LevelBadge
    XpProgressBar
    CurrentQuestStrip

  RpgMainNav
    Hub
    Map
    Quest
    Focus
    Hero
    Badges
    Log
    Settings

  Outlet
    RpgHubPage
      CurrentQuestCard
      WeeklyProgressCard
      RewardPreviewCard
      RecentJourneyCard

    CampaignMapPage
      CampaignMap
        UnitRegion
          CampaignNode

    QuestDetailPage
      QuestHeader
      QuestActionPanel
      DisclosureCard: How to approach
      DisclosureCard: Checklist
      DisclosureCard: Video segments
      DisclosureCard: Previous notes
      DisclosureCard: About this task

    FocusPage
      FocusLauncher / FocusTimer
      FocusCompletePanel
      RewardFeedback

    HeroPage
      HeroCard
      HeroStats
      LevelProgression
      UnlockedTitles

    BadgesPage
      BadgeFilters
      BadgeGrid

    JourneyLogPage
      JourneyLog
      LogFilters

    RpgSettingsPage
      ProfilePreferences
      DisclosureCard: Backup
      DisclosureCard: Restore
      DisclosureCard: Reset
      DisclosureCard: Privacy boundary
```

The persistent Hero HUD is the missing center of gravity.

It should replace the oversized static header after setup. The app should not keep shouting “ProgressPal CS50 Edition” on every page. Once the learner exists, the app should show the learner-character.

---

# 6. Styling strategy

Keep CSS. Do not introduce Tailwind or a component library unless the current CSS becomes unmanageable.

Recommended styling layers:

```text
base.css
  resets, typography, body background

tokens.css
  spacing, radius, font size, colors, shadows

rpg-tokens.css
  RPG-specific theme variables

rpg-shell.css
  layout, HUD, nav, page grid

rpg-components.css
  quest cards, badge cards, map nodes, disclosure panels
```

Use tokens like:

```css
--rpg-bg;
--rpg-panel;
--rpg-panel-strong;
--rpg-border;
--rpg-border-active;
--rpg-text;
--rpg-text-muted;
--rpg-accent;
--rpg-xp;
--rpg-danger;
--rpg-success;
--rpg-radius-card;
--rpg-space-page;
```

Do not let every module invent new card styles. That is how the current app became panel-heavy.

Create a small set of card types:

```text
PrimaryActionCard
InfoCard
DisclosureCard
StatCard
DangerCard
RewardCard
```

Everything should reuse those.

---

# 7. Global state management

Do not add Redux or Zustand right now.

Recommended rule:

```text
IndexedDB = persisted truth
React Router = route state
React local state = temporary UI state
Small context = shell-level derived state
```

Use one shell-level hook:

```ts
useRpgShellState();
```

It should provide:

```ts
profile;
level;
xpTotal;
xpToNextLevel;
currentQuest;
currentRoute;
heroAvatar;
```

Use read models to derive this from the engine snapshot.

Persist only lightweight UI preferences:

```text
collapsed panel choices
selected hero title
selected avatar/cosmetic preferences
reduced motion preference
last visited RPG route
```

Do not persist derived facts like “level 4” or “Week 3 is current.” Derive them.

---

# 8. Lean validation strategy for AI-assisted development

The project has been over-validating some non-critical changes and under-validating a few important integration points. Use tiered validation.

## Tier 1 — every module

Run only:

```powershell
npm run lint
npm run typecheck
npm run build
npm run format:check
```

Plus one targeted test file if the module changes business logic.

## Tier 2 — engine-affecting module

Run:

```powershell
npm run test -- progress
npm run test -- xp
npm run test -- backup
npm run test -- achievements
```

Do not run the entire universe unless the change touches shared database/schema/routing.

## Tier 3 — release candidate

Run:

```powershell
npm run validate
npm run test:e2e
```

Only release candidates need the full pass.

## Critical E2E flows only

Keep Playwright focused on these:

```text
First-run setup
Open current quest
Save progress
Log study session
Earn XP
Unlock achievement
Export backup
Import backup
Offline reload
```

Do not add E2E tests for every card, pill, empty state, or cosmetic panel.

---

# 9. Roadmap from current state to realized RPG v2

## Phase 0 — freeze current proof

Goal:

```text
Ship the current app as v1.2 local-first CS50 tracker proof.
```

Deliverables:

```text
Release branch
Updated README classification
Tag v1.2.0-local-first-proof
Production deployment replacing older engine
Known limitations documented
```

Acceptance:

```text
Build passes
Typecheck passes
Lint passes
Format passes
Production deployment opens
First-run setup works
Course map opens
Lecture page opens
Settings opens
```

No RPG redesign in this phase.

---

## Phase 1 — correct product framing

Goal:

```text
Stop pretending the current build is completed RPG v2.
```

Tasks:

1. Update README.
2. Update roadmap.
3. Update RPG docs.
4. Rename the current state as `local-first tracker proof`.
5. Create new roadmap section: `RPG shell transformation`.
6. Mark visual assets as incomplete.
7. Mark RPG-14 as CSS/visual foundation, not asset completion.
8. Mark RPG-15 as release-candidate attempt for tracker proof, not RPG completion.

Acceptance:

```text
Docs clearly distinguish v1.2 tracker proof from RPG v2 target.
No doc says RPG v2 is complete.
```

Validation:

```powershell
npm run format:check
```

Do not run full E2E for doc-only changes.

---

## Phase 2 — route and shell decision

Goal:

```text
Make RPG mode structurally real.
```

Tasks:

1. Split `AppShell` into `ClassicShell`, `SetupShell`, and `RpgShell`.
2. After setup, route users into RPG shell by default.
3. Keep classic tracker reachable through `/classic` or `/tracker`.
4. Add a clear “Classic view” escape hatch if needed.
5. Make `/rpg` the primary logged-in route.

Recommended routing:

```text
/                 -> setup if no profile, otherwise /rpg
/setup            -> setup
/rpg              -> RPG hub
/rpg/map          -> campaign map
/rpg/quest/:itemId
/rpg/focus
/rpg/hero
/rpg/badges
/rpg/log
/rpg/settings
/classic          -> classic dashboard
/classic/course
/classic/sessions
/classic/settings
```

Acceptance:

```text
Fresh browser opens setup.
After setup, user lands in RPG hub.
Classic tracker remains available.
No data migration required.
```

Validation:

```powershell
npm run lint
npm run typecheck
npm run build
```

Add one E2E smoke test for first-run → RPG hub.

---

## Phase 3 — persistent Hero HUD

Goal:

```text
Make the learner-character present across the whole RPG shell.
```

Tasks:

1. Build `HeroHud`.
2. Show portrait, name, title, level, XP bar, next XP threshold.
3. Show current quest title and primary CTA.
4. Replace the large static app header inside RPG routes.
5. Keep compact trust/status text available, but not dominant.
6. Make HUD responsive.

Desktop layout:

```text
[Hero portrait] [Name / title / current quest] [Level] [XP bar] [Continue CTA]
```

Mobile layout:

```text
Portrait + level
Current quest
XP bar
Continue CTA
```

Acceptance:

```text
Hero appears on every RPG screen.
XP bar reflects engine XP.
Current quest CTA opens the correct quest.
Header no longer consumes excessive vertical space.
```

Validation:

```powershell
npm run lint
npm run typecheck
npm run build
```

Targeted tests:

```text
Hero HUD renders level and XP from seeded state.
Hero HUD current quest link is correct.
```

---

## Phase 4 — collapsible panel system

Goal:

```text
Reduce card overload and make the RPG interface action-first.
```

Tasks:

1. Create `DisclosureCard`.
2. Add default open/closed behavior.
3. Persist user-opened state in `rpgPreferences.collapsedPanelState`.
4. Apply to quest/resource page first.
5. Then apply to settings, achievements, insights, and sessions.

Default-open panels:

```text
Current quest/action
Progress save controls
Focus controls
Reward preview
```

Default-collapsed panels:

```text
How to approach this
Checklist
Reflect
Video segment details
Previous notes
About this lecture
Backup import/export details
Advanced stats
Achievement unlock explanations
```

Acceptance:

```text
Quest page first screen shows primary action without drowning user in panels.
Collapsed sections are keyboard-accessible.
User can expand details.
```

Validation:

```powershell
npm run lint
npm run typecheck
npm run build
```

One accessibility check for disclosure buttons.

---

## Phase 5 — quest-first resource page

Goal:

```text
Turn lecture/task pages into RPG quest pages.
```

Current page is useful but too much like a tracker form.

New structure:

```text
QuestHeader
  title
  type
  required/optional
  status
  reward preview

QuestActionPanel
  Start focus
  Log watched time
  Save progress

RewardPreview
  XP available
  possible badge progress
  next level progress

DisclosureCard: Guide
DisclosureCard: Checklist
DisclosureCard: Notes
DisclosureCard: Video segments
DisclosureCard: History
DisclosureCard: Source link
```

Copy direction:

Use “quest” and “campaign” lightly. Avoid childish fantasy language. The app should feel grounded, not like a fake medieval skin.

Acceptance:

```text
Primary action is visible without scrolling.
User understands what to do next.
Saving progress still uses existing engine actions.
No duplicate XP logic is introduced.
```

Validation:

```powershell
npm run lint
npm run typecheck
npm run build
```

Targeted tests:

```text
Saving progress updates engine progress.
Saving session writes one session and XP transaction.
```

---

## Phase 6 — reward feedback loop

Goal:

```text
Make saved effort feel consequential.
```

Tasks:

1. Add `RewardFeedbackPanel`.
2. After saving progress/session, show:

   - XP gained
   - total XP
   - level progress
   - newly unlocked badge, if any
   - next suggested quest

3. Do not use fake confetti everywhere.
4. Use animation only if reduced-motion allows it.

Optional tiny library:

```text
canvas-confetti
```

But only if reward feedback feels dead without it. CSS-only is enough for now.

Acceptance:

```text
After save, the user sees what changed.
No reward appears when nothing changed.
Reduced motion is respected.
```

Validation:

```powershell
npm run lint
npm run typecheck
npm run build
```

Targeted tests around reward calculation.

---

## Phase 7 — visual asset foundation

Goal:

```text
Replace “cards and pills only” with a small, coherent RPG asset system.
```

Do not generate hundreds of assets. Create a minimal asset manifest.

Needed asset categories:

```text
hero portrait frame
default hero portrait
quest type icons
map node states
badge icons
locked badge icon
XP/level marker
campaign region motif
focus/session icon
backup/trust icon
```

Directory:

```text
src/features/rpg/assets/
  assetManifest.ts
  hero/
    hero-default.webp
    portrait-frame.svg
  badges/
    first-step.svg
    deep-session.svg
    browser-builder.svg
    locked.svg
  quests/
    lecture.svg
    problem-set.svg
    project.svg
    section.svg
  map/
    node-current.svg
    node-complete.svg
    node-locked.svg
    node-optional.svg
  ui/
    xp.svg
    focus.svg
    log.svg
```

Acceptance:

```text
Every badge has a real icon.
Every quest type has an icon.
The hero portrait is integrated in HUD, not just profile.
No text is baked into images.
All assets have alt handling or are decorative.
```

Validation:

```powershell
npm run lint
npm run typecheck
npm run build
```

No E2E needed for adding static assets unless routing breaks.

---

## Phase 8 — campaign map redesign

Goal:

```text
Make the course map feel like a campaign map without destroying usability.
```

Tasks:

1. Keep the existing course data.
2. Replace pure list feeling with campaign regions.
3. Show current unit prominently.
4. Show required/optional tasks clearly.
5. Show locked/future units if relevant.
6. Keep text readable.
7. Keep a compact list fallback on mobile if needed.

Map states:

```text
Not started
Current
In progress
Completed
Blocked
Optional
Locked/future
```

Acceptance:

```text
User can see where they are.
User can open next quest quickly.
Map is still usable on mobile.
No canvas/game engine dependency.
```

Validation:

```powershell
npm run lint
npm run typecheck
npm run build
```

One Playwright smoke test:

```text
RPG hub → map → current quest
```

---

## Phase 9 — hero progression page

Goal:

```text
Give the character system meaning.
```

Tasks:

1. Hero profile page shows:

   - portrait
   - level
   - XP curve
   - current title
   - unlocked titles
   - study stats
   - badge highlights

2. Add simple title unlocks from achievements.
3. Allow choosing title/cosmetic preference.
4. Do not add inventory, currency, shops, pets, or complex RPG mechanics.

Acceptance:

```text
Hero page explains who the learner-character is.
Progress comes from engine data.
Cosmetic choices are local only.
```

Validation:

```powershell
npm run lint
npm run typecheck
npm run build
```

Targeted test:

```text
XP total maps to correct level/title options.
```

---

## Phase 10 — badges and achievements visual pass

Goal:

```text
Make achievements feel like earned artifacts.
```

Tasks:

1. Replace `0 XP` noise.
2. Add real badge icons.
3. Show locked state clearly.
4. Show unlock requirement plainly.
5. Show earned date when unlocked.
6. Add “near completion” sorting if cheap to derive.
7. Do not add complex badge progress bars unless already reliable.

Acceptance:

```text
Locked badges are readable.
Earned badges feel distinct.
No misleading reward values.
```

Validation:

```powershell
npm run lint
npm run typecheck
npm run build
```

---

## Phase 11 — journey log as RPG memory

Goal:

```text
Make saved effort feel like campaign history.
```

Tasks:

1. Journey log entries should combine:

   - progress saves
   - study sessions
   - XP gains
   - badge unlocks

2. Group by day.
3. Keep newest first.
4. Add filters only if needed.
5. Avoid over-narration.

Entry examples:

```text
Completed Lecture 0: Scratch
Logged 20 minutes on Week 0
Unlocked First Step
Reached Level 2
```

Acceptance:

```text
A learner can understand what happened recently.
The log is derived from engine facts.
No duplicate event table is needed unless performance demands it.
```

Validation:

```powershell
npm run lint
npm run typecheck
npm run build
```

---

## Phase 12 — settings and data controls cleanup

Goal:

```text
Keep trust high without making settings feel like the main app.
```

Tasks:

1. Collapse backup/restore/reset sections by default.
2. Keep destructive actions explicit.
3. Improve date formatting.
4. Remove raw UTC timestamps.
5. Add last export reminder only if simple.
6. Keep privacy copy honest.

Acceptance:

```text
Settings are understandable.
Danger actions are not hidden once section is opened.
No raw developer timestamps are visible.
```

Validation:

```powershell
npm run lint
npm run typecheck
npm run build
```

---

## Phase 13 — mobile and daily-use pass

Goal:

```text
Make RPG shell usable as a daily study companion.
```

Screens to validate manually:

```text
390 × 844 mobile
768 × 1024 tablet
1440 × 900 desktop
```

Pages:

```text
Setup
RPG hub
Quest detail
Focus
Map
Hero
Badges
Log
Settings
```

Acceptance:

```text
No horizontal scrolling.
Primary action visible early.
Hero HUD does not dominate mobile.
Bottom nav remains usable.
Collapsed panels work with touch.
```

Validation:

```powershell
npm run build
```

Manual screenshots are enough. Do not build a heavy visual regression system yet.

---

## Phase 14 — release candidate

Goal:

```text
Ship actual RPG v2.
```

Required release flows:

```text
Fresh setup → RPG hub
RPG hub → current quest
Quest → save progress
Quest/focus → save study session
Save → XP feedback
XP → hero HUD updates
Progress → map updates
Achievement unlock → badge page updates
Export backup
Import backup in another browser
Offline reload
Classic view remains available or intentionally removed
```

Validation:

```powershell
npm run validate
npm run test:e2e
npm run build
```

If full test suite still has Dexie instability, fix test harness before calling this release candidate complete.

Tag:

```powershell
git tag -a v2.0.0-rpg-shell -m "ProgressPal RPG v2 shell"
git push origin v2.0.0-rpg-shell
```

---

# 10. What not to build

Do not build:

```text
Backend accounts
Cloud sync
Leaderboards
Social features
AI tutoring
Multiplayer
Marketplace
Complex inventory
Game engine
Canvas map
Procedural assets
Achievement SaaS
Analytics
Push notifications
```

These would distract from the actual missing piece: the shell.

The current gap is not “more technology.” It is product embodiment.

---

# 11. Essential third-party APIs and libraries

No third-party API is essential.

Existing library direction is enough:

```text
React
React Router
Dexie
Zod
Vitest
Playwright
```

Optional additions only if justified:

```text
canvas-confetti
```

Use only for reward moments, and only with reduced-motion support.

Possibly:

```text
lucide-react
```

Only if you need consistent interface icons quickly. But for the RPG identity, local SVG assets are better than generic icon packs.

Do not add a gamification platform. Your game mechanics are simple: XP ledger, level curve, achievements, badges, quest status, journey log. These should live inside your codebase.

---

# 12. AI coding workflow optimized for vibecoding

Use one branch per module. Keep each module small enough that Codex/Claude can reason about it without rewriting the app.

Module prompt structure:

```text
You are working in ProgressPal.

Goal:
Implement only [module].

Current classification:
The current app is v1.2 local-first CS50 tracker proof. RPG v2 is not complete. This module is part of the RPG shell transformation.

Non-negotiables:
- Preserve local-first behavior.
- Do not add backend, auth, analytics, sync, or external APIs.
- Do not duplicate engine logic.
- Engine remains source of truth.
- RPG shell derives from engine read models.
- Keep changes narrow.
- Do not perform broad refactors unless required.

Files to inspect first:
[list exact files]

Expected changes:
[list exact components/models/styles]

Acceptance criteria:
[list 3-6]

Validation:
Run lint, typecheck, build, format check.
Run targeted tests only if engine logic changed.
```

After every AI module, ask for this report:

```text
1. Files changed.
2. What user-visible behavior changed.
3. What engine behavior changed, if any.
4. What was deliberately not changed.
5. Validation commands and results.
6. Risks or follow-up items.
```

Do not accept vague answers like “all tests pass” unless commands and outputs are named.

---

# 13. The shortest viable path

If you want the leanest possible sequence, do this:

```text
0. Freeze current state as v1.2 live proof.
1. Correct docs and roadmap.
2. Make /rpg the post-setup default.
3. Build persistent Hero HUD.
4. Add collapsible panels.
5. Redesign quest/resource page.
6. Add reward feedback after saves.
7. Add minimal asset manifest and badge/quest/map icons.
8. Redesign campaign map.
9. Polish hero/badges/log/settings.
10. Release v2.0 RPG shell.
```

The decisive transformation happens in steps 2–6. The asset work matters, but it should support the shell, not lead it. The app becomes RPG v2 when the learner sees their character, current quest, XP progress, reward feedback, and campaign position everywhere — not when another panel or route is added.
