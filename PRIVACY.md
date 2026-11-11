# Privacy

ProgressPal is a local-first study companion. IndexedDB in your browser is the
working copy of your learning records. You can study and see your personal
week without a cloud account or an internet connection once the app is cached.
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

Cloud services are off by default on each device. If you turn them on and sign
in, Nhost processes your email and credentials in the configured Stockholm,
Sweden project. The session normally uses tab storage or memory. Choosing to
stay signed in uses browser-local persistent storage. Email-link recovery uses
a short-lived, single-use PKCE verifier. Cloud preferences and credentials stay
outside learner backups.

A manual remote backup sends a complete learner-data snapshot only when you
choose to back up. Nhost and the service operator can read uploaded snapshots.
The service supports up to five snapshots per account, and a manual backup can
replace the oldest one. Signing out or turning off cloud services leaves remote
snapshots available to your account.

## Optional private learning group

When group sharing is available, you choose whether to create or join a group.
Nhost stores its name, your account's membership and your chosen nickname.
Sharing sends only the dates you choose to share for the current week in Oslo.
Current members can see the group name, member nicknames and each member's
current-week count. Exercise answers, notes, XP and email addresses are outside
the group service. Treat an invitation code as private. The person managing the
group can replace or disable it.

Dates shared from different devices are added together, once per date. Local
edits can change your personal week while previously shared dates remain in
the group's count. Older dates stop appearing at the next week and are removed
for that member when they next share. Leaving removes your membership and
shared dates. Provider-side account deletion does the same. An empty group is
removed. When an administrator leaves, the first remaining member takes over
and the previous invite stops working.

## Export, restore and reset

A file export or manual remote backup contains the local learner records.
Group membership and shared dates are managed separately through Læringslaget.
Local restore accepts schema-5 backups and replaces the database after validation
and confirmation. Older exported schemas are refused. Existing on-device
schema-4 databases upgrade in place. Local reset clears this device's learning
records. Your Nhost account, remote backup
copies and group membership have separate controls. Use **Forlat laget** in
Læringslaget to remove membership and shared dates.

Clearing browser storage or uninstalling can lose local progress. A file
export gives you a recovery copy you can keep outside the browser. Local
records and exports are readable by someone with access to your browser
profile or files.

## Network

The host serves the app and its packaged files. External course links open
separate websites with their own privacy practices. The optional cloud
operations above are the app's Nhost requests. ProgressPal has no analytics,
telemetry, automatic cloud sync, tracking cookies or remote AI service.
