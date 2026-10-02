# AUTONOMOUS PROMPT — ProgressPal Epic E (refreshed after Pre-E, C3 correction)

## First real additional programme: Programvareutvikling

This prompt supersedes `ProgressPal_Epic_E_Overnight_Autonomous_Prompt_20261001.md` and its `f153f19…`/`5ffe8f5…` baselines, and the first Pre-E revision of this file (candidate C2). Do not use either.

You are implementing Epic E in the real local ProgressPal repository, from exact live readiness to one immutable local candidate with candidate-bound automated evidence. You may not self-award independent review, owner content or visual acceptance, release acceptance, merge or deployment.

Maximum successful state: `EPIC_E_CANDIDATE_AUTOMATEDLY_VALIDATED_READY_FOR_INDEPENDENT_AND_OWNER_REVIEW`

## 0. Corrections carried into this prompt

- The baseline is defined by the accepted Pre-E review binding (section 2), not by a SHA that cannot be known in advance.
- The static instructional-content layer and canonical hints are **Epic E scope**, not a domain-model replan. Persisted attempts, evaluators, mastery, retrieval and evidence-gated rewards are **later phases**, not blockers. The first Pre-E revision got both wrong.
- A static review file does not certify anything. The gate fails closed unless an independent review is bound to the candidate payload tree. Never write review evidence for your own candidate.
- Production is gated only after the owner activates Vercel Deployment Checks. Until `docs/CURRENT_STATE.md` records that, any push to `master` goes to Production unvalidated. Epic E never pushes.
- Bundle budgets are constraints you measure on the real build, not decisions to request in advance.
- Source IDs are uppercase and the live entity-ID rule is lowercase.
- Use `ProgressPal_Development_Process_v3.2_20261001.md`.

## 1. Authority

For Programme #2 and Epic E, when sources conflict, in this order:

1. the owner's current direct authorization message in chat;
2. exact live Git, repository and deployment bytes, and mechanically verified accepted candidate evidence;
3. protected current Programvareutvikling owner authority: `C:\00 DEV\In Progress\ProgressPal-Programvareutvikling\00_CONTROL\00_START_HERE.md` and `…\00_CONTROL\02_OWNER_DECISIONS_AND_SCOPE.md`, including OD-P2-32;
4. current Programme #2 product authority under `…\05_OUTPUT\21_PRODUCT_SCOPE_RECOVERY_AND_INTEGRATION_READINESS\` (product kernel, delivery contract, gap matrix, readiness verdict, closure);
5. the canonical M01/M02 product sources that authority references: the current `pilot.json`, objective and skill mappings, learner-facing content and hints;
6. accepted Pre-E engineering evidence;
7. the Pre-E reports in `docs/post-release/pre-e/` as **derived analysis**, which never override 3 to 5;
8. process v3.2 and the Lessons Learned register;
9. older packages, for context only.

Live bytes beat stale prose; a later explicit owner decision beats an earlier plan. Study snapshots and the human-pilot lane stay historical optional validation material and are not product authority. The owner-supplied Phase I prompt (`ProgressPal_P2_M01M02_Integration_Phase_I_Autonomous_Prompt_20261002.md`, Downloads) defines the same bounded scope; where it names baseline `95489ea…` or branch `p2/i1-programme-instruction-shell`, this prompt's baseline and branch rules win.

## 2. Preflight and expected baseline (fail closed)

Record before any mutation:

```powershell
git fetch --all --prune
git status --short --branch
git branch --show-current
git rev-parse HEAD
git rev-parse 'HEAD^{tree}'
git rev-parse 'HEAD:src'
git ls-remote --heads origin master
git branch --list programme/epic-e-programvareutvikling
npm run review:payload-tree
```

Expected: `master` equals `origin/master`, the worktree is clean, and `git merge-base --is-ancestor 95489ea0e08909054a4fa82120b28b131873d40c HEAD` succeeds. Also record whether engineering candidate `2f3484a84f51f1483a18504a8e5dbdf4974b90c2` is an ancestor; it will not be if the owner squash-merged, so that is informational and the payload binding below is the authority. The accepted Pre-E state is the one whose payload tree equals the `binding.payloadTree` of the accepted independent review of the Pre-E documentation candidate; the review module is named in the owner's authorization message. If `npm run review:payload-tree` does not equal it, `master` is not the accepted state: STOP and report the actual identity and the paths changed since `95489ea…`. Never reset, rebase or force-move to match this prompt. If `programme/epic-e-programvareutvikling` exists, inspect it, do not delete or reset it; otherwise create it from `master`.

Read `docs/CURRENT_STATE.md` and record whether Vercel Deployment Checks are recorded active. Epic E never pushes; this only determines what you tell the owner.

## 3. Scope: the bounded first integration

Deliver, through the existing programme platform and shared surfaces:

1. Register Programvareutvikling as the second production programme through the existing registry; CS50x stays the explicit default and bootstrap programme. Registration is not enrolment: no existing learner is enrolled or switched.
2. Use the existing enrolment, switching, reset and backup/restore architecture unchanged.
3. Map exactly 2 `module` units and 25 `lesson` items from the authoritative M01/M02 sources: source order, `required` flags (24 required, 1 optional), minutes, lowercase IDs (deterministic lowercase of the source ID, injective, collision-free against CS50), exercises nested in static content, never 291 catalogue rows. Semester stays curriculum metadata, not an entity.
4. Add the **smallest optional, static, bundled, programme-owned instructional-content contract** to `ProgrammeDefinition` (the field name and shape come from live code), validated with Zod and failing closed: no duplicate lesson ID, no orphan content, no required lesson item without content, no unknown unit, invalid source-fingerprint shape rejected. It is not a CMS and not persisted.
5. Deterministically export and bundle the app-safe M01/M02 instructional content as a committed static snapshot carrying the source SHA-256 and a content version. The app never reads the workspace at runtime. Do not hand-retype lessons. Exclude all research and study material.
6. Render lessons through the existing course-item route with one clear branch for item type `lesson` into a bounded component module (not a more monolithic `ContentDetailPage`): authored Bokmål prose, headings, lists, callouts, code and terminal text exactly as authored (whitespace, case, quotes; copyable; never executed), worked examples, exercise prompts, and **canonical hints as learner-controlled reveals**, one at a time in authored order. Render text nodes only and never inject raw HTML. Use a small purpose-built parser for the inline-code, fence, heading and list markup that the real content uses, tested on real strings including `<module>`-style text. Do not expose unit IDs, skill IDs, gating roles or difficulty numbers (DC-04).
7. Code, terminal and Git activities tell the learner to work in their own local environment (OD-P2-18). Make no claim that ProgressPal verified an exercise it cannot evaluate. Interactions create no mastery, attempt or evidence.
8. Use lesson-level progress only: existing not started, started, completed and blocked statuses. Do not present `submitted` or `accepted` as mastery.
9. Make active-programme identity, content and policy correct and remove CS50 leakage only where RED tests prove it (section 6). Preserve CS50x behaviour entirely.
10. Preserve the authored Bokmål with the smallest content-language boundary the live architecture supports (language marked on programme-owned content, DC-43); keep code, commands and industry terms English as authored (DC-44, OD-P2-23). Record the remaining English shell text as a learner-facing release-quality gap. Build no i18n framework.
11. Policy: the minimum neutral valid programme policy the contracts allow (no programme XP economy and no programme achievements invented; the six shared achievements apply). If the contracts make that impossible without misleading behaviour, stop with the exact contract problem.

**Excluded from Epic E:** exercise-attempt persistence, evaluator attempt history, mastery and skill-evidence persistence, delayed-retrieval scheduling, evidence-gated reward persistence, step-level resume, an embedded runtime or browser IDE, cloud sync or auth, a full localisation framework, S1-M03 onward, any human-study workflow, and C8 unless real evidence triggers it. A later attempt/evaluator phase will probably need its own store and migration; design and RED-test it then, not now, and predeclare no schema.

## 4. Gates

Stop only for real in-scope evidence, with the exact evidence and the smallest proposed next step:

| Condition                                                                                                                                                                                                                                              | State                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Authoritative source missing or the pilot hash differs and cannot be reconciled                                                                                                                                                                        | `EPIC_E_STOP_MISSING_AUTHORITATIVE_PROGRAMME_SOURCE` |
| Epic E itself requires schema v4, an ownership change, a backup-format change, cloud/auth, new conflict semantics, or reinterpretation of historical learner state                                                                                     | `EPIC_E_PAUSED_L3_SCOPE_DECISION_REQUIRED`           |
| Real implementation proves `Programme → Unit → Item` cannot represent the source without distortion (an absent optional field is not this)                                                                                                             | `EPIC_E_PAUSED_DOMAIN_MODEL_REPLAN_REQUIRED`         |
| Real rendering proves a reusable presentation abstraction is needed: programme-specific frame or component forks, scattered `programmeId` presentation conditionals, a missing semantic asset boundary (a generic lesson renderer is not by itself C8) | `EPIC_E_PAUSED_C8_TRIGGERED`                         |
| The real build breaches an accepted bundle budget                                                                                                                                                                                                      | `EPIC_E_PAUSED_BUDGET_DECISION_REQUIRED`             |
| A concrete external link or asset needs a host or rights decision                                                                                                                                                                                      | stop for that specific decision                      |

