# ProgressPal

ProgressPal is a local-first CS50x study tracker.

The current stable app is the classic ProgressPal v1 engine: a plain, functional study tracker for local course progress, study sessions, XP, achievements, insights, backup, import, and reset.

ProgressPal RPG v2 is planned as a same-origin `/rpg/*` route tree over that existing engine. It must not rewrite the engine, add a backend, add accounts, add analytics, change the database schema, or weaken the local-first trust boundary.

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

## RPG v2 source of truth

For RPG v2 work, read these files first:

```text
docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
docs/rpg-v2/DECISIONS-rpg-v2.md
docs/rpg-v2/VALIDATION_LOG.md
docs/rpg-v2/MIGRATION_CONTRACT.md
docs/rpg-v2/ASSETS.md
docs/rpg-v2/RISK_REGISTER.md
docs/rpg-v2/VISUAL_TARGET.md
docs/rpg-v2/RESTART_PROMPT.md
```

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

Install dependencies:

```bash
npm install
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
npm run audit
```

If the repo has a combined script such as `npm run validate`, use it only if it runs the full required gate.

## RPG v2 implementation rule

Do not scaffold all RPG modules at once.

Start with RPG-00 only:

- install source-of-truth documentation;
- reconcile repo state;
- archive misleading old root Markdown files;
- record validation baseline;
- make no runtime changes;
- make no package changes;
- add no routes;
- add no assets.

Every implementation module must include a Scope Discipline Check in its handoff file under:

```text
docs/rpg-v2/modules/
```

## License

See `LICENSE` or `LICENSE.md`.
