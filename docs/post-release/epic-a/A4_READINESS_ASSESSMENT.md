# A4 readiness assessment — Hub, Hero and persistent HUD read boundaries

Result: **PASS — ready for A4 RED after this readiness record is integrated**

Date: 2026-09-21

## Source/provenance

This assessment uses the exact owner-exported state after A3 closure:

- branch: `postrelease/01-read-architecture`
- HEAD: `bb603331a0aca3edb01b6cfc03e126e75f3041a0`
- accepted A3 implementation ancestor: `7363ec6d70a89e48373d8be81673b94793598cd8`
- Node: `v24.19.0`
- npm: `11.10.1`
- readiness archive: `ProgressPal_A4_readiness_context_bb603331.zip`
- archive SHA-256: `2B7505C5683349B6F20D6DA0CB37CAD46638433AA2D2A9A43F1AF4F0E4C7F4EB`
- manifest SHA-256: `14C951D00D616C611BB41065C3A172470AFFDFC84C506D5975405D3FDFA8C801`
- reference-map SHA-256: `A35E56D73068AEAF35811BD621C65771D38941359A0EA4072CE67BAE92DC8BF2`

The export contained 260 tracked source/test/governance/config files and left the real repository clean and unmodified.

The first readiness-export script failed read-only because PowerShell pathspec strings were emitted as literal entries. The corrected exporter used explicit argument arrays/splatting and produced the archive above. No repository mutation occurred during either attempt.

## Accepted lineage entering A4

- product baseline: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`
- A1 implementation: `ec651536e61a7e5d939506069887df32b81b5c0f`
- A2 implementation: `e329950bbcce0bae2faa42496f532af13deb7322`
- A3 implementation: `7363ec6d70a89e48373d8be81673b94793598cd8`
- A3 closure/integration HEAD: `bb603331a0aca3edb01b6cfc03e126e75f3041a0`

A3 authoritative validation passed 644/644 unit/integration tests, 74/74 E2E tests and zero audit vulnerabilities.

## Readiness disposition

The original A4 title remains valid, but the story contract needed two corrections after current-code inspection.

First, A4 must include **route-level duplicate-read elimination**, not only loader narrowing.

Second, Hero must receive its own logical read contract rather than being described as “Hub plus unlocks.” The published Hero output omits several Hub-only fields and should not inherit unnecessary recommendation/weekly/reward reads.

With those corrections, A4 remains a coherent single story because HUD, Hub and Hero share the same course/XP/session aggregation primitives and their current duplicate-read topology crosses component boundaries.

Splitting them before solving sharing would risk introducing temporary duplicate infrastructure and a second refactor immediately afterward.

## Actual current route composition

### Persistent shell

`src/features/rpg/shell/RpgShell.tsx`

The shell effect always calls:

`loadRpgHubSummary()`

Its dependencies are profile revision and an explicit reload token, not route pathname.

The HUD render is hidden on `/rpg/hero`, but the effect is not skipped there.

The visible HUD reads only:

- learner/avatar identity;
- rank;
- XP summary;
- recommendation/current quest.

It does not consume Hub study totals, recent activity or weekly progress.

### Hub

`src/features/rpg/routes/RpgHomePage.tsx`

The page independently calls:

`loadRpgHubSummary()`

Therefore a direct `/rpg` mount currently starts:

1. one shell Hub read;
2. one page Hub read.

Both currently resolve through `readSnapshot()` -> `getDatabaseSnapshot()`.

### Hero

`src/features/rpg/routes/RpgHeroPage.tsx`

The page calls:

`loadRpgHeroProfileSummary()`

Current `buildRpgHeroProfileSummary()` internally calls `buildRpgHubSummary()` and `buildRpgBadgeGallerySummary()` from one full snapshot.

A direct `/rpg/hero` mount therefore starts:

1. shell `loadRpgHubSummary()` even though the HUD is hidden;
2. page `loadRpgHeroProfileSummary()`.

Both are all-store snapshot reads.

### Resource post-save

`RpgResourcePage.refreshSavedProgress()`:

1. calls `refreshHud()`;
2. then calls `loadRpgStudyResourceSummary(resourceId)` and `loadRpgHubSummary()` concurrently.

The Resource read is accepted A3.

The shell refresh plus direct Hub refresh are both A4-owned and currently duplicate recommendation/XP work.

### Focus post-save

`RpgFocusPage.refreshProgressSummary()`:

1. calls `refreshHud()`;
2. calls `loadRpgHubSummary()` for XP level and next-quest feedback.

The shared `StudySessionsSurface` remains A5 scope.

The two A4 requests after save should be collapsed into one shared A4 refresh result.

## Current broad-read mechanism

`loadRpgHubSummary()` still calls:

```text
readSnapshot()
  -> getDatabaseSnapshot()
