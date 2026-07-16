# Backup compatibility matrix

Status: v1.3.0 remediation evidence

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
