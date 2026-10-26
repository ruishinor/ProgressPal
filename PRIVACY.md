# Privacy

ProgressPal is a single-user, local-first study companion. IndexedDB in your
browser is the authoritative working copy of learner data. No account is needed
for local study. Optional remote recovery backups are manual, not synchronization.

## Released version and prepared candidate

The released v1.8.0 baseline includes the optional **Remote backup — Alpha**
account and recovery-backup controls, off by default. The locally prepared
v1.9.0/schema-5 candidate adds Activity data and has not been released.
Schema-5 remote backups require a separately approved provider rollout; they
must not be treated as operational before that rollout and live validation.
See [current state](docs/CURRENT_STATE.md) for the verified release identity.

## What is stored

The browser database holds your profile and preferences, programme enrolments,
course progress, notes, study sessions, watched ranges and resume points,
lesson answers, attempts, evidence and positions, XP, achievements and a local
backup-event log. The candidate also holds manually recorded Activity entries,
daily goals and their historical context, custom activities and movement-reminder
preferences. Activity does not automatically detect exercise or collect sensor data.

Packaged course content and the Python runtime are app files, not personal data.
Exercise Python runs in an isolated browser worker without network or storage
access; the app does not send it for remote execution.

## Local storage and optional accounts

Learner records live in IndexedDB, tied to this browser profile and device.
Cross-tab coordination and optional cloud preferences use `localStorage`.
If you enable remote backup and sign in, authentication communicates with Nhost
using your email and credentials. The session normally uses `sessionStorage`
(or memory when unavailable); choosing to stay signed in stores session
credentials in `localStorage`. Email-link recovery uses a short-lived, single-use
PKCE verifier in `localStorage`. These account settings and credentials are not
part of learner backups. The app does not use tracking cookies.

With remote backup off, ordinary local use makes no Nhost requests. Enabling it
allows account and backup-list requests; opening Settings or signing in does
not upload the learner database. Only an explicit backup action sends a complete
snapshot to the configured Nhost project in Stockholm, Sweden. Remote copies
can be read by the cloud provider and service operator; do not assume end-to-end
encryption. Up to five manual snapshots are retained; a later manual backup can
replace the oldest occupied slot. Signing out or disabling remote backup does
not delete existing remote snapshots.

## Backup, restore and reset

- **Export:** a complete JSON file contains the learner records. Schema-5 exports
  include all Activity stores. Protect exported and remote copies as personal data.
- **Restore:** validation precedes confirmation and replacement of the local
  database. The candidate accepts schema-5 backups and refuses historical schema-4
  exports; existing live schema-4 databases upgrade in place. Retain older files
  and recovery copies rather than assuming the candidate can restore them.
- **Reset:** clears and reinitializes this browser's learner database, including
  Activity in the candidate. It does not delete the Nhost account, remote
  snapshots, exported files or copies retained by browsers, devices or others.

Clearing site data or uninstalling can lose local progress. Installing the PWA
neither creates a recovery copy nor synchronizes data. Storage may differ
between a browser and its installed app, particularly on iPhone/iPad; use file
export/import to move learner data when necessary.

## Network and privacy limits

The host receives requests for the app and packaged content. External course
links open their own sites, whose privacy practices apply there. ProgressPal
loads its executable assets from the same origin. Its service worker caches
static app/content/runtime files and does not read or transmit IndexedDB data.
The optional Nhost account/backup requests described above are separate.

There is no analytics, telemetry, automatic exercise tracking, cloud sync, social
leaderboard or remote AI service. Local browser records and JSON backups are
not encrypted by ProgressPal. Someone with access to your device, browser
profile or backup files may read or change them. This document is a description
of the app, not a security certification or a provider retention guarantee.

Reconciled 2026-10-26 against the released baseline and unreleased candidate.
