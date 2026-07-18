# Local data coordination safety contract

Status: Module 3 implementation authority; reopened; acceptance count 0/3

## Scope

This contract governs browser-tab coordination for ProgressPal's existing
schema-2 IndexedDB database. It does not change the database schema, backup
envelope, entity shapes, XP rules, or local-first product boundary.

The protocol is fail-closed. Existing data may remain readable when writing is
unsafe, but no browser tab may mutate ProgressPal data unless it holds the
authoritative Web Lock and has synchronized the current revision.

## Authority model

1. The Web Locks API is the only source of write authority.
2. Every participating tab holds the shared
   `progresspal:local-data:presence` lock while active.
3. Exactly one tab may hold the exclusive
   `progresspal:local-data:writer` lock. That tab is the ordinary writer.
4. A contended tab remains read-only and queues for writer ownership. Closing
   the owner transfers the lock through the browser; a message cannot transfer
   or fabricate ownership.
5. A destructive reset or restore requires the writer to temporarily replace
   its shared presence lock with an exclusive presence lock. Any other active
   participant therefore blocks the destructive operation.
6. `BroadcastChannel` and the `storage` event are advisory invalidation and
   liveness transports. They may report revisions and prompt rediscovery, but
   they never authorize a write.
7. Transport availability remains a safety prerequisite because the current
   schema-free protocol depends on cross-tab invalidation. A transport cannot
   grant authority, and a Web Lock cannot make a failed invalidation channel
   safe by itself.

## Safety invariants

1. `canWrite` is true only when all of the following are true:
   - discovery has completed;
   - at least one advisory transport is available;
   - the tab holds the exclusive writer lock;
   - the application has acknowledged the coordinator's exact current
     revision;
   - the coordinator is not stopping;
   - no write or destructive-presence transition is already active.
2. A known peer does not revoke the current owner's ordinary-write authority.
   It does make `peerActive` true and prevents exclusive presence.
3. A contended or unsupported Web Locks state always exposes `canWrite: false`.
4. Revisions are non-negative safe integers and never decrease within a
   coordinator.
5. Every committed logical write increments and announces exactly one
   revision. An aborted or no-op write announces no revision.
6. Every valid peer message, including `closing`, reconciles its revision
   before kind-specific handling.
7. Application state is synchronized only to a coordinator-owned token bound
   to the exact revision and write epoch captured for the corresponding read.
   A coordinator replacement, intervening write, or revision change rejects
   the acknowledgement.
8. Every BFCache restoration is stale until application state is reread. This
   remains unconditional because BroadcastChannel-only operation has no
   durable record of messages missed while frozen.
9. An unavailable-to-available advisory transport transition starts a new
   discovery interval before writes resume.
10. A write lease belongs to the coordinator that issued it. It cannot be
    completed through a replacement global coordinator.
11. Stop, pagehide, or provider teardown blocks new leases immediately. A
    coordinator with an active lease delays final shutdown until the lease
    commits or aborts.
12. A transport exception independently makes the coordinator unavailable,
    even if the transport implementation does not update its availability
    flag.
13. Browser writes without an active coordinator fail closed. The no-op lease
    exists only for server execution and the contained test runtime.
14. Nested repository writes may inherit a lease only from an explicitly
    marked repository-owned Dexie transaction. An unmarked external read-write
    transaction is rejected.
15. The provider exposes `canWrite: false` until application state is fully
    ready, even if the underlying coordinator already owns the writer lock.

## Public states

| State                | Meaning                                                           | Ordinary writes        | Destructive writes                             |
| -------------------- | ----------------------------------------------------------------- | ---------------------- | ---------------------------------------------- |
| `discovering`        | Ownership or advisory discovery is incomplete                     | Blocked                | Blocked                                        |
| `owned/current`      | This tab owns the writer lock and its read is acknowledged        | Allowed                | Allowed only after exclusive presence succeeds |
| `owned/peer-present` | This tab owns the writer lock and another participant is present  | Allowed                | Blocked                                        |
| `contended`          | Another tab owns the writer lock                                  | Blocked                | Blocked                                        |
| `stale`              | A newer revision exists than the application has acknowledged     | Blocked                | Blocked                                        |
| `write-active`       | An authorized logical write has not settled                       | Further writes blocked | Blocked                                        |
| `unavailable`        | Web Locks, advisory transport, or lifecycle safety is unavailable | Blocked                | Blocked                                        |
| `stopped`            | The coordinator has shut down                                     | Blocked                | Blocked                                        |

The public status retains `phase`, `blockReason`, `peerActive`, `revision`,
`stale`, and `writeOwnership`. Exclusive-presence acquisition is an internal
transition and remains fail-closed in the public status.

## Lifecycle and event rules

### Start and ownership

