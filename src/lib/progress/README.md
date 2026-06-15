# Progress Engine

This folder contains the shared long-form progression logic introduced in
Module 09.

Current responsibilities:

- derive stable local content-asset identifiers from eligible seeded course
  items
- generate deterministic time slices from estimated long-form durations
- merge overlapping watched ranges through interval union
- build read-only watched-time and resume summaries from immutable media events

Still deferred:

- user-facing logging forms and the content-detail route
- study-session orchestration
- XP, achievements, import/export, and reset logic
