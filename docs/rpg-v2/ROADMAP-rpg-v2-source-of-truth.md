# ProgressPal RPG v2 — Source-of-Truth Roadmap and Sequential Implementation Plan

Status: source-of-truth implementation roadmap  
Created: 2026-06-20  
Updated: 2026-07-13
Scope: ProgressPal RPG v2, implemented as a same-origin `/rpg/*` route tree over the existing ProgressPal CS50x local-first engine  
Audience: junior/vibe-coding implementer working under strict module gates  
Supersedes: all earlier RPG v2 roadmap drafts and interim consolidated plans  
Companion files: `docs/rpg-v2/DECISIONS-rpg-v2.md`, `docs/rpg-v2/VALIDATION_LOG.md`, `docs/rpg-v2/ASSETS.md`, `docs/rpg-v2/RISK_REGISTER.md`

---

## 2026-08-12 v1.3 remediation override

The current operational release target is `1.3.0`, not `1.2.0`. Existing `v1.2.0-local-first-proof` and `v1.2.1-local-first-proof` tags are immutable historical releases. D-0075 in `docs/rpg-v2/DECISIONS-rpg-v2.md` governs the remaining v1.3 validation cadence and release scope. The older remediation story remains historical evidence, not the current executable sequence.

For this remediation only, D-0075 supersedes older next-action, branch, release-tag, visual-target, research-prerequisite, and validation-cadence language in this file. Historical module sections remain useful implementation history. Classic remains the v1.3 default; RPG promotion is a separate later decision and no further RPG expansion is authorized by the release work.

---

## 2026-07-12 release-candidate stabilization audit

Current audited baseline: `67ed6af836ec46f136bc5622aa68c8745c8bcf40` on `master`.

The current audit has triple-verified the release-route gate, atomic recovery, the managed production-browser harness, first-use/shared RPG state, and representative RPG accessibility/offline behavior. Executable release identity is `1.2.0`. The final release decision remains gated by three clean full-repository validation passes; no broad RPG feature phase is authorized by this stabilization work.

Detailed findings and evidence are recorded in `docs/audits/progresspal-production-readiness-2026-07-11.md`.

---

## 2026-06-24 current state after RPG Shell Phase 2G

Current master at audit start:

```text
e3246e7 Merge pull request #37 from ruishinor/rpg/shell-02g-insights-cleanup
```

The post-freeze RPG Shell wrapper remediation is now merged through Phase 2G:

| Phase | Capability                | Current status                                                                             | Evidence                                       |
| ----- | ------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| 2C    | `/rpg/focus`              | Complete and merged as a classic-wrapped Focus/session capability.                         | `docs/rpg-v2/modules/RPG-SHELL-02C-HANDOFF.md` |
| 2D    | `/rpg/badges`             | Complete and merged as a classic-wrapped Achievements capability.                          | `docs/rpg-v2/modules/RPG-SHELL-02D-HANDOFF.md` |
| 2E    | `/rpg/log`                | Complete and merged as a classic-wrapped Insights capability.                              | `docs/rpg-v2/modules/RPG-SHELL-02E-HANDOFF.md` |
| 2F    | `/rpg/settings`           | Complete and merged as a classic-wrapped Settings/data-controls capability.                | `docs/rpg-v2/modules/RPG-SHELL-02F-HANDOFF.md` |
| 2G    | stale Journey Log cleanup | Complete and merged; remaining "Journey Log" references are historical documentation only. | `docs/rpg-v2/modules/RPG-SHELL-02G-HANDOFF.md` |

Current interpretation:

- Do not describe Phase 2C, 2D, 2E, 2F, or 2G as pending.
- The older RPG-00 through RPG-15 plan below remains implementation history and still explains constraints, but its module order and "next action" language are not current operational guidance for the checked-in post-2G state.
- The earlier RPG-15 release-candidate validation predates the 2C-2G wrapper changes. It remains useful historical evidence, not final release-candidate evidence for `e3246e7`.
- Wrapper remediation can be treated as complete for Focus, Achievements, Insights, Settings, and stale Journey Log cleanup based on the phase handoffs.

Remaining work before a release decision:

- Run release-candidate validation against the current post-2G state.
- Recheck classic/RPG route regression, backup/export/import/reset behavior, local-first/offline behavior, accessibility/layout, and stale user-facing "Journey Log" copy.
- If validation finds a concrete blocker, fix that blocker only and rerun the appropriate validation.
- If validation passes, record the post-2G release-candidate result and release decision.

The next recommended step is release-candidate validation for the post-2G state, not a broad new feature phase.

---

## 2026-06-23 freeze update

The current checked-in app should be frozen and released as:

```text
ProgressPal CS50 Edition v1.2.0 - local-first CS50 tracker proof with gamified elements
```

Recommended tag:

```text
v1.2.0-local-first-proof
```

This current app is valuable, but it is not the fully realized RPG v2 shell described by this roadmap. Treat the existing RPG-flavored routes, visual polish, and release-candidate validation as proof that the local-first engine can carry a gamified CS50 tracker. Do not treat them as completion of the character-led campaign shell.

At the June 23 freeze point, the next RPG v2 phase was expected to begin after this freeze from a clean branch, recommended:

```text
rpg/real-shell-v2
```

That recommendation is historical context. After the subsequent RPG Shell Phase 2A-2G remediation, the current next step is the post-2G release-candidate validation described above.

Historical note: some module documents and validation entries reflect a stale RPG module ordering mismatch. Preserve them as implementation history, but use the June 23 freeze classification above for current product framing.

---

## 0. Executive summary

ProgressPal v1 is the working engine. It is the plain, honest, local-first CS50x study tracker that already works. RPG v2 must not rebuild that engine.

RPG v2 is a new route tree and interaction layer under `/rpg/*`. It uses the same repository, the same app, the same origin, the same IndexedDB database, the same XP system, the same progress system, the same achievement system, the same backup/import/reset behavior, and the same local-first trust boundary.

The correct mental model is:

```text
ProgressPal v1 classic UI = engine room and fallback interface
ProgressPal RPG v2       = RPG upper deck over the same engine
```

The implementation must be modular and sequential. Do not start broad visual rewriting. Do not scaffold future systems. Do not “clean up while you are here.” First prove one vertical slice:

```text
Hub -> Map -> Week 4 -> Study Resource -> Focus Session -> Hub/Log/Badges reflection
```

The hard constraints are:

- Same repo by default.
- Same origin.
- Same IndexedDB.
- `/rpg/*` route tree.
- Classic v1 routes remain available during development.
- No new backend.
- No cloud sync in v2.
- No authentication.
- No analytics.
- No schema change.
- No fake RPG mechanics.
- No embedded media.
- No runtime external course-data fetching.
- No CS50/Harvard branding misuse.
- Official course resources are opened only through user-clicked outbound links.
- Assets are first-party, local, documented, optimized, and provenance-tracked.
- No overbuilding: every module builds only what is required by that module’s acceptance criteria.
- Every implementation handoff must include a Scope Discipline Check.
- RPG-00 starts with baseline reconciliation and documentation only: no runtime code changes, no package changes, no route changes, no asset imports.

At roadmap creation, the best next action was **not to code**. The best next action was RPG-00: install the source-of-truth documents inside the repo, reconcile the intentional deletion of the old root `DECISIONS.md`, clean up misleading root documentation safely, confirm the freeze point, run validation, record the baseline, and stop if the baseline is not clean. That instruction is historical for the original RPG v2 start; for the checked-in post-2G state, use the June 24 current-state section above.

---

## 1. Controlling principle: no bias, no overbuild, no bullshit

This roadmap is not a permission slip to build everything that sounds cool. It is a sequence of constrained implementation gates.

Before adding anything, ask:

```text
1. Does this need to be here?
2. Is this required to reach the intended endstate for this module?
3. Is this required by the source-of-truth roadmap, an accepted decision record, or a failing test?
4. Does this preserve the v1 engine contract?
5. Does this preserve same-origin /rpg/*, no backend, no schema change, no embedded media, and Level 1 local-first behavior?
6. Does this introduce a dependency, asset, runtime request, data store, preference, route, abstraction, or styling system that the current module did not ask for?
7. Can this be done with existing code, existing styles, existing data, or a smaller local component?
8. Would a future maintainer understand why this was necessary from the module acceptance criteria alone?
```

If the answer to questions 1, 2, or 3 is “no,” do not build it.

If the answer to question 6 is “yes,” stop and justify the change before coding. If it changes product scope, write or update a decision record first.

Explicitly forbidden unless a later accepted decision says otherwise:

- “while I am here” refactors;
- broad cleanup not required by the module;
- new dependencies for convenience;
- new routes outside the current module;
- new storage fields or schema changes;
- new app preferences;
- new assets not needed by the current screen;
- speculative future support;
- fake locked content;
- fake future course families;
- hidden settings;
- premature generic frameworks;
- abstractions created before there are at least two real use cases;
- changing classic routes while working on RPG routes;
- improving unrelated code because the agent noticed it;
- importing the whole visual asset library into the app.

Each module handoff must include a Scope Discipline Check:

```text
Scope Discipline Check
- Intended module:
- Work mode: Acceptance audit only / Corrective patch / Next-module implementation:
- Files changed:
- Why each changed file was necessary:
- What was deliberately not added:
- New dependencies: none / list and justify:
- New assets: none / list and ledger IDs:
- New storage/schema: none / decision ID:
- Runtime network behavior changed: no / decision ID:
- Classic route behavior changed: no / explain and cite decision:
- Source-of-truth reconciliation: no conflicts / list resolved conflicts:
- Warnings and anomalies: none / list classifications:
- Validation cadence used: normal / corrective / major gate:
- Commit status: committed / uncommitted local work:
- Any deferred tempting work:
```

A module is not accepted without this check.

---

## 2. Source hierarchy

The intentionally deleted old root `DECISIONS.md` is not the active authority for RPG v2 unless it is deliberately restored by the project owner. The RPG v2 authority lives under `docs/rpg-v2/`.

When documents disagree, follow this order:

1. `docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md`
2. `docs/rpg-v2/DECISIONS-rpg-v2.md`
3. `docs/rpg-v2/VALIDATION_LOG.md`
4. Current repo code and tests
5. Current package scripts
6. Archived v1 engine documentation, for historical context only
7. Older RPG roadmap drafts, archive only
8. Visual mockup and visual asset library, reference only

The visual mockup is a direction reference, not a literal specification.

The categorized visual asset library is a candidate source library, not app-ready production assets. No asset from that library is considered approved until it has been renamed, optimized, reviewed, recorded in `ASSETS.md`, and intentionally placed under the RPG asset folder.

---

### 2.1 Agent work modes and process gates

Before any implementation or review, the agent must state one work mode.

```text
Mode A — Acceptance audit only
No code changes. Compare current repo state against the roadmap, decisions, validation log, migration contract, risk register, current code/tests, and relevant handoff.

Mode B — Corrective patch
Fix only acceptance gaps in the current module. Do not start the next module. Do not polish broadly. Do not perform unrelated cleanup.

Mode C — Next-module implementation
Start only after the previous module is committed, the handoff evidence is committed, required validation is clean, source-of-truth inconsistencies are reconciled or explicitly accepted, and no blocker remains.
```

Mode rules:

