import {
  buildBackupEnvelope,
  serializeBackupEnvelope,
  type BackupData,
} from '@/lib/backup';
import { sha256Hex } from '@/lib/validation';

export { sha256Hex };

/**
 * The payload of one cloud backup: the exact text the local file backup would
 * contain, and the hash of exactly that text.
 */
export interface ProducedPayload {
  /** The serialised envelope, unchanged from here to the request body. */
  contents: string;
  /** UTF-8 bytes of `contents`. */
  byteLength: number;
  /** SHA-256 of the UTF-8 bytes of `contents`, lowercase hex. */
  sha256: string;
  exportedAt: string;
}

/**
 * Uses the existing export untouched: the same envelope builder and the same
 * serialiser (default indentation, default limit) that write the local file.
 * Nothing here re-serialises, minifies or normalises, because the hash and the
 * stored text must both be the very string the learner could have exported.
 */
export async function produceBackupPayload(input: {
  data: BackupData;
  appVersion: string;
  schemaVersion: number;
  exportedAt: string;
}): Promise<ProducedPayload> {
  const { contents, byteLength } = serializeBackupEnvelope(
    buildBackupEnvelope(input.data, {
      appVersion: input.appVersion,
      schemaVersion: input.schemaVersion,
      exportedAt: input.exportedAt,
    }),
  );

  return {
    contents,
    byteLength,
    sha256: await sha256Hex(contents),
    exportedAt: input.exportedAt,
  };
}
