# Epic C — programme platform foundation

Status: **C0 accepted by owner review; C1, C2 and C3 accepted and closed
locally** (`C1_ACCEPTED_CLOSED`, `C1_CLOSURE_RECORD.md`;
`C2_ACCEPTED_CLOSED_LOCALLY`, `C2_CLOSURE_RECORD.md`;
`C3_ACCEPTED_CLOSED_LOCALLY`, `C3_CLOSURE_RECORD.md`). **C4 implemented and
validated locally, ready for owner review, not accepted**
(`C4_CLOSURE_RECORD.md`). C5 has not started and is not authorized.

- The accepted retained visual baseline is
  `c1-visual-baseline-69b1db7.zip`, SHA-256
  `cb40459103140f0de7de562e7c84d244ab6826d668952e7d06af0dea7c42917c`
  (`C1_VISUAL_BASELINE_MANIFEST.md`).
- OD-8 is resolved: the archive is committed.
- OD-9 is resolved (§6): C2's development baseline is the local C1 lineage
  `cx/epic-c1-rpg-theme-repair` at `cac8f23`, which contains accepted Epic B
  `fd5e2d5`. `origin/master` and Production stay unchanged.
- C2 was implemented on `cx/epic-c2-programme-layer`, branched from
  `db5f795`. The owner accepted implementation candidate `35604093`, and C2
  is closed locally (`C2_CLOSURE_RECORD.md`).
- C3 was implemented on `cx/epic-c3-programme-policy`, branched from the C2
  acceptance tip `be40f839`, under a direct owner instruction. The first
  candidate `78ae22e6` was rejected by independent owner review (lab preview
  status). The owner accepted repaired candidate `b12352b3`, and C3 is closed
  locally (`C3_CLOSURE_RECORD.md`).
- C4 was implemented on `cx/epic-c4-programme-terminology`, branched from the
  C3 acceptance tip `663796e5`, under a direct owner instruction.
  Implementation candidate `80c97e86` passed every required final gate and
  awaits owner acceptance (`C4_CLOSURE_RECORD.md`).
- C5 has not started and is not authorized. Its prerequisite (C4 accepted) is
  not met.
- Publication is deferred: neither C2 nor C3 acceptance nor C4 changes
  `origin/master` or Production.

Authority: Bootstrap v7.0
(`ProgressPal_New_Chat_Bootstrap_v7_0_2026-09-25.zip`, SHA-256
`F09B6798E04DA4173A72CADF635AAA6F944D5E2E2E732CE506A5898F39685DC7`),
`epic-c/SPEC.md`, `C0_READINESS_PLAN.md`, `NEXT_STORY_HANDOFF_C0.md`.

## 1. Purpose

Epic C creates the minimum programme-platform foundation required to represent
the existing CS50 programme as validated programme-owned configuration and
state, without copying its source tree and without accidentally changing
accepted user-visible or reward semantics.

## 2. Target principle — C0 result

`active programme → validated definition → shared engine → shared shell`

C0 validated the principle against source and refined it
(`C0_PROGRAMME_DEFINITION_CONTRACT.md` §1): the definition is split by
consumer layer (core rules, content, presentation); lib engines receive
programme rules as parameters instead of importing a programme; the active
programme is resolved once and passed explicitly, never read inside passive
read transactions. Persisted learner state and the materialized catalogue with
its per-catalogue version sit in the database, beside the runtime path. They
reference a catalogue (today) and, from C6, a persisted programme ownership
identity; they are never part of a definition.

The curriculum stays `Programme → Unit → Item`. "Week", "problem set" and
"final project" are CS50 terminology and policy, not engine structure. No
deeper hierarchy is justified by current source.

## 3. Required layer separation

These layers are delivered by separate stories (`stories.yaml`):

1. evidence before change (C1);
2. programme layer, registry boundary and content (C2);
3. CS50 reward, workflow and catalogue policy passed into shared engines (C3);
4. CS50 programme terminology (C4);
5. programme-scoped catalogue reads (C5);
6. persisted ownership, catalogue/version state and migration (C6);
7. multi-programme registration, enrolment and switching (C7);
8. programme presentation (theme/assets) abstraction (C8).

## 4. Behaviour and data freeze

Unless a story contract explicitly changes product semantics, every story
preserves: curriculum identity, ordering and labels; progress, completion and
status behaviour and the statuses offered per item type; XP amounts,
`sourceType`, `sourceId` and `reason` strings; achievement IDs, titles,
descriptions, categories, `xpReward`, display order and **exact unlock
behaviour** over reachable learner states, with unlock IDs and trigger IDs;
user-visible labels and
copy (item/unit/asset type, item-context titles, achievement category labels
and order, session-mode, RPG identity, map ordinal, rank labels and
thresholds, CS50 copy); session/save behaviour; CS50 links and study content;
backup/export/restore; route behaviour; Classic/RPG shared capability
behaviour; accepted visual appearance.

