# Local storage safety policy

Status: v1.3.0 remediation contract

ProgressPal remains browser-only, local-first, and single-user. IndexedDB schema
2 remains unchanged. Coordination metadata is stored outside IndexedDB and
contains no learner records.

## Persistent storage

Settings reports the result of the browser Storage API as one of persistent,
best-effort, unsupported, or error. A learner may request persistent storage
when the browser supports it. A grant reduces automatic eviction risk only. It
does not protect against manual deletion, browser-profile damage, device loss,
or moving to another device. Exported backups remain required.

## Concurrent tabs

Write authority comes from the Web Locks API alone:

1. Every tab holds the shared presence lock
   `progresspal:local-data:presence`; exactly one tab at a time holds the
   writer lock `progresspal:local-data:writer`. Only the writer can mutate
   IndexedDB.
2. A tab that cannot obtain the writer lock is read-only. Import, reset, and
   ordinary repository writes are blocked; export counts as a write because it
   records a backup event.
3. Replacing or resetting local data additionally requires exclusive presence:
   import and reset stay blocked while another ProgressPal tab is open, even
   in the writer tab.
4. Ownership transfer always forces a full IndexedDB reread before writes
   resume; a tab whose stored revision lags a peer-announced revision stays
   read-only until it rereads.
5. Browsers without Web Locks fail closed: existing data stays readable, and
   all writes report unavailable. There is no fallback to advisory authority.

The 250 ms discovery window at startup, `BroadcastChannel`
(`progresspal-coordination-v1`), the storage-event fallback, heartbeats (5 s),
and the 15 s peer expiry are advisory only: they carry liveness and revision
notifications and drive the peer-active indicator. They never grant or deny
write access. The coordination keys `progresspal:coordination:message` and
`progresspal:coordination:revision` carry tab IDs, timestamps, message kinds,
and integer revisions only.

## Known boundary

This is same-browser-profile coordination, not distributed locking. It cannot
coordinate another browser, another device, a copied profile, or scripts on a
different origin. ProgressPal makes no cloud-sync or cross-device-continuity
claim.
