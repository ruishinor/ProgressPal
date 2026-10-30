# EDU-04 — Teknologier og rammeverk

2026-10-31. Local implementation on `cx/edu-04-technologies`, from clean detached HEAD `5e12d0572961758c06e78cf4c0965853d6d6e7da`. GitHub readback confirmed that SHA as `master`, the default branch; the open-PR search returned none. The local tracking ref agreed. Shell `ls-remote` failed on sandbox DNS, so live identity was checked through the connected GitHub API. Other registered worktrees were inspected and preserved. Node 24.19.0, npm 11.10.1 and the locked packages were verified; installation used `npm ci`, with no dependency or lockfile changes.

## Content and acceptance criteria

The new, independently selectable category is **Teknologier og rammeverk**, at `/rpg/track/tenk-som-en-utvikler?kategori=teknologier-og-rammeverk` for Programvareutvikling 1. RPG Home retains its existing Utviklerblikk entry. The shared track route also opens after visiting Classic; no separate Classic navigation or route was added.

The inspected six existing categories cover requirements, collaboration, UX/accessibility and SQL operations. They do not teach the tool-role and composition decisions below. This addition explains the role of a database without duplicating the SQL exercises; it uses team knowledge as a decision constraint without adding another collaboration lesson.

| Activity / source ID  | Observable learning objective                                                   | Transfer                                                               | Correct-path words |
| --------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -----------------: |
| `tsu-tek-01` / TEK-01 | Distinguish language, runtime and UI library when diagnosing a stale display    | Choose plain HTML/CSS/JavaScript for a small site                      |                205 |
| `tsu-tek-02` / TEK-02 | Distinguish development server, bundler/build output and deployment             | Explain why a successful Vue/Vite build does not prove saving works    |                233 |
| `tsu-tek-03` / TEK-03 | Assign browser, API, backend and database responsibilities                      | Recognize when a personal local list needs no shared backend           |                234 |
| `tsu-tek-04` / TEK-04 | Compare React, progressive Vue and integrated Angular using project constraints | Assess a proposed rewrite against knowledge, ecosystem and maintenance |                265 |
| `tsu-tek-05` / TEK-05 | Compare React+Vite with Next.js and account for server deployment               | Reuse an existing API rather than inventing a duplicate server         |                258 |

Five distinct decisions justify five activities. Each has a concept card, a concrete tool example, one scaffolded reasoning question and one transfer question (20 cards, 10 questions). Every incorrect option has its own diagnostic feedback; the correct option is explained by the existing closing explanation. Each activity ends with a takeaway. Correct positions vary. Metadata estimates 3–4 minutes, within the requested approximate 2–5-minute range. Counts include headings, summary, all offered answers, success explanations, bridges and takeaway, excluding wrong-answer branches and metadata. These are planning estimates, not measured learner timings.

Acceptance: selectable through the existing registry; complete Bokmål content and contextual answer keys; all existing categories retained; ordinary retry/feedback/completion works; no learner-store changes; same-origin offline access; readable/reachable controls at desktop, 320/390px and enlarged text; native build/budget checks pass. The implementation meets those bounded criteria, subject to the verification limits below.

## Sources and method

Primary documentation checked on 2026-10-31 informs the authored explanations, not a ranking of universally best tools:

- [React's UI library description](https://react.dev/learn/describing-the-ui) and [from-scratch tradeoffs](https://react.dev/learn/build-a-react-app-from-scratch): components versus the additional integration responsibilities of a standalone setup.
- [Vite guide](https://vite.dev/guide/), [build](https://vite.dev/guide/build) and [static deployment](https://vite.dev/guide/static-deploy): development server, production files and the limits of local preview.
- [Vue introduction](https://vuejs.org/guide/introduction.html) and [Angular overview](https://angular.dev/overview): progressive adoption versus a broader integrated toolset. Neither is presented as a universal winner.
- [Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs) and [Express](https://expressjs.com/): runtime versus backend framework.
- [Next.js documentation](https://nextjs.org/docs) and [deployment modes](https://nextjs.org/docs/app/getting-started/deploying): React framework, server features and static-export limits.
- [IES/What Works Clearinghouse practice guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/1): worked examples, concrete/abstract connections and explanatory questions informed the concept → example → decision → transfer sequence. This is a design rationale, not evidence that this particular content improves learning.

The durable concepts are responsibilities, requirements and integration costs. The content explicitly treats popularity as time- and population-dependent; it includes no rankings, version trivia or runtime external references.

## Integration and internal review

`src/programmes/programvareutvikling/microlearning/utviklerblikk/teknologier.ts` owns the complete authored bank. The existing track imports/appends it and registers its category. `TEK-01`–`TEK-05` cite the track and existing `SK-METH-01`, following the other independent banks. The first 36 activities, their IDs, source files and category order are preserved. Tests retain the original first-24 fingerprint and the existing UX/UU and SQL banks' exact object/order comparisons. Count assertions become 41 activities in seven categories, with five in the new category; no six-activity quota is imposed.

No renderer, styles, route definitions, persistence, schema, XP, backup, dependency, service worker, version or packaging policy changed. The existing static `content-utviklerblikk` chunk and boot cache carry the content. Results remain in component memory; the route stores position in browser history. No result is written to learner storage or included in a backup. Actual storage snapshots cover all five new activities.

One bounded internal multidisciplinary review is **satisfactory**: the assembled text was checked for first-use definitions, novice premises, technical responsibility boundaries, diagnostic alternatives, transfer, Bokmål and visual density. The UI-choice alternatives permit realistic competing implementations, while the premises support one preferred decision. Final corrections explicitly explain UI/components and repair an unnatural sentence. Desktop wrong-answer, 320px, 390px and enlarged-text screenshots were inspected; automated checks exercise every new card and success state. This is self-review, not formal independent content acceptance or observed beginner testing.

## Verification and limits

- **PASS:** 110 focused content/domain/evaluation/boundary tests across six files; 81 registry/renderer/service-worker/programme-layer regression tests across five files.
- **PASS:** six selected real-app checks (five complete wrong–retry–right journeys with identical before/after snapshots of every learner table, plus the category list). The other 56 tests in that file were deliberately filtered out, not counted as passing.
- **PASS:** six scoped production-browser journeys, zero retries: the existing first-use Home discovery check, keyboard/history/feedback/completion, all cards at 320px and 390px, all cards at 320px/200% root text, and unopened-content cold offline loading followed by reload and re-answering. Axe found no violations in the inspected category/feedback states. Layout checks cover horizontal overflow, clipping and reachable 44px controls. Two narrow-width journeys are repeated only for the final wording delta.
- **PASS:** typecheck, lint, formatting, build, circular-dependency check and audit (0 reported vulnerabilities). Final bundle: **469,977/470,000 B JS gzip**, **490,414/500,000 B largest raw JS**, CSS **16,004/40,000 B**, curriculum **126,984/150,000 B**, runtime **6,398,912/7,000,000 B**; no bundle warnings or violations. Controlled baseline JS gzip: 465,965 B; addition: 4,012 B. Only **23 B** remains: future integration must remeasure, with no implied budget increase.
- **NOT RUN:** full project unit/E2E suites and `verify:release`. Focused success is not release certification. No independent acceptance/review evidence was written. No push, PR, merge, deployment, provider or version operation was performed.
- **NOT VERIFIED:** real beginner comprehension or timing, learning gains, native screen-reader output, physical-device zoom or full accessibility conformance. Root-font scaling is a text-stress proxy.

Material development failures were corrected without weakening guards: an initial three-card draft violated the existing four-card minimum; teaching was split into concept/example cards. Initial bundle overages were resolved only by tightening new content. Legacy six-item list/count tests were made accurate. The offline test originally expected reload to return to card one; inspection showed history preserves the card and only the answer is transient, and the test now checks that behavior. Sandbox Vitest cache renames and audit DNS failed; authorized unsandboxed checks passed. Port 42183 was owned by another worktree's active tests and was left untouched.

Reproduce the focused checks from this worktree:

```text
npm test -- tests/programmes/teknologierContent.test.ts tests/programmes/utviklerblikkContent.test.ts tests/programmes/sqlMysqlContent.test.ts tests/domain/microlearningTrack.test.ts tests/features/microlearning/practiceModel.test.ts tests/architecture/microlearningBoundary.test.ts
npm test -- tests/programmes/registry.test.ts tests/programmes/registryC7.test.ts tests/features/microlearning/utviklerblikkUx.test.tsx tests/architecture/serviceWorker.test.ts tests/architecture/programmesLayer.test.ts
npm test -- tests/app/microTrackRoute.test.tsx -t "Teknologier og rammeverk"
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run check:bundle
npm run check:circular
npm run audit
npm run test:e2e -- e2e/teknologier.spec.ts
```

Actual final browser verification used ignored `artifacts/edu-04/playwright.config.ts` on owned preview port **42187**, against the production build, preserving native projects, zero retries, one worker and refusal to reuse a server. It also selected `e2e/microlearning.spec.ts` with `--grep "technologies:|a fresh learner with no Campaign progress"`. Screenshots, reading counts and budget JSON are in ignored `artifacts/edu-04/`; representative files are `desktop-wrong.png`, `320-100-tsu-tek-04.png`, `390-100-tsu-tek-03.png` and `320-200-tsu-tek-05.png`.

Next: independent content/technical review of the local commit. Only after genuine payload-bound evidence is available should an authorized draft PR enter the repository's certification workflow. No publication is attempted here because a PR without that evidence would knowingly fail its mandatory release gate. There is no remaining implementation decision for the owner in EDU-04.