```

`loadRpgHeroProfileSummary()` does the same.

`getDatabaseSnapshot()` opens one coherent readonly transaction across all 14 stores and bulk-materializes:

- full catalogue/current state;
- all media progress events;
- all study sessions;
- all XP transactions;
- achievement definitions/unlocks;
- backups;
- app metadata.

This remains semantically coherent but violates the A4 targeted-read contract.

## Data dependency analysis

### Course/rank/recommendation state

Course status can be inferred from long-form progress when no explicit progress row exists.

Therefore HUD/Hub/Hero cannot safely drop long-form content/media/resume state merely because their final UI objects do not expose those rows.

Required course-wide inputs remain:

- units;
- items;
- progress entries;
- content assets;
- content slices;
- streamed media aggregates;
- resume points.

Hub/HUD recommendation also needs earned reward state.

### Learner profile

Learner name/avatar are keyed singleton data.

Current fallback remains:

- missing profile -> learner name `Learner`;
- avatar config -> `null`.

A4 may use the persisted singleton inside the coherent read. It is not required to couple the read contract to `AppStateProvider` merely because that provider also holds profile state.

### Study sessions

Hub and Hero require lifetime session count and total minutes.

Hub additionally requires weekly session count/minutes.

Hub/Hero recent activity also depends on session-start timestamps.

Because no persisted lifetime aggregate exists, one streaming O(`H_sessions`) scan remains justified under the frozen schema.

A full hidden `StudySession[]` array is not justified.

### XP

HUD/Hub/Hero require lifetime total XP/level.

Hub requires weekly XP.

Hub/Hero recent activity requires recent XP transactions.

HUD/Hub recommendation reward labels require exact earned reward keys.

The existing `sourceId` index supports one finite reward lookup. Lifetime aggregate work may use one separate streaming O(`H_xp`) scan.

### Media

Recommendation/rank/course-progress equivalence can depend on long-form inferred status.

Current schema has no precomputed course-wide completion aggregate, so one streaming course-wide media scan remains justified.

A1 already established the relevant aggregation pattern.

### Achievement unlocks

Only Hero among A4 surfaces needs unlock state, and only badge counts are published there.

Code definitions remain authoritative for total badge definitions.

Persisted `achievement_definitions` are not required.

## Proposed store/query contracts

### HUD

Allowed stores:

`learner_profile`, `course_units`, `course_items`, `progress_entries`, `content_assets`, `content_slices`, `media_progress_events`, `resume_points`, `xp_transactions`.

Maximum queries: **10**.

The second XP operation is reserved for indexed reward-source lookup.

`study_sessions`, unlocks, app metadata, persisted definitions and backups are unrelated.

### Hub

Allowed stores:

HUD family plus `study_sessions`.

Maximum queries: **11**.

Study lifetime/weekly/recent data should be accumulated in one session cursor.

XP lifetime/weekly/recent data should be accumulated in one XP cursor, with at most one additional indexed reward query.

### Hero

Allowed stores:

course/current-state/long-form family, learner profile, study sessions, XP transactions and achievement unlocks.

Maximum queries: **11**.

Hero should perform only one XP lifetime scan because it does not publish recommendation/reward labels.

## Route-level A4 budget

The readiness contract adds an A4-owned **logical-read count** in addition to per-loader query budgets.

Expected maximum on direct route entry:

- `/rpg`: 1 A4 Hub read;
- `/rpg/hero`: 1 A4 Hero read;
- any other RPG child route: 1 A4 HUD read plus the child's own separately scoped read.

After Resource/Focus save:

- at most 1 A4 refresh read per refresh attempt.

A1/A2/A3 child reads are not counted as A4 reads.

## Recent-activity preservation

Current behavior merges current progress rows, all sessions and all XP rows; sorts by timestamp descending then ID ascending; returns five.

A4 can reproduce this without full session/XP arrays by retaining bounded top-K candidates while streaming histories.

Achievement unlocks are not currently included in recent activity and must not be added.

## Weekly-time preservation

Existing `readModels.calendar.test.ts` proves the local-Monday model including DST weeks.

A4 implementation must preserve those tests unchanged or equivalently strengthened.

Do not replace local-calendar semantics with fixed 168-hour windows.

## Coherence requirement

Hub/Hero/HUD each currently derive multi-store values from a single broad snapshot transaction.

The replacement for each logical surface must remain one coherent readonly transaction over the smaller declared store family.

A4 should not decompose a logical summary into independent repository calls merely to reuse existing list APIs.

## Duplicate-read sharing requirement

This is the main readiness correction to the original A4 story.

A narrow loader is insufficient if:

- Hub still loads the same A4 state once for shell and once for page;
- Hero still starts a hidden shell HUD read;
- Resource/Focus save still requests shell refresh and a separate Hub refresh.

Implementation mechanism is deliberately not prescribed.

Acceptable approaches include a route-aware shell-owned summary, a narrow shared A4 context, or another design that preserves lifecycle/error semantics while proving one A4 read per trigger.

The child route must not become responsible for direct DB access.

## A5/A6 boundary protection

A4 must not absorb the remaining child-page stories.

### A5 Focus

A5 still owns:

- actual `StudySessionsSurface` initial reads;
- complete visible study-session ledger;
- unused exported Focus loader cleanup/narrowing.

A4 may only change the Hub/HUD-derived Focus save feedback so it shares one A4 refresh.

### A6 Badges

A6 still owns:

- `AchievementsSurface`;
- `getAchievementsView()`;
- page-level `getXpSummary()`;
- unused Badge loader cleanup/narrowing.

A4 changes only the persistent shell HUD surrounding `/rpg/badges`.

## Test-harness requirements

A4 should reuse the accepted DBCore probe but apply A2/A3 lessons from the start.

Required separation:

1. construct large fixtures before installing access instrumentation;
2. probe only the logical read under measurement;
3. keep mutation tests uninstrumented during the write;
4. install probe only for passive post-save reads;
5. use published pure builders as semantic oracles;
6. use deliberate timeouts for 10k fake-indexeddb cases;
7. record measured read duration separately from fixture construction.

Scale fixtures must cover **media, sessions and XP simultaneously** at 1k/10k history because A4 is the first story where all three approved O(H) histories are relevant to one surface family.

## RED plan

Before production edits, the A4 branch should add only the A4 RED harness.

RED should prove:

- Hub broad 14-store transaction/materialization;
- Hero broad 14-store transaction/materialization;
- shell HUD broad Hub mechanism;
- duplicate direct-Hub invocation;
- hidden direct-Hero shell invocation;
- duplicate post-save A4 refresh behavior.

The loader mechanism and route duplication may be separate tests, but both must be red before GREEN implementation begins.

## GREEN plan

A4 GREEN should prove:

- HUD/Hub/Hero store allowlists;
- exact query budgets;
- zero writes;
- 1×/10× catalogue fan-out;
- 1k/10k all-three-history scanning/materialization;
- recent top-five exactness;
- weekly/DST equivalence;
- reward-state index behavior;
- Hero unlock counts without persisted definitions;
- transaction coherence;
- route-level single-read sharing;
- post-save consistency;
- A1/A2/A3 regressions;
- full isolated and exact-commit release gates.

## Baseline file identities for owner guards

Key exact readiness-source hashes:

- `src/features/rpg/model/readModels.ts`: `04442BE76C3C0677D221A2207C5C11738CE549932CACDC3C54968CEE8E8CD41F`
- `src/features/rpg/model/types.ts`: `841C93EE1E97634208519276637AA0746EA335AE96C3CDBC9306742CFABF0D36`
- `src/features/rpg/shell/RpgShell.tsx`: `0872824CAE95B12DBEB9A397AC46DF923B86369DC4D9696E89D7A8327DB42EA2`
- `src/features/rpg/routes/RpgHomePage.tsx`: `092224A49CEF319B5EB19CB9015A980718B21510A2A4AA9DCBF1C6DCF05C05CD`
- `src/features/rpg/routes/RpgHeroPage.tsx`: `BF413323348EAFA6964445F5E67D6B38C86014201DB24AD935446D2C995E3D25`
- `src/features/rpg/routes/RpgResourcePage.tsx`: `6918C203207514AA69456306F37B59145EBEEF65FB1817FB0A0DF43F074F12B5`
- `src/features/rpg/routes/RpgFocusPage.tsx`: `D225EC56307A46F8C9AC9CF086BED62EC7D5E5A5C21083B9F44137E33AAE9440`
- `src/lib/db/repositories.ts`: `38E59ED1C461B87F09919CC2E75C3DFB0E12C4C7624B34D9EFE8AD7F39840272`
- `src/lib/db/index.ts`: `3DC035D34C769407849ACF20025ECE8E7B6A707A041D52E22BFBB371A1BB300E`

These are readiness guards, not a declaration that every listed file must change in A4.

## Local tooling constraint

The registered `.kilo/worktrees/nova-carnation` worktree remains present in the primary repository and can break repository-wide ESLint root discovery.

Do not remove or rewrite it incidentally.

Use clean isolated clones for repository-wide candidate/full validation.

## Readiness decision

**PASS.**

A4 may proceed to a RED-first story branch after this readiness package is committed to `postrelease/01-read-architecture`.

No production implementation is approved by this readiness result.

Before committing readiness, owner tooling must re-fetch and verify that `origin/master` remains the accepted product baseline. If it moved, stop and reconcile first.
