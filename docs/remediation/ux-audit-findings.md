# UX Audit Findings — Baseline

**Audit date:** 2026-06-17
**Branch:** `ux/00-remediation-roadmap`
**Baseline commit:** `34e0be7 Surface CS50 course content in tracker`
**Audited pages:** `/`, `/course`, `/course/:itemId`, `/sessions`, `/dashboard`, `/achievements`, `/insights`, `/settings`
**Audited files:**

- `src/features/course/routes/ContentDetailPage.tsx`
- `src/features/course/components/CourseUnitCard.tsx`
- `src/features/course/components/CourseMapSummary.tsx`
- `src/features/sessions/routes/SessionsPage.tsx`
- `src/features/dashboard/routes/DashboardPage.tsx`
- `src/features/achievements/routes/AchievementsPage.tsx`
- `src/features/insights/routes/InsightsPage.tsx`
- `src/components/layout/AppShell.tsx`
- `e2e/*.spec.ts` (label assertions)
- `tests/app/App.test.tsx` (label assertions)

---

## Finding category 1 — Learner-facing jargon

These are strings visible to the user that use forbidden or discouraged language.

### 1.1 ContentDetailPage.tsx — Critical

| Location                                            | Current text                                                                                                                                                                         | Problem                                                                                                         | Remediation module |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------ |
| PageHeader `eyebrow` (loading, error, ready states) | `"Course item"`                                                                                                                                                                      | "Item" is an internal type concept; not meaningful to learner                                                   | UX-01              |
| PageHeader `title` (loading/error)                  | `"Content detail"`                                                                                                                                                                   | Route/database language; not a learner concept                                                                  | UX-01              |
| PageHeader `description`                            | `"This screen is the write surface for one local course item. Saved progress updates the course map, dashboard, XP ledger, achievements, and insights through local derived state."` | "write surface," "local course item," "local derived state" are developer terms                                 | UX-01              |
| Card `title`                                        | `"Progress record"`                                                                                                                                                                  | Audit/database language                                                                                         | UX-01              |
| Card `description`                                  | `"Saved here. Updates the course map, dashboard, XP ledger, achievements, and insights through local derived state."`                                                                | "local derived state" is a developer concept                                                                    | UX-01              |
| FormField `label`                                   | `"Confidence"`                                                                                                                                                                       | Abstract scoring concept; primary field; not self-explanatory                                                   | UX-01 / UX-02      |
| FormField `description`                             | `"0 means unset. 5 means high confidence."`                                                                                                                                          | Adds description but confidence is still wrong label                                                            | UX-01 / UX-02      |
| FormField `label`                                   | `"Evidence"`                                                                                                                                                                         | Legal/audit tone                                                                                                | UX-01              |
| TextArea `placeholder`                              | `"What proves this is done?"`                                                                                                                                                        | Audit/compliance framing                                                                                        | UX-01              |
| Card `title`                                        | `"Item context"`                                                                                                                                                                     | "Item" + "context" = developer language                                                                         | UX-01              |
| Card `description`                                  | `"The route stays bounded to the current item and whatever local progress has already been saved for it."`                                                                           | "route," "bounded," "item" are developer concepts                                                               | UX-01              |
| Definition term                                     | `"Asset tracking"`                                                                                                                                                                   | Internal asset management term                                                                                  | UX-01              |
| Note                                                | `"This item has no granular asset timeline yet, so the local progress record above is the only mutable surface in this module."`                                                     | "granular asset timeline," "local progress record," "mutable surface" — three forbidden phrases in one sentence | UX-01              |
| Card `title`                                        | `"Slice timeline"`                                                                                                                                                                   | Internal data structure name                                                                                    | UX-01              |
| ProgressBar `label`                                 | `"Saved slice progress"`                                                                                                                                                             | "slice" is an internal concept                                                                                  | UX-01              |
| Button                                              | `"Use next slice"`                                                                                                                                                                   | "slice" is an internal concept                                                                                  | UX-01              |
| FormField `label`                                   | `"Start timestamp"`                                                                                                                                                                  | Timestamp is a developer word                                                                                   | UX-01              |
| FormField `label`                                   | `"End timestamp"`                                                                                                                                                                    | Timestamp is a developer word                                                                                   | UX-01              |
| FormField `label`                                   | `"Logging note"`                                                                                                                                                                     | "Logging" is a developer activity                                                                               | UX-01              |
| Note heading                                        | `"Watched range preview"`                                                                                                                                                            | "watched range" is forbidden                                                                                    | UX-01              |
| Button                                              | `"Save watched range"`                                                                                                                                                               | "watched range" is forbidden                                                                                    | UX-01              |
| Toast title                                         | `'Watched range saved'`                                                                                                                                                              | "watched range" is forbidden                                                                                    | UX-01              |
| Toast description                                   | `"The watched range, stop reason, and resume point were saved locally."`                                                                                                             | Developer-speak save confirmation                                                                               | UX-01              |
| Toast description                                   | `"The item status, notes, and evidence were saved to local persistence."`                                                                                                            | "item," "evidence," "local persistence" are developer terms                                                     | UX-01              |
| Error message                                       | `"The progress record could not be saved."`                                                                                                                                          | "progress record" is forbidden                                                                                  | UX-01              |
| Error message                                       | `"The watched range could not be saved."`                                                                                                                                            | "watched range" is forbidden                                                                                    | UX-01              |
| Card `title`                                        | `"Log watched range"`                                                                                                                                                                | "watched range" is forbidden                                                                                    | UX-01              |
| Button                                              | `"Save local progress"`                                                                                                                                                              | "local" qualifier adds no learner value                                                                         | UX-01              |
| Link description                                    | `"The content detail route could not read local data."`                                                                                                                              | "content detail route" is developer language                                                                    | UX-01              |

