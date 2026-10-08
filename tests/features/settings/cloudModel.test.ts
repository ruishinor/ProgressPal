import { describe, expect, it } from 'vitest';

import {
  CloudError,
  type CloudEmailLinkOutcome,
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
  describeBackupOutcome,
  describeCallbackFailure,
  describeCallbackOutcome,
  describeCloudError,
  describeConfirmRefusal,
  describeFailure,
  describeInventory,
  describePrepareRefusal,
  formatBytes,
  formatStoredAt,
  inventoryScopeNote,
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
          reason === 'invalid-backup' ? 'This file is not a backup.' : null,
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

  return text;
}

describe('the cloud model never invents freshness, completeness or confidence', () => {
  const sentences = everySentence();

  it('covers a large, real set of sentences', () => {
    expect(sentences.length).toBeGreaterThan(300);
  });

  it('says nothing is current, latest, newer, older, synced or up to date, and nothing is "everything backed up"', () => {
    const banned =
      /\b(latest|current|currently|up[- ]to[- ]date|newer|older|newest|oldest|fresh(er)?|synced?|syncing|in sync|changes since|everything is backed up|all (your )?data is (safe|backed up)|backup is current)\b/i;

    expect(sentences.filter((line) => banned.test(line))).toEqual([]);
  });

  it('never prints a code, token, address or full checksum', () => {
    const offenders = sentences.filter(
      (line) =>
        /[0-9a-f]{16,}/i.test(line) ||
        /https?:\/\//i.test(line) ||
        /\b(token|code=|ticket|bearer)\b/i.test(line),
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
      expect(view.title).toBe('Backup outcome unknown');
      expect(view.attempt).toEqual(attempt);
    }
  });

  it('never claims the backup exists and never claims nothing was changed', () => {
    for (const view of unknowns) {
      const text = [view.title, ...view.lines].join(' ');

      expect(text).not.toMatch(/Backed up|Stored by the server/);
      expect(text).not.toMatch(/Nothing was changed on the server/);
      expect(text).not.toMatch(/Not backed up/);
      expect(text).toMatch(/not known whether/);
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
    expect(plain?.lines[0]).toBe(
      'Stored by the server at 2026-10-08 12:00 UTC, 332 KiB, slot 1.',
    );
    expect(plain?.lines).toHaveLength(1);
    expect(reconciled?.lines).toContain(
      'The first request did not answer; the server confirmed this backup afterwards.',
    );
    expect(reconciled?.lines).toContain('It replaced one earlier backup.');
  });

  it('every confirmed refusal says nothing was changed on the server', () => {
    for (const outcome of backupOutcomes.filter(
      (candidate) => candidate.kind === 'not-stored',
    )) {
      const view = describeBackupOutcome(outcome);

      expect(view.tone).toBe('danger');
      expect(view.lines.at(-1)).toBe('Nothing was changed on the server.');
    }
  });

  it('an integrity violation stops, deletes nothing and shows only short checksum prefixes', () => {
    const view = describeBackupOutcome(
      backupOutcomes.find((outcome) => outcome.kind === 'integrity-violation')!,
    );

    expect(view.title).toBe('Backup stopped');
    expect(view.lines).toContain('Nothing was deleted, replaced or retried.');
    expect(view.lines.join(' ')).toContain('abababab');
    expect(view.lines.join(' ')).toContain('cdcdcdcd');
  });
});

describe('the inventory states server facts only', () => {
  it('an unavailable read is never an empty inventory', () => {
    for (const failure of failures) {
      const view = describeInventory({ kind: 'unavailable', failure });

      expect(view.kind).toBe('unavailable');
      expect(view.summary).not.toMatch(/No backups/);
      expect(view.summary).toMatch(/could not be read/);
    }
  });

  it('describes empty, nothing restorable, and some restorable, with the most recently stored caveat', () => {
    const [empty, none, some, caveat] = inventories
      .slice(0, 4)
      .map(describeInventory);

    expect(empty?.summary).toBe('No backups are stored on the server.');
    expect(none?.summary).toBe(
      '1 backup is stored on the server; none can be restored by this version.',
    );
    expect(some?.summary).toBe(
      '2 backups are stored on the server; 2 can be restored by this version.',
    );
    expect(caveat?.summary).toBe(
      '2 backups are stored on the server; 1 can be restored by this version. The backup stored most recently by the server cannot be restored by this version.',
    );
  });

  it('rows carry stored time, size, app version and restorability, and nothing about this device', () => {
    const view = describeInventory(inventories[3]!);

    expect(
      view.kind === 'ok' && view.rows.map((row) => row.restorable),
    ).toEqual([true, false]);
    expect(view.kind === 'ok' && view.rows[0]?.detail).toBe(
      'Stored 2026-10-08 12:00 UTC, 1.2 MiB, app 1.7.1. Can be restored by this version.',
    );
    expect(view.kind === 'ok' && view.rows[1]?.detail).toMatch(
      /Cannot be restored by this version\.$/,
    );
  });

  it('states that the list is details only', () => {
    expect(inventoryScopeNote).toMatch(/not downloaded or checked/);
  });
});

describe('restore refusals always say what happened to this device', () => {
  it('a refused preparation or restore says nothing was changed on this device', () => {
    const prepared = prepareRefusals
      .filter((result) => result.kind === 'refused')
      .map((result) => describePrepareRefusal(result as never));
    const confirmed = confirmRefusals
      .filter((result) => result.kind !== 'busy')
      .map(describeConfirmRefusal);

    for (const view of [...prepared, ...confirmed]) {
      expect(view.tone).toBe('danger');
      expect(view.lines.at(-1)).toBe('Nothing was changed on this device.');
    }
  });

  it('a hash mismatch and a missing checksum capability are different messages', () => {
    const mismatch = describePrepareRefusal({
      kind: 'refused',
      reason: 'hash-mismatch',
      failure: null,
      message: null,
    });
    const unverifiable = describePrepareRefusal({
      kind: 'refused',
      reason: 'verification-unavailable',
      failure: null,
      message: null,
    });

    expect(mismatch.lines[0]).not.toBe(unverifiable.lines[0]);
    expect(unverifiable.lines[0]).toMatch(/HTTPS or localhost/);
  });

  it('shows the parser message for an invalid backup', () => {
    const view = describePrepareRefusal({
      kind: 'refused',
      reason: 'invalid-backup',
      failure: null,
      message: 'This file is not a backup.',
    });

    expect(view.lines[0]).toBe('This file is not a backup.');
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

    expect(views.map((view) => view.kind === 'done' && view.tone)).toEqual([
      'success',
      'warning',
      'warning',
      'warning',
      'warning',
      'danger',
    ]);
  });

  it('mentions being signed in only as a fact read from the account', () => {
    expect(
      describeCallbackOutcome({ kind: 'invalid-link' }, true),
    ).toMatchObject({ detail: expect.stringContaining('You are signed in') });
    expect(
      describeCallbackOutcome({ kind: 'invalid-link' }, false),
    ).toMatchObject({ detail: 'Nothing was changed.' });
  });

  it('turns every failure, including an unexpected one, into a calm sign-in instruction', () => {
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

    expect(off).toMatchObject({ title: 'Cloud backup is off' });
    expect(expired).toMatchObject({ title: 'This link has expired' });
    expect(unknown).toMatchObject({ title: 'Sign-in could not be completed' });
    // An unexpected error's own text never reaches the learner.
    expect(JSON.stringify(unknown)).not.toMatch(/secret-detail|SDK/);
  });
});
