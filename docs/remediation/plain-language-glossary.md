# Plain-Language Glossary

This glossary defines how internal technical terms must translate into user-facing language in the ProgressPal UI. Internal code names (variables, types, database fields) may retain their original names. Only the rendered UI must use the preferred learner-facing language.

---

## Term mapping

| Internal / current UI term                                                                                                  | Preferred learner-facing language                                   | Notes                                                                    |
| --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Course item                                                                                                                 | Lecture / Problem set / Section / Reading / Project step            | Use the specific type label; never render "item" to the learner          |
| course_item (type: lecture)                                                                                                 | Lecture                                                             |                                                                          |
| course_item (type: problem_set)                                                                                             | Problem set                                                         |                                                                          |
| course_item (type: lab)                                                                                                     | Lab                                                                 |                                                                          |
| course_item (type: shorts)                                                                                                  | Shorts / Short video                                                |                                                                          |
| course_item (type: reading)                                                                                                 | Reading                                                             |                                                                          |
| course_item (type: project_task)                                                                                            | Project step                                                        |                                                                          |
| Content detail                                                                                                              | Lecture page / Problem set page / Lab page                          | Type-specific; never "Content detail"                                    |
| Progress record                                                                                                             | Your progress                                                       |                                                                          |
| Status                                                                                                                      | Progress                                                            | In learner-facing label context only; "Status" is acceptable in dev/test |
| Confidence                                                                                                                  | How sure are you?                                                   | Hide under "More details"; do not show as a primary form field           |
| Evidence                                                                                                                    | Where did you submit it? / Submission note                          | Hide until status is Submitted or Accepted                               |
| Item context                                                                                                                | About this lecture / About this problem set                         | Type-specific                                                            |
| Asset tracking                                                                                                              | Content type (or remove entirely)                                   | Do not expose this as a user-visible field                               |
| Local derived state                                                                                                         | Updates your progress, XP, achievements, and dashboard              | Replace the phrase in page descriptions                                  |
| Schema-backed content layer                                                                                                 | Course guide / Local guide                                          | In developer docs only; never in UI                                      |
| Mutable surface                                                                                                             | (remove)                                                            | Not learner-facing at all                                                |
| Granular asset timeline                                                                                                     | (remove)                                                            | Not learner-facing at all                                                |
| Slice timeline                                                                                                              | Video segments / Lecture segments                                   |                                                                          |
| Content slice / slice                                                                                                       | Segment / Video segment                                             |                                                                          |
| Saved slice progress (progress bar label)                                                                                   | Video progress                                                      |                                                                          |
| Use next slice (button)                                                                                                     | Use next segment                                                    |                                                                          |
| Log watched range (card title / button)                                                                                     | Log Lecture / Log Session                                           | Use "Log Lecture" for lecture-type items                                 |
| Save watched range (button)                                                                                                 | Save session                                                        |                                                                          |
| Watched range saved (toast title)                                                                                           | Session saved                                                       |                                                                          |
| Watched range preview                                                                                                       | Watched                                                             |                                                                          |
| Start timestamp (form label)                                                                                                | Started at                                                          |                                                                          |
| End timestamp (form label)                                                                                                  | Stopped at                                                          |                                                                          |
| Logging note (form label)                                                                                                   | Session Notes                                                       |                                                                          |
| Last range (badge)                                                                                                          | Last watched                                                        |                                                                          |
| Study ledger (eyebrow)                                                                                                      | Study sessions                                                      |                                                                          |
| Saved session ledger (card title)                                                                                           | Your saved sessions                                                 |                                                                          |
| Local ledger (EmptyState eyebrow)                                                                                           | Sessions                                                            |                                                                          |
| Storage rule (note heading)                                                                                                 | (remove heading; plain text only)                                   |                                                                          |
| Derived duration                                                                                                            | Time logged                                                         |                                                                          |
| Item (in session form, meaning course item)                                                                                 | What were you working on? / Lecture or task                         |                                                                          |
| Choose a course item (placeholder)                                                                                          | Choose what you were working on                                     |                                                                          |
| Open item detail (link)                                                                                                     | View lecture / View task                                            | Or type-specific                                                         |
| Open item (dashboard button)                                                                                                | Start / Continue                                                    | Contextual                                                               |
| Resume item (dashboard button)                                                                                              | Resume                                                              |                                                                          |
| Resume long-form (dashboard card title)                                                                                     | Resume lecture                                                      |                                                                          |
| Local dashboard (eyebrow)                                                                                                   | Dashboard                                                           | Or remove eyebrow entirely                                               |
| Achievement record (eyebrow)                                                                                                | Your achievements                                                   | Or remove eyebrow                                                        |
| Continue next (dashboard card title)                                                                                        | What's next?                                                        |                                                                          |
| No items are marked blocked                                                                                                 | Nothing is blocked right now                                        |                                                                          |
| Blocked items (dashboard dt)                                                                                                | Blocked                                                             |                                                                          |
| watched ranges (in activity description)                                                                                    | lecture sessions                                                    |                                                                          |
| assembling your derived dashboard                                                                                           | building your dashboard                                             |                                                                          |
| Saved here. Updates … through local derived state                                                                           | Saved here. Updates your progress, XP, achievements, and dashboard. |                                                                          |
| The progress record could not be saved                                                                                      | Could not save your progress                                        |                                                                          |
| The watched range could not be saved                                                                                        | Could not save your session                                         |                                                                          |
| The item status, notes, and evidence were saved                                                                             | Progress saved                                                      | Use toast format: short and positive                                     |
| The watched range, stop reason, and resume point were saved locally                                                         | Session saved · N min watched · +X XP                               | Prefer the reward-first format                                           |
| This item has no granular asset timeline yet, so the local progress record above is the only mutable surface in this module | (remove entirely)                                                   | Hidden implementation detail                                             |
| Item count / N items (badge)                                                                                                | N tasks / N lectures / N steps                                      | Context-specific; avoid bare "items"                                     |
| required items complete                                                                                                     | tasks complete / lectures complete                                  | Or "required steps complete"                                             |
| Unit rollup (progress bar label)                                                                                            | Week progress                                                       |                                                                          |

