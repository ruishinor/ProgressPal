import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

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
} from '../../infra/nhost/validation/lib.mjs';
import {
  backupConstraintNames,
  remoteBackupPayloadCeilingBytes,
} from '@/lib/cloud/nhost/backupConstraints';

const rejection = (constraint: string) => ({
  errors: [
    {
      message: `Check constraint violation. new row for relation "backup_slots" violates check constraint "${constraint}"`,
    },
  ],
});

describe('the harness agrees with the application and the schema', () => {
  it('uses the same constraint names and ceiling', () => {
    expect(CONSTRAINTS.generationGate).toBe(
      backupConstraintNames.generationGate,
    );
    expect(CONSTRAINTS.exactBytesGate).toBe(
      backupConstraintNames.exactBytesGate,
    );
    expect(CONSTRAINTS.payloadCeiling).toBe(
      backupConstraintNames.payloadCeiling,
    );
    expect(CONSTRAINTS.slotRange).toBe(backupConstraintNames.slotRange);
    expect(CONSTRAINTS.primaryKey).toBe(backupConstraintNames.primaryKey);
    expect(REMOTE_PAYLOAD_CEILING_BYTES).toBe(remoteBackupPayloadCeilingBytes);
  });
});

describe('transport faults are never test results (fail-closed on 5xx)', () => {
  it.each([500, 502, 503, 504])(
    'HTTP %i classifies as transport and aborts a negative test',
    (status) => {
      const outcome = classifyHttpOutcome({
        status,
        json: rejection(CONSTRAINTS.exactBytesGate),
      });

      expect(outcome.kind).toBe('transport');
      expect(() => judgeRejection(outcome, CONSTRAINTS.exactBytesGate)).toThrow(
        HarnessAbort,
      );
    },
  );

  it('a dropped connection or a non-JSON gateway page is transport/inconclusive too', () => {
    expect(classifyHttpOutcome({ error: 'TypeError: fetch failed' }).kind).toBe(
      'transport',
    );
    expect(classifyHttpOutcome({ status: null }).kind).toBe('transport');
    expect(classifyHttpOutcome({ status: 200, json: undefined }).kind).toBe(
      'malformed',
    );
    expect(
      judgeRejection(
        classifyHttpOutcome({ status: 200, json: undefined }),
        CONSTRAINTS.exactBytesGate,
      ).pass,
    ).toBe(false);
  });

  it('rate limiting aborts rather than passing', () => {
    expect(() =>
      judgeRejection(classifyHttpOutcome({ status: 429 }), null),
    ).toThrow(HarnessAbort);
  });

  it('a positive control that is not a clean success aborts before any negative test', () => {
    expect(() =>
      requireSuccess(classifyHttpOutcome({ status: 502 }), 'P1'),
    ).toThrow(/negative tests were not run/);
    expect(() =>
      requireSuccess(
        classifyHttpOutcome({
          status: 200,
          json: rejection(CONSTRAINTS.slotRange),
        }),
        'P1',
      ),
    ).toThrow(HarnessAbort);
    expect(() =>
      requireSuccess(
        classifyHttpOutcome({ status: 200, json: { data: {} } }),
        'P1',
      ),
    ).not.toThrow();
  });
});

describe('a negative test passes only for the NAMED database refusal', () => {
  it('passes when the expected constraint refused the write', () => {
    const outcome = classifyHttpOutcome({
      status: 200,
      json: rejection(CONSTRAINTS.generationGate),
    });

    expect(outcome).toMatchObject({
      kind: 'rejection',
      constraint: CONSTRAINTS.generationGate,
    });
    expect(judgeRejection(outcome, CONSTRAINTS.generationGate).pass).toBe(true);
  });

  it('fails when a different constraint refused it (the two gates must not be conflated)', () => {
    const outcome = classifyHttpOutcome({
      status: 200,
      json: rejection(CONSTRAINTS.exactBytesGate),
    });

    expect(judgeRejection(outcome, CONSTRAINTS.generationGate).pass).toBe(
      false,
    );
  });

  it('fails when the write succeeded, and when the error is unnamed', () => {
    expect(
      judgeRejection(
        classifyHttpOutcome({ status: 200, json: { data: { ins: {} } } }),
        CONSTRAINTS.exactBytesGate,
      ).pass,
    ).toBe(false);
    expect(
      judgeRejection(
        classifyHttpOutcome({
          status: 200,
          json: { errors: [{ message: 'database query error' }] },
        }),
        CONSTRAINTS.exactBytesGate,
      ).pass,
    ).toBe(false);
  });

  it('recognises a unique-key refusal (lost race) by name', () => {
    const outcome = classifyHttpOutcome({
      status: 200,
      json: {
        errors: [
          {
            message: `Uniqueness violation. duplicate key value violates unique constraint "${CONSTRAINTS.primaryKey}"`,
          },
        ],
      },
    });

    expect(judgeRejection(outcome, CONSTRAINTS.primaryKey).pass).toBe(true);
  });

  it('accepts any GraphQL refusal where no constraint is expected (validation / permission)', () => {
    const outcome = classifyHttpOutcome({
      status: 200,
      json: { errors: [{ message: "field 'user_id' not found in type" }] },
    });

    expect(judgeRejection(outcome, null).pass).toBe(true);
  });
});

