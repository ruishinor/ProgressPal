# AUTONOMOUS PROMPT — ProgressPal Epic E (refreshed after Pre-E)

## First real additional programme: Programvareutvikling

This prompt supersedes `ProgressPal_Epic_E_Overnight_Autonomous_Prompt_20261001.md` and its frozen `f153f19…`/`5ffe8f5…` baselines. It was written from the Pre-E hardening and source-fit run (`docs/post-release/pre-e/`), not reconstructed from the old prompt. Do not use the old prompt.

You are implementing Epic E in the real local ProgressPal repository, from exact live readiness to one immutable local candidate with candidate-bound automated evidence. You may not self-award independent review, owner content or visual acceptance, release acceptance, merge or deployment.

Maximum successful state: `EPIC_E_CANDIDATE_AUTOMATEDLY_VALIDATED_READY_FOR_INDEPENDENT_AND_OWNER_REVIEW`

## 0. What the Pre-E run disproved (do not carry these forward)

- The old baseline commit. The baseline is now defined by the accepted Pre-E review binding (section 2), not by a SHA that cannot be known in advance.
- "Existing contracts are enough." `ProgrammeContent` cannot carry lesson bodies, hints or exercises (fit report row 14). Whether Epic E includes that layer is an owner decision (D4), not something to infer.
- "A static review file certifies the candidate." The gate now fails closed unless an independent review is bound to the candidate payload tree. Never write review evidence yourself.
- "Production is gated." It is gated only after the owner activates Vercel Deployment Checks. Until `docs/CURRENT_STATE.md` records that, any push to `master` goes to Production unvalidated.
- "Bundle size is not a concern." Measured headroom is 109 B CSS gzip and about 100 kB total JS gzip; the lesson-render content for M01+M02 is about 82 kB gzip (fit report section 6).
- "IDs are trivial." Source IDs are uppercase; the live rule is lowercase kebab.
- Process v3.1. Use `ProgressPal_Development_Process_v3.2_20261001.md`.

## 1. Authority

In order: the owner's current direct authorization message in chat; `docs/CURRENT_STATE.md`; `docs/post-release/pre-e/PROGRAMVAREUTVIKLING_SOURCE_FIT_REPORT.md` and `PRE_E_HARDENING_REPORT.md`; exact live repository source; the Programvareutvikling workspace authority (`00_CONTROL/00_START_HERE.md`, `02_OWNER_DECISIONS_AND_SCOPE.md`, `05_OUTPUT/21_…`); process v3.2; the updated Lessons Learned register; historical packages as context only. When they conflict, live bytes beat prose and a later owner decision beats an earlier plan.

## 2. Preflight and expected baseline (fail closed)

Run before any mutation and record the output:

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

Expected: `master` equals `origin/master`, the worktree is clean, and `git merge-base --is-ancestor 95489ea0e08909054a4fa82120b28b131873d40c HEAD` succeeds. The accepted Pre-E candidate is the one whose payload tree is named by an accepted review file in `docs/release-reviews/`: the output of `npm run review:payload-tree` must equal that review's `binding.payloadTree` (the review module is named in the owner's authorization message). If it does not, `master` is not the accepted Pre-E state. STOP and report the actual identity and the paths changed since `95489ea…`. Never reset, rebase or force-move to match this prompt.

If `programme/epic-e-programvareutvikling` exists, inspect it; do not delete or reset it. Otherwise create it from `master`.

Also read `docs/CURRENT_STATE.md` and record whether Vercel Deployment Checks are recorded as active. Epic E never pushes; the status only determines what the owner is told in the final report.

## 3. Owner decision inputs (required in the authorization message)

Do not invent any of these. If a required input is absent, complete section 4 (E0) and the platform inspection, then STOP with `EPIC_E_STOP_OWNER_DECISIONS_REQUIRED` and list exactly what is missing.

