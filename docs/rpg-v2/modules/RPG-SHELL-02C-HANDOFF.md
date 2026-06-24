# RPG Shell Phase 2C Handoff - Focus as a Classic-Wrapped Capability

## Module

RPG Shell Phase 2C - make `/rpg/focus` reuse the classic focus/session behavior,
visually wrapped in the RPG shell. "Color it and leave it."

## Mode

Mode B - corrective patch.

## Summary

`/rpg/focus` previously rendered a custom RPG focus invention that diverged from
the classic study-session flow: a standalone "Cancel focus" link before any
session existed, separate "Selected task" / "Timer ring" / "Session setup"
panels, a finish-then-auto-save shortcut, a bespoke "Session saved" summary
panel, and a parallel save path (`saveRpgFocusSession`).

This phase replaces that invention with the classic study-session surface,
extracted into one shared component rendered by both routes. The flow, controls,
timer behavior, validation, session writes, and XP are now the classic ones; only
the section wrapper and route header differ by variant.

## Classic component reused / shared component extracted

The classic `SessionsPage` body was extracted into a new shared component:

```text
src/features/sessions/components/StudySessionsSurface.tsx
```

It takes a single `variant: 'classic' | 'rpg'` prop. The variant only changes:

- the section wrapper class (`page-section` vs `page-section rpg-focus`);
- the route header (classic `PageHeader` vs the RPG `.rpg-focus__header` with
  "Back to Hub" / conditional "Back to week").

Everything else - live focus session (idle -> running/paused -> review -> save),
manual session entry, the saved-session ledger, the discard confirmation dialog,
the success toast, all `@/features/sessions/model` calls, and the
`addStudySessionAndAwardXp` write - is shared and unchanged.

`StudySessionsSurface` lives in `sessions` (not `rpg`) on purpose: it imports the
database layer, and the RPG-feature architecture boundary forbids RPG UI files
(`components`/`routes`/`shell`) from importing `@/lib/db`. The RPG route imports
only the component, so the boundary is preserved (verified by
`tests/architecture/rpgFeature.test.ts`).

## Files changed

- `src/features/sessions/components/StudySessionsSurface.tsx` (new shared surface)
- `src/features/sessions/routes/SessionsPage.tsx` (now `<StudySessionsSurface variant="classic" />`)
- `src/features/sessions/index.ts` (export the shared surface)
- `src/features/rpg/routes/RpgFocusPage.tsx` (now `<StudySessionsSurface variant="rpg" />`)
- `src/features/rpg/model/focusActions.ts` (deleted - the custom `saveRpgFocusSession` passthrough is no longer used)
- `src/styles/rpg-components.css` (removed the dead custom-focus-layout CSS: timer ring, timer layout, focus form/field, selected-task, status/button rows, summary; kept the focus header/eyebrow/lede/actions classes used by the RPG header)
- `tests/app/App.test.tsx` (retargeted the RPG focus tests to the classic flow)
- `docs/rpg-v2/modules/RPG-SHELL-02C-HANDOFF.md`

## What changed visually

- `/rpg/focus` now shows the classic study-session surface (live focus session
  card, manual entry card, saved-session ledger) inside the RPG shell, under an
  RPG route header ("Focus").
- The standalone "Cancel focus" header link before a session exists is gone. The
  header now offers "Back to Hub" (navigation) and a conditional "Back to week".
  The only session cancel is the classic in-card "Discard", which appears during
  an active session and confirms via the classic discard dialog.
- The classic inner controls (cards, selects, buttons) keep their classic
  styling; the RPG "coloring" is the surrounding shell, dark canvas, Hero HUD,
  bottom nav, and route header. Deeper visual theming of the inner surface is
  intentionally deferred (no redesign in this phase).

## What engine/behavior did NOT change

- No new timer state machine, session schema, or XP rules.
- Same `@/features/sessions/model` transitions (start/pause/resume/finish/discard).
- Same `addStudySessionAndAwardXp` write and the same review -> save flow
  (notes/blockers are entered in the review phase, then "Save study session").
- No reward feedback, no focus-specific RPG mechanics, no page-load writes.
- Classic `/sessions` is byte-identical for `variant='classic'`, proven by the
  unchanged, passing classic sessions tests.

### Behavior difference worth noting

The old custom page auto-selected the session mode from the task type. The
classic flow requires the learner to choose a mode before starting (mode is a
required field). `/rpg/focus` now follows that classic behavior.

## Follow-up (not done here, out of scope)

`loadRpgFocusSessionSummary` / `RpgFocusSessionSummary` in
`src/features/rpg/model/readModels.ts` are no longer used by the page but are
retained because `tests/features/rpg/readModels.test.ts` still covers them. They
are candidates for a later cleanup once their removal is explicitly approved.

## Scope Discipline Check

- Intended module: RPG Shell Phase 2C - Focus classic wrapper.
- Work mode: corrective patch.
- Classic focus/session behavior changed: no (shared, byte-identical classic output).
- New timer/session/XP/reward logic added: no.
- Engine/data/schema/backend/auth/sync/analytics/AI changed: no.
- Dependencies changed: no.
- Assets added: no.
- Router/route table changed: no.
- Achievements/Insights/Settings/Profile work started: no.
- Custom RPG focus layout removed: yes.
- Standalone "Cancel focus" before a session removed: yes.

## Validation

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run format:check`
- `git diff --check`
- `npm run test -- tests/app/App.test.tsx`
- Also run for boundary/read-model safety:
  `npm run test -- tests/features/rpg/readModels.test.ts tests/architecture/rpgFeature.test.ts tests/architecture/localOnly.test.ts tests/architecture/routeDefinitions.test.ts`

## Manual QA

- Open classic `/sessions`: unchanged.
- Open `/rpg/focus`: same logical flow inside the RPG shell.
- Select a mode, start the live session, pause/resume, finish, add notes/blockers
  in review, save: one local study-session record is written and XP is awarded by
  the existing engine; a "Session saved" toast appears.
- No standalone "Cancel focus" card appears before a session exists.
- No passive write occurs on page load.
