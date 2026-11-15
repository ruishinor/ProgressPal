import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Real-PostgreSQL contract probe for Guild Commons: concurrent connections
// and, when pg_cron is installed, the D6 cleanup job. DISPOSABLE LOCAL
// DATABASES ONLY: it refuses a non-local host or a database that already has
// an auth or progresspal_social schema, and drops what it created.
// Usage: node probe-guild-commons-postgres.mjs <pg/lib/index.js> <postgres-url>
const [driver, url] = process.argv.slice(2);
if (!driver || !url)
  throw new Error('Pass the pg module path and a local PostgreSQL URL.');
const { hostname } = new URL(url);
if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname))
  throw new Error('Refusing a non-local database host: ' + hostname);
const pg = (await import(pathToFileURL(resolve(driver)).href)).default;

const ids = [1, 2, 3, 4, 5, 6].map(
  (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0'),
);
const [owner, bo, cai, dee, eve, fay] = ids;
const purgeJob = 'progresspal-guild-notes-purge';
const unrelatedJob = 'probe-unrelated-job';
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const admin = new pg.Client({ connectionString: url });
await admin.connect();
const clients = [];
async function connection() {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  clients.push(client);
  return client;
}

async function call(client, fn, actor, operation, input = {}) {
  const { rows } = await client.query(
    `SELECT result FROM progresspal_social.${fn}($1::json,$2::text,$3::jsonb)`,
    [
      JSON.stringify({ 'x-hasura-role': 'user', 'x-hasura-user-id': actor }),
      operation,
      JSON.stringify(input),
    ],
  );
  assert.equal(rows.length, 1);
  return rows[0].result;
}
const social = (client, ...args) => call(client, 'social_week', ...args);
const commons = (client, ...args) => call(client, 'guild_commons_v1', ...args);
const sql = (name) => readFile(new URL(name, import.meta.url), 'utf8');
let created = false;
let cron = false;

try {
  const existing = await admin.query(
    "SELECT nspname FROM pg_namespace WHERE nspname IN ('auth','progresspal_social')",
  );
  if (existing.rows.length > 0)
    throw new Error('Not a fresh disposable database: auth schema exists.');
  created = true;
  await admin.query(
    'CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);',
  );
  for (const id of ids)
    await admin.query('INSERT INTO auth.users VALUES ($1)', [id]);
  for (const name of [
    'up.sql',
    'rename-guild.sql',
    'member-invites.sql',
    'guild-commons-v1.sql',
  ])
    await admin.query(await sql(name));

  const a = await social(admin, owner, 'create', {
    name: 'Lag',
    nickname: 'Ada',
  });
  const code = (
    await social(admin, owner, 'invite', { membership: a.group.membership })
  ).invite;
  const member = { [owner]: a.group.membership };
  for (const [id, nickname] of [
    [bo, 'Bo'],
    [cai, 'Cai'],
    [dee, 'Dee'],
    [eve, 'Eve'],
    [fay, 'Fay'],
  ])
    member[id] = (
      await social(admin, id, 'join', { code, nickname })
    ).group.membership;
  const post = (client, id, body = 'Beskjed') =>
    commons(client, id, 'post', {
      membership: member[id],
      kind: 'notice',
      body,
    });
  const notes = async () =>
    (await commons(admin, owner, 'read', { membership: member[owner] })).group
      .notes;
  const removeBy = async (author) => {
    const note = (await notes()).find((entry) => entry.author === author);
    assert.equal(
      (
        await commons(admin, owner, 'remove', {
          membership: member[owner],
          note: note.id,
        })
      ).status,
      'ok',
    );
  };

  assert.equal((await post(admin, owner)).status, 'ok');
  assert.equal((await post(admin, bo)).status, 'ok');

  // Deterministic interleaving: Cai's post holds the Guild lock inside an
  // open transaction; Dee and Eve must wait, then see a full board.
  const [holder, second, third] = [
    await connection(),
    await connection(),
    await connection(),
  ];
  await holder.query('BEGIN');
  assert.equal((await post(holder, cai)).status, 'ok');
  let settled = false;
  const waiting = Promise.all([post(second, dee), post(third, eve)]).then(
    (results) => {
      settled = true;
      return results;
    },
  );
  await sleep(500);
  assert.equal(settled, false, 'competing posts must wait for the lock');
  const blocked = await admin.query(
    "SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND NOT granted",
  );
  assert.equal(blocked.rows[0].n, 2);
  await holder.query('COMMIT');
  assert.deepEqual(
    (await waiting).map((result) => result.status),
    ['full', 'full'],
  );
  assert.equal((await notes()).length, 3);

  // Undirected burst for the freed final slot: exactly one winner.
  await removeBy('Cai');
  const burst = await Promise.all([
    post(second, dee),
    post(third, eve),
    post(holder, fay),
  ]);
  assert.deepEqual(burst.map((result) => result.status).sort(), [
    'full',
    'full',
    'ok',
  ]);
  assert.equal((await notes()).length, 3);

  // One member, two devices, one free slot: exactly one note is stored.
  const winner = (await notes()).find((entry) =>
    ['Dee', 'Eve', 'Fay'].includes(entry.author),
  ).author;
  await removeBy(winner);
  const loser = ['Dee', 'Eve', 'Fay'].find((name) => name !== winner);
  const loserId = { Dee: dee, Eve: eve, Fay: fay }[loser];
  const devices = await Promise.all([
    post(second, loserId, 'Fra mobilen'),
    post(third, loserId, 'Fra PC-en'),
  ]);
  const statuses = devices.map((result) => result.status).sort();
  assert.equal(statuses.filter((status) => status === 'ok').length, 1);
  assert.ok(['already-posted', 'rate-limited'].includes(statuses[1]));
  assert.equal(
    (await notes()).filter((entry) => entry.author === loser).length,
    1,
  );

  // D6: pg_cron cleanup job, if pg_cron is installed in this database.
  cron =
    (await admin.query("SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'"))
      .rows.length === 1;
  if (cron) {
    await admin.query(
      `SELECT cron.schedule('${unrelatedJob}', '15 3 * * *', 'SELECT 1')`,
    );
    const cleanup = await sql('guild-commons-cleanup.sql');
    await admin.query(cleanup);
    await admin.query(cleanup);
    const jobs = await admin.query(
      'SELECT jobid, jobname, schedule, command, username, active FROM cron.job ORDER BY jobname',
    );
    const purge = jobs.rows.filter((job) => job.jobname === purgeJob);
    assert.equal(purge.length, 1, 'registration is repeat-safe');
    assert.equal(purge[0].schedule, '45 3 * * *');
    assert.equal(purge[0].active, true);
    const { rows: who } = await admin.query('SELECT current_user AS name');
    assert.equal(purge[0].username, who[0].name);
    assert.deepEqual(
      jobs.rows
        .filter((job) => job.jobname === unrelatedJob)
        .map((job) => job.schedule),
      ['15 3 * * *'],
    );

    // Two notes expired a minute ago; one is still active.
    const expired = await admin.query(
      `UPDATE progresspal_social.guild_notes SET expires_at = now() - interval '1 minute'
       WHERE id IN (SELECT id FROM progresspal_social.guild_notes ORDER BY created_at LIMIT 2)`,
    );
    assert.equal(expired.rowCount, 2);
    // Disposable database only: run the real job every second, once.
    await admin.query(`SELECT cron.alter_job($1, schedule := '1 seconds')`, [
      purge[0].jobid,
    ]);
    let run;
    for (let attempt = 0; attempt < 30 && !run; attempt += 1) {
      await sleep(500);
      run = (
        await admin.query(
          "SELECT status, return_message FROM cron.job_run_details WHERE jobid = $1 AND status IN ('succeeded','failed') ORDER BY start_time LIMIT 1",
          [purge[0].jobid],
        )
      ).rows[0];
    }
    assert.ok(run, 'the scheduled job ran');
    assert.equal(run.status, 'succeeded', run.return_message);
    assert.equal(run.return_message, 'DELETE 2');
    const left = await admin.query(
      'SELECT count(*)::int AS n, bool_and(expires_at > now()) AS active FROM progresspal_social.guild_notes',
    );
    assert.deepEqual(left.rows[0], { n: 1, active: true });
    await admin.query(cleanup);
    assert.equal(
      (
        await admin.query('SELECT schedule FROM cron.job WHERE jobname = $1', [
          purgeJob,
        ])
      ).rows[0].schedule,
      '45 3 * * *',
    );
  }
  console.log(
    'Guild Commons PostgreSQL PASS: lock serialization, final-slot race, two-device post' +
      (cron
        ? ', pg_cron cleanup registration, repeat safety, execution and unrelated-job isolation.'
        : '. pg_cron cleanup NOT TESTED: pg_cron is not installed here.'),
  );
} finally {
  for (const client of clients) await client.end().catch(() => undefined);
  if (cron)
    await admin
      .query(
        `SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('${purgeJob}','${unrelatedJob}')`,
      )
      .catch(() => undefined);
  if (created)
    await admin.query(
      'DROP SCHEMA IF EXISTS progresspal_social CASCADE; DROP SCHEMA IF EXISTS auth CASCADE;',
    );
  await admin.end();
}
