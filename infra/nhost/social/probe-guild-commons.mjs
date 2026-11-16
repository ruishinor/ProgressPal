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
  // S2 replaces the installed S1 body, so every S1 assertion below also runs
  // against the S2 function.
  await apply('guild-focus-v1.sql');
  const week = (
    await db.query(
      'SELECT progresspal_social.oslo_week_start(clock_timestamp())::text AS week',
    )
  ).rows[0].week;

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
  const fresh = await commons(owner, 'read', { membership: am });
  assert.equal(fresh.group.notes.length, 0);
  // S1 clients parse `group` strictly: its keys stay exactly the S1 keys.
  assert.deepEqual(Object.keys(fresh.group).sort(), [
    'about',
    'ethos',
    'isAdmin',
    'members',
    'notes',
  ]);
  assert.deepEqual(fresh.focus, { text: '', weekStart: week });

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

  // S2: only the administrator sets or clears the week's focus; members read it.
  const focus = (actor, membership, text) =>
    commons(actor, 'focus', { membership, text });
  assert.equal((await focus(peer, bm, 'Løkker')).status, 'not-admin');
  assert.equal((await focus(peer, am, 'Løkker')).status, 'membership-changed');
  assert.deepEqual((await focus(owner, am, '  Løkker  ')).focus, {
    text: 'Løkker',
    weekStart: week,
  });
  assert.equal(
    (await commons(peer, 'read', { membership: bm })).focus.text,
    'Løkker',
  );
  for (const bad of ['x'.repeat(121), 'a\nb', 7])
    assert.equal((await focus(owner, am, bad)).status, 'invalid-input');
  assert.equal(
    (
      await commons(owner, 'focus', {
        membership: am,
        text: 'x',
        week: '2020-01-06',
      })
    ).status,
    'invalid-input',
  );
  assert.equal(
    (await commons(owner, 'read', { membership: am })).focus.text,
    'Løkker',
  );
  assert.equal(
    (await focus(owner, am, '🚀'.repeat(120))).focus.text,
    '🚀'.repeat(120),
  );
  assert.equal((await focus(owner, am, '   ')).focus.text, '');
  assert.deepEqual(
    (
      await db.query(
        'SELECT focus_text, focus_week FROM progresspal_social.groups WHERE focus_week IS NOT NULL',
      )
    ).rows,
    [],
  );
  assert.equal((await focus(owner, am, 'Løkker')).status, 'ok');

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
  // The focus survives handover; authority over it moves with the role.
  assert.equal(transferred.focus.text, 'Løkker');
  assert.equal((await focus(owner, am, 'Nei')).status, 'not-admin');
  assert.equal((await focus(peer, bm, 'Funksjoner')).focus.text, 'Funksjoner');
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
  // Rollover: a focus stored for an earlier week is never shown as current
  // and is erased by the Guild's next Commons call.
  assert.equal(
    (await commons(other, 'focus', { membership: om, text: 'Git' })).focus.text,
    'Git',
  );
  await db.query(
    'UPDATE progresspal_social.groups SET focus_week = focus_week - 7 WHERE focus_week IS NOT NULL',
  );
  assert.deepEqual((await commons(other, 'read', { membership: om })).focus, {
    text: '',
    weekStart: week,
  });
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM progresspal_social.groups WHERE focus_text <> '' OR focus_week IS NOT NULL",
      )
    ).rows[0].n,
    0,
  );

  // Oslo Monday 00:00 is the boundary, in summer time, winter time and the
  // weeks that contain both DST changes.
  for (const [instant, monday] of [
    ['2026-03-29T21:59:59Z', '2026-03-23'], // Sun 23:59:59 CEST
    ['2026-03-29T22:00:00Z', '2026-03-30'], // Mon 00:00 CEST
    ['2026-10-25T22:59:59Z', '2026-10-19'], // Sun 23:59:59 CET
    ['2026-10-25T23:00:00Z', '2026-10-26'], // Mon 00:00 CET
    ['2026-11-15T22:59:59Z', '2026-11-09'],
    ['2026-11-15T23:00:00Z', '2026-11-16'],
    ['2026-12-31T23:30:00Z', '2026-12-28'], // Fri 1 Jan 2027 00:30 CET
  ])
    assert.equal(
      (
        await db.query(
          'SELECT progresspal_social.oslo_week_start($1::timestamptz)::text AS w',
          [instant],
        )
      ).rows[0].w,
      monday,
      instant,
    );

  // The upgrade refuses any body other than the installed S1 one.
  await assert.rejects(
    apply('guild-focus-v1.sql'),
    /Unexpected guild_commons_v1 body/,
  );

  console.log(
    'Guild Commons SQL PASS: isolated Guilds, private notes, caps, code-point limits, expiry, roles, handover, leave and Auth deletion; S2 weekly focus: admin-only set and clear, member read, handover, rollover, Oslo DST weeks and the upgrade guard.',
  );
} finally {
  await db.close();
}
