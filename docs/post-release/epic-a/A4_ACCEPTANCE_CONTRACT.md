# A4 acceptance contract — Hub, Hero and persistent HUD read boundaries

Story: **A4 — Hub, Hero and persistent HUD read boundaries**

Status: **readiness PASS; RED/implementation not yet started**

## Objective

Replace the remaining broad-snapshot reads owned by the persistent RPG shell/HUD, Hub and Hero surfaces with explicit coherent read contracts.

A4 also owns duplicate A4 read composition. It is not sufficient to make three broad reads individually narrower while the same user action still performs redundant HUD/Hub reads.

A4 must preserve published values, recommendation behavior, rank/XP display, weekly calculations, recent-activity ordering, Hero badge counts, error/retry behavior and post-save feedback.

## Exact accepted starting lineage

A4 readiness is based on the exact A3 closure/integration state:

- integration branch: `postrelease/01-read-architecture`
- A3 implementation: `7363ec6d70a89e48373d8be81673b94793598cd8`
- A3 implementation tree: `ba504b77dd98dc3472699631db0a56e82ea0c9f6`
- A3 closure/integration HEAD: `bb603331a0aca3edb01b6cfc03e126e75f3041a0`
- product baseline ancestor: `a0581c13a22fdd3387534d2de0eca2591cf13ed6`

The readiness source archive is:

- `ProgressPal_A4_readiness_context_bb603331.zip`
- SHA-256: `2B7505C5683349B6F20D6DA0CB37CAD46638433AA2D2A9A43F1AF4F0E4C7F4EB`
- manifest SHA-256: `14C951D00D616C611BB41065C3A172470AFFDFC84C506D5975405D3FDFA8C801`
- reference-map SHA-256: `A35E56D73068AEAF35811BD621C65771D38941359A0EA4072CE67BAE92DC8BF2`

## Actual production composition at readiness

### Persistent shell

`RpgShell` calls `loadRpgHubSummary()` from its HUD effect.

That effect runs independently of whether the HUD is actually rendered. The current render hides the HUD on `/rpg/hero`, but the shell still starts the Hub read on a direct Hero mount.

The shell currently uses only these Hub fields:

- learner name;
- avatar configuration;
- identity/rank;
- XP summary;
- recommendation/current quest.

It does not render Hub lifetime study totals, weekly progress, recent activity, full current-module output or Week 4 output.

### Hub route `/rpg`

The route composition is currently:

```text
RpgShell -> loadRpgHubSummary()
RpgHomePage -> loadRpgHubSummary()
```

A direct Hub load therefore starts two independent broad Hub logical reads for the same visible composition.

A4 must not preserve that duplicate-read topology merely with narrower individual queries.

### Hero route `/rpg/hero`

The route composition is currently:

```text
RpgShell -> loadRpgHubSummary()            # HUD hidden but read still starts
RpgHeroPage -> loadRpgHeroProfileSummary()
```

Both loaders currently call the generic all-store snapshot.

Hero's published output does not include Hub recommendation, current module, Week 4 or weekly progress. A4 must not force Hero through a full Hub-shaped persisted read just to reuse the old builder.

### Post-save Resource/Focus composition

After an explicit Resource save, the current code performs:

```text
refreshHud()                              -> shell Hub read
Promise.all([
  loadRpgStudyResourceSummary(id),        -> accepted A3 Resource read
  loadRpgHubSummary(),                    -> second A4 Hub read
])
```

After a Focus save, the current code performs:

```text
refreshHud()                              -> shell Hub read
loadRpgHubSummary()                       -> second A4 Hub read for XP/next quest
```

The child feedback uses only XP progression and recommendation/next-quest data from that second Hub read.

A4 must preserve the save outcome while reducing this to one A4-owned refresh read per refresh attempt.

## A4 logical surfaces

A4 defines three related but distinct logical outputs.

### 1. Persistent HUD

The persistent HUD requires:

- learner name/avatar;
- rank identity;
- XP summary;
- recommendation/current quest and reward label.

It does not require study-session totals, weekly progress, recent activity, badge unlocks or Hero-only data.

A dedicated HUD read contract is therefore required. It may be an explicit `RpgHudSummary` or another equally narrow application-facing contract.

### 2. Hub

The Hub keeps the existing published `RpgHubSummary` values, including:

