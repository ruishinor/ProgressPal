import { describe, expect, it } from 'vitest';

import {
  CloudError,
  type CloudEmailLinkOutcome,
  type CloudErrorCode,
  type CloudRequestFailure,
} from '@/lib/cloud';
import type {
  CloudBackupOutcome,
  CloudInventoryResult,
  ConfirmRestoreResult,
  InventorySlot,
  NotStoredReason,
  PrepareRefusal,
  PrepareRestoreResult,
} from '@/lib/cloudBackup';

import {
  breakablePieces,
  checkNewPassword,
  cloudCardTitle,
  describeBackupOutcome,
  describeCallbackFailure,
  describeCallbackOutcome,
  describeCloudError,
  describeConfirmRefusal,
  describeFailure,
  describeInventory,
  describePasswordChangeFailure,
  describePasswordResetRequestError,
  describePrepareRefusal,
  formatBytes,
  formatStoredAt,
  invalidResetAddress,
  inventoryScopeNote,
  isPlausibleEmail,
  newPasswordText,
  passwordChangedView,
  passwordResetSent,
  remoteBackupDisclosure,
  resetRequestText,
} from '@/features/settings/cloudModel';

/**
 * Everything the learner reads about the cloud comes from this model, so the
 * rules that protect them from invented confidence are pinned here, over every
 * outcome, not over a sample.
 */

const failures: CloudRequestFailure[] = [
  { kind: 'provider-unavailable', httpStatus: null },
  { kind: 'provider-unavailable', httpStatus: 502 },
  { kind: 'rate-limited' },
  { kind: 'unauthenticated' },
  { kind: 'rejected', reason: 'other-constraint', constraint: 'c' },
  { kind: 'unexpected-response' },
];

const slot = (n: number, compatible = true): InventorySlot => ({
  slot: n,
  backupId: `00000000-0000-4000-8000-00000000000${n}`,
  formatVersion: compatible ? 1 : 2,
  schemaVersion: 4,
  appVersion: '1.7.1',
  exportedAt: '2026-10-01T00:00:00.000Z',
  storedAt: `2026-10-08T12:00:00.0000${n}+00:00`,
  payloadBytes: 1_258_291,
  compatible,
});

const notStoredReasons: NotStoredReason[] = [
  'local-export-failed',
  'payload-over-remote-ceiling',
  'inventory-unavailable',
  'unauthenticated',
  'rate-limited',
  'unsupported-generation',
  'integrity-mismatch',
  'payload-too-large',
  'slot-out-of-range',
  'other-constraint',
  'lost-race',
];

const attempt = {
  backupId: '00000000-0000-4000-8000-0000000000aa',
  expectedSha256: 'ab'.repeat(32),
  slot: 2,
  payloadBytes: 1000,
};

const backupOutcomes: CloudBackupOutcome[] = [
  {
    kind: 'stored',
    reconciled: false,
    backup: {
      backupId: attempt.backupId,
      slot: 0,
      storedAt: '2026-10-08T12:00:00.37582+00:00',
      payloadSha256: 'cd'.repeat(32),
      payloadBytes: 340_000,
      replacedBackupId: null,
    },
  },
  {
    kind: 'stored',
    reconciled: true,
    backup: {
      backupId: attempt.backupId,
      slot: 4,
      storedAt: '2026-10-08T12:00:00Z',
      payloadSha256: 'cd'.repeat(32),
      payloadBytes: 10,
      replacedBackupId: '00000000-0000-4000-8000-0000000000bb',
    },
  },
  ...notStoredReasons.flatMap((reason) =>
    [null, ...failures].map(
      (failure): CloudBackupOutcome => ({
        kind: 'not-stored',
        reason,
        failure,
      }),
    ),
  ),
  ...(['absent', 'unreachable'] as const).map(
    (lastCheck): CloudBackupOutcome => ({
      kind: 'outcome-unknown',
      attempt,
      lastCheck,
      failure: null,
    }),
  ),
  {
    kind: 'integrity-violation',
    diagnostics: {
      backupId: attempt.backupId,
      slot: 1,
      expectedHashPrefix: 'abababab',
      storedHashPrefix: 'cdcdcdcd',
    },
    inventory: null,
  },
  { kind: 'busy' },
];

