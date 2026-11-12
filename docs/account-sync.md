# Account-first synchronization

The build flag `VITE_PROGRESSPAL_ACCOUNT_SYNC=true` enables account-first onboarding. The default build retains the existing onboarding and manual cloud controls. The feature uses the existing `progresspal-g0` Nhost project. The provider contract is prepared separately from application rollout.

IndexedDB remains the working store. One account owns the learner database in a browser profile. A different account uses a separate browser profile. An unowned browser with existing progress offers a recovery export and blocks automatic association. The browser records the account and last confirmed snapshot fingerprint locally. Only a successful authenticated reconciliation establishes ownership on a new browser.

The versioned snapshot includes profile, enrolled and active programmes, progress, media and study history, attempts and results, resume positions, earned XP and achievements, and Activity records and settings. Bundled catalogue and derived definitions are rebuilt from the local bundle. Browser credentials, coordination and backup history stay on the device. Recovery backups and Læringslaget use their own contracts.

Each account has one revision. A conditional write advances it atomically. A cheap head request retrieves only the revision and SHA-256. Payloads transfer only for changed state. The client checks the last confirmed fingerprint and the current local fingerprint, and rechecks local state in the write transaction before applying a download. A lost write reply is reconciled on the next head request. When both copies changed, the learner can save recovery copies and choose which state to continue with.

## Limits and operation

- The wire ceiling is 4 MiB of UTF-8 per snapshot. Only the latest revision is stored. If an older catalogue's media geometry or referenced item cannot be rebuilt from the current bundle, sync pauses and the local export remains available. This rollout includes no migration of anonymous learning histories.
- A visible idle writer checks the head every 20–30 seconds (about 2–3 requests per minute). A hidden writer checks every 60–70 seconds. A head response carries one revision and one 64-character hash, typically under 200 bytes of JSON. Active changes debounce for 1.5 seconds. A cycle starts at most once every 4 seconds in a mounted client, so sustained edits can send up to 15 head requests and 15 snapshots per minute from one writer. Inbound updates cost a head and one snapshot, and an unchanged head transfers no snapshot.
- A reconnect checks the head and sends at most one snapshot for accumulated local edits or fetches one remote snapshot when it is ahead. A conflicting head transfers the conflicting remote copy for recovery. Brief failures back off with jitter from roughly 5 seconds up to 2 minutes, and rate limiting waits at least a minute. Tab coordination permits one local writer. A remote replacement waits for other open local tabs to close.
- Keeping the local or account version replaces the other version only after the learner can export both and confirms their choice. The exact compared local state and the remote revision are checked again. Local-only reset is unavailable on an account-bound browser so a new blank profile cannot overwrite the account copy. An explicit recovery import can update the account and discloses this before replacement.

## Verify locally

Run the regular type, lint, format and bundle checks. Set
`VITE_PROGRESSPAL_ACCOUNT_SYNC=true` and run
`npm run test:e2e -- e2e/account-sync.spec.ts --project account-sync`
to build and test the account-first preview against the simulator. Run
`npm run check:bundle` on that build, then remove the environment variable.
Default hosted validation continues to exercise the rollout-disabled build.

The disposable PostgreSQL probe takes a local PGlite 0.5.16
`dist/index.js` path. Run
`node infra/nhost/sync/probe-sql.mjs <path-to-dist/index.js>`.
The probe creates a database in memory. The
[provider runbook](../infra/nhost/sync/README.md) covers Hasura and Auth
configuration and the separate live verification.
