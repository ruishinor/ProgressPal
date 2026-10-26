/**
 * Stable names of the database objects the Stage-1 remote backup table is
 * built from. They exist so that, with the provider's `devMode` off (the
 * hardened baseline), a refused write is still identifiable by name. The SQL
 * under infra/nhost uses exactly these names; tests/infra pins the match.
 */
export const backupTableName = 'backup_slots';

export const backupConstraintNames = {
  generationGate: 'backup_slots_generation_gate',
  exactBytesGate: 'backup_slots_exact_bytes_gate',
  payloadCeiling: 'backup_slots_payload_ceiling',
  slotRange: 'backup_slots_slot_range',
  primaryKey: 'backup_slots_pkey',
  backupIdUnique: 'backup_slots_backup_id_key',
} as const;

/** Remote payload ceiling (UTF-8 bytes). The local 25 MiB file limit is unrelated. */
export const remoteBackupPayloadCeilingBytes = 10 * 1024 * 1024;

/** Candidate generation; provider migration is prepared locally, not applied. */
export const acceptedBackupGeneration = {
  formatVersion: 1,
  schemaVersion: 5,
} as const;