describe('payload generator', () => {
  it.each([
    4096,
    262144,
    1048576,
    REMOTE_PAYLOAD_CEILING_BYTES,
    REMOTE_PAYLOAD_CEILING_BYTES + 1,
  ])('produces valid JSON of exactly %i UTF-8 bytes', (bytes) => {
    const text = makePayload(bytes, 't');

    expect(Buffer.byteLength(text)).toBe(bytes);
    expect(() => JSON.parse(text)).not.toThrow();
  });

  it('inflates when sent as a GraphQL string variable, like a real backup', () => {
    const text = makePayload(65536);
    const body = JSON.stringify({
      query: 'q',
      variables: { new: { payload: text } },
    });

    expect(Buffer.byteLength(body) / 65536).toBeGreaterThan(1.3);
  });

  it('is deterministic per tag and distinct across tags', () => {
    expect(makePayload(4096, 'a')).toBe(makePayload(4096, 'a'));
    expect(sha256Hex(makePayload(4096, 'a'))).not.toBe(
      sha256Hex(makePayload(4096, 'b')),
    );
  });

  it('refuses a target smaller than the envelope skeleton', () => {
    expect(() => makePayload(10)).toThrow(RangeError);
  });

  it('hashes UTF-8 bytes (not UTF-16 code units) and formats a bytea literal', () => {
    // SHA-256 of the two UTF-8 bytes c3 a9 (the value the live spike matched on the server).
    expect(sha256Hex('é')).toBe(
      '4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c',
    );
    expect(byteaLiteral('ab')).toBe('\\xab');
  });
});

describe('evidence redaction', () => {
  it('removes tokens, passwords, secrets and email addresses', () => {
    const text = scrubEvidence(
      {
        accessToken: 'abc',
        note: 'user jane.doe@example.com password hunter2hunter2 jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkw.sig',
      },
      ['hunter2hunter2'],
    );

    expect(text).not.toContain('jane.doe');
    expect(text).not.toContain('hunter2hunter2');
    expect(text).not.toContain('eyJhbGci');
    expect(text).toContain('[REDACTED]');
    expect(text).toContain('[JWT]');
  });

  it('compares slot snapshots byte for byte', () => {
    expect(
      sameSlots([{ slot: 1, stored_at: 'x' }], [{ slot: 1, stored_at: 'x' }]),
    ).toBe(true);
    expect(
      sameSlots([{ slot: 1, stored_at: 'x' }], [{ slot: 1, stored_at: 'y' }]),
    ).toBe(false);
  });
});

describe('the runner script obeys the harness rules', () => {
  // Compared with all whitespace removed so code formatting cannot change the result.
  const squash = (text: string) => text.replace(/\s+/g, '');
  const source = squash(
    readFileSync(
      path.join(process.cwd(), 'infra/nhost/validation/validate-live.mjs'),
      'utf8',
    ),
  );

  it('runs every positive control before the first negative test', () => {
    const firstNegative = source.indexOf(
      squash("await negative('T7-lost-race'"),
    );

    expect(firstNegative).toBeGreaterThan(-1);
    for (const control of ['P1', 'P2', 'P3', 'P4']) {
      const at = source.indexOf(squash(`record('${control}'`));
      expect(at, control).toBeGreaterThan(-1);
      expect(at, control).toBeLessThan(firstNegative);
    }
  });

  it('judges negatives through judgeRejection and never by status alone', () => {
    // (a trailing comma may or may not be present after formatting)
    expect(source).toMatch(
      /judgeRejection\(classifyHttpOutcome\(response\),expectedConstraint,?\)/,
    );
    expect(source).not.toMatch(/status(>=|===|!==)[45]\d\d\?(pass|true)/);
  });

  it('contacts only the project hosts, paces requests, and never logs credentials', () => {
    expect(source).toContain('ALLOWED_HOSTS');
    expect(source).toContain(squash('800 - (Date.now() - lastRequestAt)'));
    expect(source).not.toMatch(
      /console\.(log|error)\([^)]*(password|token|secret)/i,
    );
    expect(source).not.toContain('NHOST_ADMIN_SECRET');
    expect(source).toContain(squash('scrubEvidence(summary, secrets)'));
  });
});