const prepareRefusals: PrepareRestoreResult[] = [
  ...(
    [
      'unavailable',
      'slot-changed',
      'incompatible',
      'hash-mismatch',
      'verification-unavailable',
      'invalid-backup',
      'local-state-unreadable',
    ] as PrepareRefusal[]
  ).flatMap((reason) =>
    [null, ...failures].map(
      (failure): PrepareRestoreResult => ({
        kind: 'refused',
        reason,
        failure,
        message:
          reason === 'invalid-backup' ? 'Synthetic parser diagnostic' : null,
      }),
    ),
  ),
  { kind: 'busy' },
];

const confirmRefusals: Exclude<ConfirmRestoreResult, { kind: 'restored' }>[] = [
  { kind: 'refused', reason: 'not-prepared' },
  { kind: 'refused', reason: 'acknowledgement-required' },
  { kind: 'refused', reason: 'local-state-unreadable' },
  { kind: 'failed', reason: 'local-write-blocked' },
  { kind: 'failed', reason: 'restore-failed' },
  { kind: 'busy' },
];

const inventories: CloudInventoryResult[] = [
  { kind: 'ok', slots: [], facts: { kind: 'no-remote-backups' } },
  {
    kind: 'ok',
    slots: [slot(0, false)],
    facts: {
      kind: 'no-compatible-backup',
      slotCount: 1,
      newest: slot(0, false),
    },
  },
  {
    kind: 'ok',
    slots: [slot(0), slot(1)],
    facts: {
      kind: 'has-compatible-backup',
      latestCompatible: slot(1),
      newerIncompatible: null,
    },
  },
  {
    kind: 'ok',
    slots: [slot(0), slot(3, false)],
    facts: {
      kind: 'has-compatible-backup',
      latestCompatible: slot(0),
      newerIncompatible: slot(3, false),
    },
  },
  ...failures.map(
    (failure): CloudInventoryResult => ({ kind: 'unavailable', failure }),
  ),
];

/** Every code the port can throw; a new code makes this fail to compile. */
const errorCodes: Record<CloudErrorCode, true> = {
  disabled: true,
  'invalid-state': true,
  'invalid-input': true,
  'invalid-credentials': true,
  'unverified-email': true,
  'email-in-use': true,
  'not-permitted': true,
  'rate-limited': true,
  'link-expired': true,
  'session-ended': true,
  unavailable: true,
  unsupported: true,
  unknown: true,
};
const everyErrorCode = Object.keys(errorCodes) as CloudErrorCode[];

const callbackOutcomes: CloudEmailLinkOutcome[] = [
  { kind: 'verified-signed-in' },
  { kind: 'password-reset-session' },
  { kind: 'sign-in-required', purpose: 'signup' },
  { kind: 'sign-in-required', purpose: 'reset' },
  { kind: 'sign-in-required', purpose: 'unknown' },
  { kind: 'invalid-link' },
];

/** Every sentence the model can produce for the cases above. */
function everySentence(): string[] {
  const text: string[] = [];
  const notice = (n: { title: string; lines: string[] }) =>
    text.push(n.title, ...n.lines);

  backupOutcomes.forEach((outcome) => notice(describeBackupOutcome(outcome)));
  prepareRefusals.forEach((result) => {
    if (result.kind !== 'ready') notice(describePrepareRefusal(result));
  });
  confirmRefusals.forEach((result) => notice(describeConfirmRefusal(result)));
  failures.forEach((failure) => text.push(describeFailure(failure)));
  text.push(describeFailure(null), inventoryScopeNote);
  inventories.forEach((inventory) => {
    const view = describeInventory(inventory);

    text.push(view.summary);
    if (view.kind === 'ok') {
      view.rows.forEach((row) => text.push(row.label, row.choice, row.detail));
    }
  });
  [true, false].forEach((signedIn) =>
    callbackOutcomes.forEach((outcome) => {
      const view = describeCallbackOutcome(outcome, signedIn);

      if (view.kind === 'done') text.push(view.title, view.detail);
    }),
  );
  [
    new CloudError('disabled', 'x'),
    new CloudError(
      'link-expired',
      'This link has expired or was already used.',
    ),
    new CloudError('unavailable', 'The cloud service could not be reached.'),
    new Error('boom'),
    'not an error',
  ].forEach((error) => {
    const view = describeCallbackFailure(error);

    if (view.kind === 'done') text.push(view.title, view.detail);
    text.push(describeCloudError(error));
  });

  // Epic G repair 01: the heading, the disclosure and the whole recovery journey.
  text.push(cloudCardTitle, ...remoteBackupDisclosure);
  text.push(
    ...Object.values(resetRequestText),
    ...Object.values(newPasswordText),
  );
  notice(passwordResetSent);
  notice(invalidResetAddress);
  for (const code of everyErrorCode) {
    const request = describePasswordResetRequestError(
      new CloudError(code, `provider says ${code}`),
    );

    if (request.kind === 'failed') notice(request.notice);

    const change = describePasswordChangeFailure(new CloudError(code, 'x'));

    if (change.kind === 'retry') notice(change.notice);
    else if (change.view.kind === 'done') {
      text.push(change.view.title, change.view.detail);
    }
  }
  const unexpected = describePasswordChangeFailure(new Error('boom'));

  if (unexpected.kind === 'retry') notice(unexpected.notice);
  for (const attempt of [
    ['', ''],
    ['x'.repeat(40), ''],
    ['short', 'short'],
    ['y'.repeat(60), 'y'.repeat(60)],
    ['a-fine-passphrase-9', 'a-different-one-9'],
  ] as const) {
    const problem = checkNewPassword(attempt[0], attempt[1]);

    if (problem !== null) notice(problem);
  }
  if (passwordChangedView.kind === 'done') {
    text.push(passwordChangedView.title, passwordChangedView.detail);
  }

  return text;
}

