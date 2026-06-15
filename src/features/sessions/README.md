# Sessions Feature

Module 11 adds one bounded `/sessions` route for append-only study-session logging.

Scope:

- live study-session timing with start, pause, resume, finish, and discard
- manual study-session entry
- reverse-chronological session ledger backed by `study_sessions`

Hard boundaries:

- every saved session must reference one existing course item
- `unitId` must match the selected item's `unitId`
- unfinished timers are never persisted
- session flows never mutate progress, media, slice, resume, XP, achievement, or backup stores
- no edit or delete surface