- recommendation;
- course progress;
- current module;
- identity/rank;
- learner profile presentation;
- recent activity;
- lifetime study summary;
- weekly progress;
- Week 4 summary;
- XP summary.

The old pure `buildRpgHubSummary(snapshot, nowIso)` should remain available as the semantic oracle unless a behavior-preserving extraction leaves an equivalent pure oracle.

### 3. Hero

Hero keeps the existing published `RpgHeroProfileSummary` values:

- badge earned/total counts;
- course progress;
- local-activity flag;
- identity/rank;
- learner name/avatar;
- recent activity;
- lifetime study totals;
- XP summary.

Hero does **not** expose:

- recommendation;
- current module;
- Week 4;
- weekly progress;
- quest reward labels.

Hero therefore gets its own read data contract. It must not require reward-earned XP lookups solely because the old builder called `buildRpgHubSummary()` internally.

## Persisted-store contracts

Fewer stores are acceptable when semantics remain equivalent. Stores not listed for a logical surface are forbidden for that surface.

### Persistent HUD store family

Maximum declared family:

1. `learner_profile`
2. `course_units`
3. `course_items`
4. `progress_entries`
5. `content_assets`
6. `content_slices`
7. `media_progress_events`
8. `resume_points`
9. `xp_transactions`

Forbidden for HUD:

- `app_meta`
- `study_sessions`
- `achievement_definitions`
- `achievement_unlocks`
- `backups`

### Hub store family

Maximum declared family:

1. `learner_profile`
2. `course_units`
3. `course_items`
4. `progress_entries`
5. `content_assets`
6. `content_slices`
7. `media_progress_events`
8. `resume_points`
9. `study_sessions`
10. `xp_transactions`

Forbidden for Hub:

- `app_meta`
- `achievement_definitions`
- `achievement_unlocks`
- `backups`

### Hero store family

Maximum declared family:

1. `learner_profile`
2. `course_units`
3. `course_items`
4. `progress_entries`
5. `content_assets`
6. `content_slices`
7. `media_progress_events`
8. `resume_points`
9. `study_sessions`
10. `xp_transactions`
11. `achievement_unlocks`

Forbidden for Hero:

- `app_meta`
- `achievement_definitions`
- `backups`

Persisted `achievement_definitions` remain unnecessary because current Hero/Badges presentation uses code definitions.

## Query-count contract

The default budgets below are maxima, not a requirement to issue empty queries.

### Persistent HUD

```text
learner_profile         <= 1
course_units            <= 1
course_items            <= 1
progress_entries        <= 1
content_assets          <= 1
content_slices          <= 1
media_progress_events   <= 1
resume_points           <= 1
xp_transactions         <= 2
--------------------------------
total                   <= 10
```

The two permitted XP operations are:

1. one streaming lifetime scan for total XP/level;
2. at most one indexed finite-source-ID reward-earned lookup for recommendation reward labels.

Reward-earned lookup must use the existing `sourceId` index/bulk source set, not rely on the lifetime scan as an unqualified reward-history search.

### Hub

```text
learner_profile         <= 1
course_units            <= 1
course_items            <= 1
progress_entries        <= 1
content_assets          <= 1
content_slices          <= 1
media_progress_events   <= 1
resume_points           <= 1
study_sessions          <= 1
xp_transactions         <= 2
--------------------------------
total                   <= 11
```

The lifetime session cursor must produce lifetime totals, weekly fields and bounded recent-session candidates in the same scan.

The lifetime XP cursor must produce total XP/level, weekly XP and bounded recent-XP candidates in the same scan. Reward-earned state may use the second indexed XP operation described above.

### Hero

```text
learner_profile         <= 1
course_units            <= 1
course_items            <= 1
progress_entries        <= 1
content_assets          <= 1
content_slices          <= 1
media_progress_events   <= 1
resume_points           <= 1
study_sessions          <= 1
xp_transactions         <= 1
achievement_unlocks     <= 1
--------------------------------
total                   <= 11
```

Hero does not require a reward-earned XP query because reward labels/recommendation are not part of the published Hero output.

### Fan-out rule

For all three logical surfaces:

- query count must be independent of lifetime history size;
- query count must remain constant when catalogue/content cardinality grows 1× -> 10×;
- no per-item/per-asset/per-session/per-transaction query loops are permitted;
- `Promise.all` does not hide N+1 operations.

## History and materialization contract

### `media_progress_events`