- Acquire shared presence before reporting the initial ownership state.
- Probe the writer lock with `ifAvailable`.
- If acquired, report `owned` and hold it until shutdown.
- If unavailable, report `contended` and queue an abortable exclusive writer
  request. The browser lock grant, not an advisory message, reports the later
  transfer to `owned`.
- Missing or rejected Web Locks support reports `unavailable`.
- Read the durable advisory revision when available, subscribe, send `hello`,
  and complete the bounded discovery interval before enabling writes.

### Peer messages

- Ignore messages from the same tab ID.
- Reconcile a higher revision and mark stale before handling the message kind.
- `closing` removes advisory peer liveness only after revision reconciliation.
- `hello`, `heartbeat`, and `write` refresh peer liveness.
- `hello` receives a heartbeat response.
- Messages update liveness and freshness only. They do not change Web Lock
  ownership.

### Synchronization and automatic rereads

- If stale, read at the observed revision and acknowledge that exact token
  before any initialization repair is attempted.
- Perform required initialization through coordinated repositories.
- Read the final application snapshot and publish it only if the token remains
  valid through the commit boundary.
- If the revision changes during a read, discard that snapshot and perform a
  trailing reread. Never publish or acknowledge the superseded snapshot.
- Ownership transfer, stale revision, or coordinator readiness may trigger an
  automatic guarded reread.
- Automatic external or unwrapped writes invalidate the route epoch so stale
  drafts and mutation controls are unmounted before acknowledgement.
- UI-initiated writes run through `runLocalMutation`. Their automatic event is
  suppressed while the write is active; after commit, the wrapper performs the
  verified reread. A non-invalidating mutation may preserve route-local success
  feedback. Restore and reset must invalidate the route.

### Coordinated writes

1. At the last responsible moment before a top-level mutation, obtain a lease
   from the active coordinator.
2. The coordinator rechecks ownership, freshness, transport, lifecycle, and
   active-write invariants.
3. For reset or restore, acquire exclusive presence before opening the
   destructive transaction. Failure restores shared presence and rejects the
   mutation.
4. On successful commit, call `complete()` once. The issuing coordinator
   increments its revision, persists it when possible, and posts `write`.
5. On validation, transaction, open, or exclusive-presence failure, call
   `abort()` once and retain the previous database state.
6. Nested repository mutations share the top-level lease and revision.
7. Repeated `complete()` or `abort()` calls are no-ops.
8. Production source writes through repositories. Mutation-capable database
   factories and raw database access remain internal or test-only.

## UI contract

- A contended classic or RPG route remains navigable and readable.
- Every control that can mutate IndexedDB is disabled when `canWrite` is false.
- The read-only notice identifies the current tab as read-only; it does not
  claim that all open tabs are read-only.
- The writer may save ordinary profile, progress, session, and RPG changes
  while readers are present.
- Import and reset are disabled while another participant is known, and the
  repository-level exclusive-presence check remains authoritative if advisory
  liveness is delayed or lost.
- Requesting browser persistence is not an IndexedDB mutation and remains
  available independently of write ownership.
- Export records a local backup event, so it is treated as a mutation and is
  available only to the writer.

## Compatibility and limits

- This design remains schema-free and preserves envelope-1/schema-2 backups.
- Code that bypasses the coordinated repositories cannot be fenced by the
  schema-free protocol. Production exports and static analysis must therefore
  prevent new bypasses; contained tests may use internals deliberately.
- Browsers without Web Locks may read an already-compatible database but may
  not write, create, seed, migrate, repair, restore, or reset it.
- Advisory delivery is not assumed reliable. Durable revision reconciliation,
  BFCache invalidation, and trailing rereads cover missed or reordered events.
- No claim is made here about cross-device synchronization or multiple browser
  profiles; the protocol is same-origin and same-browser-profile only.

## Required regression transitions

- two real pages proving exactly one ordinary writer and one read-only peer;
- owner ordinary write while peer presence blocks restore and reset;
- writer close followed by lock-authorized ownership transfer and verified
  reread;
- startup repair blocked under contention and automatically recovered after
  transfer;
- newer persisted revision during BFCache suspension;
- newer revision between state read and acknowledgement;
- a higher-revision `closing` message delivered without an earlier `write`;
- revision change during the final read, requiring a trailing reread;
- transport unavailable at discovery completion and later recovering;
- transport `post` throwing while `isAvailable` remains true or is absent;
- pagehide or stop during deferred committed and aborted writes;
- Web Locks absent, rejected, queued, transferred, and stopped;
- exclusive-presence success, contention, rejection, restoration, and cleanup;
- creation, migration, seed, composite write, restore, and reset preserving
  atomic rollback and one-revision semantics;
- classic and RPG mutation controls disabled for a contended tab while
  navigation remains usable.

No Module 3 acceptance pass may count until the implementation, documentation,
adversarial review, retrospective review, backwards-compatibility checks, and
the universal release gate all pass on one immutable commit and unchanged tree.
Any code or evidence change resets the count to 0/3.
