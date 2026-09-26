# Epic C / C0 — closure and readiness record (v7 reconciliation)

## 1. Disposition

**`PASS_READY_FOR_C1`**

Meaning, and only this: the C0 evidence and contracts are coherent, every
Bootstrap v7 required output exists, the story sequence is frozen enough for
C1, C1 has a precise handoff, and no unresolved issue blocks C1.

It does **not** authorize C1 to start. The owner reviews this C0 package
first (`NEXT_STORY_HANDOFF_C1.md` §7 states exactly what acceptance
authorizes).

[C] The original Cowork candidate issued "A. C0 ACCEPTED — C1 READY FOR OWNER
REVIEW", a vocabulary Bootstrap v7 does not permit, while recording that
Bootstrap v7 and the Lessons Learned register were unavailable to it (its
residual limitation R-1). That substitute disposition is withdrawn; the
permitted exit state above replaces it.

## 2. Identities

| Item                                              | Value                                                                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Accepted Epic B baseline                          | `master` `fd5e2d592bb6f5d1724509119147c48ba3a5df59`, tree `bc86fd392a5284d9db8821c31a27b8c95ec82a9a`                                           |
| Original Cowork C0 candidate                      | `cx/epic-c0-programme-readiness` `137ffde46423a13f07dd8ba4a13a6e0b67b7dd65`, tree `815df73814b7534c8e6d7189af93bef0aa87b9d2`, parent `fd5e2d5` |
| Reconciliation branch                             | `cx/epic-c0-v7-reconciliation`, started at `137ffde`; the reconciliation commit's parent is `137ffde`                                          |
| `origin/master` (local tracking ref, not fetched) | `d4b945ba0b024ceb4fbd29d70bcecc8496b3c6c3`; Epic B not remotely published                                                                      |
| Authority package                                 | `artifacts/c0-authority/ProgressPal_New_Chat_Bootstrap_v7_0_2026-09-25.zip` (gitignored, not modified, not staged)                             |
| Authority SHA-256                                 | `F09B6798E04DA4173A72CADF635AAA6F944D5E2E2E732CE506A5898F39685DC7` — verified                                                                  |
| Authority internal hashes                         | `SHA256SUMS.txt`: 30/30 entries OK after extraction to disposable scratch                                                                      |

Product tree bytes outside `docs/post-release/epic-c/**` are identical across
all three commits.

## 3. Original candidate provenance and method limits

- [F] The Cowork session had repository file access but no shell on the owner
  machine. It verified identity from the object store, refs and index (commit
  and tree SHA-1 recomputed; 464/464 index entries re-hashed; clean). That
  evidence is consistent with the reconciliation's direct `git` checks.
- [F] It could not update local Git metadata. It delivered a Git bundle
  (`artifacts/epic-c0/epic-c0-programme-readiness.bundle`, 2026-09-26
  00:09); the owner imported it with `git fetch` at 00:56:54 +0200 (reflog:
  "fetch …bundle … storing head"). `git bundle verify` exits 0; the bundle
  requires `fd5e2d5` and contains only `137ffde`.
- [F] Its probes and guard-liveness run executed in a cloud workspace on the
  pinned Node 24.21.0 / npm 11.10.1, not on the owner's Windows machine.
- [F] Bootstrap v7 and the Lessons Learned register were not supplied to it.
  This reconciliation closes that gap (R-1).
