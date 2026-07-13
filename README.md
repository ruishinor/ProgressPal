# ProgressPal

ProgressPal is a local-first CS50x study tracker.

The current candidate is **ProgressPal CS50 Edition v1.3.0**: a local-first CS50 tracker proof undergoing release-wide remediation for reproducibility, recovery, offline upgrades, accessibility, and evidence-backed product direction.

This current build is **not** the fully realized RPG v2 shell. ProgressPal RPG v2 remains the intended future character-led CS50 campaign shell powered by the same local-first engine.

After the post-freeze RPG Shell Phase 2C-2G remediation, Focus, Achievements, Insights, Settings, and stale Journey Log cleanup are merged into `master`. The existing `v1.2.0` and `v1.2.1` tags are historical and will not be moved. The `v1.3.0` candidate is not production-certified until the tracked remediation story and release evidence pass.

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
- a completed RPG v2 campaign shell.

## Release freeze status

Current release classification:

```text
ProgressPal CS50 Edition v1.3.0 - local-first CS50 tracker proof candidate
```

Recommended release tag:

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
docs/ProgressPal CS50 RPG v2 - 26-06-23.md
docs/rpg-v2/ROADMAP-rpg-v2-source-of-truth.md
docs/rpg-v2/DECISIONS-rpg-v2.md
docs/rpg-v2/VALIDATION_LOG.md
docs/rpg-v2/MIGRATION_CONTRACT.md
docs/rpg-v2/ASSETS.md
docs/rpg-v2/RISK_REGISTER.md
docs/rpg-v2/VISUAL_TARGET.md
docs/rpg-v2/RESTART_PROMPT.md
```

The June 23 planning document and v1.2 release note are historical freeze records. Current implementation authority is the v1.3 remediation story and its accepted decisions. The current build must still not be described as completed RPG v2.

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
npm run audit
```

If the repo has a combined script such as `npm run validate`, use it only if it runs the full required gate.

## RPG shell transformation rule

Do not start broad RPG shell transformation work from more tracker panels. The current post-2G release candidate must retain complete, reproducible validation evidence.

Only after post-2G validation is recorded should any future feature plan reconsider:

- persistent Hero HUD;
- collapsed/detail panels;
- quest-first resource flow;
- reward feedback after explicit saves;
- minimal, approved asset foundation;
- campaign-map redesign.

Every future implementation module must still include a Scope Discipline Check in its handoff file under:

```text
docs/rpg-v2/modules/
```

## License

See `LICENSE` or `LICENSE.md`.