- Mode A may recommend changes but must not edit files.
- Mode B may edit only files required to close the current acceptance gap.
- Mode C must cite the current module acceptance criteria before coding.
- A module may be `implemented locally` or `ready to commit` before commit, but it is not complete until the implementation and evidence are committed together.
- Chat claims are not durable evidence. Repo files, tests, validation logs, risk updates, and commits are evidence.

Before any commit, complete this reconciliation check:

```text
Source-of-truth reconciliation:
- Roadmap conflicts found: none / list
- Decision-log conflicts found: none / list
- Validation-log stale entries found: none / list
- Handoff inconsistencies found: none / list
- Risk-register updates needed: none / list
- Any unresolved inconsistency before commit: none / explicitly accepted by project owner
```

Warnings must be classified, not ignored:

```text
Warnings and anomalies:
- Command:
- Warning:
- Classification: code blocker / environment warning / harmless but noted
- Action taken:
- Does it affect clean validation claim: yes/no and why
```

---

## 3. Product thesis

ProgressPal RPG v2 should make CS50x study feel more oriented, motivating, and legible without becoming dishonest, bloated, official-looking, or game-like at the cost of usability.

The v1 app is plain but valuable because it is trustworthy. RPG v2 must preserve that trust.

The RPG layer should add:

- a clearer next action;
- a stronger sense of progression;
- a better course map;
- a better module/week detail flow;
- a more motivating focus-session surface;
- a badge gallery that is easier to understand;
- a hero/profile surface that summarizes real progress;
- a rank label derived from real local progress;
- a Code Knights guild identity that belongs to ProgressPal, not CS50 or Harvard;
- a visual system that is more engaging but still readable, local-first, and restrained.

The RPG layer must not add:

- fake progress;
- fake classes;
- fake guild mechanics;
- fake energy systems;
- fake locked courses;
- fake official CS50 completion;
- fake certification language;
- fake media tracking;
- fake course support;
- a permanent dual-skin architecture unless it proves necessary later.

---

## 4. Canonical decisions for RPG v2

The full decision records belong in `docs/rpg-v2/DECISIONS-rpg-v2.md`. The following summaries are binding.

### D-0044 — RPG v2 is a route-based RPG shell over the frozen engine

ProgressPal RPG v2 is built over the existing ProgressPal v1 engine. It is not a rewrite and not a new product foundation.

Implementation branch:

```text
rpg/v2
```

Expected freeze tag:

```text
v0.21.0-ux-complete
```

The existing engine remains authoritative. Any proposed change to engine behavior requires a written compatibility decision before code is changed.

### D-0045 — Same-origin `/rpg/*` route tree over one IndexedDB

RPG v2 runs under `/rpg/*` in the same deployable and same browser origin as v1.

This means:

- the user keeps existing local IndexedDB progress;
- no export/import dance is required just to try RPG v2;
- classic routes remain available as fallback during development;
- v2 must be more careful because it shares the same database.

Separate-origin deployment may be used only for temporary preview/testing if clearly labeled. It is not the intended final v2 user path.

### D-0046 — RPG mechanics must be honest derived presentation

RPG v2 may rename and visualize real ProgressPal concepts, but it must not invent unsupported mechanics.

Allowed:

- XP from existing XP ledger;
- level from existing XP system;
- badge from existing achievement unlocks;
- rank from required-course progress percentage;
- class/path from active course family;
- guild identity as a local ProgressPal-owned label;
- quest from real course item;
- module from real course unit/week.

Forbidden for v2:

- fake energy;
- fake inventory;
- fake class specializations;
- fake locked courses;
- fake official completion;
- fake achievements;
- cosmetic-only unlocks presented as earned progress;
- any metric without a documented formula and source.

### D-0047 — Embedded media is out of scope for v2

RPG v2 uses official outbound resource links and local manual progress controls.

It does not load embedded course playback inside the app. It does not auto-track watching. It does not rehost videos, transcripts, thumbnails, lecture slides, problem text, or course pages.

The screen formerly imagined as a player is renamed:

```text
Study Resource
```

Its job is to help the learner open the correct official resource and record local ProgressPal progress by explicit action.

### D-0048 — Branding restraint and CS50/Harvard boundary

The app may factually say that the learner is studying CS50x. It may link to official CS50x course resources.

The app must not imply that it is official, endorsed, sponsored, affiliated, certified, or maintained by Harvard, CS50, edX, or OpenCourseWare.

Do not use:

- Harvard shield;
- CS50 logo;
- CS50 mark as app identity;
- official-looking CS50 badges;
- official-looking certificates;
- course staff likenesses;
- screenshots from lectures;
- copied page bodies, transcripts, walkthroughs, or problem text.

Default guild name:

```text
Code Knights
```

Not default:

```text
CS50 Knights
```

`CS50 Knights` may exist only as a future user-local custom label if customization is later implemented. It must not ship as the public default brand.

### D-0049 — No persistent skin preference in v2 unless existing metadata supports it safely

RPG v2 is route-scoped, not a permanent dual-skin system.

Default behavior:

- classic routes render classic UI;
- `/rpg/*` routes render RPG UI;
- no persistent skin preference is required for v2.

If a persistent preference is later wanted, it may use only existing metadata storage if this can be done without schema changes and without touching domain data. Otherwise it is deferred until a compatibility decision.

### D-0050 — Classic route regression standard replaces “byte-for-byte unaffected”

The classic app does not need byte-for-byte identical build output. That is unrealistic once new route code and styles exist.

The actual requirement is:

- classic routes remain behaviorally unchanged;
- classic route layout hierarchy remains unchanged unless documented;
- classic backup/import/reset semantics remain unchanged;
- classic settings/destructive actions remain unchanged;
- classic course/progress/session/achievement behavior remains unchanged;
- classic visual regression review passes.

### D-0051 — Asset provenance gate

No RPG visual asset enters the implementation unless it is recorded in:

```text
docs/rpg-v2/ASSETS.md
```

Each asset must record:

- file name;
- repo path;
- in-app use;
- source/origin;
- license or usage basis;
- whether it contains text;
- whether it is decorative or meaningful;
- alt text decision;
- file size;
- optimization status;
- reviewer/date.

### D-0052 — CS50 link boundary

The app may use official outbound course links to `cs50.harvard.edu` through existing safe link helpers or a reviewed equivalent.

Adding a new external domain, remote asset source, runtime request, or external script is out of scope for v2 unless a new decision record approves it.

### D-0053 — RPG language boundary

Every RPG term must map to a plain product term and a real data source.

If a term cannot be mapped, do not use it.

The mapping table in this document is mandatory.

### D-0054 — RPG routes, not permanent dual-skin architecture

RPG v2 is implemented as a parallel `/rpg/*` route tree over the existing engine. Classic routes remain as fallback during development.

The app does not commit to maintaining a permanent user-facing classic/RPG skin toggle. After v2 validation, the product owner may decide whether classic routes remain visible, hidden, archived, or replaced.

### D-0055 — Rank is derived from local required-course progress

Rank is a non-persisted label derived from the percentage of required items completed in the active course.

It is local ProgressPal progress, not official CS50 completion.

Recommended rank ladder:

| Required local progress | Rank label         |
| ----------------------: | ------------------ |
|                      0% | New Learner        |
|                   1–19% | Initiate           |
|                  20–49% | Apprentice         |
|                  50–69% | Builder            |
|                  70–99% | Capstone Candidate |
|                    100% | Course Finisher    |

Do not use “Master” for course completion. It overclaims.

### D-0056 — Class/path is CS Foundations for v2

For v2, the user’s path/class is derived from the active course family.

Default v2 path/class:

```text
CS Foundations
```

Acceptable supporting label:

```text
Generalist
```

AI/Web/Data/Security paths are deferred until multi-course support exists or a future explicit local preference is implemented.

### D-0057 — Guild identity avoids CS50 as shipped brand

Default guild identity:

```text
Code Knights
```

The attached sword/circuit/shield-style emblem can be used as the Code Knights emblem if it is first-party, provenance-recorded, optimized, and visually distinct from Harvard/CS50 marks.

Do not ship “CS50 Knights” as the default guild.

### D-0058 — v2 is local-first with outbound links only

v2 remains local-first and offline-capable.

Allowed online behavior in v2:

- user clicks a link to open an official external resource.

Not allowed in v2:

- accounts;
- cloud sync;
- online telemetry;
- analytics;
- embedded external content;
- runtime resource fetching;
- remote assets;
- AI tutor.

Optional encrypted backup/sync may be valuable later because browser site-data clearing can erase IndexedDB. That is acknowledged as a real risk, but it is not part of v2.

### D-0059 — Anti-overbuild and scope-discipline gate

Every AI/code-agent output, module plan, implementation pass, review, and handoff must actively prevent overbuilding.

The implementer must not add functionality, dependencies, assets, storage, architecture, styling systems, routes, tests, abstractions, or copy that are not required for the current module’s stated acceptance criteria.

---

## 5. Repository and documentation hygiene

### 5.1 Root Markdown problem

The repo may contain older root-level `.md` files from the v1 engine phase. Some names may look authoritative, such as `CHANGELOG.md`, `ROADMAP.md`, `PROJECT_STATE.md`, or similar, while actually reflecting older engine work and not the RPG v2 plan.

This is a real implementation risk. Junior implementers and coding agents may read the wrong document.

### 5.2 Rule

Do not leave stale root planning documents in place if they can be mistaken for RPG v2 instructions.

Do not delete them blindly either. They may contain useful historical context.

The correct action is to inventory and archive them during RPG-00.

### 5.3 Preferred archive location

Use:

```text
docs/archive/engine-v1/
```

Do not use `.old` as the main archive folder unless there is a strong repo convention for hidden archive folders. `docs/archive/engine-v1/` is clearer, visible, and easier for future agents to understand.

### 5.4 What should stay in root

Usually keep these in root if they exist and are still generally valid:

```text
README.md
LICENSE
LICENSE.md
SECURITY.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
package.json-related documentation
```

Do not move files that scripts, package metadata, GitHub, Vercel, or public project surfaces expect in the root unless you verify that nothing depends on them.

### 5.5 What should be archived

Candidate archive files include older or superseded root planning artifacts such as:

```text
ROADMAP.md
PROJECT_STATE.md
VALIDATION_LOG.md
CHANGELOG.md
MODULE_CHECKLIST.md
WORKFLOW.md
PROJECT-BRIEF.md
old implementation plans
old module logs
superseded decision files
```

This list is not automatic. Classify by content, not name alone.

### 5.6 ELI5 root-doc archive procedure

Run:

```powershell
Get-ChildItem -File *.md | Select-Object Name,Length,LastWriteTime
```

For each root `.md`, ask:

```text
1. Is this still meant to guide current RPG v2 work?
2. Is this required by GitHub, package metadata, Vercel, or user-facing repo display?
3. Is this current, or is it v1 engine history?
4. Could a coding agent mistake this for the RPG v2 source of truth?
```

Then:

- keep current public/project metadata in root;
- move stale v1 planning docs to `docs/archive/engine-v1/`;
- create `docs/archive/engine-v1/README.md` explaining archived files are historical;
- do not edit runtime code;
- record moved files in `VALIDATION_LOG.md`.

Before moving any file, check whether it is referenced:

