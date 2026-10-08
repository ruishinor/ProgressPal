# infra/nhost — Epic G Stage-1 remote backup schema

**Status: unreleased (Epic G, feature branch).** Nothing here is applied by the application, by CI or by any automated agent. These are reviewable artifacts for one Nhost Cloud project (Starter plan, Stockholm `eu-north-1`, `progresspal-g0`) that an owner applies by hand.

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