### 1.2 CourseUnitCard.tsx — Moderate

| Location           | Current text                       | Problem                                         | Remediation module |
| ------------------ | ---------------------------------- | ----------------------------------------------- | ------------------ |
| ProgressBar helper | `"N of N required items complete"` | "items" should be type-specific                 | UX-01              |
| Badge              | `"{unit.itemCount} items"`         | "items" is the core forbidden word              | UX-01              |
| Link               | `"Open detail"`                    | Vague; does not tell learner what they will see | UX-01              |

### 1.3 CourseMapSummary.tsx — Moderate

| Location           | Current text                                                                                                                           | Problem                                               | Remediation module   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------- |
| Card `description` | `"Item detail and watched-range logging use this ordered catalog, while dashboard and insights derive from your saved local records."` | "watched-range logging," "derive" — developer framing | UX-01                |
| Definition term    | `"Items"`                                                                                                                              | Count of "items" in catalog card                      | UX-01                |
| ProgressBar helper | `"N of N required items complete"`                                                                                                     | "items" should be type-specific                       | UX-01                |
| Badge              | `"N optional"`                                                                                                                         | Acceptable but "optional tasks" would be clearer      | UX-01 (low priority) |

### 1.4 SessionsPage.tsx — Moderate

| Location             | Current text                                          | Problem                                                | Remediation module |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------ | ------------------ |
| PageHeader `eyebrow` | `"Study ledger"`                                      | "ledger" is accounting/audit language                  | UX-01              |
| Card `title`         | `"Saved session ledger"`                              | "ledger" is accounting language                        | UX-01              |
| EmptyState `eyebrow` | `"Local ledger"`                                      | "ledger" is accounting language                        | UX-01              |
| FormField `label`    | `"Item"` (course item selector)                       | "item" is forbidden                                    | UX-01              |
| Select `placeholder` | `"Choose a course item"`                              | "course item" is forbidden                             | UX-01              |
| Note heading         | `"Storage rule"`                                      | Developer concept                                      | UX-01              |
| Review label         | `"Derived duration"`                                  | "derived" is a developer word                          | UX-01              |
| Button               | `"Save logged effort"`                                | Slightly technical; learner would say "Save session"   | UX-01              |
| Toast description    | `"No completion or watched-range data was inferred."` | "watched-range data was inferred" — developer language | UX-01              |
| Link                 | `"Open item detail"`                                  | "item detail" is forbidden                             | UX-01              |

### 1.5 DashboardPage.tsx — Moderate

