# ProgressPal RPG v2 Decisions

Status: active RPG v2 decision log  
Created: 2026-06-20  
Scope: ProgressPal RPG v2 only  
Recommended repo path: `docs/rpg-v2/DECISIONS-rpg-v2.md`  
Supersedes for RPG v2: root `DECISIONS.md` as an active RPG v2 authority, if that file has been intentionally deleted or archived

## 0. Authority and use

This file records the controlling decisions for ProgressPal RPG v2. It exists so future coding agents and human maintainers do not rely on older chat context, superseded roadmap drafts, or the deleted root `DECISIONS.md`.

The root `DECISIONS.md` was intentionally deleted before this RPG v2 planning pass. That deletion is allowed. The implementation consequence is simple: RPG v2 must not depend on root `DECISIONS.md` as an active source of truth unless it is deliberately restored. For RPG v2, this file is the decision record.

Active RPG v2 source hierarchy:

```text
1. docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
2. docs/rpg-v2/DECISIONS-rpg-v2.md
3. docs/rpg-v2/VALIDATION_LOG.md
4. docs/rpg-v2/modules/*.md
5. docs/rpg-v2/ASSETS.md
6. docs/rpg-v2/RISK_REGISTER.md
7. Current repository code and tests
8. Older roadmap drafts, archive only
9. Visual mockup, reference only
```

If this file conflicts with the source-of-truth roadmap, stop and reconcile the conflict before implementation. Do not guess.

## 1. Decision status labels

Use these exact status labels:

```text
accepted     = binding decision for RPG v2
superseded   = no longer active; keep for traceability
proposed     = not active until accepted
rejected     = explicitly not allowed
revisit-later = future possibility; not allowed in v2 unless accepted later
```

## 2. Decision index

| ID     | Status   | Decision                                                                                                                          |
| ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| D-0044 | accepted | RPG v2 is a route-based RPG shell over the frozen v1 engine, not a rewrite.                                                       |
| D-0045 | accepted | RPG v2 uses same-origin `/rpg/*` routes and the same IndexedDB as v1.                                                             |
| D-0046 | accepted | RPG mechanics must be honest derived presentation over real local data only.                                                      |
| D-0047 | accepted | Embedded video is out of scope for v2. Use official outbound links only.                                                          |
| D-0048 | accepted | Use proportionate CS50/Harvard branding restraint. No affiliation claim or protected marks.                                       |
| D-0049 | accepted | Skin preference is route-scoped for v2; no persistent skin preference unless existing metadata supports it without schema change. |
| D-0050 | accepted | Classic routes require behavioral and visual regression protection, not byte-for-byte identity.                                   |
| D-0051 | accepted | Every RPG visual asset must pass the asset provenance gate before entering the repo.                                              |
| D-0052 | accepted | CS50 links are limited to existing allowlisted official outbound links unless reviewed.                                           |
| D-0053 | accepted | Every RPG term must map to a plain product term.                                                                                  |
| D-0054 | accepted | RPG v2 is not a permanent dual-skin architecture; it is a parallel `/rpg/*` route tree during v2 development.                     |
| D-0055 | accepted | Rank is a non-persisted derived label from local required-course progress.                                                        |
| D-0056 | accepted | Class/path is deferred beyond CS50x; v2 uses CS Foundations / Generalist derived from the active course.                          |
| D-0057 | accepted | Default guild identity is Code Knights, not CS50 Knights.                                                                         |
| D-0058 | accepted | v2 is Level 1 local-first: outbound official links only; no runtime network features.                                             |
| D-0059 | accepted | Anti-overbuild and scope-discipline gate applies to every module, output, and handoff.                                            |
| D-0060 | accepted | Root `DECISIONS.md` is not an active RPG v2 authority if intentionally deleted; use this file instead.                            |
| D-0061 | accepted | RPG-01 must build only minimum slice adapters/read models; broad read-model scaffolding is deferred.                              |
| D-0062 | accepted | The first Week-4 vertical slice integration gate happens early, before profile/badges/log expansion.                              |
| D-0063 | accepted | Durable handoff evidence must be stored in `docs/rpg-v2/modules/`, not only chat.                                                 |
| D-0064 | accepted | IndexedDB snapshot/backup evidence is required before and during read-only route validation.                                      |
| D-0065 | accepted | `npm audit` network limitations must be recorded honestly; unavailable audit is not a clean pass.                                 |
| D-0066 | accepted | Early real image assets are forbidden unless the current module requires them and the asset ledger is completed first.            |
| D-0067 | accepted | Validation cadence is proportional to gate type; three full passes are not the default for normal modules.                        |
| D-0068 | accepted | Agent work mode must be explicit: acceptance audit, corrective patch, or next-module implementation.                              |
| D-0069 | accepted | Formal BMAD governance is opt-in; adversarial review thinking must not be represented as completed BMAD workflow.                 |
| D-0070 | accepted | Module completion requires source reconciliation, warning classification, committed evidence, and clean final state.              |