```powershell
git grep -n "FILENAME.md"
```

If it is referenced by scripts or current docs, update references only if doing so is documentation-only and clearly necessary. Otherwise stop and report.

Use `git mv` for tracked files:

```powershell
mkdir docs\archive\engine-v1
git mv OLD_FILE.md docs\archive\engine-v1\
```

If root `DECISIONS.md` was intentionally deleted:

- do not restore it by default;
- stage the deletion only after confirming it is intended;
- ensure `docs/rpg-v2/DECISIONS-rpg-v2.md` exists;
- ensure this roadmap no longer depends on root `DECISIONS.md`.

---

## 6. Branch and repo strategy

### 6.1 Recommended branch model

```text
main / master
  Current stable v1 production.

v0.21.0-ux-complete
  Immutable freeze tag for the current completed v1 state.

v1-maintenance
  Optional branch for critical v1 bugfixes only.

rpg/v2
  RPG v2 implementation branch.
```

### 6.2 Why not a new repo by default

A new repo feels cleaner but creates practical risks:

- duplicated dependency management;
- harder cherry-picking of v1 bugfixes;
- weaker shared history;
- greater chance of engine drift;
- more deployment confusion;
- more chance of accidentally creating two incompatible ProgressPal products.

A new repo is justified only if v2 becomes a separate product with a different engine, different data model, different licensing posture, or different deployment identity. That is not the current plan.

### 6.3 ELI5 branch setup

From the current clean v1 repo:

```powershell
git status -sb
git log --oneline --decorate -10
git tag --list
```

If `v0.21.0-ux-complete` exists and points to the correct freeze commit:

```powershell
git checkout -b v1-maintenance v0.21.0-ux-complete
git checkout -b rpg/v2 v0.21.0-ux-complete
```

If branches already exist:

```powershell
git branch --list
git checkout rpg/v2
git status -sb
```

Do not blindly recreate existing branches.

Push only after confirming the branch is clean:

```powershell
git push origin v0.21.0-ux-complete
git push -u origin v1-maintenance
git push -u origin rpg/v2
```

---

## 7. Architecture

### 7.1 High-level architecture

```text
/rpg/* routes
  -> RPG shell and RPG screens
  -> RPG hooks/selectors/adapters
  -> existing ProgressPal domain/repository functions
  -> existing Dexie/IndexedDB database
```

The RPG layer is presentation and orchestration. It is not a second engine.

### 7.2 Data access rule

RPG UI components must not talk to IndexedDB directly.

Allowed:

```text
RPG component
  -> RPG hook
  -> RPG selector/adapter
  -> existing domain/repository function
```

Forbidden:

```text
RPG component
  -> direct database table access
```

Forbidden:

```text
RPG component
  -> duplicated XP/progress/achievement formula
```

### 7.3 Schema rule

Default:

```text
No schema change for v2.
```

If a schema change is proposed, stop and write a compatibility decision first. The decision must answer:

- Why is this unavoidable?
- What existing data changes?
- How does backup/export/import behave?
- How does reset behave?
- Can v1 data still open?
- What migration tests are added?
- What is the rollback plan?

### 7.4 Runtime network rule

Default:

```text
No runtime network behavior in v2 except user-clicked outbound links.
```

If a proposed implementation requires changing the local-only architecture guard, it is out of scope for v2.

### 7.5 Route plan

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

This is not a separate route. It is `/rpg/focus` with query state.

RPG bottom navigation:

```text
Hub | Map | Quests | Hero | Badges
```

Settings is reachable from header/profile. It does not need to be in bottom nav.

---

## 8. Plain-product mapping for every RPG term

Every RPG term must map to a plain product concept and real source. This table is mandatory.

| RPG term            | Plain product term                    | Data source                                   |   Persisted? |      v2 allowed? | Notes                                               |
| ------------------- | ------------------------------------- | --------------------------------------------- | -----------: | ---------------: | --------------------------------------------------- |
| Hero                | Learner profile                       | Existing learner profile                      | Yes, already |              Yes | Presentation only.                                  |
| Hero name           | Learner display name                  | Existing learner profile                      | Yes, already |              Yes | No fantasy-only generated name unless user sets it. |
| Level               | XP-derived level                      | Existing XP system                            |      Derived |              Yes | Do not store level separately.                      |
| XP                  | XP                                    | Existing XP ledger                            | Yes, already |              Yes | No new XP rules unless separately decided.          |
| Quest               | Course item/task                      | Existing course item                          | Yes, already |              Yes | Keep plain item type visible.                       |
| Current quest       | Current recommended item              | Existing progress/course logic                |      Derived |              Yes | Must be explainable.                                |
| Module              | Course unit/week                      | Existing course unit                          | Yes, already |              Yes | “Week 4: Memory” can remain visible.                |
| Adventure           | Active course/study track             | Existing course family                        |      Derived |              Yes | Do not imply multi-course support.                  |
| Campaign map        | Course map                            | Existing units/items/progress                 |      Derived |              Yes | Must have accessible list fallback.                 |
| Badge               | Achievement                           | Existing achievement definitions/unlocks      | Yes, already |              Yes | No passive unlocks.                                 |
| Badge gallery       | Achievements page                     | Existing achievement view                     |      Derived |              Yes | Locked badges show requirements.                    |
| Focus session       | Study session                         | Existing session engine                       | Yes, already |              Yes | Append-only.                                        |
| Journey Log         | Insights/history                      | Existing sessions/progress/XP/achievements    |      Derived |              Yes | Read-only.                                          |
| Rank                | Course progress milestone             | Required item completion percentage           |      Derived |              Yes | Local ProgressPal rank only.                        |
| Class/path          | Study direction                       | Active course family                          |      Derived |          Limited | v2: CS Foundations / Generalist only.               |
| Guild               | Local study identity                  | Default product copy, future local preference |    Not in v2 |          Limited | v2 default: Code Knights.                           |
| Code Knights        | ProgressPal-owned guild label         | Static product copy / asset                   |           No |              Yes | No CS50 in default guild name.                      |
| Streak              | Active day count if already supported | Existing active-day/streak logic              |      Derived | Only if existing | Use neutral wording if uncertain.                   |
| Energy              | Session capacity                      | None reliable in v2                           |           No |               No | Do not implement.                                   |
| Inventory           | Cosmetic collection                   | None                                          |           No |               No | Do not implement.                                   |
| Party/guild members | Social feature                        | None                                          |           No |               No | Do not implement.                                   |
| Certificate         | Official completion document          | Outside app                                   |           No |               No | Do not imply official status.                       |

---

## 9. Rank, path, and guild system

### 9.1 Rank

Rank is a derived label from local required-course progress.

Formula:

```text
rankProgress = completed required items / total required items
```

Rank ladder:

| Local required progress | Rank               |
| ----------------------: | ------------------ |
|                      0% | New Learner        |
|                   1–19% | Initiate           |
|                  20–49% | Apprentice         |
|                  50–69% | Builder            |
|                  70–99% | Capstone Candidate |
|                    100% | Course Finisher    |

Copy rule:

```text
Rank reflects local ProgressPal progress only. It is not official CS50 completion.
```

Do not use:

- Master;
- Certified;
- Official;
- Graduate;
- Harvard;
- CS50-certified.

### 9.2 Class/path

For v2:

```text
Class/path: CS Foundations
Supporting label: Generalist
```

Rationale: v2 is CS50x-only. AI/Web/Data/Security paths would imply multi-course support that does not exist yet.

Future path examples are allowed only in future planning docs, not in v2 UI:

- AI path;
- Web path;
- Data path;
- Security/systems path.

### 9.3 Guild

Default guild:

```text
Code Knights
```

The guild emblem should be ProgressPal-owned and visually distinct.

Use guild identity carefully:

- it can appear on Hero/Profile;
- it can appear as a small emblem in Hub;
- it can appear in Badge Gallery;
- it should not dominate the interface;
- it should not include CS50 as the guild brand.

---

## 10. CS50 and external-source policy

### 10.1 Allowed

Allowed in v2:

- factual course reference: `CS50x study track`;
- factual week names such as `Week 4: Memory`;
- official outbound links to relevant course pages;
- user’s own notes;
- local study progress;
- short local labels for item types.

### 10.2 Not allowed

Not allowed in v2:

- embedded course media;
- course transcripts copied into the app;
- copied lecture notes;
- copied problem text;
- copied walkthroughs;
- copied solutions;
- screenshots from official lectures;
- course staff likenesses;
- Harvard shield;
- CS50 logo;
- official-looking CS50 badges;
- official-looking certificates;
- app title that implies official relationship.

### 10.3 Required attribution / disclaimer

Add this to Settings/About/FAQ and public README:

```text
ProgressPal is an independent local-first study tracker. It is not affiliated with, endorsed by, sponsored by, or maintained by Harvard University, CS50, edX, or OpenCourseWare. CS50x and related course materials are created and maintained by their respective owners. ProgressPal links to official course resources but stores only local user progress and notes.
```

### 10.4 Link behavior

External links must be:

- clearly labeled;
- user-clicked;
- opened as normal links;
- reviewed against the allowlist;
- not loaded silently;
- not embedded inside the app.

Recommended button text:

```text
Open official CS50x resource
```

Avoid:

```text
Watch inside ProgressPal
Resume official lecture
Submit to CS50
Verify grade
```

---

## 11. Offline/local-first boundary

### 11.1 v2 position

v2 is Level 1:

```text
Local-first app with user-clicked outbound links.
```

The app remains useful offline after it has loaded and cached. Official external resources require the user to be online because those resources live outside the app.

### 11.2 IndexedDB loss risk

Risk: browser site-data clearing can erase local IndexedDB data.

v2 mitigation:

- keep export/backup visible and clear;
- add FAQ warning: local browser data can be cleared by browser settings, storage pressure, or manual deletion;
- encourage periodic export;
- keep backup/import/reset sober and non-game-like.

Not v2:

- account recovery;
- cloud backup;
- sync;
- server storage.

Future value:

- optional encrypted backup/sync may be valuable later, but it must be a separate future product decision.

---

## 12. Visual direction

### 12.1 What to keep from the mockup

Keep:

- RPG Hub;
- Focus Session;
- Week/module detail;
- Study Resource screen;
- Hero/Profile screen;
- Badge Gallery;
- Course Map;
- Bottom navigation;
- visible progress and next action;
- dark study-tool atmosphere;
- gold/navy/gem accent language, in moderation.

### 12.2 What to reduce from the mockup

Reduce:

- heavy glow;
- tiny text;
- decorative clutter;
- fake locked courses;
- fake media-player look;
- excessive purple;
- too many icons per card;
- ornate borders everywhere;
- game-store feeling.

### 12.3 What to reject from the mockup

Reject:

- app title using CS50 as product brand;
- embedded media surface;
- transcript tab;
- fake energy cap;
- fake “max energy” reward;
- fake locked future courses;
- official-looking CS50 campaign banner;
- guild name `CS50 Knights` as default;
- any logo resembling Harvard or CS50 marks.

### 12.4 Visual target

The visual target is:

```text
A restrained RPG-themed study companion.
```

Not:

```text
A fantasy game interface.
A tactical HUD.
A cyberpunk dashboard.
A crypto app.
A generic SaaS skin.
An official CS50 product.
```

---

