import {
  CloudError,
  cloudPasswordMaxLength,
  cloudPasswordMinLength,
  remoteBackupPayloadCeilingBytes,
  type CloudEmailLinkOutcome,
  type CloudErrorCode,
  type CloudRequestFailure,
} from '@/lib/cloud';
import type {
  CloudBackupAttempt,
  CloudBackupOutcome,
  CloudInventoryResult,
  ConfirmRestoreResult,
  InventorySlot,
  NotStoredReason,
  PrepareRestoreResult,
} from '@/lib/cloudBackup';

/**
 * Presentation model for the optional cloud backup in Settings and for the
 * email-link landing route (Epic G, callback route and Settings UI).
 *
 * Pure: every sentence the learner reads about the cloud is chosen here, from
 * the facts the domain returned and from nothing else. Three rules hold for
 * all of it, and a test pins them:
 *  - nothing says or implies that the cloud copy is current, latest, newer,
 *    older, synced or "up to date" compared with this device (no freshness is
 *    inferred; the only ordering ever shown is the server's own stored time);
 *  - an unknown outcome is never worded as stored and never as not stored;
 *  - no sentence contains a code, token, address or checksum beyond the short
 *    prefixes the domain already bounds for diagnostics.
 */

export type NoticeTone = 'success' | 'neutral' | 'warning' | 'danger';

export interface Notice {
  tone: NoticeTone;
  title: string;
  /** One short factual sentence per entry, in reading order. */
  lines: string[];
}

export interface BackupNotice extends Notice {
  /** Set only for an unknown outcome: what "Check again" needs. In memory only. */
  attempt: CloudBackupAttempt | null;
}

/** The card's heading in every state it can be shown in. */
export const cloudCardTitle = 'Remote backup — Alpha';

/**
 * What every state of the card says first. Plain words about what the feature
 * is and who can read an uploaded copy; no legal assertion, no promise about
 * protection or retention, and nothing that implies encryption or that the
 * provider cannot read a backup. (A full privacy notice is a later tranche.)
 */
export const remoteBackupDisclosure: readonly string[] = [
  'Remote backup is experimental. It is a manual backup, not automatic synchronization: nothing is uploaded when you open Settings or sign in, only when you press Back up now.',
  "Your working data stays on this device, in this browser's storage. A backup is a full copy that you choose to send.",
  'The cloud provider and the service operator can read the backups you upload. Exporting a backup file to your device remains a separate way to keep and restore a copy.',
];

const operationRunning = 'Another cloud operation is still running.';

export function formatBytes(bytes: number): string {
  const kib = 1024;
  const mib = kib * kib;
  const figure = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(1);

  if (bytes < kib) {
    return `${bytes} B`;
  }

  if (bytes < mib) {
    return `${figure(Math.round((bytes / kib) * 10) / 10)} KiB`;
  }

  return `${figure(Math.round((bytes / mib) * 10) / 10)} MiB`;
}

const breakAfter = new Set(['@', '.', '_', '-', '+']);
const longestRun = 16;

/**
 * An address or other unbroken text cut into pieces at its natural joints (and
 * at most every sixteen characters), so a renderer can offer a line break after
 * each piece. Joined back together it is exactly the original text. Without
 * break opportunities a long address stretches its card past a narrow screen.
 */
export function breakablePieces(text: string): string[] {
  const pieces: string[] = [];
  let piece = '';

  for (const character of text) {
    piece += character;

    if (breakAfter.has(character) || piece.length >= longestRun) {
      pieces.push(piece);
      piece = '';
    }
  }

  return piece === '' ? pieces : [...pieces, piece];
}

const utcStoredAt =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]00(?::?00)?)$/i;

/**
 * The server's stored time as written in UTC, to the minute. A time that is
 * not plainly UTC is shown exactly as the server wrote it rather than
 * converted: this is display only, with no date arithmetic.
 */
export function formatStoredAt(storedAt: string): string {
  const match = storedAt.match(utcStoredAt);

  return match === null ? storedAt : `${match[1]} ${match[2]} UTC`;
}

