// A SIMULATED Nhost Auth + GraphQL stack, loaded with `node --import` so the
// real live-validation harness can be exercised offline. It models only what
// the harness exercises: the Stage-1 table with its named constraints, the
// single-transaction compare-and-swap request, role-based visibility and
// Hasura-shaped error bodies. Switchable faults (FAKE_NHOST_MODE) let the test
// prove the harness FAILS on a broken stack and ABORTS on transport faults.
//
// This is a test double. It proves the harness logic; it proves nothing about
// the real provider, which is exactly why the owner-run live step exists.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

globalThis.__PROGRESSPAL_SIMULATED_NHOST__ = true;

// Modes besides the original ones:
//  - outage-after-abort   the 502 that aborts the run also starts a provider
//                         outage: every later GraphQL request fails to connect;
//  - signin-fails         Auth refuses both sign-ins;
//  - preseeded            each user already owns rows from an earlier run;
//  - outage-before-cleanup  every check passes, then the provider goes away.
const mode = process.env.FAKE_NHOST_MODE ?? 'healthy';
const users = new Map(); // token -> { id }
const rowsByUser = new Map(); // id -> Map(slot -> row)
let tick = 0;
let outage = false;
let graphqlRequests = 0;

// Lets the test see what the run left behind: rows per signed-in token.
process.on('exit', () => {
  const file = process.env.FAKE_NHOST_STATE_FILE;

  if (!file) return;

  const rows = {};
  for (const [token, user] of users) {
    rows[token] = rowsByUser.get(user.id)?.size ?? 0;
  }
  writeFileSync(file, JSON.stringify({ rows, graphqlRequests, outage }));
});

const sha = (text) =>
  createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
const gqlError = (message, code = 'permission-error') =>
  jsonResponse(200, { errors: [{ message, extensions: { path: '$', code } }] });
const check = (name) =>
  gqlError(
    `Check constraint violation. new row for relation "backup_slots" violates check constraint "${name}"`,
  );
const gateway = () =>
  new Response('<html><body>502 Bad Gateway</body></html>', {
    status: 502,
    headers: { 'content-type': 'text/html' },
  });

const insertFields = [
  'slot',
  'backup_id',
  'format_version',
  'schema_version',
  'app_version',
  'exported_at',
  'payload',
  'expected_sha256',
];
const selectFields = [
  'slot',
  'backup_id',
  'format_version',
  'schema_version',
  'app_version',
  'exported_at',
  'payload',
  'payload_bytes',
  'payload_sha256',
  'stored_at',
];

const schema = {
  data: {
    __schema: {
      queryType: {
        fields: [{ name: 'backup_slots' }, { name: 'backup_slots_by_pk' }],
      },
      mutationType: {
        fields: [
          { name: 'insert_backup_slots_one' },
          { name: 'delete_backup_slots' },
          { name: 'delete_backup_slots_by_pk' },
        ],
      },
      types: [
        {
          name: 'backup_slots_insert_input',
          fields: null,
          inputFields: insertFields.map((name) => ({ name })),
        },
        {
          name: 'backup_slots',
          fields: selectFields.map((name) => ({ name })),
          inputFields: null,
        },
      ],
    },
  },
};

function table(userId) {
  if (!rowsByUser.has(userId)) rowsByUser.set(userId, new Map());
  return rowsByUser.get(userId);
}

function inventory(userId) {
  return [...table(userId).values()]
    .sort((a, b) => a.slot - b.slot)
    .map((row) => ({
      slot: row.slot,
      backup_id: row.backup_id,
      format_version: row.format_version,
      schema_version: row.schema_version,
      payload_bytes: row.payload_bytes,
      payload_sha256: row.payload_sha256,
      stored_at: row.stored_at,
    }));
}

/** Applies one insert against `rows`; returns an error Response or the stored row. */
function insertRow(rows, input) {
  const payload = String(input.payload ?? '');
  const bytes = Buffer.byteLength(payload, 'utf8');
  const expected = input.expected_sha256;
  const actual = `\\x${sha(payload)}`;

  // Postgres evaluates CHECK constraints in name order: exact_bytes, generation, ceiling, slot_range.
  if (
    typeof expected !== 'string' ||
    expected.length !== 66 ||
    expected !== actual
  )
    return check('backup_slots_exact_bytes_gate');
  if (
    mode !== 'no-generation-gate' &&
    !(input.format_version === 1 && input.schema_version === 4)
  )
    return check('backup_slots_generation_gate');
  if (bytes > 10 * 1024 * 1024) return check('backup_slots_payload_ceiling');
  if (!(input.slot >= 0 && input.slot <= 4))
    return check('backup_slots_slot_range');
  if (rows.has(input.slot))
    return gqlError(
      'Uniqueness violation. duplicate key value violates unique constraint "backup_slots_pkey"',
      'constraint-violation',
    );
  if ([...rows.values()].some((r) => r.backup_id === input.backup_id))
    return gqlError(
      'Uniqueness violation. duplicate key value violates unique constraint "backup_slots_backup_id_key"',
      'constraint-violation',
    );

  tick += 1;
  const row = {
    slot: input.slot,
    backup_id: input.backup_id,
    format_version: input.format_version,
    schema_version: input.schema_version,
    app_version: input.app_version,
    exported_at: input.exported_at,
    payload,
    payload_bytes: bytes,
    payload_sha256: actual,
    stored_at: new Date(Date.UTC(2026, 9, 8, 12, 0, 0, 0) + tick).toISOString(),
  };
  rows.set(row.slot, row);
  return row;
}

