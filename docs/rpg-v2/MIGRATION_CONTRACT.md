# ProgressPal RPG v2 — Migration Contract

Status: active RPG v2 contract  
Location in repo: `docs/rpg-v2/MIGRATION_CONTRACT.md`  
Companion files: `ROADMAP-rpg-v2-source-of-truth.md`, `DECISIONS-rpg-v2.md`, `VALIDATION_LOG.md`  
Scope: RPG v2 same-origin `/rpg/*` route tree over the existing ProgressPal v1 CS50x local-first engine

---

## 1. Purpose

This document defines what must not change while building ProgressPal RPG v2.

RPG v2 is not a rewrite. It is a route-based RPG interface over the existing working engine. The engine remains the source of truth for course data, progress, sessions, XP, achievements, backup/import/reset, and local-first behavior.

If implementation work needs to violate this contract, stop before coding and create a new compatibility decision in `docs/rpg-v2/DECISIONS-rpg-v2.md`.

---

## 2. Non-negotiable migration position

RPG v2 must preserve:

- same repository;
- same deployable app;
- same browser origin;
- same IndexedDB database;
- same local-first trust boundary;
- same backup/export/import/reset semantics;
- same existing classic routes as fallback during v2 development;
- same engine authority.

RPG v2 must not introduce:

- a backend;
- accounts;
- cloud sync;
- analytics;
- runtime course-data fetching;
- embedded external course content;
- schema changes;
- new XP rules;
- fake progress;
- fake RPG mechanics;
- CS50/Harvard branding misuse.

---

## 3. Source-of-truth hierarchy

When documents disagree, follow this order:

1. `docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md`
2. `docs/rpg-v2/DECISIONS-rpg-v2.md`
3. `docs/rpg-v2/VALIDATION_LOG.md`
4. current repo code and tests
5. current package scripts
6. archived v1/engine docs as historical context only
7. older RPG drafts, archive only
8. visual mockup and visual asset library, reference only

The intentionally deleted old root `DECISIONS.md` is not active RPG v2 authority unless the project owner explicitly restores it.

---

## 4. Engine surfaces that must remain authoritative

The following existing engine areas remain authoritative. RPG v2 may read or call existing public functions, but must not duplicate or override their logic.

| Engine surface | RPG v2 relationship | Migration rule |
|---|---|---|
| Course seed/catalog | Read and present | Do not invent unsupported courses or course families. |
| Course units/weeks | Present as modules/map nodes | Do not create fake units. |
| Course items/tasks | Present as quests/tasks | Do not create fake task rows unless backed by seed/data. |
| Progress entries | Read/write only through existing behavior | Do not add parallel progress state. |
| Study sessions | Use existing session save behavior | Do not persist unfinished timers. |
| XP ledger | Read and award through existing XP engine only | Do not create bonus XP rules. |
| Level derivation | Use existing XP-derived level | Do not store level separately. |
| Achievements | Use existing definitions/unlocks | Do not unlock on passive read. |
| Backup/export/import/reset | Preserve exact semantics | Do not gamify destructive controls. |
| Local-only guard | Keep as hard blocker | Do not weaken for v2. |
| Classic routes | Preserve as fallback | Do not alter behavior unless explicitly decided. |

---

## 5. IndexedDB contract

RPG v2 shares the existing IndexedDB database with v1. This is intentional so that the user’s existing local progress is visible in the RPG interface without an export/import dance.

Default rule:

```text
No schema change for RPG v2.
```

Forbidden without a compatibility decision:

- adding a new store;
- renaming a store;
- changing an index;
- changing singleton IDs;
- changing persisted entity shapes;
- silently deleting records;
- silently rewriting learner data;
- changing backup envelope shape;
- changing import/reset semantics;
- persisting new RPG-only state;
- adding class/guild/skin preferences casually.

Allowed:

- read existing records;
- write progress through existing save behavior;
- write sessions through existing session behavior;
- award XP through existing XP behavior;
- unlock achievements only through existing explicit-save achievement logic;
- use route state/query parameters for temporary UI state.

---

## 6. Schema-change stop rule

If any task appears to require a schema change, stop and write a compatibility decision before coding.

The decision must answer:

```text
1. Why is the schema change unavoidable?
2. Which store(s), fields, or indexes change?
3. What existing records are affected?
4. How does migration work for existing users?
5. How does backup export/import work before and after the change?
6. How does reset behave?
7. Can v1 data still open safely?
8. How is rollback handled?
9. What automated migration tests are added?
10. What manual validation is required?
```

No schema change is accepted unless all answers are documented and tests exist.

---

## 7. Data-access boundary

RPG UI components must not access Dexie or database tables directly.

Allowed pattern:

```text
RPG component
  -> RPG hook/model
  -> RPG selector/adapter
  -> existing domain/repository function
  -> existing database behavior
```

Forbidden pattern:

```text
RPG component
  -> direct database table access
```

Also forbidden:

```text
RPG component
  -> duplicate XP/progress/achievement calculations
```

RPG read models must be thin and need-driven. Do not create a broad generic RPG data layer before the Week-4 slice proves it needs one.

---

## 8. Read-only route mutation rule

Read-only RPG routes must not mutate data.

Read-only routes include at minimum:

```text
/rpg
/rpg/map
/rpg/week/:unitId when no save action is taken
/rpg/hero
/rpg/badges
/rpg/log
```

Any read-only route that changes store counts, XP, achievements, sessions, progress entries, or metadata fails the module.

Required evidence:

- pre/post store-count or snapshot assertions;
- module handoff notes;
- validation log entry.

---

## 9. Explicit-write rule

Data may change only after clear user action.

Examples of allowed explicit actions:

```text
Save local progress
Mark locally complete
Finish focus session
Export backup
Import backup
Reset local data
```