| Id  | Decision                                                                                             | If absent                                                       |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| D1  | Shell brand (OD-6): keep, neutral, or programme-dependent                                            | STOP before any P2-active render                                |
| D2  | Content licence and link hosts (OD-7); attribution                                                   | no external links, no attribution; do not invent                |
| D3  | Shared-shell and type-label language for Bokmål learners; `lang` semantics                           | STOP before the browser proof                                   |
| D4  | Scope: **E-A** catalogue and thin guides only, or **E-B** adds the instructional content layer       | STOP; E-A alone is not assumed                                  |
| D5  | Budget and delivery: accepted CSS/JS gzip budget changes and static-boot strategy (required for E-B) | E-B is not started                                              |
| D6  | Mission→item mapping, `lab` surface mapping, `definitionKey`, `catalogueId`, programme `title`       | use the fit-report recommendation only if the message says so   |
| D7  | XP policy for P2 (amounts, types) and any programme achievements                                     | use an empty XP policy and no programme achievements; record it |

The attempt, evaluator, mastery and retrieval engine is **not** part of Epic E. It needs a schema-v4 decision (L3, `PRE_E_L3_SCOPE_DECISION_REQUIRED`) and is a separate story.

## 4. E0 — source gate and live platform inspection

Source gate. Verify the authoritative source before authoring anything:

- `C:\00 DEV\In Progress\ProgressPal-Programvareutvikling\05_OUTPUT\07_VERTICAL_SLICE\pilot.json` must have SHA-256 `577cd120b514d3df1445380e516916e1816dac16467311171d28764df7d96bc5` (1,110,182 bytes). If it differs, STOP: the content moved after the fit analysis. Reconcile the delta and re-derive the fit counts before continuing.
- Run the workspace's `00_verify_inputs.js` and its `05_OUTPUT/21_…/tools_validate_and_manifest.js --check` read-only; do not run the study pipeline, `run_all.ps1`, or anything that rewrites study evidence; do not restart the human-pilot lane.
- The app must not import from the workspace at runtime. Deterministically export an app-safe snapshot (product content only: no observer, consent, Track A/B, telemetry or probe material), validate it, commit the snapshot under the programme definition, and embed the source SHA-256 and a content version. The export tool is repository-local, small and has durable value; it is not a new baseline framework.
- If exact programme identity or source truth is missing: `EPIC_E_STOP_MISSING_AUTHORITATIVE_PROGRAMME_SOURCE`.

Facts already established (re-derive, do not trust blindly): 2 modules, 25 missions (24 required, 1 optional `S1-M02-O08`), 47 units, 291 exercises; no URLs in content; Bokmål; mapping and ID proof in the fit report (`p2-source-to-catalogue-mapping.csv`, `p2-id-and-coverage-checks.json` are in the Pre-E evidence package).

Live inspection. Read, from source, and correct any assumption here that the code contradicts: `src/programmes/{definition,registry}.ts` and `cs50x-2026/*`; `src/lib/domain/{constants,programmePolicy,programmeContent,schemas}.ts`; `src/lib/db/{database,migrationContext}.ts` and the C6/C7 enrolment, switch and restore paths; app-state resolution; Settings → Programme; the CS50-default compatibility entrypoints (`cs50Links.ts`, `detailModel.ts`, `guideContent.ts`, `questRewards.ts`, `readModels.ts`) and `tests/architecture/programmeScopeComposition.test.ts`; `tests/programmes/c7Fixture.ts`; `scripts/check-build-budget.mjs`.

## 5. Risk gates (STOP, do not implement)

Proceed under L2 only while none of these is required: schema v4 or any migration; ownership changes; backup-format changes; auth or cloud; new conflict semantics; reinterpretation of historical global state. Otherwise STOP with the exact reason.

