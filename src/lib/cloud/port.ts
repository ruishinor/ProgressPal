/**
 * Application-facing cloud port (Epic G, Stage 1).
 *
 * Product concepts only: nothing here names a provider, an SDK type, a token
 * or a URL. The single adapter under ./nhost implements it; later stories
 * (G5 backup, G6 restore, G7 lifecycle) extend this boundary rather than
 * reaching around it. Cloud is an optional recovery copy: no function of this
 * port reads or writes learner progress, and Dexie stays the only authority.
 */

export type CloudAccountState =
  /** Cloud is not enabled on this device. No provider code has run. */
  | { status: 'disabled' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; userId: string; email: string };

export type CloudErrorCode =
  | 'disabled'
  | 'invalid-state'
  | 'invalid-input'
  | 'invalid-credentials'
  | 'unverified-email'
  | 'email-in-use'
  | 'not-permitted'
  | 'rate-limited'
  | 'link-expired'
  | 'session-ended'
  | 'unavailable'
  | 'unsupported'
  | 'unknown';

export class CloudError extends Error {
  readonly code: CloudErrorCode;
  /** True when trying the same request again later may succeed. */
  readonly retryable: boolean;

  constructor(code: CloudErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'CloudError';
    this.code = code;
    this.retryable = retryable;
  }
}

export interface CloudCredentials {
  email: string;
  password: string;
}

export type CloudSignUpResult =
  /** The provider requires the email link to be opened before sign-in. */
  { kind: 'verification-required' } | { kind: 'signed-in' };

export type CloudSignOutResult = {
  /** The session is always removed from this device. */
  localSessionRemoved: true;
  /**
   * `confirmed` only when the provider acknowledged the invalidation of the
   * refresh token that was really current. `unconfirmed` in every other case:
   * the request failed, no request was made (no session, cloud disabled), or a
   * failed near-expiry refresh left the current token unknown.
   */
  serverInvalidation: 'confirmed' | 'unconfirmed';
};

export type CloudEmailLinkOutcome =
  /** Email verified and a session established. */
  | { kind: 'verified-signed-in' }
  /** Reset link accepted; the caller must now ask for the new password. */
  | { kind: 'password-reset-session' }
  /**
   * The link carries a code but this browser has no (or an expired) verifier,
   * so no session can be established here. `purpose` is what this device
   * remembers having started, or `unknown`.
   */
  | { kind: 'sign-in-required'; purpose: 'signup' | 'reset' | 'unknown' }
  /**
   * Not a link this build can honour: no usable code, a provider error, a
   * non-PKCE token link, or an address that could not be scrubbed. The address
   * bar has been cleaned (or the code was refused because it could not be).
   */
  | { kind: 'invalid-link' };

export interface CloudAccountPort {
  getState(): CloudAccountState;
  subscribe(listener: (state: CloudAccountState) => void): () => void;

  signUp(input: CloudCredentials): Promise<CloudSignUpResult>;
  signIn(input: CloudCredentials): Promise<void>;
  signOut(): Promise<CloudSignOutResult>;
  requestPasswordReset(email: string): Promise<void>;
  /**
   * Handles the address the learner was sent back to by an email link. It
   * takes no address: it reads this browser's own address bar once, removes
   * everything callback-shaped from it before doing anything else, and judges
   * and exchanges exactly what it removed. A caller therefore cannot supply a
   * second address that differs from the one that was cleaned.
   */
  completeEmailLink(): Promise<CloudEmailLinkOutcome>;
  /**
   * Changes the password for the signed-in account. After a successful change
   * ProgressPal deliberately clears this device's local session and requires
   * signing in again, so a successful call leaves the port `signed-out`. What
   * the provider does with the account's other sessions is a live-validation
   * fact, not something this port assumes.
   */
  changePassword(newPassword: string): Promise<void>;

  /** Explicit device-local choice; only allowed while signed out. */
  setTrustedDevice(value: boolean): void;
}

/** Why a cloud backup write or read did not succeed (used from G5 onwards). */
export type CloudRequestFailure =
  /** The provider could not be reached or answered with a gateway/server fault. */
  | { kind: 'provider-unavailable'; httpStatus: number | null }
  | { kind: 'rate-limited' }
  | { kind: 'unauthenticated' }
  /** The database refused the write: a named constraint, never a transport fault. */
  | {
      kind: 'rejected';
      reason:
        | 'unsupported-generation'
        | 'integrity-mismatch'
        | 'payload-too-large'
        | 'slot-out-of-range'
        | 'slot-conflict'
        | 'other-constraint';
      constraint: string | null;
    }
  | { kind: 'unexpected-response' };
