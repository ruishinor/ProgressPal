import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { deleteSharedDatabase, getSharedDatabase } from '@/lib/db/database';
import { defaultTestMigrationContext } from './tests/db/testDatabase';
import { FakeLockManager } from './tests/lib/localDataCoordinationFakes';

// IndexedDB-backed route reads can exceed Testing Library's 1 s default on a
// constrained Windows runner. Browser gates cover user-visible timing; unit
// integration queries get a bounded 5 s window so scheduler variance is not a
// false product failure.
configure({ asyncUtilTimeout: 5000 });

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    addListener: () => undefined,
    dispatchEvent: () => false,
    removeEventListener: () => undefined,
    removeListener: () => undefined,
  }),
});

// jsdom does not implement scrollTo; the RPG shell calls it on route change.
Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  writable: true,
  value: () => undefined,
});

// Browser gates verify focus visibility; jsdom has no scrolling layout.
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  writable: true,
  value: () => undefined,
});

// The built app serves packaged content and runtime assets from `public/` on
// its own origin (owner decision 2026-10-03). jsdom has no server, so the
// harness answers same-origin `/content/` and `/runtime/` requests from the
// committed files, exactly as the static host would, and refuses everything
// else: no test reaches a network.
const publicRoot = resolve(process.cwd(), 'public');

Object.defineProperty(globalThis, 'fetch', {
  configurable: true,
  writable: true,
  value: async (input: RequestInfo | URL) => {
    const url = new URL(
      input instanceof Request ? input.url : String(input),
      window.location.href,
    );
    const packaged =
      url.origin === window.location.origin &&
      /^\/(?:content|runtime)\/[a-z0-9._/-]+$/.test(url.pathname) &&
      !url.pathname.includes('..');

    if (!packaged) {
      throw new TypeError(`Test harness refuses network access: ${url.href}`);
    }

    try {
      const body = await readFile(join(publicRoot, url.pathname.slice(1)));
      return new Response(body, { status: 200 });
    } catch {
      return new Response(null, { status: 404 });
    }
  },
});

// jsdom does not implement the Web Locks API. Install a fresh spec-shaped lock
// manager for every test so browser-session tests exercise the same mandatory
// ownership path as production. Tests for unsupported browsers explicitly
// remove this property within their own scope.
beforeEach(() => {
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: new FakeLockManager(),
  });

  // Mirrors the app composition root binding the shared database's migration
  // context before any effect can open it (Epic C / C6, binding control 2),
  // so the many tests that touch the shared singleton without an explicit
  // `db` option keep working. A test exercising missing/conflicting-context
  // behavior calls `deleteSharedDatabase()` first to undo this default.
  getSharedDatabase(defaultTestMigrationContext);
});

afterEach(async () => {
  cleanup();

  document.documentElement.removeAttribute('data-motion');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.style.colorScheme = 'light';

  await deleteSharedDatabase();
});
