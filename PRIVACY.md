# Privacy

ProgressPal is a local-first study companion. IndexedDB in your browser is the
working copy of your learning records. The default build supports study
without a cloud account. The account-first build requires sign-in before
accessing learning records. A browser with a previously verified account
binding and a remembered session can continue studying offline.
See [current state](docs/CURRENT_STATE.md) for version and rollout status.

## On this device

The database holds your profile and preferences, programme enrolments, progress,
notes, study sessions, media history and bookmarks, lesson answers and attempts,
XP, achievements, backup history and manually recorded Activity. Activity
records come from your entries. The app collects no exercise sensor data.
The personal week counts distinct Oslo dates from saved study sessions,
submitted attempts and recorded completions.

Packaged course content and the Python runtime are app files. Exercise Python
runs in a dedicated browser worker with network and storage access removed.
The service worker caches static app, course and runtime files.

## Optional cloud account and backups

In the default build, cloud services are off by default on each device. If
you turn them on and sign in, or sign in using the account-first build, Nhost
processes your email and credentials in the configured Stockholm,
Sweden project. The session normally uses tab storage or memory. Choosing to
stay signed in uses browser-local persistent storage. Email-link recovery uses
a short-lived, single-use PKCE verifier. Cloud preferences and credentials stay
outside learner backups.

A manual remote backup sends a complete learner-data snapshot only when you
choose to back up. Nhost and the service operator can read uploaded snapshots.
The service supports up to five snapshots per account, and a manual backup can
replace the oldest one. Signing out or turning off cloud services leaves remote
snapshots available to your account.

## Automatic account synchronization

In the account-first build, signing in enables automatic sync. When connected,
ProgressPal sends an updated snapshot when learner records change and checks
for updates from other devices. The snapshot includes profile and preferences,
programme enrolments, progress, notes, study and media history, resume
positions, saved exercise answers and results, XP, achievements, and Activity
history and settings. Bundled course material, session credentials and device
backup history are outside this snapshot.

The Nhost project stores the latest committed sync revision for your account
until it is replaced or the provider deletes your account. Nhost and the
service operator can read it. Signing out leaves the server copy in place
and keeps local records associated with the same account. Sync does not
combine conflicting edits automatically. You can download both copies before
choosing which to continue with. Changes that have yet to sync can be lost if
browser storage is cleared. File exports and manual remote backups are
separate recovery copies.

## Optional private Guild

When group sharing is available, you choose whether to create or join a group.
Nhost stores its name, your account's membership and your chosen nickname.
Sharing sends only the dates you choose to share for the current week in Oslo.
Current members can see the group name, member nicknames and each member's
current-week count. Exercise answers, notes, XP and email addresses are outside
the group service. While the RPG shell is open, it can show the last name
confirmed by a Guild action. Treat an invitation code as private. The Guild
administrator can change the name and replace or disable the code.

Dates shared from different devices are added together, once per date. Local
edits can change your personal week while previously shared dates remain in
the group's count. Older dates stop appearing at the next week and are removed
for that member when they next share. Leaving removes your membership and
shared dates. Provider-side account deletion does the same. An empty group is
removed. When an administrator leaves, the first remaining member takes over
and the previous invite stops working.

## Export, restore and reset

A file export or manual remote backup contains the local learner records.
Group membership and shared dates are managed separately through Guild.
Local restore accepts schema-5 backups and replaces the database after validation
and confirmation. Older exported schemas are refused. Existing on-device
schema-4 databases upgrade in place. Local reset is available in the default
build for browsers without a synced account binding. To remove the device copy
from an account-bound browser, export pending changes, sign out and clear
the site's browser storage. Your Nhost account, remote backup
copies and group membership have separate controls. Use **Forlat Guilden** in
Guild to remove membership and shared dates.

Clearing browser storage or uninstalling can lose local progress. A file
export gives you a recovery copy you can keep outside the browser. Local
records and exports are readable by someone with access to your browser
profile or files.

## Network

The host serves the app and its packaged files. External course links open
separate websites with their own privacy practices. The optional cloud
and account sync operations above are the app's Nhost requests. ProgressPal
has no analytics, telemetry, tracking cookies or remote AI service.

## Voluntary product feedback (prepared feature)

The optional **Meld fra** feature is separate from learner records. Only an
explicit submission sends the chosen category and written report; a reply
email is included only when entered by the learner. App version, coarse browser
and operating-system families and a page category are added only when the
learner chooses to attach technical details. No progress history, lesson
answers, learner notes, passwords, backups or account identifiers are
automatically attached. The report can itself contain personal information
entered by its author.

Reports are intended for private maintainer triage in a separate Nhost database
schema through a Vercel function. That reporting service is disabled until
permissions, abuse protection, actual retention cleanup and provider settings
are verified. The planned raw-report retention target is 90 days; this is
**not yet a verified operational deletion guarantee**. Other provider logs
and backup retention are separate. Submission errors do not mean that a
report definitely failed to arrive; retry with the same request reference.
