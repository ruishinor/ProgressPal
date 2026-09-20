# ProgressPal

ProgressPal is a local-first CS50x study tracker.

The released **ProgressPal CS50 Edition v1.3.0** engine is frozen. The primary `/rpg/*` experience adds a character-led study loop over the same saved progress, sessions, XP, and achievements. RPG is the default; the secondary Classic interface is available deliberately from RPG.

The certified runtime baseline for publication closure is `07ae92a08abe87738986c418d2c0d603ee2a4005` (tree `fe599050158c366d69b760f77e13270d43f2d150`) on `rpg/publish-readiness`. That runtime candidate passed the immutable local release gate and independent GitHub Final candidate validation on 2026-09-19. Release-boundary or documentation-only follow-up may create a successor commit without changing application runtime; the immutable release manifest for that committed candidate is authoritative for the exact final SHA/tree rather than this README attempting to self-reference its own commit.

Publication remains blocked until the required real iPhone/Safari, Android/Chrome, human screen-reader, owner GO, merge, and production hosted-origin smoke/rollback checks are complete.

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

## Release and source-package status

The immutable engine proof remains tagged `v1.3.0-local-first-proof`, and the completed RPG product work remains frozen at `freeze/rpg-product-completion-2026-09-16`. Current publication closure is performed on `rpg/publish-readiness`; it does not reopen product or engine work.

Internal engineering history, release reviews, implementation notes, and repository automation are retained in the repository for traceability but are not part of the distributable source archive. Source-release archives must be created from the exact final commit with `git archive`, which applies the tracked `export-ignore` boundary. Do not create release archives by zipping a working directory.

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

Preserve completed C0-C5 behavior, the shared local-first engine, and direct secondary Classic routes. Final review corrections use concern-scoped local commits, the existing asset ledger, and one rolling completion record. Do not add future mechanics, dependencies, schemas, or per-fix handoff documents.

Publication closure is limited to packaging/evidence sanitation, candidate certification, the required physical/manual checks, and the explicit owner-controlled merge/deployment sequence. Product behavior changes require a new accepted scope.

## License

See `LICENSE` or `LICENSE.md`.