Course-wide status/recommendation/rank semantics can depend on long-form progress.

A4 may therefore perform one course-wide streaming media scan using the frozen schema.

Requirements:

- O(`H_media_course`) scanning is explicitly allowed;
- source media rows must not be retained as a full array or row-equivalent collection;
- aggregate state is keyed only as required to reproduce long-form semantics;
- exact createdAt/id ordering remains equivalent where relevant;
- merged coverage derived-state peak must be measured when disjoint history makes it grow.

### `study_sessions`

Hub and Hero require lifetime session count and total minutes. Hub additionally requires weekly session/minute fields; both Hub and Hero require recent activity candidates.

One lifetime streaming session scan is allowed per logical read.

It must retain only:

- aggregate scalars;
- weekly aggregate scalars where needed;
- a bounded recent-session top-K sufficient to reproduce the final recent-activity top five.

No hidden full session array is permitted in HUD/Hub/Hero.

Focus's complete visible session ledger remains A5 scope and is not changed by this exception.

### `xp_transactions`

HUD/Hub/Hero require lifetime XP total/level. Hub additionally requires weekly XP; Hub/Hero require recent activity; HUD/Hub reward labels require exact earned reward keys.

Allowed:

- one lifetime streaming XP scan for aggregate/top-K purposes;
- HUD/Hub: one additional indexed finite-source-ID reward lookup.

Not allowed:

- hidden full XP arrays for totals/recent activity;
- treating an O(`H_xp`) scan as bounded or constant-time.

### Current-state/catalogue rows

`course_units`, `course_items`, `progress_entries`, `content_assets`, `content_slices`, `resume_points`, singleton profile state and Hero unlock state may be materialized when required. Their dimensions must be described as catalogue/current-state bounded rather than history bounded.

`achievement_unlocks` may be parsed/materialized for Hero because the unique-per-achievement ledger is not one of the append-only lifetime histories prohibited by Epic A.

## Recent-activity equivalence

Published Hub/Hero recent activity is exactly top five after combining:

- progress-entry updates;
- study-session starts;
- XP award timestamps.

Ordering must remain equivalent to the current builder:

1. descending timestamp;
2. ascending activity ID as tie-break;
3. final result limited to five.

Streaming histories may retain only a bounded top-K per history source plus catalogue-bounded progress candidates if that is sufficient to reproduce the same global ordering.

Do not add achievement-unlock events to recent activity: current published behavior does not include them.

## Weekly-progress equivalence

Hub weekly progress must preserve the existing local-calendar rule:

- local Monday inclusive;
- next local Monday exclusive;
- DST weeks may contain 167, 168 or 169 elapsed hours.

Field attribution remains unchanged:

- progress uses `ProgressEntry.updatedAt`;
- sessions use `StudySession.startedAt`;
- XP uses `XpTransaction.awardedAt`.

Existing calendar tests remain authoritative regressions.

## Rank/course-progress equivalence

Course completion and recommendation currently allow long-form progress to infer `started`/`completed` when no explicit progress entry exists.

A4 must preserve that behavior for HUD/Hub/Hero rank/course progress. It may not drop content/media/resume state merely because those rows are absent from the final UI object.

## Reward semantics

HUD and Hub recommendation reward labels must preserve accepted A1/A2/A3 reward behavior.

For the course-wide/default reward label:

- completion-preview reward sources use the existing finite reward-source calculation;
- `week_completed` remains excluded where the current non-detailed course-map/Hub reward label excludes it;
- exact earned keys use `(sourceType, sourceId)`;
- duplicate matching `sourceId` rows may increase rows scanned but not retained source-row count.

A4 must not change XP amounts, reasons or award rules.

## Transaction/coherence contract

Each HUD, Hub or Hero logical read must use one coherent readonly transaction across its declared required stores.

Do not split one logical output into unrelated autocommit reads.

The actual production loader for each surface must be covered by a competing-writer coherence test.

Separate child-route reads remain separate logical views. A4 does not require Map/Module/Resource/Focus/Badges data to be folded into the shell transaction.

## Route-composition sharing contract

A4 acceptance requires all of the following.

### Direct Hub

A direct `/rpg` composition must perform **one A4-owned Hub logical read**, not one shell read plus one page read.

The resulting Hub data may also supply the HUD projection.

### Direct Hero

A direct `/rpg/hero` composition must perform **one A4-owned Hero logical read**.