- **Domain gate.** If the real structure cannot truthfully fit `Programme → Unit → Item` plus the accepted contracts, STOP with `EPIC_E_PAUSED_DOMAIN_MODEL_REPLAN_REQUIRED`. The content layer and delivery architecture are already recorded as scoped replans; do not start them without D4 and D5.
- **C8 gate.** Use existing presentation first. If a clean implementation needs programme-specific frame or component forks, scattered `programmeId` presentation conditionals, or a missing semantic asset boundary that must become reusable architecture, STOP before building it with `EPIC_E_PAUSED_C8_TRIGGERED`, exact render evidence and the smallest proposed C8 scope. A generic lesson renderer is not C8 by itself; it is the D4/D5 content layer.
- **Budget gate.** Measure with `npm run build` and `npm run check:bundle`. If any change would exceed an accepted budget and D5 does not authorize the new limit, STOP with `EPIC_E_PAUSED_BUDGET_DECISION_REQUIRED`. Never raise a budget or weaken `check:bundle` yourself.

## 6. Implementation

### E-A (always, once D1–D3, D4, D6 are given)

1. **Catalogue.** Build the production `ProgrammeDefinition` from the snapshot: programme identity, 2 `module` units and 25 `lesson` items with the lowercase source IDs, source order, `required` flags and minutes. The vocabulary values `module` and `lesson` already exist (Pre-E); do not change them. Preserve source titles and terminology; omit unknown metadata; do not copy any CS50 file.
2. **Policy.** D7. With the default, XP and workflow are empty and there are no programme achievements; the six shared achievements apply. Record the consequence in the report.
3. **Content.** Terminology (`unitNoun`, `rpgIdentity`, `unitMapOrdinals` for every module, the 19 copy strings) authored in Bokmål from the source, only where the source supports it. Thin guides only if D4 is E-A; no lesson body invented.
4. **Registration.** Add the definition to the production registry. CS50x stays the explicit default and bootstrap programme. Registration is not enrolment: no existing learner is enrolled or switched.
5. **RED first.** Before production changes, add and record an immutable RED checkpoint SHA proving, with the real definition: collisions fail closed; CS50 state is unchanged after upgrade; fresh initialization stays CS50; P2 appears registered and un-enrolled; explicit enrol, enrol-and-switch, same-active no-op, A→B→A with non-aliasing progress; no manufactured XP, achievement, session, profile or Insights writes on switch; failed target preparation keeps the old active programme; unknown active programme fails closed; reset from P2 returns to the default; a valid P2-active backup previews and restores to the correct scope. Do not weaken C6/C7 oracles.
6. **Leaks.** For each CS50-default compatibility entrypoint, prove by RED test whether it leaks with P2 active (CS50 wording, guides, links, workflow, brand). Fix only proven leaks, by passing the active scope. Do not mechanically replace every `getDefaultProgrammeDefinition()` call.

### E-B (only with D4 = E-B and D5 given)

A bounded, optional, programme-owned, static, **non-persisted** instructional-content contract on `ProgrammeDefinition`, a generic lesson renderer reached through the existing `ContentDetail` route, and revealable hints. Requirements: render text nodes only, never inject raw HTML, no markdown dependency (inline code, fenced code, headings and lists handled by a small purpose-built parser with tests for the real content including `<module>`-style text); no new store; no claim that ProgressPal verified an exercise; code, terminal and Git tasks tell the learner to work in their local environment; no observer or research concepts; content in its own statically imported chunk within the accepted budgets (the render subset is about 370 kB raw; evaluator payloads stay out). Add RED tests for contract validation (no orphan lesson content, no duplicate IDs, every lesson has content, no URLs), and for the renderer on the longest real strings.

## 7. Real application proof

Use the real production registry with both programmes. Cover Settings → Programme in the two-production-programme state (keyboard operation, accessible names, focus does not switch, pending and error states); Classic and RPG content after switch; switch back and forth; reload persistence; offline start; no cross-programme content, brand, guide, link or wording leakage. This activates the C7 real-browser multi-programme accessibility residual.

Responsive and content stress with **real Programvareutvikling strings**: the longest titles (item 44 chars `Ekstra øving (valgfri): les, forutsi og rydd`, unit 34 chars, goal 143 chars, longest prompt 280 chars) at representative mobile and desktop widths and breakpoint −1/+1 where behaviour changes. Preserve accepted Epic D behaviour (mobile fixed bottom navigation, normal-flow desktop navigation, compact HUD, skip-link and focus, no occlusion). Roughly 8–12 curated states, not hundreds. Check Norwegian wrapping and `lang` handling per D3.