## 13. Current categorized visual asset library

The provided asset library is useful as a candidate source, but it is large and not production-ready as-is.

Observed library summary:

| Category            | Files | Approx. uncompressed size | Roadmap interpretation                                                       |
| ------------------- | ----: | ------------------------: | ---------------------------------------------------------------------------- |
| achievements        |    51 |                   71.7 MB | Candidate badge art. Too many and too large to import wholesale.             |
| banners             |     2 |                    2.2 MB | Candidate hero/banner art. Use sparingly.                                    |
| buttons             |     9 |                    7.8 MB | Likely avoid as raster UI buttons; prefer CSS buttons.                       |
| card-backgrounds    |    31 |                   36.7 MB | Candidate Study Resource/module stills; must be curated.                     |
| character-imagery   |     8 |                    5.1 MB | Candidate avatar/hero art. Optional.                                         |
| example-usage       |    38 |                   51.2 MB | Reference only. Do not import into app.                                      |
| icons               |    65 |                   63.0 MB | Candidate icon art, but likely oversized PNG. Prefer inline SVG if possible. |
| levels              |    20 |                   17.5 MB | Candidate rank/level medallions. Curate heavily.                             |
| lock                |     2 |                    2.6 MB | Candidate locked-state art. Likely one generic lock is enough.               |
| maps                |     2 |                    5.1 MB | Candidate campaign map art. Optional after accessible map works.             |
| numbered-week-icons |    20 |                   19.6 MB | Candidate week/module icons. Use only if they map to real units.             |
| paths               |    12 |                    6.4 MB | Candidate future path art. Mostly defer; v2 has only CS Foundations.         |
| progress-bar        |     3 |                    2.0 MB | Likely avoid as raster UI; build progress bars in CSS.                       |
| scene-backgrounds   |     9 |                   16.1 MB | Candidate backgrounds; use at most one subtle optimized background.          |
| shield-badges       |     4 |                    4.6 MB | Candidate Code Knights emblem or shield identity. Review branding carefully. |

Total observed library size is more than 300 MB uncompressed. Do not bulk import it. The v2 MVP asset budget is far smaller.

### 13.1 Asset library rule

The asset library is a raw candidate pool, not app content.

Each selected asset must be:

1. chosen intentionally;
2. checked against branding/copyright rules;
3. renamed to the RPG naming convention;
4. optimized;
5. recorded in `docs/rpg-v2/ASSETS.md`;
6. imported only where needed.

---

## 14. Expected production asset structure

### 14.1 Asset folder structure

Use this structure:

```text
src/features/rpg/assets/
  emblems/
  badges/
  ranks/
  map/
  backgrounds/
  modules/
  avatars/
  ui/
  README.md

docs/rpg-v2/
  ASSETS.md
```

Do not put RPG assets loose in `public/` unless there is a clear build/runtime reason.

### 14.2 Naming convention

Use lowercase kebab-case.

Pattern:

```text
rpg-<category>-<subject>-<state-or-variant>.<ext>
```

Examples:

```text
rpg-emblem-code-knights-primary.svg
rpg-badge-first-steps-unlocked.svg
rpg-badge-first-steps-locked.svg
rpg-rank-apprentice-medallion.svg
rpg-map-cs-foundations-overview.webp
rpg-module-memory-still.webp
rpg-background-starfield-subtle.svg
rpg-ui-panel-corner-gold.svg
rpg-avatar-generalist-default.webp
```

Do not use file names like:

```text
progress-pal-visual-asset (47).png
image-final-2.png
badge-new.png
cs50-knights-final.png
```

### 14.3 Expected asset types and use

| Asset                  | What it looks like                                                              | Source library candidate                    | Repo path                                                                           | In-app placement                                          |                Required? | Notes                                               |
| ---------------------- | ------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------- | -----------------------: | --------------------------------------------------- |
| Code Knights emblem    | Navy/gold shield with sword/circuit motif, no CS50/Harvard marks                | `shield-badges/`                            | `src/features/rpg/assets/emblems/rpg-emblem-code-knights-primary.svg` or `.webp`    | Hero/Profile, small Hub identity, optional Settings/About |                      Yes | Use only after provenance review.                   |
| ProgressPal RPG emblem | Small ProgressPal-owned shield/letter mark                                      | `shield-badges/` or `icons/`                | `src/features/rpg/assets/emblems/rpg-emblem-progresspal-rpg.svg`                    | Header/favicon candidate later                            |                 Optional | Avoid official-looking course marks.                |
| Subtle background      | Dark, low-contrast, non-distracting                                             | `scene-backgrounds/` or CSS                 | `src/features/rpg/assets/backgrounds/rpg-background-starfield-subtle.svg`           | RPG shell background                                      |                 Optional | CSS may be better. Must not harm readability.       |
| CS Foundations map     | Abstract learning path/map, no official course art                              | `maps/`                                     | `src/features/rpg/assets/map/rpg-map-cs-foundations-overview.webp`                  | Campaign Map                                              | Optional after map works | HTML/SVG nodes and list fallback remain primary.    |
| Week 4 Memory still    | Abstract memory/computer-card visual, not lecture screenshot                    | `card-backgrounds/` or `scene-backgrounds/` | `src/features/rpg/assets/modules/rpg-module-memory-still.webp`                      | Study Resource, Module Detail header                      |   Optional before RPG-14 | Use CSS placeholder until asset pass unless needed. |
| Generic module stills  | Abstract visuals for real CS50x weeks                                           | `card-backgrounds/`                         | `src/features/rpg/assets/modules/rpg-module-<slug>-still.webp`                      | Study Resource per module                                 |                    Later | Add only as modules need them.                      |
| Badge icons            | Medallions for existing achievements                                            | `achievements/`                             | `src/features/rpg/assets/badges/rpg-badge-<achievement-id>-unlocked.svg` or `.webp` | Badge Gallery                                             |                    Later | Must match existing achievement IDs.                |
| Locked badge frame     | Muted generic medallion/lock                                                    | `lock/` or `achievements/`                  | `src/features/rpg/assets/badges/rpg-badge-locked-generic.svg`                       | Badge Gallery locked state                                |                    Later | One generic locked state may be enough.             |
| Rank medallions        | New Learner, Initiate, Apprentice, Builder, Capstone Candidate, Course Finisher | `levels/`                                   | `src/features/rpg/assets/ranks/rpg-rank-<rank>.svg` or `.webp`                      | Hero/Profile, Hub                                         |                 Optional | Text remains DOM text.                              |
| Avatar generalist      | Default learner character, civilian/non-military                                | `character-imagery/`                        | `src/features/rpg/assets/avatars/rpg-avatar-generalist-default.webp`                | Hero/Profile, Hub                                         |                 Optional | Existing profile avatar may be enough.              |
| Bottom-nav icons       | Hub/map/quest/hero/badge icons                                                  | `icons/`                                    | Prefer inline SVG components or `src/features/rpg/assets/ui/rpg-nav-<name>.svg`     | Bottom nav                                                |                 Optional | Avoid oversized PNG icons.                          |
| Panel corner ornaments | Tiny border/corner accent                                                       | `icons/` or CSS                             | `src/features/rpg/assets/ui/rpg-ui-panel-corner-gold.svg`                           | Panels                                                    |                 Optional | Avoid overuse.                                      |
| Raster buttons         | Button-looking images                                                           | `buttons/`                                  | Do not import by default                                                            | None                                                      |                       No | Build buttons in CSS/HTML.                          |
| Raster progress bars   | Progress bar images                                                             | `progress-bar/`                             | Do not import by default                                                            | None                                                      |                       No | Build progress bars in CSS/HTML.                    |
| Example usage images   | Mock/demo compositions                                                          | `example-usage/`                            | Do not import                                                                       | None                                                      |                       No | Reference only.                                     |

### 14.4 Asset rules

Every asset must obey:

- no visible CS50/Harvard marks;
- no copied official imagery;
- no generated text baked into image;
- no essential text inside image;
- no remote loading;
- no unoptimized large files;
- no asset used before ledger entry exists.

### 14.5 Asset format rules

Prefer:

```text
SVG for icons, badges, emblems, simple map nodes.
WebP for illustrated backgrounds/stills/avatars.
CSS for simple gradients, glows, and textures.
```

Avoid:

```text
Large PNGs unless transparency is required and SVG/WebP is unsuitable.
JPEG unless photographic-style art is needed.
Remote fonts.
Remote icon libraries.
Raster UI buttons.
Raster progress bars.
```

### 14.6 Asset budget

Initial RPG asset budget:

```text
Total new compressed visual assets for v2 MVP: <= 1.5 MB
Single illustrated asset: <= 350 KB unless justified
Single SVG icon/badge: aim <= 50 KB
```

If this is exceeded, document why in `ASSETS.md` and consider removing or deferring assets.

---

## 15. Asset provenance gate — ELI5 implementation

### 15.1 Simple rule

Before you use an image in the app, write down where it came from, what it is for, and why it is allowed.

No ledger entry = do not use the asset.

### 15.2 Step-by-step asset gate

For each asset:

1. **Pick the asset.**
   - Example: Code Knights shield emblem.

2. **Confirm it is allowed.**
   - Does it copy Harvard/CS50 marks? If yes, reject.
   - Does it include course staff, screenshots, official UI, or lecture imagery? If yes, reject.
   - Is it first-party/generated/owned/clearly licensed? If no, reject or replace.

3. **Rename it.**
   - Use the naming convention.
   - Example: `rpg-emblem-code-knights-primary.svg`.

4. **Place it in the correct folder.**
   - Example: `src/features/rpg/assets/emblems/`.

5. **Optimize it.**
   - SVG: remove unused metadata if safe.
   - WebP: compress to appropriate size.
   - Make sure it still looks good.

6. **Record it in `docs/rpg-v2/ASSETS.md`.**
   - Fill every column.

7. **Decide alt text.**
   - If meaningful: write short alt text.
   - If decorative: mark decorative and hide from assistive tech in implementation.

8. **Use it in code.**
   - Import locally.
   - Do not hotlink.
   - Do not load from remote URL.

9. **Run validation.**
   - Build passes.
   - Offline behavior still works.
   - No console/network surprises.
   - Visual check passes.

10. **If uncertain, stop.**
    - Do not guess rights.
    - Replace with CSS/simple SVG until clarified.

### 15.3 `ASSETS.md` template

Create:

```text
docs/rpg-v2/ASSETS.md
```

Template:

```markdown
# RPG v2 Asset Ledger

Every RPG asset used in the app must be recorded here before implementation.

| ID        | File                                | Repo path                        | In-app use        | Source/origin                                                  | Rights/usage basis                     | Contains text? | Decorative? | Alt text / aria decision  | Size | Optimized? | Reviewer/date | Notes                       |
| --------- | ----------------------------------- | -------------------------------- | ----------------- | -------------------------------------------------------------- | -------------------------------------- | -------------: | ----------: | ------------------------- | ---: | ---------: | ------------- | --------------------------- |
| asset-001 | rpg-emblem-code-knights-primary.svg | src/features/rpg/assets/emblems/ | Hero/Profile, Hub | First-party generated asset based on ProgressPal-owned concept | First-party use; no CS50/Harvard marks |             No |          No | alt="Code Knights emblem" |  TBD |        TBD | TBD           | Sword/circuit/shield motif. |
```