---

## Language rules for save confirmations

Every save action should produce a confirmation that follows this pattern:

```
[What was saved] · [Quantity if relevant] · [XP earned] · [Achievement if unlocked]
```

Examples:

- `Session saved · 20 min watched · +15 XP`
- `Progress saved · +10 XP · 🏆 First Save unlocked`
- `Session saved · 45 min · +20 XP`

Do not use:

- "The watched range, stop reason, and resume point were saved locally."
- "The item status, notes, and evidence were saved to local persistence."
- "One study session was saved locally as logged effort. No item progress or media history changed."

---

## Language rules for page eyebrows and descriptions

Eyebrows (small label above the page title) should:

- Match the learner's mental model of where they are
- Not expose route architecture, storage concepts, or implementation labels

| Current eyebrow    | Preferred eyebrow                           |
| ------------------ | ------------------------------------------- |
| Course item        | Lecture / Problem set / Lab (type-specific) |
| Study ledger       | Study sessions                              |
| Local dashboard    | Dashboard (or remove)                       |
| Achievement record | Your achievements (or remove)               |

Page descriptions (the subtitle below the page title) should:

- Tell the learner what this page is for in one plain sentence
- Not mention "local derived state," "immutable ledgers," "source-of-truth stores," or "append-only" concepts

Examples of bad page descriptions:

- "This screen is the write surface for one local course item. Saved progress updates the course map, dashboard, XP ledger, achievements, and insights through local derived state."
- "This route reads only validated achievement definitions and locally persisted unlocks."
- "Achievements unlock only from your explicit saves and are derived from your local progress, sessions, and media history."

Examples of good page descriptions:

- "Track your lecture progress. Save a session to earn XP and see your history."
- "Your achievements unlock when you save progress and complete work. Everything here is local to your device."
- "A summary of your CS50 progress on this device."

---

## Language rules for form fields

| Field                     | Bad label             | Good label                                  |
| ------------------------- | --------------------- | ------------------------------------------- |
| Lecture start time        | Start timestamp       | Started at                                  |
| Lecture end time          | End timestamp         | Stopped at                                  |
| Watch notes               | Logging note          | Session Notes                               |
| Submission proof          | Evidence              | Where did you submit it?                    |
| Confidence                | Confidence            | How sure are you? (hide under More details) |
| Item selector in sessions | Item                  | What were you working on?                   |
| Watch preview             | Watched range preview | Watched                                     |

---

## Language rules for status values

Status values visible to the learner must use plain language:

| Internal value   | Learner-facing label |
| ---------------- | -------------------- |
| not_started      | Not started          |
| started          | Started              |
| completed        | Done                 |
| submitted        | Submitted            |
| accepted         | Accepted             |
| blocked          | Blocked              |
| skipped_optional | Skipped (optional)   |

---

## What internal code may keep

These terms are fine in TypeScript types, database field names, test IDs, and internal model logic:

- `item`, `itemId`, `courseItem`, `CourseItem`
- `slice`, `contentSlice`, `sliceId`
- `evidenceText`, `evidence`
- `confidence`
- `watchedRange`, `startSecond`, `endSecond`
- `progressRecord`, `ProgressEntry`
- `ledger`, `xp_transactions`, `study_sessions`
- `assetTracking`, `ContentAsset`
- `localDerivedState`
- `mediaProgressEvents`

The rule is: the learner never reads the code. The learner only reads the rendered UI.
