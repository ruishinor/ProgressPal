# Git & GitHub local pilot

Independent programme git-github, catalogue/definition git-github-2026.
The existing CS50x default, shared hero, per-programme state, schema 5 and
backup envelope 1 remain unchanged.

source.mjs is canonical, originally authored Bokmål content, used only at
export time. It contains five complete beginner lessons and the honest future
roadmap. It is never imported into the browser JavaScript graph. The initial
sequence requires no other programme, GitHub account or programming experience.
Windows PowerShell 5.1, Git 2.28+ and Notepad are the declared learner tools.

After an edit, format the source and run:

    node scripts/git-github-content.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Content export failed' }
    node scripts/git-github-content.mjs --check
    if ($LASTEXITCODE -ne 0) { throw 'Content export differs' }

The exporter writes the small bundled content/catalogue.json, hash-addressed
module/index JSON in public/content/git-github/ and this programme's entries
in the shared public/content/offline.json. It preserves other programmes.
The existing provider verifies bytes, schema, source and exercise hashes.
Unknown files in its generated asset folder fail closed.

There are no catalogue XP rules and no lesson XP policy. Checked choices and
the optional pasted filename list use existing deterministic evaluators.
Pasted output is not authenticated. Checklist/reflection use recorded,
never correct. Manual catalogue completion means reviewed content only.
No skill is a mastery gate; no new rewards or persistence entities exist.

Stable item/subject IDs are programme-prefixed. Changed exercise content
changes its hash; earlier evidence remains historical. Content version 1
binds saved positions. Increment content version for a future structural
revision and regenerate; do not silently reuse IDs for different activities.
Future roadmap topics are text, not registered empty lessons or progress.

Technical references checked 2026-11-03: official
[Windows installation](https://git-scm.com/install/windows),
[add](https://git-scm.com/docs/git-add),
[restore](https://git-scm.com/docs/git-restore),
[status](https://git-scm.com/docs/git-status), and
[PowerShell 5.1 paths](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_path_syntax?view=powershell-5.1).
Real reproduction and limitations are recorded in the pilot handoff.

## M02 and compatibility (2026-11-05)

M02 is authored in m02.mjs (six lessons, 12 exercises). M01 stays in source.mjs
(five lessons, seven unchanged exercise IDs and evaluators). Both feed the
existing git-github-content.mjs exporter. Only real lessons become catalogue
nodes. Future M05–M07 are text-only roadmap; no extra schema or learning engine.

Course catalogue dataVersion advances from 1 to 2 so an already enrolled
learner gets new M02 rows when the selected M02 lesson is opened. The separate
contentVersion remains 1: saved M01 positions and attempt bindings retain
their original version and stable ID. M01 source copy changes affect the global
source/asset hashes, not the unchanged M01 exercise hashes. The exporter
recalculates the index and both module assets and checks them for consistency.

After applying the source patch and formatting changed files:

    node scripts/git-github-content.mjs
    node scripts/git-github-content.mjs --check

The PowerShell 5.1 learner fixture must also be executed on Windows; a Git
fixture on another OS is not equivalent. No GitHub login, live Git inspection,
new XP mechanism or certification is added.

## M03 — Brancher og merge (2026-11-05)

Six lessons and 13 exercises are authored in m03.mjs. Course catalogue
dataVersion advances to 3. Content/evaluator version remains 1, and M01/M02
exercise IDs stay stable. No new tests, schema, services, XP rules or external
GitHub validation. Existing content generator, integrity checks and offline
manifest cover M04. M05–M07 are planned only.

Release review, CI, master certification and production alias require separate
verification. Git fixture on Linux does not establish PowerShell 5.1 success.