---

## 16. Required documentation files

Create these during RPG-00:

```text
docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
  This document.

docs/rpg-v2/DECISIONS-rpg-v2.md
  Active RPG v2 decision records.

docs/rpg-v2/MIGRATION_CONTRACT.md
  What must not change in engine/data/backup/import/reset.

docs/rpg-v2/ASSETS.md
  Asset provenance ledger.

docs/rpg-v2/RISK_REGISTER.md
  Starter risk register.

docs/rpg-v2/VALIDATION_LOG.md
  Baseline and module validation results.

docs/rpg-v2/VISUAL_TARGET.md
  Practical visual do/don’t list.

docs/rpg-v2/RESTART_PROMPT.md
  Copy-paste prompt for a new AI/code-agent window.

docs/rpg-v2/modules/
  Durable module handoff files.
```

Optional later:

```text
docs/rpg-v2/SCREEN_ACCEPTANCE.md
  Detailed visual/UX checklist per screen if roadmap becomes too large.
```

---

## 17. Validation gate

### 17.1 Full validation command set

Use the current repo scripts. Expected gate:

```powershell
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm run audit
```

If the repo has a combined script such as `npm run validate`, use it only if it runs all required checks above.

### 17.2 Proportional validation cadence

Do not use three full validation passes as the default for every module. Validation cadence must match the gate type and the risk profile.

```text
Normal module:
- targeted tests during development;
- one clean full `npm run validate` after final changes.

Corrective patch after a failed or partial module:
- targeted tests for the corrected gap;
- one clean full `npm run validate` after final changes;
- optionally two additional full validation passes only if the prior failure was flaky, environment-sensitive, or repeatedly reproduced.

Major gates:
- RPG-00 baseline: three consecutive clean validation passes if the environment supports them.
- RPG-09 Week-4 vertical slice: three consecutive clean validation passes if the environment supports them.
- RPG-15 release candidate: three consecutive clean validation passes if the environment supports them.
```

A validation pass applies only to the file state that existed when it ran. If files change after validation, rerun the required cadence for the final state.

### 17.3 Baseline rule

RPG-00 must not change runtime code or packages.

RPG-00 baseline target:

```text
Three consecutive clean validation passes if the environment supports it.
```

If baseline validation fails and fixing it requires runtime/package changes, stop and create a separate baseline-fix task before RPG implementation continues.

Do not hide baseline problems inside RPG modules.

### 17.4 Normal module completion rule

A normal implementation module is not complete until:

- module-specific acceptance criteria pass;
- targeted tests for changed behavior have passed during development;
- full validation passes once cleanly after final changes;
- no new warning is ignored;
- warnings and anomalies are classified;
- source-of-truth reconciliation is complete;
- any warning/blocker is documented and fixed or formally deferred;
- git diff contains only module-relevant changes;
- the module handoff includes a Scope Discipline Check;
- every changed file is justified as necessary for the module;
- unrelated improvements are absent or explicitly reverted;
- implementation and evidence are committed together;
- working tree is clean except expected branch-ahead state;
- commit message matches the module.

Uncommitted work may be described as `implemented locally`, `ready for review`, or `ready to commit`. It must not be described as complete.

### 17.5 Corrective patch rule

A corrective patch after a failed, partial, or over-scoped module must stay in Mode B.

It requires:

- targeted tests for the corrected acceptance gap;
- one clean full validation pass after final changes;
- updated module handoff explaining the correction;
- updated validation log if evidence changed;
- updated risk register if risk changed;
- source-of-truth reconciliation before commit.

Run two additional full validation passes only when there is a concrete reason:

- prior failure was flaky;
- prior failure was environment-sensitive;
- prior failure was repeatedly reproduced;
- project owner explicitly requests extra confirmation;
- the patch is being used to close a major gate.

Do not use repeated validation to compensate for unclear scope, ignored warnings, or uncommitted work.

### 17.6 High-confidence gates

These gates require extra validation confidence:

```text
RPG-00 baseline gate:
  target three consecutive clean passes.

RPG-09 Week-4 integration gate:
  target three consecutive clean passes.

RPG-15 release candidate:
  target three consecutive clean passes.
```

If the environment prevents repeated validation, record the exact reason in `VALIDATION_LOG.md` and do not falsely claim the gate was completed.

### 17.7 Flaky test rule

If a test fails once and passes once, do not ignore it. Find the cause.

Flakiness is a defect unless there is a documented external reason.

### 17.8 Audit fallback rule

If `npm run audit` cannot run because the environment has no network:

- record exact failure in `VALIDATION_LOG.md`;
- do not mark the module fully clean;
- implementation may continue only if all other checks pass and the audit is run before RPG-09 and RPG-15.

If audit reports moderate/high/critical:

- do not ignore;
- classify whether production or dev/test-only;
- fix or document accepted deferral.

### 17.9 IndexedDB snapshot rule

Because RPG v2 shares the same IndexedDB as v1, read-only route safety must be proven.

Before RPG-01:

- export a v1 backup through the app if possible;
- create or identify a deterministic seeded test DB fixture;
- define pre/post store-count or snapshot assertions for read-only RPG screens.

Read-only RPG screens must not mutate stores.

Read-only screens include at minimum:

```text
/rpg
/rpg/map
/rpg/week/:unitId when no explicit save action is taken
/rpg/hero
/rpg/badges
/rpg/log
```

Any read-only route that changes data fails the module.

### 17.10 Classic visual regression rule

Classic route regression must be concrete, not “looks fine.”

Classic routes checked:

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

Viewports:

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

### 17.11 Anti-overbuild validation rule

At the end of every module, before validation is considered complete, the implementer must answer:

```text
1. What work mode was used: acceptance audit, corrective patch, or next-module implementation?
2. Did this module implement only the current module's accepted tasks?
3. Did any file change outside the module's expected area? If yes, why was it required?
4. Did this module add a dependency? If yes, where is the decision record?
5. Did this module add an asset? If yes, where is the ASSETS.md ledger entry?
6. Did this module add storage, schema, app metadata, or preferences? If yes, where is the compatibility decision?
7. Did this module alter classic route behavior? If yes, where is the accepted decision?
8. Did this module introduce runtime network behavior? If yes, it is a v2 blocker unless already approved by decision record.
9. Were roadmap/decision/validation/handoff inconsistencies found and reconciled?
10. Were warnings or anomalies emitted, and how were they classified?
11. Is the implementation committed, or only implemented locally?
12. Is there any "nice to have" work hidden in the diff? If yes, remove it or split it into a future proposal.
```

The answer must be recorded in the module handoff.

If the implementer cannot justify a change against the module acceptance criteria, the change must be reverted before the module is accepted.

---

## 18. Risk register starter

Create this in:

```text
docs/rpg-v2/RISK_REGISTER.md
```

Starter table:

```markdown
# RPG v2 Risk Register

| ID    | Risk                                                  | Trigger                                                                         | Impact                                        | Mitigation                                                                         | Owner/module  | Status           |
| ----- | ----------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- | ------------- | ---------------- |
| R-001 | Existing IndexedDB data is corrupted by RPG writes    | RPG layer bypasses existing domain commands                                     | User data loss; trust failure                 | No direct DB access; pre/post DB snapshot tests; use existing domain commands only | RPG-01 onward | Open             |
| R-002 | Classic UI breaks while adding RPG routes             | Shared router/styles accidentally affect classic routes                         | v1 fallback becomes unreliable                | Classic route smoke tests; visual regression pass; scoped RPG styles               | RPG-02 onward | Open             |
| R-003 | RPG assets bloat bundle                               | Too many large images added eagerly                                             | Slow load; worse offline behavior             | Asset budget; optimize; route-load; ledger gate                                    | RPG-14        | Open             |
| R-004 | CS50/Harvard branding misuse                          | App uses official-looking names, marks, badges, or visual identity              | Legal/trust risk                              | D-0048; copy review; asset review; no official marks                               | All modules   | Open             |
| R-005 | Fake RPG mechanics creep in                           | Energy/class/guild/rank added without source data                               | Product dishonesty                            | RPG term map; formula registry; Scope Discipline Check                             | All modules   | Open             |
| R-006 | Local-first boundary is weakened                      | External scripts/assets/background requests introduced                          | Privacy/offline regression                    | Local-only guard remains hard blocker; user-clicked links only                     | All modules   | Open             |
| R-007 | User loses data from browser storage clearing         | Browser clears site data/storage pressure/manual deletion                       | Local records lost                            | Backup UI/FAQ; encourage export; future optional sync decision                     | RPG-13        | Accepted v2 risk |
| R-008 | Study Resource looks like fake embedded media         | Still image mimics player UI too closely                                        | Misleading UX                                 | Resource-card design; no fake play/scrubber/transcript UI                          | RPG-07        | Open             |
| R-009 | Route splitting causes offline chunk failure          | RPG route code/assets unavailable after cached load                             | Broken offline UX                             | Offline E2E; conservative code-splitting; verify after build                       | RPG-02 onward | Open             |
| R-010 | Rank is confused with official course status          | Rank copy omits local-progress framing                                          | Misleading claim                              | “Local ProgressPal progress” copy; FAQ disclaimer                                  | RPG-10/RPG-13 | Open             |
| R-011 | AI/code agent overbuilds beyond the module            | Agent adds unrequested dependencies, abstractions, routes, assets, or refactors | Scope creep; larger bundle; broken classic UI | D-0059; Scope Discipline Check; revert unrelated changes                           | All modules   | Open             |
| R-012 | Old root docs mislead implementers                    | Older v1 docs remain in root with authoritative names                           | Wrong plan followed                           | Archive stale docs under `docs/archive/engine-v1/` during RPG-00                   | RPG-00        | Open             |
| R-013 | Asset library is imported wholesale                   | Developer treats ZIP as app-ready production assets                             | Massive bundle; visual inconsistency          | Candidate-only rule; `ASSETS.md`; budget                                           | RPG-14        | Open             |
| R-014 | BMAD artifact expectations cause false blockers       | Empty BMAD folders treated as required governance                               | Process confusion                             | Roadmap is accepted planning artifact unless BMAD governance is explicitly chosen  | RPG-00        | Open             |
| R-015 | Validation baseline is unclear                        | RPG work starts before clean baseline                                           | Later bugs cannot be attributed               | RPG-00 baseline gate; record exact outputs                                         | RPG-00        | Open             |
| R-016 | Root `DECISIONS.md` deletion is mishandled            | Agent restores or depends on deleted file                                       | Source-of-truth drift                         | Use `docs/rpg-v2/DECISIONS-rpg-v2.md`; document deletion reconciliation            | RPG-00        | Open             |
| R-017 | Study Resource link behavior weakens local-only guard | Link implementation loads external content silently                             | Privacy/offline regression                    | Normal user-clicked links only; no remote embeds/assets/scripts                    | RPG-07        | Open             |
| R-018 | Accessibility degrades due to RPG visuals             | Low contrast, glow, tiny text, color-only status                                | Usability failure                             | Axe checks; contrast checks; visible focus; DOM text                               | RPG-03 onward | Open             |
| R-019 | Read-only routes mutate data                          | Page render triggers XP, achievement, progress, or metadata writes              | Data trust failure                            | Pre/post DB snapshot tests; explicit-write rule                                    | RPG-01 onward | Open             |
| R-020 | Excessive abstraction before slice proof              | Broad RPG services/models built before Week-4 path                              | Complexity and drift                          | Minimum slice read models only; defer broad models                                 | RPG-01        | Open             |
| R-021 | Formal workflow is half-invoked                       | Agent starts BMAD or another formal process, then skips required checkpoints    | False governance evidence; process confusion  | Explicit work mode; formal BMAD only if project owner opts in                      | All modules   | Open             |
| R-022 | Source-of-truth inconsistency is carried forward      | Roadmap, decisions, validation log, or handoff disagree and are not reconciled  | Wrong route/API/workflow followed             | Source-of-truth reconciliation gate before commit                                  | All modules   | Open             |
| R-023 | Uncommitted work is reported as complete              | Agent says module is complete while changes remain only in working tree         | Lost evidence; bad handoff; hard-to-review PR | Completion requires committed implementation, handoff, validation, and clean state | All modules   | Open             |
| R-024 | Excess validation becomes default ritual              | Agent runs three full validation passes for every normal module                 | Wasted time; hides real acceptance criteria   | Proportional validation cadence in D-0067 and VALIDATION_LOG                       | All modules   | Open             |
| R-025 | Warnings are seen but not classified                  | Command emits warning and agent calls state clean without triage                | False clean state; missed environment issue   | Warning/anomaly classification template in VALIDATION_LOG                          | All modules   | Open             |
```

