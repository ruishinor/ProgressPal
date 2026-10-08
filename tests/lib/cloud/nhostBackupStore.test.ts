import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CloudError,
  type CloudBackupStore,
  type CloudRequestResult,
  type NhostCloud,
  type RemoteBackupWrite,
} from '@/lib/cloud';
import { nhostGraphqlUrl } from '@/lib/cloud/nhost/endpoints';

import {
  createCloud,
  enableCloud,
  installFetchStub,
  jsonResponse,
  signInThroughStub,
  type FetchStub,
} from './cloudTestKit';

/**
 * The Nhost backup-store adapter, driven through the REAL @nhost/nhost-js 4.9.0
 * client against a stubbed fetch. The documents asserted here are what the SDK
 * really sends; the Hasura-shaped answers are the shapes the live validation
 * observed (infra/nhost/validation).
 */

const idA = '11111111-1111-4111-8111-111111111111';
const idB = '22222222-2222-4222-8222-222222222222';
const hashA = 'a'.repeat(64);
const hashB = 'b'.repeat(64);

const inventoryDocument =
  '{ backup_slots(order_by: {slot: asc}) { slot backup_id format_version schema_version app_version exported_at payload_bytes stored_at } }';

const insertSelection =
  'ins: insert_backup_slots_one(object: $new) { backup_id payload_sha256 stored_at }';
const replaceEmptyDocument = `mutation Cas($new: backup_slots_insert_input!) { ${insertSelection} }`;
const replaceOccupiedDocument = (slot: number, observed: string) =>
  `mutation Cas($new: backup_slots_insert_input!) { del: delete_backup_slots(where: {slot: {_eq: ${slot}}, backup_id: {_eq: "${observed}"}}) { affected_rows } ${insertSelection} }`;

function hasuraRow(overrides: Record<string, unknown> = {}) {
  return {
    slot: 0,
    backup_id: idA,
    format_version: 1,
    schema_version: 4,
    app_version: '1.7.1',
    exported_at: '2026-10-08T10:00:00+00:00',
    payload_bytes: 1234,
    stored_at: '2026-10-08T11:41:04.37582+00:00',
    ...overrides,
  };
}

function write(overrides: Partial<RemoteBackupWrite> = {}): RemoteBackupWrite {
  return {
    slot: 2,
    observedBackupId: null,
    backupId: idB,
    formatVersion: 1,
    schemaVersion: 4,
    appVersion: '1.7.1',
    exportedAt: '2026-10-08T10:00:00.000Z',
    payload: '{"k":"é\\n"}',
    expectedSha256: hashA,
    ...overrides,
  };
}

const constraintError = (message: string, code = 'constraint-violation') =>
  jsonResponse(200, { errors: [{ message, extensions: { path: '$', code } }] });
const checkViolation = (name: string) =>
  constraintError(
    `Check constraint violation. new row for relation "backup_slots" violates check constraint "${name}"`,
  );

let stub: FetchStub;
let cloud: NhostCloud;
let store: CloudBackupStore;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  stub = installFetchStub();
  cloud = createCloud();
  store = cloud.backups;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function ready() {
  enableCloud();
  await signInThroughStub(cloud, stub);
}

function failureOf<T>(result: CloudRequestResult<T>) {
  if (result.ok) {
    throw new Error('expected a failure');
  }

  return result.failure;
}

function valueOf<T>(result: CloudRequestResult<T>) {
  if (!result.ok) {
    throw new Error(`expected a value, got ${JSON.stringify(result.failure)}`);
  }

  return result.value;
}

