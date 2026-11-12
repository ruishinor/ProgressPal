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
const candidates = Array.from(
  { length: 6 },
  (_, i) => `00000000-0000-4000-8000-${String(i + 5).padStart(12, '0')}`,
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
const memberInvitesSql = await readFile(
  new URL('member-invites.sql', import.meta.url),
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
  await assert.rejects(db.exec(memberInvitesSql), /Unexpected social_week/);
  await db.exec('ROLLBACK');
  for (const candidate of candidates) {
    await db.query('INSERT INTO auth.users VALUES ($1)', [candidate]);
  }

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

  const memberMembership = joined.group.membership;
  const beforeInvites = await rpc(member, 'read');
  await db.exec(memberInvitesSql);
  assert.deepEqual(await functionIdentity(), identity);
  assert.deepEqual(await rpc(member, 'read'), {
    ...beforeInvites,
    group: { ...beforeInvites.group, canCreateInvite: true },
  });
  const nameAfterUpgrade = 'Guild etter invitasjonsoppgradering';
  assert.equal(
    (await rpc(owner, 'rename', { membership, name: nameAfterUpgrade })).status,
    'ok',
  );
  assert.equal((await rpc(member, 'read')).group.name, nameAfterUpgrade);
  assert.deepEqual(await rpc(candidates[0], 'read'), {
    status: 'ok',
    weekStart: created.weekStart,
    group: null,
    invite: null,
  });
  for (const [actor, ref, role, status] of [
    [member, membership, 'user', 'membership-changed'],
    [other, memberMembership, 'user', 'membership-changed'],
    [candidates[0], memberMembership, 'user', 'no-group'],
    [member, memberMembership, 'anonymous', 'unauthenticated'],
  ]) {
    assert.equal(
      (await rpc(actor, 'invite', { membership: ref }, role)).status,
      status,
    );
  }
  assert.equal(
    (await rpc(member, 'rename', { membership: memberMembership, name: 'Nei' }))
      .status,
    'not-admin',
  );
  assert.equal(
    (await rpc(member, 'revoke', { membership: memberMembership })).status,
    'not-admin',
  );
  const rotation = await rpc(member, 'invite', {
    membership: memberMembership,
  });
  assert.equal(rotation.status, 'ok');
  assert.equal(rotation.group.canInvite, false);
  assert.equal(rotation.group.canCreateInvite, true);
  assert.match(rotation.invite, /^[0-9a-f]{64}$/);
  assert.notEqual(rotation.invite, invite);
  assert.equal(
    (await rpc(candidates[0], 'join', { code: invite, nickname: 'E' })).status,
    'invalid-code',
  );
  assert.equal((await rpc(owner, 'revoke', { membership })).status, 'ok');
  assert.equal(
    (await rpc(candidates[0], 'join', { code: rotation.invite, nickname: 'E' }))
      .status,
    'invalid-code',
  );
  const fresh = await rpc(member, 'invite', { membership: memberMembership });
  assert.equal(fresh.status, 'ok');
  for (const candidate of candidates.slice(0, 5)) {
    assert.equal(
      (
        await rpc(candidate, 'join', {
          code: fresh.invite,
          nickname: 'Nytt medlem',
        })
      ).status,
      'ok',
    );
  }
  assert.equal((await rpc(owner, 'read')).group.members.length, 8);
  const full = await rpc(member, 'invite', { membership: memberMembership });
  assert.equal(full.status, 'ok');
  assert.equal(
    (
      await rpc(candidates[5], 'join', {
        code: full.invite,
        nickname: 'Reserve',
      })
    ).status,
    'group-full',
  );
  const leaving = await rpc(candidates[0], 'read');
  assert.equal(
    (
      await rpc(candidates[0], 'leave', {
        membership: leaving.group.membership,
      })
    ).group,
    null,
  );

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
    'Guild SQL PASS: guarded upgrades, rename and revoke permissions, member invites, code rotation, capacity, leave and account deletion.',
  );
} finally {
  await db.close();
}
