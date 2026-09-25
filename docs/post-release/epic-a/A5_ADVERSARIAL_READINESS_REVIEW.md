# A5 Multi-perspective / adversarial readiness review

Date: 2026-09-21  
Verdict: **PASS to RED-only**

## Project management / scope control

The story is now sufficiently bounded. The actual target is the Focus child read boundary and its interaction with the accepted A4 HUD, not a broad “make Focus faster” effort. The main scope risk is absorbing the shared save/achievement mutation engine because it also touches accumulated history during an explicit write. That would mix a passive-read story with a different mutation-scaling problem and should be rejected unless a separate defect is proved.

The next owner gate is valid RED, not implementation. A5 documentation integration and branch creation should remain local and controlled; no push/merge/deploy is implied.

## UX / product semantics

The full saved-session ledger is intentional visible product data. Pagination, truncation, filtering to selected `itemId`, or replacing it with aggregate counts would solve the wrong problem. The read boundary must preserve complete newest-first history, title/label/fallback semantics, selected-item prefill/lock behavior, and the distinction between logging effort and marking coursework complete.

Post-save partial failure is also user-visible semantics: a committed session must remain committed and acknowledged even when the ledger or HUD refresh fails. Retry must repair the read view, not replay the write.

## UI implementation perspective

No UI redesign is required for A5. The RPG disclosure, timer/manual entry forms, error states, save feedback, and ledger row content can remain structurally unchanged. The implementation seam should be below the visible component where possible, so architecture work does not create gratuitous visual churn.

The visible row count itself is useful evidence: it separates legitimate O(H) product rendering from forbidden hidden complete-source arrays.

## Data engineering / persistence perspective

The current passive child path does more complete-history representation than necessary: IndexedDB `toArray()` materializes all source session records, parsing/sorting clones complete arrays, and the UI then creates the complete visible projection. A streaming/cursor read that projects directly into retained visible rows can preserve O(H) scan and O(H) visible memory while eliminating hidden source-array materialization.

No schema migration is justified. The ledger requires every session anyway. Existing `startedAt` access plus in-memory ordering of the retained visible rows can preserve `startedAt DESC, id DESC`; a composite index is an optimization decision, not a readiness prerequisite.

A coherent child transaction over units/items/sessions is preferable to independent `Promise.all` repository calls because item/unit titles and selected-item resolution belong to the same published child state.

## Testing / QA perspective

The highest-risk failure is a false RED. The probe must be attached before the measured reader opens, and fixture creation must happen through a separate uninstrumented writer. The test must invoke real repository access from the actual Focus component composition.

Tests need single primary roles. Semantic ledger tests should not carry DBCore mutation instrumentation. Scale evidence must report setup duration separately from focused read duration, and the 10k case needs a deliberate timeout. Post-save tests should distinguish mutation success from ledger-refresh and HUD-refresh success.

## Adversarial review

Ways a superficially green A5 could still be wrong:

- remove/narrow `loadRpgFocusSessionSummary()` while the route still calls `listStudySessions().toArray()`;
- stream sessions but build another hidden full `StudySession[]` before the visible rows;
- move full session materialization into `RpgShell` or the HUD and claim the child is narrow;
- reduce hidden history by truncating/paginating the visible ledger, violating product semantics;
- mock repository reads in the route test so DBCore never observes the production path;
- install the probe after Dexie opens, making access evidence incomplete;
- include fixture writes in the probe and misclassify them as route writes;
- call O(H) scanning “constant time” because source materialization is zero;
- rerun the save on refresh failure and create duplicate sessions/XP;
- add a schema/index migration merely to simplify implementation.

The acceptance contract blocks each of these explicitly.

## Retrospective / process perspective

A1–A4 lessons have been converted into concrete A5 harness rules before RED: source-schema fixture validation, separate writer/reader, pre-open instrumentation, actual-route ownership, test-role separation, visible-vs-hidden materialization metrics, and recurrence escalation.

No documented recurrence is present in the readiness work itself. If any of those failure classes appears during RED execution, it should be marked `RECURRENCE` rather than treated as an ordinary test repair.
