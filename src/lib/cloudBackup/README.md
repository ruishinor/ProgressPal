# src/lib/cloudBackup — manual cloud backup and restore (Epic G, G5/G6, unreleased)

Scope: the **domain logic** of one optional, manual, one-shot cloud backup (G5) and a manual restore (G6), on top of the `src/lib/cloud` store port. This folder itself contains no UI, no route and no stylesheet; the only modules that import it are the Settings cloud card's panels and presentation model in `src/features/settings/` (an exact allow-list pinned by `tests/architecture/cloudBackupBoundary.test.ts`). Dexie/IndexedDB remains the only learner-state authority; the cloud copy is a recovery copy and nothing is synchronised.

## What it may touch

| It uses                                                  | For                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `@/lib/cloud` (public entry only)                        | the store port, account state, the classified failures, the 10 MiB ceiling, server-time ordering |
| `@/lib/backup` (public entry only)                       | the **existing** envelope builder, serialiser and strict parser; the summary for the preview     |
| `@/lib/storage` (public entry only)                      | `LocalWriteBlockedError`, to report a held write lease as its own outcome                        |
| functions the caller injects (`CloudBackupDependencies`) | reading the snapshot (read only) and the **existing** atomic restore                             |

It imports no database code, no Dexie, no SDK, no UI layer, and names no provider, query language, column or credential. It has no timer, listener, queue, schedule, storage or `console` use. All of that is pinned by the architecture test.

## Rules

- **Nothing starts by itself.** Creating the service does no work. Every operation is a method a learner action calls. A precondition is an exception raised before any request: cloud disabled on this device (`CloudError` `disabled`) or nobody signed in (`session-ended`).
- **One mutating operation at a time per service.** A second one asked for meanwhile gets `{ kind: 'busy' }`; nothing is queued or doubled. `listBackups` is read-only and never waits. The actual local write is still serialised by the existing write lease of the injected restore, which also covers file imports.
- **The payload is the exact local file export.** The same envelope builder and serialiser the Settings export uses, default indentation, default limit, no minifying, no normalising. SHA-256 (WebCrypto) is taken over the UTF-8 bytes of that very string and the same string is the request variable.
- **Ceiling first, locally.** More than 10 MiB (UTF-8 bytes, not characters) is refused with no request at all (`payload-over-remote-ceiling`); so is anything over the unchanged 25 MiB file limit.
- **Free slot first, then the oldest by server time.** Slot choice reads the inventory, takes the lowest empty slot, and with all five taken replaces the slot with the oldest `storedAt`, observing exactly that occupant. The uploader's own `exportedAt` is display only and is never read for ordering. Eviction is generation-agnostic on purpose: what protects the only restorable backup is the server's generation gate.
- **One request, one transaction.** The replacement deletes the observed occupant and inserts in a single request, so a refusal by any gate rolls the delete back too and a slower writer can never overwrite a newer backup it did not see.
- **Success only on the server's own confirmation.** `stored` requires the answer to carry our backup id and a server-derived hash equal to the hash this device computed. A committed row with another hash is an `integrity-violation`, never a success.
- **A database refusal is final.** `unsupported-generation`, `integrity-mismatch`, `payload-too-large`, `slot-out-of-range` and other constraints are reported once and never retried with the same bytes. `unauthenticated` and `rate-limited` are platform refusals that happen before the database runs.
- **Unclear is not failed and not stored.** No response, a gateway fault or an unrecognisable body may have committed. The service looks the attempt up by its own identity: found **with the matching hash** is `stored` (`reconciled: true`); found with another hash is an `integrity-violation` (bounded diagnostics, an inventory re-read, **no** delete, replacement or retry); absent leads to the one allowed retry; unreachable or absent twice is `outcome-unknown`, carrying what `checkAttempt` needs to look again later (held in memory only). An identity alone is never success.
- **Bounds are counts, not delays.** At most **two writes** per call (a lost race and an absent attempt share the budget), one inventory read before each, one identity check after each write that did not answer. The retry reuses the same backup id, so a late first request cannot become a second row. No timer, no backoff.
- **Restore verifies in a fixed order, each failure its own outcome.** The slot still holds the chosen backup (`slot-changed`); its declared generation is this build's (`incompatible`); the SHA-256 of the downloaded text equals the hash the **server** derived (`hash-mismatch`, nothing is parsed; a browser that cannot compute SHA-256 refuses as `verification-unavailable`, which is neither a mismatch nor a bad backup); the existing strict parser accepts it (`invalid-backup`, with the parser's learner-safe message). A provider failure is `unavailable`, never an empty or corrupt backup.
- **No new write path to the learner database.** `prepareRestore` writes nothing. `confirmRestore` hands the verified data to the injected existing restore (atomic, lease-coordinated, fail-closed). The verified data never leaves the service: only the frozen preparation the service itself issued can be confirmed, once; a copy, a clone or a hand-built object is refused (`not-prepared`).
- **Facts only; no recency inference.** The one local fact is whether this device holds learner data (completed onboarding, or a row in progress, sessions, XP, achievements, media events, resume points, evidence or lesson positions; catalogue, enrolment bookkeeping and the export/import audit log do not count). It is judged again at confirmation and, when true, an explicit `acknowledgedReplacingLocalData` is required. Nothing in restore compares the cloud copy's times with anything on this device or says which side is newer or older; `restore.ts` contains no date handling at all.
- **A backup writes nothing locally.** Unlike the file export it records no local audit row.