describe('cloud model redaction', () => {
  const sentences = everySentence();

  it('redacts credential-like values, URLs and full checksums', () => {
    const offenders = sentences.filter(
      (line) =>
        /[0-9a-f]{16,}/i.test(line) ||
        /https?:\/\/|\b[\w.+-]+@[\w.-]+\.\w+|\b(?:token|code|ticket)\s*=|\bbearer\s+[\w.-]+/i.test(
          line,
        ),
    );

    expect(offenders).toEqual([]);
  });
});

describe('outcome-unknown is its own state', () => {
  const unknowns = backupOutcomes
    .filter((outcome) => outcome.kind === 'outcome-unknown')
    .map(describeBackupOutcome);

  it('is neither success nor failure, and carries what a later check needs', () => {
    expect(unknowns).toHaveLength(2);

    for (const view of unknowns) {
      expect(view.tone).toBe('warning');
      expect(view.attempt).toEqual(attempt);
    }
  });

  it('no other outcome carries an attempt to check', () => {
    const others = backupOutcomes
      .filter((outcome) => outcome.kind !== 'outcome-unknown')
      .map(describeBackupOutcome);

    expect(others.filter((view) => view.attempt !== null)).toEqual([]);
  });
});

describe('a backup is reported stored only when the server confirmed it', () => {
  it('stored shows the server time, size and slot, and notes a reconciled confirmation', () => {
    const [plain, reconciled] = backupOutcomes
      .filter((outcome) => outcome.kind === 'stored')
      .map(describeBackupOutcome);

    expect(plain?.tone).toBe('success');
    expect(reconciled?.tone).toBe('success');
    for (const value of ['2026-10-08 12:00 UTC', '332 KiB', '1']) {
      expect(plain?.lines.join(' ')).toContain(value);
    }
    expect(reconciled?.lines.join(' ')).toContain('10 B');
  });

  it('marks every confirmed refusal as a failure', () => {
    for (const outcome of backupOutcomes.filter(
      (candidate) => candidate.kind === 'not-stored',
    )) {
      const view = describeBackupOutcome(outcome);

      expect(view.tone).toBe('danger');
    }
  });

  it('an integrity violation stops, deletes nothing and shows only short checksum prefixes', () => {
    const view = describeBackupOutcome(
      backupOutcomes.find((outcome) => outcome.kind === 'integrity-violation')!,
    );

    expect(view.tone).toBe('danger');
    expect(view.lines.join(' ')).toContain('abababab');
    expect(view.lines.join(' ')).toContain('cdcdcdcd');
  });
});

describe('the inventory states server facts only', () => {
  it('an unavailable read is never an empty inventory', () => {
    for (const failure of failures) {
      const view = describeInventory({ kind: 'unavailable', failure });

      expect(view.kind).toBe('unavailable');
      expect(view).not.toHaveProperty('rows');
    }
  });

  it('keeps inventory size and restorable choices across compatibility states', () => {
    const [empty, none, some, caveat] = inventories
      .slice(0, 4)
      .map(describeInventory);

    expect(
      [empty, none, some, caveat].map(
        (view) =>
          view?.kind === 'ok' && view.rows.map(({ restorable }) => restorable),
      ),
    ).toEqual([[], [false], [true, true], [true, false]]);
  });

  it('rows carry stored time, size, app version and restorability, and nothing about this device', () => {
    const view = describeInventory(inventories[3]!);

    expect(
      view.kind === 'ok' && view.rows.map((row) => row.restorable),
    ).toEqual([true, false]);
    for (const value of ['2026-10-08 12:00 UTC', '1.2 MiB', '1.7.1']) {
      expect(view.kind === 'ok' && view.rows[0]?.detail).toContain(value);
    }
  });
});