---

## D-0044 — RPG v2 is a shell over the frozen v1 engine

- Date: 2026-06-20
- Status: accepted

### Decision

ProgressPal RPG v2 is implemented as a new route-based RPG presentation and interaction layer over the existing v1 engine. It is not a rewrite, not a separate product, and not a new data model.

Default branch strategy:

```text
main / master
  = current stable v1 production

tag: v0.21.0-ux-complete
  = immutable v1 freeze point

branch: v1-maintenance
  = v1 bugfixes only, if needed

branch: rpg/v2
  = RPG v2 implementation over the same engine
```

### Why

The existing app already has the working local-first engine: routing, Dexie/IndexedDB, Zod schemas, course seed, XP, achievements, sessions, dashboard, insights, backup/import/reset, offline support, tests, and architecture guards. Rebuilding those creates risk without user value.

### Consequences

- Same repo by default.
- No new repo by default.
- New repo is justified only if v2 becomes a different product with different licensing, data model, dependencies, or permanent deployment identity.
- `src/lib/**` remains authoritative.
- Engine changes require a compatibility decision.
- RPG work must not damage or silently change v1 data semantics.

---

## D-0045 — Same-origin `/rpg/*` routes and one IndexedDB

- Date: 2026-06-20
- Status: accepted

### Decision

RPG v2 is built on the same origin as v1, under `/rpg/*`, using the same browser IndexedDB. Classic v1 routes remain available during development.

Classic routes:

```text
/
/onboarding
/dashboard
/course
/course/:itemId
/sessions
/achievements
/insights
/settings
```

RPG routes:

```text
/rpg
/rpg/map
/rpg/week/:unitId
/rpg/resource/:itemId
/rpg/focus
/rpg/hero
/rpg/badges
/rpg/log
/rpg/settings
```

Query-state variant, not separate route:

```text
/rpg/focus?itemId=<itemId>
```

### Why

Separate origin deployment would make RPG v2 appear empty because IndexedDB is origin-bound. That creates avoidable user confusion and apparent data loss. Same origin preserves existing progress.

### Consequences

- One database.
- No export/import bridge needed for normal v1-to-v2 use.
- Classic routes must remain stable until v2 is promoted.
- Extra care is required to prevent RPG CSS, routes, and data reads from affecting classic behavior.

---

## D-0046 — Honest RPG mechanics only

- Date: 2026-06-20
- Status: accepted

### Decision

RPG v2 is motivational presentation over real local data only. No fabricated mechanics are allowed.

Allowed:

```text
Hero level = existing XP-derived level
Badge = existing achievement unlock
Quest = existing course item
Campaign node = existing course unit
Rank = derived local required-course progress
Path/class = derived active course label for v2
Guild = local product-owned identity label
```

Forbidden unless future accepted decision exists:

```text
fake energy
fake streaks
fake guild progression
fake inventory
fake locked future courses
fake official course completion
cosmetic-only unlocks
unexplained scores
AI coaching claims
```

### Why

ProgressPal v1 is valuable because it is honest. RPG framing should improve motivation and orientation without damaging trust.

### Consequences

- Every displayed metric must have a documented formula.
- If a metric cannot be derived from existing local records, omit it or display `Not enough history yet`.
- No new stores for RPG mechanics in v2.

---

## D-0047 — No embedded video in v2

- Date: 2026-06-20
- Status: accepted

### Decision

Embedded video is out of scope for RPG v2. The former `Content Player` concept is renamed in product language to `Study Resource` or `Lesson Guide`.

Allowed:

```text
official outbound CS50 course links
local notes
manual progress controls
local resume/checkpoint records if supported by existing engine
first-party representative resource card art
```

