import { createHash } from 'node:crypto';

import {
  backupConstraintNames,
  type CloudBackupStore,
  type CloudRequestFailure,
  type CloudRequestResult,
  type RemoteBackupDownload,
  type RemoteBackupLookup,
  type RemoteBackupSlot,
  type RemoteBackupWrite,
  type RemoteBackupWritten,
} from '@/lib/cloud';

/**
 * An in-memory model of the Stage-1 table behind the store port, faithful to
 * the rules the live validation proved (one row per slot, a unique backup id,
 * the generation gate, the exact-bytes gate, the 10 MiB ceiling, the slot
 * range, delete-and-insert in one transaction, a server-set `stored_at`), with
 * scripted faults for the cases a unit test must force: a refused request, a
 * write that COMMITS and then loses its answer, and another writer who gets
 * there first. It is a test double; it proves the domain logic, not the
 * provider.
 */

export const sha256Of = (text: string) =>
  createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

export type StoreMethod =
  | 'listSlots'
  | 'replaceSlot'
  | 'findBackup'
  | 'downloadBackup';

export type Fault =
  /** Lets this request run normally (to script a later one differently). */
  | { kind: 'pass' }
  /** The request has no effect and fails as described. */
  | { kind: 'fail'; failure: CloudRequestFailure }
  /** The request takes effect, then its answer is lost as described. */
  | { kind: 'commit-then-fail'; failure: CloudRequestFailure }
  /** Another writer acts first; then the request runs normally. */
  | { kind: 'race'; run: (store: FakeBackupStore) => void }
  /** The store itself throws (a precondition such as `disabled`). */
  | { kind: 'throw'; error: Error };

export const gatewayFault: CloudRequestFailure = {
  kind: 'provider-unavailable',
  httpStatus: 502,
};
export const networkFault: CloudRequestFailure = {
  kind: 'provider-unavailable',
  httpStatus: null,
};

const ceilingBytes = 10 * 1024 * 1024;

export class FakeBackupStore implements CloudBackupStore {
  readonly rows = new Map<number, RemoteBackupDownload>();
  /** Every request the store received, in order. */
  readonly requests: Array<{ method: StoreMethod; argument: unknown }> = [];
  /** The accepted generation pair (the table's named gate). */
  generation = { formatVersion: 1, schemaVersion: 5 };
  /** Makes the server derive a different hash than the real one (provider drift). */
  hashDrift = false;

  private tick = 0;
  private readonly faults: Record<StoreMethod, Fault[]> = {
    listSlots: [],
    replaceSlot: [],
    findBackup: [],
    downloadBackup: [],
  };

  fault(method: StoreMethod, ...faults: Fault[]) {
    this.faults[method].push(...faults);

    return this;
  }

  count(method: StoreMethod) {
    return this.requests.filter((request) => request.method === method).length;
  }

  nextStoredAt() {
    this.tick += 1;

    return `2026-10-08T12:00:00.${String(this.tick).padStart(6, '0')}+00:00`;
  }

  /** Another device's earlier backup, as the server would have stored it. */
  seed(
    slot: number,
    overrides: Partial<RemoteBackupDownload> & { payload?: string } = {},
  ) {
    const payload = overrides.payload ?? `seeded payload ${slot}`;
    const row: RemoteBackupDownload = {
      slot,
      backupId: `00000000-0000-4000-8000-00000000000${slot}`,
      formatVersion: 1,
      schemaVersion: 5,
      appVersion: '1.7.1',
      exportedAt: '2026-10-01T00:00:00.000Z',
      storedAt: this.nextStoredAt(),
      payloadBytes: Buffer.byteLength(payload, 'utf8'),
      payload,
      payloadSha256: sha256Of(payload),
      ...overrides,
    };

    this.rows.set(slot, row);

    return row;
  }

  private take(method: StoreMethod, argument: unknown): Fault | null {
    this.requests.push({ method, argument });

    const fault = this.faults[method].shift() ?? null;

    if (fault?.kind === 'throw') {
      throw fault.error;
    }

    if (fault?.kind === 'race') {
      fault.run(this);
    }

    return fault;
  }

  private metadata(row: RemoteBackupDownload): RemoteBackupSlot {
    return {
      slot: row.slot,
      backupId: row.backupId,
      formatVersion: row.formatVersion,
      schemaVersion: row.schemaVersion,
      appVersion: row.appVersion,
      exportedAt: row.exportedAt,
      storedAt: row.storedAt,
      payloadBytes: row.payloadBytes,
    };
  }

  private refused(fault: Fault | null): CloudRequestResult<never> | null {
    return fault?.kind === 'fail'
      ? { ok: false, failure: fault.failure }
      : null;
  }