/** One short sentence for a classified request failure. */
export function describeFailure(failure: CloudRequestFailure | null): string {
  if (failure === null) {
    return 'The cloud service did not accept the request.';
  }

  switch (failure.kind) {
    case 'provider-unavailable':
      return failure.httpStatus === null
        ? 'The cloud service could not be reached.'
        : `The cloud service did not answer properly (HTTP ${failure.httpStatus}).`;
    case 'rate-limited':
      return 'The cloud service is limiting requests. Wait a while and try again.';
    case 'unauthenticated':
      return 'The cloud service did not accept this sign-in. Sign out and sign in again.';
    case 'rejected':
      return 'The cloud service refused the request.';
    case 'unexpected-response':
      return 'The cloud service sent an answer this app does not understand.';
  }
}

const notStoredReasons: Record<
  NotStoredReason,
  (failure: CloudRequestFailure | null) => string
> = {
  'local-export-failed': () => 'This device could not prepare the backup.',
  'payload-over-remote-ceiling': () =>
    `The backup is larger than the ${formatBytes(remoteBackupPayloadCeilingBytes)} cloud limit.`,
  'inventory-unavailable': (failure) =>
    `The list of backups on the server could not be read. ${describeFailure(failure)}`,
  unauthenticated: () =>
    'The cloud service did not accept this sign-in. Sign out and sign in again.',
  'rate-limited': () =>
    'The cloud service is limiting requests. Wait a while and try again.',
  'unsupported-generation': () =>
    "The server does not accept this version's backup format.",
  'integrity-mismatch': () =>
    "The server's checksum did not match the backup, so it refused it.",
  'payload-too-large': () => 'The server refused the backup as too large.',
  'slot-out-of-range': () => 'The server refused the backup slot.',
  'other-constraint': () => 'The server refused the backup.',
  'lost-race': () => 'Another backup was stored at the same moment. Try again.',
};

/**
 * What a backup attempt established. `stored` only on the server's own
 * confirmation; `outcome-unknown` is its own state and carries what a later
 * check needs, never a claim either way.
 */
export function describeBackupOutcome(
  outcome: CloudBackupOutcome,
): BackupNotice {
  switch (outcome.kind) {
    case 'stored': {
      const { backup, reconciled } = outcome;
      const lines = [
        `Stored by the server at ${formatStoredAt(backup.storedAt)}, ${formatBytes(backup.payloadBytes)}, slot ${backup.slot + 1}.`,
      ];

      if (reconciled) {
        lines.push(
          'The first request did not answer; the server confirmed this backup afterwards.',
        );
      }

      if (backup.replacedBackupId !== null) {
        lines.push('It replaced one earlier backup.');
      }

      return { tone: 'success', title: 'Backed up', lines, attempt: null };
    }

    case 'not-stored':
      return {
        tone: 'danger',
        title: 'Not backed up',
        lines: [
          notStoredReasons[outcome.reason](outcome.failure),
          'Nothing was changed on the server.',
        ],
        attempt: null,
      };

    case 'outcome-unknown':
      return {
        tone: 'warning',
        title: 'Backup outcome unknown',
        lines: [
          'The cloud service did not give a clear answer, so it is not known whether this backup was stored.',
          outcome.lastCheck === 'absent'
            ? 'When checked, it was not found.'
            : 'The check itself could not reach the cloud service.',
          'It is not reported as stored or as not stored.',
        ],
        attempt: outcome.attempt,
      };

    case 'integrity-violation':
      return {
        tone: 'danger',
        title: 'Backup stopped',
        lines: [
          "The server holds a backup with this backup's identity but different contents.",
          'Nothing was deleted, replaced or retried.',
          `Slot ${outcome.diagnostics.slot + 1}: expected checksum ${outcome.diagnostics.expectedHashPrefix}, server checksum ${outcome.diagnostics.storedHashPrefix}.`,
        ],
        attempt: null,
      };

    case 'busy':
      return {
        tone: 'neutral',
        title: operationRunning,
        lines: [],
        attempt: null,
      };
  }
}

export interface InventoryRow {
  slot: number;
  backupId: string;
  label: string;
  /** Compact form for choosing one backup to restore. */
  choice: string;
  detail: string;
  restorable: boolean;
}

export type InventoryView =
  | { kind: 'ok'; summary: string; rows: InventoryRow[] }
  | { kind: 'unavailable'; summary: string };

const plural = (count: number, one: string, other: string) =>
  `${count} ${count === 1 ? one : other}`;

