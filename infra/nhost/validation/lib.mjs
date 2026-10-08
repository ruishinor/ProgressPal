// Pure helpers for the owner-run live validation (validate-live.mjs). No I/O,
// no network, no secrets: everything here is unit-tested offline
// (tests/infra/liveValidationLib.test.ts).
import { createHash } from 'node:crypto';

export const REMOTE_PAYLOAD_CEILING_BYTES = 10 * 1024 * 1024;

export const CONSTRAINTS = Object.freeze({
  generationGate: 'backup_slots_generation_gate',
  exactBytesGate: 'backup_slots_exact_bytes_gate',
  payloadCeiling: 'backup_slots_payload_ceiling',
  slotRange: 'backup_slots_slot_range',
  primaryKey: 'backup_slots_pkey',
});

export function sha256Hex(text) {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

/** Hasura bytea literal for a hex digest. */
export function byteaLiteral(hex) {
  return `\\x${hex}`;
}

/**
 * Backup-shaped JSON text of EXACTLY `targetBytes` UTF-8 bytes, containing
 * quotes, newlines and multi-byte characters so the request body is escaped
 * and longer than the payload (like a real GraphQL string variable).
 */
export function makePayload(targetBytes, tag = 'x') {
  const unit = 'ab "q" é\n';
  const envelope = (filler) => ({
    format: 'progresspal-backup',
    formatVersion: 1,
    appVersion: 'live-validation',
    schemaVersion: 4,
    exportedAt: '2026-10-08T00:00:00.000Z',
    tag,
    data: { filler },
  });
  const base = Buffer.byteLength(JSON.stringify(envelope(''), null, 2));
  const unitBytes = Buffer.byteLength(JSON.stringify(unit)) - 2;
  const need = targetBytes - base;

  if (need < 0) {
    throw new RangeError(
      'payload target is smaller than the envelope skeleton',
    );
  }

  const repeats = Math.floor(need / unitBytes);
  const text = JSON.stringify(
    envelope(unit.repeat(repeats) + 'x'.repeat(need - repeats * unitBytes)),
    null,
    2,
  );

  if (Buffer.byteLength(text) !== targetBytes) {
    throw new Error('internal: payload size mismatch');
  }

  return text;
}

/** Aborts the whole run. A transport fault is never a test result. */
export class HarnessAbort extends Error {
  constructor(message) {
    super(message);
    this.name = 'HarnessAbort';
  }
}

/**
 * Classifies one raw HTTP outcome. `kind`:
 *  - transport     no response, or any 5xx (gateway/provider fault)
 *  - rate-limited  HTTP 429
 *  - http-error    any other non-2xx without a GraphQL errors array
 *  - rejection     a JSON body with a GraphQL errors array (database/permission refusal)
 *  - success       a JSON body with data and no errors
 *  - malformed     2xx but not the expected JSON shape
 */
export function classifyHttpOutcome({ status, json, error }) {
  if (error !== undefined || status === undefined || status === null) {
    return {
      kind: 'transport',
      status: status ?? null,
      detail: error ?? 'no response',
    };
  }

  if (status >= 500) {
    return { kind: 'transport', status, detail: `HTTP ${status}` };
  }

  if (status === 429) {
    return { kind: 'rate-limited', status };
  }

  const errors = Array.isArray(json?.errors) ? json.errors : null;

  if (errors !== null && errors.length > 0) {
    const messages = errors.map((e) => String(e?.message ?? ''));
    const constraint =
      messages
        .map(
          (m) =>
            m.match(
              /(?:violates check constraint|unique constraint) "([^"]+)"/,
            )?.[1],
        )
        .find((c) => c !== undefined) ?? null;
    return { kind: 'rejection', status, constraint, messages };
  }

  if (status >= 400) {
    return { kind: 'http-error', status };
  }

  if (typeof json === 'object' && json !== null && 'data' in json) {
    return { kind: 'success', status };
  }

  return { kind: 'malformed', status };
}

/**
 * Judges a negative test. Passes ONLY for a database/permission refusal that
 * names the expected constraint. Transport faults abort the run (the test is
 * inconclusive, not passed); anything else fails.
 */
export function judgeRejection(outcome, expectedConstraint) {
  if (outcome.kind === 'transport') {
    throw new HarnessAbort(
      `transport/gateway fault (${outcome.detail}) where a database rejection was expected: the result is inconclusive`,
    );
  }

  if (outcome.kind === 'rate-limited') {
    throw new HarnessAbort('rate limited: slow the pacing and re-run');
  }

  if (outcome.kind !== 'rejection') {
    return { pass: false, detail: `expected a rejection, got ${outcome.kind}` };
  }

  if (expectedConstraint === null) {
    return { pass: true, detail: 'rejected' };
  }

  return outcome.constraint === expectedConstraint
    ? { pass: true, detail: `rejected by ${expectedConstraint}` }
    : {
        pass: false,
        detail: `rejected, but by ${outcome.constraint ?? 'an unnamed error'}`,
      };
}

/** Positive controls must be a clean success; anything else aborts. */
export function requireSuccess(outcome, label) {
  if (outcome.kind !== 'success') {
    throw new HarnessAbort(
      `positive control "${label}" did not succeed (${outcome.kind}${outcome.detail ? `: ${outcome.detail}` : ''}); negative tests were not run`,
    );
  }
}

/** Byte-for-byte comparison of two slot snapshots (rollback proof). */
export function sameSlots(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const sensitiveKey =
  /^(accessToken|refreshToken|password|newPassword|authorization|x-hasura-admin-secret|cookie|set-cookie)$/i;

/** Redacts known secrets, token-shaped strings and email addresses. */
export function scrubEvidence(value, secrets = []) {
  let text =
    JSON.stringify(
      value,
      (key, v) => (sensitiveKey.test(key) ? '[REDACTED]' : v),
      2,
    ) ?? 'null';

  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length >= 8) {
      text = text.split(secret).join('[REDACTED]');
    }
  }

  return text
    .replace(
      /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g,
      '[JWT]',
    )
    .replace(
      /[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g,
      (m) => `${m[0]}***@${m.split('@')[1]}`,
    );
}