## Public surface

`createCloudBackupService(dependencies)` returns `listBackups`, `backUpNow`, `checkAttempt`, `prepareRestore`, `confirmRestore`. Pure helpers `chooseTargetSlot`, `classifyInventory`, `hasLearnerData`, `produceBackupPayload` and `sha256Hex` are exported for tests and for a future UI that needs the same facts.

## Wiring contract (done in `src/features/settings/components/CloudBackupPanel.tsx`)

- Inject `account` and `store` from `@/lib/cloud` (`getCloudAccount()`, `getCloudBackupStore()`), `readSnapshot` as `getDatabaseSnapshot`, `appVersion` and `schemaVersion` as the database constants, the database's `migrationContext`, and `restoreLocal` as the existing `restoreDatabaseFromBackup` **wrapped in the app's local-mutation runner** so app state refreshes exactly as after a file import. The service catches that function's errors and reports them as `failed`, so the wrapper must be the one that refreshes state on success.
- The warning and the file-export offer before a destructive restore are a UI concern; the service enforces only the acknowledgement. The existing file export remains the way to take a local copy first.
- A UI must show an inventory as "metadata only, payload not downloaded, integrity not checked", must never use words such as _latest_, _current_, _up to date_ or _everything is backed up_ for anything but the facts in `InventoryFacts`, and must never claim a backup exists on `outcome-unknown`. The Settings model (`src/features/settings/cloudModel.ts`) chooses every such sentence, and `tests/features/settings/cloudModel.test.ts` scans all of them for that vocabulary.

## Not proven here

- No request has been made to the real provider by this code. The `find` and `download` documents and the exact inventory form have not been run live (see `infra/nhost/README.md`); the replacement document is identical to the one the live validation ran.
- Gateway and rate-limit refusals (HTTP 401/429) are treated as happening before the database runs. That is documented provider behaviour, not observed on this project.
- Two real writers racing, a real outage mid-write, Starter auto-pause, and everything from G7 onwards are untested.
- Hashing uses WebCrypto, which needs a secure context (HTTPS or localhost), as the installable PWA already does. Without it a backup is refused locally (`local-export-failed`) and a restore as `verification-unavailable`; nothing is sent or written.
- Performance of a 10 MiB backup in a real browser (the request body is about 14.5 MB after JSON escaping) and memory use are not measured.
