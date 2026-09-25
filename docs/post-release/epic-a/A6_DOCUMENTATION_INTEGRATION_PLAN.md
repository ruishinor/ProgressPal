# A6 Documentation-only readiness integration / branch plan

Date: 2026-09-21
Applies only because A6 readiness result is PASS.
This is a controlled local plan, not remote publication.

## Preconditions

Before mutation verify:

- branch: `postrelease/01-read-architecture`;
- exact HEAD: `25ed38da54cf719c151165506c2a3391ae8eb88f`;
- exact tree: `7b7e381920289515625de8d024dc6d6a0728c2f6`;
- parent: accepted A5 implementation `0b03c334f91d9946ddbb9577a5daa9ee0ed16b4b`;
- working tree/index clean;
- Node `v24.19.0`, npm `11.10.1`;
- `origin/master` remains `a0581c13a22fdd3387534d2de0eca2591cf13ed6`;
- A6 branch does not already exist locally or remotely;
- readiness package SHA and internal checksums match;
- exact A6 readiness-context ZIP `4E37F60821000F769CE92BB1216C9237EC5C7CFF85E545F63A9B50D34839A010` and A5 post-closure state `F7421B9687D48C85868BA6F45F4B9A5826589A54D9DBB20DBE77DB7523BFD7B2` are present.

Do not edit expected hashes to force continuation.

## Documentation-only readiness commit

Install exactly:

- `docs/post-release/epic-a/A6_ACCEPTANCE_CONTRACT.md`;
- `docs/post-release/epic-a/A6_ADVERSARIAL_READINESS_REVIEW.md`;
- `docs/post-release/epic-a/A6_DOCUMENTATION_INTEGRATION_PLAN.md`;
- `docs/post-release/epic-a/A6_READINESS_ASSESSMENT.md`;
- `docs/post-release/epic-a/NEXT_STORY_HANDOFF.md`;
- `docs/post-release/epic-a/VALIDATION_READINESS.md`;
- `docs/post-release/epic-a/stories.yaml`.

Then:

1. run repository-pinned Prettier on exactly those files;
2. run `git diff --check`;
3. prove no `src/`, `tests/`, `e2e/`, schema, package or deployment file changed;
4. stage exactly the seven readiness documents;
5. commit locally with `docs(epic-a): record A6 readiness contract`;
6. prove the readiness commit directly descends from `25ed38da54cf719c151165506c2a3391ae8eb88f`;
7. prove the integration branch remains clean.

## A6 branch

Only after the readiness documentation commit succeeds:

- create local branch `postrelease/a6-badges-read-boundary` at the exact readiness commit;
- perform no production changes in the same gate;
- next work is RED-only harness/tests.

## RED phase

The first A6 story commit/candidate must contain RED harness/test work only.

Primary mechanism RED must prove the actual shared Achievements route currently bulk-materializes the complete XP source history while rendering the expected surface.

Separate evidence may prove the current two-child-transaction coherence defect.

Production GREEN work remains prohibited until RED is classified valid.

## Explicit non-actions

No:

- A6 GREEN production code in readiness integration;
- A7 work;
- schema migration;
- push;
- remote merge;
- `master` update;
- deployment.
