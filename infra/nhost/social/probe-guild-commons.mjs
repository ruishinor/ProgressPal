import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Disposable PostgreSQL/PGlite contract probe; no production credentials.
const [runtime] = process.argv.slice(2);
if (!runtime) throw new Error('Pass the installed PGlite dist/index.js path.');
const { PGlite } = await import(pathToFileURL(resolve(runtime)).href);
const db = new PGlite();
const ids = [1, 2, 3, 4, 5, 6].map(
  (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0'),
);
const [owner, peer, third, fourth, other, unused] = ids;

async function social(actor, operation, input = {}, role = 'user') {
  const response = await db.query(
    'SELECT result FROM progresspal_social.social_week($1::json,$2::text,$3::jsonb)',
    [
      JSON.stringify({ 'x-hasura-role': role, 'x-hasura-user-id': actor }),
      operation,
      JSON.stringify(input),
    ],
  );
  assert.equal(response.rows.length, 1);
  return response.rows[0].result;
}

async function commons(actor, operation, input, role = 'user') {
  const response = await db.query(
    'SELECT result FROM progresspal_social.guild_commons_v1($1::json,$2::text,$3::jsonb)',
    [
      JSON.stringify({ 'x-hasura-role': role, 'x-hasura-user-id': actor }),
      operation,
      JSON.stringify(input),
    ],
  );
  assert.equal(response.rows.length, 1);
  return response.rows[0].result;
}

async function apply(name) {
  await db.exec(await readFile(new URL(name, import.meta.url), 'utf8'));
}

try {
  await db.exec(
    'CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);',
  );
  for (const id of ids)
    await db.query('INSERT INTO auth.users VALUES ($1)', [id]);
  await apply('up.sql');
  await apply('rename-guild.sql');
  await apply('member-invites.sql');
  await apply('guild-commons-v1.sql');

  const a = await social(owner, 'create', { name: 'Team A', nickname: 'Ada' });
  const am = a.group.membership;
  const code = (await social(owner, 'invite', { membership: am })).invite;
  const b = await social(peer, 'join', { code, nickname: 'Bo' });
  const bm = b.group.membership;
  const c = await social(third, 'join', { code, nickname: 'Cai' });
  const cm = c.group.membership;
  const d = await social(fourth, 'join', { code, nickname: 'Dee' });
  const dm = d.group.membership;
  const otherGroup = await social(other, 'create', {
    name: 'Team B',
    nickname: 'Eve',
  });
  const om = otherGroup.group.membership;

  assert.equal(
    (await commons(unused, 'read', { membership: am })).status,
    'no-group',
  );
  assert.equal(
    (await commons(owner, 'read', { membership: am }, 'anonymous')).status,
    'unauthenticated',
  );
  assert.equal(
    (await commons(other, 'read', { membership: am })).status,
    'membership-changed',
  );
  assert.equal(
    (await commons(peer, 'read', { membership: am })).status,
    'membership-changed',
  );
  assert.equal(
    (await commons(owner, 'read', { membership: am, group_id: om })).status,
    'invalid-input',
  );
  assert.equal(
    (await commons(owner, 'read', { membership: am })).group.notes.length,
    0,
  );

  assert.equal(
    (
      await commons(peer, 'profile', {
        membership: bm,
        ethos: 'No',
        about: '',
      })
    ).status,
    'not-admin',
  );
  assert.equal(
    (
      await commons(owner, 'profile', {
        membership: am,
        ethos: 'Lær sammen',
        about: 'En liten gruppe',
      })
    ).group.ethos,
    'Lær sammen',
  );
  assert.equal(
    (
      await commons(owner, 'profile', {
        membership: am,
        ethos: 'x'.repeat(121),
        about: '',
      })
    ).status,
    'invalid-input',
  );

  const first = await commons(owner, 'post', {
    membership: am,
    kind: 'help',
    body: 'Et spørsmål om Git',
  });
  assert.equal(first.status, 'ok');
  assert.equal(first.group.notes[0].author, 'Ada');
  const noteId = first.group.notes[0].id;
  assert.equal(
    (
      await commons(owner, 'post', {
        membership: am,
        kind: 'help',
        body: 'Noe annet',
      })
    ).status,
    'rate-limited',
  );
  assert.equal(
    (
      await commons(peer, 'edit', {
        membership: bm,
        note: noteId,
        body: 'Nope',
      })
    ).status,
    'not-owner',
  );
  assert.equal(
    (
      await commons(peer, 'remove', {
        membership: bm,
        note: noteId,
      })
    ).status,
    'not-admin',
  );
  assert.equal(
    (
      await commons(owner, 'edit', {
        membership: am,
        note: noteId,
        body: 'Et nytt spørsmål om Git',
      })
    ).group.notes[0].body,
    'Et nytt spørsmål om Git',
  );
  assert.equal(
    (
      await commons(owner, 'edit', {
        membership: am,
        note: noteId,
        body: '<script> og mer',
      })
    ).group.notes[0].body,
    '<script> og mer',
  );
  assert.equal(
    (
      await commons(owner, 'edit', {
        membership: am,
        note: noteId,
        body: 'x'.repeat(281),
      })
    ).status,
    'invalid-input',
  );

  assert.equal(
    (
      await commons(peer, 'post', {
        membership: bm,
        kind: 'offer',
        body: 'Jeg kan hjelpe',
      })
    ).status,
    'ok',
  );
  assert.equal(
    (
      await commons(third, 'post', {
        membership: cm,
        kind: 'notice',
        body: 'Neste samling',
      })
    ).status,
    'ok',
  );
  assert.equal(
    (
      await commons(fourth, 'post', {
        membership: dm,
        kind: 'win',
        body: 'En liten seier',
      })
    ).status,
    'full',
  );
  const snapshot = await commons(owner, 'read', { membership: am });
  assert.equal(snapshot.group.notes.length, 3);
  assert.equal(
    (await commons(other, 'read', { membership: om })).group.notes.length,
    0,
  );
  assert.equal(
    (
      await commons(owner, 'resolve', {
        membership: am,
        note: noteId,
      })
    ).status,
    'ok',
  );
  assert.equal(
    (
      await commons(fourth, 'post', {
        membership: dm,
        kind: 'win',
        body: 'En liten seier',
      })
    ).status,
    'ok',
  );

  assert.equal(
    (
      await commons(peer, 'transfer', {
        membership: bm,
        target: cm,
      })
    ).status,
    'not-admin',
  );
  const transferred = await commons(owner, 'transfer', {
    membership: am,
    target: bm,
  });
  assert.equal(transferred.status, 'ok');
  assert.equal(transferred.group.isAdmin, false);
  assert.equal((await social(peer, 'read')).group.canInvite, true);
  assert.equal((await social(peer, 'read')).group.hasInvite, false);
  assert.equal(
    (
      await social(owner, 'rename', {
        membership: am,
        name: 'Denied',
      })
    ).status,
    'not-admin',
  );
  assert.equal(
    (
      await social(peer, 'rename', {
        membership: bm,
        name: 'Renamed',
      })
    ).status,
    'ok',
  );
  assert.equal(
    (
      await commons(peer, 'remove', {
        membership: bm,
        note: (
          await commons(third, 'read', { membership: cm })
        ).group.notes.find((n) => n.author === 'Cai').id,
      })
    ).status,
    'ok',
  );

  const previous = await commons(fourth, 'read', { membership: dm });
  assert.equal(
    previous.group.notes.some((note) => note.author === 'Dee'),
    true,
  );
  await social(fourth, 'leave', { membership: dm });
  assert.equal(
    (await commons(peer, 'read', { membership: bm })).group.notes.some(
      (note) => note.author === 'Dee',
    ),
    false,
  );
  await db.query('DELETE FROM auth.users WHERE id=$1', [third]);
  assert.equal(
    (await commons(peer, 'read', { membership: bm })).group.notes.some(
      (note) => note.author === 'Cai',
    ),
    false,
  );
  await social(owner, 'leave', { membership: am });
  await social(peer, 'leave', { membership: bm });
  const count = await db.query(
    'SELECT count(*)::int AS count FROM progresspal_social.groups',
  );
  assert.equal(count.rows[0].count, 1);
  assert.equal((await commons(other, 'read', { membership: om })).status, 'ok');

  // Limits count code points; CR is a control character, so clients send LF.
  const post = (body) =>
    commons(other, 'post', { membership: om, kind: 'notice', body });
  assert.equal((await post('a\r\nb')).status, 'invalid-input');
  assert.equal((await post('🚀'.repeat(281))).status, 'invalid-input');
  const astral = await post('🚀'.repeat(280));
  assert.equal(astral.status, 'ok');
  assert.equal(astral.group.notes[0].body, '🚀'.repeat(280));

  // A logically expired note is hidden and no longer holds the member's slot.
  await db.query(
    "UPDATE progresspal_social.guild_notes SET expires_at = clock_timestamp() - interval '1 second'",
  );
  await db.query(
    'UPDATE progresspal_social.members SET last_guild_note_at = NULL',
  );
  assert.equal(
    (await commons(other, 'read', { membership: om })).group.notes.length,
    0,
  );
  const renewed = await post('Ny beskjed');
  assert.equal(renewed.status, 'ok');
  assert.equal(renewed.group.notes.length, 1);
  console.log(
    'Guild Commons SQL PASS: isolated Guilds, private notes, caps, code-point limits, expiry, roles, handover, leave and Auth deletion.',
  );
} finally {
  await db.close();
}
