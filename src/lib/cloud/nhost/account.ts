import { createClient, type NhostClient } from '@nhost/nhost-js';
import { generatePKCEPair } from '@nhost/nhost-js/auth';
import type { SessionStorageBackend } from '@nhost/nhost-js/session';

import {
  clearPkceFlow,
  savePkceFlow,
  takePkceFlow,
  type PkcePurpose,
} from '../pkceVerifierStore';
import {
  cloudCallbackPath,
  parseCloudCallback,
  scrubCloudCallbackUrl,
  type CallbackWindow,
} from '../callbackUrl';
import {
  readCloudPreferences,
  writeCloudPreferences,
  type CloudPreferences,
} from '../preferences';
import {
  CloudError,
  type CloudAccountPort,
  type CloudAccountState,
  type CloudCredentials,
  type CloudEmailLinkOutcome,
  type CloudSignOutResult,
  type CloudSignUpResult,
} from '../port';
import { cloudError, mapAuthError } from './authErrors';
import { nhostAuthUrl, nhostGraphqlUrl } from './endpoints';
import {
  createSessionScopedBackend,
  createTrustedDeviceBackend,
  removeStoredCloudSessions,
} from './sessionBackends';

/**
 * The single place that constructs the provider client and speaks to Nhost
 * Auth. Nothing else in the application may import the SDK (pinned by
 * tests/architecture/cloudBoundary.test.ts).
 *
 * Invariants:
 *  - cloud disabled => the SDK client is never constructed and no request is
 *    made, from import time or from any method;
 *  - the session lives in sessionStorage unless the learner explicitly chose
 *    "trusted device" while signed out; a session is never moved between the
 *    two stores;
 *  - no function here reads or writes the learner database.
 */

/** Mirrors the provider's default minimum and documented maximum; the provider stays the authority. */
export const cloudPasswordMinLength = 9;
export const cloudPasswordMaxLength = 50;

const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string) {
  if (!emailShape.test(email) || email.length > 254) {
    throw cloudError('invalid-input');
  }
}

function validatePassword(password: string) {
  if (
    password.length < cloudPasswordMinLength ||
    password.length > cloudPasswordMaxLength
  ) {
    throw cloudError('invalid-input');
  }
}

export interface NhostAccountDependencies {
  readPreferences?: () => CloudPreferences;
  writePreferences?: (next: CloudPreferences) => boolean;
  now?: () => number;
  /** Where the email link lands and whose address bar is scrubbed. */
  getWindow?: () => CallbackWindow & { location: Location };
  authUrl?: string;
  graphqlUrl?: string;
}

