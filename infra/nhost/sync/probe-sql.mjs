import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Local PostgreSQL/WASM only. No environment credentials or network endpoint.
const [runtime] = process.argv.slice(2);
if (!runtime) throw new Error('Pass the local PGlite dist/index.js path.');
const { PGlite } = await import(pathToFileURL(resolve(runtime)).href);
const db = new PGlite();
const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const hash = (text) => createHash('sha256').update(text).digest('hex');
const data = {
  appMeta: {},
  learnerProfile: { displayName: 'Øving 🧪 \u0000 \ud800 \\u0000' },
  activityEntries: [],
  activityDefinitions: [],
  activitySettings: [],
  activityDays: [],
  progressEntries: [],
  mediaProgressEvents: [],
  resumePoints: [],
  studySessions: [],
  xpTransactions: [],
  achievementUnlocks: [],
  programmeEnrolments: [],
  learnerEvidence: [],
  lessonPositions: [],
};
const text = JSON.stringify({ version: 1, schema: 5, data });
const expected = hash(text);
const makeInput = (
  payload,
  expectedRevision = 0,
  checksum = hash(payload),
) => ({
  expectedRevision,
  payload,
  hash: checksum,
});

async function rpc(actor, operation, input, role = 'user') {
  const { rows } = await db.query(
    'SELECT result FROM progresspal_sync.sync_learning_v1($1::json, $2::text, $3::jsonb)',
    [
      JSON.stringify({ 'x-hasura-role': role, 'x-hasura-user-id': actor }),
      operation,
      JSON.stringify(input),
    ],
  );
  assert.equal(rows.length, 1);
  return rows[0].result;
}

try {
  await db.exec(`CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES ('${A}'), ('${B}');
    CREATE ROLE untrusted;`);
  await db.exec(await readFile(new URL('up.sql', import.meta.url), 'utf8'));

  assert.deepEqual(await rpc(A, 'head', {}), {
    status: 'ok',
    revision: 0,
    hash: null,
  });
  assert.equal(
    (await rpc(A, 'head', {}, 'anonymous')).status,
    'unauthenticated',
  );
  assert.equal((await rpc(A, 'head', {}, 'admin')).status, 'unauthenticated');
  assert.equal((await rpc('invalid-id', 'head', {})).status, 'unauthenticated');
  assert.equal(
    (await rpc(A, 'write', { ...makeInput(text), userId: B })).status,
    'invalid-input',
  );
  assert.equal(
    (await rpc(A, 'write', makeInput(text, 0, '0'.repeat(64)))).status,
    'integrity-mismatch',
  );
  assert.equal((await rpc(A, 'write', makeInput('{'))).status, 'invalid-input');
  assert.equal(
    (await rpc(A, 'write', makeInput(text.replace('"schema":5', '"schema":4'))))
      .status,
    'incompatible',
  );
  assert.equal(
    (
      await rpc(
        A,
        'write',
        makeInput(text.replace('"studySessions":[]', '"studySessions":{}')),
      )
    ).status,
    'incompatible',
  );
  assert.equal(
    (await rpc(A, 'write', makeInput('a'.repeat(4194305)))).status,
    'too-large',
  );
  assert.deepEqual(await rpc(A, 'head', {}), {
    status: 'ok',
    revision: 0,
    hash: null,
  });

  assert.deepEqual(await rpc(A, 'write', makeInput(text)), {
    status: 'ok',
    revision: 1,
    hash: expected,
  });
  assert.deepEqual(await rpc(A, 'head', {}), {
    status: 'ok',
    revision: 1,
    hash: expected,
  });
  assert.deepEqual(await rpc(A, 'read', { expectedRevision: 1 }), {
    status: 'ok',
    revision: 1,
    hash: expected,
    payload: text,
  });
  assert.deepEqual(await rpc(B, 'head', {}), {
    status: 'ok',
    revision: 0,
    hash: null,
  });
  assert.equal(
    (await rpc(B, 'read', { expectedRevision: 1 })).status,
    'conflict',
  );
  const pair = await Promise.all([
    rpc(A, 'write', makeInput(text, 1)),
    rpc(A, 'write', makeInput(text, 1)),
  ]);
  assert.deepEqual(pair.map(({ status }) => status).sort(), ['conflict', 'ok']);
  assert.equal((await rpc(A, 'head', {})).revision, 2);
  assert.equal(
    (await rpc(A, 'read', { expectedRevision: 1 })).status,
    'conflict',
  );
  assert.equal((await rpc(A, 'write', makeInput(text, 1))).status, 'conflict');
  assert.equal((await rpc(A, 'head', {})).revision, 2);

  await db.exec('SET ROLE untrusted');
  await assert.rejects(
    db.query('SELECT * FROM progresspal_sync.snapshots'),
    /permission denied/,
  );
  await assert.rejects(rpc(A, 'head', {}), /permission denied/);
  await db.exec('RESET ROLE');
  await db.query('DELETE FROM auth.users WHERE id = $1', [A]);
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::integer AS total FROM progresspal_sync.snapshots',
      )
    ).rows[0].total,
    0,
  );
  assert.equal((await rpc(A, 'head', {})).status, 'unauthenticated');
  console.log(
    'PASS: local PostgreSQL migration, isolation, privileges, validation, UTF-8, stale CAS and Auth deletion.',
  );
} finally {
  await db.close();
}