describe('restore refusal and parser details', () => {
  it('announces a refused preparation or restore as a failure', () => {
    const prepared = prepareRefusals
      .filter((result) => result.kind === 'refused')
      .map((result) => describePrepareRefusal(result as never));
    const confirmed = confirmRefusals
      .filter((result) => result.kind !== 'busy')
      .map(describeConfirmRefusal);

    for (const view of [...prepared, ...confirmed]) {
      expect(view.tone).toBe('danger');
    }
  });

  it('shows the parser message for an invalid backup', () => {
    const view = describePrepareRefusal({
      kind: 'refused',
      reason: 'invalid-backup',
      failure: null,
      message: 'Synthetic parser diagnostic',
    });

    expect(view.lines[0]).toBe('Synthetic parser diagnostic');
  });
});

describe('formatting is display only', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1 KiB'],
    [1536, '1.5 KiB'],
    [1_048_576, '1 MiB'],
    [10_485_760, '10 MiB'],
    [1_258_291, '1.2 MiB'],
  ])('%d bytes is %s', (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });

  it.each([
    ['2026-10-08T12:00:00.37582+00:00', '2026-10-08 12:00 UTC'],
    ['2026-10-08T12:00:00Z', '2026-10-08 12:00 UTC'],
    ['2026-10-08T12:00:00.123456+00', '2026-10-08 12:00 UTC'],
    // Not plainly UTC: shown exactly as written, never converted.
    ['2026-10-08T12:00:00+02:00', '2026-10-08T12:00:00+02:00'],
    ['not a time', 'not a time'],
  ])('stored time %s is shown as %s', (input, shown) => {
    expect(formatStoredAt(input)).toBe(shown);
  });
});

describe('breakablePieces keeps a long address from widening a narrow card', () => {
  it.each([
    '',
    'a@b.co',
    'learner@example.com',
    'first.middle_last-name+tag@sub.domain.example.co.uk',
    `${'a'.repeat(58)}@${'b'.repeat(40)}.example.com`,
    'x'.repeat(200),
    'åäö@例え.jp',
  ])('%s is returned exactly when joined', (text) => {
    expect(breakablePieces(text).join('')).toBe(text);
  });

  it('offers a break after every joint and never leaves more than sixteen characters unbroken', () => {
    const pieces = breakablePieces(
      `${'a'.repeat(58)}@${'b'.repeat(40)}.example.com`,
    );

    expect(
      Math.max(...pieces.map((piece) => piece.length)),
    ).toBeLessThanOrEqual(16);
    expect(breakablePieces('first.last@example.com')).toEqual([
      'first.',
      'last@',
      'example.',
      'com',
    ]);
  });
});

describe('the email-link landing result', () => {
  it('maps every outcome to a destination-neutral result with no link content', () => {
    const views = callbackOutcomes.map((outcome) =>
      describeCallbackOutcome(outcome, false),
    );

    // Epic G repair 01: a reset session is no longer a "Link accepted" message
    // (which said reset was unavailable); it asks for the new password, and is
    // not reported as a change.
    expect(views.map((view) => view.kind === 'done' && view.tone)).toEqual([
      'success',
      false,
      'warning',
      'warning',
      'warning',
      'danger',
    ]);
    expect(views[1]).toEqual({ kind: 'new-password' });
  });

  it('classifies callback failures without leaking unexpected error details', () => {
    const off = describeCallbackFailure(new CloudError('disabled', 'x'));
    const expired = describeCallbackFailure(
      new CloudError(
        'link-expired',
        'This link has expired or was already used.',
      ),
    );
    const unknown = describeCallbackFailure(
      new Error('SDK blew up: secret-detail'),
    );

    expect(off).toMatchObject({ kind: 'done', tone: 'warning' });
    expect(expired).toMatchObject({ kind: 'done', tone: 'danger' });
    expect(unknown).toMatchObject({ kind: 'done', tone: 'danger' });
    // An unexpected error's own text never reaches the learner.
    expect(JSON.stringify(unknown)).not.toMatch(/secret-detail|SDK/);
  });
});

