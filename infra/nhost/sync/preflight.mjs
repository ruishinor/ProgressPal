// Read-only provider check. No learner rows or credentials are printed.
const base = 'https://enuikiiweoscywaixedr.hasura.eu-north-1.nhost.run';
const secret = process.env.NHOST_ADMIN_SECRET;
if (!secret) {
  console.error('NHOST_ADMIN_SECRET is required for the read-only preflight.');
  process.exit(2);
}

async function read(path, body) {
  const response = await fetch(base + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hasura-admin-secret': secret,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
    redirect: 'error',
  });
  if (!response.ok)
    throw new Error(`Preflight request failed (HTTP ${response.status}).`);
  return response.json();
}

try {
  const [exported, consistency, sql] = await Promise.all([
    read('/v1/metadata', { type: 'export_metadata', args: {} }),
    read('/v1/metadata', { type: 'get_inconsistent_metadata', args: {} }),
    read('/v2/query', {
      type: 'run_sql',
      args: {
        source: 'default',
        read_only: true,
        cascade: false,
        sql: `SELECT current_user AS source_role, current_setting('transaction_isolation') AS isolation,
          to_regclass('auth.users') AS auth_users,
          to_regprocedure('pg_catalog.sha256(bytea)') AS sha256,
          has_database_privilege(current_database(), 'CREATE') AS can_create_schema,
          CASE WHEN to_regclass('auth.users') IS NOT NULL
            THEN has_column_privilege('auth.users', 'id', 'REFERENCES') AND
                 has_column_privilege('auth.users', 'id', 'SELECT')
            ELSE false END AS can_reference_and_read_user,
          to_regnamespace('progresspal_sync') AS sync_schema,
          to_regclass('progresspal_sync.snapshots') AS private_table,
          to_regclass('progresspal_sync.response') AS response_type,
          to_regprocedure('progresspal_sync.sync_learning_v1(json,text,jsonb)') AS sync_rpc;`,
      },
    }),
  ]);
  const source = (exported.metadata ?? exported).sources?.find(
    ({ name }) => name === 'default',
  );
  if (!source || sql.result_type !== 'TuplesOk' || sql.result?.length !== 2) {
    throw new Error('The expected Hasura source or SQL report is unavailable.');
  }
  const database = Object.fromEntries(
    sql.result[0].map((key, index) => [key, sql.result[1][index]]),
  );
  const syncTables = (source.tables ?? []).filter(
    ({ table }) => table.schema === 'progresspal_sync',
  );
  const syncFunctions = (source.functions ?? []).filter(
    ({ function: fn }) => fn.schema === 'progresspal_sync',
  );
  console.log(
    JSON.stringify(
      {
        project: 'progresspal-g0',
        consistent: consistency.is_consistent === true,
        database,
        backupTracked:
          source.tables?.some(({ table }) => table.name === 'backup_slots') ??
          false,
        socialTracked:
          source.functions?.some(
            ({ function: fn }) => fn.name === 'social_week',
          ) ?? false,
        syncTables,
        syncFunctions,
      },
      null,
      2,
    ),
  );
  if (
    consistency.is_consistent !== true ||
    syncTables.some(({ table }) => table.name === 'snapshots')
  ) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Preflight failed.');
  process.exitCode = 1;
}