**Budgets.** Keep every accepted budget unchanged. Build the real bounded slice, run `npm run build` and `npm run check:bundle`, and inspect actual chunking and incremental CSS and JS. Pre-E measured 109 B of CSS gzip and about 100 kB of JS gzip headroom and estimated about 82 kB gzip of render content for two modules; these are estimates, not a verdict. Never raise a budget or weaken `check:bundle`. Package 21 prefers bounded loading while the offline service worker relies on install-time discovery of boot assets and `AGENTS.md` forbids lazy route chunks; resolve that only from what the real build measures, and touch `public/sw.js` only if the owner authorizes it.

**Brand: the one genuine owner decision.** The shell hard-codes "ProgressPal CS50 Edition" (OD-6). Build the programme-aware mechanism and its RED tests first. If the authorization message states the visible brand for Programvareutvikling-active surfaces, implement it and continue to the normal success state. If it does not, complete everything brand-independent, create the candidate commit labelled non-final, and end at `EPIC_E_PAUSED_BRAND_DECISION_REQUIRED`; do not claim a final Programvareutvikling-active browser candidate while the wrong brand is visible.

No other owner input is required. Do not invent links, licences, scraped brand assets, institutional attribution, curriculum, or a visible title beyond the programme name the authority uses (`Programvareutvikling`); stop for the exact title only if the authority conflicts.

## 5. E0 source gate and live inspection

- `…\05_OUTPUT\07_VERTICAL_SLICE\pilot.json` must have SHA-256 `577cd120b514d3df1445380e516916e1816dac16467311171d28764df7d96bc5` (1,110,182 bytes). If it differs, the content moved after the fit analysis: reconcile the delta and re-derive the counts before continuing, or stop.
- Run the workspace's `00_verify_inputs.js` and Package 21's `tools_validate_and_manifest.js --check` read-only. Do not run the study pipeline, `run_all.ps1` or anything that rewrites study evidence, and do not restart the human-pilot lane.
- Re-derive from source, do not trust: 2 modules, 25 missions (`S1-M02-O08` optional), 47 units, 291 exercises, no URLs, the ID and collision proof (Pre-E evidence package `p2-id-and-coverage-checks.json`).
- Read the live code the design depends on and correct any assumption here that it contradicts: `src/programmes/{definition,registry}.ts` and `cs50x-2026/*`; `src/lib/domain/{constants,programmePolicy,programmeContent,schemas}.ts`; the C6/C7 enrolment, switch and restore paths; app-state resolution; Settings → Programme; the course route and `ContentDetailPage`; the CS50-default compatibility entrypoints (`cs50Links.ts`, `detailModel.ts`, `guideContent.ts`, `questRewards.ts`, `readModels.ts`) and `tests/architecture/programmeScopeComposition.test.ts`; `tests/programmes/c7Fixture.ts`; `scripts/check-build-budget.mjs`.

## 6. Implementation discipline

- **RED first.** Before production changes, record an immutable RED checkpoint SHA proving with the real definition: registration succeeds and collisions fail closed; CS50 state is unchanged after upgrade; fresh initialization stays CS50; Programvareutvikling appears registered and un-enrolled; explicit enrol, enrol-and-switch, same-active no-op, and A→B→A with non-aliasing progress; no manufactured XP, achievement, session, profile or Insights writes on switch; failed target preparation keeps the old active programme; an unknown active programme fails closed; reset from Programvareutvikling returns to the default; a valid Programvareutvikling-active backup previews and restores to the correct scope. Do not weaken C6/C7 oracles.
- **Leaks.** For every `getDefaultProgrammeDefinition()` use reachable with Programvareutvikling active, prove by RED test whether it leaks (CS50 wording, guides, links, workflow, brand). Fix only proven leaks by passing the active scope; do not mechanically replace every call or remove intentionally CS50-only wrappers.
- **Sanitation.** An automated assertion over the production content for study-only language (observer, participant consent, Track A, Track B, intervention level, PRB-SET, study baseline). Do not copy research files into the repository.
- **Accepted oracles** are contract elements. Change one only additively or strength-preservingly, disclose it in a table in the report, and flag it for the independent reviewer.
- Scope discipline: no schema change, no new dependency, no wholesale reformatting, no unrelated refactor.

## 7. Real application proof

Use the real production registry with both programmes. Cover Settings → Programme in the two-production-programme state (keyboard operation, accessible names, focus does not switch, pending and error states); Classic and RPG content after switch, back and forth, and reload persistence; offline start; no cross-programme content, guide, link, workflow, terminology or brand leakage. This activates the C7 real-browser multi-programme accessibility residual.

Stress with **real Programvareutvikling strings**: item title 44 chars (`Ekstra øving (valgfri): les, forutsi og rydd`), module title 34, goal 143, longest prompt 280, longest content string 827, plus code, terminal and table blocks, at representative mobile and desktop widths and breakpoint −1/+1 where behaviour changes. Check Norwegian wrapping, keyboard hint reveal, code and terminal blocks readable by assistive technology as preformatted text with the right language, correctness and state never conveyed by colour alone, reduced motion. Preserve accepted Epic D behaviour (mobile fixed bottom navigation, desktop normal-flow navigation, compact HUD, skip link and focus, no occlusion). Roughly 8 to 12 curated states, not hundreds.

