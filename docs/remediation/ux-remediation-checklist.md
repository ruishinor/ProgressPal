# UX Remediation Checklist

This file is the persistent recovery and continuity protocol for the ProgressPal UX remediation. Update it after every completed subtask.

---

## Current state

| Field                  | Value                                                       |
| ---------------------- | ----------------------------------------------------------- |
| Branch                 | `ux/00-remediation-roadmap`                                 |
| Baseline commit        | `34e0be7 Surface CS50 course content in tracker`            |
| Current module         | UX-00 — Adversarial UX audit and baseline lock              |
| Last completed subtask | Full validation suite passed; checklist updated             |
| Status                 | UX-00 complete; all validation passed; awaiting commit approval |

---

## Rollback instructions

If anything goes wrong before the UX-00 commit:

```powershell
git status -sb          # confirm what changed
git restore docs/       # discard docs changes if needed
```

UX-00 changes only documentation. No runtime code, schema, or dependency was changed. Rolling back is safe at any point before commit.

If already committed and a rollback is needed:

```powershell
git revert HEAD         # creates a new revert commit; do not use --hard reset on a pushed branch
```

---

## Files changed so far (UX-00)

| File                                           | Type    | Status              |
| ---------------------------------------------- | ------- | ------------------- |
| `docs/remediation/ux-remediation-roadmap.md`   | New doc | Created             |
| `docs/remediation/ux-remediation-checklist.md` | New doc | Created (this file) |
| `docs/remediation/plain-language-glossary.md`  | New doc | Created             |
| `docs/remediation/ux-audit-findings.md`        | New doc | Created             |

No runtime source, test, schema, dependency, service-worker, or package-script file was changed.

---

## Validation commands for UX-00

Run all of the following. All must pass or be documented:

```powershell
cd "C:\00 DEV\In Progress\ProgressPal"
git status -sb
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm run audit
```

If `npm run test:e2e` hangs on teardown, use managed-server method and document it:

```powershell
# In one terminal:
npm run dev
# In another:
npx playwright test --workers=2
```

### Documentation sanity check

Run this after validation to confirm no forbidden terms leaked into the new docs as recommended language:

```powershell
rg -n "watched range|slice timeline|Use next slice|Evidence|Confidence|Course item|Content detail|Progress record|local derived state|schema-backed|granular asset timeline|mutable surface" docs/remediation README.md PROJECT_STATE.md docs/DEMO.md
```

Expected: Hits will appear in `docs/remediation/ux-audit-findings.md` and `docs/remediation/plain-language-glossary.md` because those files document the forbidden terms as problems to fix. Hits in the roadmap or checklist should be in table rows that clearly label them as "current" / "bad" / "forbidden" — not as recommended language.

---

## Known failures

None at this baseline. UX-00 is documentation only.

If validation reveals a previously unknown test failure, record it here before proceeding.

---

## Stop conditions for UX-00

UX-00 is complete when:

- [x] All four documentation files exist in `docs/remediation/`
- [x] `npm run lint` passes (zero warnings)
- [x] `npm run format:check` passes
- [x] `npm run typecheck` passes
- [x] `npm run build` produces a clean bundle
- [x] `npm run test` passes (all unit/integration tests)
- [x] `npm run test:e2e` passes (or managed-server equivalent documented)
- [x] `npm run check:circular` passes
- [x] `npm run audit` passes (zero moderate+ vulnerabilities)
- [x] Documentation sanity check confirms no forbidden terms appear as recommended language
- [x] `git status -sb` shows only the four new doc files (no runtime changes)
- [x] Three content/UX review passes confirm: no mojibake, no spelling errors, no overclaims, no forbidden terms as recommended language, roadmap matches actual local-only CS50-only product

Do not commit until all boxes above are checked.

---

## Proposed commit message (UX-00)

```
Document ProgressPal UX remediation roadmap
```

---

## Module status tracker

| Module | Goal                               | Status      | Commit  |
| ------ | ---------------------------------- | ----------- | ------- |
| UX-00  | Audit and baseline lock            | In progress | pending |
| UX-01  | Plain-language terminology cleanup | Not started | —       |
| UX-02  | Learner-first lecture page         | Not started | —       |
| UX-03  | Learner-first problem set page     | Not started | —       |
| UX-04  | Stronger XP/achievement/level loop | Not started | —       |
| UX-05  | Save history and repair path       | Not started | —       |
| UX-06  | Onboarding simplification          | Not started | —       |
| UX-07  | Local CS50 guide content           | Not started | —       |
| UX-08  | Visual hierarchy polish            | Not started | —       |
| UX-09  | Final acceptance review            | Not started | —       |