  async listSlots(): Promise<CloudRequestResult<RemoteBackupSlot[]>> {
    const fault = this.take('listSlots', undefined);
    const refused = this.refused(fault);

    if (refused !== null) {
      return refused;
    }

    return {
      ok: true,
      value: [...this.rows.values()]
        .sort((a, b) => a.slot - b.slot)
        .map((row) => this.metadata(row)),
    };
  }

  async replaceSlot(
    write: RemoteBackupWrite,
  ): Promise<CloudRequestResult<RemoteBackupWritten>> {
    const fault = this.take('replaceSlot', write);
    const refused = this.refused(fault);

    if (refused !== null) {
      return refused;
    }

    const result = this.applyWrite(write);

    if (result.ok && fault?.kind === 'commit-then-fail') {
      return { ok: false, failure: fault.failure };
    }

    return result;
  }

  private reject(
    reason:
      | 'unsupported-generation'
      | 'integrity-mismatch'
      | 'payload-too-large'
      | 'slot-out-of-range'
      | 'slot-conflict',
    constraint: string,
  ): CloudRequestResult<never> {
    return { ok: false, failure: { kind: 'rejected', reason, constraint } };
  }

  /** One transaction: any refusal restores the rows exactly as they were. */
  private applyWrite(
    write: RemoteBackupWrite,
  ): CloudRequestResult<RemoteBackupWritten> {
    const before = new Map(this.rows);
    const bytes = Buffer.byteLength(write.payload, 'utf8');
    const rollback = (refusal: CloudRequestResult<never>) => {
      this.rows.clear();
      for (const [slot, row] of before) this.rows.set(slot, row);

      return refusal;
    };

    let deletedRows: number | null = null;

    if (write.observedBackupId !== null) {
      const occupant = this.rows.get(write.slot);

      deletedRows = occupant?.backupId === write.observedBackupId ? 1 : 0;

      if (deletedRows === 1) {
        this.rows.delete(write.slot);
      }
    }

    if (write.expectedSha256 !== sha256Of(write.payload)) {
      return rollback(
        this.reject('integrity-mismatch', backupConstraintNames.exactBytesGate),
      );
    }

    if (
      write.formatVersion !== this.generation.formatVersion ||
      write.schemaVersion !== this.generation.schemaVersion
    ) {
      return rollback(
        this.reject(
          'unsupported-generation',
          backupConstraintNames.generationGate,
        ),
      );
    }

    if (bytes > ceilingBytes) {
      return rollback(
        this.reject('payload-too-large', backupConstraintNames.payloadCeiling),
      );
    }

    if (!(write.slot >= 0 && write.slot <= 4)) {
      return rollback(
        this.reject('slot-out-of-range', backupConstraintNames.slotRange),
      );
    }

    if (this.rows.has(write.slot)) {
      return rollback(
        this.reject('slot-conflict', backupConstraintNames.primaryKey),
      );
    }

    if (
      [...this.rows.values()].some((row) => row.backupId === write.backupId)
    ) {
      return rollback(
        this.reject('slot-conflict', backupConstraintNames.backupIdUnique),
      );
    }

    const storedAt = this.nextStoredAt();
    const payloadSha256 = this.hashDrift
      ? sha256Of(`${write.payload} drifted`)
      : sha256Of(write.payload);

    this.rows.set(write.slot, {
      slot: write.slot,
      backupId: write.backupId,
      formatVersion: write.formatVersion,
      schemaVersion: write.schemaVersion,
      appVersion: write.appVersion,
      exportedAt: write.exportedAt,
      storedAt,
      payloadBytes: bytes,
      payload: write.payload,
      payloadSha256,
    });

    return {
      ok: true,
      value: { backupId: write.backupId, payloadSha256, storedAt, deletedRows },
    };
  }

  async findBackup(
    backupId: string,
  ): Promise<CloudRequestResult<RemoteBackupLookup | null>> {
    const fault = this.take('findBackup', backupId);
    const refused = this.refused(fault);

    if (refused !== null) {
      return refused;
    }

    const row = [...this.rows.values()].find(
      (item) => item.backupId === backupId,
    );

    return {
      ok: true,
      value:
        row === undefined
          ? null
          : {
              backupId: row.backupId,
              slot: row.slot,
              payloadSha256: row.payloadSha256,
              storedAt: row.storedAt,
            },
    };
  }

  async downloadBackup(
    slot: number,
    backupId: string,
  ): Promise<CloudRequestResult<RemoteBackupDownload | null>> {
    const fault = this.take('downloadBackup', { slot, backupId });
    const refused = this.refused(fault);

    if (refused !== null) {
      return refused;
    }

    const row = this.rows.get(slot);

    return {
      ok: true,
      value: row?.backupId === backupId ? { ...row } : null,
    };
  }
}
