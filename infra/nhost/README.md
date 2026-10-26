# infra/nhost — Epic G Stage-1 remote backup schema

## Activity schema-5 candidate: local preparation only (2026-10-25)

The original creation migration below remains unchanged at schema 4. The owner authorized local preparation of `migrations/default/1792886400000_activity_generation_5/up.sql`. It advances the single accepted pair to format 1/schema 5 in one transaction, using `NOT VALID` to preserve earlier rows. It has **not** been applied to the provider. The application constant describes the candidate, not verified live infrastructure. Schema-5 cloud backup is not operational before separate rollout approval and live validation.

Rollout, only with later explicit owner authorization:

1. Independently review and verify the exact client and SQL migration. The locally prepared application/package/cache version is 1.9.0 (baseline 1.8.0); it is not published. Complete the separately authorized Git integration and release certification before any provider change. Keep a schema-5 file export of any device upgraded locally. Preserve older backup files and rows; this candidate does not restore schema-4 exports. Before rollout, identify whether any learner needs a retained schema-4 recovery copy: recover it with the matching older application in a separate profile, then upgrade that live database and export schema 5. Do not discard that dependency or relabel the older backup.
2. Prepare the certified client for promotion. Apply only the new generation migration through the normal Nhost SQL migration workflow immediately before promotion. Do not rerun `apply.mjs schema` on an existing project: that helper creates the original table.
3. Validate with synthetic data: generation-5 upload/download/hash/restore, generation-4 upload rejection with transactional rollback, retained generation-4 rows listed as incompatible, and ownership/slot/size/hash constraints. The retained `validation/validate-live.mjs` is the historical generation-4 harness; do not claim it proves generation 5. Adapt and review its generation-specific vectors during separately approved live-validation work.
4. Promote the approved client. Between the provider change and client availability, schema-4 clients cannot upload. Older cached clients continue to have uploads refused until updated. Local learning and file export remain available. Provider read permissions and existing rows are unchanged.
5. Schema-5 clients refuse schema-4 file and remote restores before writes under the revised owner decision. No conversion or cleanup is added. Subsequent explicit manual backups retain the existing five-slot replacement policy.

Rollback is constrained: never lower the provider generation while a schema-5 row exists. The new `down.sql` takes an exclusive lock and refuses that state without deleting rows. Older application code cannot open a device already upgraded to native IndexedDB version 50. Do not delete learner data or reset a database to force a downgrade; coordinate forward recovery or use an explicitly selected appropriate backup and separate browser profile. No live infrastructure or publication action is authorized here.

**Status: generation-5 preparation is unreleased and unapplied.** The released v1.8.0 client already includes optional manual remote backup. The remainder of this document records the original generation-4 provisioning contract and historical harness; the candidate changes only the versioned generation gate described above. Nothing here is applied by the application or CI, and no live infrastructure was changed in this preparation. The owner controls one Nhost Cloud project (Starter plan, Stockholm `eu-north-1`, `progresspal-g0`).

This folder is deliberately **not** a backend framework and **not** a full Nhost project directory (`nhost.toml`, full Hasura metadata, Functions). A Git-connected Nhost deployment replaces the project's metadata with whatever is in the repository, which would remove the Auth tables' own tracked metadata. So the artifacts are additive: a migration, and a Hasura metadata API bundle that is applied **on top of** the existing metadata.

## What is here

| Path                                                          | Purpose                                                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `migrations/default/1791417600000_epic_g_backup_slots/up.sql` | the one table, its named constraints and the metadata trigger                                 |
| `.../down.sql`                                                | removes only those Epic G objects                                                             |
| `hasura/apply.json`                                           | track the table and grant role `user` its permissions (bulk metadata request)                 |
| `hasura/rollback.json`                                        | drop those permissions and untrack the table                                                  |
| `apply.mjs`                                                   | owner-run helper for the three files above (`schema`, `permissions`, `rollback`, `--dry-run`) |
| `validation/validate-live.mjs`                                | owner-run live validation (see below)                                                         |
| `validation/lib.mjs`                                          | pure helpers for the harness, unit-tested offline                                             |