describe('before any request is possible', () => {
  it('with cloud disabled every operation throws disabled and sends nothing', async () => {
    for (const run of [
      () => store.listSlots(),
      () => store.replaceSlot(write()),
      () => store.findBackup(idA),
      () => store.downloadBackup(0, idA),
    ]) {
      const error = await run().then(
        () => null,
        (caught: unknown) => caught,
      );

      expect(error).toBeInstanceOf(CloudError);
      expect((error as CloudError).code).toBe('disabled');
    }

    expect(stub.calls).toHaveLength(0);
  });

  it('signed out reports unauthenticated without sending an anonymous request', async () => {
    enableCloud();

    expect(failureOf(await store.listSlots())).toEqual({
      kind: 'unauthenticated',
    });
    expect(failureOf(await store.replaceSlot(write()))).toEqual({
      kind: 'unauthenticated',
    });
    expect(failureOf(await store.findBackup(idA))).toEqual({
      kind: 'unauthenticated',
    });
    expect(failureOf(await store.downloadBackup(0, idA))).toEqual({
      kind: 'unauthenticated',
    });
    expect(stub.calls).toHaveLength(0);
  });

  it('building the store and the account performs no request', () => {
    enableCloud();
    createCloud();

    expect(stub.calls).toHaveLength(0);
  });
});

describe('listSlots', () => {
  it('sends the metadata-only inventory document to the one GraphQL endpoint, authenticated', async () => {
    await ready();
    stub.respond(() => jsonResponse(200, { data: { backup_slots: [] } }));

    await store.listSlots();

    expect(stub.calls).toHaveLength(1);

    const [call] = stub.calls;

    expect(call?.url).toBe(nhostGraphqlUrl);
    expect(call?.method).toBe('POST');
    expect(call?.headers.get('authorization')).toMatch(/^Bearer ey/);
    expect(call?.body?.query).toBe(inventoryDocument);
  });

  it('never asks for the payload, a hash, the precondition or the owner', async () => {
    await ready();
    stub.respond(() => jsonResponse(200, { data: { backup_slots: [] } }));

    await store.listSlots();

    const query = String(stub.calls[0]?.body?.query);
    const selected = query.slice(query.lastIndexOf('{ slot') + 1);

    expect(selected).not.toMatch(/\bpayload\b/);
    expect(selected).not.toMatch(/payload_sha256|expected_sha256|user_id/);
  });

  it('maps rows to provider-neutral slots, keeping the order the server gave', async () => {
    await ready();
    stub.respond(() =>
      jsonResponse(200, {
        data: {
          backup_slots: [
            hasuraRow({ slot: 1, backup_id: idB }),
            hasuraRow({ slot: 3, backup_id: idA, payload_bytes: 77 }),
          ],
        },
      }),
    );

    expect(valueOf(await store.listSlots())).toEqual([
      {
        slot: 1,
        backupId: idB,
        formatVersion: 1,
        schemaVersion: 4,
        appVersion: '1.7.1',
        exportedAt: '2026-10-08T10:00:00+00:00',
        storedAt: '2026-10-08T11:41:04.37582+00:00',
        payloadBytes: 1234,
      },
      expect.objectContaining({ slot: 3, backupId: idA, payloadBytes: 77 }),
    ]);
  });

  it.each([
    ['data is not an object', { data: 'x' }],
    ['backup_slots is not a list', { data: { backup_slots: 'nope' } }],
    ['a row is not an object', { data: { backup_slots: [7] } }],
    ['slot above 4', { data: { backup_slots: [hasuraRow({ slot: 5 })] } }],
    ['slot below 0', { data: { backup_slots: [hasuraRow({ slot: -1 })] } }],
    [
      'slot not an integer',
      { data: { backup_slots: [hasuraRow({ slot: 1.5 })] } },
    ],
    [
      'backup_id not a uuid',
      { data: { backup_slots: [hasuraRow({ backup_id: 'x' })] } },
    ],
    [
      'schema_version missing',
      { data: { backup_slots: [hasuraRow({ schema_version: undefined })] } },
    ],
    [
      'payload_bytes negative',
      { data: { backup_slots: [hasuraRow({ payload_bytes: -1 })] } },
    ],
    [
      'stored_at not a timestamp',
      { data: { backup_slots: [hasuraRow({ stored_at: 'yesterday' })] } },
    ],
    [
      'two rows for one slot',
      {
        data: {
          backup_slots: [hasuraRow(), hasuraRow({ backup_id: idB })],
        },
      },
    ],
    [
      'more than five rows',
      {
        data: {
          backup_slots: [0, 1, 2, 3, 4, 4].map((slot, index) =>
            hasuraRow({
              slot,
              backup_id: `00000000-0000-4000-8000-00000000000${index}`,
            }),
          ),
        },
      },
    ],
  ])(
    'refuses a malformed answer (%s) instead of guessing',
    async (_label, body) => {
      await ready();
      stub.respond(() => jsonResponse(200, body));

      expect(failureOf(await store.listSlots())).toEqual({
        kind: 'unexpected-response',
      });
    },
  );
});

