# ProgressPal RPG v2 — Restart Prompt

Use this prompt when starting a new AI/code-agent chat for RPG v2 implementation.

---

## Prompt

```text
You are working on ProgressPal RPG v2.

Operating standard:
No bias. No bullshit. No overbuild. Build only what the current module requires. Every change must be justified against the source-of-truth roadmap, accepted decisions, or failing tests.

Repository goal:
Build an RPG-themed /rpg/* route tree over the existing ProgressPal v1 CS50x local-first engine. Do not rewrite the engine.

Current product reality:
ProgressPal v1 is a working local-first CS50x study tracker using Vite, React, TypeScript, React Router, Dexie/IndexedDB, Zod, local CSS tokens, Vitest, Playwright, and existing validation scripts. v1 is the engine and fallback UI.

Branching:
Work on branch rpg/v2 from freeze tag v0.21.0-ux-complete. Keep main/master stable. Do not create a new repo unless explicitly instructed.

Active source of truth:
1. docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
2. docs/rpg-v2/DECISIONS-rpg-v2.md
3. docs/rpg-v2/VALIDATION_LOG.md
4. docs/rpg-v2/MIGRATION_CONTRACT.md
5. docs/rpg-v2/ASSETS.md
6. docs/rpg-v2/RISK_REGISTER.md
7. docs/rpg-v2/VISUAL_TARGET.md

The old root DECISIONS.md was intentionally deleted unless the project owner says otherwise. Do not restore it by default. Do not depend on it as active authority.

Hard constraints:
- Same repo by default.
- Same origin.
- Same IndexedDB.
- Add /rpg/* routes only when the relevant module begins.
- Classic routes must keep working.
- No backend.
- No cloud sync in v2.
- No auth.
- No analytics.
- No schema change.
- No embedded external course content.
- No runtime external course-data fetching.
- Official course resources open only through user-clicked outbound links.
- No CS50/Harvard branding misuse.
- Default guild is Code Knights, not CS50 Knights.
- Rank is derived from local required-course progress.
- Class/path is CS Foundations / Generalist for v2.
- No fake RPG mechanics.
- No direct database access from RPG UI components.
- No assets without docs/rpg-v2/ASSETS.md entry.
- Do not import the whole visual asset library.
- No overbuilding.
- No “while I am here” refactors.
- Every module handoff must include a Scope Discipline Check.

Anti-overbuild questions:
Before adding anything, ask:
1. Does this need to be here?
2. Is this required to reach the intended endstate for this module?
3. Is this required by the source-of-truth roadmap, an accepted decision record, or a failing test?
4. Does this preserve the v1 engine contract?
5. Does this preserve same-origin /rpg/*, no backend, no schema change, no embedded content, and Level 1 local-first behavior?
6. Does this introduce a dependency, asset, runtime request, data store, preference, route, abstraction, or styling system that the current module did not ask for?
7. Can this be done with existing code, existing styles, existing data, or a smaller local component?
8. Would a future maintainer understand why this was necessary from the module acceptance criteria alone?

If the answer to questions 1, 2, or 3 is no, do not build it.
If the answer to question 6 is yes, stop and justify before coding. If it changes product scope, write or update a decision record first.

Start with the current module only:
Do not scaffold future modules.
Do not create dead files.
Do not create broad abstractions before two real use cases exist.
Do not edit unrelated files.
Do not silently fix unrelated issues.

RPG-00 rules, if this is the first module:
- Create docs/rpg-v2/ if missing.
- Add/update source-of-truth roadmap, decisions, migration contract, asset ledger, risk register, validation log, visual target, restart prompt.
- Create docs/rpg-v2/modules/.
- Reconcile intentional deletion of root DECISIONS.md if applicable.
- Inventory root Markdown files and archive stale v1 planning docs under docs/archive/engine-v1/.
- Run validation and record results.
- Do not edit src/**.
- Do not edit package.json or package-lock.json.
- Do not add assets.
- Do not add routes.
- Do not create src/features/rpg/.
- If baseline validation fails, stop and report exact blockers. Do not proceed to RPG-01.
- Do not add convenience tooling, dependencies, assets, route changes, or speculative future scaffolding during RPG-00.

Validation gate:
Run the repo's full validation scripts, expected:
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm run audit

If npm run audit cannot run because of network/environment restrictions, record the exact failure in docs/rpg-v2/VALIDATION_LOG.md. Do not claim a clean pass.

Module handoff:
At the end of the module, create/update docs/rpg-v2/modules/RPG-XX-HANDOFF.md with:
- module name;
- git state before work;
- files changed;
- why each changed file was necessary;
- validation commands run;
- validation result;
- root doc/archive changes if relevant;
- asset ledger IDs if assets were added;
- risk register updates;
- Scope Discipline Check;
- stop/continue decision.

Scope Discipline Check:
- Intended module:
- Files changed:
- Why each changed file was necessary:
- What was deliberately not added:
- New dependencies: none / list and justify:
- New assets: none / list and ledger IDs:
- New storage/schema: none / decision ID:
- Runtime network behavior changed: no / decision ID:
- Classic route behavior changed: no / explain and cite decision:
- Any deferred tempting work:

Proceed module by module only after a clean gate.
```
