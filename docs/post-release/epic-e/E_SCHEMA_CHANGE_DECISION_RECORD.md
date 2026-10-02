# Epic E — schema-change decision record (E-SCHEMA-1)

Status: **PENDING OWNER ACCEPTANCE.** This record is a proposal authored by the Pre-E R4 documentation candidate. It is not self-approved, and nothing in it is authorized until the owner accepts it in writing in the repository. Accepting it would authorize the schema below for Epic E; it would not start Epic E, which still needs a separate direct owner instruction. Until acceptance, `docs/CURRENT_STATE.md` is right to say that no schema v4 is authorized.

It follows the pattern of `docs/post-release/epic-c/C6_SCHEMA_CHANGE_DECISION_RECORD.md` and is scoped to the minimum learner state that the authored Programvareutvikling M01/M02 slice needs. Store and field names are proposals; the RED tests in Epic E fix them. Line references are to the R4 baseline (`854e10a`) and are orientation, not authority.

## 1. Why schema 3 is insufficient

Package 21 DC-37 requires the app to persist, per learner and per content version: attempts (append-only, first answer immutable), a resume point, checkpoint results and, where used, project artefacts with revisions. Everything else (skill state, readiness, retrieval due, progress percentages, recommended next) must be derivable from those. DC-41 says each new persisted entity needs the platform's own schema decision; this is it.

| Need                                      | Nearest schema-3 store                         | Why it cannot carry it                                                                                                                                                                                                                          |
| ----------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-submission attempt history            | `progress_entries` (`&id, &itemId, status, …`) | One mutable row per catalogue item with `status`, `confidence`, `notes` and `evidenceText` (≤ 2,000 chars). It cannot hold many attempts per exercise, and overwriting it destroys first-answer immutability. Exercises are not catalogue rows. |
| Immutable event log                       | `media_progress_events`                        | Media-specific: required `assetId`, `startSecond`, `endSecond`, `watchedSeconds`, `completedSlice`, energy ratings. Reusing it would be semantic abuse.                                                                                         |
| Where to resume inside text and exercises | `resume_points` (`&id, &assetId, …`)           | Keyed to a media asset and a second (`lastSecond`, `nextSliceId`). Authored missions have long text runs, phases with no exercises and pause points that "first unanswered exercise" cannot reconstruct.                                        |
| Hint and support accounting               | none                                           | A hint revealed before an answer must survive a reload, otherwise a reload launders supported work into an unsupported first attempt and inflates mastery.                                                                                      |
| Checkpoint judgement history              | `progress_entries` `submitted`/`accepted`      | Those statuses are CS50 submission-workflow semantics, not criterion-referenced judgement (gap G12).                                                                                                                                            |

Alternatives rejected:

- **Overload `progress_entries` or `app_meta`.** Mutable single rows cannot hold an append-only history.
- **One store for evidence and positions.** Mixing append-only and mutable semantics weakens the repository guarantee that evidence rows have no update or delete path.
- **A third store for project artefacts.** No authored M01/M02 workflow requires one (section 8).
- **A persisted mastery or skill-state cache.** It would be a second source of truth. Package 21 permits a discardable cache; this record does not authorize one.

## 2. Proposed schema 4

Same database name `progresspal-cs50-edition`. Dexie `version(4)` (native 40). No store is renamed or removed and no existing store, field or index changes. `app_meta.schemaVersion` becomes 4.

| Change                       | Dexie store definition                       | Role                                                  |
| ---------------------------- | -------------------------------------------- | ----------------------------------------------------- |
| New store `learner_evidence` | `&id, subjectId, &[subjectId+attemptNumber]` | Append-only evidence log (section 3)                  |
| New store `lesson_positions` | `&id, &itemId`                               | Mutable bookmark, one row per lesson item (section 4) |

Minimum justified indexes:

| Index                                         | Justification                                                                                                                                                                                                                                   |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `learner_evidence.&id`                        | Client-generated stable identity; idempotent submission.                                                                                                                                                                                        |
| `learner_evidence.subjectId`                  | Reads all records (attempts and support events) for one exercise or checkpoint. Support events carry no `attemptNumber`, so the compound index cannot serve them.                                                                               |
| `learner_evidence.&[subjectId+attemptNumber]` | Storage-level guarantee that two rows can never share an attempt number for one subject. This defends "attempt 1 is the first answer and is never replaced" against a duplicated or racing write. Rows without `attemptNumber` are not indexed. |
| `lesson_positions.&id`                        | Repository convention (`resume_points`, `progress_entries`) and the backup duplicate-ID check.                                                                                                                                                  |
| `lesson_positions.&itemId`                    | Enforces one current position per lesson item.                                                                                                                                                                                                  |