---

## 19. BMAD artifact status

BMAD may be used for review and adversarial thinking, but BMAD output folders are not controlling unless the project owner explicitly chooses formal BMAD governance.

If `_bmad-output/planning-artifacts` is empty, that is not automatically a product blocker.

The accepted planning artifacts for RPG v2 are:

```text
docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
docs/rpg-v2/DECISIONS-rpg-v2.md
docs/rpg-v2/VALIDATION_LOG.md
docs/rpg-v2/ASSETS.md
docs/rpg-v2/RISK_REGISTER.md
```

Formal BMAD rule:

```text
Do not invoke BMAD as the controlling workflow unless the project owner explicitly requests formal BMAD governance.
```

Allowed without formal BMAD:

- adversarial review thinking;
- acceptance-audit lens;
- risk-focused code review;
- roadmap/decision compliance review.

Not allowed without formal BMAD:

- claiming BMAD activation as the governing workflow;
- claiming BMAD readiness;
- claiming BMAD handoff completeness;
- treating empty BMAD output folders as blockers;
- partially invoking BMAD step files while skipping required checkpoints.

If an agent uses BMAD-inspired review thinking, describe it as a roadmap acceptance audit or adversarial review. Do not claim a formal BMAD readiness workflow is complete unless the required BMAD artifacts actually exist and the workflow actually completed.

---

## 20. Implementation module overview

Modules are sequential.

Do not start the next module until the current one passes.

| Module | Name                                                | Runtime changes? | Package changes? | Main purpose                                                             |
| ------ | --------------------------------------------------- | ---------------: | ---------------: | ------------------------------------------------------------------------ |
| RPG-00 | Baseline, source-of-truth, and doc hygiene          |               No |               No | Establish source of truth and clean baseline.                            |
| RPG-01 | Minimum architecture boundary and slice read models |        Yes/tests |               No | Add RPG feature folder and only the adapters needed for the first slice. |
| RPG-02 | RPG routes and shell                                |              Yes |               No | Add `/rpg/*`, shell, bottom nav, route stubs.                            |
| RPG-03 | Visual tokens and primitives                        |              Yes |               No | Add restrained RPG styling and reusable components.                      |
| RPG-04 | Quest Hub slice                                     |              Yes |               No | Build main RPG dashboard from real data.                                 |
| RPG-05 | Campaign Map slice                                  |              Yes |               No | Build accessible map/list from course units.                             |
| RPG-06 | Week 4 Module Detail slice                          |              Yes |               No | Build module/week task list from real items.                             |
| RPG-07 | Study Resource slice                                |              Yes |               No | Build resource detail with outbound link and local progress.             |
| RPG-08 | Focus Session slice                                 |              Yes |               No | Build RPG focus timer over existing session engine.                      |
| RPG-09 | Week-4 integration gate                             |       Tests/docs |               No | Prove end-to-end vertical slice.                                         |
| RPG-10 | Hero/Profile, rank, class, guild                    |              Yes |               No | Add honest derived identity layer.                                       |
| RPG-11 | Badge Gallery                                       |              Yes |               No | Re-skin existing achievements.                                           |
| RPG-12 | Journey Log                                         |              Yes |               No | Reframe insights as read-only log.                                       |
| RPG-13 | Settings/FAQ/backup trust surface                   |              Yes |               No | Add local-data and disclaimer clarity.                                   |
| RPG-14 | Asset pass and visual polish                        |              Yes |    No by default | Add approved assets and responsive polish.                               |
| RPG-15 | Classic regression and release candidate            |       Tests/docs |               No | Final validation and release decision.                                   |

No package changes are expected in v2. If a module appears to require one, stop and justify it with a decision record before installing anything.

---

## 21. RPG-00 — Baseline, source-of-truth, and doc hygiene

### Goal

Create the clean starting point. No runtime code changes. No package changes. No assets.

### Allowed changes

Only documentation and git-state reconciliation:

```text
docs/rpg-v2/**
docs/archive/engine-v1/**
root markdown moves, if classified as stale and moved with git mv
staging intentional deletion of old root DECISIONS.md, if already intentionally deleted
```

### Forbidden changes

Do not edit:

```text
src/**
package.json
package-lock.json
vite.config.*
playwright.config.*
tsconfig*
public/**
```

Do not add assets.

Do not add routes.

Do not change tests.

Do not change validation scripts.

### Steps

1. Confirm current branch and tag:

```powershell
git status -sb
git log --oneline --decorate -10
git tag --list
```

2. Confirm whether root `DECISIONS.md` is intentionally deleted.

If intentionally deleted:

```text
Do not restore it by default.
Ensure docs/rpg-v2/DECISIONS-rpg-v2.md exists.
Ensure source hierarchy does not rely on root DECISIONS.md.
Stage the deletion only after explicit confirmation.
```

3. Create or switch to branch:

```powershell
git checkout -b rpg/v2 v0.21.0-ux-complete
```

If the branch exists, switch instead:

```powershell
git checkout rpg/v2
```

4. Create docs folders:

```powershell
mkdir docs\rpg-v2
mkdir docs\rpg-v2\modules
mkdir docs\archive\engine-v1
```

5. Add required docs:

```text
ROADMAP-rpg-v2-source-of-truth.md
DECISIONS-rpg-v2.md
MIGRATION_CONTRACT.md
ASSETS.md
RISK_REGISTER.md
VALIDATION_LOG.md
VISUAL_TARGET.md
RESTART_PROMPT.md
```

6. Inventory root Markdown files:

```powershell
Get-ChildItem -File *.md | Select-Object Name,Length,LastWriteTime
```

7. Classify root Markdown files.

Keep likely root metadata:

```text
README.md
LICENSE.md / LICENSE
SECURITY.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
```

Archive stale v1 planning docs only after checking references:

```powershell
git grep -n "FILENAME.md"
git mv FILENAME.md docs/archive/engine-v1/
```

8. Create `docs/archive/engine-v1/README.md` explaining:

```text
These files are historical ProgressPal v1 / engine-phase documents.
They are not active implementation guidance for RPG v2.
For RPG v2, read docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md.
```

9. Run full validation.

10. Record exact command outputs in `docs/rpg-v2/VALIDATION_LOG.md`.

11. If validation fails, stop. Do not begin RPG-01.

### Acceptance criteria

- Branch is `rpg/v2`.
- Source-of-truth docs exist under `docs/rpg-v2/`.
- Root `DECISIONS.md` deletion is reconciled or explicitly left as a documented blocker.
- Stale root planning docs are archived or explicitly classified as retained.
- No runtime files changed.
- No packages changed.
- No assets added.
- Baseline validation result is recorded honestly.
- If baseline is not clean, blocker is documented and implementation does not begin.

### Module handoff file

Create:

```text
docs/rpg-v2/modules/RPG-00-HANDOFF.md
```

### Suggested commit

```text
rpg-00: install RPG v2 source-of-truth docs
```

---

## 22. RPG-01 — Minimum architecture boundary and slice read models

### Goal

Create the RPG feature boundary and the minimum safe read-model layer needed for the first Week-4 slice.

This module must not create read models for the entire future app. Broad model work waits until each screen module needs it.

### Files likely touched

```text
src/features/rpg/
  index.ts
  model/
  types.ts

tests/features/rpg/
```

### Required work

Create only the minimum needed for:

- hub summary needed by `/rpg`;
- course map/module summary needed for Week 4;
- study resource summary needed for one real item;
- shared type definitions for the first slice;
- test helper or assertions proving read-only models do not mutate stores.

### Deferred

Do not implement yet:

- hero model;
- badge gallery model;
- journey log model;
- generalized RPG data abstraction;
- future class/path selection;
- asset loader system;
- global RPG state manager.

### Forbidden

- no new schema;
- no new dependency;
- no visual asset;
- no direct database table import in components;
- no new XP formula;
- no new achievement behavior;
- no broad “RPG data service.”

### Acceptance criteria

