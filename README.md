# ProgressPal

ProgressPal is a local-first CS50x study tracker.

The released **ProgressPal CS50 Edition v1.3.0** engine is frozen. The optional `/rpg/*` experience adds a character-led study loop over the same saved progress, sessions, XP, and achievements. Classic remains the default and can be opened deliberately from RPG.

C0-C5 product-completion work and final owner-review corrections are frozen on `rpg/product-completion` at `freeze/rpg-product-completion-2026-09-16`, following the owner's commit/tag/freeze/push instruction. Acceptance evidence is tracked in `docs/rpg-v2/RPG-PRODUCT-COMPLETION-RESTART.md`. This repository checkpoint is not a new production release.

The owner subsequently authorized bounded local publish-readiness corrections on
`rpg/publish-readiness`. Current work and validation are recorded in
[the completion record, section 11](docs/rpg-v2/RPG-PRODUCT-COMPLETION-RESTART.md#11-local-publish-readiness-reopening).
The historical freeze remains immutable. Owner review and publication are separate
steps; this branch does not change the deployed application.

## Current product position

ProgressPal is:

- a single-user study companion;
- local-first;
- browser-based;
- CS50x-focused;
- intended to store progress locally in the user’s browser;
- independent from Harvard, CS50, edX, and OpenCourseWare.

ProgressPal is not:

- an official CS50 product;
- a course submission system;
- a certification system;
- a cloud-sync product;
- a social learning platform;
- an AI tutor;
- a media streaming interface.

## Release freeze status

Frozen optional RPG completion checkpoint:

```text
freeze/rpg-product-completion-2026-09-16
```

The annotated tag identifies the final completion commit, including the freeze
record. Runtime implementation is `5610da1`; package version remains `1.3.0`.
The bounded reopening above follows a new owner instruction. Classic remains the
default; `master`, historical release tags, and production are unchanged.

Frozen engine release:

```text
ProgressPal CS50 Edition v1.3.0 - local-first CS50 tracker proof
```

Existing immutable release tag:

```text
v1.3.0-local-first-proof
```

Strategic planning/reference document:

```text
docs/ProgressPal CS50 RPG v2 - 26-06-23.md
```

Release note:

```text
docs/releases/v1.3.0-local-first-proof.md
```

## RPG v2 source of truth

For RPG v2 work, read these files first:

```text
docs/rpg-v2/RPG-PRODUCT-COMPLETION-RESTART.md
docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
docs/rpg-v2/DECISIONS-rpg-v2.md
docs/rpg-v2/VALIDATION_LOG.md
docs/rpg-v2/MIGRATION_CONTRACT.md
docs/rpg-v2/ASSETS.md
docs/rpg-v2/RISK_REGISTER.md
docs/rpg-v2/VISUAL_TARGET.md
```

The latest owner instructions and product-completion restart document govern current work. The June 23 planning document, older restart prompt, release-remediation stories, and module handoffs are historical context, not new implementation queues.

Older root-level planning files may describe the completed v1 engine phase and may be archived under:

```text
docs/archive/engine-v1/
```

Those archived files are historical context, not active RPG v2 implementation guidance.

## Architecture summary

ProgressPal uses a local-first frontend architecture.

Expected stack:

- Vite
- React
- TypeScript
- React Router
- Dexie / IndexedDB
- Zod
- CSS tokens
- Vitest
- Playwright

The local browser database is the source of truth. There is no account system and no server-side user profile.

## Local data warning

ProgressPal stores user data locally in the browser. Browser data can be lost if the user clears site data, changes browser profile, uses aggressive cleanup tools, or if the browser removes storage under pressure.

Users should export backups regularly if they want to preserve their study records.

## CS50 / Harvard / edX disclaimer

ProgressPal is an independent local-first study tracker. It is not affiliated with, endorsed by, sponsored by, or maintained by Harvard University, CS50, edX, or OpenCourseWare.

CS50x and related course materials are created and maintained by their respective owners. ProgressPal may link to official course resources, but it stores only local user progress and notes.

## Development

Use Node 24 LTS and npm 11. Install the exact locked dependencies:

```bash
npm ci
```

Run the development server:

```bash
npm run dev
```

Run the expected validation gate:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run check:circular
npm run check:bundle
npm run audit
```

`npm run validate` aliases the separate `verify:release` certification gate, which requires a clean tree and legitimate tracked review evidence. Use the ordinary commands above for product-completion acceptance; do not manufacture release evidence to run certification.

## RPG shell transformation rule

Preserve completed C0-C5 behavior, the shared local-first engine, and Classic's default entry. Final review corrections use concern-scoped local commits, the existing asset ledger, and one rolling completion record. Do not add future mechanics, dependencies, schemas, or per-fix handoff documents.

The owner authorized the completion branch and freeze tag to be pushed on
2026-09-16. PR, merge, deployment, version changes, and RPG default promotion
remain separate owner decisions.

## License

See `LICENSE` or `LICENSE.md`.