| Location                 | Current text                                                                                                                                                                       | Problem                                                                          | Remediation module |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------ |
| PageHeader `eyebrow`     | `"Local dashboard"`                                                                                                                                                                | "Local" prefix adds no learner value; reads as qualifier                         | UX-01              |
| PageHeader `description` | `"A read-only view derived from your local CS50 records. Nothing here is synced, fetched, or stored separately — it reflects only what you have explicitly saved on this device."` | "read-only view derived" is developer language; second half is honest and useful | UX-01              |
| Card `title`             | `"Continue next"`                                                                                                                                                                  | Oddly phrased; should be "What's next?"                                          | UX-01              |
| Button                   | `"Open item"`                                                                                                                                                                      | "item" is forbidden                                                              | UX-01              |
| Card `title`             | `"Resume long-form"`                                                                                                                                                               | "long-form" is a content type the learner doesn't need to know                   | UX-01              |
| Button                   | `"Resume item"`                                                                                                                                                                    | "item" is forbidden                                                              | UX-01              |
| Empty state              | `"No items are marked blocked."`                                                                                                                                                   | "items" is forbidden                                                             | UX-01              |
| Activity empty state     | `"…watched ranges, XP, and unlocks…"`                                                                                                                                              | "watched ranges" is forbidden                                                    | UX-01              |
| Loading description      | `"assembling your derived dashboard"`                                                                                                                                              | "derived" is developer language                                                  | UX-01              |

### 1.6 AchievementsPage.tsx — Minor

| Location                 | Current text                                                                                                                                                                 | Problem                                                            | Remediation module |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------ |
| PageHeader `eyebrow`     | `"Achievement record"`                                                                                                                                                       | "record" sounds like an audit system                               | UX-01              |
| PageHeader `description` | `"Achievements unlock only from your explicit saves and are derived from your local progress, sessions, and media history. Nothing here is synced. This page is read-only."` | "derived from," "media history," "read-only" are developer framing | UX-01              |
| Loading description      | `"Opening the local achievement catalog and merging it with saved unlocks."`                                                                                                 | "merging" and "catalog" are implementation details                 | UX-01              |

### 1.7 E2E tests asserting current (forbidden) labels

These tests must be updated when the labels they assert are changed in UX-01 and UX-02:

| File                          | Current assertion                                      | Target change in |
| ----------------------------- | ------------------------------------------------------ | ---------------- |
| `e2e/achievements.spec.ts:72` | `page.getByLabel('Confidence')`                        | UX-01            |
| `e2e/dashboard.spec.ts:241`   | `page.getByLabel('Logging note')`                      | UX-01            |
| `e2e/dashboard.spec.ts:242`   | `getByRole('button', { name: 'Save watched range' })`  | UX-01            |
| `e2e/dashboard.spec.ts:496`   | `page.getByLabel('Logging note')`                      | UX-01            |
| `e2e/dashboard.spec.ts:497`   | `getByRole('button', { name: 'Save watched range' })`  | UX-01            |
| `e2e/insights.spec.ts:103`    | `page.getByLabel('Logging note')`                      | UX-01            |
| `e2e/insights.spec.ts:104`    | `getByRole('button', { name: 'Save watched range' })`  | UX-01            |
| `e2e/settings.spec.ts:30`     | `page.getByLabel('Logging note')`                      | UX-01            |
| `e2e/settings.spec.ts:31`     | `getByRole('button', { name: 'Save watched range' })`  | UX-01            |
| `e2e/xp.spec.ts:94`           | `page.getByLabel('Confidence')`                        | UX-01            |
| `tests/app/App.test.tsx:186`  | `screen.getByText('Slice timeline')`                   | UX-01            |
| `tests/app/App.test.tsx:188`  | `findByRole('button', { name: 'Save watched range' })` | UX-01            |

---

## Finding category 2 — App feels like an audit system

These patterns collectively produce the "audit system" feeling even when individual strings are borderline acceptable.

### 2.1 ContentDetailPage.tsx

- The page title is "Content detail" — a database row viewer label, not a learner destination.
- The first prominent card is labeled "Progress record" — an accounting ledger entry.
- "Evidence" is a primary form field with the prompt "What proves this is done?" — an audit compliance question.
- "Confidence" is presented as a required primary field alongside status — implies the learner must formally self-assess on a 0–5 scale before their work is accepted.
- The page description says "write surface for one local course item" — this is code architecture language.
- The note "This item has no granular asset timeline yet, so the local progress record above is the only mutable surface in this module" reads like a system status log.
- The "Slice timeline" card title, with its list of segments each showing "% logged," produces the visual effect of a data audit tool.

### 2.2 SessionsPage.tsx

- The page is labeled with eyebrow "Study ledger" — a bookkeeping term.
- The saved sessions section is titled "Saved session ledger" — same problem.
- The empty state uses eyebrow "Local ledger" — triple usage of the word "ledger" on one page.
- The discard dialog says "Unfinished study sessions are represented by absence, not by partial saved rows" — this is a database engineering statement.
- The "Storage rule" headings explain implementation behavior that the learner does not need to know about.

