# Contributing

ProgressPal accepts changes only when they preserve the product boundary: local-first, single-user, CS50x-focused, honest progress tracking.

Current work is final owner-review correction of the optional RPG experience over the frozen v1.3 engine. Read the latest owner instructions and `docs/rpg-v2/RPG-PRODUCT-COMPLETION-RESTART.md` first. C0-C5 are implemented and must be preserved.

Historical v1.3 remediation records:

```text
docs/rpg-v2/DECISIONS-rpg-v2.md (D-0075)
docs/remediation/3-1-v1-3-release-remediation.md
docs/remediation/sprint-change-proposal-2026-07-13.md
docs/audits/progresspal-1.3.0-remediation-inventory.md
```

D-0075 supersedes the older remediation story and proposal where their validation cadence, research prerequisites, or release sequence conflict.

RPG-specific constraints remain under:

```text
docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
docs/rpg-v2/DECISIONS-rpg-v2.md
docs/rpg-v2/MIGRATION_CONTRACT.md
docs/rpg-v2/VALIDATION_LOG.md
docs/rpg-v2/ASSETS.md
docs/rpg-v2/RISK_REGISTER.md
docs/rpg-v2/VISUAL_TARGET.md
```

## Operating standard

No bias. No bullshit. No overbuild.

Do not add features, files, dependencies, abstractions, assets, or refactors that are not required by the current accepted module.

Before adding anything, ask:

```text
1. Does this need to be here?
2. Is this required to reach the intended endstate for this module?
3. Is this required by the source-of-truth roadmap, an accepted decision record, or a failing test?
4. Does this preserve the v1 engine contract?
5. Does this preserve same-origin /rpg/*, no backend, no schema change, no embedded content, and Level 1 local-first behavior?
6. Does this introduce a dependency, asset, runtime request, data store, preference, route, abstraction, or styling system that the current module did not ask for?
7. Can this be done with existing code, existing styles, existing data, or a smaller local component?
8. Would a future maintainer understand why this was necessary from the module acceptance criteria alone?
```

If the answer to questions 1, 2, or 3 is no, do not build it.

## Branching

Current product-completion branch:

```text
rpg/product-completion
```

Current default branch and immutable historical tags:

```text
master
v1.2.0-local-first-proof
v1.2.1-local-first-proof
```

Do not move historical tags. Do not create a new repository unless an accepted decision explicitly changes the plan.

## Module discipline

For current final review corrections, use concern-scoped local commits and the existing completion document's rolling status. Do not create a handoff for each visual fix. The following template belongs to the older module process and remains available for work explicitly accepted under that process.

Work module by module.

Do not scaffold all modules at once.

Every RPG v2 module must have a handoff file under:

```text
docs/rpg-v2/modules/
```

The handoff must include:

```text
- module name;
- files changed;
- why each changed file was necessary;
- validation commands run;
- validation result;
- risk updates;
- asset ledger IDs if assets were added;
- Scope Discipline Check;
- stop/continue decision.
```

## Scope Discipline Check

Include this in every module handoff:

```text
Scope Discipline Check
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
```

## Validation

Use targeted validation during implementation. Repeat focused checks only for demonstrated timing, lifecycle, process-cleanup, synchronization, or observed flakiness risk. Current RPG completion requires the ordinary full commands below, representative browser inspection, and owner visual/product GO. The historical v1.3 certification gate and CI cadence do not reopen certification for this work.

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm run check:bundle
npm run audit
```

If `npm run audit` cannot run due to environment/network restrictions, record the exact failure in `docs/rpg-v2/VALIDATION_LOG.md`. Do not claim a clean pass.

## Pull request expectations

A pull request should include:

- the module name;
- concise summary;
- files changed;
- validation result;
- screenshots only if visual work changed;
- risk register updates if relevant;
- asset ledger entries if assets were added;
- confirmation that classic routes still work when required;
- Scope Discipline Check.

## Forbidden without accepted decision

Do not add:

- backend;
- authentication;
- cloud sync;
- analytics;
- AI tutor;
- schema change;
- new XP rules;
- fake RPG mechanics;
- embedded external course content;
- runtime course-data fetching;
- remote assets;
- CS50/Harvard branding;
- new dependencies for convenience;
- broad refactors unrelated to the module.

## Assets

No asset may be used before it is recorded in:

```text
docs/rpg-v2/ASSETS.md
```

The categorized asset library is a candidate pool only. Do not bulk-import it.

## Code style

Follow the existing project style, scripts, TypeScript strictness, tests, and formatting. Do not introduce a new styling framework, state manager, UI library, or icon package unless an accepted decision requires it.

## Commit messages

Use clear module-oriented commit messages.

Examples:

```text
rpg-00: install RPG v2 source-of-truth docs
rpg-01: add minimum RPG read model boundary
rpg-02: add RPG route shell and navigation
```
