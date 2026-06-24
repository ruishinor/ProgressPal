# RPG Shell Phase 2A - Wrapper Contract and Page Parity Audit

## Module

RPG Shell Phase 2A - Wrapper Contract.

## Mode

Mode A - Acceptance audit only.

This document is documentation only. It changes no runtime code, CSS, tests, or
package files. Its purpose is to create a durable, binding contract that prevents
future RPG modules from inventing separate RPG replacements for classic screens
that already work correctly.

## Purpose

The current `/rpg/*` work fixed several real shell-level problems (persistent Hero
HUD, RPG chrome boundary, mobile viewport containment, RPG route header surfaces).
Those fixes are kept.

The same work also drifted into a more serious product problem: it rebuilt or
invented RPG pages where it should have reused the classic engine's correct
screens and behavior. This contract is the correction.

The intended product is:

```text
Working classic engine + RPG visual shell + character-led orientation + campaign framing.
```

The intended product is not:

```text
Classic app + separate RPG imitation pages.
```

---

## 1. The "color it and leave it" rule

For any classic screen that is already correct, the RPG implementation uses this
default policy:

```text
Same content.
Same behavior.
Same workflow.
Same engine calls.
Same data writes.
Same state transitions.
Different visual shell.
```

Only the visual frame changes. Where classic is correct, RPG must visually wrap
it, not rebuild it.

This applies especially to:

```text
Focus / study sessions
Achievements
Insights
Settings / backup / reset
Profile editing
Course item progress save
```

### Repair method

When an RPG page is weaker than its classic counterpart, repair it by returning
to the classic capability under RPG styling:

```text
1. Find the classic page/component that already works.
2. Extract its reusable body if direct reuse is not possible.
3. Render that body inside the RPG shell.
4. Apply RPG tokens/classes to the wrapper.
5. Preserve behavior.
6. Add only minimal route/header/action framing.
```

If a classic component cannot be reused directly, extract a shared component from
the classic page and render that shared component inside both the classic and RPG
wrappers. Do not fork the behavior.

---

## 2. Route contract table

This table is binding for the next remediation sequence.

| RPG route               | Visible purpose            | Correct implementation type       | Source of truth                          | Remediation direction                                                  |
| ----------------------- | -------------------------- | --------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------- |
| `/rpg`                  | Hub / next action          | RPG-native orchestration          | Engine read models                       | Keep, but ensure CTAs point to correct classic-wrapped flows           |
| `/rpg/map`              | Campaign Map / Course Map  | RPG-native visual adapter         | Course map / course units                | Keep as RPG-native; improve copy and usability later                   |
| `/rpg/week/:unitId`     | Module / week detail       | RPG visual adaptation             | Classic course unit data                 | Wrap real course/module rows; do not invent tasks                      |
| `/rpg/resource/:itemId` | Quest / resource detail    | RPG wrapper around item/progress  | Classic item / progress save behavior    | Preserve classic task/resource/progress workflow; style it             |
| `/rpg/focus`            | Focus / session            | RPG visual wrapper                | Classic focus / session behavior         | Replace custom RPG focus layout with classic behavior visually wrapped |
| `/rpg/hero`             | Hero / profile summary     | RPG summary + profile edit access | Classic profile / avatar + XP / progress | Use same avatar, add edit paths; do not duplicate profile editor       |
| `/rpg/badges`           | Achievements               | RPG visual wrapper                | Classic achievement definitions/unlocks  | Use achievements as source; no learner `L` badge icons                 |
| `/rpg/log`              | Insights / Journey history | RPG visual wrapper                | Classic insights / history               | Use classic insights substance; do not invent blank journey log        |
| `/rpg/settings`         | Settings / data controls   | RPG visual wrapper                | Classic settings, backup, reset          | Expose classic controls; collapse explanatory copy                     |

---

## 3. Classification of each `/rpg/*` route

Each route is classified into one of three implementation types:

- **RPG-native orchestration page** - a genuinely new RPG surface that derives
  entirely from existing engine read models. It owns no data and creates no truth.
- **Classic-wrapped capability** - a classic screen reused or shared-extracted and
  rendered inside the RPG shell. Behavior is preserved exactly; only visual framing
  is added.
