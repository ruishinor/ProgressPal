# src/lib/cloud — optional cloud account foundation (Epic G, unreleased)

Scope: the application-facing **cloud port** and the single **Nhost adapter** behind it. Cloud is an optional manual recovery copy; IndexedDB/Dexie is the only learner-state authority. There is no synchronization, outbox, dirty tracking or automatic backup. The only importer is the G5/G6 domain folder `src/lib/cloudBackup/`; no UI, route or boot code imports this folder yet (pinned by `tests/architecture/cloudBoundary.test.ts` and `cloudBackupBoundary.test.ts`).

## Rules

- **Off by default.** `preferences.ts` holds two device-local flags (`enabled`, `trustedDevice`), both false until a learner chooses. They are browser configuration, not learner data: not in IndexedDB, not in the backup envelope.
- **Disabled means silent.** With cloud disabled the SDK client is never constructed and no method makes a request. Importing this folder does no work.
- **One adapter.** Only `nhost/` imports `@nhost/nhost-js` (exact `4.9.0`) or names a provider host. Everything else sees the provider-neutral types in `port.ts`.
- **Auth and GraphQL only.** No Storage, no Functions, no WebSocket.
- **Session-scoped by default.** The session lives in `sessionStorage`; `trustedDevice` (an explicit choice, only while signed out) selects the SDK's persistent store. A session is never moved between the two.
- **PKCE only.** Verification and reset links carry a one-time `code`; the verifier is a single-use record under its own key. A link carrying a token (refresh or access token, or a ticket) is never honoured. The code is treated as opaque: it must be present exactly once, in the query, and of sane size; no provider alphabet is assumed.
- **Every callback-shaped address is scrubbed, usable or not.** Before anything else happens, `code`, `type`, token fields and error fields (and their documented aliases) are removed from the query and the fragment of the current history entry; unrelated parameters and router state are kept exactly. Error-only and malformed callbacks are scrubbed too. If the address bar cannot be shown to be clean afterwards, the code is **not** exchanged (fail closed).
- **No email without a stored verifier.** Sign-up and password reset do not call the provider unless the PKCE verifier was really stored; there is no fallback to a flow without one. The failure is reported as the existing `unknown` error.
- **Sign-out always removes the local session.** The server-side result is `confirmed` only when the provider acknowledged invalidating the refresh token that was really current. A near-expiry token is refreshed first (the SDK would otherwise rotate it inside the request); if that refresh fails, is rejected, or cannot be observed, the result is `unconfirmed`. No session, or cloud disabled, is also `unconfirmed`, because no request was acknowledged.
- **Password change clears this device's session.** After a successful change ProgressPal deliberately drops its own local session and asks for a fresh sign-in. What the provider does to the account's other sessions is a live-validation fact, not an assumption made here.
- **No learner data.** This folder may not import the database, domain, backup, progress or any UI layer.
- **A failed code exchange cannot be retried with the same link.** The one-time code is removed from the address bar and the verifier is consumed before the exchange runs (the safe order), so a transient network failure means requesting a new email link. Requesting a second reset email replaces the first one's verifier, so only the newest link can complete.
- **No fake step-up.** The provider enforces no password re-authentication for the default configuration; none is simulated.
- **One store, no decisions (G5/G6).** `CloudBackupStore` (`backupPort.ts`) lists slots (metadata only), replaces a slot (delete the observed occupant and insert, one request), finds an attempt by its own identity, and downloads one slot only if it still holds the chosen backup. It returns plain results (`ok` or a classified `CloudRequestFailure`); it never retries, never chooses a slot and never judges an outcome. Those belong to `src/lib/cloudBackup/`.
- **The store shares the account's session.** `createNhostCloud` builds the account and the store from one SDK client, so the store sends exactly the session the account holds and the SDK refreshes it inside the store's own requests. Signed out, the store sends **nothing** (no anonymous request) and reports `unauthenticated`; disabled, it throws `disabled` and sends nothing.
- **Server time is compared by value, never as text.** The provider trims trailing zeros (`...04.37582+00:00`), so `compareStoredAt` compares parsed seconds and a nine-digit fraction. A `Date` would drop sub-millisecond digits and two inserts in one millisecond would tie.
- **A transport fault is never a database answer.** The SDK throws for any body with `errors` (every Hasura refusal, with HTTP 200) and for a body that is not JSON (a gateway page). The adapter maps the first to the named constraint and the second to a provider fault; a 5xx or no response is `provider-unavailable`, never a rejection.
- **Strict answers.** A row that is not exactly the asked-for shape (slot outside 0..4, a bad id, a hash that is not 32 bytes of hex, a timestamp it cannot read, two rows for one slot, more than five rows, a row for another slot or backup than requested) is an `unexpected-response`, not a best guess.

## Files

| File                                             | Role                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `port.ts`                                        | `CloudAccountPort`, errors, request-failure types                  |
| `backupPort.ts`                                  | `CloudBackupStore`, slot types, server-time ordering               |
| `nhost/backupStore.ts`                           | the four documents, strict answer parsing, failure mapping         |
| `preferences.ts`                                 | device-local flags                                                 |
| `pkceVerifierStore.ts`, `callbackUrl.ts`         | verifier lifecycle and email-link address handling                 |
| `nhost/account.ts`                               | the adapter (`createNhostCloudAccount`, `getCloudAccount`)         |
| `nhost/sessionBackends.ts`                       | session-scoped and trusted-device storage backends                 |
| `nhost/authErrors.ts`, `nhost/requestFailure.ts` | error mapping; provider fault vs database refusal                  |
| `nhost/backupConstraints.ts`                     | constraint names, ceiling and generation shared with `infra/nhost` |
| `nhost/endpoints.ts`                             | the two Stockholm service URLs (must equal the CSP)                |

The orchestration of a backup and of a restore (slot choice, hashing, reconciliation, verification) lives in `src/lib/cloudBackup/`, which uses this folder only through its public entry. Later stories (G7 lifecycle) extend the port; they do not reach around it.
