// A SIMULATED Nhost Auth + GraphQL stack, as a side-effect-free factory. It is
// used two ways:
//  - tests/infra/simulatedNhost.mjs installs one as the global fetch with
//    `node --import`, so the real live-validation harness runs offline;
//  - the G5/G6 tests create one per test, stub fetch with it, and drive the
//    real application code (the backup service, the Nhost adapter and the real
//    @nhost/nhost-js client) against it.
//
// It models what those two need: the Stage-1 table with its named constraints,
// the single-transaction compare-and-swap request, role-based visibility
// (a user sees only their own rows; hidden columns are not selectable),
// Hasura-shaped error bodies, JWT-shaped sessions, and read queries whose
// result follows the selection set and the `slot` / `backup_id` filters.
// Switchable faults let a test prove the harness FAILS on a broken stack and
// ABORTS on transport faults, and let the G5 tests force a write that commits
// and then loses its answer.
//
// This is a test double. It proves application logic; it proves nothing about
// the real provider, which is exactly why the owner-run live steps exist. It
// understands only the request documents the repository sends, so a document
// that drifts from them is answered with an error rather than guessed at.
import { createHash } from 'node:crypto';

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
const base64Url = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

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

// Modes besides the original ones:
//  - outage-after-abort   the 502 that aborts the run also starts a provider
//                         outage: every later GraphQL request fails to connect;
//  - signin-fails         Auth refuses both sign-ins;
//  - preseeded            each user already owns rows from an earlier run;
//  - outage-before-cleanup  every check passes, then the provider goes away.
export function createSimulatedNhost({
  mode = 'healthy',
  schemaVersion = 4,
} = {}) {
  const tokens = new Map(); // access token -> { id }
  const userByEmail = new Map(); // email -> { id }
  const rowsByUser = new Map(); // id -> Map(slot -> row)
  const requests = []; // every GraphQL request, in order
  let tick = 0;
  let tokenCounter = 0;
  let graphqlRequests = 0;

  // Faults a test can switch at any time.
  const control = {
    // Every later GraphQL request fails to connect.
    outage: false,
    // The next N compare-and-swap requests get a 502 page BEFORE they commit.
    gatewayBeforeCommit: 0,
    // The next N compare-and-swap requests COMMIT and then lose their answer.
    loseResponseAfterCommit: 0,
  };

  function table(userId) {
    if (!rowsByUser.has(userId)) rowsByUser.set(userId, new Map());
    return rowsByUser.get(userId);
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
      !(input.format_version === 1 && input.schema_version === schemaVersion)
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
      stored_at: new Date(
        Date.UTC(2026, 9, 8, 12, 0, 0, 0) + tick,
      ).toISOString(),
    };
    rows.set(row.slot, row);
    return row;
  }

  /**
   * `{ backup_slots[(args)] { fields } }`: the rows of the signed-in user,
   * filtered by `slot` / `backup_id` equality when given, ordered by slot,
   * projected to the selected fields. A field the role cannot select is
   * refused the way Hasura refuses it (devMode off).
   */
  function readSlots(query, user) {
    const match = query.match(
      /^\{ backup_slots(?:\((.*)\))? \{ ([a-z_0-9 ]+) \} \}$/,
    );

    if (!match) return null;

    const args = match[1] ?? '';
    const fields = match[2].trim().split(/\s+/);
    const unknown = fields.find((field) => !selectFields.includes(field));

    if (unknown)
      return gqlError(
        `field '${unknown}' not found in type: 'backup_slots'`,
        'validation-failed',
      );

    let rows = [...table(user.id).values()];
    const slot = args.match(/slot: \{_eq: (\d+)\}/);
    const id = args.match(/backup_id: \{_eq: "([^"]+)"\}/);

    if (slot) rows = rows.filter((row) => row.slot === Number(slot[1]));
    if (id) rows = rows.filter((row) => row.backup_id === id[1]);

    rows.sort((a, b) => a.slot - b.slot);

    return jsonResponse(200, {
      data: {
        backup_slots: rows.map((row) =>
          Object.fromEntries(fields.map((field) => [field, row[field]])),
        ),
      },
    });
  }

  function graphql(request, user) {
    const { query, variables } = request;

    if (query.includes('__schema')) return jsonResponse(200, schema);
    if (user === null)
      return gqlError(
        "field 'backup_slots' not found in type: 'query_root'",
        'validation-failed',
      );

    const read = readSlots(query, user);

    if (read !== null) return read;

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
      if (mode === 'outage-before-cleanup') control.outage = true;
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
        data: {
          insert_backup_slots_one: { backup_id: variables.new.backup_id },
        },
      });
    }

    if (query.startsWith('mutation Cas(')) {
      const input = variables.new;

      if (mode === 'p1-fails' && input.slot === 1 && !table(user.id).has(1))
        return gateway();
      if (
        (mode === 'gateway-502-on-generation' ||
          mode === 'outage-after-abort') &&
        input.schema_version === 5
      ) {
        control.outage = mode === 'outage-after-abort';
        return gateway();
      }
      if (
        mode === 'ceiling-gateway' &&
        Buffer.byteLength(String(input.payload), 'utf8') > 10 * 1024 * 1024
      )
        return gateway();
      if (control.gatewayBeforeCommit > 0) {
        control.gatewayBeforeCommit -= 1;
        return gateway();
      }

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

      if (control.loseResponseAfterCommit > 0) {
        // The row is committed; the answer never arrives.
        control.loseResponseAfterCommit -= 1;
        throw new TypeError('fetch failed');
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

  async function simulatedFetch(input, init = {}) {
    const url = new URL(String(input));
    const body = init.body ? JSON.parse(init.body) : {};

    if (url.pathname.endsWith('/signin/email-password')) {
      if (mode === 'signin-fails')
        return jsonResponse(401, { error: 'invalid-email-password' });

      const known = userByEmail.get(body.email);
      const user = known ?? {
        id: `00000000-0000-4000-8000-${String(userByEmail.size + 1).padStart(12, '0')}`,
      };
      userByEmail.set(body.email, user);

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

      // A JWT-shaped token, so the real SDK accepts the session.
      tokenCounter += 1;
      const issuedAt = Math.floor(Date.now() / 1000);
      const accessToken = `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(
        {
          sub: user.id,
          iat: issuedAt,
          exp: issuedAt + 3600,
          jti: tokenCounter,
        },
      )}.sim`;
      tokens.set(accessToken, user);

      return jsonResponse(200, {
        session: {
          accessToken,
          accessTokenExpiresIn: 3600,
          refreshToken: `sim-refresh-${body.email}`,
          refreshTokenId: `00000000-0000-4000-a000-${String(tokenCounter).padStart(12, '0')}`,
          user: {
            id: user.id,
            email: body.email,
            displayName: body.email,
            roles: ['user'],
          },
        },
      });
    }

    if (url.pathname.endsWith('/v1')) {
      graphqlRequests += 1;

      if (control.outage) throw new TypeError('fetch failed');

      const header = new Headers(init.headers).get('authorization');
      const user = header
        ? (tokens.get(header.replace('Bearer ', '')) ?? null)
        : null;

      requests.push({
        query: body.query,
        variables: body.variables,
        userId: user?.id ?? null,
      });

      return graphql(body, user);
    }

    return new Response('not found', { status: 404 });
  }

  return {
    fetch: simulatedFetch,
    control,
    requests,
    /** The rows currently stored for the account that signed in with `email`. */
    rowsOf(email) {
      const user = userByEmail.get(email);

      return user
        ? [...table(user.id).values()].map((row) => ({ ...row }))
        : [];
    },
    /**
     * Rewrites a stored payload WITHOUT touching its server-derived hash, the
     * way damage at rest would. Test use only: no request can do this.
     */
    corrupt(email, slot, payload) {
      const user = userByEmail.get(email);
      const row = user ? table(user.id).get(slot) : undefined;

      if (!row) throw new Error('no such row to corrupt');

      row.payload = payload;
    },
    /** What a run left behind: rows per signed-in account, and counters. */
    snapshot() {
      const rows = {};

      for (const [email, user] of userByEmail) {
        rows[email] = rowsByUser.get(user.id)?.size ?? 0;
      }

      return { rows, graphqlRequests, outage: control.outage };
    },
  };
}
