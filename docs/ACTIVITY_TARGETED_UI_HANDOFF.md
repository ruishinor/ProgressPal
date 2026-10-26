# Activity — mobile totals and inline logging

2026-10-26. Local implementation and targeted verification complete; owner acceptance remains pending.

## Identity and scope

Worktree: `C:\Users\alex_\.codex\worktrees\8939\ProgressPal`. Detached HEAD remains `c7f04b816cfa8b155df0b4a6986ddac86668ba77`. All earlier uncommitted Activity implementation and UX work was preserved. Preflight hashes of the 68 existing changed/untracked files and recovery copies of the four edited UI/test files are in gitignored `artifacts/activity-targeted-before.json` and `artifacts/activity-targeted-before/`.

Final Git state: 50 modified tracked files, 19 untracked files and zero staged files, including the earlier implementation. Six existing files changed in this pass and this handoff was added. The other 62 preflight files retain identical hashes. Final preservation evidence: `artifacts/activity-targeted-preservation.json`; `git diff --check` passed.

Files changed during this pass:

- `src/features/rpg/activity/ActivityPage.tsx`: responsive totals markup, one inline goal draft, shared entry submission, conflict guards and focus.
- `src/styles/activity.css`: stacked phone totals and inline-form spacing.
- `tests/features/rpg/activityPage.test.tsx`: focused quick-entry behavior and updated former full-form quick-log expectation.
- `e2e/activity.spec.ts`: inline sets, draft protection and responsive totals/readability evidence.
- `src/features/rpg/activity/README.md`, `docs/CURRENT_STATE.md`, and this handoff: current behavior and owner review.

No schema, repository, model, domain, dependency, educational progression, shared HUD/navigation, reminder, backup, provider, offline-cache or bundle-limit change was made. No real learner database or backup was opened. No commit, stage, push, merge, PR, tag, deployment or live Nhost change was performed.

## Delivered behavior

**History:** below the existing 42rem mobile breakpoint, each totals row uses the full width, with its activity/unit above the labelled last-28-day and lifetime values. Wider screens retain the conventional three-column table. There is one set of values and one semantic table: explicit table roles preserve relationships when rows become grids; mobile-only visual labels are hidden from assistive technology, which retains the real column headers. Ordinary words no longer squeeze into narrow columns. Totals and unit conversions still come from the unchanged model.

**Daily logging:** selecting Log/Registrer opens one amount field inside the goal row. Activity and measurement come from that goal. Save/Lagre submits one individual entry for the current local calendar date, using the existing conversion, coordinated mutation, repository and transient feedback. Save closes the inline form and returns focus to the goal action; Cancel/Avbryt closes it without a write. Invalid amounts and failed writes retain the inline input. Pending writes disable repeated submission.

The full form stays available for activities without goals, other measurements, historical dates and edits. Its draft is never changed by opening, cancelling or saving inline entry. While an inline entry is open, other goal Log actions, the full form and historical Edit actions are unavailable until save/cancel. Tabs remain usable and preserve both drafts. An active historical edit prevents opening inline entry. If its goal is removed while the inline draft is open, that draft remains reachable in Today with its original activity/unit and cancellation path.

## Verification and actual results

- **PASS — 15/15 unit tests:** `npm test -- tests/features/rpg/activityPage.test.tsx`. Covers authoritative success, pending duplicate prevention, failed-write retry/input retention, cancellation without a write, section/draft retention, historical-edit protection, whole repetitions, minute/second precision and kilometre/metre precision. Existing feedback expiry/unmount cleanup and ACT-01 presentation checks remain passing.
- **Initial browser run — 7 passed, 1 failed:** `npm run test:e2e -- e2e/activity.spec.ts`. Existing journeys passed, including inline 8+7+5 → 20, correction/deletion, synthetic export/restore, programme/language switching, offline/read-only, both viewport/theme accessibility journeys and draft/goal removal handling.
- **PASS — remaining History case:** the new case initially failed on test selectors: the Bokmål Activity label matched both the region and select; an exact label lookup included select options; a role lookup attempted to inspect a hidden tab. These were test-authoring issues. Role-based visible controls and selecting the custom option by its label resolved them; no product code changed in response. Only this case was rerun against the same production artifact, using an owned Vite preview and `node node_modules/@playwright/test/cli.js test --config playwright.managed.config.ts e2e/activity.spec.ts --grep "History totals stay readable"`. The preview closed in `finally`. The final run passed 1/1 and captured the unobscured close-ups. All eight Activity browser journeys therefore passed across the initial unaffected cases and targeted closure, without rerunning the full repository suites.
- The History case checks actual activity-to-value associations: 4,000/7,500 repetitions, 90/120 minutes and 35/220 km, produced through synthetic manual entries with current and older dates. It checks full-width mobile row headers versus desktop columns, both themes, axe and horizontal overflow. The seven earlier cases also exercise keyboard focus above fixed navigation, 95% on one line and enlarged text. Rendered screenshots were inspected; overflow assertions alone were not treated as proof of readability.
- **PASS — production build:** performed by the managed browser command on the final product source. Later changes were test selectors/screenshots and documentation only; no repeated production build was needed.
- **PASS — bundle check:** `npm run check:bundle`. JavaScript gzip **439,493 B**, below unchanged **445,000 B**; largest JavaScript chunk **493,717 B raw**, below 500,000 B. CSS gzip **14,780 B**; curriculum/runtime gzip **126,984 / 6,398,912 B**. No budget warnings or violations. The preceding UI candidate measured 439,000 B JS gzip: this correction adds **493 B**.
- **PASS — final checks:** `npm run typecheck`, `npm run lint` (zero warnings), `npm run format:check`, `git diff --check`, unchanged HEAD and preservation hashes. No release certification or independent-review verdict is claimed.

## Rendered evidence

The following are local, gitignored browser captures, not mockups:

- [320px History, full page](../artifacts/activity-targeted-history-320-light.png)
- [320px totals close-up, light](../artifacts/activity-targeted-totals-320-light.png)
- [320px totals close-up, dark](../artifacts/activity-targeted-totals-320-dark.png)
- [320px inline goal, Bokmål close-up](../artifacts/activity-targeted-quick-goal-320-nb.png)
- [320px inline goal, English full page](../artifacts/activity-targeted-quick-320-light.png)
- [Desktop History](../artifacts/activity-targeted-history-1440-dark.png)
- [Desktop inline entry](../artifacts/activity-targeted-quick-1440-light.png)

Full-page screenshots can show the viewport-fixed navigation over part of the long image. The element close-ups show the totals and goal controls unobscured. Phone input focus was also checked geometrically against that navigation.

## Limitations and next action

Physical touch keyboards, other browser/OS native controls and actual screen-reader speech were not tested. Chromium keyboard, semantic and axe checks passed. The existing mobile HUD remains large and is unchanged; a compact HUD should be assessed separately across the RPG application. No new shared-shell treatment was introduced.

Owner acceptance is next: from this worktree, use the existing local server or run `npm run dev -- --host 127.0.0.1`, then open `/rpg/movement` at Vite's printed address. At 320px, inspect History totals and use Registrer → amount → Lagre on a goal. Leave an unfinished full-form amount/date, perform an inline entry, then confirm the full draft remains intact; also try cancel, section switching and historical editing. No test preview is intentionally left running.

No release integration or provider work follows automatically. Multi-unit custom activities, extra weight, shared HUD changes and the other previously deferred enhancements remain outside scope.
