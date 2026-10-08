// Owner-run helper: applies or rolls back the Epic G Stage-1 backup-slot schema
// on the ONE Nhost project (Starter, Stockholm). NOT run by CI and NOT run by
// any automated agent. Reads the admin secret from your terminal environment
// (NHOST_ADMIN_SECRET); the secret is never printed, logged or written.
//
//   node infra/nhost/apply.mjs schema        # run the migration SQL
//   node infra/nhost/apply.mjs permissions   # track the table + role permissions
//   node infra/nhost/apply.mjs rollback      # remove permissions, then the table
//   add --dry-run to print what would be sent (no network, no secret needed)
//
// Requires the SQL/metadata APIs to be enabled on the project (development
// state). Talks only to https://<project>.hasura.<region>.nhost.run.
import { readFileSync } from 'node:fs';

const PROJECT = { subdomain: 'enuikiiweoscywaixedr', region: 'eu-north-1' };
const HASURA = `https://${PROJECT.subdomain}.hasura.${PROJECT.region}.nhost.run`;
const here = (relative) => new URL(relative, import.meta.url);
const MIGRATION = 'migrations/default/1791417600000_epic_g_backup_slots/';

const [command, ...flags] = process.argv.slice(2);
const dryRun = flags.includes('--dry-run');
const secret = process.env.NHOST_ADMIN_SECRET ?? '';

function plan(name) {
  const sql = (file) => ({
    path: '/v2/query',
    body: {
      type: 'run_sql',
      args: {
        source: 'default',
        cascade: false,
        sql: readFileSync(here(MIGRATION + file), 'utf8'),
      },
    },
  });
  const bulk = (file) => ({
    path: '/v1/metadata',
    body: JSON.parse(readFileSync(here(`hasura/${file}`), 'utf8')),
  });

  switch (name) {
    case 'schema':
      return [{ label: 'migration up.sql', ...sql('up.sql') }];
    case 'permissions':
      return [{ label: 'track table + permissions', ...bulk('apply.json') }];
    case 'rollback':
      return [
        { label: 'remove permissions and untrack', ...bulk('rollback.json') },
        { label: 'migration down.sql', ...sql('down.sql') },
      ];
    default:
      return null;
  }
}

const steps = plan(command);

if (steps === null) {
  console.error(
    'usage: node infra/nhost/apply.mjs schema|permissions|rollback [--dry-run]',
  );
  process.exit(2);
}

if (!dryRun && secret.length < 8) {
  console.error('NHOST_ADMIN_SECRET is not set in this terminal.');
  process.exit(2);
}

for (const step of steps) {
  if (dryRun) {
    console.log(
      `[dry-run] POST ${HASURA}${step.path}  (${step.label}, ${JSON.stringify(step.body).length} bytes)`,
    );
    continue;
  }

  const response = await fetch(`${HASURA}${step.path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hasura-admin-secret': secret,
    },
    body: JSON.stringify(step.body),
  });
  const text = await response.text();
  console.log(`${step.label}: HTTP ${response.status}`);

  if (!response.ok) {
    // Hasura error bodies describe the failing statement; they never echo the secret.
    console.error(text.replaceAll(secret, '[REDACTED]').slice(0, 800));
    process.exit(1);
  }
}

console.log(dryRun ? 'dry run complete' : `${command}: done`);
