/**
 * Email-link landing address handling (Epic G, G2).
 *
 * The provider redirects the learner back with a one-time authorization `code`
 * (PKCE), or with an error. Three rules are enforced here and nowhere else:
 *  - the code is opaque: this module only checks that there is exactly one and
 *    that its size is sane, never what characters the provider used;
 *  - a link that carries a token (the non-PKCE shape) is never honoured;
 *  - every callback-shaped parameter, usable or not, is removed from the
 *    address bar before the rest of the app can render, log, or report it, and
 *    a caller learns whether that removal actually took effect.
 */

/** The route the provider is asked to redirect to (wired in a later story). */
export const cloudCallbackPath = '/cloud/callback';

/** A sanity bound on an opaque value, not a statement about the provider. */
const maxCodeLength = 2048;

/** Credentials in the address: the unsafe, non-PKCE shape. */
const tokenParamNames = new Set([
  'refreshtoken',
  'refresh_token',
  'accesstoken',
  'access_token',
  'ticket',
]);

const errorParamNames = new Set([
  'error',
  'errordescription',
  'error_description',
  'error_code',
  'errorcode',
  'error_uri',
  'erroruri',
]);

/** Names are compared case-insensitively when deciding what to remove. */
const callbackParamNames = new Set([
  'code',
  'type',
  ...tokenParamNames,
  ...errorParamNames,
]);

export type CloudCallbackParse =
  | { kind: 'code'; code: string }
  /** A credential is in the address: unsafe shape, never used. */
  | { kind: 'token-in-url' }
  /** The provider reported an error instead of a code. */
  | { kind: 'provider-error' }
  /** Callback-shaped, but without exactly one usable code. */
  | { kind: 'malformed' }
  /** Nothing callback-shaped in the address. */
  | { kind: 'none' };

interface Segment {
  raw: string;
  name: string;
  key: string;
  value: string;
}

/** Splits a query or fragment on `&`, keeping every segment's raw text. */
function segmentsOf(part: string): Segment[] {
  if (part === '') {
    return [];
  }

  return part.split('&').map((raw) => {
    const [name = '', value = ''] = [...new URLSearchParams(raw)][0] ?? [];

    return { raw, name, key: name.toLowerCase(), value };
  });
}

function withoutCallbackParams(part: string): string {
  return segmentsOf(part)
    .filter((segment) => !callbackParamNames.has(segment.key))
    .map((segment) => segment.raw)
    .join('&');
}

export function parseCloudCallback(href: string): CloudCallbackParse {
  let url: URL;

  try {
    url = new URL(href);
  } catch {
    return { kind: 'none' };
  }

  const query = segmentsOf(url.search.replace(/^\?/, ''));
  const fragment = segmentsOf(url.hash.replace(/^#/, ''));
  const shaped = [...query, ...fragment].filter((segment) =>
    callbackParamNames.has(segment.key),
  );

  if (shaped.length === 0) {
    return { kind: 'none' };
  }

  if (shaped.some((segment) => tokenParamNames.has(segment.key))) {
    return { kind: 'token-in-url' };
  }

  if (shaped.some((segment) => errorParamNames.has(segment.key))) {
    return { kind: 'provider-error' };
  }

  const codes = shaped.filter((segment) => segment.key === 'code');
  const [only] = codes;

  if (
    codes.length === 1 &&
    only !== undefined &&
    query.includes(only) &&
    only.name === 'code' &&
    only.value.length > 0 &&
    only.value.length <= maxCodeLength
  ) {
    return { kind: 'code', code: only.value };
  }

  return { kind: 'malformed' };
}

/**
 * The same address with every callback parameter removed from the query and
 * from the fragment. Everything else is kept exactly as written.
 */
export function stripCloudCallbackParams(href: string): string {
  const url = new URL(href);
  const search = withoutCallbackParams(url.search.replace(/^\?/, ''));
  const hash = withoutCallbackParams(url.hash.replace(/^#/, ''));

  return `${url.pathname}${search === '' ? '' : `?${search}`}${hash === '' ? '' : `#${hash}`}`;
}

export type CallbackWindow = {
  location: Pick<Location, 'href'>;
  history: Pick<History, 'replaceState' | 'state'>;
};

/**
 * Rewrites the current history entry in place (never adds one) when it holds
 * anything callback-shaped. Returns true only when the address bar, read back
 * afterwards, holds nothing callback-shaped; a caller that gets false must not
 * use what it read from that address.
 */
export function scrubCloudCallbackUrl(win: CallbackWindow): boolean {
  try {
    const href = win.location.href;

    if (parseCloudCallback(href).kind !== 'none') {
      win.history.replaceState(
        win.history.state,
        '',
        stripCloudCallbackParams(href),
      );
    }
  } catch {
    // Judged by the read-back below.
  }

  try {
    return parseCloudCallback(win.location.href).kind === 'none';
  } catch {
    return false;
  }
}