Examples of forbidden passive writes:

```text
Open Hub -> awards XP
Open Badge Gallery -> unlocks achievement
Open Map -> updates progress
Open Hero -> writes rank
Open Journey Log -> backfills history
Open Study Resource -> marks item started without explicit action
```

---

## 10. XP and achievement contract

XP remains governed by the existing XP engine.

RPG v2 must not:

- add new XP formulas;
- add bonus XP;
- award XP for visual interactions;
- award XP for page visits;
- award XP for passive reads;
- change level curve;
- change existing transaction semantics.

Achievements remain governed by existing definitions/unlocks.

RPG v2 must not:

- unlock achievements on page load;
- unlock achievements from read-only views;
- add achievement XP unless a future decision changes that system;
- hide locked badge requirements;
- present fake achievement art as earned progress.

---

## 11. Rank contract

Rank is a non-persisted derived label.

Formula:

```text
rankProgress = completed required items / total required items
```

Rank ladder:

| Local required progress | Rank |
|---:|---|
| 0% | New Learner |
| 1–19% | Initiate |
| 20–49% | Apprentice |
| 50–69% | Builder |
| 70–99% | Capstone Candidate |
| 100% | Course Finisher |

Rank copy must state or imply local ProgressPal progress only. It must not claim official CS50 completion.

Do not store rank separately.

---

## 12. Class/path contract

For v2, class/path is derived from the active CS50x course family.

Allowed labels:

```text
CS Foundations
Generalist
```

Forbidden in v2 UI:

```text
AI path
Web path
Data path
Security path
Locked future classes
Class selector
Class inventory
Specialization tree
```

These may be future planning ideas only. They are not v2 implementation items.

---

## 13. Guild contract

Default guild identity:

```text
Code Knights
```

Not default:

```text
CS50 Knights
```

The Code Knights label is static product copy in v2. It is not a persisted guild system.

Do not add:

- guild creation;
- guild editing;
- guild member list;
- social features;
- user-local guild rename preference;
- CS50-branded default guild identity.

A future local customization option may be considered later, but it is not part of v2.

---

## 14. Route contract

Classic routes remain:

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

RPG routes are added:

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

Optional query state:

```text
/rpg/focus?itemId=<itemId>
```

This is not a separate route.

Do not redirect `/` to `/rpg` until release-candidate review explicitly chooses that. During development, classic remains the fallback.

---

## 15. Asset/data migration boundary

Visual assets do not belong to the data migration layer. Adding an RPG asset must not require database migration.

Every asset must pass `docs/rpg-v2/ASSETS.md` before use.

Do not use assets to encode essential user data. Essential text and state must be rendered as DOM text, not baked into images.

---

## 16. Backup/export/import/reset contract

RPG v2 must preserve existing backup/export/import/reset behavior.

Backup must remain sober and clear. Do not rename destructive actions into RPG language.

Bad:

```text
Erase your realm
Burn the archive
Reset destiny
```

Good:

```text
Reset local data
Export backup
Import backup
```

RPG v2 must not:

- change backup envelope shape;
- omit data from backups;
- create RPG-only state not included in backups;
- reset only RPG state;
- silently wipe classic state;
- hide reset consequences behind playful copy.

---

## 17. Local-first contract

v2 is Level 1 local-first:

```text
Local-first app with user-clicked outbound links.
```

Allowed online behavior:

- user clicks an official external resource link.

Forbidden:

- background network requests;
- analytics;
- account requests;
- external scripts;
- remote images;
- runtime course-data fetching;
- embedded external course content;
- AI tutor calls.

If a change requires weakening the local-only guard, it is out of scope for v2.

---

## 18. Classic regression contract

Classic routes must remain behaviorally and visually stable.

Classic does not need byte-for-byte identical build output. It must remain functionally and visually equivalent for the user.

Classic regression checks:

```text
/
/dashboard
/course
/course/:itemId with known fixture
/sessions
/achievements
/insights
/settings
```

Viewport checks:

```text
390px mobile
768px tablet
1280px desktop
```

Pass standard:

- no missing content;
- no changed destructive-action wording;
- no altered classic navigation hierarchy;
- no visual breakage introduced by RPG CSS;
- no RPG styling leaking into classic routes.

---

## 19. Required evidence before RPG-01

Before implementation begins:

- roadmap exists in `docs/rpg-v2/`;
- decisions file exists in `docs/rpg-v2/`;
- validation log exists in `docs/rpg-v2/`;
- root `DECISIONS.md` deletion is reconciled or documented;
- stale root docs are archived or classified;
- baseline validation is recorded;
- v1 backup export is created if possible;
- deterministic test fixture strategy is defined;
- DB snapshot/read-only mutation checks are defined;
- RPG-00 handoff exists.

---

## 20. Stop conditions

Stop immediately if:

- branch is not understood;
- freeze tag is missing or uncertain;
- working tree contains unexplained changes;
- validation fails and the fix would touch runtime/package files during RPG-00;
- a task requires schema change;
- a task requires new backend/network behavior;
- a task requires imported external content;
- a task requires CS50/Harvard branding;
- a task requires adding assets without ledger entries;
- a task is not needed for the current module.

Record the blocker in `VALIDATION_LOG.md` or the module handoff. Do not push through.

---

## 21. Acceptance standard

A module is accepted only when:

- it obeys this migration contract;
- it obeys the roadmap;
- it obeys the decision file;
- validation passes or exact blocker is recorded;
- handoff file exists;
- Scope Discipline Check is complete;
- no unrelated work is hidden in the diff.

The standard is:

```text
More motivating than v1.
No less honest than v1.
No less local-first than v1.
No less maintainable than v1.
No larger or more complex than necessary for the accepted module.
```
