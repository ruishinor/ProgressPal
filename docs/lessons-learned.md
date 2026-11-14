# Lessons learned — PR #96 (feedback button)

Date: 2026-11-14. Subject: PR #96 `fix/pr93-preview-auth-focus` (successor to
PR #93), head `f7bb8c8f`. Status at writing: open, seven consecutive
`Final candidate` failures (runs 202–208).

## Summary

A report/feedback button is a small feature. It became a 38-file,
+2,162/−341 line PR that failed the hosted gate seven times in a row. Two
independent causes were mixed together, and each round patched one symptom:

1. **A product bug in the PR:** the feedback dialog is always in the page,
   even when closed, so it collides with selectors in unrelated tests.
2. **A pre-existing suite problem:** CI runners are slower than when the
   suite last passed, several browser tests sit near Playwright's 30 s
   default, and the gate stops at the first failure with no retries.

The process made both worse: CI was used as the debugger, one failure per
10–15 minute round, plus a review re-binding commit per round.

## What failed, run by run

| Run | Head       | Failure                                                                    | Cause                             |
| --- | ---------- | -------------------------------------------------------------------------- | --------------------------------- |
| 202 | `75373c8d` | `microlearningBoundary`: `MicroShell.tsx -> @/features/feedback`           | PR broke a layer rule             |
| 203 | `c8af8af4` | `.button--primary` count 2, expected 1                                     | PR: hidden dialog's submit button |
| 204 | `6bcce291` | `App.test.tsx`: Settings no longer a direct HUD child                      | PR: unrequested HUD refactor      |
| 205 | `f6919ffd` | Classic dark-theme axe sweep, 30 s timeout                                 | Suite timing (pre-existing)       |
| 206 | `02e30750` | `getByLabel('Progress')` matched the closed dialog "…forbedre ProgressPal" | PR: hidden dialog in the page     |
| 207 | `151f162d` | Git evidence scenario, 30 s timeout                                        | Suite timing (pre-existing)       |
| 208 | `f7bb8c8f` | Activity gallery, 30 s timeout                                             | Suite timing (pre-existing)       |

## Lessons

### 1. Do not render UI that is not visible

`src/features/feedback/FeedbackWidget.tsx` calls `createPortal(<dialog>…)`
on every render. A closed `<dialog>` with a full form then exists on every
route. Playwright locators by label, text and CSS class also match hidden
elements, so tests unrelated to feedback broke (runs 203 and 206).

The fix belongs in the component (`{open && createPortal(...)}`), not in the
tests. Commits `02e30750` and `151f162d` adjusted test selectors one at a
time. That treated the symptom and left the cause in place.

**Rule:** a component added to every shell must leave no extra DOM on the
page until the learner opens it.

### 2. Separate "my change broke it" from "the suite is fragile"

