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
