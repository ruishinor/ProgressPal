# Next-story handoff — A4 readiness

Next story: **A4 — Hub, Hero and persistent HUD read boundaries**

Status: **eligible for fresh readiness only after A3 closure is integrated**

Do not start A4 implementation from this document alone.

## Required lineage

A4 readiness must start from the new documentation-only A3 closure commit on:

`postrelease/01-read-architecture`

That closure commit must directly descend from accepted A3 implementation:

- A3 implementation: `7363ec6d70a89e48373d8be81673b94793598cd8`
- A3 tree: `ba504b77dd98dc3472699631db0a56e82ea0c9f6`
- A3 readiness parent: `6b5e0d65d5736f8f5c4bb033aee1ea24735d1d83`

Do not branch A4 from `master`, the A3 readiness commit, or the A3 story branch before closure.

## A4 readiness purpose

A4 is the first story that owns the high-frequency persistent shell/Hub/Hero read composition.

Fresh readiness must re-inspect the actual current routes and loaders before setting a RED/GREEN contract.

Do not assume that A3's route observations are sufficient by themselves.

## Known A4 problem statement

A3 deliberately did not narrow the persistent shell/HUD or Hub/Hero reads.

Resource post-save composition still includes A4-owned work:

```text
refreshHud()                         -> A4
Promise.all([
  loadRpgStudyResourceSummary(id),  -> accepted A3
  loadRpgHubSummary(),              -> A4
])
```

A4 must therefore distinguish:

- persistent shell/HUD data needed on RPG routes;
- Hub page data;
- Hero page data;
- overlap/shared aggregation between those surfaces;
- data that is genuinely lifetime-history dependent.

Do not charge accepted A1 Map, A2 Module or A3 Resource reads to A4.

## Likely data-pressure areas to inspect

Readiness should locate the actual current implementations and verify whether they still broadly snapshot:

- XP lifetime history;
- study-session lifetime history;
- media-progress lifetime history;
- achievement unlocks needed only by Hero;
- recent activity;
- current quest/recommendation context;
- HUD totals/level state.

The A0/A3 planning premise allows some O(n) lifetime aggregation where logically required, but source rows must not be bulk-materialized into hidden arrays merely for convenience.

## Required readiness questions

Before RED or production edits, answer from current source:

1. Which exact loaders/components feed persistent RPG HUD state?
2. Does Hub reuse the shell/HUD read or execute another broad logical read?
3. Which fields does Hero add beyond Hub/HUD?
4. Which histories are lifetime-dependent versus bounded/recent?
5. Which values require transaction coherence across stores?
6. Can recent activity remain top-5 without retaining the complete session/media histories?
7. Which existing indexes support streaming aggregation?
8. Is any schema/index change actually necessary? Default answer remains no unless proved otherwise.
9. What query-count contract is meaningful for each logical surface?
10. How will the harness separate route composition from accepted A1–A3 child-route reads?

## Scaling rule carried forward from A3

A3's 10,000-row selected-item media scan took approximately 30–49 seconds under fake-indexeddb.

A4 is expected to touch higher-frequency lifetime aggregates, so readiness must be especially careful not to turn an allowed O(n) scan into a claim of acceptable runtime.

For every approved history scan, record:

- rows scanned;
- source rows materialized;
- retained/derived aggregate size;
- query count;
- measured fixture read duration where useful.

Performance measurements are evidence, not automatic acceptance targets.

## Local tooling constraint

The registered nested worktree remains:

`.kilo/worktrees/nova-carnation`

Do not delete, move or rewrite it as part of A4 readiness.

Use isolated clones for repository-wide lint/full validation until that tooling state is deliberately resolved.

## Stop rules

Stop before A4 RED/implementation if:

- the actual shell/Hub/Hero composition differs materially from the current Epic A story description;
- accepted A1–A3 boundaries would need to be changed;
- a schema/index migration appears necessary without separate justification;
- route ownership between Hub/HUD/Hero cannot be separated cleanly;
- the proposed contract would hide full-history arrays behind helper APIs;
- `origin/master` or accepted Epic A lineage changed and has not been reconciled.

A4 readiness PASS should produce a fresh acceptance contract and handoff before any A4 story branch or production edit is created.

Do not begin A5 or A6 during A4 readiness.