- **RPG visual adaptation** - a route that re-presents real engine/course data in a
  more RPG-native visual form, while still deriving from real data and linking back
  to classic-wrapped capabilities.

| RPG route               | Classification                                                           |
| ----------------------- | ------------------------------------------------------------------------ |
| `/rpg`                  | RPG-native orchestration page                                            |
| `/rpg/map`              | RPG visual adaptation (RPG-native campaign/course map adapter)           |
| `/rpg/week/:unitId`     | RPG visual adaptation of classic course unit data                        |
| `/rpg/resource/:itemId` | Classic-wrapped capability (item / progress save)                        |
| `/rpg/focus`            | Classic-wrapped capability (focus / session)                             |
| `/rpg/hero`             | Hybrid: RPG-native profile summary + classic-wrapped profile/avatar edit |
| `/rpg/badges`           | Classic-wrapped capability (achievements)                                |
| `/rpg/log`              | Classic-wrapped capability (insights / history)                          |
| `/rpg/settings`         | Classic-wrapped capability (settings / data controls)                    |

Focus, Achievements, Insights, Settings, and Profile editing are explicitly
classic-wrapped capabilities. They must not be rebuilt as RPG-native pages.

Only `/rpg`, the Hero HUD, the Campaign Map (`/rpg/map`), reward feedback after
explicit saves, and RPG summary cards derived from engine facts are permitted to
be genuinely RPG-native - and even these must derive from existing local engine
state.

---

## 4. Current defects by route

### `/rpg/focus`

```text
- Behaves like a custom RPG invention instead of the classic focus/session flow.
- Shows a standalone "Cancel focus" card before a session exists.
- Separates task selection, timer, start action, and cancel action badly.
- Should reuse/wrap the classic focus/session behavior and only apply RPG visual treatment.
```

### `/rpg/badges`

```text
- Uses learner "L" placeholders as badge/achievement icons.
- Behaves like a weaker duplicate of classic achievements.
- Achievement terminology and state should come from classic achievements.
- Visible page concept should be "Achievements"; badge is the visual artifact only.
```

### `/rpg/log`

```text
- Risks being an invented "Journey Log" instead of useful classic Insights.
- Should expose the same local insight/history substance as classic.
- Visible nav label should be "Insights."
```

### `/rpg/hero`

```text
- Lacks direct profile/avatar edit access.
- Main profile avatar can diverge from the HUD avatar.
- Obsolete avatar controls (Face shape, Hair, Top color) should be removed or demoted
  if they no longer matter after the hero image/avatar asset introduction.
```

### `/rpg/settings`

```text
- Too text-heavy; not action-oriented enough (a wall of trust copy).
- Should expose classic settings/data controls clearly.
- Backup/import/export/reset behavior must remain classic-authoritative.
```

### `/rpg/map`

```text
- "RPG Map" is poor copy. Use "Campaign Map" or "Course Map."
- This is one of the few places where true RPG-native visual transformation is allowed later.
```

### Shell / navigation (cross-route)

```text
- Route changes should scroll to top.
- Internal button navigation flashes/glitches white.
- Nav/button taps can flash blue.
- Keyboard focus must remain visible.
- HUD Level display is visually imbalanced on mobile.
```

---

## 5. Classic behavior that must be preserved

The classic engine remains authoritative for all of the following. RPG may present
these differently but must not create a separate source of truth:

```text
course catalog
course units / weeks
course items / tasks
local progress
study sessions
focus / session behavior
XP ledger
level derivation
achievement definitions
achievement unlocks
insights / history
profile data
avatar / profile editing
settings
backup / export / import / reset
local-first trust boundary
```

Specifically preserved per capability:

- **Focus / session**: control order, empty / selected / active / paused / finished /
  completed states, timer behavior, local session save behavior. No passive
  page-load writes.
- **Achievements**: definitions, earned/locked logic, unlock state, requirement copy,
  and no-unlock-on-read behavior.
- **Insights**: local stats, recent activity, progress summaries, study time, and any
  XP/achievement summaries already classic-supported. No passive page-load mutation.
- **Settings**: backup/export/import/reset behavior, destructive-action confirmations,
  local data warnings, and any CS50/Harvard independence disclaimer.
- **Profile**: existing profile storage and profile update behavior.
- **Resource / progress**: the same local progress record, notes/status/blocker
  behavior if classic has it, official outbound links only, and the same engine writes.

