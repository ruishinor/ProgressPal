import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Disposable local PostgreSQL via PGlite. No project credentials or endpoint.
const [runtime] = process.argv.slice(2);
if (!runtime) throw new Error('Pass the local PGlite dist/index.js path.');
const { PGlite } = await import(pathToFileURL(resolve(runtime)).href);
const db = new PGlite();
const [owner, member, other, outsider] = [1, 2, 3, 4].map(
  (id) => `00000000-0000-4000-8000-00000000000${id}`,
);

async function rpc(actor, operation, input = {}, role = 'user') {
  const { rows } = await db.query(
    'SELECT result FROM progresspal_social.social_week($1::json, $2::text, $3::jsonb)',
    [
      JSON.stringify({ 'x-hasura-role': role, 'x-hasura-user-id': actor }),
      operation,
      JSON.stringify(input),
    ],
  );
  assert.equal(rows.length, 1);
  return rows[0].result;
}

async function functionIdentity() {
  const { rows } = await db.query(`
    SELECT oid, proowner, proacl, prosecdef, proconfig
      FROM pg_proc
      WHERE oid = 'progresspal_social.social_week(json,text,jsonb)'::regprocedure
  `);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].prosecdef, false);
  return rows[0];
}

const renameSql = await readFile(
  new URL('rename-guild.sql', import.meta.url),
  'utf8',
);

try {
  await db.exec(`CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES ('${owner}'), ('${member}'), ('${other}'), ('${outsider}');
    CREATE ROLE untrusted;`);
  await assert.rejects(db.exec(renameSql), /Install the existing/);
  await db.exec('ROLLBACK');
  await db.exec(await readFile(new URL('up.sql', import.meta.url), 'utf8'));

  const created = await rpc(owner, 'create', {
    name: 'Eksisterende Guild',
    nickname: 'Ada',
  });
  assert.equal(created.status, 'ok');
  const membership = created.group.membership;
  const { invite } = await rpc(owner, 'invite', { membership });
  assert.match(invite, /^[0-9a-f]{64}$/);
  const joined = await rpc(member, 'join', { code: invite, nickname: 'Bo' });
  assert.equal(joined.status, 'ok');
  assert.equal(joined.group.canInvite, false);
  const shared = await rpc(owner, 'share', {
    membership,
    days: [created.weekStart],
  });
  assert.equal(shared.status, 'ok');
  assert.equal(shared.group.members[0].days, 1);
  const otherGroup = await rpc(other, 'create', {
    name: 'En annen Guild',
    nickname: 'C',
  });
  assert.equal(otherGroup.status, 'ok');
  const identity = await functionIdentity();

  await db.exec(renameSql);
  assert.deepEqual(await functionIdentity(), identity);
  assert.deepEqual(await rpc(owner, 'read'), shared);

  const name = 'Øvingsguild 🧪';
  const input = { membership, name };
  for (const [actor, payload, role, status] of [
    [
      member,
      { ...input, membership: joined.group.membership },
      'user',
      'not-admin',
    ],
    [other, input, 'user', 'membership-changed'],
    [
      owner,
      { ...input, membership: joined.group.membership },
      'user',
      'membership-changed',
    ],
    [outsider, input, 'user', 'no-group'],
    [owner, input, 'anonymous', 'unauthenticated'],
    [owner, input, 'admin', 'unauthenticated'],
    [
      owner,
      { ...input, groupId: otherGroup.group.membership },
      'user',
      'invalid-input',
    ],
    [owner, { membership }, 'user', 'invalid-input'],
    ...[null, 42, '', '   ', '\t', 'x'.repeat(41)].map((badName) => [
      owner,
      { membership, name: badName },
      'user',
      'invalid-input',
    ]),
  ]) {
    assert.equal((await rpc(actor, 'rename', payload, role)).status, status);
  }
  assert.deepEqual(await rpc(owner, 'read'), shared);

  const updated = await rpc(owner, 'rename', { membership, name: ` ${name} ` });
  assert.deepEqual(updated, {
    ...shared,
    group: { ...shared.group, name },
  });
  assert.equal((await rpc(member, 'read')).group.name, name);
  assert.deepEqual(await rpc(other, 'read'), otherGroup);
  // The invitation issued before the upgrade and rename is still usable.
  assert.equal(
    (await rpc(outsider, 'join', { code: invite, nickname: 'D' })).group.name,
    name,
  );
  await db.exec('SET ROLE untrusted');
  await assert.rejects(
    db.exec('SELECT * FROM progresspal_social.groups'),
    /permission denied/,
  );
  await assert.rejects(rpc(owner, 'rename', input), /permission denied/);
  await db.exec('RESET ROLE');

  assert.equal((await rpc(owner, 'leave', { membership })).status, 'ok');
  const remaining = await rpc(member, 'read');
  assert.equal(remaining.group.canInvite, true);
  assert.equal(remaining.group.hasInvite, false);
  assert.equal(
    (
      await rpc(member, 'rename', {
        membership: joined.group.membership,
        name: 'Etter eierskifte',
      })
    ).group.name,
    'Etter eierskifte',
  );
  await db.query('DELETE FROM auth.users WHERE id = $1', [member]);
  assert.equal((await rpc(member, 'read')).status, 'unauthenticated');
  assert.equal((await rpc(outsider, 'read')).group.canInvite, true);
  console.log(
    'Guild rename SQL PASS: upgrade identity, existing data, membership and role checks, invite, ownership transfer and account deletion.',
  );
} finally {
  await db.close();
}