C1 freezes these values as **semantic oracles** (`VALIDATION_READINESS.md`
§2, family A). An extraction or refactoring story cannot change a frozen
semantic oracle by recording a reason; it stops instead. Only a later story
whose accepted contract explicitly authorizes the product-semantic change may
update one. Internal representation is not frozen: achievement
`ruleType`/`ruleConfig` values and the shape of XP/workflow configuration are
characterization and architecture evidence. C3 may re-encode them while every
semantic oracle stays identical.

Ownership (`C0_PROGRAMME_DEFINITION_CONTRACT.md` §4) keeps three things
apart: shared persisted vocabulary (never renamed in Epic C), shared engine
mechanisms, and programme policy. A rule keyed on a shared enum value is not
thereby shared policy. Following the authoritative control to move "week/
final-project/problem-set/specific-ID semantics into validated programme
configuration", the CS50 definition owns:

- completion XP by item type, the problem-set workflow XP, the required-week
  bonus and the final-project milestones;
- the submission-workflow configuration, from which the preview terminal
  status derives;
- the 10 CS50-bound achievement definitions, including the problem-set
  counting policy, and the achievement display order;
- the `final_project` seed rule;
- CS50 terminology.

What stays shared, and why, is evidenced in contract §4d: the level curve,
activity XP, the status model, six achievement definitions, canonical
vocabulary labels and rank labels. The freeze applies equally to shared and
programme-owned values.

Identity (contract §2): the current catalogue identity and definition key is
`cs50x-2026`. The persisted programme ownership identity is **not** frozen
before C6 and depends on OD-5; C2–C5 use only the definition key and catalogue
identity.

Bounded identity rules for Epic C (not permanent roadmap decisions): Epic C
preserves the existing local database identity `progresspal-cs50-edition` and
implements multi-programme support within it; no Epic C story re-keys existing
CS50 identifiers. Database replacement, splitting or renaming is outside Epic
C (`C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md` §6).

## 5. Migration and architecture rules

- No persisted ownership change ships without the migration acceptance
  contract in `C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md` §7 (old-database
  fixtures, idempotency, reopen, transaction failure, backup/restore, no
  duplicate XP or unlock rewards, unknown/missing identity handling,
  per-catalogue version state).
- Every cross-layer story maps and runs the architecture guards of **both**
  source and destination layers, including type-only and configuration-only
  moves (`VALIDATION_READINESS.md` §4).
- A new directory or file type used by Epic C is guarded in the same commit
  that introduces it, with negative probes (probes P6/P7).
- Tests exercise runtime consumers, not only new helpers.

## 6. Owner-decision register

None of these is asked tonight; none blocks C1 start. "Earliest gate" is the
earliest story that cannot start (or, for OD-8, be accepted) without the
decision.

| ID    | Decision                                                                                                                                                                                                 | Why source cannot resolve it                                                                                   | Earliest gate     | Safe to proceed without it                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| OD-1  | Are XP and level learner-global across programmes, or per programme?                                                                                                                                     | Product meaning of the HUD level; today one ledger and one level exist, which is consistent with either answer | C6                | C1–C5 (C5 must not scope the XP ledger or level)                                                                 |
| OD-2  | Are the six platform-neutral achievements (`first-step`, `first-slice`, `clean-stop`, `three-deep-sessions`, `bug-hunter`, `course-complete`) earned once per learner or once per programme?             | Unique `achievementId` index works for either; product policy                                                  | C6                | C1–C5 (C3 preserves unlock IDs; C5 must not scope unlocks)                                                       |
| OD-3  | Enrolment model: one active programme at a time or concurrent enrolments; what onboarding selects for a fresh database; legacy-database default                                                          | No enrolment concept exists in source                                                                          | C6 (and C7)       | C1–C5 (single registered programme is implicitly active)                                                         |
| OD-4  | Are study sessions, insights, weekly targets and the learner profile global or programme-scoped?                                                                                                         | Sessions are attributable through `itemId`; the read/display scope is product policy                           | C6                | C1–C5 (C5 must not scope sessions/insights/profile)                                                              |
| OD-5  | Is a new CS50x edition (e.g. 2027) a new programme or a new catalogue version of the same programme, and does progress carry over? This decides the persisted programme ownership identity (contract §2) | `courseId` embeds the year; sync is additive and never deletes; no rollover rule exists                        | C6                | C1–C5 (they use only the definition key / catalogue identity `cs50x-2026`, never a persisted programme identity) |
| OD-6  | Product brand "ProgressPal CS50 Edition": keep, or make it programme-neutral?                                                                                                                            | Product/branding policy                                                                                        | none in C1–C8     | All frozen stories preserve the brand text byte-identically; any brand change needs OD-6                         |
| OD-7  | Which first additional programme, with what content licence and link hosts?                                                                                                                              | Outside engineering evidence                                                                                   | Epic E; C8 need   | C1–C7                                                                                                            |
| OD-8  | Visual baseline retention: commit the C1 capture archive to the repository, or retain it outside the working tree?                                                                                       | Repository content policy for ≈8 MB of binaries                                                                | C1 **acceptance** | C1 start and capture; the archive is sealed and hashed either way                                                |
| OD-9  | Epic B remote publication / intended branch baseline before Epic C production-code stories (Bootstrap `19_EPIC_C_READINESS_DECISION.md`, publication dependency)                                         | Release decision                                                                                               | C2                | C1 stayed local; accepted Epic B `master` was unchanged. Resolve OD-9 before C2 production code.                 |
| OD-10 | Switching UX: where the learner switches programme and how the current programme is shown, without Epic D redesign                                                                                       | Interaction design decision                                                                                    | C7                | C1–C6                                                                                                            |