---

## 6. RPG visual treatment that may be added

The RPG shell is a presentation and orientation layer. It may add:

```text
persistent Hero HUD
current quest orientation
XP and level visibility
campaign / course map orientation
RPG panel surfaces, wrapper classes, and RPG tokens around classic bodies
route header / title framing
RPG navigation
more motivating visual language
reward feedback after real saved work (later phase)
badge / achievement visual treatment over classic achievement truth
approved local visual assets (later phase, recorded in ASSETS.md)
```

Permitted RPG framing per capability:

- **Resource / Quest**: quest title, item type, required/optional indicator, local
  status, "open official resource", "save local progress" - as light framing only.
- **Hero**: shared avatar source with the HUD, RPG presentation of profile summary,
  and direct access to the existing profile/avatar edit controls.
- **Badges**: neutral locked/earned medallion or CSS/inline-SVG icons over classic
  achievement state. "Achievements" primary; "Badges" only as secondary/visual copy.
- **Campaign Map**: the one route where true RPG-native visual transformation is
  allowed later, still derived from real CS50x weeks/modules and progress.

---

## 7. Explicit forbidden changes

Do not create any of the following as RPG duplicates:

```text
a second focus / session flow
a second achievements system
a second insights / log / event system
a second settings system
a second backup / reset control set
a second profile editor
a second avatar schema or cosmetic inventory
a second XP model
a second progress model
a second database / state machine for existing classic behavior
```

Do not, in any RPG work:

```text
write data on passive page load
unlock achievements on page load
show reward feedback when nothing changed
add new XP / session / achievement rules
use the learner avatar/initial as badge art
import unapproved or unrecorded visual assets
embed media, fake transcripts, or copied CS50 material
add cloud / account / sync / auth language
gamify reset / delete actions or hide destructive actions behind unclear copy
```

Project-wide non-negotiables remain in force:

```text
Preserve local-first / offline-first behavior.
No backend. No auth. No sync. No analytics. No telemetry. No AI APIs. No external services.
No database/schema changes unless explicitly approved later.
No duplicated engine logic. Classic engine remains the source of truth.
No broad rewrite. No overbuilding. No excessive validation.
```

---

## 8. Validation rules by work type

Use proportional validation. Do not run three full validation passes unless the
work is a release candidate, baseline gate, flaky integration issue, or major
migration point.

### Doc-only work (including this contract)

```powershell
npm run format:check
git diff --check
```

### CSS-only visual wrapper changes

```powershell
npm run build
npm run format:check
git diff --check
```

Add Playwright only when the defect is layout/viewport/navigation and cannot be
reliably covered by unit tests.

### TS / TSX wrapper changes without engine logic

```powershell
npm run lint
npm run typecheck
npm run build
npm run format:check
git diff --check
```

Add one targeted test only if a routing or rendering contract changes.

### Engine-affecting work (should be rare)

```powershell
npm run lint
npm run typecheck
npm run build
npm run format:check
git diff --check
npm run test -- <specific relevant test files>
```

---

## 9. Scope Discipline Check

- Intended module: RPG Shell Phase 2A - Wrapper Contract.
- Work mode: Mode A - acceptance audit only.
- Document created: `docs/rpg-v2/modules/RPG-SHELL-02A-WRAPPER-CONTRACT.md`.
- Runtime code changed: no.
- CSS changed: no.
- Tests changed: no.
- Package files changed: no.
- Router changed: no.
- Data / schema changed: no.
- Backend / auth / sync / analytics / telemetry / AI changed: no.
- Dependencies changed: no.
- Assets added: no.
- Classic behavior changed: no.
- Phase 2B started: no.
- Every `/rpg/*` route has a wrapper / adaptation / native classification: yes.
- Focus, Achievements, Insights, Settings, Profile explicitly marked classic-wrapped: yes.

## Acceptance

```text
Contract exists.
Every /rpg/* route has a wrapper/adaptation/native classification.
Focus, Achievements, Insights, Settings, Profile are explicitly marked as classic-wrapped capabilities.
No runtime code changed.
```

## Next phase

Phase 2B - Navigation and shell hygiene. Do not start it until Phase 2A is
committed and merged.
