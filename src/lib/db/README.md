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

Still deferred to later modules:

- user-facing backup import and export flows
- reset UI and destructive recovery actions