export function createNhostCloudAccount(
  dependencies: NhostAccountDependencies = {},
): CloudAccountPort {
  const readPreferences = dependencies.readPreferences ?? readCloudPreferences;
  const writePreferences =
    dependencies.writePreferences ?? writeCloudPreferences;
  const now = dependencies.now ?? Date.now;
  const getWindow =
    dependencies.getWindow ??
    (() => window as CallbackWindow & { location: Location });
  const authUrl = dependencies.authUrl ?? nhostAuthUrl;
  const graphqlUrl = dependencies.graphqlUrl ?? nhostGraphqlUrl;

  let client: NhostClient | null = null;
  let clientTrusted = false;
  let stopListening: (() => void) | null = null;
  const listeners = new Set<(state: CloudAccountState) => void>();

  function stateOf(active: NhostClient | null): CloudAccountState {
    const session = active?.getUserSession() ?? null;

    if (session === null) {
      return { status: 'signed-out' };
    }

    return {
      status: 'signed-in',
      userId: session.user?.id ?? '',
      email: session.user?.email ?? '',
    };
  }

  function emit() {
    const state = getState();

    for (const listener of listeners) {
      try {
        listener(state);
      } catch {
        // A faulty subscriber must not break the others.
      }
    }
  }

  function dropClient() {
    stopListening?.();
    stopListening = null;
    client = null;
  }

  /** Builds the SDK client lazily; building performs no network request. */
  function ensureClient(): NhostClient {
    const preferences = readPreferences();

    if (!preferences.enabled) {
      throw cloudError('disabled');
    }

    if (client !== null && clientTrusted === preferences.trustedDevice) {
      return client;
    }

    dropClient();

    const storage: SessionStorageBackend = preferences.trustedDevice
      ? createTrustedDeviceBackend()
      : createSessionScopedBackend();

    client = createClient({ authUrl, graphqlUrl, storage });
    clientTrusted = preferences.trustedDevice;
    stopListening = client.sessionStorage.onChange(() => emit());

    return client;
  }

  function getState(): CloudAccountState {
    if (!readPreferences().enabled) {
      return { status: 'disabled' };
    }

    return stateOf(ensureClient());
  }

  function callbackUrl(): string {
    return `${getWindow().location.origin}${cloudCallbackPath}`;
  }

  async function startPkce(purpose: PkcePurpose): Promise<string> {
    const pair = await generatePKCEPair();

    savePkceFlow({ verifier: pair.verifier, purpose, createdAt: now() });

    return pair.challenge;
  }

  return {
    getState,

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    async signUp(input: CloudCredentials): Promise<CloudSignUpResult> {
      validateEmail(input.email);
      validatePassword(input.password);

      const active = ensureClient();

      try {
        const codeChallenge = await startPkce('signup');
        const response = await active.auth.signUpEmailPassword({
          email: input.email,
          password: input.password,
          options: { redirectTo: callbackUrl() },
          codeChallenge,
        });

        if (response.body.session) {
          // Verification was not required, so no email link will follow.
          clearPkceFlow();
          return { kind: 'signed-in' };
        }

        return { kind: 'verification-required' };
      } catch (error) {
        clearPkceFlow();
        throw mapAuthError(error);
      }
    },

    async signIn(input: CloudCredentials): Promise<void> {
      validateEmail(input.email);
      validatePassword(input.password);

      const active = ensureClient();

      try {
        const response = await active.auth.signInEmailPassword({
          email: input.email,
          password: input.password,
        });

        if (response.body.mfa) {
          // MFA is out of Stage-1 scope; never leave a half-signed-in state.
          active.clearSession();
          throw cloudError('unsupported');
        }

        if (active.getUserSession() === null) {
          throw cloudError('unknown');
        }
      } catch (error) {
        throw mapAuthError(error);
      }
    },

    async signOut(): Promise<CloudSignOutResult> {
      if (!readPreferences().enabled) {
        removeStoredCloudSessions();
        return { localSessionRemoved: true, serverInvalidation: 'unconfirmed' };
      }

      const active = ensureClient();
      // The SDK refreshes a near-expiry token inside the next request, which
      // rotates the refresh token. Refresh first so the token invalidated by
      // the sign-out request is the CURRENT one, not an already-revoked one.
      // (A failed refresh leaves the session as it was; sign-out then reports
      // the server side as unconfirmed.)
      await active.refreshSession(60);
      const session = active.getUserSession();
      let serverInvalidation: CloudSignOutResult['serverInvalidation'] =
        session === null ? 'confirmed' : 'unconfirmed';

      try {
        if (session !== null) {
          await active.auth.signOut({ refreshToken: session.refreshToken });
          serverInvalidation = 'confirmed';
        }
      } catch {
        serverInvalidation = 'unconfirmed';
      } finally {
        active.clearSession();
        removeStoredCloudSessions();
      }

      return { localSessionRemoved: true, serverInvalidation };
    },

    async requestPasswordReset(email: string): Promise<void> {
      validateEmail(email);

      const active = ensureClient();

      try {
        const codeChallenge = await startPkce('reset');
        await active.auth.sendPasswordResetEmail({
          email,
          options: { redirectTo: callbackUrl() },
          codeChallenge,
        });
      } catch (error) {
        clearPkceFlow();
        throw mapAuthError(error);
      }
    },

    async completeEmailLink(href: string): Promise<CloudEmailLinkOutcome> {
      const parsed = parseCloudCallback(href);

      if (parsed.kind === 'none') {
        return { kind: 'invalid-link' };
      }

      // First act: take the one-time code (or an unsafe token) out of the
      // address bar, before anything below can render, log or throw.
      scrubCloudCallbackUrl(getWindow());

      if (parsed.kind === 'token-in-url') {
        clearPkceFlow();
        return { kind: 'invalid-link' };
      }

      if (!readPreferences().enabled) {
        clearPkceFlow();
        throw cloudError('disabled');
      }

      const flow = takePkceFlow(now());

      if (flow.state !== 'ok') {
        return {
          kind: 'sign-in-required',
          purpose: flow.state === 'expired' ? flow.purpose : 'unknown',
        };
      }

      const active = ensureClient();

      try {
        await active.auth.tokenExchange({
          code: parsed.code,
          codeVerifier: flow.verifier,
        });
      } catch (error) {
        const mapped = mapAuthError(error);

        // A rejected one-time code is an expired or used link, not a fault.
        throw mapped.code === 'invalid-input' ||
          mapped.code === 'invalid-credentials' ||
          mapped.code === 'session-ended'
          ? cloudError('link-expired')
          : mapped;
      }

      if (active.getUserSession() === null) {
        throw cloudError('unknown');
      }

      return flow.purpose === 'reset'
        ? { kind: 'password-reset-session' }
        : { kind: 'verified-signed-in' };
    },

    async changePassword(newPassword: string): Promise<void> {
      validatePassword(newPassword);

      const active = ensureClient();

      if (active.getUserSession() === null) {
        throw cloudError('session-ended');
      }

      try {
        await active.auth.changeUserPassword({ newPassword });
      } catch (error) {
        throw mapAuthError(error);
      }

      // The provider revokes every session of the account, this one included:
      // never leave the UI claiming an active session.
      active.clearSession();
      removeStoredCloudSessions();
    },

    setTrustedDevice(value: boolean): void {
      const preferences = readPreferences();

      if (preferences.enabled && getState().status === 'signed-in') {
        throw new CloudError(
          'invalid-state',
          'Sign out before changing how long this device stays signed in.',
        );
      }

      if (!writePreferences({ ...preferences, trustedDevice: value })) {
        throw cloudError('unknown');
      }

      // Never carry a session from one store to the other.
      removeStoredCloudSessions();
      dropClient();
      emit();
    },
  };
}

let sharedAccount: CloudAccountPort | null = null;

/** Lazily created; creating it performs no I/O and no network request. */
export function getCloudAccount(): CloudAccountPort {
  sharedAccount ??= createNhostCloudAccount();

  return sharedAccount;
}
