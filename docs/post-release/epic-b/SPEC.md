# Epic B — feature-neutral shared application contracts

Epic B moves only shared contracts whose semantic owner is below feature
modules. Correct ownership is the acceptance goal; import count is evidence
only. All visible values, ordering, completion semantics, XP, achievements,
unlocks, saves, reloads, routes and shared Classic/RPG capabilities are frozen.

B1 moves generic minute formatting and progress-status presentation. B2 moves
long-form progress map assembly beside its existing engine. B3 sources the
session save result from its existing DB write contract. B4 verifies the
aggregate. `B0_PLANNING_RECORD.md` freezes exact moves and evidence.

The shared avatar, achievements, sessions, insights and settings surfaces stay
shared. Course map and detail/form implementations stay course-owned because
they embed programme-shaped labels or workflow rules. CS50 links and
achievement-category labels wait for Epic C. No schema, programme model,
visual, route, service-worker, cloud or dependency change is in scope.

Each story must pass its contract before the next begins. Stop for the
architectural and safety blockers in the owner objective; ordinary failures
introduced by a story are diagnosed and repaired inside that story. Work ends
as a clean local branch for owner review, without push, merge or deployment.