describe('asking for a password reset link', () => {
  const independent: CloudErrorCode[] = [
    'disabled',
    'invalid-state',
    'rate-limited',
    'unavailable',
    'unsupported',
    'unknown',
  ];

  it.each(everyErrorCode)(
    '%s is classified as success-looking or as a failure, and the classification is the documented one',
    (code) => {
      const result = describePasswordResetRequestError(
        new CloudError(code, `provider says ${code}`),
      );

      if (independent.includes(code)) {
        expect(result.kind).toBe('failed');
        expect(result).toMatchObject({
          notice: { tone: 'danger' },
        });
      } else {
        // The answer to a refusal that could reflect the account is the
        // generic one; nothing of the provider's own words is kept.
        expect(result).toEqual({ kind: 'sent' });
      }
    },
  );

  it('an error that is not the account port’s is a failure that shows none of its own text', () => {
    const result = describePasswordResetRequestError(
      new Error('SDK internals: bearer abc.def.ghi'),
    );

    expect(result).toMatchObject({
      kind: 'failed',
      notice: { tone: 'danger' },
    });
    expect(JSON.stringify(result)).not.toMatch(/SDK internals|abc\.def\.ghi/);
  });

  it.each([
    ['an ordinary address', 'learner@example.com', true],
    ['a plus tag', 'learner+tag@example.com', true],
    ['no @', 'learner.example.com', false],
    ['no dot after the @', 'learner@example', false],
    ['two @', 'a@b@example.com', false],
    ['a space', 'lea rner@example.com', false],
    ['nothing', '', false],
    ['254 characters', `${'a'.repeat(242)}@example.com`, true],
    ['255 characters', `${'a'.repeat(243)}@example.com`, false],
  ])('%s is %s', (_label, address, plausible) => {
    expect(isPlausibleEmail(address)).toBe(plausible);
  });
});

describe('choosing the new password', () => {
  it('checks in a fixed order and reports what is wrong, never the password', () => {
    const empty = checkNewPassword('', '');
    const tooShort = checkNewPassword('short', 'short');
    expect(empty?.tone).toBe('danger');
    expect(tooShort?.tone).toBe('danger');
    expect(checkNewPassword('a-fine-passphrase-9', '')).toEqual(empty);
    expect(checkNewPassword('y'.repeat(51), 'y'.repeat(51))).toEqual(tooShort);
    const mismatch = checkNewPassword(
      'a-fine-passphrase-9',
      'a-different-one-9',
    );
    expect(mismatch?.tone).toBe('danger');
    expect(mismatch).not.toEqual(empty);
    expect(mismatch).not.toEqual(tooShort);
    expect(checkNewPassword('a-fine-passphrase-9', 'a-fine-passphrase-9')).toBe(
      null,
    );
    expect(JSON.stringify(checkNewPassword('short', 'other'))).not.toMatch(
      /short|other/,
    );
  });

  it('accepts the policy’s own limits and refuses one beyond them', () => {
    expect(checkNewPassword('x'.repeat(9), 'x'.repeat(9))).toBe(null);
    expect(checkNewPassword('x'.repeat(50), 'x'.repeat(50))).toBe(null);
    expect(checkNewPassword('x'.repeat(8), 'x'.repeat(8))).not.toBe(null);
    expect(checkNewPassword('x'.repeat(51), 'x'.repeat(51))).not.toBe(null);
  });

  it('reports the acknowledged password change as a successful terminal state', () => {
    expect(passwordChangedView).toMatchObject({
      kind: 'done',
      tone: 'success',
    });
  });

  it.each(everyErrorCode)(
    '%s: a refusal is worded as a refusal, a doubt as a doubt, and closed only when nothing more can be done',
    (code) => {
      const result = describePasswordChangeFailure(
        new CloudError(code, `message for ${code}`),
      );

      if (code === 'session-ended' || code === 'disabled') {
        expect(result.kind).toBe('closed');
      } else {
        expect(result.kind).toBe('retry');
      }

      if (result.kind === 'retry') {
        const refused: CloudErrorCode[] = [
          'invalid-input',
          'rate-limited',
          'not-permitted',
        ];

        expect(result.notice.tone).toBe(
          refused.includes(code) ? 'danger' : 'warning',
        );
      }
    },
  );

  it('an error that is not the account port’s is a doubt that shows none of its own text', () => {
    const result = describePasswordChangeFailure(
      new Error('SDK internals: bearer abc.def.ghi'),
    );

    expect(result.kind).toBe('retry');
    expect(JSON.stringify(result)).not.toMatch(/SDK|bearer|abc\.def/);
  });
});