export function describeInventorySlot(slot: InventorySlot): InventoryRow {
  return {
    slot: slot.slot,
    backupId: slot.backupId,
    label: `Slot ${slot.slot + 1}`,
    choice: `Slot ${slot.slot + 1}: stored ${formatStoredAt(slot.storedAt)}, ${formatBytes(slot.payloadBytes)}`,
    detail: `Stored ${formatStoredAt(slot.storedAt)}, ${formatBytes(slot.payloadBytes)}, app ${slot.appVersion}. ${
      slot.compatible
        ? 'Can be restored by this version.'
        : 'Cannot be restored by this version.'
    }`,
    restorable: slot.compatible,
  };
}

/**
 * The inventory as server facts only. A failed read is `unavailable`, never an
 * empty list, and nothing here compares the cloud copy with this device.
 */
export function describeInventory(result: CloudInventoryResult): InventoryView {
  if (result.kind === 'unavailable') {
    return {
      kind: 'unavailable',
      summary: `The backup list could not be read. ${describeFailure(result.failure)}`,
    };
  }

  const rows = result.slots.map(describeInventorySlot);
  const { facts } = result;

  switch (facts.kind) {
    case 'no-remote-backups':
      return {
        kind: 'ok',
        summary: 'No backups are stored on the server.',
        rows,
      };
    case 'no-compatible-backup':
      return {
        kind: 'ok',
        summary: `${plural(facts.slotCount, 'backup is', 'backups are')} stored on the server; none can be restored by this version.`,
        rows,
      };
    case 'has-compatible-backup': {
      const restorable = rows.filter((row) => row.restorable).length;
      const lead = `${plural(rows.length, 'backup is', 'backups are')} stored on the server; ${restorable} can be restored by this version.`;

      return {
        kind: 'ok',
        summary:
          facts.newerIncompatible === null
            ? lead
            : `${lead} The backup stored most recently by the server cannot be restored by this version.`,
        rows,
      };
    }
  }
}

export const inventoryScopeNote =
  "Details only. Contents were not downloaded or checked. Times are the server's.";

const nothingChanged = 'Nothing was changed on this device.';

/** Why a download-and-check did not produce something restorable. */
export function describePrepareRefusal(
  result: Exclude<PrepareRestoreResult, { kind: 'ready' }>,
): Notice {
  if (result.kind === 'busy') {
    return { tone: 'neutral', title: operationRunning, lines: [] };
  }

  const sentences: Record<typeof result.reason, string> = {
    unavailable: `The backup could not be downloaded. ${describeFailure(result.failure)}`,
    'slot-changed':
      'That backup is no longer in that slot on the server. Refresh the list and choose again.',
    incompatible: 'This version of ProgressPal cannot restore that backup.',
    'hash-mismatch':
      'The downloaded backup did not match the checksum the server computed. It was not used.',
    'verification-unavailable':
      'This browser cannot compute checksums here (it needs HTTPS or localhost), so the backup was not used.',
    'invalid-backup': result.message ?? 'The backup could not be read.',
    'local-state-unreadable':
      'The data on this device could not be read, so nothing was prepared.',
  };

  return {
    tone: 'danger',
    title: 'Backup not used',
    lines: [sentences[result.reason], nothingChanged],
  };
}

/** Why a confirmed restore did not replace this device's data. */
export function describeConfirmRefusal(
  result: Exclude<ConfirmRestoreResult, { kind: 'restored' }>,
): Notice {
  switch (result.kind) {
    case 'busy':
      return { tone: 'neutral', title: operationRunning, lines: [] };
    case 'refused': {
      const sentences = {
        'not-prepared':
          'This preparation is no longer valid. Download and check the backup again.',
        'acknowledgement-required':
          'This device now holds learner data. Confirm that it will be replaced, then try again.',
        'local-state-unreadable': 'The data on this device could not be read.',
      } as const;

      return {
        tone: 'danger',
        title: 'Not restored',
        lines: [sentences[result.reason], nothingChanged],
      };
    }
    case 'failed':
      return {
        tone: 'danger',
        title: 'Not restored',
        lines: [
          result.reason === 'local-write-blocked'
            ? 'Another ProgressPal tab is writing, so the restore did not run. Close it and try again.'
            : 'The restore failed.',
          nothingChanged,
        ],
      };
  }
}

/** A failure the domain could not express as an outcome (a precondition). */
export function describeCloudError(error: unknown): string {
  return error instanceof CloudError
    ? error.message
    : 'Something went wrong. Local data is unaffected.';
}

