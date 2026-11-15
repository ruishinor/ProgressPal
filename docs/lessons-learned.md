# Lessons learned — feedback button and release gate

Version 2, 2026-11-15 (version 1: 2026-11-14). Covers PR #96 (the failed
feedback button) and the follow-up: PR #97 (gate stability and trimming),
PR #98 (parallel gate) and PR #99 (feedback link, smallest version).

## Summary

A feedback button became a 38-file PR that failed the hosted gate seven
times in a row (runs 202–208). Two causes were mixed together:

1. **A bug in the PR:** the feedback dialog was always in the page, even
   when closed, so it collided with selectors in unrelated tests.
2. **A suite problem that predated the PR:** three Playwright workers on a
   two-vCPU runner made tests slow enough to cross the 30-second default, and
   the gate stops at the first failure with no retries. Every hosted run from
   #187 to #208 failed, including PR #95, which had no feedback code.

Fixing the cause instead of the symptoms took the gate from failing to green,
and from about 36 to about 15 minutes per run. The feature itself shipped as a
small link with no backend.

## Outcome

| Measure                               | Before                               | After                                  |
| ------------------------------------- | ------------------------------------ | -------------------------------------- |
| Hosted `Final candidate`              | 22 runs red or cancelled (#187–#208) | green on PR #97, #98                   |
| Browser-test timeouts on slow runners | several per run                      | 0                                      |
| PR wall time                          | ~32 min best day, then red           | 14.75 min (run #211)                   |
| Default browser tests                 | 346                                  | 324 (no assertion weakened)            |
| RPG scale tests (6 files)             | 181.6 s                              | 16.5 s                                 |
| Feedback feature                      | backend, admin secret                | `mailto:` link in Settings, no backend |
| Actions minutes per run               | 1 job                                | 5 jobs, about +15–25 % setup overhead  |

Run #211 breakdown: unit stage 10.2 min; browser shards 9.8, 12.8 and 13.4
min; assembly 26 s.

## Part 1 — what went wrong in PR #96

| Run | Failure                                                                    | Cause                             |
| --- | -------------------------------------------------------------------------- | --------------------------------- |
| 202 | `microlearningBoundary`: `MicroShell.tsx -> @/features/feedback`           | PR broke a layer rule             |
| 203 | `.button--primary` count 2, expected 1                                     | PR: hidden dialog's submit button |
| 204 | `App.test.tsx`: Settings no longer a direct HUD child                      | PR: unrequested HUD refactor      |
| 205 | Classic dark-theme axe sweep, 30 s timeout                                 | Suite timing                      |
| 206 | `getByLabel('Progress')` matched the closed dialog "…forbedre ProgressPal" | PR: hidden dialog in the page     |
| 207 | Git evidence scenario, 30 s timeout                                        | Suite timing                      |
| 208 | Activity gallery, 30 s timeout                                             | Suite timing                      |

1. **Don't render UI that isn't visible.** A component added to every shell
   must add no DOM until it is opened. Fix the component, not each test
   selector it breaks.
2. **Separate "my change broke it" from "the suite is fragile".** A failure
   in untouched code: check master and other PRs first. Fix suite-wide
   problems once, in their own PR.
3. **The hosted gate is a certificate, not a debugger.** With
   `maxFailures: 1`, each 10–15 minute run reveals one failure. Run
   `npm run test:e2e -- --max-failures=0` locally once when a change touches
   every page.
4. **Bind review evidence once, last.** PR #96 re-bound four times; each
   re-binding is a commit and a hosted run.
5. **Honour your own stop rule.** "Pause after two failures" was written and
   then ignored for five more runs.
6. **One concern per PR.** Docs rewrites, a HUD refactor and seven unrelated
   test edits had nothing to do with a feedback button.
7. **Least privilege.** The intake used the Hasura admin secret of the
   project that holds learners' synced data, also on Preview deployments.
8. **Keep `CURRENT_STATE.md` consistent with the PR.**
9. **Ship the smallest version first.** It did: PR #99.

## Part 2 — what the fix taught us

### 10. Measure on the target, not only locally

The local benchmark (two CPUs pinned with `taskset`) showed two workers
cost only 5 % wall time and removed all timeouts. Hosted run #209 showed two
workers took about 31 minutes against 24.7 with three. Tests partly wait, so
a third worker still adds throughput on two CPUs. The local result was right
about timeouts and wrong about speed.

**Rule:** a local benchmark can show a direction; the hosted run decides.
Print the runner's real shape (run #209 printed `using 2 workers`, which
proved the two-vCPU runner) before reasoning from assumptions.

### 11. A per-test budget is not a weakened check, when the cause is known

The fix kept three workers and raised the per-test budget from 30 to 60
seconds. Every assertion keeps its own 5–15 second limit; the per-test budget
only catches hung tests. In run #210, 22 tests took longer than 30 seconds;
the slowest one on the default budget took 32.1 s, about half the new budget.
Standard 09 §5 forbids longer timeouts "to get green without causal
evidence". Here the evidence was measured CPU contention.

**Rule:** raise a time budget only with a measured cause. Give a single
assertion a longer wait only when it waits for measured asynchronous work,
such as a save and re-read through IndexedDB, never for UI that should be
immediate.

**Follow-up (run #212):** one more failure in this family showed the rule as
first written was too strict. A saved Task 6 result rendered 5.6 s after the
click on a loaded runner, past the default 5 s assertion wait. The
owner-supplied trace proved the answer was complete, nothing errored, and the
correct "Riktig, +13 XP" appeared one frame later. PR #100 gives the 23
saved-result assertions a 15 s wait, the suite's existing stored-state wait.

### 12. Cut duplicated work, not detection

Removed from the default run, each for a stated reason:

- capture-only screenshot specs for closed epics C1, D, B2 and B4 (B4's
  state checks also live in functional specs); still runnable with
  `PROGRESSPAL_REVIEW_CAPTURE=true`;
- four browser walks that repeated another spec's cards, viewport, scale
  mechanism and answer path;
- a video of every test (the trace already holds the failure's frames, DOM
  and network);
- the 10,000-row scale cases, replaced by 100 + 1,000 rows (same 10× ratio,
  same assertions).

Kept, after checking: one viewport per CSS breakpoint class, 320 px for
reflow, 360×560 as the shortest screen, and walking every real card, because
only that catches a single card that doesn't fit. Not changed: a reward-
notification test that waits on real timers (fake timers there are a known
flakiness trap for about 15 seconds of gain).

**Rule:** a test leaves the gate only if another test asserts the same
thing, or it asserts nothing.

### 13. A sister search before the next push pays off

Run #209 exposed one real race: an unscoped `getByRole('status')` on the
offline Guild page matched a transient loading status. Before pushing the
fix, every other unscoped page-level status locator was checked; none could
race. One fix, no second round.

### 14. Parallelise with proof, not with trust

The single job could not be split naively: the master reuse step (ATTEST)
authenticates exactly one job, one artifact and one manifest. The design that
kept it:

- stage jobs (unit and three browser shards) each record their own evidence;
- `Final candidate` verifies every stage of the same run attempt (commit,
  tree, payload, review, control fingerprint, command profile, report
  digests, zero skips and retries, and a byte-identical build), then writes
  the one manifest ATTEST expects;
- the verifier requires exactly the expected job set, all green.

Two builds of one checkout were confirmed byte-identical before relying on
that check. The assembler has 14 adversarial tests (missing, failed, foreign,
tampered, wrong build).

### 15. Merge order and status documents

Several PRs each added a top entry to `CURRENT_STATE.md`, so every second
merge conflicted. Merging master into the branch (no history rewrite) and
keeping both entries resolved it each time. Cancelling a superseded PR run
avoided a 36-minute wait in the per-branch queue. Runs on master were never
cancelled, because they hold production.

## Mistakes made during the fix

Recorded so they aren't repeated:

- **Extrapolated hosted speed from a local benchmark** (lesson 10). The first
  PR #97 candidate used two workers and had to be revised.
- **Copied a shared object in a test fixture by spread.** The assembler test
  "rejects a different review" passed for the wrong reason until the fixture
  was cloned. A mutation test that can't fail proves nothing.
- **Shared `node_modules` between Git worktrees by symlink.** TypeScript then
  reported false errors through the symlinked path. Each worktree needs a
  real install.
- **Mentioned the provider by name in a workflow comment.** The architecture
  test forbids that, correctly; the comment was reworded.
- **Left changes uncommitted while waiting on CI**, which the stop hook
  caught.

## Conflicts with the lessons-learned standards

- **Epic A AC-09** allows smaller scale counts only after a hard CI runtime
  problem. The ratio and access pattern were kept, but these files had not
  failed; the change rests on the owner's efficiency instruction.
- **Standard 10 §10** lists "forhøyet timeout for å få grønt" (a raised
  timeout to get green) as forbidden without a separate mandate. The 60-second
  budget had both a measured cause and the owner's instruction; it is
  recorded here so the exception stays visible.
- **"No sharding" in `docs/ci.md`** came from rules that no longer applied
  (three independent passes; Windows Vitest leaks). It was replaced on the
  owner's instruction that waiting is the bottleneck and extra minutes are
  acceptable.

## Checklist for the next change

- [ ] Master is green on current runners before starting.
- [ ] One concern per PR; no edits outside its files and mount points.
- [ ] Nothing added to every page's DOM unless it is visible.
- [ ] Local: format, lint, typecheck, affected Vitest; for browser-facing
      changes, `npm run test:e2e -- --max-failures=0` once.
- [ ] Sister search done for any failure family before pushing a fix.
- [ ] `CURRENT_STATE.md` updated in the same change.
- [ ] Review evidence bound once, last; one push.
- [ ] Two consecutive red runs: stop, write down each cause, then continue.
- [ ] Claims about speed come from a hosted run, not a local one.

## Product finding from the run #212 trace

While a tab re-reads after its own save, the RPG shell shows "Saved data
changed in another tab". That is untrue for a single tab: the coordinator
marks every tab stale after its own write by design, and the shell uses
another-tab wording for that state. It needs its own small change.

## Open items

- Done: PR #99 merged and PR #96 closed as replaced. Master run #216 took
  the ATTEST path (stages skipped, Final candidate green in 18 s): the first
  proof of reuse under the parallel gate.
- Master run #212 (the #97 merge) failed once on a slow save; fixed in
  PR #100. Run #214 (the #98 merge) was cancelled by GitHub's per-branch
  queue, superseded by #216.
- Billing for Actions minutes is unverified: about 2,500 minutes were used in
  November 1–14, above the Free plan's 2,000. Check
  github.com/settings/billing.
- Not done, by decision: per-card sampling of the microlearning walks, fake
  timers in `rewardNotifications`, and a global (non-Settings) feedback
  entry.
