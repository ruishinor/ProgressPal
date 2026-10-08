import { describe, expect, it } from 'vitest';

import { classifyCloudRequest } from '@/lib/cloud';
import { backupConstraintNames } from '@/lib/cloud/nhost/backupConstraints';

const rejection = (message: string, code = 'permission-error') => ({
  errors: [{ message, extensions: { code, path: '$.selectionSet' } }],
});
const check = (name: string) =>
  `Check constraint violation. new row for relation "backup_slots" violates check constraint "${name}"`;

describe('classifyCloudRequest: provider faults versus database refusals', () => {
  it.each([[500], [502], [503], [504], [599]])(
    'HTTP %i is the provider failing, never a rejection',
    (httpStatus) => {
      expect(classifyCloudRequest({ httpStatus, body: undefined })).toEqual({
        kind: 'provider-unavailable',
        httpStatus,
      });
    },
  );

  it('a 5xx stays a provider fault even if its body looks like a constraint refusal', () => {
    expect(
      classifyCloudRequest({
        httpStatus: 502,
        body: rejection(check(backupConstraintNames.exactBytesGate)),
      }),
    ).toEqual({ kind: 'provider-unavailable', httpStatus: 502 });
  });

  it('no response at all is a provider fault with no status', () => {
    expect(classifyCloudRequest({ httpStatus: null })).toEqual({
      kind: 'provider-unavailable',
      httpStatus: null,
    });
  });

  it('separates rate limiting and authentication failures', () => {
    expect(classifyCloudRequest({ httpStatus: 429 })).toEqual({
      kind: 'rate-limited',
    });
    expect(classifyCloudRequest({ httpStatus: 401 })).toEqual({
      kind: 'unauthenticated',
    });
    expect(
      classifyCloudRequest({
        httpStatus: 200,
        body: rejection('Could not verify JWT', 'invalid-jwt'),
      }),
    ).toEqual({ kind: 'unauthenticated' });
  });

  it.each([
    [backupConstraintNames.generationGate, 'unsupported-generation'],
    [backupConstraintNames.exactBytesGate, 'integrity-mismatch'],
    [backupConstraintNames.payloadCeiling, 'payload-too-large'],
    [backupConstraintNames.slotRange, 'slot-out-of-range'],
  ])(
    'names the refusing constraint %s as %s (HTTP 200, devMode off, no internal key)',
    (constraint, reason) => {
      expect(
        classifyCloudRequest({
          httpStatus: 200,
          body: rejection(check(constraint)),
        }),
      ).toEqual({ kind: 'rejected', reason, constraint });
    },
  );

  it('the two gates are distinguishable from each other and from other refusals', () => {
    const generation = classifyCloudRequest({
      httpStatus: 200,
      body: rejection(check(backupConstraintNames.generationGate)),
    });
    const hash = classifyCloudRequest({
      httpStatus: 200,
      body: rejection(check(backupConstraintNames.exactBytesGate)),
    });
    const other = classifyCloudRequest({
      httpStatus: 200,
      body: rejection(check('some_other_check')),
    });

    expect(generation).not.toEqual(hash);
    expect(other).toEqual({
      kind: 'rejected',
      reason: 'other-constraint',
      constraint: 'some_other_check',
    });
  });

  it.each([
    backupConstraintNames.primaryKey,
    backupConstraintNames.backupIdUnique,
  ])(
    'a duplicate on %s is a slot conflict (lost race), not a gate',
    (constraint) => {
      expect(
        classifyCloudRequest({
          httpStatus: 200,
          body: rejection(
            `Uniqueness violation. duplicate key value violates unique constraint "${constraint}"`,
            'constraint-violation',
          ),
        }),
      ).toEqual({ kind: 'rejected', reason: 'slot-conflict', constraint });
    },
  );

  it('a generic, unnamed provider error is not mistaken for a rejection', () => {
    expect(
      classifyCloudRequest({
        httpStatus: 200,
        body: rejection('database query error', 'unexpected'),
      }),
    ).toEqual({ kind: 'unexpected-response' });
  });

  it('succeeds only for a JSON body without errors at HTTP 200', () => {
    expect(
      classifyCloudRequest({
        httpStatus: 200,
        body: { data: { ins: { backup_id: 'x' } } },
      }),
    ).toBeNull();
    expect(classifyCloudRequest({ httpStatus: 200, body: 'not json' })).toEqual(
      { kind: 'unexpected-response' },
    );
    expect(classifyCloudRequest({ httpStatus: 200, body: undefined })).toEqual({
      kind: 'unexpected-response',
    });
    expect(
      classifyCloudRequest({ httpStatus: 404, body: { data: {} } }),
    ).toEqual({ kind: 'unexpected-response' });
  });
});