### 2.3 Dashboard

- The eyebrow "Local dashboard" positions the page as a technical local-storage readout.
- The description "A read-only view derived from your local CS50 records" emphasises technical derivation before value to the learner.
- "Continue next" is the least motivating possible label for the "what should I do?" card. A learner scanning the page for what to do next has to decode this label.

### 2.4 Achievements

- The eyebrow "Achievement record" makes achievements feel like a compliance log rather than a reward wall.

---

## Finding category 3 — XP, levels, and achievements are hidden or underpowered

### 3.1 On the content detail page (the main write surface)

- After saving a watched range, the toast says: `"The watched range, stop reason, and resume point were saved locally. (+X XP!)"` — XP is buried at the end of a developer status message.
- After saving progress, the toast says: `"The item status, notes, and evidence were saved to local persistence. (+X XP!)"` — same issue.
- Neither save confirmation mentions achievements unlocked, minutes added, or what to do next.
- There is no visible level or XP bar on the detail page itself.
- The XP reward does not feel earned; it feels like a metadata footnote.

### 3.2 On the dashboard

- XP is displayed in a card titled "XP" with "Level N" as the metric. This is actually decent, but it is one of eight equally-weighted cards — it does not read as a primary motivator.
- The "Continue next" card does not connect to XP or achievement progress ("save this to earn 15 more XP" style prompts are absent).
- Achievement unlocks from recent activity are visible in "Recent activity" but the formatting is a plain list item, not a celebration.

### 3.3 On the achievements page

- Achievements are presented in a filterable grid. This is functional, but there is no "what do I do next to unlock the next one?" guidance per achievement.
- Locked achievements only show the description/rule — no plain-language suggestion.
- Unlocked achievements are displayed identically to locked ones (visually muted difference).

### 3.4 On the sessions page

- There is no visible XP counter or level progress shown while logging a session.
- The toast after saving shows XP but in the same footnote-appended format.

### 3.5 App shell

- The AppShell header shows the learner's name and a summary string, but no level, XP bar, or next-target hint. A learner has to navigate to the Dashboard to see their level at all.

---

## Finding category 4 — No clear "what did I just save?" confirmation

### 4.1 ContentDetailPage.tsx

- Watch-range save: toast title `'Watched range saved'` + description that leads with technical details. XP is `+X XP!` appended.
- Progress save: toast title `'Progress saved'` + description that mentions "item status, notes, and evidence… local persistence." This is better on title but the body is technical.
- Neither confirmation shows: minutes added, total XP earned, achievement unlocked, or what to do next.
- The toast disappears after a brief delay. There is no persistent in-page confirmation of what was just saved.

### 4.2 SessionsPage.tsx

- After live save: `"One live study session was saved locally as logged effort. No completion or watched-range data was inferred. (+X XP!)"` — the learner does not need to be told what was NOT inferred; they need to know what WAS saved.
- After manual save: `"One study session was saved locally as logged effort. No item progress or media history changed. (+X XP!)"` — same problem: the confirmation leads with a disclaimer.

### 4.3 Dashboard

- No save confirmation surface on the dashboard.

---

## Finding category 5 — Previous saves cannot be reviewed, edited, or understood

### 5.1 Lecture watch saves

- There is no UI that shows the learner their previous lecture sessions from within the lecture page.
- The "Slice timeline" card shows aggregate watch coverage but no individual session list.
- A learner who watched 20 minutes on Monday and 40 minutes on Tuesday cannot see "Monday: 0:00–20:00 — note: 'got interrupted'" anywhere accessible from the lecture page.
- To find session notes, the learner must go to the Sessions page and scan a flat list of all sessions across all course items — there is no per-lecture filter in the UI.
- There is no edit, correction, or deletion UI for watch events. Sessions are correctly append-only by design, but there is also no "Add correction note" path.

### 5.2 Progress notes

- The progress form (status, confidence, notes, evidence) is an upsert form. When you re-open the page, you see the last saved values. This is correct behavior but the learner cannot see a history of what they wrote in notes on previous visits.
- If a learner saved a note on Monday that said "got stuck on pointers," then on Tuesday overwrote it with "finished," the Monday note is gone from the UI. There is no audit trail visible to the learner.