describe('replaceSlot', () => {
  it('into an empty slot sends one insert and no delete, with the exact variables', async () => {
    await ready();
    stub.respond(() =>
      jsonResponse(200, {
        data: {
          ins: {
            backup_id: idB,
            payload_sha256: `\\x${hashA}`,
            stored_at: '2026-10-08T11:41:04.376576+00:00',
          },
        },
      }),
    );

    const written = valueOf(await store.replaceSlot(write()));

    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0]?.url).toBe(nhostGraphqlUrl);
    expect(stub.calls[0]?.body?.query).toBe(replaceEmptyDocument);
    expect(stub.calls[0]?.body?.variables).toEqual({
      new: {
        slot: 2,
        backup_id: idB,
        format_version: 1,
        schema_version: 4,
        app_version: '1.7.1',
        exported_at: '2026-10-08T10:00:00.000Z',
        payload: '{"k":"é\\n"}',
        expected_sha256: `\\x${hashA}`,
      },
    });
    expect(written).toEqual({
      backupId: idB,
      payloadSha256: hashA,
      storedAt: '2026-10-08T11:41:04.376576+00:00',
      deletedRows: null,
    });
  });

  it('over an occupied slot deletes exactly the observed occupant in the SAME request', async () => {
    await ready();
    stub.respond(() =>
      jsonResponse(200, {
        data: {
          del: { affected_rows: 1 },
          ins: {
            backup_id: idB,
            payload_sha256: `\\x${hashA}`,
            stored_at: '2026-10-08T11:41:04.376576+00:00',
          },
        },
      }),
    );

    const written = valueOf(
      await store.replaceSlot(write({ slot: 4, observedBackupId: idA })),
    );

    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0]?.body?.query).toBe(replaceOccupiedDocument(4, idA));
    expect(written.deletedRows).toBe(1);
  });

  it('reports a delete that matched nothing as zero rows, not as success of the delete', async () => {
    await ready();
    stub.respond(() =>
      jsonResponse(200, {
        data: {
          del: { affected_rows: 0 },
          ins: {
            backup_id: idB,
            payload_sha256: `\\x${hashA}`,
            stored_at: '2026-10-08T11:41:04.376576+00:00',
          },
        },
      }),
    );

    expect(
      valueOf(await store.replaceSlot(write({ observedBackupId: idA })))
        .deletedRows,
    ).toBe(0);
  });

  it('returns the hash the SERVER derived, lowercased, even if it differs from the expected one', async () => {
    await ready();
    stub.respond(() =>
      jsonResponse(200, {
        data: {
          ins: {
            backup_id: idB,
            payload_sha256: `\\x${hashB.toUpperCase()}`,
            stored_at: '2026-10-08T11:41:04.376576+00:00',
          },
        },
      }),
    );

    expect(valueOf(await store.replaceSlot(write())).payloadSha256).toBe(hashB);
  });

  it.each([
    ['no ins part', { data: { del: { affected_rows: 1 } } }],
    [
      'a hash that is not bytea hex',
      {
        data: {
          del: { affected_rows: 1 },
          ins: {
            backup_id: idB,
            payload_sha256: hashA,
            stored_at: '2026-10-08T11:41:04.376576+00:00',
          },
        },
      },
    ],
    [
      'a hash of the wrong length',
      {
        data: {
          del: { affected_rows: 1 },
          ins: {
            backup_id: idB,
            payload_sha256: '\\xabcd',
            stored_at: '2026-10-08T11:41:04.376576+00:00',
          },
        },
      },
    ],
    [
      'a bad backup_id',
      {
        data: {
          del: { affected_rows: 1 },
          ins: {
            backup_id: 'x',
            payload_sha256: `\\x${hashA}`,
            stored_at: '2026-10-08T11:41:04.376576+00:00',
          },
        },
      },
    ],
    [
      'a bad stored_at',
      {
        data: {
          del: { affected_rows: 1 },
          ins: {
            backup_id: idB,
            payload_sha256: `\\x${hashA}`,
            stored_at: 'x',
          },
        },
      },
    ],
    [
      'no del part although a delete was sent',
      {
        data: {
          ins: {
            backup_id: idB,
            payload_sha256: `\\x${hashA}`,
            stored_at: '2026-10-08T11:41:04.376576+00:00',
          },
        },
      },
    ],
    [
      'a non-numeric affected_rows',
      {
        data: {
          del: { affected_rows: 'many' },
          ins: {
            backup_id: idB,
            payload_sha256: `\\x${hashA}`,
            stored_at: '2026-10-08T11:41:04.376576+00:00',
          },
        },
      },
    ],
  ])('refuses an answer with %s', async (_label, body) => {
    await ready();
    stub.respond(() => jsonResponse(200, body));

    expect(
      failureOf(await store.replaceSlot(write({ observedBackupId: idA }))),
    ).toEqual({ kind: 'unexpected-response' });
  });

  it.each([
    ['slot 5', { slot: 5 }],
    ['slot -1', { slot: -1 }],
    ['a fractional slot', { slot: 1.5 }],
    ['an observed id that is not a uuid', { observedBackupId: 'nope' }],
    [
      'an observed id that tries to close the document',
      {
        observedBackupId:
          '11111111-1111-4111-8111-111111111111"}) { affected_rows } evil: delete_backup_slots(where: {',
      },
    ],
    ['a new id that is not a uuid', { backupId: 'nope' }],
    [
      'an expected hash that is not 64 hex characters',
      { expectedSha256: 'ab' },
    ],
    ['an upper-case expected hash', { expectedSha256: 'A'.repeat(64) }],
  ])('refuses %s before any request', async (_label, overrides) => {
    await ready();

    const error = await store.replaceSlot(write(overrides)).then(
      () => null,
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(CloudError);
    expect((error as CloudError).code).toBe('invalid-input');
    expect(stub.calls).toHaveLength(0);
  });
});

