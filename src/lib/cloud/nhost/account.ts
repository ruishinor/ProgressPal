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
import type { CloudBackupStore } from '../backupPort';
import { cloudError, mapAuthError } from './authErrors';
import { createNhostBackupStore } from './backupStore';
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

/** The SDK's own near-expiry window; sign-out refreshes inside it first. */
const refreshMarginSeconds = 60;

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

/**
 * The account and the backup store the application shares. They are built from
 * one SDK client, so the store sends exactly the session the account holds
 * (and the SDK refreshes it inside the store's requests, never separately).
 */
export interface NhostCloud {
  account: CloudAccountPort;
  backups: CloudBackupStore;
}

export function createNhostCloud(
  dependencies: NhostAccountDependencies = {},
): NhostCloud {
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

  /**
   * The emailed link can only be completed with the verifier kept here, so an
   * email is never requested unless the verifier was really stored. There is
   * deliberately no fallback to a flow without one.
   */
  async function startPkce(purpose: PkcePurpose): Promise<string> {
    const pair = await generatePKCEPair();

    if (!savePkceFlow({ verifier: pair.verifier, purpose, createdAt: now() })) {
      clearPkceFlow();
      throw cloudError('unknown');
    }

    return pair.challenge;
  }

  /** Removes the local session from memory and from both stores; never throws. */
  function removeLocalSession() {
    try {
      client?.clearSession();
    } catch {
      // The stores are emptied directly below.
    }

    removeStoredCloudSessions();
  }

  /**
   * Asks the provider to invalidate the current refresh token and reports
   * `confirmed` only when that was observed for the token that is really
   * current. A near-expiry access token is refreshed first (the SDK would do
   * it inside the next request and rotate the refresh token), but a refresh
   * that fails or cannot be observed leaves the current token unknown, so the
   * result is then never `confirmed`.
   */
  async function invalidateOnServer(
    active: NhostClient,
  ): Promise<CloudSignOutResult['serverInvalidation']> {
    const before = active.getUserSession();

    if (
      before === null ||
      typeof before.refreshToken !== 'string' ||
      before.refreshToken === ''
    ) {
      // No session, or a leftover record that is not a usable one: there is
      // nothing to ask the provider to invalidate.
      return 'unconfirmed';
    }

    const exp = before.decodedToken?.exp;
    const refreshNeeded =
      !exp || exp - Date.now() <= refreshMarginSeconds * 1000;
    let refreshFailed = false;

    try {
      await active.refreshSession(refreshMarginSeconds);
    } catch {
      refreshFailed = true;
    }

    const session = active.getUserSession();

    if (session === null) {
      // The provider rejected the refresh token and the SDK dropped it.
      return 'unconfirmed';
    }

    const refreshObserved =
      session.accessToken !== before.accessToken ||
      session.refreshToken !== before.refreshToken;
    const currentTokenKnown =
      !refreshFailed && (!refreshNeeded || refreshObserved);

    try {
      await active.auth.signOut({ refreshToken: session.refreshToken });
    } catch {
      return 'unconfirmed';
    }

    return currentTokenKnown ? 'confirmed' : 'unconfirmed';
  }

  const account: CloudAccountPort = {
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
      let serverInvalidation: CloudSignOutResult['serverInvalidation'] =
        'unconfirmed';

      try {
        // Cloud disabled: there is no client and no request, only local cleanup.
        if (readPreferences().enabled) {
          serverInvalidation = await invalidateOnServer(ensureClient());
        }
      } catch {
        // Stays unconfirmed: nothing was acknowledged by the provider.
      } finally {
        // Whatever happened above, this device never keeps the session.
        removeLocalSession();
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
      // First act: take anything callback-shaped (code, token, error) out of
      // the address bar, before anything below can render, log or throw.
      const scrubbed = scrubCloudCallbackUrl(getWindow());
      const parsed = parseCloudCallback(href);

      if (!scrubbed) {
        // A credential that cannot be removed from the address is never used.
        clearPkceFlow();
        return { kind: 'invalid-link' };
      }

      if (parsed.kind === 'none') {
        return { kind: 'invalid-link' };
      }

      if (parsed.kind !== 'code') {
        // A token link, a provider error or an unusable code: a pending
        // verifier belongs to a link that cannot be completed any more.
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

      // Deliberately conservative: whatever the provider does with its other
      // sessions (a live-validation fact, not an assumption), this device drops
      // its own session and asks for a fresh sign-in.
      removeLocalSession();
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

  return {
    account,
    backups: createNhostBackupStore({ getClient: ensureClient }),
  };
}

export function createNhostCloudAccount(
  dependencies: NhostAccountDependencies = {},
): CloudAccountPort {
  return createNhostCloud(dependencies).account;
}

let sharedCloud: NhostCloud | null = null;

function getSharedCloud(): NhostCloud {
  sharedCloud ??= createNhostCloud();

  return sharedCloud;
}

/** Lazily created; creating it performs no I/O and no network request. */
export function getCloudAccount(): CloudAccountPort {
  return getSharedCloud().account;
}

/** The store that shares the account's session; same laziness, same silence. */
export function getCloudBackupStore(): CloudBackupStore {
  return getSharedCloud().backups;
}