- [F] The handoff evidence file `integration-evidence/EPIC_B_COMMIT_SEQUENCE.txt`
  contains literal `` `t `` where tabs were intended and a UTF-8 BOM; the same
  bytes are in the v7 package. SHAs are correct; C0 does not rely on the
  file's separators.

## 4. Findings reconciliation

### 4a. Retained (re-verified against source)

| Finding                                                                                                           | Classification                                |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Curriculum is `Programme → Unit → Item`; no deeper hierarchy needed                                               | source fact                                   |
| Generic seed schema requires a `final_project` unit                                                               | source fact + probe P1                        |
| XP final-project milestones hard-code CS50 item IDs; `week` bonus keyed on unit type                              | source fact + probe P4                        |
| Repositories locate "the" final-project unit by type, whole-store                                                 | source fact                                   |
| 10 of 16 achievements CS50-bound, 6 platform-neutral; evaluator shared; `course-complete` context whole-catalogue | source fact (corrected in §11)                |
| CS50 links/guides/copy/RPG identity/ID-string ordinal parsing                                                     | source fact                                   |
| Programme ownership explicit only on `course_units`; derived elsewhere; not derivable for XP/unlocks              | source fact                                   |
| A colliding second catalogue re-owns the CS50 unit row and lowers `seedVersion`                                   | probe P2 + source; **latent risk**            |
| Whole-store reads merge catalogues                                                                                | probe P3 + source; **latent risk**            |
| XP and unlock identities have no programme dimension                                                              | source fact + probe P4                        |
| Backup validation accepts duplicate XP source keys                                                                | probe P5 + source; **pre-existing gap**       |
| Local-only guard ignores non-TS files; new directory has no ESLint rule                                           | probes P6/P7 + source                         |
| Screenshots are captured, not compared; no baseline committed                                                     | source fact                                   |
| Definition split by consumer layer; rules passed into lib; active programme passed explicitly                     | architectural proposal                        |
| OD-1 to OD-7                                                                                                      | owner decisions (retained, gating re-derived) |

### 4b. Changed or rejected

| Original claim                                                                                                            | Change and reason                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Disposition "A. C0 ACCEPTED — C1 READY FOR OWNER REVIEW"                                                                  | Replaced by `PASS_READY_FOR_C1` (§1)                                                                                                                                       |
| "Single database, forever" (P-1 / D-6); "CS50 identifiers and the database name are never changed"                        | Bounded to Epic C: Epic C preserves the database identity and does not re-key CS50 IDs; replacement/splitting is outside Epic C and not a permanent decision               |
| Story ownership in the definition proposal (content C1, rules C2, terminology C3, presentation C7; OD gating "C4 onward") | Contradicted `stories.yaml` (C2 content, C3 rules, C4 terminology, C8 presentation; OD gating C6). One sequence frozen in `stories.yaml`; all documents aligned            |
| Workflow capability grouped with rules (proposal) vs terminology (stories)                                                | `64462f6` placed it in C4; `ca8fe96` kept it shared in place; final (§12): CS50 progress/completion policy moved into configuration by C3, offered statuses frozen exactly |
| C1 "golden" tables for every item × every status as oracles                                                               | Split into semantic oracles over reachable states and labelled characterization (`VALIDATION_READINESS.md` §2); reachability derived from source                           |
| Visual captures under gitignored `artifacts/` only                                                                        | Hash-bound, sealed, retained baseline contract with owner review; retention location is OD-8                                                                               |
| V0 asset hashes presented as visual protection                                                                            | Reclassified as asset/token identity: necessary, not proof of rendered parity                                                                                              |
| "Owner effort during C0: 0"                                                                                               | Corrected (§7): 0 clarification/debug requests, but ≥1 owner delivery execution and one environment-induced reconciliation pass                                            |
| P2 "silently re-owns" framed alongside current defects                                                                    | Classified as a latent mechanism; no current production caller; no learner-data-loss claim                                                                                 |
| P4 read as "duplicate XP identity"                                                                                        | Narrowed: no programme dimension exists; no duplicate was demonstrated                                                                                                     |
| `study_sessions` programme linkage described as needing a decision                                                        | Sessions carry required `unitId`/`itemId` and are attributable; only their read scope needs OD-4                                                                           |
| Migration contract lacked explicit unknown/invalid programme ID handling                                                  | Added MR-11; rollback expectation stated in MR-10                                                                                                                          |
| Registry collision validation only in C7                                                                                  | Retained at C7 for multi-registration, plus sync-level collision rejection in C6 (MR-3) for the proven P2 mechanism                                                        |
| Epic B publication dependency not mapped                                                                                  | Added OD-9, gating C2 (Bootstrap `19_EPIC_C_READINESS_DECISION.md`)                                                                                                        |

## 5. Repairs made in the reconciliation

- **Disposition**: substitute vocabulary removed everywhere; exactly one
  Bootstrap exit state used.
- **Required outputs**: the seven v7 outputs plus the C1 handoff now exist;
  overlapping Cowork files were consolidated and removed (§6b).
- **Story map**: one sequence (C1–C8) with objective, allowed and forbidden
  scope, prerequisites, evidence, owner-decision gates and stop conditions
  (`stories.yaml`).
- **Owner-decision gating**: each decision mapped to its earliest gate
  (`SPEC.md` §6); OD-8 (visual retention), OD-9 (Epic B publication baseline)
  and OD-10 (switching UX) added; none blocks C1 start.
- **Architectural language**: permanence claims bounded to Epic C; proposals
  labelled as proposals.
- **Visual evidence**: durable baseline contract and comparison procedure.
- **Semantic oracle vs characterization**: four evidence families defined;
  reachable-state rule for C1.
- **Owner effort / process**: corrected accounting (§7).
- **Other evidence-based corrections**: study-session attribution; MR-11;
  C5 fail-closed requirement for a wrong active programme ID; guard gap G-8
  (`src/seed/**` has no ESLint rule); type-only import rules must be proved
  by C2 negative probes rather than assumed.

## 6. Validation of the reconciliation

### 6a. Gates

Run on the staged tree before commit; each gate was a precondition for the
commit:

| Gate                     | Command                                                                                                                  | Result                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Identity                 | `git rev-parse` of branch/HEAD; `master`; original C0 branch                                                             | PASS: on `cx/epic-c0-v7-reconciliation` at `137ffde`; `master` `fd5e2d5`; original branch `137ffde`           |
| Path scope               | `git diff --cached --name-status 137ffde`                                                                                | PASS: 20 paths (4 added, 6 modified, 10 deleted), all under `docs/post-release/epic-c/`                       |
| Required outputs present | existence and non-empty check of the eight required files                                                                | PASS: 8/8                                                                                                     |
| Format                   | `npm run format:check`                                                                                                   | PASS: exit 0, "All matched files use Prettier code style!"                                                    |
| Whitespace               | `git diff --cached --check`                                                                                              | PASS: exit 0, no output                                                                                       |
| Product immutability     | `git diff --cached --name-only 137ffde -- . ':!docs/post-release/epic-c'`                                                | PASS: 0 paths                                                                                                 |
| YAML validity            | `yaml.safe_load` of `stories.yaml`                                                                                       | PASS: C0–C8 parsed with the states in `stories.yaml`                                                          |
| Internal consistency     | searches over `docs/post-release/epic-c/**` (story IDs, OD gates, disposition words, permanence, visual-baseline claims) | PASS: remaining occurrences of superseded wording appear only inside explicit correction entries (`[C]` rows) |

Product suites were not rerun (`VALIDATION_READINESS.md` §1). No probe was
rerun (`C0_EVIDENCE_PROBES.md` §2). No focused repository test was needed to
resolve a factual uncertainty.

### 6b. Document consolidation map

| Original Cowork file                                                                                     | Disposition                                                                                                      |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `C0_SEMANTIC_INVENTORY.md`                                                                               | Consolidated into `C0_PROGRAMME_ASSUMPTION_INVENTORY.md`; removed                                                |
| `C0_PERSISTENCE_OWNERSHIP_ANALYSIS.md`                                                                   | Consolidated into `C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md`; removed                                              |
| `C0_MIGRATION_READINESS_CONTRACT.md`                                                                     | Consolidated into `C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md` §7; removed                                           |
| `C0_PROGRAMME_DEFINITION_PROPOSAL.md`                                                                    | Superseded by `C0_PROGRAMME_DEFINITION_CONTRACT.md`; removed                                                     |
| `C0_VISUAL_PRESERVATION.md`                                                                              | Superseded by `C0_VISUAL_PRESERVATION_PLAN.md`; removed                                                          |
| `C0_GUARD_MAP.md`                                                                                        | Consolidated into `VALIDATION_READINESS.md` §4; removed                                                          |
| `C0_DECISIONS_AND_DEFERRALS.md`                                                                          | Owner decisions → `SPEC.md` §6; deferrals → inventory §6; proposals → data map §6 / definition contract; removed |
| `C0_STORY_DECOMPOSITION.md`                                                                              | Sequence → `stories.yaml`; rejected alternatives → `SPEC.md` §7; removed                                         |
| `C0_IDENTITY_BASELINE.md`                                                                                | Condensed into this record §2–§3; removed                                                                        |
| `C0_LESSONS_LEARNED_ADDENDUM.md`                                                                         | Condensed into this record §9; removed                                                                           |
| `C0_EVIDENCE_PROBES.md`                                                                                  | Retained as supplementary evidence with a reconciliation assessment                                              |
| `C0_CLOSURE_RECORD.md`, `SPEC.md`, `stories.yaml`, `VALIDATION_READINESS.md`, `NEXT_STORY_HANDOFF_C1.md` | Rewritten                                                                                                        |

## 7. Owner effort and process evidence

Original Cowork C0 run:

| Metric                                                   | Value                                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Owner clarification requests                             | 0 (as recorded)                                                                                                 |
| Owner debugging requests                                 | 0 (as recorded)                                                                                                 |
| Owner command executions required for candidate delivery | ≥ 1 (bundle `git fetch` into local refs)                                                                        |
| Preventable support-tool failures reaching the owner     | 0 known                                                                                                         |
| Environment-induced handoff burden                       | no local Git write access (bundle delivery); authority package not supplied, requiring this reconciliation pass |

This reconciliation run: 0 owner clarification or debugging requests; 0 owner
command executions during the run; 0 support scripts; no probe or product
suite rerun. Pre-run owner setup observed in the reflog (switching to the
reconciliation branch, placing the authority ZIP) is recorded as setup, not as
a run failure.

These are process observations, not product defects.

## 8. Multi-perspective closure review

- **Software architecture.** No claim found stronger than its evidence after
  corrections. Engine rules kept as engine (status model, completion math,
  long-form slicing, level curve, activity XP, dedupe); only proven CS50
  policy moves to configuration. C3 combines three rule moves with the same
  risk type (persisted reward identity) and oracle type; mitigated by
  mandatory concern-scoped commits rather than more stories.
- **Data ownership and migration.** Ownership analysed per store; XP, unlocks,
  sessions and profile are not treated alike. No migration decision is made
  prematurely: every stored programme field is gated on OD-1/2/4, enrolment on
  OD-3, rollover on OD-5. Added missing unknown-ID handling (MR-11) and a
  rollback expectation.
- **Testing / QA / evidence.** Semantic oracles, characterization,
  architecture and visual evidence separated; reachable states required;
  existing coverage mapped before additions; probe conclusions narrowed. C1
  is broad but tests-only and independently reviewable item by item.
- **UX/UI visual preservation.** No visual regression protection is claimed.
  Durable, hash-bound baseline with owner review defined; Epic D redesign
  explicitly excluded. Open point recorded: whether RPG rendering varies with
  theme preference is unverified; C1 records it.
- **Delivery / release / process.** Single disposition vocabulary; publication
  baseline mapped (OD-9); owner effort corrected. Observations for the owner,
  not C0 actions: (1) the repository's `docs/post-release/epic-b/` lacks the
  v7 `OWNER_ACCEPTANCE_RECORD.md`, and its `VALIDATION_READINESS.md` and
  `stories.yaml` differ from the v7 copies — other Epic docs are out of C0
  scope; (2) the Lessons Learned register row "theme abstraction before
  preservation evidence" names enforcement "C3 before C4" in pre-C0 numbering;
  in the frozen sequence the equivalent control is "C1 baseline accepted
  before C8".
- **Adversarial / red-team.** Found one real gap: once C5 scopes reads, a wrong
  or unmaterialized active programme ID could render an empty-but-plausible
  course — the A7 failure class. C5 now requires fail-closed behaviour through
  the actual route. Also checked: PASS cannot be read as C1 authorization (§1,
  handoff §7); a test-only second catalogue cannot reach production (C5
  forbidden scope); characterization fixtures cannot be silently updated
  (definition contract §5); the URL allowlist cannot be widened generically
  (C2). A new agent following only this package knows what C1 may and may not
  do (`NEXT_STORY_HANDOFF_C1.md` §3–§7).

## 9. Proposed Lessons Learned register additions (for the owner)

- **A guard protects only what it scans.** File-type and directory scope are
  part of a guard's contract (P6, P7). Before moving code or data into a new
  file type or directory, run a negative probe proving each relevant guard
  fires at the destination, and extend the guard in the same commit. This
  generalizes the Epic B B3 destination-guard control.
- **Characterization is not a semantic oracle.** Current-output fixtures
  detect drift; they do not define correct behaviour. Keep them labelled and
  separate from reviewed semantic expectations over reachable states.
- **Delivery constraints are owner effort.** When an execution environment
  cannot write local Git state, the bundle import is an owner execution and is
  counted as such.

## 10. Boundary

Documentation-only reconciliation commit `64462f6` on
`cx/epic-c0-v7-reconciliation` with parent `137ffde`, followed by the
independent-review repair commit in §11 with parent `64462f6`. `master` and
`cx/epic-c0-programme-readiness` are unchanged. Neither existing commit was
amended. No push, merge, tag, deployment, branch deletion or remote change.
C1 is not started.

## 11. Independent-review repair (follow-up commit on top of 64462f6)

> Historical record of commit `ca8fe96`. Several conclusions below (§11a
> achievement rule fields as family A; §11b classification of type-keyed XP
> and the workflow as shared; §11c "programme ID is `cs50x-2026`") are
> superseded by §12. The current canonical contracts reflect §12.

An independent review reconstructed the `64462f6` tree exactly and confirmed
it is documentation-only. It found three remaining defects, which this
follow-up commit repairs. No source, probe or product evidence was rerun;
each repair was resolved by source inspection at the same baseline.

### 11a. Semantic oracle vs characterization

- Defect: `NEXT_STORY_HANDOFF_C1.md` classified achievement-definition
  snapshots, links, guides and labels as characterization, and the contract let
  characterization be updated with an owner-reviewed reason. That weakened the
  `SPEC.md` §4 freeze.
- Repair: family is now assigned by product authority. Every externally
  meaningful value that `SPEC.md` §4 freezes is a semantic oracle (family A)
  once reviewed in C1. This covers achievement definitions (fields and display
  order), CS50 links, study guides, labels and CS50 copy. A frozen semantic
  oracle can change only in a later story whose accepted contract explicitly
  authorizes the product change; a recorded reason is never enough.
  Characterization (B) is limited to internal outputs (for example the
  definitions' timestamp constant) and deliberately retained unreachable
  inputs. The preview label is family A in every document. Updated: `SPEC.md`
  §4, `VALIDATION_READINESS.md` §2–§3, `NEXT_STORY_HANDOFF_C1.md` §4,
  `C0_PROGRAMME_DEFINITION_CONTRACT.md` §5, `stories.yaml` C1/C3/C4.

### 11b. Minimal programme ownership

- Defect: the inventory listed neutral achievements and label vocabularies,
  but the contract assigned all achievement definitions and broad label tables
  (plus all type-keyed XP amounts and the submission workflow) to programme
  configuration. The inventory also counted `course-complete` as CS50-bound
  (eleven) while listing only five neutral definitions.
- Repair: the smallest-definition rule is applied
  (`C0_PROGRAMME_DEFINITION_CONTRACT.md` §3–§3a).

Ownership conclusions changed from `64462f6`:

| Concern                                                           | 64462f6                                             | Now                                                                                                                         |
| ----------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Achievement definitions                                           | all 16 programme-owned                              | 10 CS50-owned; 6 shared (`first-step`, `first-slice`, `clean-stop`, `three-deep-sessions`, `bug-hunter`, `course-complete`) |
| Achievement display order                                         | implicit                                            | programme-owned ordered ID list (the one override: order is user-visible and interleaved)                                   |
| `course-complete`                                                 | counted CS50-bound                                  | shared definition; whole-catalogue context scoped by C5; per-programme earning is OD-2                                      |
| `pset-chain` evaluator rule                                       | listed as an engine coupling                        | definition CS50-owned; evaluator shared (keyed on the shared `problem_set` type)                                            |
| XP configuration                                                  | type amounts, workflow, `week` bonus and milestones | only the final-project milestones and pair lookups; the rest stays shared policy                                            |
| Type/asset/category/mode labels                                   | programme-owned terminology                         | shared (labels of shared enum values)                                                                                       |
| Rank labels                                                       | in C1 label tables, owner unstated                  | shared (generic thresholds)                                                                                                 |
| Submission workflow                                               | programme config in C4                              | shared, stays in place                                                                                                      |
| CS50 copy, unit-noun "week" copy, RPG identity tuple, map ordinal | programme-owned (C4)                                | unchanged: programme-owned (C4), with the concrete reason recorded                                                          |

- OD-1 and OD-2 are not answered. OD-2's scope now names all six neutral
  achievements. Shared ownership of a definition does not decide whether it is
  unlocked once per learner or once per programme.
- New deferred concern X-10: programme-specific overrides of shared values are
  built only when a registered programme needs them.
- Complete CS50 output stays protected. The C1 semantic tables cover every
  definition, label and copy string regardless of owner and mark each row
  shared or CS50-owned. C3 and C4 forbid moving shared values into programme
  configuration, and G-7 exempts shared achievement IDs.
- C3/C4 scopes narrowed accordingly (`stories.yaml`,
  `VALIDATION_READINESS.md` §4c), and C3's runtime consumers now include the
  `achievementDefinitions` consumers in RPG and course features.

### 11c. Programme ID ambiguity

- Defect: the contract gave `programmeId` as `cs50x-2026` but later called the
  initial programme `cs50x`.
- Repair: the programme ID is `cs50x-2026` everywhere; any module or folder
  name C2 chooses is an implementation name only. A search of every Epic C
  document found no remaining bare `cs50x` identifier. "CS50x" survives only
  as the course name in OD-5, and `cs50x-2026.json` only as the seed filename.

### 11d. Validation of the repair

Recorded in the repair commit message and the owner report: path scope,
required outputs, consistency searches, repository `format:check`, separate
`git diff --check`, and unchanged `master` and original C0 branch.

### 11e. Disposition after repair

**`PASS_READY_FOR_C1`** (unchanged). All three defects are resolved and no new
C1-blocking contradiction was found. This still does not authorize C1.

## 12. Architecture-contract correction (follow-up commit on top of ca8fe96)

A further independent review reconstructed the `ca8fe96` tree exactly and
found five contract defects. This commit corrects them in documentation only.
No probe or product suite was rerun; every point was resolved by source
inspection at the same baseline.

### 12a. Rule encoding is not product semantics

- Defect: C1 froze achievement `ruleType`/`ruleConfig` as family-A oracles.
  That would have blocked a legitimate C3 re-encoding of
  `problem_set_status_count`, whose evaluator hard-codes
  `item.type === 'problem_set'`.
- Source: `ruleType`/`ruleConfig` travel in the internal `AchievementView`
  type but are rendered by no feature or app code. The `achievement_definitions`
  store is never written, and backups type them as generic strings/objects.
  They are not a public or persisted contract.
- Correction: family A now covers achievement ID, title, description,
  category, `xpReward`, display order, **exact unlock behaviour** over
  reachable states, unlock ID and trigger identity. C1 adds a per-definition
  satisfying/nearest-unsatisfying behaviour table for all 16 definitions,
  which is stronger than a field snapshot. The rule encoding is
  characterization/architecture (B/C). Updated: `SPEC.md` §4,
  `VALIDATION_READINESS.md` §2–§3, `NEXT_STORY_HANDOFF_C1.md` item 6, contract
  §7, `stories.yaml` C1/C3.

### 12b. Shared vocabulary does not prove shared policy

- Defect: `ca8fe96` classified type-keyed rules as shared because they are keyed
  on shared enum values, and read P4 as proof that the `week` bonus is
  neutral. Both conflict with the authoritative control "move
  week/final-project/problem-set/specific-ID semantics into validated programme
  configuration".
- Correction: contract §4a–§4b separate A (shared storage vocabulary), B
  (shared mechanism) and C (programme policy). They classify as CS50 policy:
  completion XP by item type, problem-set workflow XP, the required-week
  bonus, the final-project milestones, the submission workflow (with its
  asymmetry), the preview terminal status (derived from the workflow), the
  problem-set counting in `pset-chain` and the `final_project` seed rule. P4
  is re-read as proof that the current engine applies CS50 policy to every
  catalogue using `week`. §4d documents positive evidence for what stays
  global: the level curve, activity XP, the status model (Epic B-accepted
  neutral contract), six neutral achievements, canonical vocabulary labels and
  rank labels. The long-form eligibility map is explicitly not claimed as
  platform policy (X-1).

Ownership conclusions changed from `ca8fe96`:

| Concern                                                                                         | `ca8fe96`               | Now                                                                                        |
| ----------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| Completion XP by item type                                                                      | shared policy           | CS50 XP configuration (C3)                                                                 |
| Problem-set workflow XP                                                                         | shared policy           | CS50 XP configuration (C3)                                                                 |
| Required `week` bonus                                                                           | shared policy           | CS50 XP configuration (C3)                                                                 |
| Submission workflow and preview status                                                          | shared, stays in place  | CS50 progress/completion configuration (C3); offered statuses frozen exactly               |
| `problem_set_status_count` counting                                                             | shared evaluator branch | counted type is CS50 policy in `pset-chain`; evaluator mechanism shared; C3 may generalise |
| Long-form eligibility map                                                                       | not revisited           | possibly programme policy; deferred as a migration concern (X-1)                           |
| Six neutral achievements, canonical labels, rank labels, level curve, activity XP, status model | shared                  | shared, now with positive evidence (contract §4d)                                          |

- C3 is retitled "CS50 reward, workflow and catalogue policy passed into shared
  engines" and gains the workflow move, the evaluator re-encoding allowance and
  a test-only-definition proof that policy is configuration. C4 no longer
  mentions the workflow.

### 12c. Identity does not pre-answer OD-5

- Defect: `programmeId = courseId = cs50x-2026` implied the persisted
  cross-edition programme identity while OD-5 is open.
- Correction: contract §2 separates catalogue identity (`courseId`
  `cs50x-2026`, a source fact), catalogue version, **definition key**
  (`cs50x-2026`, runtime only) and **persisted programme ownership identity**
  (frozen in C6 after OD-5; not assumed to equal `cs50x-2026`, and not
  `cs50x`). The name `programmeId` is reserved for the latter. C2 keys the
  registry by definition key; C5 scopes by catalogue identity; C2–C5 forbid a
  persisted `programmeId`. The data map now uses per-catalogue version state
  (P-5, new P-7) and makes MR-1, MR-2, MR-3 and MR-11 refer to the OD-5
  identity. OD-5 is not answered.

### 12d. Visual baseline identity

- Defect: capture was required "at the owner-accepted C0 commit" with a clean
  worktree, using a spec that only C1 adds.
- Correction: `C0_VISUAL_PRESERVATION_PLAN.md` §4a defines the **product
  baseline identity** (accepted C0 commit/tree plus `fd5e2d5`/`bc86fd3`) and
  the **evidence-harness identity** (clean C1 commit `H`). Three git proofs
  show that `H`'s production subset is byte-identical to the product baseline.
  Captures come from `H`; the manifest, committed afterwards in docs-only
  commit `M`, binds both identities and the spec blob SHA.

### 12e. Achievement-order validation boundary

- Defect: the programme's order list references shared definitions that the
  proposed C2 rules did not let `src/programmes/**` import.
- Correction (contract §5): the smallest legal path is for `src/programmes/**`
  to import the `@/lib/achievements` public entrypoint. That module is DB-free
  and imports only `lib/domain`, `lib/validation` and `lib/completion`. The
  dependency is downward, and `lib ↛ programmes` plus `check:circular` rule out
  a cycle. The CS50 definition validates its composed catalogue at module load
  (structural validation plus exact-permutation and disjointness
  cross-reference) and the registry re-asserts it. Consumers pass the composed
  catalogue into lib as a parameter. C2's rule list and negative probes include
  this allowance.

### 12f. Disposition after correction

**`PASS_READY_FOR_C1`** (unchanged). All five defects are resolved and no new
C1-blocking contradiction was found. OD-1, OD-2 and OD-5 remain unanswered and
gate only C6. This still does not authorize C1.
