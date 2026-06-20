# ProgressPal RPG v2 — Visual Target

Status: active visual direction  
Location in repo: `docs/rpg-v2/VISUAL_TARGET.md`  
Scope: RPG v2 same-origin `/rpg/*` route tree

---

## 1. Visual thesis

ProgressPal RPG v2 should feel like:

```text
A restrained RPG-themed study companion.
```

It should not feel like:

```text
A fantasy game interface.
A tactical HUD.
A cyberpunk dashboard.
A crypto app.
A generic SaaS skin.
An official CS50 product.
A game store.
A streaming media interface.
```

The v1 engine is plain but honest. RPG v2 should be more motivating without becoming less trustworthy.

---

## 2. Visual priorities

In order:

1. readability;
2. honest progress comprehension;
3. clear next action;
4. accessibility;
5. local-first trust;
6. lightweight RPG identity;
7. visual polish.

If visual polish conflicts with readability or trust, readability and trust win.

---

## 3. Mood board in words

The target mood:

- dark study room;
- map table;
- notebook and progress ledger;
- quiet campaign board;
- disciplined but not military;
- heroic but not childish;
- game-inspired but not fake;
- navy/dark surfaces;
- restrained gold accents;
- green for confirmed completion;
- amber for progress;
- subtle violet/blue only where meaningful;
- small ornamental touches, not full fantasy UI.

---

## 4. What to keep from the mockup

Keep the information architecture and screen families:

- RPG Hub;
- Campaign Map;
- Module/Week Detail;
- Study Resource;
- Focus Session;
- Hero/Profile;
- Badge Gallery;
- Journey Log;
- bottom navigation;
- visible progress;
- one clear next action;
- strong sense of progression.

Keep the general idea of:

- cards/panels;
- visual progress bars;
- badge medallions;
- rank identity;
- Code Knights emblem;
- subtle map/path imagery.

---

## 5. What to reduce from the mockup

Reduce:

- heavy glow;
- tiny text;
- visual clutter;
- too many icons per card;
- fake locked courses;
- fake media-player surface;
- excessive purple;
- ornate borders everywhere;
- fantasy-metal UI;
- decorative background dominance;
- nested cards inside cards;
- dense multi-column layout on mobile.

The app must remain readable and useful.

---

## 6. What to reject from the mockup

Reject:

- CS50 as product brand/title;
- `CS50 Knights` as default public guild name;
- embedded course media surface;
- transcript tab;
- fake play controls;
- fake progress from media observation;
- fake energy cap;
- fake “daily win” if not derived;
- fake locked course families;
- official-looking CS50 campaign banner;
- Harvard/CS50-style shield or mark;
- official-looking certificate/badge language;
- decorative UI that hides the task.

---

## 7. Brand and identity

Default guild identity:

```text
Code Knights
```

Course context:

```text
CS50x study track
```

Do not combine these into:

```text
CS50 Knights
```

The Code Knights emblem may use a shield/sword/circuit motif if first-party and visually distinct from official marks.

The emblem is an identity accent, not the whole interface. It may appear in:

- Hub identity panel;
- Hero/Profile;
- optional Settings/About;
- Badge Gallery header.

It should not appear on every card.

---

## 8. Color direction

Use semantic tokens, not one-off colors.

Required token categories:

```text
--rpg-bg
--rpg-surface
--rpg-surface-raised
--rpg-border
--rpg-border-strong
--rpg-text
--rpg-text-muted
--rpg-accent
--rpg-accent-strong
--rpg-progress
--rpg-success
--rpg-warning
--rpg-danger
--rpg-focus-ring
```

Color use:

| Purpose | Direction |
|---|---|
| Background | dark navy / near-black, not pure black |
| Surface | slightly raised dark panels |
| Borders | low-contrast lines, stronger on focus/active |
| Accent | restrained gold/amber |
| Progress | amber/gold or neutral progress fill |
| Completion | green only for confirmed completion |
| Warning | amber/orange |
| Danger | red only for destructive actions |
| Focus | high-contrast visible ring |
| Purple/violet | sparing, category-specific only |

Avoid:

- neon gradients;
- glow as primary structure;
- one-hue blue/purple interface;
- low-contrast gray text;
- status conveyed by color alone.

---

## 9. Typography and text

Text must remain DOM text, not baked into images.

Rules:

- no essential text inside art;
- no tiny labels below accessibility threshold;
- no low-contrast flavor text;
- plain product wording stays visible next to RPG wording where needed;
- destructive actions use plain language;
- external resource links are clearly external.

Good:

```text
Open official CS50x resource
Mark locally complete
Export backup
Reset local data
Rank: Apprentice — local ProgressPal progress
```

Bad:

```text
Enter the official CS50 realm
Burn the archive
Certified CS50 Knight
Master of CS50
Watch inside ProgressPal
```

---

## 10. Layout direction

Mobile-first, but not mobile-only.

Required viewport checks:

```text
320px
375px
390px
768px
1024px
1440px
```

Layout rules:

- no overlapping text;
- no clipped labels;
- no horizontal scroll caused by panels;
- no content hidden behind bottom nav;
- no panel inside panel unless there is a strong reason;
- no huge hero section that pushes the task below the fold;
- one primary action per screen;
- secondary actions are visually secondary;
- settings/destructive controls remain sober.

