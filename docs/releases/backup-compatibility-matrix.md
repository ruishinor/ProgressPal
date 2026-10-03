# Backup compatibility matrix

Status: v1.3.0 remediation evidence, with a current-state note.

> **Current-state note (2026-10-03, Epic E candidate).** The IndexedDB schema is
> **v4** (accepted E-SCHEMA-1). The supported backup baseline is the **native
> schema-4 export**: it exports, previews, restores and resets with the learner
> evidence and lesson positions it holds. Exported backups from **schema 3 or
> earlier, including both schema-2 fixtures below, are refused clearly before
> any write** with the existing "different data version" message, and the
> database is left unchanged (schema record section 7; an owner-authorized
> preservation change, not a silent weakening). There is no 2 → 3 → 4 or
> 3 → 4 exported-backup conversion. A device that keeps using the app is not
> affected: its live database upgrades in place from v2 or v3 to v4.
> `tests/db/backupCompatibility.test.ts` asserts the refusal for both fixtures
> and keeps the retained historical 2 → 3 conversion code covered with an
> explicit `expectedSchemaVersion: 3`; `tests/preservation/c1BaselineFixture.test.ts`
> carries the no-semantic-loss oracle through the in-place v2 → v4 upgrade.
> The application version and the schema number stay independent. See
> [`docs/CURRENT_STATE.md`](../CURRENT_STATE.md). The matrix text below is retained
> as the v1.3.0 evidence it was.

The restore contract remains backup envelope format 1 plus IndexedDB schema 2.
The executable application version is allowed to change. Restore upgrades
`app_meta.appVersion` to the running executable while preserving learner data,
then reconciles the bundled course seed without changing the database schema.

| Fixture                                                                                                                                                                           | Provenance                                                                                                                                            | Parse          | Atomic restore | Data retained                  | Expected result                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- | ------------------------------ | -------------------------------------- |
| `v1.2.0-envelope1-schema2.json`                                                                                                                                                   | Deterministic envelope using the format, entity fields, and embedded `0.1.0` application identity present at immutable tag `v1.2.0-local-first-proof` | Required       | Required       | Profile, progress, session, XP | Compatible; app metadata becomes 1.3.0 |
| `v1.3.0-envelope1-schema2.json`                                                                                                                                                   | Deterministic current candidate envelope using format 1, schema 2, and application identity 1.3.0                                                     | Required       | Required       | Profile, progress, session, XP | Compatible without schema migration    |
| Malformed JSON, wrong format, wrong envelope version, wrong schema, unknown fields, invalid entities, duplicates, broken references, invalid time ranges, or XP source collisions | Adversarial mutations in `tests/lib/backup.test.ts`                                                                                                   | Must reject    | Must not begin | Existing database unchanged    | Incompatible by design                 |
| Injected initialization, seed, or import-audit failure                                                                                                                            | Failure injection in `tests/db/repositories.test.ts`                                                                                                  | Parse may pass | Must roll back | Exact pre-restore snapshot     | Compatible failure handling            |

These fixtures contain no real learner data. The historical fixture is a
contract reconstruction because the immutable tag contains tests and export
code but no committed user export. Calling it an original user-generated file
would be false. It is valid under the tagged envelope/entity contract and the
current stricter relationship contract.

Compatibility does not mean arbitrary old JSON is accepted. A backup that was
shape-valid under older tests but contains orphaned or contradictory records is
rejected rather than imported into a corrupt current database.
