Implement Module 12: XP engine for ProgressPal CS50 Edition.

Use these controlling docs in order:

1. docs/modules/module-12-plan.md
2. PROJECT_STATE.md
3. MODULE_CHECKLIST.md
4. VALIDATION_LOG.md
5. CHANGELOG.md
6. DECISIONS.md

Hard constraints:

- Do not proceed to Module 13.
- Do not change Dexie schema version.
- Reuse the existing xp_transactions store exactly as-is.
- XP transactions must be immutable.
- totalXp, level, and xpToNextLevel must be derived only.
- Do not store level or total XP as authoritative state.
- Do not implement achievements, dashboard metrics, insights, charts, backup, import, or reset.
- Do not award XP for app-open, reload, navigation, or any passive behavior.
- XP calculation itself must not mutate study_sessions, progress_entries, media_progress_events, content_slices, or resume_points.
- XP-aware wrappers may perform the intended source write first, then derive and write only the missing xp_transactions.
- XP side effects must never mutate any source-event store after the source write has completed.
- Do not implement XP revocation or negative XP.

Atomicity rules:

- The source event remains the source of truth.
- XP writes are deterministic side effects derived from that source event.
- If the source write fails, no XP is written.
- If an XP transaction already exists for the same sourceType/sourceId, skip it without failing the source write.
- Use one Dexie transaction for each wrapper wherever feasible.
- If a wrapper cannot be fully atomic because of a real Dexie limitation, stop and document the reason, then add a regression test proving duplicate-safe rerun behavior.

Level rules:

- PROJECT-BRIEF.md is authoritative for Module 12.
- Implement only: level = floor(sqrt(totalXp / 100)) + 1
- Implement xpToNextLevel from that square-root curve only.
- Do not implement threshold tables or configurable level curves.
- Add a DECISIONS.md entry recording that WORKFLOW.md threshold tiers are deferred.

Implement these public repository surfaces:

- listXpTransactions()
- getXpSummary()
- upsertProgressAndAwardXp()
- logMediaProgressAndAwardXp()
- addStudySessionAndAwardXp()

Return shapes:

- XpSummary = { totalXp, level, xpToNextLevel, currentLevelFloorXp, nextLevelXp }
- UpsertProgressWithXpResult = { progressEntry, awardedTransactions, xpSummary }
- LogMediaProgressWithXpResult = existing LogMediaProgressResult + { awardedTransactions, xpSummary }
- AddStudySessionWithXpResult = { studySession, awardedTransactions, xpSummary }

Implement these Module 12 XP sources only:

- 25+ minute study session: +10 once per saved session
- unique 10-minute long-form coverage blocks: +4 per newly crossed 10-minute block per asset, using interval union
- completed content slice: +10 once per slice
- clean stop after 15+ minutes with stopReason reached_limit or completed_slice: +5 once per media event
- problem_set_started: +20 once when a problem_set first reaches one of started, blocked, completed, submitted, accepted
- problem_set_started must not award for not_started or skipped_optional
- problem_set_submitted: +75 once per item when first reaching submitted or accepted
- problem_set_accepted: +125 once per item when first reaching accepted
- lecture completed: +40 once per item
- section completed: +20 once per item
- shorts completed: +15 once per item
- practice completed: +30 once per item
- notes completed: +15 once per item
- reflection completed: +15 once per item
- required week unit completed: +150 once per unit, using the existing required-item completion semantics
- final-project-build completed: +250 once
- final-project-readme + final-project-video-demo both completed: +200 once combined

Explicitly defer these XP sources:

- blocker named
- blocker resolved
- resume previous long-form item
- review XP caps
- reading completion bonus
- lab-specific XP
- final project planning bonus
- final-project-submit50
- final-project-gradebook-check
- special-unit and final-project-unit completion bonuses

Implementation defaults:

- Use deterministic sourceType + sourceId pairs for duplicate prevention.
- Use deterministic transaction ids derived from sourceType + sourceId.
- Do not run any startup backfill that writes XP on app open.
- Award XP only from explicit save flows by switching current route code to XP-aware repository wrappers.
- Never revoke, delete, or subtract XP in Module 12 after a status downgrade.

Required tests:

- 0 XP -> level 1
- 99 XP -> level 1
- 100 XP -> level 2
- 399 XP -> level 2
- 400 XP -> level 3
- 900 XP -> level 4
- 1600 XP -> level 5
- monotonicity across a broad XP range
- level is never persisted as source of truth
- duplicate evaluation does not duplicate XP
- overlapping media intervals do not over-award
- complete/uncomplete/recomplete does not farm XP
- source failure writes no XP
- existing XP transaction for the same source skips safely
- app reload with no new source events writes no XP

Validation:

- Run the full validation suite.
- Achieve three consecutive clean full passes.
- Update VALIDATION_LOG.md with failed attempts, fixes, adversarial findings, retrospective, and the final triple-zero passes.

Final output must contain:

- changed files
- tests added
- validation result
- confirmation that Dexie schema stayed version 2
- confirmation that xp_transactions was the only store written by XP calculation
- confirmation that level was derived only and never persisted
- confirmation that achievements, dashboard metrics, and insights were not implemented
- confirmation that Module 12 did not implement XP revocation or negative XP