Tests that pin all of this: `tests/infra/`, `tests/architecture/cloudBoundary.test.ts`.

## The contract in one table

| Concern                  | Mechanism                                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Five backups per account | primary key `(user_id, slot)`, `backup_slots_slot_range` (0..4)                                                                                |
| Ownership                | `user_id` is a Hasura insert **preset** from `X-Hasura-User-Id`, FK to `auth.users` with `ON UPDATE/DELETE CASCADE`; a client cannot supply it |
| Remote size ceiling      | `backup_slots_payload_ceiling`: `octet_length(payload) <= 10485760` (10 MiB). The local 25 MiB file backup limit is unchanged                  |
| Current generation only  | `backup_slots_generation_gate`: `format_version = 1 AND schema_version = 4` (deployment-controlled)                                            |
| Exact bytes              | `backup_slots_exact_bytes_gate`: expected hash present, 32 bytes, and equal to `sha256(convert_to(payload,'UTF8'))`; NULL fails                |
| Server-owned fields      | `BEFORE INSERT` trigger sets `payload_sha256`, `payload_bytes`, `stored_at` (`clock_timestamp()`); none is insertable                          |
| No update                | no update permission exists                                                                                                                    |
| Hidden precondition      | `expected_sha256` and `user_id` are not selectable                                                                                             |

The gates are named CHECK constraints rather than trigger exceptions because, with Hasura `devMode` off, a trigger-raised error collapses into a generic message while a check violation names its constraint (observed in the G0/G1 spike). The client classifies by those names (`src/lib/cloud/nhost/requestFailure.ts`).

## Applying (owner, development state)

Requires the SQL/metadata APIs to be enabled on the project (see "Provider configuration"). Set the admin secret **only in your own terminal**:

```powershell
$env:NHOST_ADMIN_SECRET = [Net.NetworkCredential]::new('', (Read-Host 'Admin secret' -AsSecureString)).Password
node infra/nhost/apply.mjs schema --dry-run   # review what would be sent
node infra/nhost/apply.mjs schema
node infra/nhost/apply.mjs permissions
```

Then run the live validation (below). Roll back with `node infra/nhost/apply.mjs rollback` (permissions and tracking first, then `down.sql`).

## Changing the accepted generation (schema or format release)

The generation pair is advanced only by a migration shipped **with** the app release that changes `currentBackupFormatVersion` or `currentDatabaseSchemaVersion` (`tests/infra/nhostSchema.test.ts` fails if the app constants and this migration disagree). Older rows must stay (visible as "not restorable", never rewritten), so the new constraint is added `NOT VALID`: it is enforced for every new insert without re-checking old rows.

```sql
alter table public.backup_slots drop constraint backup_slots_generation_gate;
alter table public.backup_slots add constraint backup_slots_generation_gate
  check (format_version = <new> and schema_version = <new>) not valid;
```

Apply it immediately before promoting the new app, run the live validation against the candidate, and never lower the pair while a higher-generation row exists. Only one pair is accepted at a time.

## Live validation (owner-run, not run by CI)

`validation/validate-live.mjs` needs two verified synthetic users whose email and a shared password you place in `NHOST_USER_A_EMAIL`, `NHOST_USER_B_EMAIL`, `NHOST_USER_PASSWORD`. It runs positive controls first, then the negatives (stale occupant, wrong generation, wrong/missing/short hash, slot 5, 10 MiB + 1, isolation, forged user id, hidden hash, exact text, insert-time ordering). A 5xx or dropped connection aborts the run as inconclusive; only a database refusal that names the expected constraint counts as a rejection. Evidence is redacted and written to the OS temp folder.

