/**
 * The only network read in application code (owner decision 2026-10-03):
 * static, versioned assets packaged with this build and served from this
 * origin — programme content and the client-side Python runtime. A path must
 * be relative and lie under one of the allowed folders; anything else
 * (another origin, a scheme, a protocol-relative URL, `..`) is refused before
 * any request. Requests are plain GETs of fixed files and carry no learner
 * data. Remote or external course-data fetching stays forbidden.
 */

const allowedFolders = ['content/', 'runtime/'] as const;
const safePath = /^[a-z0-9][a-z0-9._/-]*$/;

/** Resolves a packaged asset path against this origin, or throws. */
export function resolveSameOriginAsset(path: string, base: string): URL {
  if (
    !safePath.test(path) ||
    path.includes('..') ||
    path.includes('//') ||
    !allowedFolders.some((folder) => path.startsWith(folder))
  ) {
    throw new Error(`"${path}" is not a packaged same-origin asset path.`);
  }

  const baseUrl = new URL(base);
  const url = new URL(path, baseUrl);

  if (url.origin !== baseUrl.origin) {
    throw new Error(`"${path}" does not resolve to this origin.`);
  }

  return url;
}

/** Reads a packaged same-origin asset as text; rejects on any failure. */
export async function loadSameOriginText(path: string): Promise<string> {
  // Packaged assets live at the site root, whatever route is showing.
  const url = resolveSameOriginAsset(
    path,
    new URL('/', globalThis.location.href).href,
  );
  const response = await fetch(url, {
    credentials: 'same-origin',
    redirect: 'error',
  });

  if (!response.ok) {
    throw new Error(`Asset ${path} answered ${response.status}.`);
  }

  return response.text();
}