Forbidden in v2 docs and implementation:

```text
YouTube player
YouTube IFrame API
YouTube Data API
media registry
playback-time mapping
sourceUrl fields
durationSeconds media metadata work
auto-tracked playback
hotlinked thumbnails
embedded lecture surface
```

### Why

Embedded video would introduce third-party runtime behavior, privacy/CSP/service-worker review, offline degradation, and branding/content risk. It is disproportionate to the v2 goal.

### Consequences

- Use outbound links only.
- Do not weaken the local-only architecture guard.
- Any change requiring weakening `localOnly.test.ts` is out of scope for v2 unless a future decision explicitly redefines the product boundary.
- A representative still image must not look like a fake video player, must not include a play button, and must not include fake scrubber/timestamp UI.

---

## D-0048 — Branding restraint for CS50/Harvard

- Date: 2026-06-20
- Status: accepted

### Decision

ProgressPal may refer to CS50x descriptively as the course being studied. It must not imply affiliation, endorsement, sponsorship, certification, official tracking, or Harvard/CS50 ownership.

Required public/default framing:

```text
ProgressPal is an independent local-first study tracker.
It is not affiliated with, endorsed by, or sponsored by Harvard University, CS50, edX, or OpenCourseWare.
```

Allowed:

```text
CS50x study track
Open official CS50x course page
Week 4: Memory
Problem Set 4
local study progress
```

Forbidden:

```text
CS50 as shipped app brand
CS50 Knights as default public guild
Harvard shield
CS50 logo
CS50 badge as product badge
Official CS50 tracker
Harvard progress
CS50 certified
Official completion
```

### Why

The product can truthfully help a learner study CS50x without adopting CS50/Harvard identity.

### Consequences

- Use ProgressPal-owned identity and art.
- Default guild identity is Code Knights.
- CS50 Knights may exist only as user-local customization if implemented later.

---

## D-0049 — Skin preference storage

- Date: 2026-06-20
- Status: accepted

### Decision

RPG v2 does not implement a persistent global skin preference by default. RPG skin activation is route-scoped: `/rpg/*` renders RPG UI, classic routes render classic UI.

Preferred only if already supported without schema change:

```text
store UI preference in existing app_meta key/value metadata
```

Fallback:

```text
do not persist skin preference in v2
```

Forbidden:

```text
adding an unvalidated learner_profile field casually
adding a schema migration only for skin preference
building a permanent dual-skin UI system before v2 proves itself
```

### Why

Persistent skin preference is not required to reach the v2 endstate. Route-based RPG shell is enough and avoids overbuild.

### Consequences

- Do not add schema fields for skin preference in v2.
- Do not create a broad app-wide skin toggle unless a future decision proves the need.

---

## D-0050 — Classic route regression standard

- Date: 2026-06-20
- Status: accepted

### Decision

Classic v1 routes do not need to be byte-for-byte identical in build output. They must remain behaviorally and visually unchanged under regression checks.

Required classic route checks:

```text
/dashboard
/course
/course/:itemId with known fixture
/sessions
/achievements
/insights
/settings
```

Required viewports:

```text
390px mobile
768px tablet
1280px desktop
```

Pass standard:

```text
no missing content
no changed destructive-action wording
no altered classic navigation hierarchy
no visual breakage introduced by RPG CSS
no RPG styling leaking into classic routes
backup/import/reset semantics unchanged
offline cold boot unchanged
```

### Why

Byte-for-byte identity is unrealistic in the same deployable. Behavioral and visual regression protection is the real requirement.

### Consequences

- Classic route regression must be tested before promoting v2.
- Any intentional classic route change requires explicit documentation.

---

## D-0051 — Asset provenance gate

- Date: 2026-06-20
- Status: accepted

### Decision

No RPG image, badge, avatar, map, still, texture, icon, emblem, or decorative asset may enter the repository unless it is recorded in `docs/rpg-v2/ASSETS.md` first.

Minimum ledger fields:

```text
Asset ID
Filename
Repo path
In-app placement
Purpose
Source
Creator/tool
License or usage basis
File size
Dimensions
Contains text: yes/no
Decorative: yes/no
Alt text or aria-hidden rule
CS50/Harvard branding risk check
Optimization status
Module introduced
Reviewer/date
```

### Why

