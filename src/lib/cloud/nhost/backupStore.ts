import type { NhostClient } from '@nhost/nhost-js';

import {
  backupSlotCount,
  parseStoredAt,
  type CloudBackupStore,
  type CloudRequestResult,
  type RemoteBackupDownload,
  type RemoteBackupLookup,
  type RemoteBackupSlot,
  type RemoteBackupWrite,
  type RemoteBackupWritten,
} from '../backupPort';
import { cloudError } from './authErrors';
import {
  classifyCloudRequest,
  type CloudRequestOutcome,
} from './requestFailure';

/**
 * The Nhost implementation of the remote backup store: GraphQL over the SDK's
 * own authenticated client, nothing else. It builds four documents, sends
 * them, classifies what came back with `classifyCloudRequest`, and parses the
 * answer strictly. It makes no decision: no retry, no slot choice, no verdict.
 *
 * Invariants:
 *  - cloud disabled => `getClient` throws `disabled` and nothing is sent;
 *  - signed out => `unauthenticated`, and no anonymous request is sent;
 *  - every value placed in a document is validated first (a slot number, a
 *    UUID); the payload travels only as a GraphQL variable;
 *  - the document for the replacement is the one the live validation
 *    exercised (infra/nhost/validation, `casRequest`);
 *  - nothing is ever logged: not a payload, not a token, not an error body.
 */

export interface NhostBackupStoreDependencies {
  getClient: () => NhostClient;
}

type Row = Record<string, unknown>;

const uuidShape =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const lowercaseSha256Shape = /^[0-9a-f]{64}$/;
const byteaSha256Shape = /^\\x([0-9a-fA-F]{64})$/;

const slotColumns =
  'slot backup_id format_version schema_version app_version exported_at payload_bytes stored_at';

const insertSelection =
  'ins: insert_backup_slots_one(object: $new) { backup_id payload_sha256 stored_at }';

const inventoryDocument = `{ backup_slots(order_by: {slot: asc}) { ${slotColumns} } }`;

function assertSlot(slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= backupSlotCount) {
    throw cloudError('invalid-input');
  }
}

