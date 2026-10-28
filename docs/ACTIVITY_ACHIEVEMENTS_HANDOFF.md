# Activity achievements integration

Owner-authorized integration, publication, independent review and conditional
release of the approved Guild of Moving Parts collection (2026-10-28).
This record describes implementation and focused evidence. It is not itself
independent review or release certification; those are candidate-bound records.

## Input and isolation

- Archive: `ProgressPal_Activity_Achievements_2026-10-28.zip`, SHA-256
  `fcea7680c1df705ed09f18ae1de6dab78a32a88c3083ce35a492205f748ed8f7`.
- Verified 53 files plus the root directory entry: no traversal, duplicate
  destination, symlink or unexpected oversized entry. The existing extracted
  package matches every archive file; no archived script was executed.
- Original `ACHIEVEMENTS.json` SHA-256:
  `2f1d794cc8a225567076e542d05f133e9431fb37a33268a0650dca15f4a830f7`.
  Its exact bytes are retained in `tests/fixtures/activity-achievements-approved.json`.
- All twelve final masters (1254px PNG) and compact exports (256px WebP) were
  verified against supplied checksums and decoded dimensions/alpha. Only the
  twelve exact compact exports ship. Masters, reference art and reserves stay
  in the approved external package. Compact hashes: `activity-achievement-assets.json`.
- Runtime representation selects the approved ID, name, description, condition,
  fiction, unlock line, reward meaning, category, predicate and configuration.
  Other creative metadata stays in the fixture. No achievement or artwork changed.
- Repository: `https://github.com/ruishinor/ProgressPal.git`; baseline remote
  `master`/local HEAD `ca16ea6d097a870cb4e296ed4cf05ec7fa66c61a`, root tree
  `c430702ba005145a0fbc25b26a58bcccafcc3ac5`.
- Dedicated managed worktree:
  `C:/Users/alex_/.codex/worktrees/activity-achievements/ProgressPal`;
  branch `cx/activity-achievements`. Original authoring checkout, other branches,
  worktrees, supplied files and learner records were preserved.

## Implementation and observable contracts

`src/lib/activity/achievementData.ts` is the selected approved runtime content.
The pure evaluator in `achievements.ts` scans validated eligible records in
calendar-date/entry-ID order. The first satisfying prefix supplies the witness
entry ID. It uses native units, branch-specific date sets, stable activity IDs,
archived custom history and nonempty enabled historical goal snapshots. Seven
fully inactive dates means a calendar-date difference of eight; fourteen active
dates remains the alternative. Neither path requires consecutive participation.

The shared catalogue registers twelve `physical_activity` definitions. Both
programmes receive exactly those shared objects; their relative approved order
is preserved. Existing educational definitions and their relative order stay
intact. The educational evaluator explicitly ignores physical rules.

`saveActivityEntry` includes the existing unlock table in the coordinated Dexie
transaction. Entry, day context and new unlocks commit together or roll back.
It calls the existing idempotent `unlockAchievementsOnce`; the actual save
timestamp is the award time. The returned entry retains its ordinary fields and
adds an explicit Activity reward result. Edit input selects only persisted entry
fields, so spreading a previous result remains safe. No XP summary is fabricated.

Explicit create/edit saves can recognize accumulated history and legitimate
backfills. Passive reads, settings, custom-definition changes, reminders, date
changes, delete and restore do not award. Earned unlocks are commemorative and
remain after corrections/deletion. Complete backup/restore retains them; an old
eligible ledger without unlocks waits for an explicit save. Reset clears both.
Database schema 5, backup envelope 1, educational XP/mastery, Activity Level,
cloud/provider policy and application/cache version 1.10.0 remain unchanged.

Activity links to the existing gallery. RPG uses the exact badges; Classic
remains text-only. Both reuse filters and earned/locked state. The twelve retain
their approved relative order after existing achievements. A native disclosure
exposes the exact condition and narrative consequence; authoring notes about
inventories/equipment implementation are not exposed as product instructions.
The existing polite, nonblocking reward queue receives committed new unlocks
only and displays the exact English title and unlock line. Multiple simultaneous
awards use that queue, without modal interaction; reload never replays it.

All twelve WebPs are same-origin static files with explicit install-time offline
mappings. The initial build exceeded the unchanged 470,000-byte JavaScript gzip
limit by 1,827 bytes. One existing **First Step** image moved byte-for-byte from
base64 JS into the established static/offline mapping; its 192px original stays
in source. This bounded packaging correction retains the artwork and brings the
feature within the existing limits. No budget, dependency, timeout, CSP, workflow
or release protection was weakened.

## Focused verification and five internal examinations

Evidence lives under ignored `artifacts/activity-achievements/`. Git identities
of the frozen candidate and later review/certification are resolved from Git and
the native payload tool; a document cannot name its own containing commit.

1. **Package fidelity:** machine-readable comparison pins every selected runtime
   field, all twelve definitions, zero XP and shared catalogue identity. SHA-256
   checks pin every final shipped badge. Rejected/reserve art is absent.
2. **Domain and mechanics:** 380 tests in 21 focused files pass, covering each
   threshold/alternative, unit separation, date counts, same-ID exclusions,
   custom archival/name independence, empty/incomplete plans, backfills,
   nonconsecutive dates and deterministic first-prefix witnesses.
