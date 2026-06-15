# Module 00 Plan

## Scope

- Inspect the current repository state.
- Translate the broad ProgressPal concept into a CS50-only product scope.
- Create persistent state, validation, decision, security, and test-planning documents.
- Create the roadmap and scope-reset decision record.
- Stop before app scaffolding.

## Files Expected To Change

- ROADMAP.md
- PROJECT_STATE.md
- MODULE_CHECKLIST.md
- VALIDATION_LOG.md
- CHANGELOG.md
- SECURITY.md
- DECISIONS.md
- TEST_PLAN.md
- docs/decisions/000-scope-reset.md
- docs/modules/module-00-plan.md

## Files Forbidden To Change

- src/\*\*
- e2e/\*\*
- package.json
- vite.config.ts
- tsconfig.json
- eslint.config.js
- playwright.config.ts
- Any lockfile, dependency directory, or generated build artifact

## Acceptance Criteria

- The product is explicitly locked to one offline-only CS50 learner.
- Removed features are documented explicitly.
- Retained MVP features are documented explicitly.
- The natural endpoint is defined as offline CS50 MVP.
- Project-state and validation documents exist and are coherent.
- No scaffold or runtime code is introduced.

## Tests To Add

- Three consecutive manual validation passes.
- Placeholder search across all Module 00 artifacts.
- Scope leakage search for banned feature directions.
- Manual check that no scaffold or runtime files were created.

## Data Compatibility Risk

- None. Module 00 introduces no persistence, schema, or user data.

## Rollback Plan

- Revert or delete Module 00 documentation artifacts only.
- No migration or data rollback is required because no application state exists yet.
