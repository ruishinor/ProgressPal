# A5 Documentation-only readiness integration / branch plan

Date: 2026-09-21  
Applies only because A5 readiness result is PASS.  
This is a plan, not an executed mutation.

## Preconditions

Before any Git mutation, verify locally:

- current branch is `postrelease/01-read-architecture`;
- exact HEAD is `4a87e68a7fe043ac394a9a6694cf95058288d055`;
- working tree/index are clean except for explicitly understood local-only tooling state;
- `origin/master` still resolves to the expected published lineage or any change has been reconciled;
- no A5 branch already exists unexpectedly.

If any precondition fails, stop and reconcile. Do not edit expected hashes to force continuation.

## Controlled documentation integration

1. Create a local documentation-only readiness branch from exact A4 closure HEAD, suggested name: `postrelease/a5-readiness`.
2. Apply only the readiness documentation files in this package:
   - `docs/post-release/epic-a/A5_READINESS_ASSESSMENT.md`
   - `docs/post-release/epic-a/A5_ACCEPTANCE_CONTRACT.md`
   - `docs/post-release/epic-a/A5_ADVERSARIAL_READINESS_REVIEW.md`
   - `docs/post-release/epic-a/A5_DOCUMENTATION_INTEGRATION_PLAN.md`
   - `docs/post-release/epic-a/stories.yaml`
   - `docs/post-release/epic-a/VALIDATION_READINESS.md`
   - `docs/post-release/epic-a/NEXT_STORY_HANDOFF.md`
3. Run repository-native formatting/checks applicable to changed documentation/YAML. Do not weaken repository config for the known `.kilo/worktrees/nova-carnation` issue.
4. Review the staged diff and prove no `src/`, tests, schema, package/config or deployment files are staged.
5. Commit the documentation-only readiness state locally.
6. Integrate that documentation commit into `postrelease/01-read-architecture` using the established local integration method, preserving exact lineage.
7. Verify the integration branch is clean and record the new documentation-readiness commit/tree.

No remote publication is part of this plan.

## A5 story branch after documentation integration

Only after the documentation readiness commit is integrated and its exact identity recorded:

1. create local story branch `postrelease/a5-focus-read-boundary` from that exact readiness commit;
2. implement **RED tests/harness only** first;
3. execute the RED evidence gate;
4. classify the failure layer;
5. proceed to production implementation only when the RED failure is the intended actual-route hidden session-source materialization/coherence mechanism.

If RED is invalid, repair the harness without changing production. If a registered failure class recurs, mark `RECURRENCE` and review the upstream control before continuing.

## Explicit non-actions

This plan does not authorize:

- production code changes during readiness integration;
- GREEN implementation before valid RED;
- A6 work;
- schema migration;
- push;
- remote merge;
- deployment.