**Result and cleanup are separate facts.** The result (`PASS`, `FAIL` or `INCONCLUSIVE`) is decided before cleanup and cleanup can never change it. Every run starts by clearing the synthetic rows of users A and B. After the run, whether it passed, failed or aborted, the harness _attempts_ to clear them again and records `cleanup` as `complete` (both inventories read back empty), `incomplete` (it could not be finished, for example during a provider outage) or `not-attempted` (no user signed in, so nothing could have been written). Cleanup is best-effort, not guaranteed: during an outage the rows stay until the next run clears them first. The synthetic Auth users are never deleted by the harness. Exit codes: `0` PASS with cleanup complete, `1` FAIL or INCONCLUSIVE, `2` not configured, `3` PASS with cleanup incomplete.

### Observed on the real stack (2026-10-08, owner-run)

The Stage-1 schema and permissions are applied on `progresspal-g0` and the harness passed **23 of 23** with `cleanup: complete` (`live-validation-1791459666984.json`, SHA-256 `03d33359a257ecafb40a6acfa233359b46ad127e06653aa7717a353b1c42e71a`; the evidence file does not record the commit, which is the owner script's pinned HEAD `11de98a`).

| Property              | Observed                                                                                                                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Positive controls     | empty-slot insert, occupied-slot replacement (delete + insert, one request) and the current generation `(1, 4)` succeed; the server hash equals the client hash                                                                        |
| 10 MiB                | exactly 10 MiB accepted (request body 14,519,135 bytes after JSON escaping, 4.2 s)                                                                                                                                                     |
| 10 MiB + 1 byte       | refused by `backup_slots_payload_ceiling`, i.e. by the **database constraint**; the gateway-only branch of `T5-ceiling` was not taken                                                                                                  |
| Lost race             | fails on `backup_slots_pkey`; the winner is not overwritten; inventory unchanged                                                                                                                                                       |
| Generation gate       | `(1, 5)` and format `2` refused by `backup_slots_generation_gate`; the old row survives                                                                                                                                                |
| Exact-bytes gate      | wrong, missing and 31-byte expected hashes are all refused by the same `backup_slots_exact_bytes_gate`; the old row survives                                                                                                           |
| Slot range            | slot 5 refused by `backup_slots_slot_range`                                                                                                                                                                                            |
| Isolation and surface | no update and no aggregate root; insertable columns are exactly the client-owned set; `expected_sha256` and `user_id` not selectable; B sees none of A's rows and deletes none; a forged `user_id` and anonymous access are impossible |
| Exact text            | `\u0000` escapes, an emoji and a combining mark round-trip byte for byte                                                                                                                                                               |
| Ordering              | two inserts in one transaction get strictly increasing `stored_at` (`clock_timestamp()`, not `now()`)                                                                                                                                  |

Lessons from the run:

- Both synthetic users must be **verified** before the harness runs. The first run aborted at sign-in (HTTP 401) with zero checks and `cleanup: not-attempted`; that is the intended behaviour, not a result (`live-validation-1791459368636.json`, SHA-256 `ed715258912bd0c686ad824aebbf41e99e270a417eda55316f5f886a05fc6de5`).
- Once the schema exists, re-running the whole owner script stops at the schema step ("relation already exists") by design and applies nothing further. Repeat only the validation with `$validationOnly = $true`.
- What this does **not** cover: live account flows (email delivery, redirects, the real code exchange, whether a password change revokes other sessions), the callback route and UI, and everything from G5 onwards.

## Documents the application sends (G5/G6, code only)

The Nhost adapter (`src/lib/cloud/nhost/backupStore.ts`) sends exactly these four GraphQL documents, with the SDK's own authenticated client. Nothing else reaches the table. The payload is only ever a **variable** (`$new.payload`); a slot number and a backup id placed in a document are validated first (an integer 0..4, a UUID).

| Operation | Document                                                                                                                                                                                                                                                               | Exercised on the real stack?                                                                                                                                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| inventory | `{ backup_slots(order_by: {slot: asc}) { slot backup_id format_version schema_version app_version exported_at payload_bytes stored_at } }`                                                                                                                             | Close to the harness inventory, which selected the same shape plus `payload_sha256`. The application omits the hash (the inventory is metadata only) and adds `app_version` and `exported_at`, both selectable columns. **This exact form was not run live.** |
| replace   | `mutation Cas($new: backup_slots_insert_input!) { del: delete_backup_slots(where: {slot: {_eq: ⟨slot⟩}, backup_id: {_eq: "⟨id⟩"}}) { affected_rows } ins: insert_backup_slots_one(object: $new) { backup_id payload_sha256 stored_at } }` (no `del` for an empty slot) | **Identical** to the harness's `casRequest` (positive controls, lost race, generation and exact-bytes gates, rollback of the delete).                                                                                                                         |
| find      | `{ backup_slots(where: {backup_id: {_eq: "⟨id⟩"}}) { slot backup_id payload_sha256 stored_at } }`                                                                                                                                                                      | **Not run live.** It combines parts that were: a `where` filter on a column, `backup_id` equality inside the delete, and the selectable `payload_sha256`.                                                                                                     |
| download  | `{ backup_slots(where: {slot: {_eq: ⟨slot⟩}, backup_id: {_eq: "⟨id⟩"}}) { slot backup_id format_version schema_version app_version exported_at payload_bytes stored_at payload payload_sha256 } }`                                                                     | **Not run live in this form.** Reading `payload payload_sha256` for one slot was (exact-text round trip).                                                                                                                                                     |

Two facts about the SDK that the adapter depends on and the tests pin: any response whose JSON body has `errors` (which is how Hasura reports every database refusal, with HTTP 200) is thrown as a `FetchError` carrying the status and body; and a response that is not JSON (a gateway error page) is thrown as a bare `SyntaxError` with no status, which the adapter reports as a provider fault, never as a database answer.

The offline simulated stack (`tests/infra/simulatedNhostCore.mjs`) understands these documents and the harness's, and nothing else. It lets the repository gate exercise the whole path (service, adapter, SDK) without a provider, including a write that commits and then loses its answer. It proves application logic, not the provider: the first live exercise of the inventory, find and download forms is a **separate owner-run G5/G6 live validation**, which this branch does not perform and has not been authorized to perform.

## Callback URLs for the owner-run configuration step (nothing is applied from here)

The application asks the provider to send the learner back to **`<the page's own origin>/cloud/callback`** (`window.location.origin` plus `cloudCallbackPath`, `src/lib/cloud/callbackUrl.ts`). The route of that path exists in the app (`src/app/router/routeDefinitions.ts`, rendered by `src/features/settings/routes/CloudCallbackPage.tsx`, outside both shells). Because the origin is read from the page, **each origin the app is served from needs its own entry**:

| Where the app runs                                | Origin                                  | Exact callback URL                                     |
| ------------------------------------------------- | --------------------------------------- | ------------------------------------------------------ |
| Production (alias recorded in `CURRENT_STATE.md`) | `https://progress-pal-seven.vercel.app` | `https://progress-pal-seven.vercel.app/cloud/callback` |
| Local development (`npm run dev`, Vite's default) | `http://localhost:5173`                 | `http://localhost:5173/cloud/callback`                 |
| Local production preview (`npm run preview`)      | `http://localhost:4173`                 | `http://localhost:4173/cloud/callback`                 |

Neither local port is set by the repository: they are Vite's defaults for `vite` and `vite preview`, so they change if you pass `--port` or Vite finds the port taken. (The managed E2E run uses `http://127.0.0.1:42183` against a simulated provider; it needs no provider setting.)

Notes for the owner:

- **Where they go.** The "Provider configuration delta" table below names the settings (`auth.redirections.clientUrl` and `allowedUrls`; `hasura.settings.corsDomain` for the same origins). A natural reading is `clientUrl` = the production origin and each callback URL above listed in `allowedUrls`. The repository cannot confirm how the provider matches entries (exact or prefix), so **verify it in the owner step**; nothing in this repository changes the project.
- **The production alias is read from the repository's own records**, not from the platform. Confirm the live alias before entering it; if production is served from another origin, that origin's `/cloud/callback` is the entry.
- **`localhost` and `127.0.0.1` are different origins.** Add the one you actually open. The local entries are needed only to try the real account flows from your own machine; the repository gate and the E2E run use a simulation and need no provider setting.
- **Other origins are refused by design.** A Vercel per-deployment preview URL (or any origin not listed) will send a redirect the provider does not allow, so sign-up and password-email requests from it will fail. For sign-up the app reports a plain refusal. For **Forgot password?** it deliberately answers every account-dependent refusal exactly as it answers success (so the answer cannot reveal which addresses have accounts), which means **a refused redirect looks like "a link is on its way" and no email arrives**. When trying the live reset, confirm the email really arrives; if it does not, check the allowed URLs first. This is expected, and it has not been observed live.
- **Password recovery uses the same URL.** The reset email is requested with the same `redirectTo` (`<origin>/cloud/callback`) and the same PKCE challenge as sign-up, and its link lands on the same route, which then asks for the new password (two fields, `autocomplete="new-password"`) and calls the account's password change with the session the link created. No extra provider entry is needed. After the provider acknowledges the change the app deliberately signs this device out; whether the provider ends the account's other sessions is **not assumed** and the UI never says so.
- **What the app does with the link.** The learner lands on `/cloud/callback?code=…`. The page reads that address once, removes everything callback-shaped from it, and only then exchanges the one-time code (PKCE, with the verifier this browser stored when the email was requested). It shows nothing the link carried and ends at Settings. A link opened in a browser that did not start the request cannot be completed there and says so.
- **Not proven yet (live account flows, still an owner-run step):** that the email arrives, that its link carries `?code=` to exactly this route, that the real code exchange succeeds, and what the provider does with an error redirect. For password recovery additionally: that the reset email arrives and its link completes in the same browser; that the exchanged session may change the password; how the provider answers a reset request for an address with no account (the app answers identically either way); what the provider does with the account's other sessions after a change; and the first HTTP 429 the provider returns for repeated requests (the app words a 429 as "too many attempts" but its exact semantics are unobserved). The offline tests and the simulated-provider browser tests prove the application's handling of those shapes, not the provider.

## Provider configuration delta (for the owner-run step; nothing is applied from here)

Development state (while migrations and metadata are being applied) versus final intent:

| Setting                                               | Development                                                                                                                                                                   | Final production intent                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `hasura.settings.enabledAPIs`                         | include `metadata` (SQL/metadata API needed by `apply.mjs`)                                                                                                                   | `["graphql"]` once the schema is final (hardening after validation; a later migration needs a temporary re-enable) |
| `hasura.settings.enableConsole`                       | as needed                                                                                                                                                                     | `false`                                                                                                            |
| `hasura.settings.devMode`                             | `false` (the schema does not depend on it)                                                                                                                                    | `false`                                                                                                            |
| `hasura.settings.corsDomain`                          | production origin plus the local development/E2E origins                                                                                                                      | only origins actually needed                                                                                       |
| `auth.redirections.clientUrl` / `allowedUrls`         | the spike's localhost placeholder must be replaced by the exact routes `https://progress-pal-seven.vercel.app` and `.../cloud/callback` (plus local origins while developing) | exact production origin and callback only; no wildcard                                                             |
| `auth.user.roles.allowed`                             | `['user']` only, if live G2 validation shows nothing needs `me`                                                                                                               | `['user']`                                                                                                         |
| `auth.user.gravatar.enabled`                          | `false`                                                                                                                                                                       | `false`                                                                                                            |
| `auth.user.email.allowed`                             | the invited testers/owner only                                                                                                                                                | invited testers only (alpha)                                                                                       |
| `auth.method.emailPassword.emailVerificationRequired` | `true`                                                                                                                                                                        | `true`                                                                                                             |
| `auth.elevatedPrivileges.mode`                        | `disabled` (default; a valid session can change the password, accepted under OD-F6)                                                                                           | unchanged                                                                                                          |
| `hasura.settings.enableAllowList`                     | not enabled (untested)                                                                                                                                                        | decided in G9/G10 only if a tested operation-management workflow exists                                            |

Open items carried, not decided here: self-delete permission on `auth.users` (G7 entry), Starter automatic pause (T17), the allow-list.
