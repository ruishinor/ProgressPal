# Sprint Change Proposal: ProgressPal v1.3.0 Remediation

> **Superseded execution contract (2026-08-12):** D-0075 in `docs/rpg-v2/DECISIONS-rpg-v2.md` replaces this proposal's three-pass cadence, comparative-research prerequisites, and artifact-promotion assumptions for the remaining v1.3 release work. The body below is retained as historical planning evidence.

Status: approved for implementation by the user's 2026-07-13 instruction

Scope classification: major replan

Implementation branch: `cx/release-1.3.0-remediation`

## 1. Issue summary

The post-`v1.2.1` worktree contains credible fixes for atomic recovery, first-use routing, RPG shared state, accessibility, offline behavior, and the browser harness. It is not a defensible release yet because its package identity regresses to `1.2.0`, active documentation conflicts about release/branch state, line endings are host-dependent, CI and provenance are missing, the default unit command can leak processes, the service-worker upgrade contract is unsafe, multi-tab writes are undefined, hosted/real-device evidence is absent, and the RPG product thesis has no comparative learner evidence.

Evidence is the current repository, not the earlier narrative of completion. Current code can be technically useful while the release claim remains false.

## 2. Impact analysis

### Product and epic impact

- The prior stabilization work is preserved; rollback would discard high-value recovery and flow fixes without solving provenance or product-value uncertainty.
- Release identity changes from the stale `1.2.0` candidate to `1.3.0` because `v1.2.1` is already an ancestor and the post-tag shell work is backward-compatible and user-visible.
- RPG expansion is paused. Classic remains the control/default until comparative task evidence supports a different decision.
- Research may conclude that RPG is default, optional, retired, or that the browser product should be simplified. No result is preselected.

### Artifact conflicts

- `README.md`, release notes, roadmap, validation log, contribution/security guidance, and visual guidance conflict with Git history or current operational needs.
- `_bmad-output/` is ignored and cannot be the only authority for release decisions.
- `VISUAL_TARGET.md` places theme before task hierarchy and conflicts with the utility-first UI constraints.
- The missing `.gitattributes`, `core.autocrlf=true`, and Prettier `auto` produce non-reproducible warnings.

### Technical impact

- Package/runtime/cache metadata, CI, release scripts, Playwright evidence, service worker, security headers, storage concurrency, UX structure, and documentation change.
- Database schema 2, backup envelope 1, existing store/entity shapes, XP rules, and local-first/no-network boundaries do not change.
- No backend, authentication, cloud sync, analytics, runtime AI, Google/Gemini dependency, or visual framework is introduced.

## 3. Recommended approach

Use a hybrid of direct adjustment and MVP review:

1. Preserve and certify the already implemented engineering fixes.
2. Correct release identity, runtime, line endings, CI, provenance, concurrency, service-worker lifecycle, and security gaps.
3. Produce a hosted beta only from the exact certified artifact.
4. Test classic, RPG, task-first neutral, and spreadsheet alternatives before deciding the product's visual/interaction direction.

Rollback is reserved for failed production promotion or service-worker/database compatibility, not used as a shortcut for the current dirty tree. Broad MVP expansion is rejected.

## 4. Detailed change proposal

The complete task sequence, hard constraints, acceptance criteria, evidence fields, research thresholds, and universal gate are maintained in `docs/remediation/3-1-v1-3-release-remediation.md`.

Every module follows this order:

1. Write or update the targeted failing test/evidence check.
2. Implement the narrowest compliant change.
3. Run the module's targeted unit, integration, security, UI/UX, and E2E checks three consecutive times.
4. Run an adversarial review and resolve every P0/P1 finding.
5. Run the universal release gate three consecutive times from the same immutable state.
6. Record the retrospective, evidence manifest, and stop/continue decision.

No pass is counted after a warning, skip, retry, flaky result, unexplained file change, or command that fails to terminate cleanly.

## 5. Implementation handoff

| Role                             | Responsibility                                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Project lead/orchestrator        | Enforce sequence, source authority, scope, hard stops, evidence labels, and rollback decisions.                                     |
| Analyst/design-thinking coach    | Run comparative task research and distinguish observed behavior from preference or speculation.                                     |
| UX designer                      | Own information architecture, task hierarchy, accessibility behavior, and the `EXPERIENCE.md`/`DESIGN.md` contracts.                |
| Developer                        | Implement tests first, preserve compatibility boundaries, and avoid speculative dependencies or abstractions.                       |
| Test architect/security reviewer | Maintain the canonical gate, CI independence, hostile-input tests, browser/storage/service-worker matrices, and evidence manifests. |
| Adversarial reviewer             | Seek false completion, weak or circular evidence, release/provenance gaps, hidden state mutation, and rollback failures.            |

Success means one exact `1.3.0` artifact is independently reproducible, recoverable, locally/hosted verified, honestly labelled, and tied to a product decision supported by observed learner tasks. It does not mean the RPG thesis is assumed true.
