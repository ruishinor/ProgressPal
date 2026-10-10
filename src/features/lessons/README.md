# Lessons

Epic E. The shared lesson surface for catalogue items of type `lesson`,
rendered by the existing course-item route (Classic `/course/:itemId`) and
the RPG resource route through one branch each.

Scope:

- Render a programme's authored lesson content, served by the programme's
  asynchronous content provider (`scope.content.lessons`), never imported
  from a programme module or the registry.
- Render the authored step kinds as text nodes only (no raw HTML), with the
  content's language metadata on the lesson and the technical language on
  code, commands and tool output.
- Offer an answer widget per authored response mode, hints one at a time,
  and feedback only after the terminal evaluation result is durable. A
  card shows only evidence bound to the exercise's current content hash
  (`isCurrentEvidence`); answers to an earlier version stay stored as
  history.
- On an ordering task a programme opens to it (`progressCheckSubjectIds` on
  its content provider; Programvareutvikling: Task 6 only), offer a limited
  "check so far" (`progressCheck.ts`): how many placed steps stand right,
  never which, at most twice per card, and never evidence, XP or mastery.
- Write evidence and lesson positions only through `runLocalMutation`
  without route invalidation, so the writer tab re-synchronizes after every
  committed write.

Out of scope: mastery or skill-state labels for the learner (an open product
question), checkpoint judgement (no authored pass rule, K-4), gate-item
retry (no authored retry rule, K-3), executable evaluation (spike-gated),
and any programme-specific branching: interface copy and learner-wording
rules come from the programme.