## 8. Evidence quality

Keep roles separate: source fidelity (the source-to-product mapping with reverse coverage, reviewed independently of runtime evidence), semantic behaviour, persistence and isolation, accessibility, visual capture, diagnostics, release evidence. A screenshot does not prove content fidelity, and a green count does not prove curriculum accuracy. Silence is not zero diagnostics unless the channel is calibrated: run `npm test -- --reporter=default`, use a positive control, and keep a `page.on('console')` probe in git-ignored `artifacts/`. New critical oracles must be shown to fail for the intended defect before being relied on. Do not mistake mechanically decidable properties for review findings, and do not answer a missed mechanical defect with more review ceremony.

## 9. Candidate freeze and validation

Use focused checks while source is fluid. Before freezing: inspect the full diff; confirm nothing in section 3 exclusions or section 4 was crossed; then, **after the last edit of any tracked file, docs included, and immediately before `git commit`**, run the whole-repository `npm run format:check`, `npm run lint`, `npm run typecheck`, plus `git diff --check`, `npm run build` and `npm run check:bundle`. Create **one** immutable candidate commit and record SHA, root tree, `src` tree, `npm run review:payload-tree`, parent, changed paths, branch and cleanliness. Do not amend after candidate-bound evidence starts.

Run the L2 candidate suite once on the exact candidate: format, lint, typecheck, build, bundle budget, circular, audit, full unit/integration with `--reporter=default`, full managed E2E, architecture guards, calibrated diagnostics. Run the ordinary commands directly. `npm run verify:release` needs independent review evidence bound to the candidate, which this session cannot supply; show that it fails closed at the review step before executing any suite. Preserve any failure and classify its layer before rerun. A bounded repair is a new commit, and only the evidence that depends on it is invalidated.

## 10. Evidence package

Outside the tracked tree: baseline and candidate identity; diff, stat and name-status; a Git bundle; the source inventory, source-to-product mapping with reverse coverage and the ID and collision mapping; validation counts with warnings, retries and skips; screenshots and measurements; budget figures; residual risks; the C8, domain, L3 and budget dispositions; the table of accepted-oracle changes; checksums computed on the final packaged bytes. **Generate every change count from Git** (`git diff --shortstat` and `--name-status` from the baseline), never by hand. Include the payload tree the reviewer must bind.

## 11. Self-review

Review from these perspectives and repair only concrete in-scope defects: project and scope; architecture; curriculum fidelity; data and persistence; UX; UI and accessibility; testing and QA; release engineering; adversarial; retrospective. Self-review is not independent review. If two materially different post-freeze repair rounds show the contract is wrong, STOP rather than patch forward.

## 12. Forbidden

Push; PR; merge; tag; release; deploy; modify Vercel or GitHub settings; start Epic F or G; implement C8 silently; create schema v4; add auth or cloud; change global learner-state ownership; build attempt persistence, mastery, retrieval scheduling, an evaluator or a runtime; invent curriculum, brand, licence or owner decisions; scrape branding; raise a budget or weaken `check:bundle`, tests, oracles or diagnostics; use a synthetic programme as a substitute for the real production proof; write review evidence for your own candidate; rename `progresspal-cs50-edition` or the cache prefix.

## 13. Final report

Baseline identity and how the Pre-E binding was verified; authoritative source identity and hash; whether the owner supplied the brand; candidate SHA, root, `src` tree, payload tree, parent; changed paths; Git-generated change counts; gate and test counts; diagnostics; source-mapping completeness; collision and isolation evidence; reset and restore evidence; accessibility and browser evidence; visual evidence; budget measurements; C8, domain and L3 dispositions; accepted-oracle changes; residual risks; package checksum; whether Vercel Deployment Checks are recorded active; and the exact maximum state reached.

States: success `EPIC_E_CANDIDATE_AUTOMATEDLY_VALIDATED_READY_FOR_INDEPENDENT_AND_OWNER_REVIEW`. Stops: `EPIC_E_STOP_MISSING_AUTHORITATIVE_PROGRAMME_SOURCE`, `EPIC_E_PAUSED_BRAND_DECISION_REQUIRED`, `EPIC_E_PAUSED_C8_TRIGGERED`, `EPIC_E_PAUSED_DOMAIN_MODEL_REPLAN_REQUIRED`, `EPIC_E_PAUSED_BUDGET_DECISION_REQUIRED`, `EPIC_E_PAUSED_L3_SCOPE_DECISION_REQUIRED`.
