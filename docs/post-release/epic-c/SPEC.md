# Epic C — programme platform foundation

Status: **C0 `PASS_READY_FOR_C1` — awaiting owner review.** C1 is not
authorized until the owner reviews this C0 package. Authority: Bootstrap v7.0
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
its per-programme version sit in the database, beside the runtime path, and
reference a programme rather than being part of its definition.

The curriculum stays `Programme → Unit → Item`. "Week", "problem set" and
"final project" are CS50 terminology and policy, not engine structure. No
deeper hierarchy is justified by current source.

## 3. Required layer separation

These layers are delivered by separate stories (`stories.yaml`):

1. evidence before change (C1);
2. programme layer, registry boundary and content (C2);
3. reward and catalogue rules passed into lib engines (C3);
4. terminology and feature-level course configuration (C4);
5. programme-scoped catalogue reads (C5);
6. persisted ownership, catalogue/version state and migration (C6);
7. multi-programme registration, enrolment and switching (C7);
8. programme presentation (theme/assets) abstraction (C8).

## 4. Behaviour and data freeze

Unless a story contract explicitly changes product semantics, every story
preserves: curriculum identity, ordering and labels; progress, completion and
status behaviour; XP amounts, `sourceType`, `sourceId` and `reason` strings;
achievement definitions, unlock IDs and trigger IDs; session/save behaviour;
links and study content; backup/export/restore; route behaviour; Classic/RPG
shared capability behaviour; accepted visual appearance.

Bounded identity rules for Epic C (not permanent roadmap decisions): Epic C
preserves the existing local database identity `progresspal-cs50-edition` and
implements multi-programme support within it; no Epic C story re-keys existing
CS50 identifiers. Database replacement, splitting or renaming is outside Epic
C (`C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md` §6).

## 5. Migration and architecture rules

- No persisted ownership change ships without the migration acceptance
  contract in `C0_DATA_OWNERSHIP_AND_MIGRATION_MAP.md` §7 (old-database
  fixtures, idempotency, reopen, transaction failure, backup/restore, no
  duplicate XP or unlock rewards, unknown/missing programme handling,
  per-programme catalogue version).
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

| ID    | Decision                                                                                                                                                         | Why source cannot resolve it                                                                                   | Earliest gate     | Safe to proceed without it                                                               |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------- |
| OD-1  | Are XP and level learner-global across programmes, or per programme?                                                                                             | Product meaning of the HUD level; today one ledger and one level exist, which is consistent with either answer | C6                | C1–C5 (C5 must not scope the XP ledger or level)                                         |
| OD-2  | Are the five programme-neutral achievements earned once per learner or once per programme?                                                                       | Unique `achievementId` index works for either; product policy                                                  | C6                | C1–C5 (C3 preserves unlock IDs; C5 must not scope unlocks)                               |
| OD-3  | Enrolment model: one active programme at a time or concurrent enrolments; what onboarding selects for a fresh database; legacy-database default                  | No enrolment concept exists in source                                                                          | C6 (and C7)       | C1–C5 (single registered programme is implicitly active)                                 |
| OD-4  | Are study sessions, insights, weekly targets and the learner profile global or programme-scoped?                                                                 | Sessions are attributable through `itemId`; the read/display scope is product policy                           | C6                | C1–C5 (C5 must not scope sessions/insights/profile)                                      |
| OD-5  | Is a new CS50x edition (e.g. 2027) a new programme or a new catalogue version of the same programme, and does progress carry over?                               | `courseId` embeds the year; sync is additive and never deletes; no rollover rule exists                        | C6                | C1–C5                                                                                    |
| OD-6  | Product brand "ProgressPal CS50 Edition": keep, or make it programme-neutral?                                                                                    | Product/branding policy                                                                                        | none in C1–C8     | All frozen stories preserve the brand text byte-identically; any brand change needs OD-6 |
| OD-7  | Which first additional programme, with what content licence and link hosts?                                                                                      | Outside engineering evidence                                                                                   | Epic E; C8 need   | C1–C7                                                                                    |
| OD-8  | Visual baseline retention: commit the C1 capture archive to the repository, or retain it outside the working tree?                                               | Repository content policy for ≈8 MB of binaries                                                                | C1 **acceptance** | C1 start and capture; the archive is sealed and hashed either way                        |
| OD-9  | Epic B remote publication / intended branch baseline before Epic C production-code stories (Bootstrap `19_EPIC_C_READINESS_DECISION.md`, publication dependency) | Release decision                                                                                               | C2                | C1 (tests/fixtures/docs only; branch baseline recorded in the C1 handoff)                |
| OD-10 | Switching UX: where the learner switches programme and how the current programme is shown, without Epic D redesign                                               | Interaction design decision                                                                                    | C7                | C1–C6                                                                                    |

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