---

## Per-module protocol (every module, including this one)

### Before starting any module

1. `git status -sb` — confirm branch and clean state
2. `git log --oneline --decorate -5` — confirm baseline
3. `git ls-files .agent .agents .claude _bmad _bmad-output design-artifacts` — confirm no support folders
4. Update this checklist with current module, subtask, and files to change

### After completing any module

1. Run all validation commands (full set for persistence/XP/schema modules; abbreviated for copy-only modules — see roadmap)
2. Run documentation sanity check (forbidden-term search)
3. Final `git status -sb`
4. Update this checklist: last completed subtask, files changed, validation results, proposed commit message
5. Stop before commit; report to human for approval

---

## UX-01 pre-flight checklist (prepare before starting)

When UX-00 is committed and UX-01 begins, confirm:

- [ ] Branch is still `ux/00-remediation-roadmap` or a new `ux/01-terminology-cleanup` branch
- [ ] Baseline is `34e0be7` (or the UX-00 commit)
- [ ] No support folders tracked
- [ ] `ux-audit-findings.md` is the primary reference for what to change
- [ ] `plain-language-glossary.md` is the reference for what to change it to
- [ ] Every test that asserts a forbidden label (listed in audit findings §1.7) is on the list to update

UX-01 target files:

- `src/features/course/routes/ContentDetailPage.tsx`
- `src/features/course/components/CourseUnitCard.tsx`
- `src/features/course/components/CourseMapSummary.tsx`
- `src/features/sessions/routes/SessionsPage.tsx`
- `src/features/dashboard/routes/DashboardPage.tsx`
- `src/features/insights/routes/InsightsPage.tsx`
- `src/features/achievements/routes/AchievementsPage.tsx`
- `src/components/layout/AppShell.tsx`
- `e2e/achievements.spec.ts`
- `e2e/dashboard.spec.ts`
- `e2e/insights.spec.ts`
- `e2e/settings.spec.ts`
- `e2e/xp.spec.ts`
- `tests/app/App.test.tsx`

Forbidden-term search to run after UX-01:

```powershell
rg -n "Course item|Content detail|Progress record|watched range|Watched range|slice timeline|Slice timeline|Use next slice|Evidence|Confidence|local derived state|Item context|Asset tracking|granular asset timeline|mutable surface|Study ledger|session ledger|Local ledger|Storage rule|Derived duration" src tests e2e
```

All hits in user-facing strings must be removed or justified. Internal code names may remain.

---

## Validation results log

### UX-00 — 2026-06-17

| Command                  | Result | Notes                                                                                                                          |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `git status -sb`         | PASS   | Only `docs/remediation/` untracked; no runtime changes                                                                        |
| `npm run lint`           | PASS   | Zero warnings                                                                                                                  |
| `npm run format:check`   | PASS   | After running `prettier --write docs/remediation/` to fix table formatting in new .md files                                   |
| `npm run typecheck`      | PASS   | Zero errors                                                                                                                    |
| `npm run build`          | PASS   | All chunks under 600 kB; 195 modules transformed                                                                               |
| `npm run test`           | PASS   | 32 test files / 208 tests passed                                                                                               |
| `npm run test:e2e`       | PASS   | 24/24 Playwright tests passed using `--workers=2`; managed-server method (known environment teardown limitation documented)    |
| `npm run check:circular` | PASS   | No circular dependencies                                                                                                       |
| `npm run audit`          | PASS   | 0 vulnerabilities                                                                                                              |
| Forbidden-term search    | PASS   | All hits in "forbidden/current" columns or grep-pattern strings; none appear as recommended UI language                        |
| Content review pass 1    | PASS   | No mojibake; no spelling errors; no overclaims; no affiliation language; roadmap matches actual local-only CS50-only product   |
| Content review pass 2    | PASS   | Forbidden terms listed as problems not recommendations; all module descriptions match actual planned scope; no CS50 content copied |
| Content review pass 3    | PASS   | Five-second test passes for each doc; plain language throughout; no security/encryption overclaims                             |
