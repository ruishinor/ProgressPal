# src/lib/cloud — optional cloud account foundation (Epic G, unreleased)

Scope: the application-facing **cloud port** and the single **Nhost adapter** behind it. Cloud is an optional manual recovery copy; IndexedDB/Dexie is the only learner-state authority. There is no synchronization, outbox, dirty tracking or automatic backup, and nothing in the application imports this folder yet (pinned by `tests/architecture/cloudBoundary.test.ts`).

## Rules

- **Off by default.** `preferences.ts` holds two device-local flags (`enabled`, `trustedDevice`), both false until a learner chooses. They are browser configuration, not learner data: not in IndexedDB, not in the backup envelope.
- **Disabled means silent.** With cloud disabled the SDK client is never constructed and no method makes a request. Importing this folder does no work.
- **One adapter.** Only `nhost/` imports `@nhost/nhost-js` (exact `4.9.0`) or names a provider host. Everything else sees the provider-neutral types in `port.ts`.
- **Auth and GraphQL only.** No Storage, no Functions, no WebSocket.
- **Session-scoped by default.** The session lives in `sessionStorage`; `trustedDevice` (an explicit choice, only while signed out) selects the SDK's persistent store. A session is never moved between the two.
- **PKCE only.** Verification and reset links carry a one-time `code`; the verifier is a single-use record under its own key. A link carrying a refresh token is never honoured. The address bar is scrubbed before anything else happens.
- **No learner data.** This folder may not import the database, domain, backup, progress or any UI layer.
- **No fake step-up.** The provider enforces no password re-authentication for the default configuration; none is simulated.

## Files

| File                                             | Role                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `port.ts`                                        | `CloudAccountPort`, errors, request-failure types                  |
| `preferences.ts`                                 | device-local flags                                                 |
| `pkceVerifierStore.ts`, `callbackUrl.ts`         | verifier lifecycle and email-link address handling                 |
| `nhost/account.ts`                               | the adapter (`createNhostCloudAccount`, `getCloudAccount`)         |
| `nhost/sessionBackends.ts`                       | session-scoped and trusted-device storage backends                 |
| `nhost/authErrors.ts`, `nhost/requestFailure.ts` | error mapping; provider fault vs database refusal                  |
| `nhost/backupConstraints.ts`                     | constraint names, ceiling and generation shared with `infra/nhost` |
| `nhost/endpoints.ts`                             | the two Stockholm service URLs (must equal the CSP)                |

Later stories (G5 backup, G6 restore, G7 lifecycle) extend the port; they do not reach around it.
