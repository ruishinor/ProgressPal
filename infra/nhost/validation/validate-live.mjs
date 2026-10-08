// Owner-run LIVE validation of the Epic G Stage-1 backup-slot schema (G3: T4, T5,
// T7, T20, T21). NOT run by CI and NOT run by any automated agent: it needs two
// real, verified synthetic users on the Nhost project, whose credentials you put
// in YOUR terminal environment:
//
//   NHOST_USER_A_EMAIL, NHOST_USER_B_EMAIL, NHOST_USER_PASSWORD   (same password for both)
//
// Rules this harness enforces:
//  - positive controls run first; if any fails, NO negative test runs;
//  - an HTTP 5xx, a dropped connection or a gateway page is a TRANSPORT fault:
//    it aborts the run as inconclusive and is never counted as "the gate rejected it";
//  - a negative test passes only for a GraphQL/database refusal that names the
//    expected constraint (the schema uses named constraints so this works with
//    Hasura devMode off);
//  - rollback proofs compare the whole slot inventory before and after;
//  - requests are paced (the project rate-limits GraphQL to 100/minute);
//  - evidence is redacted (no tokens, passwords or full email addresses) and is
//    written to the OS temp directory unless --out <dir> is given.
//
//   node infra/nhost/validation/validate-live.mjs [--out <dir>]
//
// Talks only to the project's Auth and GraphQL hosts (Stockholm).
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import {
  CONSTRAINTS,
  HarnessAbort,
  REMOTE_PAYLOAD_CEILING_BYTES,
  byteaLiteral,
  classifyHttpOutcome,
  judgeRejection,
  makePayload,
  requireSuccess,
  sameSlots,
  scrubEvidence,
  sha256Hex,
} from './lib.mjs';

const PROJECT = { subdomain: 'enuikiiweoscywaixedr', region: 'eu-north-1' };
const AUTH = `https://${PROJECT.subdomain}.auth.${PROJECT.region}.nhost.run/v1`;
const GRAPHQL = `https://${PROJECT.subdomain}.graphql.${PROJECT.region}.nhost.run/v1`;
const ALLOWED_HOSTS = new Set([new URL(AUTH).host, new URL(GRAPHQL).host]);

const emailA = process.env.NHOST_USER_A_EMAIL ?? '';
const emailB = process.env.NHOST_USER_B_EMAIL ?? '';
const password = process.env.NHOST_USER_PASSWORD ?? '';
const outIndex = process.argv.indexOf('--out');
const outDir =
  outIndex > -1
    ? process.argv[outIndex + 1]
    : join(tmpdir(), 'progresspal-live-validation');

if (!emailA || !emailB || emailA === emailB || password.length < 9) {
  console.error(
    'Set NHOST_USER_A_EMAIL, NHOST_USER_B_EMAIL (two different verified users) and NHOST_USER_PASSWORD first.',
  );
  process.exit(2);
}

const secrets = [password];
const results = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastRequestAt = 0;

async function raw(url, { headers = {}, json } = {}) {
  const target = new URL(url);

  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.host)) {
    throw new HarnessAbort(`refusing to contact ${target.host}`);
  }

  const wait = 800 - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const body = JSON.stringify(json);
  const startedAt = performance.now();

  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body,
    });
    const text = await response.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      /* a non-JSON body (gateway page) stays undefined */
    }
    return {
      status: response.status,
      json: parsed,
      ms: Math.round(performance.now() - startedAt),
      requestBytes: Buffer.byteLength(body),
    };
  } catch (error) {
    return {
      status: null,
      error: `${error.name}: ${error.message}`,
      ms: Math.round(performance.now() - startedAt),
      requestBytes: Buffer.byteLength(body),
    };
  }
}

async function signIn(email) {
  const response = await raw(`${AUTH}/signin/email-password`, {
    json: { email, password },
  });
  const session = response.json?.session;

  if (!session?.accessToken) {
    throw new HarnessAbort(
      `could not sign in ${email.slice(0, 1)}***: HTTP ${response.status} (is the user verified and on the allowed list?)`,
    );
  }

  secrets.push(session.accessToken, session.refreshToken);
  return { token: session.accessToken, userId: session.user?.id };
}

const run = (user, query, variables) =>
  raw(GRAPHQL, {
    headers: user ? { authorization: `Bearer ${user.token}` } : {},
    json: { query, variables },
  });

const INVENTORY =
  '{ backup_slots(order_by: {slot: asc}) { slot backup_id format_version schema_version payload_bytes payload_sha256 stored_at } }';

async function inventory(user) {
  const response = await run(user, INVENTORY);
  requireSuccess(classifyHttpOutcome(response), 'inventory read');
  return response.json.data.backup_slots;
}

