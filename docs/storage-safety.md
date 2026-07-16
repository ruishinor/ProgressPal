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

The safe policy is deliberately conservative:

1. Each tab performs a 250 ms discovery handshake before user writes are
   enabled.
2. `BroadcastChannel` is the primary coordination path; a same-origin
   `storage` event is the fallback.
3. Heartbeats run every 5 seconds and an unclosed/crashed peer expires after 15
   seconds.
4. If another ProgressPal tab is active, every tab becomes read-only. Import
   and reset are explicitly blocked, as are ordinary repository writes.
5. Successful writes increment a schema-free revision and announce it. A tab
   that observes a newer remote revision remains stale and read-only until it
   rereads IndexedDB.
6. Closing or navigating away sends a best-effort closing message. The bounded
   heartbeat timeout is the fallback when the browser cannot deliver it.

The coordination keys are `progresspal:coordination:message` and
`progresspal:coordination:revision`; the channel is
`progresspal-coordination-v1`. They carry tab IDs, timestamps, message kinds,
and integer revisions only.

## Known boundary

This is same-browser-profile coordination, not distributed locking. It cannot
coordinate another browser, another device, a copied profile, or scripts on a
different origin. ProgressPal makes no cloud-sync or cross-device-continuity
claim.