Resolution status:

- **OD-8** was resolved at C1 acceptance. The owner-accepted archive is
  committed to the repository (`C1_VISUAL_BASELINE_MANIFEST.md` §5).
- **OD-9** was resolved by the owner on 2026-09-27. C2 uses the accepted local
  C1 lineage on `cx/epic-c1-rpg-theme-repair` at
  `cac8f23bb9c43d47c4c0a96d8bd27797d48ef56d` as its development baseline.
  - That lineage contains accepted Epic B
    `fd5e2d592bb6f5d1724509119147c48ba3a5df59`.
  - `origin/master` (`d4b945b`, the Epic A publication line) and the current
    Production publication stay unchanged at this gate.
  - Publishing Epic B or C1 is a later, separate release decision and is not
    authorized. On this repository a push to `master` deploys to Production
    automatically, and CI runs without gating the merge.

Additionally, C6 requires an **accepted schema-change decision record**
(`AGENTS.md` forbids schema changes without one).

## 7. Rejected alternatives

- **One "extract ProgrammeDefinition" story.** Mixes persisted-value risk (XP
  source keys, unlock IDs) with text and content moves; failures would be
  unattributable.
- **Migration first.** The new schema shape depends on OD-1 to OD-5 and would
  be designed without rule extraction or scoped reads to validate it.
- **Renaming CS50 IDs to a prefixed scheme.** Re-keys progress, XP sources,
  unlock triggers, derived media rows, routes and existing backups for no
  benefit that cross-programme uniqueness (P-3) does not already give.
- **Registry multi-definition validation before any persistence change.** A
  second production definition is not registered in Epic C before C7; C2's
  single-entry registry plus C6's sync-level collision rejection cover the
  proven risk (P2) without speculative machinery.
- **All achievement definitions and all label tables as programme
  configuration** (the `64462f6` contract). The six neutral definitions,
  canonical vocabulary labels and rank labels have positive evidence of
  platform scope (contract §4d); making them programme-owned would add
  configuration without a proven need.
- **Treating type-keyed rules as shared because they are keyed on shared
  enums** (the `ca8fe96` contract). Vocabulary is not policy; the
  authoritative control names week, problem-set and final-project semantics
  as programme configuration.
- **Freezing the achievement rule encoding.** `ruleType`/`ruleConfig` are not
  a public or persisted contract; freezing them would block the C3
  generalisation of `problem_set_status_count` without protecting any
  learner-visible behaviour.
- **Equating the persisted programme identity with `courseId` now.** That
  would pre-answer OD-5.
- **A deeper curriculum hierarchy.** No consumer needs it.

## 8. Out of scope for Epic C

First additional programme content (Epic E); navigation/HUD redesign (Epic D);
Firebase, Supabase, cloud persistence, authentication, analytics, telemetry or
multi-device sync (Epic F/G); broad visual redesign; service-worker, loading
state or unrelated maintenance (KI-01, KI-02, KI-03). Provider-specific
concepts must not appear in the programme definition or learner-state
ownership model.

## 9. Delivery boundary

Each story ends as a clean local commit (or concern-scoped commits) for owner
review. No push, merge, tag, deployment or remote change is authorized by any
Epic C record. Story sequence, scopes and gates: `stories.yaml`. C1 contract:
`NEXT_STORY_HANDOFF_C1.md`.
