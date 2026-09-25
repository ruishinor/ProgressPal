# B2 closure — shared long-form map contracts

Status: **PASS_READY_FOR_B3**.

Both item-keyed long-form map builders and their ordering helpers moved from
progress/model to `lib/progress/map.ts`. The progress feature keeps re-exports
and the existing `CourseLongFormProgress` alias for compatibility. Runtime
course, dashboard, insights and RPG map consumers use `lib/progress` directly;
their view types use the existing `LongFormProgressView` without a duplicate
shape. The progress feature still owns slice-level detail and stop-reason
presentation. Shared slice/event sorting has one implementation.

Evidence:

- Focused Vitest: 12 files, 132 tests passed, 0 failures, skips or retries.
  The run covers the progress engine/model, course/detail, dashboard, insights,
  RPG read models, Map/Module/Resource read boundaries, A7 aggregate
  preservation and the RPG architecture test. A new assertion checks that
  both map paths select the first _ordered_ asset for an item.
- `npm run typecheck`, `npm run lint`, `npm run format:check`: passed.
- `npm run check:circular`: passed, 0 cycles in 215 analyzed modules.
- `git diff --check`: passed.

Diff/source review found the builder bodies moved unchanged, no feature import
from lib, no second implementation and no changed long-form view contract.
The existing tests still import the progress feature's compatibility alias,
which also passed typecheck. No UI, data, schema, route, XP, achievement,
service-worker, network or dependency change is in B2.
