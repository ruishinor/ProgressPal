# Læringslaget provider contract

This delta targets the existing Nhost PostgreSQL source and Hasura GraphQL API.
It requires PostgreSQL with built-in `gen_random_uuid()` and `sha256(bytea)`,
`auth.users(id uuid)`, and the authenticated Hasura role `user` on a read-committed source. Verify the
actual source name, role claims and source-role privileges, including permission
to create a trigger on `auth.users`, on the intended environment before use.
Use the source's database role to apply the SQL so the invoker RPC can access
its own tables and verify the account. The migration has no backup dependency.

The three data tables are private. The one tracked response table is permanently
empty, and the one tracked mutation uses Hasura's injected `hasura_session`
argument. Only the `user` role has metadata permissions. The mutation takes an
action and bounded JSON input. Every read/write is relative to the account in
the injected session. A share, leave or invite action also checks the caller's
membership reference from the board so a stale device cannot act on a new
membership. The first remaining member by insertion order manages the
invite. Codes are generated on request, returned once and stored only as SHA-256
digests. Leaving and direct Auth deletion remove the member's days, revoke an
outgoing administrator's invite and remove an empty group. The server uses Oslo
dates and prunes older dates for a member at their next successful share.

In an authorized **disposable nonproduction environment**, run `up.sql` as the
source role and POST `metadata.json` to the Hasura metadata endpoint. This is an
additive batch. Inspect consistency and the resulting roles after applying it.
The backup apply helper is scoped to backup tables. The metadata API accepts
only the four additions in this batch, and the existing Auth and backup metadata
must be preserved.

Use synthetic A and B in one group, C in a separate group and an anonymous
caller. Confirm A and B see each other's nicknames and scores, C sees its own
group, and anonymous read/write, forged actor/group input and attempted session
argument override fail. Check invite rotation, simultaneous attempts to take
the final slot, idempotent union, server-time date rejection, leave and direct
Auth deletion with a surviving member. Read back the manual backup permissions
and run the existing backup smoke for the synthetic accounts. Delete synthetic
members and verify the empty groups disappear. SQL and client tests alone do
not exercise the Hasura/JWT boundary.

For a reversible access rollback, remove the function permission and untrack
the function, then remove the response table permission and untrack the empty
response table. Keep the SQL schema and Auth deletion hooks in place for
existing memberships. Only a separately authorized data-removal operation
should drop tables containing records.

References: [Hasura custom SQL functions](https://hasura.io/docs/2.0/schema/postgres/custom-functions/)
and [Hasura Metadata API](https://hasura.io/docs/2.0/api-reference/metadata-api/index/).