function graphql(request, user) {
  const { query, variables } = request;

  if (query.includes('__schema')) return jsonResponse(200, schema);
  if (user === null)
    return gqlError(
      "field 'backup_slots' not found in type: 'query_root'",
      'validation-failed',
    );

  if (
    query.includes('expected_sha256 }') &&
    query.startsWith('{ backup_slots {')
  )
    return gqlError(
      "field 'expected_sha256' not found in type: 'backup_slots'",
      'validation-failed',
    );
  if (query.startsWith('{ backup_slots(order_by'))
    return jsonResponse(200, { data: { backup_slots: inventory(user.id) } });
  if (query.startsWith('{ backup_slots(where: {slot: {_eq: 4}})')) {
    const row = table(user.id).get(4);
    return jsonResponse(200, {
      data: {
        backup_slots: row
          ? [{ payload: row.payload, payload_sha256: row.payload_sha256 }]
          : [],
      },
    });
  }

  if (query.includes('delete_backup_slots(where: {})')) {
    const rows = table(user.id);
    const count = rows.size;
    rows.clear();
    return jsonResponse(200, {
      data: { delete_backup_slots: { affected_rows: count } },
    });
  }
  const bareDelete = query.match(
    /^mutation \{ delete_backup_slots\(where: \{slot: \{_eq: (\d+)\}\}\)/,
  );
  if (bareDelete) {
    const hit = table(user.id).delete(Number(bareDelete[1]));
    return jsonResponse(200, {
      data: { delete_backup_slots: { affected_rows: hit ? 1 : 0 } },
    });
  }

  if (query.includes('first: insert_backup_slots_one')) {
    const rows = table(user.id);
    const first = insertRow(rows, variables.x);
    if (first instanceof Response) return first;
    const second = insertRow(rows, variables.y);
    if (second instanceof Response) return second;
    // The last check of a healthy run: the provider then goes away, so the
    // cleanup that follows cannot run (a PASS must stay a PASS).
    if (mode === 'outage-before-cleanup') outage = true;
    return jsonResponse(200, {
      data: {
        first: { stored_at: first.stored_at },
        second: { stored_at: second.stored_at },
      },
    });
  }

  if (
    query.startsWith(
      'mutation($new: backup_slots_insert_input!) { insert_backup_slots_one',
    )
  ) {
    if ('user_id' in variables.new)
      return gqlError(
        "field 'user_id' not found in type: 'backup_slots_insert_input'",
        'validation-failed',
      );
    return jsonResponse(200, {
      data: { insert_backup_slots_one: { backup_id: variables.new.backup_id } },
    });
  }

  if (query.startsWith('mutation Cas(')) {
    const input = variables.new;

    if (mode === 'p1-fails' && input.slot === 1 && !table(user.id).has(1))
      return gateway();
    if (
      (mode === 'gateway-502-on-generation' || mode === 'outage-after-abort') &&
      input.schema_version === 5
    ) {
      outage = mode === 'outage-after-abort';
      return gateway();
    }
    if (
      mode === 'ceiling-gateway' &&
      Buffer.byteLength(String(input.payload), 'utf8') > 10 * 1024 * 1024
    )
      return gateway();

    const rows = table(user.id);
    const snapshot = new Map(rows);
    const del = query.match(
      /delete_backup_slots\(where: \{slot: \{_eq: (\d+)\}, backup_id: \{_eq: "([^"]+)"\}\}\)/,
    );
    let deleted = 0;

    if (del) {
      const existing = rows.get(Number(del[1]));
      if (existing && existing.backup_id === del[2]) {
        rows.delete(Number(del[1]));
        deleted = 1;
      }
    }

    const stored = insertRow(rows, input);

    if (stored instanceof Response) {
      // One transaction: a refused insert rolls the delete back (unless the broken mode says otherwise).
      if (mode !== 'delete-persists') {
        rows.clear();
        for (const [slot, row] of snapshot) rows.set(slot, row);
      }
      return stored;
    }

    return jsonResponse(200, {
      data: {
        ...(del ? { del: { affected_rows: deleted } } : {}),
        ins: {
          backup_id: stored.backup_id,
          payload_sha256: stored.payload_sha256,
          stored_at: stored.stored_at,
        },
      },
    });
  }

  return gqlError(
    `simulation does not understand: ${query.slice(0, 60)}`,
    'validation-failed',
  );
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  const body = init.body ? JSON.parse(init.body) : {};

  if (url.pathname.endsWith('/signin/email-password')) {
    if (mode === 'signin-fails')
      return jsonResponse(401, { error: 'invalid-email-password' });

    const id = `00000000-0000-4000-8000-${String(users.size + 1).padStart(12, '0')}`;
    const token = `sim-token-${body.email}`;
    const known = [...users.entries()].find(([key]) => key === token);
    const user = known ? known[1] : { id };
    users.set(token, user);

    if (mode === 'preseeded' && !known) {
      for (const slot of [0, 2, 4]) {
        const payload = `earlier run ${slot}`;
        insertRow(table(user.id), {
          slot,
          backup_id: `00000000-0000-4000-9000-00000000000${slot}`,
          format_version: 1,
          schema_version: 4,
          app_version: 'earlier',
          exported_at: '2026-10-01T00:00:00.000Z',
          payload,
          expected_sha256: `\\x${sha(payload)}`,
        });
      }
    }

    return jsonResponse(200, {
      session: {
        accessToken: token,
        refreshToken: `sim-refresh-${body.email}`,
        user: { id: user.id },
      },
    });
  }

  if (url.pathname.endsWith('/v1')) {
    graphqlRequests += 1;

    if (outage) throw new TypeError('fetch failed');

    const header = new Headers(init.headers).get('authorization');
    const user = header
      ? (users.get(header.replace('Bearer ', '')) ?? null)
      : null;
    return graphql(body, user);
  }

  return new Response('not found', { status: 404 });
};
