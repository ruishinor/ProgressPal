/**
 * Email-link landing address handling (Epic G, G2).
 *
 * The provider redirects the learner back with a one-time authorization `code`
 * (PKCE). Two rules are enforced here and nowhere else:
 *  - a link that carries a refresh token instead of a code (the non-PKCE
 *    shape) is never honoured, and
 *  - every callback parameter is removed from the address bar before the
 *    rest of the app can render, log, or report the URL.
 */

/** The route the provider is asked to redirect to (wired in a later story). */
export const cloudCallbackPath = '/cloud/callback';

const callbackParamNames = [
  'code',
  'type',
  'refreshToken',
  'refresh_token',
  'error',
  'errorDescription',
  'error_description',
] as const;

export type CloudCallbackParse =
  | { kind: 'code'; code: string }
  /** A token (or refresh token) is in the address: unsafe shape, never used. */
  | { kind: 'token-in-url' }
  | { kind: 'none' };

const codePattern = /^[A-Za-z0-9._~-]{8,512}$/;

export function parseCloudCallback(href: string): CloudCallbackParse {
  let url: URL;

  try {
    url = new URL(href);
  } catch {
    return { kind: 'none' };
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));

  if (
    url.searchParams.has('refreshToken') ||
    url.searchParams.has('refresh_token') ||
    hashParams.has('refreshToken') ||
    hashParams.has('refresh_token') ||
    hashParams.has('accessToken') ||
    hashParams.has('access_token')
  ) {
    return { kind: 'token-in-url' };
  }

  const code = url.searchParams.get('code');

  if (code !== null && codePattern.test(code)) {
    return { kind: 'code', code };
  }

  return { kind: 'none' };
}

/** The same address with every callback parameter (and a token fragment) removed. */
export function stripCloudCallbackParams(href: string): string {
  const url = new URL(href);

  for (const name of callbackParamNames) {
    url.searchParams.delete(name);
  }

  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));

  if (
    hashParams.has('refreshToken') ||
    hashParams.has('refresh_token') ||
    hashParams.has('accessToken') ||
    hashParams.has('access_token')
  ) {
    url.hash = '';
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export type CallbackWindow = {
  location: Pick<Location, 'href'>;
  history: Pick<History, 'replaceState' | 'state'>;
};

/** Rewrites the current history entry in place; never adds one. */
export function scrubCloudCallbackUrl(win: CallbackWindow): void {
  try {
    win.history.replaceState(
      win.history.state,
      '',
      stripCloudCallbackParams(win.location.href),
    );
  } catch {
    // An address that cannot be rewritten is never read again by this module.
  }
}