describe('every database refusal keeps its own name (devMode off)', () => {
  it.each([
    ['backup_slots_generation_gate', 'unsupported-generation'],
    ['backup_slots_exact_bytes_gate', 'integrity-mismatch'],
    ['backup_slots_payload_ceiling', 'payload-too-large'],
    ['backup_slots_slot_range', 'slot-out-of-range'],
    ['backup_slots_app_version_length', 'other-constraint'],
  ])('check %s becomes %s', async (constraint, reason) => {
    await ready();
    stub.respond(() => checkViolation(constraint));

    expect(failureOf(await store.replaceSlot(write()))).toEqual({
      kind: 'rejected',
      reason,
      constraint,
    });
  });

  it.each(['backup_slots_pkey', 'backup_slots_backup_id_key'])(
    'unique %s becomes slot-conflict and names the constraint',
    async (constraint) => {
      await ready();
      stub.respond(() =>
        constraintError(
          `Uniqueness violation. duplicate key value violates unique constraint "${constraint}"`,
        ),
      );

      expect(failureOf(await store.replaceSlot(write()))).toEqual({
        kind: 'rejected',
        reason: 'slot-conflict',
        constraint,
      });
    },
  );
});

describe('transport faults are never mistaken for a database answer', () => {
  it('a gateway HTML page (the SDK cannot parse it) is a provider fault', async () => {
    await ready();
    stub.respond(
      () =>
        new Response('<html>502 Bad Gateway</html>', {
          status: 502,
          headers: { 'content-type': 'text/html' },
        }),
    );

    expect(failureOf(await store.replaceSlot(write()))).toEqual({
      kind: 'provider-unavailable',
      httpStatus: null,
    });
  });

  it('a 5xx with an empty body keeps its status', async () => {
    await ready();
    stub.respond(() => new Response('', { status: 503 }));

    expect(failureOf(await store.listSlots())).toEqual({
      kind: 'provider-unavailable',
      httpStatus: 503,
    });
  });

  it('a rejected fetch (no response at all) is a provider fault', async () => {
    await ready();
    stub.respond(() => {
      throw new TypeError('Failed to fetch');
    });

    expect(failureOf(await store.findBackup(idA))).toEqual({
      kind: 'provider-unavailable',
      httpStatus: null,
    });
  });

  it('HTTP 429 is rate limiting', async () => {
    await ready();
    stub.respond(() => jsonResponse(429, { error: 'slow down' }));

    expect(failureOf(await store.listSlots())).toEqual({
      kind: 'rate-limited',
    });
  });

  it.each(['invalid-jwt', 'invalid-headers'])(
    'Hasura %s is unauthenticated',
    async (code) => {
      await ready();
      stub.respond(() => constraintError('Could not verify JWT', code));

      expect(failureOf(await store.listSlots())).toEqual({
        kind: 'unauthenticated',
      });
    },
  );

  it('an unknown GraphQL error is an unexpected response, not a rejection', async () => {
    await ready();
    stub.respond(() =>
      constraintError("field 'nope' not found", 'validation-failed'),
    );

    expect(failureOf(await store.listSlots())).toEqual({
      kind: 'unexpected-response',
    });
  });

  it('a 200 whose body has no data is an unexpected response', async () => {
    await ready();
    stub.respond(() => jsonResponse(200, {}));

    expect(failureOf(await store.listSlots())).toEqual({
      kind: 'unexpected-response',
    });
  });
});