export type CallbackView =
  | { kind: 'working' }
  /** A reset link was accepted: the new password is chosen on this page. */
  | { kind: 'new-password' }
  | { kind: 'done'; tone: NoticeTone; title: string; detail: string };

const signInWithPassword = 'Sign in with your email and password.';
const resetAgain =
  'To reset a password, choose Forgot password? in Settings and open the new link in this browser.';

/** What a link that needs this browser's own record says when it has none. */
function signInRequiredDetail(
  purpose: Extract<
    CloudEmailLinkOutcome,
    { kind: 'sign-in-required' }
  >['purpose'],
): string {
  switch (purpose) {
    case 'unknown':
      return `This browser has no record of starting this request. ${signInWithPassword} ${resetAgain}`;
    case 'reset':
      return `The password reset request started in this browser has expired. ${resetAgain}`;
    case 'signup':
      return `The request started in this browser has expired. ${signInWithPassword}`;
  }
}

/**
 * What the learner is told after the email link was handled. Never mentions
 * the link's contents: the page that shows this never held them. A reset link
 * that really was exchanged leads to the new-password form and is NOT reported
 * as a change: only the provider's acknowledgement of the new password is.
 */
export function describeCallbackOutcome(
  outcome: CloudEmailLinkOutcome,
  signedIn: boolean,
): CallbackView {
  switch (outcome.kind) {
    case 'verified-signed-in':
      return {
        kind: 'done',
        tone: 'success',
        title: 'Email verified',
        detail: 'You are signed in on this device.',
      };
    case 'password-reset-session':
      return { kind: 'new-password' };
    case 'sign-in-required':
      return {
        kind: 'done',
        tone: 'warning',
        title: 'Sign in to continue',
        detail: signInRequiredDetail(outcome.purpose),
      };
    case 'invalid-link':
      return {
        kind: 'done',
        tone: 'danger',
        title: 'This link cannot be used',
        detail: signedIn
          ? 'Nothing was changed. You are signed in on this device.'
          : 'Nothing was changed.',
      };
  }
}

export function describeCallbackFailure(error: unknown): CallbackView {
  if (error instanceof CloudError && error.code === 'disabled') {
    return {
      kind: 'done',
      tone: 'warning',
      title: 'Cloud backup is off',
      detail: `Turn it on in Settings, then ${signInWithPassword.charAt(0).toLowerCase()}${signInWithPassword.slice(1)}`,
    };
  }

  const expired = error instanceof CloudError && error.code === 'link-expired';

  return {
    kind: 'done',
    tone: 'danger',
    title: expired ? 'This link has expired' : 'Sign-in could not be completed',
    // An expired or used link may have been a reset link: say how to ask again.
    detail: `${describeCloudError(error)} ${signInWithPassword}${expired ? ` ${resetAgain}` : ''}`,
  };
}

/* ------------------------------------------------------------------------ *
 * Password recovery (Epic G repair 01). Two halves of one journey through the
 * existing account port: asking for a reset link in Settings (a generic answer,
 * the same whether or not an account exists) and choosing the new password on
 * the callback page after the emailed link was exchanged.
 * ------------------------------------------------------------------------ */

export const resetRequestText = {
  forgot: 'Forgot password?',
  title: 'Reset your password',
  lead: "Enter your account's email address. If an account exists for it, the cloud service sends a link for choosing a new password. Open the link in this browser.",
  send: 'Send reset link',
  back: 'Back to sign in',
} as const;

const resetNotRequested = 'Reset link not requested';

/** The one answer to a request, whether or not the address has an account. */
export const passwordResetSent: Notice = {
  tone: 'success',
  title: 'Check your email',
  lines: [
    'If an account exists for that address, a password reset link is on its way.',
    'Open the link in this browser. If you ask for more than one link, only the last one you asked for works.',
  ],
};

export const invalidResetAddress: Notice = {
  tone: 'danger',
  title: resetNotRequested,
  lines: ['Enter a valid email address.'],
};

const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const longestAddress = 254;

/**
 * The same shape check the account makes before it contacts the provider (a
 * test pins the two together). It is what lets a refusal that arrives AFTER
 * this check be treated as the provider's answer about the account, not about
 * the way the address was typed.
 */
export function isPlausibleEmail(address: string): boolean {
  return emailShape.test(address) && address.length <= longestAddress;
}

