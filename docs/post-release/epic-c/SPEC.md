# Epic C — programme platform

Epic C makes ProgressPal able to host more than one study programme without
changing what the CS50x learner sees, earns or has saved. The runtime
direction is: active programme → validated `ProgrammeDefinition` → shared
engine → shared shell. C0 validated that direction against the source and
corrected it in three ways: the definition is split by consumer layer (core
rules, content, presentation); lib engines receive programme rules as
parameters instead of importing a programme; and the active programme is
resolved once and passed explicitly, never read inside passive RPG read
transactions.

The structure stays `Programme → Unit → Item`. A programme described as
modules and tasks reuses that shape; "week", "problem set" and "final project"
become CS50 terminology and policy, not engine structure.

Freeze for every story unless its contract says otherwise: displayed values,
ordering, labels, completion semantics, XP amounts and source keys,
achievements, unlocks, saves, reloads, routes, Classic/RPG shared capabilities
and visual output. CS50 identifiers and the database name are never changed.

Stories C1–C5 need no schema change and no owner product decision. C6
(persistence ownership and schema migration) is gated on owner decisions
OD-1 to OD-5 and an accepted schema decision record. C7 (registry and
switching) and C8 (theme and assets) follow. `stories.yaml` is the story list;
the C0 records hold the evidence. Out of scope: building a second programme's
content, Firebase or cloud persistence, and UI, navigation or HUD redesign.

Each story ends as a clean local commit for owner review. No push, merge, tag,
deployment or remote change is authorized by any Epic C record.