describe('findBackup', () => {
  const findDocument = `{ backup_slots(where: {backup_id: {_eq: "${idB}"}}) { slot backup_id payload_sha256 stored_at } }`;

  it('asks for identity and the server hash only, never the payload', async () => {
    await ready();
    stub.respond(() => jsonResponse(200, { data: { backup_slots: [] } }));

    await store.findBackup(idB);

    expect(stub.calls[0]?.body?.query).toBe(findDocument);
    expect(String(stub.calls[0]?.body?.query)).not.toMatch(/\bpayload\b/);
  });

  it('returns null when no row has that identity', async () => {
    await ready();
    stub.respond(() => jsonResponse(200, { data: { backup_slots: [] } }));

    expect(valueOf(await store.findBackup(idB))).toBeNull();
  });

  it('returns the identity, slot and lowercase server hash of the row', async () => {
    await ready();
    stub.respond(() =>
      jsonResponse(200, {
        data: {
          backup_slots: [
            {
              slot: 3,
              backup_id: idB,
              payload_sha256: `\\x${hashB}`,
              stored_at: '2026-10-08T11:41:04.376576+00:00',
            },
          ],
        },
      }),
    );

    expect(valueOf(await store.findBackup(idB))).toEqual({
      backupId: idB,
      slot: 3,
      payloadSha256: hashB,
      storedAt: '2026-10-08T11:41:04.376576+00:00',
    });
  });

  it.each([
    ['two rows', [{}, {}]],
    ['a row for another identity', [{ backup_id: idA }]],
    ['a malformed hash', [{ payload_sha256: 'zz' }]],
  ])('refuses %s', async (_label, rows) => {
    await ready();
    stub.respond(() =>
      jsonResponse(200, {
        data: {
          backup_slots: rows.map((overrides) => ({
            slot: 3,
            backup_id: idB,
            payload_sha256: `\\x${hashB}`,
            stored_at: '2026-10-08T11:41:04.376576+00:00',
            ...overrides,
          })),
        },
      }),
    );

    expect(failureOf(await store.findBackup(idB))).toEqual({
      kind: 'unexpected-response',
    });
  });

  it('refuses an identity that is not a uuid before any request', async () => {
    await ready();

    await expect(store.findBackup('"x')).rejects.toMatchObject({
      code: 'invalid-input',
    });
    expect(stub.calls).toHaveLength(0);
  });
});

