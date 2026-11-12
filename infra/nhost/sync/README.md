# Install the account sync contract

Target the existing **progresspal-g0** project, Stockholm (`eu-north-1`), Hasura source `default`. The release candidate leaves the provider untouched. Keep the app flag off until the contract and the authentication flow are verified.

## Inspect first

Run `node infra/nhost/sync/preflight.mjs` with `NHOST_ADMIN_SECRET` available in the current terminal. It reads only metadata and database capabilities from the fixed project endpoint. Confirm a consistent source, `read committed`, a UUID `auth.users.id` referenced by the migration, PostgreSQL `sha256(bytea)`, and source-role schema creation and access to the Auth ID. Confirm the current backup and Social Week metadata is present. If the preflight shows any sync objects, compare their definitions and permissions to the files here before proceeding.

In the same project's Auth settings, verify that email/password sign-up is enabled, verification policy and allowed domains match the intended rollout, and the exact application origin plus `/cloud/callback` is allowed. Test sign-up and reset delivery to controlled addresses before enabling the app flag. Keep the project's existing verification requirements.

## Apply after explicit provider authorization

1. Apply [up.sql](up.sql) as the Hasura source role (Hasura SQL console with tracking disabled, or `POST /v2/query` with `type: run_sql`, `source: default`, `cascade: false`, and the exact file as `sql`). The transaction creates only `progresspal_sync` objects. Run the preflight again after an uncertain response. If all SQL objects exist and their definitions match, continue at metadata. If any object differs, inspect it before applying further changes.
2. Submit [metadata.json](metadata.json) to `POST /v1/metadata` with the Hasura admin header using the same host as the preflight. The batch adds the empty response type and a session-injected mutation for the `user` role. If the batch result is uncertain, run the preflight and compare all four entries. If the server reports a partial or divergent configuration, inspect `export_metadata`, apply only the verified missing operations, then repeat the consistency check.
3. The only permitted sync table in metadata is the empty `response` type. Confirm its query and subscription roots are disabled. Verify the function uses the injected `hasura_session` argument and only `user` may execute it. The private `snapshots` table must stay untracked.

Never use full metadata replacement for this migration.

## Post-installation probes

Use two fresh synthetic Auth accounts, A and B, in the same project. Use their own bearer tokens on `/v1` of the project GraphQL endpoint. Keep the app rollout flag off on production during these probes.

```graphql
mutation SyncProbe($operation: String!, $input: jsonb!) {
  sync_learning_v1(args: { operation: $operation, input: $input }) {
    result
  }
}
```

- Anonymous and an unauthorized role fail GraphQL validation. A request with an additional `hasura_session` argument also fails validation. Try a forged `userId` in `input`; expect `invalid-input` and an unchanged head. Check that no private snapshot queries, mutations or subscription roots exist for `user`.
- Both accounts start at `head` with `input: {}` and revision 0. On an authorized preview with the flag on, sign in as A and complete onboarding. A's head is now revision 1 and returns a hash without payload. B's head remains revision 0. B's `read` with `expectedRevision: 1` returns `conflict`.
- Read A's revision 1. Verify SHA-256 over the UTF-8 payload equals its head hash. Send two A writes using that payload, matching `hash`, and `expectedRevision: 1` concurrently. Exactly one advances to revision 2. Replay the stale write and read with revision 1; both return `conflict`. Head remains revision 2.
- Submit A writes at revision 2 with an incorrect hash, malformed JSON and its correct hash, a wrong wire/schema version, and a 4,194,305-byte UTF-8 payload. Each fails and leaves revision 2 intact. The expected refusal codes are `integrity-mismatch`, `invalid-input`, `incompatible`, and `too-large`, respectively. Record a gateway rejection separately if it prevents the payload-size probe from reaching SQL.
- With those synthetic accounts, verify the manual backup create/read/restore path and Læringslaget create/join/share/leave. Confirm the sync operations did not touch their rows. Delete the synthetic accounts through the authorized Auth process and confirm that the corresponding rows are gone from the private sync table. The foreign key cascades when `auth.users` is deleted.

## Rollback and recovery

Stop automatic traffic by serving a build with the flag disabled, preserving the account gate for browser profiles already bound by this candidate. Apply [metadata-rollback.json](metadata-rollback.json) to remove only the sync permission, function and response-type exposure. Keep the private rows and account deletion cascade. Check metadata consistency and backup and Social Week access again.

If restoring access, verify the existing SQL and metadata state first, then reapply only missing access. Retain revisions and hashes so clients can reconcile. If a server rollback moved a revision backwards, the client requires deliberate conflict recovery. Dropping stored learning state requires a separate authorized data-removal decision.

References: [Hasura custom SQL functions](https://hasura.io/docs/2.0/schema/postgres/custom-functions/), [Hasura metadata API](https://hasura.io/docs/2.0/api-reference/metadata-api/index/) and [Nhost authentication configuration](https://docs.nhost.io/reference/configuration/#authsignup).
