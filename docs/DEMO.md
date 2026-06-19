# ProgressPal CS50 Edition — Demo Walkthrough & Video Script

This document is the source-controlled demo material for ProgressPal CS50
Edition. It has two parts:

1. A **full click-through walkthrough** an evaluator can follow to exercise every
   feature, including settings, backup/export/import/reset, and offline behavior.
2. A **~3-minute CS50 video narration script** that stays focused on the core
   product loop and mentions the advanced/settings/offline behavior only briefly.

It contains no screenshots or binary assets by design — it is written material
intended to stay accurate as the app changes.

## Demo setup

Run the app first (either mode works):

```bash
# Development
npm run dev        # default http://localhost:5173

# or a production build (needed to demo offline)
npm run build
npm run preview    # default http://localhost:4173
```

For the offline portion of the demo, use `npm run preview` (the service worker is
production-only). Load the page once while online before going offline.

> Tip: to demo first-run onboarding on a machine you have used before, open a
> fresh browser profile / private window, or use **Settings → reset** first (this
> clears local data — see the reset note below).

---

## Part 1 — Full walkthrough

The primary navigation exposes: **Profile**, **Dashboard**, **Course Map**,
**Sessions**, **Achievements**, **Insights**, and **Settings**. The flow below
follows the natural product loop.

1. **Onboarding (first run).** On first load you are taken to setup
   (`/onboarding`). Enter a display name, pick avatar options, and set study
   preferences (including theme and reduced motion). Save to create the local
   profile. This writes only to your browser's IndexedDB.

2. **Profile summary (home).** After onboarding, the home route (`/`) shows your
   saved profile summary — the at-a-glance "who am I and where am I" view.

3. **Course map.** Open **Course Map** (`/course`) to see the bundled CS50x
   catalog as weeks/units and items, with required-progress rollups. This view is
   read-only; it reflects your progress but does not edit it.

4. **Log progress on a lecture or task.** Open an item to reach its detail page
   (`/course/:itemId`). Set your progress status, add notes, and — for a problem
   set — record where you submitted your work, then save.
   - For a **long-form** item (e.g. a lecture), log a session using the
     `m:ss` / `h:mm:ss` time fields under the video segments. Note the segment
     progress and the resume point. Log a second, overlapping session and
     observe that the watched time is merged rather than double-counted, and that
     partial history blocks a silent jump to "Done".

5. **Earn XP.** Saving qualifying progress awards XP through the deterministic XP
   engine; watch for the XP feedback. Reload the page and confirm your XP and
   level are unchanged — the ledger is idempotent, so reloading never
   double-counts.

6. **Log a study session.** Open **Sessions** (`/sessions`). Start the live timer
   (in-memory only) or add a manual session with notes and a blocker, tied to a
   course item, then save. The session ledger is append-only. Start a live timer
   and reload to show that an unfinished session is intentionally discarded rather
   than saved as a phantom record.

7. **Unlock an achievement.** As your saved progress crosses a threshold, open
   **Achievements** (`/achievements`) to see the unlock. Reload and confirm it is
   not duplicated — unlocks happen once, on explicit save.

8. **Dashboard.** Open **Dashboard** (`/dashboard`) for the read-only operational
   summary derived from your stored data. Reloading it changes nothing.

9. **Insights.** Open **Insights** (`/insights`) to see trends over the immutable
   ledgers — active days, logged effort, and the achievement timeline — with no
   streaks branding and no remote analytics.

10. **Settings, backup, and recovery** (`/settings`):
    - **Edit profile** — change profile fields and save.
    - **Export** — export a full local backup as a JSON file. It is created and
      saved by you, on your device; treat it as a personal file afterward.
    - **Import** — import a backup. It is validated strictly first, then it
      **replaces all** current app data (no merge), and import never executes file
      content. Backup import is also reachable from onboarding, so a learner can
      recover after a reset.
    - **Reset** — clear every local store and re-create a fresh default profile
      and seeded catalog. Reset only affects this browser's local database; it
      cannot remove backup files you already exported or other copies elsewhere.

11. **Offline (production preview).** With `npm run preview` loaded once online,
    use the browser's offline mode (DevTools → Network → Offline) and reload. The
    app still starts, your data is still present, and you can navigate to a route
    you had not visited before — served from the cached app shell and boot assets.

## Part 2 — ~3-minute CS50 video script

Keep the recording tight and focused on the core loop (onboarding → track →
gamified feedback → see progress). Settings, backup/reset, and offline get a
brief mention near the end. Times are a guide.

**[0:00–0:20] Intro.**
"Hi, I'm <name>, and this is ProgressPal CS50 Edition — my CS50x final project.
It's an offline-only, single-user app that helps one learner track their CS50
progress in small, persistent, gamified steps. Everything stays in your own
browser; there's no account, no server, and nothing is sent anywhere. It's an
independent project and isn't affiliated with CS50, Harvard, or edX."

**[0:20–0:45] Onboarding.**
"On first run, I create a local profile — a display name, an avatar, and a few
study preferences, including a reduced-motion option for accessibility. That's
saved straight to the browser's local database."

**[0:45–1:25] Track progress (the core idea).**
"Here's the course map: the CS50x weeks and items, with honest progress rollups.
I'll open a lecture. Instead of one all-or-nothing checkbox, long-form material
uses partial-progress tracking — I log the time range I actually watched, it
keeps a resume point, and overlapping times are merged, not double-counted. I
can add notes too, and on a problem set I note where I submitted my work. This
is the heart of the project: honest, resumable progress for long material."

**[1:25–2:05] Gamified feedback.**
"Saving progress earns XP through a deterministic engine, and levels are derived
from an immutable ledger — so if I reload, nothing is double-counted. I'll log a
quick study session as well, then check Achievements: this one just unlocked, and
reloading won't duplicate it."

**[2:05–2:40] See the bigger picture.**
"The Dashboard gives a read-only summary of where I am, and Insights trends my
effort over time — active days and an achievement timeline — without any streak
pressure or remote analytics. Both are read-only: opening them changes nothing."

**[2:40–3:00] Control, offline, and close.**
"In Settings I can export a full local backup, import to restore, or reset. And
because of a small service worker, after one online load the app keeps working
fully offline. That's ProgressPal CS50 Edition — local-first, honest about
progress, and honest about its limits. Thanks for watching."

> Recording note: keep claims aligned with what's on screen. Do not describe
> charts (not shipped), and do not claim encryption, compliance, or
> production-grade security — the project is local-only, which means data is not
> transmitted, not that it is encrypted or safe against device access.