The asset library is the main bundle-size, licensing, and visual-overbuild risk.

### Consequences

- RPG-00 creates the empty asset ledger but adds no assets.
- Real assets enter only when required by a module or during asset pass.
- Early real assets are allowed only with explicit module justification and completed ledger entry.

---

## D-0052 — CS50 link boundary

- Date: 2026-06-20
- Status: accepted

### Decision

RPG v2 may use existing official CS50 outbound link helpers. It must not casually add new external URL classes.

Allowed by default:

```text
existing allowlisted cs50.harvard.edu links
```

New external URL class requires:

```text
allowlist review
copy review
local-only test review
branding review
validation log note
```

### Why

Outbound official links support Level 1 local-first behavior. Expanding URL classes can create privacy, branding, and local-only guard risk.

### Consequences

- No YouTube links as a special implementation surface unless separately approved.
- No API URLs.
- No runtime fetch.

---

## D-0053 — RPG language boundary

- Date: 2026-06-20
- Status: accepted

### Decision

Every RPG term must map to a plain product term. If a term cannot be mapped, it is not allowed in v2.

Required mapping:

| RPG term                      | Plain product term                              | v2 rule                                            |
| ----------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| Hero                          | Learner profile                                 | Allowed                                            |
| Quest                         | Course item / task                              | Allowed                                            |
| Campaign node                 | Course unit / week                              | Allowed                                            |
| Campaign map                  | Course map                                      | Allowed                                            |
| Study Resource / Lesson Guide | Course item detail / official resource launcher | Allowed                                            |
| Focus Session                 | Study session                                   | Allowed                                            |
| Badge                         | Achievement unlock                              | Allowed                                            |
| Hero level                    | XP-derived level                                | Allowed                                            |
| Rank                          | Derived local required-course progress label    | Allowed                                            |
| Path / Class                  | Active course direction label                   | Allowed only as CS Foundations / Generalist in v2  |
| Guild                         | Local product-owned group identity              | Allowed as Code Knights default                    |
| Energy                        | Session capacity / motivation metaphor          | Forbidden in v2 unless derived and justified later |
| Inventory                     | Cosmetic/collectible storage                    | Forbidden in v2                                    |
| Official completion           | CS50/Harvard completion status                  | Forbidden                                          |

### Why

RPG language should clarify and motivate, not invent systems.

### Consequences

- Copy review must check term mapping.
- No module may add RPG terms outside this table without updating the decision file.

---

## D-0054 — RPG routes, not permanent dual-skin architecture

- Date: 2026-06-20
- Status: accepted

### Decision

RPG v2 is implemented as a parallel `/rpg/*` route tree over the existing engine. The app does not commit to maintaining a permanent user-facing classic/RPG skin toggle unless that proves necessary after v2 validation.

### Why

A permanent dual-skin architecture increases complexity, bundle size, and maintenance burden before it has proven user value.

### Consequences

- Classic routes remain fallback during development.
- RPG routes prove the new experience.
- Promotion decision happens after the Week-4 slice and release validation.

---

## D-0055 — Rank is derived from local required-course progress

- Date: 2026-06-20
- Status: accepted

### Decision

Rank is a non-persisted derived label based on completed required items divided by total required items in the active course.

Rank ladder:

```text
0%       New Learner
1–19%    Initiate
20–49%   Apprentice
50–69%   Builder
70–99%   Capstone Candidate
100%     Course Finisher
```

Formula:

```text
rankProgress = completedRequiredItems / totalRequiredItems
```

### Why

Rank gives RPG progression without fake mechanics or new storage. It is directly tied to honest local progress.

### Consequences

- Rank is local ProgressPal progress only.
- Do not imply official CS50 completion.
- No rank table/store.
- Rank badges are deferred unless existing achievement logic can support them honestly later.

---

## D-0056 — Class/path is deferred beyond CS50x

- Date: 2026-06-20
- Status: accepted

### Decision

For v2, class/path is derived from the active CS50x course and shown as:

```text
Path: CS Foundations
```

or

```text
Class: Generalist
```

AI/Web/Data/Security paths are deferred until multi-course support exists or the user can explicitly select a local preference through a documented storage decision.

### Why

Showing locked future classes makes promises the app has not earned.

### Consequences

- No fake locked AI/Web/Data/Security paths in v2.
- No new preference storage for class/path in v2.
- Future specialization belongs to v3 or a multi-course module.

