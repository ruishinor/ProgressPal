# B2 handoff — long-form progress map ownership

> **Historical record.** This describes the state at the time it was written. The live state, baseline and next steps are in [`docs/CURRENT_STATE.md`](../../CURRENT_STATE.md). Retained unchanged as evidence.

Move `buildLongFormProgressMap` and
`buildLongFormProgressMapFromEventAggregates` from progress/model to
`lib/progress`, alongside the existing long-form engine. Move their private
sorting/grouping helpers only when required by those builders; keep UI detail
projection and stop-reason labels in progress/model. Use the existing
`LongFormProgressView` rather than introducing a second shape. Preserve the
progress feature's exports for compatibility while moving all live course,
dashboard, insights and RPG map consumers to the neutral owner.

Preserve sorting, first asset per item, no-duration handling, legacy completion
and event-aggregate parity. Use the existing progress model tests and affected
course/dashboard/insights/RPG tests. Run typecheck, lint, format and cycle
checks. Inspect actual import direction and moved implementation before B2
commit and B3 work.
