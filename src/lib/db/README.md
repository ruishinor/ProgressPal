# Database Layer

This folder now contains the Dexie-backed local persistence layer for
ProgressPal.

Current responsibilities:

- versioned IndexedDB schema definitions
- migration logic
- initialization helpers for singleton records
- repository functions for the first persisted entities
- non-destructive sync of the bundled CS50x course catalog into local stores
- long-form asset derivation, slice generation, immutable media-event logging,
  and resume-point persistence for eligible seeded items
- atomic backup restore, reset, rollback, and export/import audit records
- schema v4 (Epic E, accepted E-SCHEMA-1): the append-only `learner_evidence`
  log (immutable `exercise_attempt`, `evaluation_result`, `support_event`
  and `checkpoint_result` rows; `learnerEvidence.ts`) and the mutable
  `lesson_positions` bookmark. An attempt commits before it is evaluated, its
  one terminal result commits afterwards in the same logical write scope, and
  nothing about mastery is stored. The live v3 → v4 upgrade is additive; the
  backup baseline is native schema 4 (older exports are refused clearly)

Cross-tab write safety lives in `src/lib/storage`. Repository mutations check
that coordinator at the outer transaction boundary; nested writes announce one
revision only after the enclosing transaction commits. The protocol adds no
IndexedDB table or schema migration. See `docs/storage-safety.md`.

Activity candidate (2026-10-25, local only): schema 5 adds `activity_entries`,
`activity_definitions`, `activity_settings` and `activity_days`. The live v4
upgrade creates these empty and changes only the app metadata's schema number;
all existing educational data is preserved. `activity.ts` uses the existing
coordinated-write boundary. All four stores participate in complete snapshots,
atomic restore, rollback and reset. The revised owner decision requires native
schema-5 exports; older exports are refused before writes. No stored Activity
totals, level counter, educational XP or additional browser database is added.