---

## 11. Component visual rules

### Panels

Use panels for grouping real tasks and status.

Do:

- use clear headings;
- keep enough padding;
- use restrained borders;
- use consistent radius;
- keep hierarchy simple.

Do not:

- nest panels repeatedly;
- add corners/ornaments everywhere;
- use glow to fake hierarchy.

### Buttons

Use real HTML buttons/links styled with CSS.

Do not use raster button assets by default.

Button hierarchy:

```text
Primary: one per main task area.
Secondary: navigation/support actions.
Danger: destructive actions only.
Link: external official resources.
```

### Progress bars

Use semantic HTML/CSS.

Do not use raster progress bar assets by default.

Progress must include readable text value or label.

### Badges

Badges must map to existing achievements.

Locked badges should show requirements. Do not use mystery locks without explanation.

### Map

The map must be accessible.

Start with HTML/SVG nodes and list fallback. Do not rely on a single map image.

### Study Resource card

This is not a media player.

Do not show:

- fake play button;
- fake scrubber;
- fake current media timestamp;
- fake transcript tab;
- embedded frame.

Use a resource-card design with a clear outbound link and local progress controls.

---

## 12. Motion

Motion is optional and must be subtle.

Allowed:

- small hover/focus transitions;
- progress fill transition;
- gentle panel entrance if not distracting.

Required:

- respect `prefers-reduced-motion`;
- respect existing reduced-motion app setting if present;
- do not make navigation depend on animation.

Forbidden:

- constant animated background;
- pulsing glow everywhere;
- motion that hides content;
- motion that makes status ambiguous.

---

## 13. Asset use

Use assets sparingly.

Good asset uses:

- Code Knights emblem;
- one subtle background;
- one Week 4 resource still if useful;
- badge/rank medallions if optimized;
- small nav icons if accessible.

Bad asset uses:

- huge decorative backgrounds;
- raster buttons;
- raster progress bars;
- imported image text;
- visual clutter;
- official-looking course imagery;
- all category assets imported wholesale.

Every asset must be recorded in `ASSETS.md`.

---

## 14. Accessibility rules

Non-negotiable:

- WCAG AA contrast minimum;
- visible keyboard focus;
- no color-only status;
- real text, not image text;
- landmarks and headings;
- bottom nav labels;
- clear external link labels;
- reduced motion support;
- accessible list fallback for map;
- screen-reader-safe destructive actions.

Run axe checks where available. Manual review still required.

---

## 15. Screen visual targets

### Hub

Should feel like a command table for the learner’s current study state.

Must show:

- learner;
- XP/level;
- rank;
- Code Knights identity;
- current module;
- next quest/task;
- one continue action.

Avoid:

- fake energy;
- fake daily reward;
- excessive hero art.

### Map

Should feel like a learning path.

Must show:

- real CS50x units only;
- current/completed/available states;
- list fallback.

Avoid:

- fake future courses;
- map-only navigation.

### Module Detail

Should feel like a clear task board.

Must show:

- real course items;
- progress;
- required/optional distinction;
- action per item.

Avoid:

- invented review/checkpoint tasks;
- official completion language.

### Study Resource

Should feel like a resource card and local progress form.

Must show:

- item title/type;
- local status;
- official outbound link;
- local progress controls.

Avoid:

- media-player imitation.

### Focus Session

Should feel focused and calm.

Must show:

- timer;
- selected task;
- finish/discard;
- honest session summary.

Avoid:

- fake potions/energy;
- bonus XP.

### Hero/Profile

Should feel like a truthful learner profile.

Must show:

- level;
- XP;
- rank;
- class/path;
- Code Knights;
- real activity summary.

Avoid:

- inventory;
- fake classes;
- social/guild members.

### Badge Gallery

Should feel like a clear achievement archive.

Must show:

- earned;
- locked;
- requirements;
- earned dates if available.

Avoid:

- official-looking course trophies;
- mystery locks.

### Journey Log

Should feel like a local record.

Must show:

- saved sessions;
- XP records if available;
- task completion;
- badge activity.

Avoid:

- unsupported charts;
- forecasts;
- coaching.

### Settings/FAQ

Should feel sober and trustworthy.

Must show:

- export/import/reset;
- local data risk;
- no account/no cloud/no analytics;
- non-affiliation statement;
- explanation of RPG terms.

Avoid:

- playful destructive copy.

---

## 16. Visual acceptance standard

A screen passes visual review if:

- the main task is clear within five seconds;
- the next action is obvious;
- all critical text is readable;
- keyboard focus is visible;
- no status depends only on color;
- mobile layout works at 390px;
- desktop layout works at 1280px;
- no classic route styling leaks;
- no fake official branding appears;
- no fake mechanics appear.

---

## 17. Final visual standard

Good RPG v2 visuals:

```text
Make the learner want to continue.
Make progress easier to understand.
Preserve trust.
Preserve clarity.
Use decoration only where it supports comprehension, identity, or motivation.
```

Bad RPG v2 visuals:

```text
Look impressive in a screenshot but make the app harder to use.
Make the app feel official when it is not.
Hide local-only reality.
Invent mechanics the engine does not support.
Require large assets to compensate for weak information design.
```