describe('downloadBackup', () => {
  const downloadDocument = `{ backup_slots(where: {slot: {_eq: 2}, backup_id: {_eq: "${idB}"}}) { slot backup_id format_version schema_version app_version exported_at payload_bytes stored_at payload payload_sha256 } }`;

  it('asks for one slot only if it still holds the chosen backup', async () => {
    await ready();
    stub.respond(() => jsonResponse(200, { data: { backup_slots: [] } }));

    await store.downloadBackup(2, idB);

    expect(stub.calls[0]?.body?.query).toBe(downloadDocument);
  });

  it('returns null when the slot no longer holds that backup', async () => {
    await ready();
    stub.respond(() => jsonResponse(200, { data: { backup_slots: [] } }));

    expect(valueOf(await store.downloadBackup(2, idB))).toBeNull();
  });

  it('returns the exact stored text, its metadata and the lowercase server hash', async () => {
    await ready();

    const payload = '{\n  "k": "é \\u0000 😀"\n}';

    stub.respond(() =>
      jsonResponse(200, {
        data: {
          backup_slots: [
            hasuraRow({
              slot: 2,
              backup_id: idB,
              payload,
              payload_sha256: `\\x${hashB}`,
            }),
          ],
        },
      }),
    );

    expect(valueOf(await store.downloadBackup(2, idB))).toEqual({
      slot: 2,
      backupId: idB,
      formatVersion: 1,
      schemaVersion: 4,
      appVersion: '1.7.1',
      exportedAt: '2026-10-08T10:00:00+00:00',
      storedAt: '2026-10-08T11:41:04.37582+00:00',
      payloadBytes: 1234,
      payload,
      payloadSha256: hashB,
    });
  });

  it.each([
    ['a payload that is not text', { payload: 5 }],
    ['no payload', { payload: undefined }],
    ['a hash that is not bytea hex', { payload_sha256: 'xx' }],
    ['another slot than asked for', { slot: 3 }],
    ['another backup than asked for', { backup_id: idA }],
  ])('refuses a row with %s', async (_label, overrides) => {
    await ready();
    stub.respond(() =>
      jsonResponse(200, {
        data: {
          backup_slots: [
            hasuraRow({
              slot: 2,
              backup_id: idB,
              payload: '{}',
              payload_sha256: `\\x${hashB}`,
              ...overrides,
            }),
          ],
        },
      }),
    );

    expect(failureOf(await store.downloadBackup(2, idB))).toEqual({
      kind: 'unexpected-response',
    });
  });
});

describe('what the adapter never does', () => {
  it('never logs, even when the provider answers badly', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    await ready();
    stub.respond(() => new Response('<html>boom</html>', { status: 502 }));
    await store.replaceSlot(write({ payload: 'SECRET-LEARNER-TEXT' }));

    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('puts the payload only in the request variables, never in the document', async () => {
    await ready();
    stub.respond(() => jsonResponse(500, {}));

    await store.replaceSlot(write({ payload: 'SECRET-LEARNER-TEXT' }));

    expect(String(stub.calls[0]?.body?.query)).not.toContain(
      'SECRET-LEARNER-TEXT',
    );
  });
});
