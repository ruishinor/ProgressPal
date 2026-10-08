import { FetchError } from '@nhost/nhost-js/fetch';

import { CloudError, type CloudErrorCode } from '../port';

/**
 * Maps whatever the SDK throws to the port's provider-neutral errors. Messages
 * are plain and carry no token, address or provider detail.
 */
const byProviderCode: Record<string, CloudErrorCode> = {
  'invalid-email-password': 'invalid-credentials',
  'unverified-user': 'unverified-email',
  'email-already-in-use': 'email-in-use',
  'disabled-user': 'not-permitted',
  'signup-disabled': 'not-permitted',
  'disabled-endpoint': 'not-permitted',
  'forbidden-anonymous': 'not-permitted',
  'invalid-refresh-token': 'session-ended',
  'invalid-ticket': 'link-expired',
  'expired-ticket': 'link-expired',
};

const messages: Record<CloudErrorCode, string> = {
  disabled: 'Cloud backup is not enabled on this device.',
  'invalid-state': 'That is not possible in the current state.',
  'invalid-input':
    'The request was not accepted. Check the details and try again.',
  'invalid-credentials': 'The email or password was not accepted.',
  'unverified-email': 'The email address has not been verified yet.',
  'email-in-use': 'This email address cannot be used to create an account.',
  'not-permitted': 'This action is not permitted for this account.',
  'rate-limited': 'Too many attempts. Wait a while and try again.',
  'link-expired': 'This link has expired or was already used.',
  'session-ended': 'The signed-in session has ended. Sign in again.',
  unavailable:
    'The cloud service could not be reached. Local data is unaffected.',
  unsupported: 'This sign-in method is not supported.',
  unknown: 'Something went wrong. Local data is unaffected.',
};

export function cloudError(code: CloudErrorCode): CloudError {
  return new CloudError(
    code,
    messages[code],
    code === 'unavailable' || code === 'rate-limited',
  );
}

function providerCode(body: unknown): string | null {
  if (typeof body === 'object' && body !== null) {
    const error = (body as { error?: unknown }).error;

    if (typeof error === 'string') {
      return error;
    }
  }

  return null;
}

export function mapAuthError(error: unknown): CloudError {
  if (error instanceof CloudError) {
    return error;
  }

  if (error instanceof FetchError) {
    const code = providerCode(error.body);

    if (code !== null && code in byProviderCode) {
      return cloudError(byProviderCode[code] as CloudErrorCode);
    }

    if (error.status === 429) {
      return cloudError('rate-limited');
    }

    if (error.status === 401) {
      return cloudError('session-ended');
    }

    if (error.status === 403) {
      return cloudError('not-permitted');
    }

    if (error.status === 400 || error.status === 422) {
      return cloudError('invalid-input');
    }

    if (error.status >= 500 || error.status === 0) {
      return cloudError('unavailable');
    }

    return cloudError('unknown');
  }

  // fetch() itself rejects with a TypeError when the network is unreachable.
  if (error instanceof TypeError) {
    return cloudError('unavailable');
  }

  return cloudError('unknown');
}