function assertUuid(value: string) {
  if (typeof value !== 'string' || !uuidShape.test(value)) {
    throw cloudError('invalid-input');
  }
}

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER) {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

/** A Hasura `bytea` (`\x` plus 64 hex digits) as lowercase hex, else null. */
function readHash(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.match(byteaSha256Shape);

  return match === null ? null : (match[1] ?? '').toLowerCase();
}

function readIdentity(value: unknown): string | null {
  return typeof value === 'string' && uuidShape.test(value) ? value : null;
}

function readStoredAt(value: unknown): string | null {
  return typeof value === 'string' && parseStoredAt(value) !== null
    ? value
    : null;
}

function readSlotMetadata(row: unknown): RemoteBackupSlot | null {
  if (!isRow(row)) {
    return null;
  }

  const backupId = readIdentity(row.backup_id);
  const storedAt = readStoredAt(row.stored_at);

  if (
    backupId === null ||
    storedAt === null ||
    !isInteger(row.slot, 0, backupSlotCount - 1) ||
    !isInteger(row.format_version, 0) ||
    !isInteger(row.schema_version, 0) ||
    !isInteger(row.payload_bytes, 0) ||
    typeof row.app_version !== 'string' ||
    typeof row.exported_at !== 'string' ||
    row.exported_at === ''
  ) {
    return null;
  }

  return {
    slot: row.slot as number,
    backupId,
    formatVersion: row.format_version as number,
    schemaVersion: row.schema_version as number,
    appVersion: row.app_version,
    exportedAt: row.exported_at,
    storedAt,
    payloadBytes: row.payload_bytes as number,
  };
}

/** A parsed answer, or null when the answer is not the shape that was asked for. */
type Read<T> = (data: Row) => { value: T } | null;

function readInventory(data: Row): { value: RemoteBackupSlot[] } | null {
  const rows = data.backup_slots;

  if (!Array.isArray(rows) || rows.length > backupSlotCount) {
    return null;
  }

  const slots: RemoteBackupSlot[] = [];
  const seenSlots = new Set<number>();
  const seenIds = new Set<string>();

  for (const row of rows) {
    const parsed = readSlotMetadata(row);

    if (
      parsed === null ||
      seenSlots.has(parsed.slot) ||
      seenIds.has(parsed.backupId)
    ) {
      return null;
    }

    seenSlots.add(parsed.slot);
    seenIds.add(parsed.backupId);
    slots.push(parsed);
  }

  return { value: slots };
}

function readWritten(withDelete: boolean): Read<RemoteBackupWritten> {
  return (data) => {
    const ins = data.ins;

    if (!isRow(ins)) {
      return null;
    }

    const backupId = readIdentity(ins.backup_id);
    const payloadSha256 = readHash(ins.payload_sha256);
    const storedAt = readStoredAt(ins.stored_at);

    if (backupId === null || payloadSha256 === null || storedAt === null) {
      return null;
    }

    let deletedRows: number | null = null;

    if (withDelete) {
      const del = data.del;

      if (!isRow(del) || !isInteger(del.affected_rows, 0)) {
        return null;
      }

      deletedRows = del.affected_rows as number;
    }

    return { value: { backupId, payloadSha256, storedAt, deletedRows } };
  };
}

function readLookup(backupId: string): Read<RemoteBackupLookup | null> {
  return (data) => {
    const rows = data.backup_slots;

    if (!Array.isArray(rows) || rows.length > 1) {
      return null;
    }

    if (rows.length === 0) {
      return { value: null };
    }

    const row: unknown = rows[0];

    if (!isRow(row)) {
      return null;
    }

    const payloadSha256 = readHash(row.payload_sha256);
    const storedAt = readStoredAt(row.stored_at);

    if (
      row.backup_id !== backupId ||
      payloadSha256 === null ||
      storedAt === null ||
      !isInteger(row.slot, 0, backupSlotCount - 1)
    ) {
      return null;
    }

    return {
      value: {
        backupId,
        slot: row.slot as number,
        payloadSha256,
        storedAt,
      },
    };
  };
}

function readDownload(
  slot: number,
  backupId: string,
): Read<RemoteBackupDownload | null> {
  return (data) => {
    const rows = data.backup_slots;

    if (!Array.isArray(rows) || rows.length > 1) {
      return null;
    }

    if (rows.length === 0) {
      return { value: null };
    }

    const row: unknown = rows[0];
    const metadata = readSlotMetadata(row);

    if (
      metadata === null ||
      !isRow(row) ||
      metadata.slot !== slot ||
      metadata.backupId !== backupId ||
      typeof row.payload !== 'string'
    ) {
      return null;
    }

    const payloadSha256 = readHash(row.payload_sha256);

    if (payloadSha256 === null) {
      return null;
    }

    return { value: { ...metadata, payload: row.payload, payloadSha256 } };
  };
}

/**
 * What the SDK throws for a response whose JSON body has `errors` (which is
 * how Hasura reports every database refusal, with HTTP 200): a `FetchError`
 * carrying `status` and `body`. Recognised by shape, not by class identity.
 * Anything else thrown (no response, or a body that is not JSON, such as a
 * gateway error page) carries no usable status.
 */
function isFetchFailure(
  error: unknown,
): error is Error & { status: number; body: unknown } {
  return (
    error instanceof Error &&
    typeof (error as { status?: unknown }).status === 'number' &&
    'body' in error
  );
}

function outcomeOfError(error: unknown): CloudRequestOutcome {
  return isFetchFailure(error)
    ? { httpStatus: error.status, body: error.body }
    : { httpStatus: null };
}

export function createNhostBackupStore(
  dependencies: NhostBackupStoreDependencies,
): CloudBackupStore {
  async function execute<T>(
    query: string,
    variables: Record<string, unknown> | undefined,
    read: Read<T>,
  ): Promise<CloudRequestResult<T>> {
    // Throws `disabled` when cloud is off: that is a precondition, not a result.
    const client = dependencies.getClient();

    if (client.getUserSession() === null) {
      return { ok: false, failure: { kind: 'unauthenticated' } };
    }

    let outcome: CloudRequestOutcome;

    try {
      const response = await client.graphql.request({ query, variables });

      outcome = { httpStatus: response.status, body: response.body };
    } catch (error) {
      outcome = outcomeOfError(error);
    }

    const failure = classifyCloudRequest(outcome);

    if (failure !== null) {
      return { ok: false, failure };
    }

    const data = (outcome.body as { data?: unknown } | undefined)?.data;
    const parsed = isRow(data) ? read(data) : null;

    return parsed === null
      ? { ok: false, failure: { kind: 'unexpected-response' } }
      : { ok: true, value: parsed.value };
  }

  return {
    listSlots() {
      return execute(inventoryDocument, undefined, readInventory);
    },

    async replaceSlot(write: RemoteBackupWrite) {
      assertSlot(write.slot);
      assertUuid(write.backupId);

      if (write.observedBackupId !== null) {
        assertUuid(write.observedBackupId);
      }

      if (!lowercaseSha256Shape.test(write.expectedSha256)) {
        throw cloudError('invalid-input');
      }

      const deletePart =
        write.observedBackupId === null
          ? ''
          : `del: delete_backup_slots(where: {slot: {_eq: ${write.slot}}, backup_id: {_eq: "${write.observedBackupId}"}}) { affected_rows } `;

      return await execute(
        `mutation Cas($new: backup_slots_insert_input!) { ${deletePart}${insertSelection} }`,
        {
          new: {
            slot: write.slot,
            backup_id: write.backupId,
            format_version: write.formatVersion,
            schema_version: write.schemaVersion,
            app_version: write.appVersion,
            exported_at: write.exportedAt,
            payload: write.payload,
            expected_sha256: `\\x${write.expectedSha256}`,
          },
        },
        readWritten(write.observedBackupId !== null),
      );
    },

    async findBackup(backupId: string) {
      assertUuid(backupId);

      return await execute(
        `{ backup_slots(where: {backup_id: {_eq: "${backupId}"}}) { slot backup_id payload_sha256 stored_at } }`,
        undefined,
        readLookup(backupId),
      );
    },

    async downloadBackup(slot: number, backupId: string) {
      assertSlot(slot);
      assertUuid(backupId);

      return await execute(
        `{ backup_slots(where: {slot: {_eq: ${slot}}, backup_id: {_eq: "${backupId}"}}) { ${slotColumns} payload payload_sha256 } }`,
        undefined,
        readDownload(slot, backupId),
      );
    },
  };
}