Deliberately absent: any index whose name matches `/programme/i`. The C7 guard in `tests/architecture/programmeScopeComposition.test.ts` ("adds no programme-ownership column or index to learner data") requires that every table except `catalogue_versions` and `programme_enrolments` has none. The proposed indexes comply, so that guard needs no edit and begins covering the two new stores automatically. Programme scoping of reads is by the stored `programmeId` field, filtered in memory (the volume is small: about 291 exercises with a few attempts each).

`programmeId` on these rows is a recorded identity field, not an ownership authority. Authorization still derives only from the registered programme definitions through the migration context, exactly as in C6; a row naming an unknown programme fails closed.

Because `&[subjectId+attemptNumber]` spans programmes, exercise and checkpoint IDs must be collision-free across registered programmes. The registry's existing collision rules cover catalogue, XP and achievement IDs; Epic E extends the content-provider validation to exercise and checkpoint IDs and proves it with a collision test (the 27 Programvareutvikling catalogue IDs are already proven collision-free against CS50; exercise IDs are new).

## 3. Store A: `learner_evidence`

One store, one discriminated record model. A record is immutable once committed.

Common fields (every kind):

| Field            | Rule                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`             | Client-generated, immutable, matching the existing lowercase `entityIdSchema`. Generated once per user action and reused on a retried write.                       |
| `kind`           | `exercise_attempt`, `support_event` or `checkpoint_result` (section 8 explains why there is no fourth kind now).                                                   |
| `programmeId`    | A registered programme with an enrolment row.                                                                                                                      |
| `contentVersion` | Positive integer, monotonic per programme, assigned by the content export (Package 21 DC-31).                                                                      |
| `subjectId`      | Lowercased stable exercise ID (for attempts and support events) or checkpoint ID (for checkpoint results). Reference by ID; authored text is never copied (DC-39). |
| `contentHash`    | Hash of the exercise, or checkpoint definition including its pass rule, as exported for `contentVersion`. Carried by the export; the app does not invent it.       |
| `recordedAt`     | ISO date-time. For ordering and analytics only. No logic compares it with a clock to open or close content or to age evidence (DC-40, INV-01).                     |

Kind-specific fields:

| Kind                | Fields                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exercise_attempt`  | `attemptNumber` (positive integer, per `subjectId`, monotonic across content versions); `responseMode` (one of the 13 authored modes); `answer` (JSON-safe payload validated per `responseMode`, bounded, see below); `outcome` (`correct`, `incorrect`, or `recorded` for modes that by design return no result, such as reflections and checklists); `matchedFeedbackKey` (optional, bounded); `hintsUsedMax` (non-negative integer, 0 for none; the highest hint revealed so far for this subject at the bound `contentHash`, cumulative so that an earlier reveal still marks a later attempt as supported); `teachingReopened` (boolean); `variantId` (optional, only where the content declares variants). |
| `support_event`     | `supportKind` (`hint_reveal` or `teaching_reopened`); `hintNumber` (positive integer, required exactly when `supportKind` is `hint_reveal`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `checkpoint_result` | `attemptNumber`; `criteria` (list of `{ criterion: c, d, r or x; skillId; level: NY, D or S }`); `passed`; `ruleId` (the authored pass rule it was judged under); `basisAttemptIds` (the attempt IDs it was computed from); `variantId` (optional).                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Answer bound: DC-11 requires a size limit for code submission. The proposed ceiling is 20,000 characters per answer, fixed and tested in Epic E. Backup size stays far below the 25 MB cap in realistic use (49 runtime-dependent exercises with a few attempts of about 2 KB each is of the order of one megabyte); Epic E must test an export with a synthetic maximal-realistic dataset and fail closed above the cap.

Role, evidence trust and evaluator mode are authored metadata and are looked up from the content at the bound `contentHash`. They are not copied into learner rows.

### 3.1 Invariants

1. **Append-only.** The repository exposes insert and read for this store. It exposes no update or delete. The only removal paths are the existing whole-database `resetAllData` and the atomic restore, which replace every table.
2. **First-answer immutability.** An attempt row is never altered. The first attempt of an exercise is `attemptNumber` 1 and is never replaced. "First attempt under content version V" is derived as the lowest `attemptNumber` whose `contentVersion` is V; numbering does not restart per version, which keeps the unique index valid.
3. **Retry is a new attempt.** A later attempt never replaces, edits or deletes an earlier one, and a later success deletes nothing.
4. **Idempotent submission.** The write transaction first looks up `id`. An existing row with the same canonical payload is a successful no-op that returns the stored row. The same `id` with a different payload fails closed. Otherwise the transaction assigns `attemptNumber` as the current maximum for the subject plus one and inserts. A double-click, a retry after a blocked write, or a replayed submit therefore cannot create a second attempt.
5. **Feedback follows durability.** Correctness and feedback are shown only after the attempt row commits. A tab that cannot commit (read-only tab, quota, blocked write) shows the existing honest unavailable state and no correctness, so a learner cannot see feedback, close the tab and answer again as a "first" attempt.
6. **A hint is shown only after its support event commits.** A read-only tab cannot reveal a hint. This is what stops support accounting being bypassed.
7. **Evaluator failures are not evidence.** `evaluator_error` and `not_evaluable` results (Package 21 DC-19, DC-20, EV-09, EV-14) are not persisted as attempts. They create no row, no negative evidence and no positive evidence, and the learner may retry. Persisting non-evidence outcomes is excluded from schema 4 on purpose: every derivation would otherwise have to remember to skip them.
8. **No mastery truth is stored.** `outcome` records what the evaluator returned for one answer. Skill state, readiness, retrieval due and progress percentages are derived by pure code from these rows plus the content version's rules, and are never persisted. A `checkpoint_result` is an immutable record of a judgement made at one time under a named rule on named attempts, not the current skill state. Derivation recomputes the judgement from `basisAttemptIds` and `ruleId`. A mismatch with the stored `passed` is treated as a defect and fails closed (cannot determine), never silently trusted.
9. **No checkpoint result without a rule.** No `checkpoint_result` row may be written under a pass rule that is not authored or owner-approved (section 12, dependency D-2).

## 4. Store B: `lesson_positions`

A mutable bookmark. One current row per lesson item.

| Field                          | Rule                                                                                                                                                            |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`, `createdAt`, `updatedAt` | Existing `timestampFieldsSchema` convention.                                                                                                                    |
| `itemId`                       | The catalogue item ID of the lesson (the lowercased mission ID). Unique across programmes by the registry's collision rules.                                    |
| `programmeId`                  | As above.                                                                                                                                                       |
| `contentVersion`               | The content version the position was recorded against.                                                                                                          |
| `unitId`                       | Lowercased authoring unit ID that contains the step.                                                                                                            |
| `stepIndex`                    | Zero-based index, in the exported lesson content, of the next step to land on (DC-06). Exact addressing is an Epic E implementation detail inside these bounds. |
| `phaseId`                      | Optional authored phase (pause point) the learner stopped at (DC-05).                                                                                           |

Rules: upsert by `itemId`; written on learner-driven advance, phase boundary, exercise submission and leaving the lesson, never on scroll and never on programme switch (C7 forbids manufactured writes on switch). A position is never read as evidence and never affects mastery.

The existing media-specific `resume_points` store is not reused. Its contract (`assetId`, `lastSecond`, `nextSliceId`, `updatedFromEventId`) cannot be generalized without semantic abuse.

## 5. Content-version and exercise-hash binding; mismatch and fallback

The app never combines new app code, stale curriculum content, evaluator rules from another content version and evidence bound to an older version without noticing. Rules:

1. The content provider (see the Epic E prompt) returns a lesson's content and the evaluator specification for its exercises together, as one bundle identified by `contentVersion`, the Programme #2 source SHA-256 and per-exercise `contentHash`. A bundle that does not agree with itself, or with the evaluator contract version the app implements, is `version_mismatch`: the exercise shows an honest unavailable state and nothing is evaluated.
2. Evidence counts toward derivations only when its `(subjectId, contentHash)` equals the current exercise's `(id, hash)`, regardless of its older `contentVersion`. This is the DC-31 default: evidence on an unchanged exercise carries over.
3. Evidence on an exercise whose hash changed is kept and shown as history, but is not counted for any gate until the learner re-attempts. It is never deleted or rewritten.
4. Evidence for an exercise ID that no longer exists is kept and inert.
5. Evidence whose `contentVersion` is higher than the content the app carries (a stale app reading newer data) is not interpreted. Derivations that depend on it report "cannot determine" and offer the existing refresh path. Nothing is deleted.
6. A `lesson_positions` row bound to a different content version resolves to the unit start if the unit ID still exists in the current content, otherwise to the mission start, with neutral copy. The row is rewritten on the next advance.

DC-31 says the exact carry-over rule is an owner decision. Rules 2 and 3 are DC-31's own default and the fail-safe choice; the owner confirms or changes them when accepting this record.

## 6. Upgrade: schema 3 → schema 4

Inside one Dexie version-change transaction:

- `this.version(4).stores({ …schema-3 definitions, learner_evidence, lesson_positions })` with an upgrade function whose only write is `app_meta.schemaVersion = 4` on an existing row.
- **Additive only.** The two new stores start empty. No existing row is migrated, rewritten or deleted; every other row stays byte-identical. No XP, achievement or enrolment is written.
- No programme attribution happens, so C6 binding controls 1 and 2 do not apply to this step. The migration context is still required to open the database, unchanged. A v1 or v2 database upgrades through 3 to 4 in the same transaction using the existing C6 step; an abort in that step leaves the old database intact.
- A failed upgrade (for example storage quota) aborts atomically and leaves schema 3 intact.
- There is no automatic downgrade. An older application cannot open a schema-4 database. This is the existing no-downgrade posture (C6 §7) and arises only once Epic E ships.
- `initializeDatabase` already rewrites `app_meta.schemaVersion` when it differs from `currentDatabaseSchemaVersion`; that path stays consistent.

## 7. Backup, restore, schema-3 conversion, reset

- Envelope format stays 1. Exports carry `schemaVersion` 4. `BackupData` gains `learnerEvidence` and `lessonPositions`; `BackupSummary.counts` gains both; `idBearingStoreKeys` gains both so the duplicate-ID check covers them.
- **Schema-3 backup conversion.** A schema-3 backup converts forward through one pure step that adds both arrays empty and sets `schemaVersion` 4, then passes the same full validation as a native schema-4 backup. A schema-2 backup converts 2 → 3 → 4 by composing the existing pure conversion with the new step; there is no second independent 2 → 4 implementation. The hard-coded schema-2 branch in `envelope.ts` (`candidate.schemaVersion === 2 && options.expectedSchemaVersion === 3`) is the known change point. Any other version keeps the existing "different data version" rejection.
- **A schema-4 backup in a schema-3 application** is rejected with the existing "different data version" message.
- **Backup invariants for the new stores (a backup's claims are never trusted):** unique `id`; unique `[subjectId+attemptNumber]` among rows that have it; `programmeId` registered and enrolled; kind-specific field rules (`hintNumber` present exactly for `hint_reveal`); `checkpoint_result.basisAttemptIds` resolve to attempt rows in the same backup; one `lesson_positions` row per `itemId`, naming an item that exists in the backup's `courseItems` under the same programme. `subjectId` cannot be checked against `course_items` because exercises are nested content, not catalogue rows. An unknown `subjectId` is inert at derivation time.
- **Restore** remains atomic replace-all with rollback; both stores are inside it. Restoring a schema-3 backup empties both stores, as it replaces every other table. Epic E verifies that the existing confirmation copy and preview make that replacement visible for evidence.
- **Reset.** `allDataTables(database)` in `src/lib/db/repositories.ts` gains both tables, so `resetAllData` and the snapshot cover them. Programme switching writes nothing to them.

## 8. ProjectArtefact semantics

A `ProjectArtefact` is not an `ExerciseAttempt`. Package 21 (`04` contract, DC-37) defines it separately as submitted lab, quest or checkpoint construction work with an identity, a revision number, bounded source text and links to attempts. This record preserves that distinction.

**Determination for the currently authored slice: no revision-bearing artefact workflow is required.** Basis (read-only inspection of the product content, `pilot.json` SHA-256 `577cd120b514d3df1445380e516916e1816dac16467311171d28764df7d96bc5`):

- Every lab and quest `program` item takes a pasted single source text, evaluated on its own by authored tests and structure checks (DC-11). The learner's file lives in their own editor. `file` is a filename label.
- No authored exercise field links an exercise to a prior revision, and none requires the app to supply, prefill or diff the learner's earlier source. Change-request items (`S1-M02-Q01-E07`, `S1-M02-CHK-E03`) enforce "the rest is as before" through test outputs and a structure check such as `total = antall * pris`, not through comparison with a stored earlier submission.
- Package 21 scenario "learner edits a project after feedback" (readiness verdict, scenario 11) is satisfied by a retry: a new `exercise_attempt` carrying the new source text, with the first attempt preserved. The attempt `answer` already holds the bounded source text.
- Git history lives on the learner's machine; Git evidence in the app is self-reported and non-counting (DC-12, DC-33).

Consequence:

- The `ProjectArtefact` concept stays part of the authoritative broader contract. It is not redefined away.
- Its concrete persisted representation is **deferred until an authored slice requires it**. Epic E checks the real export at E0 for any exercise that depends on the app holding the learner's previous source (a prefill, a diff or an explicit revision link).
- If one is found, the minimal representation is an additive append-only `project_artifact_revision` record kind in `learner_evidence` (fields: artefact identity, revision number, bounded source text, linked attempt IDs), requiring a recorded amendment to this record. It is not a third store, because the kind needs no new index. Creating a third store merely because the concept exists is rejected.

## 9. Multi-tab coordination

The existing Web Locks single-writer coordinator (`src/lib/storage`, `docs/storage-safety.md`) is store-agnostic and adds no table. Both stores are covered by the same rules: only the writer tab commits evidence, support events or positions; other tabs are read-only and reread after an ownership transfer or a peer-announced revision; repository mutations announce one revision after the enclosing transaction commits; a browser without Web Locks fails closed for writes. New repository writes must go through the same coordinated-write boundary. A submit or hint reveal that is blocked shows the existing coordination copy and leaves no partial state (invariants 5 and 6). A retried submit reuses its `id` (invariant 4).

## 10. Known test and oracle changes caused by the schema version change

Read at the R4 baseline. The RED run at the start of Epic E produces the authoritative list; any oracle change not listed here is disclosed in the Epic E accepted-oracle table, and none may be weakened.

| File and assertion                                                                                                                                                                                                                                                  | Change                                                                                                                                                                                                                                                     | Class                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `tests/architecture/programmeScopeComposition.test.ts`, "stays on schema v3 with exactly the three declared versions"                                                                                                                                               | `currentDatabaseSchemaVersion` 3 → 4; declared versions become `version(1)`…`version(4)`; `verno` 3 → 4                                                                                                                                                    | Certain; still an exact enumeration      |
| `tests/architecture/programmeScopeComposition.test.ts`, "adds no programme-ownership column or index to learner data"                                                                                                                                               | None; the new stores comply and become covered                                                                                                                                                                                                             | Unchanged by design                      |
| `tests/db/databaseInitialization.test.ts`, "keeps database identity and schema independent of the application version"                                                                                                                                              | `toBe(3)` → `toBe(4)`; database-name pin unchanged                                                                                                                                                                                                         | Certain                                  |
| `tests/db/localWriteCoordination.test.ts`, native-version pins (`toBe(30)`) and `schemaVersion: 3` expectations                                                                                                                                                     | 30 → 40 and 3 → 4 where they describe a current database; the `toBe(10)` v1 pins stay                                                                                                                                                                      | Certain, per occurrence                  |
| `tests/features/settings/backupRecoveryComposition.test.tsx`, `schemaVersion: 3` after restore                                                                                                                                                                      | → 4                                                                                                                                                                                                                                                        | Certain                                  |
| `tests/features/rpg/a7RouteAccess.test.tsx`, `Object.keys(before)).toHaveLength(16)`                                                                                                                                                                                | 16 → 18 (snapshot gains two tables)                                                                                                                                                                                                                        | Certain                                  |
| `tests/db/migrations.test.ts`, table-name `arrayContaining`                                                                                                                                                                                                         | Add the two store names; assertion otherwise unchanged                                                                                                                                                                                                     | Additive                                 |
| `tests/lib/backup.test.ts`, "rejects a schema-2 backup when the app expects schema 3 and no migration context is supplied"; `tests/preservation/migrationRestoreEquivalence.test.ts` and `tests/db/migrationV2ToV3Adversarial.test.ts` (`expectedSchemaVersion: 3`) | Retarget to the current expected version; keep the full-state equality assertions; add schema-3 → 4 conversion tests and extend the upgrade-versus-restore equivalence to schema 4 (restore of a v2 backup equals a v2 database upgraded through v3 to v4) | Parameter-bound; strength-preserving     |
| `tests/preservation/c1BaselineFixture.test.ts`, `tests/lib/backupActiveProgramme.test.ts`, `tests/db/repositories.test.ts` (restore and snapshot equality)                                                                                                          | Full-snapshot comparisons gain `learnerEvidence: []` and `lessonPositions: []`; `schemaVersion` literals are already `currentDatabaseSchemaVersion`                                                                                                        | Additive; to be confirmed by the RED run |
| `tests/db/migrationV2ToV3Adversarial.test.ts`, native-version `toBe(20)` after an aborted upgrade                                                                                                                                                                   | Expected unchanged (an abort in the 2 → 3 step leaves native 20); confirm in the RED run                                                                                                                                                                   | Unchanged by design                      |
| `tests/db/repositories.test.ts` line 1727, `Object.keys(snapshot)).toHaveLength(db.tables.length)`                                                                                                                                                                  | None; dynamic                                                                                                                                                                                                                                              | Unchanged by design                      |

Fixtures that merely carry `schemaVersion: 3` as parse input (for example in `profileModel`, `onboarding`, `migrationV2ToV3`) stay valid because `AppMetaSchema.schemaVersion` is any positive integer.

New tests Epic E must add first (RED): schema-4 upgrade is additive and leaves schema-3 rows byte-identical; the unique `[subjectId+attemptNumber]` index rejects a duplicate attempt number; idempotent submit returns the same row and rejects a changed payload under the same `id`; the repository exposes no update or delete for `learner_evidence`; support events and attempts survive restore and reset coverage; schema-3 and schema-2 backups convert and restore to the same state as a database upgraded in place; a schema-4 backup is rejected by the schema-3 rule; evidence with an unknown programme or dangling `basisAttemptIds` is rejected; version-mismatch and fallback rules in section 5.

## 11. Future synchronization compatibility (nothing is implemented)

ProgressPal is intended to end as an installable PWA with local durable state first and, possibly, an account-backed copy later. Schema 4 is shaped so that later synchronization is not made harder, without implementing any of it:

- Evidence rows carry client-generated immutable IDs, `programmeId`, `contentVersion` and exercise or checkpoint identity, so a later sync layer can merge them as a grow-only set by ID.
- Mastery stays derived, so a remote copy can never redefine what an attempt or a skill state means.
- The only mutable surface is the small `lesson_positions` row, which already has `updatedAt` for last-writer resolution.
- No device identifier, sync cursor, tombstone, account or remote field is added now. A later sync decision would add its own state and record.

Firebase, Supabase, authentication, cloud persistence and cross-device synchronization are out of scope.

## 12. What this record does not decide

- **D-1. Owner acceptance** of schema 4 as proposed, including store names, the answer-size ceiling, the DC-31 carry-over default in section 5, and the choice in invariant 7 not to persist `evaluator_error` and `not_evaluable` results.
- **D-2. The checkpoint pass rule (Package 21 gap K-4).** The authored content states no rule for how a skill's gate items combine into a criterion level. A checkpoint judgement cannot be implemented or recorded until a rule is authored or owner-approved as content metadata. The app executes a rule; it does not invent one. Invariant 9 depends on this.
- **D-3. The retry rule and variants for gate items (K-3).** Package 21 leaves open whether a retry re-presents the same item with a fresh shuffle or needs authored variants. `variantId` is optional so either answer fits without a schema change.
- **D-4.** The application version number for the Epic E candidate follows the existing version and `CACHE_VERSION` coupling rule and is not decided here.
