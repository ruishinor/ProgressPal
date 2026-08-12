# Privacy

ProgressPal CS50 Edition is an offline-only, single-user, local-first learning
companion. This document describes how it handles your data. It states the
current privacy boundary honestly; it is not a marketing page and not a legal or
compliance guarantee.

## In one sentence

Everything you enter stays in your own browser on your own device, and the app
does not send it anywhere.

## What data exists

ProgressPal stores only the data you create by using it:

- Your local profile (display name, avatar choices, study targets, theme and
  reduced-motion preferences).
- Your course progress (item status, confidence, notes, evidence text).
- Long-form watched ranges, resume points, and study-session notes and blockers.
- Derived gamification records (XP transactions, levels, achievement unlocks).
- A local audit log of backup export/import events.

It also bundles a fixed CS50 course catalog (the "seed"). That catalog ships
with the app; it is not personal data.

## Where the data lives

- All of your data is stored locally in your browser using IndexedDB (via
  Dexie). It is tied to the browser profile on the device where you use the app.
- The app does not use cookies for anything. `localStorage` is used only for
  cross-tab coordination metadata (tab IDs, timestamps, and write-revision
  counters); none of your learner data is stored in
  `localStorage`/`sessionStorage`.
- There is no account, no login, and no server-side copy of anything.

## What the app does not do

- No backend or server stores your data.
- No cloud sync and no online accounts.
- No external APIs, third-party scripts, web fonts, or remote assets are loaded
  at runtime.
- No analytics, telemetry, tracking, or usage reporting.
- No AI tutor, coaching, or recommendation service.
- No social, sharing, leaderboard, or comparison features.

The offline service worker only caches the app's own static files (its HTML,
JavaScript, and CSS) from the same origin so the app can start without a network
connection. It never reads, caches, or transmits your stored data.

## Data you control

- **Export / backup.** You can export a full local backup as an ordinary JSON
  file. That file is created and saved by you, on your device. Once exported, it
  is a normal personal file: if you move, copy, sync, or share it, you are
  responsible for it. Treat a backup file as personal data.
- **Import / restore.** Importing a backup validates the file and then replaces
  all current app data with the backup's contents. Import never runs code from
  the file.
- **Reset.** Reset clears the app's local database in the current browser and
  re-creates a fresh default profile and seeded catalog.

Reset removes data from the app's local browser database only. It does not, and
cannot, control copies that already exist elsewhere - for example backup files
you exported, browser or device backups, synced browser profiles, or
operating-system-level recovery snapshots. Removing those is up to you.

## What "local-only" does and does not mean

Local-only means your data is not transmitted off the device by the app. It does
**not** mean the data is:

- encrypted at rest (IndexedDB data is stored unencrypted),
- protected against someone who has access to your device or browser profile,
- tamper-proof, or
- certified against any particular security or privacy standard.

If your device, user account, or browser profile is shared or compromised, your
ProgressPal data can be read or changed by whoever has that access. Protect the
device and the browser profile the way you would protect any other personal
files on it.

## Scope of this document

This describes the application's behavior as of the security and privacy review
(Module 19). See `SECURITY.md` for the technical security baseline and known
risks.
