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

Cross-tab write safety lives in `src/lib/storage`. Repository mutations check
that coordinator at the outer transaction boundary; nested writes announce one
revision only after the enclosing transaction commits. The protocol adds no
IndexedDB table or schema migration. See `docs/storage-safety.md`.