## 8. Evidence quality

Keep roles separate: source/curriculum fidelity (the source-to-product mapping with reverse coverage, reviewed independently of runtime evidence), semantic behaviour, persistence and isolation, accessibility, visual capture, diagnostics, release evidence. A screenshot does not prove content fidelity; a green count does not prove curriculum accuracy; silence is not zero diagnostics unless the channel is calibrated (`npm test -- --reporter=default`, a positive control, and a `page.on('console')` probe kept in git-ignored `artifacts/`). New critical oracles must be shown to fail for the intended defect before being relied on.

## 9. Candidate freeze and validation

While source is fluid, use focused checks. Before freezing: inspect the full diff; confirm none of section 5 or section 12 was crossed; `git diff --check`; format, lint, typecheck, build, `check:bundle` and the focused programme, Settings and recovery tests. Create **one** immutable candidate commit; record SHA, root tree, `src` tree, `npm run review:payload-tree`, parent, changed paths, branch and cleanliness. Do not amend after candidate-bound evidence starts.

Run the L2 candidate suite once on the exact candidate (format, lint, typecheck, build, bundle budget, circular, audit, full unit/integration with `--reporter=default`, full managed E2E, architecture guards, calibrated diagnostics). Run the ordinary commands directly: `npm run verify:release` requires independent review evidence bound to the candidate, which this session cannot supply and must not fabricate. Show what the gate does without it: running it should fail closed at the review step before executing any suite. Preserve any failure and classify its layer before rerun; a bounded repair invalidates only the evidence that depends on it.

## 10. Evidence package

Exact baseline and candidate identity; diff, stat and name-status; a Git bundle; the source inventory, source→product mapping and reverse coverage; the ID and collision mapping; validation counts with warnings, retries and skips; screenshots and measurements; budget figures; residual risks; the C8, domain and L3 dispositions; and checksums computed on the final packaged bytes. Include the exact line the reviewer must bind: the payload tree.

## 11. Self-review

Review from these perspectives and repair only concrete in-scope defects: project and scope; architecture; curriculum fidelity; data and persistence; UX; UI and accessibility; testing and QA; release engineering; adversarial; retrospective. Self-review is not independent review. If two materially different post-freeze repair rounds show the contract is wrong, STOP rather than patch forward.

## 12. Forbidden

Push; PR; merge; tag; release; deploy; modify Vercel or GitHub settings; start Epic F or G; implement C8 silently; create schema v4; add auth or cloud; change global learner-state ownership; start the attempt/evaluator/mastery engine; invent curriculum, brand, licence or owner decisions; scrape branding; weaken tests, oracles or budgets; suppress diagnostics; use a synthetic programme as a substitute for the real production proof; write review evidence for your own candidate; rename `progresspal-cs50-edition` or the cache prefix.

## 13. Final report

Baseline identity and how the Pre-E binding was verified; authoritative source identity and hash; owner decisions received and used; exact scope (E-A or E-B); candidate SHA, root, `src` tree, payload tree, parent; changed paths; gate and test counts; diagnostics; source-mapping completeness; collision and isolation evidence; reset and restore evidence; accessibility and browser evidence; visual evidence; budget figures; C8, domain and L3 dispositions; residual risks; package checksum; whether Vercel Deployment Checks are recorded active; and the exact maximum state reached.

STOP states: `EPIC_E_STOP_MISSING_AUTHORITATIVE_PROGRAMME_SOURCE`, `EPIC_E_STOP_OWNER_DECISIONS_REQUIRED`, `EPIC_E_PAUSED_C8_TRIGGERED`, `EPIC_E_PAUSED_DOMAIN_MODEL_REPLAN_REQUIRED`, `EPIC_E_PAUSED_BUDGET_DECISION_REQUIRED`.

Success: `EPIC_E_CANDIDATE_AUTOMATEDLY_VALIDATED_READY_FOR_INDEPENDENT_AND_OWNER_REVIEW`