The shell must not independently start a HUD/Hub read when the HUD is hidden on Hero.

### Other direct RPG routes

A direct non-Hub/non-Hero RPG child route may perform at most one A4-owned HUD read, plus that child's separately owned read contract.

A1 Map, A2 Module and A3 Resource reads are not A4 violations.

### Resource/Focus post-save refresh

One explicit save may trigger at most one A4-owned refresh read per refresh attempt.

The child feedback and shell HUD must share that A4 refresh result rather than issuing a second Hub read.

Resource keeps its separate accepted A3 readback.

Focus's visible ledger/mutation behavior remains A5 scope.

### Retry/error behavior

If an A4 refresh fails after a successful mutation:

- the committed mutation remains successful;
- retry remains read-only;
- retry performs one A4 refresh attempt;
- no XP/progress/session write is repeated.

## Passive-read rule

HUD, Hub and Hero reads must perform zero persistent writes.

They must not:

- initialize/repair the database;
- evaluate/unlock achievements;
- create backups;
- award XP;
- mutate progress/session/media state.

Stored-row corruption encountered in rows the logical read requires must continue to propagate rather than being silently ignored.

## RED evidence required before A4 production edits

A4 RED must be proved against the exact accepted A3 closure baseline.

Required mechanism evidence:

1. `loadRpgHubSummary()` uses the broad all-14-store snapshot and materializes append-only histories.
2. `loadRpgHeroProfileSummary()` uses the broad all-14-store snapshot and materializes append-only histories.
3. direct `/rpg` invokes two A4 Hub reads.
4. direct `/rpg/hero` starts the shell Hub read even though the HUD is hidden, in addition to the Hero read.
5. Resource/Focus post-save composition can request both shell HUD refresh and a separate Hub refresh.

Loader/store evidence must use the calibrated DBCore access probe against the actual production loaders.

Route-composition duplication may use invocation/transaction instrumentation, but must exercise the actual route components rather than a source-text regex.

Fixture writes must occur before access instrumentation. Mutation tests must not run write transactions through the DBCore read probe.

No production file may change before RED is proved.

## GREEN evidence required

At minimum:

- Hub published-value equivalence against the unchanged pure builder;
- Hero published-value equivalence against the unchanged pure builder;
- HUD projection equivalence for learner/identity/XP/recommendation;
- representative empty/new learner, active learner and required-complete states;
- blocked/actionable recommendation and long-form inferred progress;
- learner-profile fallback behavior;
- exact recent-activity top-five/tie ordering;
- existing local-Monday/DST weekly tests;
- Hero badge counts and no persisted achievement-definition reads;
- zero passive writes;
- 1×/10× catalogue/content cardinality with constant query counts;
- 1k/10k media + session + XP history evidence with fixture setup outside measurement;
- scanned/materialized/retained/derived-peak metrics for all three histories;
- indexed reward-state evidence including duplicate relevant `sourceId` rows;
- actual-loader transaction coherence for HUD/Hub/Hero;
- direct `/rpg` one-A4-read composition;
- direct `/rpg/hero` one-A4-read composition;
- one A4 post-save refresh for Resource and Focus;
- existing save-outcome guarantees;
- A1 Map, A2 Module and A3 Resource boundary regressions;
- full clean-environment project gate;
- authoritative exact-commit Node24/npm11 `verify:release` evidence.

Long-running synthetic history tests must use deliberate timeouts and record read duration separately from fixture construction. A timeout by itself must not be misclassified as an implementation failure.

## Frozen scope

A4 must not change:

- A1 Map contract;
- A2 Module contract;
- A3 Resource contract;
- Focus complete-ledger behavior or unused Focus loader cleanup (A5);
- Badges page data boundary or unused Badge loader cleanup (A6);
- schema/version/index definitions or migrations;
- backup/storage format;
- XP/achievement rules;
- UI copy, visual design, navigation destinations or route structure;
- service worker, cloud or authentication architecture.

Behavior-preserving internal extraction/shared aggregation is allowed where required to avoid duplicated logic.

## Acceptance decision

A4 is accepted only when:

1. the exact A4 implementation commit satisfies the three logical read contracts;
2. route-level duplicate A4 reads are eliminated as specified;
3. A1–A3 remain green;
4. full exact-commit release evidence is bound to the implementation commit/tree.

A narrow Hub loader alone is not sufficient for A4 acceptance.