Measured against the last green run (#185, PR #92):

| Measure                            | Run #185 | PR #96 runs     |
| ---------------------------------- | -------- | --------------- |
| Vitest total                       | 374 s    | 605 s           |
| Vitest setup                       | 37 s     | 61 s            |
| Vitest jsdom environment           | 101 s    | 170 s           |
| Classic dark-theme axe sweep (e2e) | 20.1 s   | > 30 s (failed) |
| Git evidence scenario (e2e)        | 17.8 s   | > 30 s (failed) |
| Activity gallery (e2e)             | 14.8 s   | > 30 s (failed) |

Setup and environment time do not depend on the widget, so the runners are
about 1.6× slower. PR #95 (Guild work, no feedback code) failed on the same
classic dark-theme axe timeout (run 200). The timeouts are not caused by
PR #96.

Raising one test's timeout per commit (`02e30750`, `f7bb8c8f`) cannot
converge. With `maxFailures: 1` and `retries: 0`, the next slow test simply
becomes the first failure.

**Rule:** when a failure appears in code the PR did not touch, check it
against master and other open PRs before changing anything. Fix a suite-wide
timing problem once, in its own PR off master, and get master green first.

Not yet verified: a fresh master run on current runners. A manual run of
the workflow on master would confirm or refute this.

### 3. The hosted gate is a certificate, not a debugger

`playwright.config.ts` sets `maxFailures: 1`. Each hosted run therefore
reveals at most one browser failure and costs 10–15 minutes. Local
validation before each push was focused tests only, plus an 8-test focused
Playwright run. No full browser run was done, even though the widget
changes the DOM of every page.

`scripts/run-e2e.mjs` forwards extra arguments to Playwright, so one local
run shows every failure at once:

```bash
npm run test:e2e -- --max-failures=0
```

**Rule:** if a change touches every page (shells, global CSS, portals), run
the full browser suite locally once with `--max-failures=0` before pushing.
Push only when it is clean apart from known, separately tracked timing
failures.

### 4. Bind review evidence once, at the end

The review file `docs/release-reviews/private-feedback-intake.json` was
re-bound four times (commits `97ca3ada`, `8ae635fe`, `75373c8d`,
`c8af8af4`). Each re-binding is a commit, and each commit starts another
full hosted run.

**Rule:** finish the code, pass local preflight, then bind the review once
to the final payload tree and push once.

### 5. Honour the stop rule you wrote

The PR body says: pause the branch if `Final candidate` fails twice in a
row. It failed seven times, and pushes continued.

**Rule:** after two consecutive failures, stop pushing. Write down each
failure and its cause, as in the table above, before the next commit.

### 6. Keep scope to what the feature needs

A feedback button does not need:

- rewrites of `PRIVACY.md`, `README.md` and `SECURITY.md` (about 490 changed
  lines);
- a refactor of the RPG HUD and Hero Profile header (caused run 204 and
  three e2e layout edits);
- edits to seven unrelated browser-test files.

Every extra file is more for the gate to fail on and more for review to
re-bind. `AGENTS.md` already says so: "No overbuild".

**Rule:** one concern per PR. Backend, client widget, docs and layout
changes each go in their own PR where they are needed at all.

### 7. Least privilege for server secrets

`api/feedback.mjs` sends `x-hasura-admin-secret` to the Nhost project
`enuikiiweoscywaixedr`. That is the same project that holds account sync,
Guild and cloud backup data. The function also ran on a Preview deployment,
so code from any branch's Preview deployment could run with full access to
every learner's synced data.

**Rule:** a write-only intake gets a credential that can do exactly one
thing (a Hasura role with permission only to call `submit_feedback`, or a
separate project). Never the admin secret, and never in Preview unless
Preview is isolated from production data.

### 8. Keep the status documents consistent

On the PR branch, `docs/CURRENT_STATE.md` still describes PR #93 and says
the PR must not be merged or deployed until provider checks are complete.
The PR body says merge and activation are authorized. Both cannot be true.

**Rule:** update `CURRENT_STATE.md` in the same commit that changes the
decision, and name the current PR.

### 9. Start with the simplest version that meets the need

A local-first static app does not need a backend to receive feedback. A
first version could be a dialog with a `mailto:` link and the existing
"copy message" fallback: about three files, no CSP, Vercel, Nhost or secret
changes, and no conflict with the "no backend" boundary. The cost is that
the maintainer's address is visible in the shipped code.

A private, stored intake can follow later as a separate, off-by-default PR,
once the owner records it as an accepted decision.

**Rule:** ship the smallest version first; add infrastructure only when the
small version is shown to be insufficient.

## Checklist for the next attempt

- [ ] Master is green on current runners (timing fix merged separately).
- [ ] The widget leaves no extra DOM until it is opened; one instance per
      shell.
- [ ] No changes outside the feature's own files and its mount points.
- [ ] Local: lint, format check, typecheck, affected Vitest, and
      `npm run test:e2e -- --max-failures=0` all clean.
- [ ] Review evidence bound once, to the final payload tree.
- [ ] One push. If `Final candidate` fails twice, stop and write down each
      cause before the next commit.
- [ ] If there is a backend: least-privilege credential, off by default, in
      its own PR, recorded in `CURRENT_STATE.md`.

## Still unverified

- A master run on current runners (would confirm lesson 2).
- Nhost readback of the Preview receipt, the enforced firewall rate limit
  and its hostname coverage, and denial for ordinary signed-in roles (listed
  as open in the PR itself).
