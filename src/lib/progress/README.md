# Progress Engine

This folder contains the shared long-form progression logic introduced in
Module 09.

Current responsibilities:

- derive stable local content-asset identifiers from eligible seeded course
  items
- generate deterministic time slices from estimated long-form durations
- merge overlapping watched ranges through interval union
- build read-only watched-time and resume summaries from immutable media events
- present saved progress statuses with shared labels and display variants
- assemble item-keyed long-form progress maps for course, dashboard, insights,
  and RPG reads using the same engine and stable asset/event/slice ordering

Still deferred:

- user-facing logging forms and the content-detail route
- study-session orchestration
- XP, achievements, import/export, and reset logic