- RPG feature boundary exists.
- Minimum slice read models compile.
- Read-only models mutate no stores.
- Tests prove pre/post DB state does not change for read-only model calls.
- Existing tests still pass.
- Architecture guard exists or current guard is extended to block direct DB access from RPG UI.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-01-HANDOFF.md
```

### Suggested commit

```text
rpg-01: add minimum RPG read model boundary
```

---

## 23. RPG-02 — RPG routes and shell

### Goal

Add the `/rpg/*` route tree, shell frame, and bottom navigation with stub pages.

### Files likely touched

```text
src/app/router/routeDefinitions.ts
src/features/rpg/routes/
src/features/rpg/shell/
src/features/rpg/index.ts
src/styles/rpg-shell.css
```

### Required work

1. Add `/rpg/*` routes.
2. Add `RpgShell`.
3. Add `RpgBottomNav`.
4. Add stub pages:
   - Hub;
   - Map;
   - Week;
   - Study Resource;
   - Focus;
   - Hero;
   - Badges;
   - Log;
   - Settings wrapper if needed.
5. Ensure onboarding/loading/error behavior is not broken.
6. Ensure classic routes still render.
7. Add route smoke tests.
8. Add keyboard navigation check for bottom nav.
9. Add read-only navigation test: route rendering alone writes no domain data.

### Shell rules

- Content must not hide behind bottom nav.
- Bottom nav must have clear active state.
- Settings must be reachable.
- Shell must respect safe area on mobile.
- Shell must have skip link and main landmark.
- RPG styles must not leak into classic routes.

### Acceptance criteria

- Every RPG route renders inside RPG shell.
- Classic routes still pass smoke tests.
- Bottom nav appears on every RPG screen after onboarding.
- No domain data is written by navigating.
- Full validation passes once cleanly.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-02-HANDOFF.md
```

### Suggested commit

```text
rpg-02: add RPG route shell and navigation
```

---

## 24. RPG-03 — Visual tokens and primitives

### Goal

Create the restrained RPG design system before building full screens.

### Files likely touched

```text
src/styles/rpg-tokens.css
src/styles/rpg-components.css
src/features/rpg/components/
```

### Required primitives

```text
RpgPanel
RpgButton
RpgProgressBar
RpgStatBar
RpgStatusPill
RpgQuestRow
RpgBadgeTile
RpgRankBadge
RpgBottomNavItem
RpgResourceCard
RpgEmptyState
```

Only build primitives actually used by RPG-04 through RPG-08. If a primitive is not needed for the Week-4 slice, defer it.

### Token categories

```text
--rpg-bg
--rpg-surface
--rpg-surface-raised
--rpg-border
--rpg-border-strong
--rpg-text
--rpg-text-muted
--rpg-accent
--rpg-accent-strong
--rpg-progress
--rpg-success
--rpg-warning
--rpg-danger
--rpg-focus-ring
```

### Visual rules

- Use restrained navy/dark background.
- Use gold as accent, not wallpaper.
- Use green only for confirmed completion.
- Use purple only if category meaning exists.
- Avoid glow-heavy style.
- Avoid tiny text.
- Do not rely on color alone.
- Do not use image assets unless already approved in `ASSETS.md`.

### Acceptance criteria

- Required primitives render in a test/demo stub.
- Text contrast passes manual/axe checks.
- Reduced motion is respected.
- No new asset required.
- Classic UI unaffected.
- Full validation passes once cleanly.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-03-HANDOFF.md
```

### Suggested commit

```text
rpg-03: add RPG tokens and primitives
```

---

## 25. RPG-04 — Quest Hub slice

### Goal

Build `/rpg` as the main RPG dashboard using only real data.

### Required content

- Learner name.
- XP and level from existing XP engine.
- Rank from required-course progress.
- Path/class: CS Foundations / Generalist.
- Guild: Code Knights.
- Current module/week.
- Current recommended item.
- Continue action.
- This week’s local progress.
- Recent saved activity if available.
- Clear empty state for new user.

### Forbidden content

- fake energy;
- fake daily reward;
- fake streak if not already supported;
- fake locked adventure;
- official CS50 completion language;
- user-customizable guild names;
- future class/path chooser.

### ELI5 steps

1. Load the hub read model.
2. Render a top learner card.
3. Render progress summary.
4. Render “Continue current quest.”
5. Link to `/rpg/map`, `/rpg/week/:unitId`, `/rpg/focus`, `/rpg/badges`.
6. Test that opening `/rpg` writes nothing.

### Acceptance criteria

- Every number comes from existing data.
- Opening Hub does not mutate data.
- Continue action opens a real route.
- Empty state is useful.
- Full validation passes once cleanly.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-04-HANDOFF.md
```

### Suggested commit

```text
rpg-04: build RPG quest hub
```

---

## 26. RPG-05 — Campaign Map slice

### Goal

Build `/rpg/map` as an accessible course map.

### Required content

- All current CS50x units from seed.
- Current module/week.
- Completed modules.
- Available modules.
- Progress for each module.
- Accessible list fallback if visual map is complex.

### Visual approach

Start with HTML/SVG nodes. Do not start with canvas. Do not require a large map image for the first implementation.

### Forbidden

- fake locked CS50P/CS50AI/CS50W/CS50SQL courses;
- map-only navigation;
- official CS50 campaign branding;
- course art copied from official resources.

### ELI5 steps

1. Load course units and progress.
2. Convert each unit into a map node.
3. Render nodes as buttons/links.
4. Add plain list fallback below or beside map.
5. Link each node to `/rpg/week/:unitId`.
6. Test keyboard navigation.

### Acceptance criteria

- Every node is keyboard reachable.
- Every node has readable label.
- Status derives from real progress.
- No fake course support appears.
- Full validation passes once cleanly.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-05-HANDOFF.md
```

### Suggested commit

```text
rpg-05: build RPG campaign map
```

---

## 27. RPG-06 — Week 4 Module Detail slice

### Goal

Build `/rpg/week/:unitId`, starting with Week 4: Memory as the vertical slice.

### Required content

- Module/week title.
- Local progress.
- Required and optional task distinction.
- Task rows from real course items.
- Status for each task.
- Estimated time if already available.
- Start/resume/open action.
- Link to Study Resource.
- Link to Focus Session with selected item.

### Task row rule

Use real item types from the seed. Do not invent missing tasks just because the mockup has them.

### Forbidden

- fake Review task if not in data;
- fake XP preview if not exactly supported;
- fake completion;
- official completion claims;
- imported module still image unless the module explicitly needs it and it is already in `ASSETS.md`.

### ELI5 steps

1. Load module by `unitId`.
2. Load items for that module.
3. Load local progress for those items.
4. Render a row per item.
5. Add action button per item.
6. Test Week 4 route.

### Acceptance criteria

- Week 4 renders from real data.
- Task rows open real routes.
- Progress rollup matches existing engine.
- No read-only render unlocks badge or awards XP.
- Full validation passes once cleanly.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-06-HANDOFF.md
```

### Suggested commit

```text
rpg-06: build Week 4 module detail slice
```

---

## 28. RPG-07 — Study Resource slice

### Goal

Build `/rpg/resource/:itemId` as the honest resource/detail screen.

### Required content

- Item title.
- Item type.
- Module/week context.
- Local ProgressPal status.
- User notes if supported.
- Manual local progress controls using existing behavior.
- Official outbound resource link when available.
- Optional first-party representative still image.

### Visual design

This screen is a resource card, not a fake player.

Do not show:

- fake play button;
- fake timeline scrubber;
- fake current media timestamp;
- fake transcript tab;
- embedded content frame.

### Link copy

Use:

```text
Open official CS50x resource
```

### Manual progress copy

Use:

```text
Save local progress
Mark locally complete
Add study note
Start focus session
```

### ELI5 steps

1. Load item by `itemId`.
2. Load local progress/resume information from existing engine.
3. Show local status.
4. Show official outbound link.
5. Add explicit save controls.
6. Test that progress changes only after user action.

### Asset rule

Use a CSS placeholder first.

A real still image may be added in this module only if:

- the current screen needs it;
- the chosen asset is in `ASSETS.md`;
- it is optimized;
- it is local;
- it does not look like a fake embedded player;
- the module handoff includes the asset ledger ID.

Otherwise defer still images to RPG-14.

### Acceptance criteria

- No embedded external content.
- No runtime external asset.
- Official link is user-clicked.
- Progress changes only by explicit user action.
- Partial progress cannot be silently flipped to complete.
- Full validation passes once cleanly.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-07-HANDOFF.md
```

### Suggested commit

```text
rpg-07: build RPG study resource screen
```

---

## 29. RPG-08 — Focus Session slice

### Goal

Build `/rpg/focus` over the existing session engine.

### Required content

- Selected task/item.
- Timer.
- Pause/resume.
- Finish session.
- Discard/cancel.
- Optional local note/blocker field if existing session model supports it.
- XP preview only if it exactly reflects existing rules.
- Post-session summary.

### Forbidden

- saving unfinished timer;
- new session scoring;
- bonus XP outside engine;
- network behavior;
- fake potions/energy mechanics.

### ELI5 steps

1. Load item if `itemId` query param exists.
2. Show timer ring.
3. Let user start/pause/resume.
4. On finish, call existing session-save behavior.
5. After save, reload hub data.
6. Test reload while timer is running: nothing saved.

### Acceptance criteria

- Unfinished timer writes nothing.
- Finished session creates exactly one session record.
- XP awarded once through existing engine.
- Journey Log can show the saved session later.
- Full validation passes once cleanly.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-08-HANDOFF.md
```

### Suggested commit

```text
rpg-08: build RPG focus session
```

---

## 30. RPG-09 — Week-4 integration gate

### Goal

Prove the core v2 journey works before broad rollout.

### Required path

```text
/rpg
  -> /rpg/map
  -> /rpg/week/week-4 or matching Week 4 unit ID
  -> /rpg/resource/<itemId>
  -> save local progress
  -> /rpg/focus?itemId=<itemId>
  -> finish session
  -> /rpg
  -> /rpg/log
  -> /rpg/badges
```

If `/rpg/log` and `/rpg/badges` are not yet full screens, use minimal route stubs only to verify no passive mutation and navigation safety. Full implementations arrive later.

### Tests

Add E2E coverage for:

- Hub loads.
- Map loads.
- Week 4 loads.
- Resource opens.
- Official link exists but is not auto-opened.
- Local progress save updates Hub/Map.
- Focus session finish creates one saved session.
- XP changes once.
- Badge state does not unlock on passive read.
- Journey Log route does not mutate data.

### Acceptance criteria

- Full slice works end-to-end.
- No classic route regression.
- No local-only guard regression.
- IndexedDB pre/post read-only checks pass.
- Target three consecutive clean validation passes if environment supports it.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-09-HANDOFF.md
```

### Suggested commit

```text
rpg-09: validate Week 4 RPG vertical slice
```

---

## 31. RPG-10 — Hero/Profile, rank, class, guild

### Goal

Build `/rpg/hero` as an honest profile/identity screen.

### Required content

- Learner display name.
- XP and level.
- Rank from required-course progress.
- Path/class: CS Foundations / Generalist.
- Guild: Code Knights.
- Badge count.
- Session/activity summary.
- Derived stat bars only if formulas are documented.

### Derived stat rule

If using stat bars, define formula before implementation.

Possible v2 stat bars:

| Stat        | Formula idea                       | Use?                                 |
| ----------- | ---------------------------------- | ------------------------------------ |
| Focus       | recent study minutes vs target     | Allowed if target exists             |
| Consistency | active days vs expected study days | Allowed if existing data supports it |
| Practice    | practice/problem-set progress      | Allowed if item types support it     |
| Foundations | required-course progress           | Allowed                              |
| Debugging   | debugging-mode sessions            | Only if session mode exists          |

If not reliable, show:

```text
Not enough history yet
```

### Forbidden

- fake class specializations;
- inventory;
- cosmetic equipment;
- CS50 Knights default guild;
- official rank language;
- new persisted preference for guild/class.

### Acceptance criteria

- Rank formula tested.
- Class/path is CS Foundations or Generalist only.
- Guild displays Code Knights.
- No new persisted fields required.
- Full validation passes once cleanly.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-10-HANDOFF.md
```

### Suggested commit

```text
rpg-10: add hero profile rank and Code Knights identity
```

---

## 32. RPG-11 — Badge Gallery

### Goal

Build `/rpg/badges` as a clearer achievement gallery.

### Required content

- Earned badges.
- Locked/unearned badges.
- Requirement text.
- Earned date if available.
- Category filters only if useful.
- Generic locked badge visual if approved.

### Forbidden

- official-looking CS50 trophies;
- achievement XP changes;
- hidden/mystery badges with no requirement;
- passive unlock on page load;
- importing all achievement assets.

### ELI5 steps

1. Load existing achievement view.
2. Render earned badges in color.
3. Render locked badges in muted/locked style.
4. Show requirement text.
5. Test page read does not unlock anything.

### Asset rule

Badge art may be CSS/SVG placeholder until RPG-14. If using real asset files earlier, each one needs an `ASSETS.md` ledger entry and module justification.

### Acceptance criteria

- Badge state matches existing achievement data.
- Page render writes nothing.
- Locked badge requirements are visible.
- Full validation passes once cleanly.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-11-HANDOFF.md
```

### Suggested commit

```text
rpg-11: build RPG badge gallery
```

---

## 33. RPG-12 — Journey Log

### Goal

Build `/rpg/log` as a read-only record of saved local activity.

### Required content

- Recent sessions.
- XP history if existing data supports it.
- Completed local tasks.
- Earned badges.
- Weekly activity summary.
- Plain values remain visible as text.

### Charts

Charts are optional and not required for v2. If later added, they must be first-party, accessible, and text-readable without the chart.

### Forbidden

- forecasts;
- AI coaching;
- reconstructed history from mutable current-state records;
- unsupported trends;
- network behavior.

### Acceptance criteria

- Read-only.
- No passive unlocks.
- No mutation on page load.
- Values are traceable to saved records.
- Full validation passes once cleanly.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-12-HANDOFF.md
```

### Suggested commit

```text
rpg-12: build RPG journey log
```

---

## 34. RPG-13 — Settings, FAQ, backup trust surface

### Goal

Keep local-data controls sober and add the trust explanations RPG v2 needs.

### Required content

- Export backup.
- Import backup.
- Reset local data.
- Local-only explanation.
- Browser-storage loss warning.
- No account/no cloud/no analytics/no tracking statement.
- Official-resource disclaimer.
- CS50/Harvard non-affiliation statement.
- Explanation of rank/class/guild.
- Explanation of what RPG stats do and do not track.

### Copy style

Use plain, direct wording.

Do not make destructive actions cute or game-like.

Bad:

```text
Erase your realm
Burn the archive
Reset your destiny
```

Good:

```text
Reset local data
Export backup
Import backup
```

### Acceptance criteria

- Backup/export/import/reset behavior unchanged.
- Reset remains clearly destructive.
- FAQ explains local data risk.
- Non-affiliation text included.
- Full validation passes once cleanly.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-13-HANDOFF.md
```

### Suggested commit

```text
rpg-13: add RPG settings FAQ and backup trust copy
```

---

## 35. RPG-14 — Asset pass and visual polish

### Goal

Add approved first-party assets and polish the RPG look without harming usability.

### Prerequisite

Every asset must already be in `ASSETS.md`.

### Allowed asset additions

- Code Knights emblem.
- One subtle background.
- Week 4 Memory still.
- Badge icons for existing achievements.
- Rank medallions if useful.
- Minimal nav icons.

### Asset selection rule

Select from the categorized visual asset library only when the asset actually serves the current screen and passes the provenance gate.

Do not import whole categories.

Do not import `example-usage/`.

Do not use raster button/progress-bar art where CSS/HTML is better.

### Polish tasks

- Mobile layout check.
- Desktop layout check.
- Reduced-motion check.
- Keyboard focus check.
- Contrast check.
- Asset size check.
- Offline check.

### Required viewport checks

```text
320px
375px
390px
768px
1024px
1440px
```

### Acceptance criteria

- Asset budget respected or documented.
- No image contains essential text.
- No remote asset.
- No branding misuse.
- No content hidden behind bottom nav.
- Full validation passes once cleanly.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-14-HANDOFF.md
```

### Suggested commit

```text
rpg-14: polish RPG visuals and approved assets
```

---

## 36. RPG-15 — Classic regression and release candidate

### Goal

Prove v2 can coexist with v1 safely.

### Required validation

Run full validation.

Manual classic route checks:

```text
/
/dashboard
/course
/course/:itemId
/sessions
/achievements
/insights
/settings
```

Manual RPG route checks:

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

Data checks:

- Export backup.
- Reset local data.
- Import backup.
- Confirm restored state.
- Confirm classic and RPG read same local state.
- Confirm no duplicate XP/session creation.

Offline checks:

- App loads after one successful online production load.
- Classic route works offline.
- RPG route works offline.
- External resource links are clearly external and require online access.

Accessibility checks:

- Keyboard-only navigation.
- Visible focus.
- Screen landmarks.
- Bottom nav labels.
- No color-only status.
- Reduced motion.

### Release decision options

After validation:

1. Keep v1 as default and expose `/rpg` as beta.
2. Redirect `/` to `/rpg` while keeping classic routes accessible.
3. Replace classic navigation with RPG navigation but keep classic fallback routes hidden.
4. Defer release and fix issues.

Do not remove classic routes in v2 release unless a separate decision approves it.

### Acceptance criteria

- Full validation passes.
- Target three consecutive clean validation passes if environment supports it.
- Classic regression passes.
- RPG route pass complete.
- Asset ledger complete.
- Risk register updated.
- Release decision recorded.

### Module handoff file

```text
docs/rpg-v2/modules/RPG-15-HANDOFF.md
```

### Suggested commit

```text
rpg-15: prepare RPG v2 release candidate
```

---

## 37. Screen-by-screen acceptance checklist

### Hub

- Shows real learner name.
- Shows real XP and level.
- Shows derived rank.
- Shows Code Knights identity.
- Shows current module and next item.
- One clear continue action.
- Does not write data on render.

### Map

- Real modules/weeks only.
- Node/list fallback.
- Keyboard reachable.
- No fake future courses.
- No official-looking CS50 campaign banner.

### Module Detail

- Real course items only.
- Required/optional distinction clear.
- Progress truthful.
- Actions open real routes.

### Study Resource

- No embedded content.
- Official outbound link only.
- Local progress saved only by explicit action.
- No fake transcript.
- No fake player UI.

### Focus Session

- Timer works.
- Unfinished session writes nothing.
- Finished session writes once.
- XP awarded once through existing rule.

### Hero

- Rank derived.
- Class/path limited to CS Foundations/Generalist.
- Guild is Code Knights.
- Stats have formulas or are omitted.

### Badges

- Existing achievements only.
- Locked requirements visible.
- Page read does not unlock.

### Insights (`/rpg/log`; historical checklist formerly called Journey Log)

- Read-only.
- Values trace to saved records.
- No unsupported forecasts/coaching.

### Settings/FAQ

- Backup/import/reset sober and clear.
- Local data risk explained.
- Non-affiliation statement present.
- RPG term explanations present.

---

## 38. Things to ask or account for before implementation

These do not block writing the roadmap. They should be checked before or during RPG-00.

1. **Is `v0.21.0-ux-complete` definitely the right freeze point?**
   - Check tag and commit.

2. **Is the current working tree clean?**
   - If not, decide whether changes belong to v1, v2, or should be discarded.

3. **Was root `DECISIONS.md` intentionally deleted and staged correctly?**
   - Do not restore it by accident.

4. **Does the current validation gate pass before RPG work?**
   - If not, stop and fix baseline separately.

5. **Which root Markdown files are stale v1 planning docs?**
   - Archive them under `docs/archive/engine-v1/`.

6. **Which assets are actually first-party and safe?**
   - Record in asset ledger before use.

7. **Should `/rpg` be hidden, beta, or linked from classic navigation during development?**
   - Recommendation: hidden/dev route first, then visible beta link after Week-4 integration gate.

8. **Should classic remain forever?**
   - Not a v2 implementation decision. Decide after v2 RC.

9. **How much visual fidelity is required?**
   - Recommendation: match information architecture and mood, not pixel-perfect mockup.

10. **How should backup reminders be surfaced?**
    - Recommendation: Settings FAQ in v2, optional gentle reminder later.

11. **Which exact current achievement IDs need badge art first?**
    - Start with existing unlocked/visible achievements; do not invent new ones.

12. **Should Code Knights be editable later?**
    - Future option. Do not add preference storage in v2.

---

## 39. Restart prompt for a new AI/code-agent window

Historical RPG-00 start prompt retained for implementation history. For current post-2G work, use `docs/rpg-v2/RESTART_PROMPT.md`; do not copy the block below without updating its current-state and branching instructions.

```text
You are working on ProgressPal RPG v2.

Operating standard:
No bias. No bullshit. No overbuild. Build only what the current module requires. Every change must be justified against the source-of-truth roadmap, accepted decisions, or failing tests.

Repository goal:
Build an RPG-themed /rpg/* route tree over the existing ProgressPal v1 CS50x local-first engine. Do not rewrite the engine.

Current product reality:
ProgressPal v1 is a working local-first CS50x study tracker using Vite, React, TypeScript, React Router, Dexie/IndexedDB, Zod, local CSS tokens, Vitest, Playwright, and existing validation scripts. v1 is the engine and fallback UI.

Branching:
Work on branch rpg/v2 from freeze tag v0.21.0-ux-complete. Keep main/master stable. Do not create a new repo unless explicitly instructed.

Hard constraints:
- Same origin.
- Same IndexedDB.
- Add /rpg/* routes.
- Classic routes must keep working.
- No backend.
- No cloud sync.
- No auth.
- No analytics.
- No schema change.
- No embedded media.
- No runtime external course-data fetching.
- Official course resources open only through user-clicked outbound links.
- No CS50/Harvard branding misuse.
- Default guild is Code Knights, not CS50 Knights.
- Rank is derived from local required-course progress.
- Class/path is CS Foundations / Generalist for v2.
- No fake RPG mechanics.
- No direct database access from RPG UI components.
- No assets without docs/rpg-v2/ASSETS.md entry.
- Do not import the whole visual asset library.
- No overbuilding.
- No “while I am here” refactors.
- Every module handoff must include a Scope Discipline Check.

Implementation source of truth:
Read docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md first. Then read docs/rpg-v2/DECISIONS-rpg-v2.md and docs/rpg-v2/VALIDATION_LOG.md. Follow modules sequentially. Do not skip module gates.

Start with RPG-00 only:
- Create docs/rpg-v2/ if missing.
- Add/update source-of-truth roadmap, decisions, migration contract, asset ledger, risk register, validation log, visual target, restart prompt.
- Reconcile intentional deletion of root DECISIONS.md if applicable.
- Inventory root Markdown files and archive stale v1 planning docs under docs/archive/engine-v1/.
- Run validation and record results.
- Do not edit src/**.
- Do not edit package.json or package-lock.json.
- Do not add assets.
- Do not add routes.
- If baseline validation fails, stop and report exact blockers. Do not proceed to RPG-01.
- Do not add convenience tooling, dependencies, assets, route changes, or speculative future scaffolding during RPG-00.

Validation gate:
Run the repo's full validation scripts, expected:
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm run audit

Proceed module by module only after a clean gate.
```

---

## 40. Final implementation principle

Do not build the fantasy first.

Build the trustworthy path first:

```text
Hub -> Map -> Week 4 -> Study Resource -> Focus Session -> Hub/Log/Badges reflection
```

Then add the RPG feel.

A good RPG v2 makes the learner want to continue because progress is visible, honest, and satisfying. A bad RPG v2 makes the app look impressive while weakening the engine, copying branding, hiding truth, or inventing mechanics.

The standard is:

```text
More motivating than v1.
No less honest than v1.
No less local-first than v1.
No less maintainable than v1.
No larger or more complex than necessary for the accepted module.
```

When in doubt, stop and ask:

```text
Does this need to be here?
Is this required to reach the intended endstate?
Can this wait until a later module?
What breaks if this is not added now?
```

If nothing breaks, defer it.