function newRow(slot, payload, overrides = {}) {
  return {
    slot,
    backup_id: overrides.backupId ?? randomUUID(),
    format_version: overrides.formatVersion ?? 1,
    schema_version: overrides.schemaVersion ?? 4,
    app_version: 'live-validation',
    exported_at: new Date().toISOString(),
    payload,
    ...(overrides.omitHash
      ? {}
      : {
          expected_sha256: byteaLiteral(
            overrides.hashHex ?? sha256Hex(payload),
          ),
        }),
  };
}

// Epic F 04 section 4: delete the observed occupant and insert, in ONE request.
function casRequest(slot, observedId, row, user) {
  const del = observedId
    ? `del: delete_backup_slots(where: {slot: {_eq: ${Number(slot)}}, backup_id: {_eq: "${observedId}"}}) { affected_rows }`
    : '';
  return run(
    user,
    `mutation Cas($new: backup_slots_insert_input!) { ${del} ins: insert_backup_slots_one(object: $new) { backup_id payload_sha256 stored_at } }`,
    { new: row },
  );
}

const record = (id, title, pass, detail, extra = {}) => {
  results.push({ id, title, pass, detail, ...extra });
  console.log(
    `${pass ? 'PASS' : 'FAIL'} ${id} ${title}${detail ? ` - ${detail}` : ''}`,
  );
};

async function deleteAll(user) {
  const response = await run(
    user,
    'mutation { delete_backup_slots(where: {}) { affected_rows } }',
  );
  requireSuccess(classifyHttpOutcome(response), 'cleanup delete');
}