### 5.3 Sessions page

- The sessions page shows an append-only list of saved sessions (all course items, newest first). There is no per-item filter, no search, and no edit/delete UI. This is by design for data integrity, but it creates confusion when a learner wants to review what they saved for a specific lecture.

---

## Finding category 6 — Onboarding friction

Onboarding was not audited live in this pass. Based on code review:

- `OnboardingPage.tsx` creates the first-run local learner profile. It requires the learner to set a display name and configure avatar, study targets, theme, and reduced-motion preferences.
- A new user or CS50 evaluator must complete onboarding before reaching the dashboard or course map.
- There does not appear to be a "Use default learner" shortcut that bypasses setup with sensible defaults.
- A "Just show me the app" demo path does not exist.

These are confirmed issues but are deferred to UX-06 to avoid mixing onboarding changes with the terminology cleanup in UX-01.

---

## Finding category 7 — Missing page-level "what's next?" guidance

### 7.1 Course map

- The "Current focus" card shows the next unfinished required unit and a description of why. This is good.
- There is no time estimate, no XP incentive, and no plain-language description of "what does Week 0 involve?"

### 7.2 Lecture page

- The page opens on the "Progress record" card, not a "Log Lecture" / "Resume watching" primary action.
- A learner resuming a lecture must scroll past the progress form to find the "Log watched range" card.
- There is no prominent "Resume at X:XX" button at the top of the page.

### 7.3 Dashboard

- "Continue next" card shows the recommended item and a link. But the XP motivation for doing it ("doing this will earn you 15 XP") is not surfaced.
- The "What's next?" framing is absent — the card title "Continue next" is grammatically odd and not a question a learner would ask themselves.

---

## Summary severity matrix

| Finding                                            | Pages affected                   | Severity     | Module      |
| -------------------------------------------------- | -------------------------------- | ------------ | ----------- |
| "Course item" / "Content detail" eyebrow and title | Detail page                      | Critical     | UX-01       |
| "watched range" in all its forms                   | Detail page, sessions, dashboard | Critical     | UX-01       |
| "Progress record" card                             | Detail page                      | Critical     | UX-01       |
| "Evidence" and "Confidence" as primary fields      | Detail page                      | Critical     | UX-01       |
| "Slice timeline" card                              | Detail page                      | High         | UX-01       |
| "Use next slice" / "Save watched range" buttons    | Detail page                      | High         | UX-01       |
| "Start/End timestamp" labels                       | Detail page                      | High         | UX-01       |
| "Logging note" label                               | Detail page, sessions            | High         | UX-01       |
| "Study ledger" / "Saved session ledger"            | Sessions page                    | High         | UX-01       |
| "Local derived state" and "mutable surface"        | Detail page                      | High         | UX-01       |
| "Granular asset timeline"                          | Detail page                      | High         | UX-01       |
| "Item" in session forms and buttons                | Sessions page, dashboard         | High         | UX-01       |
| "Local dashboard" / "Achievement record" eyebrows  | Dashboard, achievements          | Moderate     | UX-01       |
| "Continue next" card title                         | Dashboard                        | Moderate     | UX-01       |
| XP confirmation is a footnote, not a headline      | Detail page, sessions            | High         | UX-01/UX-02 |
| No per-lecture previous-notes view                 | Detail page                      | High         | UX-02       |
| No repair/correction path                          | Detail page, sessions            | Moderate     | UX-05       |
| XP/level not visible from detail page              | Detail page                      | Moderate     | UX-04       |
| No "Resume at X:XX" button above the fold          | Detail page                      | Moderate     | UX-02       |
| No "What's next?" framing on dashboard             | Dashboard                        | Moderate     | UX-01/UX-04 |
| No onboarding shortcut for new user / evaluator    | Onboarding                       | Moderate     | UX-06       |
| Achievements show no plain "how to unlock" steps   | Achievements                     | Low/Moderate | UX-04       |
| Missing guide content (week summaries, etc.)       | Course map, detail               | Low (future) | UX-07       |

---

## Zero-defect baseline (UX-00)

UX-00 changes only documentation. The following were confirmed at baseline:

- No runtime source changed
- No dependency added or removed
- No schema change
- No service-worker change
- No XP rule change
- No achievement rule change
- No backup/import/reset contract change
- No external network fetch introduced
- No support folders tracked
- No test weakened

This baseline must remain clean after UX-00 documentation commit.