3. **Persistence/local-first:** those tests include actual atomic rollback on
   unlock failure, committed-only feedback, repeat/edit/delete retention,
   complete backup round-trip, silent restore, reset and education isolation.
   Seven offline browser tests pass, including cold re-entry and never-visited
   badge loading. Existing cross-tab Activity browser coverage remains in scope.
4. **Player experience:** actual browser journeys exercise a normal first award,
   duplicate-free repeat, Merge Quest, gallery navigation, reload, Classic,
   offline logging/artwork, and an unaffected course route. The gallery is checked
   at 320/390/1440px, both themes, normal/200% root text, native 80px artwork,
   keyboard disclosure/focus and axe. Root text scaling is a stress proxy, not
   physical-device or browser-zoom certification. PNG captures are actual local
   application evidence, not supplied conceptual previews.
5. **Regression/release:** 203 tests in 22 presentation/read-model/architecture
   files pass. Lint, formatting, clean forced compilation, production build,
   circular check and unchanged bundle budgets are the applicable cheap gates.
   Existing count/inventory assertions were extended for twelve new definitions;
   existing Activity browser assertions now select the save feedback region
   because reward feedback can coexist. The new browser spec explicitly names
   its DOM typing; no compiler configuration or runtime contract changed.

Targeted browser iterations corrected test assumptions about the existing
Activity selector, Course Map title and First Step's actual 192px size; no product
behavior was changed to satisfy those assumptions. Failed/interrupted attempts
are not clean passes. Final native certification is reserved for a clean exact
candidate with independently authored, applicable schema-v2 review evidence.

Representative evidence: `unlock-desktop-dark.png`,
`gallery-{light,dark}-{320,390,1440}.png`, enlarged 320px captures and
`gallery-reward-detail.png`. Logs include `focused.log`,
`presentation-architecture.log`, `browser.log`, `browser-activity-delta.log`,
`browser-final-delta.log`, `offline.log`, `bundle.log`, `lint.log`,
`format.log` and compiler/circular results. Native certification writes its own
manifest/logs under `artifacts/release-evidence/`; do not infer a pass from these
focused checks.

## Operational release boundary

Owner authorization covers the feature branch, PR, genuine review and conditional
normal merge/deployment. It does not permit bypassing exact-candidate checks.
Read-only GitHub inspection found default branch `master`, administrative push
permission, no branch protection (404) and no rulesets. The current connected
Vercel project is `progress-pal` / `prj_npdQBbWuAlQMzraZuhM12yv3XgmZ`, team
`team_CYJiKrUr0af87hpnxvXfJxyM`. Its observed production deployment
`dpl_CeC5SJyZo5fQmbTZ3rsnEDCrMHfH` serves baseline `ca16ea6d…` at
`progress-pal-seven.vercel.app`.

The connector lacks project-check configuration capability; browser inspection
was blocked/unavailable. The owner completed CLI sign-in. Authenticated readback
then verified the exact project/team above, `ruishinor/ProgressPal` Git linkage,
production branch `master`, `autoAssignCustomDomains: true` and existing check
`chk_405a1c74-57c8-4f43-b2d8-ac38d03de6e7`: name/external GitHub check name
`Final candidate`, source `git-provider`/`github`, target `production`, blocking
`deployment-alias`. No platform setting was changed. This verifies the intended
promotion protection configuration; the actual next production commit/check/
held deployment/promotion identity must still be followed before release claims.
No provider migration, tag, GitHub Release, direct production deploy or manual
alias operation is part of this patch.

## Certification correction record

Product commit `98746b52d585e64dde7427e2225cdccead81bae9` received an independent
automated `proceed` review, authored and committed by the distinct process
`/root/independent_release_review` as evidence-only successor
`f4174b45c9cc84764a296ed2727b5c546e6b3d5e`; payload
`b070cacd0cc8819323a3d8594ff1d9687e8d13be`. This is agent review, not human
review. The reviewer additionally passed 35 focused tests and 21 binding tests,
byte-compared inputs and matched a separately written full-prefix reference
against 160 varied histories and reversed insertion orders.

Native pass 1 failed honestly after 525 passing unit/integration tests: the
existing A6 shared-surface assertion expected every achievement to use legacy
category/title sorting, which contradicts the newly approved collection order.
Hosted run `40723201075`, attempt 1, job `122939384763` also failed. PR #48 is
`https://github.com/ruishinor/ProgressPal/pull/48`. The failed local manifest is
`artifacts/release-evidence/2026-10-28T16-08-01-136Z-activity-achievements-pass-1.json`;
hosted evidence artifact `12832231318` remains available for that run.

The bounded correction changes only the test oracle: legacy achievements retain
category/title sorting, followed by Activity IDs in the exact approved fixture
order. Both RPG and Classic assertions remain strict; filters, dates, read-only
access and persisted-definition rejection checks remain. All 14 A6 tests pass.
Application code, artwork, scripts, workflow, budgets and timeouts are unchanged.
This changed test/documentation payload requires a fresh independently authored
review binding and a new exact-candidate certification; the earlier review and
failed gate cannot certify it. Current candidate/result identities are in Git,
the applicable review artifact and the native/hosted manifests.