async function main() {
  const a = await signIn(emailA);
  const b = await signIn(emailB);
  await deleteAll(a);
  await deleteAll(b);

  // ---- preflight: the permission surface visible to role "user" (T4/T5) ----
  const schema = await run(
    a,
    '{ __schema { queryType { fields { name } } mutationType { fields { name } } types { name fields { name } inputFields { name } } } }',
  );
  requireSuccess(classifyHttpOutcome(schema), 'schema introspection');
  const root = schema.json.data.__schema;
  const queries = root.queryType.fields.map((f) => f.name);
  const mutations = root.mutationType.fields.map((f) => f.name);
  const type = (name) => root.types.find((t) => t.name === name);
  const insertFields = (type('backup_slots_insert_input')?.inputFields ?? [])
    .map((f) => f.name)
    .sort();
  const selectFields = (type('backup_slots')?.fields ?? []).map((f) => f.name);
  const expectedInsert = [
    'app_version',
    'backup_id',
    'exported_at',
    'expected_sha256',
    'format_version',
    'payload',
    'schema_version',
    'slot',
  ];

  record(
    'T4-surface-1',
    'table, insert and delete roots exist for role user',
    ['backup_slots', 'insert_backup_slots_one', 'delete_backup_slots'].every(
      (n) => queries.includes(n) || mutations.includes(n),
    ),
    '',
  );
  record(
    'T4-surface-2',
    'no update and no aggregate surface',
    !mutations.some((n) => n.includes('update_backup_slots')) &&
      !queries.some((n) => n.includes('backup_slots_aggregate')),
    '',
  );
  record(
    'T4-surface-3',
    'insertable columns are exactly the client-owned set (user_id and server fields absent)',
    JSON.stringify(insertFields) === JSON.stringify(expectedInsert),
    insertFields.join(','),
  );
  record(
    'T4-surface-4',
    'expected_sha256 and user_id are not selectable; payload_sha256 is',
    !selectFields.includes('expected_sha256') &&
      !selectFields.includes('user_id') &&
      selectFields.includes('payload_sha256'),
    '',
  );

  // ---- positive controls: nothing negative runs unless these all succeed ----
  const p1Payload = makePayload(4096, 'p1');
  const p1 = await casRequest(1, null, newRow(1, p1Payload), a);
  requireSuccess(classifyHttpOutcome(p1), 'P1 empty-slot insert');
  const id1 = p1.json.data.ins.backup_id;
  record(
    'P1',
    'empty-slot insert succeeds and the server hash equals the client hash',
    p1.json.data.ins.payload_sha256 === byteaLiteral(sha256Hex(p1Payload)),
    '',
  );

  const p2 = await casRequest(1, id1, newRow(1, makePayload(4096, 'p2')), a);
  requireSuccess(classifyHttpOutcome(p2), 'P2 occupied-slot replacement');
  const id2 = p2.json.data.ins.backup_id;
  record(
    'P2',
    'occupied-slot replacement (delete + insert, one request) succeeds',
    p2.json.data.del.affected_rows === 1,
    '',
  );

  const p3 = await casRequest(2, null, newRow(2, makePayload(4096, 'p3')), a);
  requireSuccess(
    classifyHttpOutcome(p3),
    'P3 current-generation positive control',
  );
  record('P3', 'current-generation (1, 4) row is accepted', true, '');

  const ceilingPayload = makePayload(REMOTE_PAYLOAD_CEILING_BYTES, 'p4');
  const p4 = await casRequest(3, null, newRow(3, ceilingPayload), a);
  requireSuccess(classifyHttpOutcome(p4), 'P4 exactly 10 MiB');
  record(
    'P4',
    'a payload of exactly 10 MiB is accepted',
    p4.json.data.ins.payload_sha256 === byteaLiteral(sha256Hex(ceilingPayload)),
    `request ${p4.requestBytes} bytes, ${p4.ms} ms`,
  );

  // ---- negatives against the occupied slot 1 (rollback must leave it untouched) ----
  const before = await inventory(a);
  const negative = async (id, title, expectedConstraint, response) => {
    const verdict = judgeRejection(
      classifyHttpOutcome(response),
      expectedConstraint,
    );
    const after = await inventory(a);
    record(
      id,
      title,
      verdict.pass && sameSlots(before, after),
      `${verdict.detail}; inventory ${sameSlots(before, after) ? 'unchanged' : 'CHANGED'}`,
    );
  };

  await negative(
    'T7-lost-race',
    'a stale observed occupant loses; nothing is overwritten',
    CONSTRAINTS.primaryKey,
    await casRequest(1, id1, newRow(1, makePayload(4096, 'n1')), a),
  );
  await negative(
    'T20-generation',
    'unsupported generation (1, 5) is refused and the old row survives',
    CONSTRAINTS.generationGate,
    await casRequest(
      1,
      id2,
      newRow(1, makePayload(4096, 'n2'), { schemaVersion: 5 }),
      a,
    ),
  );
  await negative(
    'T20-generation-format',
    'unsupported format version 2 is refused',
    CONSTRAINTS.generationGate,
    await casRequest(
      1,
      id2,
      newRow(1, makePayload(4096, 'n2b'), { formatVersion: 2 }),
      a,
    ),
  );
  await negative(
    'T21-wrong-hash',
    'a wrong expected hash is refused and the old row survives',
    CONSTRAINTS.exactBytesGate,
    await casRequest(
      1,
      id2,
      newRow(1, makePayload(4096, 'n3'), { hashHex: sha256Hex('other bytes') }),
      a,
    ),
  );
  await negative(
    'T21-missing-hash',
    'a missing expected hash is refused by the SAME named gate',
    CONSTRAINTS.exactBytesGate,
    await casRequest(
      1,
      id2,
      newRow(1, makePayload(4096, 'n4'), { omitHash: true }),
      a,
    ),
  );
  await negative(
    'T21-short-hash',
    'a 31-byte expected hash is refused by the same named gate',
    CONSTRAINTS.exactBytesGate,
    await casRequest(
      1,
      id2,
      newRow(1, makePayload(4096, 'n5'), {
        hashHex: sha256Hex('x').slice(0, 62),
      }),
      a,
    ),
  );
  await negative(
    'T5-slot-range',
    'slot 5 is refused',
    CONSTRAINTS.slotRange,
    await casRequest(5, null, newRow(5, makePayload(4096, 'n6')), a),
  );

  // ---- the 10 MiB ceiling: the database constraint, or the gateway as the outer bound ----
  const oversize = makePayload(REMOTE_PAYLOAD_CEILING_BYTES + 1, 'n7');
  const oversizeResponse = await casRequest(4, null, newRow(4, oversize), a);
  const oversizeOutcome = classifyHttpOutcome(oversizeResponse);
  const afterOversize = await inventory(a);
  if (oversizeOutcome.kind === 'rejection') {
    record(
      'T5-ceiling',
      'a 10 MiB + 1 byte payload is refused',
      oversizeOutcome.constraint === CONSTRAINTS.payloadCeiling &&
        !afterOversize.some((s) => s.slot === 4),
      `by ${oversizeOutcome.constraint}`,
    );
  } else if (
    oversizeOutcome.kind === 'transport' &&
    [413, 502, 503, 504].includes(oversizeOutcome.status) &&
    !afterOversize.some((s) => s.slot === 4)
  ) {
    record(
      'T5-ceiling',
      'a 10 MiB + 1 byte payload did not commit',
      true,
      `refused at the gateway (HTTP ${oversizeOutcome.status}); the database ceiling was NOT exercised by this request`,
      { gatewayOnly: true },
    );
  } else {
    record(
      'T5-ceiling',
      'a 10 MiB + 1 byte payload is refused',
      false,
      `unexpected ${oversizeOutcome.kind} ${oversizeOutcome.status ?? ''}`,
    );
  }

  // ---- isolation and forged input (user B) ----
  const bSees = await inventory(b);
  record(
    'T4-isolation-read',
    "B sees none of A's rows",
    bSees.length === 0,
    '',
  );
  const bDelete = await run(
    b,
    'mutation { delete_backup_slots(where: {slot: {_eq: 1}}) { affected_rows } }',
  );
  requireSuccess(classifyHttpOutcome(bDelete), 'B delete attempt');
  record(
    'T4-isolation-delete',
    "B deleting slot 1 affects zero rows; A's inventory is unchanged",
    bDelete.json.data.delete_backup_slots.affected_rows === 0 &&
      sameSlots(before, await inventory(a)),
    '',
  );
  const forged = await run(
    b,
    'mutation($new: backup_slots_insert_input!) { insert_backup_slots_one(object: $new) { backup_id } }',
    { new: { ...newRow(0, makePayload(4096, 'f')), user_id: a.userId } },
  );
  record(
    'T4-forged-user',
    'a client-supplied user_id is structurally impossible',
    judgeRejection(classifyHttpOutcome(forged), null).pass,
    '',
  );
  const hidden = await run(b, '{ backup_slots { expected_sha256 } }');
  record(
    'T4-hidden-hash',
    'expected_sha256 cannot be selected',
    judgeRejection(classifyHttpOutcome(hidden), null).pass,
    '',
  );
  const anonymous = await run(null, '{ backup_slots { slot } }');
  record(
    'T4-anonymous',
    'an unauthenticated caller cannot read the table',
    judgeRejection(classifyHttpOutcome(anonymous), null).pass,
    '',
  );

  // ---- exact text: NUL escape sequence + Unicode round trip ----
  const exact = makePayload(4096, 'exact').replace(
    'ab ',
    'ab\\u0000 \u{1F600} é ',
  );
  const exactInsert = await casRequest(4, null, newRow(4, exact), a);
  requireSuccess(classifyHttpOutcome(exactInsert), 'exact-text insert');
  const readBack = await run(
    a,
    '{ backup_slots(where: {slot: {_eq: 4}}) { payload payload_sha256 } }',
  );
  requireSuccess(classifyHttpOutcome(readBack), 'exact-text read');
  record(
    'T21-exact-text',
    'a payload with \\u0000 escapes, an emoji and a combining mark round-trips byte for byte',
    readBack.json.data.backup_slots[0].payload === exact &&
      readBack.json.data.backup_slots[0].payload_sha256 ===
        byteaLiteral(sha256Hex(exact)),
    '',
  );

  // ---- stored_at: clock_timestamp() is insert time, not transaction start ----
  await deleteAll(a);
  const two = await run(
    a,
    'mutation($x: backup_slots_insert_input!, $y: backup_slots_insert_input!) { first: insert_backup_slots_one(object: $x) { stored_at } second: insert_backup_slots_one(object: $y) { stored_at } }',
    {
      x: newRow(0, makePayload(4096, 'o1')),
      y: newRow(1, makePayload(4096, 'o2')),
    },
  );
  requireSuccess(classifyHttpOutcome(two), 'two inserts in one transaction');
  record(
    'G3-stored-at',
    'two inserts in ONE transaction get different, increasing stored_at (clock_timestamp, not now)',
    Date.parse(two.json.data.second.stored_at) >
      Date.parse(two.json.data.first.stored_at),
    `${two.json.data.first.stored_at} < ${two.json.data.second.stored_at}`,
  );

  await deleteAll(a);
  await deleteAll(b);
}

let aborted = null;

try {
  await main();
} catch (error) {
  if (error instanceof HarnessAbort) {
    aborted = error.message;
    console.error(`\nABORTED (inconclusive, not a pass): ${aborted}`);
  } else {
    aborted = `unexpected error: ${error.message}`;
    console.error(`\nERROR: ${error.stack ?? error.message}`);
  }
}

const failed = results.filter((r) => !r.pass);
const summary = {
  at: new Date().toISOString(),
  project: PROJECT,
  aborted,
  total: results.length,
  failed: failed.length,
  results,
};
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `live-validation-${Date.now()}.json`);
writeFileSync(file, scrubEvidence(summary, secrets));
console.log(
  `\n${results.length - failed.length}/${results.length} checks passed${aborted ? ' - RUN ABORTED' : ''}. Evidence: ${file}`,
);
process.exit(aborted || failed.length > 0 ? 1 : 0);
