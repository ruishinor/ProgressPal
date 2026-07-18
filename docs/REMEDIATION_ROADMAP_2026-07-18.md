I have all the evidence needed from the previous five-mission review. The right decomposition now is to have parallel planning specialists draft each phase against the actual code (so steps carry real file/line anchors), then I integrate everything into one continuous roadmap. Launching the planning swarm.

All six planning agents completed. The combined output is large (~172 KB), so let me page through it to synthesize the final roadmap.

The output is large; I'll page through the full swarm results in parallel chunks.

I have Phases 2–8 in full. Let me retrieve the Phase 0+1 plan (agent-5's report) that was truncated earlier.

All six phase plans are in and cross-checked. Two planning agents corrected premises in my earlier findings (worth stating up front): Playwright _multi-context_ cannot test cross-tab coordination (contexts are separate storage partitions — it must be two pages in one context), and the jargon class-name rename was already adjudicated as accepted-internal in `ux-remediation-checklist.md:736,791` — it's rejected below, not planned. Here is the integrated, executable roadmap.

---

# ProgressPal — End-to-End Remediation Plan & Roadmap

**Branch:** `cx/release-1.3.0-remediation` · **Goal:** v1.3.0 certification · **Date:** 2026-07-18

## Global execution order (dependency-corrected)

The phases below are numbered by priority, but certification discipline forces this **actual sequence** — read this table before executing anything:

| Order | Phase                                               | Lands in                          | Why here                                                                       |
| ----- | --------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------ |
| 1     | Phase 0 — Stabilize the tree                        | 5 commits on the branch           | Nothing is valid evidence on a dirty tree                                      |
| 2     | Phase 1 — Verify the unverified                     | diagnostic log entry              | E2E/build/bundle/audit have never run on the rework                            |
| 3     | Phase 3 — Corrupt-revision recovery                 | own commit (resets 0/3 by design) | Must land **before** certification, or it resets a counted pass later          |
| 4     | Phase 6 — Multi-tab E2E                             | additive spec in M3 tree          | Real-browser Web Locks evidence the fresh review requires                      |
| 5     | Phase 2 — Certify Module 3                          | immutable candidate + 3 passes    | Includes the M3-AR-16 doc fix (H1/H2 from Phase 8)                             |
| 6     | Phase 7a — Module 4 (routing, verify-only charter)  | M4 tree                           | Story is strict-serial; M4 precedes M5                                         |
| 7     | Phase 4 — Service worker + security headers         | M5 tree                           | Closes security findings M1/M2/L1/L2/L3                                        |
| 8     | Phase 7b — M5 completion (browser matrix) → M6 → M7 | M5–M7 trees                       | Per story                                                                      |
| 9     | Phase 5 — RPG brand/UX/a11y                         | own module commit, **before M8**  | The comparative study must evaluate a shell that meets its own visual standard |
| 10    | Phase 7c — M8 → M9 → M10 → M11                      | M8–M11 trees                      | Study, task-first, tag, field trial                                            |
| 11    | Phase 8 — Hygiene (H3–H7)                           | slotted post-M3                   | Never interleaved with a certification tree                                    |

**Hard global rules:** Node 24 / npm 11.10.1 for anything that becomes evidence (`export ComSpec='C:\Windows\System32\cmd.exe'` in Git Bash first); never run `verify:release` except for a counted pass; any failure/warning/skip/retry resets that module's count to 0/3; no dependency changes; no RPG expansion; no file deletions; no history rewrites; format only files a commit touches.

**Backwards-compatibility invariant (every module):** Dexie schema stays v2, backup envelope stays v1, `tests/db/backupCompatibility.test.ts` stays green against both fixtures, no static-import → dynamic-import conversion, no RPG-route removal. Each phase's checklist includes a compat line.

---

## PHASE 0 — Stabilize the tree

**1. Bottleneck.** The only truthful record of Module 3 (rejection, contract, rework) exists solely in a dirty worktree while HEAD claims acceptance, and the gate/CI is hard-wired to fail on the uncommitted truth. Commit sequencing is solved first; nothing else counts.

**2. Anti-complexity guardrails.** Refuse: fabricating a `'proceed'` retrospective; bulk-reformatting the 39 pre-existing files (deferred — measured, recorded by name, never silently renormalized); amending `27f108f`; "fixing" red CI (red on a rejected module is the correct signal); running `verify:release` here; any dependency bump.

**3. Implementation & validation.**

- [Step 0.1] `export ComSpec=...`; `node --version && npm --version` → verify: `v24.x` / `11.10.1` (else stamp all results _diagnostic-only_)
- [Step 0.2] `git status --porcelain=v1 && git diff --stat HEAD`; classify each file into `coordination-core` / `mutation-call-sites` / `e2e` / `gate-ci` / `docs-evidence` → verify: every file bucketed; unclassifiable halts the stage
- [Step 0.3] `git diff HEAD -- package.json package-lock.json` → verify: **empty** (halt if not)
- [Step 0.4] `git diff HEAD -- src/lib/db/ src/lib/backup/ src/seed/` → verify: **empty** (schema 2 / envelope 1 / catalog untouched)
- [Step 0.5] `npm run format:check` → verify: failures ⊆ rework-touched files → `npx prettier --write` those only; pre-existing failures recorded by name as exceptions
- [Step 1.1] Commit A `module-3: rework cross-tab write authority on Web Locks` — `src/lib/storage/*`, `src/lib/appState/*`, `vitest.setup.ts`, coordination unit tests + fakes → verify: `git show --stat HEAD` scoped; `npm run typecheck` passes
- [Step 1.2] Commit B `module-3: enforce write coordination at every UI mutation entry point` — modified `src/features/**`, `src/app/shell/*`, matching tests → verify: no `scripts/`/`docs/`/`e2e/` in commit; `npm run lint` passes
- [Step 1.3] Commit C `module-3: prove two-tab writer/read-only matrix in managed Chromium` — `e2e/settings.spec.ts`, `e2e/support/*` only → verify: only `e2e/` paths
- [Step 1.4] Commit D `module-3: harden release evidence validation and CI module identity` — `scripts/release-gate-utils.mjs`, `scripts/run-release-gate.mjs`, gate tests, `.github/workflows/test.yml` → verify: `node --test scripts/release-gate-utils.test.mjs` 6/6
- [Step 1.5] Commit E `module-3: record adversarial rejection and Web Locks coordination contract` — `module-3-release-review.json` **unchanged (`'reject'` retained)**, contract doc, VALIDATION_LOG, remediation doc, `AGENTS.md` → verify: `git status --porcelain=v1` empty; review JSON parses

**4. Adversarial review.** Docs committed before verification re-creates the original sin → Commit E contains only already-true records; _results_ are a separate post-verification commit. Gate files must never leak into code commits (bisectability — the exact confusion that invalidated the first M3 acceptance). The format:check premise may be stale in either direction → measure first (0.5), defer only _pre-existing untouched_ files.

**5. Failure handling.** Port 42183 busy → kill only identifiable leftover node/vite PIDs. Node 24 unavailable → proceed diagnostic-only, commits still valid. Any command fails → fixup into owning commit only if branch unpushed, else append `module-3: correct <what>`. Full rollback: `git reset --hard 27f108f` only if unpushed; the review file and invalidation log entry are **never** reverted.

**6. Retrospective.** Converts an uncommitted rework into an immutable, honestly labeled baseline without claiming a single counted pass — choosing evidence-honesty over short-term green, the same choice whose absence caused the invalidation.

**Phase 0 checklist:** ☐ env pinned ☐ inventory bucketed ☐ deps/schema diffs empty ☐ format measured ☐ commits A–E landed, scoped ☐ tree clean

---

## PHASE 1 — Verify the unverified

**1. Bottleneck.** `e2e/settings.spec.ts` (+220 lines: two-tab matrix, blocked-startup-repair) has never executed; `build`/`check:bundle`/`audit` have never run on the rewritten `src/lib/storage/`. Until they pass, Phase 2's review has nothing to certify.

**2. Guardrails.** Verify, don't extend: gaps are recorded as findings, not patched ad hoc. Serial Vitest flags untouched. One rerun maximum per E2E flake; a pass-on-rerun is recorded as _flaky — certification-blocking_, never as a pass.

**3. Implementation & validation** (run in order, capture exit codes to a temp evidence note):

- [Step 2.1] `npm run lint` → verify: exit 0, zero warnings
- [Step 2.2] `npm run format:check` → verify: matches the Phase 0.5 decision exactly
- [Step 2.3] `npm run typecheck` → verify: exit 0
- [Step 2.4] `npm run build` → verify: exit 0, `dist/` produced
- [Step 2.5] `npm run check:bundle` → verify: all chunks ≤ 500 kB, no source maps — watch the `storage-safety` chunk specifically
- [Step 2.6] `npm test` → verify: exit 0, **zero skips/pending/retries**; `localDataCoordination` fail-closed cases green; `backupCompatibility` green on both fixtures (backwards-compat proof under fake-indexeddb + FakeLockManager)
- [Step 2.7] Fail-closed coverage grep → verify: tests exist for transport-down and MAX-revision; if no test covers _missing_ `navigator.locks`, record as a finding — do not add it here
- [Step 2.8] `netstat -ano | findstr :42183` empty → `npm run test:e2e` → verify: exit 0, zero retries, two-tab matrix + blocked-startup-repair pass, no retained failure artifacts
- [Step 2.9] `npm run check:circular` → verify: exit 0
- [Step 2.10] `npm run audit` → verify: exit 0, or advisory recorded verbatim (no dep changes)
- [Step 2.11] `git status --porcelain=v1` → verify: still clean
- [Step 3.1] Append dated entry to `docs/rpg-v2/VALIDATION_LOG.md`: SHAs, runtime, per-command results, and the explicit sentence **"Module 3 remains 0/3; these are pre-certification diagnostics, not counted passes"** → commit `module-3: record rework verification diagnostics` → verify: tree clean

**4. Adversarial review.** Unit tests prove the _fake_ lock manager; only E2E proves real Chromium Web Locks — Step 2.8 is the protocol authority; unit-green + e2e-red is a P1 against the fake. "CI red = phase failed" is a fallacy — CI red on a rejected module is the system working.

**5. Failure handling.** E2E teardown failure → verify port release via netstat before rerun; inspect retained traces. Audit endpoint outage → record with timestamp, never relabel. Worktree dirtied by a run → identify the writer; a test mutating a tracked fixture is a P1 hermeticity finding.

**6. Retrospective.** Makes CI's signal truthful and produces the diagnostic baseline the fresh review attacks. Success metric: clean tree + recorded facts, nothing more.

---

## PHASE 3 — Corrupt-revision recovery flow (security finding M4)

_(Executed third — it lands on the M3 rework and resets 0/3 by design, so it must precede certification.)_

**1. Bottleneck.** A corrupt `progresspal:coordination:revision` → `readBrowserRevision()` returns `MAX_SAFE_INTEGER` → `blockReason: 'unavailable'` permanently → **every** write path, including `beginDestructiveWrite()`, is gated behind the state needing repair, and the app lands on a startup error screen with retry disabled. Repair must therefore be a new entry point that bypasses `assertWriteAllowed` but reuses the **exclusive-presence ceremony** (the sole-participant proof contract rule 5 already trusts for reset/restore). Secondary constraint: the brick _cascades_ — a bricked tab's heartbeats poison peers to MAX — so repair must be idempotent and per-tab cheap.

**2. Guardrails.** Refused, with reasons: **auto/silent repair** (hides tampering; puts side effects in a read path); **Settings-surface control** (verified unreachable — the error screen preempts routing); **IndexedDB-derived epoch** (no revision counter exists there — repair writes `0` under sole-participant proof); **peer-protocol self-healing change** (documented, not "fixed"); new status fields/message kinds/schema changes; DB "surfacing event" writes (impossible during a write outage). Chosen: **user-initiated repair, surfaced where the brick is visible, executed as guarded durable rewrite + coordinator restart** — restart preserves invariant 4 ("revisions never decrease _within_ a coordinator") literally.

**3. Implementation & validation.**

- [Step A1] Add `repairPersistedRevision(): Promise<'blocked'|'not-needed'|'repaired'>` to `LocalDataCoordinator` in `src/lib/storage/localDataCoordination.ts` (after `beginDestructiveWrite()`), reusing its exact guard/recheck/release pattern: guards on started/stopped/pending/active/leases; **cheap idempotent path** — if durable value is already valid, return `'repaired'`/`'not-needed'` with **no lock acquisition**; otherwise set `destructiveWritePending`, `acquireExclusivePresence()`, re-check all guards, `writeRevision(0)` in try/catch, `console.info`, release in `finally` (release failure → `ownershipState='unavailable'`, fail closed). The method deliberately never mutates `this.revision` → verify: `npx tsc -b` clean; existing MAX tests (`tests/lib/localDataCoordination.test.ts:858-905`) unchanged and green
- [Step A2] Export `LocalCoordinationRepairResult` type → verify: typecheck
- [Step A3] Sanitize poisoned `initialState.revision` in `start()` (BFCache restore could re-poison a fresh coordinator after external repair): drop initial values that are non-safe-integer/negative/≥MAX → verify: new test T8; full suite green
- [Step B1] `repairSession` closure in `startLocalDataCoordination()` (calls method; on `'repaired'` → `stopCoordinator()` + `startCoordinator()` to adopt); module-level `repairActiveSession` registration/cleanup mirroring `stopActiveSession` → verify: typecheck; T9–T12 green
- [Step B2] Export `repairLocalCoordinationRevision()` and `isLocalCoordinationRevisionExhausted(status)` → verify: typecheck
- [Step B3] Re-export both from `src/lib/storage/index.ts` → verify: `npm run check:circular`; architecture tests green
- [Step B4] Update the stale comment at `:634-638` to reference the now-real flow → verify: lint
- [Step C1] Create `src/components/ui/CoordinationRepairControl.tsx` (ImportBackupControl pattern): `busy` + `blocked` states; copy: _"Local tab-coordination metadata is corrupt. Repair resets only the tab-safety counter; your study data is not touched."_ Button "Repair local tab safety"; blocked → _"Close every other ProgressPal tab, then try again."_ No confirmation phrase — the exclusive-presence ceremony is the safeguard → verify: lint + format
- [Step C2] Wire into all four brick-visibility points, each conditional on `isLocalCoordinationRevisionExhausted(coordination)`: `AppShell.tsx:86-100` error screen, `RpgRouteShell.tsx:34-51` error screen, `AppShell.tsx:209-224` unavailable card, `RpgShell.tsx:275-279` unavailable card (genuine Web Locks absence keeps current copy verbatim) → verify: typecheck + lint
- [Step D1] Contract addendum in `docs/remediation/local-data-coordination-contract.md`: "Corrupt revision recovery" section + new required regression transitions (repair under exclusive presence; refusal while a peer holds presence; idempotent re-repair) → verify: cross-references match exported names
- [Step E1] Unit tests T1–T8 in `tests/lib/localDataCoordination.test.ts`: rewrite-to-0; refusal under peer presence; refusal when contended; idempotent no-op (no acquisition); cascade cheap-path (no write, no lock); refusal during active lease; post-acquisition recheck failure restores state; BFCache `initialState` sanitization → verify: suite green, zero skips
- [Step E2] Browser-level T9–T12 in `tests/lib/localDataWebLocks.test.ts`: end-to-end brick→repair→write; **two-session race-safety proof** (owner repair blocked while contender lives, succeeds after it stops); idempotent re-repair; valid revision `'42'` untouched (backwards compat) → verify: suite green
- [Step E3] T13–T14 in `tests/app`: repair control appears only on exhaustion (not genuine lock absence); success calls `onRepaired` once, blocked shows guidance → verify: full `npm test` green
- [Step F1] New `e2e/coordination-recovery.spec.ts`: F-T1 brick-and-recover via UI; F-T2 two pages/one context refusal-then-success → verify: `npm run test:e2e` green
- [Step G1] Full ordinary gate → verify: all green. Do **not** run `verify:release` (resets 0/3 by design)

**4. Adversarial review.** In-place adoption would violate invariant 4 → restart-only adoption. BFCache re-poisoning race → A3 + T8. Repair-vs-healthy-peer race → exclusive presence is the only trusted liveness proof; T10 executes the argument. Mid-repair pagehide → post-acquisition rechecks + `sessionStopped` no-op; worst case is a repaired durable value with a dead session — self-healing on next load. Tampering-amplifier concern → repair only writes `0`, only under sole-participant proof, and grants no write authority (writer lock still gates everything after restart).

**5. Failure handling.** Peer active → `'blocked'` + guidance copy. localStorage write throws → `'blocked'`, durable untouched; permanent storage block → documented clear-site-data fallback. Crash between write and restart → next load reads `0`, healthy. Rollback: pure addition; revert the commit — no migration exists to roll back.

**6. Retrospective.** Converts a silent permanent brick into an explicit guarded repair — the remediation story's recovery pillar — while weakening no invariant. Lands inside the M3 rework, so 0/3 resetting is the honest outcome, not a setback.

---

## PHASE 6 — Real-browser multi-tab Web Locks E2E (security finding M5)

**1. Bottleneck.** Evidence circularity: new specs ride on the same uncertified tree they certify. Solved by an **additive, separate spec file** using only selectors that exist in the committed base. **Premise correction:** multi-_context_ tests certify nothing (separate storage partitions) — real contention requires **two pages in one context**; one cross-context negative-isolation test only.

**2. Guardrails.** Refuse: CDP crash-injection frameworks; faked `navigator.locks` under `e2e/`; shared-helper refactors during open certification; wall-clock assertions that could flake the zero-retry gate; Firefox/WebKit here (M3-AR-15 stage boundary).

**3. Implementation & validation** — new `e2e/multi-tab.spec.ts` (auto-discovered; port 42183; synthetic data only):

- [Test 1] Writer handoff after owner closes: peer read-only → `page.close()` → peer becomes writable, saves display name → verify: heading count 0, `consoleIssues === []`
- [Test 2] Destructive-op conflict: **first read `SettingsSurface.tsx:146-174` gating and assert the real contract** (both tabs' reset/import controls disabled while peer active), owner export allowed, peer snapshot unchanged → verify: assertions match observed code, not intent
- [Test 3] Abrupt peer disappearance: `peer.close()` with owner mid-hold → owner never self-locks-out → verify: certifies absence of deadlock, not timing
- [Test 4] BFCache restore: `goto('about:blank')` → `goBack()` → no stale write possible post-restore (accept persisted/non-persisted paths; run 3× to record trigger rate honestly) → verify: contract "no stale write after restore" holds either way
- [Test 5] Hibernation (feature-probed): CDP `Page.setWebLifecycleState 'frozen'` → frozen owner keeps writer lock, peer stays read-only → `'active'` resumes → verify: **probe first; if unsupported on pinned Chromium, delete the test and record "unautomatable locally" in the review file — never `test.skip`**
- [Test 6] Cross-context negative: second context lands on onboarding (fresh IndexedDB) → verify: isolation proven
- [Integrate] `npm run test:e2e -- e2e/multi-tab.spec.ts` green ×3 local runs → full suite green (0 warnings/skips/retries) → amend `module-3-release-review.json` with the real-browser evidence list (retrospective stays `'reject'` until Phase 2)

**4. Adversarial review.** Lock-release races absorbed by auto-waiting assertions, never `waitForTimeout`. Same-process scheduling caveat recorded honestly. Selector anti-circularity check before finalizing.

**5. Failure handling.** CDP unsupported → recorded, not faked. Flake → 3-consecutive-green quarantine before full suite. Rollback = exclude the additive file from the certified tree; the file itself stays in the worktree (never-delete rule).

**6. Retrospective.** Moves the security-critical contract from fake-only to real-browser proof — exactly what the M3 reopening retrospective demanded — while staying inside the Chromium stage boundary and the RPG freeze.

---

## PHASE 2 — Certify Module 3 (review → flip → 3 passes)

**1. Bottleneck.** `validateReviewEvidence` (`scripts/release-gate-utils.mjs:102-112`) hard-fails unless `retrospective.decision === 'proceed'` with every P0/P1 `resolved`, and any code/evidence change resets the count. Order is forced: **review → fix what it finds → flip in the candidate commit → 3 untouched passes.**

**2. Guardrails.** No code changes unless the fresh review produces a new P0/P1 (P2/P3 → accepted-risk or deferred); no new tests beyond a finding's demand; findings M3-AR-01…15 preserved byte-for-byte in meaning (new IDs M3-AR-16+); no gate/threshold edits to make a pass succeed; no parallel/retried passes; no tagging/deployment/RPG work.

**3. Implementation & validation.**

_Stage A — fresh independent review:_

- [A1] Freeze the review target: record `git status --porcelain=v1` → verify: dirty list matches expectations only
- [A2] Reviewer identity distinct from the implementer → verify: `reviewer` string names it
- [A3] Trace all 15 contract invariants + regression transitions to code anchors and tests (anchors confirmed: BFCache `localDataCoordination.ts:1372-1383`; revision tokens `:48-57`; ownership `:848`; transport recovery tests `:798,830`; lease-bound shutdown tests `:978-1053`) → verify: every invariant has ≥1 anchor + ≥1 _behavioral_ test (fabricated-authority tests = automatic P1, per M3-AR-07)
- [A4] Re-attack the six prior invalidation defect classes — confirm closed _by construction_, not by test presence → verify: written trace per class
- [A5] Doc-consistency sweep → **known finding: `docs/storage-safety.md:17-38` still describes the superseded all-tabs-read-only advisory protocol** (M3-AR-09 overclaimed) → verify: `grep -n "every tab" docs/storage-safety.md`
- [A6] Fix (the only permitted pre-flip fix class): rewrite the concurrent-tabs section to the Web Locks authority model — one writer, contended tabs read-only, exclusive presence for destructive ops, fail-closed without Web Locks; heartbeats/storage-events advisory-only; key names verbatim from `localCoordinationStorageKeys` (`:820-825`). **Include the `PRIVACY.md:31` clarification** (localStorage used only for coordination metadata, never learner data) → verify: doc matches contract; no remaining superseded claims
- [A7] Backwards-compat re-validation: schema 2, envelope 1, coordination metadata outside IndexedDB → verify: `npm test -- tests/db/backupCompatibility` green

_Stage B — evidence file:_

- [B1] Append M3-AR-16 (the stale doc) with `status: "resolved"`; any further new P0/P1 gets M3-AR-17+ with its fix in the same candidate → verify: schema fields per `release-gate-utils.mjs:77-100`
- [B2] Flip `decision` to `"proceed"` only when all five criteria hold: zero unresolved P0/P1; full invariant trace; docs clean; compat re-validated; full ordinary gate green pre-commit. Summary says _"ready for passes,"_ not "passed" → verify: `validateReviewEvidence` exits clean on the file
- [B3] Commit candidate atomically (rework + doc fix + review JSON + Phase 3 + Phase 6) → verify: worktree empty

_Stage C — three passes (per pass N, Node 24/npm 11):_

```
RELEASE_MODULE=module-3-storage-durability
RELEASE_PASS=<N>
RELEASE_REVIEW_FILE=docs/remediation/module-3-release-review.json
npm run verify:release
```

- [C1] Pass 1 → verify: manifest in `artifacts/release-evidence/` records passed status, 20 commands, zero warnings/retries/skips, `reviewEvidence.sha256` matching
- [C2] Pass 2 from an **independent clean checkout + `npm ci`** (or the CI pass-2 job) → verify: identical commit/tree SHA; `npm ci` in the recorded command list
- [C3] Pass 3 → verify: three manifests, identical SHAs
- [C4] Push; CI `Certification pass 1→2→3` chain green with matching checksums
- [C5] **Post-acceptance** commit updating the remediation doc checkboxes + VALIDATION_LOG with manifest paths/SHAs → verify: acceptance recorded as 3/3 against the exact SHA, and the recording itself never dirtied a counted pass

**4. Adversarial review.** Flip-then-certify circularity is by design (retrospective asserts _review_ readiness; passes certify the _gate_) — B2 criterion 5 makes the flip evidence-based. Reviewer independence is self-attested → trace-per-invariant artifacts and re-attacking prior defect classes counter correlated blind spots. "Locally green ⇒ certifiable" is the 2026-07-16 fallacy → C2 verifies recorded command lists, not just exit codes.

**5. Failure handling.** New P0/P1 → stop, fix, append as resolved, restart Stage A. Any gate command fails mid-pass → retain the failed manifest (never delete/relabel), diagnose, new commit, count resets to 0/3, restart from pass 1. Audit endpoint outage → record with timestamp, retry same pass later. CI fails after local passes → restart the **entire** chain from pass 1. Whole-phase rollback: `git revert <candidate-commit>`; historical manifests never edited.

**6. Retrospective.** The narrowest possible execution of AC14: one module, one immutable commit, three counted passes, no adjacent work — and it refuses to touch the RPG freeze. M3 at 3/3 unblocks M4.

---

## PHASE 7 — Modules 4 → 11 sequencing (planning depth)

**1. Bottleneck.** Everything is transitive on M3 3/3. Additionally, the M3 rework already landed M4-adjacent code (`runLocalMutation`, route-invalidation policy in `AppStateProvider.tsx`). Reconciliation: M3's File List/Change Log carries an explicit boundary note that AC7-relevant behavior was _necessarily_ landed under M3 as a safety fix (M3-AR-04/05) and **M4's charter is rewritten to verify, not build** — otherwise M4 duplicates M3 (overbuild) or certifies code no module claims (evidence gap).

**2. Guardrails.** Strict serial M3→M4→…→M11 (concurrency is worthless — upstream changes reset downstream counts); no full study design now (M8 owns it — thresholds fixed verbatim below to prevent post-hoc creep); no CI deployment automation (Vercel CLI only); no tag before production evidence; no pre-building the task-first variant; no PWA/installability claims.

**3. Roadmap** (entry → work → exit, each with ×3 passes):

- **M4 — routing & task interaction** → Entry: M3 3/3 + boundary note. Work: route matrix tests (valid/invalid returns, onboarding variants); passive-route immutability proof (navigate all routes, assert zero IndexedDB mutations); explicit-write idempotency (double-submit); **characterization tests only** on the M3-landed invalidation policy (`AppStateProvider.tsx:390-478`) → verify: no `src/lib/appState` diff unless a defect is found (defect → count reset)
- **M5 — SW, browsers, security, bundle** → Phase 4 below is its core; plus Firefox/WebKit **critical flows** (onboarding, write, backup export/import, multi-tab Web Locks via Playwright projects — honest records where unsupported), bundle inspection → verify: matrix green; header evidence in manifest
- **M6 — certified local beta** → adversarial review, zero P0/P1, three independent passes labeled `Certified local beta`
- **M7 — hosted preview/devices/rollback** → Vercel CLI deploy tied to commit + artifact hashes; real-device/AT matrix with honestly labeled unautomatable items; rollback proof with live DB/cache state → label `Hosted production-certified beta`
- **M8 — product/UX authority** → create tracked `EXPERIENCE.md` + `DESIGN.md`; route-to-job inventory; **comparative protocol skeleton fixed now:** 12 participants (4 active / 4 stalled-returning / 4 mobile-primary); 4 conditions within-subjects Latin-square (classic / RPG / task-first neutral / `.ods` spreadsheet); fixed task set (identify next action, record progress, resume after ≥24 h, recover via backup import, locate named item); metrics (critical/noncritical failures, median task time, preference, trust, RPG-status-misread count); **thresholds verbatim from remediation doc lines 150-154** (default / optional / **retire**: ≥2 extra critical failures, >20% slower, ≥2 misreads, <40% preference without behavioral gain, duplicated chrome; simplify/stop if no variant beats spreadsheet by ≥15%) → verify: no numbers invented
- **M9 — conditional task-first** → strictly per study outcome; WCAG 2.2 AA; three fresh five-person cohorts
- **M10 — promotion** → all evidence re-run on one immutable commit; production smoke ×3; annotated tag `v1.3.0-local-first-proof` **only after** evidence passes; never moved
- **M11 — field trial** → 8–12 learners, manual diaries only, no telemetry; one explicit outcome recorded (retain / optional / remove / simplify / reopen / stop); RPG freeze lifts only on this evidence

**4. Adversarial review.** Double-certification fallacy → explicit overlap note in both commit message and Change Log. WebKit Web Locks parity not promised — critical-flow list only. Study fatigue risk (12×4 within-subjects) → session-length cap flagged for M8. Tag-before-evidence → void, incident recorded, corrected tag gets a new name (tags never moved/deleted).

**5. Failure handling.** Any pass fails → that module's count resets to 0, fix forward, never amend counted passes. M3 rework judged unfixable → revert to the Modules 0–2 lineage, dirty files preserved for forensics. Unreachable study thresholds are a **valid outcome** (retire/optional/stop are predefined branches) — the failure mode is redefining thresholds post hoc, prohibited by fixing them in M8's tracked document.

**6. Retrospective.** Honors the story's ordering and converts the accidental M3/M4 overlap into an explicit verify-only charter. Modules 8/9/11 exist so evidence — not enthusiasm — decides RPG's fate.

---

## PHASE 4 — Service worker hardening + security headers (M5 core; findings M1/M2/L1/L2/L3)

**1. Bottleneck.** `public/sw.js` is unhashed, unbundled, untype-checked — nothing in the pipeline verifies the file that gates the entire offline contract. Solved first: **source-contract tests wired into `npm test`** (therefore inside `verify:release`); the rewrite is then a small reviewable diff. Lands only after M3 commits (clean-tree precondition; Phase 4 touches none of M3's files).

**2. Guardrails.** Refused: Workbox/generators; **build-time version stamping** (rejected — diverges `dist/sw.js` from tracked source; instead manual `CACHE_VERSION` + a Vitest guard asserting it equals `progresspal-cache-v${pkg.version}`, so a forgotten bump fails certification); SW↔page messaging/update UI; LRU eviction (restricting runtime caching to `/assets/*` bounds accumulation structurally); CSP nonces/report-uri; dev-server headers; touching anything besides `public/sw.js`, `vercel.json`, `vite.config.ts` (preview headers only), `e2e/offline.spec.ts`, and new test files.

**3. Implementation & validation.**

- [Step A1] Rewrite `public/sw.js`: `CACHE_PREFIX = 'progresspal-cache-'`; `CACHE_VERSION = 'progresspal-cache-v1.3.0'`; activate deletes **only** keys matching the prefix and ≠ current (legacy `v1` matches prefix → cleaned; foreign same-origin caches preserved — M1); navigation handler: network-first, on success `cache.put(SHELL_URL, response.clone())` in a **nested** try/catch (a rejected put must not fall into the offline branch — M2); offline → cached shell with `ignoreSearch/ignoreVary`; runtime caching **only** for `url.pathname.startsWith('/assets/')` (404-rewritten HTML can no longer poison the cache — L1; version bump purges wholesale — L2) → verify: lint + format clean
- [Step B1] New `tests/architecture/serviceWorker.test.ts` (source-reading pattern like `localOnly.test.ts`): version guard vs `package.json`; prefix-deletion guard; shell-refresh guard; assets-only guard; **no-dynamic-`import()` guard across `src/`** (converts the L3 convention into an enforced invariant) → verify: test passes; deliberately break CACHE_VERSION once to prove the guard fails, then revert
- [Step B2] Confirm the guard runs inside the release gate (`npm test` inclusion) — no gate edit needed → verify
- [Step C1] Replace `vercel.json` — rewrites **plus** headers block on `/(.*)`: CSP `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'` (style `unsafe-inline` is **required** by recharts/React inline styles; no inline scripts exist — verified), `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`; plus `Cache-Control: no-cache` on `/sw.js` → verify: JSON parses
- [Step C2] New `tests/architecture/securityHeaders.test.ts` parsing `vercel.json` → verify: green
- [Step C3] Mirror headers into `vite.config.ts` `preview.headers` so the **entire E2E suite runs under CSP** — the executable proof it doesn't break boot, recharts, or backup download → verify: `npm run test:e2e` green
- [Step D1] `e2e/offline.spec.ts`: derive `CACHE_VERSION` from `public/sw.js` via `readFileSync` (no second manual-bump site) → verify: existing tests green
- [Step D2] Append one test: seed `unrelated-origin-cache` + legacy `progresspal-cache-v1`; after SW control → foreign cache survives, legacy purged; online navigation → cached shell body equals fresh fetch → verify: both projects green
- [Step D3] Full ordinary gate → verify: zero warnings
- [Step D4] Tick Module 5 checkboxes (`3-1-v1-3-release-remediation.md:69,72`) + handoff note → verify: doc diff scoped to Module 5 lines. `verify:release` deferred to the certification pass

**4. Adversarial review.** Shell-refresh vs. mid-load kill edge (new shell cached, old assets killed mid-fetch → offline boot fails) → accepted + documented in a sw.js comment; the atomic alternative requires the rejected build-stamping machinery. CSP breaks only in production → C3's preview mirroring closes that; if E2E reveals a needed directive, add it with a comment — never weaken to `*`. Prefix collision with another `progresspal-*` app → acceptable (single-app origin), documented. Rollback: reverting the deploy reinstalls the old worker, whose (buggy) delete-everything activate ironically purges the new cache — no user data touched either direction. String-matching tests are deliberately brittle — a sw.js refactor _should_ force re-reading the contract.

**5. Failure handling.** Install failure → unchanged atomic `addAll` behavior (worker discarded, retries next load). First-ever offline visit → honest browser offline error, no fake UI. CSP misconfiguration → revert + redeploy (stateless). Cache poisoning from a bad deploy → bump version (hotfix `1.3.1`) — activate purges wholesale. E2E flake → fix the wait, never add `retries`.

**6. Retrospective.** Closes AC8/AC9 using only mechanisms the controlling doc already sanctions (`progresspal-cache-v1.3.0` is literally specified at line 69), converts two conventions into enforced invariants via cheap source-contract tests, and touches no learner data, routes, or RPG surface.

---

## PHASE 5 — RPG brand/UX/a11y remediation (lands before M8; findings UX 1–5)

**1. Bottleneck.** The `--rpg-*` token scope change is a three-way coupling that must land atomically: `rpg-tokens.css:1` scopes tokens to `.rpg-shell`; a contract test (`tests/features/rpg/components.test.tsx:243`) asserts that selector; and `RpgRouteShell`'s loading/error states render **without** the body class (the effect lives in `RpgShell`, which mounts only after data loads). Move scope + relocate effect + update the contract test in one commit or the RPG loading shell loses all tokens — an unstyled flash worse than today's bug.

**2. Guardrails.** No SettingsSurface fork / RPG rebuild ("color it and leave it" per the 2A wrapper contract); no `:root` promotion; no token bridge for `/rpg/log` + `/rpg/badges` (recorded as follow-up, not silently expanded); no classic nav redesign; no classic scroll-restoration change; no axe `disableRules`; no edits to M3 files.

**3. Implementation & validation** (abridged — each step is `[action] → verify: [check]`):

- [1a–1f] `rpg-tokens.css:1` selector `.rpg-shell` → `body.rpg-route-active`; `rpg-shell.css:1-8` `background: var(--rpg-bg)` (delete hardcoded `#111923`); body-class effect **moved to `RpgRouteShell.tsx`** (single owner; deleted from `RpgShell.tsx:160-169`); contract test updated; new toggle test (RPG on / classic off) → verify: zero `#111923` hits; exactly one `classList.add('rpg-route-active')` in `src/`; vitest green
- [2a] Bottom-nav retoken (`rpg-shell.css:203-253`): `--color-surface`→`--rpg-surface`, `--color-border`→`--rpg-border`, `--color-text-muted`→`--rpg-text-muted`, active-pill trio → `--rpg-accent` + on-gold text `#17202b`; structural tokens kept → verify: no `--color-*` inside `.rpg-bottom-nav*`; dark axe scan on `/rpg` (Step 8) catches contrast regressions
- [3a] `/rpg/settings` token bridge in `rpg-components.css` after `:76`: scoped `.rpg-shell .rpg-settings` remap of all `--color-*` tokens to RPG palette (spot-checked ≥ AA: primary ~12:1, danger ~6:1) — zero component-API changes → verify: axe scan on `/rpg/settings` passes; no `card--accent/danger` consumers exist (grep) so no extra remaps
- [4a–4f] Copy purge: `RpgResourcePage.tsx:518,682` "Save local progress" → "Save progress"; `AchievementsSurface.tsx:210`, `DashboardPage.tsx:209`, `InsightsSurface.tsx:232` "achievement records" → "achievements"; update all string-dependent tests (App.test ×3, settings.spec:338, accessibility.spec:524/534, rpg fixtures) → verify: `git grep -rn 'Save local progress\|achievement records' src/ tests/ e2e/` zero hits
- [5a–5d] Confidence → "How sure are you?" inside `<details class="form-details">` with `open={Boolean(errors.confidence)}` (error never hidden), aria/IDs byte-identical, two palette overrides; keyboard E2E path updated (Tab → summary → Enter → select) → verify: typecheck; App.test + accessibility.spec green; new RPG jargon guard test
- [6a–6b] Small-screen floors: HUD eyebrow `0.72rem` → `var(--text-xs)`; quest-link `min-height: 2.5rem` → `var(--control-height)` (leaves 0.78rem labels — ≥12px, scope discipline) → verify: zero `0.72rem` hits
- [7a–7g] Focus-on-route-change: new `src/components/layout/useMainContentFocus.ts` (skips initial render, `focus({preventScroll:true})` on pathname change; `components/layout` placement satisfies layer rules — lib rejected, duplication rejected); optional `mainRef` prop on layout `AppShell`; wired into all four classic layouts + `RpgShell` `<main tabIndex={-1}>`; outline suppression on `:focus`; unit tests (no initial focus steal; classic nav → `#main-content`; RPG nav → `#rpg-main-content`) + E2E focus assertions → verify: hook-only export passes react-refresh; keyboard E2E green
- [8a–8c] Axe expansion: `completeOnboarding(page, { theme })` optional param (default dark — every existing caller preserved); `completeOnboardingLight`; three sweep tests — 7 classic dark routes + 4 classic light routes + 8 RPG routes → verify: `npm run test:e2e` green, no retries
- [9a–9b] Viewports: add 320×568 + 375×667 to `rpg-mobile-overflow.spec.ts`; 320 + 1024 to `release-candidate.spec.ts` → all six VISUAL_TARGET §10 widths covered
- [10] Full gate → verify: all green, zero warnings/skips/retries

**4. Adversarial review.** The light-theme sweep will **likely fail on first run** (never scanned) — triage: minimal token fixes only; structural violations get smallest markup change; never `disableRules`; if a fix exceeds Mode B, narrow that route out with an honest recorded finding. 320px may squeeze the 7-item bottom nav — prefer label wrap / padding trim, never shrink below `var(--text-xs)`. `<details open>` fights native toggling — accepted (strictly better than classic's no-auto-open). Token-bridge soft-badge compositing isn't trusted by hand — the live axe scan arbitrates. Out-of-scope leaks (skip-link tokens, `/rpg/log` + `/rpg/badges`) recorded as M8 follow-ups, not fixed.

**5. Failure handling.** Steps independently revertable; Steps 1–3 roll back as one CSS unit. Step 1 regression symptom = light flash on `/rpg` cold load → confirm single effect owner. E2E selector misses after copy edits are always missed ripples — never "fix" by reverting copy. Commit as separate module-oriented commit (e.g. `ux-rpg-01: remediate RPG shell tokens, copy, and focus management`) — never `git add -A` over the M3 files.

**6. Retrospective.** Pure Mode B remediation that makes the Module 8/11 study evaluate a shell meeting its own stated visual standard, pays down a11y debt in both shells at once, and removes nothing established — the only deletions are a hardcoded hex and a redundant effect, both replaced by their canonical sources of truth.

---

## PHASE 8 — Hygiene (slotted; never interleaved with certification trees)

**1. Bottleneck.** Hygiene edits in a certification tree muddy the evidence boundary → each item is slotted into its owning module's tree: H1/H2 ride the M3 candidate (they _are_ finding M3-AR-16's fix, executed in Phase 2/A6); H3–H7 land post-M3 in their own labeled commits.

**2. Guardrails.** **Rejected findings (recorded, not executed):** the jargon class-name rename (`slice-detail-list` etc.) — already adjudicated acceptable-internal at `ux-remediation-checklist.md:736,791`; renaming churns 5+ files for zero learner benefit. The `App.test.tsx` split — the suite is deliberately serial, so splitting yields **zero wall-clock gain** for 3,900 lines of churn during a freeze; deferred to post-v1.3.0. No branch deletion — archive procedure documented only.

**3. Implementation & validation.**

- [H1] `docs/storage-safety.md` concurrent-tabs rewrite → executed as Phase 2 Step A6 → verify: every claim greppable in `localDataCoordination.ts`
- [H2] `PRIVACY.md:31` clarification (localStorage = coordination metadata only, never learner data) → Phase 2 Step A6 → verify: keys match `:814-815, 1271-1273`
- [H3] Dead CSS: remove `.showcase-grid` / `.state-grid` from `design-system.css:546-577` and the 960px media query `:1466-1479` → verify: `git grep` 0 hits; lint + build + full E2E green
- [H4] Jargon-class rejection recorded in the hygiene commit message citing both checklist lines → verify: no diff
- [H5] Reconstruct `RPG-SHELL-01-HANDOFF.md` **from git history only** (rpg-01 commits, diffs, sibling handoff format); unrecoverable fields marked "not recoverable from repository history" — never invented; status line: "retroactively completed; RPG v2 frozen per D-0074" → verify: every listed file exists in the referenced commit's diff
- [H6] Capture the real stale-branch list (`git branch -a --list 'rpg/*' 'ux/*'`), write `docs/remediation/branch-archive.md`: per branch, `git tag archive/<name> <sha>` then owner-approved deletion; verification step before any deletion; tags never moved. **The agent executes no deletions.** → verify: doc contains the execution-time branch list
- [H7] Deferred-decision record for the App.test split → verify: no diff to the file

**4. Adversarial review.** H1 overclaim risk → keep the fail-closed sentence, no deadlock-freedom claims. H3 dynamic-class risk → grep covers string literals + full E2E as behavioral proof; a late reference → stop, keep the selector. H5 fabricated history is the worst-case hygiene failure → git-only reconstruction rule. H6 "archive by stealth" → deletion framed as a separate owner act.

**5. Failure handling.** Any hygiene edit breaks a gate → revert that hunk in a fix commit; hygiene never justifies a gate bypass. Insufficient git history for H5 → mark "evidence not recoverable," record the D-0063 debt honestly.

**6. Retrospective.** Applies "no overbuild" symmetrically — removes provably dead code, refuses equally dead renames — and keeps every certification evidence boundary clean.

---

## Master checklist (execution order)

**Phase 0** ☐ env pinned ☐ inventory bucketed ☐ deps/schema diffs empty ☐ format measured ☐ commits A–E scoped & landed ☐ tree clean
**Phase 1** ☐ lint/format/typecheck/build/bundle green ☐ 476+ unit tests green, zero skips ☐ E2E green incl. two-tab matrix ☐ circular + audit green ☐ diagnostic log committed ("0/3, not counted")
**Phase 3** ☐ `repairPersistedRevision` + sanitization ☐ session restart wiring + exports ☐ repair control at 4 visibility points ☐ contract addendum ☐ T1–T14 + F-T1/F-T2 green ☐ full gate green
**Phase 6** ☐ real gating contract read from SettingsSurface ☐ selector anti-circularity check ☐ `multi-tab.spec.ts` Tests 1–4,6 (+5 if CDP probe passes) ☐ 3× consecutive greens ☐ review file amended
**Phase 2** ☐ invariant trace complete ☐ M3-AR-16 doc fix (storage-safety + PRIVACY) ☐ flip criteria all true, `decision: "proceed"` ☐ candidate committed atomically ☐ passes 1–3, identical SHAs ☐ CI chain green ☐ acceptance recorded 3/3
**Phase 7a** ☐ M4 verify-only charter + boundary note ☐ route matrix + immutability + idempotency ☐ ×3
**Phase 4** ☐ sw.js rewrite ☐ 5 contract guards incl. version + no-dynamic-import ☐ vercel.json headers + preview mirror ☐ offline E2E extension ☐ full gate green
**Phase 7b** ☐ M5 browser matrix ☐ M6 certified local beta ☐ M7 hosted preview + rollback proof
**Phase 5** ☐ token scope move atomic ☐ bottom nav + settings bridge ☐ copy purge zero-hit grep ☐ confidence under details ☐ small-screen floors ☐ focus hook both shells ☐ axe sweeps (dark+light+RPG) ☐ 320/1024 viewports ☐ full gate green
**Phase 7c** ☐ M8 EXPERIENCE/DESIGN + frozen thresholds ☐ M9 per outcome ☐ M10 tag after evidence ☐ M11 field trial + explicit RPG decision
**Phase 8** ☐ H3 dead CSS ☐ H4/H7 rejection/deferral records ☐ H5 handoff reconstruction ☐ H6 archive doc (no deletions executed)

## Flagged corrections & open items for you

1. **Premise correction:** real multi-tab testing = two pages, one browser context — not multi-context (contexts can't coordinate).
2. **Rejected:** jargon class rename (prior adjudication stands) and App.test split (zero wall-clock gain under serial runner) — both recorded as decisions, not ignored.
3. **Peer-cascade bricking** (healthy tabs adopting MAX from a bricked tab's heartbeat) is documented + made one-click repairable per tab, but deliberately not protocol-fixed — candidate hardening decision for the next M3 review.
4. **Environment:** this machine runs Node 22/npm 10; all certification-grade runs require Node 24/npm 11.10.1 (and `ComSpec` exported in Git Bash).
5. Execution-time verifications no planner could do read-only: exact stale-branch list, the rpg-01 commit SHA for H5, and the CDP `Page.setWebLifecycleState` probe.

**Release readiness after this roadmap:** M3 certifiable within days (Phases 0–2 + 3 + 6); v1.3.0 remains weeks out (M4–M11), with the Module 8 comparative study as the legitimate decider of RPG's default/optional/**retire** future. The plan removes nothing, adds no dependencies, and keeps every module's evidence boundary certifiable.