/** Failures that say nothing about whether an account exists. */
const accountIndependent: ReadonlySet<CloudErrorCode> = new Set([
  'disabled',
  'invalid-state',
  'rate-limited',
  'unavailable',
  'unsupported',
  'unknown',
]);

export type PasswordResetRequestResult =
  | { kind: 'sent' }
  | { kind: 'failed'; notice: Notice };

/**
 * What a rejected request means to the learner. A refusal that could reflect
 * the account (not permitted, unverified, no such user as the provider words
 * it, a rejected input) is reported exactly like success, so the answer cannot
 * be used to find out which addresses have accounts. Only failures that are
 * about the request itself (cloud off, a limit, no connection) are reported.
 */
export function describePasswordResetRequestError(
  error: unknown,
): PasswordResetRequestResult {
  if (error instanceof CloudError && !accountIndependent.has(error.code)) {
    return { kind: 'sent' };
  }

  return {
    kind: 'failed',
    notice: {
      tone: 'danger',
      title: resetNotRequested,
      lines: [describeCloudError(error)],
    },
  };
}

export const newPasswordText = {
  title: 'Choose a new password',
  lead: 'This link signed you in on this device. Your password has not changed yet.',
  newLabel: 'New password',
  confirmLabel: 'Confirm new password',
  hint: `${cloudPasswordMinLength} to ${cloudPasswordMaxLength} characters.`,
  submit: 'Change password',
} as const;

const passwordNotChanged = 'Password not changed';

/** Checked here, before anything is sent. Null when the two entries are usable. */
export function checkNewPassword(
  password: string,
  confirmation: string,
): Notice | null {
  const refuse = (line: string): Notice => ({
    tone: 'danger',
    title: passwordNotChanged,
    lines: [line],
  });

  if (password === '' || confirmation === '') {
    return refuse('Enter the new password twice.');
  }

  if (
    password.length < cloudPasswordMinLength ||
    password.length > cloudPasswordMaxLength
  ) {
    return refuse(
      `Passwords are ${cloudPasswordMinLength} to ${cloudPasswordMaxLength} characters.`,
    );
  }

  if (password !== confirmation) {
    return refuse('The two passwords do not match.');
  }

  return null;
}

/** Said only after the provider acknowledged the change. */
export const passwordChangedView: CallbackView = {
  kind: 'done',
  tone: 'success',
  title: 'Password changed',
  detail: 'You were signed out on this device. Sign in with your new password.',
};

const passwordChangeUnclear: Notice = {
  tone: 'warning',
  title: 'Password change not confirmed',
  lines: [
    'The cloud service did not give a clear answer, so it is not known whether the password was changed.',
    'Try again. When signing in, try the new password first, then the old one.',
  ],
};

export type PasswordChangeFailure =
  | { kind: 'retry'; notice: Notice }
  | { kind: 'closed'; view: CallbackView };

/**
 * A refusal the provider made (nothing changed) is worded as a refusal; a
 * doubt (no answer, a server fault, anything unrecognised) is worded as a
 * doubt, never as success and never as "not changed". When the sign-in the
 * link created is gone, or cloud was turned off, the form is closed.
 */
export function describePasswordChangeFailure(
  error: unknown,
): PasswordChangeFailure {
  if (error instanceof CloudError) {
    switch (error.code) {
      case 'invalid-input':
        return {
          kind: 'retry',
          notice: {
            tone: 'danger',
            title: passwordNotChanged,
            lines: [
              `The new password was not accepted. Use ${cloudPasswordMinLength} to ${cloudPasswordMaxLength} characters, or choose a different password.`,
            ],
          },
        };
      case 'rate-limited':
      case 'not-permitted':
        return {
          kind: 'retry',
          notice: {
            tone: 'danger',
            title: passwordNotChanged,
            lines: [describeCloudError(error)],
          },
        };
      case 'session-ended':
        return {
          kind: 'closed',
          view: {
            kind: 'done',
            tone: 'danger',
            title: passwordNotChanged,
            detail:
              'The sign-in from this link has ended, so the password was not changed. To try again, choose Forgot password? in Settings.',
          },
        };
      case 'disabled':
        return { kind: 'closed', view: describeCallbackFailure(error) };
      default:
        break;
    }
  }

  return { kind: 'retry', notice: passwordChangeUnclear };
}