---

## D-0057 — Guild identity avoids CS50 as shipped brand

- Date: 2026-06-20
- Status: accepted

### Decision

The shipped default guild identity is:

```text
Code Knights
```

Not:

```text
CS50 Knights
```

The shield/sword/circuit emblem may be used as a ProgressPal-owned Code Knights emblem if it passes the asset provenance gate.

### Why

`CS50 Knights` makes CS50 part of the product identity and increases perceived affiliation risk.

### Consequences

- Public default: Code Knights.
- Course context: CS50x study track.
- User-local customization may allow CS50 Knights later, but only as local user text and not shipped public branding.

---

## D-0058 — Level 1 local-first with outbound links only

- Date: 2026-06-20
- Status: accepted

### Decision

v2 remains local-first and offline-capable. The only online behavior allowed is user-initiated outbound links to official course resources.

Level model:

```text
Level 0 — Offline-only local app
No runtime network. Local IndexedDB only. Official links open externally.

Level 1 — Local-first with outbound resource links
The app remains local. User can click official course links. No embedded content, no API, no telemetry.

Level 2 — Local-first with optional online enhancement
Examples: update notices, optional metadata, optional cloud backup, optional sync.

Level 3 — Connected product
Accounts, cloud sync, analytics, hosted backend.

Level 4 — Online learning platform
Embedded content, media tracking, AI tutor, remote progress, recommendations, analytics.
```

v2 uses Level 1.

### Why

Level 1 gives resource access without changing the privacy/security model. IndexedDB loss is a real concern, but optional encrypted backup/sync is a later project.

### Consequences

- No runtime network features in v2.
- No cloud sync.
- No analytics.
- No AI tutor.
- No metadata fetching.
- No embedded media.
- Future optional sync/backup requires a new decision, privacy model, network consent model, CSP review, service-worker review, threat model, and backup compatibility plan.

---

## D-0059 — Anti-overbuild and scope-discipline gate

- Date: 2026-06-20
- Status: accepted

### Decision

Every AI output, implementation module, review, handoff, and phase must apply the anti-overbuild gate.

Before adding anything, ask:

```text
1. Does this need to be here?
2. Is this required to reach the intended endstate for this module?
3. Is this required by the source-of-truth roadmap, an accepted decision record, or a failing test?
4. Does this preserve the v1 engine contract?
5. Does this preserve same-origin /rpg/*, no backend, no schema change, no embedded video, and Level 1 local-first?
6. Does this introduce a dependency, asset, runtime request, data store, preference, or abstraction the current module did not ask for?
7. Can this be done with existing code, existing styles, existing data, or a smaller local component?
8. Would a future maintainer understand why this was necessary from the module acceptance criteria alone?
```

Forbidden without explicit decision:

```text
while-I-am-here refactors
convenience dependencies
new UI libraries
new animation libraries
new icon packages
new stores
schema changes
backend prep
sync ports
AI hooks
analytics hooks
fake future course scaffolding
broad read models before needed
asset dumps
unrequested polish passes
```

### Why

AI agents tend to overbuild. This project must stay modular, sequential, and evidence-led.

### Consequences

- Every module handoff must include a Scope Discipline Check.
- Missing check means the module is incomplete.
- Any overbuild temptation must be listed as deferred, not implemented.

---

## D-0060 — Root `DECISIONS.md` is not active for RPG v2 if intentionally deleted

- Date: 2026-06-20
- Status: accepted

### Decision

If root `DECISIONS.md` is intentionally deleted, RPG v2 uses this file as the active decision record.

### Why

The repo must not depend on a deleted file. Intentional deletion is acceptable if source-of-truth hierarchy is updated.

### Consequences

- Do not restore root `DECISIONS.md` automatically.
- Do not discard the deletion blindly.
- Reconcile git state by committing the deletion or otherwise documenting it.
- Place this file at `docs/rpg-v2/DECISIONS-rpg-v2.md`.

---

## D-0061 — RPG-01 minimum slice adapters only

- Date: 2026-06-20
- Status: accepted

### Decision

RPG-01 must not create all future RPG read models. It creates only the minimum selector/adapter surface needed to start the Week-4 slice.

Allowed in RPG-01:

```text
RPG feature boundary
route/data access guard
minimal hub summary selector
minimal course/map/module selector needed for Week-4 slice
read-only mutation tests for these selectors
```

Deferred:

```text
hero model
badge gallery model
journey log model
generalized RPG data abstraction
multi-course models
asset management systems
```

### Why

Broad read-model scaffolding before a proven slice violates anti-overbuild.

### Consequences

- Build only what the current slice needs.
- Add later models in their own modules.

---

## D-0062 — Early Week-4 vertical slice integration gate

- Date: 2026-06-20
- Status: accepted

### Decision

The first full RPG value path must be proven before expanding into profile, badges, journey log, or polish.

First slice path:

```text
Hub -> Map -> Week 4 -> Study Resource -> save local progress -> Focus Session -> return to Hub
```

### Why

Waiting until late modules to prove integration allows risk accumulation.

### Consequences

- Add the first integration gate immediately after the slice screens exist.
- Do not build Hero/Profile, Badge Gallery, or Journey Log before the slice gate passes unless the roadmap explicitly orders otherwise.

---

## D-0063 — Durable module handoff evidence

- Date: 2026-06-20
- Status: accepted

### Decision

Every module must produce a durable handoff file under:

```text
docs/rpg-v2/modules/
```

Naming convention:

```text
docs/rpg-v2/modules/RPG-00-HANDOFF.md
docs/rpg-v2/modules/RPG-01-HANDOFF.md
docs/rpg-v2/modules/RPG-02-HANDOFF.md
```

Minimum handoff sections:

```text
Module
Goal
Files changed
Why each file changed
Validation commands and results
Scope Discipline Check
Classic regression impact
Data/storage impact
Network/runtime impact
Asset ledger impact
Deferred tempting work
Known risks
Next module readiness
```

### Why

Chat-only handoffs are not durable evidence.

### Consequences

- Missing handoff file means module incomplete.
- Handoff file must be committed with the module.

---

## D-0064 — IndexedDB snapshot and backup evidence

- Date: 2026-06-20
- Status: accepted

### Decision

Read-only RPG screens must be proven read-only using deterministic evidence.

Before RPG-01:

```text
export a v1 backup through the app if possible
create or identify deterministic seeded test DB fixture
record baseline store counts or snapshots for read-only route tests
```

For read-only modules:

```text
capture pre-state
open/use read-only screen
capture post-state
assert no mutation
```

### Why

Same-origin v2 shares v1 data. Read-only screens mutating data would damage trust.

### Consequences

- Hub, Map, Badge Gallery, Journey Log, and other read-only screens need mutation tests.
- Any read-only route that writes data fails the module.

---

## D-0065 — `npm audit` network fallback

- Date: 2026-06-20
- Status: accepted

### Decision

`npm audit` remains part of validation, but audit unavailability must be recorded honestly.

If audit cannot run because the environment has no network:

```text
record exact command and failure in VALIDATION_LOG.md
do not mark the module fully clean
continue implementation only if all other checks pass and audit is run before integration/release gate
```

If audit reports moderate/high/critical:

```text
classify production vs dev/test-only
fix or document accepted deferral
no silent ignore
```

### Why

A network-dependent development audit can fail in restricted environments. Treating that as clean would be false.

### Consequences

- Validation status must distinguish `clean`, `blocked`, `partial`, and `not run`.
- Release gates require audit resolution.

---

## D-0066 — Early asset rule

- Date: 2026-06-20
- Status: accepted

### Decision

No real image assets are added in RPG-00. Broad asset import waits until the asset pass. Earlier real assets may enter only when the current module requires them and the ledger is completed first.

Early asset requirements:

```text
module requires the asset
asset is recorded in ASSETS.md first
asset is optimized
asset contains no baked-in UI text
asset does not imitate CS50/Harvard branding
handoff file names asset ledger ID
```

### Why

Asset dumps are a major overbuild and bundle-size risk.

### Consequences

- Use CSS placeholders or inline SVG where possible in early modules.
- Do not import the whole visual asset library.
- Asset pass must curate, not dump.

---

## D-0067 — Proportional validation cadence

- Date: 2026-06-21
- Status: accepted

### Decision

Validation cadence is proportional to the risk and gate type. Three full validation passes are not the default for ordinary module work.

Default cadence:

```text
Normal module:
- run targeted tests during development;
- run one full `npm run validate` after final changes.

Corrective patch after a failed or partial module:
- run targeted tests for the corrected gap;
- run one full `npm run validate` after final changes;
- optionally run two additional full validation passes only if the prior failure was flaky, environment-sensitive, or repeatedly reproduced.

Major gates:
- RPG-00 baseline: three consecutive clean full-validation passes if the environment supports them.
- RPG-09 Week-4 vertical slice: three consecutive clean full-validation passes if the environment supports them.
- RPG-15 release candidate: three consecutive clean full-validation passes if the environment supports them.
```

Repeated validation is evidence only when the final file state is unchanged between passes. If any file changes after a validation pass, that pass no longer validates the final state.

### Why

Overusing three full validation passes for every normal module wastes time and can hide process confusion. Underusing validation at major gates weakens confidence. The cadence should match risk.

### Consequences

- Normal modules need one clean full validation after final changes.
- Corrective patches need targeted evidence for the corrected acceptance gap plus one clean full validation.
- Extra passes are reserved for baseline, integration, release, flaky behavior, or environment-sensitive failures.
- Handoffs must record which validation cadence was used and why.

---

## D-0068 — Explicit agent work mode

- Date: 2026-06-21
- Status: accepted

### Decision

Before implementation or review, the agent must identify one work mode:

```text
Mode A — Acceptance audit only
No code changes. Compare current repo state against roadmap, decisions, validation log, migration contract, risk register, and relevant handoff.

Mode B — Corrective patch
Fix only acceptance gaps in the current module. No next-module work. No broad polish. No unrelated cleanup.

Mode C — Next-module implementation
Begin only after the previous module is committed, handoff evidence is committed, validation is clean for the required gate, and known source-of-truth inconsistencies are resolved or explicitly accepted.
```

### Why

The most likely process failure is mixing audit, corrective patching, and next-module implementation. Naming the mode prevents accidental scope expansion and makes handoff review easier.

### Consequences

- A module prompt should ask the agent to state the work mode before coding.
- Mode B must not turn into Mode C.
- Mode C is blocked by unresolved acceptance gaps in the prior module.
- A report must distinguish `implemented locally`, `ready to commit`, and `complete`.

---

## D-0069 — BMAD governance is opt-in

- Date: 2026-06-21
- Status: accepted

### Decision

Formal BMAD governance is used only when explicitly chosen by the project owner.

Allowed without formal BMAD governance:

```text
adversarial review thinking
acceptance-audit lens
risk-focused code review
roadmap/decision compliance review
```

Not allowed unless formal BMAD governance is explicitly invoked and completed:

```text
claiming BMAD activation as the controlling workflow
claiming BMAD readiness
claiming BMAD handoff completeness
treating empty BMAD output folders as blockers
partially invoking BMAD step files while skipping their required checkpoints
```

If an agent uses review ideas inspired by BMAD, it must describe the work as a roadmap acceptance audit or adversarial review, not as completed BMAD workflow.

### Why

BMAD can be useful, but half-invoked workflow creates false authority and process confusion. The RPG v2 source-of-truth documents are controlling unless formal BMAD governance is explicitly selected.

### Consequences

- `_bmad-output/` emptiness is not a blocker by itself.
- BMAD artifacts are not required for RPG v2 unless separately accepted.
- Agents must not mix formal BMAD claims with non-BMAD execution.

---

## D-0070 — Completion requires reconciled, committed evidence

- Date: 2026-06-21
- Status: accepted

### Decision

A module is not complete until final repo evidence is reconciled and committed.

Completion requires:

```text
source-of-truth reconciliation completed
warnings and anomalies classified
module handoff updated
validation log updated if evidence changed
risk register updated if risk changed
final validation cadence satisfied
implementation and evidence committed together
working tree clean except expected branch-ahead state
```

Uncommitted work may be described only as:

```text
implemented locally
ready for review
ready to commit
```

It must not be described as module complete.

### Why

Chat reports are not durable project evidence. The repository must contain the implementation, handoff, validation evidence, and any decision/risk updates needed to understand the module later.

### Consequences

- `git status -sb` must be part of final reporting.
- Any warning, including environment warnings, must be classified as blocker / environment warning / harmless but noted.
- Source-of-truth conflicts must be resolved, not left for the next module by default.
- A clean validation claim applies only to the final committed or commit-ready file state.
